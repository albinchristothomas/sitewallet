import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { INTENT_DESCRIPTION, type SignupIntent, homeForType, type AccountType } from "@/lib/roles";
import { LoginForm } from "./login-form";

function isIntent(s: string | string[] | undefined): s is SignupIntent {
  return s === "worker" || s === "medic";
}

const MONO = "'JetBrains Mono', monospace";

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const as: SignupIntent | null = isIntent(sp.as) ? sp.as : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: w } = await supabase
      .from("workers")
      .select("account_type")
      .eq("id", user.id)
      .single();
    const type = (w?.account_type ?? "WORKER") as AccountType;
    redirect(homeForType(type));
  }

  const ROLE_LABELS: Record<SignupIntent, string> = {
    worker: "Worker · Wallet",
    medic: "Medic · Gate scanner",
  };

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-10">
      <div
        className="rw-enter relative w-full max-w-[384px] overflow-hidden"
        style={{
          borderRadius: 34,
          background:
            "radial-gradient(120% 90% at 50% -10%, #161a1f 0%, #0d0f12 60%)",
          boxShadow:
            "0 30px 60px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* guilloché sheen */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.35,
            backgroundImage:
              "conic-gradient(from 30deg at 50% 35%, rgba(255,255,255,0.04), transparent 40%, rgba(255,255,255,0.03) 70%, transparent 100%)",
          }}
        />

        <div
          className="relative flex flex-col"
          style={{ padding: "30px 28px" }}
        >
          {/* Brand lockup */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                background: "#f2581c",
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
              }}
            >
              <div style={{ width: 13, height: 13, background: "#0d0f12" }} />
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 24,
                letterSpacing: "-0.01em",
                color: "#eef1f3",
              }}
            >
              RIG
              <span style={{ color: "#8b949c", fontWeight: 600 }}>WISE</span>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginTop: 40 }}>
            <h1
              style={{
                fontWeight: 800,
                fontSize: 30,
                letterSpacing: "-0.02em",
                color: "#f4f6f7",
                lineHeight: 1,
              }}
            >
              Sign in
            </h1>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: "#9aa3ab",
                marginTop: 10,
                lineHeight: 1.6,
                letterSpacing: "0.03em",
              }}
            >
              No passwords. We send a one-time link to your work email.
            </div>

            {as && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 14,
                  padding: "5px 10px",
                  borderRadius: 6,
                  background: "rgba(242,88,28,0.12)",
                  border: "1px solid rgba(242,88,28,0.5)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#f2581c",
                    boxShadow: "0 0 6px #f2581c",
                  }}
                />
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "#ffd27a",
                    textTransform: "uppercase",
                  }}
                >
                  {ROLE_LABELS[as]}
                </span>
              </div>
            )}
            {as && (
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: "#9aa3ab",
                  marginTop: 12,
                  lineHeight: 1.6,
                  letterSpacing: "0.03em",
                }}
              >
                {INTENT_DESCRIPTION[as].long}
              </div>
            )}
          </div>

          {/* Form */}
          <div style={{ marginTop: 30 }}>
            <LoginForm signupAs={as} />
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 40,
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.08em",
              color: "#5d666f",
              lineHeight: 1.7,
              textAlign: "center",
            }}
          >
            PROTECTED WORKSITE SYSTEM · VOID IF SHARED
            <br />
            RIGWISE.CA ·{" "}
            <Link
              href="/help"
              style={{ color: "#5d666f", textDecorationLine: "none" }}
              className="transition-colors hover:text-[#9aa3ab]"
            >
              SUPPORT 1-800-RIG-WISE
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
