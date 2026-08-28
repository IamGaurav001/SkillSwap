'use client';

/**
 * Primary navigation.
 *
 * Client-side only because `aria-current="page"` needs the active pathname --
 * that attribute is what tells a screen-reader user which of five sibling links
 * they are already on, and it can't be computed on the server for a static shell.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Marketplace' },
  { href: '/gigs/new', label: 'Post a gig' },
  { href: '/dashboard', label: 'Creator dashboard' },
  { href: '/my-bookings', label: 'My bookings' },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Primary">
      <ul>
        {LINKS.map(({ href, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? 'page' : undefined}>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
