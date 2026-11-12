'use client';
import { money } from '@/lib/client';

export type Line = { product_id: number | ''; qty: number | ''; unit_price?: number | ''; tax_rate?: number | ''; unit_cost?: number | '' };
type Product = { id: number; sku: string; name: string; uom: string; cost_price: string; sale_price: string; tax_rate: string };

/** Editable item grid used by PO, SO, Transfer, Adjustment forms */
export default function LineItems({ lines, setLines, products, mode, priceFor }: {
  lines: Line[]; setLines: (l: Line[]) => void; products: Product[];
  mode: 'purchase' | 'sale' | 'qty' | 'adjust'; priceFor?: (productId: number) => number | undefined;
}) {
  const priced = mode === 'purchase' || mode === 'sale';
  const upd = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const pick = (i: number, id: number) => {
    const p = products.find(x => x.id === id);
    if (!p) return upd(i, { product_id: '' });
    const price = mode === 'sale' ? Number(p.sale_price) : priceFor?.(id) ?? Number(p.cost_price);
    upd(i, { product_id: id, unit_price: price, tax_rate: Number(p.tax_rate) });
  };
  const total = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit_price || 0) * (1 + Number(l.tax_rate || 0) / 100), 0);

  return (
    <div className="card" style={{ padding: 0 }}>
      <table>
        <thead><tr>
          <th style={{ width: '40%' }}>Product</th>
          <th className="num">{mode === 'adjust' ? 'Qty change (+/−)' : 'Qty'}</th>
          {priced && <><th className="num">Unit price</th><th className="num">Tax %</th><th className="num">Line total</th></>}
          {mode === 'adjust' && <th className="num">Unit cost (for +)</th>}
          <th />
        </tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td><select value={l.product_id} onChange={e => pick(i, Number(e.target.value))}>
                <option value="">— product —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}
              </select></td>
              <td><input type="number" step="any" value={l.qty} onChange={e => upd(i, { qty: e.target.value === '' ? '' : Number(e.target.value) })} /></td>
              {priced && <>
                <td><input type="number" step="any" value={l.unit_price} onChange={e => upd(i, { unit_price: Number(e.target.value) })} /></td>
                <td><input type="number" step="any" value={l.tax_rate} onChange={e => upd(i, { tax_rate: Number(e.target.value) })} /></td>
                <td className="num">{money(Number(l.qty || 0) * Number(l.unit_price || 0) * (1 + Number(l.tax_rate || 0) / 100))}</td>
              </>}
              {mode === 'adjust' && <td><input type="number" step="any" value={l.unit_cost ?? ''} onChange={e => upd(i, { unit_cost: Number(e.target.value) })} /></td>}
              <td><button type="button" className="btn sm danger" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row" style={{ padding: 12 }}>
        <button type="button" className="btn sm" onClick={() => setLines([...lines, { product_id: '', qty: '' }])}>+ Add line</button>
        <div className="spacer" />
        {priced && <b>Grand total: {money(total)}</b>}
      </div>
    </div>
  );
}
