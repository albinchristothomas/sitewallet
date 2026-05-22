import Link from "next/link";

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Plain-English instructions for the pilot.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Workers</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
          <li>
            <strong>Add the app to your home screen.</strong> Open this site in
            Safari (iPhone) or Chrome (Android). Tap the share icon and choose
            "Add to Home Screen". After that, SiteWallet opens like a normal
            app.
          </li>
          <li>
            <strong>Sign in.</strong> Use your work email. Tap the link we send
            you. No password to remember.
          </li>
          <li>
            <strong>Add your tickets.</strong> Wallet → "+ Add credential". Pick
            the credential (H2S Alive, First Aid, etc.), enter the dates and
            the validation code from the card. Repeat for each ticket.
          </li>
          <li>
            <strong>At the gate.</strong> Tap{" "}
            <Link href="/wallet/qr" className="underline">
              "Show my QR"
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
            <span className="rounded bg-emerald-100 px-1 dark:bg-emerald-900/40">
              Green = compliant
            </span>
            : worker has every credential this site requires.{" "}
            <span className="rounded bg-red-100 px-1 dark:bg-red-900/40">
              Red = not compliant
            </span>
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
            paper sign-in. We'll backfill the data within 24 hours of
            connectivity returning.
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Status pill meanings</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
              Valid
            </span>
            <dd>Credential is current. More than 30 days until expiry.</dd>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              Expiring soon
            </span>
            <dd>Less than 30 days until expiry. Time to schedule renewal.</dd>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-red-100 px-3 py-0.5 text-xs font-medium text-red-900 dark:bg-red-900/40 dark:text-red-200">
              Expired
            </span>
            <dd>
              Past the expiry date. Cannot be used at a site that requires it.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-base font-semibold">Got stuck?</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Email{" "}
          <a
            href="mailto:feedback@sitewallet.ca"
            className="font-medium underline"
          >
            feedback@sitewallet.ca
          </a>{" "}
          with what you were doing and what happened. Screenshots help.
        </p>
      </section>
    </main>
  );
}
