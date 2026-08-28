/**
 * File-backed driver: the whole marketplace in one JSON document.
 *
 * Correct only where a single process owns the disk (local dev, or a
 * single-instance host). `getStore` picks Postgres instead whenever DATABASE_URL
 * is set -- see lib/store.ts for why that matters on serverless.
 *
 * Writes are serialized through `queue` and land via write-to-temp + rename, so a
 * crash mid-write cannot leave a half-written document behind.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Booking, BookingStatus, Gig } from '../types';
import type { BookingInput, BookingQuery, GigInput, GigQuery, Store } from '../store';
import { DEFAULT_LIMIT } from '../store';
import { matchGig, matchBooking, byNewestFirst } from '../filters';

interface Db {
  gigs: Gig[];
  bookings: Booking[];
}

const DATA_DIR = process.env.SKILLSWAP_DATA_DIR?.trim() || path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'skillswap.json');

const EMPTY: Db = { gigs: [], bookings: [] };

async function read(): Promise<Db> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Db>;
    return {
      gigs: Array.isArray(parsed.gigs) ? parsed.gigs : [],
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
    };
  } catch {
    return { ...EMPTY, gigs: [], bookings: [] };
  }
}

async function write(db: Db): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

/** Serializes read-modify-write cycles so two concurrent POSTs can't clobber. */
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: (db: Db) => Promise<T> | T): Promise<T> {
  const run = queue.then(async () => {
    const db = await read();
    const result = await fn(db);
    await write(db);
    return result;
  });
  // Keep the chain alive even when one operation rejects.
  queue = run.catch(() => undefined);
  return run;
}

export async function createFileStore(): Promise<Store> {
  return {
    async createGig(input: GigInput): Promise<Gig> {
      return exclusive((db) => {
        const gig: Gig = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
        db.gigs.push(gig);
        return gig;
      });
    },

    async listGigs(query: GigQuery): Promise<Gig[]> {
      const db = await read();
      return db.gigs
        .filter((g) => matchGig(g, query))
        .sort(byNewestFirst)
        .slice(0, query.limit ?? DEFAULT_LIMIT);
    },

    async getGig(id: string): Promise<Gig | null> {
      const db = await read();
      return db.gigs.find((g) => g.id === id) ?? null;
    },

    async createBooking(input: BookingInput, gigTitle: string): Promise<Booking> {
      return exclusive((db) => {
        const now = new Date().toISOString();
        const booking: Booking = {
          id: randomUUID(),
          gigId: input.gigId,
          clientName: input.clientName,
          status: 'Pending',
          gigTitle,
          message: input.message,
          declineReason: '',
          createdAt: now,
          updatedAt: now,
        };
        db.bookings.push(booking);
        return booking;
      });
    },

    async listBookings(query: BookingQuery): Promise<Booking[]> {
      const db = await read();
      return db.bookings
        .filter((b) => matchBooking(b, query))
        .sort(byNewestFirst)
        .slice(0, query.limit ?? DEFAULT_LIMIT);
    },

    async getBooking(id: string): Promise<Booking | null> {
      const db = await read();
      return db.bookings.find((b) => b.id === id) ?? null;
    },

    async setBookingStatus(id: string, status: BookingStatus, declineReason: string): Promise<Booking | null> {
      return exclusive((db) => {
        const booking = db.bookings.find((b) => b.id === id);
        if (!booking) return null;
        booking.status = status;
        booking.declineReason = status === 'Declined' ? declineReason : '';
        booking.updatedAt = new Date().toISOString();
        return booking;
      });
    },

    async countPending(gigId: string, excludeBookingId?: string): Promise<number> {
      const db = await read();
      return db.bookings.filter(
        (b) => b.gigId === gigId && b.status === 'Pending' && b.id !== excludeBookingId
      ).length;
    },
  };
}
