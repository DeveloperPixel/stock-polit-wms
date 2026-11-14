import { tx, query, one } from '../db';

export async function createTransfer(d: { from_warehouse_id: number; to_warehouse_id: number; notes: string | null;
  items: { product_id: number; qty: number }[] }, userId: number) {
  return tx(async c => {
    const { rows: [t] } = await c.query(
      `INSERT INTO stock_transfers(transfer_number,from_warehouse_id,to_warehouse_id,notes,created_by)
       VALUES (next_doc_no('TRF'),$1,$2,$3,$4) RETURNING *`, [d.from_warehouse_id, d.to_warehouse_id, d.notes, userId]);
    for (const i of d.items) {
      await c.query(`INSERT INTO stock_transfer_items(transfer_id,product_id,qty) VALUES ($1,$2,$3)`, [t.id, i.product_id, i.qty]);
      // OUT at source (trigger validates stock & values at avg cost)
      const { rows: [out] } = await c.query(
        `INSERT INTO stock_movements(product_id,warehouse_id,movement,qty,ref_type,ref_id,ref_no,created_by)
         VALUES ($1,$2,'TRANSFER_OUT',$3,'TRF',$4,$5,$6) RETURNING unit_cost`,
        [i.product_id, d.from_warehouse_id, -i.qty, t.id, t.transfer_number, userId]);
      // IN at destination carrying the same cost
      await c.query(
        `INSERT INTO stock_movements(product_id,warehouse_id,movement,qty,unit_cost,ref_type,ref_id,ref_no,created_by)
         VALUES ($1,$2,'TRANSFER_IN',$3,$4,'TRF',$5,$6,$7)`,
        [i.product_id, d.to_warehouse_id, i.qty, out.unit_cost, t.id, t.transfer_number, userId]);
    }
    return t;
  });
}

export async function createAdjustment(d: { warehouse_id: number; reason: string; notes: string | null;
  items: { product_id: number; qty_change: number; unit_cost: number }[] }, userId: number) {
  return tx(async c => {
    const { rows: [a] } = await c.query(
      `INSERT INTO stock_adjustments(adj_number,warehouse_id,reason,notes,created_by)
       VALUES (next_doc_no('ADJ'),$1,$2,$3,$4) RETURNING *`, [d.warehouse_id, d.reason, d.notes, userId]);
    for (const i of d.items) {
      let cost = i.unit_cost;
      if (i.qty_change > 0 && !cost) {
        const p = await c.query(`SELECT cost_price FROM products WHERE id=$1`, [i.product_id]);
        cost = Number(p.rows[0]?.cost_price ?? 0);
      }
      await c.query(`INSERT INTO stock_adjustment_items(adjustment_id,product_id,qty_change,unit_cost) VALUES ($1,$2,$3,$4)`,
        [a.id, i.product_id, i.qty_change, cost]);
      await c.query(
        `INSERT INTO stock_movements(product_id,warehouse_id,movement,qty,unit_cost,ref_type,ref_id,ref_no,note,created_by)
         VALUES ($1,$2,'ADJUSTMENT',$3,$4,'ADJ',$5,$6,$7,$8)`,
        [i.product_id, d.warehouse_id, i.qty_change, i.qty_change > 0 ? cost : 0, a.id, a.adj_number, d.reason, userId]);
    }
    return a;
  });
}

export const stockLevels = (warehouseId?: number, search?: string) => query(
  `SELECT * FROM v_stock_summary
    WHERE ($1::int IS NULL OR warehouse_id=$1)
      AND ($2::text IS NULL OR sku ILIKE '%'||$2||'%' OR name ILIKE '%'||$2||'%'
           OR product_id IN (SELECT id FROM products WHERE barcode ILIKE '%'||$2||'%'))
    ORDER BY sku, warehouse_code`, [warehouseId ?? null, search || null]);

export const movements = (productId?: number, limit = 200) => query(
  `SELECT m.*, p.sku, p.name, w.code AS warehouse, u.name AS user_name, b.code AS bin_code
     FROM stock_movements m JOIN products p ON p.id=m.product_id JOIN warehouses w ON w.id=m.warehouse_id
     LEFT JOIN users u ON u.id=m.created_by
     LEFT JOIN bin_locations b ON b.id=m.bin_id
    WHERE ($1::int IS NULL OR m.product_id=$1) ORDER BY m.id DESC LIMIT $2`, [productId ?? null, limit]);

export const listTransfers = () => query(
  `SELECT t.*, f.code AS from_wh, tw.code AS to_wh,
          (SELECT COUNT(*) FROM stock_transfer_items i WHERE i.transfer_id=t.id) AS lines
     FROM stock_transfers t JOIN warehouses f ON f.id=t.from_warehouse_id JOIN warehouses tw ON tw.id=t.to_warehouse_id
    ORDER BY t.id DESC LIMIT 200`);

export const listAdjustments = () => query(
  `SELECT a.*, w.code AS warehouse, u.name AS user_name,
          (SELECT COUNT(*) FROM stock_adjustment_items i WHERE i.adjustment_id=a.id) AS lines
     FROM stock_adjustments a JOIN warehouses w ON w.id=a.warehouse_id LEFT JOIN users u ON u.id=a.created_by
    ORDER BY a.id DESC LIMIT 200`);

export async function dashboard() {
  const kpi = await one(`
    SELECT (SELECT COUNT(*) FROM products WHERE active) AS products,
           (SELECT COUNT(*) FROM vendors WHERE active) AS vendors,
           (SELECT COUNT(*) FROM warehouses WHERE active) AS warehouses,
           (SELECT COALESCE(SUM(stock_value),0) FROM v_stock_summary) AS stock_value,
           (SELECT COUNT(*) FROM v_low_stock) AS low_stock,
           (SELECT COUNT(*) FROM purchase_orders WHERE status IN ('APPROVED','PARTIAL')) AS open_pos,
           (SELECT COUNT(*) FROM purchase_orders WHERE status='DRAFT') AS pending_approval,
           (SELECT COUNT(*) FROM sales_orders WHERE status='CONFIRMED') AS to_dispatch,
           (SELECT COALESCE(SUM(balance_due),0) FROM v_vendor_balance) AS payables`);
  const lowStock = await query(`SELECT * FROM v_low_stock ORDER BY qty_available LIMIT 10`);
  const byWarehouse = await query(
    `SELECT warehouse_code, SUM(stock_value) AS value, SUM(qty_on_hand) AS qty FROM v_stock_summary GROUP BY warehouse_code ORDER BY 1`);
  const recent = await movements(undefined, 10);
  return { kpi, lowStock, byWarehouse, recent };
}
