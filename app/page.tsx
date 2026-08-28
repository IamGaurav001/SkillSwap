/**
 * Feature 2 -- Browse & search: the marketplace listing.
 *
 * The filter form is a plain GET form, so search and category live in the URL.
 * That means results are shareable and bookmarkable, the back button behaves, and
 * the page keeps working with JavaScript switched off. Nothing here needs a client
 * bundle at all.
 *
 * Reads go through the store directly rather than fetching the app's own HTTP API:
 * an extra network hop to localhost would only add latency and a second failure
 * mode. The API and this page share the same query semantics via lib/filters.ts.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { getStore, DEFAULT_LIMIT } from '@/lib/store';
import { GIG_CATEGORIES } from '@/lib/types';
import { GigCard } from '@/components/GigCard';
import { pluralize } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Marketplace',
  description: 'Browse every gig on SkillSwap. Search by title or filter by category.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** First value only -- a repeated query param should not become "a,b". */
function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? '';
  return value?.trim() ?? '';
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = one(params.search);
  const category = one(params.category);

  const store = await getStore();
  const gigs = await store.listGigs({
    search: search || undefined,
    category: category || undefined,
    limit: DEFAULT_LIMIT,
  });

  const filtered = Boolean(search || category);

  return (
    <>
      <div className="page-head">
        <h1>Find a creator</h1>
        <p>
          Every gig on SkillSwap, newest first. Search by title, narrow by category, then book the
          creator directly — no bidding, no back-and-forth.
        </p>
      </div>

      <form className="filters" method="get" action="/" role="search">
        <h2 className="visually-hidden">Filter gigs</h2>
        <div className="filters__row">
          <div className="field">
            <label htmlFor="search">Search by title</label>
            <input
              id="search"
              name="search"
              type="search"
              defaultValue={search}
              placeholder="e.g. logo, thumbnail, guitar"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" name="category" defaultValue={category}>
              <option value="">All categories</option>
              {GIG_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="filters__actions">
            <button className="btn" type="submit">
              Apply filters
            </button>
            {filtered && (
              <Link className="btn btn--secondary" href="/">
                Clear
              </Link>
            )}
          </div>
        </div>
      </form>

      {/*
        aria-live is on the wrapper, not the list, so the count is announced when a
        filter changes rather than the browser silently swapping 30 list items.
      */}
      <div aria-live="polite">
        <p className="result-count">
          {filtered
            ? `${pluralize(gigs.length, 'gig')} matching your filters.`
            : `${pluralize(gigs.length, 'gig')} available.`}
        </p>

        {gigs.length === 0 ? (
          <div className="empty">
            <h2>{filtered ? 'No gigs match those filters' : 'No gigs posted yet'}</h2>
            <p>
              {filtered
                ? 'Try a shorter search term, or clear the category filter to see everything.'
                : 'The marketplace is empty. Be the first creator to list a service.'}
            </p>
            <Link className="btn" href="/gigs/new">
              Post a gig
            </Link>
          </div>
        ) : (
          <ul className="grid">
            {gigs.map((gig) => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
