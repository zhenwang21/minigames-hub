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
      `;return { S, NET, netHost, netJoin, netAct, netReset, netElect, netPromote, iNew, wStart, mwNew, lupNew, render, showHelp, viewOnline, viewNetGame, netSend, hostApply, netSnap, netClose, setLang, tmStart, tmStop, TMR, APP_VERSION, toLobby, startLupus };`
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
  // 1. Host crea la stanza
  const A = makePage('Anna');
  A.el('on-name').value = 'Anna';
  A.api.netHost();
  const hostOk = await until(() => A.api.NET.host && A.api.NET.code);
  check(hostOk, 'host crea la stanza', A.api.NET.code);
  const code = A.api.NET.code;

  // 2. Tre client entrano
  const clients = [];
  for (const nm of ['Bruno', 'Carla', 'Dario']) {
    const p = makePage(nm);
    p.el('on-name').value = nm;
    p.el('on-code').value = code;
    p.api.netJoin();
    clients.push(p);
  }
  const all4 = await until(() => A.api.NET.players.length === 4, 12000);
  check(all4, 'quattro giocatori in lobby', A.api.NET.players.join(','));

  const joined = await until(() => clients.every((c) => c.api.NET.st === 'lobby'), 12000);
  check(joined, 'i client ricevono la lobby');
  check(
    clients.every((c) => JSON.stringify(c.api.NET.players) === JSON.stringify(A.api.NET.players)),
    'lista giocatori sincronizzata'
  );
  check(
    clients.every((c) => c.api.NET.peers.Anna === 'mgh-' + code),
    'i client conoscono il peer id dell host'
  );

  // 3. Parte una partita (Chi l'ha detto?)
  A.api.wStart();
  const inGame = await until(() => clients.every((c) => c.api.NET.view), 6000);
  check(inGame, 'partita avviata e viste inviate ai client');

  const vice = A.api.NET.order[1];
  const vicePage = clients.find((c) => c.api.NET.name === vice);
  const gotStandby = await until(() => vicePage.api.NET.mirror && vicePage.api.NET.mirror.game, 6000);
  check(gotStandby, 'il vice riceve la copia dello stato (standby)');

  // 4. L'host sparisce (crash, nessun messaggio di chiusura)
  A.api.NET.peer.destroy();
  const elected = await until(
    () => clients.filter((c) => c.api.NET.host).length === 1,
    12000
  );
  const newHost = clients.find((c) => c.api.NET.host);
  check(elected, 'eletto un solo nuovo host', newHost && newHost.name);
  check(!!newHost && newHost.name === vice, 'viene eletto il primo giocatore in ordine di ingresso', vice);

  const others = clients.filter((c) => c !== newHost);
  const backIn = await until(
    () => others.every((c) => c.api.NET.st === 'lobby' && c.api.NET.conn),
    12000
  );
  check(backIn, 'gli altri rientrano nella stanza del nuovo host');
  check(
    others.every((c) => c.api.NET.hostName === newHost.name),
    'tutti riconoscono il nuovo host'
  );
  check(
    !!newHost.api.NET.game && newHost.api.NET.game.g === 'who',
    'il nuovo host ha recuperato lo stato della partita',
    newHost.api.NET.game && newHost.api.NET.game.g
  );

  // 5. Il nuovo host può mandare un messaggio ai client
  newHost.api.netSend({ t: 'wq', q: 'Prova', done: [], n: 2 });
  const gotTest = await until(
    () => others.every((c) => c.api.NET.view && c.api.NET.view.q === 'Prova'),
    4000
  );
  check(gotTest, 'il nuovo host comunica con i client');

  // 6. L'host originale rientra con lo stesso nome
  const A2 = makePage('Anna');
  A2.el('on-name').value = 'Anna';
  A2.el('on-code').value = code;
  A2.api.netJoin();
  const handback = await until(() => A2.api.NET.host, 10000);
  check(handback, 'l host originale rientra e riprende il comando');
  const follow = await until(
    () => others.every((c) => c.api.NET.hostName === 'Anna' && c.api.NET.conn),
    10000
  );
  check(follow, 'gli altri passano al vecchio host');
  check(
    !!A2.api.NET.game && A2.api.NET.game.g === 'who',
    'lo stato della partita torna all host originale'
  );

  // 7. Il codice stanza resta valido per nuovi ingressi
  const roomOk = await until(
    () => A2.api.NET.roomPeer && A2.api.NET.roomPeer.id === 'mgh-' + code,
    6000
  );
  check(roomOk, 'il codice stanza resta attivo dopo il cambio host');
  A2.api.toLobby();
  await wait(300);
  const wasPlaying = !!A2.api.NET.game;
  check(!wasPlaying, 'tornati in lobby per il test');
  const E = makePage('Elena');
  E.el('on-name').value = 'Elena';
  E.el('on-code').value = code;
  E.api.netJoin();
  const joinedLate = await until(() => E.api.NET.st === 'lobby', 9000);
  check(joinedLate, 'un nuovo giocatore entra dal codice dopo il cambio host');
  const inList = await until(() => A2.api.NET.players.includes('Elena'), 4000);
  check(inList, 'il nuovo giocatore appare nella lista');

  // 8. Timer
  A2.api.tmStart(2);
  check(A2.api.TMR.iv != null, 'timer avviato');
  await wait(1200);
  check(A2.api.TMR.left === 1, 'il timer scende', String(A2.api.TMR.left));
  A2.api.tmStop();
  check(A2.api.TMR.iv === null, 'timer fermato');

  // 9. Lupus: la migrazione conserva la partita in corso
  A2.api.S.players = A2.api.NET.players.slice();
  A2.api.S.game = 'lupus';
  A2.api.S.mode = 'auto';
  A2.api.S.quick = false;
  A2.api.NET.lsetup = true;
  A2.api.NET.game = { g: 'setup' };
  A2.api.startLupus(true);
  const lupOk = await until(
    () => A2.api.NET.game && A2.api.NET.game.g === 'lupus' && !!A2.api.S.G,
    5000
  );
  check(lupOk, 'partita Lupus avviata');

  const playersAll = [...clients, E];
  const vice2 = A2.api.NET.order.find((p) => p !== 'Anna' && playersAll.some((c) => c.api.NET.name === p));
  const viceP = playersAll.find((c) => c.api.NET.name === vice2);
  const standby2 = await until(() => viceP.api.NET.mirror && !!viceP.api.NET.mirror.sg, 12000);
  check(standby2, 'il vice riceve lo stato del Lupus', vice2);
  check(
    !!(
      viceP.api.NET.mirror &&
      viceP.api.NET.mirror.sg &&
      Object.keys(viceP.api.NET.mirror.sg.roles || {}).length === A2.api.S.players.length
    ),
    'lo stato del Lupus contiene i ruoli'
  );

  // l'host originale sparisce di nuovo
  A2.api.NET.peer.destroy();
  try {
    A2.api.NET.roomPeer && A2.api.NET.roomPeer.destroy();
  } catch (e) {}
  const elected2 = await until(() => playersAll.filter((c) => c.api.NET.host).length === 1, 30000);
  const newHost2 = playersAll.find((c) => c.api.NET.host);
  check(elected2, 'nuovo host eletto anche a partita in corso', newHost2 && newHost2.name);
  check(
    !!newHost2 &&
      newHost2.api.NET.game &&
      newHost2.api.NET.game.g === 'lupus' &&
      !!newHost2.api.S.G &&
      newHost2.api.S.G.phase === 'lreveal',
    'il nuovo host continua la partita dal punto giusto',
    newHost2 && newHost2.api.S.G && newHost2.api.S.G.phase
  );
  check(
    !!newHost2 && Object.keys(newHost2.api.S.G.roles || {}).length === A2.api.S.players.length,
    'i ruoli sono sopravvissuti al cambio host'
  );
  const others2 = playersAll.filter((c) => c !== newHost2);
  const seeRoles = await until(
    () => others2.every((c) => c.api.NET.view && c.api.NET.view.t === 'lh'),
    8000
  );
  check(seeRoles, 'il nuovo host rimanda le schermate ai giocatori');

  const fails = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - fails.length) + '/' + results.length + ' test passati');
  process.exit(fails.length ? 1 : 0);
})();
