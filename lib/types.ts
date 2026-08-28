/**
 * The domain model, shared by the API route handlers and the UI.
 *
 * The field names here are the ones the API serializes verbatim: `gigId`,
 * `clientName`, `rate` as a JSON number, and `status` in Title case. They match
 * the published Track C contract, so nothing needs renaming at the edge.
 */

/** The statuses a booking moves through. Pending is the only creatable one. */
export const BOOKING_STATUSES = ['Pending', 'Accepted', 'Declined'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * The categories the UI offers. The API deliberately accepts any non-empty
 * category string rather than rejecting unknown ones -- a marketplace that 400s
 * on a category it has not heard of is a worse marketplace, and the filter is an
 * exact (case-insensitive) match either way.
 */
export const GIG_CATEGORIES = ['Design', 'Editing', 'Tutoring', 'Music', 'Writing', 'Other'] as const;

export interface Gig {
  id: string;
  title: string;
  category: string;
  /** Rate in INR per unit of work, always a JSON number. */
  rate: number;
  description: string;
  creatorName: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  gigId: string;
  clientName: string;
  status: BookingStatus;
  /** Denormalized so "my bookings" and the dashboard render without a join. */
  gigTitle: string;
  /** The client's optional message to the creator. */
  message: string;
  /**
   * The creator's reason when declining (DP1). Empty for every other status --
   * re-accepting a declined booking clears it.
   */
  declineReason: string;
  createdAt: string;
  updatedAt: string;
}

/** Canonicalize a status the caller sent, case-insensitively. */
export function parseStatus(value: unknown): BookingStatus | null {
  if (typeof value !== 'string') return null;
  const needle = value.trim().toLowerCase();
  return BOOKING_STATUSES.find((s) => s.toLowerCase() === needle) ?? null;
}
