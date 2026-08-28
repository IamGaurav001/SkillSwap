/** One gig in the marketplace grid. */
import Link from 'next/link';
import type { Gig } from '@/lib/types';
import { formatRate } from '@/lib/format';

export function GigCard({ gig }: { gig: Gig }) {
  return (
    <li className="card">
      <div className="card__meta">
        <span className="tag">{gig.category}</span>
      </div>
      <h3 className="card__title">
        <Link href={`/gigs/${gig.id}`}>{gig.title}</Link>
      </h3>
      <p className="card__desc">{gig.description}</p>
      <div className="card__footer">
        <span className="rate">
          {formatRate(gig.rate)} <span className="rate__unit">per project</span>
        </span>
        <span className="byline">by {gig.creatorName}</span>
      </div>
    </li>
  );
}
