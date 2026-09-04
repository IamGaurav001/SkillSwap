'use client';

/**
 * The post-a-gig form. Submits to the standard API (POST /api/services) rather than a
 * server action, so the UI exercises exactly the same endpoint an external client
 * would -- if the API regresses, this page breaks with it instead of hiding it.
 *
 * Validation is server-authoritative: this component surfaces the field-level
 * message the API returns rather than duplicating the rules. `required`/`min` on
 * the inputs are there for the browser's own affordances, not as the real gate.
 */
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { GIG_CATEGORIES } from '@/lib/types';

interface FieldError {
  field?: string;
  message: string;
}

export function PostGigForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FieldError | null>(null);
  const errorId = useId();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: String(data.get('title') ?? ''),
          category: String(data.get('category') ?? ''),
          rate: String(data.get('rate') ?? ''),
          description: String(data.get('description') ?? ''),
          creatorName: String(data.get('creatorName') ?? ''),
        }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError({
          field: body?.field,
          message: body?.error ?? `The gig could not be posted (HTTP ${res.status}).`,
        });
        setSubmitting(false);
        return;
      }

      // Land on the new gig so the creator sees exactly what a client will see.
      router.push(`/gigs/${body.id}?posted=1`);
    } catch {
      setError({ message: 'Could not reach the server. Check your connection and try again.' });
      setSubmitting(false);
    }
  }

  /** Mark only the field the API blamed, so the error points somewhere useful. */
  const invalid = (field: string) => (error?.field === field ? true : undefined);
  const describedBy = (field: string) => (error?.field === field ? errorId : undefined);

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {error && (
        <div className="notice notice--error" role="alert" id={errorId}>
          <p className="notice__title">The gig was not posted</p>
          <p>{error.message}</p>
        </div>
      )}

      <div className="field">
        <label htmlFor="title">Gig title</label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={120}
          required
          aria-invalid={invalid('title')}
          aria-describedby={describedBy('title')}
          placeholder="Logo design for student clubs"
        />
      </div>

      <div className="field">
        <label htmlFor="category">Category</label>
        <select
          id="category"
          name="category"
          defaultValue="Design"
          required
          aria-invalid={invalid('category')}
          aria-describedby={describedBy('category')}
        >
          {GIG_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="rate">Rate (₹ per project)</label>
        <input
          id="rate"
          name="rate"
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          required
          aria-invalid={invalid('rate')}
          aria-describedby={`rate-hint ${describedBy('rate') ?? ''}`.trim()}
          placeholder="500"
        />
        <p className="field__hint" id="rate-hint">
          A flat price for one delivery. You can always negotiate extras in the booking thread.
        </p>
      </div>

      <div className="field">
        <label htmlFor="description">What the client gets</label>
        <textarea
          id="description"
          name="description"
          maxLength={2000}
          required
          aria-invalid={invalid('description')}
          aria-describedby={describedBy('description')}
          placeholder="Two concepts, one round of revisions, files in SVG and PNG."
        />
      </div>

      <div className="field">
        <label htmlFor="creatorName">Your name (optional)</label>
        <input
          id="creatorName"
          name="creatorName"
          type="text"
          maxLength={80}
          autoComplete="name"
          aria-invalid={invalid('creatorName')}
          aria-describedby={describedBy('creatorName')}
          placeholder="Priya R."
        />
      </div>

      <div className="btn-row">
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Posting…' : 'Post gig'}
        </button>
      </div>
    </form>
  );
}
