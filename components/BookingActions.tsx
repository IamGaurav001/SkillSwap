'use client';

/**
 * Accept / decline controls for one booking (Feature 4).
 *
 * Declining opens a short reason field before it commits. That is DP1's other
 * half: a decline the client can't interpret ("Declined", no more) reads as a
 * rejection of them, whereas "booked out that week" reads as a scheduling clash
 * and keeps them on the marketplace. The reason is optional -- a creator who does
 * not want to explain is not blocked -- but it is asked for by default.
 *
 * A decline is reversible: the row keeps an "Accept after all" action, and the API
 * clears the stale reason on the way back.
 */
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import type { BookingStatus } from '@/lib/types';

interface Props {
  bookingId: string;
  status: BookingStatus;
  clientName: string;
}

export function BookingActions({ bookingId, status, clientName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<BookingStatus | null>(null);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonId = useId();
  const errorId = useId();

  async function patch(next: BookingStatus, declineReason = '') {
    setBusy(next);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next, declineReason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Could not update the booking (HTTP ${res.status}).`);
        setBusy(null);
        return;
      }
      setDeclining(false);
      setBusy(null);
      // Re-render the server component so every count on the page agrees again.
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
      setBusy(null);
    }
  }

  if (declining) {
    return (
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void patch('Declined', String(data.get('declineReason') ?? ''));
        }}
      >
        {error && (
          <p className="field__error" role="alert" id={errorId}>
            {error}
          </p>
        )}
        <div className="field">
          <label htmlFor={reasonId}>Reason for {clientName} (optional)</label>
          <input
            id={reasonId}
            name="declineReason"
            type="text"
            maxLength={500}
            placeholder="Booked out that week"
          />
        </div>
        <div className="btn-row">
          <button className="btn btn--small" type="submit" disabled={busy !== null}>
            {busy === 'Declined' ? 'Declining…' : 'Confirm decline'}
          </button>
          <button
            className="btn btn--secondary btn--small"
            type="button"
            onClick={() => {
              setDeclining(false);
              setError(null);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="stack">
      {error && (
        <p className="field__error" role="alert" id={errorId}>
          {error}
        </p>
      )}
      <div className="btn-row">
        {status !== 'Accepted' && (
          <button
            className="btn btn--small"
            type="button"
            disabled={busy !== null}
            onClick={() => void patch('Accepted')}
          >
            {busy === 'Accepted'
              ? 'Accepting…'
              : status === 'Declined'
                ? 'Accept after all'
                : 'Accept'}
            <span className="visually-hidden"> booking from {clientName}</span>
          </button>
        )}
        {status !== 'Declined' && (
          <button
            className="btn btn--secondary btn--small"
            type="button"
            disabled={busy !== null}
            onClick={() => setDeclining(true)}
          >
            Decline
            <span className="visually-hidden"> booking from {clientName}</span>
          </button>
        )}
      </div>
    </div>
  );
}
