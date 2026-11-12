import { tx, query, one } from '../db';
import { HttpError } from '../auth';

type Line = { product_id: number; qty: number; unit_price: number; tax_rate: number };

export async function createSO(d: { customer_id: number; warehouse_id: number; notes: string | null; items: Line[] }, userId: number) {
  return tx(async c => {
    const sub = d.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const tax = d.items.reduce((s, i) => s + (i.qty * i.unit_price * i.tax_rate) / 100, 0);
    const { rows: [so] } = await c.query(
      `INSERT INTO sales_orders(so_number,customer_id,warehouse_id,notes,subtotal,tax_total,total,created_by)
       VALUES (next_doc_no('SO'),$1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [d.customer_id, d.warehouse_id, d.notes, sub.toFixed(2), tax.toFixed(2), (sub + tax).toFixed(2), userId]);
    for (const i of d.items)
      await c.query(`INSERT INTO sales_order_items(so_id,product_id,qty,unit_price,tax_rate) VALUES ($1,$2,$3,$4,$5)`,
        [so.id, i.product_id, i.qty, i.unit_price, i.tax_rate]);
    return so;
  });
}

async function lockSO(c: any, id: number) {
  const { rows: [so] } = await c.query(`SELECT * FROM sales_orders WHERE id=$1 FOR UPDATE`, [id]);
  if (!so) throw new HttpError(404, 'Sales order not found');
  const { rows: items } = await c.query(
    `SELECT i.*, p.sku FROM sales_order_items i JOIN products p ON p.id=i.product_id WHERE so_id=$1`, [id]);
  return { so, items };
}

/** Confirm = reserve stock (available = on_hand - reserved) */
export async function confirmSO(id: number) {
  return tx(async c => {
    const { so, items } = await lockSO(c, id);
    if (so.status !== 'DRAFT') throw new HttpError(422, `Cannot confirm a ${so.status} order`);
    for (const i of items) {
      const { rowCount } = await c.query(
        `UPDATE stock_levels SET qty_reserved = qty_reserved + $1, updated_at=now()
          WHERE product_id=$2 AND warehouse_id=$3 AND qty_on_hand - qty_reserved >= $1`,
        [i.qty, i.product_id, so.warehouse_id]);
      if (!rowCount) throw new HttpError(422, `Insufficient available stock for ${i.sku}`);
    }
    const { rows: [r] } = await c.query(`UPDATE sales_orders SET status='CONFIRMED' WHERE id=$1 RETURNING *`, [id]);
    return r;
  });
}

/** Dispatch = release reservation + post negative stock movement */
export async function dispatchSO(id: number, userId: number) {
  return tx(async c => {
    const { so, items } = await lockSO(c, id);
    if (so.status !== 'CONFIRMED') throw new HttpError(422, `Only CONFIRMED orders can be dispatched (is ${so.status})`);
    for (const i of items) {
      await c.query(`UPDATE stock_levels SET qty_reserved = qty_reserved - $1 WHERE product_id=$2 AND warehouse_id=$3`,
        [i.qty, i.product_id, so.warehouse_id]);
      await c.query(
        `INSERT INTO stock_movements(product_id,warehouse_id,movement,qty,ref_type,ref_id,ref_no,created_by)
         VALUES ($1,$2,'DISPATCH',$3,'SO',$4,$5,$6)`,
        [i.product_id, so.warehouse_id, -i.qty, so.id, so.so_number, userId]);
    }
    const { rows: [r] } = await c.query(
      `UPDATE sales_orders SET status='DISPATCHED', dispatched_at=now() WHERE id=$1 RETURNING *`, [id]);
    return r;
  });
}

export async function cancelSO(id: number) {
  return tx(async c => {
    const { so, items } = await lockSO(c, id);
    if (!['DRAFT', 'CONFIRMED'].includes(so.status)) throw new HttpError(422, `Cannot cancel a ${so.status} order`);
    if (so.status === 'CONFIRMED')
      for (const i of items)
        await c.query(`UPDATE stock_levels SET qty_reserved = qty_reserved - $1 WHERE product_id=$2 AND warehouse_id=$3`,
          [i.qty, i.product_id, so.warehouse_id]);
    const { rows: [r] } = await c.query(`UPDATE sales_orders SET status='CANCELLED' WHERE id=$1 RETURNING *`, [id]);
    return r;
  });
}

export const listSOs = () => query(
  `SELECT so.*, c.name AS customer, w.code AS warehouse FROM sales_orders so
     JOIN customers c ON c.id=so.customer_id JOIN warehouses w ON w.id=so.warehouse_id ORDER BY so.id DESC LIMIT 500`);

export async function getSO(id: number) {
  const so = await one(
    `SELECT so.*, c.name AS customer, c.address AS customer_address, w.name AS warehouse
       FROM sales_orders so JOIN customers c ON c.id=so.customer_id JOIN warehouses w ON w.id=so.warehouse_id WHERE so.id=$1`, [id]);
  if (!so) return null;
  const items = await query(
    `SELECT i.*, p.sku, p.name, p.uom,
            COALESCE(s.qty_on_hand - s.qty_reserved, 0) AS available
       FROM sales_order_items i JOIN products p ON p.id=i.product_id
       LEFT JOIN stock_levels s ON s.product_id=i.product_id AND s.warehouse_id=$2
      WHERE so_id=$1 ORDER BY i.id`, [id, so.warehouse_id]);
  return { ...so, items };
}
