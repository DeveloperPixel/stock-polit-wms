# StockPilot WMS — Stock, Vendor & Warehouse Management (Next.js + PostgreSQL)

Full architecture, flows, API reference and screenshots: see StockPilot_WMS_Architecture_and_Source.pdf

## Quick start
1. Node.js 18+ and PostgreSQL 14+ installed. `createdb wms`
2. `cp .env.example .env` and set DATABASE_URL and JWT_SECRET
3. `npm install`
4. `export $(cat .env | xargs) && npm run db:init`   (creates schema + demo data)
5. `npm run dev` → http://localhost:3000

Demo logins (password Admin@123): admin@wms.local · manager@wms.local · staff@wms.local — change before production.

## Flow
Vendor/Product master → PO (DRAFT) → Approve → GRN (stock IN) → Transfer/Adjust → Sales order → Confirm (reserve) → Dispatch (stock OUT) → Vendor payment

All stock changes are rows in `stock_movements`; the PostgreSQL trigger keeps `stock_levels` (on hand, reserved, weighted average cost) in sync and blocks negative stock.
