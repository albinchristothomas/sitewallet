import Link from "next/link";
import { CONTACT_EMAIL, SITE_DOMAIN } from "@/lib/brand";

export const metadata = { title: "Privacy" };

// Required by both app stores and by PIPEDA. Written the way we would explain
// it to a crew at a tailgate meeting: what we keep, who sees it, how to get
// rid of it. Legal review is still owed before commercial contracts.

const MONO = "var(--font-jetbrains-mono), ui-monospace, monospace";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "#5d666f",
        marginTop: 30,
        marginBottom: 8,
      }}
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14, lineHeight: 1.65, color: "#c4ccd2", margin: "0 0 10px" }}>
      {children}
    </p>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-6 pb-16 pt-8">
      <Link
        href="/"
        className="mono"
        style={{ fontSize: 11, color: "#9aa3ab", textTransform: "uppercase", letterSpacing: "0.1em", textDecoration: "none" }}
      >
        ← RigVise
      </Link>

      <h1 style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-0.02em", color: "#f4f6f7", marginTop: 18 }}>
        Privacy
      </h1>
      <P>
        RigVise holds the safety tickets you choose to carry and records when a
        medic lets you through a gate. This page says exactly what that means.
      </P>

      <H>What we keep</H>
      <P>
        Your name and the company you work for. Your phone number and employee
        number if you add them. A photo of your face if you add one. Photos of
        the safety cards you scan, and the details read off them (ticket name,
        issuer, certificate number, dates). Your sign-in email.
      </P>
      <P>
        Gate records: which site, which day, when you checked in and out, and
        whether the medic admitted or denied you. Incident reports a medic
        files that name you.
      </P>

      <H>Who sees it</H>
      <P>
        The medic at the gate sees your name, photo, and tickets when they scan
        your pass. The site operator sees the daily roster and end-of-day
        report for their own site: names, companies, times, denials, incidents.
        Nobody outside your site&apos;s crew and its operator sees your record.
        We do not sell or share it for advertising.
      </P>

      <H>Services we run on</H>
      <P>
        Your data is stored with Supabase and served by Vercel. Sign-in codes
        and daily reports are emailed through Resend. When you scan a card, the
        photo is sent to Anthropic&apos;s Claude to read the printed details;
        it is used only for that read and not kept by them for training.
      </P>

      <H>How long</H>
      <P>
        Your wallet stays as long as your account does. Gate records are site
        safety records: the operator is required to keep them, so they are
        retained after an account is closed, with your personal details removed.
      </P>

      <H>Deleting your account</H>
      <P>
        Profile → Delete my account. That removes your name, contact details,
        face photo, every ticket and card photo, and your sign-in. Gate records
        are kept for the site but no longer carry your name or contact details.
        It takes effect immediately and cannot be undone.
      </P>

      <H>Questions</H>
      <P>
        Write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#f2581c", fontWeight: 700 }}>
          {CONTACT_EMAIL}
        </a>
        . RigVise is operated in Alberta, Canada, and handles personal
        information under PIPEDA.
      </P>

      <div
        style={{
          marginTop: 36,
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#3a3f45",
        }}
      >
        RigVise · {SITE_DOMAIN}
      </div>
    </main>
  );
}
