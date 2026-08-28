/**
 * Request/response helpers for the API route handlers.
 *
 * Two conventions live here:
 *
 *  - Responses are always JSON with `Cache-Control: no-store`. A cached list is
 *    indistinguishable from a lost write to anyone reading the marketplace right
 *    after posting a gig, which is exactly the read the app is judged on.
 *  - Input parsing is tolerant about *shape* and strict about *meaning*: a rate
 *    sent as "500" is accepted as 500, but a rate sent as "cheap" is a 400 with a
 *    field-level message rather than a silent 0.
 */

export interface ApiErrorBody {
  error: string;
  /** Which field was at fault, when it was one field. */
  field?: string;
}

const NO_STORE = { 'cache-control': 'no-store' } as const;

export function jsonOk(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function jsonError(error: string, status: number, field?: string): Response {
  const body: ApiErrorBody = field ? { error, field } : { error };
  return Response.json(body, { status, headers: NO_STORE });
}

/** Parse a JSON body, tolerating an empty one. `undefined` means unparseable. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown> | undefined> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return undefined;
  }
  if (!raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** A trimmed non-empty string, capped so one request can't store a novel. */
export function readText(
  body: Record<string, unknown>,
  key: string,
  opts: { required?: boolean; max?: number } = {}
): { ok: true; value: string } | { ok: false; message: string } {
  const raw = body[key];
  if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) {
    if (opts.required) return { ok: false, message: `${key} is required.` };
    return { ok: true, value: '' };
  }
  if (typeof raw !== 'string') return { ok: false, message: `${key} must be a string.` };
  const value = raw.trim();
  const max = opts.max ?? 2000;
  if (value.length > max) return { ok: false, message: `${key} must be at most ${max} characters.` };
  return { ok: true, value };
}

/**
 * A finite, non-negative number. Numeric strings are accepted because HTML forms
 * and hand-written curl calls both send them.
 */
export function readRate(body: Record<string, unknown>, key: string): { ok: true; value: number } | { ok: false; message: string } {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') return { ok: false, message: `${key} is required.` };
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim()) : NaN;
  if (!Number.isFinite(value)) return { ok: false, message: `${key} must be a number.` };
  if (value < 0) return { ok: false, message: `${key} cannot be negative.` };
  if (value > 10_000_000) return { ok: false, message: `${key} is implausibly large.` };
  return { ok: true, value };
}

/**
 * Turn an unexpected throw into a 500 without leaking internals to the caller,
 * while still putting the real reason in the server log.
 */
export function serverError(scope: string, err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[skillswap] ${scope} failed:`, message);
  return jsonError('Something went wrong on our side. Please retry.', 500);
}
