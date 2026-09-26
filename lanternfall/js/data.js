'use strict';
// ============================================================================
// Data: biomes, isle graph, story, lore, dialogue, mutations, meta-upgrades
// ============================================================================
(function () {
  const G = window.G;

  // Difficulty scales purely by where you are on the isle (tier).
  G.TIER_HP = [1, 1, 1.75, 2.8, 4.2, 5.9, 7.6];
  G.TIER_DMG = [1, 1, 1.35, 1.8, 2.35, 2.95, 3.5];
  G.itemScale = (tier) => 1 + 0.62 * (tier - 1);

  // ---------------------------------------------------------------- biomes
  G.BIOMES = {
    undercroft: {
      name: 'The Undercroft', sub: 'Where the unforgetting were chained', tier: 1, music: 'undercroft',
      grid: [5, 3], fill: 0.85, loops: 0.12,
      exits: [{ to: 'saltmarsh' }, { to: 'thornwood', rune: 'vine' }],
      enemies: { husk: 5, spitter: 2.5, crawler: 3, jailer: 1.2 },
      density: [1, 3], elite: 0.25,
      specials: ['treasure', 'shop', 'scroll', 'puzzle', 'lore', 'lore', 'treasure'],
      scrolls: 2, runeRooms: ['vine'],
      lore: ['uc1', 'uc2', 'uc3'],
      isle: { x: 230, y: 214 },
      style: {
        tile: { pattern: 'brick', base: '#3d4254', dark: '#262a36', light: '#5c6479', deep: '#0c0d13', rim: '#4a6a55', rimKind: 'moss' },
        back: { pattern: 'brick', base: '#1d2030', dark: '#141621', light: '#262a3c' },
        plat: { base: '#6a4a30', dark: '#3e2a1a' },
        hazard: 'spikes', outdoor: 0,
        sky: { top: '#05060c', bottom: '#10131f' },
        layers: [
          { kind: 'pillars', color: '#0b0d15', factor: 0.15 },
          { kind: 'arches', color: '#111420', factor: 0.35 },
        ],
        ambient: '#03040a', darkness: 0.55, glow: 0.9, particles: 'dust', lightColor: '#ffae5a',
        deco: { torch: 0.7, chain: 0.5, bars: 0.4, bones: 0.5, cobweb: 0.5, banner: 0.15, crate: 0.3 },
      },
    },
    saltmarsh: {
      name: 'Saltmarsh Docks', sub: 'The tide came in, and never left', tier: 2, music: 'saltmarsh',
      grid: [6, 3], fill: 0.85, loops: 0.15,
      exits: [{ to: 'ramparts' }, { to: 'glowcap', rune: 'ram' }],
      enemies: { hookhand: 4, gullbat: 3, slime: 3, harpooner: 2.5, husk: 1.5 },
      density: [2, 3], elite: 0.4,
      specials: ['treasure', 'shop', 'scroll', 'puzzle', 'lore', 'lore', 'cursed', 'guardian', 'treasure'],
      scrolls: 2, runeRooms: ['vine', 'ram'], guardian: 'vine', timed: 240,
      lore: ['sm1', 'sm2', 'sm3'],
      isle: { x: 104, y: 178 },
      style: {
        tile: { pattern: 'stone', base: '#34464a', dark: '#1e2b2e', light: '#4d6668', deep: '#081012', rim: '#5fa088', rimKind: 'weed' },
        back: { pattern: 'plank', base: '#2b2320', dark: '#1a1512', light: '#3a302a' },
        plat: { base: '#7a5a3a', dark: '#48321e' },
        hazard: 'brine', outdoor: 0.75,
        sky: { top: '#071a24', bottom: '#28545a', celestial: 'moon', stars: true },
        layers: [
          { kind: 'lighthouse', color: '#0e2a33', factor: 0.04, dist: 0.2 },
          { kind: 'sea', color: '#163c44', factor: 0.08 },
          { kind: 'ships', color: '#0f2c32', factor: 0.2 },
          { kind: 'houses', color: '#0a1e24', factor: 0.38 },
        ],
        ambient: '#02080c', darkness: 0.38, glow: 0.7, particles: 'rain', lightColor: '#ffc870',
        deco: { torch: 0.5, lantern: 0.6, rope: 0.5, crate: 0.6, barrel: 0.5, net: 0.3, weed: 0.5 },
      },
    },
    thornwood: {
      name: 'The Thornwood', sub: 'The Queen’s garden, gone feral', tier: 2, music: 'thornwood',
      grid: [6, 3], fill: 0.85, loops: 0.2,
      exits: [{ to: 'ramparts' }, { to: 'glowcap' }],
      enemies: { thornling: 3.5, mossback: 2.5, sporebloom: 2.5, gullbat: 2, crawler: 2 },
      density: [2, 3], elite: 0.4,
      specials: ['treasure', 'shop', 'scroll', 'puzzle', 'lore', 'lore', 'lore', 'cursed', 'treasure'],
      scrolls: 3, runeRooms: ['vine', 'spider'], pearl: 'p1',
      lore: ['tw1', 'tw2', 'tw3'],
      isle: { x: 356, y: 178 },
      style: {
        tile: { pattern: 'earth', base: '#3a2d28', dark: '#241b18', light: '#56443a', deep: '#0e0a09', rim: '#4f8f3c', rimKind: 'grass' },
        back: { pattern: 'hedge', base: '#16241a', dark: '#0e1811', light: '#1f3325' },
        plat: { base: '#5a3f2a', dark: '#352415' },
        hazard: 'thorns', outdoor: 0.7,
        sky: { top: '#1a0f26', bottom: '#5a2c4c', celestial: 'moon', stars: true },
        layers: [
          { kind: 'hills', color: '#2a1834', factor: 0.06 },
          { kind: 'trees', color: '#1c1226', factor: 0.18 },
          { kind: 'thorns', color: '#120c18', factor: 0.36 },
        ],
        ambient: '#07030c', darkness: 0.42, glow: 0.8, particles: 'fireflies', lightColor: '#ffd080',
        deco: { flower: 0.8, vine: 0.7, lantern: 0.3, torch: 0.2, mushroom: 0.4, crate: 0.2 },
      },
    },
    ramparts: {
      name: 'Drowned Ramparts', sub: 'Hold the wall. The Brine cannot climb stone.', tier: 3, music: 'ramparts',
      grid: [6, 4], fill: 0.8, loops: 0.15,
      exits: [{ to: 'belfry' }],
      enemies: { knight: 3, archer: 3, bomber: 2.5, hookhand: 1.5, gullbat: 2 },
      density: [2, 4], elite: 0.5,
      specials: ['treasure', 'shop', 'scroll', 'puzzle', 'lore', 'lore', 'lore', 'guardian', 'cursed', 'treasure'],
      scrolls: 3, runeRooms: ['vine', 'ram', 'spider'], guardian: 'spider', timed: 540,
      lore: ['rp1', 'rp2', 'rp3'],
      isle: { x: 140, y: 128 },
      style: {
        tile: { pattern: 'block', base: '#6b6272', dark: '#463f4d', light: '#8f8599', deep: '#15121a', rim: '#6f8a60', rimKind: 'moss' },
        back: { pattern: 'block', base: '#3a3240', dark: '#2a2430', light: '#4a4052' },
        plat: { base: '#6a5040', dark: '#3e2c20' },
        hazard: 'spikes', outdoor: 0.9,
        sky: { top: '#2a1a3e', bottom: '#e8805a', celestial: 'sun', stars: false },
        layers: [
          { kind: 'lighthouse', color: '#5a3050', factor: 0.03, dist: 0.5 },
          { kind: 'clouds', color: '#c86a60', factor: 0.06 },
          { kind: 'towers', color: '#4a2842', factor: 0.16 },
          { kind: 'towers', color: '#2e1a2c', factor: 0.34, big: true },
        ],
        ambient: '#0a0410', darkness: 0.18, glow: 0.6, particles: 'embers', lightColor: '#ffb060',
        deco: { banner: 0.6, torch: 0.5, crate: 0.3, weaponrack: 0.3, window: 0.5 },
      },
    },
    glowcap: {
      name: 'Glowcap Hollow', sub: 'Where memories rot, the fungus glows', tier: 3, music: 'glowcap',
      grid: [5, 5], fill: 0.8, loops: 0.2,
      exits: [{ to: 'belfry' }],
      enemies: { glowmoth: 3, lurker: 2.5, shambler: 2.5, crawler: 2, sporebloom: 1.5 },
      density: [2, 4], elite: 0.5,
      specials: ['treasure', 'shop', 'scroll', 'puzzle', 'lore', 'lore', 'lore', 'cursed', 'treasure', 'treasure'],
      scrolls: 3, runeRooms: ['vine', 'ram', 'spider'], pearl: 'p2',
      lore: ['gc1', 'gc2', 'gc3'],
      isle: { x: 324, y: 132 },
      style: {
        tile: { pattern: 'cave', base: '#2e2640', dark: '#1d182a', light: '#43385a', deep: '#08060d', rim: '#3fd8c8', rimKind: 'glow' },
        back: { pattern: 'cave', base: '#141020', dark: '#0c0914', light: '#1c1730' },
        plat: { base: '#4a3a5a', dark: '#2a2036' },
        hazard: 'spikes', outdoor: 0,
        sky: { top: '#05030a', bottom: '#120c22' },
        layers: [
          { kind: 'stalactites', color: '#0c0918', factor: 0.12 },
          { kind: 'crystals', color: '#16102a', factor: 0.3 },
        ],
        ambient: '#020107', darkness: 0.62, glow: 1.1, particles: 'spores', lightColor: '#50f0e0',
        deco: { mushroom: 1, crystal: 0.6, vine: 0.3, bones: 0.2 },
      },
    },
    belfry: {
      name: 'The Belfry', sub: 'It tolls for no one', tier: 4, music: null, boss: 'bellwarden',
      exits: [{ to: 'cathedral' }, { to: 'ossuary', rune: 'spider' }],
      isle: { x: 230, y: 104 },
      style: {
        tile: { pattern: 'block', base: '#5a5060', dark: '#3a3242', light: '#7a7084', deep: '#100d14', rim: '#b08a4a', rimKind: 'none' },
        back: { pattern: 'block', base: '#2a2432', dark: '#1c1822', light: '#362e40' },
        plat: { base: '#8a6a3a', dark: '#50381e' },
        hazard: 'spikes', outdoor: 1,
        sky: { top: '#0a0c16', bottom: '#3a3a52', celestial: 'none', stars: false, storm: true },
        layers: [
          { kind: 'clouds', color: '#262840', factor: 0.05 },
          { kind: 'lighthouse', color: '#1c1c2e', factor: 0.02, dist: 0.7 },
          { kind: 'towers', color: '#15151f', factor: 0.2 },
        ],
        ambient: '#04040a', darkness: 0.35, glow: 0.7, particles: 'rain', lightColor: '#ffb870',
        deco: {},
      },
    },
    cathedral: {
      name: 'Sunken Cathedral', sub: 'Drink, and be unburdened', tier: 4, music: 'cathedral',
      grid: [6, 4], fill: 0.8, loops: 0.15,
      exits: [{ to: 'maw' }],
      enemies: { priest: 2.5, wraith: 3, penitent: 2, knight: 2, harpooner: 1.5 },
      density: [2, 4], elite: 0.55,
      specials: ['treasure', 'shop', 'scroll', 'puzzle', 'lore', 'lore', 'lore', 'cursed', 'treasure', 'treasure'],
      scrolls: 3, runeRooms: ['vine', 'ram', 'spider'], pearl: 'p3', timed: 900,
      lore: ['ct1', 'ct2', 'ct3'],
      isle: { x: 166, y: 76 },
      style: {
        tile: { pattern: 'marble', base: '#5c5a6c', dark: '#3c3a4a', light: '#807e92', deep: '#0e0d14', rim: '#c8a860', rimKind: 'gold' },
        back: { pattern: 'gothic', base: '#1e1c2a', dark: '#14121c', light: '#2c2a3c' },
        plat: { base: '#6a5a4a', dark: '#3e3428' },
        hazard: 'brine', outdoor: 0,
        sky: { top: '#060812', bottom: '#141a2e' },
        layers: [
          { kind: 'gothic', color: '#0c0e1a', factor: 0.12 },
          { kind: 'glass', color: '#141828', factor: 0.3 },
        ],
        ambient: '#03040a', darkness: 0.48, glow: 1, particles: 'bubbles', lightColor: '#ffd890',
        deco: { candle: 0.8, window: 0.8, banner: 0.3, statue: 0.3, chain: 0.3 },
      },
    },
    ossuary: {
      name: 'Ossuary Depths', sub: 'The dead here remember too well', tier: 4, music: 'ossuary',
      grid: [5, 5], fill: 0.8, loops: 0.2,
      exits: [{ to: 'maw' }],
      enemies: { bonewalker: 3, digger: 2.5, skulls: 2.5, spitter: 1.5, lurker: 1.5 },
      density: [2, 4], elite: 0.55,
      specials: ['treasure', 'shop', 'scroll', 'puzzle', 'lore', 'lore', 'lore', 'cursed', 'treasure', 'treasure'],
      scrolls: 3, runeRooms: ['vine', 'ram', 'spider'], pearl: 'p4',
      lore: ['os1', 'os2', 'os3'],
      isle: { x: 298, y: 80 },
      style: {
        tile: { pattern: 'bone', base: '#6e6658', dark: '#4a4438', light: '#9a9080', deep: '#100e0a', rim: '#9a9080', rimKind: 'none' },
        back: { pattern: 'catacomb', base: '#1c1a16', dark: '#12110e', light: '#2a2620' },
        plat: { base: '#8a8070', dark: '#5a5244' },
        hazard: 'bones', outdoor: 0,
        sky: { top: '#030503', bottom: '#0c120c' },
        layers: [
          { kind: 'skulls', color: '#0e120e', factor: 0.15 },
          { kind: 'pillars', color: '#141a14', factor: 0.35 },
        ],
        ambient: '#010401', darkness: 0.58, glow: 1, particles: 'ghosts', lightColor: '#70ff90',
        deco: { torch: 0.6, bones: 1, skull: 0.8, cobweb: 0.6, chain: 0.3, candle: 0.3 },
      },
    },
    maw: {
      name: 'The Maw', sub: 'What the sea returned', tier: 5, music: null, boss: 'motherbrine',
      exits: [{ to: 'spire' }],
      isle: { x: 230, y: 58 },
      style: {
        tile: { pattern: 'cave', base: '#4a2a3e', dark: '#2e1a28', light: '#6a3e58', deep: '#0e060c', rim: '#e080b0', rimKind: 'glow' },
        back: { pattern: 'cave', base: '#1e0e1a', dark: '#140a12', light: '#2a1424' },
        plat: { base: '#6a4a5a', dark: '#3a2432' },
        hazard: 'brine', outdoor: 0,
        sky: { top: '#0a0208', bottom: '#2a0c22' },
        layers: [
          { kind: 'stalactites', color: '#1a0614', factor: 0.1 },
          { kind: 'ribs', color: '#24081c', factor: 0.28 },
        ],
        ambient: '#060105', darkness: 0.55, glow: 1, particles: 'bubbles', lightColor: '#ff90c0',
        deco: {},
      },
    },
    spire: {
      name: 'The Crown Spire', sub: 'Always up. The Lantern is waiting.', tier: 5, music: 'spire',
      grid: [4, 6], fill: 0.8, loops: 0.2,
      exits: [{ to: 'throne' }],
      enemies: { guard: 2.5, sentinel: 2.5, stormcaller: 2.5, wraith: 1.5, archer: 1.5, bomber: 1 },
      density: [2, 4], elite: 0.7,
      specials: ['treasure', 'shop', 'scroll', 'lore', 'lore', 'lore', 'cursed', 'treasure', 'treasure', 'puzzle'],
      scrolls: 4, runeRooms: ['vine', 'ram', 'spider'], timed: 1500,
      lore: ['sp1', 'sp2', 'sp3'],
      isle: { x: 230, y: 34 },
      style: {
        tile: { pattern: 'block', base: '#a89c84', dark: '#76705e', light: '#cabea4', deep: '#1a1712', rim: '#e0c070', rimKind: 'gold' },
        back: { pattern: 'block', base: '#3c3830', dark: '#2a2720', light: '#4c473c' },
        plat: { base: '#8a7050', dark: '#584430' },
        hazard: 'spikes', outdoor: 0.8,
        sky: { top: '#02030c', bottom: '#1a2446', celestial: 'bigmoon', stars: true },
        layers: [
          { kind: 'sea', color: '#0c1830', factor: 0.03 },
          { kind: 'clouds', color: '#2a3660', factor: 0.08 },
          { kind: 'clouds', color: '#1e2848', factor: 0.2 },
        ],
        ambient: '#02030a', darkness: 0.3, glow: 0.8, particles: 'wind', lightColor: '#ffd070',
        deco: { banner: 0.5, torch: 0.6, window: 0.6, statue: 0.3, candle: 0.3 },
      },
    },
    throne: {
      name: 'The Lantern Crown', sub: 'Last memory of Vael', tier: 6, music: null, boss: 'oris',
      exits: [],
      isle: { x: 230, y: 12 },
      style: {
        tile: { pattern: 'marble', base: '#4a4658', dark: '#2e2c3a', light: '#6a6680', deep: '#0a090e', rim: '#d8b060', rimKind: 'gold' },
        back: { pattern: 'gothic', base: '#16141e', dark: '#0e0d14', light: '#221f2e' },
        plat: { base: '#6a5a4a', dark: '#3e3428' },
        hazard: 'spikes', outdoor: 1,
        sky: { top: '#010108', bottom: '#101630', celestial: 'none', stars: true, storm: true },
        layers: [
          { kind: 'sea', color: '#070c1c', factor: 0.02 },
          { kind: 'clouds', color: '#151a30', factor: 0.06 },
        ],
        ambient: '#010106', darkness: 0.5, glow: 1, particles: 'rain', lightColor: '#ffd070',
        deco: {},
      },
    },
    passage: {
      name: 'Passage', sub: 'A moment of warmth', tier: 0, music: 'passage',
      style: {
        tile: { pattern: 'cave', base: '#3a3030', dark: '#241e1e', light: '#554848', deep: '#0c0909', rim: '#8a7050', rimKind: 'none' },
        back: { pattern: 'cave', base: '#1a1414', dark: '#120e0e', light: '#241c1c' },
        plat: { base: '#6a4a30', dark: '#3e2a1a' },
        hazard: 'spikes', outdoor: 0,
        sky: { top: '#050303', bottom: '#140c0a' },
        layers: [{ kind: 'pillars', color: '#0e0a09', factor: 0.2 }],
        ambient: '#040202', darkness: 0.5, glow: 1, particles: 'dust', lightColor: '#ffb060',
        deco: {},
      },
    },
  };
  for (const id in G.BIOMES) G.BIOMES[id].id = id;
  G.BIOME_ORDER = ['undercroft', 'saltmarsh', 'thornwood', 'ramparts', 'glowcap', 'belfry', 'cathedral', 'ossuary', 'maw', 'spire', 'throne'];

  // ---------------------------------------------------------------- runes
  G.RUNES = {
    vine: { name: 'Rune of Rooting', short: 'Vine Rune', color: '#6fdc5a', desc: 'Withered seeds bloom at your touch, growing climbable vines. Look for glowing seed pods.', from: 'the Saltmarsh guardian' },
    ram: { name: 'Rune of Ruin', short: 'Ram Rune', color: '#ff8a4a', desc: 'Your ground-slam ([down]+[jump] in the air) now shatters cracked, rune-marked floors.', from: 'the Bellwarden' },
    spider: { name: 'Rune of Clinging', short: 'Spider Rune', color: '#b08aff', desc: 'Cling to walls and leap off them. Tall shafts are no longer an obstacle.', from: 'the Ramparts guardian' },
  };

  // ---------------------------------------------------------------- lore
  G.LORE = {
    uc1: { biome: 'undercroft', title: 'Scratched Into a Cell Wall', text: 'They say the Lantern is out. They say the King drank the sea. The guards stopped bringing bread three tides ago. I will not forget her name. I will not forget my name. I will not — [gray](the rest has been scratched away)[]' },
    uc2: { biome: 'undercroft', title: 'Warden’s Ledger', text: 'Prisoners held for Refusal of the Tide Rite: 212. Released on grounds of forgetting: 0.\n\nBy order of His Majesty Oris, those who will not drink shall be kept below, where the Brine may reach them slowly, and kindly.' },
    uc3: { biome: 'undercroft', title: 'Keeper’s Note, Wax-Sealed', text: 'The flame has gone to ground. What little ember remains, I have gathered beneath the lighthouse. I will give it limbs of wax and salt. It will not remember what it is. That is a mercy. The Brine hungers for memory, and this one will have none to take.' },
    sm1: { biome: 'saltmarsh', title: 'Fisherman’s Almanac', text: 'Tide came in at dusk and never went out. Saw my brother walking in the shallows at dawn, eyes like pearls. He did not know me. He said the water was warm. He said I should come in.' },
    sm2: { biome: 'saltmarsh', title: 'Harbormaster’s Final Order', text: 'All vessels remain moored. The Lantern will be relit by morning — the King has promised it. Anyone rowing past the reef will be hanged as a deserter.\n\n[gray]A later hand has written beneath: "There is no morning."[]' },
    sm3: { biome: 'saltmarsh', title: 'A Child’s Drawing', text: 'A crayon drawing of a tall tower with a yellow flame on top. Beneath it, in careful letters: THE LANTERN KEEPS US.\n\n[gray]Someone has scribbled out the flame.[]' },
    tw1: { biome: 'thornwood', title: 'Gardener’s Journal', text: 'The Queen’s garden never needed tending when she walked in it. Things simply wished to grow for her. Now the roses have teeth and I have not seen the sun in forty days. I keep planting. It is all I remember how to do.' },
    tw2: { biome: 'thornwood', title: 'A Letter, Never Sent', text: 'My Ilyse — the physicians say the fever will not break. I have sent for every healer on the isle. I have sent for the Tide Priests, though you begged me not to. Forgive me. I cannot be the one who remains.\n\n— O.' },
    tw3: { biome: 'thornwood', title: 'Carved Into a Thornwood Tree', text: '"I. + O." inside a heart.\n\nBeneath it, newer and deeper: SHE IS GONE AND HE HAS DROWNED US ALL FOR IT.' },
    rp1: { biome: 'ramparts', title: 'Posted Orders', text: 'HOLD THE WALL. THE BRINE CANNOT CLIMB STONE.\n\n[gray]Beneath, in a shaking hand: It could.[]' },
    rp2: { biome: 'ramparts', title: 'Ser Aldric’s Oath', text: 'I swore to keep the King from harm. I did not swear to keep the isle from the King. The Rite was his choice. The drowning was his choice. My blade is still his. Gods help me, it is still his.' },
    rp3: { biome: 'ramparts', title: 'Signal Log', text: 'Lantern dark. Bell unanswered. Captain Hale has gone up to ring it by hand.\n\nWe hear it tolling still, every dusk. Hale has not come down.' },
    gc1: { biome: 'glowcap', title: 'Miner’s Tally', text: 'Found a new seam of brine-glass today. It glows when you hold it. It whispers in your mother’s voice. Foreman says don’t listen.\n\nForeman listens.' },
    gc2: { biome: 'glowcap', title: 'Cultivator’s Warning', text: 'Glowcaps grow where memories rot. Do not eat them. You will remember things that never happened to you, and forget the things that did.' },
    gc3: { biome: 'glowcap', title: 'Crushed Survey', text: 'A cartographer’s survey, half-crushed under a fallen stalactite. The margin reads: "These tunnels shift with every tide. The isle is rearranging itself — like something turning over in its sleep." It is signed with a small, neat M.' },
    ct1: { biome: 'cathedral', title: 'Tide Rite Liturgy', text: 'Drink, and be unburdened. Drink, and the ones you lost are never lost, for you shall not remember losing them. Drink, and join the Tide that remembers for us all.' },
    ct2: { biome: 'cathedral', title: 'High Priest Morrow’s Confession', text: 'The King asked me if the Tide could bring her back. I told him the Tide returns everything.\n\nI did not tell him how.' },
    ct3: { biome: 'cathedral', title: 'Stained Glass Inscription', text: 'WHERE THE LANTERN BURNS, THE TIDE MUST YIELD.\nWHERE THE LANTERN FAILS, THE TIDE SHALL KEEP.' },
    os1: { biome: 'ossuary', title: 'An Epitaph', text: 'Here lies one who refused to drink. She is not at rest.\n\nBut she is herself.' },
    os2: { biome: 'ossuary', title: 'Gravedigger’s Complaint', text: 'The dead down here won’t stay dead. Not out of malice — out of stubbornness. They remember too well who they were. Only place on the isle where that’s a curse.' },
    os3: { biome: 'ossuary', title: 'Bone Tablet', text: 'The Brine cannot take what is already buried. So we buried our memories: names carved in bone, songs sealed in skulls. Dig, if you need to remember. We will wait.' },
    bf1: { biome: 'belfry', title: 'Captain Hale’s Last Entry', text: 'The bell calls the keepers to the Lantern. I will ring it until someone answers. I will ring it until I forget why. I will ring it until the ringing is all that I am.' },
    mw1: { biome: 'maw', title: 'Waterlogged Portrait', text: 'A royal portrait, its colors run by seawater: a woman with pale hair and a gentle smile. The plaque reads "Her Majesty Ilyse, Beloved of the Isle."\n\nSomething has pressed its face against the canvas from behind.' },
    sp1: { biome: 'spire', title: 'Oris’s Journal, First Night', text: 'The Tide Priests say it is simple. Snuff the Lantern, and the sea will return what it has taken. I will have her back. The isle can do without light for one night.' },
    sp2: { biome: 'spire', title: 'Oris’s Journal, Fortieth Night', text: 'She came back. She rose out of the harbor, so large, so cold, and singing. She does not know me. I do not think she is her.\n\nI cannot relight the Lantern. If the light returns, she drowns again.' },
    sp3: { biome: 'spire', title: 'Oris’s Journal, Last Page', text: 'I am the only one left who remembers her. So I will not drink. I will sit here and remember, and the sea may have everything else. Let it rise. Let it take the world, so long as it leaves me her name.' },
  };
  G.PEARLS = {
    p1: { biome: 'thornwood', title: 'Pearl of the Garden', text: 'A memory, warm as sunlight: Queen Ilyse on her knees in the dirt, laughing, teaching a clumsy young gardener to graft a rose. "Patience," she says. "Everything that grows, grows slowly."' },
    p2: { biome: 'glowcap', title: 'Pearl of the Song', text: 'A memory, soft as a lullaby: the Queen in the deep mines, singing to the miners’ children so they would not fear the dark. "The Lantern is always above you," she sings. "Even when you cannot see it."' },
    p3: { biome: 'cathedral', title: 'Pearl of the Vow', text: 'A memory, steady as stone: the Queen, pale with fever, refusing the Tide Priests’ cup. "If I die," she tells them, "let me die as myself."' },
    p4: { biome: 'ossuary', title: 'Pearl of the Name', text: 'A memory, the last one: her hand in his. "Keep the Lantern lit, love," she whispers to Oris. "And let me go."' },
  };

  // ---------------------------------------------------------------- story text
  G.INTRO_TEXT = [
    'For a thousand years, the Lantern of Vael burned atop its spire,\nand the Tide kept its distance.',
    'The Tide is not water. It is hunger.\nIt drinks memory — names, faces, songs —\nand leaves behind only the Drowned.',
    'Then the King put out the light.',
    'Now, in the dark beneath the lighthouse,\na single ember still smolders...',
    '...and someone is giving it a body.',
  ];
  G.ENDING_TEXT = [
    'The Lantern burns again. Its light pours down the spire,\nover the ramparts, into the drowned streets.',
    'The Tide recoils, hissing, back beyond the reef.\nThe isle stops sinking.',
    'But the Drowned do not wake. Their memories are gone to the deep,\nand the deep does not give things back.',
    'Beneath the lighthouse, the Keeper gathers what is left of your wax.\n"The Tide always returns," he murmurs. "So do you."',
  ];
  G.TRUE_ENDING_TEXT = [
    'The four pearls melt into the flame, and for a moment\nthe Lantern burns the color of a garden in spring.',
    'Oris remembers. Not the drowning — her.\nHer laugh. Her song. Her vow. Her last request.',
    'Far below, in the flooded Maw, something vast and sorrowful\nsinks gently into the dark, and is finally still.',
    'The Tide retreats — not beaten, but released.\nOne by one, the Drowned blink in the new light,\nand remember their names.',
    'The little wick flickers atop the spire.\nIt has done what it was made for.\n\nFor the first time, it rests.',
  ];

  // ---------------------------------------------------------------- dialogue
  // speaker ids: keeper, mara, pellam, oris, hale, ilyse, wick
  G.SPEAKERS = {
    keeper: { name: 'The Keeper', color: '#ffb46a' },
    mara: { name: 'Mara', color: '#8ad0ff' },
    pellam: { name: 'Pellam the Peddler', color: '#ffd24a' },
    oris: { name: 'King Oris', color: '#9ab8d8' },
    hale: { name: 'Captain Hale', color: '#d8a860' },
    brine: { name: 'Mother Brine', color: '#ff90c0' },
    ilyse: { name: 'Ilyse', color: '#f0e0ff' },
    tablet: { name: '', color: '#c8c8c8' },
  };
  G.DIALOGUE = {
    keeperFirst: [
      ['keeper', 'Ah. The little flame walks. Good. [ember]Good.[]'],
      ['keeper', 'You won’t remember me. You never do. I am the Keeper — I made that body of yours, from candle-wax and sea-salt and stubbornness.'],
      ['keeper', 'The Drowned out there carry [ember]embers[] — scraps of the Lantern’s light, swallowed when the flame went out. Bring them to me.'],
      ['keeper', 'With enough embers I can make you stronger. Deeper flasks. Better blades. Better wax for the next body.'],
      ['keeper', 'And there will be a next body. Embers you carry are lost when you fall — so spend them here, between the tides.'],
      ['keeper', 'Now go. Up. Always up. The Lantern is waiting.'],
    ],
    keeperIdle: [
      [['keeper', 'Embers, little wick? Better in my hands than the Tide’s.']],
      [['keeper', 'Every death teaches the wax something. Not you, perhaps. But the wax.']],
      [['keeper', 'Up the spire. Always up.']],
      [['keeper', 'I have made you four hundred and twelve times. You are getting better at it.']],
      [['keeper', 'The King was kind, once. Remember that, when you meet him. Or don’t — you won’t remember anything.']],
      [['keeper', 'Drink from the fountain. It is only water. Real water, for once.']],
    ],
    keeperVictory: [
      ['keeper', 'You lit it. I can feel the warmth from all the way down here.'],
      ['keeper', 'The Tide will come back one day. It always does. But tonight... tonight, rest.'],
    ],
    maraFirst: [
      ['mara', 'Oh! You’re... not drowned. You’re — is your head on [orange]fire[]?'],
      ['mara', 'I’m Mara. I map the isle. Or I try — the Brine shifts everything with every tide. Walls wander. Doors move. No chart I draw stays true.'],
      ['mara', 'But you’re going up, aren’t you? To the Lantern. Nobody’s tried that in... well. Nobody remembers.'],
      ['mara', 'Here — take my [cyan]quill[]. It’s enchanted. It sketches every room you walk through, however the isle rearranges itself. It’ll show you where you stand on the whole isle, too.'],
      ['mara', 'If you find me again, I’ll sell you my charts. A girl has to eat.'],
    ],
    maraLater: [
      [['mara', 'Back again? The Tide’s shuffled everything. I’ve charted this whole stretch — yours for a little gold.']],
      [['mara', 'You again! Still on fire, I see. Want my chart of this place?']],
      [['mara', 'Careful down here. I’ve marked the vaults and the merchant — for a price.']],
    ],
    pellamGreet: [
      [['pellam', 'Coin for steel, steel for coin. Greed’s the one thing the Brine can’t wash out of a man.']],
      [['pellam', 'Browse, browse! Everything guaranteed un-drowned. Mostly.']],
      [['pellam', 'Ah, the burning one. I remember you. Which is rare, these days.']],
    ],
    orisIntro: [
      ['oris', 'So. The Keeper has sent another candle.'],
      ['oris', 'Do you know what you are here to do, little wick? Relight the Lantern. Burn the Tide away. And with it, the last of [pink]her[].'],
      ['oris', 'I have remembered her for a thousand tides. I will not let you make me forget.'],
      ['oris', 'Come, then. Let us see which of us the sea keeps.'],
    ],
    orisPhase3: [['oris', 'IF THE LIGHT RETURNS, SHE IS GONE! DO YOU HEAR ME? GONE!']],
    orisDefeat: [
      ['oris', '...Ilyse. I can’t... I can’t see your face anymore.'],
      ['oris', 'Light it, then. Light it, before I forget why I shouldn’t.'],
    ],
    orisTrue: [
      ['oris', 'Those pearls... that light... I remember.'],
      ['oris', 'You asked me to keep the Lantern lit. You asked me to let you go. And I —'],
      ['ilyse', 'It’s all right, love. Let me go.'],
      ['oris', '...I’m sorry. I’m so sorry. Go gently, my Ilyse.'],
    ],
    haleIntro: [['hale', 'Who... answers the bell? No one. NO ONE ANSWERS THE BELL!']],
    brineIntro: [['brine', 'Oris...? Oris... come into the water, love... it is warm...']],
    guardianVine: [['tablet', 'A drowned sea-captain, wreathed in kelp, blocks the way. Something green and alive pulses in his chest.']],
    guardianSpider: [['tablet', 'Ser Aldric the Unbent stands his eternal watch. "None pass while I hold this wall."']],
    fountain: [['tablet', 'Clear water. Your flasks refill.']],
    cursedChest: [['tablet', 'A chest bound in black chains. Opening it will [red]curse[] you: the next hit you take will kill you, until you have slain enough foes to break the curse.']],
    timedDoor: [['tablet', 'An hourglass-shaped seal. It opens only for those swift enough to arrive in time.']],
    seedNoRune: [['tablet', 'A withered seed pod. It pulses faintly, as if waiting for a particular touch.']],
    rampNoRune: [['tablet', 'The floor here is cracked and marked with a rune of ruin. A mighty blow from above might shatter it.']],
    shaftNoRune: [['tablet', 'The walls of this shaft are rough and sheer. If only you could cling to them.']],
  };

  // ---------------------------------------------------------------- mutations
  G.MUTATIONS = {
    kindled: { name: 'Kindled Fury', stat: 'fury', desc: 'Killing an enemy grants [fury]+35% damage[] for 4s.', start: true },
    saltskin: { name: 'Salt Skin', stat: 'vigor', desc: 'Take [vigor]20% less damage[].', start: true },
    laststand: { name: 'Last Stand', stat: 'fury', desc: '[fury]+45% damage[] while below 40% health.', start: true },
    leech: { name: 'Ember Leech', stat: 'vigor', desc: 'Kills restore [vigor]3% of max health[].', start: true },
    quickwick: { name: 'Quickwick', stat: 'cunning', desc: '[cunning]+15% move speed[], roll cooldown halved.', start: true },
    stillwater: { name: 'Stillwater', stat: 'cunning', desc: 'Skill cooldowns [cunning]-30%[].', cost: 40 },
    frenzy: { name: 'Frenzy', stat: 'fury', desc: 'Attack speed [fury]+18%[].', cost: 50 },
    riposte: { name: 'Riposte', stat: 'vigor', desc: 'Parrying heals [vigor]6%[] and your next hit within 2s is a critical.', cost: 40 },
    secondwind: { name: 'Second Wind', stat: 'vigor', desc: 'Recoverable (rally) health lasts twice as long and recovers twice as fast.', cost: 45 },
    alchemy: { name: 'Alchemy', stat: 'vigor', desc: '[vigor]+1 flask charge[] this run, and flasks heal 20% more.', cost: 60 },
    greed: { name: 'Greed', stat: 'cunning', desc: '[gold]+60% gold[] from all sources.', cost: 35 },
    scorched: { name: 'Scorched Path', stat: 'fury', desc: 'Rolling leaves a trail of [orange]fire[] that burns enemies.', cost: 50 },
    deathsdoor: { name: 'Death’s Door', stat: 'vigor', desc: 'Once per biome, survive a lethal blow with 1 HP and 2s of invulnerability.', cost: 80 },
    hunter: { name: 'Hunter', stat: 'cunning', desc: '[cunning]+30% damage[] to elites and bosses.', cost: 60 },
    tidesense: { name: 'Tidesense', stat: 'cunning', desc: 'Enemies appear on your map. [cunning]+10% critical chance[].', cost: 45 },
    quiver: { name: 'Quiver', stat: 'cunning', desc: 'Ranged weapons deal [cunning]+30% damage[] and fire 20% faster.', cost: 50 },
    ironwill: { name: 'Iron Will', stat: 'vigor', desc: 'Blocking takes 20% less damage; blocked hits become fully recoverable.', cost: 45 },
    embersoul: { name: 'Ember Soul', stat: 'fury', desc: 'Every ember pickup is worth [ember]+1 ember[].', cost: 70 },
  };

  // ---------------------------------------------------------------- Keeper upgrades (embers)
  G.UPGRADES = [
    { id: 'flask1', name: 'Deeper Flask I', desc: '+1 health flask charge.', cost: 40, group: 'Flask' },
    { id: 'flask2', name: 'Deeper Flask II', desc: '+1 health flask charge.', cost: 120, req: 'flask1', group: 'Flask' },
    { id: 'flask3', name: 'Deeper Flask III', desc: '+1 health flask charge.', cost: 300, req: 'flask2', group: 'Flask' },
    { id: 'potency1', name: 'Potent Brew I', desc: 'Flasks heal 70% instead of 60%.', cost: 90, req: 'flask1', group: 'Flask' },
    { id: 'potency2', name: 'Potent Brew II', desc: 'Flasks heal 80%.', cost: 250, req: 'potency1', group: 'Flask' },
    { id: 'reserve1', name: 'Gold Reserve I', desc: 'Keep 15% of your gold when you fall.', cost: 60, group: 'Gold' },
    { id: 'reserve2', name: 'Gold Reserve II', desc: 'Keep 30% of your gold when you fall.', cost: 180, req: 'reserve1', group: 'Gold' },
    { id: 'reserve3', name: 'Gold Reserve III', desc: 'Keep 50% of your gold when you fall.', cost: 400, req: 'reserve2', group: 'Gold' },
    { id: 'forge1', name: 'Wax Forge I', desc: 'Items are more often Fine or better.', cost: 80, group: 'Forge' },
    { id: 'forge2', name: 'Wax Forge II', desc: 'Superior items appear more often.', cost: 200, req: 'forge1', group: 'Forge' },
    { id: 'forge3', name: 'Wax Forge III', desc: 'Legendary items can appear anywhere.', cost: 450, req: 'forge2', group: 'Forge' },
    { id: 'kit1', name: 'Quartermaster I', desc: 'Choose your starting ranged weapon or shield from several options.', cost: 50, group: 'Start' },
    { id: 'kit2', name: 'Quartermaster II', desc: 'Begin each run with a random unlocked skill.', cost: 150, req: 'kit1', group: 'Start' },
    { id: 'kit3', name: 'Quartermaster III', desc: 'Choose your starting melee weapon from several options.', cost: 250, req: 'kit2', group: 'Start' },
    { id: 'recycle', name: 'Salvager', desc: 'Unwanted items dropped in a passage are melted into gold.', cost: 70, group: 'Gold' },
  ];
  G.UPGRADE_BY_ID = {};
  for (const u of G.UPGRADES) G.UPGRADE_BY_ID[u.id] = u;
})();
