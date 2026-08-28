/**
 * A liveness probe that also reports which storage driver is live.
 *
 * Worth having because the single most likely production misconfiguration is a
 * missing DATABASE_URL on a serverless host -- which does not fail loudly, it just
 * loses writes between requests. `"driver":"file"` on a Vercel deployment is the
 * signal that something is wrong.
 */
import { activeDriver, getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const driver = activeDriver();
  try {
    const store = await getStore();
    const gigs = await store.listGigs({ limit: 1 });
    return Response.json(
      { status: 'ok', driver, reachable: true, sampleGigs: gigs.length },
      { headers: { 'cache-control': 'no-store' } }
    );
  } catch (err) {
    return Response.json(
      {
        status: 'degraded',
        driver,
        reachable: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }
}
