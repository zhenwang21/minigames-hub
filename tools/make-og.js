// Genera l'immagine Open Graph 1200x630 (PNG) senza dipendenze.
// Uso: node tools/make-og.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 1200,
  H = 630,
  SS = 2; // supersampling

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function roundRect(x, y, cx, cy, w, h, r) {
  const dx = Math.abs(x - cx) - (w / 2 - r),
    dy = Math.abs(y - cy) - (h / 2 - r),
    ax = Math.max(dx, 0),
    ay = Math.max(dy, 0);
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(dx, dy), 0) - r;
}
function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx,
    dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

// --- font 5x7 per titolo e sottotitolo ---
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
};

function textWidth(text, scale) {
  return text.length * 6 * scale - scale;
}

function drawText(rgba, text, x0, y0, scale, color) {
  let x = x0;
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch] || FONT[' '];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++) {
        if (g[row][col] !== '1') continue;
        for (let sy = 0; sy < scale; sy++)
          for (let sx = 0; sx < scale; sx++) {
            const px = x + col * scale + sx,
              py = y0 + row * scale + sy;
            if (px < 0 || py < 0 || px >= W || py >= H) continue;
            const i = (py * W + px) * 4;
            rgba[i] = color[0];
            rgba[i + 1] = color[1];
            rgba[i + 2] = color[2];
            rgba[i + 3] = 255;
          }
      }
    x += 6 * scale;
  }
}

function bgAt(x, y) {
  const t = clamp01((x * 0.45 + y * 0.85) / 1.3);
  let c = mix([76, 29, 149], [11, 15, 25], t);
  const d = Math.hypot((x - 0.18) / 0.75, (y - 0.12) / 0.75),
    glow = clamp01(1 - d * 1.7);
  c = mix(c, [124, 58, 237], glow * 0.5);
  // vignetta morbida sui bordi
  const vig = clamp01(Math.hypot(x - 0.5, y - 0.5) * 1.25);
  return mix(c, [5, 7, 12], vig * 0.45);
}

function maskAt(x, y) {
  const cx = 205,
    cy = 320,
    w = 210,
    h = 240;
  const body = roundRect(x, y, cx, cy, w, h, 46);
  if (body > 0) return null; // buco: si vede lo sfondo
  let c = mix([255, 255, 255], [214, 224, 240], clamp01((y - (cy - h / 2)) / h));
  if (inEllipse(x, y, cx - 45, cy - 20, 21, 16) || inEllipse(x, y, cx + 45, cy - 20, 21, 16))
    return null;
  const dx = x - cx,
    dy = y - (cy - 8),
    rr = Math.hypot(dx, dy);
  if (dy > 22 && rr > 62 && rr < 90) return null;
  return c;
}

function render() {
  const w = W * SS,
    h = H * SS,
    rgba = Buffer.alloc(w * h * 4);
  for (let py = 0; py < h; py++)
    for (let px = 0; px < w; px++) {
      const x = (px + 0.5) / w,
        y = (py + 0.5) / h;
      const c = maskAt(x * W, y * H) || bgAt(x, y);
      const i = (py * w + px) * 4;
      rgba[i] = Math.round(c[0]);
      rgba[i + 1] = Math.round(c[1]);
      rgba[i + 2] = Math.round(c[2]);
      rgba[i + 3] = 255;
    }
  // downsample a 1200x630
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * w + (x * SS + sx)) * 4;
          r += rgba[i];
          g += rgba[i + 1];
          b += rgba[i + 2];
        }
      const k = SS * SS,
        o = (y * W + x) * 4;
      out[o] = r / k;
      out[o + 1] = g / k;
      out[o + 2] = b / k;
      out[o + 3] = 255;
    }
  return out;
}

// --- encoder PNG (RGB senza canale alpha per un file piu' leggero) ---
function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]),
    crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function png(rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = y * (W * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4,
        o = row + 1 + x * 3;
      raw[o] = rgba[i];
      raw[o + 1] = rgba[i + 1];
      raw[o + 2] = rgba[i + 2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const rgba = render();
// testi sopra lo sfondo (dopo il downsample, cosi' restano nitidi)
drawText(rgba, 'MINIGAMES HUB', 350, 214, 9, [245, 243, 255]);
drawText(rgba, '8 PARTY GAMES', 352, 334, 6, [196, 181, 253]);
drawText(rgba, 'ONE PHONE OR MANY', 352, 404, 4, [148, 163, 184]);

const file = path.join(__dirname, '..', 'icons', 'og.png');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, png(rgba));
console.log('scritto', file, fs.statSync(file).size, 'byte');
