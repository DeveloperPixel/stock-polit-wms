'use client';
import { useState } from 'react';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export interface NavGroup {
  title: string;
  links: NavItem[];
}

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...common}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case 'repeat':
      return (
        <svg {...common}>
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      );
    case 'sliders':
      return (
        <svg {...common}>
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      );
    case 'shopping-cart':
      return (
        <svg {...common}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case 'truck':
      return (
        <svg {...common}>
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    case 'credit-card':
      return (
        <svg {...common}>
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      );
    case 'send':
      return (
        <svg {...common}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'box':
      return (
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...common}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Shell({
  user,
  nav,
  children
}: {
  user: { name: string; role: string; email?: string };
  nav: NavGroup[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`app ${open ? 'sidebar-open' : ''}`}>
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <button
          type="button"
          className="hamburger-btn"
          aria-label="Toggle navigation menu"
          onClick={() => setOpen(!open)}
        >
          {open ? '✕' : '☰'}
        </button>
        <div className="brand">
          Stock<span>Pilot</span>
        </div>
        <div className="mobile-user-badge">{user.role}</div>
      </header>

      {/* Backdrop overlay for mobile menu */}
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`side ${open ? 'side-visible' : ''}`}>
        {/* Top: Brand */}
        <div className="brand-desktop">
          <div className="brand">
            Stock<span>Pilot</span>
          </div>
        </div>

        {/* Top: Admin / User Profile Card with Sign Out Button at the Bottom */}
        <div className="sidebar-user-card">
          <div className="user-info-row">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-meta">
              <div className="user-name">{user.name}</div>
              <div className="user-role-badge">{user.role}</div>
            </div>
          </div>
          <div className="user-actions">
            <LogoutButton />
          </div>
        </div>

        {/* Navigation Sections with Minimal Monochrome White SVG Icons */}
        <div className="nav-scroll">
          {nav?.map(section => (
            <div key={section.title} className="nav-group">
              <h6>{section.title}</h6>
              {(section.links || [])
                .filter(item => item.href !== '/users' || user?.role === 'ADMIN')
                .map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="nav-link"
                  >
                    <span className="nav-icon" aria-hidden="true">
                      <NavIcon name={item.icon} />
                    </span>
                    <span className="nav-text">{item.label}</span>
                  </Link>
                ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main">{children}</main>
    </div>
  );
}
