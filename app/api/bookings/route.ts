/**
 * /api/bookings -- POST books a gig, GET lists bookings.
 *
 * GET query parameters:
 *   ?clientName= exact, case-insensitive client match ("my bookings")
 *   ?gigId=      bookings for one gig
 *   ?limit=      result cap (default 500, max 5000)
 *
 * A new booking is always created as Pending; only PATCH
 * /api/bookings/{id} moves it on. That keeps "who decided this" unambiguous:
 * clients create, creators transition.
 */
import { getStore, parseLimit } from '@/lib/store';
import { jsonError, jsonOk, readJsonBody, readText, serverError } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const store = await getStore();
    const bookings = await store.listBookings({
      clientName: url.searchParams.get('clientName')?.trim() || undefined,
      gigId: url.searchParams.get('gigId')?.trim() || undefined,
      limit: parseLimit(url.searchParams.get('limit')),
    });
    return jsonOk(bookings);
  } catch (err) {
    return serverError('GET /api/bookings', err);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);
    if (!body) return jsonError('Request body must be a JSON object.', 400);

    const gigId = readText(body, 'gigId', { required: true, max: 100 });
    if (!gigId.ok) return jsonError(gigId.message, 400, 'gigId');

    const clientName = readText(body, 'clientName', { required: true, max: 80 });
    if (!clientName.ok) return jsonError(clientName.message, 400, 'clientName');

    const message = readText(body, 'message', { max: 1000 });
    if (!message.ok) return jsonError(message.message, 400, 'message');

    const store = await getStore();
    const gig = await store.getGig(gigId.value);
    if (!gig) return jsonError('No gig exists with that id.', 404, 'gigId');

    const booking = await store.createBooking(
      { gigId: gig.id, clientName: clientName.value, message: message.value },
      gig.title
    );

    /**
     * DP2: a gig may hold more than one Pending booking at a time. The request is
     * never blocked -- the creator is the one who should choose between two
     * interested clients, so both requests are let through and the *count* is
     * surfaced instead. `pendingAhead` is how the confirmation screen tells the
     * client honestly that they are second in the queue.
     */
    const pendingAhead = await store.countPending(gig.id, booking.id);
    return jsonOk({ ...booking, pendingAhead }, 201);
  } catch (err) {
    return serverError('POST /api/bookings', err);
  }
}
