/* ============================================================
   PILE-DRIVER  ::  data.js
   All content: ranks, suits, enhancements, finishes, seals,
   Curios (the joker-likes), House Rules (vouchers) and the shop pools.
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
  baseQuota: 2500,
  quotaGrowth: 2.2,
  roundsPerAnte: 3,
  finalAnte: 8,
  skipBonus: 5,
  baseMoney: 3,
  interestPer: 5,
  interestCap: 5,
  moneyPerEmptyColumn: 1,
  moneyPerSuitDone: 2,
  startingMantelSlots: 3,
  maxMantelSlots: 5,
  startingStockPasses: 3,
  startingUndos: 3,
  rerollBase: 5,
  rerollStep: 2,
  // scoring
  chipsPerDepth: 6,
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

/* =========================================================
   ENHANCEMENTS  -- printed onto the face of a card
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
  bullion: { name: 'Bullion',   cls: 'enh-bullion', glyph: '$',      text: 'Earn $4 when scored.' }
};

/* Finishes -- the shiny layer, works on cards AND curios */
const FINISHES = {
  none: { name: '', cls: '', text: '' },
  foil: { name: 'Foil',        cls: 'fin-foil', text: '+60 Chips.' },
  holo: { name: 'Holographic', cls: 'fin-holo', text: '+12 Mult.' },
  poly: { name: 'Polychrome',  cls: 'fin-poly', text: 'X1.5 Mult.' },
  neg:  { name: 'Negative',    cls: 'fin-neg',  text: '+1 Mantel slot (curios only).' }
};

/* Seals -- stamped on the back corner */
const SEALS = {
  none: { name: '', cls: '', text: '' },
  red:  { name: 'Red Seal',  cls: 'seal-red',  text: 'Scores a second time.' },
  gold: { name: 'Gold Seal', cls: 'seal-gold', text: 'Earn $4 when scored.' },
  blue: { name: 'Blue Seal', cls: 'seal-blue', text: '+30 Chips.' }
};

/* =========================================================
   CURIOS -- the trinkets that sit on your MANTEL
   hooks:
     score(ctx)      every scoring event  (ctx.event: foundation|reveal|clear|suit)
     roundStart(run) once at deal
     roundEnd(run)   returns extra $  (optional)
     mods            static rule changes
   ========================================================= */
const CURIOS = [
  /* ---------------- commons ---------------- */
  { id: 'rubber_duck', name: 'Rubber Duck', art: '\u{1F986}', rarity: 'common', cost: 4,
    text: '+4 Mult on every score.',
    hooks: { score: c => c.addMult(4) } },

  { id: 'lucky_coin', name: 'Lucky Coin', art: '\u{1FA99}', rarity: 'common', cost: 4,
    text: '+40 Chips on every score.',
    hooks: { score: c => c.addChips(40) } },

  { id: 'greasy_thumb', name: 'Greasy Thumb', art: '\u{1F44D}', rarity: 'common', cost: 5,
    text: 'X1.25 Mult on every score.',
    hooks: { score: c => c.xMult(1.25) } },

  { id: 'red_baron', name: 'Red Baron', art: '\u{1F9E3}', rarity: 'common', cost: 5,
    text: 'Red cards give +6 Mult.',
    hooks: { score: c => { if (c.card && c.isRed(c.card)) c.addMult(6); } } },

  { id: 'coal_miner', name: 'Coal Miner', art: '⛏️', rarity: 'common', cost: 5,
    text: '+8 Chips for each card still face-down.',
    hooks: { score: c => c.addChips(8 * c.faceDownCount()) } },

  { id: 'undertaker', name: 'The Undertaker', art: '\u{1FAA6}', rarity: 'common', cost: 6,
    text: '+45 Chips for each empty column.',
    hooks: { score: c => c.addChips(45 * c.emptyColumns()) } },

  { id: 'court_jester', name: 'Court Jester', art: '\u{1F0CF}', rarity: 'common', cost: 5,
    text: 'J, Q and K give +55 Chips.',
    hooks: { score: c => { if (c.card && c.card.rank >= 11) c.addChips(55); } } },

  { id: 'ace_sleeve', name: 'Ace Up The Sleeve', art: '\u{1F454}', rarity: 'common', cost: 6,
    text: 'Aces give X3 Mult.',
    hooks: { score: c => { if (c.card && c.card.rank === 1) c.xMult(3); } } },

  { id: 'shovel_knight', name: 'Shovel Cult', art: '\u{1F3F4}', rarity: 'common', cost: 5,
    text: 'Spades give +7 Mult.',
    hooks: { score: c => { if (c.hasSuit(c.card, 'S')) c.addMult(7); } } },

  { id: 'heart_throb', name: 'Heart Throb', art: '\u{1F495}', rarity: 'common', cost: 5,
    text: 'Hearts give +1 Mult for every Heart already on the foundations.',
    hooks: { score: c => { if (c.hasSuit(c.card, 'H')) c.addMult(Math.max(1, c.foundationCount('H'))); } } },

  { id: 'club_sandwich', name: 'Club Sandwich', art: '\u{1F96A}', rarity: 'common', cost: 5,
    text: 'Clubs give +45 Chips.',
    hooks: { score: c => { if (c.hasSuit(c.card, 'C')) c.addChips(45); } } },

  { id: 'diamond_hands', name: 'Diamond Hands', art: '\u{1F48E}', rarity: 'common', cost: 6,
    text: 'Diamonds give +30 Chips and a 1 in 3 chance of $1.',
    hooks: { score: c => { if (c.hasSuit(c.card, 'D')) { c.addChips(30); if (c.chance(3)) c.money(1); } } } },

  { id: 'even_steven', name: 'Even Steven', art: '\u{1F45F}', rarity: 'common', cost: 5,
    text: 'Even ranks give +5 Mult.',
    hooks: { score: c => { if (c.card && c.card.rank % 2 === 0) c.addMult(5); } } },

  { id: 'odd_todd', name: 'Odd Todd', art: '\u{1F9E6}', rarity: 'common', cost: 5,
    text: 'Odd ranks give +60 Chips.',
    hooks: { score: c => { if (c.card && c.card.rank % 2 === 1) c.addChips(60); } } },

  { id: 'boynt_floaters', name: 'BOYNT Floaters', art: '\u{1F576}️', rarity: 'common', cost: 4,
    text: '+3 Mult. It floats. Sells for full price, forever.',
    sellsFull: true,
    hooks: { score: c => c.addMult(3) } },

  /* ---------------- uncommons ---------------- */
  { id: 'the_ladder', name: 'The Ladder', art: '\u{1FA9C}', rarity: 'uncommon', cost: 7,
    text: 'Your Cascade bonus counts double.',
    mods: { cascadeMult: 2 } },

  { id: 'metronome', name: 'Metronome', art: '\u{1F3BC}', rarity: 'uncommon', cost: 7,
    text: 'Every 3rd card scored this round gets X3 Mult.',
    hooks: { score: c => { if (c.event === 'foundation' && c.round.scoredCards % 3 === 0) c.xMult(3); } } },

  { id: 'hoarder', name: 'Hoarder', art: '\u{1F5C3}️', rarity: 'uncommon', cost: 7,
    text: '+3 Mult for every card in the waste pile.',
    hooks: { score: c => c.addMult(3 * c.wasteCount()) } },

  { id: 'vacuum', name: 'Shop Vac', art: '\u{1F9F9}', rarity: 'uncommon', cost: 6,
    text: 'Emptying a column earns $4.',
    hooks: { score: c => { if (c.event === 'clear') c.money(4); } } },

  { id: 'time_turner', name: 'Time Turner', art: '⏳', rarity: 'uncommon', cost: 8,
    text: '+2 passes through the stock. +1 Undo per round.',
    mods: { stockPasses: 2, undos: 1 } },

  { id: 'cheat_sheet', name: 'Cheat Sheet', art: '\u{1F5D2}️', rarity: 'uncommon', cost: 8,
    text: 'You can see every face-down card. +1 Mult.',
    mods: { xray: true },
    hooks: { score: c => c.addMult(1) } },

  { id: 'anarchist', name: 'The Anarchist', art: '\u{1F4A3}', rarity: 'uncommon', cost: 8,
    text: 'Any card may be moved into an empty column, not just Kings.',
    mods: { anyIntoEmpty: true } },

  { id: 'perpetual', name: 'Perpetual Motion', art: '⚙️', rarity: 'uncommon', cost: 8,
    text: 'Gains +1 Mult every time you flip a card face-up. Resets each Ante.',
    counter: 0, counterLabel: 'Mult',
    hooks: {
      score: c => {
        c.addMult(c.self.counter || 0);
        if (c.event === 'reveal') { c.self.counter = (c.self.counter || 0) + 1; c.flash(); }
      }
    } },

  { id: 'bubble_wrap', name: 'Bubble Wrap', art: '\u{1FAE7}', rarity: 'uncommon', cost: 8,
    text: 'X1.1 Mult, growing by X0.05 with every card scored. Resets each round.',
    counter: 1.1, counterLabel: 'X',
    hooks: {
      roundStart: (run, self) => { self.counter = 1.1; },
      score: c => {
        c.xMult(c.self.counter || 1);
        if (c.event === 'foundation') { c.self.counter = +(((c.self.counter || 1) + 0.05).toFixed(2)); c.flash(); }
      }
    } },

  { id: 'espresso', name: 'Double Espresso', art: '☕', rarity: 'uncommon', cost: 7,
    text: 'The first 3 cards scored each round get X2 Mult.',
    hooks: { score: c => { if (c.event === 'foundation' && c.round.scoredCards <= 3) c.xMult(2); } } },

  { id: 'fibonacci', name: 'Fibonacci Fred', art: '\u{1F41A}', rarity: 'uncommon', cost: 8,
    text: 'A, 2, 3, 5 and 8 give +10 Mult.',
    hooks: { score: c => { if (c.card && [1, 2, 3, 5, 8].includes(c.card.rank)) c.addMult(10); } } },

  { id: 'grandfather', name: 'Grandfather Clock', art: '\u{1F570}️', rarity: 'uncommon', cost: 7,
    text: 'Kings earn $2 and give +80 Chips.',
    hooks: { score: c => { if (c.card && c.card.rank === 13) { c.money(2); c.addChips(80); } } } },

  { id: 'rain_cloud', name: 'Rain Cloud', art: '\u{1F327}️', rarity: 'uncommon', cost: 6,
    text: '1 in 3 chance for +150 Chips on any score.',
    hooks: { score: c => { if (c.chance(3)) { c.addChips(150); c.flash(); } } } },

  { id: 'static_cling', name: 'Static Cling', art: '\u{1F9E6}', rarity: 'uncommon', cost: 6,
    text: '+250 Chips. X0.5 Mult. A terrible, wonderful bargain.',
    hooks: { score: c => { c.addChips(250); c.xMult(0.5); } } },

  { id: 'sunk_cost', name: 'Sunk Cost', art: '\u{1F6A2}', rarity: 'uncommon', cost: 7,
    text: 'Gains +2 Mult every time you attempt an illegal move. Resets each round.',
    counter: 0, counterLabel: 'Mult',
    hooks: {
      roundStart: (run, self) => { self.counter = 0; },
      score: c => c.addMult(c.self.counter || 0)
    } },

  { id: 'the_deep_end', name: 'The Deep End', art: '\u{1F30A}', rarity: 'uncommon', cost: 7,
    text: '+4 Mult for every card on your SHORTEST foundation.',
    hooks: { score: c => c.addMult(4 * c.shortestFoundation()) } },

  /* ---------------- rares ---------------- */
  { id: 'the_collector', name: 'The Collector', art: '\u{1F5FF}', rarity: 'rare', cost: 9,
    text: '+400 Chips for every completed suit.',
    hooks: { score: c => c.addChips(400 * c.completedSuits()) } },

  { id: 'mirror_ball', name: 'Mirror Ball', art: '\u{1FAA9}', rarity: 'rare', cost: 9,
    text: 'The first card scored each round is scored 3 times.',
    mods: { firstRetrigger: 2 } },

  { id: 'doomsday', name: 'Doomsday Clock', art: '⏰', rarity: 'rare', cost: 9,
    text: '+1 Mult for every move you have made this round.',
    hooks: { score: c => c.addMult(c.round.moves) } },

  { id: 'copycat', name: 'Copycat', art: '\u{1F43E}', rarity: 'rare', cost: 10,
    text: 'Copies the Curio directly to its left.',
    mods: { copyLeft: true } },

  { id: 'sunglasses_hut', name: 'Polarized Lens', art: '\u{1F60E}', rarity: 'rare', cost: 10,
    text: 'X1.5 Mult. Every 5th score is X3 instead.',
    hooks: { score: c => c.xMult(c.round.scoreEvents % 5 === 0 ? 3 : 1.5) } },

  { id: 'gravedigger', name: 'Gravedigger', art: '\u{1F480}', rarity: 'rare', cost: 10,
    text: 'Clearing a column gives X2 Mult for the rest of the round.',
    counter: 1, counterLabel: 'X',
    hooks: {
      roundStart: (run, self) => { self.counter = 1; },
      score: c => {
        c.xMult(c.self.counter || 1);
        if (c.event === 'clear') { c.self.counter = (c.self.counter || 1) * 2; c.flash(); }
      }
    } },

  { id: 'loan_shark', name: 'Loan Shark', art: '\u{1F988}', rarity: 'rare', cost: 9,
    text: 'Earn $6 at the end of every round. Interest is capped at $0.',
    mods: { noInterest: true },
    hooks: { roundEnd: () => 6 } },

  { id: 'the_ritual', name: 'The Ritual', art: '\u{1F56F}️', rarity: 'rare', cost: 11,
    text: 'Every 8th score is X8 Mult.',
    hooks: { score: c => { if (c.round.scoreEvents % 8 === 0) { c.xMult(8); c.flash(); } } } },

  { id: 'chromatic', name: 'Chromatic Scale', art: '\u{1F308}', rarity: 'rare', cost: 10,
    text: 'Suit Runs give double Mult and +100 Chips each.',
    mods: { suitRunMult: 2 },
    hooks: { score: c => { if (c.round.suitRun > 1) c.addChips(100 * c.round.suitRun); } } },

  /* ---------------- legendaries ---------------- */
  { id: 'the_dealer', name: 'The Dealer', art: '\u{1F0A0}', rarity: 'legendary', cost: 16,
    text: 'X0.25 Mult for each card left in your stock... but X4 Mult when the stock is empty.',
    hooks: { score: c => { const n = c.stockCount(); c.xMult(n === 0 ? 4 : Math.max(0.6, 2 - n * 0.05)); } } },

  { id: 'house_always_wins', name: 'The House', art: '\u{1F3E0}', rarity: 'legendary', cost: 18,
    text: 'X1 Mult, permanently increased by X0.25 every time you finish a suit.',
    counter: 1, counterLabel: 'X',
    hooks: {
      score: c => {
        c.xMult(c.self.counter || 1);
        if (c.event === 'suit') { c.self.counter = +(((c.self.counter || 1) + 0.25).toFixed(2)); c.flash(); }
      }
    } },

  { id: 'infinity_pool', name: 'Infinity Pool', art: '♾️', rarity: 'legendary', cost: 18,
    text: 'The stock never runs out of passes, and Kings may be stacked onto Aces. +8 Mult.',
    mods: { infinitePasses: true, wrapAround: true },
    hooks: { score: c => c.addMult(8) } },

  { id: 'midas_touch', name: 'Midas Touch', art: '\u{1F91A}', rarity: 'legendary', cost: 17,
    text: 'Every card you place on a foundation earns $1. X1.5 Mult.',
    hooks: { score: c => { c.xMult(1.5); if (c.event === 'foundation') c.money(1); } } }
];

const CURIO_BY_ID = {};
CURIOS.forEach(c => { CURIO_BY_ID[c.id] = c; });

const RARITY_WEIGHT = { common: 100, uncommon: 45, rare: 16, legendary: 3 };

/* =========================================================
   HOUSE RULES -- permanent, run-long upgrades
   ========================================================= */
const HOUSE_RULES = [
  { id: 'bigger_table', name: 'Bigger Table', art: '\u{1FA91}', cost: 12, max: 2,
    text: '+1 Mantel slot.', apply: run => { run.mantelSlots = Math.min(TUNE.maxMantelSlots, run.mantelSlots + 1); } },
  { id: 'generous_dealer', name: 'Generous Dealer', art: '\u{1F91D}', cost: 8, max: 2,
    text: '+1 pass through the stock each round.', apply: run => { run.bonusPasses++; } },
  { id: 'rewind_ribbon', name: 'Rewind Ribbon', art: '↩️', cost: 7, max: 2,
    text: '+2 Undos each round.', apply: run => { run.bonusUndos += 2; } },
  { id: 'deep_pockets', name: 'Deep Pockets', art: '\u{1F45B}', cost: 9, max: 2,
    text: '+$3 at the end of every round.', apply: run => { run.bonusMoney += 3; } },
  { id: 'loose_change', name: 'Loose Change', art: '\u{1FA99}', cost: 10, max: 2,
    text: 'Interest cap raised by $3.', apply: run => { run.interestCap += 3; } },
  { id: 'discount_club', name: 'Discount Club', art: '\u{1F3F7}️', cost: 10, max: 2,
    text: 'Everything in the shop is 25% cheaper.', apply: run => { run.discount += 0.25; } },
  { id: 'marked_deck', name: 'Marked Deck', art: '\u{1F50D}', cost: 9, max: 1,
    text: 'The top face-down card of every column is revealed.', apply: run => { run.markedDeck = true; } },
  { id: 'head_start', name: 'Head Start', art: '\u{1F3C1}', cost: 11, max: 2,
    text: 'Every round begins with +500 banked Chips of score.', apply: run => { run.headStart += 500; } },
  { id: 'wider_felt', name: 'Wider Felt', art: '\u{1F7E9}', cost: 14, max: 1,
    text: 'Deal an 8th tableau column.', apply: run => { run.columns = 8; } },
  { id: 'gilded_frame', name: 'Gilded Frame', art: '\u{1F5BC}️', cost: 13, max: 2,
    text: 'All Curios give an extra +2 Mult.', apply: run => { run.curioBonusMult += 2; } },
  { id: 'lucky_horseshoe', name: 'Lucky Horseshoe', art: '\u{1F40E}', cost: 10, max: 1,
    text: 'All "1 in X" chances are twice as likely.', apply: run => { run.luck = 2; } },
  { id: 'shorter_ladder', name: 'Shorter Ladder', art: '\u{1FA9C}', cost: 15, max: 1,
    text: 'All future quotas are 15% smaller.', apply: run => { run.quotaScale *= 0.85; } }
];
const HOUSE_BY_ID = {};
HOUSE_RULES.forEach(h => { HOUSE_BY_ID[h.id] = h; });

/* =========================================================
   TINCTURES -- shop items that alter the deck itself
   kind: 'enhance' | 'finish' | 'seal' | 'add' | 'remove' | 'duplicate'
   ========================================================= */
const TINCTURES = [
  { id: 't_gilded',  name: 'Gold Leaf',       art: '✦', cost: 5, kind: 'enhance', value: 'gilded',  text: 'Make one card Gilded (+50 Chips).' },
  { id: 't_voltaic', name: 'Neon Tube',       art: '⚡', cost: 5, kind: 'enhance', value: 'voltaic', text: 'Make one card Voltaic (+4 Mult).' },
  { id: 't_glass',   name: 'Glassblower',     art: '◇', cost: 5, kind: 'enhance', value: 'glass',   text: 'Make one card Glass (X2 Mult, fragile).' },
  { id: 't_wild',    name: 'Chameleon Dust',  art: '✿', cost: 6, kind: 'enhance', value: 'wild',    text: 'Make one card a Chameleon (every suit).' },
  { id: 't_phantom', name: 'Ectoplasm',       art: '◌', cost: 6, kind: 'enhance', value: 'phantom', text: 'Make one card a Phantom (stacks anywhere).' },
  { id: 't_lucky',   name: "Rabbit's Foot",   art: '♣', cost: 5, kind: 'enhance', value: 'lucky',   text: "Make one card Rabbit's (random big Mult / cash)." },
  { id: 't_steel',   name: 'Anvil',           art: '⚒', cost: 5, kind: 'enhance', value: 'steel',   text: 'Make one card Steel (X1.5 off the tableau).' },
  { id: 't_bomb',    name: 'Stick of TNT',    art: '✹', cost: 6, kind: 'enhance', value: 'bomb',    text: 'Make one card a Fuse (scores the card beneath).' },
  { id: 't_bullion', name: 'Bullion Stamp',   art: '$',      cost: 5, kind: 'enhance', value: 'bullion', text: 'Make one card Bullion (earn $4).' },
  { id: 't_foil',    name: 'Foil Press',      art: '\u{1F4C0}', cost: 6, kind: 'finish', value: 'foil', text: 'Give one card a Foil finish (+60 Chips).' },
  { id: 't_holo',    name: 'Hologram Kit',    art: '\u{1F52E}', cost: 7, kind: 'finish', value: 'holo', text: 'Give one card a Holographic finish (+12 Mult).' },
  { id: 't_poly',    name: 'Prism',           art: '\u{1F308}', cost: 8, kind: 'finish', value: 'poly', text: 'Give one card a Polychrome finish (X1.5 Mult).' },
  { id: 't_red',     name: 'Red Wax Seal',    art: '\u{1F534}', cost: 6, kind: 'seal', value: 'red',  text: 'Stamp a Red Seal: the card scores twice.' },
  { id: 't_gold',    name: 'Gold Wax Seal',   art: '\u{1F7E1}', cost: 5, kind: 'seal', value: 'gold', text: 'Stamp a Gold Seal: earn $4 when scored.' },
  { id: 't_blue',    name: 'Blue Wax Seal',   art: '\u{1F535}', cost: 5, kind: 'seal', value: 'blue', text: 'Stamp a Blue Seal: +30 Chips.' },
  { id: 't_dupe',    name: 'Twin Press',      art: '\u{1F46F}', cost: 7, kind: 'duplicate', text: 'Add an exact copy of any card in your deck.' },
  { id: 't_shred',   name: 'The Shredder',    art: '✂️', cost: 6, kind: 'remove', text: 'Permanently remove one card from your deck.' },
  { id: 't_ace',     name: 'Spare Ace',       art: '\u{1F0A1}', cost: 7, kind: 'add', build: () => ({ rank: 1, suit: SUIT_KEYS[Math.floor(Math.random() * 4)], enhancement: 'gilded' }), text: 'Add a random Gilded Ace to the deck.' },
  { id: 't_joker',   name: 'The Wanderer',    art: '\u{1F0CF}', cost: 9, kind: 'add', build: () => ({ rank: 1 + Math.floor(Math.random() * 13), suit: SUIT_KEYS[Math.floor(Math.random() * 4)], enhancement: 'wild', finish: 'poly' }), text: 'Add a Polychrome Chameleon card of a random rank.' },
  { id: 't_ghost',   name: 'Poltergeist',     art: '\u{1F47B}', cost: 8, kind: 'add', build: () => ({ rank: 1 + Math.floor(Math.random() * 13), suit: SUIT_KEYS[Math.floor(Math.random() * 4)], enhancement: 'phantom' }), text: 'Add a random Phantom card to the deck.' }
];
const TINCTURE_BY_ID = {};
TINCTURES.forEach(t => { TINCTURE_BY_ID[t.id] = t; });
