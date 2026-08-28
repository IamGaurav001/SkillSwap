/**
 * A booking status, rendered so it survives greyscale printing and colour-blind
 * vision: hue + a glyph + the word itself. Colour is never the only signal.
 */
import type { BookingStatus } from '@/lib/types';

const GLYPHS: Record<BookingStatus, string> = {
  Pending: '◕',
  Accepted: '✓',
  Declined: '✕',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`badge badge--${status.toLowerCase()}`}>
      <span className="badge__glyph" aria-hidden="true">
        {GLYPHS[status]}
      </span>
      <span>{status}</span>
    </span>
  );
}
