# Decision Points

Three judgment calls the brief leaves open. There is no correct answer to any of
them; what follows is what SkillSwap does and why.

---

## DP1 — Rejection: what a client sees and can do after a creator declines

**What we chose.** A declined booking is never deleted or hidden. It keeps its row
on **My bookings** with a `Declined` badge, shows the creator's reason when one was
given, and offers two next steps: *Ask again with new dates* (back to the same gig)
and *See other {category} gigs* (the marketplace, pre-filtered to that category).
When the creator left no reason, the app says so honestly and adds that a decline
is usually about availability. Declining is reversible — the creator's row keeps an
*Accept after all* action, and taking it clears the stale reason.

**Why.** A bare "Declined" with no explanation and no exit reads as a judgement on
the client, and the most likely response is that they leave the marketplace
entirely. Both of those outcomes are bad for the platform, and neither is what the
creator meant — most declines are a calendar clash, not a rejection of the brief.
So the decline is made legible (a reason, asked for by default but never forced)
and immediately actionable (two links, one of which keeps the client on the site).
Hiding the row instead would be worse still: the client would be left unsure
whether they ever booked at all.

---

## DP2 — Double booking: can a gig accept a new booking while another is Pending?

**What we chose.** Yes. A gig holds as many `Pending` bookings as clients care to
send; the API never rejects a booking because of an existing one. Instead the count
is surfaced on both sides. The gig page warns *"1 request on this gig is still
pending"* before the client commits, the booking confirmation reports how many
others are ahead of them (`pendingAhead`), and accepting one booking leaves the
others untouched for the creator to answer individually.

**Why.** Blocking the second request puts the platform in the middle of a decision
that belongs to the creator: a first-come lock lets an idle request freeze a gig,
and a creator who would rather take the second client has no way to say so. It also
fails quietly in the client's face — "this gig is unavailable" is indistinguishable
from "this gig is gone". Letting both through and being explicit about the queue
keeps the creator in control while still being honest with the client about their
odds, which is the pair of properties a marketplace needs. The cost we accept is
that a creator can over-commit; the honest queue count is what makes that visible
rather than surprising.

---

## DP3 — Discovery: how gigs are ranked on the marketplace

**What we chose.** Newest first, with the gig id as a stable tiebreak for rows
created in the same millisecond. Ranking is not personalized and not affected by
price or booking volume. Search narrows by gig **title** and the category filter is
an exact match; neither reorders the results.

**Why.** At this size the marketplace's real risk is not irrelevance, it is
staleness: a handful of established creators sitting permanently at the top while
new listings are never seen, which is what any popularity- or rating-based ranking
converges to before it has enough data to be fair. Recency guarantees a new
creator's first gig is visible the moment they post it, and it is the one ordering
a user can predict without being told the rules. Cheapest-first was the alternative
we rejected: it silently pressures every creator to undercut, which is the opposite
of what a platform for young creators should reward. The stable tiebreak matters
more than it looks — without it, two gigs posted in the same instant swap places
between page loads, which reads as a bug.

**What would change this.** Once there are enough gigs that one screen is not the
whole marketplace, recency alone stops being enough and the honest next step is
explicit user control — a visible sort selector (newest / lowest rate) rather than
an opaque relevance score.
