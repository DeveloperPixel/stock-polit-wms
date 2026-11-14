import { z } from 'zod';

const num = z.coerce.number();
const optStr = z.string().trim().optional().nullable().transform(v => (v ? v : null));

export const productSchema = z.object({
  sku: z.string().trim().min(1), name: z.string().trim().min(1),
  category_id: z.coerce.number().int().optional().nullable(),
  uom: z.string().trim().default('PCS'), barcode: optStr, hsn_code: optStr,
  cost_price: num.min(0).default(0), sale_price: num.min(0).default(0),
  tax_rate: num.min(0).max(100).default(18),
  reorder_level: num.min(0).default(0), reorder_qty: num.min(0).default(0),
  active: z.coerce.boolean().default(true),
});

export const vendorSchema = z.object({
  code: z.string().trim().min(1), name: z.string().trim().min(1),
  contact_person: optStr, email: optStr, phone: optStr, gstin: optStr, address: optStr,
  payment_terms_days: z.coerce.number().int().min(0).default(30),
  rating: z.coerce.number().min(0).max(5).optional().nullable(),
  active: z.coerce.boolean().default(true),
});

export const warehouseSchema = z.object({
  code: z.string().trim().min(1), name: z.string().trim().min(1),
  address: optStr, city: optStr, manager: optStr, active: z.coerce.boolean().default(true),
});

export const customerSchema = z.object({
  name: z.string().trim().min(1), email: optStr, phone: optStr, gstin: optStr, address: optStr,
});

export const categorySchema = z.object({ name: z.string().trim().min(1) });

export const userSchema = z.object({
  name: z.string().trim().min(1), email: z.string().email(),
  password: z.string().min(6).optional(), role: z.enum(['ADMIN', 'MANAGER', 'STAFF']),
  active: z.coerce.boolean().default(true),
});

const line = z.object({
  product_id: z.coerce.number().int().positive(),
  qty: num.positive(),
  unit_price: num.min(0).default(0),
  tax_rate: num.min(0).max(100).default(0),
});

export const poSchema = z.object({
  vendor_id: z.coerce.number().int().positive(),
  warehouse_id: z.coerce.number().int().positive(),
  expected_date: optStr.refine(v => {
    if (!v) return true;
    const today = new Date().toISOString().split('T')[0];
    return v >= today;
  }, 'Expected date cannot be in the past'),
  notes: optStr,
  items: z.array(line).min(1, 'Add at least one item'),
});

export const grnSchema = z.object({
  invoice_no: optStr, notes: optStr,
  items: z.array(z.object({
    po_item_id: z.coerce.number().int().positive(),
    qty_received: num.min(0), qty_rejected: num.min(0).default(0),
    batch_no: optStr,
    expiry_date: optStr,
    bin_id: z.coerce.number().int().positive().optional().nullable(),
  })).min(1),
});

export const soSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  warehouse_id: z.coerce.number().int().positive(),
  notes: optStr, items: z.array(line).min(1, 'Add at least one item'),
});

export const transferSchema = z.object({
  from_warehouse_id: z.coerce.number().int().positive(),
  to_warehouse_id: z.coerce.number().int().positive(),
  notes: optStr,
  items: z.array(z.object({ product_id: z.coerce.number().int().positive(), qty: num.positive() })).min(1),
}).refine(d => d.from_warehouse_id !== d.to_warehouse_id, 'Source and destination must differ');

export const adjustmentSchema = z.object({
  warehouse_id: z.coerce.number().int().positive(),
  reason: z.enum(['CYCLE_COUNT', 'DAMAGE', 'EXPIRY', 'FOUND', 'OPENING', 'OTHER']),
  notes: optStr,
  items: z.array(z.object({
    product_id: z.coerce.number().int().positive(),
    qty_change: num.refine(v => v !== 0, 'Quantity change cannot be 0'),
    unit_cost: num.min(0).default(0),
  })).min(1),
});

export const paymentSchema = z.object({
  vendor_id: z.coerce.number().int().positive(),
  po_id: z.coerce.number().int().positive().optional().nullable(),
  amount: num.positive(), paid_on: optStr,
  mode: z.enum(['BANK', 'UPI', 'CHEQUE', 'CASH']).default('BANK'), reference: optStr,
});
