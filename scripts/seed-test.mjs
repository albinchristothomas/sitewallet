// RigVise — local test-sample seeder.
//
//   node scripts/seed-test.mjs
//
// Creates a complete demo cast against the live Supabase project so the whole
// story can be clicked through locally BEFORE any real pilot:
//   · TEST medic      albinchristothomas+medic@gmail.com
//   · TEST worker A   albinchristothomas+pass@gmail.com  → should be ADMITTED
//   · TEST worker B   albinchristothomas+fail@gmail.com  → should be DENIED
//   · TEST site with required tickets (H2S, First Aid, CSO) + optional
//   · Seeded tickets WITH generated card photos + face photos
//
// Idempotent: safe to run again (it refreshes the same test rows).
// Remove everything later with: node scripts/cleanup-test.mjs
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

// ── env ──────────────────────────────────────────────────────────────────
function loadEnv() {
  const out = {};
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const env = loadEnv();
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SERVICE) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

// ── the cast ─────────────────────────────────────────────────────────────
const MEDIC_EMAIL = "albinchristothomas+medic@gmail.com";
const PASS_EMAIL = "albinchristothomas+pass@gmail.com";
const FAIL_EMAIL = "albinchristothomas+fail@gmail.com";
const EOD_RECIPIENT = "albinchristothomas@gmail.com";

const SITE_NAME = "TEST — Karr 12-34 Pad B";
const PROJECT_NAME = "TEST — Karr Wapiti Drilling 2026";
const COMPANY_NAME = "TEST — Borealis Energy Corp";
const PROFILE_NAME = "TEST — Karr requirements";

function iso(d) {
  return d.toISOString().slice(0, 10);
}
const today = new Date();
const plus1y = iso(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()));
const plus20d = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20));
const minus30d = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30));
const minus1y = iso(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));

// ── image generation (sharp renders an SVG → jpeg) ──────────────────────
async function cardImage(title, holder, tone) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
    <rect width="640" height="400" fill="#f0ece1"/>
    <rect width="640" height="86" fill="${tone}"/>
    <text x="24" y="54" font-family="Arial" font-size="30" font-weight="bold" fill="#ffffff">${title}</text>
    <text x="24" y="150" font-family="Arial" font-size="20" fill="#333">CERTIFICATE OF COMPLETION</text>
    <text x="24" y="200" font-family="Arial" font-size="26" font-weight="bold" fill="#111">${holder}</text>
    <text x="24" y="250" font-family="Arial" font-size="18" fill="#555">Cert No: TEST-${Math.floor(Math.random() * 90000 + 10000)}</text>
    <text x="24" y="360" font-family="Arial" font-size="14" fill="#999">SAMPLE CARD — SEEDED FOR TESTING, NOT A REAL TICKET</text>
    <rect x="500" y="120" width="110" height="110" fill="#111"/>
    <rect x="512" y="132" width="86" height="86" fill="#f0ece1"/>
    <rect x="524" y="144" width="62" height="62" fill="#111"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}

async function faceImage(initials, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600">
    <rect width="480" height="600" fill="${bg}"/>
    <circle cx="240" cy="220" r="90" fill="#e8dcc8"/>
    <rect x="120" y="330" width="240" height="270" rx="90" fill="#e8dcc8"/>
    <text x="240" y="560" font-family="Arial" font-size="44" font-weight="bold" fill="#333" text-anchor="middle">${initials} · TEST</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}

async function upload(bucket, path, buf) {
  const { error } = await db.storage.from(bucket).upload(path, buf, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw new Error(`upload ${bucket}/${path}: ${error.message}`);
  return path;
}

// ── auth users ───────────────────────────────────────────────────────────
// Password "rigvise-test" powers the dev-only one-tap sign-in on the local
// login screen (app/login/dev-login.tsx) — no magic-link emails needed.
const TEST_PASSWORD = "rigvise-test";

async function ensureUser(email) {
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = data?.users?.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    await db.auth.admin.updateUserById(existing.id, { password: TEST_PASSWORD });
    return existing.id;
  }
  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return created.user.id;
}

async function main() {
  console.log("Seeding RigVise test sample…\n");

  // 1. Users
  const medicId = await ensureUser(MEDIC_EMAIL);
  const passId = await ensureUser(PASS_EMAIL);
  const failId = await ensureUser(FAIL_EMAIL);
  console.log("✓ auth users");

  // 2. Face photos
  const passFace = await upload("faces", "seed/pass-face.jpg", await faceImage("DH", "#5b7a99"));
  const failFace = await upload("faces", "seed/fail-face.jpg", await faceImage("MK", "#8a6d5b"));

  // 3. Worker rows (profile completed so nobody is bounced to onboarding)
  const nowIso = new Date().toISOString();
  const workers = [
    {
      id: medicId,
      full_name: "TEST Medic (Alex Reyes)",
      account_type: "MEDIC",
      medic_firm: "Borealis Medical Services",
      medic_license_number: "EMR-TEST-4471",
      profile_completed_at: nowIso,
    },
    {
      id: passId,
      full_name: "TEST Dale Hutchins",
      account_type: "WORKER",
      contractor_company: "Borealis Vac Services",
      current_worksite: "Karr 12-34 Pad B",
      photo_url: passFace,
      profile_completed_at: nowIso,
    },
    {
      id: failId,
      full_name: "TEST Mike Kowalski",
      account_type: "WORKER",
      contractor_company: "Northline Hotshot",
      current_worksite: "Karr 12-34 Pad B",
      photo_url: failFace,
      profile_completed_at: nowIso,
    },
  ];
  for (const w of workers) {
    const { error } = await db.from("workers").upsert(w, { onConflict: "id" });
    if (error) throw new Error(`workers upsert: ${error.message}`);
  }
  console.log("✓ worker profiles (+ face photos)");

  // 4. Company → requirements → project → site (idempotent by name)
  async function ensureRow(table, match, insert) {
    const { data: found } = await db.from(table).select("id").match(match).maybeSingle();
    if (found) return found.id;
    const { data, error } = await db.from(table).insert(insert).select("id").single();
    if (error) throw new Error(`${table} insert: ${error.message}`);
    return data.id;
  }

  const companyId = await ensureRow(
    "companies",
    { name: COMPANY_NAME },
    { name: COMPANY_NAME, type: "OPERATOR" },
  );
  const profileId = await ensureRow(
    "requirements_profiles",
    { name: PROFILE_NAME },
    {
      name: PROFILE_NAME,
      required_credential_types: ["H2S_ALIVE", "FIRST_AID", "CSO"],
      optional_credential_types: ["FALL_PROTECTION"],
    },
  );
  const projectId = await ensureRow(
    "projects",
    { name: PROJECT_NAME },
    {
      operator_id: companyId,
      name: PROJECT_NAME,
      contract_name: "TEST Drilling MSA 2026",
      contractor_company_name: "Precision Drilling",
      requirements_profile_id: profileId,
    },
  );
  const siteId = await ensureRow(
    "sites",
    { name: SITE_NAME },
    {
      project_id: projectId,
      name: SITE_NAME,
      rig_name: "Precision 555",
      rig_number: "555",
      well_number: "PD-TEST-01",
      lsd_location: "12-34-067-25 W5M",
      muster_point: "NE gate by the flag shack",
      eod_recipient_email: EOD_RECIPIENT,
    },
  );
  // keep muster/recipient fresh on re-runs
  await db
    .from("sites")
    .update({ muster_point: "NE gate by the flag shack", eod_recipient_email: EOD_RECIPIENT })
    .eq("id", siteId);
  console.log("✓ company / requirements / project / site");

  // 5. Medic assignment
  {
    const { error } = await db
      .from("medic_assignments")
      .upsert({ medic_id: medicId, site_id: siteId }, { onConflict: "medic_id,site_id", ignoreDuplicates: true });
    if (error) throw new Error(`medic_assignments: ${error.message}`);
  }
  console.log("✓ medic assigned to site");

  // 6. Credentials (refresh: delete test workers' creds, insert anew)
  await db.from("credentials").delete().in("worker_id", [passId, failId]);

  const cardH2sPass = await upload("ticket-photos", "seed/pass-h2s.jpg", await cardImage("H2S ALIVE", "TEST Dale Hutchins", "#c0392b"));
  const cardFaPass = await upload("ticket-photos", "seed/pass-fa.jpg", await cardImage("STANDARD FIRST AID", "TEST Dale Hutchins", "#1e8a4c"));
  const cardCsoPass = await upload("ticket-photos", "seed/pass-cso.jpg", await cardImage("CSO", "TEST Dale Hutchins", "#2c5f8a"));
  const cardFpPass = await upload("ticket-photos", "seed/pass-fp.jpg", await cardImage("FALL PROTECTION", "TEST Dale Hutchins", "#8a6d2c"));
  const cardH2sFail = await upload("ticket-photos", "seed/fail-h2s.jpg", await cardImage("H2S ALIVE", "TEST Mike Kowalski", "#c0392b"));
  const cardFaFail = await upload("ticket-photos", "seed/fail-fa.jpg", await cardImage("STANDARD FIRST AID", "TEST Mike Kowalski", "#1e8a4c"));

  const creds = [
    // PASS worker — everything valid; one medic-verified, rest self-entered
    { worker_id: passId, credential_type: "H2S_ALIVE", issuer: "Energy Safety Canada", certificate_number: "ESC-TEST-11821", holder_name: "Dale Hutchins", issue_date: minus1y, expiry_date: plus1y, photo_url: cardH2sPass, verification_status: "MANUALLY_VERIFIED", verification_method: "SEED", verified_at: nowIso, verified_by: medicId },
    { worker_id: passId, credential_type: "FIRST_AID", issuer: "Canadian Red Cross", certificate_number: "CRC-TEST-88213", holder_name: "Dale Hutchins", issue_date: minus1y, expiry_date: plus20d, photo_url: cardFaPass, verification_status: "UNVERIFIED" },
    { worker_id: passId, credential_type: "CSO", issuer: "Energy Safety Canada", certificate_number: "ESC-TEST-55102", holder_name: "Dale Hutchins", issue_date: minus1y, expiry_date: plus1y, photo_url: cardCsoPass, verification_status: "UNVERIFIED" },
    { worker_id: passId, credential_type: "FALL_PROTECTION", issuer: "Various", certificate_number: "FP-TEST-30991", holder_name: "Dale Hutchins", issue_date: minus1y, expiry_date: plus1y, photo_url: cardFpPass, verification_status: "UNVERIFIED" },
    // FAIL worker — First Aid EXPIRED + CSO missing entirely
    { worker_id: failId, credential_type: "H2S_ALIVE", issuer: "Energy Safety Canada", certificate_number: "ESC-TEST-77410", holder_name: "Mike Kowalski", issue_date: minus1y, expiry_date: plus1y, photo_url: cardH2sFail, verification_status: "UNVERIFIED" },
    { worker_id: failId, credential_type: "FIRST_AID", issuer: "St. John Ambulance", certificate_number: "SJA-TEST-20180", holder_name: "Mike Kowalski", issue_date: minus1y, expiry_date: minus30d, photo_url: cardFaFail, verification_status: "UNVERIFIED" },
  ];
  {
    const { error } = await db.from("credentials").insert(creds);
    if (error) throw new Error(`credentials: ${error.message}`);
  }
  console.log("✓ tickets seeded (with generated card photos)\n");

  console.log("════════════════════════ TEST SAMPLE READY ════════════════════════");
  console.log(`Site:          ${SITE_NAME}`);
  console.log(`  siteId:      ${siteId}`);
  console.log("");
  console.log(`MEDIC login:   ${MEDIC_EMAIL}`);
  console.log(`WORKER logins: ${PASS_EMAIL}  (should be ADMITTED)`);
  console.log(`               ${FAIL_EMAIL}  (should be DENIED: First Aid expired, CSO missing)`);
  console.log("All magic links land in the main gmail inbox (plus-addressing).");
  console.log("");
  console.log("Direct URLs once signed in as the MEDIC (localhost:3000):");
  console.log(`  Dashboard:   http://localhost:3000/medic/${siteId}`);
  console.log(`  Verify PASS: http://localhost:3000/medic/${siteId}/verify/${passId}`);
  console.log(`  Verify FAIL: http://localhost:3000/medic/${siteId}/verify/${failId}`);
  console.log(`  EOD report:  http://localhost:3000/medic/${siteId}/report`);
  console.log("");
  console.log("Worker IDs (for the scanner's Type-ID fallback, no second phone needed):");
  console.log(`  PASS worker: ${passId}`);
  console.log(`  FAIL worker: ${failId}`);
  console.log("════════════════════════════════════════════════════════════════════");
}

main().catch((e) => {
  console.error("✗ Seed failed:", e.message);
  process.exit(1);
});
