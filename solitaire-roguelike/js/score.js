/* ============================================================
   PILE-DRIVER  ::  score.js
   The Chips x Mult pipeline. Every scoring event walks through
   card -> enhancement -> finish -> seal -> combo -> curios.
   ============================================================ */

const Score = (() => {

  function makeCtx(G, ev) {
    const run = G.run, board = G.board, round = G.round;
    const ctx = {
      event: ev.event,
      card: ev.card || null,
      fromZone: ev.fromZone || null,
      run, board, round,
      chips: 0, mult: 1,
      triggers: [],
      _src: null,

      addChips(n) {
        if (!n) return;
        ctx.chips += n;
        ctx.triggers.push({ kind: 'chips', amount: n, src: ctx._src });
      },
      addMult(n) {
        if (!n) return;
        ctx.mult += n;
        ctx.triggers.push({ kind: 'mult', amount: n, src: ctx._src });
      },
      xMult(n) {
        if (n === 1 || n == null) return;
        ctx.mult *= n;
        ctx.triggers.push({ kind: 'xmult', amount: n, src: ctx._src });
      },
      money(n) {
        if (!n) return;
        run.money += n;
        round.money += n;
        ctx.triggers.push({ kind: 'money', amount: n, src: ctx._src });
      },
      flash() {
        ctx.triggers.push({ kind: 'flash', src: ctx._src });
      },
      chance(n) {
        return Math.random() < (run.luck || 1) / n;
      },
      /* --- board queries used by curios --- */
      isRed: c => c && Engine.isRed(c),
      hasSuit: (c, s) => !!c && Engine.suitsOf(c).includes(s),
      faceDownCount: () => board.tableau.reduce((a, p) => a + p.filter(c => !c.faceUp).length, 0),
      emptyColumns: () => board.tableau.filter(p => !p.length).length,
      wasteCount: () => board.waste.length,
      stockCount: () => board.stock.length,
      foundationCount: s => board.foundations[s].length,
      completedSuits: () => SUIT_KEYS.filter(s => board.foundations[s].length >= 13).length,
      shortestFoundation: () => Math.min.apply(null, SUIT_KEYS.map(s => board.foundations[s].length)),
      tallestColumn: () => board.tableau.reduce((a, p) => Math.max(a, p.length), 0),
      self: null
    };
    return ctx;
  }

  /* run one pass of card-intrinsic effects */
  function cardPass(ctx) {
    const card = ctx.card;
    if (!card) return;
    ctx._src = { type: 'card', id: card.id };

    if (card.oddity) {
      const od = ODDITIES[card.oddity];
      if (od) {
        if (ctx.event !== 'stash') ctx.addChips(od.chips + TUNE.chipsPerDepth * (ctx.depth || 0));
        if (od.score) od.score(ctx);
      }
    } else if (ctx.event !== 'stash') {
      ctx.addChips(rankChips(card.rank) + TUNE.chipsPerDepth * (ctx.depth || 0));
    }

    switch (card.enhancement) {
      case 'gilded':  ctx.addChips(50); break;
      case 'voltaic': ctx.addMult(4); break;
      case 'glass':   ctx.xMult(2); break;
      case 'phantom': ctx.addMult(2); break;
      case 'riffle':  ctx.addMult(2); break;
      case 'bomb':    ctx.addChips(30); break;
      case 'bullion': ctx.money(4); break;
      case 'steel':   if (ctx.fromZone === 'tableau') ctx.xMult(1.5); break;
      case 'lucky':
        if (ctx.chance(4)) { ctx.addMult(20); ctx.flash(); }
        if (ctx.chance(8)) { ctx.money(3); }
        break;
    }
    switch (card.finish) {
      case 'foil': ctx.addChips(60); break;
      case 'holo': ctx.addMult(12); break;
      case 'poly': ctx.xMult(1.5); break;
    }
    switch (card.seal) {
      case 'gold': ctx.money(4); break;
      case 'blue': ctx.addChips(30); break;
    }
    ctx._src = null;
  }

  /* run every curio's score hook, honouring Copycat */
  function curioPass(ctx) {
    const run = ctx.run;
    run.mantel.forEach((inst, idx) => {
      let def = CURIO_BY_ID[inst.id];
      let self = inst;
      if (def && def.mods && def.mods.copyLeft) {
        const left = run.mantel[idx - 1];
        if (!left) return;
        def = CURIO_BY_ID[left.id];
        self = left;
        if (!def) return;
      }
      if (!def) return;
      ctx._src = { type: 'curio', index: idx };
      ctx.self = self;
      if (def.hooks && def.hooks.score) def.hooks.score(ctx);
      // finishes on the curio itself
      if (inst.finish === 'foil') ctx.addChips(60);
      if (inst.finish === 'holo') ctx.addMult(12);
      if (inst.finish === 'poly') ctx.xMult(1.5);
      if (run.curioBonusMult) ctx.addMult(run.curioBonusMult);
      ctx._src = null;
      ctx.self = null;
    });
  }

  /* the round's Whim scores alongside the Curios */
  function whimPass(ctx) {
    const w = ctx.run.whim && WHIM_BY_ID[ctx.run.whim];
    if (!w || !w.hooks || !w.hooks.score) return;
    ctx._src = { type: 'whim' };
    w.hooks.score(ctx);
    ctx._src = null;
  }

  /* permanent Mult bought or won during the run */
  function permaPass(ctx) {
    ctx._src = { type: 'combo' };
    if (ctx.run.permaMult) ctx.addMult(ctx.run.permaMult);
    if (ctx.round.wellMult) ctx.addMult(ctx.round.wellMult);
    if (ctx.round.blessing && ctx.event === 'foundation') ctx.xMult(ctx.round.blessing);
    if (ctx.round.heat) {
      const per = TUNE.heatMultPer + Engine.mods(ctx.run).heatPer;
      ctx.xMult(+(1 + per * ctx.round.heat).toFixed(2));
    }
    /* TEMPO: play quickly and everything is worth more. Never a penalty. */
    if (ctx.round.momentum > 4) {
      ctx.xMult(+(1 + (ctx.round.momentum / 100) * TUNE.momentumMaxMult).toFixed(2));
    }
    ctx._src = null;
  }

  /* combo layer: Cascade + Suit Run + the Column Stack you scored off */
  function comboPass(ctx) {
    const m = Engine.mods(ctx.run);
    ctx._src = { type: 'combo' };
    if (ctx.round.cascade > 1) ctx.addMult(ctx.round.cascade * m.cascadeMult);
    if (ctx.round.suitRun > 1) ctx.addMult(ctx.round.suitRun * 2 * m.suitRunMult);
    /* the longer and richer the face-up run you built, the bigger the cash-in */
    if (ctx.stack && ctx.stack.length > 1) {
      ctx.addChips(Math.round(ctx.stack.value * TUNE.stackChipScale));
      ctx.addMult((ctx.stack.length - 1) * TUNE.stackMultPer * m.stackMult);
    }
    /* the payoff for holding a card back until the moment was right */
    if (ctx.fromStash) {
      ctx.addMult(TUNE.stashPlayMult);
      const spm = Engine.mods(ctx.run).stashPlayMult;
      if (spm) ctx.xMult(spm);
    }
    /* dropping a duplicate onto its twin */
    if (ctx.twin) {
      ctx.addMult(TUNE.twinMultBonus);
      if (m.twinMult !== 1) ctx.xMult(m.twinMult);
    }
    ctx._src = null;
  }

  /*
    Score one event.
    ev = { event:'foundation'|'reveal'|'clear'|'suit', card, fromZone, depth, label }
  */
  function event(G, ev) {
    const ctx = makeCtx(G, ev);
    ctx.depth = ev.depth || 0;
    ctx.stack = ev.stack || null;
    ctx.twin = !!ev.twin;
    ctx.fromStash = !!ev.fromStash;
    const m = Engine.mods(G.run);

    G.round.scoreEvents++;

    let base = { chips: 0, mult: 1 };
    if (ev.event === 'reveal') base = { chips: m.noRevealScore ? 0 : TUNE.revealChips, mult: m.noRevealScore ? 0 : 1 };
    if (ev.event === 'clear')  base = { chips: TUNE.clearChips, mult: TUNE.clearMult };
    if (ev.event === 'suit')   base = { chips: TUNE.suitDoneChips, mult: TUNE.suitDoneMult };
    if (ev.event === 'stash')  base = { chips: ev.baseChips || 0, mult: 1 };
    if (ev.event === 'bounty') base = { chips: ev.baseChips || 0, mult: 1 };
    ctx.chips = base.chips;
    ctx.mult = base.mult;

    let retriggers = 1;
    if (ev.card && ev.card.seal === 'red') retriggers += 1;
    if (ev.event === 'foundation' && G.round.scoredCards === 1 && m.firstRetrigger) retriggers += m.firstRetrigger;

    for (let t = 0; t < retriggers; t++) {
      cardPass(ctx);
      if (ev.event === 'foundation') comboPass(ctx);
      permaPass(ctx);
      whimPass(ctx);
      curioPass(ctx);
      if (t > 0) ctx.triggers.push({ kind: 'retrigger', src: { type: 'card', id: ev.card ? ev.card.id : null } });
    }

    ctx.mult = Math.max(0, ctx.mult);
    const total = Math.round(ctx.chips * ctx.mult);
    G.round.score += total;
    G.run.stats.best = Math.max(G.run.stats.best, total);

    return {
      event: ev.event,
      label: ev.label || labelFor(ev),
      card: ev.card || null,
      chips: Math.round(ctx.chips),
      mult: +ctx.mult.toFixed(2),
      total,
      triggers: ctx.triggers,
      anchor: ev.anchor || null
    };
  }

  function labelFor(ev) {
    if (ev.event === 'reveal') return 'FLIP!';
    if (ev.event === 'clear') return 'COLUMN CLEARED!';
    if (ev.event === 'suit') return SUITS[ev.suit].name.toUpperCase() + ' COMPLETE!';
    return null;
  }

  /* end-of-round payout. Called live during play for the CASH OUT preview too. */
  function payout(G) {
    const run = G.run, b = G.board;
    const m = Engine.mods(run);
    const lines = [];
    let total = 0;

    const base = TUNE.baseMoney + run.bonusMoney;
    lines.push({ label: 'Round played', amount: base }); total += base;

    /* the big one: you get paid for how hard you actually scored, measured
       against this ante's quota so it stays meaningful at every ante */
    const quota = Engine.quotaFor(run);
    const commission = Math.min(TUNE.commissionCap, Math.floor(G.round.score / (quota / TUNE.commissionDivisor)));
    if (commission > 0) {
      lines.push({
        label: 'Scoring commission (' + Math.round(G.round.score / quota * 100) + '% of quota)',
        amount: commission, big: true
      });
      total += commission;
    }

    const empties = b.tableau.filter(p => !p.length).length;
    if (empties) { const a = empties * TUNE.moneyPerEmptyColumn; lines.push({ label: empties + ' empty column' + (empties > 1 ? 's' : ''), amount: a }); total += a; }

    const suits = SUIT_KEYS.filter(s => b.foundations[s].length >= 13).length;
    if (suits) { const a = suits * TUNE.moneyPerSuitDone; lines.push({ label: suits + ' finished suit' + (suits > 1 ? 's' : ''), amount: a }); total += a; }

    if (G.round.won) { lines.push({ label: 'BOARD CLEARED', amount: 8 }); total += 8; }

    run.mantel.forEach((inst, i) => {
      const def = CURIO_BY_ID[inst.id];
      if (def && def.hooks && def.hooks.roundEnd) {
        const a = def.hooks.roundEnd(run, inst) || 0;
        if (a) { lines.push({ label: def.name, amount: a }); total += a; }
      }
    });

    const whim = run.whim && WHIM_BY_ID[run.whim];
    if (whim && whim.hooks && whim.hooks.roundEnd) {
      const a = whim.hooks.roundEnd(run) || 0;
      if (a) { lines.push({ label: whim.name, amount: a }); total += a; }
    }

    if (!m.noInterest) {
      const interest = Math.min(run.interestCap, Math.floor(run.money / TUNE.interestPer));
      if (interest > 0) { lines.push({ label: 'Interest ($1 per $' + TUNE.interestPer + ')', amount: interest }); total += interest; }
    }

    /* the wheel is staked out of this purse, so it settles inside it too */
    const swing = Math.round(G.round.cashSwing || 0);
    if (swing) {
      lines.push({ label: swing > 0 ? 'The Wheel' : 'The Wheel (the house won)', amount: swing, big: swing > 0 });
      total += swing;
    }

    return { lines, total: Math.max(0, total) };
  }

  return { event, payout };
})();
