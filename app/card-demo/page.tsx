import { CredentialCard, type CredentialCardData } from "@/lib/credential-card";

const SAMPLE: CredentialCardData = {
  issuerLine1: "PETROFIELD SAFETY",
  issuerLine2: "AUTHORITY",
  issuerSub: "ISSUING BODY · CAN",
  category: "STANDARD · H2S TRAINING",
  title: "H2S ALIVE",
  subtitle: "Hydrogen Sulphide Awareness",
  holderName: "Marcus T. Bouvier",
  holderRole: "RIG DRIVER · CREW B",
  certNo: "PSA-H2S-4471-0022",
  issued: "04 MAR 2024",
  expires: "04 MAR 2027",
  serial: "0049 8821 7",
  scope:
    "Certifies completion of Hydrogen Sulphide (H2S) Awareness: properties of H2S, exposure limits, detection, respiratory protective equipment, and rescue techniques. Valid three (3) years from issue.",
  verifyUrl: "rigwise.ca/v/4471-0022",
};

export default function CardDemoPage() {
  return (
    <main style={{ padding: "40px 24px 80px", maxWidth: 460, margin: "0 auto" }}>
      <div className="eyebrow" style={{ marginBottom: 20 }}>
        Credential card — port check
      </div>
      <CredentialCard data={SAMPLE} state="valid" />
      <div style={{ height: 32 }} />
      <CredentialCard data={{ ...SAMPLE, title: "TDG", subtitle: "Transport of Dangerous Goods", expires: "12 JUL 2026" }} state="expiring" />
      <div style={{ height: 32 }} />
      <CredentialCard data={{ ...SAMPLE, title: "WHMIS 2015", subtitle: "Hazard Communication", expires: "18 NOV 2025" }} state="expired" />
    </main>
  );
}
