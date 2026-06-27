# RigWise — From Built to Sold

How a working app becomes a business. This is the pathway: who pays, why, how
much, and the exact sequence from today (zero revenue) to a paying customer.
Read alongside `GOAL.md` (product state) — this file is the go-to-market.

> **The one-line truth:** the app is no longer the hard part. The hard part is
> getting one medic at one gate to use it for one shift and say "I'd pay to keep
> this." Everything below serves that.

---

## 1. What you're actually selling

Not "a credentials wallet." You're selling a **medic's shift, made faster and
his paperwork made automatic and audit-proof.** The worker app is the on-ramp;
the medic/operator is the wallet.

Three buyers, three different value props:

| Buyer | Their pain today | What RigWise sells them |
|---|---|---|
| **Medic / safety firm** (the wedge) | Clipboard sign-in, hand-typed end-of-day reports, "did I check that ticket?" liability | Scan-to-admit in 3 seconds, automatic EOD report, every decision logged with their name |
| **Operator / contractor** (the buyer with budget) | No real-time view of who's on their lease, audit scrambles, expired-ticket exposure | Live roster per well, instant audit export, "no expired ticket got on site" proof |
| **Worker** (the user, not the payer) | Carrying a stack of plastic cards, re-proving themselves every gate | One phone, wave through faster |

**Sell to the medic firm first.** They feel the pain every shift, they're a small
decision (one or a few people say yes), and they're a *distribution channel* —
one medic firm covers many operators' sites.

---

## 2. The wedge → expand motion

```
   Land                     Prove                    Expand                   Monetize
┌───────────┐          ┌───────────┐          ┌───────────┐          ┌───────────┐
│ 1 medic,  │  →       │ 1 full     │  →       │ that medic │  →      │ medic firm │
│ 1 gate,   │          │ shift run  │          │ firm's     │         │ or operator│
│ free pilot│          │ on RigWise │          │ other gates│         │ pays/site  │
└───────────┘          └───────────┘          └───────────┘          └───────────┘
```

1. **Land** — get the app on ONE medic's phone for ONE real gate shift. Free.
   No contract. "Try it for a day, tell me what's wrong."
2. **Prove** — at end of that shift, the medic has a branded EOD report he
   didn't type, and a roster he can show the operator. That artifact is the sale.
3. **Expand** — same medic, his other sites; then his firm's other medics.
4. **Monetize** — convert to paid once a firm runs >1 site on it, OR sell the
   operator the live-roster/audit view as the paid tier.

You are **pre-validation** until step 2 happens with a real stranger (not a
friend). Do not build more features until one real medic has run one real shift.

---

## 3. Pricing (recommended)

Charge per **active site (gate) per month** — it maps to how the work is
organized (sites are the unit), scales with value, and is simple to explain.

| Tier | Who | Price | What's included |
|---|---|---|---|
| **Pilot** | First gate, first 30 days | **Free** | Full app. Goal is the proof artifact, not money. |
| **Gate** | Per active site/month | **$149–$299 / site / mo** | Scan-to-admit, walk-ins, roster, auto EOD report, incident log |
| **Operator** | Per operator org | **$500–$1,500 / mo** | Everything + live multi-site roster, audit export, requirements profiles, multi-medic |

Notes:
- **Per-site, not per-worker.** Workers must be free or they won't adopt, and
  free workers are your distribution. Never charge the worker.
- Anchor on **replacement cost**: a medic-hour and an audit failure both cost far
  more than $200/mo. You're underpricing risk reduction on purpose to land fast.
- **Annual** option at ~2 months free once a firm has >3 sites.
- Don't build billing infrastructure yet. First paid deals are an invoice and an
  e-transfer / Stripe payment link. Stripe Billing comes after deal #3.

---

## 4. What "sellable" requires (gap list)

**Product (being finished now — see GOAL.md backlog):**
- [ ] Medic dashboard shows REAL muster point + required tickets + denied count
- [ ] Denials are recorded (so EOD/audit is truthful — today it's always 0)
- [ ] EOD report auto-sends to the operator at end of day (the proof artifact)
- [ ] Optional-vs-required tickets + multi-medic per site (assign by email)
- [ ] Card photos visible end-to-end (done)

**Business (do these in parallel, lightweight):**
- [ ] **One-page pilot agreement** — free, 30 days, you own nothing of theirs,
      they can leave anytime, mutual NDA. Removes the "is this safe" objection.
- [ ] **Privacy one-pager** — PIPEDA posture: Canadian data residency target
      (Supabase → AWS ca-central-1 at scale), 2-year retention then delete,
      workers control their own wallet, you never sell data. Field safety buyers
      ask this first.
- [ ] **A 90-second demo video** — worker adds a ticket → medic scans → ADMIT →
      EOD report emails itself. This is your entire sales pitch.
- [ ] **A "leave-behind"** — the sample EOD report PDF. Hand it to an operator;
      it sells itself.
- [ ] **Terms of Service + Privacy Policy** linked in-app (you have the routes).

**Trust / credibility (the real moat in safety):**
- The verification hierarchy (issuer-QR > photo + medic's eyes > self-entered)
  is a *selling point* — lead with "nobody fakes a ticket past the gate."
- Rotating signed QR (instead of static UUID) before any paid rollout — a buyer's
  security person will ask "can someone screenshot the QR?"

---

## 5. The first-revenue roadmap (30 / 60 / 90 days)

**Days 0–30 — Land one real shift.**
- Finish the product gaps above (in progress).
- Make a list of 15 Alberta/BC medic-services firms (Aluma, Falck, Astus, Iridia,
  MediRig, Total Medical, + local independents). Cold outreach: "I built a tool
  that does your end-of-day report automatically — can one of your medics try it
  free for a day?"
- Get **one** yes. Watch the shift (in person or on a call). Fix what breaks.

**Days 30–60 — Turn the artifact into a second site.**
- Use the EOD report + roster from shift #1 as the pitch to that same firm's
  other gates and to the operator on that lease.
- Get a verbal "yes we'd pay for this at $X." That sentence is validation.

**Days 60–90 — First invoice.**
- Convert one firm or operator to paid (Gate or Operator tier). Stripe payment
  link, monthly. One paying logo changes everything (fundraising, next sales).

**Success metric for the whole 90 days: ONE paying site.** Not ten. One.

---

## 6. Honest risks (don't kid yourself)

- **The wedge may be wrong.** Medics might not have buying power; the operator may
  be the only real budget. Step-1 land/prove is designed to find this out cheaply
  — let it.
- **Incumbents.** ISN/Avetta/Cognibox/ComplyWorks gate contractor compliance;
  MyPass owns the worker-wallet story globally. You win on the *gate moment* and
  *medic workflow*, not on being a compliance database. Integrate, don't compete.
- **Trust/liability.** If RigWise admits someone it shouldn't, who's liable? The
  medic always makes the final call (override is logged) — keep it that way and
  say so in the agreement. You're a tool, not the decision-maker.
- **Data residency.** Canadian energy + worker PII = PIPEDA. Get to ca-central-1
  before a real enterprise contract; fine for pilots.
- **Single-founder execution.** Pilots need hand-holding. Don't sign 5 at once;
  nail one.

---

## 7. What NOT to do

- Don't build billing, SSO, an admin analytics suite, native iOS/Android, or
  identity-verification (Onfido) **before** one paying site. They're all
  post-revenue.
- Don't price the worker. Ever.
- Don't sell "a platform." Sell "your end-of-day report, done for you."
- Don't add features a real medic hasn't asked for. The card-photo feature came
  from real feedback — that's the bar.
