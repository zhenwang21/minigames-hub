// Porta la versione dell'app in un colpo solo.
// Uso:
//   node tools/bump-version.js 1.12.0            -> aggiorna, ricostruisce, avvisa cosa manca
//   node tools/bump-version.js 1.12.0 --no-build -> solo i file, senza build
// Aggiorna APP_VERSION, il titolo "Novità" IT/EN, VERSION in sw.js e le
// asserzioni di versione in tests/features.test.js. Non tocca CHANGELOG né handoff:
// quei testi vanno scritti a mano perché raccontano cosa è cambiato.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'Minigames Hub.html');
const SW = path.join(ROOT, 'sw.js');
const TEST = path.join(ROOT, 'tests', 'features.test.js');

const next = String(process.argv[2] || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(next)) {
  console.error('Uso: node tools/bump-version.js 1.12.0 [--no-build]');
  process.exit(1);
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}
function write(p, s) {
  fs.writeFileSync(p, s, 'utf8');
}
function replaceOnce(text, re, to, label) {
  if (!re.test(text)) throw new Error('non trovato: ' + label);
  return text.replace(re, to);
}

try {
  const html0 = read(SRC);
  const old = (/const APP_VERSION\s*=\s*'([^']+)'/.exec(html0) || [])[1];
  if (!old) throw new Error('APP_VERSION non trovato nel sorgente');

  let html = html0;
  html = replaceOnce(
    html,
    /const APP_VERSION\s*=\s*'[^']+'/,
    "const APP_VERSION = '" + next + "'",
    'APP_VERSION'
  );
  html = replaceOnce(
    html,
    /newsTitle: 'Novità \d+\.\d+\.\d+'/,
    "newsTitle: 'Novità " + next + "'",
    'newsTitle IT'
  );
  html = replaceOnce(
    html,
    /newsTitle: 'What’s new in \d+\.\d+\.\d+'/,
    "newsTitle: 'What’s new in " + next + "'",
    'newsTitle EN'
  );
  write(SRC, html);

  let sw = read(SW);
  sw = replaceOnce(sw, /const VERSION\s*=\s*'[^']+'/, "const VERSION = '" + next + "'", 'VERSION sw.js');
  write(SW, sw);

  let test = read(TEST);
  test = test.split("lobby.includes('" + old + "')").join("lobby.includes('" + next + "')");
  test = test
    .split("includes('Novità " + old + "')")
    .join("includes('Novità " + next + "')");
  test = test.replace(/alla versione \d+\.\d+\.\d+/, 'alla versione ' + next);
  write(TEST, test);

  console.log('Versione: ' + old + ' -> ' + next);
  console.log('  aggiornati: ' + path.relative(ROOT, SRC) + ', sw.js, tests/features.test.js');

  const noBuild = process.argv.includes('--no-build');
  if (!noBuild) {
    console.log('\nRicostruzione build...');
    const r = spawnSync(process.execPath, [path.join(ROOT, 'build-min.js')], {
      stdio: 'inherit',
      cwd: ROOT
    });
    if (r.status !== 0) throw new Error('build-min.js è fallito');
  }

  console.log('\nOra a mano:');
  console.log('  1. aggiorna CHANGELOG.md e la sezione 1.x di MINIGAMES_HUB_HANDOFF.md');
  console.log('  2. lancia node tests/run-all.js e node tests/run-all.js --min');
  console.log('  3. commit e push');
} catch (e) {
  console.error('ERRORE: ' + e.message);
  process.exit(1);
}
