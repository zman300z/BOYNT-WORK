/* ============================================================
   PILE-DRIVER  ::  data.js
   All content: ranks, suits, card marks, Curios (mantel objects),
   Card Mods, New Cards, House Rules.
   ============================================================ */

const RANK_NAMES = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = {
  S: { sym: '♠', name: 'Spades',   color: 'black' },
  H: { sym: '♥', name: 'Hearts',   color: 'red'   },
  D: { sym: '♦', name: 'Diamonds', color: 'red'   },
  C: { sym: '♣', name: 'Clubs',    color: 'black' }
};
const SUIT_KEYS = ['S', 'H', 'D', 'C'];

/* ---------- tuning knobs (all the balance lives here) ---------- */
const TUNE = {
  baseQuota: 2000,   // eased a touch: dealing 3 at a time is a real difficulty bump
  quotaGrowth: 2.2,
  roundsPerAnte: 3,
  finalAnte: 8,
  skipBonus: 5,
  drawCount: 3,                 // classic Klondike: three at a time, top one playable
  baseMoney: 3,
  interestPer: 5,
  interestCap: 5,
  moneyPerEmptyColumn: 1,
  moneyPerSuitDone: 2,
  commissionCap: 12,        // most you can earn from raw scoring in one round
  commissionDivisor: 8,     // you earn $1 per (quota / 8) points scored
  cascadeCashEvery: 5,      // $1 each time the Cascade hits a multiple of this
  stackCashAt: 5,           // cashing a card off a run this long pays $1
  stackCashBigAt: 8,        // ...and this long pays $2
  twinMultBonus: 3,         // Mult bonus for dropping a duplicate onto its twin
  banditBase: 5,            // first pull of the lever each shop
  banditStep: 4,            // each extra pull
  whimsFromAnte: 2,         // the table starts getting opinions at this ante
  startingMantelSlots: 3,
  maxMantelSlots: 5,
  startingStockPasses: 3,
  startingUndos: 3,
  rerollBase: 5,
  rerollStep: 2,
  // scoring
  chipsPerDepth: 6,
  stackMultPer: 2,      // Mult per extra card in the column run you scored off
  stackChipScale: 1,    // Chips per rank-point sitting in that run
  revealChips: 20,
  clearChips: 120,
  clearMult: 3,
  suitDoneChips: 400,
  suitDoneMult: 5
};

function rankChips(rank) {
  if (rank === 1) return 11;
  if (rank >= 11) return 10;
  return rank;
}

/* score tiers -- drive the banner, the shake and the confetti */
const SCORE_TIERS = [
  { at: 100000, name: 'OBSCENE',  cls: 't5', shake: 22, parts: 90 },
  { at: 25000,  name: 'ABSURD',   cls: 't4', shake: 16, parts: 64 },
  { at: 8000,   name: 'BLAZING',  cls: 't3', shake: 11, parts: 44 },
  { at: 2000,   name: 'SPICY',    cls: 't2', shake: 7,  parts: 26 },
  { at: 600,    name: 'NICE',     cls: 't1', shake: 4,  parts: 14 }
];
function tierFor(total) {
  for (const t of SCORE_TIERS) if (total >= t.at) return t;
  return null;
}

/* =========================================================
   CARD MARKS -- printed onto individual cards
   ========================================================= */
const ENHANCEMENTS = {
  none:    { name: 'Plain',     cls: '', text: '' },
  gilded:  { name: 'Gilded',    cls: 'enh-gilded',  glyph: '✦', text: '+50 Chips when scored.' },
  voltaic: { name: 'Voltaic',   cls: 'enh-voltaic', glyph: '⚡', text: '+4 Mult when scored.' },
  glass:   { name: 'Glass',     cls: 'enh-glass',   glyph: '◇', text: 'X2 Mult. 1 in 5 chance to shatter (removed from deck).' },
  wild:    { name: 'Chameleon', cls: 'enh-wild',    glyph: '✿', text: 'Counts as every suit.' },
  phantom: { name: 'Phantom',   cls: 'enh-phantom', glyph: '◌', text: 'Stacks onto any rank in the tableau. +2 Mult.' },
  lucky:   { name: "Rabbit's",  cls: 'enh-lucky',   glyph: '♣', text: '1 in 4: +20 Mult.  1 in 8: earn $3.' },
  steel:   { name: 'Steel',     cls: 'enh-steel',   glyph: '⚒', text: 'X1.5 Mult if scored straight off the tableau.' },
  bomb:    { name: 'Fuse',      cls: 'enh-bomb',    glyph: '✹', text: 'Also scores the card it was sitting on. +30 Chips.' },
  bullion: { name: 'Bullion',   cls: 'enh-bullion', glyph: '$', text: 'Earn $4 when scored.' }
};

const FINISHES = {
  none: { name: '', cls: '', text: '' },
  foil: { name: 'Foil',        cls: 'fin-foil', text: '+60 Chips.' },
  holo: { name: 'Holographic', cls: 'fin-holo', text: '+12 Mult.' },
  poly: { name: 'Polychrome',  cls: 'fin-poly', text: 'X1.5 Mult.' },
  neg:  { name: 'Negative',    cls: 'fin-neg',  text: '+1 Mantel seat (Curios only).' }
};

const SEALS = {
  none: { name: '', cls: '', text: '' },
  red:  { name: 'Red Seal',  cls: 'seal-red',  text: 'Scores a second time.' },
  gold: { name: 'Gold Seal', cls: 'seal-gold', text: 'Earn $4 when scored.' },
  blue: { name: 'Blue Seal', cls: 'seal-blue', text: '+30 Chips.' }
};

/* =========================================================
   CURIOS -- objects that take a seat on your MANTEL
   ========================================================= */
const CURIOS = [
  /* ---------------- commons ---------------- */
  { id: 'rubber_duck', name: 'Rubber Duck', icon: 'duck', rarity: 'common', cost: 4,
    text: '+4 Mult on every score.',
    hooks: { score: c => c.addMult(4) } },

  { id: 'lucky_coin', name: 'Lucky Coin', icon: 'coin', rarity: 'common', cost: 4,
    text: '+40 Chips on every score.',
    hooks: { score: c => c.addChips(40) } },

  { id: 'greasy_thumb', name: 'Greasy Thumb', icon: 'thumb', rarity: 'common', cost: 5,
    text: 'X1.25 Mult on every score.',
    hooks: { score: c => c.xMult(1.25) } },

  { id: 'red_baron', name: 'Red Baron', icon: 'scarf', rarity: 'common', cost: 5,
    text: 'Red cards give +6 Mult.',
    hooks: { score: c => { if (c.card && c.isRed(c.card)) c.addMult(6); } } },

  { id: 'coal_miner', name: 'Coal Miner', icon: 'pick', rarity: 'common', cost: 5,
    text: '+8 Chips for each card still face-down.',
    hooks: { score: c => c.addChips(8 * c.faceDownCount()) } },

  { id: 'undertaker', name: 'The Undertaker', icon: 'tomb', rarity: 'common', cost: 6,
    text: '+45 Chips for each empty column.',
    hooks: { score: c => c.addChips(45 * c.emptyColumns()) } },

  { id: 'court_jester', name: 'Court Jester', icon: 'jester', rarity: 'common', cost: 5,
    text: 'J, Q and K give +55 Chips.',
    hooks: { score: c => { if (c.card && c.card.rank >= 11) c.addChips(55); } } },

  { id: 'ace_sleeve', name: 'Ace Up The Sleeve', icon: 'sleeve', rarity: 'common', cost: 6,
    text: 'Aces give X3 Mult.',
    hooks: { score: c => { if (c.card && c.card.rank === 1) c.xMult(3); } } },

  { id: 'shovel_knight', name: 'Shovel Cult', icon: 'shovel', rarity: 'common', cost: 5,
    text: 'Spades give +7 Mult.',
    hooks: { score: c => { if (c.hasSuit(c.card, 'S')) c.addMult(7); } } },

  { id: 'heart_throb', name: 'Heart Throb', icon: 'heartbeat', rarity: 'common', cost: 5,
    text: 'Hearts give +1 Mult for every Heart already on the foundations.',
    hooks: { score: c => { if (c.hasSuit(c.card, 'H')) c.addMult(Math.max(1, c.foundationCount('H'))); } } },

  { id: 'club_sandwich', name: 'Club Sandwich', icon: 'sandwich', rarity: 'common', cost: 5,
    text: 'Clubs give +45 Chips.',
    hooks: { score: c => { if (c.hasSuit(c.card, 'C')) c.addChips(45); } } },

  { id: 'diamond_hands', name: 'Diamond Hands', icon: 'gemhand', rarity: 'common', cost: 6,
    text: 'Diamonds give +30 Chips and a 1 in 3 chance of $1.',
    hooks: { score: c => { if (c.hasSuit(c.card, 'D')) { c.addChips(30); if (c.chance(3)) c.money(1); } } } },

  { id: 'even_steven', name: 'Even Steven', icon: 'shoe', rarity: 'common', cost: 5,
    text: 'Even ranks give +5 Mult.',
    hooks: { score: c => { if (c.card && c.card.rank % 2 === 0) c.addMult(5); } } },

  { id: 'odd_todd', name: 'Odd Todd', icon: 'sock', rarity: 'common', cost: 5,
    text: 'Odd ranks give +60 Chips.',
    hooks: { score: c => { if (c.card && c.card.rank % 2 === 1) c.addChips(60); } } },

  { id: 'boynt_floaters', name: 'BOYNT Floaters', icon: 'shades', rarity: 'common', cost: 4,
    text: '+3 Mult. It floats. Sells for full price, forever.',
    sellsFull: true,
    hooks: { score: c => c.addMult(3) } },

  /* ---------------- uncommons ---------------- */
  { id: 'the_ladder', name: 'The Ladder', icon: 'ladder', rarity: 'uncommon', cost: 7,
    text: 'Your Cascade bonus counts double.',
    mods: { cascadeMult: 2 } },

  { id: 'metronome', name: 'Metronome', icon: 'metronome', rarity: 'uncommon', cost: 7,
    text: 'Every 3rd card scored this round gets X3 Mult.',
    hooks: { score: c => { if (c.event === 'foundation' && c.round.scoredCards % 3 === 0) c.xMult(3); } } },

  { id: 'hoarder', name: 'Hoarder', icon: 'crates', rarity: 'uncommon', cost: 7,
    text: '+3 Mult for every card in the waste pile.',
    hooks: { score: c => c.addMult(3 * c.wasteCount()) } },

  { id: 'vacuum', name: 'Shop Vac', icon: 'vacuum', rarity: 'uncommon', cost: 6,
    text: 'Emptying a column earns $4.',
    hooks: { score: c => { if (c.event === 'clear') c.money(4); } } },

  { id: 'time_turner', name: 'Time Turner', icon: 'hourglass', rarity: 'uncommon', cost: 8,
    text: '+2 passes through the stock. +1 Undo per round.',
    mods: { stockPasses: 2, undos: 1 } },

  { id: 'sleight', name: 'Sleight Of Hand', icon: 'fingers', rarity: 'uncommon', cost: 9,
    text: 'Deal 2 cards from the stock instead of 3.',
    mods: { drawReduce: 1 } },

  { id: 'the_magnet', name: 'The Magnet', icon: 'magnet', rarity: 'rare', cost: 11,
    text: 'You may play ANY of the face-up cards in the waste, not just the top one.',
    mods: { wasteAll: true } },

  { id: 'loaded_dice', name: 'Loaded Dice', icon: 'dice', rarity: 'uncommon', cost: 7,
    text: '1 in 6 chance for X4 Mult on any score.',
    hooks: { score: c => { if (c.chance(6)) { c.xMult(4); c.flash(); } } } },

  { id: 'cheat_sheet', name: 'Cheat Sheet', icon: 'notebook', rarity: 'uncommon', cost: 8,
    text: 'You can see every face-down card. +1 Mult.',
    mods: { xray: true },
    hooks: { score: c => c.addMult(1) } },

  { id: 'anarchist', name: 'The Anarchist', icon: 'bomb', rarity: 'uncommon', cost: 8,
    text: 'Any card may be moved into an empty column, not just Kings.',
    mods: { anyIntoEmpty: true } },

  { id: 'perpetual', name: 'Perpetual Motion', icon: 'gear', rarity: 'uncommon', cost: 8,
    text: 'Gains +1 Mult every time you flip a card face-up. Resets each Ante.',
    counter: 0, counterLabel: 'Mult',
    hooks: {
      score: c => {
        c.addMult(c.self.counter || 0);
        if (c.event === 'reveal') { c.self.counter = (c.self.counter || 0) + 1; c.flash(); }
      }
    } },

  { id: 'bubble_wrap', name: 'Bubble Wrap', icon: 'bubbles', rarity: 'uncommon', cost: 8,
    text: 'X1.1 Mult, growing by X0.05 with every card scored. Resets each round.',
    counter: 1.1, counterLabel: 'X',
    hooks: {
      roundStart: (run, self) => { self.counter = 1.1; },
      score: c => {
        c.xMult(c.self.counter || 1);
        if (c.event === 'foundation') { c.self.counter = +(((c.self.counter || 1) + 0.05).toFixed(2)); c.flash(); }
      }
    } },

  { id: 'espresso', name: 'Double Espresso', icon: 'coffee', rarity: 'uncommon', cost: 7,
    text: 'The first 3 cards scored each round get X2 Mult.',
    hooks: { score: c => { if (c.event === 'foundation' && c.round.scoredCards <= 3) c.xMult(2); } } },

  { id: 'fibonacci', name: 'Fibonacci Fred', icon: 'shell', rarity: 'uncommon', cost: 8,
    text: 'A, 2, 3, 5 and 8 give +10 Mult.',
    hooks: { score: c => { if (c.card && [1, 2, 3, 5, 8].includes(c.card.rank)) c.addMult(10); } } },

  { id: 'grandfather', name: 'Grandfather Clock', icon: 'clock', rarity: 'uncommon', cost: 7,
    text: 'Kings earn $2 and give +80 Chips.',
    hooks: { score: c => { if (c.card && c.card.rank === 13) { c.money(2); c.addChips(80); } } } },

  { id: 'rain_cloud', name: 'Rain Cloud', icon: 'raincloud', rarity: 'uncommon', cost: 6,
    text: '1 in 3 chance for +150 Chips on any score.',
    hooks: { score: c => { if (c.chance(3)) { c.addChips(150); c.flash(); } } } },

  { id: 'static_cling', name: 'Static Cling', icon: 'bolt', rarity: 'uncommon', cost: 6,
    text: '+250 Chips. X0.5 Mult. A terrible, wonderful bargain.',
    hooks: { score: c => { c.addChips(250); c.xMult(0.5); } } },

  { id: 'sunk_cost', name: 'Sunk Cost', icon: 'anchor', rarity: 'uncommon', cost: 7,
    text: 'Gains +2 Mult every time you attempt an illegal move. Resets each round.',
    counter: 0, counterLabel: 'Mult',
    hooks: {
      roundStart: (run, self) => { self.counter = 0; },
      score: c => c.addMult(c.self.counter || 0)
    } },

  { id: 'the_deep_end', name: 'The Deep End', icon: 'waves', rarity: 'uncommon', cost: 7,
    text: '+4 Mult for every card on your SHORTEST foundation.',
    hooks: { score: c => c.addMult(4 * c.shortestFoundation()) } },

  { id: 'bricklayer', name: 'The Bricklayer', icon: 'crates', rarity: 'uncommon', cost: 8,
    text: 'Your Column Stack bonus gives +4 Mult per card instead of +2.',
    mods: { stackMult: 2 } },

  { id: 'skyscraper', name: 'Skyscraper', icon: 'expand', rarity: 'rare', cost: 10,
    text: '+25 Chips for every card in your tallest column.',
    hooks: { score: c => c.addChips(25 * c.tallestColumn()) } },

  { id: 'rubber_chicken', name: 'Rubber Chicken', icon: 'chicken', rarity: 'uncommon', cost: 6,
    text: 'X1.4 Mult. But 1 in 8 scores, it panics and does nothing at all.',
    hooks: { score: c => { if (c.chance(8)) { c.xMult(0); c.flash(); } else c.xMult(1.4); } } },

  { id: 'gremlin', name: 'The Gremlin', icon: 'gremlin', rarity: 'uncommon', cost: 7,
    text: 'At the start of every round, a random card in your deck becomes Glass. Chaos is a strategy.',
    hooks: {
      roundStart: (run) => {
        const plain = run.deck.filter(c => c.enhancement === 'none');
        if (plain.length) plain[Math.floor(Math.random() * plain.length)].enhancement = 'glass';
      },
      score: c => c.addMult(2)
    } },

  { id: 'chaos_engine', name: 'Chaos Engine', icon: 'chaos', rarity: 'rare', cost: 9,
    text: 'Every score rolls one of: +150 Chips, +12 Mult, X1.6 Mult, or $2.',
    hooks: {
      score: c => {
        const r = Math.floor(Math.random() * 4);
        if (r === 0) c.addChips(150);
        else if (r === 1) c.addMult(12);
        else if (r === 2) c.xMult(1.6);
        else c.money(2);
        c.flash();
      }
    } },

  { id: 'pit_boss', name: 'The Pit Boss', icon: 'bossman', rarity: 'uncommon', cost: 7,
    text: '+35 Chips and +1 Mult for every Curio on your mantel, this one included.',
    hooks: { score: c => { const n = c.run.mantel.length; c.addChips(35 * n); c.addMult(n); } } },

  { id: 'twin_flame', name: 'Twin Flame', icon: 'twinflame', rarity: 'uncommon', cost: 8,
    text: 'Twin plays (duplicates dropped onto their match) score X4 Mult.',
    mods: { twinMult: 4 } },

  { id: 'jackpot_magnet', name: 'Jackpot Magnet', icon: 'slot777', rarity: 'rare', cost: 9,
    text: 'The Bandit costs $3 less to pull and its reels favour you heavily.',
    mods: { banditLuck: true } },

  { id: 'hot_streak', name: 'Hot Streak', icon: 'twinflame', rarity: 'rare', cost: 9,
    text: '+6 Mult for every round you have already played this Ante.',
    hooks: { score: c => c.addMult(6 * (c.run.round - 1)) } },

  /* ---------------- rares ---------------- */
  { id: 'the_collector', name: 'The Collector', icon: 'trophy', rarity: 'rare', cost: 9,
    text: '+400 Chips for every completed suit.',
    hooks: { score: c => c.addChips(400 * c.completedSuits()) } },

  { id: 'mirror_ball', name: 'Mirror Ball', icon: 'disco', rarity: 'rare', cost: 9,
    text: 'The first card scored each round is scored 3 times.',
    mods: { firstRetrigger: 2 } },

  { id: 'doomsday', name: 'Doomsday Clock', icon: 'alarm', rarity: 'rare', cost: 9,
    text: '+1 Mult for every move you have made this round.',
    hooks: { score: c => c.addMult(c.round.moves) } },

  { id: 'copycat', name: 'Copycat', icon: 'paw', rarity: 'rare', cost: 10,
    text: 'Copies the Curio directly to its left.',
    mods: { copyLeft: true } },

  { id: 'sunglasses_hut', name: 'Polarized Lens', icon: 'lens', rarity: 'rare', cost: 10,
    text: 'X1.5 Mult. Every 5th score is X3 instead.',
    hooks: { score: c => c.xMult(c.round.scoreEvents % 5 === 0 ? 3 : 1.5) } },

  { id: 'gravedigger', name: 'Gravedigger', icon: 'skull', rarity: 'rare', cost: 10,
    text: 'Clearing a column gives X2 Mult for the rest of the round.',
    counter: 1, counterLabel: 'X',
    hooks: {
      roundStart: (run, self) => { self.counter = 1; },
      score: c => {
        c.xMult(c.self.counter || 1);
        if (c.event === 'clear') { c.self.counter = (c.self.counter || 1) * 2; c.flash(); }
      }
    } },

  { id: 'loan_shark', name: 'Loan Shark', icon: 'shark', rarity: 'rare', cost: 9,
    text: 'Earn $6 at the end of every round. Interest is capped at $0.',
    mods: { noInterest: true },
    hooks: { roundEnd: () => 6 } },

  { id: 'the_ritual', name: 'The Ritual', icon: 'candle', rarity: 'rare', cost: 11,
    text: 'Every 8th score is X8 Mult.',
    hooks: { score: c => { if (c.round.scoreEvents % 8 === 0) { c.xMult(8); c.flash(); } } } },

  { id: 'chromatic', name: 'Chromatic Scale', icon: 'rainbow', rarity: 'rare', cost: 10,
    text: 'Suit Runs give double Mult and +100 Chips each.',
    mods: { suitRunMult: 2 },
    hooks: { score: c => { if (c.round.suitRun > 1) c.addChips(100 * c.round.suitRun); } } },

  /* ---------------- legendaries ---------------- */
  { id: 'the_dealer', name: 'The Dealer', icon: 'cardsfan', rarity: 'legendary', cost: 16,
    text: 'X0.05 Mult worse for each card left in your stock... but X4 Mult when the stock is empty.',
    hooks: { score: c => { const n = c.stockCount(); c.xMult(n === 0 ? 4 : Math.max(0.6, 2 - n * 0.05)); } } },

  { id: 'house_always_wins', name: 'The House', icon: 'house', rarity: 'legendary', cost: 18,
    text: 'X1 Mult, permanently increased by X0.25 every time you finish a suit.',
    counter: 1, counterLabel: 'X',
    hooks: {
      score: c => {
        c.xMult(c.self.counter || 1);
        if (c.event === 'suit') { c.self.counter = +(((c.self.counter || 1) + 0.25).toFixed(2)); c.flash(); }
      }
    } },

  { id: 'infinity_pool', name: 'Infinity Pool', icon: 'infinity', rarity: 'legendary', cost: 18,
    text: 'The stock never runs out of passes, and Kings may be stacked onto Aces. +8 Mult.',
    mods: { infinitePasses: true, wrapAround: true },
    hooks: { score: c => c.addMult(8) } },

  { id: 'midas_touch', name: 'Midas Touch', icon: 'midas', rarity: 'legendary', cost: 17,
    text: 'Every card you place on a foundation earns $1. X1.5 Mult.',
    hooks: { score: c => { c.xMult(1.5); if (c.event === 'foundation') c.money(1); } } }
];

const CURIO_BY_ID = {};
CURIOS.forEach(c => { CURIO_BY_ID[c.id] = c; });

const RARITY_WEIGHT = { common: 100, uncommon: 45, rare: 16, legendary: 3 };

/* =========================================================
   HOUSE RULES -- permanent, run-long, no mantel seat
   ========================================================= */
const HOUSE_RULES = [
  { id: 'nimble_fingers', name: 'Nimble Fingers', icon: 'fingers', cost: 14, max: 2,
    text: 'Deal one card fewer from the stock (3 -> 2 -> 1).', apply: run => { run.drawReduce++; } },
  { id: 'bigger_table', name: 'Bigger Table', icon: 'table', cost: 12, max: 2,
    text: '+1 Mantel seat.', apply: run => { run.mantelSlots = Math.min(TUNE.maxMantelSlots, run.mantelSlots + 1); } },
  { id: 'generous_dealer', name: 'Generous Dealer', icon: 'handshake', cost: 8, max: 2,
    text: '+1 pass through the stock each round.', apply: run => { run.bonusPasses++; } },
  { id: 'rewind_ribbon', name: 'Rewind Ribbon', icon: 'rewind', cost: 7, max: 2,
    text: '+2 Undos each round.', apply: run => { run.bonusUndos += 2; } },
  { id: 'deep_pockets', name: 'Deep Pockets', icon: 'purse', cost: 9, max: 2,
    text: '+$3 at the end of every round.', apply: run => { run.bonusMoney += 3; } },
  { id: 'loose_change', name: 'Loose Change', icon: 'coinstack', cost: 10, max: 2,
    text: 'Interest cap raised by $3.', apply: run => { run.interestCap += 3; } },
  { id: 'discount_club', name: 'Discount Club', icon: 'tag', cost: 10, max: 2,
    text: 'Everything in the shop is 25% cheaper.', apply: run => { run.discount += 0.25; } },
  { id: 'marked_deck', name: 'Marked Deck', icon: 'magnifier', cost: 9, max: 1,
    text: 'The top face-down card of every column is revealed.', apply: run => { run.markedDeck = true; } },
  { id: 'head_start', name: 'Head Start', icon: 'flag', cost: 11, max: 2,
    text: 'Every round begins with +500 banked score.', apply: run => { run.headStart += 500; } },
  { id: 'wider_felt', name: 'Wider Felt', icon: 'expand', cost: 14, max: 1,
    text: 'Deal an 8th tableau column.', apply: run => { run.columns = 8; } },
  { id: 'gilded_frame', name: 'Gilded Frame', icon: 'frame', cost: 13, max: 2,
    text: 'All Curios give an extra +2 Mult.', apply: run => { run.curioBonusMult += 2; } },
  { id: 'lucky_horseshoe', name: 'Lucky Horseshoe', icon: 'horseshoe', cost: 10, max: 1,
    text: 'All "1 in X" chances are twice as likely.', apply: run => { run.luck = 2; } },
  { id: 'shorter_ladder', name: 'Shorter Ladder', icon: 'ladder', cost: 15, max: 1,
    text: 'All future quotas are 15% smaller.', apply: run => { run.quotaScale *= 0.85; } }
];
const HOUSE_BY_ID = {};
HOUSE_RULES.forEach(h => { HOUSE_BY_ID[h.id] = h; });

/* =========================================================
   CARD MODS -- permanently mark a card already in your deck
   kind: 'enhance' | 'finish' | 'seal' | 'remove'
   ========================================================= */
const CARD_MODS = [
  { id: 't_gilded',  name: 'Gold Leaf',      icon: 'sparkle',  cost: 5, kind: 'enhance', value: 'gilded',  text: 'Make one card Gilded: +50 Chips.' },
  { id: 't_voltaic', name: 'Neon Tube',      icon: 'bolt',     cost: 5, kind: 'enhance', value: 'voltaic', text: 'Make one card Voltaic: +4 Mult.' },
  { id: 't_glass',   name: 'Glassblower',    icon: 'glassgem', cost: 5, kind: 'enhance', value: 'glass',   text: 'Make one card Glass: X2 Mult, but fragile.' },
  { id: 't_wild',    name: 'Chameleon Dust', icon: 'leaf',     cost: 6, kind: 'enhance', value: 'wild',    text: 'Make one card a Chameleon: counts as every suit.' },
  { id: 't_phantom', name: 'Ectoplasm',      icon: 'ghost',    cost: 6, kind: 'enhance', value: 'phantom', text: 'Make one card a Phantom: stacks onto any rank.' },
  { id: 't_lucky',   name: "Rabbit's Foot",  icon: 'clover',   cost: 5, kind: 'enhance', value: 'lucky',   text: "Make one card Rabbit's: random big Mult or cash." },
  { id: 't_steel',   name: 'Anvil',          icon: 'anvil',    cost: 5, kind: 'enhance', value: 'steel',   text: 'Make one card Steel: X1.5 Mult off the tableau.' },
  { id: 't_bomb',    name: 'Stick of TNT',   icon: 'dynamite', cost: 6, kind: 'enhance', value: 'bomb',    text: 'Make one card a Fuse: also scores the card beneath.' },
  { id: 't_bullion', name: 'Bullion Stamp',  icon: 'ingot',    cost: 5, kind: 'enhance', value: 'bullion', text: 'Make one card Bullion: earn $4 when scored.' },
  { id: 't_foil',    name: 'Foil Press',     icon: 'sparkle',  cost: 6, kind: 'finish',  value: 'foil',    text: 'Foil finish on one card: +60 Chips.' },
  { id: 't_holo',    name: 'Hologram Kit',   icon: 'prism',    cost: 7, kind: 'finish',  value: 'holo',    text: 'Holographic finish on one card: +12 Mult.' },
  { id: 't_poly',    name: 'Prism',          icon: 'rainbow',  cost: 8, kind: 'finish',  value: 'poly',    text: 'Polychrome finish on one card: X1.5 Mult.' },
  { id: 't_red',     name: 'Red Wax Seal',   icon: 'stamp',    cost: 6, kind: 'seal',    value: 'red',     text: 'Red Seal: that card scores twice.' },
  { id: 't_gold',    name: 'Gold Wax Seal',  icon: 'stamp',    cost: 5, kind: 'seal',    value: 'gold',    text: 'Gold Seal: earn $4 when that card scores.' },
  { id: 't_blue',    name: 'Blue Wax Seal',  icon: 'stamp',    cost: 5, kind: 'seal',    value: 'blue',    text: 'Blue Seal: +30 Chips.' },
  { id: 't_shred',   name: 'The Shredder',   icon: 'scissors', cost: 6, kind: 'remove',  text: 'Burn one card out of your deck forever. A thinner deck deals kinder.' }
];

/* =========================================================
   NEW CARDS -- physically added to the deck
   kind: 'add' (built fresh) | 'duplicate' (copy one you own)
   ========================================================= */
const NEW_CARDS = [
  { id: 'n_ace', name: 'Spare Ace', icon: 'newcard', cost: 7, kind: 'add',
    text: 'A second Ace, already Gilded. More Aces means more foundations opening early.',
    build: () => ({ rank: 1, suit: rndSuit(), enhancement: 'gilded' }) },

  { id: 'n_wanderer', name: 'The Wanderer', icon: 'wanderer', cost: 10, kind: 'add',
    text: 'A Chameleon with a Polychrome finish. Stacks on any colour, homes to any suit.',
    build: () => ({ rank: rndRank(), suit: rndSuit(), enhancement: 'wild', finish: 'poly' }) },

  { id: 'n_ghost', name: 'Poltergeist', icon: 'ghost', cost: 8, kind: 'add',
    text: 'A Phantom card. It stacks onto absolutely any rank, so dead columns come back to life.',
    build: () => ({ rank: rndRank(), suit: rndSuit(), enhancement: 'phantom' }) },

  { id: 'n_king', name: 'Skeleton King', icon: 'keycard', cost: 9, kind: 'add',
    text: 'A Phantom King in Steel. Opens empty columns AND drops onto anything.',
    build: () => ({ rank: 13, suit: rndSuit(), enhancement: 'phantom', finish: 'foil' }) },

  { id: 'n_agent', name: 'Double Agent', icon: 'twincards', cost: 11, kind: 'add',
    text: 'A Chameleon with a Red Seal — every suit, and it scores twice.',
    build: () => ({ rank: rndRank(), suit: rndSuit(), enhancement: 'wild', seal: 'red' }) },

  { id: 'n_keg', name: 'Powder Keg', icon: 'dynamite', cost: 9, kind: 'add',
    text: 'A Gilded Fuse. Sending it home detonates the card underneath for a second score.',
    build: () => ({ rank: rndRank(), suit: rndSuit(), enhancement: 'bomb', finish: 'foil' }) },

  { id: 'n_bar', name: 'Bullion Bar', icon: 'ingot', cost: 8, kind: 'add',
    text: 'Bullion with a Gold Seal. Worth $8 the moment it reaches a foundation.',
    build: () => ({ rank: rndRank(), suit: rndSuit(), enhancement: 'bullion', seal: 'gold' }) },

  { id: 'n_slipper', name: 'Glass Slipper', icon: 'glassgem', cost: 8, kind: 'add',
    text: 'Glass and Holographic: X2 Mult and +12 Mult, if it survives the round.',
    build: () => ({ rank: rndRank(), suit: rndSuit(), enhancement: 'glass', finish: 'holo' }) },

  { id: 'n_seven', name: 'Lucky Seven', icon: 'clover', cost: 7, kind: 'add',
    text: "A seventh 7, wearing a Rabbit's Foot and a Foil finish.",
    build: () => ({ rank: 7, suit: rndSuit(), enhancement: 'lucky', finish: 'foil' }) },

  { id: 'n_mirror', name: 'Mirror Ace', icon: 'twincards', cost: 8, kind: 'add',
    text: 'A duplicate Ace, Gilded and Foiled. Drop it onto its twin on the foundation for a free score.',
    build: () => ({ rank: 1, suit: rndSuit(), enhancement: 'gilded', finish: 'foil' }) },

  { id: 'n_twin', name: 'The Understudy', icon: 'twincards', cost: 7, kind: 'duplicate',
    text: 'Choose any card in your deck. An exact copy joins it, marks and all.' }
];

function rndSuit() { return SUIT_KEYS[Math.floor(Math.random() * 4)]; }
function rndRank() { return 1 + Math.floor(Math.random() * 13); }

const SHOP_BY_ID = {};
CARD_MODS.forEach(t => { SHOP_BY_ID[t.id] = t; });
NEW_CARDS.forEach(t => { SHOP_BY_ID[t.id] = t; });


/* =========================================================
   THE COUNTER -- always in stock, permanent, price climbs
   ========================================================= */
const COUNTER_ITEMS = [
  { id: 'c_pass', name: 'Extra Deck Flip', icon: 'refresh', base: 8, step: 6,
    text: '+1 pass through the stock, every round, for the rest of the run.',
    apply: run => { run.bonusPasses++; } },

  { id: 'c_seat', name: 'Extra Mantel Seat', icon: 'seat', base: 15, step: 12,
    text: '+1 seat on your mantel. Room for one more strange object.',
    soldOut: run => run.mantelSlots >= TUNE.maxMantelSlots,
    apply: run => { run.mantelSlots = Math.min(TUNE.maxMantelSlots, run.mantelSlots + 1); } },

  { id: 'c_undo', name: 'Extra Undo', icon: 'undo2', base: 6, step: 4,
    text: '+1 Undo every round, forever.',
    apply: run => { run.bonusUndos++; } },

  { id: 'c_column', name: 'Extra Column', icon: 'expand', base: 20, step: 18,
    text: '+1 tableau column dealt every round. More room, more runs to build.',
    soldOut: run => run.columns >= 10,
    apply: run => { run.columns = Math.min(10, run.columns + 1); } }
];
const COUNTER_BY_ID = {};
COUNTER_ITEMS.forEach(c => { COUNTER_BY_ID[c.id] = c; });

function counterPrice(run, id) {
  const def = COUNTER_BY_ID[id];
  const owned = (run.counterBought && run.counterBought[id]) || 0;
  return Math.max(1, Math.ceil((def.base + def.step * owned) * (1 - Math.min(0.75, run.discount))));
}

/* =========================================================
   THE ONE-ARMED BANDIT -- pull the lever, accept your fate
   ========================================================= */
const REEL_SYMBOLS = [
  { s: '7',  cls: 'sy-seven', w: 6 },
  { s: '★',  cls: 'sy-star',  w: 12 },
  { s: '$',  cls: 'sy-cash',  w: 14 },
  { s: '♠',  cls: 'sy-spade', w: 16 },
  { s: '♥',  cls: 'sy-heart', w: 16 },
  { s: '☠',  cls: 'sy-skull', w: 10 }
];

/* what three-of-a-kind gets you. resolved in game.js */
const BANDIT_PRIZES = {
  '7': { name: 'JACKPOT', text: 'A free Curio, or $30 if your mantel is full.' },
  '★': { name: 'STARSTRUCK', text: 'A random card in your deck turns Polychrome AND Gilded.' },
  '$': { name: 'PAYDAY', text: '+$35, right now.' },
  '♠': { name: 'THE EDGE', text: '+3 Mult on every score for the rest of the run.' },
  '♥': { name: 'ROOM TO BREATHE', text: '+1 Mantel seat and +1 stock pass, permanently.' },
  '☠': { name: 'THE HOUSE COLLECTS', text: 'You lose half your cash. Should have walked away.' }
};

/* =========================================================
   THE DEALER'S WHIMS -- a random rule per round from Ante 2
   ========================================================= */
const WHIMS = [
  { id: 'blood_moon', name: 'Blood Moon', icon: 'moon', mood: 'mixed',
    text: 'Hearts and Diamonds get X2 Mult. Spades and Clubs get X0.6.',
    hooks: { score: c => { if (!c.card) return; c.isRed(c.card) ? c.xMult(2) : c.xMult(0.6); } } },

  { id: 'heavy_crown', name: 'Heavy Is The Crown', icon: 'crown', mood: 'mixed',
    text: 'Kings and Queens give +150 Chips but X0.7 Mult.',
    hooks: { score: c => { if (c.card && c.card.rank >= 12) { c.addChips(150); c.xMult(0.7); } } } },

  { id: 'butterfingers', name: 'Butterfingers', icon: 'fingers', mood: 'bad',
    text: 'One fewer pass through the stock this round.',
    mods: { stockPasses: -1 } },

  { id: 'thick_fog', name: 'Thick Fog', icon: 'fog', mood: 'bad',
    text: 'Flipping a card scores nothing. Everything else is normal.',
    mods: { noRevealScore: true } },

  { id: 'gold_rush', name: 'Gold Rush', icon: 'coinstack', mood: 'good',
    text: 'Every card you send home earns $1.',
    hooks: { score: c => { if (c.event === 'foundation') c.money(1); } } },

  { id: 'tight_deal', name: 'Tight Deal', icon: 'cardsfan', mood: 'bad',
    text: 'The stock deals 4 cards at a time instead of 3.',
    mods: { drawReduce: -1 } },

  { id: 'long_con', name: 'The Long Con', icon: 'ladder', mood: 'good',
    text: 'Column Stack bonuses count double.',
    mods: { stackMult: 2 } },

  { id: 'ace_high', name: 'Ace High', icon: 'sleeve', mood: 'good',
    text: 'Aces give X4 Mult.',
    hooks: { score: c => { if (c.card && c.card.rank === 1) c.xMult(4); } } },

  { id: 'static_night', name: 'Static Night', icon: 'bolt', mood: 'good',
    text: 'Every 4th score this round gets X2.5 Mult.',
    hooks: { score: c => { if (c.round.scoreEvents % 4 === 0) { c.xMult(2.5); c.flash(); } } } },

  { id: 'suit_tax', name: 'The Suit Tax', icon: 'tag', mood: 'bad',
    text: '-1 Mult for every card sitting in the waste pile.',
    hooks: { score: c => c.addMult(-c.wasteCount()) } },

  { id: 'generous_table', name: 'Generous Table', icon: 'handshake', mood: 'good',
    text: '+2 Undos and +$4 at the end of the round.',
    mods: { undos: 2 },
    hooks: { roundEnd: () => 4 } },

  { id: 'the_grind', name: 'The Grind', icon: 'gear', mood: 'mixed',
    text: '+2 Mult for every move you make, but the quota feels heavier: X0.8 Chips.',
    hooks: { score: c => { c.addMult(c.round.moves * 2); c.chips *= 0.8; } } },

  { id: 'twin_night', name: 'Hall Of Mirrors', icon: 'twinflame', mood: 'good',
    text: 'Twin plays score X3 Mult.',
    mods: { twinMult: 3 } },

  { id: 'high_stakes', name: 'High Stakes', icon: 'dice', mood: 'mixed',
    text: 'Every score is a coin flip: X2 Mult or X0.75 Mult.',
    hooks: { score: c => c.xMult(Math.random() < 0.5 ? 2 : 0.75) } }
];
const WHIM_BY_ID = {};
WHIMS.forEach(w => { WHIM_BY_ID[w.id] = w; });
