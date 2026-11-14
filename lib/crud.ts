import { query, one } from './db';

/** Generic master-data CRUD — table/columns are fixed server-side (never from user input). */
export function crud(table: string, columns: string[], orderBy = 'id DESC') {
  return {
    list: (search?: string) =>
      search
        ? query(`SELECT * FROM ${table} WHERE ${columns.filter(c => ['name', 'code', 'sku', 'email', 'barcode', 'hsn_code'].includes(c))
            .map(c => `${c} ILIKE $1`).join(' OR ')} ORDER BY ${orderBy} LIMIT 500`, [`%${search}%`])
        : query(`SELECT * FROM ${table} ORDER BY ${orderBy} LIMIT 500`),
    get: (id: number) => one(`SELECT * FROM ${table} WHERE id=$1`, [id]),
    create: (data: Record<string, unknown>) => {
      const cols = columns.filter(c => c in data);
      return one(
        `INSERT INTO ${table}(${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
        cols.map(c => data[c]));
    },
    update: (id: number, data: Record<string, unknown>) => {
      const cols = columns.filter(c => c in data);
      return one(
        `UPDATE ${table} SET ${cols.map((c, i) => `${c}=$${i + 1}`).join(',')} WHERE id=$${cols.length + 1} RETURNING *`,
        [...cols.map(c => data[c]), id]);
    },
  };
}

export const products   = crud('products',   ['sku','name','category_id','uom','barcode','hsn_code','cost_price','sale_price','tax_rate','reorder_level','reorder_qty','active']);
export const vendors    = crud('vendors',    ['code','name','contact_person','email','phone','gstin','address','payment_terms_days','rating','active']);
export const warehouses = crud('warehouses', ['code','name','address','city','manager','active'], 'code');
export const customers  = crud('customers',  ['name','email','phone','gstin','address']);
export const categories = crud('categories', ['name'], 'name');
