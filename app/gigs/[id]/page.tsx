/**
 * Feature 3 -- Book a gig: the gig detail page and its booking form.
 *
 * DP2 lives here in its visible form. A gig with a Pending booking is still
 * bookable, and the page says so plainly ("1 client is already waiting") instead
 * of quietly letting a second client think they are first in line.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getStore } from '@/lib/store';
import { formatDateTime, formatRate, pluralize } from '@/lib/format';
import { BookGigForm } from '@/components/BookGigForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const store = await getStore();
  const gig = await store.getGig(id);
  if (!gig) return { title: 'Gig not found' };
  return {
    title: gig.title,
    description: `${gig.category} gig by ${gig.creatorName} — ${gig.description}`.slice(0, 200),
  };
}

export default async function GigDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const store = await getStore();

  const gig = await store.getGig(id);
  if (!gig) notFound();

  const pending = await store.countPending(gig.id);
  const justPosted = query.posted === '1';

  return (
    <>
      {justPosted && (
        <div className="notice notice--success" role="status">
          <p className="notice__title">Gig posted</p>
          <p>
            It is live on the marketplace now. This is the page your clients will see —{' '}
            <Link href="/">back to the marketplace</Link>.
          </p>
        </div>
      )}

      <div className="page-head">
        <p className="tag">{gig.category}</p>
        <h1>{gig.title}</h1>
        <p>
          by {gig.creatorName} · listed {formatDateTime(gig.createdAt)}
        </p>
      </div>

      <div className="detail-grid">
        <div>
          <h2>What the client gets</h2>
          <p>{gig.description}</p>

          <dl className="definition-list">
            <dt>Rate</dt>
            <dd>{formatRate(gig.rate)} per project</dd>
            <dt>Category</dt>
            <dd>{gig.category}</dd>
            <dt>Creator</dt>
            <dd>{gig.creatorName}</dd>
            <dt>Open requests</dt>
            <dd>
              {pending === 0
                ? 'None — you would be first in the queue.'
                : `${pluralize(pending, 'client')} already waiting on a reply.`}
            </dd>
          </dl>
        </div>

        <div className="card">
          <h2 className="card__title">Book this gig</h2>
          {pending > 0 && (
            <div className="notice notice--warning" role="note">
              <p>
                {pluralize(pending, 'request')} on this gig {pending === 1 ? 'is' : 'are'} still
                pending. You can still book — {gig.creatorName} decides who to take, and you will see
                the outcome under <Link href="/my-bookings">My bookings</Link>.
              </p>
            </div>
          )}
          <BookGigForm gigId={gig.id} gigTitle={gig.title} creatorName={gig.creatorName} />
        </div>
      </div>
    </>
  );
}
