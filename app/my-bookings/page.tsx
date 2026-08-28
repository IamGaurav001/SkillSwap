/**
 * Feature 5 -- My bookings: a client's own requests with their statuses.
 *
 * The lookup is a GET form, so a client's bookings live at a shareable URL and the
 * page works without JavaScript. The name is the key (the app has no accounts);
 * `ClientNameField` prefills it from the last booking made in this browser.
 *
 * DP1 is answered here. A declined booking is never hidden: it keeps its row, adds
 * the creator's reason when one was given, and offers the two things a rejected
 * client actually wants -- other gigs in the same category, and a one-click way to
 * ask the same creator again.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { getStore, DEFAULT_LIMIT } from '@/lib/store';
import { formatDateTime, pluralize } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { ClientNameField } from '@/components/ClientNameField';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My bookings',
  description: 'Look up your booking requests and see whether each one is pending, accepted or declined.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? '';
  return value?.trim() ?? '';
}

export default async function MyBookingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const clientName = one(params.clientName);

  const store = await getStore();
  const bookings = clientName
    ? await store.listBookings({ clientName, limit: DEFAULT_LIMIT })
    : [];

  // For a declined booking, the "similar gigs" suggestion needs the gig's
  // category -- fetched per declined gig rather than for the whole list.
  const declinedGigIds = [...new Set(bookings.filter((b) => b.status === 'Declined').map((b) => b.gigId))];
  const categories = new Map<string, string>();
  for (const gigId of declinedGigIds) {
    const gig = await store.getGig(gigId);
    if (gig) categories.set(gigId, gig.category);
  }

  return (
    <>
      <div className="page-head">
        <h1>My bookings</h1>
        <p>
          Enter the name you booked with to see every request you have made and where each one stands.
        </p>
      </div>

      <form className="filters" method="get" action="/my-bookings">
        <h2 className="visually-hidden">Look up your bookings</h2>
        <div className="filters__row">
          <ClientNameField defaultValue={clientName} />
          <div className="filters__actions">
            <button className="btn" type="submit">
              Show my bookings
            </button>
          </div>
        </div>
      </form>

      <div aria-live="polite">
        {!clientName ? (
          <div className="empty">
            <h2>Enter your name to begin</h2>
            <p>
              Bookings are keyed on the name you typed when you booked — there are no accounts yet.
            </p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty">
            <h2>No bookings under &ldquo;{clientName}&rdquo;</h2>
            <p>
              Check the spelling, or browse the marketplace and book your first gig.
            </p>
            <Link className="btn" href="/">
              Browse gigs
            </Link>
          </div>
        ) : (
          <>
            <p className="result-count">
              {pluralize(bookings.length, 'booking')} for {clientName}, newest first.
            </p>
            <ul className="grid">
              {bookings.map((booking) => (
                <li className="card" key={booking.id}>
                  <div className="card__meta">
                    <StatusBadge status={booking.status} />
                    <span className="byline">{formatDateTime(booking.createdAt)}</span>
                  </div>
                  <h2 className="card__title">
                    <Link href={`/gigs/${booking.gigId}`}>{booking.gigTitle}</Link>
                  </h2>

                  {booking.status === 'Pending' && (
                    <p className="card__desc">
                      Waiting on the creator. You will see the outcome here — nothing else is needed
                      from you.
                    </p>
                  )}

                  {booking.status === 'Accepted' && (
                    <p className="card__desc">
                      Confirmed. The creator has taken this on; sort out delivery details with them
                      directly.
                    </p>
                  )}

                  {booking.status === 'Declined' && (
                    <div className="notice notice--warning">
                      <p className="notice__title">The creator declined this request</p>
                      <p>
                        {booking.declineReason
                          ? `They said: “${booking.declineReason}”`
                          : 'They did not leave a reason. It is usually availability, not your brief.'}
                      </p>
                      <div className="btn-row">
                        <Link className="btn btn--small" href={`/gigs/${booking.gigId}`}>
                          Ask again with new dates
                        </Link>
                        {categories.get(booking.gigId) && (
                          <Link
                            className="btn btn--secondary btn--small"
                            href={`/?category=${encodeURIComponent(categories.get(booking.gigId)!)}`}
                          >
                            See other {categories.get(booking.gigId)} gigs
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {booking.message && (
                    <p className="card__desc">
                      <strong>Your note:</strong> {booking.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
