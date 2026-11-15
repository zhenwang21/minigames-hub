// PWA: manifest, service worker e icone devono restare allineati alla versione app.
const fs = require('fs');
const path = require('path');
const { reporter, sourceFile } = require('./lib/harness');
const { check, done } = reporter();

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(sourceFile(), 'utf8');
const ver = /APP_VERSION\s*=\s*['"]([^'"]+)/.exec(html);
check(!!ver, 'APP_VERSION presente nel file in prova', ver && ver[1]);

check(
  /<link rel="manifest" href="manifest\.webmanifest">/.test(html),
  'il documento collega il manifest'
);
check(/<link rel="apple-touch-icon" href="icons\/icon-180\.png">/.test(html), 'apple-touch-icon presente');
check(/name="theme-color" content="#0b0f19"/.test(html), 'theme-color presente');
check(/apple-mobile-web-app-capable" content="yes"/.test(html), 'meta iOS standalone presente');
check(/serviceWorker\s*\.register\(\s*["']sw\.js["']\s*\)/.test(html), 'registrazione del service worker');
check(
  html.includes('/^https?:$/.test(String(location.protocol'),
  'registrazione solo su http(s)'
);

const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
check(man.name === 'Minigames Hub' && man.short_name, 'manifest con nome e short name');
check(man.display === 'standalone' && man.start_url && man.scope === './', 'manifest standalone con start_url e scope');
check(man.background_color === '#0b0f19' && man.theme_color === '#0b0f19', 'colori del manifest coerenti');
check(
  man.icons.some((i) => i.sizes === '512x512' && i.type === 'image/png' && i.purpose === 'maskable'),
  'icona 512 maskable nel manifest'
);

['icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'].forEach((f) => {
  check(fs.existsSync(path.join(ROOT, 'icons', f)), 'icona presente: ' + f);
});
const png = fs.readFileSync(path.join(ROOT, 'icons', 'icon-512.png'));
check(
  png.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'icon-512.png è un PNG valido'
);
check((png.readUInt32BE(16) || 0) === 512, 'icon-512.png è 512x512', png.readUInt32BE(16));
const svg = fs.readFileSync(path.join(ROOT, 'icons', 'icon.svg'), 'utf8');
check(/^<svg[\s>]/.test(svg.trim()) && svg.includes('</svg>'), 'icon.svg è un SVG');

const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
check(
  ver && sw.includes("const VERSION = '" + ver[1] + "'"),
  'versione cache del service worker allineata ad APP_VERSION'
);
check(sw.includes('./index.html') && sw.includes('manifest.webmanifest'), 'il service worker precarica la shell');
check(/req\.mode === 'navigate'/.test(sw) && /caches\.match/.test(sw), 'navigazione con fallback offline');
check(/if \(r && r\.ok\)/.test(sw), 'una risposta 5xx non sostituisce la shell in cache');
check(/caches\s*\.keys\(\)/.test(sw) && /caches\s*\.delete/.test(sw), 'pulizia delle cache vecchie');

check(/id="upd"/.test(html) && /controllerchange/.test(html), 'banner per la nuova versione');
check(/updateReady/.test(html) && /updateBtn/.test(html), 'testi del banner di aggiornamento');
check(/data-theme/.test(html) && /--acc1:/.test(html), 'variabili CSS dei temi');

// --- 1.9.0: installazione, offline e accessibilità ---
check(/id="off"/.test(html) && /updateOffline\(\)/.test(html), 'badge offline presente e aggiornato');
check(/beforeinstallprompt/.test(html) && /installApp\(\)/.test(html), 'installazione gestita con beforeinstallprompt');
check(/display-mode: standalone/.test(html), 'rileva se l’app è già installata');
check(/html\[data-text="l"\]/.test(html) && /html\[data-text="s"\]/.test(html), 'CSS per testo piccolo/grande');
check(/html\[data-contrast="high"\]/.test(html) && /html\[data-motion="off"\]/.test(html), 'CSS per contrasto e animazioni');
check(/function applyA11y/.test(html) && /applyA11y\(\)/.test(html), 'le preferenze di accessibilità sono applicate all’avvio');
check(/prefers-reduced-motion/.test(html), 'rispetta la preferenza di sistema per le animazioni');
check(/function storageBytes/.test(html) && /localStorage\.length/.test(html), 'calcolo dello spazio locale usato');
check(/function showDbTip/.test(html) && /dbAck/.test(html), 'avviso sulle domande automatiche con memoria');
check(/function startDemo/.test(html) && /S\.demo/.test(html), 'modalità demo non salvata');

done();
