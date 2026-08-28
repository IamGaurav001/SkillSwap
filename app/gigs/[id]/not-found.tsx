import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Gig not found' };

export default function GigNotFound() {
  return (
    <div className="empty">
      <h2>That gig is no longer listed</h2>
      <p>The link may be stale, or the creator removed the gig.</p>
      <Link className="btn" href="/">
        Browse the marketplace
      </Link>
    </div>
  );
}
