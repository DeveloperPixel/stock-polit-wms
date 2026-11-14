-- =====================================================================
--  StockPilot WMS — Stock, Vendor & Warehouse Management
--  PostgreSQL 14+ schema
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Enums ----------------------------------------------------
CREATE TYPE user_role       AS ENUM ('ADMIN','MANAGER','STAFF');
CREATE TYPE po_status       AS ENUM ('DRAFT','APPROVED','PARTIAL','RECEIVED','CANCELLED');
CREATE TYPE so_status       AS ENUM ('DRAFT','CONFIRMED','DISPATCHED','CANCELLED');
CREATE TYPE movement_type   AS ENUM ('GRN','DISPATCH','TRANSFER_OUT','TRANSFER_IN',
                                     'ADJUSTMENT','VENDOR_RETURN','OPENING');

-- ---------- Users ----------------------------------------------------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'STAFF',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Masters --------------------------------------------------
CREATE TABLE warehouses (
  id         SERIAL PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  address    TEXT,
  city       TEXT,
  manager    TEXT,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bin_locations (
  id           SERIAL PRIMARY KEY,
  warehouse_id INT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  code         TEXT NOT NULL,              -- e.g. A-01-03 (aisle-rack-shelf)
  description  TEXT,
  UNIQUE (warehouse_id, code)
);

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  sku           TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  category_id   INT REFERENCES categories(id),
  uom           TEXT NOT NULL DEFAULT 'PCS',
  barcode       TEXT UNIQUE,
  hsn_code      TEXT,
  cost_price    NUMERIC(14,2) NOT NULL DEFAULT 0,
  sale_price    NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate      NUMERIC(5,2)  NOT NULL DEFAULT 18,
  reorder_level NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_qty   NUMERIC(14,3) NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vendors (
  id                 SERIAL PRIMARY KEY,
  code               TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  contact_person     TEXT,
  email              TEXT,
  phone              TEXT,
  gstin              TEXT,
  address            TEXT,
  payment_terms_days INT NOT NULL DEFAULT 30,
  rating             NUMERIC(2,1) CHECK (rating BETWEEN 0 AND 5),
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- which vendor supplies which product, at what price / lead time
CREATE TABLE product_vendors (
  product_id     INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vendor_id      INT NOT NULL REFERENCES vendors(id)  ON DELETE CASCADE,
  vendor_sku     TEXT,
  unit_price     NUMERIC(14,2) NOT NULL DEFAULT 0,
  lead_time_days INT NOT NULL DEFAULT 7,
  preferred      BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (product_id, vendor_id)
);

CREATE TABLE customers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  gstin      TEXT,
  address    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Document numbering --------------------------------------
CREATE TABLE doc_sequences (
  prefix  TEXT PRIMARY KEY,
  last_no INT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_doc_no(p_prefix TEXT) RETURNS TEXT AS $$
DECLARE n INT;
BEGIN
  INSERT INTO doc_sequences(prefix, last_no) VALUES (p_prefix, 1)
  ON CONFLICT (prefix) DO UPDATE SET last_no = doc_sequences.last_no + 1
  RETURNING last_no INTO n;
  RETURN p_prefix || '-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 5, '0');
END $$ LANGUAGE plpgsql;

-- ---------- Inventory core ------------------------------------------
-- Current balance per product per warehouse (maintained ONLY by trigger)
CREATE TABLE stock_levels (
  product_id   INT NOT NULL REFERENCES products(id),
  warehouse_id INT NOT NULL REFERENCES warehouses(id),
  qty_on_hand  NUMERIC(14,3) NOT NULL DEFAULT 0,
  qty_reserved NUMERIC(14,3) NOT NULL DEFAULT 0,
  avg_cost     NUMERIC(14,4) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, warehouse_id),
  CHECK (qty_on_hand  >= 0),
  CHECK (qty_reserved >= 0),
  CHECK (qty_reserved <= qty_on_hand)
);

-- Immutable stock ledger: every in/out is a row here
CREATE TABLE stock_movements (
  id            BIGSERIAL PRIMARY KEY,
  product_id    INT NOT NULL REFERENCES products(id),
  warehouse_id  INT NOT NULL REFERENCES warehouses(id),
  movement      movement_type NOT NULL,
  qty           NUMERIC(14,3) NOT NULL CHECK (qty <> 0),  -- +in / -out
  unit_cost     NUMERIC(14,4) NOT NULL DEFAULT 0,
  ref_type      TEXT,          -- 'PO','GRN','SO','TRF','ADJ'
  ref_id        INT,
  ref_no        TEXT,
  note          TEXT,
  batch_no      TEXT,
  expiry_date   DATE,
  bin_id        INT REFERENCES bin_locations(id),
  balance_after NUMERIC(14,3),
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mov_product ON stock_movements(product_id, warehouse_id, created_at DESC);
CREATE INDEX idx_mov_ref     ON stock_movements(ref_type, ref_id);

-- Trigger: apply each movement to stock_levels (weighted-average costing)
CREATE OR REPLACE FUNCTION apply_stock_movement() RETURNS TRIGGER AS $$
DECLARE
  cur stock_levels%ROWTYPE;
  new_qty NUMERIC(14,3);
BEGIN
  INSERT INTO stock_levels(product_id, warehouse_id)
  VALUES (NEW.product_id, NEW.warehouse_id)
  ON CONFLICT DO NOTHING;

  SELECT * INTO cur FROM stock_levels
   WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id
   FOR UPDATE;

  new_qty := cur.qty_on_hand + NEW.qty;
  IF new_qty < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for product % in warehouse % (on hand %, requested %)',
      NEW.product_id, NEW.warehouse_id, cur.qty_on_hand, -NEW.qty
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE stock_levels SET
    qty_on_hand = new_qty,
    avg_cost = CASE
      WHEN NEW.qty > 0 AND new_qty > 0 THEN
        ((cur.qty_on_hand * cur.avg_cost) + (NEW.qty * NEW.unit_cost)) / new_qty
      ELSE cur.avg_cost END,
    updated_at = now()
  WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;

  NEW.balance_after := new_qty;
  IF NEW.qty < 0 AND NEW.unit_cost = 0 THEN
    NEW.unit_cost := cur.avg_cost;    -- outflows valued at average cost
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_stock_movement
BEFORE INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION apply_stock_movement();

-- Ledger is append-only
CREATE OR REPLACE FUNCTION forbid_change() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'stock_movements is append-only; post a reversing entry instead'; END $$
LANGUAGE plpgsql;
CREATE TRIGGER trg_mov_no_update BEFORE UPDATE OR DELETE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION forbid_change();

-- ---------- Procurement (Inbound) -----------------------------------
CREATE TABLE purchase_orders (
  id            SERIAL PRIMARY KEY,
  po_number     TEXT NOT NULL UNIQUE,
  vendor_id     INT NOT NULL REFERENCES vendors(id),
  warehouse_id  INT NOT NULL REFERENCES warehouses(id),
  status        po_status NOT NULL DEFAULT 'DRAFT',
  order_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  notes         TEXT,
  subtotal      NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_total     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by    INT REFERENCES users(id),
  approved_by   INT REFERENCES users(id),
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id           SERIAL PRIMARY KEY,
  po_id        INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id   INT NOT NULL REFERENCES products(id),
  qty_ordered  NUMERIC(14,3) NOT NULL CHECK (qty_ordered > 0),
  qty_received NUMERIC(14,3) NOT NULL DEFAULT 0,
  unit_price   NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate     NUMERIC(5,2)  NOT NULL DEFAULT 0,
  CHECK (qty_received <= qty_ordered)
);

CREATE TABLE goods_receipts (
  id            SERIAL PRIMARY KEY,
  grn_number    TEXT NOT NULL UNIQUE,
  po_id         INT NOT NULL REFERENCES purchase_orders(id),
  warehouse_id  INT NOT NULL REFERENCES warehouses(id),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_no    TEXT,
  notes         TEXT,
  total_value   NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE goods_receipt_items (
  id           SERIAL PRIMARY KEY,
  grn_id       INT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_item_id   INT NOT NULL REFERENCES purchase_order_items(id),
  product_id   INT NOT NULL REFERENCES products(id),
  qty_received NUMERIC(14,3) NOT NULL CHECK (qty_received >= 0),
  qty_rejected NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (qty_rejected >= 0),
  unit_cost    NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE vendor_payments (
  id         SERIAL PRIMARY KEY,
  vendor_id  INT NOT NULL REFERENCES vendors(id),
  po_id      INT REFERENCES purchase_orders(id),
  amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  paid_on    DATE NOT NULL DEFAULT CURRENT_DATE,
  mode       TEXT NOT NULL DEFAULT 'BANK',   -- BANK / UPI / CHEQUE / CASH
  reference  TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Sales / Dispatch (Outbound) -----------------------------
CREATE TABLE sales_orders (
  id            SERIAL PRIMARY KEY,
  so_number     TEXT NOT NULL UNIQUE,
  customer_id   INT NOT NULL REFERENCES customers(id),
  warehouse_id  INT NOT NULL REFERENCES warehouses(id),
  status        so_status NOT NULL DEFAULT 'DRAFT',
  order_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  subtotal      NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_total     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  dispatched_at TIMESTAMPTZ,
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sales_order_items (
  id         SERIAL PRIMARY KEY,
  so_id      INT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  qty        NUMERIC(14,3) NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate   NUMERIC(5,2)  NOT NULL DEFAULT 0
);

-- ---------- Internal movements --------------------------------------
CREATE TABLE stock_transfers (
  id                SERIAL PRIMARY KEY,
  transfer_number   TEXT NOT NULL UNIQUE,
  from_warehouse_id INT NOT NULL REFERENCES warehouses(id),
  to_warehouse_id   INT NOT NULL REFERENCES warehouses(id),
  notes             TEXT,
  created_by        INT REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_warehouse_id <> to_warehouse_id)
);
CREATE TABLE stock_transfer_items (
  id          SERIAL PRIMARY KEY,
  transfer_id INT NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id),
  qty         NUMERIC(14,3) NOT NULL CHECK (qty > 0)
);

CREATE TABLE stock_adjustments (
  id           SERIAL PRIMARY KEY,
  adj_number   TEXT NOT NULL UNIQUE,
  warehouse_id INT NOT NULL REFERENCES warehouses(id),
  reason       TEXT NOT NULL,          -- DAMAGE / CYCLE_COUNT / EXPIRY / FOUND / OPENING
  notes        TEXT,
  created_by   INT REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE stock_adjustment_items (
  id            SERIAL PRIMARY KEY,
  adjustment_id INT NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id    INT NOT NULL REFERENCES products(id),
  qty_change    NUMERIC(14,3) NOT NULL CHECK (qty_change <> 0),
  unit_cost     NUMERIC(14,2) NOT NULL DEFAULT 0
);

-- ---------- Reporting views -----------------------------------------
CREATE VIEW v_stock_summary AS
SELECT p.id AS product_id, p.sku, p.name, c.name AS category, p.uom,
       w.id AS warehouse_id, w.code AS warehouse_code, w.name AS warehouse,
       s.qty_on_hand, s.qty_reserved,
       (s.qty_on_hand - s.qty_reserved) AS qty_available,
       s.avg_cost, ROUND(s.qty_on_hand * s.avg_cost, 2) AS stock_value,
       p.reorder_level
FROM stock_levels s
JOIN products p   ON p.id = s.product_id
JOIN warehouses w ON w.id = s.warehouse_id
LEFT JOIN categories c ON c.id = p.category_id;

CREATE VIEW v_low_stock AS
SELECT p.id AS product_id, p.sku, p.name, p.reorder_level, p.reorder_qty,
       COALESCE(SUM(s.qty_on_hand - s.qty_reserved),0) AS qty_available,
       (SELECT v.name FROM product_vendors pv JOIN vendors v ON v.id = pv.vendor_id
         WHERE pv.product_id = p.id ORDER BY pv.preferred DESC, pv.unit_price LIMIT 1) AS preferred_vendor
FROM products p
LEFT JOIN stock_levels s ON s.product_id = p.id
WHERE p.active
GROUP BY p.id
HAVING COALESCE(SUM(s.qty_on_hand - s.qty_reserved),0) <= p.reorder_level;

CREATE VIEW v_vendor_balance AS
SELECT v.id AS vendor_id, v.code, v.name,
       COALESCE((SELECT SUM(g.total_value) FROM goods_receipts g
                  JOIN purchase_orders po ON po.id = g.po_id
                 WHERE po.vendor_id = v.id),0) AS total_received_value,
       COALESCE((SELECT SUM(amount) FROM vendor_payments vp WHERE vp.vendor_id = v.id),0) AS total_paid,
       COALESCE((SELECT SUM(g.total_value) FROM goods_receipts g
                  JOIN purchase_orders po ON po.id = g.po_id
                 WHERE po.vendor_id = v.id),0)
     - COALESCE((SELECT SUM(amount) FROM vendor_payments vp WHERE vp.vendor_id = v.id),0) AS balance_due,
       (SELECT COUNT(*) FROM purchase_orders po WHERE po.vendor_id = v.id
          AND po.status IN ('APPROVED','PARTIAL')) AS open_pos
FROM vendors v;
