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
        '<div class="shop-foot">' +
          '<button class="btn ghost" id="shop-reroll">REROLL $<b>' + Game.rerollCost() + '</b></button>' +
          '<button class="btn ghost" id="shop-deck">VIEW DECK (' + run.deck.length + ')</button>' +
          '<button class="btn big" id="shop-next">NEXT ROUND →</button>' +
        '</div>' +
      '</div>', 'shop-open');

    refreshShop();
    $('#shop-reroll').onclick = () => {
      if (Game.reroll()) { Sfx.money(); refreshShop(); }
      else { Sfx.error(); UI.toast('Not enough cash to reroll.'); }
    };
    $('#shop-deck').onclick = () => deckView();
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
        preview = '<div class="si-preview">' + previewCard(def) + '</div>';
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
  function previewCard(def) {
    if (def.kind === 'duplicate') {
      return '<div class="mini-pair">' + UI.cardEl({ id: 'p1', rank: 12, suit: 'H', enhancement: 'none', finish: 'none', seal: 'none', faceUp: true }).outerHTML +
             UI.cardEl({ id: 'p2', rank: 12, suit: 'H', enhancement: 'none', finish: 'none', seal: 'none', faceUp: true }).outerHTML + '</div>';
    }
    const spec = def.sample || def.build();
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
    s += '<div class="tip-kind card-kind">CARD — lives in your deck</div>';
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
            '<li><b>Column Stack</b> — the big one. When you send a card home <i>off a column</i>, the face-up run ' +
            'you built underneath it pays out: <b>+Chips equal to the ranks sitting in that run</b>, and ' +
            '<b>+' + TUNE.stackMultPer + ' Mult for every extra card in it</b>. A column reading K-Q-J-10-9 is worth far more ' +
            'than a lone King. Watch the <span class="rb-demo">RUN X5</span> badge on each column — that is your live payout.</li>' +
          '</ul>' +

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
            '<li><b>Curios</b> are objects. Each one takes a seat on your Mantel — you only have 3 (up to 5). They fire left to right, so put +Mult before XMult.</li>' +
            '<li><b>Card Mods</b> mark one card already in your deck. No seat, permanent, unlimited.</li>' +
            '<li><b>New Cards</b> add a whole extra card to the deck — chameleons, phantoms, fuses. They change the piles themselves.</li>' +
          '</ul>' +

          '<p class="keys"><b>Keys:</b> Space = deal &nbsp; A = auto-collect &nbsp; U = undo &nbsp; H = hint &nbsp; D = deck &nbsp; Esc = menu</p>' +
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
