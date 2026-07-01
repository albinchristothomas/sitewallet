# RigWise — Autonomous Operator Brief (`/goal`)

> **Paste-to-run prompt** (give me this line and I take it from here):
>
> **"Read GOAL.md. Pick the highest-priority unblocked item from the Backlog,
> implement it end-to-end (type-check + build green, committed, pushed), then
> tell me any dashboard step only I can do. Repeat until the Backlog's pilot
> tier is empty or you hit a decision that's genuinely mine. Don't ask me to
> confirm obvious defaults — decide, note it, and keep moving."**

This file is the single source of truth for what RigWise is, the rules I must
never break, the current state, and what to build next. Keep it updated as work
lands.

---

## 1. Mission

RigWise is a **digital safety-credential wallet + gate-verification system for
Canadian oil & gas wellsites.** Workers carry safety tickets (H2S Alive, First
Aid, CSO, etc.) on their phone as a QR pass. A **medic** at the wellsite gate
scans the worker's QR, sees their tickets checked against *this site's*
requirements, compares the face/card, and admits or denies. Medics file an
end-of-day report; everything is keyed to the **well number**.

Wedge: get it into one medic's hands at one gate, make that medic's shift
faster and his paperwork automatic. Domain: **rigwise.ca**.

The user (Albin) is non-technical-leaning and vibe-coding this. Be concrete,
ship working software, and always tell him exactly which dashboard buttons he
has to press himself.

---

## 2. Standing orders (how I operate on this repo)

1. **Read `AGENTS.md` first.** This is **Next.js 16** (App Router, Turbopack,
   `proxy.ts` not middleware, async `cookies()`/`params`, `PageProps<>`
   generics). It differs from training data — check `node_modules/next/dist/docs/`
   before writing Next-specific code.
2. **Verify before claiming done:** `npx tsc --noEmit` then `npm run build`.
   A feature isn't done until the build is green.
3. **Commit + push** when a unit of work is green. Commits are authored as
   `albinchristothomas@gmail.com` (already configured) so Vercel's Hobby
   author-block stays satisfied. Push to `main` → Vercel auto-deploys.
4. **The design is sacred.** Match the existing system **1:1** (tokens + fonts
   in §5). No generic-AI look, no emoji, dark mode only. New UI must look like
   it was always there.
5. **Build for a cold, gloved, non-techie field worker / medic.** Big targets,
   high contrast, few taps, plain words.
6. **Surface user-side actions explicitly.** Some things only Albin can do:
   running SQL migrations in the Supabase dashboard, Resend domain verification,
   Vercel env vars. When a change needs one, hand him the exact SQL / steps /
   link — don't pretend it's done.
7. **Migrations are additive only.** Never re-run or edit
   `20260519000000_init.sql` (it DROPs everything). New file per change,
   `YYYYMMDD000000_name.sql`, `create or replace` for functions.
8. **Use the Workflow tool** for substantive multi-file investigation or
   fan-out (Ultracode is on). Solo only for trivial edits.

---

## 3. Hard constraints — NEVER violate these

- **One email = one role, locked.** A worker and a medic are *different humans*.
  `account_type` is set once at signup and never mutated; `proxy.ts` hard-redirects
  a MEDIC out of `/wallet/*` and a WORKER out of `/medic/*` & `/admin/*`. The
  `admit_worker` RPC refuses to let a medic admit themselves.
- **Self-entered tickets never auto-pass a gate.** A worker-typed or "Other"
  custom ticket is always `UNVERIFIED` until a medic confirms by eye or an
  issuer-QR proves it. Trust order, always visible: **issuer-QR > photo + medic's
  eyes > self-entered.**
- **A face/selfie is NOT mandatory.** When present it anchors the gate decision;
  when absent the medic checks government ID.
- **Worker onboarding stays minimal:** name + working company + current worksite
  (+ optional phone). Don't add friction.
- **Data is filed by well number.** Sites carry `well_number` / LSD; the EOD
  report's identity is WELL / LSD.
- **Credentials are append-only.** Verification changes only via the
  `mark_credential_verified` SECURITY DEFINER RPC; direct client UPDATE is
  RLS-blocked.
- **Retention promise:** onboarding tells workers data is kept 2 years after last
  site activity then deleted. (Currently a promise with no enforcing job — see
  Backlog.)

---

## 4. Stack & where things live

- **Next.js 16.2** App Router + Turbopack · **React 19.2** · TypeScript strict.
- **Supabase** (Postgres + magic-link Auth + private Storage + RLS + SECURITY
  DEFINER RPCs). Clients: `lib/supabase/server.ts` (RSC), `client.ts` (browser),
  `admin.ts` (service-role, server-only, walk-in minting).
- **Tailwind v4** (`@theme inline` tokens in `app/globals.css`).
- **PWA** (`manifest.webmanifest` + `sw.js`, registered in prod only). This *is*
  the app for the pilot; a Capacitor/PWABuilder store-wrap comes later — not a
  native rewrite.
- Routes: worker = `app/wallet/*`, medic = `app/medic/*`, operator setup =
  `app/admin/*` (folded into the medic role), `app/onboarding`, `app/auth/callback`.
- Shared libs: `lib/credentials.ts` (ticket catalog + helpers),
  `lib/credential-picker.tsx` (searchable combobox), `lib/credential-card.tsx`
  (the flip card), `lib/card-photo-viewer.tsx` (gate card lightbox),
  `lib/photos.ts` (`faceUrl` / `ticketPhotoUrl` → signed URLs), `lib/atoms.tsx`
  (BrandMark/Wordmark/Avatar/StatusPill).
- Schema lives in `supabase/migrations/`. Key RPCs: `worker_compliance_for_site`,
  `admit_worker`, `is_medic_for_site` (param `target_site_id`),
  `mark_credential_verified`, `active_sessions_for_site`, `daily_roster`.

---

## 5. Design system (match exactly)

- **Mood:** security document / physical safety badge. Solid, industrial,
  dark-mode-only.
- **Color tokens** (`app/globals.css`): `--bg #0d0f12`, surface gradient
  `linear-gradient(152deg,#222831,#191d23 52%,#14171c)`, steel field `#15191e`
  with `1px rgba(255,255,255,0.1)` border. Brand orange `--brand #f2581c`
  (hover `#ff6a30`, press `#c2440f`, on-brand text `#0d0f12`). Text `#f4f6f7` /
  dim `#9aa3ab` / faint `#5d666f`. Status: ok `#2fd072`/`#7ff0a8`, warn
  `#f2a40c`/`#ffd27a`, bad `#ef4135`/`#ff9a8f`, self-entered amber `#ffb27a`.
- **Fonts** (`app/layout.tsx`): **Saira** → `--font-archivo` (display/UI, heavy
  weights), **JetBrains Mono** → `--font-jetbrains-mono` (all numbers, dates,
  IDs, labels — uppercase, ~0.12em tracking), **Caveat** → `--font-caveat`
  (signatures only).
- Utility classes: `.rw-panel`, `.rw-spine` (4px orange edge), `.rw-guilloche`,
  `.mono`, `.rw-pressable`.

---

## 6. Current state

**Done & working:** landing/role-select, magic-link login + auth callback,
onboarding (worker + medic), worker wallet + stats + gate QR pass, credential
detail flip-card (+ real card photo panel), searchable credential picker +
expanded Canadian O&G catalog + "Other" escape hatch, **worker card-photo
capture (mandatory, step 1)**, medic site list + dashboard (**real** muster /
required chips / denied-today / live on-site count), QR scanner, **gate verify
decision** (ADMIT/DENY + required-ticket compliance + SELF-ENTERED/VERIFIED
badges + MARK VERIFIED + card-photo thumbnails + "also on file" list), **deny
events persisted** (deny_worker → audit_log WORKER_DENIED; daily_denials reads
back), roster, EOD report (print/PDF, locked to today, real denied count, real
recordable count), **EOD auto-send** (Vercel Cron 02:00 UTC → /api/cron/eod →
Resend, exactly-once via eod_sent_log), incidents, walk-in minting, profiles,
admin site creation (muster point, EOD recipient, required + optional tiers) +
**assign medic by email** (resolve_medic_id_by_email RPC) + worker invite.
Sales artifacts: `SELLABLE.md` (GTM pathway), `sales/PILOT_AGREEMENT.md`,
`sales/PRIVACY_ONEPAGER.md`. Branded auth email live via Resend.

**Shipped-but-needs-Albin's-dashboard-step:**
- Migrations `20260623…` + `20260627…` must be run in the live Supabase SQL
  editor (paste the consolidated block from chat — Albin can't open files).
- Vercel env vars `RESEND_API_KEY` + `CRON_SECRET` must be added for EOD
  auto-send to fire.

---

## 7. Backlog (prioritized)

**Pilot tier:**
1. ~~Medic dashboard fake data~~ **DONE (2026-06-23)** — real muster_point,
   real required-ticket chips from the requirements profile, real denied count.
2. ~~Denials never persisted~~ **DONE (2026-06-23)** — deny_worker RPC →
   audit_log WORKER_DENIED; both Deny buttons wired; daily_denials feeds
   dashboard + EOD; recordable-incident count fixed to HIGH/CRITICAL.
3. ~~EOD auto-send~~ **DONE (2026-06-23)** — /api/cron/eod + Vercel Cron +
   Resend + eod_sent_log; site setup collects the recipient. Needs env vars (§8).
4. **Worksite "still here?" daily confirm.** Once per day on first open (and on
   gate-pass open), ask the worker to confirm they're still on their worksite;
   update `current_worksite` / activity.
5. ~~Required vs Optional at site setup~~ **DONE (2026-06-23)** — optional tier
   collected + stored (optional_credential_types). Follow-on: surface the
   optional tier explicitly on the verify screen (today extra tickets show in
   "also on file").
6. ~~assignMedicByEmail stub~~ **DONE (2026-06-23)** — resolve_medic_id_by_email
   RPC + idempotent assignment + working form on the site page.

**Post-pilot / hardening:**
7. ~~Branded magic-link email via Resend~~ **DONE (2026-06-23).** rigwise.ca
   verified in Resend (DNS on Cloudflare), Supabase Custom SMTP wired, branded
   template live on Magic Link + Confirm signup. Auth emails now send from
   `RigWise <noreply@rigwise.ca>`.
8. Rotating signed 30s QR instead of the static worker UUID.
9. Retention job to actually purge after 2 years (cron / DB policy).
10. Tighten RLS (Phase-1 policies let any authenticated user create
    companies/projects/sites — flagged in-code for Phase 2).
11. Link or remove the orphaned OCR scan route (`/wallet/credentials/scan` works
    but nothing links to it; also it currently discards the photo).
12. **Secret hygiene:** `DEPLOY.md` contains a real project ref + publishable
    anon key; confirm `.env.local` is git-ignored (not committed).

---

## 8. Environment gotchas (read before touching infra)

- **The real Supabase project is `jxgkcvqesnbhjsmnblbq`** (from `.env.local` /
  Vercel env). The connected Supabase **MCP points at a different project
  (`yjctbjghrjxaduoxswhw`)** — do **NOT** apply migrations through the MCP; it
  would hit the wrong database. Migrations must be run by Albin in the dashboard
  SQL editor: `https://supabase.com/dashboard/project/jxgkcvqesnbhjsmnblbq/sql/new`
- **Env vars** (Vercel): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe), `SUPABASE_SERVICE_ROLE_KEY`
  (server-only secret — only `lib/supabase/admin.ts`), `RESEND_API_KEY` (EOD
  auto-send), `CRON_SECRET` (Vercel Cron auth for /api/cron/eod — Vercel sends
  it automatically as a Bearer token when the env var is set).
- **Storage:** private buckets `faces` + `ticket-photos`; images served via
  1-hour signed URLs from `lib/photos.ts`. RLS is intentionally loose for the
  pilot (any authenticated user can read/insert) — tighten later.
- **No cron exists yet** anywhere in the repo (matters for EOD auto-send +
  retention).

---

## 9. Definition of done (every change)

Build green (`tsc` + `next build`) → committed → pushed to `main` → a one-line
note of any dashboard step Albin must do (migration SQL, Resend, env var). Update
this file's §6/§7 so state stays true.
