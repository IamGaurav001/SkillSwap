# SkillSwap — a creator gig marketplace

**Hackathon ID: `REPLACE-WITH-YOUR-HACKATHON-ID`**

> ⚠️ **Before submitting:** replace the line above with the Hackathon ID issued to
> your team. A missing or mismatched ID disqualifies the submission, and it is the
> one thing in this repository that cannot be filled in for you.

| | |
|---|---|
| **Track** | C — SkillSwap (creator gig marketplace) |
| **Live URL** | `REPLACE-WITH-YOUR-DEPLOYED-URL` |
| **Standard API implemented?** | **Yes** — all endpoints below are live, unauthenticated, and JSON-in/JSON-out. Grade by script. |
| **Test credentials** | **None required.** The app has no login; every page and endpoint is open. See [Identity](#identity-and-why-there-is-no-login). |
| **Decision Points** | [DECISIONS.md](./DECISIONS.md) |

SkillSwap is a marketplace where young creators list a service — design, editing,
tutoring, music, writing — and clients book them directly. A creator posts a gig, a
client books it, the creator accepts or declines, and both sides can see where every
request stands.

---

## The five required features

| # | Feature | Where to find it |
|---|---------|------------------|
| 1 | **Post a gig** — title, category, rate, description | [`/gigs/new`](#) → lands on the new gig's page |
| 2 | **Browse & search** — all gigs, searchable and filterable by category | `/` (the marketplace) |
| 3 | **Book a gig** — a client books via a form and sees a confirmation | `/gigs/{id}` → confirmation replaces the form in place |
| 4 | **Creator dashboard** — incoming bookings, accept or decline | `/dashboard` |
| 5 | **My bookings** — a client's requests with status Pending / Accepted / Declined | `/my-bookings` |

Search and the category filter are plain `GET` forms, so results live in the URL and
every listing page works with JavaScript disabled.

---

## Running it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. No environment variables are needed for local
development — the app falls back to a file-backed store at `.data/skillswap.json`.

Optional, to get a populated marketplace for a screenshot or demo:

```bash
npm run seed
```

Other scripts: `npm run build`, `npm start`, `npm run typecheck`.

---

## The standard API

Base: the live URL. No authentication, no headers required beyond
`Content-Type: application/json` on writes. `200` and `201` both mean success.

### `POST /api/gigs`

```jsonc
// request
{ "title": "Logo design for student clubs", "category": "Design", "rate": 500,
  "description": "Minimal logos", "creatorName": "Priya R." }  // creatorName optional

// 201
{ "id": "…", "title": "Logo design for student clubs", "category": "Design",
  "rate": 500, "description": "Minimal logos", "creatorName": "Priya R.",
  "createdAt": "2026-08-28T07:52:11.084Z" }
```

`rate` is accepted as a number or a numeric string and always returned as a JSON
number.

### `GET /api/gigs`

Returns a JSON array, newest first.

| Param | Meaning |
|---|---|
| `search` | Case-insensitive substring of the gig **title**. See the note below. |
| `category` | Exact, case-insensitive category match. |
| `limit` | Result cap. Default 500, max 5000; there is no pagination cursor — the whole set comes back in one response. |

> **`search` matches titles only, not descriptions.** This is a deliberate choice:
> a title match is what a shopper means by "search", and widening it to description
> text produces results whose presence in the list is impossible to explain in the
> UI. It is also the semantics the listing page uses.

### `POST /api/bookings`

```jsonc
// request
{ "gigId": "…", "clientName": "Asha", "message": "Need it before the 14th." }  // message optional

// 201
{ "id": "…", "gigId": "…", "clientName": "Asha", "status": "Pending",
  "gigTitle": "Logo design for student clubs", "message": "…",
  "declineReason": "", "createdAt": "…", "updatedAt": "…",
  "pendingAhead": 0 }
```

New bookings are always `Pending`. `pendingAhead` is how many *other* bookings on
that gig are still pending — see DP2 in [DECISIONS.md](./DECISIONS.md).
`404` if `gigId` does not exist.

### `GET /api/bookings`

Returns a JSON array, newest first. Params: `clientName` (exact, case-insensitive),
`gigId`, `limit`.

### `GET /api/bookings/{id}` · `PATCH /api/bookings/{id}`

```jsonc
// PATCH request
{ "status": "Declined", "declineReason": "Booked out that week" }  // declineReason optional

// 200 — the full updated booking
{ "id": "…", "status": "Declined", "declineReason": "Booked out that week", … }
```

`status` is one of `Pending`, `Accepted`, `Declined`, matched case-insensitively and
echoed back in Title case. Transitions are not one-way: moving a declined booking
back to `Accepted` works and clears the stale reason. `400` on an unknown status,
`404` on an unknown id.

### `GET /api/health`

Liveness, plus which storage driver is active. `{"driver":"file"}` on a serverless
deployment is a misconfiguration — see below.

---

## Deploying

The app is a single Next.js project: UI and API ship together, so `/api/*` is always
same-origin with the live URL.

### On Vercel (or any serverless host) — a database is required

```bash
vercel
```

Then set **`DATABASE_URL`** to a Postgres connection string (Neon, Supabase, and
Railway all have a free tier that works). The schema is created automatically on
first request — there is no migration step.

This is not optional on serverless. Without `DATABASE_URL` the app falls back to the
file store, and on a serverless host the `POST` that creates a gig and the `GET`
that lists it can execute on different instances with separate ephemeral disks — so
writes appear to vanish. `GET /api/health` reporting `"driver":"file"` on a
deployed URL is the tell.

### On a single-instance host (Render, Railway, Fly, a VM)

```bash
npm install && npm run build && npm start
```

`DATABASE_URL` is still recommended, but the file store is correct here because one
process owns the disk. Note that a free tier which sleeps when idle can cold-start
slower than an evaluator's request timeout — keep the instance warm, or use Postgres
and a platform that does not sleep.

After deploying, check that the right driver came up:

```bash
curl https://your-app.example.com/api/health
```

---

## Tech

- **Next.js 15** (App Router) and **React 19**, TypeScript in strict mode
- **Postgres** via `pg`, with a file-backed driver behind the same interface
  (`lib/store.ts`) for local development
- Hand-written CSS — no UI framework. One stylesheet, custom properties for the
  palette, light and dark schemes

### Layout

```
app/
  page.tsx                    marketplace — browse & search (Feature 2)
  gigs/new/page.tsx           post a gig (Feature 1)
  gigs/[id]/page.tsx          gig detail + booking form (Feature 3)
  dashboard/page.tsx          creator dashboard (Feature 4)
  my-bookings/page.tsx        client's bookings (Feature 5)
  api/gigs/route.ts           POST, GET
  api/bookings/route.ts       POST, GET
  api/bookings/[id]/route.ts  GET, PATCH
  api/health/route.ts         liveness + active driver
lib/
  store.ts                    storage interface + driver selection
  drivers/postgres.ts         production driver
  drivers/file.ts             zero-setup local driver
  filters.ts                  query semantics, shared by both drivers
  http.ts                     request parsing, JSON responses
  types.ts                    domain model
components/                   client components (forms, accept/decline, nav)
scripts/seed-demo.mjs         optional demo fixtures
```

The pages read through `lib/store.ts` directly rather than fetching the app's own
HTTP API — an extra hop to itself would only add latency and a second failure mode.
Both paths share the query semantics in `lib/filters.ts`, so the listing page and
`GET /api/gigs` can never disagree about what `?category=Music` means.

---

## Identity, and why there is no login

The evaluation contract requires the standard API to be openly callable, so the app
has no accounts and no auth. Two things follow, and both are deliberate:

- **A booking is keyed on the client's name.** "My bookings" looks up whatever name
  the client typed. The browser remembers the last one in `localStorage` purely to
  prefill the field.
- **The creator dashboard is not scoped to one creator.** With no accounts there is
  nothing to scope it by, so it shows every incoming request with its gig named on
  the row.

Anyone who knows a name can see that name's bookings, and anyone can accept or
decline any request. Accounts are the first thing this would need to be a real
product; nothing else in the design depends on their absence.

## Other known limitations

- No notifications. A client learns the outcome by revisiting **My bookings**, and a
  creator sees new requests by opening the dashboard.
- No payments, messaging, reviews, or ratings — out of scope for the brief.
- A gig cannot be edited or withdrawn after posting.
- The dashboard and marketplace load up to 500 rows in one page with no pagination.
  Fine at hackathon scale, wrong at ten thousand gigs.
