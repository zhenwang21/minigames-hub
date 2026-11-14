// Esegue tutte le suite in tests/ e riporta l'esito complessivo.
// Uso:
//   node tests/run-all.js                  -> test sul sorgente
//   node tests/run-all.js --min            -> test sulla build minificata
//   MG_FILE=... node tests/run-all.js      -> file alternativo
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const useMin = process.argv.includes('--min');
const target = process.env.MG_FILE || path.join(ROOT, useMin ? 'Minigames Hub.min.html' : 'Minigames Hub.html');

if (!fs.existsSync(target)) {
  console.error('File non trovato: ' + target);
  process.exit(1);
}

const files = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith('.test.js'))
  .sort();

const env = { ...process.env, MG_FILE: target };
if (useMin) env.MG_SKIP_UI = '1';

console.log('Suite: ' + files.length + '  File: ' + target + '\n');
let failed = 0;
for (const f of files) {
  console.log('\n=== ' + f + ' ===');
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], {
    stdio: 'inherit',
    env,
    cwd: ROOT
  });
  if (r.status !== 0) failed++;
}

console.log('\n' + (files.length - failed) + '/' + files.length + ' suite superate');
process.exit(failed ? 1 : 0);
