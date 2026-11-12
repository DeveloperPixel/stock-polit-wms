import Link from 'next/link';
import { dashboard } from '@/lib/services/inventory';

const inr = (v: any) => '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const n = (v: any) => Number(v).toLocaleString('en-IN', { maximumFractionDigits: 3 });

export default async function Dashboard() {
  const d = await dashboard();
  const k = d.kpi;
  const maxV = Math.max(1, ...d.byWarehouse.map((w: any) => Number(w.value)));
  const tiles: [string, string, string][] = [
    ['Total stock value', inr(k.stock_value), '/stock'], ['Low-stock items', n(k.low_stock), '/stock'],
    ['POs awaiting approval', n(k.pending_approval), '/purchase-orders'], ['Open POs (to receive)', n(k.open_pos), '/purchase-orders'],
    ['Orders to dispatch', n(k.to_dispatch), '/sales-orders'], ['Vendor payables', inr(k.payables), '/vendors'],
    ['Active products', n(k.products), '/products'], ['Warehouses', n(k.warehouses), '/warehouses'],
  ];
  return (
    <>
      <div className="topbar"><h1>Dashboard</h1>
        <div className="row"><Link className="btn" href="/purchase-orders/new">+ Purchase order</Link><Link className="btn primary" href="/sales-orders/new">+ Sales order</Link></div></div>
      <div className="grid g4">{tiles.map(([l, v, h]) => <Link key={l} href={h} className="card kpi" style={{ color: 'inherit' }}><div className="label">{l}</div><div className="val">{v}</div></Link>)}</div>
      <div className="grid g2">
        <div className="card"><h3 style={{ marginTop: 0 }}>Reorder alerts</h3>
          <table><thead><tr><th>SKU</th><th>Product</th><th className="num">Available</th><th className="num">Reorder at</th><th>Vendor</th></tr></thead>
            <tbody>{d.lowStock.map((r: any) => <tr key={r.product_id}><td>{r.sku}</td><td>{r.name}</td><td className="num low">{n(r.qty_available)}</td><td className="num">{n(r.reorder_level)}</td><td>{r.preferred_vendor ?? '—'}</td></tr>)}
              {!d.lowStock.length && <tr><td colSpan={5} className="muted">All items above reorder level</td></tr>}</tbody></table>
        </div>
        <div className="card"><h3 style={{ marginTop: 0 }}>Stock value by warehouse</h3>
          {d.byWarehouse.map((w: any) => (
            <div key={w.warehouse_code} style={{ marginBottom: 12 }}>
              <div className="row"><b>{w.warehouse_code}</b><div className="spacer" />{inr(w.value)}</div>
              <div className="bar" style={{ width: `${(Number(w.value) / maxV) * 100}%` }} />
            </div>))}
        </div>
      </div>
      <div className="card"><h3 style={{ marginTop: 0 }}>Recent stock movements</h3>
        <table><thead><tr><th>When</th><th>Type</th><th>Ref</th><th>SKU</th><th>WH</th><th className="num">Qty</th><th className="num">Balance</th></tr></thead>
          <tbody>{d.recent.map((m: any) => <tr key={m.id}><td>{new Date(m.created_at).toLocaleString('en-IN')}</td><td><span className="badge">{m.movement}</span></td><td>{m.ref_no ?? '—'}</td><td>{m.sku}</td><td>{m.warehouse}</td>
            <td className="num" style={{ color: Number(m.qty) < 0 ? 'var(--danger)' : 'var(--teal)' }}>{Number(m.qty) > 0 ? '+' : ''}{n(m.qty)}</td><td className="num">{n(m.balance_after)}</td></tr>)}</tbody></table>
      </div>
    </>
  );
}
