# RigWise — Privacy & Data, in one page

For safety managers and operators who (rightly) ask "where does our people's
data go?" before they let an app onto the lease. Plain answers.

### What we collect
- **Workers:** name, working company, current worksite, optional phone, their
  safety tickets (type, issuer, dates, a photo of the card), and an optional
  face photo. Nothing more. No SIN/SSN. ID verification is opt-in and only if a
  customer requires it.
- **Medics:** name, firm, licence number — the signing identity on reports.
- **Gate activity:** check-in/out times, the admit/deny decision and which medic
  made it. Filed by well number.

### Where it lives
- Managed Postgres + encrypted object storage (Supabase). **Encrypted in transit
  (TLS) and at rest.** Card and face photos sit in **private** buckets — they are
  never public; the app serves them only through short-lived (1-hour) signed
  links to authorized users.
- **Data residency:** production target is **AWS ca-central-1 (Canada)**, aligned
  with **PIPEDA**. Pilots may run in a US region; we'll state the region in your
  agreement.

### Who can see what
- A **worker** sees only their own wallet.
- A **medic** sees a worker's compliance **only** for a site they're assigned to,
  and only when that worker presents their QR at the gate.
- **One email = one role**, locked. A worker account can never become a medic
  account or vice-versa.
- We do **not** sell or share data with advertisers or third parties. Ever.

### Verification & anti-fraud
- Tickets a worker types in are marked **self-entered / unverified** until a
  medic confirms them by eye or an issuer QR proves them. A custom ticket can
  **never auto-pass** a gate. The medic always makes the final call, and it's
  logged.

### Retention & deletion
- Personal data is kept only as long as needed for site safety records —
  **target: 2 years after a person's last site activity** — then permanently
  deleted.
- A worker can request export or deletion of their data. An operator can request
  export/deletion of its operational records.

### Your control
- Workers control their own wallet and can leave.
- During a pilot you can walk away anytime; we export and delete on request.

*Questions: [your contact email] · rigwise.ca*
