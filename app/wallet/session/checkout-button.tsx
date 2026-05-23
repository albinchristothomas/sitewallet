"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function ConfirmInner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-14 rounded-xl bg-[#EF4444] text-[15px] font-bold text-white hover:brightness-95 disabled:opacity-50"
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
        className="h-16 w-full rounded-xl bg-[color:var(--hi-yellow)] text-[18px] font-bold tracking-[0.01em] text-[color:var(--ink-1)] hover:brightness-95"
      >
        Check out
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[color:rgba(239,68,68,0.30)] bg-[color:rgba(239,68,68,0.10)] p-4">
      <div className="text-[15px] font-semibold">Check out of this site?</div>
      <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--text-dim)]">
        Your session will close. The medic will see you&apos;ve left.
      </p>
      <form action={action} className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="h-14 rounded-xl border border-[color:var(--hair-strong)] text-[15px] font-semibold text-[color:var(--text)] hover:bg-[color:var(--ink-2)]"
        >
          Stay on site
        </button>
        <ConfirmInner />
      </form>
    </div>
  );
}
