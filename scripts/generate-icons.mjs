#!/usr/bin/env node
/**
 * Generates Qadam's PNG icons without any image dependency.
 *
 * A minimal RGBA raster + PNG encoder (using Node's built-in zlib) draws the
 * brand mark — a rising staircase, because "qadam" (قدم) means step.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public');

const BG = [59, 130, 246, 255]; // #3B82F6
const BG_DEEP = [37, 99, 235, 255]; // #2563EB
const STEP = [255, 255, 255, 255];

/* ---------------------------------------------------------------- *
 * PNG encoding
 * ---------------------------------------------------------------- */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- *
 * Drawing
 * ---------------------------------------------------------------- */
function insideRoundRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const max = w - 1 - r;
  const may = h - 1 - r;
  if (x < r && y < r) return (x - r) ** 2 + (y - r) ** 2 <= r * r;
  if (x > max && y < r) return (x - max) ** 2 + (y - r) ** 2 <= r * r;
  if (x < r && y > may) return (x - r) ** 2 + (y - may) ** 2 <= r * r;
  if (x > max && y > may) return (x - max) ** 2 + (y - may) ** 2 <= r * r;
  return true;
}

function paintRect(rgba, w, h, x0, y0, rw, rh, color) {
  const xs = Math.max(0, Math.round(x0));
  const ys = Math.max(0, Math.round(y0));
  const xe = Math.min(w, Math.round(x0 + rw));
  const ye = Math.min(h, Math.round(y0 + rh));
  for (let y = ys; y < ye; y++) {
    for (let x = xs; x < xe; x++) {
      const i = (y * w + x) * 4;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = color[3];
    }
  }
}

/**
 * @param size     pixel size (square)
 * @param rounded  corner radius in px, or 0 for full-bleed (maskable)
 */
function renderIcon(size, rounded) {
  const rgba = new Uint8Array(size * size * 4);

  // Background (opaque gradient-ish: two-tone vertical blend keeps it lively).
  for (let y = 0; y < size; y++) {
    const t = y / Math.max(1, size - 1);
    const col = [
      Math.round(BG[0] + (BG_DEEP[0] - BG[0]) * t),
      Math.round(BG[1] + (BG_DEEP[1] - BG[1]) * t),
      Math.round(BG[2] + (BG_DEEP[2] - BG[2]) * t),
      255,
    ];
    for (let x = 0; x < size; x++) {
      const inside = rounded > 0 ? insideRoundRect(x, y, size, size, rounded) : true;
      const i = (y * size + x) * 4;
      if (inside) {
        rgba[i] = col[0];
        rgba[i + 1] = col[1];
        rgba[i + 2] = col[2];
        rgba[i + 3] = 255;
      } else {
        rgba[i + 3] = 0;
      }
    }
  }

  // Rising staircase — content kept in the central 50% for maskable safety.
  const left = size * 0.25;
  const right = size * 0.75;
  const baseline = size * 0.75;
  const top = size * 0.25;
  const colW = (right - left) / 3;
  const stepH = (baseline - top) / 3;

  for (let i = 0; i < 3; i++) {
    const h = stepH * (i + 1);
    const r = Math.max(2, size * 0.028);
    paintRect(rgba, size, size, left + i * colW, baseline - h, colW, h, STEP);
    // Soft rounded top corners on each tread.
    paintRect(rgba, size, size, left + i * colW, baseline - h, colW, r, STEP);
  }

  return encodePNG(size, size, rgba);
}

/* ---------------------------------------------------------------- *
 * Emit
 * ---------------------------------------------------------------- */
mkdirSync(join(OUT, 'icons'), { recursive: true });

const files = [
  ['icons/icon-192.png', renderIcon(192, Math.round(192 * 0.22))],
  ['icons/icon-512.png', renderIcon(512, Math.round(512 * 0.22))],
  ['icons/maskable-512.png', renderIcon(512, 0)],
  ['apple-touch-icon.png', renderIcon(180, 0)],
];

for (const [name, buf] of files) {
  writeFileSync(join(OUT, name), buf);
  console.log(`✓ ${name} (${buf.length} bytes)`);
}
