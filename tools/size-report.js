// Report leggero delle dimensioni: file, gzip e parti della build minificata.
// Uso: node tools/size-report.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'Minigames Hub.html',
  'Minigames Hub.min.html',
  'index.html',
  'sw.js',
  'manifest.webmanifest',
  'README.md',
  'MINIGAMES_HUB_HANDOFF.md'
];

function kb(n) {
  return (n / 1024).toFixed(1).padStart(8) + ' KB';
}

console.log('file'.padEnd(30) + 'raw'.padStart(11) + 'gzip'.padStart(11));
for (const f of FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const b = fs.readFileSync(p);
  console.log(f.padEnd(30) + kb(b.length) + kb(zlib.gzipSync(b, { level: 9 }).length));
}

const minPath = path.join(ROOT, 'Minigames Hub.min.html');
if (fs.existsSync(minPath)) {
  const min = fs.readFileSync(minPath, 'utf8');
  const js = [...min.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop();
  const css = [...min.matchAll(/<style>([\s\S]*?)<\/style>/g)].pop();
  const jsLen = js ? Buffer.byteLength(js[1]) : 0;
  const cssLen = css ? Buffer.byteLength(css[1]) : 0;
  console.log('\nbuild minificata');
  console.log('  JS inline : ' + kb(jsLen));
  console.log('  CSS inline: ' + kb(cssLen));
  console.log('  HTML+altro: ' + kb(min.length - jsLen - cssLen));
}
