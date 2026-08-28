'use client';

/**
 * The booking form and its confirmation (Feature 3).
 *
 * The confirmation replaces the form in place rather than navigating away: the
 * client's own next question is "did that work, and what happens now?", and the
 * answer is more useful next to the gig they just booked than on a fresh page.
 * `role="status"` means a screen reader hears it without the focus being stolen.
 *
 * The client's name is remembered in localStorage so the "My bookings" page can
 * prefill it. That is a convenience, not identity -- the app has no accounts, and
 * the standard API is deliberately unauthenticated, so a name is all a booking is
 * keyed on. Documented in the README as a known limitation.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import type { Booking } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { rememberClientName } from '@/lib/client-name';

interface Props {
  gigId: string;
  gigTitle: string;
  creatorName: string;
}

interface Confirmation extends Booking {
  /** Other Pending bookings on this gig at the moment of booking (DP2). */
  pendingAhead?: number;
}

export function BookGigForm({ gigId, gigTitle, creatorName }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [booking, setBooking] = useState<Confirmation | null>(null);
  const errorId = useId();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const data = new FormData(event.currentTarget);
    const clientName = String(data.get('clientName') ?? '').trim();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          gigId,
          clientName,
          message: String(data.get('message') ?? ''),
        }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError({
          field: body?.field,
          message: body?.error ?? `The booking could not be created (HTTP ${res.status}).`,
        });
        setSubmitting(false);
        return;
      }

      rememberClientName(clientName);
      setBooking(body as Confirmation);
      setSubmitting(false);
      // The surrounding server component rendered "Open requests" before this
      // booking existed. Without a refresh the page would sit there telling the
      // next reader the gig has no pending requests, moments after taking one.
      router.refresh();
    } catch {
      setError({ message: 'Could not reach the server. Check your connection and try again.' });
      setSubmitting(false);
    }
  }

  if (booking) {
    const ahead = booking.pendingAhead ?? 0;
    return (
      <div className="stack" role="status">
        <div className="notice notice--success">
          <p className="notice__title">Booking request sent</p>
          <p>
            {creatorName} has your request for <strong>{gigTitle}</strong>. It stays{' '}
            <StatusBadge status={booking.status} /> until they accept or decline.
          </p>
        </div>
        <dl className="definition-list">
          <dt>Booking ID</dt>
          <dd>
            <code>{booking.id}</code>
          </dd>
          <dt>Booked as</dt>
          <dd>{booking.clientName}</dd>
          <dt>Status</dt>
          <dd>
            <StatusBadge status={booking.status} />
          </dd>
          {ahead > 0 && (
            <>
              <dt>Queue</dt>
              <dd>
                {ahead} other request{ahead === 1 ? '' : 's'} on this gig {ahead === 1 ? 'is' : 'are'}{' '}
                also pending.
              </dd>
            </>
          )}
        </dl>
        <div className="btn-row">
          <Link className="btn" href={`/my-bookings?clientName=${encodeURIComponent(booking.clientName)}`}>
            Track it in My bookings
          </Link>
          <Link className="btn btn--secondary" href="/">
            Book something else
          </Link>
        </div>
      </div>
    );
  }

  const invalid = (field: string) => (error?.field === field ? true : undefined);

  return (
    <form className="form form--wide" onSubmit={onSubmit} noValidate>
      {error && (
        <div className="notice notice--error" role="alert" id={errorId}>
          <p className="notice__title">The booking was not created</p>
          <p>{error.message}</p>
        </div>
      )}

      <div className="field">
        <label htmlFor="clientName">Your name</label>
        <input
          id="clientName"
          name="clientName"
          type="text"
          maxLength={80}
          required
          autoComplete="name"
          aria-invalid={invalid('clientName')}
          aria-describedby={`clientName-hint${error?.field === 'clientName' ? ` ${errorId}` : ''}`}
          placeholder="Asha"
        />
        <p className="field__hint" id="clientName-hint">
          Bookings are looked up by this name, so use the same one each time.
        </p>
      </div>

      <div className="field">
        <label htmlFor="message">Anything the creator should know? (optional)</label>
        <textarea
          id="message"
          name="message"
          maxLength={1000}
          aria-invalid={invalid('message')}
          placeholder="Need it before the 14th, for a college fest."
        />
      </div>

      <div className="btn-row">
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Sending request…' : 'Request booking'}
        </button>
      </div>
    </form>
  );
}
