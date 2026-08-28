/** Presentation helpers shared by the pages. */

/**
 * Rates render as whole rupees. `Intl` is used with an explicit locale so the
 * output does not shift with the server's or the visitor's locale -- a gig that
 * reads "₹500" in the demo should read "₹500" for the judge too.
 */
const RATE_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatRate(rate: number): string {
  return RATE_FORMAT.format(rate);
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
});

/** A human timestamp, or the raw value if it is somehow unparseable. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : DATE_FORMAT.format(date);
}

/** "3 gigs" / "1 gig" -- avoids a stray plural in the result count. */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
