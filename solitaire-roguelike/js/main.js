/* ============================================================
   PILE-DRIVER  ::  main.js   boot + input wiring
   ============================================================ */
(function () {
  const G = Game.G;
  const $ = UI.$;

  function boot() {
    const t = Overlays.title();
    t.onNew(() => {
      Sfx.click();
      Game.clearSave();
      Game.startRun();
      Overlays.close();
      UI.resetDisplayScore();
      UI.render();
      UI.toast('Ante 1 · Round 1 — hit ' + UI.fmt(Engine.quotaFor(G.run)) + ' across 3 rounds. Chips <b>X</b> Mult = points.', 4200);
      setTimeout(() => { if (G.phase === 'play') UI.toast('Build long face-up runs, then cash them home — the <b>RUN</b> badge shows the bonus.', 4200); }, 4600);
    });
    if (Game.load()) {
      t.showContinue(() => {
        Sfx.click();
        Overlays.close();
        UI.resetDisplayScore();
        UI.render();
        if (G.phase === 'shop') Overlays.shop();
        else if (G.phase === 'roundEnd') Overlays.roundEnd();
        else if (G.phase === 'gameOver') Overlays.gameOver();
        else if (G.phase === 'victory') Overlays.victory();
      });
    }
    t.onHelp(() => { Sfx.click(); Overlays.help(); });
    wire();
  }

  function cashOut() {
    if (G.phase !== 'play') return;
    UI.rushFx();
    Sfx.click();
    Game.endRound(false);
    Overlays.roundEnd();
  }

  function draw() {
    if (G.phase !== 'play') return;
    UI.rushFx();
    if (Game.drawStock()) { Sfx.deal(); UI.clearSelection(); UI.render(); UI.drainFx(); UI.checkStuck(); }
    else { Sfx.error(); UI.shake($('#stock')); }
  }

  function hint() {
    if (G.phase !== 'play') return;
    UI.rushFx();
    const h = Game.hint();
    if (!h) {
      Sfx.error();
      UI.toast('Nothing left to do — cash out.');
      return;
    }
    Sfx.click();
    UI.clearHints();

    /* the source: look the card up by id, which survives any re-render */
    let srcNode = null;
    if (h.cardId) srcNode = document.querySelector('[data-id="' + h.cardId + '"]');
    else if (h.src.zone === 'stock') srcNode = $('#stock');
    else if (h.src.zone === 'reshuffle') srcNode = $('#reshuffle-bar');

    /* the destination */
    let dstNode = null;
    if (h.dst) {
      if (h.dst.zone === 'foundation') {
        const card = cardOf(h);
        const suit = h.dst.suit ||
          (card && (Engine.foundationTargetFor(G.board, card) || Engine.twinTargetFor(G.board, card)));
        if (suit) dstNode = $('#f-' + suit);
      } else if (h.dst.zone === 'tableau') {
        dstNode = UI.$$('#tableau .tab-pile')[h.dst.col];
      } else if (h.dst.zone === 'well') {
        dstNode = $('#well');
      }
    }

    UI.showHint(srcNode, dstNode, h.label);
  }

  /* the actual card a hint refers to */
  function cardOf(h) {
    if (h.cardId) {
      const b = G.board;
      for (const c of b.waste) if (c.id === h.cardId) return c;
      for (const pile of b.tableau) for (const c of pile) if (c.id === h.cardId) return c;
    }
    return null;
  }

  function auto() {
    if (G.phase !== 'play') return;
    UI.rushFx();
    const n = Game.autoCollect();
    if (n) { UI.render(); UI.drainFx(); }
    else { Sfx.error(); UI.toast('Nothing can go home right now.'); }
  }

  function undo() {
    if (G.phase !== 'play') return;
    UI.rushFx();
    if (Game.undo()) { Sfx.flip(); UI.clearSelection(); UI.resetDisplayScore(); UI.render(); }
    else { Sfx.error(); UI.toast('No undos left.'); }
  }

  function wire() {
    const stockEl = $('#stock');
    stockEl.addEventListener('pointerdown', () => stockEl.classList.add('pressed'));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
      stockEl.addEventListener(ev, () => stockEl.classList.remove('pressed')));
    stockEl.addEventListener('click', draw);
    $('#btn-cash').onclick = cashOut;
    $('#btn-hint').onclick = hint;
    $('#btn-collect').onclick = auto;
    $('#btn-undo').onclick = undo;
    $('#btn-deck').onclick = () => { if (G.run) { Sfx.click(); Overlays.deckView(); } };
    $('#btn-menu').onclick = () => { if (G.run) { Sfx.click(); Overlays.menu(); } };
    $('#btn-help').onclick = () => { Sfx.click(); Overlays.help(); };
    $('#btn-almanac').onclick = () => { Sfx.click(); Overlays.almanac(); };
    $('#btn-music').onclick = e => {
      const on = Sfx.music();
      e.currentTarget.classList.toggle('off', !on);
      UI.toast(on ? 'Music on' : 'Music off');
    };
    $('#btn-sound').onclick = e => {
      const on = Sfx.toggle();
      e.currentTarget.textContent = on ? '\u{1F50A}' : '\u{1F507}';
      e.currentTarget.classList.toggle('off', !on);
    };
    UI.bindPileTargets();
    UI.installDragHandlers();

    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'escape') { if (Overlays.isOpen() && G.phase === 'play') Overlays.close(); else if (G.phase === 'play') Overlays.menu(); return; }
      if (Overlays.isOpen()) return;
      if (k === ' ') { e.preventDefault(); draw(); }
      else if (k === 'a') auto();
      else if (k === 'u') undo();
      else if (k === 'h') hint();
      else if (k === 'd') { if (G.run) Overlays.deckView(); }
      else if (k === 'k') Overlays.almanac();
      else if (k === 'c') cashOut();
      else if (k === 'r') {
        const res = Game.reshuffle(Game.reshuffleCost().free > 0 ? 'free' : 'cash');
        if (res.ok) { Sfx.deal(); UI.render(); UI.drainFx(); }
        else { Sfx.error(); UI.toast(res.reason); }
      }
    });

    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (G.run && G.board) UI.renderBoard(); }, 120);
    });

    document.addEventListener('pointerdown', () => {
      Sfx.toggle(Sfx.isOn());
      if (!Sfx.musicOn()) { Sfx.music(true); $('#btn-music').classList.remove('off'); }
    }, { once: true });

    /* a tooltip must never outlive whatever it was describing */
    document.addEventListener('pointerdown', e => {
      if (!e.target.closest || !e.target.closest('[data-idx],.run-badge,.card,.badge')) UI.hideTip();
    }, true);
    window.addEventListener('blur', () => UI.hideTip());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
