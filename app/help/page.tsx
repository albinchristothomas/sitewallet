import Link from "next/link";
import { FEEDBACK_EMAIL } from "@/lib/brand";
import { StatusPill } from "@/lib/atoms";
import { BrowserOnly } from "@/lib/browser-only";

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Help</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Workers</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
          {/* Meaningless inside the App Store / Play Store app, so hidden there. */}
          <BrowserOnly>
            <li>
              <strong>Add the app to your home screen.</strong> Open this site
              in Safari (iPhone) or Chrome (Android). Tap the share icon and
              choose "Add to Home Screen". After that, RigVise opens like a
              normal app.
            </li>
          </BrowserOnly>
          <li>
            <strong>Sign in.</strong> Use your work email. Type the 6-digit
            code we email you. No password to remember.
          </li>
          <li>
            <strong>Add your tickets.</strong> Wallet → "Add ticket".
            Photograph the card; the details are read off it. Check them and
            save. Repeat for each ticket.
          </li>
          <li>
            <strong>At the gate.</strong> Tap{" "}
            <Link href="/wallet/qr" className="underline">
              "Show gate pass"
            </Link>{" "}
            and hold the screen up for the medic. Wait for them to admit you.
          </li>
          <li>
            <strong>Checking out.</strong> Open the app, tap the green "On site
            now" banner, then tap "Check out".
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Medics</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
          <li>
            <strong>Get assigned to your site.</strong> An admin assigns you to
            the rig before your shift. You'll see it under{" "}
            <Link href="/medic" className="underline">
              Medic
            </Link>
            .
          </li>
          <li>
            <strong>Scan a worker.</strong> From your site dashboard, tap
            "Scan worker". Allow camera access. Point at the worker's phone QR.
            If the camera doesn't work, switch to "Manual entry" and type
            their worker ID.
          </li>
          <li>
            <strong>Read the verdict.</strong>{" "}
            <StatusPill
              status="valid"
              size="sm"
              label="Compliant"
              className="align-middle"
            />
            : worker has every credential this site requires.{" "}
            <StatusPill
              status="bad"
              size="sm"
              label="Not compliant"
              className="align-middle"
            />
            : at least one credential is missing or expired. Look at the list
            to see which.
          </li>
          <li>
            <strong>Admit or deny.</strong> Tap "Admit worker" to start their
            session. If you admit a non-compliant worker, the override is
            logged with your medic ID.
          </li>
          <li>
            <strong>Daily roster.</strong> Site dashboard → "Roster". Filter
            by date. Shows everyone who was on site that day.
          </li>
          <li>
            <strong>If the app fails or goes offline.</strong> Fall back to
            paper sign-in, then enter the workers as walk-ins when you&apos;re
            back online so the day&apos;s roster and report stay complete.
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Status pill meanings</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <StatusPill status="valid" />
            <dd>Credential is current. More than 30 days until expiry.</dd>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status="expiring" label="Expiring soon" />
            <dd>Less than 30 days until expiry. Time to schedule renewal.</dd>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status="expired" />
            <dd>
              Past the expiry date. Cannot be used at a site that requires it.
            </dd>
          </div>
        </dl>
      </section>

      <section className="rw-panel rw-spine mt-10 overflow-hidden rounded-[12px] p-5 pl-6">
        <h2 className="text-base font-semibold">Report a problem</h2>
        <p className="mt-1 text-sm text-[color:var(--text-dim)]">
          Email{" "}
          <a
            href={`mailto:${FEEDBACK_EMAIL}`}
            className="font-medium underline"
          >
            {FEEDBACK_EMAIL}
          </a>{" "}
          with what you were doing and what happened. Screenshots help.
        </p>
      </section>
    </main>
  );
}
