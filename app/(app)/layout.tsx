import { requirePageUser } from '@/lib/auth';
import Shell, { NavGroup } from '@/components/Shell';
import { ToastProvider } from '@/components/Toast';

export const dynamic = 'force-dynamic';

const nav: NavGroup[] = [
  {
    title: 'Overview',
    links: [
      { href: '/', label: 'Dashboard', icon: 'dashboard' },
      { href: '/reports', label: 'Reports & Analytics', icon: 'bar-chart' }
    ]
  },
  {
    title: 'Inventory',
    links: [
      { href: '/stock', label: 'Stock Levels', icon: 'layers' },
      { href: '/stock/movements', label: 'Stock Ledger', icon: 'book' },
      { href: '/transfers', label: 'Transfers', icon: 'repeat' },
      { href: '/adjustments', label: 'Adjustments', icon: 'sliders' }
    ]
  },
  {
    title: 'Inbound',
    links: [
      { href: '/purchase-orders', label: 'Purchase Orders', icon: 'shopping-cart' },
      { href: '/vendors', label: 'Vendors', icon: 'truck' },
      { href: '/vendor-payments', label: 'Vendor Payments', icon: 'credit-card' }
    ]
  },
  {
    title: 'Outbound',
    links: [
      { href: '/sales-orders', label: 'Sales / Dispatch', icon: 'send' },
      { href: '/customers', label: 'Customers', icon: 'users' }
    ]
  },
  {
    title: 'Masters',
    links: [
      { href: '/products', label: 'Products', icon: 'box' },
      { href: '/categories', label: 'Categories', icon: 'tag' },
      { href: '/warehouses', label: 'Warehouses', icon: 'home' },
      { href: '/users', label: 'Users', icon: 'user' }
    ]
  }
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return (
    <ToastProvider>
      <Shell user={user} nav={nav}>
        {children}
      </Shell>
    </ToastProvider>
  );
}
