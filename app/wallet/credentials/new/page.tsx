import Link from "next/link";
import { AddCredentialForm } from "./add-credential-form";

export default function NewCredentialPage() {
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
      <AddCredentialForm />
    </main>
  );
}
