/* ============================================================
   PILE-DRIVER  ::  ui.js
   Board rendering, pointer drag & drop, and the score fireworks.
   ============================================================ */

const UI = (() => {
  const G = Game.G;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  let displayScore = 0;
  let fxBusy = false;
  let selection = null;      // {zone, col, index, suit}
  let hintCells = [];

  /* ============ CARD ELEMENT ============ */
  function cardEl(card, opts) {
    opts = opts || {};
    const suit = SUITS[card.suit];
    const xray = Engine.mods(G.run).xray;
    const marked = G.run.markedDeck;
    const n = el('div', 'card');
    n.dataset.id = card.id;
    if (!card.faceUp) {
      n.classList.add('down');
      if (xray || opts.marked || (marked && opts.topDown)) n.classList.add('peek');
      if (!(xray || opts.marked || (marked && opts.topDown))) {
        n.innerHTML = '<div class="back"><span>✦</span></div>';
        return n;
      }
    }
    n.classList.add(Engine.isRed(card) && !Engine.isBlack(card) ? 'red' : (suit.color === 'red' ? 'red' : 'black'));
    if (card.enhancement && card.enhancement !== 'none') n.classList.add(ENHANCEMENTS[card.enhancement].cls);
    if (card.finish && card.finish !== 'none') n.classList.add(FINISHES[card.finish].cls);
    if (card.seal && card.seal !== 'none') n.classList.add(SEALS[card.seal].cls);

    const r = RANK_NAMES[card.rank];
    const s = card.enhancement === 'wild' ? '✿' : suit.sym;
    n.innerHTML =
      '<div class="face">' +
        '<div class="corner tl"><span class="rk">' + r + '</span><span class="st">' + s + '</span></div>' +
        '<div class="mid">' + s + '</div>' +
        '<div class="corner br"><span class="rk">' + r + '</span><span class="st">' + s + '</span></div>' +
        (card.enhancement && card.enhancement !== 'none' && ENHANCEMENTS[card.enhancement].glyph
          ? '<div class="enh-badge">' + ENHANCEMENTS[card.enhancement].glyph + '</div>' : '') +
        (card.seal && card.seal !== 'none' ? '<div class="seal-dot"></div>' : '') +
        '<div class="shine"></div>' +
      '</div>';
    return n;
  }

  /* ============ FULL RENDER ============ */
  function render() {
    if (!G.run) return;
    renderHud();
    renderMantel();
    renderBoard();
    renderControls();
  }

  function renderHud() {
    const run = G.run;
    if (!fxBusy && G.round && Math.round(displayScore) !== G.round.score) displayScore = G.round.score;
    const q = Engine.quotaFor(run);
    const total = Game.anteTotal();
    const pct = Math.max(0, Math.min(100, total / q * 100));
    $('#ante-num').textContent = run.ante;
    $('#round-num').textContent = run.round + '/' + TUNE.roundsPerAnte;
    $('#quota-fill').style.width = pct + '%';
    $('#quota-text').textContent = fmt(total) + ' / ' + fmt(q);
    $('#quota-bar').classList.toggle('met', total >= q);
    $('#money').textContent = '$' + run.money;
    $('#round-score').textContent = fmt(Math.round(displayScore));
  }

  function renderMantel(target) {
    const m = target || $('#mantel');
    if (!m) return;
    m.innerHTML = '';
    const slots = Game.effectiveSlots();
    const shown = Math.max(slots, G.run.mantel.length);
    for (let i = 0; i < shown; i++) {
      const inst = G.run.mantel[i];
      if (!inst) {
        const empty = el('div', 'mslot curio empty', '<span class="slot-mark">◇</span>');
        empty.dataset.idx = i;
        m.appendChild(empty);
        continue;
      }
      const def = CURIO_BY_ID[inst.id];
      const c = el('div', 'mslot curio r-' + def.rarity + (inst.finish && inst.finish !== 'none' ? ' ' + FINISHES[inst.finish].cls : ''));
      c.dataset.idx = i;
      c.draggable = false;
      c.innerHTML =
        '<div class="c-art">' + def.art + '</div>' +
        '<div class="c-name">' + def.name + '</div>' +
        (inst.counter != null && def.counterLabel
          ? '<div class="c-counter">' + (def.counterLabel === 'X' ? 'X' + inst.counter : '+' + inst.counter) + '</div>' : '');
      c.addEventListener('pointerenter', e => showTip(e.currentTarget, curioTip(inst, def, i)));
      c.addEventListener('pointerleave', hideTip);
      c.addEventListener('click', () => {
        if (G.phase === 'shop') {
          const v = Game.sellCurio(i);
          if (v) { Sfx.money(); toast('Sold for $' + v); Overlays.refreshShop(); }
        }
      });
      makeCurioDraggable(c, i);
      m.appendChild(c);
    }
    const label = el('div', 'mantel-label', 'THE MANTEL <b>' + G.run.mantel.length + '/' + slots + '</b>');
    m.appendChild(label);
  }

  function curioTip(inst, def, i) {
    let s = '<div class="tip-title r-' + def.rarity + '">' + def.art + ' ' + def.name + '</div>';
    if (inst.finish && inst.finish !== 'none') s += '<div class="tip-fin">' + FINISHES[inst.finish].name + ' — ' + FINISHES[inst.finish].text + '</div>';
    s += '<div class="tip-text">' + def.text + '</div>';
    s += '<div class="tip-foot">' + def.rarity.toUpperCase() +
         (G.phase === 'shop' ? ' • click to sell for $' + (def.sellsFull ? (inst.paid || def.cost) : Math.max(1, Math.floor((inst.paid || def.cost) / 2))) : '') +
         '</div>';
    return s;
  }

  function renderControls() {
    $('#btn-undo').innerHTML = 'UNDO <b>' + (G.board ? G.board.undos : 0) + '</b>';
    $('#btn-undo').disabled = !G.board || G.board.undos <= 0 || !Game.G.undoStack.length;
    const passes = Engine.mods(G.run).infinitePasses ? '∞' : (G.board ? G.board.passesLeft : 0);
    $('#passes').innerHTML = 'PASSES <b>' + passes + '</b>';
    $('#deck-count').textContent = G.run.deck.length;
    $('#btn-cash').classList.toggle('urgent', !!(G.round && G.round.stuck));
  }

  function renderBoard() {
    const b = G.board;
    if (!b) return;

    /* stock */
    const stock = $('#stock');
    stock.innerHTML = '';
    if (b.stock.length) {
      const top = el('div', 'card down');
      top.innerHTML = '<div class="back"><span>✦</span></div>';
      stock.appendChild(top);
      stock.appendChild(el('div', 'pile-count', String(b.stock.length)));
    } else {
      stock.appendChild(el('div', 'pile-ghost', (b.passesLeft > 0 || Engine.mods(G.run).infinitePasses) ? '↻' : '∅'));
    }

    /* waste */
    const waste = $('#waste');
    waste.innerHTML = '';
    const tail = b.waste.slice(-3);
    tail.forEach((c, i) => {
      const n = cardEl(c);
      n.style.left = (i * 14) + 'px';
      n.style.zIndex = i;
      if (i === tail.length - 1) {
        n.dataset.zone = 'waste';
        attachDrag(n, { zone: 'waste' });
      } else n.classList.add('under');
      waste.appendChild(n);
    });

    /* foundations */
    SUIT_KEYS.forEach(s => {
      const f = $('#f-' + s);
      f.innerHTML = '';
      const pile = b.foundations[s];
      if (!pile.length) {
        f.appendChild(el('div', 'pile-ghost suit-' + SUITS[s].color, SUITS[s].sym));
      } else {
        const showFrom = Math.max(0, pile.length - 2);
        pile.slice(showFrom).forEach((c, i) => {
          const n = cardEl(c);
          n.style.zIndex = i;
          if (i === pile.length - showFrom - 1) attachDrag(n, { zone: 'foundation', suit: s });
          f.appendChild(n);
        });
        f.appendChild(el('div', 'pile-count', String(pile.length)));
      }
    });

    /* tableau */
    const t = $('#tableau');
    t.innerHTML = '';
    t.style.setProperty('--cols', b.tableau.length);
    b.tableau.forEach((pile, col) => {
      const p = el('div', 'pile tab-pile');
      p.dataset.zone = 'tableau';
      p.dataset.col = col;
      if (!pile.length) p.appendChild(el('div', 'pile-ghost', 'K'));
      const avail = Math.max(260, t.clientHeight || 420) - 20;
      const need = pile.reduce((a, c) => a + (c.faceUp ? 30 : 15), 0);
      const squeeze = need > avail ? avail / need : 1;
      let y = 0;
      let lastDownIdx = -1;
      pile.forEach((c, i) => { if (!c.faceUp) lastDownIdx = i; });
      pile.forEach((c, i) => {
        const n = cardEl(c, { topDown: i === lastDownIdx });
        n.style.top = Math.round(y) + 'px';
        n.style.zIndex = i;
        n.dataset.col = col;
        n.dataset.index = i;
        y += (c.faceUp ? 30 : 15) * squeeze;
        if (c.faceUp) attachDrag(n, { zone: 'tableau', col, index: i });
        p.appendChild(n);
      });
      t.appendChild(p);
    });

    applySelectionClasses();
  }

  function fmt(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    return Math.round(n).toLocaleString('en-US');
  }

  /* ============ SELECTION + INPUT ============ */
  function sameSrc(a, b) {
    if (!a || !b) return false;
    return a.zone === b.zone && a.col === b.col && a.index === b.index && a.suit === b.suit;
  }

  function applySelectionClasses() {
    $$('.card.sel').forEach(n => n.classList.remove('sel'));
    if (!selection) return;
    const b = G.board;
    if (selection.zone === 'tableau') {
      const pile = $$('#tableau .tab-pile')[selection.col];
      if (!pile) return;
      Array.from(pile.children).forEach(n => {
        if (n.dataset.index != null && +n.dataset.index >= selection.index) n.classList.add('sel');
      });
    } else if (selection.zone === 'waste') {
      const n = $('#waste .card:last-of-type');
      if (n) n.classList.add('sel');
    } else if (selection.zone === 'foundation') {
      const n = document.querySelector('#f-' + selection.suit + ' .card:last-of-type');
      if (n) n.classList.add('sel');
    }
  }

  function clearSelection() { selection = null; applySelectionClasses(); }

  function doMove(src, dst) {
    const ok = Game.tryMove(src, dst);
    if (ok) {
      Sfx.place();
      clearSelection();
      render();
      drainFx();
      checkStuck();
    } else {
      Sfx.error();
      shake($('#table'));
      render();
      G.fx.length = 0;
    }
    return ok;
  }

  function autoTarget(src) {
    const cards = src.zone === 'tableau'
      ? G.board.tableau[src.col].slice(src.index)
      : (src.zone === 'waste' ? G.board.waste.slice(-1) : G.board.foundations[src.suit].slice(-1));
    if (!cards.length) return null;
    if (cards.length === 1 && Engine.foundationTargetFor(G.board, cards[0])) return { zone: 'foundation' };
    const m = Engine.mods(G.run);
    for (let d = 0; d < G.board.tableau.length; d++) {
      if (src.zone === 'tableau' && d === src.col) continue;
      if (!G.board.tableau[d].length && src.zone === 'tableau' && src.index === 0) continue;
      if (Engine.canPlaceOnColumn(G.board, d, cards[0], m)) return { zone: 'tableau', col: d };
    }
    return null;
  }

  /* --- pointer drag --- */
  let drag = null;
  function attachDrag(node, src) {
    node.classList.add('grabbable');
    node.addEventListener('pointerdown', e => {
      if (G.phase !== 'play' || fxBusy) return;
      if (e.button != null && e.button !== 0) return;
      const cards = src.zone === 'tableau'
        ? (Engine.isRunFrom(G.board, src.col, src.index, Engine.mods(G.run)) ? G.board.tableau[src.col].slice(src.index) : null)
        : (src.zone === 'waste' ? G.board.waste.slice(-1) : G.board.foundations[src.suit].slice(-1));
      if (!cards || !cards.length) { Sfx.error(); shake(node); return; }
      drag = { src, cards, x0: e.clientX, y0: e.clientY, moved: false, node, ghost: null, t: Date.now() };
      node.setPointerCapture && node.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    node.addEventListener('pointermove', e => {
      if (!drag || drag.node !== node) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved && Math.hypot(dx, dy) > 6) {
        drag.moved = true;
        buildGhost(e);
        document.body.classList.add('dragging-now');
      }
      if (drag.moved && drag.ghost) {
        drag.ghost.style.transform = 'translate(' + (e.clientX - drag.ox) + 'px,' + (e.clientY - drag.oy) + 'px) rotate(' + Math.max(-8, Math.min(8, dx * 0.05)) + 'deg)';
        highlightDrop(e.clientX, e.clientY);
      }
    });
    const finish = e => {
      if (!drag || drag.node !== node) return;
      const d = drag; drag = null;
      document.body.classList.remove('dragging-now');
      clearDropHighlights();
      if (d.ghost) d.ghost.remove();
      $$('.card.lifted').forEach(n => n.classList.remove('lifted'));
      if (d.moved) {
        const dst = dropTargetAt(e.clientX, e.clientY);
        if (dst) doMove(d.src, dst);
        else { render(); }
      } else {
        onTap(d.src, e);
      }
    };
    node.addEventListener('pointerup', finish);
    node.addEventListener('pointercancel', () => { if (drag) { document.body.classList.remove('dragging-now'); if (drag.ghost) drag.ghost.remove(); clearDropHighlights(); drag = null; render(); } });
    node.addEventListener('dblclick', e => {
      if (G.phase !== 'play') return;
      e.preventDefault();
      const t = autoTarget(src);
      if (t) doMove(src, t); else { Sfx.error(); shake(node); }
    });
  }

  function buildGhost(e) {
    const layer = $('#draglayer');
    const rect = drag.node.getBoundingClientRect();
    drag.ox = e.clientX - rect.left;
    drag.oy = e.clientY - rect.top;
    const g = el('div', 'ghost-stack');
    drag.cards.forEach((c, i) => {
      const n = cardEl(c);
      n.style.top = (i * 30) + 'px';
      g.appendChild(n);
    });
    g.style.transform = 'translate(' + rect.left + 'px,' + rect.top + 'px)';
    layer.appendChild(g);
    drag.ghost = g;
    /* fade the originals */
    if (drag.src.zone === 'tableau') {
      const pile = $$('#tableau .tab-pile')[drag.src.col];
      Array.from(pile.children).forEach(n => { if (n.dataset.index != null && +n.dataset.index >= drag.src.index) n.classList.add('lifted'); });
    } else drag.node.classList.add('lifted');
  }

  function dropTargetAt(x, y) {
    const stack = document.elementsFromPoint(x, y);
    for (const n of stack) {
      const pile = n.closest && n.closest('[data-zone]');
      if (!pile) continue;
      const z = pile.dataset.zone;
      if (z === 'tableau') return { zone: 'tableau', col: +pile.dataset.col };
      if (z === 'foundation') return { zone: 'foundation', suit: pile.dataset.suit };
    }
    return null;
  }

  function highlightDrop(x, y) {
    clearDropHighlights();
    const t = dropTargetAt(x, y);
    if (!t || !drag) return;
    const m = Engine.mods(G.run);
    let ok = false, node = null;
    if (t.zone === 'tableau') {
      node = $$('#tableau .tab-pile')[t.col];
      ok = !(drag.src.zone === 'tableau' && drag.src.col === t.col) && Engine.canPlaceOnColumn(G.board, t.col, drag.cards[0], m);
    } else {
      node = $('#f-' + t.suit);
      ok = drag.cards.length === 1 && Engine.canPlaceOnFoundation(G.board, drag.cards[0], t.suit);
    }
    if (node) node.classList.add(ok ? 'drop-ok' : 'drop-no');
  }

  function clearDropHighlights() {
    $$('.drop-ok,.drop-no').forEach(n => n.classList.remove('drop-ok', 'drop-no'));
  }

  function onTap(src, e) {
    if (selection && sameSrc(selection, src)) { clearSelection(); Sfx.click(); return; }
    if (selection) {
      const dst = src.zone === 'foundation' ? { zone: 'foundation', suit: src.suit } : { zone: 'tableau', col: src.col };
      if (src.zone === 'waste') { selection = src; applySelectionClasses(); Sfx.click(); return; }
      const held = selection;
      clearSelection();
      if (!doMove(held, dst)) { selection = src; applySelectionClasses(); }
      return;
    }
    selection = src;
    applySelectionClasses();
    Sfx.click();
  }

  function bindPileTargets() {
    document.addEventListener('click', e => {
      if (G.phase !== 'play') return;
      const pile = e.target.closest && e.target.closest('[data-zone]');
      if (!pile || !selection) return;
      if (e.target.classList && e.target.classList.contains('card')) return;
      const z = pile.dataset.zone;
      if (z === 'tableau') { const held = selection; clearSelection(); doMove(held, { zone: 'tableau', col: +pile.dataset.col }); }
      else if (z === 'foundation') { const held = selection; clearSelection(); doMove(held, { zone: 'foundation', suit: pile.dataset.suit }); }
    });
  }

  /* ============ SCORE FX ============ */
  function drainFx() {
    if (fxBusy) return;
    const q = G.fx.splice(0, G.fx.length);
    if (!q.length) { syncScore(); return; }
    fxBusy = true;
    runPackets(q, 0);
  }

  function runPackets(q, i) {
    if (i >= q.length) {
      fxBusy = false;
      syncScore();
      if (G.fx.length) drainFx();
      else afterFx();
      return;
    }
    const p = q[i];
    const speed = q.length > 4 ? 0.35 : 1;
    animatePacket(p, speed, () => runPackets(q, i + 1));
  }

  function animatePacket(p, speed, done) {
    if (p.event === 'illegal') { done(); return; }
    if (p.event === 'recycle') { Sfx.deal(); done(); return; }
    if (p.event === 'curioFlash') { flashCurioById(p.curio); done(); return; }
    if (p.event === 'replay') {
      floatText(anchorEl(p.anchor), 'ALREADY PAID', 'fx-flash');
      setTimeout(done, 160 * speed);
      return;
    }
    if (p.event === 'shatter') {
      Sfx.shatter();
      const n = document.querySelector('[data-id="' + p.card.id + '"]');
      if (n) { n.classList.add('shattering'); burst(n, 14, '#9fe8ff'); }
      floatText(n || $('#scorebox'), 'SHATTERED', 'fx-shatter');
      setTimeout(done, 350 * speed);
      return;
    }

    const box = $('#scorebox');
    box.classList.add('live');
    let chips = 0, mult = 1;
    setScoreBox(0, 1);
    if (p.label) bannerText(p.label);

    const trigs = p.triggers.filter(t => t.kind !== 'flash' || true);
    let ti = 0;
    const step = () => {
      if (ti >= trigs.length) {
        setScoreBox(p.chips, p.mult);
        setTimeout(() => {
          slam(p);
          setTimeout(() => { box.classList.remove('live'); done(); }, 380 * speed);
        }, 90 * speed);
        return;
      }
      const t = trigs[ti++];
      const src = resolveSrc(t.src, p);
      if (t.kind === 'chips') { chips += t.amount; setScoreBox(chips, mult); floatText(src, '+' + t.amount, 'fx-chips'); Sfx.chip(ti); }
      else if (t.kind === 'mult') { mult += t.amount; setScoreBox(chips, mult); floatText(src, '+' + t.amount + ' Mult', 'fx-mult'); Sfx.mult(ti); }
      else if (t.kind === 'xmult') { mult *= t.amount; setScoreBox(chips, mult); floatText(src, 'X' + t.amount, 'fx-xmult'); Sfx.mult(ti + 6); }
      else if (t.kind === 'money') { floatText(src, '+$' + t.amount, 'fx-money'); Sfx.money(); renderHud(); }
      else if (t.kind === 'flash') { floatText(src, '!', 'fx-flash'); }
      else if (t.kind === 'retrigger') { floatText(src, 'AGAIN!', 'fx-again'); }
      if (src) { src.classList.add('trigger'); setTimeout(() => src.classList.remove('trigger'), 260); }
      setTimeout(step, (t.kind === 'flash' ? 60 : 105) * speed);
    };
    step();
  }

  function resolveSrc(src, p) {
    if (!src) return $('#scorebox');
    if (src.type === 'card') {
      const n = src.id ? document.querySelector('[data-id="' + src.id + '"]') : null;
      if (n) return n;
      return anchorEl(p.anchor);
    }
    if (src.type === 'curio') return document.querySelector('.mslot[data-idx="' + src.index + '"]');
    return $('#scorebox');
  }

  function anchorEl(a) {
    if (!a) return $('#scorebox');
    if (a.zone === 'foundation') return $('#f-' + a.suit);
    if (a.zone === 'tableau') return $$('#tableau .tab-pile')[a.col] || $('#scorebox');
    return $('#scorebox');
  }

  function setScoreBox(chips, mult) {
    $('#sb-chips').textContent = fmt(Math.round(chips));
    $('#sb-mult').textContent = (Math.round(mult * 100) / 100);
    const heat = Math.min(1, (chips * mult) / 4000);
    $('#scorebox').style.setProperty('--heat', heat.toFixed(2));
  }

  function slam(p) {
    const box = $('#scorebox');
    box.classList.add('slam');
    setTimeout(() => box.classList.remove('slam'), 400);
    const mag = p.total;
    Sfx.score(Math.log10(Math.max(10, mag)) * 20);
    const big = el('div', 'fx-total', '+' + fmt(mag));
    positionAt(big, box, -10, -50);
    $('#fxlayer').appendChild(big);
    setTimeout(() => big.remove(), 1000);
    if (mag > 1500) { screenShake(Math.min(14, mag / 900)); burst(box, 24, '#ffd166'); Sfx.big(); }
    else if (mag > 400) burst(box, 10, '#7ee787');
    animateScoreTo(G.round.score);
  }

  function animateScoreTo(target) {
    const start = displayScore, t0 = performance.now(), dur = 420;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur);
      displayScore = start + (target - start) * (1 - Math.pow(1 - k, 3));
      $('#round-score').textContent = fmt(Math.round(displayScore));
      renderQuotaOnly();
      if (k < 1) requestAnimationFrame(tick);
      else { displayScore = target; }
    };
    requestAnimationFrame(tick);
  }

  function renderQuotaOnly() {
    const q = Engine.quotaFor(G.run);
    const total = G.run.anteScore + Math.round(displayScore);
    $('#quota-fill').style.width = Math.max(0, Math.min(100, total / q * 100)) + '%';
    $('#quota-text').textContent = fmt(total) + ' / ' + fmt(q);
    $('#quota-bar').classList.toggle('met', total >= q);
  }

  function syncScore() {
    if (!G.round) return;
    animateScoreTo(G.round.score);
    renderHud();
  }

  function afterFx() {
    render();
    if (G.phase === 'play') checkStuck();
  }

  function checkStuck() {
    /* the engine ends the round by itself when the board is cleared -- show the summary */
    if (G.phase === 'roundEnd') { if (!Overlays.isOpen()) Overlays.roundEnd(); return; }
    if (G.phase !== 'play') return;
    if (!Engine.anyMoveAvailable(G, G.run)) {
      G.round.stuck = true;
      renderControls();
      toast('No moves left — cash out!', 2600);
    }
  }

  /* ============ little visual helpers ============ */
  function positionAt(node, ref, dx, dy) {
    const r = (ref || $('#scorebox')).getBoundingClientRect();
    node.style.left = (r.left + r.width / 2 + (dx || 0)) + 'px';
    node.style.top = (r.top + (dy || 0)) + 'px';
  }

  function floatText(ref, text, cls) {
    const n = el('div', 'fx-float ' + (cls || ''), text);
    positionAt(n, ref, (Math.random() * 30 - 15), -8);
    $('#fxlayer').appendChild(n);
    setTimeout(() => n.remove(), 900);
  }

  function bannerText(text) {
    const n = el('div', 'fx-banner', text);
    $('#fxlayer').appendChild(n);
    setTimeout(() => n.remove(), 1100);
  }

  function burst(ref, count, color) {
    const r = ref.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const p = el('div', 'particle');
      p.style.left = (r.left + r.width / 2) + 'px';
      p.style.top = (r.top + r.height / 2) + 'px';
      p.style.background = color || '#ffd166';
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 120;
      p.style.setProperty('--dx', Math.cos(a) * d + 'px');
      p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      p.style.animationDelay = (Math.random() * 0.08) + 's';
      $('#fxlayer').appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }

  function screenShake(power) {
    const app = $('#app');
    app.style.setProperty('--shake', (power || 6) + 'px');
    app.classList.remove('shaking');
    void app.offsetWidth;
    app.classList.add('shaking');
    setTimeout(() => app.classList.remove('shaking'), 400);
  }

  function shake(node) {
    if (!node) return;
    node.classList.remove('nope');
    void node.offsetWidth;
    node.classList.add('nope');
    setTimeout(() => node.classList.remove('nope'), 400);
  }

  function flashCurioById(id) {
    const i = G.run.mantel.findIndex(c => c.id === id);
    const n = document.querySelector('.mslot[data-idx="' + i + '"]');
    if (n) { n.classList.add('trigger'); setTimeout(() => n.classList.remove('trigger'), 300); }
  }

  let toastTimer = null;
  function toast(msg, ms) {
    const t = $('#toast');
    t.innerHTML = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 1800);
  }

  /* tooltips */
  function showTip(ref, html) {
    const t = $('#tooltip');
    t.innerHTML = html;
    t.classList.add('show');
    const r = ref.getBoundingClientRect();
    const w = 250;
    t.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    t.style.top = (r.bottom + 8) + 'px';
  }
  function hideTip() { $('#tooltip').classList.remove('show'); }

  /* curio drag-to-reorder */
  function makeCurioDraggable(node, index) {
    let start = null;
    node.addEventListener('pointerdown', e => {
      start = { x: e.clientX, index };
      node.setPointerCapture && node.setPointerCapture(e.pointerId);
    });
    node.addEventListener('pointerup', e => {
      if (!start) return;
      const dx = e.clientX - start.x;
      start = null;
      if (Math.abs(dx) < 25) return;
      const slotW = node.getBoundingClientRect().width + 8;
      const shift = Math.round(dx / slotW);
      const to = Math.max(0, Math.min(G.run.mantel.length - 1, index + shift));
      if (to !== index) { Game.reorderCurio(index, to); Sfx.click(); render(); }
    });
  }

  function resetDisplayScore() { displayScore = G.round ? G.round.score : 0; }

  return {
    render, renderHud, renderMantel, renderBoard, renderControls, cardEl, el, $, $$,
    drainFx, toast, shake, screenShake, burst, fmt, clearSelection, bindPileTargets,
    showTip, hideTip, resetDisplayScore, checkStuck, doMove, floatText, bannerText,
    get busy() { return fxBusy; }
  };
})();
