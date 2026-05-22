# SiteWallet

Digital safety credentials wallet and gate-verification system for the Canadian
energy industry (oil & gas, mining, pipeline construction).

This repo contains the **Phase 1 foundation**: a Next.js 16 + Supabase app with
the worker wallet flow end-to-end. Medic scanner and operator portal are
forthcoming.

## What works today

- Magic-link signup / sign-in (no passwords)
- Per-user wallet view listing all safety credentials
- Add a credential (manual entry — H2S Alive, First Aid, CSO, Ground
  Disturbance L2, WHMIS, TDG, Fall Protection, Confined Space, OSSA, etc.)
- Expiry status badges (valid / expiring soon / expired)
- Row-level security: each worker only sees their own data
- Session refresh via Next.js 16 proxy (the artist formerly known as middleware)

## Stack

- **Next.js 16** (App Router, Turbopack, React 19.2, async cookies)
- **Tailwind CSS v4**
- **Supabase** — Postgres + Auth (magic link) + Storage + SSR cookies
- **TypeScript** strict mode
- Deployed on Vercel; data residency target is AWS `ca-central-1` (PIPEDA) at
  scale

## Setup

### 1. Create a Supabase project

1. Go to <https://supabase.com/dashboard> and create a new project. Choose a
   Canadian region if available (e.g. `ca-central-1`).
2. From **Project Settings → API**, copy:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon public key**

### 2. Configure local env

```sh
cp .env.local.example .env.local
```

Edit `.env.local` and paste in your project URL and anon key.

### 3. Run the schema migration

In the Supabase dashboard, open **SQL Editor** and run the contents of
[`supabase/migrations/20260519000000_init.sql`](./supabase/migrations/20260519000000_init.sql).

This creates the core tables (`workers`, `credentials`, `companies`,
`employments`, `projects`, `requirements_profiles`, `sites`, `sessions`,
`audit_log`) along with row-level security policies.

### 4. Configure magic-link redirect

In Supabase, go to **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs** (add): `http://localhost:3000/auth/callback`

When deploying to production, add the production URL(s) the same way.

### 5. Install and run

```sh
npm install
npm run dev
```

Open <http://localhost:3000> and sign in with your email.

## Project structure

```
app/
  page.tsx                              # Landing — redirects authed users to /wallet
  login/
    page.tsx                            # Magic-link form
    login-form.tsx                      # Client component
    actions.ts                          # Server action: send magic link
  auth/callback/route.ts                # Exchanges code for session, ensures workers row
  wallet/
    page.tsx                            # Worker's credentials list
    actions.ts                          # Server actions: sign out, add credential
    credentials/new/
      page.tsx                          # Add credential page
      add-credential-form.tsx           # Client form

lib/
  supabase/
    server.ts                           # Server-side Supabase client (async cookies)
    client.ts                           # Browser Supabase client
  credentials.ts                        # Credential type catalog + expiry helpers

proxy.ts                                # Session refresh + auth redirect (Next.js 16)

supabase/
  migrations/
    20260519000000_init.sql             # Phase 1 schema + RLS policies
```

## Architectural notes

These are locked-in decisions, not open questions:

1. **Worker-centric data model.** The wallet belongs to the worker forever.
   `workers.id` references `auth.users.id` 1:1. Employer relationships live in
   `employments`, which can come and go.
2. **Credentials are append-only.** A renewal creates a new `credentials` row.
   The schema enforces this via RLS (no UPDATE policy for workers on their own
   credentials).
3. **Sessions, not single scans.** A gate interaction is a check-in / check-out
   pair, with a `compliance_snapshot` JSONB frozen at the moment of entry.
4. **Projects own requirements profiles.** Sites are transient physical
   locations under a project. This lets a pipeline spread move down the
   right-of-way without breaking compliance logic.
5. **Medic as primary scanner persona** (Phase 2 — not in this repo yet).

## What's next

- Personal rotating QR code for the worker (30s rotation, signed token)
- Medic scanner (tablet UI): scan a worker QR, see compliance against a site
  requirements profile, admit/deny
- Active session view and self-checkout from the worker side
- Identity verification at onboarding (Onfido / Persona)
- Photo upload for credentials and ID
- Offline-first sync for the medic app (remote sites lose Starlink connectivity)
- Operator portal (site profile builder, live active sessions, audit reports)

See the project handoff doc for the full Phase 1 / Phase 2 scope and the
strategic positioning (medic-station wedge vs head-to-head with MyPass).
