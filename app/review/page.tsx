import { notFound } from "next/navigation";
import { ReviewForm } from "./review-form";

export const metadata = { title: "Review sign-in" };

// Unlinked page for Google Play / App Store reviewers. 404s unless the
// review account is configured (REVIEW_LOGIN_EMAIL) — see app/review/actions.ts.
export default function ReviewSignInPage() {
  if (!process.env.REVIEW_LOGIN_EMAIL) notFound();
  return (
    <main className="mx-auto flex w-full max-w-[384px] flex-1 flex-col justify-center px-6 py-12">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div
          style={{
            width: 34,
            height: 34,
            background: "#f2581c",
            borderRadius: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 13, height: 13, background: "#0d0f12" }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.01em", color: "#eef1f3" }}>
          RIG
          <span style={{ color: "#8b949c", fontWeight: 600 }}>VISE</span>
        </div>
      </div>
      <h1 style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em", color: "#f4f6f7", margin: "0 0 6px" }}>
        Reviewer sign-in
      </h1>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: "#9aa3ab", margin: "0 0 22px" }}>
        For app store review teams. Workers and medics sign in with an emailed
        code on the normal sign-in screen.
      </p>
      <ReviewForm />
    </main>
  );
}
