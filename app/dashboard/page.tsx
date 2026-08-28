/**
 * Feature 4 -- Creator dashboard: incoming bookings, accept or decline.
 *
 * The dashboard is not scoped to one creator, and that is a consequence of a
 * deliberate constraint rather than an oversight: the standard API must be openly
 * callable, so the app has no accounts to scope it by. Every incoming request is
 * therefore visible, newest first, with the gig it belongs to named on the row.
 * The README records this as the first thing real auth would fix.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { getStore, DEFAULT_LIMIT } from '@/lib/store';
import { formatDateTime, pluralize } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { BookingActions } from '@/components/BookingActions';
import type { BookingStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Creator dashboard',
  description: 'See incoming booking requests and accept or decline them.',
};

const ORDER: BookingStatus[] = ['Pending', 'Accepted', 'Declined'];

export default async function DashboardPage() {
  const store = await getStore();
  const bookings = await store.listBookings({ limit: DEFAULT_LIMIT });

  const counts = ORDER.map((status) => ({
    status,
    n: bookings.filter((b) => b.status === status).length,
  }));

  /**
   * Pending first, then by recency within each group. A creator opens this page to
   * answer requests, so the ones awaiting a decision belong at the top even when
   * they are the oldest rows in the table.
   */
  const sorted = [...bookings].sort((a, b) => {
    const rank = ORDER.indexOf(a.status) - ORDER.indexOf(b.status);
    return rank !== 0 ? rank : b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <>
      <div className="page-head">
        <h1>Creator dashboard</h1>
        <p>
          Every booking request across your gigs. Requests awaiting a decision are listed first —
          accepting one does not decline the others.
        </p>
      </div>

      <p className="result-count">
        {counts.map(({ status, n }, i) => (
          <span key={status}>
            {i > 0 ? ' · ' : ''}
            {n} {status.toLowerCase()}
          </span>
        ))}
      </p>

      {sorted.length === 0 ? (
        <div className="empty">
          <h2>No booking requests yet</h2>
          <p>When a client books one of your gigs, it lands here for you to accept or decline.</p>
          <Link className="btn" href="/gigs/new">
            Post a gig
          </Link>
        </div>
      ) : (
        <ul className="grid">
          {sorted.map((booking) => (
            <li className="card" key={booking.id}>
              <div className="card__meta">
                <StatusBadge status={booking.status} />
                <span className="byline">{formatDateTime(booking.createdAt)}</span>
              </div>
              <h2 className="card__title">
                <Link href={`/gigs/${booking.gigId}`}>{booking.gigTitle}</Link>
              </h2>
              <p className="card__desc">
                Requested by <strong>{booking.clientName}</strong>
              </p>
              {booking.message && <p className="card__desc">&ldquo;{booking.message}&rdquo;</p>}
              {booking.status === 'Declined' && booking.declineReason && (
                <p className="card__desc">
                  <strong>Your reason:</strong> {booking.declineReason}
                </p>
              )}
              <div className="card__footer">
                <BookingActions
                  bookingId={booking.id}
                  status={booking.status}
                  clientName={booking.clientName}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="result-count">{pluralize(sorted.length, 'request')} in total.</p>
    </>
  );
}
