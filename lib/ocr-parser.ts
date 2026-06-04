// OCR parser for Canadian safety tickets. Adapted from the wallet design
// shared by the user. Extracts credential type, issuer, cert number, dates,
// and holder name from raw Tesseract.js text.

export type CredentialKey =
  | "H2S_ALIVE"
  | "FIRST_AID"
  | "CSO"
  | "GROUND_DISTURBANCE_L2"
  | "WHMIS_2015"
  | "TDG"
  | "FALL_PROTECTION"
  | "CONFINED_SPACE"
  | "OSSA_FIT"
  | "ELEVATED_WORK"
  | "OTHER";

export type Preset = {
  key: CredentialKey;
  label: string;
  issuer: string;
  validYears: number;
};

export const PRESETS: Preset[] = [
  { key: "H2S_ALIVE",            label: "H2S Alive",                          issuer: "Energy Safety Canada",          validYears: 3 },
  { key: "FIRST_AID",            label: "Standard First Aid + CPR-C",         issuer: "Canadian Red Cross",            validYears: 3 },
  { key: "WHMIS_2015",           label: "WHMIS 2015 / GHS",                   issuer: "CCOHS",                         validYears: 3 },
  { key: "CSO",                  label: "Common Safety Orientation (CSO)",    issuer: "Energy Safety Canada",          validYears: 3 },
  { key: "OSSA_FIT",             label: "OSSA / Petroleum Safety Training",   issuer: "Energy Safety Canada",          validYears: 3 },
  { key: "FALL_PROTECTION",      label: "Fall Protection",                    issuer: "Energy Safety Canada",          validYears: 3 },
  { key: "CONFINED_SPACE",       label: "Confined Space Entry & Monitor",     issuer: "Energy Safety Canada",          validYears: 3 },
  { key: "GROUND_DISTURBANCE_L2",label: "Ground Disturbance Level II",        issuer: "Alberta Common Ground Alliance", validYears: 3 },
  { key: "TDG",                  label: "TDG — Transportation of Dangerous Goods", issuer: "Transport Canada",         validYears: 3 },
  { key: "ELEVATED_WORK",        label: "Elevated Work Platform",             issuer: "Various",                       validYears: 3 },
];

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function extractDates(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const push = (iso: string) => {
    if (!iso) return;
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return;
    const y = d.getFullYear();
    if (y < 1990 || y > 2050) return;
    if (seen.has(iso)) return;
    seen.add(iso);
    found.push(iso);
  };

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  for (const m of text.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    const [, y, mo, d] = m;
    push(`${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  // DD/MM/YYYY (Canadian) — assume DD first if ambiguous
  for (const m of text.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/g)) {
    const [, a, b, y] = m;
    const aN = parseInt(a), bN = parseInt(b);
    let day, mon;
    if (aN > 12) { day = a; mon = b; }
    else if (bN > 12) { mon = a; day = b; }
    else { day = a; mon = b; }
    push(`${y}-${mon.padStart(2, "0")}-${day.padStart(2, "0")}`);
  }
  // Month Name DD, YYYY
  for (const m of text.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/gi)) {
    const monKey = m[1].toLowerCase().slice(0, 3);
    const mo = MONTH_MAP[monKey] || MONTH_MAP[m[1].toLowerCase()];
    if (mo) push(`${m[3]}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`);
  }
  // DD Month YYYY
  for (const m of text.matchAll(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(20\d{2})\b/gi)) {
    const monKey = m[2].toLowerCase().slice(0, 3);
    const mo = MONTH_MAP[monKey] || MONTH_MAP[m[2].toLowerCase()];
    if (mo) push(`${m[3]}-${String(mo).padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  }
  return found;
}

function findIssueExpiry(text: string): { issueDate: string; expiryDate: string } {
  const lines = text.split(/\r?\n/);
  let issueDate = "", expiryDate = "";

  for (const line of lines) {
    const lower = line.toLowerCase();
    const dates = extractDates(line);
    if (dates.length === 0) continue;

    if (!expiryDate && /expir|valid\s*until|valid\s*to|valid\s*through|renew|recertif|exp\.?\s*date|exp\b/i.test(lower)) {
      expiryDate = dates[dates.length - 1];
    }
    if (!issueDate && /issued?|completion|course\s*date|date\s*of\s*course|date\s*of\s*issue|valid\s*from|certified|issue\s*date/i.test(lower)) {
      issueDate = dates[0];
    }
  }

  const all = extractDates(text);
  if (!issueDate && !expiryDate && all.length >= 2) {
    const sorted = [...new Set(all)].sort();
    issueDate = sorted[0];
    expiryDate = sorted[sorted.length - 1];
  } else if (!expiryDate && issueDate && all.length >= 2) {
    const others = all.filter(d => d !== issueDate).sort();
    if (others.length) expiryDate = others[others.length - 1];
  } else if (!issueDate && expiryDate && all.length >= 2) {
    const others = all.filter(d => d !== expiryDate).sort();
    if (others.length) issueDate = others[0];
  }

  return { issueDate, expiryDate };
}

function findPresetMatch(text: string): Preset | null {
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");

  type Rule = { kw: string[]; preset: CredentialKey };
  const rules: Rule[] = [
    { kw: ["h2s alive"],              preset: "H2S_ALIVE" },
    { kw: ["h2s"],                    preset: "H2S_ALIVE" },
    { kw: ["first aid", "cpr"],       preset: "FIRST_AID" },
    { kw: ["first aid"],              preset: "FIRST_AID" },
    { kw: ["whmis"],                  preset: "WHMIS_2015" },
    { kw: ["ghs"],                    preset: "WHMIS_2015" },
    { kw: ["common safety orientation"], preset: "CSO" },
    { kw: [" cso "],                  preset: "CSO" },
    { kw: ["petroleum safety"],       preset: "OSSA_FIT" },
    { kw: [" pst "],                  preset: "OSSA_FIT" },
    { kw: ["ossa"],                   preset: "OSSA_FIT" },
    { kw: ["fall protection"],        preset: "FALL_PROTECTION" },
    { kw: ["confined space"],         preset: "CONFINED_SPACE" },
    { kw: ["ground disturbance"],     preset: "GROUND_DISTURBANCE_L2" },
    { kw: ["transportation of dangerous"], preset: "TDG" },
    { kw: ["tdg"],                    preset: "TDG" },
    { kw: ["elevated work"],          preset: "ELEVATED_WORK" },
    { kw: ["aerial lift"],            preset: "ELEVATED_WORK" },
  ];

  for (const r of rules) {
    const padded = " " + lower + " ";
    const matches = r.kw.every(k => padded.includes(" " + k.trim() + " ") || lower.includes(k.trim()));
    if (matches) {
      const preset = PRESETS.find(p => p.key === r.preset);
      if (preset) return preset;
    }
  }
  return null;
}

const KNOWN_ISSUERS = [
  "Energy Safety Canada", "Canadian Red Cross", "St. John Ambulance",
  "Transport Canada", "Alberta Common Ground Alliance",
  "CCOHS", "ABSA", "Alberta Transportation",
  "Enform", "OSSA", "Heart and Stroke Foundation", "Lifesaving Society",
];

function findIssuer(text: string, preset: Preset | null): string {
  const lower = text.toLowerCase();
  for (const iss of KNOWN_ISSUERS) {
    const keyPart = iss.toLowerCase().split(" ").filter(w => w.length > 3).slice(0, 2).join(" ");
    if (keyPart && lower.includes(keyPart)) return iss;
  }
  return preset?.issuer ?? "";
}

function findCertNumber(text: string): string {
  const labelPatterns = [
    /(?:cert(?:ificate)?(?:\s*(?:no|#|number))?|reg(?:istration)?(?:\s*(?:no|#))?|licen[cs]e\s*(?:no|#)?|id\s*(?:no|#)?|card\s*(?:no|#)?)\s*[:\-.]?\s*([A-Z0-9][A-Z0-9\-/]{4,20})/gi,
  ];
  for (const p of labelPatterns) {
    const m = p.exec(text);
    if (m) return m[1].replace(/[^A-Z0-9\-/]/gi, "").toUpperCase();
  }
  const candidates = [...text.matchAll(/\b([A-Z]{2,5}[-\s]?\d{4,8}|[0-9]{6,12})\b/g)];
  if (candidates.length) {
    const sorted = candidates.map(m => m[1]).sort((a, b) => b.length - a.length);
    return sorted[0].replace(/\s/g, "").toUpperCase();
  }
  return "";
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b(\w)/g, c => c.toUpperCase()).replace(/\s+/g, " ").trim();
}

function findHolderName(text: string, knownProfileName = ""): string {
  if (knownProfileName && text.toLowerCase().includes(knownProfileName.toLowerCase())) {
    return knownProfileName;
  }
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const m = /^(?:name|holder|recipient|awarded\s*to|this\s*is\s*to\s*certify\s*that)\s*[:\-]\s*(.+)/i.exec(line);
    if (m) {
      const candidate = m[1].trim().split(/\s{2,}|,/)[0].trim();
      if (/^[A-Za-z][A-Za-z\s.\-']{2,40}$/.test(candidate)) return toTitleCase(candidate);
    }
  }

  const top = lines.slice(0, 8);
  for (const line of top) {
    if (/\d/.test(line)) continue;
    if (line.length < 5 || line.length > 40) continue;
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (words.every(w => /^[A-Z][a-zA-Z.\-']+$/.test(w) || /^[A-Z\-']+$/.test(w))) {
      return toTitleCase(line);
    }
  }
  return "";
}

function addYears(dateStr: string, years: number): string {
  if (!dateStr || !years || years >= 99) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export type ParsedTicket = {
  credentialKey: CredentialKey | "";
  credentialLabel: string;
  issuer: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  holderName: string;
  confidence: {
    name: boolean;
    dates: boolean;
    cert: boolean;
  };
};

export function parseTicketText(text: string, knownProfileName = ""): ParsedTicket {
  const preset = findPresetMatch(text);
  const { issueDate, expiryDate } = findIssueExpiry(text);
  const issuer = findIssuer(text, preset);
  const certificateNumber = findCertNumber(text);
  const holderName = findHolderName(text, knownProfileName);

  let finalExpiry = expiryDate;
  if (!finalExpiry && issueDate && preset && preset.validYears < 99) {
    finalExpiry = addYears(issueDate, preset.validYears);
  }

  return {
    credentialKey: preset?.key ?? "",
    credentialLabel: preset?.label ?? "",
    issuer,
    certificateNumber,
    issueDate,
    expiryDate: finalExpiry,
    holderName,
    confidence: {
      name: !!preset,
      dates: !!(issueDate || finalExpiry),
      cert: !!certificateNumber,
    },
  };
}
