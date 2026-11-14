// Harness condiviso: esegue il JavaScript inline del gioco in un contesto vm
// con DOM/localStorage/location finti. Nessuna rete o browser reale.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function sourceFile() {
  return process.env.MG_FILE || path.join(__dirname, '..', '..', 'Minigames Hub.html');
}

function makeElement(id) {
  return {
    id,
    value: '',
    innerHTML: '',
    textContent: '',
    className: '',
    style: {},
    attrs: {},
    disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    getAttribute(k) {
      return this.attrs[k];
    },
    focus() {},
    select() {},
    remove() {},
    click() {},
    appendChild() {},
    closest: () => null
  };
}

function boot(opts = {}) {
  const html = fs.readFileSync(opts.file || sourceFile(), 'utf8');
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
  const els = {};
  const store = {};
  const alerts = [];
  let timers = 0;

  const document = {
    getElementById: (id) => els[id] || (els[id] = makeElement(id)),
    createElement: (tag) => makeElement(tag),
    querySelectorAll: () => [],
    addEventListener() {},
    documentElement: { lang: 'it' },
    head: { appendChild() {} },
    body: { appendChild() {} }
  };

  const ctx = {
    console: { log() {}, error: (...a) => console.error('[page]', ...a) },
    document,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => (store[k] = String(v)),
      removeItem: (k) => delete store[k]
    },
    navigator: { vibrate() {}, clipboard: null },
    alert: (m) => alerts.push(String(m)),
    confirm: () => true,
    crypto: require('crypto').webcrypto,
    location: {
      origin: 'https://example.test',
      pathname: '/minigames/',
      hash: opts.hash || '',
      href: 'https://example.test/minigames/' + (opts.hash || ''),
      ...(opts.location || {})
    },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    Blob: function Blob() {},
    FileReader: function FileReader() {},
    setTimeout: (fn) => {
      timers++;
      if (opts.realTimers) return setTimeout(fn, 0);
      return timers;
    },
    clearTimeout() {},
    setInterval: () => {
      timers++;
      return timers;
    },
    clearInterval() {},
    Date,
    Math,
    JSON
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.Peer = opts.Peer || undefined;
  ctx.AudioContext = null;

  vm.createContext(ctx);
  vm.runInContext(js, ctx, { filename: 'minigames-hub.js' });

  const run = (code) => vm.runInContext(code, ctx);
  return {
    ctx,
    els,
    alerts,
    run,
    get: (name) => run(name),
    call: (expr, ...args) => run(expr)(...args),
    S: run('S'),
    NET: run('NET')
  };
}

// Piccolo report condiviso: stampa PASS/FAIL e imposta l'exit code.
function reporter() {
  const rows = [];
  const check = (ok, label, extra) => {
    rows.push({ ok: !!ok, label, extra: extra === undefined ? '' : String(extra) });
    console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (extra === undefined ? '' : '  [' + extra + ']'));
  };
  const done = () => {
    const failed = rows.filter((r) => !r.ok);
    console.log('\n' + (rows.length - failed.length) + '/' + rows.length + ' test superati');
    process.exit(failed.length ? 1 : 0);
  };
  return { check, done };
}

module.exports = { boot, reporter, sourceFile };
