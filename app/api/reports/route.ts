import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = api(async req => {
  await requireRole();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'valuation';
  const warehouseId = searchParams.get('warehouse_id');

  if (type === 'valuation') {
    let sql = `
      SELECT
        p.id AS product_id,
        p.sku,
        p.name AS product_name,
        COALESCE(c.name, 'Uncategorized') AS category,
        p.uom,
        w.id AS warehouse_id,
        w.code AS warehouse_code,
        w.name AS warehouse_name,
        s.qty_on_hand,
        s.qty_reserved,
        (s.qty_on_hand - s.qty_reserved) AS qty_available,
        s.avg_cost,
        ROUND(s.qty_on_hand * s.avg_cost, 2) AS stock_value
      FROM stock_levels s
      JOIN products p ON p.id = s.product_id
      JOIN warehouses w ON w.id = s.warehouse_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE s.qty_on_hand > 0
    `;
    const params: any[] = [];
    if (warehouseId) {
      params.push(warehouseId);
      sql += ` AND s.warehouse_id = $${params.length}`;
    }
    sql += ` ORDER BY stock_value DESC`;
    const rows = await query(sql, params);
    return rows;
  }

  if (type === 'low_stock') {
    const rows = await query(`
      SELECT
        p.id AS product_id,
        p.sku,
        p.name AS product_name,
        p.reorder_level,
        p.reorder_qty,
        COALESCE(SUM(s.qty_on_hand - s.qty_reserved), 0) AS qty_available,
        (SELECT v.name FROM product_vendors pv JOIN vendors v ON v.id = pv.vendor_id
          WHERE pv.product_id = p.id ORDER BY pv.preferred DESC, pv.unit_price LIMIT 1) AS preferred_vendor,
        (SELECT v.email FROM product_vendors pv JOIN vendors v ON v.id = pv.vendor_id
          WHERE pv.product_id = p.id ORDER BY pv.preferred DESC, pv.unit_price LIMIT 1) AS vendor_email
      FROM products p
      LEFT JOIN stock_levels s ON s.product_id = p.id
      WHERE p.active
      GROUP BY p.id
      HAVING COALESCE(SUM(s.qty_on_hand - s.qty_reserved), 0) <= p.reorder_level
      ORDER BY (p.reorder_level - COALESCE(SUM(s.qty_on_hand - s.qty_reserved), 0)) DESC
    `);
    return rows;
  }

  if (type === 'vendor_payables') {
    const rows = await query(`
      SELECT
        v.id AS vendor_id,
        v.code AS vendor_code,
        v.name AS vendor_name,
        v.payment_terms_days,
        COALESCE((SELECT SUM(g.total_value) FROM goods_receipts g
                   JOIN purchase_orders po ON po.id = g.po_id
                  WHERE po.vendor_id = v.id), 0) AS total_received_value,
        COALESCE((SELECT SUM(amount) FROM vendor_payments vp WHERE vp.vendor_id = v.id), 0) AS total_paid,
        COALESCE((SELECT SUM(g.total_value) FROM goods_receipts g
                   JOIN purchase_orders po ON po.id = g.po_id
                  WHERE po.vendor_id = v.id), 0)
        - COALESCE((SELECT SUM(amount) FROM vendor_payments vp WHERE vp.vendor_id = v.id), 0) AS balance_due,
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.vendor_id = v.id
           AND po.status IN ('APPROVED', 'PARTIAL')) AS open_pos
      FROM vendors v
      ORDER BY balance_due DESC
    `);
    return rows;
  }

  if (type === 'movements_summary') {
    const days = parseInt(searchParams.get('days') || '30', 10);
    const rows = await query(`
      SELECT
        sm.movement,
        COUNT(*) AS total_transactions,
        SUM(CASE WHEN sm.qty > 0 THEN sm.qty ELSE 0 END) AS total_in_qty,
        SUM(CASE WHEN sm.qty < 0 THEN ABS(sm.qty) ELSE 0 END) AS total_out_qty,
        SUM(ABS(sm.qty) * sm.unit_cost) AS total_movement_value
      FROM stock_movements sm
      WHERE sm.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY sm.movement
      ORDER BY total_movement_value DESC
    `);
    return rows;
  }

  return [];
});
