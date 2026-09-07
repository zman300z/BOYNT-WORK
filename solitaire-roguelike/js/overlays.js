/* ============================================================
   PILE-DRIVER  ::  overlays.js
   Round summary, the Curio Shop, deck viewer, run end, help.
   ============================================================ */

const Overlays = (() => {
  const G = Game.G;
  const $ = UI.$, $$ = UI.$$, el = UI.el;
  const ov = () => $('#overlay');

  function open(html, cls) {
    const o = ov();
    o.className = 'show ' + (cls || '');
    o.innerHTML = html;
    return o;
  }
  function close() { ov().className = ''; ov().innerHTML = ''; }
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
      '<div class="pay-line"><span>' + l.label + '</span><b>+$' + l.amount + '</b></div>').join('');

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
        '<div class="payout"><div class="pay-title">PAYOUT</div>' + payLines +
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
  function shop() {
    const run = G.run;
    open(
      '<div class="shop">' +
        '<div class="shop-head">' +
          '<div class="shop-title">THE BACK ROOM</div>' +
          (run.anteCleared ? '<div class="shop-flag">ANTE ' + (run.ante - 1) + ' CLEARED — welcome to Ante ' + run.ante + '</div>' : '') +
          '<div class="shop-cash">$<b id="shop-money">' + run.money + '</b></div>' +
        '</div>' +
        '<div class="shop-hint">Your mantel — click a Curio to sell it, drag sideways to reorder. They trigger left to right.</div>' +
        '<div class="mantel-inline" id="shop-mantel"></div>' +
        '<div class="shop-row" id="shop-items"></div>' +
        '<div class="shop-sub">HOUSE RULES <span>permanent, for the whole run</span></div>' +
        '<div class="shop-row houses" id="shop-houses"></div>' +
        '<div class="shop-foot">' +
          '<button class="btn ghost" id="shop-reroll">REROLL $<b>' + Game.rerollCost() + '</b></button>' +
          '<button class="btn ghost" id="shop-deck">VIEW DECK (' + run.deck.length + ')</button>' +
          '<button class="btn big" id="shop-next">NEXT ROUND →</button>' +
        '</div>' +
      '</div>', 'shop-open');

    refreshShop();
    $('#shop-reroll').onclick = () => {
      if (Game.reroll()) { Sfx.money(); refreshShop(); }
      else { Sfx.error(); UI.toast('Not enough cash.'); }
    };
    $('#shop-deck').onclick = () => deckView();
    $('#shop-next').onclick = () => {
      Sfx.click();
      close();
      Game.leaveShop();
      UI.resetDisplayScore();
      UI.render();
      UI.toast('Ante ' + G.run.ante + ' • Round ' + G.run.round, 1400);
    };
  }

  function refreshShop() {
    if (!$('#shop-items')) return;
    const run = G.run;
    $('#shop-money').textContent = run.money;
    const rr = $('#shop-reroll');
    if (rr) rr.innerHTML = 'REROLL $<b>' + Game.rerollCost() + '</b>';

    const items = $('#shop-items');
    items.innerHTML = '';
    run.shop.items.forEach((item, i) => items.appendChild(shopCard(item, i, 'item')));
    const houses = $('#shop-houses');
    houses.innerHTML = '';
    run.shop.houses.forEach((item, i) => houses.appendChild(shopCard(item, i, 'house')));
    UI.renderMantel($('#shop-mantel'));
    UI.renderMantel($('#mantel'));
  }

  function shopCard(item, index, kind) {
    const run = G.run;
    let def, art, name, text, rarity = 'common';
    if (item.type === 'curio') { def = CURIO_BY_ID[item.id]; rarity = def.rarity; }
    else if (item.type === 'house') def = HOUSE_BY_ID[item.id];
    else def = TINCTURE_BY_ID[item.id];
    art = def.art; name = def.name; text = def.text;

    const price = Game.priceOf(item.type === 'house' ? Object.assign({}, item, { cost: def.cost }) : item);
    const n = el('div', 'shop-item ' + item.type + ' r-' + rarity +
      (item.bought ? ' bought' : '') +
      (item.finish && item.finish !== 'none' ? ' ' + FINISHES[item.finish].cls : '') +
      (run.money < price ? ' broke' : ''));
    n.innerHTML =
      '<div class="si-art">' + art + '</div>' +
      '<div class="si-name">' + name + '</div>' +
      (item.finish && item.finish !== 'none' ? '<div class="si-fin">' + FINISHES[item.finish].name + '</div>' : '') +
      '<div class="si-text">' + text + '</div>' +
      '<div class="si-tag">' + (item.type === 'curio' ? rarity : (item.type === 'house' ? 'house rule' : 'tincture')) + '</div>' +
      '<div class="si-price">' + (item.bought ? 'SOLD' : '$' + price) + '</div>';
    if (!item.bought) {
      n.onclick = () => {
        const res = Game.buy(index, kind === 'house' ? 'house' : 'item');
        if (!res.ok) { Sfx.error(); UI.toast(res.reason || 'Cannot buy that.'); UI.shake(n); return; }
        if (res.kind === 'select') { deckView(res.def); return; }
        Sfx.money();
        UI.burst(n, 12, '#ffd166');
        refreshShop();
        UI.render();
      };
    }
    return n;
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
        } else {
          c.addEventListener('pointerenter', e => UI.showTip(e.currentTarget, cardTip(card)));
          c.addEventListener('pointerleave', UI.hideTip);
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

  function cardTip(card) {
    let s = '<div class="tip-title">' + RANK_NAMES[card.rank] + ' ' + SUITS[card.suit].sym + '</div>';
    s += '<div class="tip-text">Base ' + rankChips(card.rank) + ' Chips</div>';
    if (card.enhancement !== 'none') s += '<div class="tip-text hot">' + ENHANCEMENTS[card.enhancement].name + ' — ' + ENHANCEMENTS[card.enhancement].text + '</div>';
    if (card.finish !== 'none') s += '<div class="tip-text hot">' + FINISHES[card.finish].name + ' — ' + FINISHES[card.finish].text + '</div>';
    if (card.seal !== 'none') s += '<div class="tip-text hot">' + SEALS[card.seal].name + ' — ' + SEALS[card.seal].text + '</div>';
    return s;
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

  /* ---------------- menus ---------------- */
  function help() {
    open(
      '<div class="panel help-panel">' +
        '<div class="panel-flag">HOW TO PLAY</div>' +
        '<div class="help-body">' +
          '<p><b>It is Klondike.</b> Build the four foundations from Ace to King. Stack the tableau downward in alternating colours. Drag cards, or click one then click where it goes. Double-click sends a card home if it can go.</p>' +
          '<p><b>Everything scores.</b> Sending a card to a foundation scores <span class="c">Chips</span> <span class="x">X</span> <span class="m">Mult</span>. Flipping a face-down card scores. Emptying a column scores. Finishing a suit scores a lot.</p>' +
          '<p><b>Cascade.</b> Foundation plays in a row build a Cascade; each one adds Mult. Drawing from the stock breaks it. Sending several cards of the <i>same suit</i> in a row builds a Suit Run on top of that.</p>' +
          '<p><b>The quota.</b> You get ' + TUNE.roundsPerAnte + ' rounds per Ante. Your scores add up across all ' + TUNE.roundsPerAnte + '. Beat the quota by the end of round ' + TUNE.roundsPerAnte + ' or the run is over. You get paid either way.</p>' +
          '<p><b>The Mantel.</b> Curios sit above your table and bend the rules permanently. They fire left to right — order matters, so put your X Mult curios last.</p>' +
          '<p><b>Tinctures</b> mark individual cards in your deck. Those marks last the whole run.</p>' +
          '<p class="keys"><b>Keys:</b> Space = draw &nbsp; A = auto-collect &nbsp; U = undo &nbsp; H = hint &nbsp; D = deck &nbsp; Esc = close</p>' +
        '</div>' +
        '<button class="btn ghost" id="help-close">GOT IT</button>' +
      '</div>', 'centered');
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
          '<button class="btn danger" id="m-new">ABANDON RUN</button>' +
        '</div>' +
        '<div class="menu-foot">Ante ' + G.run.ante + ' · Round ' + G.run.round + ' · $' + G.run.money + '</div>' +
      '</div>', 'centered');
    $('#m-resume').onclick = () => { Sfx.click(); close(); };
    $('#m-help').onclick = () => { Sfx.click(); help(); };
    $('#m-deck').onclick = () => { Sfx.click(); deckView(); };
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

  return { open, close, isOpen, roundEnd, shop, refreshShop, deckView, gameOver, victory, help, menu, title };
})();
