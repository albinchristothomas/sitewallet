"use client";

import { useEffect, useRef, useState } from "react";

// ============================================================
// CredentialCard — a near-verbatim port of the approved
// "Credential Card" design system (front + back, tilt, flip,
// guilloché, holographic foil, embossed serial, 3 states).
// Exact gradients / pixel sizes preserved from the design file;
// only the data is parameterized. Base size 408x632; a wrapper
// scales it to the container width so pixels stay proportional.
// ============================================================

export type CardState = "valid" | "expiring" | "expired";

export type CredentialCardData = {
  issuerLine1: string; // e.g. "PETROFIELD SAFETY"
  issuerLine2?: string; // e.g. "AUTHORITY"
  issuerSub: string; // e.g. "ISSUING BODY · CAN"
  category: string; // e.g. "STANDARD · H2S TRAINING"
  title: string; // e.g. "H2S ALIVE"
  subtitle: string; // e.g. "Hydrogen Sulphide Awareness"
  holderName: string; // e.g. "Marcus T. Bouvier"
  holderRole: string; // e.g. "RIG DRIVER · CREW B"
  certNo: string; // e.g. "PSA-H2S-4471-0022"
  issued: string; // e.g. "04 MAR 2024"
  expires: string; // e.g. "04 MAR 2027"
  serial: string; // e.g. "0049 8821 7"
  scope?: string; // back: scope of training
  verifyUrl?: string; // back: rigwise.ca/v/...
  photoUrl?: string | null;
  qrSeed?: number;
};

const STATE_MAP: Record<
  CardState,
  {
    label: string;
    fg: string;
    bg: string;
    bd: string;
    dot: string;
    sub: string;
    heroFilter: string;
    overprint: number;
  }
> = {
  valid: {
    label: "VALID",
    fg: "#7ff0a8",
    bg: "rgba(47,200,106,0.12)",
    bd: "rgba(47,200,106,0.5)",
    dot: "#2fd072",
    sub: "VALID TO EXPIRY",
    heroFilter: "none",
    overprint: 0,
  },
  expiring: {
    label: "EXPIRING",
    fg: "#ffd27a",
    bg: "rgba(242,164,12,0.14)",
    bd: "rgba(242,164,12,0.55)",
    dot: "#f2a40c",
    sub: "RENEW SOON",
    heroFilter: "none",
    overprint: 0,
  },
  expired: {
    label: "EXPIRED",
    fg: "#ff9a8f",
    bg: "rgba(239,65,53,0.14)",
    bd: "rgba(239,65,53,0.55)",
    dot: "#ef4135",
    sub: "RENEWAL REQUIRED",
    heroFilter: "grayscale(0.5) brightness(0.82) contrast(1.02)",
    overprint: 1,
  },
};

const MONO = "'JetBrains Mono', ui-monospace, monospace";

function makeQR(seed: number): string {
  const n = 25;
  let s = (seed >>> 0) || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const g: boolean[][] = [];
  for (let i = 0; i < n; i++) g.push(new Array(n).fill(false));
  const reserved = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (!reserved(x, y)) g[y][x] = rnd() > 0.52;
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const edge = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        g[oy + y][ox + x] = edge || core;
      }
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  for (let i = 8; i < n - 8; i += 2) {
    g[6][i] = true;
    g[i][6] = true;
  }
  let rects = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (g[y][x]) rects += `<rect x='${x}' y='${y}' width='1' height='1'/>`;
  const raw = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${n} ${n}' shape-rendering='crispEdges'><g fill='#141009'>${rects}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(raw)}")`;
}

function makeBarcode(): string {
  let s = 20250619 >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  let x = 2;
  let rects = "";
  while (x < 98) {
    const w = rnd() > 0.5 ? 1 : 2;
    if (rnd() > 0.42) rects += `<rect x='${x}' y='0' width='${w}' height='30'/>`;
    x += w + (rnd() > 0.6 ? 2 : 1);
  }
  const raw = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 30'><g fill='#141009'>${rects}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(raw)}")`;
}

export function CredentialCard({
  data,
  state = "valid",
  brand = "#f2581c",
  interactive = true,
}: {
  data: CredentialCardData;
  state?: CardState;
  brand?: string;
  interactive?: boolean;
}) {
  const m = STATE_MAP[state];
  const qrFront = makeQR(data.qrSeed ?? 4471);
  const qrBack = makeQR((data.qrSeed ?? 4471) + 95000);
  const barcode = makeBarcode();

  const wrapRef = useRef<HTMLDivElement>(null);
  const scaleHostRef = useRef<HTMLDivElement>(null);
  const card3dRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLDivElement>(null);
  const flippedRef = useRef(false);
  const [, force] = useState(0);

  // Scale the fixed 408x632 card down to the container width.
  useEffect(() => {
    const host = scaleHostRef.current;
    const wrap = wrapRef.current;
    if (!host || !wrap) return;
    const apply = () => {
      const w = host.clientWidth;
      const scale = Math.min(1, w / 408);
      wrap.style.transform = `scale(${scale})`;
      host.style.height = `${632 * scale}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // Tilt + foil + sheen (desktop pointer). Mirrors the design's _apply().
  useEffect(() => {
    if (!interactive) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    let raf = 0;
    const applyTilt = (tiltX: number, tiltY: number, px: number, py: number) => {
      const el = card3dRef.current;
      if (el) {
        const ry = (flippedRef.current ? 180 : 0) + tiltY;
        el.style.transform = `rotateX(${tiltX}deg) rotateY(${ry}deg)`;
      }
      const sh = sheenRef.current;
      if (sh) {
        const x = (px + 0.5) * 100;
        const y = (py + 0.5) * 100;
        sh.style.background = `radial-gradient(120% 120% at ${x}% ${y}%, rgba(255,255,255,0.20), rgba(255,255,255,0.05) 28%, transparent 58%)`;
        sh.style.opacity = Math.abs(px) + Math.abs(py) > 0.02 ? "1" : "0.45";
      }
      const fo = foilRef.current;
      if (fo) {
        fo.style.transform = `rotate(${px * 50}deg)`;
        fo.style.filter = `hue-rotate(${px * 140}deg) saturate(1.4)`;
      }
    };
    const onMove = (e: MouseEvent) => {
      const r = wrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyTilt(-py * 9, px * 13, px, py));
    };
    const onLeave = () => applyTilt(0, 0, 0, 0);
    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    applyTilt(0, 0, 0, 0);
    return () => {
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [interactive]);

  const flip = () => {
    if (!interactive) return;
    flippedRef.current = !flippedRef.current;
    const el = card3dRef.current;
    if (el) el.style.transform = `rotateX(0deg) rotateY(${flippedRef.current ? 180 : 0}deg)`;
    force((n) => n + 1);
  };

  return (
    <div ref={scaleHostRef} style={{ width: "100%" }}>
      <div
        ref={wrapRef}
        onClick={flip}
        style={{
          perspective: "1700px",
          width: 408,
          height: 632,
          cursor: interactive ? "pointer" : "default",
          transformOrigin: "top left",
        }}
      >
        <div
          ref={card3dRef}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transition: "transform 170ms cubic-bezier(0.2,0.7,0.2,1)",
            filter: m.heroFilter,
          }}
        >
          {/* ---------- FRONT ---------- */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              borderRadius: 22,
              overflow: "hidden",
              background:
                "linear-gradient(152deg,#222831 0%,#191d23 52%,#14171c 100%)",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.07) inset,0 -1px 0 rgba(0,0,0,0.5) inset,0 30px 60px -20px rgba(0,0,0,0.75),0 0 0 1px rgba(255,255,255,0.07)",
            }}
          >
            {/* guilloché */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                opacity: 0.55,
                backgroundImage:
                  "repeating-radial-gradient(circle at 26% 20%, transparent 0 7px, rgba(255,255,255,0.05) 7px 8px),repeating-radial-gradient(circle at 80% 86%, transparent 0 9px, rgba(255,255,255,0.04) 9px 10px),repeating-radial-gradient(circle at 52% 54%, transparent 0 5px, rgba(255,255,255,0.035) 5px 6px),conic-gradient(from 20deg at 50% 48%, rgba(255,255,255,0.05), transparent 22%, rgba(255,255,255,0.04) 50%, transparent 72%, rgba(255,255,255,0.05))",
              }}
            />
            {/* orange safety spine */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 5,
                background: brand,
                boxShadow: `0 0 14px -2px ${brand}`,
              }}
            />

            <div
              style={{
                position: "relative",
                height: "100%",
                padding: "26px 26px 22px 30px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* issuer lockup */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                    <circle cx="17" cy="17" r="16" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                    <circle cx="17" cy="17" r="11.5" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
                    <circle cx="17" cy="17" r="3.4" fill="#9aa3ab" />
                    <g stroke="rgba(255,255,255,0.4)" strokeWidth="1">
                      <line x1="17" y1="1.5" x2="17" y2="5" />
                      <line x1="17" y1="29" x2="17" y2="32.5" />
                      <line x1="1.5" y1="17" x2="5" y2="17" />
                      <line x1="29" y1="17" x2="32.5" y2="17" />
                    </g>
                  </svg>
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "#c4ccd2" }}>
                      {data.issuerLine1}
                    </div>
                    {data.issuerLine2 && (
                      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "#c4ccd2" }}>
                        {data.issuerLine2}
                      </div>
                    )}
                    <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.14em", color: "#5d666f", marginTop: 3 }}>
                      {data.issuerSub}
                    </div>
                  </div>
                </div>
                {/* holo foil chip */}
                <div style={{ width: 52, height: 34, borderRadius: 5, overflow: "hidden", position: "relative", boxShadow: "0 0 0 1px rgba(255,255,255,0.18) inset" }}>
                  <div
                    ref={foilRef}
                    style={{
                      position: "absolute",
                      inset: "-40%",
                      background:
                        "conic-gradient(from 0deg, #ff8a3c, #ffd27a, #8affd1, #6ec8ff, #c79bff, #ff8a3c)",
                      opacity: 0.85,
                      mixBlendMode: "screen",
                    }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(115deg, rgba(13,15,18,0.0) 0 3px, rgba(13,15,18,0.35) 3px 4px)" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 8, letterSpacing: "0.12em", color: "rgba(13,15,18,0.75)", fontWeight: 700 }}>
                    RW✦
                  </div>
                </div>
              </div>

              {/* category + name */}
              <div style={{ marginTop: 26 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.2em", color: brand }}>
                  {data.category}
                </div>
                <div style={{ fontSize: 54, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 0.92, marginTop: 9, color: "#f4f6f7" }}>
                  {data.title}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: "#9aa3ab", marginTop: 7, letterSpacing: "0.01em" }}>
                  {data.subtitle}
                </div>
              </div>

              {/* holder block */}
              <div style={{ display: "flex", gap: 16, marginTop: 26, alignItems: "flex-start" }}>
                <div style={{ width: 92, height: 112, flex: "none", borderRadius: 4, position: "relative", overflow: "hidden", background: data.photoUrl ? "#1b2027" : "repeating-linear-gradient(135deg,#232932 0 7px,#1b2027 7px 14px)", boxShadow: "0 0 0 1px rgba(255,255,255,0.12) inset" }}>
                  {data.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 18, background: "rgba(13,15,18,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 8, letterSpacing: "0.18em", color: "#7a838b" }}>
                      PHOTO
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", paddingTop: 2, minWidth: 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.16em", color: "#5d666f" }}>HOLDER</div>
                  <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", marginTop: 4, color: "#eef1f3" }}>{data.holderName}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.04em", color: "#9aa3ab", marginTop: 5 }}>{data.holderRole}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.16em", color: "#5d666f", marginTop: 14 }}>CERTIFICATE NO.</div>
                  <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, letterSpacing: "0.02em", color: "#d6dce0", marginTop: 3 }}>{data.certNo}</div>
                </div>
              </div>

              {/* dates */}
              <div style={{ display: "flex", marginTop: 22, borderTop: "1px solid rgba(255,255,255,0.09)", borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
                <div style={{ flex: 1, padding: "12px 0" }}>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.16em", color: "#5d666f" }}>ISSUED</div>
                  <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "0.03em", color: "#d6dce0", marginTop: 4 }}>{data.issued}</div>
                </div>
                <div style={{ width: 1, background: "rgba(255,255,255,0.09)" }} />
                <div style={{ flex: 1, padding: "12px 0 12px 18px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.16em", color: "#5d666f" }}>EXPIRES</div>
                  <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "0.03em", color: m.fg, marginTop: 4 }}>{data.expires}</div>
                </div>
              </div>

              {/* status + qr */}
              <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 5, background: m.bg, border: `1px solid ${m.bd}`, width: "max-content" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, boxShadow: `0 0 8px ${m.dot}` }} />
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", color: m.fg }}>{m.label}</span>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.1em", color: "#6b747c" }}>{m.sub}</div>
                </div>
                <div style={{ width: 78, height: 78, borderRadius: 5, background: "#efe9dc", padding: 7, boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" }}>
                  <div style={{ width: "100%", height: "100%", backgroundImage: qrFront, backgroundSize: "100% 100%", imageRendering: "pixelated" }} />
                </div>
              </div>

              {/* embossed serial */}
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.22em", color: "rgba(255,255,255,0.22)", marginTop: 14, textShadow: "0 1px 0 rgba(0,0,0,0.5)" }}>
                SN&nbsp;&nbsp;{data.serial}&nbsp;&nbsp;·&nbsp;&nbsp;VOID IF ALTERED
              </div>
            </div>

            {/* expired overprint */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", opacity: m.overprint }}>
              <div style={{ transform: "rotate(-15deg)", border: "3px solid #ef4135", borderRadius: 8, padding: "8px 22px", color: "#ef4135", fontWeight: 900, fontSize: 40, letterSpacing: "0.06em", background: "rgba(239,65,53,0.06)", boxShadow: "0 0 30px rgba(239,65,53,0.2)" }}>
                EXPIRED
              </div>
            </div>

            {/* tilt sheen */}
            <div ref={sheenRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", borderRadius: 22, opacity: 0.5, transition: "opacity 200ms ease" }} />
          </div>

          {/* ---------- BACK ---------- */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              borderRadius: 22,
              overflow: "hidden",
              background: "linear-gradient(152deg,#1d2229 0%,#171b20 55%,#121519 100%)",
              boxShadow: "0 1px 0 rgba(255,255,255,0.07) inset,0 30px 60px -20px rgba(0,0,0,0.75),0 0 0 1px rgba(255,255,255,0.07)",
            }}
          >
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 5, background: brand }} />
            <div style={{ position: "relative", height: "100%", padding: "26px 28px 22px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em", color: "#9aa3ab", fontWeight: 600 }}>VERIFICATION</div>
                <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "-0.01em", color: "#eef1f3" }}>
                  RIG<span style={{ color: "#8b949c", fontWeight: 600 }}>WISE</span>
                </div>
              </div>

              <div style={{ marginTop: 14, height: 11, overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 5.5, letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>
                  RIGWISE·VERIFIED·{data.issuerLine1} {data.issuerLine2 ?? ""}·RIGWISE·VERIFIED·{data.issuerLine1} {data.issuerLine2 ?? ""}·RIGWISE·VERIFIED·
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
                <div style={{ position: "relative", width: 172, height: 172, borderRadius: 8, background: "#efe9dc", padding: 14, boxShadow: "0 0 0 1px rgba(255,255,255,0.1),0 12px 30px -12px rgba(0,0,0,0.6)" }}>
                  <div style={{ width: "100%", height: "100%", backgroundImage: qrBack, backgroundSize: "100% 100%", imageRendering: "pixelated" }} />
                </div>
              </div>
              <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 11, letterSpacing: "0.08em", color: "#c4ccd2", marginTop: 14 }}>
                {data.verifyUrl ?? "rigwise.ca/v/" + data.certNo}
              </div>

              {data.scope && (
                <div style={{ marginTop: 22 }}>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.16em", color: "#5d666f" }}>SCOPE OF TRAINING</div>
                  <div style={{ fontSize: 11, lineHeight: 1.5, color: "#9aa3ab", marginTop: 7 }}>{data.scope}</div>
                </div>
              )}

              <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Caveat', cursive", fontSize: 30, lineHeight: 0.8, color: "#d6dce0", transform: "rotate(-2deg)" }}>{data.holderName}</div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", marginTop: 5, paddingTop: 5, fontFamily: MONO, fontSize: 8, letterSpacing: "0.16em", color: "#5d666f" }}>HOLDER SIGNATURE</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ width: 118, height: 30, backgroundImage: barcode, backgroundSize: "100% 100%", backgroundColor: "#efe9dc", borderRadius: 2, padding: 2 }} />
                  <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.14em", color: "#6b747c", marginTop: 5 }}>SN {data.serial}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
