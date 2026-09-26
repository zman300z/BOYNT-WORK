'use strict';
// ============================================================================
// Items: weapons, shields, skills, affixes, instances, icons & held sprites
// ============================================================================
(function () {
  const G = window.G;

  // Melee step: w=windup a=active r=recovery (s), dmg multiplier,
  // box=[x,y,w,h] relative to player center (facing right), anim, lunge, knock
  const S = (w, a, r, dmg, box, anim, extra) => Object.assign({ w, a, r, dmg, box, anim }, extra || {});

  const ITEMS = {
    // ============================== MELEE
    rusty_blade: {
      name: 'Rusted Wick-Blade', kind: 'melee', stats: ['fury'], base: 12, start: true, critIf: 'lastHit', critMult: 2,
      desc: 'A pitted sword pulled from the Undercroft’s armory. The final blow of each combo is a critical hit.',
      combo: [
        S(0.1, 0.08, 0.16, 1.0, [0, -24, 34, 30], 'slash'),
        S(0.1, 0.08, 0.18, 1.1, [0, -20, 34, 28], 'slash2'),
        S(0.16, 0.1, 0.28, 1.7, [0, -26, 38, 34], 'overhead', { lunge: 90, crit: true, knock: 160, sfx: 'swingHeavy' }),
      ],
      look: { shape: 'sword', blade: '#9aa0a8', edge: '#c8ccd0', guard: '#7a5a3a', hilt: '#4a3020', len: 13 },
    },
    twin_fangs: {
      name: 'Twin Fangs', kind: 'melee', stats: ['cunning'], base: 6, start: true, critIf: 'behind', critMult: 2.5,
      desc: 'Paired daggers. Strikes against an enemy’s back are [cunning]critical hits[].',
      combo: [
        S(0.05, 0.05, 0.1, 1.0, [0, -18, 26, 20], 'stab', { lunge: 70, sfx: 'thrust' }),
        S(0.05, 0.05, 0.1, 1.0, [0, -18, 26, 20], 'stab2', { lunge: 70, sfx: 'thrust' }),
        S(0.05, 0.05, 0.1, 1.1, [0, -18, 26, 20], 'stab', { lunge: 70, sfx: 'thrust' }),
        S(0.08, 0.06, 0.18, 1.4, [0, -20, 28, 22], 'slash', { lunge: 120 }),
      ],
      look: { shape: 'dagger', blade: '#b8c4d0', edge: '#f0f4ff', guard: '#503a60', hilt: '#2a2030', len: 8, twin: true },
    },
    harpoon_spear: {
      name: 'Harpoon Spear', kind: 'melee', stats: ['fury', 'cunning'], base: 12, start: true, critIf: 'lastHit', critMult: 2,
      desc: 'A whaler’s spear with enormous reach. The lunging third thrust is a critical hit.',
      combo: [
        S(0.12, 0.1, 0.2, 1.0, [4, -16, 50, 12], 'thrust', { sfx: 'thrust' }),
        S(0.12, 0.1, 0.2, 1.1, [4, -16, 50, 12], 'thrust', { sfx: 'thrust' }),
        S(0.16, 0.16, 0.3, 1.8, [4, -17, 56, 14], 'thrust', { lunge: 280, crit: true, knock: 180, sfx: 'thrust' }),
      ],
      look: { shape: 'spear', shaft: '#6a5038', head: '#b0b8c0', len: 26 },
    },
    tidebreaker: {
      name: 'Tidebreaker Greatsword', kind: 'melee', stats: ['fury'], base: 24, critIf: 'lastHit', critMult: 2,
      desc: 'Massive and slow. Every swing staggers; the final slam is a critical hit.',
      bp: { from: 'jailer', chance: 0.06, cost: 30 },
      combo: [
        S(0.28, 0.12, 0.32, 1.0, [-6, -34, 50, 42], 'overhead', { poise: 40, knock: 150, sfx: 'swingHeavy' }),
        S(0.24, 0.12, 0.32, 1.15, [-4, -28, 48, 36], 'slash2', { poise: 40, knock: 150, sfx: 'swingHeavy' }),
        S(0.34, 0.14, 0.45, 1.9, [-4, -36, 52, 46], 'overhead', { poise: 70, crit: true, knock: 240, shake: 0.35, lunge: 60, sfx: 'swingHeavy' }),
      ],
      look: { shape: 'greatsword', blade: '#8aa0b0', edge: '#d0e0e8', guard: '#40506a', hilt: '#2a2a3a', len: 20 },
    },
    drowned_anchor: {
      name: 'Drowned Anchor', kind: 'melee', stats: ['vigor'], base: 26, critIf: 'stunned', critMult: 2,
      desc: 'Slams send [vigor]shockwaves[] along the ground and stun. Critical hits on stunned enemies.',
      bp: { from: 'mossback', chance: 0.06, cost: 35 },
      combo: [
        S(0.34, 0.1, 0.42, 1.0, [-2, -30, 40, 38], 'overhead', { poise: 60, stun: 0.9, shock: { n: 1, dmg: 0.5 }, shake: 0.3, sfx: 'swingHeavy' }),
        S(0.3, 0.1, 0.5, 1.4, [-2, -30, 40, 38], 'overhead', { poise: 60, stun: 0.9, shock: { n: 2, dmg: 0.6 }, shake: 0.4, sfx: 'swingHeavy' }),
      ],
      look: { shape: 'anchor', shaft: '#3a3a44', head: '#5a6a70', len: 16 },
    },
    kelp_lash: {
      name: 'Kelp Lash', kind: 'melee', stats: ['cunning'], base: 9, critIf: 'tip', critMult: 2,
      desc: 'A whip of braided kelp. Hits landed with the very [cunning]tip[] of the lash are critical.',
      bp: { from: 'harpooner', chance: 0.05, cost: 25 },
      combo: [
        S(0.14, 0.06, 0.16, 1.0, [4, -20, 70, 12], 'whip', { sfx: 'thrust' }),
        S(0.14, 0.06, 0.16, 1.0, [4, -20, 70, 12], 'whip', { sfx: 'thrust' }),
        S(0.16, 0.07, 0.24, 1.3, [4, -22, 76, 14], 'whip', { sfx: 'thrust' }),
      ],
      look: { shape: 'whip', hilt: '#5a3a2a', lash: '#3f7a4a', len: 10 },
    },
    ember_brand: {
      name: 'Ember Brand', kind: 'melee', stats: ['fury'], base: 10, critIf: 'burning', critMult: 1.75,
      desc: 'A blade that never cooled. Hits [orange]ignite[] enemies; critical hits against burning foes.',
      bp: { from: 'bomber', chance: 0.05, cost: 35 },
      onHit: { burn: 1 },
      combo: [
        S(0.1, 0.08, 0.18, 1.0, [0, -24, 34, 30], 'slash'),
        S(0.1, 0.08, 0.18, 1.0, [0, -20, 34, 28], 'slash2'),
        S(0.12, 0.08, 0.24, 1.2, [0, -24, 36, 30], 'slash', { lunge: 80 }),
      ],
      look: { shape: 'sword', blade: '#e0602a', edge: '#ffd070', guard: '#503020', hilt: '#2a1a14', len: 13, glow: '#ff8030' },
    },
    rime_cleaver: {
      name: 'Rime Cleaver', kind: 'melee', stats: ['vigor'], base: 14, critIf: 'frozen', critMult: 2,
      desc: 'A frost-rimed axe. The third chop [cyan]freezes[] its target; frozen enemies take critical hits.',
      bp: { from: 'lurker', chance: 0.06, cost: 40 },
      combo: [
        S(0.14, 0.1, 0.22, 1.0, [0, -26, 34, 32], 'overhead'),
        S(0.14, 0.1, 0.22, 1.1, [0, -22, 34, 28], 'slash2'),
        S(0.18, 0.1, 0.3, 1.3, [0, -26, 36, 32], 'overhead', { freeze: 1.6, sfx: 'swingHeavy' }),
      ],
      look: { shape: 'axe', shaft: '#4a3a30', head: '#a0e0f0', len: 14, glow: '#80e0ff' },
    },
    salt_rapier: {
      name: 'Saltglass Rapier', kind: 'melee', stats: ['cunning'], base: 9, critIf: 'afterRoll', critMult: 3,
      desc: 'Thin as a sliver of ice. Attacks within 1s of a [cunning]roll[] deal triple damage.',
      bp: { from: 'knight', chance: 0.05, cost: 40 },
      combo: [
        S(0.08, 0.06, 0.14, 1.0, [2, -18, 40, 10], 'thrust', { lunge: 60, sfx: 'thrust' }),
        S(0.08, 0.06, 0.14, 1.0, [2, -18, 40, 10], 'thrust', { lunge: 60, sfx: 'thrust' }),
        S(0.1, 0.08, 0.2, 1.2, [2, -18, 44, 12], 'thrust', { lunge: 160, sfx: 'thrust' }),
      ],
      look: { shape: 'rapier', blade: '#d8f0f0', edge: '#ffffff', guard: '#c0a050', hilt: '#3a2a20', len: 16 },
    },
    reaper_crescent: {
      name: 'Reaper’s Crescent', kind: 'melee', stats: ['fury'], base: 20, critIf: 'lowHp', critMult: 2.2,
      desc: 'A scythe whose sweep reaches behind you. Critical hits on enemies below [fury]40% health[].',
      bp: { from: 'bonewalker', chance: 0.05, cost: 45 },
      combo: [
        S(0.22, 0.14, 0.3, 1.0, [-26, -30, 66, 34], 'spin', { sfx: 'swingHeavy' }),
        S(0.22, 0.14, 0.34, 1.3, [-26, -34, 66, 40], 'overhead', { sfx: 'swingHeavy', lunge: 50 }),
      ],
      look: { shape: 'scythe', shaft: '#3a3040', head: '#c8d0d8', len: 20 },
    },
    stormcutter: {
      name: 'Stormcutter', kind: 'melee', stats: ['cunning'], base: 13, critIf: 'charged', critMult: 2.5, chargeable: 0.5,
      desc: 'Hold the attack to charge a [cunning]lightning-fast dash cut[] that always crits.',
      bp: { from: 'sentinel', chance: 0.06, cost: 50 },
      combo: [
        S(0.1, 0.08, 0.18, 1.0, [0, -22, 36, 26], 'slash'),
        S(0.1, 0.08, 0.18, 1.1, [0, -20, 36, 26], 'slash2'),
        S(0.14, 0.12, 0.3, 1.6, [0, -22, 40, 26], 'thrust', { lunge: 420 }),
      ],
      charged: S(0.05, 0.16, 0.35, 3.0, [-10, -22, 50, 26], 'thrust', { lunge: 640, crit: true, iframes: true, sfx: 'thrust' }),
      look: { shape: 'katana', blade: '#c0d8ff', edge: '#ffffff', guard: '#302040', hilt: '#20182a', len: 16, glow: '#80b0ff' },
    },
    brinesteel_knuckles: {
      name: 'Brinesteel Knuckles', kind: 'melee', stats: ['vigor'], base: 6, critIf: 'stunned', critMult: 2,
      desc: 'A flurry of fists. The fourth punch [vigor]stuns[]; critical hits against stunned enemies.',
      bp: { from: 'hookhand', chance: 0.04, cost: 30 },
      combo: [
        S(0.05, 0.04, 0.08, 1.0, [0, -18, 26, 16], 'punch', { sfx: 'thrust', lunge: 70 }),
        S(0.05, 0.04, 0.08, 1.0, [0, -18, 26, 16], 'punch2', { sfx: 'thrust', lunge: 70 }),
        S(0.05, 0.04, 0.08, 1.0, [0, -18, 26, 16], 'punch', { sfx: 'thrust', lunge: 70 }),
        S(0.1, 0.06, 0.22, 2.2, [0, -20, 26, 20], 'punch2', { stun: 0.8, knock: 260, poise: 50, lunge: 100 }),
      ],
      look: { shape: 'knuckles', metal: '#8aa0a8', wrap: '#6a4a3a' },
    },
    vipers_kiss: {
      name: 'Viper’s Kiss', kind: 'melee', stats: ['cunning'], base: 6, critIf: 'poisoned', critMult: 2,
      desc: 'Each stab [green]poisons[]. Critical hits against poisoned enemies.',
      bp: { from: 'sporebloom', chance: 0.06, cost: 30 },
      onHit: { poison: 1 },
      combo: [
        S(0.07, 0.05, 0.12, 1.0, [0, -18, 28, 16], 'stab', { sfx: 'thrust', lunge: 60 }),
        S(0.07, 0.05, 0.12, 1.0, [0, -18, 28, 16], 'stab2', { sfx: 'thrust', lunge: 60 }),
        S(0.07, 0.05, 0.16, 1.1, [0, -18, 28, 16], 'stab', { sfx: 'thrust', lunge: 80 }),
      ],
      look: { shape: 'dagger', blade: '#60c050', edge: '#b0ff90', guard: '#2a4020', hilt: '#1a2014', len: 9 },
    },
    penitent_flail: {
      name: 'Penitent’s Flail', kind: 'melee', stats: ['vigor', 'fury'], base: 15, critIf: 'lastHit', critMult: 2,
      desc: 'Whirl the spiked ball around you, hitting everything nearby, then bring it down for a critical blow.',
      bp: { from: 'penitent', chance: 0.06, cost: 50 },
      combo: [
        S(0.18, 0.36, 0.26, 0.55, [-34, -38, 68, 48], 'spin', { multi: 3, sfx: 'swingHeavy' }),
        S(0.24, 0.1, 0.4, 1.6, [-4, -34, 46, 42], 'overhead', { crit: true, knock: 200, shake: 0.3, sfx: 'swingHeavy' }),
      ],
      look: { shape: 'flail', hilt: '#4a3a2a', ball: '#6a6a70', len: 8 },
    },
    marrow_club: {
      name: 'Marrow Club', kind: 'melee', stats: ['vigor'], base: 20, critIf: 'disabled', critMult: 2,
      desc: 'Crude, heavy bone. Massive knockback. Critical hits on [vigor]stunned, frozen or rooted[] enemies.',
      bp: { from: 'digger', chance: 0.06, cost: 45 },
      combo: [
        S(0.22, 0.1, 0.3, 1.0, [-2, -30, 38, 36], 'overhead', { poise: 45, knock: 220, stun: 0.4, sfx: 'swingHeavy' }),
        S(0.22, 0.1, 0.35, 1.3, [-2, -26, 40, 32], 'slash2', { poise: 45, knock: 320, sfx: 'swingHeavy' }),
      ],
      look: { shape: 'club', bone: '#d8cfb8', dark: '#9a8f78', len: 14 },
    },
    tidecaller_trident: {
      name: 'Tidecaller Trident', kind: 'melee', stats: ['fury', 'vigor'], base: 14, critIf: 'lastHit', critMult: 1.8,
      desc: 'The third strike sends a [blue]rolling wave[] down the corridor. Final strike crits.',
      bp: { from: 'priest', chance: 0.06, cost: 55 },
      combo: [
        S(0.12, 0.1, 0.2, 1.0, [4, -18, 46, 14], 'thrust', { sfx: 'thrust' }),
        S(0.12, 0.1, 0.2, 1.1, [4, -18, 46, 14], 'thrust', { sfx: 'thrust' }),
        S(0.18, 0.12, 0.34, 1.4, [0, -26, 42, 32], 'overhead', { crit: true, proj: { type: 'wave', dmg: 1.0 } }),
      ],
      look: { shape: 'trident', shaft: '#3a5a6a', head: '#6ad0e0', len: 22 },
    },
    sorrows_edge: {
      name: 'Sorrow’s Edge', kind: 'melee', stats: ['fury', 'cunning'], base: 15, critIf: 'lastHit', critMult: 2,
      desc: 'Forged from Mother Brine’s tears. Hits [red]bleed[]; the third slash hurls a crescent of brine.',
      bp: { from: 'boss:motherbrine', chance: 1, cost: 60 },
      onHit: { bleed: 1 },
      combo: [
        S(0.1, 0.08, 0.16, 1.0, [0, -24, 36, 30], 'slash'),
        S(0.1, 0.08, 0.16, 1.1, [0, -20, 36, 28], 'slash2'),
        S(0.14, 0.1, 0.26, 1.3, [0, -26, 40, 34], 'overhead', { crit: true, proj: { type: 'crescent', dmg: 1.2 } }),
      ],
      look: { shape: 'sword', blade: '#d890c0', edge: '#ffe0f4', guard: '#502040', hilt: '#2a1024', len: 15, glow: '#ff90d0' },
    },
    bell_maul: {
      name: 'Bellwarden’s Maul', kind: 'melee', stats: ['vigor', 'fury'], base: 30, critIf: 'stunned', critMult: 2,
      desc: 'Captain Hale’s clapper-hammer. Each slam [vigor]tolls[], stunning all around.',
      bp: { from: 'boss:bellwarden', chance: 1, cost: 50 },
      combo: [
        S(0.32, 0.1, 0.42, 1.0, [-4, -32, 44, 40], 'overhead', { stun: 1.0, poise: 70, ring: 60, shake: 0.35, sfx: 'swingHeavy' }),
        S(0.3, 0.1, 0.5, 1.5, [-4, -32, 44, 40], 'overhead', { stun: 1.0, poise: 70, ring: 70, shake: 0.4, sfx: 'swingHeavy' }),
      ],
      look: { shape: 'hammer', shaft: '#5a4030', head: '#c09040', len: 16 },
    },

    // ============================== RANGED
    driftwood_bow: {
      name: 'Driftwood Bow', kind: 'ranged', stats: ['cunning'], base: 13, start: true,
      desc: 'Quick, reliable shots. Arrows seek the nearest enemy ahead.',
      draw: 0.2, rec: 0.28, shot: { type: 'arrow', speed: 520 },
      look: { shape: 'bow', wood: '#8a6a4a', string: '#d8d0c0' },
    },
    gutting_knives: {
      name: 'Gutting Knives', kind: 'ranged', stats: ['cunning'], base: 5, start: true, critIf: 'bleeding', critMult: 2,
      desc: 'Throws three knives that inflict [red]bleed[]. Critical hits against bleeding enemies.',
      draw: 0.06, rec: 0.3, burst: 3, burstGap: 0.08, shot: { type: 'knife', speed: 480 }, onHit: { bleed: 1 },
      look: { shape: 'knives', blade: '#c0c8d0', hilt: '#5a2a2a' },
    },
    lighthouse_longbow: {
      name: 'Lighthouse Longbow', kind: 'ranged', stats: ['cunning'], base: 30, critIf: 'far', critMult: 2,
      desc: 'Hold to draw fully. Piercing arrows crit against enemies [cunning]far away[].',
      bp: { from: 'archer', chance: 0.06, cost: 40 },
      draw: 0.55, rec: 0.35, charge: true, shot: { type: 'arrow', speed: 720, pierce: 1 },
      look: { shape: 'longbow', wood: '#c09050', string: '#fff0c0' },
    },
    brinebolt_crossbow: {
      name: 'Brinebolt Crossbow', kind: 'ranged', stats: ['cunning', 'fury'], base: 16, critIf: 'close', critMult: 2.2,
      desc: 'Bolts pierce every enemy in a line. Critical hits at [cunning]point-blank[] range. Reloads after 3 shots.',
      bp: { from: 'harpooner', chance: 0.04, cost: 40 },
      draw: 0.12, rec: 0.2, ammo: 3, reload: 0.8, shot: { type: 'bolt', speed: 640, pierce: 99 },
      look: { shape: 'crossbow', wood: '#5a4030', metal: '#8a9aa0' },
    },
    cinder_staff: {
      name: 'Cinder Staff', kind: 'ranged', stats: ['fury'], base: 22,
      desc: 'Hurls a fireball that [orange]explodes[] and ignites everything nearby.',
      bp: { from: 'stormcaller', chance: 0.05, cost: 45 },
      draw: 0.3, rec: 0.5, shot: { type: 'fireball', speed: 300, aoe: 34 }, onHit: { burn: 1 },
      look: { shape: 'staff', wood: '#4a3020', orb: '#ff7030' },
    },
    hoarfrost_wand: {
      name: 'Hoarfrost Wand', kind: 'ranged', stats: ['vigor', 'cunning'], base: 9,
      desc: 'Frost bolts [cyan]slow[] their target, with a 30% chance to freeze.',
      bp: { from: 'glowmoth', chance: 0.05, cost: 35 },
      draw: 0.15, rec: 0.25, shot: { type: 'frostbolt', speed: 420 }, onHit: { slow: 2, freezeChance: 0.3 },
      look: { shape: 'wand', wood: '#b0c0d0', orb: '#80e8ff' },
    },
    tide_chakram: {
      name: 'Tide Chakram', kind: 'ranged', stats: ['cunning'], base: 11, critIf: 'returning', critMult: 2,
      desc: 'A throwing ring that returns to you. Hits on the [cunning]return trip[] are critical.',
      bp: { from: 'wraith', chance: 0.05, cost: 45 },
      draw: 0.15, rec: 0.2, shot: { type: 'chakram', speed: 380 },
      look: { shape: 'chakram', metal: '#60c0d0', edge: '#e0ffff' },
    },
    hooked_harpoon: {
      name: 'Hooked Harpoon', kind: 'ranged', stats: ['vigor'], base: 14,
      desc: 'Fires a barbed harpoon that [vigor]drags[] the enemy to you and stuns it.',
      bp: { from: 'hookhand', chance: 0.04, cost: 35 },
      draw: 0.2, rec: 0.6, shot: { type: 'harpoon', speed: 560 }, onHit: { stun: 0.9 },
      look: { shape: 'harpoongun', wood: '#5a4030', metal: '#708890' },
    },

    // ============================== SHIELDS
    driftplank_shield: {
      name: 'Driftplank Shield', kind: 'shield', stats: ['vigor'], base: 14, start: true,
      desc: 'Blocks 75% of damage from the front. Raise it just before a hit to [vigor]parry[] and stun the attacker.',
      block: 0.75, parryWin: 0.2, parryStun: 1.4, parryMult: 1,
      look: { shape: 'shield', face: '#7a5a3a', rim: '#4a3020', boss: '#a0a0a8' },
    },
    spiked_buckler: {
      name: 'Spiked Buckler', kind: 'shield', stats: ['vigor', 'fury'], base: 14,
      desc: 'Parries deal [fury]triple damage[] and inflict heavy bleeding.',
      bp: { from: 'jailer', chance: 0.05, cost: 30 },
      block: 0.6, parryWin: 0.22, parryStun: 1.0, parryMult: 3, parryBleed: 3,
      look: { shape: 'buckler', face: '#6a6a74', rim: '#3a3a44', boss: '#c0c0c8' },
    },
    rampart_bulwark: {
      name: 'Rampart Bulwark', kind: 'shield', stats: ['vigor'], base: 10,
      desc: 'Blocks 95% of damage but slows you while raised. Parries stun for a long time.',
      bp: { from: 'knight', chance: 0.05, cost: 45 },
      block: 0.95, parryWin: 0.16, parryStun: 2.6, parryMult: 1, slow: 0.5,
      look: { shape: 'tower', face: '#6a7080', rim: '#3a4050', boss: '#d0b060' },
    },
    mirrored_aegis: {
      name: 'Mirrored Aegis', kind: 'shield', stats: ['vigor', 'cunning'], base: 10,
      desc: 'A generous parry window. Parried projectiles [cyan]reflect[] with triple damage.',
      bp: { from: 'guard', chance: 0.06, cost: 55 },
      block: 0.7, parryWin: 0.3, parryStun: 1.2, parryMult: 1, reflect: 3,
      look: { shape: 'kite', face: '#b0d8e0', rim: '#5a7a88', boss: '#ffffff' },
    },

    // ============================== SKILLS
    cinder_flask: {
      name: 'Cinder Flask', kind: 'skill', stats: ['fury'], base: 30, start: true, cd: 12,
      desc: 'A thrown flask of burning oil. [orange]Explodes and ignites[] everything nearby.',
      type: 'grenade', aoe: 42, onHit: { burn: 2 }, look: { shape: 'bomb', glass: '#c05020', liquid: '#ff8030' },
    },
    wolf_jaw: {
      name: 'Wolf-Jaw Trap', kind: 'skill', stats: ['cunning', 'vigor'], base: 24, start: true, cd: 10,
      desc: 'Set a trap that snaps shut on the first enemy, [cunning]rooting[] it and causing bleeding.',
      type: 'trap', onHit: { root: 3, bleed: 2 }, look: { shape: 'trap', metal: '#7a7a80' },
    },
    rime_flask: {
      name: 'Rime Flask', kind: 'skill', stats: ['vigor', 'cunning'], base: 12, cd: 15,
      desc: 'Shatters in a burst of cold, [cyan]freezing[] enemies for 2.5s.',
      bp: { from: 'glowmoth', chance: 0.04, cost: 35 },
      type: 'grenade', aoe: 50, onHit: { freeze: 2.5 }, look: { shape: 'bomb', glass: '#5090c0', liquid: '#a0f0ff' },
    },
    pitch_flask: {
      name: 'Pitch Flask', kind: 'skill', stats: ['cunning'], base: 6, cd: 8,
      desc: 'Douses enemies in [gray]oil[]. Oiled enemies take double burn damage and stay lit longer.',
      bp: { from: 'spitter', chance: 0.05, cost: 25 },
      type: 'grenade', aoe: 52, onHit: { oil: 10 }, look: { shape: 'bomb', glass: '#2a2a2a', liquid: '#4a4030' },
    },
    thunderclap: {
      name: 'Thunderclap', kind: 'skill', stats: ['vigor'], base: 15, cd: 14,
      desc: 'A concussive blast that [vigor]stuns[] all nearby enemies for 2s.',
      bp: { from: 'stormcaller', chance: 0.04, cost: 40 },
      type: 'blast', aoe: 60, onHit: { stun: 2 }, look: { shape: 'rune', color: '#ffe060' },
    },
    sentry: {
      name: 'Sentry Crossbow', kind: 'skill', stats: ['cunning'], base: 7, cd: 22,
      desc: 'Deploys an automatic crossbow that fires at enemies for 20s.',
      bp: { from: 'archer', chance: 0.04, cost: 35 },
      type: 'turret', life: 20, rate: 0.6, look: { shape: 'turret', wood: '#6a5040', metal: '#8a9aa0' },
    },
    brazier_totem: {
      name: 'Brazier Totem', kind: 'skill', stats: ['fury'], base: 3, cd: 22,
      desc: 'Deploys a totem that breathes [orange]fire[] at nearby enemies for 15s.',
      bp: { from: 'shambler', chance: 0.05, cost: 40 },
      type: 'flameturret', life: 15, rate: 0.1, onHit: { burn: 1 }, look: { shape: 'totem', stone: '#6a5a50', fire: '#ff8030' },
    },
    wick_step: {
      name: 'Wick Step', kind: 'skill', stats: ['cunning'], base: 10, cd: 8,
      desc: 'Blink behind the nearest enemy and [cunning]stun[] it. Your next hit within 1s is critical.',
      bp: { from: 'crawler', chance: 0.03, cost: 25 },
      type: 'phase', range: 220, onHit: { stun: 1 }, look: { shape: 'rune', color: '#c080ff' },
    },
    stormcall: {
      name: 'Stormcall', kind: 'skill', stats: ['fury', 'cunning'], base: 22, cd: 10,
      desc: 'Lightning leaps between up to 5 enemies.',
      bp: { from: 'stormcaller', chance: 0.05, cost: 45 },
      type: 'chain', range: 200, jumps: 5, look: { shape: 'bolt', color: '#a0d0ff' },
    },
    drowned_blades: {
      name: 'Drowned Blades', kind: 'skill', stats: ['fury'], base: 6, cd: 18,
      desc: 'Summons three spectral swords that orbit you for 8s, cutting anything they touch.',
      bp: { from: 'guardian', chance: 1, cost: 60 },
      type: 'orbit', life: 8, look: { shape: 'swords', color: '#80c0ff' },
    },
    salt_ward: {
      name: 'Salt Ward', kind: 'skill', stats: ['vigor'], base: 20, cd: 18,
      desc: 'A crystalline ward absorbs the next hit within 5s and [vigor]stuns[] the attacker.',
      bp: { from: 'priest', chance: 0.05, cost: 40 },
      type: 'ward', life: 5, look: { shape: 'ward', color: '#e0f0ff' },
    },
    carrion_gulls: {
      name: 'Carrion Gulls', kind: 'skill', stats: ['cunning'], base: 8, cd: 20,
      desc: 'Summons three ghostly gulls that dive at enemies for 10s.',
      bp: { from: 'gullbat', chance: 0.04, cost: 35 },
      type: 'gulls', life: 10, look: { shape: 'bird', color: '#d0e0f0' },
    },
  };
  for (const id in ITEMS) {
    const d = ITEMS[id];
    d.id = id;
    if (d.bp && d.bp.from && d.bp.from.startsWith('boss:')) d.bossItem = true;
  }
  G.ITEMS = ITEMS;

  // ---------------------------------------------------------------- affixes
  const AFFIXES = [
    { id: 'dmg', kinds: ['melee', 'ranged', 'skill'], roll: [12, 28], text: '+{v}% damage' },
    { id: 'aspd', kinds: ['melee', 'ranged'], roll: [8, 16], text: '+{v}% attack speed' },
    { id: 'crit', kinds: ['melee', 'ranged'], roll: [8, 16], text: '+{v}% critical chance' },
    { id: 'bleed', kinds: ['melee', 'ranged'], roll: [1, 1], text: 'Hits inflict [red]Bleed[]' },
    { id: 'burn', kinds: ['melee', 'ranged'], roll: [1, 1], text: 'Hits [orange]ignite[] enemies' },
    { id: 'poison', kinds: ['melee', 'ranged'], roll: [1, 1], text: 'Hits inflict [green]Poison[]' },
    { id: 'chill', kinds: ['melee', 'ranged'], roll: [8, 15], text: '{v}% chance to [cyan]Freeze[]' },
    { id: 'vsBleed', kinds: ['melee', 'ranged', 'skill'], roll: [40, 70], text: '+{v}% damage to bleeding enemies' },
    { id: 'vsBurn', kinds: ['melee', 'ranged', 'skill'], roll: [40, 70], text: '+{v}% damage to burning enemies' },
    { id: 'vsPoison', kinds: ['melee', 'ranged', 'skill'], roll: [40, 70], text: '+{v}% damage to poisoned enemies' },
    { id: 'vsDisabled', kinds: ['melee', 'ranged', 'skill'], roll: [50, 80], text: '+{v}% damage to stunned, frozen or rooted enemies' },
    { id: 'killHeal', kinds: ['melee', 'ranged'], roll: [2, 4], text: 'Kills restore {v}% health' },
    { id: 'killBoom', kinds: ['melee', 'ranged', 'skill'], roll: [1, 1], text: 'Victims [orange]explode[] on death' },
    { id: 'fullHp', kinds: ['melee', 'ranged'], roll: [30, 55], text: '+{v}% damage while at full health' },
    { id: 'elite', kinds: ['melee', 'ranged', 'skill', 'shield'], roll: [20, 40], text: '+{v}% damage to elites and bosses' },
    { id: 'air', kinds: ['melee'], roll: [35, 60], text: '+{v}% damage while airborne' },
    { id: 'cd', kinds: ['skill'], roll: [15, 28], text: '-{v}% cooldown' },
    { id: 'skillStun', kinds: ['skill'], roll: [1, 1], text: 'Also [vigor]stuns[] briefly' },
    { id: 'parryHeal', kinds: ['shield'], roll: [4, 8], text: 'Parries restore {v}% health' },
    { id: 'parryBoom', kinds: ['shield'], roll: [1, 1], text: 'Parries release a damaging shockwave' },
    { id: 'blockPlus', kinds: ['shield'], roll: [8, 15], text: '+{v}% block' },
    { id: 'parryBurn', kinds: ['shield'], roll: [1, 1], text: 'Parries [orange]ignite[] attackers' },
  ];
  G.AFFIXES = AFFIXES;
  const AFFIX_BY_ID = {};
  for (const a of AFFIXES) AFFIX_BY_ID[a.id] = a;

  // ---------------------------------------------------------------- unlocks
  G.isUnlocked = (id) => {
    const d = ITEMS[id];
    if (!d) return false;
    if (d.start) return true;
    return !!(G.save && G.save.unlocked && G.save.unlocked[id]);
  };
  G.itemPool = (kinds) => {
    const out = [];
    for (const id in ITEMS) {
      const d = ITEMS[id];
      if (kinds && !kinds.includes(d.kind)) continue;
      if (G.isUnlocked(id)) out.push(id);
    }
    return out;
  };

  let uidCounter = 1;
  // create an item instance
  G.makeItem = (id, tier, rng, opts) => {
    opts = opts || {};
    rng = rng || G.rng;
    const d = ITEMS[id];
    let q = opts.q;
    if (q === undefined) {
      const forge = G.save ? (G.hasUpgrade('forge3') ? 3 : G.hasUpgrade('forge2') ? 2 : G.hasUpgrade('forge1') ? 1 : 0) : 0;
      const p3 = (forge >= 3 ? 0.035 : 0.0) + (tier >= 4 ? 0.02 : 0) + (opts.bonus || 0) * 0.3;
      const p2 = 0.06 + 0.03 * tier + forge * 0.04 + (opts.bonus || 0) * 0.5;
      const p1 = 0.22 + 0.05 * tier + forge * 0.06 + (opts.bonus || 0);
      const r = rng.next();
      q = r < p3 ? 3 : r < p3 + p2 ? 2 : r < p3 + p2 + p1 ? 1 : 0;
    }
    const nAff = q === 0 ? 0 : q === 1 ? 1 : 2;
    const affixes = [];
    const pool = AFFIXES.filter((a) => a.kinds.includes(d.kind));
    // avoid redundant status affixes
    const skip = new Set();
    if (d.onHit) for (const k in d.onHit) skip.add(k);
    for (let i = 0; i < nAff && pool.length; i++) {
      let a, tries = 0;
      do { a = rng.pick(pool); tries++; } while ((skip.has(a.id) || affixes.find((x) => x.id === a.id)) && tries < 20);
      if (tries >= 20) break;
      affixes.push({ id: a.id, v: rng.int(a.roll[0], a.roll[1]) });
      skip.add(a.id);
    }
    return { id, tier: Math.max(1, tier), q, affixes, uid: uidCounter++ };
  };
  G.itemMods = (inst) => {
    if (inst._mods) return inst._mods;
    const m = {};
    for (const a of inst.affixes) m[a.id] = (m[a.id] || 0) + a.v;
    inst._mods = m;
    return m;
  };
  G.itemPower = (inst) => {
    const d = ITEMS[inst.id];
    const m = G.itemMods(inst);
    return d.base * G.itemScale(inst.tier) * (inst.q === 3 ? 1.25 : 1) * (1 + (m.dmg || 0) / 100);
  };
  G.itemName = (inst) => {
    const d = ITEMS[inst.id];
    return (inst.q === 3 ? 'Legendary ' : '') + d.name + (inst.q > 0 && inst.q < 3 ? ' ' + '+'.repeat(inst.q) : '');
  };
  G.itemPrice = (inst) => {
    const d = ITEMS[inst.id];
    return Math.round((90 + 70 * inst.tier) * (1 + 0.45 * inst.q) * (d.kind === 'skill' ? 0.9 : 1) / 5) * 5;
  };
  G.itemMainStat = (inst) => {
    const d = ITEMS[inst.id];
    return d.stats[0];
  };
  // approximate DPS number for tooltips
  G.itemDps = (inst, player) => {
    const d = ITEMS[inst.id];
    const p = G.itemPower(inst);
    const sm = player ? player.statMult(d.stats) : 1;
    if (d.kind === 'melee') {
      let dmg = 0, t = 0;
      for (const s of d.combo) { dmg += s.dmg * (s.multi || 1); t += s.w + s.a + s.r * 0.6; }
      return (p * sm * dmg) / t;
    }
    if (d.kind === 'ranged') {
      const n = d.burst || 1;
      let t = d.draw + d.rec + (d.burstGap || 0) * (n - 1);
      if (d.ammo) t += d.reload / d.ammo;
      return (p * sm * n) / t;
    }
    return p * sm;
  };
  G.itemTooltip = (inst, player) => {
    const d = ITEMS[inst.id];
    const lines = [];
    const kindName = { melee: 'Melee Weapon', ranged: 'Ranged Weapon', shield: 'Shield', skill: 'Skill' }[d.kind];
    const statTxt = d.stats.map((s) => '[' + s + ']' + G.STAT_NAMES[s] + '[]').join(' / ');
    lines.push('[gray]' + kindName + '  •  ' + statTxt + '  •  [gray]Tier ' + G.roman(inst.tier) + '[]');
    const p = G.itemPower(inst) * (player ? player.statMult(d.stats) : 1);
    if (d.kind === 'melee' || d.kind === 'ranged') lines.push('[white]DPS ' + Math.round(G.itemDps(inst, player)) + '[]  [gray](' + Math.round(p) + ' per hit)[]');
    else if (d.kind === 'shield') lines.push('[white]Block ' + Math.round(Math.min(0.98, d.block + (G.itemMods(inst).blockPlus || 0) / 100) * 100) + '%[]  [gray]Parry ' + Math.round(p * d.parryMult) + ' dmg[]');
    else lines.push('[white]Damage ' + Math.round(p) + '[]  [gray]Cooldown ' + (d.cd * (1 - (G.itemMods(inst).cd || 0) / 100)).toFixed(1) + 's[]');
    lines.push(d.desc);
    for (const a of inst.affixes) {
      const ad = AFFIX_BY_ID[a.id];
      lines.push('[q' + Math.min(3, inst.q) + ']•[] ' + ad.text.replace('{v}', a.v));
    }
    if (inst.q === 3) lines.push('[q3]• Legendary: +25% base damage[]');
    return lines;
  };

  // ---------------------------------------------------------------- sprites
  // Held sprites point right with pivot (grip) returned. Icons are 16x16.
  const spriteCache = {};
  function px(c, x, y, col) {
    c.fillStyle = col;
    c.fillRect(x, y, 1, 1);
  }
  function hl(c, x, y, w, col) {
    c.fillStyle = col;
    c.fillRect(x, y, w, 1);
  }
  function vl(c, x, y, h, col) {
    c.fillStyle = col;
    c.fillRect(x, y, 1, h);
  }
  function buildHeld(look) {
    const L = look.len || 12;
    let cv, pv;
    switch (look.shape) {
      case 'sword':
      case 'greatsword':
      case 'katana':
      case 'rapier':
      case 'dagger': {
        const thick = look.shape === 'greatsword' ? 4 : look.shape === 'rapier' ? 1 : 2;
        const H = thick + 6;
        cv = G.makeCanvas(L + 6, H);
        const c = cv.ctx, my = Math.floor(H / 2);
        // hilt
        hl(c, 0, my, 3, look.hilt);
        if (thick >= 2) hl(c, 0, my - 1, 3, look.hilt);
        px(c, 0, my, look.guard);
        // guard
        const gh = look.shape === 'rapier' ? 5 : look.shape === 'katana' ? 3 : thick + 4;
        vl(c, 3, my - Math.floor(gh / 2) - (thick >= 2 ? 1 : 0) + (thick >= 2 ? 1 : 0) - (gh % 2 ? 0 : 1), gh, look.guard);
        if (look.shape === 'rapier') { px(c, 4, my - 2, look.guard); px(c, 4, my + 2, look.guard); }
        // blade
        const bx = 4;
        for (let i = 0; i < L; i++) {
          const x = bx + i;
          const taper = i >= L - 2 ? Math.max(1, thick - (i - (L - 3))) : thick;
          let top = my - Math.floor(thick / 2);
          if (look.shape === 'katana') top -= Math.round((i / L) * (i / L) * 2);
          for (let t = 0; t < taper; t++) px(c, x, top + t, t === 0 ? look.edge : look.blade);
          if (thick >= 3 && i < L - 3) px(c, x, top + Math.floor(thick / 2), G.shade(look.blade, -0.15));
        }
        pv = [1.5, my];
        break;
      }
      case 'spear':
      case 'trident': {
        cv = G.makeCanvas(L + 7, 9);
        const c = cv.ctx;
        hl(c, 0, 4, L, look.shaft);
        hl(c, 0, 5, L, G.shade(look.shaft, -0.3));
        if (look.shape === 'spear') {
          for (let i = 0; i < 6; i++) { const h = Math.max(1, 3 - Math.floor(i / 2)); vl(c, L + i, 5 - h + 1 - 0, h * 2 - 1, i < 2 ? G.shade(look.head, -0.2) : look.head); }
          px(c, L + 1, 3, look.head); px(c, L + 1, 6, look.head);
        } else {
          vl(c, L, 1, 7, look.head);
          hl(c, L, 1, 6, look.head); hl(c, L, 4, 7, look.head); hl(c, L, 7, 6, look.head);
          px(c, L + 6, 1, '#ffffff'); px(c, L + 6, 7, '#ffffff');
        }
        pv = [4, 4.5];
        break;
      }
      case 'hammer':
      case 'anchor': {
        cv = G.makeCanvas(L + 9, 14);
        const c = cv.ctx;
        hl(c, 0, 6, L + 2, look.shaft);
        hl(c, 0, 7, L + 2, G.shade(look.shaft, -0.3));
        if (look.shape === 'hammer') {
          c.fillStyle = look.head; c.fillRect(L, 1, 7, 12);
          c.fillStyle = G.shade(look.head, -0.3); c.fillRect(L, 9, 7, 4);
          c.fillStyle = G.shade(look.head, 0.3); c.fillRect(L + 1, 2, 5, 1);
        } else {
          c.fillStyle = look.head; c.fillRect(L + 1, 3, 2, 8);
          hl(c, L - 2, 3, 7, look.head); hl(c, L - 2, 10, 7, look.head);
          px(c, L - 3, 2, look.head); px(c, L + 5, 2, look.head); px(c, L - 3, 11, look.head); px(c, L + 5, 11, look.head);
          c.fillStyle = G.shade(look.head, 0.3); c.fillRect(L + 4, 5, 3, 4);
        }
        pv = [4, 6.5];
        break;
      }
      case 'axe': {
        cv = G.makeCanvas(L + 6, 14);
        const c = cv.ctx;
        hl(c, 0, 8, L + 2, look.shaft);
        hl(c, 0, 9, L + 2, G.shade(look.shaft, -0.3));
        c.fillStyle = look.head;
        c.fillRect(L - 2, 2, 5, 7);
        c.fillRect(L + 3, 1, 2, 9);
        c.fillStyle = '#ffffff';
        c.fillRect(L + 4, 1, 1, 9);
        pv = [3, 8.5];
        break;
      }
      case 'scythe': {
        cv = G.makeCanvas(L + 4, 16);
        const c = cv.ctx;
        hl(c, 0, 4, L + 2, look.shaft);
        hl(c, 0, 5, L + 2, G.shade(look.shaft, -0.3));
        // blade curves downward back toward the grip
        for (let i = 0; i < 12; i++) {
          const y = 4 + Math.round(Math.sin((i / 12) * Math.PI * 0.6) * 9);
          const x = L + 1 - i;
          px(c, x, y, look.head);
          px(c, x, y + 1, i < 10 ? '#ffffff' : look.head);
          px(c, x, y - 1, G.shade(look.head, -0.25));
        }
        pv = [6, 4.5];
        break;
      }
      case 'whip': {
        cv = G.makeCanvas(L + 6, 6);
        const c = cv.ctx;
        hl(c, 0, 2, 5, look.hilt);
        hl(c, 0, 3, 5, G.shade(look.hilt, -0.3));
        for (let i = 0; i < L; i++) px(c, 5 + i, 2 + Math.round(Math.sin(i * 0.8)), look.lash);
        pv = [2, 2.5];
        break;
      }
      case 'knuckles': {
        cv = G.makeCanvas(8, 8);
        const c = cv.ctx;
        c.fillStyle = look.wrap; c.fillRect(0, 2, 4, 4);
        c.fillStyle = look.metal; c.fillRect(4, 1, 3, 6);
        c.fillStyle = '#ffffff'; c.fillRect(6, 1, 1, 6);
        pv = [2, 4];
        break;
      }
      case 'flail': {
        cv = G.makeCanvas(10, 6);
        const c = cv.ctx;
        hl(c, 0, 2, 8, look.hilt);
        hl(c, 0, 3, 8, G.shade(look.hilt, -0.3));
        pv = [2, 2.5];
        break;
      }
      case 'club': {
        cv = G.makeCanvas(L + 6, 10);
        const c = cv.ctx;
        for (let i = 0; i < L + 4; i++) {
          const h = 2 + Math.floor((i / (L + 4)) * 4);
          vl(c, i, 5 - Math.floor(h / 2), h, i % 5 === 0 ? look.dark : look.bone);
        }
        c.fillStyle = look.bone; c.fillRect(L + 1, 1, 4, 8);
        c.fillStyle = look.dark; c.fillRect(L + 2, 3, 2, 1); c.fillRect(L + 2, 6, 2, 1);
        pv = [2, 5];
        break;
      }
      case 'bow':
      case 'longbow': {
        const H = look.shape === 'longbow' ? 24 : 18;
        cv = G.makeCanvas(8, H);
        const c = cv.ctx;
        for (let y = 0; y < H; y++) {
          const t = (y / (H - 1)) * 2 - 1;
          const x = Math.round(5 - (1 - t * t) * 4 + 0.5) + 1;
          px(c, x, y, look.wood);
          if (Math.abs(t) < 0.9) px(c, x + 1, y, G.shade(look.wood, -0.3));
        }
        vl(c, 6, 1, H - 2, look.string);
        pv = [3, H / 2];
        break;
      }
      case 'crossbow':
      case 'harpoongun': {
        cv = G.makeCanvas(16, 12);
        const c = cv.ctx;
        c.fillStyle = look.wood; c.fillRect(0, 5, 12, 3);
        c.fillStyle = G.shade(look.wood, -0.3); c.fillRect(0, 7, 12, 1);
        c.fillStyle = look.metal;
        if (look.shape === 'crossbow') { c.fillRect(11, 0, 2, 12); c.fillRect(12, 5, 4, 1); }
        else { c.fillRect(6, 4, 9, 3); c.fillRect(14, 3, 2, 5); }
        pv = [3, 6.5];
        break;
      }
      case 'staff':
      case 'wand': {
        const Ls = look.shape === 'staff' ? 18 : 10;
        cv = G.makeCanvas(Ls + 6, 8);
        const c = cv.ctx;
        hl(c, 0, 4, Ls, look.wood);
        hl(c, 0, 3, Ls, G.shade(look.wood, 0.2));
        c.fillStyle = look.orb; c.fillRect(Ls, 2, 4, 4);
        c.fillStyle = '#ffffff'; c.fillRect(Ls + 1, 2, 1, 1);
        pv = [3, 4];
        break;
      }
      case 'knives': {
        cv = G.makeCanvas(10, 4);
        const c = cv.ctx;
        hl(c, 0, 1, 3, look.hilt); hl(c, 3, 1, 6, look.blade); hl(c, 3, 2, 5, G.shade(look.blade, -0.2));
        pv = [1, 1.5];
        break;
      }
      case 'chakram': {
        cv = G.makeCanvas(12, 12);
        const c = cv.ctx;
        c.strokeStyle = look.metal;
        c.lineWidth = 2;
        c.beginPath(); c.arc(6, 6, 4.2, 0, Math.PI * 2); c.stroke();
        px(c, 6, 1, look.edge); px(c, 10, 6, look.edge); px(c, 1, 6, look.edge); px(c, 6, 10, look.edge);
        pv = [3, 6];
        break;
      }
      case 'shield':
      case 'buckler':
      case 'tower':
      case 'kite': {
        const w = look.shape === 'tower' ? 8 : 10, h = look.shape === 'tower' ? 18 : look.shape === 'kite' ? 14 : 10;
        cv = G.makeCanvas(w + 2, h + 2);
        const c = cv.ctx;
        if (look.shape === 'kite') {
          for (let y = 0; y < h; y++) {
            const half = y < h * 0.45 ? w / 2 : Math.max(0.5, (w / 2) * (1 - (y - h * 0.45) / (h * 0.55)));
            hl(c, Math.round(1 + w / 2 - half), 1 + y, Math.round(half * 2), look.face);
            px(c, Math.round(1 + w / 2 - half), 1 + y, look.rim);
            px(c, Math.round(w / 2 + half), 1 + y, look.rim);
          }
          hl(c, 1, 1, w, look.rim);
        } else if (look.shape === 'shield' || look.shape === 'buckler') {
          G.pixCircle(c, 1 + w / 2 - 0.5, 1 + h / 2 - 0.5, Math.floor(w / 2), look.rim);
          G.pixCircle(c, 1 + w / 2 - 0.5, 1 + h / 2 - 0.5, Math.floor(w / 2) - 1, look.face);
          if (look.shape === 'buckler') { px(c, 1, h / 2, look.boss); px(c, w, h / 2, look.boss); px(c, w / 2, 1, look.boss); px(c, w / 2, h, look.boss); }
          else { hl(c, 2, 3, w - 2, G.shade(look.face, -0.2)); hl(c, 2, 7, w - 2, G.shade(look.face, -0.2)); }
        } else {
          c.fillStyle = look.rim; c.fillRect(1, 1, w, h);
          c.fillStyle = look.face; c.fillRect(2, 2, w - 2, h - 2);
        }
        c.fillStyle = look.boss; c.fillRect(Math.floor(w / 2), Math.floor(h / 2), 2, 2);
        pv = [w / 2, h / 2 + 1];
        break;
      }
      default: {
        cv = G.makeCanvas(10, 10);
        pv = [5, 5];
      }
    }
    return { img: cv, px: pv[0], py: pv[1] };
  }
  G.heldSprite = (id) => {
    const key = 'h:' + id;
    if (spriteCache[key]) return spriteCache[key];
    const d = ITEMS[id];
    const s = buildHeld(d.look);
    spriteCache[key] = s;
    return s;
  };
  function buildIcon(d) {
    const cv = G.makeCanvas(16, 16);
    const c = cv.ctx;
    const look = d.look;
    const rotShapes = ['sword', 'greatsword', 'katana', 'rapier', 'dagger', 'spear', 'trident', 'hammer', 'anchor', 'axe', 'scythe', 'whip', 'club', 'staff', 'wand', 'knives', 'crossbow', 'harpoongun', 'flail'];
    if (rotShapes.includes(look.shape)) {
      const h = buildHeld(look);
      const diag = Math.hypot(h.img.width, h.img.height);
      const s = Math.min(1, 19 / diag);
      c.save();
      c.translate(8, 8);
      c.rotate(-Math.PI / 4);
      c.scale(s, s);
      c.drawImage(h.img, -h.img.width / 2, -h.img.height / 2);
      c.restore();
      if (look.twin) {
        c.save(); c.translate(8, 8); c.rotate(-Math.PI * 0.75); c.scale(s, s); c.drawImage(h.img, -h.img.width / 2, -h.img.height / 2); c.restore();
      }
      if (look.shape === 'flail') {
        G.pixCircle(c, 11, 5, 3, look.ball); px(c, 11, 1, '#ddd'); px(c, 15, 5, '#ddd'); px(c, 7, 5, '#ddd');
        G.pixLine(c, 6, 10, 9, 7, '#888');
      }
      if (look.shape === 'knuckles') {
        c.clearRect(0, 0, 16, 16);
        c.fillStyle = look.wrap; c.fillRect(3, 7, 6, 6);
        c.fillStyle = look.metal; c.fillRect(8, 4, 5, 10); c.fillRect(6, 3, 7, 2);
        c.fillStyle = '#ffffff'; c.fillRect(12, 4, 1, 9);
        c.fillStyle = G.shade(look.metal, -0.3); c.fillRect(8, 7, 5, 1); c.fillRect(8, 10, 5, 1);
      }
      if (look.shape === 'knives') {
        c.save(); c.translate(9, 10); c.rotate(-Math.PI / 4); c.drawImage(h.img, -5, -2); c.restore();
      }
    } else if (['bow', 'longbow', 'shield', 'buckler', 'tower', 'kite', 'chakram'].includes(look.shape)) {
      const h = buildHeld(look);
      const s = Math.min(1, 15 / Math.max(h.img.width, h.img.height));
      c.save();
      c.translate(8, 8);
      if (look.shape === 'bow' || look.shape === 'longbow') c.rotate(Math.PI / 4);
      c.scale(s, s);
      c.drawImage(h.img, -h.img.width / 2, -h.img.height / 2);
      c.restore();
    } else {
      switch (look.shape) {
        case 'bomb':
          G.pixCircle(c, 8, 10, 5, look.glass);
          G.pixCircle(c, 8, 11, 3, look.liquid);
          c.fillStyle = '#c0a080'; c.fillRect(7, 2, 3, 4);
          c.fillStyle = '#ffffff'; c.fillRect(5, 8, 1, 2);
          break;
        case 'trap':
          c.fillStyle = look.metal;
          c.fillRect(2, 11, 12, 2);
          for (let i = 0; i < 5; i++) { c.fillRect(3 + i * 2, 5 + (i % 2), 1, 6); }
          c.fillStyle = '#c0c0c8'; c.fillRect(7, 12, 2, 2);
          break;
        case 'turret':
          c.fillStyle = look.wood; c.fillRect(6, 8, 4, 6); c.fillRect(3, 13, 10, 2);
          c.fillStyle = look.metal; c.fillRect(3, 5, 10, 3); c.fillRect(11, 3, 2, 7);
          break;
        case 'totem':
          c.fillStyle = look.stone; c.fillRect(5, 6, 6, 9);
          c.fillStyle = '#2a2020'; c.fillRect(6, 8, 1, 2); c.fillRect(9, 8, 1, 2); c.fillRect(7, 11, 2, 1);
          c.fillStyle = look.fire; c.fillRect(6, 3, 4, 3); c.fillStyle = '#ffe080'; c.fillRect(7, 2, 2, 3);
          break;
        case 'rune':
          c.fillStyle = look.color;
          c.fillRect(7, 2, 2, 12); c.fillRect(3, 5, 10, 2); c.fillRect(4, 10, 3, 2); c.fillRect(9, 10, 3, 2);
          c.fillStyle = '#ffffff'; c.fillRect(7, 2, 1, 3);
          break;
        case 'bolt':
          c.fillStyle = look.color;
          [[9, 1], [8, 2], [7, 3], [6, 4], [5, 5], [6, 6], [7, 6], [8, 6], [9, 7], [8, 8], [7, 9], [6, 10], [5, 11], [4, 12]].forEach(([x, y]) => c.fillRect(x, y, 3, 2));
          c.fillStyle = '#ffffff'; c.fillRect(9, 1, 1, 1); c.fillRect(6, 6, 1, 1);
          break;
        case 'swords':
          for (let i = 0; i < 3; i++) {
            c.save(); c.translate(8, 8); c.rotate((i / 3) * Math.PI * 2); c.fillStyle = look.color; c.fillRect(2, -1, 6, 2); c.fillStyle = '#ffffff'; c.fillRect(2, -1, 6, 1); c.fillStyle = '#806040'; c.fillRect(0, -1, 2, 2); c.restore();
          }
          break;
        case 'ward':
          G.pixCircle(c, 8, 8, 6, look.color);
          G.pixCircle(c, 8, 8, 4, '#80a0c0');
          c.fillStyle = '#ffffff'; c.fillRect(5, 4, 2, 2);
          break;
        case 'bird':
          c.fillStyle = look.color;
          c.fillRect(6, 7, 5, 3); c.fillRect(2, 5, 4, 2); c.fillRect(10, 5, 4, 2); c.fillRect(11, 7, 2, 1);
          c.fillStyle = '#ffb040'; c.fillRect(13, 8, 2, 1);
          break;
      }
    }
    if (look.glow) {
      // soft glow outline
      const g = G.makeCanvas(16, 16);
      g.ctx.globalAlpha = 0.35;
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.ctx.drawImage(G.tinted(cv, look.glow), ox, oy);
      g.ctx.globalAlpha = 1;
      g.ctx.drawImage(cv, 0, 0);
      return g;
    }
    return cv;
  }
  G.itemIcon = (id) => {
    const key = 'i:' + id;
    if (spriteCache[key]) return spriteCache[key];
    const s = buildIcon(ITEMS[id]);
    spriteCache[key] = s;
    return s;
  };
})();
