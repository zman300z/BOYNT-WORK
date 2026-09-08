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
        (met && !last
          ? '<button class="btn bank" id="ov-bank">BANK THE ANTE NOW +$' + ((TUNE.roundsPerAnte - run.round) * TUNE.skipBonus) + '</button>'
          : '') +
        '<button class="btn big" id="ov-continue">' + (last && !met ? 'FACE THE MUSIC' : 'TO THE SHOP →') + '</button>' +
        (met && !last ? '<div class="bank-note">Bank it to skip straight to Ante ' + (run.ante + 1) + ', or keep playing this ante for more cash and Curios.</div>' : '') +
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
      UI.toast('Ante banked — +$' + gain);
      if (G.phase === 'shop') shop();
      else if (G.phase === 'victory') victory();
    };
    if (r.won) Sfx.win();
  }

  /* ---------------- shop ---------------- */
  const SHELF_META = {
    curio: { title: 'CURIOS', sub: 'objects — each one takes a seat on your mantel', cls: 'sh-curio' },
    mod:   { title: 'CARD MODS', sub: 'permanently mark a card already in your deck — no seat needed', cls: 'sh-mod' },
    card:  { title: 'NEW CARDS', sub: 'adds a brand new card into your deck and the piles', cls: 'sh-card' },
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
      if (Game.reroll()) { Sfx.money(); refreshShop(); }
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
      UI.toast('Ante ' + G.run.ante + ' · Round ' + G.run.round, 1400);
    };
  }

  function refreshShop() {
    if (!$('#shelf-curio')) return;
    const run = G.run;
    $('#shop-money').textContent = run.money;
    const rr = $('#shop-reroll');
    if (rr) rr.innerHTML = 'REROLL $<b>' + Game.rerollCost() + '</b>';

    ['curio', 'mod', 'card', 'house'].forEach(shelf => {
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
    out.innerHTML = '<b>' + r.name + '</b> — ' + r.text + (r.lines.length ? '<br>' + r.lines.join('<br>') : '');
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

  /* ---------------- the almanac: every ability in the game ---------------- */
  const ALMANAC_TABS = [
    { id: 'curios',  name: 'CURIOS',     sub: 'objects that take a mantel seat' },
    { id: 'marks',   name: 'CARD MARKS', sub: 'enhancements, finishes and seals' },
    { id: 'cards',   name: 'NEW CARDS',  sub: 'cards you can add to the deck' },
    { id: 'rules',   name: 'HOUSE RULES', sub: 'permanent run upgrades' },
    { id: 'counter', name: 'THE COUNTER', sub: 'always in stock, price climbs' },
    { id: 'whims',   name: "DEALER'S WHIMS", sub: 'random round rules from Ante ' + TUNE.whimsFromAnte },
    { id: 'dares',   name: 'DARES',      sub: 'challenges you can take mid-round' },
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
    } else if (almanacTab === 'dares') {
      DARES.forEach(d => {
        html += almEntry(d.icon, d.name, d.moves + ' moves',
          d.goal + '.', 'Land it: ' + d.rewardText + '. Miss it: ' + d.forfeitText + '.');
      });
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

          '<h4>Stuck cards: the Wishing Well and Twins</h4>' +
          '<p>Bought a spare card you can never place — a fourth Queen clogging a column? Drag it into the ' +
          '<b>WISHING WELL</b> beside the waste. It always pays <b>rank x ' + TUNE.wellChipsPerRank + ' Chips</b>, and then the well ' +
          'rolls for something else: cash, a free reshuffle, +3 Mult for the rest of the round, a X3 blessing on your ' +
          'next foundation play, more wishes — or it hands the card back with a <b>new mark permanently printed on it</b>, ' +
          'so the dead Queen returns next round Gilded. Occasionally you just get a frog. ' +
          'You get <b>' + TUNE.wellUses + ' wishes a round</b> (buy more at the Counter, or take The Well Witch).</p>' +

          '<h4>The Dealer\'s Dare</h4>' +
          '<p><b>TAKE A DARE</b> and the table sets you a challenge with a move budget — send 3 cards home in 6 moves, ' +
          'cash a run of 4, empty a column, flip 4 face-down cards, score 2,500 in 5 moves. Nothing is hidden and ' +
          'nothing is random: it is judged purely on how you play, so there is nothing to memorise or wait out.</p>' +
          '<ul>' +
            '<li><b>Land it</b> — usually <b>HEAT</b>, which multiplies <i>every</i> score for the rest of the round ' +
            '(X' + (1 + TUNE.heatMultPer) + ' at one level, X' + (1 + TUNE.heatMultPer * 4) + ' at four), plus cash, Mult or a reshuffle depending on the dare.</li>' +
            '<li><b>Miss it</b> — usually a pass through the stock. ALL IN takes half of what you scored during it.</li>' +
          '</ul>' +
          '<p>You can take another the moment one resolves, so a hot streak is a chain of dares. Hot Hand makes each ' +
          'level of Heat worth more, The Card Counter buys you 3 extra moves on every dare, and The Daredevil pays ' +
          'a bonus every time you land one.</p>' +

          '<h4>Reshuffling the stock</h4>' +
          '<p>A reshuffle throws the waste back in with the stock and shuffles the lot — the fix when draw-3 has ' +
          'buried the card you need. You start each round with <b>' + TUNE.startingStockPasses + ' passes</b>, and a reshuffle ' +
          '<b>spends one</b>, so passes are the real currency of the round: work the stock, or re-order it. ' +
          'Out of passes, you can still buy one for <b>' + TUNE.reshufflePoints + ' points taken straight off your ANTE total</b> — ' +
          'this round first, then your banked rounds — which is a genuine sacrifice of quota progress. ' +
          'Curios and the Counter grant free reshuffles that cost no pass, and a <b>Riffle</b> card reshuffles free ' +
          'whenever it scores. (Hotkey: R)</p>' +

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

  return { open, close, isOpen, roundEnd, shop, refreshShop, deckView, gameOver, victory, help, menu, title, cardTip, almanac };
})();
