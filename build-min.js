// Genera "Minigames Hub.min.html" dal sorgente "Minigames Hub.html".
// - Minifica solo il JS inline (terser, mangle disattivato: i nomi servono agli onclick inline)
// - Comprime gli spazi dell'HTML statico e del CSS personalizzato (mai dentro stringhe JS)
// Uso: node build-min.js
const fs = require('fs');
const path = require('path');
const { minify } = require(path.join(process.env.TEMP || '/tmp', 'mgast', 'node_modules', 'terser'));

const ROOT = __dirname;
const SRC = path.join(ROOT, 'Minigames Hub.html');
const OUT = path.join(ROOT, 'Minigames Hub.min.html');
const MARK = '@@MGH_SCRIPT@@';

(async () => {
  let html = fs.readFileSync(SRC, 'utf8');

  // 1) Un solo <script> inline: lo estraggo e minifico a parte.
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (scripts.length !== 1) throw new Error('Attesi 1 script inline, trovati ' + scripts.length);
  const js = scripts[0][1];
  const res = await minify(js, {
    compress: { passes: 2, drop_debugger: true },
    // mangle: false -> i nomi di funzione restano, indispensabili per gli onclick="..."
    mangle: false,
    format: { comments: false, ascii_only: false }
  });
  if (!res.code) throw new Error('terser non ha prodotto codice');
  html = html.replace(scripts[0][0], MARK);

  // 2) CSS personalizzato (ultimo blocco <style>): via commenti e spazi superflui.
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
  const custom = styles[styles.length - 1];
  const css = custom[1]
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*\n\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  html = html.replace(custom[0], '<style>' + css + '</style>');

  // 3) HTML statico (senza il JS, che resta intatto): spazi tra tag e rientri.
  html = html
    .replace(/>[ \t]*\r?\n[ \t]*</g, '><')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  // 4) Rimetto il JS minificato.
  html = html.replace(MARK, '<script>' + res.code + '</script>');

  fs.writeFileSync(OUT, html, 'utf8');
  // index.html è quello che GitHub Pages pubblica sulla home del sito.
  fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
  const a = fs.statSync(SRC).size,
    b = fs.statSync(OUT).size;
  console.log('sorgente  :', a, 'byte');
  console.log('minificato:', b, 'byte', '(' + Math.round((1 - b / a) * 100) + '% in meno)');
  console.log('scritto   :', OUT);
  console.log('scritto   :', path.join(ROOT, 'index.html'));
})().catch((e) => {
  console.error('ERRORE:', e.message);
  process.exit(1);
});
