import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="empty">
      <h2>That page does not exist</h2>
      <p>The link may be out of date.</p>
      <Link className="btn" href="/">
        Go to the marketplace
      </Link>
    </div>
  );
}
