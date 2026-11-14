import { PoolClient } from 'pg';
import { tx, query, one } from '../db';
import { HttpError } from '../auth';

type Line = { product_id: number; qty: number; unit_price: number; tax_rate: number };

function totals(items: Line[]) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const tax = items.reduce((s, i) => s + (i.qty * i.unit_price * i.tax_rate) / 100, 0);
  return { subtotal: +subtotal.toFixed(2), tax: +tax.toFixed(2), total: +(subtotal + tax).toFixed(2) };
}

export async function createPO(d: { vendor_id: number; warehouse_id: number; expected_date: string | null; notes: string | null; items: Line[] }, userId: number) {
  return tx(async c => {
    const t = totals(d.items);
    const { rows: [po] } = await c.query(
      `INSERT INTO purchase_orders(po_number,vendor_id,warehouse_id,expected_date,notes,subtotal,tax_total,total,created_by)
       VALUES (next_doc_no('PO'),$1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [d.vendor_id, d.warehouse_id, d.expected_date, d.notes, t.subtotal, t.tax, t.total, userId]);
    for (const i of d.items)
      await c.query(
        `INSERT INTO purchase_order_items(po_id,product_id,qty_ordered,unit_price,tax_rate) VALUES ($1,$2,$3,$4,$5)`,
        [po.id, i.product_id, i.qty, i.unit_price, i.tax_rate]);
    return po;
  });
}

async function lockPO(c: PoolClient, id: number) {
  const { rows: [po] } = await c.query(`SELECT * FROM purchase_orders WHERE id=$1 FOR UPDATE`, [id]);
  if (!po) throw new HttpError(404, 'Purchase order not found');
  return po;
}

export async function approvePO(id: number, userId: number) {
  return tx(async c => {
    const po = await lockPO(c, id);
    if (po.status !== 'DRAFT') throw new HttpError(422, `Cannot approve a ${po.status} PO`);
    const { rows: [r] } = await c.query(
      `UPDATE purchase_orders SET status='APPROVED', approved_by=$2, approved_at=now() WHERE id=$1 RETURNING *`, [id, userId]);
    return r;
  });
}

export async function cancelPO(id: number) {
  return tx(async c => {
    const po = await lockPO(c, id);
    if (!['DRAFT', 'APPROVED'].includes(po.status)) throw new HttpError(422, `Cannot cancel a ${po.status} PO`);
    const { rows: [r] } = await c.query(`UPDATE purchase_orders SET status='CANCELLED' WHERE id=$1 RETURNING *`, [id]);
    return r;
  });
}

/** Goods Receipt: posts GRN, increases stock via ledger, updates PO status */
export async function receivePO(id: number, d: { invoice_no: string | null; notes: string | null;
  items: { po_item_id: number; qty_received: number; qty_rejected: number; batch_no?: string | null; expiry_date?: string | null; bin_id?: number | null }[] }, userId: number) {
  return tx(async c => {
    const po = await lockPO(c, id);
    if (!['APPROVED', 'PARTIAL'].includes(po.status)) throw new HttpError(422, `PO must be APPROVED to receive (is ${po.status})`);
    const accepted = d.items.filter(i => i.qty_received > 0 || i.qty_rejected > 0);
    if (!accepted.length) throw new HttpError(422, 'Enter quantity for at least one line');

    const { rows: [grn] } = await c.query(
      `INSERT INTO goods_receipts(grn_number,po_id,warehouse_id,invoice_no,notes,created_by)
       VALUES (next_doc_no('GRN'),$1,$2,$3,$4,$5) RETURNING *`,
      [id, po.warehouse_id, d.invoice_no, d.notes, userId]);

    let value = 0;
    for (const i of accepted) {
      const { rows: [line] } = await c.query(
        `SELECT * FROM purchase_order_items WHERE id=$1 AND po_id=$2 FOR UPDATE`, [i.po_item_id, id]);
      if (!line) throw new HttpError(422, `Line ${i.po_item_id} not on this PO`);
      const pending = Number(line.qty_ordered) - Number(line.qty_received);
      if (i.qty_received > pending) throw new HttpError(422, `Receiving ${i.qty_received} exceeds pending ${pending}`);

      await c.query(
        `INSERT INTO goods_receipt_items(grn_id,po_item_id,product_id,qty_received,qty_rejected,unit_cost,batch_no,expiry_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [grn.id, line.id, line.product_id, i.qty_received, i.qty_rejected, line.unit_price, i.batch_no || null, i.expiry_date || null]);
      if (i.qty_received > 0) {
        await c.query(`UPDATE purchase_order_items SET qty_received = qty_received + $1 WHERE id=$2`, [i.qty_received, line.id]);
        await c.query(
          `INSERT INTO stock_movements(product_id,warehouse_id,movement,qty,unit_cost,ref_type,ref_id,ref_no,note,batch_no,expiry_date,bin_id,created_by)
           VALUES ($1,$2,'GRN',$3,$4,'GRN',$5,$6,$7,$8,$9,$10,$11)`,
          [line.product_id, po.warehouse_id, i.qty_received, line.unit_price, grn.id, grn.grn_number,
           i.batch_no ? `Batch: ${i.batch_no}` : null, i.batch_no || null, i.expiry_date || null, i.bin_id || null, userId]);
        value += i.qty_received * Number(line.unit_price) * (1 + Number(line.tax_rate) / 100);
      }
    }
    await c.query(`UPDATE goods_receipts SET total_value=$1 WHERE id=$2`, [value.toFixed(2), grn.id]);

    const { rows: [s] } = await c.query(
      `SELECT bool_and(qty_received >= qty_ordered) AS done FROM purchase_order_items WHERE po_id=$1`, [id]);
    await c.query(`UPDATE purchase_orders SET status=$2 WHERE id=$1`, [id, s.done ? 'RECEIVED' : 'PARTIAL']);
    return { ...grn, total_value: +value.toFixed(2) };
  });
}

export const listPOs = (status?: string) => query(
  `SELECT po.*, v.name AS vendor, w.code AS warehouse
     FROM purchase_orders po JOIN vendors v ON v.id=po.vendor_id JOIN warehouses w ON w.id=po.warehouse_id
    WHERE ($1::text IS NULL OR po.status::text=$1) ORDER BY po.id DESC LIMIT 500`, [status ?? null]);

export async function getPO(id: number) {
  const po = await one(
    `SELECT po.*, v.name AS vendor, v.email AS vendor_email, v.gstin AS vendor_gstin, w.name AS warehouse,
            cu.name AS created_by_name, au.name AS approved_by_name
       FROM purchase_orders po JOIN vendors v ON v.id=po.vendor_id JOIN warehouses w ON w.id=po.warehouse_id
       LEFT JOIN users cu ON cu.id=po.created_by LEFT JOIN users au ON au.id=po.approved_by WHERE po.id=$1`, [id]);
  if (!po) return null;
  const items = await query(
    `SELECT i.*, p.sku, p.name, p.uom FROM purchase_order_items i JOIN products p ON p.id=i.product_id
      WHERE i.po_id=$1 ORDER BY i.id`, [id]);
  const grns = await query(`SELECT * FROM goods_receipts WHERE po_id=$1 ORDER BY id`, [id]);
  return { ...po, items, grns };
}

export async function recordPayment(d: { vendor_id: number; po_id?: number | null; amount: number; paid_on: string | null; mode: string; reference: string | null }, userId: number) {
  return one(
    `INSERT INTO vendor_payments(vendor_id,po_id,amount,paid_on,mode,reference,created_by)
     VALUES ($1,$2,$3,COALESCE($4::date,CURRENT_DATE),$5,$6,$7) RETURNING *`,
    [d.vendor_id, d.po_id ?? null, d.amount, d.paid_on, d.mode, d.reference, userId]);
}
