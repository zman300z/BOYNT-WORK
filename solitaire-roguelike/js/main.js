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
      UI.toast('Ante 1 · Round 1 — hit ' + UI.fmt(Engine.quotaFor(G.run)) + ' in 3 rounds', 3000);
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
    if (G.phase !== 'play' || UI.busy) return;
    Sfx.click();
    Game.endRound(false);
    Overlays.roundEnd();
  }

  function draw() {
    if (G.phase !== 'play' || UI.busy) return;
    if (Game.drawStock()) { Sfx.deal(); UI.clearSelection(); UI.render(); UI.drainFx(); UI.checkStuck(); }
    else { Sfx.error(); UI.shake($('#stock')); }
  }

  function hint() {
    if (G.phase !== 'play') return;
    const h = Game.hint();
    if (!h) { Sfx.error(); UI.toast('Nothing left. Cash out.'); return; }
    Sfx.click();
    if (h.src.zone === 'stock') { flashNode($('#stock')); return; }
    const srcNode = h.src.zone === 'waste'
      ? document.querySelector('#waste .card:last-of-type')
      : (h.src.zone === 'tableau'
        ? UI.$$('#tableau .tab-pile')[h.src.col].querySelector('[data-index="' + h.src.index + '"]')
        : null);
    flashNode(srcNode);
    if (h.dst) {
      const dstNode = h.dst.zone === 'foundation'
        ? $('#f-' + (h.dst.suit || Engine.foundationTargetFor(G.board, cardOf(h.src))))
        : UI.$$('#tableau .tab-pile')[h.dst.col];
      flashNode(dstNode);
    }
  }

  function cardOf(src) {
    if (src.zone === 'waste') return G.board.waste[G.board.waste.length - 1];
    if (src.zone === 'tableau') return G.board.tableau[src.col][src.index];
    return null;
  }

  function flashNode(n) {
    if (!n) return;
    n.classList.add('hinted');
    setTimeout(() => n.classList.remove('hinted'), 1400);
  }

  function auto() {
    if (G.phase !== 'play' || UI.busy) return;
    const n = Game.autoCollect();
    if (n) { UI.render(); UI.drainFx(); }
    else { Sfx.error(); UI.toast('Nothing can go home right now.'); }
  }

  function undo() {
    if (G.phase !== 'play' || UI.busy) return;
    if (Game.undo()) { Sfx.flip(); UI.clearSelection(); UI.resetDisplayScore(); UI.render(); }
    else { Sfx.error(); UI.toast('No undos left.'); }
  }

  function wire() {
    $('#stock').addEventListener('click', draw);
    $('#btn-cash').onclick = cashOut;
    $('#btn-hint').onclick = hint;
    $('#btn-collect').onclick = auto;
    $('#btn-undo').onclick = undo;
    $('#btn-deck').onclick = () => { if (G.run) { Sfx.click(); Overlays.deckView(); } };
    $('#btn-menu').onclick = () => { if (G.run) { Sfx.click(); Overlays.menu(); } };
    $('#btn-help').onclick = () => { Sfx.click(); Overlays.help(); };
    $('#btn-sound').onclick = e => {
      const on = Sfx.toggle();
      e.currentTarget.textContent = on ? '\u{1F50A}' : '\u{1F507}';
      e.currentTarget.classList.toggle('off', !on);
    };
    UI.bindPileTargets();

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
      else if (k === 'c') cashOut();
    });

    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (G.run && G.board) UI.renderBoard(); }, 120);
    });

    document.addEventListener('pointerdown', () => { Sfx.toggle(Sfx.isOn()); }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
