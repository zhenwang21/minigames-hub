// Test del layer online con un PeerJS finto in memoria (nessuna rete reale).
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(process.env.MG_FILE || require('path').join(__dirname, '..', 'Minigames Hub.html'), 'utf8');
const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
let src = matches[matches.length - 1][1];
// Timeout di elezione ridotto per il test (in produzione è 3500).
src = src.replace('const NET_DIAL_MS = 3500;', 'const NET_DIAL_MS = 250;');

// ---------------- bus finto ----------------
const bus = { peers: new Map(), seq: 0 };
const q = (fn) => setTimeout(fn, 0);
const clone = (d) => JSON.parse(JSON.stringify(d));

class MockConn {
  constructor(peerId, remoteId) {
    this.peer = remoteId;
    this.peerId = peerId;
    this.h = {};
    this.open = true;
    this._other = null;
  }
  on(ev, fn) {
    (this.h[ev] = this.h[ev] || []).push(fn);
    return this;
  }
  emit(ev, ...a) {
    (this.h[ev] || []).slice().forEach((fn) => {
      try {
        fn(...a);
      } catch (e) {
        console.error('conn handler error:', e);
      }
    });
  }
  send(d) {
    if (!this.open) return;
    const o = this._other,
      data = clone(d);
    q(() => o && o.open && o.emit('data', data));
  }
  close() {
    if (!this.open) return;
    this.open = false;
    const o = this._other;
    q(() => {
      this.emit('close');
      if (o && o.open) {
        o.open = false;
        o.emit('close');
      }
    });
  }
}

function makePeerClass() {
  return class Peer {
    constructor(id) {
      this.id = id || 'peer-' + ++bus.seq;
      this.h = {};
      this.destroyed = false;
      this.conns = [];
      q(() => {
        if (bus.peers.has(this.id)) return this.emit('error', { type: 'unavailable-id' });
        bus.peers.set(this.id, this);
        this.emit('open', this.id);
      });
    }
    on(ev, fn) {
      (this.h[ev] = this.h[ev] || []).push(fn);
      return this;
    }
    emit(ev, ...a) {
      (this.h[ev] || []).slice().forEach((fn) => {
        try {
          fn(...a);
        } catch (e) {
          console.error('peer handler error:', e);
        }
      });
    }
    connect(id) {
      const c = new MockConn(this.id, id);
      this.conns.push(c);
      q(() => {
        const target = bus.peers.get(id);
        if (!target || target.destroyed) {
          c.open = false;
          return c.emit('error', { type: 'peer-unavailable' });
        }
        const back = new MockConn(id, this.id);
        target.conns.push(back);
        c._other = back;
        back._other = c;
        c.emit('open');
        back.emit('open');
        target.emit('connection', back);
      });
      return c;
    }
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      if (bus.peers.get(this.id) === this) bus.peers.delete(this.id);
      this.conns.forEach((c) => c.close());
    }
  };
}

// ---------------- pagina simulata ----------------
function makePage(name) {
  const els = {};
  const el = (id) => {
    if (!els[id])
      els[id] = {
        value: '',
        innerHTML: '',
        textContent: '',
        className: '',
        style: {},
        attrs: {},
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        setAttribute(k, v) {
          this.attrs[k] = v;
        },
        getAttribute(k) {
          return this.attrs[k];
        },
        focus() {},
        closest: () => null,
        disabled: false
      };
    return els[id];
  };
  const store = {};
  const page = {
    els,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => (store[k] = String(v)),
      removeItem: (k) => delete store[k]
    },
    document: {
      getElementById: el,
      createElement: () => ({ style: {}, setAttribute() {} }),
      head: { appendChild() {} },
      documentElement: { lang: 'it' },
      addEventListener() {},
      querySelectorAll: () => [],
      body: { appendChild() {} }
    },
    alerts: []
  };
  page.window = { Peer: makePeerClass(), AudioContext: null, addEventListener() {} };
  page.confirm = () => true;
  page.alert = (m) => page.alerts.push(String(m));

  const fn = new Function(
    'window',
    'document',
    'Peer',
    'localStorage',
    'navigator',
    'alert',
    'confirm',
    'crypto',
    'console',
    src +
      `;return { S, NET, netHost, netJoin, netAct, netReset, netElect, netPromote, iNew, wStart, mwNew, lupNew, render, showHelp, viewOnline, viewNetGame, netSend, hostApply, netSnap, netClose, setLang, tmStart, tmStop, TMR, APP_VERSION, toLobby, startLupus, ncHostOpen, ncToggle, ncAddCustom, ncDel, ncStart, ncAgain, ncBack, netAgain, ncApply, ncCalc, ncFinish, ncToggleAt, ncScore, ncUnique, ncCounts, ncStartTimer, ncStopTimer, ncSend, ncDone, ncLetter, NC_CATS, NC_TIME, viewNcSetup, viewNetGame };`
  );
  const api = fn(
    page.window,
    page.document,
    page.window.Peer,
    page.localStorage,
    { vibrate: () => {} },
    page.alert,
    page.confirm,
    require('crypto').webcrypto,
    { log() {}, error: (...a) => console.error('[page]', ...a) }
  );
  page.api = api;
  page.name = name;
  page.el = el;
  return page;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 6000, step = 25) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      if (fn()) return true;
    } catch (e) {}
    await wait(step);
  }
  return false;
};


const results = [];
const check = (ok, label, extra = '') => {
  results.push({ ok, label, extra });
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (extra ? '  [' + extra + ']' : ''));
};
(async () => {
  const A = makePage('Anna');
  A.el('on-name').value = 'Anna';
  A.api.netHost();
  await until(() => A.api.NET.host && A.api.NET.code);
  const code = A.api.NET.code;
  const clients = [];
  for (const nm of ['Bruno', 'Carla']) {
    const p = makePage(nm);
    p.el('on-name').value = nm;
    p.el('on-code').value = code;
    p.api.netJoin();
    clients.push(p);
  }
  check(await until(() => A.api.NET.players.length === 3, 8000), 'tre giocatori in lobby');
  check(
    await until(() => clients.every((c) => c.api.NET.st === 'lobby'), 8000),
    'client in lobby'
  );
  const B = clients[0],
    C = clients[1];

  // --- setup ---
  A.api.ncHostOpen();
  check(A.api.S.screen === 'ncsetup', 'host apre il setup di NC');
  check(A.api.S.hint === '', 'hint online azzerato');
  check(A.api.viewNcSetup().indexOf('5 minuti') > 0, 'setup mostra la nota sul timer');
  check(A.api.NET.ncDraft.length === 3, 'default 3 categorie', String(A.api.NET.ncDraft.length));
  A.api.ncToggle('nome');
  check(A.api.NET.ncDraft.length === 2, 'toggle rimuove una categoria');
  A.api.ncToggle('nome');
  A.api.ncToggle('citta');
  check(A.api.NET.ncDraft.length === 2, 'non si scende sotto 1 categoria');
  A.el('nc-new').value = 'Cantante lirico';
  A.api.ncAddCustom();
  check(
    A.api.NET.ncDraft.some((c) => c.it === 'Cantante lirico'),
    'categoria personalizzata aggiunta'
  );

  // --- start ---
  A.api.ncStart();
  check(
    await until(() => clients.every((c) => c.api.NET.view && c.api.NET.view.t === 'nc'), 5000),
    'vista nc inviata ai client'
  );
  check(A.api.NET.view.t === 'nc', 'host vede la vista nc');
  check(A.api.NET.view.left === 300, 'timer parte da 5 minuti', String(A.api.NET.view.left));
  check(
    A.el('tmr').innerHTML.indexOf('tmr-box auto') > 0,
    'il widget mostra il timer automatico'
  );
  check(A.el('tmr').innerHTML.indexOf('+1') < 0, 'nessun pulsante manuale durante NC');
  check(
    await until(() => B.api.NET.view.left < 300, 4000),
    'il tick del timer arriva ai client',
    String(B.api.NET.view.left)
  );
  check(A.api.NET.view.cats.length === 3, 'categorie nel round', String(A.api.NET.view.cats.length));
  check(/^[A-Z]$/.test(A.api.NET.view.letter), 'lettera valida', A.api.NET.view.letter);
  const L = A.api.NET.view.letter.toLowerCase();
  const cats = A.api.NET.view.cats.map((c) => c.k);

  // --- risposte ---
  B.api.netAct({ t: 'nc', i: 0, v: L + 'x' });
  B.api.netAct({ t: 'nc', i: 1, v: L + 'y' });
  C.api.netAct({ t: 'nc', i: 0, v: L.toUpperCase() + 'x' });
  C.api.netAct({ t: 'nc', i: 1, v: L + 'z' });
  A.api.netAct({ t: 'nc', i: 0, v: (L === 'a' ? 'b' : 'a') + 'zz' });
  check(
    await until(() => A.api.NET.game.a.Bruno && A.api.NET.game.a.Carla && A.api.NET.game.a.Anna, 3000),
    'risposte registrate sull host'
  );
  check(A.api.NET.game.a.Bruno[cats[0]] === L + 'x', 'risposta per categoria salvata');

  // --- consegne e taglio timer ---
  const t0 = A.api.NET.game.left;
  B.api.netAct({ t: 'ncd' });
  const cutOk = await until(() => t0 - A.api.NET.game.left >= 60, 3000);
  check(
    cutOk && t0 - A.api.NET.game.left <= 61,
    'ogni consegna taglia 60 secondi',
    String(A.api.NET.game.left)
  );
  check(
    await until(() => clients.every((c) => c.api.NET.view.done.includes('Bruno')), 3000),
    'i client vedono chi ha consegnato'
  );
  check(
    await until(() => t0 - A.api.NET.view.left >= 60, 3000),
    'anche l host vede il timer tagliato',
    String(A.api.NET.view.left)
  );

  // consegna: una sola volta per round
  C.api.netAct({ t: 'ncd' });
  await wait(200);
  const leftAfter = A.api.NET.game.left;
  C.api.netAct({ t: 'ncd' });
  await wait(200);
  check(
    leftAfter - A.api.NET.game.left < 5,
    'una seconda consegna non taglia di nuovo il timer',
    String(A.api.NET.game.left)
  );
  A.api.netAct({ t: 'ncd' });
  check(await until(() => A.api.NET.view.t === 'ncres', 4000), 'round chiuso quando tutti consegnano');
  check(A.api.NET.game.ph === 'review', 'round in revisione host', A.api.NET.game.ph);
  check(
    A.api.NET.view.ph === 'review' && Array.isArray(A.api.NET.view.uniq) && A.api.NET.view.uniq.length === 2,
    'uniche da verificare inviate ai client',
    String(A.api.NET.view.uniq && A.api.NET.view.uniq.length)
  );
  const piB = A.api.NET.players.indexOf('Bruno');
  A.api.ncToggleAt(piB, 1);
  check(
    A.api.NET.view.ok.Bruno[cats[1]] === false,
    'toggle host rifiuta una risposta unica'
  );
  A.api.ncToggleAt(piB, 1);
  check(
    A.api.NET.view.ok.Bruno[cats[1]] === true,
    'toggle host riaccetta una risposta unica'
  );
  A.api.ncScore();
  check(await until(() => A.api.NET.game.ph === 'end', 3000), 'conferma punteggi chiude il round');
  const r = A.api.NET.view;
  check(r.ph === 'end', 'vista risultati in fase end', r.ph);
  check(r.pts.Bruno === 15, 'Bruno: un doppione +5 e una unica +10', String(r.pts.Bruno));
  check(r.pts.Carla === 15, 'Carla: un doppione +5 e una unica +10', String(r.pts.Carla));
  check(r.pts.Anna === 0, 'Anna: lettera sbagliata 0', String(r.pts.Anna));
  check(
    A.api.NET.scores.Bruno === 15 && A.api.NET.scores.Carla === 15,
    'punteggi cumulati aggiornati'
  );
  check(
    await until(() => clients.every((c) => c.api.NET.view.t === 'ncres'), 3000),
    'risultati inviati ai client'
  );
  check(A.api.viewNetGame().indexOf('Nuova') > 0, 'vista risultati con nuovo round');

  // --- nuovo round ---
  const oldL = A.api.NET.view.letter;
  A.api.netAgain();
  check(
    await until(() => A.api.NET.view.t === 'nc' && A.api.NET.view.round === 2, 3000),
    'secondo round avviato'
  );
  check(
    A.api.NET.view.letter !== oldL,
    'lettera diversa dal round precedente',
    A.api.NET.view.letter + ' vs ' + oldL
  );
  check(A.api.NET.view.left === 300, 'timer riparte da 5 minuti');

  // --- timeout ---
  A.api.NET.game.end = Date.now() + 2000;
  A.api.NET.game.left = 2;
  check(await until(() => A.api.NET.view.t === 'ncres', 6000), 'il timer chiude il round da solo');
  check(A.api.NET.view.timeup === true, 'flag tempo scaduto');
  check(A.api.NET.view.pts.Bruno === 0, 'chi non risponde prende 0', String(A.api.NET.view.pts.Bruno));
  check(
    A.el('tmr').innerHTML.indexOf('tmr-box') < 0,
    'timer nascosto nella schermata risultati'
  );

  // --- cambio host ---
  A.api.netAgain();
  await until(() => A.api.NET.view.t === 'nc' && A.api.NET.view.round === 3, 3000);
  const before = A.api.NET.game.left;
  A.api.NET.peer.destroy();
  const elected = await until(() => clients.filter((c) => c.api.NET.host).length === 1, 12000);
  const NH = clients.find((c) => c.api.NET.host);
  check(elected, 'nuovo host eletto durante NC', NH && NH.name);
  check(!!NH && NH.api.NET.game && NH.api.NET.game.g === 'nc', 'stato NC recuperato');
  check(
    await until(() => NH.api.NET.game.left < before, 5000),
    'il timer riparte sul nuovo host',
    String(NH.api.NET.game.left)
  );
  check(NH.api.S.screen === 'online', 'nuovo host sulla schermata online');

  const fails = results.filter((x) => !x.ok);
  console.log('\n' + (results.length - fails.length) + '/' + results.length + ' test superati');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error('ERRORE', e);
  process.exit(1);
});
