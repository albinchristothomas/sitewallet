"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function ConfirmInner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-[48px] rounded-[9px] bg-[color:var(--bad)] text-[15px] font-bold text-white hover:brightness-95 disabled:opacity-50"
    >
      {pending ? "Checking out..." : "Yes, check out"}
    </button>
  );
}

export function CheckoutButton({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="h-[52px] w-full rounded-[9px] bg-[color:var(--brand)] text-[18px] font-bold tracking-[0.01em] text-[color:var(--on-brand)] hover:brightness-95"
      >
        Check out
      </button>
    );
  }

  return (
    <div className="rounded-[9px] border border-[color:var(--bad-line)] bg-[color:var(--bad-bg)] p-4">
      <div className="text-[15px] font-semibold">Check out of this site?</div>
      <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--text-dim)]">
        Your session will close. The medic will see you&apos;ve left.
      </p>
      <form action={action} className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="h-[48px] rounded-[9px] border border-[color:var(--line-strong)] text-[15px] font-semibold text-[color:var(--text)] hover:bg-[color:var(--surface-2)]"
        >
          Stay on site
        </button>
        <ConfirmInner />
      </form>
    </div>
  );
}
