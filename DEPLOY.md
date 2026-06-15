# Deploying Rigwise

This walks through getting Rigwise from your laptop to a public HTTPS URL
that a medic on a real worksite can use.

## Prerequisites

You should have already:

1. Created a Supabase project (you have one at `jxgkcvqesnbhjsmnblbq.supabase.co`)
2. Run the SQL migration in Supabase SQL Editor — see
   `supabase/migrations/20260519000000_init.sql`
3. Got `.env.local` working locally (`npm run dev` opens the app on localhost
   and you can sign in)

If you haven't done those, do them first.

## 1. Push to GitHub

Vercel deploys from GitHub. Create a private repo, push this code.

```sh
# Inside D:\Projects\rigwise
git status                                 # confirm there are commits
git remote add origin git@github.com:YOUR_USER/rigwise.git
git branch -M main
git push -u origin main
```

If you've never used GitHub from this machine: install [GitHub
CLI](https://cli.github.com/) and run `gh auth login`, then
`gh repo create rigwise --private --source=. --remote=origin --push`.

## 2. Create a Vercel project

1. Go to <https://vercel.com> and sign in with the same GitHub account.
2. **Add New → Project** → pick the `rigwise` repo.
3. Framework preset: **Next.js** (auto-detected).
4. Build command, output directory, install command: **leave default**.
5. Before clicking Deploy, expand **Environment Variables** and add:

   | Name                            | Value                                                 |
   |---------------------------------|-------------------------------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`      | `https://jxgkcvqesnbhjsmnblbq.supabase.co`            |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_Bv06CtR-hpz8NGCbbcUWhQ_9zQdqhXQ`      |

   Both should be set for **Production**, **Preview**, **Development**.

6. Click **Deploy**.

After ~60 seconds, you'll get a URL like
`rigwise.vercel.app`. Open it. You should see the landing page.

## 3. Tell Supabase about the new URL

Magic-link emails will only redirect back to URLs Supabase trusts.

In Supabase dashboard:

1. **Authentication → URL Configuration**
2. **Site URL** → set to your Vercel URL (e.g. `https://rigwise.vercel.app`).
   You can change this later when you have a custom domain.
3. **Redirect URLs** → add:
   - `https://rigwise.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev — keep this)
4. Save.

## 4. (Optional) Custom domain

If you bought `rigwise.ca` or similar:

1. In Vercel project → **Settings → Domains** → **Add**.
2. Paste your domain. Vercel shows you which DNS record to set at your
   registrar (Cloudflare, Namecheap, etc.).
3. Add the record. Wait 5–30 min for DNS propagation. Vercel auto-issues a
   Let's Encrypt cert.
4. Go back to Supabase → **Authentication → URL Configuration** and:
   - Update Site URL to `https://rigwise.ca`
   - Add `https://rigwise.ca/auth/callback` to redirect URLs

## 5. Verify the deployment

Open the production URL on your phone. Run through:

- [ ] Landing page loads
- [ ] Sign in with a real email — magic link arrives
- [ ] Magic link opens the app, you end up on `/wallet`
- [ ] Add a credential
- [ ] Show `/wallet/qr` — QR renders
- [ ] Add the app to your home screen (iOS Safari: Share → Add to Home Screen;
      Android Chrome: tap "Install app" prompt or use ⋮ menu)
- [ ] Open from home screen — launches full-screen with the Rigwise icon
- [ ] Create a site at `/admin/sites/new`
- [ ] Assign yourself as medic
- [ ] Open `/medic/<siteId>/scan` — camera permission prompt appears
- [ ] Scan your own QR (or use manual entry) — verify screen appears
- [ ] Admit — session starts
- [ ] Check out — session closes
- [ ] Check `/medic/<siteId>/roster` — today's session shows

If all of those work, you're shipped.

## 6. Rolling back

If a deploy breaks production:

1. In Vercel → **Deployments** → find the previous good one
2. **⋯** → **Promote to Production**

Rollback is instant.

## 7. Monitoring during the pilot

- **Vercel Logs**: project → **Logs** tab. Filter by status code.
- **Supabase**: project → **Logs Explorer**. Filter by event type.
- **App audit log**: query the `audit_log` table directly via the SQL Editor.

## Common issues

**Camera doesn't work on iOS.** iOS requires the page to be on HTTPS and uses
Safari only for camera in PWA-installed mode. If the worker is using Safari
directly (not the home-screen install), it should work. If installed from
home screen, iOS uses a stricter WKWebView and camera should still work but
prompts may behave differently. Manual entry fallback is always available.

**Magic-link email never arrives.** Check Supabase **Auth → Logs**. Most
common cause: the email landed in spam, or the Supabase email rate limit was
hit (3/hour per email on free tier). Custom SMTP fixes this for production.

**Worker gets "this URL is not allowed" after clicking magic link.** The
redirect URL in Supabase URL Configuration doesn't match the URL the email
was generated for. Re-check both the Site URL and the Redirect URLs list.

**"Sharp" build failure on Vercel.** Sharp is included for icon generation
only at our build script. If the Vercel build complains, run `npm install`
on a clean clone and re-push.
