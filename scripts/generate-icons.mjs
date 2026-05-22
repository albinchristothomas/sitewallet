// One-shot icon generator. Reads public/icons/icon.svg and emits PNGs.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const svgPath = resolve(root, "public/icons/icon.svg");
const svg = await readFile(svgPath);

const targets = [
  { out: "public/icons/icon-192.png", size: 192 },
  { out: "public/icons/icon-512.png", size: 512 },
  { out: "public/icons/icon-maskable-512.png", size: 512 },
  { out: "public/icons/apple-touch-icon.png", size: 180 },
  { out: "public/favicon.png", size: 64 },
];

for (const { out, size } of targets) {
  const outPath = resolve(root, out);
  await mkdir(dirname(outPath), { recursive: true });
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  await writeFile(outPath, png);
  console.log(`wrote ${out}`);
}

console.log("done");
