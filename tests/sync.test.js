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
      `;return { S, NET, netHost, netJoin, netAct, netReset, netElect, netPromote, iNew, wStart, mwNew, lupNew, render, showHelp, viewOnline, viewNetGame, netSend, hostApply, netSnap, netClose, setLang, tmStart, tmStop, TMR, APP_VERSION, toLobby, startLupus, ncHostOpen, ncToggle, ncAddCustom, ncDel, ncStart, ncAgain, ncBack, netAgain, ncApply, ncCalc, ncFinish, ncToggleAt, ncScore, ncStartTimer, ncStopTimer, ncSend, ncDone, ncLetter, NC_CATS, NC_TIME, viewNcSetup, viewNetGame, pvOnlineStart, pvBc, pvChk, hostAbort, netSync, netRecover, ncLeft, tmTick, tmLeft, cleanName, cleanText };`
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
  const B = clients[0], C = clients[1];
  check(await until(() => A.api.NET.players.length === 3, 8000), 'tre giocatori in lobby');
  check(await until(() => clients.every((c) => c.api.NET.st === 'lobby'), 8000), 'client in lobby');

  // --- 1. nome sporco: caratteri di controllo, spazi doppi, lunghezza ---
  const D = makePage('Dario');
  D.el('on-name').value = '  Da\u0000rio \u001b  il   Lungo\nNome  ';
  D.el('on-code').value = code;
  D.api.netJoin();
  check(
    await until(() => A.api.NET.players.includes('Dario il LungoNo'), 6000),
    'nome ripulito e troncato a 16 caratteri',
    A.api.NET.players.join(',')
  );
  check(!A.api.NET.players.some((p) => /[\u0000-\u001f]/.test(p)), 'nessun carattere di controllo nei nomi');
  D.api.netClose();
  check(
    await until(() => A.api.NET.players.length === 3, 6000),
    'il giocatore con nome sporco esce dalla lobby',
    A.api.NET.players.join(',')
  );

  // --- 2. timer a scadenza: TMR usa una deadline, non i tick ---
  A.api.S.screen = 'home';
  A.api.S.game = null;
  A.api.S.G = null;
  A.api.tmStart(60);
  const endBefore = A.api.TMR.end;
  check(endBefore > Date.now() + 58000, 'tmStart salva la scadenza assoluta');
  A.api.TMR.end = Date.now() + 1500;
  A.api.TMR.left = 2;
  const realNow = Date.now;
  Date.now = () => realNow() + 2000;
  A.api.tmTick();
  Date.now = realNow;
  check(A.api.TMR.done && !A.api.TMR.iv, 'il timer locale scade sulla deadline');
  check(A.api.TMR.left === 0, 'timer locale a zero');
  A.api.tmStop();

  // --- 3. pv: sincronizzazione completa a un client che rientra ---
  A.api.S.screen = 'online';
  A.api.S.G = null;
  A.api.NET.pvA = 'Mare';
  A.api.NET.pvB = 'Montagna';
  A.api.pvOnlineStart();
  await until(() => B.api.NET.view && B.api.NET.view.t === 'pvvote', 4000);
  check(!!(B.api.NET.view && B.api.NET.view.t === 'pvvote'), 'pv avviato sui client');
  B.api.netAct({ t: 'pv', v: 'a' });
  C.api.netAct({ t: 'pv', v: 'b' });
  A.api.netAct({ t: 'pv', v: 'a' });
  check(await until(() => A.api.NET.game.ph === 'res', 4000), 'pv arriva ai risultati');
  // il client perde la vista (come dopo un rientro/refresh)
  B.api.NET.view = null;
  B.api.NET.conn.send({ t: 'sync' });
  check(
    await until(() => B.api.NET.view && B.api.NET.view.t === 'pvres', 4000),
    'un {t:sync} rimanda lo stato pv completo'
  );
  check(
    B.api.NET.view && B.api.NET.view.a === 'Mare' && B.api.NET.view.b === 'Montagna',
    'le opzioni pv sopravvivono al resync'
  );

  // --- 4. la connessione cade ma l'host e' vivo: rientro rapido, niente elezione ---
  const oldConn = B.api.NET.conn;
  B.api.NET.conn.close();
  check(
    await until(() => B.api.NET.st === 'recover', 3000),
    'il client passa in recupero senza eleggere subito'
  );
  check(
    await until(() => B.api.NET.st === 'lobby' && !!B.api.NET.conn && B.api.NET.conn !== oldConn, 10000),
    'il client si ricollega da solo alla stanza'
  );
  check(A.api.NET.host === true, "l'host resta l'host originale");
  check(
    await until(() => A.api.NET.players.includes('Bruno') && !A.api.NET.offline['Bruno'], 4000),
    'il posto di Bruno torna online senza aspettare 60 secondi'
  );
  check(
    B.api.NET.view && B.api.NET.view.t === 'pvres',
    'dopo il rientro il client riceve lo stato corrente',
    B.api.NET.view && B.api.NET.view.t
  );

  // --- 5. sanitizzazione delle risposte NC ---
  A.api.ncHostOpen();
  A.api.ncStart();
  await until(() => A.api.NET.game && A.api.NET.game.g === 'nc', 3000);
  B.api.NET.conn.send({ t: 'nc', i: 0, v: '  Pin\u0000o   rosso  ' });
  check(
    await until(() => !!A.api.NET.game.a['Bruno'], 3000),
    'risposta NC registrata'
  );
  const saved = Object.values(A.api.NET.game.a['Bruno'] || {})[0];
  check(saved === 'Pino rosso', 'risposta NC ripulita da controllo e spazi doppi', JSON.stringify(saved));
  B.api.NET.conn.send({ t: 'nc', i: 0, v: 'x'.repeat(80) });
  check(
    await until(() => (Object.values(A.api.NET.game.a['Bruno'] || {})[0] || '').length <= 40, 3000),
    'risposta NC troncata a 40 caratteri'
  );

  // --- 6. l'host chiude il round quando vuole ---
  A.api.ncFinish();
  check(
    await until(() => A.api.NET.game.ph === 'review' || A.api.NET.game.ph === 'end', 3000),
    'chiudi il round ora porta alla revisione o ai risultati',
    A.api.NET.game.ph
  );
  if (A.api.NET.game.ph === 'review') A.api.ncScore();
  check(await until(() => A.api.NET.game.ph === 'end', 3000), 'chiudi il round ora porta ai risultati');
  check(await until(() => B.api.NET.view && B.api.NET.view.t === 'ncres', 4000), 'i client vedono la chiusura forzata');

  // --- 7. termina partita: tutti in lobby, punti conservati ---
  const ptsBefore = A.api.NET.scores['Bruno'] || 0;
  A.api.hostAbort();
  check(await until(() => !A.api.NET.game, 3000), "l'host termina la partita");
  check(await until(() => B.api.NET.st === 'lobby' && !B.api.NET.view, 4000), 'i client tornano in lobby');
  check((A.api.NET.scores['Bruno'] || 0) === ptsBefore, 'i punti restano dopo il termine partita');
  check(A.api.S.screen === 'online', "l'host resta nella schermata online");

  // --- 8. uscita volontaria mentre sta recuperando: nessun rejoin fantasma ---
  B.api.NET.conn.close();
  B.api.netClose();
  await new Promise((r) => setTimeout(r, 1600));
  check(
    B.api.NET.st === 'idle' && !B.api.NET.conn,
    'uscita volontaria durante il recupero: nessun rejoin fantasma',
    B.api.NET.st
  );

  const fails = results.filter((x) => !x.ok);
  console.log('\n' + (results.length - fails.length) + '/' + results.length + ' test superati');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error('ERRORE', e);
  process.exit(1);
});
