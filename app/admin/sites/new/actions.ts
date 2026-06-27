"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type State = { error?: string };

export async function createSite(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const operatorName = String(formData.get("operator_name") ?? "").trim();
  const projectName = String(formData.get("project_name") ?? "").trim();
  const contractName = String(formData.get("contract_name") ?? "").trim() || null;
  const contractorCompanyName =
    String(formData.get("contractor_company_name") ?? "").trim() || null;
  const siteName = String(formData.get("site_name") ?? "").trim();
  const rigName = String(formData.get("rig_name") ?? "").trim() || null;
  const rigNumber = String(formData.get("rig_number") ?? "").trim() || null;
  const wellNumber = String(formData.get("well_number") ?? "").trim() || null;
  const lsdLocation = String(formData.get("lsd_location") ?? "").trim() || null;
  const latStr = String(formData.get("lat") ?? "").trim();
  const lngStr = String(formData.get("lng") ?? "").trim();
  const lat = latStr ? Number(latStr) : null;
  const lng = lngStr ? Number(lngStr) : null;
  const musterPoint = String(formData.get("muster_point") ?? "").trim() || null;
  const eodRecipientEmail =
    String(formData.get("eod_recipient_email") ?? "").trim() || null;
  const required = formData.getAll("required").map(String);
  // A ticket can be in at most one tier; required wins if somehow both.
  const optional = formData
    .getAll("optional")
    .map(String)
    .filter((t) => !required.includes(t));

  if (!operatorName || !projectName || !siteName) {
    return { error: "Operator, project, and site name are required." };
  }

  // 1. Operator company
  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .insert({ name: operatorName, type: "OPERATOR" })
    .select("id")
    .single();
  if (companyErr) return { error: `Company: ${companyErr.message}` };

  // 2. Requirements profile
  const { data: profile, error: profileErr } = await supabase
    .from("requirements_profiles")
    .insert({
      name: `${projectName} — requirements`,
      required_credential_types: required,
      optional_credential_types: optional,
    })
    .select("id")
    .single();
  if (profileErr) return { error: `Profile: ${profileErr.message}` };

  // 3. Project
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .insert({
      operator_id: company.id,
      name: projectName,
      contract_name: contractName,
      contractor_company_name: contractorCompanyName,
      requirements_profile_id: profile.id,
    })
    .select("id")
    .single();
  if (projectErr) return { error: `Project: ${projectErr.message}` };

  // 4. Site
  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .insert({
      project_id: project.id,
      name: siteName,
      rig_name: rigName,
      rig_number: rigNumber,
      well_number: wellNumber,
      lsd_location: lsdLocation,
      lat,
      lng,
      muster_point: musterPoint,
      eod_recipient_email: eodRecipientEmail,
    })
    .select("id")
    .single();
  if (siteErr) return { error: `Site: ${siteErr.message}` };

  // 5. Auto-assign the creator as medic for this site, if they're a medic.
  // The creator is almost always going to be scanning workers in at this
  // site, so save them the click.
  const { data: creator } = await supabase
    .from("workers")
    .select("account_type")
    .eq("id", user.id)
    .single();
  if (creator?.account_type === "MEDIC") {
    await supabase
      .from("medic_assignments")
      .insert({ medic_id: user.id, site_id: site.id });
  }

  redirect(`/admin/sites/${site.id}?created=1`);
}
