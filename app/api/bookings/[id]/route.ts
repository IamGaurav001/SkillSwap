/**
 * /api/bookings/{id} -- GET one booking, PATCH its status.
 *
 * PATCH is the creator's accept/decline action:
 *   { "status": "Accepted" }
 *   { "status": "Declined", "declineReason": "Booked out that week" }
 *
 * Status is matched case-insensitively and echoed back in canonical Title case.
 * Transitions are not restricted to a one-way flow: a creator who declines by
 * mistake can move the booking back to Accepted, and doing so clears the stale
 * decline reason (see lib/types.ts).
 */
import { getStore } from '@/lib/store';
import { parseStatus, BOOKING_STATUSES } from '@/lib/types';
import { jsonError, jsonOk, readJsonBody, readText, serverError } from '@/lib/http';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  try {
    const { id } = await params;
    const store = await getStore();
    const booking = await store.getBooking(id);
    if (!booking) return jsonError('No booking exists with that id.', 404);
    return jsonOk(booking);
  } catch (err) {
    return serverError('GET /api/bookings/{id}', err);
  }
}

export async function PATCH(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    if (!body) return jsonError('Request body must be a JSON object.', 400);

    const status = parseStatus(body.status);
    if (!status) {
      return jsonError(`status must be one of: ${BOOKING_STATUSES.join(', ')}.`, 400, 'status');
    }

    const declineReason = readText(body, 'declineReason', { max: 500 });
    if (!declineReason.ok) return jsonError(declineReason.message, 400, 'declineReason');

    const store = await getStore();
    const updated = await store.setBookingStatus(id, status, declineReason.value);
    if (!updated) return jsonError('No booking exists with that id.', 404);
    return jsonOk(updated);
  } catch (err) {
    return serverError('PATCH /api/bookings/{id}', err);
  }
}
