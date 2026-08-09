// Where the product lives. Everything user-visible that names a domain reads
// from here, so moving domains is a settings change, not a code hunt.
//
// SITE_DOMAIN — the domain shown to people (footers, card backs, emails) and
//   used for mailto links. Set NEXT_PUBLIC_SITE_DOMAIN in Vercel to change it.
//
// MAIL_DOMAIN — the domain transactional email is SENT FROM. Deliberately
//   separate: Resend only sends from a domain it has verified via DNS, so
//   when the site moves the mail domain stays put until the new one is
//   verified. Set MAIL_DOMAIN once Resend shows the new domain as verified.
//
// Sign-in links are NOT here on purpose — they're built from the request's own
// origin (app/login/actions.ts), so they always point at whichever domain the
// worker actually used.

export const SITE_DOMAIN =
  process.env.NEXT_PUBLIC_SITE_DOMAIN?.trim() || "rigwise.ca";

export const MAIL_DOMAIN = process.env.MAIL_DOMAIN?.trim() || SITE_DOMAIN;

export const SITE_URL = `https://${SITE_DOMAIN}`;

/** Support/contact addresses, on whichever domain currently receives mail. */
export const CONTACT_EMAIL = `hello@${SITE_DOMAIN}`;
export const FEEDBACK_EMAIL = `feedback@${SITE_DOMAIN}`;

/** Resend "from" — must be a domain verified in Resend or sending fails. */
export const EMAIL_FROM = `RigVise <noreply@${MAIL_DOMAIN}>`;

/** Verification URL printed on the back of a credential card. */
export function verifyUrlFor(certNo: string): string {
  return `${SITE_DOMAIN}/v/${certNo}`;
}
