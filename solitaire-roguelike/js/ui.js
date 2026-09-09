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
  let rush = false;          // player acted mid-animation: burn through what's left
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

    if (card.oddity) {
      const od = ODDITIES[card.oddity] || { name: '???', icon: 'unknown', tint: '' };
      n.classList.remove('red', 'black');
      n.classList.add('oddity', od.tint);
      /* the name sits in the top strip so a stacked Oddity is still identifiable
         when only its first 30px is showing */
      n.innerHTML =
        '<div class="face odd-face">' +
          '<div class="odd-head">' + icon(od.icon, 'odd-mini') + '<span>' + od.name + '</span></div>' +
          '<div class="odd-art">' + icon(od.icon) + '</div>' +
          '<div class="odd-foot">ODDITY</div>' +
          (card.oddCount ? '<div class="odd-count">x' + card.oddCount + '</div>' : '') +
          (card.seal && card.seal !== 'none' ? '<div class="seal-dot"></div>' : '') +
          '<div class="shine"></div>' +
        '</div>';
      return n;
    }

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
    hideTip();
    clearHints();
    if (drag) cancelDrag(true);
    else sweepGhosts();
    renderHud();
    renderMantel();
    renderBoard();
    renderControls();
    renderBounty();
    renderMomentum(true);
  }

  /* ---------------- THE BOUNTY ----------------
     One card is always posted WANTED. Send that exact card home from anywhere and
     it pays on the spot. RAISE doubles the purse but starts a clock — miss it and
     the escape comes straight off your ante bar.                                */
  function renderBounty() {
    const box = $('#bounty');
    if (!box) return;
    const bn = G.round && G.round.bounty;
    if (!bn) { box.className = 'bounty'; box.innerHTML = '<div class="bnt-empty">NO BOUNTY<br>POSTED</div>'; return; }
    const red = bn.suit === 'H' || bn.suit === 'D';
    const hot = bn.deadline != null;
    box.className = 'bounty' + (hot ? ' hot' : '');
    box.innerHTML =
      '<div class="bnt-title">WANTED</div>' +
      '<div class="bnt-face' + (red ? ' red' : '') + '">' +
        '<span class="r">' + RANK_NAMES[bn.rank] + '</span>' +
        '<span class="s">' + SUITS[bn.suit].sym + '</span>' +
      '</div>' +
      '<div class="bnt-reward">' + fmt(bn.reward) + ' pts</div>' +
      (hot ? '<div class="bnt-clock">' + bn.deadline + ' MOVES</div>' : '');
    const canRaise = bn.raises < TUNE.bountyMaxRaises;
    const btn = el('button', 'bnt-raise', canRaise ? 'RAISE x2' : 'MAXED');
    btn.disabled = !canRaise;
    btn.onclick = () => {
      const res = Game.raiseBounty();
      if (!res.ok) { Sfx.error(); toast(res.reason); return; }
      Sfx.mult();
      flashScreen(0.14, '#f0c674');
      screenShake(5);
      render();
      drainFx();
    };
    box.appendChild(btn);
    box.addEventListener('pointerenter', e => showTip(e.currentTarget, bountyTip(bn)));
    box.addEventListener('pointerleave', hideTip);
  }

  function bountyTip(bn) {
    const stake = bn.staked || Math.round(bountyStakePreview(bn) );
    return '<div class="tip-title">THE BOUNTY</div>' +
      '<div class="tip-text">The table keeps one card posted at all times. Send <b>' +
      RANK_NAMES[bn.rank] + SUITS[bn.suit].sym + '</b> home — off the tableau, out of the waste, ' +
      'or straight from the Stash — and it pays <b>' + fmt(bn.reward) + ' Chips</b> plus <b>$' +
      TUNE.bountyCash + '</b>, then a new face goes up immediately.</div>' +
      '<div class="tip-text">Each bounty you collect this round makes the next one <b>' +
      Math.round(TUNE.bountyGrowth * 100) + '% richer</b>.</div>' +
      '<div class="tip-text"><b>RAISE</b> doubles the purse but gives you only <b>' +
      TUNE.bountyDeadline + ' moves</b> to bring it in. Let it escape and you lose <b>' +
      fmt(stake) + ' points</b> off your ante bar and your cascade breaks.' +
      (bn.deadline != null ? ' <b style="color:var(--hot)">The clock is running: ' + bn.deadline + ' moves.</b>' : '') +
      '</div>';
  }

  function bountyStakePreview(bn) {
    return (bn.raises ? bn.reward : bn.reward * 2) * TUNE.bountyStake;
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
    const wb = $('#whim-badge');
    if (wb) {
      const w = run.whim && WHIM_BY_ID[run.whim];
      wb.style.display = w ? '' : 'none';
      if (w) {
        wb.className = 'badge whim mood-' + w.mood;
        wb.innerHTML = icon(w.icon, 'whim-ico') + '<span>' + w.name + '</span>';
        wb.onpointerenter = e => showTip(e.currentTarget,
          '<div class="tip-title">' + icon(w.icon, 'tip-ico') + ' ' + w.name + '</div>' +
          '<div class="tip-kind whim-kind">THE DEALER\'S WHIM — this round only</div>' +
          '<div class="tip-text">' + w.text + '</div>');
        wb.onpointerleave = hideTip;
      }
    }
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
        '<div class="c-art">' + icon(def.icon) + '</div>' +
        '<div class="c-name">' + def.name + '</div>' +
        (inst.counter != null && def.counterLabel
          ? '<div class="c-counter">' + (def.counterLabel === 'X' ? 'X' + inst.counter : '+' + inst.counter) + '</div>' : '');
      c.addEventListener('pointerenter', e => showTip(e.currentTarget, curioTip(inst, def, i)));
      c.addEventListener('pointerleave', hideTip);
      if (G.phase === 'shop') {
        const value = def.sellsFull ? (inst.paid || def.cost) : Math.max(1, Math.floor((inst.paid || def.cost) / 2));
        c.classList.add('sellable');
        c.appendChild(el('div', 'sell-band', 'SELL $' + value));
        c.addEventListener('click', () => {
          const v = Game.sellCurio(i);
          if (v) {
            Sfx.money();
            floatText(c, '+$' + v, 'fx-money big');
            burst(c, 12, '#ffd166');
            toast('Sold ' + def.name + ' for <b>$' + v + '</b>');
            Overlays.refreshShop();
          }
        });
      }
      makeCurioDraggable(c, i);
      m.appendChild(c);
    }
    const label = el('div', 'mantel-label', 'THE MANTEL <b>' + G.run.mantel.length + '/' + slots + '</b>');
    m.appendChild(label);
  }

  function curioTip(inst, def, i) {
    let s = '<div class="tip-title r-' + def.rarity + '">' + icon(def.icon, 'tip-ico') + ' ' + def.name + '</div>';
    s += '<div class="tip-kind curio-kind">CURIO — takes a mantel seat</div>';
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
    renderReshuffle();
    renderCut();
    $('#deck-count').textContent = G.run.deck.length;
    $('#btn-cash').classList.toggle('urgent', !!(G.round && G.round.stuck));
    const pv = $('#cash-preview');
    if (pv && G.phase === 'play') {
      const p = Game.payoutPreview();
      pv.textContent = '$' + p.total;
      $('#btn-cash').dataset.breakdown = p.lines.map(l => l.label + '  +$' + l.amount).join('\n');
    }
  }

  function renderReshuffle() {
    const bar = $('#reshuffle-bar');
    if (!bar || !G.board) return;
    const c = Game.reshuffleCost();
    bar.innerHTML = '<span class="rs-cap">RESHUFFLE</span>';
    const add = (how, label, enabled, title) => {
      const btn = el('button', 'rs-btn rs-' + how + (enabled ? '' : ' off'), label);
      if (title) btn.title = title;
      btn.onclick = () => {
        const res = Game.reshuffle(how);
        if (!res.ok) { Sfx.error(); toast(res.reason); return; }
        Sfx.deal();
        flashScreen(0.12, '#4cc9f0');
        clearSelection();
        render();
        drainFx();
      };
      bar.appendChild(btn);
    };
    if (c.free > 0) add('free', 'FREE x' + c.free, true, 'Granted by a Curio or the Counter');
    add('pass', '1 PASS', c.passes > 0, 'Spends one of your passes through the stock');
    add('points', fmt(c.points) + ' pts', Game.anteTotalAvailable() >= c.points,
        'Taken straight off your ANTE total — this round first, then banked rounds');
  }

  /* THE SIDE POT -- the corner gamble. Every score feeds it; you decide
     whether to bank it or flip a freshly shuffled card to double it. */
  function renderCut() {
    const box = $('#sidepot');
    if (!box || !G.round) return;
    const pot = Math.round(G.round.pot || 0);
    const streak = G.round.potStreak || 0;
    const canFlip = pot >= TUNE.potMinFlip;
    const heat = G.round.heat || 0;

    box.className = 'sidepot' + (pot > 0 ? ' live' : '') + (canFlip ? ' ready' : '') + (streak >= 3 ? ' blazing' : '');
    box.innerHTML =
      '<div class="sp-cap">SIDE POT' + (streak ? '<span class="sp-streak">' + streak + ' straight</span>' : '') + '</div>' +
      '<div class="sp-amount">' + fmt(pot) + '</div>' +
      '<div class="sp-sub">' + (heat ? 'HEAT X' + Game.heatMult() + ' · ' : '') +
        (canFlip ? 'red/black pays ' + fmt(pot * TUNE.roulettePayEven) : 'needs ' + fmt(TUNE.potMinFlip)) + '</div>';

    const row = el('div', 'sp-btns');
    const cash = el('button', 'sp-btn sp-cash' + (pot > 0 ? '' : ' off'), 'CASH IT');
    cash.onclick = () => {
      const res = Game.cashPot();
      if (!res.ok) { Sfx.error(); toast(res.reason); return; }
      render(); drainFx();
    };
    const flip = el('button', 'sp-btn sp-flip' + (canFlip ? '' : ' off'), 'SPIN THE WHEEL');
    flip.onclick = () => {
      if (!canFlip) { Sfx.error(); toast('The pot needs at least ' + TUNE.potMinFlip + ' to take to the wheel.'); return; }
      Sfx.click();
      Overlays.roulette();
    };
    row.appendChild(cash);
    row.appendChild(flip);
    box.appendChild(row);
    box.addEventListener('pointerenter', e => showTip(e.currentTarget,
      '<div class="tip-title">The Side Pot</div>' +
      '<div class="tip-kind whim-kind">THE CORNER GAMBLE</div>' +
      '<div class="tip-text">Every score drops ' + Math.round((TUNE.potShare + Engine.mods(G.run).potShare) * 100) +
      '% of itself into the pot. <b>CASH IT</b> adds the pot straight to your score.</div>' +
      '<div class="tip-text"><b>DOUBLE OR NOTHING</b> flips a card from a freshly shuffled deck — there is no order ' +
      'to learn. Red doubles the pot and raises your HEAT (which multiplies every score). Black takes the pot ' +
      'and a pass with it.</div>'));
    box.addEventListener('pointerleave', hideTip);
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
    const mm = Engine.mods(G.run);
    const show = Math.min(b.waste.length, 3);
    const from = b.waste.length - show;
    const playable = Engine.playableWaste(b, mm).map(w => w.index);
    for (let k = 0; k < show; k++) {
      const absIdx = from + k;
      const c = b.waste[absIdx];
      const n = cardEl(c);
      n.style.left = Math.round(k * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw')) * 0.42)) + 'px';
      n.style.zIndex = k;
      if (playable.includes(absIdx)) {
        n.dataset.zone = 'waste';
        n.classList.add('playable');
        attachDrag(n, { zone: 'waste', index: absIdx });
      } else n.classList.add('under');
      attachInspect(n, c);
      waste.appendChild(n);
    }
    if (b.waste.length > 3) waste.appendChild(el('div', 'pile-count', String(b.waste.length)));

    /* the stash: cards held back, playable whenever */
    const st = $('#stash');
    if (st) {
      st.innerHTML = '';
      const held = G.run.stash || [];
      const cap = Game.stashCapacity();
      const label = el('div', 'stash-label', 'STASH <b>' + held.length + '/' + cap + '</b>');
      st.appendChild(label);
      const row = el('div', 'stash-row');
      for (let i = 0; i < cap; i++) {
        const c = held[i];
        if (!c) { row.appendChild(el('div', 'stash-slot empty', '')); continue; }
        const slot = el('div', 'stash-slot');
        const n = cardEl(Object.assign({}, c, { faceUp: true }));
        n.classList.add('stashed');
        attachInspect(n, c);
        attachStashDrag(n, i);
        slot.appendChild(n);
        row.appendChild(slot);
      }
      st.appendChild(row);
      st.classList.toggle('full', held.length >= cap);
    }

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
          if (c.id === landedId) n.classList.add('landed');
          attachInspect(n, c);
          f.appendChild(n);
        });
        f.appendChild(el('div', 'pile-count', String(pile.length)));
      }
      /* twins fan out BEHIND the pile so the real top card stays readable */
      const tw = (b.twins && b.twins[s]) || [];
      tw.slice(-3).forEach((c, i) => {
        const t = cardEl(c);
        t.classList.add('twin-card');
        t.style.setProperty('--tw', (i + 1));
        t.style.zIndex = -10 + i;
        attachInspect(t, c);
        f.insertBefore(t, f.firstChild);
      });
      if (tw.length) f.appendChild(el('div', 'twin-count', 'TWIN x' + tw.length));
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
      let y = 0, lastTop = 0;
      let lastDownIdx = -1;
      pile.forEach((c, i) => { if (!c.faceUp) lastDownIdx = i; });
      pile.forEach((c, i) => {
        const n = cardEl(c, { topDown: i === lastDownIdx });
        if (c.id === landedId) n.classList.add('landed');
        lastTop = y;
        n.style.top = Math.round(y) + 'px';
        n.style.zIndex = i;
        n.dataset.col = col;
        n.dataset.index = i;
        y += (c.faceUp ? 30 : 15) * squeeze;
        if (c.faceUp) { attachDrag(n, { zone: 'tableau', col, index: i }); attachInspect(n, c); }
        p.appendChild(n);
      });
      const runLen = Engine.runLength(b, col, Engine.mods(G.run));
      if (runLen === 1 && pile.length) {
        const only = pile[pile.length - 1];
        if (only.faceUp && (Engine.foundationTargetFor(b, only) || Engine.twinTargetFor(b, only))) {
          const badge = el('div', 'run-badge ready solo',
            '<span class="rb-go">SEND IT HOME</span>');
          const ch2 = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ch')) || 106;
          badge.style.top = Math.round(lastTop + ch2 + 5) + 'px';
          p.appendChild(badge);
        }
      }
      if (runLen > 1) {
        const mm = Engine.mods(G.run);
        const runCards = Engine.runCards(b, col, mm);
        const val = runCards.reduce((a, c) => a + rankChips(c.rank), 0);
        const bonusMult = (runLen - 1) * TUNE.stackMultPer * mm.stackMult;
        const cashCard = pile[pile.length - 1];
        const ready = !!(Engine.foundationTargetFor(b, cashCard) || Engine.twinTargetFor(b, cashCard));
        const badge = el('div', 'run-badge' + (ready ? ' ready' : ''),
          '<span class="rb-n">RUN ' + runLen + '</span>' +
          (ready ? '<span class="rb-go">CASH IN</span>' : ''));
        const ch = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ch')) || 106;
        badge.style.top = Math.round(lastTop + ch + 5) + 'px';
        const cardName = RANK_NAMES[cashCard.rank] + SUITS[cashCard.suit].sym;
        badge.addEventListener('pointerenter', e => showTip(e.currentTarget,
          '<div class="tip-title">Column Stack — run of ' + runLen + '</div>' +
          '<div class="tip-kind combo-kind">CASH-IN BONUS</div>' +
          '<div class="tip-rows">' +
            '<div class="tip-row"><span>Ranks in this run</span><i>+' + val + ' Chips</i></div>' +
            '<div class="tip-row"><span>' + (runLen - 1) + ' extra cards</span><i>+' + bonusMult + ' Mult</i></div>' +
          '</div>' +
          '<div class="tip-text">' + (ready
            ? '<b class="ok">Ready.</b> Send the ' + cardName + ' to a foundation to collect all of it on that one play.'
            : 'Collect it by sending the <b>' + cardName + '</b> home — it needs its foundation to be one rank below.') +
          '</div>' +
          '<div class="tip-foot">The run then shrinks by one and pays again on the next card.</div>'));
        badge.addEventListener('pointerleave', hideTip);
        p.appendChild(badge);
      }
      t.appendChild(p);
    });

    applySelectionClasses();
    renderCombo();
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

  let landedId = null;
  function doMove(src, dst) {
    if (dst.zone === 'stash') {
      const ok2 = Game.stash(src);
      if (ok2) { Sfx.place(); toast(quip('wish'), 1500); clearSelection(); render(); drainFx(); checkStuck(); }
      else { Sfx.error(); shake($('#stash')); render(); G.fx.length = 0; }
      return ok2;
    }
    if (src.zone === 'stash') {
      const ok2 = Game.stashPlay(src.index, dst);
      if (ok2) { Sfx.place(); clearSelection(); render(); drainFx(); checkStuck(); }
      else { Sfx.error(); shake($('#stash')); render(); G.fx.length = 0; }
      return ok2;
    }
    const moving = src.zone === 'tableau' ? (G.board.tableau[src.col] || [])[src.index]
                 : src.zone === 'waste' ? G.board.waste[src.index != null ? src.index : G.board.waste.length - 1]
                 : null;
    const ok = Game.tryMove(src, dst);
    if (ok) {
      landedId = moving ? moving.id : null;
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

  /* --- pointer drag ---
     Move/up/cancel live on the window, not on the card. render() destroys and
     rebuilds every card element, so a listener bound to the node dies with it
     and the drag ghost gets stranded on screen forever. */
  let drag = null;

  function cancelDrag(silent) {
    if (drag && drag.ghost) drag.ghost.remove();
    drag = null;
    document.body.classList.remove('dragging-now');
    clearDropHighlights();
    $$('.card.pressed').forEach(n => n.classList.remove('pressed'));
    $$('.card.lifted').forEach(n => n.classList.remove('lifted'));
    sweepGhosts();
    if (!silent) render();
  }

  /* belt and braces: nothing should ever be left in the drag layer */
  function sweepGhosts() {
    const layer = $('#draglayer');
    if (!layer) return;
    Array.from(layer.children).forEach(n => { if (!drag || n !== drag.ghost) n.remove(); });
  }

  /* hover a face-up card for a beat to read exactly what it does */
  let inspectTimer = null;
  function attachInspect(node, card) {
    node.addEventListener('pointerenter', () => {
      clearTimeout(inspectTimer);
      inspectTimer = setTimeout(() => {
        if (drag) return;
        showTip(node, Overlays.cardTip(card));
      }, 340);
    });
    node.addEventListener('pointerleave', () => { clearTimeout(inspectTimer); hideTip(); });
    node.addEventListener('pointerdown', () => { clearTimeout(inspectTimer); hideTip(); });
    /* right-click pins it open for as long as you like */
    node.addEventListener('contextmenu', e => {
      e.preventDefault();
      clearTimeout(inspectTimer);
      showTip(node, Overlays.cardTip(card));
    });
  }

  function attachStashDrag(node, index) {
    node.classList.add('grabbable');
    node.addEventListener('pointerdown', e => {
      if (G.phase !== 'play') return;
      rushFx();
      if (e.button != null && e.button !== 0) return;
      cancelDrag(true);
      node.classList.add('pressed');
      drag = { src: { zone: 'stash', index }, cards: [G.run.stash[index]],
               x0: e.clientX, y0: e.clientY, moved: false, node, ghost: null, id: e.pointerId };
      e.preventDefault();
    });
    node.addEventListener('dblclick', e => {
      if (G.phase !== 'play') return;
      e.preventDefault();
      cancelDrag(true);
      const card = G.run.stash[index];
      if (Engine.foundationTargetFor(G.board, card) || Engine.twinTargetFor(G.board, card)) {
        doMove({ zone: 'stash', index }, { zone: 'foundation' });
      } else {
        const m = Engine.mods(G.run);
        for (let d = 0; d < G.board.tableau.length; d++) {
          if (Engine.canPlaceOnColumn(G.board, d, card, m)) { doMove({ zone: 'stash', index }, { zone: 'tableau', col: d }); return; }
        }
        Sfx.error(); shake(node);
      }
    });
  }

  function attachDrag(node, src) {
    node.classList.add('grabbable');
    node.addEventListener('pointerdown', e => {
      if (G.phase !== 'play') return;
      rushFx();
      if (e.button != null && e.button !== 0) return;
      const cards = src.zone === 'tableau'
        ? (Engine.isRunFrom(G.board, src.col, src.index, Engine.mods(G.run)) ? G.board.tableau[src.col].slice(src.index) : null)
        : (src.zone === 'waste'
            ? (G.board.waste[src.index != null ? src.index : G.board.waste.length - 1] ? [G.board.waste[src.index != null ? src.index : G.board.waste.length - 1]] : null)
            : G.board.foundations[src.suit].slice(-1));
      if (!cards || !cards.length) { Sfx.error(); shake(node); return; }
      cancelDrag(true);
      node.classList.add('pressed');
      drag = { src, cards, x0: e.clientX, y0: e.clientY, moved: false, node, ghost: null, id: e.pointerId };
      e.preventDefault();
    });
    node.addEventListener('dblclick', e => {
      if (G.phase !== 'play') return;
      e.preventDefault();
      cancelDrag(true);
      const t = autoTarget(src);
      if (t) doMove(src, t); else { Sfx.error(); shake(node); }
    });
  }

  function onDragMove(e) {
    if (!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) > 6) {
      drag.moved = true;
      buildGhost(e);
      document.body.classList.add('dragging-now');
    }
    if (drag.moved && drag.ghost) {
      drag.ghost.style.transform = 'translate(' + (e.clientX - drag.ox) + 'px,' + (e.clientY - drag.oy) + 'px) rotate(' +
        Math.max(-8, Math.min(8, dx * 0.05)) + 'deg)';
      highlightDrop(e.clientX, e.clientY);
    }
  }

  function onDragEnd(e) {
    if (!drag) { sweepGhosts(); return; }
    const d = drag;
    drag = null;
    if (d.ghost) d.ghost.remove();
    sweepGhosts();
    document.body.classList.remove('dragging-now');
    clearDropHighlights();
    $$('.card.pressed').forEach(n => n.classList.remove('pressed'));
    $$('.card.lifted').forEach(n => n.classList.remove('lifted'));
    if (d.moved) {
      const dst = dropTargetAt(e.clientX, e.clientY);
      if (dst) doMove(d.src, dst);
      else render();
    } else {
      onTap(d.src, e);
    }
  }

  function installDragHandlers() {
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('pointercancel', () => cancelDrag());
    window.addEventListener('blur', () => cancelDrag());
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelDrag(); });
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
      if (z === 'stash') return { zone: 'stash' };
    }
    return null;
  }

  function highlightDrop(x, y) {
    clearDropHighlights();
    const t = dropTargetAt(x, y);
    if (!t || !drag) return;
    const m = Engine.mods(G.run);
    let ok = false, node = null;
    if (t.zone === 'stash') {
      node = $('#stash');
      ok = drag.cards.length === 1 && drag.src.zone !== 'stash' && Game.canStash(drag.src);
    } else if (t.zone === 'tableau') {
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
      else if (z === 'stash') { const held = selection; clearSelection(); doMove(held, { zone: 'stash' }); }
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
      if (G.fx.length) { drainFx(); }
      else { rush = false; afterFx(); }
      return;
    }
    const base = q.length > 6 ? 0.28 : (q.length > 3 ? 0.5 : 1);
    const speed = () => base * (rush ? 0.06 : 1);
    animatePacket(q[i], speed, () => runPackets(q, i + 1));
  }

  /* the player did something while the fireworks were still going -- don't
     swallow their input, just finish the show immediately */
  function rushFx() { if (fxBusy) rush = true; }

  function animatePacket(p, spd, done) {
    if (p.event === 'illegal') { done(); return; }
    if (p.event === 'nudge') { floatText($('#table'), p.label, 'fx-flash'); done(); return; }
    if (p.event === 'wish-result') {
      const w = p.wish;
      const anchor = anchorEl(p.anchor);
      const card = el('div', 'wish-card ' + w.cls,
        '<div class="wc-name">' + w.name + '</div>' +
        '<div class="wc-text">' + w.text + '</div>' +
        (p.detail ? '<div class="wc-detail">' + p.detail + '</div>' : ''));
      $('#fxlayer').appendChild(card);
      if (w.cls === 'jackpot') { Sfx.win(); screenShake(12); confetti(anchor, 60, 't4'); flashScreen(0.3, '#b07cff'); }
      else if (w.cls === 'great') { Sfx.big(); confetti(anchor, 26, 't2'); flashScreen(0.16, '#7ee787'); }
      else if (w.cls === 'meh') { Sfx.error(); }
      else { Sfx.money(); burst(anchor, 12, '#ffd166'); }
      renderHud();
      setTimeout(() => card.classList.add('out'), 1050 * spd());
      setTimeout(() => card.remove(), 1450 * spd());
      setTimeout(done, 520 * spd());
      return;
    }
    if (p.event === 'pot-cash') {
      bannerText('POT CASHED');
      Sfx.win();
      confetti($('#sidepot') || $('#scorebox'), 40, 't3');
      flashScreen(0.2, '#7ee787');
      screenShake(7);
      animateScoreTo(G.round.score);
      floatText($('#sidepot') || $('#scorebox'), '+' + fmt(p.amount), 'fx-total');
      setTimeout(done, 420 * spd());
      return;
    }
    if (p.event === 'reshuffle') {
      Sfx.deal();
      const st = $('#stock');
      if (st) { st.classList.remove('reshuffled'); void st.offsetWidth; st.classList.add('reshuffled'); }
      floatText(st || $('#scorebox'), 'RESHUFFLED', 'fx-flash');
      setTimeout(done, 120 * spd());
      return;
    }
    if (p.event === 'cash') {
      const a = anchorEl(p.anchor);
      floatText(a, '+$' + p.amount, 'fx-money big');
      floatText(a, p.label, 'fx-cashlabel');
      Sfx.money();
      burst(a, 8, '#ffd166');
      renderHud();
      renderControls();
      setTimeout(done, 130 * spd());
      return;
    }
    if (p.event === 'bust') {
      const a = anchorEl(p.anchor);
      Sfx.lose();
      bannerText(p.label);
      floatText(a, p.label, 'fx-shatter');
      flashScreen(0.22, '#ff5a5a');
      screenShake(9);
      renderHud();
      renderBounty();
      setTimeout(done, 320 * spd());
      return;
    }
    if (p.event === 'recycle') { Sfx.deal(); flashScreen(0.10, '#4cc9f0'); done(); return; }
    if (p.event === 'draw') {
      Sfx.deal();
      const w = $('#waste');
      if (w) { w.classList.remove('dealt'); void w.offsetWidth; w.classList.add('dealt'); }
      done();
      return;
    }
    if (p.event === 'curioFlash') { flashCurioById(p.curio); done(); return; }
    if (p.event === 'replay') {
      floatText(anchorEl(p.anchor), 'ALREADY PAID', 'fx-flash');
      setTimeout(done, 100 * spd());
      return;
    }
    if (p.event === 'shatter') {
      Sfx.shatter();
      const n = document.querySelector('[data-id="' + p.card.id + '"]');
      if (n) { n.classList.add('shattering'); burst(n, 14, '#9fe8ff'); }
      floatText(n || $('#scorebox'), 'SHATTERED', 'fx-shatter');
      toast(quip('shatter'));
      setTimeout(done, 210 * spd());
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
          setTimeout(() => { box.classList.remove('live'); done(); }, 170 * spd());
        }, 45 * spd());
        return;
      }
      /* the more there is to show, the faster each beat of it goes by */
      const stepMs = Math.max(16, 52 - trigs.length * 1.6);
      const t = trigs[ti++];
      const src = resolveSrc(t.src, p);
      if (t.kind === 'chips') { chips += t.amount; setScoreBox(chips, mult); floatText(src, '+' + t.amount, 'fx-chips'); Sfx.chip(ti); }
      else if (t.kind === 'mult') { mult += t.amount; setScoreBox(chips, mult); floatText(src, '+' + t.amount + ' Mult', 'fx-mult'); Sfx.mult(ti); }
      else if (t.kind === 'xmult') { mult *= t.amount; setScoreBox(chips, mult); floatText(src, 'X' + t.amount, 'fx-xmult'); Sfx.mult(ti + 6); }
      else if (t.kind === 'money') { floatText(src, '+$' + t.amount, 'fx-money'); Sfx.money(); renderHud(); }
      else if (t.kind === 'flash') { floatText(src, '!', 'fx-flash'); }
      else if (t.kind === 'retrigger') { floatText(src, 'AGAIN!', 'fx-again'); }
      if (src) {
        src.classList.add('trigger');
        setTimeout(() => src.classList.remove('trigger'), 260);
        if (t.kind === 'xmult' || t.kind === 'retrigger') spark(src);
      }
      setTimeout(step, (t.kind === 'flash' ? stepMs * 0.5 : stepMs) * spd());
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
    if (a.zone === 'stash') return $('#stash') || $('#scorebox');
    if (a.zone === 'bounty') return $('#bounty') || $('#scorebox');
    if (a.zone === 'stock') return $('#stock') || $('#scorebox');
    if (a.zone === 'foundation') return $('#f-' + a.suit);
    if (a.zone === 'tableau') return $$('#tableau .tab-pile')[a.col] || $('#scorebox');
    return $('#scorebox');
  }

  function setScoreBox(chips, mult) {
    const total = Math.round(chips * mult);
    $('#sb-chips').textContent = fmt(Math.round(chips));
    $('#sb-mult').textContent = (Math.round(mult * 100) / 100);
    $('#sb-total').textContent = fmt(total);
    const heat = Math.min(1, total / 6000);
    const box = $('#scorebox');
    box.style.setProperty('--heat', heat.toFixed(2));
    box.style.setProperty('--swell', (1 + Math.min(0.22, total / 60000)).toFixed(3));
    const t = tierFor(total);
    box.className = 'live' + (t ? ' ' + t.cls : '');
    bumpEl($('#sb-total'));
  }

  function bumpEl(n) {
    if (!n) return;
    n.classList.remove('bump');
    void n.offsetWidth;
    n.classList.add('bump');
  }

  /* TEMPO -- rewards playing fast, never punishes thinking */
  function momentumMult() {
    const m = G.round ? (G.round.momentum || 0) : 0;
    return +(1 + (m / 100) * TUNE.momentumMaxMult).toFixed(2);
  }

  let lastMomentumPaint = -1;
  function renderMomentum(force) {
    const bar = $('#tempo-fill');
    if (!bar || !G.round) return;
    const m = G.round.momentum || 0;
    /* the loop runs at 60fps -- only touch the DOM when it actually moved */
    if (!force && Math.abs(m - lastMomentumPaint) < 0.8) return;
    lastMomentumPaint = m;
    bar.style.width = m + '%';
    const wrap = $('#tempo');
    wrap.classList.toggle('hot', m > 55);
    wrap.classList.toggle('max', m > 88);
    const lab = $('#tempo-mult');
    if (lab) lab.textContent = 'X' + momentumMult();
  }

  /* one loop drives the decay, the bar and the music intensity */
  function startMomentumLoop() {
    const tick = () => {
      if (G.phase === 'play' && G.round && !Overlays.isOpen()) {
        Game.decayMomentum();
        renderMomentum();
      }
      const heat = G.round ? (G.round.heat || 0) : 0;
      const mo = G.round ? (G.round.momentum || 0) : 0;
      Sfx.setIntensity(Math.min(1, mo / 100 * 0.7 + Math.min(heat, 5) / 5 * 0.5));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* the persistent combo readout inside the score box */
  function renderCombo() {
    const m = $('#combo-meter');
    if (!m || !G.round) return;
    const bits = [];
    if (G.round.cascade > 1) bits.push('<span class="cm cascade">CASCADE <b>X' + G.round.cascade + '</b></span>');
    if (G.round.suitRun > 1) bits.push('<span class="cm suitrun">' + SUITS[G.round.lastSuit].sym + ' RUN <b>X' + G.round.suitRun + '</b></span>');
    if (G.round.heat > 0) bits.push('<span class="cm heat">HEAT <b>X' + Game.heatMult() + '</b></span>');
    if ((G.round.momentum || 0) > 20) bits.push('<span class="cm tempo">TEMPO <b>X' + momentumMult() + '</b></span>');
    m.innerHTML = bits.join('');
    m.classList.toggle('active', bits.length > 0);
    if (bits.length) { m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); }
  }

  function slam(p) {
    const box = $('#scorebox');
    const mag = p.total;
    const tier = tierFor(mag);
    box.classList.add('slam');
    setTimeout(() => box.classList.remove('slam'), 450);

    Sfx.score(Math.log10(Math.max(10, mag)) * 20);

    const big = el('div', 'fx-total ' + (tier ? tier.cls : ''), '+' + fmt(mag));
    positionAt(big, box, 0, -46);
    $('#fxlayer').appendChild(big);
    setTimeout(() => big.remove(), 1100);

    shockwave(box, tier);
    bumpEl($('#round-score'));

    if (tier) {
      tierBanner(tier);
      screenShake(tier.shake);
      confetti(box, tier.parts, tier.cls);
      flashScreen(0.34 - SCORE_TIERS.indexOf(tier) * 0.05, tierColor(tier));
      if (mag >= 8000) Sfx.big();
      if (mag >= 25000) toast(quip('bigScore'), 2400);
      document.body.classList.add('hot');
      clearTimeout(hotTimer);
      hotTimer = setTimeout(() => document.body.classList.remove('hot'), 900);
    } else {
      burst(box, 8, '#7ee787');
    }
    animateScoreTo(G.round.score);
  }

  let hotTimer = null;
  function tierColor(t) {
    return { t1: '#7ee787', t2: '#ffd166', t3: '#ff8f3f', t4: '#ff4d6d', t5: '#b07cff' }[t.cls] || '#ffd166';
  }

  function tierBanner(tier) {
    const n = el('div', 'fx-tier ' + tier.cls, tier.name + (tier.cls === 't5' ? '!!!!' : tier.cls === 't4' ? '!!!' : tier.cls === 't3' ? '!!' : '!'));
    $('#fxlayer').appendChild(n);
    setTimeout(() => n.remove(), 1000);
  }

  function shockwave(ref, tier) {
    const r = ref.getBoundingClientRect();
    const w = el('div', 'shockwave' + (tier ? ' ' + tier.cls : ''));
    w.style.left = (r.left + r.width / 2) + 'px';
    w.style.top = (r.top + r.height / 2) + 'px';
    $('#fxlayer').appendChild(w);
    setTimeout(() => w.remove(), 700);
  }

  function flashScreen(alpha, color) {
    const f = $('#flash');
    if (!f) return;
    f.style.background = color || '#fff';
    f.style.opacity = Math.min(0.45, alpha);
    f.classList.remove('go');
    void f.offsetWidth;
    f.classList.add('go');
    setTimeout(() => { f.style.opacity = 0; }, 30);
  }

  /* confetti with a bit of gravity so it feels physical */
  function confetti(ref, count, cls) {
    const r = ref.getBoundingClientRect();
    const colors = ['#ffd166', '#ff4d6d', '#4cc9f0', '#7ee787', '#b07cff', '#fff'];
    for (let i = 0; i < count; i++) {
      const p = el('div', 'confetti ' + (cls || ''));
      p.style.left = (r.left + Math.random() * r.width) + 'px';
      p.style.top = (r.top + r.height / 2) + 'px';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.random() * 460 - 230) + 'px');
      p.style.setProperty('--dy', (-120 - Math.random() * 220) + 'px');
      p.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
      p.style.setProperty('--dur', (0.9 + Math.random() * 0.7) + 's');
      if (Math.random() < 0.4) p.style.borderRadius = '50%';
      $('#fxlayer').appendChild(p);
      setTimeout(() => p.remove(), 1800);
    }
  }

  function animateScoreTo(target) {
    const start = displayScore, t0 = performance.now(), dur = 240;
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
      toast('No moves left — cash out! <span class="quip">' + quip('stuck') + '</span>', 3400);
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

  /* a couple of embers flying from a trigger toward the score box */
  function spark(from) {
    const a = from.getBoundingClientRect(), b = $('#scorebox').getBoundingClientRect();
    for (let i = 0; i < 5; i++) {
      const p = el('div', 'ember');
      p.style.left = (a.left + a.width / 2) + 'px';
      p.style.top = (a.top + a.height / 2) + 'px';
      p.style.setProperty('--tx', (b.left + b.width / 2 - a.left - a.width / 2) + 'px');
      p.style.setProperty('--ty', (b.top + b.height / 2 - a.top - a.height / 2) + 'px');
      p.style.animationDelay = (i * 0.04) + 's';
      $('#fxlayer').appendChild(p);
      setTimeout(() => p.remove(), 700);
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

  /* ---------------- hints ---------------- */
  let hintTimer = null;
  function clearHints() {
    $$('.hinted,.hinted-dst').forEach(n => n.classList.remove('hinted', 'hinted-dst'));
    $$('.hint-label').forEach(n => n.remove());
    clearTimeout(hintTimer);
  }

  function showHint(srcNode, dstNode, label) {
    clearHints();
    if (srcNode) srcNode.classList.add('hinted');
    if (dstNode) dstNode.classList.add('hinted-dst');
    const anchor = srcNode || dstNode;
    if (anchor && label) {
      const tag = el('div', 'hint-label', label);
      const r = anchor.getBoundingClientRect();
      tag.style.left = (r.left + r.width / 2) + 'px';
      tag.style.top = (r.top - 26) + 'px';
      $('#fxlayer').appendChild(tag);
    }
    if (!srcNode && !dstNode) toast(label || 'Try that.');
    hintTimer = setTimeout(clearHints, 2600);
  }

  /* ---------------- the deal ----------------
     Every card flies out of the deck to its seat, in the order it was dealt. */
  function dealAnimation() {
    const stock = $('#stock');
    if (!stock) return;
    const from = stock.getBoundingClientRect();
    const cards = [];
    $$('#tableau .tab-pile').forEach((pile, col) => {
      Array.from(pile.children).forEach(n => {
        if (!n.classList.contains('card')) return;
        cards.push({ n, col, row: +(n.dataset.index || 0) });
      });
    });
    /* klondike deals across the columns, one row at a time */
    cards.sort((a, b) => (a.row - b.row) || (a.col - b.col));
    cards.forEach((c, i) => {
      const r = c.n.getBoundingClientRect();
      c.n.style.setProperty('--dx', Math.round(from.left - r.left) + 'px');
      c.n.style.setProperty('--dy', Math.round(from.top - r.top) + 'px');
      c.n.style.animationDelay = (i * 26) + 'ms';
      c.n.classList.add('dealing');
      setTimeout(() => Sfx.deal(), i * 26);
    });
    const last = cards.length * 26 + 260;
    setTimeout(() => { $$('.card.dealing').forEach(n => {
      n.classList.remove('dealing');
      n.style.animationDelay = '';
    }); }, last);
    return last;
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
    t.style.left = '-9999px';
    t.style.top = '0px';
    /* measure first, then place it wherever it actually fits */
    const r = ref.getBoundingClientRect();
    const tw = t.offsetWidth || 270;
    const th = t.offsetHeight || 160;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
    let top = r.bottom + 8;
    if (top + th > window.innerHeight - 8) {
      top = r.top - th - 8;                       // flip above
      if (top < 8) top = Math.max(8, window.innerHeight - th - 8);
    }
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }
  function hideTip() { const t = $('#tooltip'); if (t) t.classList.remove('show'); }

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
    renderCombo, flashScreen, confetti, rushFx, renderReshuffle, showHint, clearHints,
    installDragHandlers, cancelDrag, sweepGhosts, attachInspect, renderCut,
    startMomentumLoop, renderMomentum, momentumMult, dealAnimation,
    get busy() { return fxBusy; }
  };
})();
