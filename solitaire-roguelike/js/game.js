/* ============================================================
   PILE-DRIVER  ::  game.js
   Move execution, round lifecycle, the shop, saves.
   Pushes visual events onto G.fx for ui.js to animate.
   ============================================================ */

const Game = (() => {
  const SAVE_KEY = 'piledriver.save.v2';

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
    /* from Ante 2 the table starts having opinions */
    G.run.whim = G.run.ante >= TUNE.whimsFromAnte ? WHIMS[Math.floor(Math.random() * WHIMS.length)].id : null;
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
    } else if (!G.round.paidClears.includes(col)) {
      G.round.paidClears.push(col);
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
    const n = Math.min(Engine.drawCount(G.run), b.stock.length);
    const turned = [];
    for (let i = 0; i < n; i++) {
      const c = b.stock.pop();
      c.faceUp = true;
      b.waste.push(c);
      turned.push(c);
    }
    breakCascade();
    G.round.moves++;
    push({ event: 'draw', count: n, cards: turned, chips: 0, mult: 0, total: 0, triggers: [] });
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
      let suit = dst.suit && Engine.canPlaceOnFoundation(b, card, dst.suit)
        ? dst.suit : Engine.foundationTargetFor(b, card);
      let twin = false;
      if (!suit) {
        suit = dst.suit && Engine.canTwin(b, card, dst.suit) ? dst.suit : Engine.twinTargetFor(b, card);
        twin = !!suit;
      }
      if (!suit) return illegal();
      snapshot();
      let stack = null;
      if (src.zone === 'tableau') {
        const runCards = Engine.runCards(b, src.col, m);
        stack = { length: runCards.length, value: runCards.reduce((a, c) => a + rankChips(c.rank), 0) };
      }
      removeFrom(src, 1);
      const depth = b.foundations[suit].length;
      if (twin) {
        if (!b.twins) b.twins = { S: [], H: [], D: [], C: [] };
        b.twins[suit].push(card);
      } else {
        b.foundations[suit].push(card);
      }
      G.round.moves++;
      G.round.scoredCards++;
      G.run.stats.cardsScored++;
      G.round.cascade++;
      if (G.round.cascade > 0 && G.round.cascade % TUNE.cascadeCashEvery === 0) {
        G.run.money += 1;
        G.round.money += 1;
        push({ event: 'cash', label: 'CASCADE X' + G.round.cascade, amount: 1,
               anchor: { zone: 'foundation', suit }, chips: 0, mult: 0, total: 0, triggers: [] });
      }
      if (stack && stack.length >= TUNE.stackCashAt) {
        const amt = stack.length >= TUNE.stackCashBigAt ? 2 : 1;
        G.run.money += amt;
        G.round.money += amt;
        push({ event: 'cash', label: 'RUN OF ' + stack.length, amount: amt,
               anchor: { zone: 'tableau', col: src.col }, chips: 0, mult: 0, total: 0, triggers: [] });
      }
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
        scoreEvent({ event: 'foundation', card, fromZone: src.zone, depth: twin ? Math.max(0, depth - 1) : depth,
                     anchor, stack, twin, label: twin ? 'TWIN!' : null });
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

      if (card.enhancement === 'riffle' && !replay) {
        doReshuffle();
        push({ event: 'cash', label: 'RIFFLE — STOCK RESHUFFLED', amount: 0,
               anchor: { zone: 'stock' }, chips: 0, mult: 0, total: 0, triggers: [] });
      }
      if (src.zone === 'tableau') settleColumn(src.col);
      if (!twin) checkSuitComplete(suit, anchor);
      afterMove();
      return true;
    }

    if (dst.zone === 'tableau') {
      const col = dst.col;
      if (src.zone === 'tableau' && src.col === col) return illegal();
      /* shuffling a whole column into another empty column changes nothing and used to
         re-trigger the cleared-column bonus, so it is not a legal move */
      if (src.zone === 'tableau' && src.index === 0 && !b.tableau[col].length) {
        push({ event: 'nudge', label: 'THAT CHANGES NOTHING', chips: 0, mult: 0, total: 0, triggers: [] });
        return false;
      }
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
      const allowed = Engine.playableWaste(b, m);
      const idx = src.index != null ? src.index : b.waste.length - 1;
      const hit = allowed.find(w => w.index === idx);
      return hit ? [hit.card] : null;
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
    if (src.zone === 'waste') b.waste.splice(src.index != null ? src.index : b.waste.length - n, n);
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

  /* ---------------- the furnace ----------------
     An exit for cards you will never place -- a fourth Queen, a duplicate that
     the foundation has not reached yet. Burning clears it for this round only;
     the card is back in the deck next round.                                  */
  function canBurn(src) {
    if (G.phase !== 'play' || !G.board.burnsLeft) return false;
    const b = G.board;
    if (src.zone === 'waste') {
      const allowed = Engine.playableWaste(b, Engine.mods(G.run));
      const idx = src.index != null ? src.index : b.waste.length - 1;
      return allowed.some(w => w.index === idx);
    }
    if (src.zone === 'tableau') {
      const pile = b.tableau[src.col];
      return pile.length > 0 && src.index === pile.length - 1 && pile[src.index].faceUp;
    }
    return false;
  }

  function burn(src) {
    if (!canBurn(src)) { illegal(); return false; }
    const b = G.board;
    const cards = grab(src, Engine.mods(G.run));
    if (!cards || cards.length !== 1) { illegal(); return false; }
    snapshot();
    const card = cards[0];
    removeFrom(src, 1);
    b.furnace.push(card);
    b.burnsLeft--;
    G.round.moves++;
    const m = Engine.mods(G.run);
    const mult = m.furnaceDouble ? 2 : 1;
    const chips = (rankChips(card.rank) * TUNE.furnaceChipsPerRank + TUNE.furnaceFlat) * mult;
    G.run.money += mult;
    G.round.money += mult;
    scoreEvent({ event: 'burn', card, fromZone: src.zone, baseChips: chips,
                 label: 'BURNED!', anchor: { zone: 'furnace' } });
    push({ event: 'cash', label: 'FURNACE', amount: mult,
           anchor: { zone: 'furnace' }, chips: 0, mult: 0, total: 0, triggers: [] });
    if (src.zone === 'tableau') settleColumn(src.col);
    afterMove();
    return true;
  }

  /* ---------------- reshuffles ----------------
     Puts the waste back under the stock and shuffles the lot, WITHOUT spending
     a pass. Free ones come from Curios and the Counter; after those you can pay
     in cash or, if you are broke, in score.                                    */
  function reshuffleCost() {
    const n = G.board ? G.board.paidReshuffles : 0;
    return {
      free: G.board ? G.board.freeReshuffles : 0,
      cash: TUNE.reshuffleCash + TUNE.reshuffleCashStep * n,
      points: TUNE.reshufflePoints + TUNE.reshufflePointsStep * n
    };
  }

  function reshuffle(how) {
    if (G.phase !== 'play') return { ok: false, reason: 'Not now.' };
    const b = G.board;
    if (!b.stock.length && !b.waste.length) return { ok: false, reason: 'Nothing to shuffle.' };
    const cost = reshuffleCost();
    if (how === 'free') {
      if (b.freeReshuffles <= 0) return { ok: false, reason: 'No free reshuffles left.' };
      b.freeReshuffles--;
    } else if (how === 'cash') {
      if (G.run.money < cost.cash) return { ok: false, reason: 'Not enough cash.' };
      G.run.money -= cost.cash;
      b.paidReshuffles++;
    } else if (how === 'points') {
      if (G.round.score < cost.points) return { ok: false, reason: 'Not enough score banked.' };
      G.round.score -= cost.points;
      b.paidReshuffles++;
    } else return { ok: false, reason: 'nope' };

    doReshuffle();
    return { ok: true, how };
  }

  function doReshuffle() {
    const b = G.board;
    snapshot();
    const all = b.stock.concat(b.waste);
    all.forEach(c => { c.faceUp = false; });
    b.stock = Engine.shuffle(all);
    b.waste = [];
    breakCascade();
    G.round.moves++;
    push({ event: 'reshuffle', label: 'RESHUFFLED', chips: 0, mult: 0, total: 0, triggers: [] });
    save();
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
        if (top.faceUp && (Engine.foundationTargetFor(b, top) || Engine.twinTargetFor(b, top))) {
          if (tryMove({ zone: 'tableau', col: c, index: pile.length - 1 }, { zone: 'foundation' })) { moved++; again = true; }
        }
      }
      const w = G.board.waste[G.board.waste.length - 1];
      if (w && (Engine.foundationTargetFor(G.board, w) || Engine.twinTargetFor(G.board, w))) {
        if (tryMove({ zone: 'waste' }, { zone: 'foundation' })) { moved++; again = true; }
      }
      if (G.phase !== 'play') break;
    }
    return moved;
  }

  function hint() {
    const b = G.board, m = Engine.mods(G.run);
    const w = b.waste[b.waste.length - 1];
    if (w && (Engine.foundationTargetFor(b, w) || Engine.twinTargetFor(b, w))) return { src: { zone: 'waste' }, dst: { zone: 'foundation' } };
    for (let c = 0; c < b.tableau.length; c++) {
      const pile = b.tableau[c];
      if (!pile.length) continue;
      const top = pile[pile.length - 1];
      if (top.faceUp && (Engine.foundationTargetFor(b, top) || Engine.twinTargetFor(b, top))) return { src: { zone: 'tableau', col: c, index: pile.length - 1 }, dst: { zone: 'foundation' } };
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
  /* Four clearly separated shelves:
       curios  -> take a seat on the mantel
       mods    -> permanently mark a card you already own
       cards   -> add a brand new card to the deck
       houses  -> permanent run rules, no seat needed              */
  const SHELVES = { curio: 'curios', mod: 'mods', card: 'cards', house: 'houses' };

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
    const base = item.type === 'house' ? HOUSE_BY_ID[item.id].cost
               : item.type === 'curio' ? CURIO_BY_ID[item.id].cost
               : SHOP_BY_ID[item.id].cost;
    let p = base;
    if (item.finish && item.finish !== 'none') p += { foil: 3, holo: 4, poly: 6, neg: 8 }[item.finish];
    return Math.max(1, Math.ceil(p * (1 - Math.min(0.75, G.run.discount))));
  }

  function pickN(pool, n, type) {
    const copy = pool.slice();
    Engine.shuffle(copy);
    return copy.slice(0, n).map(d => {
      const item = { type, id: d.id, cost: d.cost };
      /* roll the real card now, so what the shop shows is what you buy */
      if (d.kind === 'add') item.spec = d.build();
      return item;
    });
  }

  function rollShopItems() {
    const owned = new Set(G.run.mantel.map(c => c.id));
    const used = new Set();
    const curios = [];
    for (let i = 0; i < 2; i++) {
      const c = weightedCurio(new Set([...owned, ...used]));
      if (!c) break;
      used.add(c.id);
      curios.push({ type: 'curio', id: c.id, cost: c.cost, finish: rollFinish() });
    }
    const avail = HOUSE_RULES.filter(h => (G.run.houseRules[h.id] || 0) < h.max);
    return {
      curios,
      mods: pickN(CARD_MODS, 2, 'mod'),
      cards: pickN(NEW_CARDS, 2, 'card'),
      houses: pickN(avail, 2, 'house')
    };
  }

  function openShop(anteCleared) {
    const r = rollShopItems();
    G.run.shop = { curios: r.curios, mods: r.mods, cards: r.cards, houses: r.houses, rerolls: 0, pulls: 0 };
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
    const r = rollShopItems();
    const shop = G.run.shop;
    /* keep anything already bought marked as sold so the shelf reads honestly */
    ['curios', 'mods', 'cards', 'houses'].forEach(k => { shop[k] = r[k]; });
    shop.rerolls++;
    save();
    return true;
  }

  function effectiveSlots() {
    return G.run.mantelSlots + G.run.mantel.filter(c => c.finish === 'neg').length;
  }

  function buy(shelf, index) {
    const list = G.run.shop[SHELVES[shelf]];
    const item = list && list[index];
    if (!item || item.bought) return { ok: false, reason: 'Already gone.' };
    const price = priceOf(item);
    if (G.run.money < price) return { ok: false, reason: 'Not enough cash for that.' };

    if (item.type === 'curio') {
      const slots = effectiveSlots() + (item.finish === 'neg' ? 1 : 0);
      if (G.run.mantel.length >= slots) return { ok: false, reason: 'Every mantel seat is taken. Sell a Curio first.' };
      const def = CURIO_BY_ID[item.id];
      G.run.money -= price;
      G.run.mantel.push({ id: item.id, finish: item.finish || 'none', counter: def.counter != null ? def.counter : 0, paid: price });
      item.bought = true;
      save();
      return { ok: true, kind: 'curio' };
    }

    if (item.type === 'house') {
      G.run.money -= price;
      HOUSE_BY_ID[item.id].apply(G.run);
      G.run.houseRules[item.id] = (G.run.houseRules[item.id] || 0) + 1;
      item.bought = true;
      save();
      return { ok: true, kind: 'house' };
    }

    const def = SHOP_BY_ID[item.id];
    if (def.kind === 'add') {
      G.run.money -= price;
      const spec = item.spec || def.build();
      const card = Engine.newCard(spec.rank, spec.suit, {
        enhancement: spec.enhancement || 'none', finish: spec.finish || 'none', seal: spec.seal || 'none'
      });
      G.run.deck.push(card);
      item.bought = true;
      save();
      return { ok: true, kind: 'card', card };
    }

    /* everything left needs the player to point at a card in their deck */
    G.pending = { shelf, index, def };
    return { ok: true, kind: 'select', def, price };
  }

  function applyPending(cardId) {
    if (!G.pending) return false;
    const { shelf, index, def } = G.pending;
    const item = G.run.shop[SHELVES[shelf]][index];
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

  /* ---------------- the counter: permanent, escalating ---------------- */
  function buyCounter(id) {
    const def = COUNTER_BY_ID[id];
    if (!def) return { ok: false, reason: 'No such upgrade.' };
    if (def.soldOut && def.soldOut(G.run)) return { ok: false, reason: 'Maxed out already.' };
    const price = counterPrice(G.run, id);
    if (G.run.money < price) return { ok: false, reason: 'Not enough cash for that.' };
    G.run.money -= price;
    def.apply(G.run);
    G.run.counterBought[id] = (G.run.counterBought[id] || 0) + 1;
    save();
    return { ok: true, price, next: counterPrice(G.run, id) };
  }

  /* ---------------- the one-armed bandit ---------------- */
  function banditPrice() {
    const m = Engine.mods(G.run);
    const pulls = G.run.shop ? (G.run.shop.pulls || 0) : 0;
    const raw = TUNE.banditBase + TUNE.banditStep * pulls - (m.banditLuck ? 3 : 0);
    return Math.max(1, Math.ceil(raw * (1 - Math.min(0.75, G.run.discount))));
  }

  function spinReel(lucky) {
    /* weighted pick; the Magnet curio tilts the reels toward the good stuff */
    const pool = REEL_SYMBOLS.map(s => ({ s: s.s, w: lucky && s.s !== '☠' ? s.w * 2 : s.w }));
    let total = 0;
    pool.forEach(p => { total += p.w; });
    let r = Math.random() * total;
    for (const p of pool) { r -= p.w; if (r <= 0) return p.s; }
    return pool[0].s;
  }

  function pullLever() {
    const price = banditPrice();
    if (G.run.money < price) return { ok: false, reason: 'Not enough cash to pull.' };
    const m = Engine.mods(G.run);
    G.run.money -= price;
    G.run.shop.pulls = (G.run.shop.pulls || 0) + 1;
    G.run.banditPulls = (G.run.banditPulls || 0) + 1;

    const reels = [spinReel(m.banditLuck), spinReel(m.banditLuck), spinReel(m.banditLuck)];
    const result = resolveSpin(reels);
    save();
    return { ok: true, reels, result, price };
  }

  function resolveSpin(reels) {
    const [a, b2, c] = reels;
    const three = a === b2 && b2 === c;
    const two = !three && (a === b2 || b2 === c || a === c);

    if (three) {
      const prize = BANDIT_PRIZES[a];
      const out = { kind: 'jackpot', symbol: a, name: prize.name, text: prize.text, lines: [] };
      if (a === '7') {
        const owned = new Set(G.run.mantel.map(x => x.id));
        const pool = CURIOS.filter(x => !owned.has(x.id));
        if (G.run.mantel.length < effectiveSlots() && pool.length) {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          G.run.mantel.push({ id: pick.id, finish: 'none', counter: pick.counter != null ? pick.counter : 0, paid: pick.cost });
          out.lines.push('A free ' + pick.name + ' appears on your mantel.');
        } else {
          G.run.money += 30;
          out.lines.push('No room on the mantel — the machine pays $30 instead.');
        }
      } else if (a === '★') {
        const pool = G.run.deck.filter(x => x.finish !== 'poly' || x.enhancement !== 'gilded');
        if (pool.length) {
          const card = pool[Math.floor(Math.random() * pool.length)];
          card.finish = 'poly'; card.enhancement = 'gilded';
          out.lines.push('Your ' + RANK_NAMES[card.rank] + SUITS[card.suit].sym + ' is now Gilded and Polychrome.');
        }
      } else if (a === '$') {
        G.run.money += 35;
        out.lines.push('+$35.');
      } else if (a === '♠') {
        G.run.permaMult += 3;
        out.lines.push('+3 Mult on every score, permanently (now +' + G.run.permaMult + ').');
      } else if (a === '♥') {
        G.run.mantelSlots = Math.min(TUNE.maxMantelSlots, G.run.mantelSlots + 1);
        G.run.bonusPasses++;
        out.lines.push('+1 Mantel seat and +1 stock pass, permanently.');
      } else if (a === '☠') {
        const lost = Math.floor(G.run.money / 2);
        G.run.money -= lost;
        out.lines.push('The house takes $' + lost + '.');
      }
      return out;
    }

    if (two) {
      G.run.money += 6;
      return { kind: 'pair', name: 'TWO OF A KIND', text: 'Small mercies.', lines: ['+$6.'] };
    }
    G.run.money += 1;
    return { kind: 'none', name: 'NOTHING', text: 'The reels do not care about you.', lines: ['+$1 consolation.'] };
  }

  function leaveShop() {
    G.run.shop = null;
    startRound();
  }

  /* what CASH OUT would pay right now -- drives the live button label */
  function payoutPreview() {
    if (!G.board || !G.round) return { lines: [], total: 0 };
    return Score.payout(G);
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
    bankAnte, clearAnte, payoutPreview, SHELVES, buyCounter, banditPrice, pullLever,
    canBurn, burn, reshuffle, reshuffleCost
  };
})();
