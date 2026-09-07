/* ============================================================
   PILE-DRIVER  ::  game.js
   Move execution, round lifecycle, the shop, saves.
   Pushes visual events onto G.fx for ui.js to animate.
   ============================================================ */

const Game = (() => {
  const SAVE_KEY = 'piledriver.save.v1';

  const G = {
    run: null, board: null, round: null,
    phase: 'menu',            // menu | play | roundEnd | shop | gameOver | victory
    fx: [],                   // score packets waiting to be animated
    undoStack: [],
    pending: null,            // a tincture waiting for a card choice
    payout: null,
    lastResult: null
  };

  const push = p => { G.fx.push(p); return p; };

  /* ---------------- lifecycle ---------------- */
  function startRun() {
    G.run = Engine.newRun();
    G.undoStack = [];
    startRound();
  }

  function startRound() {
    const s = Engine.newRound(G.run);
    G.board = s.board;
    G.round = s.round;
    G.undoStack = [];
    G.phase = 'play';
    G.payout = null;
    save();
  }

  function quota() { return Engine.quotaFor(G.run); }
  function anteTotal() { return G.run.anteScore + (G.round ? G.round.score : 0); }

  /* ---------------- undo ---------------- */
  function snapshot() {
    G.undoStack.push(JSON.stringify({
      board: G.board,
      round: G.round,
      money: G.run.money,
      counters: G.run.mantel.map(c => c.counter)
    }));
    if (G.undoStack.length > 60) G.undoStack.shift();
  }

  function undo() {
    if (!G.undoStack.length || G.board.undos <= 0) return false;
    const s = JSON.parse(G.undoStack.pop());
    const undos = G.board.undos;
    G.board = s.board;
    G.round = s.round;
    G.board.undos = undos - 1;
    G.run.money = s.money;
    s.counters.forEach((v, i) => { if (G.run.mantel[i]) G.run.mantel[i].counter = v; });
    G.round.over = false;
    save();
    return true;
  }

  /* ---------------- scoring plumbing ---------------- */
  function scoreEvent(ev) {
    const packet = Score.event(G, ev);
    push(packet);
    if (ev.card && ev.card.enhancement === 'glass' && Math.random() < (G.run.luck || 1) / 5) {
      shatter(ev.card);
    }
    return packet;
  }

  function shatter(card) {
    const i = G.run.deck.findIndex(c => c.id === card.id);
    if (i >= 0) G.run.deck.splice(i, 1);
    card.shattered = true;
    push({ event: 'shatter', label: 'SHATTERED', card, chips: 0, mult: 0, total: 0, triggers: [] });
  }

  function breakCascade() {
    G.round.cascade = 0;
    G.round.suitRun = 0;
    G.round.lastSuit = null;
  }

  /* flip the newly exposed card of a column, score reveals + clears */
  function settleColumn(col) {
    const pile = G.board.tableau[col];
    if (pile.length) {
      const top = pile[pile.length - 1];
      if (!top.faceUp) {
        top.faceUp = true;
        scoreEvent({ event: 'reveal', card: null, anchor: { zone: 'tableau', col } });
      }
    } else {
      scoreEvent({ event: 'clear', anchor: { zone: 'tableau', col } });
    }
  }

  function checkSuitComplete(suit, anchor) {
    if (G.board.foundations[suit].length === 13) {
      G.run.stats.suitsDone++;
      scoreEvent({ event: 'suit', suit, anchor });
    }
  }

  /* ---------------- moves ---------------- */
  function drawStock() {
    if (G.phase !== 'play') return false;
    const b = G.board;
    const m = Engine.mods(G.run);
    if (!b.stock.length) {
      if (!b.waste.length) return false;
      if (b.passesLeft <= 0 && !m.infinitePasses) return false;
      snapshot();
      if (!m.infinitePasses) b.passesLeft--;
      b.stock = b.waste.reverse();
      b.stock.forEach(c => { c.faceUp = false; });
      b.waste = [];
      breakCascade();
      G.round.moves++;
      push({ event: 'recycle', label: 'RESHUFFLE', chips: 0, mult: 0, total: 0, triggers: [] });
      save();
      return true;
    }
    snapshot();
    const c = b.stock.pop();
    c.faceUp = true;
    b.waste.push(c);
    breakCascade();
    G.round.moves++;
    save();
    return true;
  }

  /*
    src: {zone:'waste'} | {zone:'tableau', col, index} | {zone:'foundation', suit}
    dst: {zone:'tableau', col} | {zone:'foundation', suit?}
  */
  function tryMove(src, dst) {
    if (G.phase !== 'play') return false;
    const b = G.board, m = Engine.mods(G.run);
    const cards = grab(src, m);
    if (!cards || !cards.length) return illegal();

    if (dst.zone === 'foundation') {
      if (cards.length !== 1) return illegal();
      const card = cards[0];
      const suit = dst.suit && Engine.canPlaceOnFoundation(b, card, dst.suit)
        ? dst.suit : Engine.foundationTargetFor(b, card);
      if (!suit) return illegal();
      snapshot();
      removeFrom(src, 1);
      const depth = b.foundations[suit].length;
      b.foundations[suit].push(card);
      G.round.moves++;
      G.round.scoredCards++;
      G.run.stats.cardsScored++;
      G.round.cascade++;
      const cardSuits = Engine.suitsOf(card);
      if (G.round.lastSuit && cardSuits.includes(G.round.lastSuit)) G.round.suitRun++;
      else G.round.suitRun = 1;
      G.round.lastSuit = suit;

      const anchor = { zone: 'foundation', suit };
      const replay = !!card.scoredRound;
      if (replay) {
        G.round.scoredCards--;
        G.round.cascade--;
        push({ event: 'replay', label: 'ALREADY PAID', card, chips: 0, mult: 0, total: 0, triggers: [], anchor });
      } else {
        card.scoredRound = true;
        scoreEvent({ event: 'foundation', card, fromZone: src.zone, depth, anchor });
      }

      /* Fuse cards detonate the card they were sitting on */
      if (card.enhancement === 'bomb' && src.zone === 'tableau') {
        const pile = b.tableau[src.col];
        const below = pile[pile.length - 1];
        if (below) {
          if (!below.faceUp) below.faceUp = true;
          scoreEvent({ event: 'foundation', card: below, fromZone: 'tableau', depth: 0,
                       label: 'BOOM!', anchor: { zone: 'tableau', col: src.col } });
        }
      }

      if (src.zone === 'tableau') settleColumn(src.col);
      checkSuitComplete(suit, anchor);
      afterMove();
      return true;
    }

    if (dst.zone === 'tableau') {
      const col = dst.col;
      if (src.zone === 'tableau' && src.col === col) return illegal();
      if (!Engine.canPlaceOnColumn(b, col, cards[0], m)) return illegal();
      snapshot();
      removeFrom(src, cards.length);
      cards.forEach(c => { c.faceUp = true; b.tableau[col].push(c); });
      G.round.moves++;
      breakCascade();
      if (src.zone === 'tableau') settleColumn(src.col);
      afterMove();
      return true;
    }
    return illegal();
  }

  function illegal() {
    G.round.illegal++;
    const sunk = G.run.mantel.find(c => c.id === 'sunk_cost');
    if (sunk) { sunk.counter = (sunk.counter || 0) + 2; push({ event: 'curioFlash', curio: 'sunk_cost' }); }
    push({ event: 'illegal', label: 'NOPE', chips: 0, mult: 0, total: 0, triggers: [] });
    return false;
  }

  function grab(src, m) {
    const b = G.board;
    if (src.zone === 'waste') {
      const c = b.waste[b.waste.length - 1];
      return c ? [c] : null;
    }
    if (src.zone === 'foundation') {
      const f = b.foundations[src.suit];
      const c = f[f.length - 1];
      return c ? [c] : null;
    }
    if (src.zone === 'tableau') {
      const pile = b.tableau[src.col];
      const idx = src.index != null ? src.index : pile.length - 1;
      if (!Engine.isRunFrom(b, src.col, idx, m)) return null;
      return pile.slice(idx);
    }
    return null;
  }

  function removeFrom(src, n) {
    const b = G.board;
    if (src.zone === 'waste') b.waste.splice(b.waste.length - n, n);
    else if (src.zone === 'foundation') b.foundations[src.suit].splice(b.foundations[src.suit].length - n, n);
    else if (src.zone === 'tableau') b.tableau[src.col].splice(b.tableau[src.col].length - n, n);
  }

  function afterMove() {
    save();
    if (Engine.isWon(G)) {
      G.round.won = true;
      endRound(true);
      return;
    }
    if (!Engine.anyMoveAvailable(G, G.run)) {
      G.round.stuck = true;
    } else {
      G.round.stuck = false;
    }
  }

  /* auto-play every card that can go straight home */
  function autoCollect() {
    let moved = 0, guard = 0;
    let again = true;
    while (again && guard++ < 300) {
      again = false;
      const b = G.board;
      for (let c = 0; c < b.tableau.length; c++) {
        const pile = b.tableau[c];
        if (!pile.length) continue;
        const top = pile[pile.length - 1];
        if (top.faceUp && Engine.foundationTargetFor(b, top)) {
          if (tryMove({ zone: 'tableau', col: c, index: pile.length - 1 }, { zone: 'foundation' })) { moved++; again = true; }
        }
      }
      const w = G.board.waste[G.board.waste.length - 1];
      if (w && Engine.foundationTargetFor(G.board, w)) {
        if (tryMove({ zone: 'waste' }, { zone: 'foundation' })) { moved++; again = true; }
      }
      if (G.phase !== 'play') break;
    }
    return moved;
  }

  function hint() {
    const b = G.board, m = Engine.mods(G.run);
    const w = b.waste[b.waste.length - 1];
    if (w && Engine.foundationTargetFor(b, w)) return { src: { zone: 'waste' }, dst: { zone: 'foundation' } };
    for (let c = 0; c < b.tableau.length; c++) {
      const pile = b.tableau[c];
      if (!pile.length) continue;
      const top = pile[pile.length - 1];
      if (top.faceUp && Engine.foundationTargetFor(b, top)) return { src: { zone: 'tableau', col: c, index: pile.length - 1 }, dst: { zone: 'foundation' } };
    }
    for (let c = 0; c < b.tableau.length; c++) {
      const pile = b.tableau[c];
      for (let i = 0; i < pile.length; i++) {
        if (!pile[i].faceUp || !Engine.isRunFrom(b, c, i, m)) continue;
        const gainsFlip = i > 0 && !pile[i - 1].faceUp;
        for (let d = 0; d < b.tableau.length; d++) {
          if (d === c) continue;
          if (!b.tableau[d].length && i === 0) continue;
          if (Engine.canPlaceOnColumn(b, d, pile[i], m)) {
            if (gainsFlip || !b.tableau[d].length || i === 0) return { src: { zone: 'tableau', col: c, index: i }, dst: { zone: 'tableau', col: d } };
          }
        }
      }
    }
    if (w) {
      for (let d = 0; d < b.tableau.length; d++) if (Engine.canPlaceOnColumn(b, d, w, m)) return { src: { zone: 'waste' }, dst: { zone: 'tableau', col: d } };
    }
    if (b.stock.length || b.waste.length) return { src: { zone: 'stock' } };
    return null;
  }

  /* ---------------- round end ---------------- */
  function endRound(won) {
    if (G.phase !== 'play') return;
    G.round.over = true;
    G.round.won = !!won || Engine.isWon(G);
    G.phase = 'roundEnd';
    G.payout = Score.payout(G);
    G.run.money += G.payout.total;
    G.run.anteScore += G.round.score;
    G.run.stats.roundsPlayed++;
    save();
  }

  function clearAnte() {
    const run = G.run;
    run.ante++;
    run.round = 1;
    run.anteScore = 0;
    run.mantel.forEach(inst => { if (inst.id === 'perpetual') inst.counter = 0; });
    if (run.ante > (run.finalAnte || TUNE.finalAnte)) { G.phase = 'victory'; save(); return; }
    openShop(true);
  }

  /* called from the round-end screen */
  function advance() {
    const run = G.run;
    if (run.round >= TUNE.roundsPerAnte) {
      if (run.anteScore >= Engine.quotaFor(run)) clearAnte();
      else { G.phase = 'gameOver'; save(); }
    } else {
      run.round++;
      openShop(false);
    }
  }

  /* quota already met with rounds to spare -- bank it and take the cash */
  function bankAnte() {
    const run = G.run;
    if (run.anteScore < Engine.quotaFor(run)) return false;
    const skipped = TUNE.roundsPerAnte - run.round;
    run.money += skipped * TUNE.skipBonus;
    clearAnte();
    return skipped * TUNE.skipBonus;
  }

  /* ---------------- the shop ---------------- */
  function weightedCurio(exclude) {
    const pool = CURIOS.filter(c => !exclude.has(c.id));
    if (!pool.length) return null;
    let total = 0;
    pool.forEach(c => { total += RARITY_WEIGHT[c.rarity]; });
    let r = Math.random() * total;
    for (const c of pool) { r -= RARITY_WEIGHT[c.rarity]; if (r <= 0) return c; }
    return pool[0];
  }

  function rollFinish() {
    const r = Math.random();
    if (r < 0.03) return 'neg';
    if (r < 0.07) return 'poly';
    if (r < 0.13) return 'holo';
    if (r < 0.21) return 'foil';
    return 'none';
  }

  function priceOf(item) {
    let base = item.cost;
    if (item.finish && item.finish !== 'none') base += { foil: 3, holo: 4, poly: 6, neg: 8 }[item.finish];
    const price = Math.max(1, Math.ceil(base * (1 - Math.min(0.75, G.run.discount))));
    return price;
  }

  function rollShopItems() {
    const owned = new Set(G.run.mantel.map(c => c.id));
    const items = [];
    const used = new Set();
    for (let i = 0; i < 4; i++) {
      if (Math.random() < 0.55) {
        const c = weightedCurio(new Set([...owned, ...used]));
        if (c) {
          used.add(c.id);
          items.push({ type: 'curio', id: c.id, cost: c.cost, finish: rollFinish() });
          continue;
        }
      }
      const t = TINCTURES[Math.floor(Math.random() * TINCTURES.length)];
      items.push({ type: 'tincture', id: t.id, cost: t.cost });
    }
    const avail = HOUSE_RULES.filter(h => (G.run.houseRules[h.id] || 0) < h.max);
    Engine.shuffle(avail);
    const houses = avail.slice(0, 2).map(h => ({ type: 'house', id: h.id, cost: h.cost }));
    return { items, houses };
  }

  function openShop(anteCleared) {
    const rolled = rollShopItems();
    G.run.shop = { items: rolled.items, houses: rolled.houses, rerolls: 0, sold: [] };
    G.run.anteCleared = !!anteCleared;
    G.phase = 'shop';
    save();
  }

  function rerollCost() {
    return Math.max(1, Math.ceil((TUNE.rerollBase + TUNE.rerollStep * G.run.shop.rerolls) * (1 - Math.min(0.75, G.run.discount))));
  }

  function reroll() {
    const cost = rerollCost();
    if (G.run.money < cost) return false;
    G.run.money -= cost;
    const rolled = rollShopItems();
    G.run.shop.items = rolled.items;
    G.run.shop.rerolls++;
    save();
    return true;
  }

  function effectiveSlots() {
    return G.run.mantelSlots + G.run.mantel.filter(c => c.finish === 'neg').length;
  }

  function buy(index, kind) {
    const shop = G.run.shop;
    const list = kind === 'house' ? shop.houses : shop.items;
    const item = list[index];
    if (!item || item.bought) return { ok: false, reason: 'gone' };
    const price = priceOf(kind === 'house' ? Object.assign({}, item, { cost: HOUSE_BY_ID[item.id].cost }) : item);
    if (G.run.money < price) return { ok: false, reason: 'Not enough cash.' };

    if (item.type === 'curio') {
      const slots = effectiveSlots() + (item.finish === 'neg' ? 1 : 0);
      if (G.run.mantel.length >= slots) return { ok: false, reason: 'Your mantel is full. Sell something first.' };
      const def = CURIO_BY_ID[item.id];
      G.run.money -= price;
      G.run.mantel.push({ id: item.id, finish: item.finish || 'none', counter: def.counter != null ? def.counter : 0, paid: price });
      item.bought = true;
      save();
      return { ok: true, kind: 'curio' };
    }
    if (item.type === 'house') {
      const def = HOUSE_BY_ID[item.id];
      G.run.money -= price;
      def.apply(G.run);
      G.run.houseRules[item.id] = (G.run.houseRules[item.id] || 0) + 1;
      item.bought = true;
      save();
      return { ok: true, kind: 'house' };
    }
    if (item.type === 'tincture') {
      const def = TINCTURE_BY_ID[item.id];
      if (def.kind === 'add') {
        G.run.money -= price;
        const spec = def.build();
        G.run.deck.push(Engine.newCard(spec.rank, spec.suit, {
          enhancement: spec.enhancement || 'none', finish: spec.finish || 'none', seal: spec.seal || 'none'
        }));
        item.bought = true;
        save();
        return { ok: true, kind: 'card' };
      }
      // needs a card chosen from the deck
      G.pending = { itemIndex: index, def };
      return { ok: true, kind: 'select', def, price };
    }
    return { ok: false, reason: 'nope' };
  }

  function applyPending(cardId) {
    if (!G.pending) return false;
    const { itemIndex, def } = G.pending;
    const item = G.run.shop.items[itemIndex];
    if (!item || item.bought) { G.pending = null; return false; }
    const price = priceOf(item);
    if (G.run.money < price) { G.pending = null; return false; }
    const idx = G.run.deck.findIndex(c => c.id === cardId);
    if (idx < 0) return false;
    const card = G.run.deck[idx];

    if (def.kind === 'enhance') card.enhancement = def.value;
    else if (def.kind === 'finish') card.finish = def.value;
    else if (def.kind === 'seal') card.seal = def.value;
    else if (def.kind === 'remove') G.run.deck.splice(idx, 1);
    else if (def.kind === 'duplicate') {
      G.run.deck.push(Engine.newCard(card.rank, card.suit, {
        enhancement: card.enhancement, finish: card.finish, seal: card.seal
      }));
    }
    G.run.money -= price;
    item.bought = true;
    G.pending = null;
    save();
    return true;
  }

  function cancelPending() { G.pending = null; }

  function sellCurio(index) {
    const inst = G.run.mantel[index];
    if (!inst) return false;
    const def = CURIO_BY_ID[inst.id];
    const value = def.sellsFull ? (inst.paid || def.cost) : Math.max(1, Math.floor((inst.paid || def.cost) / 2));
    G.run.money += value;
    G.run.mantel.splice(index, 1);
    save();
    return value;
  }

  function reorderCurio(from, to) {
    if (from === to || from < 0 || to < 0) return;
    const arr = G.run.mantel;
    if (from >= arr.length || to >= arr.length) return;
    const [x] = arr.splice(from, 1);
    arr.splice(to, 0, x);
    save();
  }

  function leaveShop() {
    G.run.shop = null;
    startRound();
  }

  /* ---------------- persistence ---------------- */
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        run: G.run, board: G.board, round: G.round, phase: G.phase, payout: G.payout
      }));
    } catch (e) { /* private mode, whatever */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s || !s.run) return false;
      G.run = s.run; G.board = s.board; G.round = s.round;
      G.phase = s.phase === 'menu' ? 'play' : s.phase;
      G.payout = s.payout || null;
      // keep new fields alive across versions
      const fresh = Engine.newRun();
      for (const k in fresh) if (G.run[k] === undefined) G.run[k] = fresh[k];
      return true;
    } catch (e) { return false; }
  }

  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  return {
    G, startRun, startRound, quota, anteTotal, drawStock, tryMove, autoCollect, hint,
    undo, endRound, advance, openShop, reroll, rerollCost, buy, applyPending, cancelPending,
    sellCurio, reorderCurio, leaveShop, priceOf, effectiveSlots, save, load, clearSave, snapshot,
    bankAnte, clearAnte
  };
})();
