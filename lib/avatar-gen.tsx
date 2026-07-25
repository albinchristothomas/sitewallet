// Deterministic generated avatar: angular steel/orange facets seeded from the
// user's id, with their initials on top. Professional, on-design-system — used
// wherever no profile photo exists. Pure SVG, no emoji, no external assets.

function hashSeed(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h || 1;
}

export function GeneratedAvatar({
  seed,
  initials,
  size = 32,
}: {
  seed: string;
  initials: string;
  size?: number;
}) {
  const h = hashSeed(seed);
  // Three angular facets, positions/rotations from the hash.
  const r1 = (h % 360) - 180;
  const r2 = ((h >> 5) % 360) - 180;
  const x1 = (h % 14) - 7;
  const y1 = ((h >> 3) % 14) - 7;
  const x2 = ((h >> 7) % 16) - 8;
  const y2 = ((h >> 9) % 16) - 8;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={initials}
      style={{ display: "block", borderRadius: 8 }}
    >
      <rect width="40" height="40" rx="8" fill="#1b2027" />
      <g opacity="0.85">
        <polygon
          points="0,40 22,8 44,40"
          fill="#f2581c"
          opacity="0.28"
          transform={`rotate(${r1} 20 20) translate(${x1} ${y1})`}
        />
        <polygon
          points="-6,34 18,2 36,30"
          fill="#2a313a"
          transform={`rotate(${r2} 20 20) translate(${x2} ${y2})`}
        />
        <rect
          x="4"
          y="26"
          width="32"
          height="2.5"
          fill="#f2581c"
          opacity="0.55"
          transform={`rotate(${r1 / 3} 20 20)`}
        />
      </g>
      <text
        x="20"
        y="25.5"
        textAnchor="middle"
        fontFamily="var(--font-archivo), sans-serif"
        fontSize="15"
        fontWeight="800"
        fill="#f4f6f7"
        letterSpacing="0.02em"
      >
        {initials}
      </text>
    </svg>
  );
}
