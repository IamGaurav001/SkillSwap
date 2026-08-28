/**
 * Postgres driver -- the one to use on serverless hosts.
 *
 * The schema is created on first use (CREATE TABLE IF NOT EXISTS) so a deploy
 * needs nothing but a DATABASE_URL: no migration step, no separate console visit.
 * Bootstrap runs exactly once per process because `getStore` memoizes the promise.
 *
 * Query semantics are kept deliberately parallel to lib/filters.ts: `search` hits
 * the title only, `category` and `clientName` are exact case-insensitive matches,
 * and every list is ordered newest-first with `id` as a stable tiebreak.
 */
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { Booking, BookingStatus, Gig } from '../types';
import type { BookingInput, BookingQuery, GigInput, GigQuery, Store } from '../store';
import { DEFAULT_LIMIT } from '../store';

/* eslint-disable @typescript-eslint/no-explicit-any */

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS gigs (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    category     TEXT NOT NULL,
    rate         NUMERIC NOT NULL,
    description  TEXT NOT NULL,
    creator_name TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id             TEXT PRIMARY KEY,
    gig_id         TEXT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
    client_name    TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'Pending',
    gig_title      TEXT NOT NULL DEFAULT '',
    message        TEXT NOT NULL DEFAULT '',
    decline_reason TEXT NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS gigs_created_at_idx ON gigs (created_at DESC);
  CREATE INDEX IF NOT EXISTS gigs_category_idx ON gigs (lower(category));
  CREATE INDEX IF NOT EXISTS bookings_client_idx ON bookings (lower(client_name));
  CREATE INDEX IF NOT EXISTS bookings_gig_idx ON bookings (gig_id);
`;

/** ISO-8601, whatever the driver hands back for a TIMESTAMPTZ. */
function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date(0).toISOString();
}

/**
 * NUMERIC arrives as a string from node-postgres (it preserves precision rather
 * than risking a lossy float). The contract says `rate` is a JSON number, so the
 * cast happens here rather than leaking a string into the API response.
 */
function toGig(row: any): Gig {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    rate: Number(row.rate),
    description: row.description,
    creatorName: row.creator_name ?? '',
    createdAt: iso(row.created_at),
  };
}

function toBooking(row: any): Booking {
  return {
    id: row.id,
    gigId: row.gig_id,
    clientName: row.client_name,
    status: row.status as BookingStatus,
    gigTitle: row.gig_title ?? '',
    message: row.message ?? '',
    declineReason: row.decline_reason ?? '',
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

/**
 * Managed Postgres endpoints terminate TLS with certificates this process has no
 * CA bundle for. Verification is relaxed for remote hosts (opt out with
 * PGSSL_NO_VERIFY=false) and left off entirely for localhost.
 */
function sslFor(url: string): { rejectUnauthorized: boolean } | false {
  const explicit = process.env.PGSSL_NO_VERIFY?.trim().toLowerCase();
  if (explicit === 'false') return { rejectUnauthorized: true };
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  if (isLocal && explicit !== 'true') return false;
  return { rejectUnauthorized: false };
}

export async function createPostgresStore(url: string): Promise<Store> {
  const pool = new Pool({
    connectionString: url,
    ssl: sslFor(url),
    // Serverless invocations are short-lived and many; a small pool with an
    // aggressive idle timeout keeps a burst of lambdas from exhausting the
    // server's connection slots.
    max: Number(process.env.PGPOOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  // An idle client erroring out (host restart, pooler cutting the connection)
  // emits on the pool. Unhandled, that is an uncaught exception that takes the
  // process down; the pool discards the client on its own.
  pool.on('error', (err) => {
    console.error('[skillswap] idle postgres client error:', err.message);
  });

  await pool.query(SCHEMA);

  return {
    async createGig(input: GigInput): Promise<Gig> {
      const { rows } = await pool.query(
        `INSERT INTO gigs (id, title, category, rate, description, creator_name)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [randomUUID(), input.title, input.category, input.rate, input.description, input.creatorName]
      );
      return toGig(rows[0]);
    },

    async listGigs(query: GigQuery): Promise<Gig[]> {
      const where: string[] = [];
      const params: unknown[] = [];
      if (query.search) {
        params.push(`%${query.search.trim().toLowerCase()}%`);
        where.push(`lower(title) LIKE $${params.length}`);
      }
      if (query.category) {
        params.push(query.category.trim().toLowerCase());
        where.push(`lower(category) = $${params.length}`);
      }
      params.push(query.limit ?? DEFAULT_LIMIT);
      const { rows } = await pool.query(
        `SELECT * FROM gigs
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY created_at DESC, id DESC
         LIMIT $${params.length}`,
        params
      );
      return rows.map(toGig);
    },

    async getGig(id: string): Promise<Gig | null> {
      const { rows } = await pool.query('SELECT * FROM gigs WHERE id = $1', [id]);
      return rows[0] ? toGig(rows[0]) : null;
    },

    async createBooking(input: BookingInput, gigTitle: string): Promise<Booking> {
      const { rows } = await pool.query(
        `INSERT INTO bookings (id, gig_id, client_name, status, gig_title, message)
         VALUES ($1, $2, $3, 'Pending', $4, $5) RETURNING *`,
        [randomUUID(), input.gigId, input.clientName, gigTitle, input.message]
      );
      return toBooking(rows[0]);
    },

    async listBookings(query: BookingQuery): Promise<Booking[]> {
      const where: string[] = [];
      const params: unknown[] = [];
      if (query.clientName) {
        params.push(query.clientName.trim().toLowerCase());
        where.push(`lower(client_name) = $${params.length}`);
      }
      if (query.gigId) {
        params.push(query.gigId);
        where.push(`gig_id = $${params.length}`);
      }
      params.push(query.limit ?? DEFAULT_LIMIT);
      const { rows } = await pool.query(
        `SELECT * FROM bookings
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY created_at DESC, id DESC
         LIMIT $${params.length}`,
        params
      );
      return rows.map(toBooking);
    },

    async getBooking(id: string): Promise<Booking | null> {
      const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
      return rows[0] ? toBooking(rows[0]) : null;
    },

    async setBookingStatus(id: string, status: BookingStatus, declineReason: string): Promise<Booking | null> {
      const { rows } = await pool.query(
        `UPDATE bookings
            SET status = $2, decline_reason = $3, updated_at = now()
          WHERE id = $1
        RETURNING *`,
        [id, status, status === 'Declined' ? declineReason : '']
      );
      return rows[0] ? toBooking(rows[0]) : null;
    },

    async countPending(gigId: string, excludeBookingId?: string): Promise<number> {
      const { rows } = await pool.query(
        `SELECT count(*)::int AS n FROM bookings
          WHERE gig_id = $1 AND status = 'Pending' AND ($2::text IS NULL OR id <> $2)`,
        [gigId, excludeBookingId ?? null]
      );
      return rows[0]?.n ?? 0;
    },
  };
}
