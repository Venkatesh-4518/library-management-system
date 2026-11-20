
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutUser } from '@/app/auth/actions';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/books', label: 'Books' },
  { href: '/catalog', label: 'Authors & Categories' },
  { href: '/members', label: 'Members' },
  { href: '/borrowings', label: 'Issue / Return' },
  { href: '/reports', label: 'SQL Reports' },
  { href: '/activity', label: 'Activity Log' },
];

export default function Nav() {
  const pathname = usePathname();

  // Hide the main navigation on authentication pages.
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">L</span>
          Library Management System
        </Link>

        <nav className="nav" aria-label="Main">
          {LINKS.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? 'nav-link active' : 'nav-link'}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <form action={logoutUser}>
          <button type="submit" className="nav-link">
            Logout
          </button>
        </form>
      </div>
    </header>
  );
}
