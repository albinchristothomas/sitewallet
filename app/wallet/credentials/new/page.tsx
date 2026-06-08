import Link from "next/link";
import { AddCredentialForm } from "./add-credential-form";

export default async function NewCredentialPage(
  props: PageProps<"/wallet/credentials/new">,
) {
  const sp = await props.searchParams;
  const prefill = {
    type: typeof sp.type === "string" ? sp.type : "",
    issuer: typeof sp.issuer === "string" ? sp.issuer : "",
    cert: typeof sp.cert === "string" ? sp.cert : "",
    issue: typeof sp.issue === "string" ? sp.issue : "",
    expiry: typeof sp.expiry === "string" ? sp.expiry : "",
    holder: typeof sp.holder === "string" ? sp.holder : "",
    verifyUrl: typeof sp.verify_url === "string" ? sp.verify_url : "",
  };
  const wasPrefilled = Object.values(prefill).some((v) => v.length > 0);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-0 pb-0 pt-2">
      <div className="flex h-14 items-center justify-between px-5">
        <Link
          href="/wallet"
          className="flex items-center gap-1.5 text-[15px] font-medium text-[color:var(--text)]"
        >
          ✕
        </Link>
        <div className="text-[16px] font-bold">Add credential</div>
        <div className="w-5" />
      </div>
      {wasPrefilled && (
        <div className="mx-5 mb-2 rounded-lg border border-[color:rgba(16,185,129,0.32)] bg-[color:rgba(16,185,129,0.10)] px-3 py-2 text-[12px] text-[color:#34D399]">
          ✓ Auto-filled from your photo. Review and save.
        </div>
      )}
      <AddCredentialForm prefill={prefill} />
    </main>
  );
}
