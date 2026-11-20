// Genera le icone PWA (PNG) con un encoder PNG minimale, senza dipendenze.
// Uso: node tools/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'icons');
const SS = 3; // supersampling per bordi morbidi

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function roundRect(x, y, cx, cy, w, h, r) {
  const dx = Math.abs(x - cx) - (w / 2 - r);
  const dy = Math.abs(y - cy) - (h / 2 - r);
  const ax = Math.max(dx, 0),
    ay = Math.max(dy, 0);
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(dx, dy), 0) - r;
}
function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx,
    dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}
// sfondo: gradiente viola -> notte, con alone viola in alto a sinistra
function bg(x, y) {
  const g = clamp01((x * 0.55 + y * 0.75) / 1.3);
  let c = mix([88, 28, 135], [11, 15, 25], g);
  const d = Math.hypot(x - 0.26, y - 0.2);
  const glow = clamp01(1 - d * 2.1);
  c = mix(c, [124, 58, 237], glow * 0.55);
  return c;
}
// Ruota un punto attorno a un centro: serve al dado inclinato.
function rot(x, y, cx, cy, deg) {
  const a = (deg * Math.PI) / 180,
    cs = Math.cos(a),
    sn = Math.sin(a),
    dx = x - cx,
    dy = y - cy;
  return [cx + dx * cs - dy * sn, cy + dx * sn + dy * cs];
}
// Il dado è disegnato in coordinate locali, poi inclinato di -12°.
const DIE = { cx: 0.5, cy: 0.49, half: 0.218, r: 0.072, tilt: -12 };
function dieLocal(x, y) {
  return rot(x, y, DIE.cx, DIE.cy, -DIE.tilt);
}
function inDie(x, y, grow) {
  const p = dieLocal(x, y),
    s = DIE.half + (grow || 0);
  return roundRect(p[0], p[1], DIE.cx, DIE.cy, s * 2, s * 2, DIE.r) <= 0;
}
// Stella a quattro punte per l'accento in alto a destra.
function inStar(x, y, cx, cy, r) {
  const dx = Math.abs((x - cx) / r),
    dy = Math.abs((y - cy) / r);
  return Math.pow(dx, 0.55) + Math.pow(dy, 0.55) <= 1;
}
function colorAt(x, y) {
  let c = bg(x, y);
  // ombra morbida del dado, in coordinate schermo
  if (!inDie(x, y, 0) && inDie(x - 0.014, y - 0.02, 0))
    c = mix(c, [5, 6, 14], 0.32);
  // dado bianco inclinato
  const p = dieLocal(x, y);
  if (roundRect(p[0], p[1], DIE.cx, DIE.cy, DIE.half * 2, DIE.half * 2, DIE.r) <= 0) {
    const shade = clamp01((p[1] - 0.29) / 0.42);
    c = mix([255, 255, 255], [224, 228, 244], shade);
    // tre punti in diagonale, scavati nel dado
    const off = DIE.half * 0.49;
    if (
      inEllipse(p[0], p[1], DIE.cx - off, DIE.cy - off, 0.042, 0.042) ||
      inEllipse(p[0], p[1], DIE.cx, DIE.cy, 0.042, 0.042) ||
      inEllipse(p[0], p[1], DIE.cx + off, DIE.cy + off, 0.042, 0.042)
    )
      c = mix([76, 29, 149], [124, 58, 237], clamp01((p[1] - 0.3) / 0.42));
  }
  // scintilla
  if (inStar(x, y, 0.765, 0.235, 0.062)) c = mix(c, [240, 171, 252], 0.92);
  return c;
}

function render(n) {
  const w = n * SS,
    h = n * SS;
  const rgba = Buffer.alloc(w * h * 4);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = (px + 0.5) / w,
        y = (py + 0.5) / h;
      const c = colorAt(x, y);
      const i = (py * w + px) * 4;
      rgba[i] = Math.round(c[0]);
      rgba[i + 1] = Math.round(c[1]);
      rgba[i + 2] = Math.round(c[2]);
      rgba[i + 3] = 255;
    }
  }
  // downsample box filter
  const out = Buffer.alloc(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
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
        o = (y * n + x) * 4;
      out[o] = r / k;
      out[o + 1] = g / k;
      out[o + 2] = b / k;
      out[o + 3] = 255;
    }
  }
  return out;
}

// --- encoder PNG ---
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
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function png(n, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0);
  ihdr.writeUInt32BE(n, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((n * 4 + 1) * n);
  for (let y = 0; y < n; y++) {
    raw[y * (n * 4 + 1)] = 0; // filtro none
    rgba.copy(raw, y * (n * 4 + 1) + 1, y * n * 4, (y + 1) * n * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

fs.mkdirSync(OUT, { recursive: true });
[512, 192, 180].forEach((n) => {
  const file = path.join(OUT, 'icon-' + n + '.png');
  fs.writeFileSync(file, png(n, render(n)));
  console.log('scritto', file);
});
