// RigVise — remove everything created by scripts/seed-test.mjs.
//
//   node scripts/cleanup-test.mjs
//
// Deletes the TEST site/project/company/profile, the three test accounts
// (+medic/+pass/+fail), their sessions/credentials/denials, and the seeded
// storage images. Run this before any real pilot data matters.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const out = {};
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_EMAILS = [
  "albinchristothomas+medic@gmail.com",
  "albinchristothomas+pass@gmail.com",
  "albinchristothomas+fail@gmail.com",
];

async function main() {
  console.log("Cleaning up RigVise test sample…");

  // Resolve test user ids
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const testUsers = (data?.users ?? []).filter((u) =>
    TEST_EMAILS.includes(u.email?.toLowerCase() ?? ""),
  );
  const ids = testUsers.map((u) => u.id);

  if (ids.length) {
    // Order matters: sessions/incidents/audit references first, then creds,
    // then assignments, then the auth users (workers rows cascade).
    await db.from("sessions").delete().in("worker_id", ids);
    await db.from("incidents").delete().in("worker_id", ids);
    await db.from("audit_log").delete().in("entity_id", ids);
    await db.from("audit_log").delete().in("actor_id", ids);
    await db.from("credentials").delete().in("worker_id", ids);
    await db.from("medic_assignments").delete().in("medic_id", ids);
    for (const u of testUsers) {
      await db.auth.admin.deleteUser(u.id);
      console.log(`✓ deleted account ${u.email}`);
    }
  }

  // Test site tree (eod_sent_log + assignments cascade on site delete)
  const { data: site } = await db
    .from("sites")
    .select("id, project_id")
    .eq("name", "TEST — Karr 12-34 Pad B")
    .maybeSingle();
  if (site) {
    await db.from("incidents").delete().eq("site_id", site.id);
    await db.from("sessions").delete().eq("site_id", site.id);
    await db.from("sites").delete().eq("id", site.id);
    await db.from("projects").delete().eq("id", site.project_id);
    console.log("✓ deleted test site + project");
  }
  await db.from("requirements_profiles").delete().eq("name", "TEST — Karr requirements");
  await db.from("companies").delete().eq("name", "TEST — Borealis Energy Corp");

  // Seeded images
  const seedFiles = (prefix, names) => names.map((n) => `${prefix}/${n}`);
  await db.storage.from("faces").remove(seedFiles("seed", ["pass-face.jpg", "fail-face.jpg"]));
  await db.storage
    .from("ticket-photos")
    .remove(
      seedFiles("seed", [
        "pass-h2s.jpg",
        "pass-fa.jpg",
        "pass-cso.jpg",
        "pass-fp.jpg",
        "fail-h2s.jpg",
        "fail-fa.jpg",
      ]),
    );
  console.log("✓ deleted seeded images");
  console.log("Done — test sample removed.");
}

main().catch((e) => {
  console.error("✗ Cleanup failed:", e.message);
  process.exit(1);
});
