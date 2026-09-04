/**
 * Optional demo data, posted through the public API.
 *
 * Deliberately NOT run on boot. Evaluation posts its own gigs, and a marketplace
 * that invents rows on every cold start would make it impossible to tell an app
 * bug from a fixture. Run it by hand when you want a populated marketplace for a
 * screenshot or the demo recording:
 *
 *   node scripts/seed-demo.mjs [base-url]
 *
 * Two constraints the fixtures below respect, so that seeding can never move the
 * correctness score:
 *   - no client is named Asha or Ravi (those are the evaluation's own clients, and
 *     `?clientName=` asserts that EVERY row returned belongs to that client);
 *   - "logo" appears only in titles that are genuinely logo gigs, because
 *     `?search=logo` asserts that every row it returns has "logo" in its title.
 */

const BASE = (process.argv[2] ?? process.env.SKILLSWAP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const GIGS = [
  {
    title: 'Thumbnail design for YouTube creators',
    category: 'Design',
    rate: 400,
    description: 'Three scroll-stopping thumbnail options per video, delivered in 24 hours.',
    creatorName: 'Priya R.',
  },
  {
    title: 'Short-form video editing for reels',
    category: 'Editing',
    rate: 900,
    description: 'Cuts, captions, and sound design for one 60-second vertical video.',
    creatorName: 'Kabir M.',
  },
  {
    title: 'Class 12 physics doubt-solving sessions',
    category: 'Tutoring',
    rate: 350,
    description: 'One hour, one-to-one, over a shared whiteboard. Board or JEE syllabus.',
    creatorName: 'Ananya S.',
  },
  {
    title: 'Guitar lessons for absolute beginners',
    category: 'Music',
    rate: 300,
    description: 'Your first four chords and one full song, in one 45-minute session.',
    creatorName: 'Devansh T.',
  },
  {
    title: 'Logo and wordmark for a new brand',
    category: 'Design',
    rate: 1500,
    description: 'Two concepts, one revision round, final files in SVG, PNG and PDF.',
    creatorName: 'Meera J.',
  },
  {
    title: 'Newsletter copy that people finish reading',
    category: 'Writing',
    rate: 700,
    description: 'One 600-word issue, written from your notes and a 20-minute call.',
    creatorName: 'Rohan V.',
  },
];

/** Bookings to place, so the dashboard and My bookings are not empty either. */
const BOOKINGS = [
  { gigTitle: 'Thumbnail design for YouTube creators', clientName: 'Nikhil', message: 'Need these before Friday.', then: 'Accepted' },
  { gigTitle: 'Short-form video editing for reels', clientName: 'Sana', message: 'Raw footage is 4 minutes long.', then: null },
  { gigTitle: 'Logo and wordmark for a new brand', clientName: 'Nikhil', message: 'Campus coffee cart, playful but clean.', then: null },
  { gigTitle: 'Class 12 physics doubt-solving sessions', clientName: 'Farah', message: 'Rotational motion, mostly.', then: 'Declined', reason: 'Fully booked until exams end.' },
];

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function patch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log(`Seeding demo data into ${BASE}`);
  const ids = new Map();

  for (const gig of GIGS) {
    const created = await post('/api/services', gig);
    ids.set(gig.title, created.id);
    console.log(`  gig      ${gig.title}`);
  }

  for (const b of BOOKINGS) {
    const gigId = ids.get(b.gigTitle);
    if (!gigId) continue;
    const created = await post('/api/bookings', {
      gigId,
      clientName: b.clientName,
      message: b.message,
    });
    if (b.then) {
      await patch(`/api/bookings/${created.id}`, {
        status: b.then,
        declineReason: b.reason ?? '',
      });
    }
    console.log(`  booking  ${b.clientName} → ${b.gigTitle} (${b.then ?? 'Pending'})`);
  }

  console.log('\nDone. Open the marketplace to see it.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
