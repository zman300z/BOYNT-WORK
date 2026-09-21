/* ============================================================
   PILE-DRIVER  ::  overlays.js
   Round summary, the Curio Shop, deck viewer, run end, help.
   ============================================================ */

const Overlays = (() => {
  const G = Game.G;
  const $ = UI.$, $$ = UI.$$, el = UI.el;
  const ov = () => $('#overlay');

  function open(html, cls) {
    UI.hideTip();
    const o = ov();
    o.className = 'show ' + (cls || '');
    o.innerHTML = html;
    return o;
  }
  function close() { UI.hideTip(); ov().className = ''; ov().innerHTML = ''; }
  function isOpen() { return ov().classList.contains('show'); }

  /* ---------------- round end ---------------- */
  function roundEnd() {
    const run = G.run, r = G.round, pay = G.payout;
    const quota = Engine.quotaFor(run);
    const total = run.anteScore;              // already includes this round
    const met = total >= quota;
    const last = run.round >= TUNE.roundsPerAnte;
    const headline = r.won ? 'BOARD CLEARED!' : (r.stuck ? 'OUT OF MOVES' : 'ROUND BANKED');

    const payLines = pay.lines.map(l =>
      '<div class="pay-line' + (l.big ? ' hero' : '') + '"><span>' + l.label + '</span><b>+$' + l.amount + '</b></div>').join('');
    const midRound = r.money > 0
      ? '<div class="pay-line earned"><span>Earned during the round (already banked)</span><b>+$' + r.money + '</b></div>'
      : '';

    open(
      '<div class="panel round-panel">' +
        '<div class="panel-flag ' + (r.won ? 'good' : '') + '">' + headline + '</div>' +
        '<div class="big-score">' + UI.fmt(r.score) + '</div>' +
        '<div class="sub">chips banked this round</div>' +
        '<div class="quip panel-quip">' + quip(r.won ? 'roundWon' : (r.score < Engine.quotaFor(run) / 6 ? 'roundBad' : 'roundWon')) + '</div>' +
        '<div class="quota-block ' + (met ? 'met' : '') + '">' +
          '<div class="qb-row"><span>Ante ' + run.ante + ' progress</span><b>' + UI.fmt(total) + ' / ' + UI.fmt(quota) + '</b></div>' +
          '<div class="qb-bar"><div style="width:' + Math.min(100, total / quota * 100) + '%"></div></div>' +
          '<div class="qb-note">' + (met
            ? 'QUOTA MET — the rest is gravy.'
            : (last ? 'You needed ' + UI.fmt(quota - total) + ' more.' : 'Need ' + UI.fmt(quota - total) + ' more across ' + (TUNE.roundsPerAnte - run.round) + ' more round' + (TUNE.roundsPerAnte - run.round > 1 ? 's' : '') + '.')) +
          '</div>' +
        '</div>' +
        '<div class="payout"><div class="pay-title">PAYOUT</div>' + midRound + payLines +
          '<div class="pay-line total"><span>Total</span><b>+$' + pay.total + '</b></div></div>' +
        (met && !last && Game.earlyFinishBonus()
          ? '<button class="btn bank" id="ov-bank">BANK THE ANTE NOW +$' + Game.earlyFinishBonus().total + '</button>'
          : '') +
        '<button class="btn big" id="ov-continue">' + (last && !met ? 'FACE THE MUSIC' : 'TO THE SHOP →') + '</button>' +
        (met && !last && Game.earlyFinishBonus()
          ? (function () {
              const b2 = Game.earlyFinishBonus();
              return '<div class="bank-note"><b>Early Finish Bonus:</b> $' + b2.base + ' for the ' + b2.skipped +
                ' round' + (b2.skipped > 1 ? 's' : '') + ' you are skipping' +
                (b2.over ? ', plus $' + b2.over + ' for finishing ' + b2.overshootPct + '% over quota' : '') +
                ' = <b>$' + b2.total + '</b>.<br>Or keep playing this ante for more rounds, more cash and more shops.</div>';
            })()
          : '') +
      '</div>', 'centered');

    $('#ov-continue').onclick = () => {
      Sfx.click();
      Game.advance();
      if (G.phase === 'shop') shop();
      else if (G.phase === 'gameOver') gameOver();
      else if (G.phase === 'victory') victory();
    };
    const bank = $('#ov-bank');
    if (bank) bank.onclick = () => {
      const gain = Game.bankAnte();
      Sfx.money();
      UI.toast('Ante banked early — +$' + (gain && gain.total));
      if (G.phase === 'shop') shop();
      else if (G.phase === 'victory') victory();
    };
    if (r.won) Sfx.win();
  }

  /* ---------------- shop ---------------- */
  const SHELF_META = {
    curio: { title: 'CURIOS', sub: 'objects — each one takes a seat on your mantel', cls: 'sh-curio' },
    mod:   { title: 'CARD MODS', sub: 'permanently mark a card already in your deck — no seat needed', cls: 'sh-mod' },
    card:  { title: 'SPECIAL CARDS', sub: 'strange new cards shuffled into your deck', cls: 'sh-card' },
    plain: { title: 'SPARE CARDS', sub: 'another copy of an ordinary card — stacks on its own twin', cls: 'sh-plain' },
    house: { title: 'HOUSE RULES', sub: 'permanent rules for the rest of the run', cls: 'sh-house' }
  };

  function shop() {
    const run = G.run;
    const shelves = ['curio', 'mod', 'card', 'house'].map(k =>
      '<section class="shelf ' + SHELF_META[k].cls + '">' +
        '<div class="shelf-head"><h3>' + SHELF_META[k].title + '</h3><span>' + SHELF_META[k].sub + '</span></div>' +
        '<div class="shelf-row" id="shelf-' + k + '"></div>' +
      '</section>').join('');

    open(
      '<div class="shop">' +
        '<div class="shop-head">' +
          '<div class="shop-title">THE BACK ROOM</div>' +
          (run.anteCleared ? '<div class="shop-flag">ANTE ' + (run.ante - 1) + ' CLEARED — welcome to Ante ' + run.ante + '</div>' : '') +
          '<div class="shop-cash">$<b id="shop-money">' + run.money + '</b></div>' +
        '</div>' +
        '<div class="mantel-wrap">' +
          '<div class="mantel-cap">YOUR MANTEL <span>click a Curio to sell it · drag sideways to reorder · they fire left to right</span></div>' +
          '<div class="mantel-inline" id="shop-mantel"></div>' +
        '</div>' +
        '<div class="shop-body">' + shelves + '</div>' +
        '<section class="shelf sh-plain">' +
          '<div class="shelf-head"><h3>' + SHELF_META.plain.title + '</h3><span>' + SHELF_META.plain.sub + '</span></div>' +
          '<div class="shelf-row plain-row" id="shelf-plain"></div>' +
        '</section>' +
        '<section class="shelf sh-ball">' +
          '<div class="shelf-head"><h3>THE BALL CASE</h3><span>only the balls IN the case are thrown · ' +
          'you need half of those (rounded up) on your colour · click to load or bench, click the price to sell · ' +
          'the Counter sells more seats</span></div>' +
          '<div class="ball-case" id="ball-case"></div>' +
          '<div class="shelf-row ball-row" id="shelf-ball"></div>' +
        '</section>' +
        '<section class="shelf sh-counter">' +
          '<div class="shelf-head"><h3>THE COUNTER</h3><span>always in stock · permanent · the price climbs every time you buy</span></div>' +
          '<div class="counter-row" id="counter-row"></div>' +
        '</section>' +
        '<section class="shelf sh-bandit">' +
          '<div class="shelf-head"><h3>THE ONE-ARMED BANDIT</h3><span>it owes you nothing</span></div>' +
          '<div class="bandit" id="bandit">' +
            '<div class="reels" id="reels"><div class="reel">?</div><div class="reel">?</div><div class="reel">?</div></div>' +
            '<div class="bandit-side">' +
              '<div class="bandit-result" id="bandit-result">Three of a kind pays. Everything else is a lesson.</div>' +
              '<button class="btn lever-btn" id="bandit-pull">PULL THE LEVER $<b>' + Game.banditPrice() + '</b></button>' +
              '<div class="bandit-odds">' + REEL_SYMBOLS.map(r => '<span class="' + r.cls + '">' + r.s + '</span>').join('') + '</div>' +
            '</div>' +
          '</div>' +
        '</section>' +
        '<div class="shop-foot">' +
          '<button class="btn ghost" id="shop-reroll">REROLL $<b>' + Game.rerollCost() + '</b></button>' +
          '<button class="btn ghost" id="shop-deck">VIEW DECK (' + run.deck.length + ')</button>' +
          '<button class="btn ghost" id="shop-almanac">ALMANAC</button>' +
          '<button class="btn big" id="shop-next">NEXT ROUND →</button>' +
        '</div>' +
      '</div>', 'shop-open');

    refreshShop();
    $('#shop-reroll').onclick = () => {
      if (Game.reroll()) { Sfx.money(); UI.toast(quip('reroll')); refreshShop(); }
      else { Sfx.error(); UI.toast('Not enough cash to reroll.'); }
    };
    $('#shop-deck').onclick = () => deckView();
    $('#shop-almanac').onclick = () => almanac();
    wireBandit();
    $('#shop-next').onclick = () => {
      Sfx.click();
      close();
      Game.leaveShop();
      UI.resetDisplayScore();
      UI.render();
      UI.dealAnimation();
      UI.toast('Ante ' + G.run.ante + ' · Round ' + G.run.round, 1400);
    };
  }

  function refreshShop() {
    if (!$('#shelf-curio')) return;
    const run = G.run;
    $('#shop-money').textContent = run.money;
    const rr = $('#shop-reroll');
    if (rr) rr.innerHTML = 'REROLL $<b>' + Game.rerollCost() + '</b>';

    renderBallCase();
    ['curio', 'mod', 'card', 'plain', 'house', 'ball'].forEach(shelf => {
      const row = $('#shelf-' + shelf);
      row.innerHTML = '';
      (run.shop[Game.SHELVES[shelf]] || []).forEach((item, i) => row.appendChild(shopCard(item, i, shelf)));
    });
    UI.renderMantel($('#shop-mantel'));
    UI.renderMantel($('#mantel'));
    renderCounter();
    const bp = $('#bandit-pull');
    if (bp) bp.innerHTML = 'PULL THE LEVER $<b>' + Game.banditPrice() + '</b>';
  }

  /* every ball you own: click to load or bench it, shift-click to sell */
  function renderBallCase() {
    const row = $('#ball-case');
    if (!row) return;
    Game.ensureBalls();
    const bag = Engine.ballBag(G.run);
    const loadedIds = Engine.ballsOf(G.run).map(b => b.id);
    const slots = Engine.ballSlots(G.run);
    const need = Engine.ballThreshold(G.run, 'red');

    row.innerHTML = '';
    bag.forEach(def => {
      const inCase = loadedIds.includes(def.id);
      const n = el('div', 'case-ball ' + def.tint + (def.free ? ' fixed' : '') + (inCase ? ' in' : ' out'));
      const value = def.free ? 0 : Math.max(1, Math.floor(def.cost / 2));
      n.innerHTML = '<span class="cb-orb"></span><span class="cb-name">' + def.name.replace(/^The /, '') + '</span>' +
        '<span class="cb-state">' + (inCase ? 'IN' : 'BENCH') + '</span>' +
        (def.free ? '' : '<span class="cb-sell" data-sell="' + def.id + '">$' + value + '</span>');
      n.onpointerenter = e => UI.showTip(e.currentTarget,
        '<div class="tip-title">' + def.name + '</div>' +
        '<div class="tip-kind ball-kind">' + (inCase ? 'IN THE CASE — thrown every spin' : 'ON THE BENCH — not thrown') + '</div>' +
        '<div class="tip-text">' + def.text + '</div>' +
        (def.long ? '<div class="tip-text dim">' + def.long + '</div>' : '') +
        '<div class="tip-foot">click to ' + (inCase ? 'bench it' : 'load it') +
        (def.free ? '' : ' · the $' + value + ' tag sells it') + '</div>');
      n.onpointerleave = UI.hideTip;
      n.onclick = e => {
        if (e.target.dataset && e.target.dataset.sell) {
          const v = Game.sellBall(def.id);
          if (v) { Sfx.money(); UI.hideTip(); UI.toast('Sold the ' + def.name.replace(/^The /, '') + ' for <b>$' + v + '</b>'); refreshShop(); }
          return;
        }
        const res = Game.toggleBall(def.id);
        if (!res.ok) { Sfx.error(); UI.toast(res.reason); UI.shake(n); return; }
        Sfx.click(); UI.hideTip(); refreshShop();
      };
      row.appendChild(n);
    });
    for (let i = loadedIds.length; i < slots; i++) {
      row.appendChild(el('div', 'case-ball empty', '<span class="cb-orb"></span><span class="cb-name">empty seat</span>'));
    }
    row.appendChild(el('div', 'case-note',
      '<b>' + loadedIds.length + ' of ' + slots + '</b> seats filled' +
      (loadedIds.length > 1
        ? '<br>the stake splits <b>' + loadedIds.length + '</b> ways · <b>' + need + '</b> landing wins the spin'
        : '<br><span class="dim">a second ball halves your variance</span>')));
  }

  function renderCounter() {
    const row = $('#counter-row');
    if (!row) return;
    row.innerHTML = '';
    COUNTER_ITEMS.forEach(def => {
      const owned = G.run.counterBought[def.id] || 0;
      const maxed = def.soldOut && def.soldOut(G.run);
      const price = counterPrice(G.run, def.id);
      const n = el('div', 'counter-item' + (maxed ? ' maxed' : '') + (G.run.money < price ? ' broke' : ''));
      n.innerHTML =
        '<div class="ci-art">' + icon(def.icon) + '</div>' +
        '<div class="ci-body">' +
          '<div class="ci-name">' + def.name + (owned ? ' <em>x' + owned + '</em>' : '') + '</div>' +
          '<div class="ci-text">' + def.text + '</div>' +
        '</div>' +
        '<div class="ci-buy">' + (maxed ? '<span class="ci-max">MAXED</span>'
          : '<span class="ci-price">$' + price + '</span><span class="ci-next">next $' + (price + def.step) + '</span>') + '</div>';
      if (!maxed) {
        n.onclick = () => {
          const res = Game.buyCounter(def.id);
          if (!res.ok) { Sfx.error(); UI.toast(res.reason); UI.shake(n); return; }
          Sfx.money();
          UI.burst(n, 12, '#7ee787');
          UI.toast(def.name + ' bought — next one costs $' + res.next);
          refreshShop();
          UI.render();
        };
      }
      row.appendChild(n);
    });
  }

  function wireBandit() {
    const btn = $('#bandit-pull');
    if (!btn) return;
    btn.onclick = () => {
      const res = Game.pullLever();
      if (!res.ok) { Sfx.error(); UI.toast(res.reason); return; }
      spinAnimation(res);
    };
  }

  function spinAnimation(res) {
    const reels = Array.from(document.querySelectorAll('#reels .reel'));
    const out = $('#bandit-result');
    out.textContent = '...';
    out.className = 'bandit-result';
    $('#bandit-pull').disabled = true;
    Sfx.click();

    reels.forEach((r, i) => {
      r.classList.add('spinning');
      let ticks = 0;
      const iv = setInterval(() => {
        r.textContent = REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)].s;
        Sfx.chip(ticks % 6);
        if (++ticks > 12 + i * 7) {
          clearInterval(iv);
          const sym = res.reels[i];
          const meta = REEL_SYMBOLS.find(s => s.s === sym);
          r.textContent = sym;
          r.className = 'reel landed ' + meta.cls;
          setTimeout(() => r.classList.remove('landed'), 400);
          if (i === 2) finishSpin(res);
        }
      }, 55);
    });
  }

  function finishSpin(res) {
    const out = $('#bandit-result');
    const r = res.result;
    out.className = 'bandit-result ' + r.kind;
    const flavour = r.kind === 'jackpot' ? (r.symbol === '☠' ? quip('banditLose') : quip('banditJackpot'))
                  : r.kind === 'pair' ? quip('banditPair') : quip('banditLose');
    out.innerHTML = '<b>' + r.name + '</b> — ' + r.text + (r.lines.length ? '<br>' + r.lines.join('<br>') : '') +
      '<br><span class="quip">' + flavour + '</span>';
    if (r.kind === 'jackpot') {
      if (r.symbol === '☠') { Sfx.lose(); UI.screenShake(14); UI.flashScreen(0.3, '#ff4d6d'); }
      else { Sfx.win(); UI.screenShake(12); UI.confetti($('#bandit'), 70, 't4'); UI.flashScreen(0.3, '#ffd166'); }
    } else if (r.kind === 'pair') { Sfx.money(); UI.burst($('#bandit'), 12, '#7ee787'); }
    else Sfx.error();
    $('#bandit-pull').disabled = false;
    refreshShop();
    UI.render();
  }

  function shopCard(item, index, shelf) {
    const run = G.run;
    let def, rarity = '', badge = '', preview = '';

    if (shelf === 'plain') {
      const price0 = Game.priceOf(item);
      const n0 = el('div', 'shop-item sh-plain' + (item.bought ? ' bought' : '') + (run.money < price0 ? ' broke' : ''));
      const c0 = UI.cardEl({ id: 'p' + index, rank: item.rank, suit: item.suit, faceUp: true,
                             enhancement: 'none', finish: 'none', seal: 'none' });
      c0.classList.add('mini');
      n0.innerHTML =
        '<div class="si-preview">' + c0.outerHTML + '</div>' +
        '<div class="si-name">Spare ' + RANK_NAMES[item.rank] + SUITS[item.suit].sym + '</div>' +
        '<div class="si-text">A second copy of an ordinary card. Duplicates stack on each other in the tableau, ' +
        'and can be laid on their twin once the foundation has passed that rank.</div>' +
        '<div class="si-badge add">+1 CARD TO YOUR DECK</div>' +
        '<div class="si-price">' + (item.bought ? 'SOLD' : '$' + price0) + '</div>';
      if (!item.bought) {
        n0.onclick = () => {
          const res = Game.buy('plain', index);
          if (!res.ok) { Sfx.error(); UI.toast(res.reason); UI.shake(n0); return; }
          Sfx.money(); UI.burst(n0, 12, '#ffd166');
          UI.toast('Added a second ' + RANK_NAMES[item.rank] + SUITS[item.suit].sym + ' to your deck');
          refreshShop(); UI.render();
        };
      }
      return n0;
    }

    if (shelf === 'ball') {
      const defB = BALL_BY_ID[item.id];
      const priceB = Game.priceOf(item);
      const benched = (run.balls || []).length >= Engine.ballSlots(run);
      const nB = el('div', 'shop-item sh-ball' + (item.bought ? ' bought' : '') +
                    (run.money < priceB ? ' broke' : ''));
      nB.innerHTML =
        '<div class="si-preview"><span class="case-orb ' + defB.tint + '"></span></div>' +
        '<div class="si-name r-' + defB.rarity + '">' + defB.name + '</div>' +
        '<div class="si-text">' + defB.text + '</div>' +
        '<div class="si-badge ball">' + (benched ? 'GOES ON THE BENCH — CASE IS FULL' : '+1 BALL ON EVERY SPIN') + '</div>' +
        '<div class="si-price">' + (item.bought ? 'SOLD' : '$' + priceB) + '</div>';
      nB.onpointerenter = e => UI.showTip(e.currentTarget,
        '<div class="tip-title r-' + defB.rarity + '">' + defB.name + '</div>' +
        '<div class="tip-kind ball-kind">BALL — thrown on every spin</div>' +
        '<div class="tip-text">' + defB.text + '</div>' +
        (defB.long ? '<div class="tip-text dim">' + defB.long + '</div>' : '') +
        '<div class="tip-foot">' + defB.rarity.toUpperCase() +
        (benched ? ' • the case is full, so it waits on the bench until you swap it in' : '') + '</div>');
      nB.onpointerleave = UI.hideTip;
      if (!item.bought) {
        nB.onclick = () => {
          const res = Game.buy('ball', index);
          if (!res.ok) { Sfx.error(); UI.toast(res.reason); UI.shake(nB); return; }
          Sfx.money(); UI.burst(nB, 14, '#b07cff'); UI.hideTip();
          UI.toast(res.loaded
            ? defB.name + ' goes in the case — <b>' + Engine.ballThreshold(G.run, 'red') + ' of ' +
              Engine.ballsOf(G.run).length + '</b> must land on your colour now'
            : defB.name + ' is yours, but the case is full — swap it in from the case above');
          refreshShop(); UI.render();
        };
      }
      return nB;
    }

    if (shelf === 'curio') {
      def = CURIO_BY_ID[item.id];
      rarity = def.rarity;
      const seats = Game.effectiveSlots();
      badge = '<div class="si-badge seat">TAKES A SEAT · ' + run.mantel.length + '/' + seats + ' used</div>';
    } else if (shelf === 'house') {
      def = HOUSE_BY_ID[item.id];
      const owned = run.houseRules[item.id] || 0;
      badge = '<div class="si-badge rule">PERMANENT' + (def.max > 1 ? ' · owned ' + owned + '/' + def.max : '') + '</div>';
    } else {
      def = SHOP_BY_ID[item.id];
      if (shelf === 'mod') {
        badge = '<div class="si-badge mark">MARKS 1 CARD YOU OWN</div>';
      } else {
        badge = '<div class="si-badge add">+1 CARD TO YOUR DECK</div>';
        preview = '<div class="si-preview">' + previewCard(def, item.spec) + '</div>';
      }
    }

    const price = Game.priceOf(item);
    const n = el('div', 'shop-item sh-' + shelf + (rarity ? ' r-' + rarity : '') +
      (item.bought ? ' bought' : '') +
      (item.finish && item.finish !== 'none' ? ' ' + FINISHES[item.finish].cls : '') +
      (run.money < price ? ' broke' : ''));
    n.innerHTML =
      '<div class="si-art">' + icon(def.icon) + '</div>' +
      preview +
      '<div class="si-name">' + def.name + '</div>' +
      (item.finish && item.finish !== 'none' ? '<div class="si-fin">' + FINISHES[item.finish].name + '</div>' : '') +
      '<div class="si-text">' + def.text + '</div>' +
      badge +
      '<div class="si-price">' + (item.bought ? 'SOLD' : '$' + price) + '</div>';

    if (!item.bought) {
      n.onclick = () => {
        const res = Game.buy(shelf, index);
        if (!res.ok) { Sfx.error(); UI.toast(res.reason || 'Cannot buy that.'); UI.shake(n); return; }
        if (res.kind === 'select') { deckView(res.def); return; }
        Sfx.money();
        UI.burst(n, 14, '#ffd166');
        if (res.kind === 'card') UI.toast('Added ' + RANK_NAMES[res.card.rank] + SUITS[res.card.suit].sym + ' to your deck');
        refreshShop();
        UI.render();
      };
    }
    return n;
  }

  /* a face-up sample of what a New Card slot puts in your deck */
  function previewCard(def, spec) {
    if ((spec && spec.oddity) || def.kind === 'oddity') {
      const odd = (spec && spec.oddity) || ODDITY_KEYS[0];
      const c = UI.cardEl({ id: 'prevodd', rank: 0, suit: 'S', faceUp: true, oddity: odd,
                            enhancement: 'none', finish: 'none', seal: 'none' });
      c.classList.add('mini');
      return c.outerHTML + '<div class="odd-blurb">' + ODDITIES[odd].text + '</div>';
    }
    if (def.kind === 'duplicate') {
      return '<div class="mini-pair">' + UI.cardEl({ id: 'p1', rank: 12, suit: 'H', enhancement: 'none', finish: 'none', seal: 'none', faceUp: true }).outerHTML +
             UI.cardEl({ id: 'p2', rank: 12, suit: 'H', enhancement: 'none', finish: 'none', seal: 'none', faceUp: true }).outerHTML + '</div>';
    }
    spec = spec || def.build();
    const c = UI.cardEl({
      id: 'prev', rank: spec.rank, suit: spec.suit, faceUp: true,
      enhancement: spec.enhancement || 'none', finish: spec.finish || 'none', seal: spec.seal || 'none'
    });
    c.classList.add('mini');
    return c.outerHTML;
  }

  /* ---------------- deck viewer / card picker ---------------- */
  function deckView(pickDef) {
    const run = G.run;
    const bySuit = {};
    SUIT_KEYS.forEach(s => { bySuit[s] = []; });
    run.deck.forEach(c => { (bySuit[c.suit] = bySuit[c.suit] || []).push(c); });
    SUIT_KEYS.forEach(s => bySuit[s].sort((a, b) => a.rank - b.rank));

    const rows = SUIT_KEYS.map(s =>
      '<div class="deck-row"><div class="deck-suit ' + SUITS[s].color + '">' + SUITS[s].sym + '</div>' +
      '<div class="deck-cards" data-suit="' + s + '"></div></div>').join('');

    open(
      '<div class="panel deck-panel">' +
        '<div class="panel-flag">' + (pickDef ? 'CHOOSE A CARD — ' + pickDef.name.toUpperCase() : 'YOUR DECK (' + run.deck.length + ')') + '</div>' +
        (pickDef ? '<div class="sub">' + pickDef.text + '</div>' : '<div class="sub">Every mark you buy lives here for the rest of the run.</div>') +
        '<div class="deck-grid">' + rows + '</div>' +
        '<button class="btn ghost" id="deck-close">' + (pickDef ? 'CANCEL' : 'CLOSE') + '</button>' +
      '</div>', 'centered wide');

    SUIT_KEYS.forEach(s => {
      const holder = $('.deck-cards[data-suit="' + s + '"]');
      bySuit[s].forEach(card => {
        const c = UI.cardEl(Object.assign({}, card, { faceUp: true }));
        c.classList.add('mini');
        if ((run.stash || []).some(x => x.id === card.id)) c.classList.add('in-stash');
        c.addEventListener('pointerenter', e => UI.showTip(e.currentTarget, cardTip(card)));
        c.addEventListener('pointerleave', UI.hideTip);
        if (pickDef) {
          c.classList.add('pickable');
          c.onclick = () => {
            if (Game.applyPending(card.id)) {
              Sfx.money();
              close();
              shop();
              UI.render();
              UI.toast(pickDef.name + ' applied!');
            }
          };
        }
        holder.appendChild(c);
      });
    });

    $('#deck-close').onclick = () => {
      Sfx.click();
      if (pickDef) Game.cancelPending();
      close();
      if (G.phase === 'shop') shop();
      else if (G.phase === 'play') UI.render();
    };
  }

  /* full value breakdown for a card, used on the deck screen */
  function cardTip(card) {
    /* Oddities are not rank-and-suit cards, so they get their own readout */
    if (card.oddity) {
      const od = ODDITIES[card.oddity];
      if (!od) return '<div class="tip-title">Unknown Oddity</div>';
      let o = '<div class="tip-title">' + icon(od.icon, 'tip-ico') + ' ' + od.name + '</div>';
      o += '<div class="tip-kind odd-kind">ODDITY — not a card from a deck of 52</div>';
      o += '<div class="tip-rows">' +
             '<div class="tip-row"><span>Base value</span><i>+' + od.chips + ' Chips</i></div>' +
             (card.oddCount ? '<div class="tip-row"><span>Scored so far</span><i>' + card.oddCount + ' time' + (card.oddCount > 1 ? 's' : '') + '</i></div>' : '') +
           '</div>';
      o += '<div class="tip-text hot">' + od.text + '</div>';
      if (od.long) o += '<div class="tip-detail hot"><b>How it works</b>' + od.long + '</div>';
      o += '<div class="tip-detail"><b>Where it can go</b>' +
(card.oddity === 'joker'
             ? 'It has no rank and no suit, so it <b>stacks onto any card in the tableau and any card stacks on top of it</b> — use it to bridge two runs together. On the foundations it is the exception: it becomes whatever card a pile is waiting for and <b>advances it like a real card</b>.'
             : 'It has no rank and no suit, so it <b>stacks onto any card in the tableau and any card stacks on top of it</b> — that is why a 10 will happily sit on it. Use it to bridge two runs together or to unstick a dead column. On the foundations it can be laid onto <b>any pile that has been started</b>, which scores its ability in full without advancing that pile.') +
           '</div>';
      return o;
    }

    const base = rankChips(card.rank);
    let chips = base, mult = 1, xmult = 1, cash = 0;
    const rows = [];
    rows.push(row('Base rank value', '+' + base + ' Chips'));

    const details = [];
    const e = ENHANCEMENTS[card.enhancement];
    if (card.enhancement !== 'none') {
      rows.push(row(e.name, e.text, 'hot'));
      if (e.long) details.push({ name: e.name, long: e.long, cls: 'hot' });
      if (card.enhancement === 'gilded') chips += 50;
      if (card.enhancement === 'voltaic') mult += 4;
      if (card.enhancement === 'glass') xmult *= 2;
      if (card.enhancement === 'phantom') mult += 2;
      if (card.enhancement === 'bomb') chips += 30;
      if (card.enhancement === 'bullion') cash += 4;
      if (card.enhancement === 'steel') xmult *= 1.5;
    }
    const f = FINISHES[card.finish];
    if (card.finish !== 'none') {
      rows.push(row(f.name, f.text, 'fin'));
      if (f.long) details.push({ name: f.name, long: f.long, cls: 'fin' });
      if (card.finish === 'foil') chips += 60;
      if (card.finish === 'holo') mult += 12;
      if (card.finish === 'poly') xmult *= 1.5;
    }
    const sl = SEALS[card.seal];
    if (card.seal !== 'none') {
      rows.push(row(sl.name, sl.text, 'seal'));
      if (sl.long) details.push({ name: sl.name, long: sl.long, cls: 'seal' });
      if (card.seal === 'blue') chips += 30;
      if (card.seal === 'gold') cash += 4;
    }

    const totalMult = mult * xmult;
    const alone = Math.round(chips * totalMult);
    const retrig = card.seal === 'red' ? 2 : 1;

    let out = '<div class="tip-title">' + RANK_NAMES[card.rank] + ' ' +
      (card.enhancement === 'wild' ? '✿ (every suit)' : SUITS[card.suit].sym) + '</div>';
    out += '<div class="tip-kind card-kind">CARD — lives in your deck</div>';
    out += '<div class="tip-rows">' + rows.join('') + '</div>';
    out += '<div class="tip-total">' +
      '<span>On its own</span><b>' + chips + ' X ' + (Math.round(totalMult * 100) / 100) + ' = ' +
      UI.fmt(alone * retrig) + '</b></div>';
    if (retrig > 1) out += '<div class="tip-foot">Red Seal: scored twice.</div>';
    if (cash) out += '<div class="tip-cash">Pays $' + cash + ' when scored.</div>';
    details.forEach(d => {
      out += '<div class="tip-detail ' + d.cls + '"><b>' + d.name + '</b>' + d.long + '</div>';
    });
    out += '<div class="tip-foot">Curios, Cascade and your Column Stack multiply this further.</div>';
    return out;
  }

  function row(label, text, cls) {
    return '<div class="tip-row ' + (cls || '') + '"><span>' + label + '</span><i>' + text + '</i></div>';
  }

  /* ---------------- run over ---------------- */
  function gameOver() {
    const run = G.run;
    Sfx.lose();
    open(
      '<div class="panel over-panel">' +
        '<div class="panel-flag bad">THE TABLE WINS</div>' +
        '<div class="big-score bad">' + UI.fmt(run.anteScore) + '</div>' +
        '<div class="sub">you needed ' + UI.fmt(Engine.quotaFor(run)) + ' by the end of Ante ' + run.ante + '</div>' +
        '<div class="stats">' +
          stat('Antes cleared', run.ante - 1) +
          stat('Rounds played', run.stats.roundsPlayed) +
          stat('Cards sent home', run.stats.cardsScored) +
          stat('Suits finished', run.stats.suitsDone) +
          stat('Best single score', UI.fmt(run.stats.best)) +
          stat('Curios owned', run.mantel.length) +
        '</div>' +
        '<button class="btn big" id="ov-again">DEAL ME IN AGAIN</button>' +
      '</div>', 'centered');
    $('#ov-again').onclick = () => { Sfx.click(); close(); Game.clearSave(); Game.startRun(); UI.resetDisplayScore(); UI.render(); };
  }

  function victory() {
    const run = G.run;
    Sfx.win();
    setTimeout(() => UI.screenShake(10), 200);
    open(
      '<div class="panel win-panel">' +
        '<div class="panel-flag good">YOU BEAT THE HOUSE</div>' +
        '<div class="logo small">ANTE ' + (run.finalAnte || TUNE.finalAnte) + ' CLEARED</div>' +
        '<div class="sub">every quota met. the little objects on your mantel did their job.</div>' +
        '<div class="stats">' +
          stat('Rounds played', run.stats.roundsPlayed) +
          stat('Cards sent home', run.stats.cardsScored) +
          stat('Suits finished', run.stats.suitsDone) +
          stat('Best single score', UI.fmt(run.stats.best)) +
          stat('Cash on hand', '$' + run.money) +
          stat('Curios owned', run.mantel.length) +
        '</div>' +
        '<div class="menu-btns">' +
          '<button class="btn big" id="ov-endless">KEEP GOING (ENDLESS)</button>' +
          '<button class="btn ghost" id="ov-again">NEW RUN</button>' +
        '</div>' +
      '</div>', 'centered');
    $('#ov-endless').onclick = () => {
      Sfx.click();
      G.run.finalAnte = (G.run.finalAnte || TUNE.finalAnte) + 8;
      Game.openShop(true);
      shop();
    };
    $('#ov-again').onclick = () => { Sfx.click(); close(); Game.clearSave(); Game.startRun(); UI.resetDisplayScore(); UI.render(); };
  }

  function stat(k, v) { return '<div class="stat"><span>' + k + '</span><b>' + v + '</b></div>'; }

  /* ---------------- THE WHEEL ---------------- */
  const SEG = 360 / ROULETTE.length;
  let wheelAngle = 0;          // carried between spins so it always turns forward

  let betMode = 'pot', cashStake = 0;

  function roulette(auto) {
    /* auto = { colour, mode, stake } when letting a bet ride */
    if (auto && auto.mode) betMode = auto.mode;
    const pot = Math.round(G.round ? (G.round.pot || 0) : 0);
    const purse = Game.roundPurse();          // cash is staked out of your CASH OUT
    if (betMode === 'pot' && pot < TUNE.potMinFlip && purse > 0) betMode = 'cash';
    if (auto && auto.stake) cashStake = auto.stake;
    if (betMode === 'cash') {
      if (cashStake > purse || cashStake <= 0) cashStake = Math.min(purse, TUNE.cashChips[0]);
    }

    /* the wheel is whatever the jewel balls have made of it */
    const pockets = Engine.wheelPockets(G.run);
    const counts = Engine.wheelCounts(G.run);
    const nums = pockets.map((p, i) =>
      '<div class="rw-num r-' + p.c + (p.painted ? ' painted' : '') + '" style="transform:rotate(' + (i * SEG) +
      'deg) translateY(-86px) rotate(' + (-i * SEG) + 'deg)">' + p.n + '</div>').join('');
    const stops = pockets.map((p, i) => {
      const c = p.c === 'green' ? '#1f9d55' : (p.c === 'red' ? '#c62b45' : '#1b1c22');
      return c + ' ' + (i * SEG) + 'deg ' + ((i + 1) * SEG) + 'deg';
    }).join(',');

    const cash = betMode === 'cash';
    const stake = cash ? cashStake : pot;
    const balls = Engine.ballsOf(G.run);
    const spinsLeft = Game.spinsLeft();
    const shares = Engine.ballShares(G.run, stake);
    const need = Engine.ballThreshold(G.run);

    const bet = (col) => {
      const o = ROULETTE_ODDS[col];
      const rate = Engine.betRate(G.run, col, cash);
      const odds = Engine.ballWinChance(G.run, col);
      const dead = stake <= 0 || spinsLeft <= 0;
      const per = shares.length ? Math.round(shares[0] * rate) : 0;
      const green = col === 'green';
      const whole = Math.round(stake * rate);
      return '<button class="rw-bet rw-' + col + (dead ? ' off' : '') + '" data-col="' + col + '"' +
        (dead ? ' disabled' : '') + '>' +
        '<span class="rw-bl">' + o.label + '</span>' +
        '<span class="rw-bo">' + (balls.length > 1
            ? Math.round(odds.win * 100) + '% to win'
            : counts[col] + ' in ' + pockets.length) +
          (green ? ' · any ONE ball' : ' · pays 1 to 1') + '</span>' +
        '<span class="rw-bp">' + (green || balls.length <= 1
            ? 'pays ' + (cash ? '$' + whole : UI.fmt(whole))
            : (cash ? '$' + per : UI.fmt(per)) + ' per ball that lands') +
        '</span></button>';
    };

    /* the case: every ball you own, click to load or bench it */
    const bag = Engine.ballBag(G.run);
    const slots = Engine.ballSlots(G.run);
    const loaded = balls.map(b => b.id);
    const caseRow =
      '<div class="rw-case">' +
        '<div class="rw-case-cap">CASE <b>' + balls.length + '/' + slots + '</b></div>' +
        '<div class="rw-case-balls">' + bag.map(b =>
          '<button class="rw-ballchip ' + b.tint + (loaded.includes(b.id) ? ' in' : ' out') +
          '" data-ball="' + b.id + '"></button>').join('') +
        '</div>' +
        '<div class="rw-case-need">' + (balls.length > 1
          ? 'the stake splits <b>' + Engine.ballsCounted(G.run) + ' ways</b>' +
            (Engine.ballsCounted(G.run) < balls.length ? ' (the ghost bets nothing)' : '') +
            ' · <b>' + need + '</b> landing wins the spin · <b>the zero needs only one</b>'
          : 'one ball, one pocket') + '</div>' +
        '<div class="rw-spins' + (spinsLeft <= 0 ? ' out' : '') + '">SPINS LEFT <b>' + spinsLeft + '</b></div>' +
      '</div>' +
      (bag.length > balls.length || slots > balls.length
        ? '<div class="rw-swap-hint">click a ball to swap it in or out · the Counter sells wider cases</div>' : '');

    const chips = TUNE.cashChips.concat([purse]).filter((v, i, a2) => v > 0 && v <= purse && a2.indexOf(v) === i);
    const chipRow = cash
      ? '<div class="rw-chips">' + chips.map(v =>
          '<button class="rw-chip' + (v === cashStake ? ' on' : '') + '" data-stake="' + v + '">' +
          (v === purse ? 'ALL $' + v : '$' + v) + '</button>').join('') +
        (purse <= 0 ? '<span class="rw-broke">this round has not earned anything yet</span>' : '') + '</div>' +
        '<div class="rw-purse">staked out of your <b>CASH OUT</b> — $' + purse +
        ' &rarr; <b>$' + Math.max(0, purse - cashStake) + '</b> while it spins</div>'
      : '';

    open(
      '<div class="panel wheel-panel">' +
        '<div class="panel-flag">THE WHEEL</div>' +
        '<div class="rw-modes">' +
          '<button class="rw-mode' + (cash ? '' : ' on') + (pot < TUNE.potMinFlip ? ' off' : '') + '" data-mode="pot"' +
            (pot < TUNE.potMinFlip ? ' disabled' : '') + '>STAKE THE POT<span>' + UI.fmt(pot) + ' pts</span></button>' +
          '<button class="rw-mode' + (cash ? ' on' : '') + (purse <= 0 ? ' off' : '') + '" data-mode="cash"' +
            (purse <= 0 ? ' disabled' : '') + '>STAKE YOUR CASH OUT<span>$' + purse + '</span></button>' +
        '</div>' +
        chipRow +
        '<div class="wheel-stake">On the line: <b>' + (cash ? '$' + stake : UI.fmt(stake) + ' pts') + '</b>' +
          (balls.length > 1 ? '<span class="ws-split"> — ' +
            (cash ? '$' + Math.max.apply(null, shares) : UI.fmt(Math.max.apply(null, shares))) +
            ' riding each of your ' + Engine.ballsCounted(G.run) + ' betting balls</span>' : '') + '</div>' +
        '<div class="wheel-wrap' + (Engine.wheelTakenOver(G.run) ? ' taken own-' + Engine.wheelTakenOver(G.run) : '') + '">' +
          '<div class="rw-pointer"></div>' +
          '<div class="rw-wheel" id="rw-wheel" style="transform:rotate(' + wheelAngle + 'deg);background:conic-gradient(' + stops + ')">' +
            '<div class="rw-paint" id="rw-paint"></div>' +
            '<div class="rw-nums">' + nums + '</div>' +
            '<div class="rw-hub"></div>' +
          '</div>' +
          '<div class="rw-balls" id="rw-balls">' + balls.map((b, k) =>
            '<div class="rw-ball ' + b.tint + '" id="rw-ball-' + k + '"></div>').join('') + '</div>' +
        '</div>' +
        caseRow +
        '<div class="wheel-bets" id="rw-bets">' + bet('red') + bet('green') + bet('black') + '</div>' +
        (spinsLeft <= 0
          ? '<div class="wheel-dead">The table is done with you this round. Swap your balls around and come back next round.</div>'
          : stake <= 0
          ? '<div class="wheel-dead">Nothing to stake yet — the pot needs ' + UI.fmt(TUNE.potMinFlip) +
            ' and your CASH OUT is $' + purse + '. Swap your balls around while you are here.</div>'
          : '') +
        '<div class="wheel-warn">' + (cash
          ? 'Every ball rides its own share at the table\'s honest price. What lands comes back onto your <b>CASH OUT</b>; what misses is gone.'
          : 'Every ball rides its own share of the pot. What lands is paid in full; what misses is gone — <b>and the same again comes off your ante total</b>.') + '</div>' +
        '<div class="wheel-result" id="rw-result"></div>' +
        '<button class="btn ghost" id="rw-close">WALK AWAY</button>' +
      '</div>', 'centered');

    $$('.rw-mode').forEach(b2 => { b2.onclick = () => { Sfx.click(); betMode = b2.dataset.mode; roulette(); }; });
    $$('.rw-chip').forEach(b2 => { b2.onclick = () => { Sfx.click(); cashStake = +b2.dataset.stake; roulette(); }; });
    $$('.rw-bet').forEach(b2 => { b2.onclick = () => placeBet(b2.dataset.col); });
    $$('.rw-ballchip').forEach(chip => {
      const def = BALL_BY_ID[chip.dataset.ball];
      const inCase = chip.classList.contains('in');
      chip.onpointerenter = e => UI.showTip(e.currentTarget,
        '<div class="tip-title">' + def.name + '</div>' +
        '<div class="tip-kind ball-kind">' + (inCase ? 'IN THE CASE — thrown every spin' : 'ON THE BENCH — not thrown') + '</div>' +
        '<div class="tip-text">' + def.text + '</div>' +
        (def.long ? '<div class="tip-text dim">' + def.long + '</div>' : '') +
        '<div class="tip-foot">click to ' + (inCase ? 'take it out' : 'put it in the case') + '</div>');
      chip.onpointerleave = UI.hideTip;
      chip.onclick = () => {
        const res = Game.toggleBall(def.id);
        if (!res.ok) { Sfx.error(); UI.toast(res.reason); return; }
        Sfx.click();
        UI.hideTip();
        roulette({ mode: betMode, stake: cashStake });
      };
    });
    $('#rw-close').onclick = () => { Sfx.click(); close(); UI.render(); };
    if (auto && auto.colour) setTimeout(() => placeBet(auto.colour), 60);
  }

  function placeBet(colour) {
    const cash = betMode === 'cash';
    const res = cash ? Game.spinRouletteCash(colour, cashStake) : Game.spinRoulette(colour);
    if (!res.ok) { Sfx.error(); UI.toast(res.reason); return; }
    $$('.rw-bet').forEach(x => { x.disabled = true; x.classList.toggle('chosen', x.dataset.col === colour); });
    $$('.rw-mode,.rw-chip').forEach(x => { x.disabled = true; });
    $('#rw-close').disabled = true;
    $('#rw-result').innerHTML = '<span class="rw-spinning">the wheel is spinning…</span>';

    const wheel = $('#rw-wheel');
    const thrown = res.thrown || [{ index: res.index, hit: res.win }];
    const nodes = thrown.map((t, k) => $('#rw-ball-' + k)).filter(Boolean);
    const DUR = 5800;

    /* the wheel: several slow turns easing out across the whole spin, always
       continuing forward from wherever the last spin left it. It settles so the
       FIRST ball's pocket sits under the pointer -- the rest land where they land. */
    const turns = 4 + Math.floor(Math.random() * 2);
    const want = (((-thrown[0].index * SEG - SEG / 2) % 360) + 360) % 360;
    let target = wheelAngle + 360 * turns;
    target += (((want - (target % 360)) % 360) + 360) % 360;
    wheelAngle = target;
    wheel.style.transition = 'transform ' + DUR + 'ms cubic-bezier(.10,.62,.12,1)';
    wheel.style.transform = 'rotate(' + target + 'deg)';

    /* each ball orbits the other way, bleeds off speed, and only drops from the
       rim into its own pocket once it is genuinely slow. Ball 0 finishes at the
       top under the pointer; every other ball finishes at its pocket's angle in
       the wheel's final frame, so they visibly spread around the rim. */
    const R_RIM = 96, R_POCKET = 73;
    const t0 = performance.now();
    let nextTick = 0;
    const seeds = thrown.map((t, k) => ({
      final: (((target + t.index * SEG + SEG / 2) % 360) + 360) % 360,
      spins: 8 + Math.random() * 2 + k * 0.6,
      radius: R_POCKET - k * 0.5
    }));
    nodes.forEach(n => { n.classList.remove('settled'); n.classList.add('live'); });

    const easeOut = k => 1 - Math.pow(1 - k, 3.6);

    const frame = now => {
      const k = Math.min(1, (now - t0) / DUR);
      const e = easeOut(k);

      nodes.forEach((node, i) => {
        const sd = seeds[i];
        const angle = sd.final - (360 * sd.spins) * (1 - e);
        let r = R_RIM;
        if (k > 0.60) {
          const f = (k - 0.60) / 0.40;
          const smooth = f * f * (3 - 2 * f);
          const hop = Math.sin(f * Math.PI * 2.4) * (1 - f) * 6;
          r = R_RIM - (R_RIM - sd.radius) * smooth + hop;
        }
        const rad = angle * Math.PI / 180;
        node.style.transform = 'translate(' + (Math.sin(rad) * r).toFixed(2) + 'px,' +
                               (-Math.cos(rad) * r).toFixed(2) + 'px)';
      });

      if (now >= nextTick) {
        const speed = Math.max(0.015, 1 - e);
        Sfx.chip(Math.floor(6 * speed));
        nextTick = now + 48 + 300 * (1 - speed);
      }
      if (k < 1) requestAnimationFrame(frame);
      else {
        nodes.forEach((n, i) => {
          n.classList.remove('live');
          n.classList.add('settled');
          if (thrown[i] && thrown[i].hit) n.classList.add('hit');
        });
        /* a jewel ball that kept its pocket repaints it in front of you, before
           the result goes up -- the wheel changing is the whole payoff */
        const wait = paintAnimation(thrown, nodes);
        setTimeout(() => finishWheel(res), 300 + wait);
      }
    };
    requestAnimationFrame(frame);
  }

  /* Repaint the pockets the jewel balls claimed, one at a time, right on the
     wheel. Returns how long the whole sequence takes so the result can wait. */
  function paintAnimation(thrown, nodes) {
    const layer = $('#rw-paint');
    const wheel = $('#rw-wheel');
    if (!layer || !wheel) return 0;
    const claims = thrown.map((t, i) => ({ t, i })).filter(x => x.t.painted);
    if (!claims.length) return 0;

    const STEP = 620, HOLD = 900;
    claims.forEach((c, k) => {
      setTimeout(() => {
        /* the colour may have bled into a neighbour rather than kept its own pocket */
        const idx = c.t.paintIndex != null ? c.t.paintIndex : c.t.index;
        const hue = c.t.painted === 'green' ? '#1f9d55' : (c.t.painted === 'red' ? '#c62b45' : '#1b1c22');
        /* one wedge, cut straight out of a conic gradient so it lines up exactly */
        const wedge = el('div', 'rw-wedge');
        wedge.style.background = 'conic-gradient(transparent 0deg ' + (idx * SEG) + 'deg, ' +
          hue + ' ' + (idx * SEG) + 'deg ' + ((idx + 1) * SEG) + 'deg, transparent ' +
          ((idx + 1) * SEG) + 'deg 360deg)';
        wedge.style.setProperty('--glow', hue);
        layer.appendChild(wedge);

        /* the ball that did it flares, the number under it flips colour */
        const ball = nodes[c.i];
        if (ball) { ball.classList.add('painting'); setTimeout(() => ball.classList.remove('painting'), HOLD); }
        const num = $$('#rw-wheel .rw-num')[idx];
        if (num) {
          num.className = 'rw-num r-' + c.t.painted + ' painted just';
          setTimeout(() => num.classList.remove('just'), HOLD);
        }

        Sfx.win();
        UI.flashScreen(0.12, hue);
        UI.screenShake(5);
        floatOverWheel(idx, c.t.spread ? 'IT SPREADS!' : c.t.painted.toUpperCase() + '!');
      }, k * STEP);
    });

    /* once the paint is down, fold it into the wheel itself and drop the overlays */
    let total = (claims.length - 1) * STEP + HOLD;
    const owner = Engine.wheelTakenOver(G.run);
    if (owner) {
      setTimeout(() => {
        const wrap = $('.wheel-wrap');
        if (wrap) {
          wrap.classList.add('taken', 'own-' + owner);
          const band = el('div', 'rw-takeover', 'THE WHEEL IS YOURS');
          wrap.appendChild(band);
          setTimeout(() => band.remove(), 2600);
        }
        Sfx.win();
        UI.screenShake(16);
        UI.flashScreen(0.35, owner === 'green' ? '#1f9d55' : (owner === 'red' ? '#c62b45' : '#b07cff'));
        UI.confetti(wrap || $('#scorebox'), 80, 't4');
        UI.toast('<b>THE WHEEL IS YOURS</b> — every pocket but the zero is ' + owner.toUpperCase() +
                 '. That colour lands every single spin now.', 5200);
      }, total);
      total += 1600;
    }
    setTimeout(() => {
      const pockets = Engine.wheelPockets(G.run);
      wheel.style.background = 'conic-gradient(' + pockets.map((p, i) => {
        const c2 = p.c === 'green' ? '#1f9d55' : (p.c === 'red' ? '#c62b45' : '#1b1c22');
        return c2 + ' ' + (i * SEG) + 'deg ' + ((i + 1) * SEG) + 'deg';
      }).join(',') + ')';
      layer.innerHTML = '';
    }, total);
    return total;
  }

  /* a word thrown out over the pocket that just changed */
  function floatOverWheel(index, text) {
    const wrap = $('.wheel-wrap');
    if (!wrap) return;
    const angle = (wheelAngle + index * SEG + SEG / 2) * Math.PI / 180;
    const n = el('div', 'rw-pop', text);
    n.style.left = 'calc(50% + ' + (Math.sin(angle) * 74).toFixed(1) + 'px)';
    n.style.top = 'calc(50% - ' + (Math.cos(angle) * 74).toFixed(1) + 'px)';
    wrap.appendChild(n);
    setTimeout(() => n.remove(), 1100);
  }

  /* what every ball did, whether the bet came in or not */
  function ballReport(res) {
    const thrown = res.thrown;
    if (!thrown || thrown.length < 1) return '';
    /* the hit marker and the ability payout are separate columns on purpose: a
       ball can do both at once, and merging them hid one behind the other */
    const rows = thrown.map(t => {
      const def = BALL_BY_ID[t.id] || {};
      const bits = [];
      if (t.chips) bits.push('+' + UI.fmt(t.chips) + ' Chips');
      if (t.cash) bits.push('+$' + t.cash);
      if (t.heat) bits.push('+' + t.heat + ' HEAT');
      if (t.painted) bits.push('painted ' + t.painted.toUpperCase() + ' for the run');
      const cashMode = res.mode === 'cash';
      const money = (t.share == null) ? ''
        : (t.ghost && !t.share) ? '<span class="rb-cash free">free</span>'
        : (t.hit
          ? '<span class="rb-cash up">+' + (cashMode ? '$' + t.won : UI.fmt(t.won)) + '</span>'
          : '<span class="rb-cash down">\u2212' + (cashMode ? '$' + t.share : UI.fmt(t.share)) + '</span>');
      const mark = t.hit
        ? '<span class="rb-hit' + (t.doubled ? ' dbl' : '') + '">' + (t.doubled ? 'HIT x2' : 'HIT') + '</span>'
        : '<span class="rb-miss">miss</span>';
      return '<div class="rb-row' + (t.hit ? ' hit' : '') + (t.ghost ? ' ghost' : '') + '">' +
        '<span class="rb-dot ' + (def.tint || '') + '"></span>' +
        '<span class="rb-name">' + (def.name || t.id) + '</span>' +
        '<span class="rb-pocket r-' + t.pocket.c + '">' + t.pocket.n + '</span>' +
        mark + money +
        '<span class="rb-fx">' + bits.join(' · ') + '</span>' +
      '</div>';
    }).join('');
    const cashMode = res.mode === 'cash';
    const head = thrown.length > 1
      ? '<div class="rb-head">' + (res.allIn
          ? '<b>' + res.hits + '</b> of ' + thrown.length + ' found a green pocket — <b>one</b> is all it takes'
          : '<b>' + res.hits + '</b> of ' + thrown.length + ' on your colour — you needed <b>' +
            res.need + '</b> to win the spin') + '</div>'
      : '';

    /* and a bottom line, so there is never a doubt about what the spin paid */
    const tot = [];
    if (thrown.length > 1 || res.allIn) {
      const back = cashMode ? res.payout : res.kept;
      const gone = res.lost || 0;
      if (res.allIn) {
        tot.push(back
          ? 'the whole <b>' + (cashMode ? '$' + res.staked : UI.fmt(res.staked)) + '</b> pays the zero in full — <b>' +
            (cashMode ? '$' + back : UI.fmt(back)) + '</b> back'
          : 'no ball found green — the whole <b class="dn">' + (cashMode ? '$' + gone : UI.fmt(gone)) + '</b> is gone');
      } else if (back != null) {
        tot.push('<b>' + (cashMode ? '$' + back : UI.fmt(back)) + '</b> back of ' +
          (cashMode ? '$' + res.staked : UI.fmt(res.staked)) + ' staked' +
          (gone ? ' · <b class="dn">' + (cashMode ? '$' + gone : UI.fmt(gone)) + '</b> lost' : ''));
      }
    }
    if (res.cash) tot.push('<b>+$' + res.cash + '</b> from the balls');
    if (res.chips) tot.push('<b>+' + UI.fmt(res.chips) + ' Chips</b> scored');
    if (res.heatGain) tot.push('<b>+' + res.heatGain + ' HEAT</b>');
    const purseLine = (res.purse != null && res.before != null && res.purse !== res.before)
      ? '<div class="rb-purse">CASH OUT <b>$' + res.before + '</b> &rarr; <b class="to">$' + res.purse + '</b>' +
        (res.purse > res.before ? ' &nbsp;(+$' + (res.purse - res.before) + ')' : '') + '</div>'
      : '';
    const foot = tot.length ? '<div class="rb-total">' + tot.join(' &nbsp;·&nbsp; ') + '</div>' : '';

    const notes = thrown.reduce((a, t) => a.concat(t.notes || []), []);
    return '<div class="ball-report">' + head + rows + foot + purseLine +
      (notes.length ? '<div class="rb-note">' + notes.join('<br>') + '</div>' : '') + '</div>';
  }

  function finishWheel(res) {
    const p = res.pocket;
    const box = $('#rw-result');
    const cash = res.mode === 'cash';
    const many = res.thrown && res.thrown.length > 1;
    const where = many ? '<b>' + res.hits + '/' + res.thrown.length + ' ON ' + res.colour.toUpperCase() + '</b>'
                       : '<b>' + p.n + ' ' + p.c.toUpperCase() + '</b>';
    if (res.win) {
      box.className = 'wheel-result win';
      box.innerHTML = where + ' — ' +
        (cash ? 'the table pays <b>$' + res.payout + '</b>' : 'the pot is now <b>' + UI.fmt(res.pot) + '</b>') +
        (res.guaranteed ? '<br><span class="rw-note">The Card Counter saw that coming.</span>' : '') +
        '<br><span class="rw-note">HEAT is now X' + Game.heatMult() + '</span>' +
        '<br><span class="quip">' + quip(res.colour === 'green' ? 'wheelGreen' : 'wheelWin') + '</span>' +
        ballReport(res);
      Sfx.win(); UI.screenShake(12); UI.confetti($('.wheel-wrap'), res.colour === 'green' ? 90 : 45, 't3');
      UI.flashScreen(0.28, res.colour === 'green' ? '#7ee787' : '#ffd166');
    } else {
      box.className = 'wheel-result lose';
      box.innerHTML = where + ' — the house takes <b>' +
        (cash ? '$' + res.staked : UI.fmt(res.staked)) + '</b>' +
        (cash ? '' : '<br><span class="rw-note">and ' + UI.fmt(res.anteHit) + ' off your ante total</span>') +
        '<br><span class="quip">' + quip('wheelLose') + '</span>' +
        ballReport(res);
      Sfx.lose(); UI.screenShake(14); UI.flashScreen(0.3, '#ff4d6d');
    }
    const btn = $('#rw-close');
    btn.disabled = false;
    btn.textContent = res.win ? 'TAKE IT AND GO' : 'THAT IS GAMBLING';

    /* won, and the winnings are big enough to put straight back on the table */
    const rideStake = cash ? Math.min(res.payout, Game.roundPurse()) : (G.round.pot || 0);
    const rideOk = res.win && Game.spinsLeft() > 0 && (cash ? rideStake > 0 : rideStake >= TUNE.potMinFlip);
    if (rideOk) {
      const rate2 = Engine.betRate(G.run, res.colour, cash);
      const shown = cash ? '$' + rideStake : UI.fmt(rideStake);
      const becomes = cash ? '$' + Math.round(rideStake * rate2) : UI.fmt(Math.round(rideStake * rate2));
      const ride = el('button', 'btn ride-btn', 'LET IT RIDE');
      ride.title = 'Put the whole ' + shown + ' back on ' + ROULETTE_ODDS[res.colour].label;
      ride.onclick = () => {
        ride.disabled = true;
        Sfx.voice('letItRide');
        UI.flashScreen(0.18, '#ffd166');
        setTimeout(() => roulette({ colour: res.colour, mode: res.mode === 'cash' ? 'cash' : 'pot', stake: rideStake }), 620);
      };
      btn.parentNode.insertBefore(ride, btn);
      const note = el('div', 'ride-note',
        'Same colour, ' + shown + ' on the line — win and it becomes ' + becomes + '.' +
        (cash ? ' Lose and your cash out drops to $' + Math.max(0, Game.roundPurse() - rideStake) + '.' : ''));
      btn.parentNode.insertBefore(note, btn);
    }
    /* the panel was built before the spin -- bring the CASH OUT tab up to date so
       you never have to close it to find out what you are actually holding */
    const purseNow = Game.roundPurse();
    const cashTab = $('.rw-mode[data-mode="cash"] span');
    if (cashTab) cashTab.textContent = '$' + purseNow;
    const potTab = $('.rw-mode[data-mode="pot"] span');
    if (potTab) potTab.textContent = UI.fmt(Math.round(G.round.pot || 0)) + ' pts';
    const purseNote = $('.rw-purse');
    if (purseNote) purseNote.innerHTML = 'your <b>CASH OUT</b> is now <b>$' + purseNow + '</b>';
    const spinBox = $('.rw-spins');
    if (spinBox) {
      const left = Game.spinsLeft();
      spinBox.innerHTML = 'SPINS LEFT <b>' + left + '</b>';
      spinBox.classList.toggle('out', left <= 0);
    }

    UI.renderHud();
    UI.renderControls();
  }

  /* ---------------- the almanac: every ability in the game ---------------- */
  const ALMANAC_TABS = [
    { id: 'curios',  name: 'CURIOS',     sub: 'objects that take a mantel seat' },
    { id: 'marks',   name: 'CARD MARKS', sub: 'enhancements, finishes and seals' },
    { id: 'cards',   name: 'NEW CARDS',  sub: 'cards you can add to the deck' },
    { id: 'oddities', name: 'ODDITIES',  sub: 'cards that were never in a deck of 52' },
    { id: 'rules',   name: 'HOUSE RULES', sub: 'permanent run upgrades' },
    { id: 'counter', name: 'THE COUNTER', sub: 'always in stock, price climbs' },
    { id: 'whims',   name: "DEALER'S WHIMS", sub: 'random round rules from Ante ' + TUNE.whimsFromAnte },
    { id: 'pot',     name: 'SIDE POT',   sub: 'the corner gamble, and what it pays' },
    { id: 'bounty',  name: 'THE BOUNTY', sub: 'the wanted card, and the clock you can start' },
    { id: 'edge',    name: 'HOUSE EDGE', sub: 'what the casino takes at the high antes' },
    { id: 'balls',   name: 'THE BALLS',  sub: 'every ball is thrown on every spin' },
    { id: 'bandit',  name: 'THE BANDIT', sub: 'slot machine payouts' }
  ];
  let almanacTab = 'curios';

  function almanac(tab) {
    almanacTab = tab || almanacTab;
    open(
      '<div class="panel almanac">' +
        '<div class="panel-flag">THE ALMANAC</div>' +
        '<div class="sub">every ability in the game, whether you own it or not</div>' +
        '<div class="alm-tabs">' + ALMANAC_TABS.map(t =>
          '<button class="alm-tab' + (t.id === almanacTab ? ' on' : '') + '" data-tab="' + t.id + '">' + t.name + '</button>').join('') + '</div>' +
        '<div class="alm-sub" id="alm-sub"></div>' +
        '<div class="alm-list" id="alm-list"></div>' +
        '<button class="btn ghost" id="alm-close">CLOSE</button>' +
      '</div>', 'centered wide');

    $$('.alm-tab').forEach(b => { b.onclick = () => { Sfx.click(); almanac(b.dataset.tab); }; });
    $('#alm-close').onclick = () => { Sfx.click(); close(); if (G.phase === 'shop') shop(); };
    renderAlmanac();
  }

  function almEntry(iconName, title, tag, short, long, cls) {
    return '<div class="alm-entry ' + (cls || '') + '">' +
      '<div class="alm-ico">' + icon(iconName) + '</div>' +
      '<div class="alm-body">' +
        '<div class="alm-title">' + title + (tag ? '<span class="alm-tag">' + tag + '</span>' : '') + '</div>' +
        '<div class="alm-short">' + short + '</div>' +
        (long ? '<div class="alm-long">' + long + '</div>' : '') +
      '</div></div>';
  }

  function renderAlmanac() {
    const meta = ALMANAC_TABS.find(t => t.id === almanacTab);
    $('#alm-sub').textContent = meta.sub;
    const list = $('#alm-list');
    let html = '';

    if (almanacTab === 'curios') {
      const owned = new Set(G.run ? G.run.mantel.map(c => c.id) : []);
      ['common', 'uncommon', 'rare', 'legendary'].forEach(rar => {
        html += '<div class="alm-group r-' + rar + '">' + rar.toUpperCase() + '</div>';
        CURIOS.filter(c => c.rarity === rar).forEach(c => {
          html += almEntry(c.icon, c.name, '$' + c.cost + (owned.has(c.id) ? ' · OWNED' : ''), c.text, c.long || '', 'r-' + rar + (owned.has(c.id) ? ' owned' : ''));
        });
      });
    } else if (almanacTab === 'marks') {
      html += '<div class="alm-group">ENHANCEMENTS</div>';
      Object.keys(ENHANCEMENTS).forEach(k => {
        const e = ENHANCEMENTS[k];
        if (k === 'none') return;
        html += almEntry('sparkle', e.glyph + ' ' + e.name, 'enhancement', e.text, e.long || '');
      });
      html += '<div class="alm-group">FINISHES</div>';
      Object.keys(FINISHES).forEach(k => {
        const f = FINISHES[k];
        if (k === 'none') return;
        html += almEntry('prism', f.name, 'finish', f.text, f.long || '');
      });
      html += '<div class="alm-group">SEALS</div>';
      Object.keys(SEALS).forEach(k => {
        const sl = SEALS[k];
        if (k === 'none') return;
        html += almEntry('stamp', sl.name, 'seal', sl.text, sl.long || '');
      });
      html += '<div class="alm-group">CARD MODS IN THE SHOP</div>';
      CARD_MODS.forEach(m => { html += almEntry(m.icon, m.name, '$' + m.cost, m.text, ''); });
    } else if (almanacTab === 'cards') {
      NEW_CARDS.forEach(c => { html += almEntry(c.icon, c.name, '$' + c.cost, c.text, ''); });
    } else if (almanacTab === 'oddities') {
      ODDITY_KEYS.forEach(k => {
        const o = ODDITIES[k];
        html += almEntry(o.icon, o.name, k === 'joker' ? 'advances a foundation' : 'lays on any started pile',
          o.text, o.long || '');
      });
    } else if (almanacTab === 'rules') {
      HOUSE_RULES.forEach(h => {
        const owned = G.run ? (G.run.houseRules[h.id] || 0) : 0;
        html += almEntry(h.icon, h.name, '$' + h.cost + ' · max ' + h.max + (owned ? ' · owned ' + owned : ''), h.text, '');
      });
    } else if (almanacTab === 'counter') {
      COUNTER_ITEMS.forEach(c => {
        const owned = G.run && G.run.counterBought ? (G.run.counterBought[c.id] || 0) : 0;
        html += almEntry(c.icon, c.name, 'from $' + c.base + ' · +$' + c.step + ' each' + (owned ? ' · bought ' + owned : ''), c.text, '');
      });
    } else if (almanacTab === 'whims') {
      WHIMS.forEach(w => { html += almEntry(w.icon, w.name, w.mood, w.text, '', 'mood-' + w.mood); });
    } else if (almanacTab === 'pot') {
      html += almEntry('coinstack', 'The pot fills itself', 'automatic',
        Math.round(TUNE.potShare * 100) + '% of every score you make also drops into the Side Pot.',
        'It costs you nothing — the points still land on your score as normal. The pot is a copy, sitting in the corner waiting for you to decide what to do with it.');
      html += almEntry('coin', 'CASH IT', 'safe',
        'The whole pot is added straight to your round score.', 'No risk, no flip. The pot resets to zero.');
      html += almEntry('dice', 'SPIN THE WHEEL', 'needs ' + TUNE.potMinFlip + '+',
        'Nineteen pockets — nine red, nine black, one green zero. Red or black pays ' + TUNE.roulettePayEven +
        'x the pot, the green 0 pays ' + TUNE.roulettePayGreen + 'x. Winning also raises HEAT.',
        'Lose and the pot is gone AND the same amount again comes off your ante total, this round first and then your banked rounds. The stake is really double the pot.');
      html += almEntry('twinflame', 'HEAT', 'from winning flips',
        'Each winning flip raises Heat by one. Heat multiplies EVERY score for the rest of the round — X'
        + (1 + TUNE.heatMultPer) + ' at one level, X' + (1 + TUNE.heatMultPer * 4) + ' at four.',
        'A busted flip resets Heat to zero, so a long streak is worth protecting — or cashing.');
      html += almEntry('magnifier', 'The Card Counter', 'curio',
        'Makes the first flip of each round unloseable.', '');
      html += almEntry('coinstack', 'The Skimmer', 'curio',
        'The pot takes a much bigger cut of every score.', '');
      html += almEntry('dice', 'The Daredevil', 'curio',
        'Every winning flip also pays you $5.', '');
    } else if (almanacTab === 'balls') {
      html += almEntry('sparkle', 'The zero does not split', 'any ONE ball',
        'A green bet is all or nothing on a single ball. If <b>any one</b> of your balls finds a green pocket, the <b>whole stake</b> pays the zero in full and the spin counts as a win — however many balls you own. If none of them do, the whole stake is gone.',
        'That makes the zero the one bet that gets strictly better with every ball you add: four balls is four chances at it, and one hit pays the lot. Every other colour splits the stake and needs half the case.');
      html += almEntry('coin', 'Your stake splits across the balls', 'the price never changes',
        'RED and BLACK always pay <b>1 to 1</b>, however many balls you own. The stake is divided evenly between them and each ball rides its own share: what lands is paid in full, what misses is gone.',
        'So a bigger case does not buy a better price — it buys far less variance. One ball is all or nothing; four balls means a bad spin usually still hands some of the stake back. The house edge is identical at every count, which is why the balls are worth owning for what they DO rather than for the odds.');
      html += almEntry('dice', 'Every ball you own is thrown', 'how it works',
        'A spin drops the whole case at once. Landing <b>half your balls, rounded up</b>, on your colour <b>wins the spin</b> — 1 of 1, 1 of 2, 2 of 3, 2 of 4, 3 of 5 — which is what raises HEAT, extends your streak and unlocks LET IT RIDE.',
        'Only the balls IN THE CASE are thrown — it seats ' + TUNE.startingBallSlots + ' to start, the Counter sells more, ' +
        'and you can swap your collection in and out from the wheel screen at any time. ' +
        'Winning the spin is a separate thing from the money: the money settles ball by ball whatever the threshold does.');
      html += almEntry('refresh', 'The table only spins so often', TUNE.spinsPerRound + ' a round',
        'You get <b>' + TUNE.spinsPerRound + ' trips to the wheel per round</b>, and LET IT RIDE spends one of them.',
        'The Counter sells Another Spin, permanently, as often as you care to buy it. The budget is what stops the wheel being a grind — each spin is meant to be an event.');
      html += almEntry('coinstack', 'Abilities fire win or lose', 'the real point',
        'A ball\'s ability runs on the pocket it landed in, whether the bet came in or not.',
        'The Iron Ball paying $3 on black does not care that you backed red and lost. That is what makes a full case worth spinning even on a bet you expect to drop.');
      BALLS.forEach(def => {
        html += '<div class="alm-entry"><div class="alm-ico"><span class="case-orb ' + def.tint + '"></span></div>' +
          '<div class="alm-body"><div class="alm-title">' + def.name +
          '<span class="alm-tag">' + (def.free ? 'ALWAYS OWNED' : '$' + def.cost + ' · ' + def.rarity) + '</span></div>' +
          '<div class="alm-short">' + def.text + '</div>' +
          (def.long ? '<div class="alm-long">' + def.long + '</div>' : '') +
          '</div></div>';
      });
      html += almEntry('sparkle', 'Painting the wheel', 'permanent',
        'The jewel balls repaint the pocket they land in, for the rest of the run. The green zero is the house\'s own and is never repainted — but every other pocket on the wheel can be taken, and if you keep at it long enough <b>the whole wheel becomes one colour</b>. A ball landing on a pocket that already wears its colour bleeds into the nearest one that does not, so the last few come to you.',
        'It happens in front of you: the pocket flares and repaints while the balls are still sitting in it, before the result goes up. A colour pays less the more of the wheel wears it — paint half the wheel red and red stops paying 3x. Painting buys you a wheel that lands your colour, not a bigger multiple.');
    } else if (almanacTab === 'edge') {
      const steps = [];
      for (let a = TUNE.houseEdgeFromAnte; a <= TUNE.finalAnte; a++) {
        steps.push('Ante ' + a + ': <b>' + Math.round(Math.min(TUNE.houseEdgeCap,
          (a - TUNE.houseEdgeFromAnte + 1) * TUNE.houseEdgePer) * 100) + '%</b>');
      }
      html += almEntry('skim', 'The house takes a cut', 'from Ante ' + TUNE.houseEdgeFromAnte,
        'Every score you make is skimmed before it reaches your round total. Up to Ante ' +
        (TUNE.houseEdgeFromAnte - 1) + ' the casino takes nothing; after that it takes more every ante.',
        steps.join(' &nbsp;·&nbsp; '));
      html += almEntry('coinstack', 'It comes off the score, not the cash',
        'chips only',
        'The skim reduces the points added to your round score. It never touches your money or your CASH OUT purse — and the Side Pot takes its share off the FULL score, before the house edge bites.',
        'That last part matters: at the top antes the pot is the one thing still being fed the whole number, so running the pot and cashing it is how you get those points back.');
      html += almEntry('mask', 'The Inside Man', 'curio',
        'Halves the House Edge for the rest of the run.',
        'The only thing in the game that touches it. At the top antes it is worth more than most multipliers.');
      html += almEntry('twinflame', 'What actually beats it', 'strategy',
        'HEAT, Tempo and the Bounty all scale with how hard you play, and none of them are skimmed at a higher rate.',
        'The edge is a flat percentage, so the answer is never to play safe — it is to make the remaining ' +
        (100 - Math.round(TUNE.houseEdgeCap * 100)) + '% of a much bigger number.');
    } else if (almanacTab === 'bounty') {
      html += almEntry('magnifier', 'One card is always WANTED', 'automatic',
        'The table posts a card at the start of every round. Send that exact card to a foundation and it pays out on the spot, then a new face goes straight up.',
        'The wanted card can be anywhere — buried in the tableau, sitting in the stock, or held in your Stash. Playing it from the Stash counts, which is what the Stash is for.');
      html += almEntry('coinstack', 'What it pays', 'quota / ' + TUNE.bountyDivisor,
        'A bounty is worth your current quota divided by ' + TUNE.bountyDivisor + ' in Chips, plus $' + TUNE.bountyCash + ' cash. It runs through the full Chips x Mult pipeline, so Heat and Tempo apply.',
        'Every bounty you collect in a round makes the next one ' + Math.round(TUNE.bountyGrowth * 100) + '% richer. Chaining four in one round is where the round is actually won.');
      html += almEntry('dice', 'RAISE', 'the table gamble',
        'Doubles the purse but starts a ' + TUNE.bountyDeadline + '-move clock. You can raise up to ' + TUNE.bountyMaxRaises + ' times.',
        'Let a raised bounty escape and ' + Math.round(TUNE.bountyStake * 100) + '% of the purse comes straight off your ante bar — this round first, then your banked rounds — and your cascade breaks. Drawing counts as a move, so raising with the card still face-down in the stock is a real bet.');
      html += almEntry('magnifier', 'The Bounty Hunter', 'curio',
        'Every bounty is worth 60% more.', 'Stacks on top of the per-collection growth, so it is at its best in a round where you chain several.');
      html += almEntry('tag', 'The Wanted Poster', 'curio',
        'Collecting a bounty also pays double cash and raises HEAT by one.',
        'Heat multiplies everything for the rest of the round, so a poster turns the bounty chase into your main multiplier engine.');
    } else if (almanacTab === 'bandit') {
      Object.keys(BANDIT_PRIZES).forEach(sym => {
        const p = BANDIT_PRIZES[sym];
        html += '<div class="alm-entry"><div class="alm-ico reel-ico ' +
          (REEL_SYMBOLS.find(r => r.s === sym) || {}).cls + '">' + sym + sym + sym + '</div>' +
          '<div class="alm-body"><div class="alm-title">' + p.name + '</div>' +
          '<div class="alm-short">' + p.text + '</div></div></div>';
      });
      html += almEntry('dice', 'Two of a kind', 'consolation', 'Returns $6.', '');
      html += almEntry('dice', 'No match', 'consolation', 'Returns $1 and a lesson.', '');
    }
    list.innerHTML = html;
  }

  /* ---------------- menus ---------------- */
  function help() {
    open(
      '<div class="panel help-panel">' +
        '<div class="panel-flag">HOW TO PLAY</div>' +
        '<div class="help-body">' +

          '<h4>The solitaire part</h4>' +
          '<p>Klondike. Build the four foundations up from Ace to King, stack the tableau ' +
          'downward in alternating colours. The stock deals <b>' + TUNE.drawCount + ' cards at a time</b> and only the ' +
          '<b>top one is playable</b> — the two beneath it are buried until you use it. ' +
          'Drag cards, or click one then click where it goes. Double-click sends a card home.</p>' +

          '<h4>What are Chips and Mult?</h4>' +
          '<p class="formula"><span class="c">CHIPS</span> <b>X</b> <span class="m">MULT</span> <b>=</b> <span class="p">POINTS</span></p>' +
          '<p>Chips are the base value, Mult is the multiplier, and their <i>product</i> is what actually ' +
          'gets added to your round score. Chips on their own do nothing — a thousand Chips at 1 Mult is a ' +
          'thousand points, but the same thousand Chips at 20 Mult is twenty thousand. That is the whole game: ' +
          'grow both, but grow Mult harder. Watch the readout on the table resolve it live.</p>' +

          '<h4>What scores</h4>' +
          '<ul>' +
            '<li><b>A card reaching a foundation</b> — its rank in Chips, plus ' + TUNE.chipsPerDepth + ' for every card already on that pile. Kings are worth a fortune.</li>' +
            '<li><b>Flipping a face-down card</b> — ' + TUNE.revealChips + ' Chips.</li>' +
            '<li><b>Emptying a column</b> — ' + TUNE.clearChips + ' Chips X ' + TUNE.clearMult + ' (once per column, per round).</li>' +
            '<li><b>Completing a suit</b> — ' + TUNE.suitDoneChips + ' Chips X ' + TUNE.suitDoneMult + '.</li>' +
          '</ul>' +

          '<h4>The three combos</h4>' +
          '<ul>' +
            '<li><b>Cascade</b> — foundation plays back to back. Each one adds Mult. Drawing from the stock resets it.</li>' +
            '<li><b>Suit Run</b> — consecutive cards of the same suit going home, stacked on top of the Cascade.</li>' +
            '<li><b>Column Stack</b> — the big one, and it is a <i>cash-in</i>, not a passive bonus. ' +
            'The <span class="rb-demo">RUN 7</span> badge under a column shows what that face-up run is worth. ' +
            'You collect it by sending the run\'s <b>bottom card</b> to a foundation — the badge turns green and says ' +
            '<b>CASH IN!</b> the moment that card can actually go. You get <b>+Chips equal to every rank sitting in the run</b> ' +
            'and <b>+' + TUNE.stackMultPer + ' Mult per extra card</b>, all on that one play. ' +
            'Then the next card down is exposed with the run one shorter — so a long run like K-Q-J-10-9-8-7 pays out ' +
            '<i>again on every single card</i> as you dismantle it upward, with the Cascade stacking on top. ' +
            'Building tall and cashing the whole ladder is how big rounds happen.</li>' +
          '</ul>' +

          '<h4>The Bounty</h4>' +
          '<p>The table always has one card posted <b>WANTED</b> — the poster sits beside the Stash. Send that ' +
          'exact card to a foundation from anywhere (the tableau, the waste, or straight out of the Stash) and it pays ' +
          '<b>quota / ' + TUNE.bountyDivisor + ' in Chips</b> plus <b>$' + TUNE.bountyCash + '</b> on the spot, then a new face goes straight up. Every ' +
          'bounty you collect in a round makes the next one <b>' + Math.round(TUNE.bountyGrowth * 100) + '% richer</b>, so chaining them is where big rounds come from.</p>' +
          '<p><b>RAISE</b> is the table\'s own gamble: it doubles the purse but starts a <b>' + TUNE.bountyDeadline + '-move clock</b>. ' +
          'Drawing counts as a move. Bring the card in before the clock runs out and you take the doubled purse; let it escape and ' +
          '<b>' + Math.round(TUNE.bountyStake * 100) + '% of the purse comes off your ante bar</b> and your cascade breaks. You can raise twice.</p>' +

          '<h4>Stuck cards: the Wishing Well and Twins</h4>' +
          '<p>Bought a spare card you can never place — a fourth Queen clogging a column? Drag it into the ' +
          '<b>WISHING WELL</b> beside the waste. It always pays <b>rank x ' + TUNE.wellChipsPerRank + ' Chips</b>, and then the well ' +
          'rolls for something else: cash, a free reshuffle, +3 Mult for the rest of the round, a X3 blessing on your ' +
          'next foundation play, more wishes — or it hands the card back with a <b>new mark permanently printed on it</b>, ' +
          'so the dead Queen returns next round Gilded. Occasionally you just get a frog. ' +
          'You get <b>' + TUNE.wellUses + ' wishes a round</b> (buy more at the Counter, or take The Well Witch).</p>' +

          '<h4>The Side Pot — the corner gamble</h4>' +
          '<p>Every score drops a slice of itself into the <b>SIDE POT</b> in the bottom-right corner. It just sits ' +
          'there getting bigger while you play, and you decide what to do with it:</p>' +
          '<ul>' +
            '<li><b>CASH IT</b> — the whole pot is added straight to your round score. Safe.</li>' +
            '<li><b>SPIN THE WHEEL</b> takes the pot to roulette. Nineteen pockets: nine red, nine black and a ' +
            'single green zero. Back <b>RED</b> or <b>BLACK</b> (9 in 19) and the pot pays <b>' + TUNE.roulettePayEven + 'x</b>; ' +
            'back the green <b>0</b> (1 in 19) and it pays <b>' + TUNE.roulettePayGreen + 'x</b>. Winning also raises your ' +
            '<b>HEAT</b>, which multiplies every score for the rest of the round.</li>' +
            '<li><b>If it misses</b>, the pot is gone <i>and the same amount again comes off your ante total</i> — ' +
            'this round\'s score first, then your banked rounds. A bad spin costs real quota progress, so only ' +
            'take a big pot to the wheel when you can afford to lose twice its size.</li>' +
          '</ul>' +
          '<p>The Card Counter makes your first spin each round unloseable, The Daredevil pays $5 per win, and ' +
          'The Skimmer makes the pot fill nearly twice as fast.</p>' +

          '<h4>Oddities and spare cards</h4>' +
          '<p>The shop sells cards that were never in a deck of 52 — a <b>Joker</b> that becomes whatever a ' +
          'foundation is waiting for, a <b>Report Card</b> graded on how many cards you have sent home, a ' +
          '<b>Coupon</b>, a <b>Bus Transfer</b> worth a pass, a <b>Loyalty Card</b> that grows every time it is ' +
          'scored. Oddities stack onto anything in the tableau and can be laid on any started foundation to cash ' +
          'their ability without advancing it.</p>' +
          '<p>The <b>SPARE CARDS</b> shelf sells a second copy of any ordinary card, cheap. Duplicates stack on ' +
          'each other in a column — two 2 of Clubs sit together — and once a foundation has passed their rank they ' +
          'can be laid on their twin for a full score.</p>' +

          '<h4>Reshuffling the stock</h4>' +
          '<p>A reshuffle throws the waste back in with the stock and shuffles the lot — the fix when draw-3 has ' +
          'buried the card you need. You start each round with <b>' + TUNE.startingStockPasses + ' passes</b>, and a reshuffle ' +
          '<b>spends one</b>, so passes are the real currency of the round: work the stock, or re-order it. ' +
          'Out of passes, you can still buy one for <b>' + TUNE.reshufflePoints + ' points taken straight off your ANTE total</b> — ' +
          'this round first, then your banked rounds — which is a genuine sacrifice of quota progress. ' +
          'Curios and the Counter grant free reshuffles that cost no pass, and a <b>Riffle</b> card reshuffles free ' +
          'whenever it scores. (Hotkey: R)</p>' +

          '<h4>The Ball Case</h4>' +
          '<p>The shop sells <b>balls</b>, and every ball in your case is thrown on every spin. Your stake is ' +
          '<b>split evenly between them</b> and each ball rides its own share, so <b>RED and BLACK always pay 1 to 1</b> ' +
          'and the zero always pays its full multiple, however many balls you own. What lands is paid in full, what misses ' +
          'is gone. A bigger case does not buy a better price — it buys far less variance.</p>' +
          '<p>Landing <b>half your balls, rounded up</b>, on your colour <b>wins the spin</b>, which is a separate thing ' +
          'from the money: it is what raises <b>HEAT</b>, extends your streak and unlocks <b>LET IT RIDE</b>.</p>' +
          '<p><b>The zero is the exception.</b> A green bet does not split and does not care how many balls you own: if ' +
          '<b>any one</b> of them finds a green pocket the <b>whole stake</b> pays the zero in full and the spin is a win. ' +
          'If none do, the whole stake is gone. It is the one bet that gets strictly better with every ball you add.</p>' +
          '<p>The real reason to own balls is what they <i>do</i>. A ball\'s ability fires on the pocket it lands in ' +
          '<b>whether the bet won or lost</b> — the Iron Ball pays $3 on black even when you backed red and it cost you its ' +
          'share. The jewel balls go further and <b>repaint the pocket they land in for the rest of the run</b>, though a ' +
          'colour pays less the more of the wheel wears it. The case seats ' + TUNE.startingBallSlots + ' to start and the ' +
          'Counter sells more seats; you can own as many balls as you like and swap them at the wheel.</p>' +
          '<p>The table allows <b>' + TUNE.spinsPerRound + ' spins a round</b> (LET IT RIDE spends one). The Counter sells more of those too.</p>' +

          '<h4>The House Edge</h4>' +
          '<p>Up to Ante ' + (TUNE.houseEdgeFromAnte - 1) + ' the casino takes nothing. From <b>Ante ' + TUNE.houseEdgeFromAnte + '</b> ' +
          'it skims a percentage off the top of <i>every score you make</i>, before it reaches your round total — ' +
          Math.round(TUNE.houseEdgePer * 100) + '% at first, and another ' + Math.round(TUNE.houseEdgePer * 100) + ' points every ante after, ' +
          'up to ' + Math.round(TUNE.houseEdgeCap * 100) + '%. The badge in the header always shows the current rate, and hovering it ' +
          'tells you how much has gone that round.</p>' +
          '<p>It only touches points. Your money and your CASH OUT purse are never skimmed, and the <b>Side Pot ' +
          'takes its share off the full score before the house edge bites</b> — so running the pot is how you claw some of it back. ' +
          'One Curio — <b>The Inside Man</b> — halves it, and nothing else in the game touches it. Since it is a flat ' +
          'percentage, the answer is never to play safe: it is to make the rest of a much bigger number.</p>' +

          '<h4>The AUTO button</h4>' +
          '<p><b>AUTO</b> is a toggle, not a one-shot. It plays the board a move at a time, in the order a decent ' +
          'player would take them — collect the bounty, free the aces, dig out face-down cards, build with the waste, ' +
          'send home only what nothing can still need, open a column, then turn the stock — and it flies each card ' +
          'across so you can watch the move happen. Press it again, or just touch the board yourself, to stop. ' +
          'It stops on its own when the round ends or when it runs out of good moves, and it will never spend a ' +
          'pass or your ante score for you. (Hotkey: A)</p>' +

          '<h4>Duplicate cards and Twins</h4>' +
          '<p>Buying a second Ace of Spades used to strand it — a foundation only wants the <i>next</i> rank. ' +
          'Now any card whose rank its foundation has already passed can be dropped <b>on top of its twin</b>: it scores ' +
          'in full (plus +' + TUNE.twinMultBonus + ' Mult) without advancing the pile. Duplicates are free points, not dead weight.</p>' +

          '<h4>The Dealer\'s Whim</h4>' +
          '<p>From Ante ' + TUNE.whimsFromAnte + ', every round is dealt under a random house rule — shown as a badge up in the header. ' +
          'Some help (Gold Rush pays $1 a card), some hurt (Butterfingers costs you a stock pass), some are a coin flip. ' +
          'Hover the badge to read it before you plan the round.</p>' +

          '<h4>The Counter and the Bandit</h4>' +
          '<p>The shop\'s <b>Counter</b> is always stocked with permanent upgrades — extra deck flips, mantel seats, undos, ' +
          'even extra columns. They never run out, but each purchase raises that item\'s price for the rest of the run.</p>' +
          '<p>The <b>One-Armed Bandit</b> takes your money and gives you chaos. Three of a kind pays: ' +
          '<b>777</b> a free Curio, <b>★★★</b> a Gilded Polychrome card, <b>$$$</b> cash, <b>♠♠♠</b> permanent Mult, ' +
          '<b>♥♥♥</b> a seat and a pass — and <b>☠☠☠</b> takes half your cash. Two of a kind returns a few dollars. ' +
          'Each pull costs more than the last, and it resets every shop.</p>' +

          '<h4>How you make money</h4>' +
          '<p>The <b>CASH OUT</b> button always shows exactly what this round would pay you right now. It goes up when you:</p>' +
          '<ul>' +
            '<li>finish the round at all — <b>$' + TUNE.baseMoney + '</b> flat</li>' +
            '<li><b>score hard</b> — a commission of $1 for every <i>quota/' + TUNE.commissionDivisor + '</i> points you put up, ' +
            'to a maximum of $' + TUNE.commissionCap + '. Because it is measured against the quota it stays worth chasing at every Ante. ' +
            'This is usually the biggest line on your payout.</li>' +
            '<li><b>combo mid-round</b> — every Cascade X' + TUNE.cascadeCashEvery + ' pays <b>$1</b> on the spot, and cashing a card off a ' +
            'run of ' + TUNE.stackCashAt + '+ pays <b>$1</b> (' + TUNE.stackCashBigAt + '+ pays <b>$2</b>). You will see the cash pop off the table.</li>' +
            '<li>leave a column empty — <b>$' + TUNE.moneyPerEmptyColumn + '</b> each</li>' +
            '<li>complete a suit — <b>$' + TUNE.moneyPerSuitDone + '</b> each</li>' +
            '<li>clear the whole board — <b>$8</b> bonus</li>' +
            '<li>hold savings — <b>$1 interest per $' + TUNE.interestPer + '</b> you have banked, up to $' + TUNE.interestCap + '. Spending everything every shop costs you.</li>' +
          '</ul>' +
          '<p>Cards and Curios pay out mid-round too — anything Gold-Sealed or Bullion, and Curios like ' +
          'Midas Touch or Shop Vac. Those land the instant they trigger.</p>' +
          '<p><b>Hover the CASH OUT button</b> to see the purse itemised, line by line. Nothing in it is ' +
          'yours until you bank it — which is exactly why the wheel will let you stake it. A cash bet ' +
          'comes out of this purse and settles back into it: win and CASH OUT climbs, lose and it drops. ' +
          'Your banked wallet is never touched by the wheel.</p>' +

          '<h4>The quota</h4>' +
          '<p>' + TUNE.roundsPerAnte + ' rounds per Ante, and your scores <b>add up across all ' + TUNE.roundsPerAnte + '</b>. Beat the quota by the end of ' +
          'round ' + TUNE.roundsPerAnte + ' or the run ends. Beat it early and you can bank the Ante for cash instead.</p>' +

          '<h4>Curios vs Card Mods vs New Cards</h4>' +
          '<ul>' +
            '<li><b>Curios</b> are objects. Each one takes a seat on your Mantel — you start with 3, and can buy up to 5. ' +
            'They fire left to right, so put +Mult before XMult. In the shop, hovering a Curio on your mantel shows a red ' +
            '<b>SELL $X</b> band — clicking it sells it for that much.</li>' +
            '<li><b>Card Mods</b> mark one card already in your deck. No seat, permanent, unlimited.</li>' +
            '<li><b>New Cards</b> add a whole extra card to the deck — chameleons, phantoms, fuses. They change the piles themselves.</li>' +
          '</ul>' +

          '<h4>Looking things up</h4>' +
          '<p>Hover any face-up card — on the table or in your deck — to read exactly what its marks do, ' +
          'with the full explanation. Right-click pins the tooltip open. The <b>Almanac</b> (the book icon, or K) ' +
          'lists every Curio, card mark, New Card, House Rule, Whim, Well outcome and Bandit payout in the game, ' +
          'whether you own it or not.</p>' +
          '<p class="keys"><b>Keys:</b> Space = deal &nbsp; R = reshuffle &nbsp; K = almanac &nbsp; A = auto-collect &nbsp; U = undo &nbsp; H = hint &nbsp; D = deck &nbsp; Esc = menu</p>' +
        '</div>' +
        '<button class="btn ghost" id="help-close">GOT IT</button>' +
      '</div>', 'centered wide');
    $('#help-close').onclick = () => { Sfx.click(); close(); };
  }

  function menu() {
    open(
      '<div class="panel menu-panel">' +
        '<div class="panel-flag">PAUSED</div>' +
        '<div class="menu-btns">' +
          '<button class="btn" id="m-resume">RESUME</button>' +
          '<button class="btn ghost" id="m-help">HOW TO PLAY</button>' +
          '<button class="btn ghost" id="m-deck">VIEW DECK</button>' +
          '<button class="btn ghost" id="m-almanac">THE ALMANAC</button>' +
          '<button class="btn danger" id="m-new">ABANDON RUN</button>' +
        '</div>' +
        '<div class="menu-foot">Ante ' + G.run.ante + ' · Round ' + G.run.round + ' · $' + G.run.money + '</div>' +
      '</div>', 'centered');
    $('#m-resume').onclick = () => { Sfx.click(); close(); };
    $('#m-help').onclick = () => { Sfx.click(); help(); };
    $('#m-deck').onclick = () => { Sfx.click(); deckView(); };
    $('#m-almanac').onclick = () => { Sfx.click(); almanac(); };
    $('#m-new').onclick = () => {
      if (!confirm('Abandon this run and start fresh?')) return;
      Sfx.click(); close(); Game.clearSave(); Game.startRun(); UI.resetDisplayScore(); UI.render();
    };
  }

  function title() {
    open(
      '<div class="panel title-panel">' +
        '<div class="logo">PILE<span>DRIVER</span></div>' +
        '<div class="tagline">a roguelike game of solitaire, greed and small strange objects</div>' +
        '<div class="menu-btns">' +
          '<button class="btn big" id="t-new">NEW RUN</button>' +
          '<button class="btn ghost" id="t-cont" style="display:none">CONTINUE RUN</button>' +
          '<button class="btn ghost" id="t-help">HOW TO PLAY</button>' +
        '</div>' +
      '</div>', 'centered title-screen');
    return {
      onNew: fn => { $('#t-new').onclick = fn; },
      showContinue: fn => { const b = $('#t-cont'); b.style.display = ''; b.onclick = fn; },
      onHelp: fn => { $('#t-help').onclick = fn; }
    };
  }

  return { open, close, isOpen, roundEnd, shop, refreshShop, deckView, gameOver, victory, help, menu, title, cardTip, almanac, roulette };
})();
