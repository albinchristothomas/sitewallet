// End-of-Day report email — the auto-sent counterpart of the on-screen report
// (app/medic/[siteId]/report). Pure function: data in, email-safe HTML out.
// Table-based layout + inline styles only (email clients ignore stylesheets).
// Mirrors the report's warm-cream "paper document" look.

export type EodCrewRow = {
  name: string;
  company: string | null;
  inAt: string; // pre-formatted HH:MM
  outAt: string | null;
  hours: string | null;
};

export type EodDenialRow = {
  name: string;
  reason: string | null;
  at: string; // pre-formatted HH:MM
};

export type EodIncidentRow = {
  type: string;
  severity: string;
  description: string;
  at: string; // pre-formatted HH:MM
};

export type EodData = {
  siteName: string;
  wellLsd: string;
  operatorName: string;
  contractName: string | null;
  muster: string;
  dayLabel: string; // e.g. "23 JUN 2026"
  admittedCount: number;
  deniedCount: number;
  crewHours: string;
  recordableCount: number;
  crew: EodCrewRow[];
  denials: EodDenialRow[];
  incidents: EodIncidentRow[];
};

const PAPER = "#f6f2ea";
const INK = "#23211c";
const INK_DIM = "#6d675c";
const LINE = "#d9d2c4";
const ORANGE = "#c2440f";
const RED = "#b03225";
const GREEN = "#1e8a4c";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const mono =
  "'JetBrains Mono',Menlo,Consolas,monospace";
const sans =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function statCell(label: string, value: string, color: string): string {
  return `<td align="center" style="padding:12px 6px;border:1px solid ${LINE};">
    <div style="font-family:${mono};font-size:9px;letter-spacing:0.14em;color:${INK_DIM};text-transform:uppercase;">${esc(label)}</div>
    <div style="font-family:${sans};font-size:26px;font-weight:800;color:${color};margin-top:4px;">${esc(value)}</div>
  </td>`;
}

export function buildEodEmailHtml(d: EodData): string {
  const crewRows = d.crew.length
    ? d.crew
        .map(
          (r, i) => `<tr style="background:${i % 2 ? "#efe9dd" : "transparent"};">
      <td style="padding:7px 10px;font-family:${sans};font-size:13px;color:${INK};border-bottom:1px solid ${LINE};">${esc(r.name)}</td>
      <td style="padding:7px 10px;font-family:${sans};font-size:12px;color:${INK_DIM};border-bottom:1px solid ${LINE};">${esc(r.company ?? "—")}</td>
      <td style="padding:7px 10px;font-family:${mono};font-size:12px;color:${INK};border-bottom:1px solid ${LINE};" align="right">${esc(r.inAt)}</td>
      <td style="padding:7px 10px;font-family:${mono};font-size:12px;color:${INK};border-bottom:1px solid ${LINE};" align="right">${esc(r.outAt ?? "—")}</td>
      <td style="padding:7px 10px;font-family:${mono};font-size:12px;color:${INK};border-bottom:1px solid ${LINE};" align="right">${esc(r.hours ?? "—")}</td>
    </tr>`,
        )
        .join("")
    : `<tr><td colspan="5" style="padding:14px 10px;font-family:${sans};font-size:13px;color:${INK_DIM};" align="center">No workers signed in on this date.</td></tr>`;

  const denialBlock = d.denials.length
    ? `<div style="margin-top:22px;">
        <div style="font-family:${mono};font-size:10px;letter-spacing:0.14em;color:${RED};text-transform:uppercase;font-weight:700;">Entry denials — ${d.denials.length}</div>
        ${d.denials
          .map(
            (x) => `<div style="margin-top:8px;padding:9px 12px;border:1px solid ${LINE};border-left:3px solid ${RED};font-family:${sans};font-size:13px;color:${INK};">
            <strong>${esc(x.name)}</strong>
            <span style="font-family:${mono};font-size:11px;color:${INK_DIM};"> · ${esc(x.at)}</span>
            <div style="font-size:12px;color:${INK_DIM};margin-top:3px;">${esc(x.reason ?? "Not compliant")}</div>
          </div>`,
          )
          .join("")}
      </div>`
    : "";

  const incidentBlock = d.incidents.length
    ? `<div style="margin-top:22px;">
        <div style="font-family:${mono};font-size:10px;letter-spacing:0.14em;color:${ORANGE};text-transform:uppercase;font-weight:700;">Incidents — ${d.incidents.length} (${d.recordableCount} recordable)</div>
        ${d.incidents
          .map(
            (x) => `<div style="margin-top:8px;padding:9px 12px;border:1px solid ${LINE};border-left:3px solid ${ORANGE};font-family:${sans};font-size:13px;color:${INK};">
            <strong>${esc(x.type.replace(/_/g, " "))}</strong>
            <span style="font-family:${mono};font-size:11px;color:${INK_DIM};"> · ${esc(x.severity)} · ${esc(x.at)}</span>
            <div style="font-size:12px;color:${INK_DIM};margin-top:3px;">${esc(x.description)}</div>
          </div>`,
          )
          .join("")}
      </div>`
    : `<div style="margin-top:22px;font-family:${sans};font-size:13px;color:${GREEN};font-weight:600;">Incidents: none reported — 0 recordable.</div>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Daily Safety Report</title></head>
<body style="margin:0;padding:0;background:#e8e3d8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8e3d8;padding:26px 12px;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:${PAPER};border:1px solid ${LINE};">

  <tr><td style="padding:22px 28px;border-bottom:2px solid ${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:${sans};font-size:20px;font-weight:800;color:${INK};letter-spacing:-0.01em;">
        RIG<span style="color:${INK_DIM};font-weight:600;">WISE</span>
        <span style="font-family:${mono};font-size:10px;letter-spacing:0.16em;color:${INK_DIM};text-transform:uppercase;">&nbsp;· Daily safety report</span>
      </td>
      <td align="right" style="font-family:${mono};font-size:11px;color:${INK};">${esc(d.dayLabel)}</td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:18px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:${mono};font-size:11px;color:${INK};line-height:1.9;">
        <span style="color:${INK_DIM};">SITE&nbsp;&nbsp;</span>${esc(d.siteName)}<br>
        <span style="color:${INK_DIM};">WELL / LSD&nbsp;&nbsp;</span>${esc(d.wellLsd)}<br>
        <span style="color:${INK_DIM};">OPERATOR&nbsp;&nbsp;</span>${esc(d.operatorName)}${d.contractName ? `<br><span style="color:${INK_DIM};">CONTRACT&nbsp;&nbsp;</span>${esc(d.contractName)}` : ""}<br>
        <span style="color:${INK_DIM};">MUSTER&nbsp;&nbsp;</span>${esc(d.muster)}
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:18px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${statCell("Admitted", String(d.admittedCount), GREEN)}
      ${statCell("Denied", String(d.deniedCount), d.deniedCount > 0 ? RED : INK)}
      ${statCell("Crew hours", d.crewHours, INK)}
      ${statCell("Recordable", String(d.recordableCount), d.recordableCount > 0 ? ORANGE : INK)}
    </tr></table>
  </td></tr>

  <tr><td style="padding:22px 28px 0;">
    <div style="font-family:${mono};font-size:10px;letter-spacing:0.14em;color:${INK_DIM};text-transform:uppercase;font-weight:700;">Crew — ${d.admittedCount} admitted</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;border:1px solid ${LINE};">
      <tr style="background:#efe9dd;">
        <th align="left" style="padding:7px 10px;font-family:${mono};font-size:9px;letter-spacing:0.1em;color:${INK_DIM};text-transform:uppercase;">Worker</th>
        <th align="left" style="padding:7px 10px;font-family:${mono};font-size:9px;letter-spacing:0.1em;color:${INK_DIM};text-transform:uppercase;">Company</th>
        <th align="right" style="padding:7px 10px;font-family:${mono};font-size:9px;letter-spacing:0.1em;color:${INK_DIM};text-transform:uppercase;">In</th>
        <th align="right" style="padding:7px 10px;font-family:${mono};font-size:9px;letter-spacing:0.1em;color:${INK_DIM};text-transform:uppercase;">Out</th>
        <th align="right" style="padding:7px 10px;font-family:${mono};font-size:9px;letter-spacing:0.1em;color:${INK_DIM};text-transform:uppercase;">Hrs</th>
      </tr>
      ${crewRows}
    </table>
  </td></tr>

  <tr><td style="padding:0 28px;">${denialBlock}${incidentBlock}</td></tr>

  <tr><td style="padding:24px 28px 26px;">
    <div style="border-top:1px solid ${LINE};padding-top:14px;font-family:${mono};font-size:9px;letter-spacing:0.12em;color:${INK_DIM};text-transform:uppercase;line-height:1.8;">
      Generated automatically by RigWise at end of day · rigwise.ca<br>
      Times shown in America/Edmonton. This report reflects gate records as captured on site.
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}
