"use client";

import { useActionState, useState } from "react";
import { deleteMyAccount } from "./delete-actions";

// Tucked away, deliberate, and impossible to hit by accident: expand, read
// what goes, type DELETE, then a single red button.

const MONO = "var(--font-jetbrains-mono), ui-monospace, monospace";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [state, action, pending] = useActionState(deleteMyAccount, {});
  const armed = confirm.trim().toUpperCase() === "DELETE";

  return (
    <section style={{ marginTop: 40 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mono"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#5d666f",
        }}
      >
        {open ? "Close" : "Delete my account"}
      </button>

      {open && (
        <form
          action={action}
          style={{
            marginTop: 12,
            borderRadius: 12,
            border: "1px solid rgba(239,65,53,0.35)",
            background: "rgba(239,65,53,0.06)",
            padding: "16px 16px 18px",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16, color: "#f4f6f7" }}>
            Delete your RigVise account
          </div>
          <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: "#c4ccd2" }}>
            This removes your name, contact details, face photo, every ticket
            and card photo, and your sign-in. It takes effect now and cannot be
            undone. Gate check-in records stay with the site as safety records,
            without your name or contact details.
          </p>

          <label
            htmlFor="delete-confirm"
            className="mono"
            style={{
              display: "block",
              marginTop: 14,
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#9aa3ab",
            }}
          >
            Type DELETE to confirm
          </label>
          <input
            id="delete-confirm"
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            style={{
              marginTop: 6,
              width: "100%",
              height: 46,
              borderRadius: 9,
              background: "#15191e",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "0 14px",
              fontFamily: MONO,
              fontSize: 15,
              letterSpacing: "0.1em",
              color: "#f4f6f7",
              outline: "none",
            }}
          />

          {state.error && (
            <p className="mono" style={{ marginTop: 10, fontSize: 11, color: "#ff9a8f" }}>
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={!armed || pending}
            style={{
              marginTop: 14,
              width: "100%",
              height: 48,
              borderRadius: 9,
              border: "none",
              background: armed ? "#ef4135" : "rgba(239,65,53,0.25)",
              color: armed ? "#0d0f12" : "#ff9a8f",
              fontWeight: 800,
              fontSize: 14,
              cursor: armed && !pending ? "pointer" : "default",
            }}
          >
            {pending ? "Deleting…" : "Delete account permanently"}
          </button>
        </form>
      )}
    </section>
  );
}
