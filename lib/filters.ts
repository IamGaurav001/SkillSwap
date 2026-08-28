/**
 * The query semantics, in one place so both drivers agree.
 *
 * The file driver applies these predicates in JS; the Postgres driver mirrors them
 * in SQL. Keeping the rules written down once is what stops the two from drifting
 * into answering the same `?category=Music` differently.
 */
import type { Booking, Gig } from './types';
import type { BookingQuery, GigQuery } from './store';

const ci = (v: string): string => v.trim().toLowerCase();

/**
 * Search matches the TITLE only, not the description.
 *
 * This is a deliberate product choice, not an oversight: a title match is what a
 * marketplace shopper means by "search", and widening it to descriptions makes the
 * result set noisy in a way that is hard to explain in a listing UI ("why is this
 * here?"). It is documented in the README next to the endpoint.
 */
export function matchGig(gig: Gig, query: GigQuery): boolean {
  if (query.search && !ci(gig.title).includes(ci(query.search))) return false;
  if (query.category && ci(gig.category) !== ci(query.category)) return false;
  return true;
}

export function matchBooking(booking: Booking, query: BookingQuery): boolean {
  if (query.clientName && ci(booking.clientName) !== ci(query.clientName)) return false;
  if (query.gigId && booking.gigId !== query.gigId) return false;
  return true;
}

/**
 * DP3: the marketplace ranks newest first.
 *
 * `id` breaks ties, so two rows created inside the same millisecond still come
 * back in a stable order rather than shuffling between requests.
 */
export function byNewestFirst<T extends { createdAt: string; id: string }>(a: T, b: T): number {
  if (a.createdAt === b.createdAt) return a.id < b.id ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}
