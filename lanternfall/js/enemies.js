'use strict';
// ============================================================================
// Enemies: definitions, AI, drawing
// ============================================================================
(function () {
  const G = window.G;
  const TS = G.TS;
  const GRAV = 1300;

  // attack helper
  const A = (id, o) => Object.assign({ id, range: [0, 30], yr: 40, w: 0.5, a: 0.12, r: 0.5, cd: 1.2, dmg: 1, type: 'melee', box: [0, -20, 28, 20], knock: 140 }, o);

  const E = {
    // ---------------------------------------------------------- Undercroft
    husk: { name: 'Husk', w: 12, h: 24, hp: 55, dmg: 12, speed: 38, ai: 'walk', sight: 190, poise: 18, gold: 3, ember: 0.3, blood: '#4a5a3a',
      attacks: [A('swipe', { range: [0, 28], w: 0.55, a: 0.12, r: 0.55, box: [0, -22, 28, 22] })], draw: 'husk', desc: 'Once a prisoner who refused the Tide Rite. The Brine reached them anyway, slowly and kindly.' },
    spitter: { name: 'Bile Spitter', w: 12, h: 20, hp: 40, dmg: 10, speed: 30, ai: 'keep', pref: [110, 200], sight: 240, poise: 10, gold: 3, ember: 0.3, blood: '#6a8a2a',
      attacks: [A('spit', { range: [40, 260], yr: 120, w: 0.65, a: 0.1, r: 0.8, cd: 2.4, type: 'proj', proj: 'glob' })], draw: 'spitter', desc: 'A swollen thing that stores the Brine in its gut and returns it, with interest.' },
    crawler: { name: 'Crawler', w: 14, h: 10, hp: 30, dmg: 9, speed: 70, ai: 'walk', sight: 170, poise: 8, gold: 2, ember: 0.25, blood: '#6a2a3a',
      attacks: [A('bite', { range: [14, 80], yr: 20, w: 0.45, a: 0.28, r: 0.6, cd: 1.3, type: 'lunge', lunge: 270, box: [0, -10, 16, 10] })], draw: 'crawler', desc: 'Grubs that fattened on the Undercroft’s dead. Their lunge is faster than it looks.' },
    jailer: { name: 'Jailer', w: 14, h: 26, hp: 95, dmg: 14, speed: 34, ai: 'walk', sight: 180, poise: 40, gold: 6, ember: 0.45, blood: '#4a3a3a', shield: 0.8,
      attacks: [A('baton', { range: [0, 32], w: 0.5, a: 0.1, r: 0.3, hits: 2, box: [0, -24, 30, 24], knock: 160 })], draw: 'jailer', desc: 'The Undercroft’s wardens still make their rounds. Their shields block blows from the front.' },
    // ---------------------------------------------------------- Saltmarsh
    hookhand: { name: 'Hookhand', w: 12, h: 24, hp: 75, dmg: 14, speed: 52, ai: 'walk', sight: 210, poise: 20, gold: 4, ember: 0.35, blood: '#3a4a5a',
      attacks: [A('slash', { range: [0, 28], w: 0.45, a: 0.12, r: 0.45 }), A('hook', { range: [45, 120], yr: 24, w: 0.6, a: 0.28, r: 0.7, cd: 2.2, type: 'lunge', lunge: 330, box: [0, -22, 26, 22], knock: 180 })], draw: 'hookhand', desc: 'A dockhand who drowned mid-shift. The hook came later.' },
    gullbat: { name: 'Gullbat', w: 14, h: 10, hp: 34, dmg: 10, speed: 90, ai: 'fly', sight: 240, poise: 6, gold: 3, ember: 0.3, blood: '#8a8a9a',
      attacks: [A('dive', { range: [0, 170], yr: 200, w: 0.55, a: 0.6, r: 0.7, cd: 1.8, type: 'dive', box: [-6, -10, 20, 14] })], draw: 'gullbat', desc: 'Gulls that learned to hunt in the dark. Their screech carries across the marsh.' },
    slime: { name: 'Brine Slime', w: 16, h: 12, hp: 60, dmg: 11, speed: 0, ai: 'hop', sight: 200, poise: 10, gold: 3, ember: 0.3, blood: '#3aa090', split: 'slimelet',
      attacks: [], draw: 'slime', desc: 'Living brine. Cut it and there are two of them.' },
    slimelet: { name: 'Slimelet', w: 10, h: 8, hp: 18, dmg: 7, speed: 0, ai: 'hop', sight: 200, poise: 4, gold: 1, ember: 0.05, blood: '#3aa090', small: true,
      attacks: [], draw: 'slime', noBestiary: true },
    harpooner: { name: 'Harpooner', w: 12, h: 24, hp: 60, dmg: 16, speed: 36, ai: 'keep', pref: [130, 240], sight: 280, poise: 14, gold: 5, ember: 0.35, blood: '#3a4a5a',
      attacks: [A('throw', { range: [60, 320], yr: 60, w: 0.85, a: 0.06, r: 1.0, cd: 2.6, type: 'proj', proj: 'eharpoon', aimLine: true }), A('jab', { range: [0, 36], w: 0.4, a: 0.12, r: 0.5, box: [2, -18, 34, 10] })], draw: 'harpooner', desc: 'The old whalers still hunt. They simply forgot what they were hunting for.' },
    // ---------------------------------------------------------- Thornwood
    thornling: { name: 'Thornling', w: 12, h: 14, hp: 42, dmg: 10, speed: 0, ai: 'static', sight: 250, poise: 10, gold: 3, ember: 0.3, blood: '#6a8a3a',
      attacks: [A('volley', { range: [0, 260], yr: 140, w: 0.7, a: 0.1, r: 0.7, cd: 2.2, type: 'proj', proj: 'thorns' })], draw: 'thornling', desc: 'A rosebud that learned to spit its thorns. The Queen would have been saddened.' },
    mossback: { name: 'Mossback', w: 26, h: 20, hp: 130, dmg: 18, speed: 40, ai: 'walk', sight: 220, poise: 60, gold: 7, ember: 0.5, blood: '#5a4a2a', heavy: true,
      attacks: [A('bite', { range: [0, 36], w: 0.5, a: 0.14, r: 0.5, box: [4, -18, 30, 18] }), A('charge', { range: [60, 260], yr: 24, w: 0.85, a: 1.4, r: 0.6, cd: 3.5, type: 'charge', speed: 300, box: [6, -20, 20, 20], knock: 240 })], draw: 'mossback', desc: 'A boar the garden grew over. When it charges, get out of the way — then punish it when it hits the wall.' },
    sporebloom: { name: 'Spore Bloom', w: 18, h: 18, hp: 70, dmg: 8, speed: 0, ai: 'static', sight: 220, poise: 20, gold: 4, ember: 0.35, blood: '#8a4ab0',
      attacks: [A('cloud', { range: [0, 60], yr: 50, w: 0.8, a: 0.1, r: 1.0, cd: 2.5, type: 'cloud' }), A('spore', { range: [60, 240], yr: 160, w: 0.6, a: 0.1, r: 1.0, cd: 3, type: 'proj', proj: 'spore' })], draw: 'sporebloom', desc: 'Its spores make you remember a garden you never walked in.' },
    // ---------------------------------------------------------- Ramparts
    knight: { name: 'Tide Knight', w: 14, h: 28, hp: 190, dmg: 20, speed: 44, ai: 'walk', sight: 220, poise: 55, gold: 8, ember: 0.5, blood: '#3a4a6a', shield: 0.75,
      attacks: [A('combo', { range: [0, 34], w: 0.5, a: 0.12, r: 0.25, hits: 3, box: [0, -26, 32, 26] }), A('bash', { range: [40, 100], yr: 24, w: 0.6, a: 0.25, r: 0.7, cd: 2.6, type: 'lunge', lunge: 300, box: [2, -24, 22, 24], knock: 260, statuses: { stun: 0.5 } })], draw: 'knight', desc: 'Sworn to protect the King. They still are. Strike them from behind or break their guard.' },
    archer: { name: 'Rampart Archer', w: 12, h: 24, hp: 90, dmg: 18, speed: 40, ai: 'keep', pref: [150, 280], sight: 340, poise: 16, gold: 6, ember: 0.4, blood: '#5a3a4a',
      attacks: [A('shot', { range: [80, 380], yr: 200, w: 0.95, a: 0.06, r: 0.7, cd: 2.2, type: 'proj', proj: 'earrow', aimLine: true }), A('volley', { range: [100, 300], yr: 60, w: 0.8, a: 0.1, r: 1.0, cd: 6, type: 'proj', proj: 'volley' })], draw: 'archer', desc: 'Watch for the red line. When it stops moving, move yourself.' },
    bomber: { name: 'Powder Bomber', w: 12, h: 22, hp: 80, dmg: 22, speed: 34, ai: 'keep', pref: [110, 220], sight: 260, poise: 18, gold: 7, ember: 0.4, blood: '#4a3a2a',
      attacks: [A('toss', { range: [50, 270], yr: 140, w: 0.7, a: 0.08, r: 0.9, cd: 2.6, type: 'proj', proj: 'bomb' })], draw: 'bomber', desc: 'Keeps the fuse lit with his own breath. Mind the bounce.' },
    // ---------------------------------------------------------- Glowcap
    glowmoth: { name: 'Glowmoth', w: 16, h: 12, hp: 70, dmg: 14, speed: 70, ai: 'fly', sight: 240, poise: 10, gold: 5, ember: 0.35, blood: '#40c0b0',
      attacks: [A('drop', { range: [0, 60], yr: 200, w: 0.5, a: 0.1, r: 0.8, cd: 1.8, type: 'proj', proj: 'sporeDrop' }), A('dive', { range: [0, 150], yr: 160, w: 0.6, a: 0.55, r: 0.8, cd: 2.5, type: 'dive', box: [-6, -10, 22, 14] })], draw: 'glowmoth', desc: 'Drawn to light. You are, unfortunately, a light.' },
    lurker: { name: 'Cave Lurker', w: 16, h: 20, hp: 140, dmg: 20, speed: 50, ai: 'ceiling', sight: 200, poise: 30, gold: 7, ember: 0.45, blood: '#4a2a5a',
      attacks: [A('claw', { range: [0, 32], w: 0.45, a: 0.12, r: 0.45, hits: 2, box: [0, -20, 30, 20] })], draw: 'lurker', desc: 'Hangs from the ceiling, waiting for something warm to pass beneath.' },
    shambler: { name: 'Fungal Shambler', w: 18, h: 26, hp: 160, dmg: 18, speed: 30, ai: 'walk', sight: 190, poise: 50, gold: 7, ember: 0.45, blood: '#6a8a5a', heavy: true, deathCloud: true,
      attacks: [A('punch', { range: [0, 34], w: 0.6, a: 0.14, r: 0.5, box: [2, -24, 32, 24], knock: 200 }), A('burst', { range: [0, 60], yr: 40, w: 0.9, a: 0.1, r: 0.9, cd: 4, type: 'cloud' })], draw: 'shambler', desc: 'A miner who ate the glowcaps. Bursts into spores when slain.' },
    // ---------------------------------------------------------- Cathedral
    priest: { name: 'Drowned Priest', w: 12, h: 26, hp: 170, dmg: 16, speed: 36, ai: 'keep', pref: [140, 250], sight: 300, poise: 20, gold: 9, ember: 0.5, blood: '#2a5a5a', teleport: true,
      attacks: [A('orbs', { range: [0, 320], yr: 220, w: 0.9, a: 0.1, r: 0.8, cd: 3.2, type: 'proj', proj: 'orbs' }), A('summon', { range: [0, 320], yr: 220, w: 1.1, a: 0.1, r: 0.8, cd: 11, type: 'summon', minion: 'husk' })], draw: 'priest', desc: 'Still offering the cup. Still certain it is a kindness.' },
    wraith: { name: 'Choir Wraith', w: 14, h: 18, hp: 130, dmg: 18, speed: 60, ai: 'fly', sight: 260, poise: 20, gold: 8, ember: 0.45, blood: '#a0b0d0', ghost: true,
      attacks: [A('scream', { range: [0, 120], yr: 50, w: 1.0, a: 0.6, r: 0.8, cd: 3.2, type: 'scream', statuses: { slow: 2 } }), A('dive', { range: [0, 140], yr: 150, w: 0.6, a: 0.5, r: 0.7, cd: 2.4, type: 'dive', box: [-6, -14, 22, 18] })], draw: 'wraith', desc: 'The cathedral choir never stopped singing. Their hymn is a weapon now.' },
    penitent: { name: 'Penitent', w: 20, h: 30, hp: 300, dmg: 28, speed: 26, ai: 'walk', sight: 200, poise: 999, gold: 11, ember: 0.6, blood: '#5a2a2a', heavy: true,
      attacks: [A('slam', { range: [0, 60], w: 0.95, a: 0.12, r: 0.8, cd: 2, box: [4, -30, 46, 32], knock: 260, type: 'slam', shock: 2 }), A('spin', { range: [0, 44], w: 0.7, a: 0.9, r: 0.8, cd: 4, type: 'spin', box: [-40, -30, 80, 32] })], draw: 'penitent', desc: 'Each lash of the flail was meant to wash away a memory. It worked.' },
    // ---------------------------------------------------------- Ossuary
    bonewalker: { name: 'Bonewalker', w: 12, h: 24, hp: 150, dmg: 20, speed: 46, ai: 'walk', sight: 210, poise: 25, gold: 8, ember: 0.45, blood: '#d8cfb8', revive: true,
      attacks: [A('slash', { range: [0, 32], w: 0.45, a: 0.12, r: 0.3, hits: 2, box: [0, -24, 32, 24] })], draw: 'bonewalker', desc: 'Remembers too well to stay down. Finish it with a critical hit or fire, or it will rise again.' },
    digger: { name: 'Grave Digger', w: 16, h: 26, hp: 220, dmg: 24, speed: 44, ai: 'walk', sight: 230, poise: 60, gold: 10, ember: 0.55, blood: '#4a3a2a', heavy: true,
      attacks: [A('shovel', { range: [0, 36], w: 0.55, a: 0.14, r: 0.5, box: [2, -26, 34, 28], knock: 200 }), A('leap', { range: [70, 220], yr: 80, w: 0.7, a: 0.9, r: 0.7, cd: 4, type: 'leap', box: [-18, -20, 52, 22] })], draw: 'digger', desc: 'Buries what it kills. Mostly.' },
    skulls: { name: 'Skull Swarm', w: 10, h: 10, hp: 50, dmg: 12, speed: 80, ai: 'fly', sight: 240, poise: 6, gold: 4, ember: 0.25, blood: '#d8cfb8', ghost: true,
      attacks: [A('bite', { range: [0, 120], yr: 120, w: 0.45, a: 0.45, r: 0.6, cd: 1.6, type: 'dive', box: [-4, -8, 14, 12] })], draw: 'skull', desc: 'Memories sealed in bone, loose and angry.' },
    // ---------------------------------------------------------- Spire
    guard: { name: 'Lantern Guard', w: 16, h: 30, hp: 360, dmg: 30, speed: 46, ai: 'walk', sight: 240, poise: 80, gold: 12, ember: 0.6, blood: '#6a5020', shield: 0.7,
      attacks: [A('combo', { range: [0, 36], w: 0.55, a: 0.12, r: 0.22, hits: 3, box: [0, -28, 36, 28], statuses: { burn: 1 } }), A('wave', { range: [50, 260], yr: 30, w: 0.8, a: 0.1, r: 0.8, cd: 4, type: 'proj', proj: 'firewave' })], draw: 'guard', desc: 'The King’s last honor guard. Their lanterns went out with the great one; they burn with something else now.' },
    sentinel: { name: 'Gilded Sentinel', w: 14, h: 28, hp: 260, dmg: 28, speed: 50, ai: 'walk', sight: 260, poise: 40, gold: 11, ember: 0.55, blood: '#c0a040', floaty: true,
      attacks: [A('blink', { range: [60, 300], yr: 120, w: 0.5, a: 0.05, r: 0.2, cd: 3.5, type: 'blink' }), A('slash', { range: [0, 34], w: 0.5, a: 0.12, r: 0.5, box: [0, -26, 34, 28] })], draw: 'sentinel', desc: 'Empty armor animated by duty. It appears behind you. Listen for the chime.' },
    stormcaller: { name: 'Stormcaller', w: 12, h: 26, hp: 230, dmg: 26, speed: 36, ai: 'keep', pref: [150, 260], sight: 320, poise: 25, gold: 11, ember: 0.55, blood: '#3a3a6a', teleport: true,
      attacks: [A('strike', { range: [0, 360], yr: 240, w: 0.6, a: 1.4, r: 0.8, cd: 4, type: 'strikes' }), A('ball', { range: [0, 300], yr: 180, w: 0.7, a: 0.1, r: 0.8, cd: 2.8, type: 'proj', proj: 'spark' })], draw: 'stormcaller', desc: 'Calls down the storm that circles the spire. Keep moving.' },
  };
  for (const id in E) E[id].id = id;
  G.ENEMIES = E;

  const GUARDIANS = {
    vine: { name: 'Captain Brack, the Kelp-Bound', hpMul: 6, dmgMul: 1.3 },
    spider: { name: 'Ser Aldric the Unbent', hpMul: 5.5, dmgMul: 1.3 },
  };

  // ---------------------------------------------------------------- Enemy class
  class Enemy extends G.Entity {
    constructor(id, x, y, opts) {
      opts = opts || {};
      const def = E[id];
      const sc = opts.elite || opts.guardian ? 1.2 : 1;
      super(0, 0, Math.round(def.w * sc), Math.round(def.h * sc));
      this.setFeet(x, y);
      this.id = id;
      this.def = def;
      this.sc = sc;
      this.isEnemy = true;
      this.team = 'enemy';
      this.layer = 2;
      this.elite = !!opts.elite || !!opts.guardian;
      this.guardian = opts.guardian || null;
      const tier = Math.max(1, opts.tier || G.world.level.tier || 1);
      this.tier = tier;
      let hpM = G.TIER_HP[tier] * (this.elite ? 3.5 : 1);
      let dmM = G.TIER_DMG[tier] * (this.elite ? 1.25 : 1);
      if (this.guardian) { hpM = G.TIER_HP[tier] * GUARDIANS[this.guardian].hpMul; dmM = G.TIER_DMG[tier] * GUARDIANS[this.guardian].dmgMul; }
      this.maxHp = this.hp = Math.round(def.hp * hpM);
      this.dmgMul = dmM;
      this.name = this.guardian ? GUARDIANS[this.guardian].name : (this.elite ? 'Elite ' : '') + def.name;
      if (this.guardian === 'vine') this.attacks = def.attacks.concat([A('harpoons', { range: [40, 320], yr: 90, w: 0.9, a: 0.1, r: 0.9, cd: 4.5, type: 'proj', proj: 'harpoon3' }), A('summon', { range: [0, 320], yr: 200, w: 1.0, a: 0.1, r: 0.8, cd: 12, type: 'summon', minion: 'slime' })]);
      if (this.guardian === 'spider') this.attacks = def.attacks.concat([A('leap', { range: [60, 240], yr: 90, w: 0.7, a: 0.9, r: 0.8, cd: 4.5, type: 'leap', box: [-20, -20, 56, 22], knock: 240 })]);
      this.speedMul = this.elite ? 1.2 : 1;
      this.state = 'idle';
      this.facing = G.rng.sign();
      this.aggro = false;
      this.aggroT = 0;
      this.atk = null;
      this.atkCd = 0.6 + G.rng.next();
      this.cds = {};
      this.poise = def.poise;
      this.st = {};
      this.flashT = 0;
      this.hpBarT = 0;
      this.walkT = G.rng.next() * 10;
      this.animT = G.rng.next() * 10;
      this.patrolT = G.rng.next() * 3;
      this.hurtT = 0;
      this.alertT = 0;
      this.flying = def.ai === 'fly';
      this.hover = { ox: G.rng.range(-50, 50), oy: G.rng.range(-70, -40), t: 0 };
      this.hopT = G.rng.range(0.5, 1.5);
      if (def.ai === 'ceiling') { this.hanging = true; this.hidden = false; }
      if (this.flying) this.y -= 0;
      // push out of walls
      const L = G.world.level;
      let n = 0;
      while (L.rectSolid(this.x, this.y, this.w, this.h) && n++ < 20) this.y += 8;
      if (def.ai === 'ceiling') {
        // snap to ceiling above
        let yy = this.y;
        for (let k = 0; k < 20; k++) { if (L.rectSolid(this.x, yy - 8, this.w, this.h)) break; yy -= 8; }
        this.y = yy;
      }
    }
    hurtbox() { return this; }
    get isBoss() { return false; }
    update(dt) {
      this.animT += dt;
      if (this.flashT > 0) this.flashT -= dt;
      if (this.hpBarT > 0) this.hpBarT -= dt;
      if (this.alertT > 0) this.alertT -= dt;
      if (this.dying) {
        this.deathT += dt;
        this.vy = Math.min(400, this.vy + GRAV * dt);
        this.vx *= 0.9;
        if (!this.flying || this.def.ghost === undefined) { this.moveX(this.vx * dt); this.moveY(this.vy * dt); }
        if (this.boneT !== undefined) {
          this.boneT -= dt;
          if (this.boneT <= 0) this.reassemble();
          return;
        }
        if (this.deathT > 0.45) G.world.kill(this);
        return;
      }
      G.tickStatuses(this, dt);
      if (this.dead) return;
      if (this.atkCd > 0) this.atkCd -= dt;
      for (const k in this.cds) if (this.cds[k] > 0) this.cds[k] -= dt;
      const disabled = G.hasSt(this, 'freeze') || G.hasSt(this, 'stun');
      const slow = G.hasSt(this, 'slow') ? 0.55 : 1;
      if (this.pullTo) {
        this.pullTo.t -= dt;
        const dx = this.pullTo.x - this.cx;
        this.vx = G.clamp(dx * 12, -500, 500);
        if (this.pullTo.t <= 0 || Math.abs(dx) < 6) this.pullTo = null;
      }
      if (disabled) {
        if (this.atk) this.atk = null;
        this.vx = G.approach(this.vx, 0, 800 * dt);
      } else if (this.hurtT > 0) {
        this.hurtT -= dt;
        this.vx = G.approach(this.vx, 0, 600 * dt);
      } else if (!this.pullTo) {
        this.think(dt * slow, slow);
      }
      // physics
      if (this.flying && !this.dying) {
        if (disabled && !this.def.ghost) { this.vy = Math.min(300, this.vy + GRAV * 0.5 * dt); }
        if (this.def.ghost) { this.x += this.vx * dt; this.y += this.vy * dt; }
        else { if (this.moveX(this.vx * dt)) this.vx *= -0.3; if (this.moveY(this.vy * dt)) this.vy *= -0.3; }
      } else if (this.hanging) {
        // stuck to ceiling
      } else {
        this.vy = Math.min(480, this.vy + GRAV * dt);
        if (this.moveX(this.vx * dt)) this.hitWall = true;
        const r = this.moveY(this.vy * dt, this.dropT > 0);
        if (r === 'floor') { if (this.vy > 250 && this.onLand) this.onLand(); this.vy = 0; }
        if (r === 'ceil') this.vy = 0;
        this.onGround = this.vy >= 0 && this.groundCheck();
        if (this.dropT > 0) this.dropT -= dt;
        if (Math.abs(this.vx) > 5 && this.onGround) this.walkT += dt * Math.abs(this.vx) / 8;
      }
      // separation from other enemies
      if (!this.flying) {
        for (const o of G.world.enemies) {
          if (o === this || o.dead || o.dying || o.flying || o.isBoss) continue;
          const dx = this.cx - o.cx;
          if (Math.abs(dx) < (this.w + o.w) / 2 - 2 && Math.abs(this.bottom - o.bottom) < 8) this.x += Math.sign(dx || 1) * 20 * dt;
        }
      }
      // falling out of the world
      if (this.y > G.world.level.ph + 50) G.world.kill(this);
    }
    player() { return G.world.player; }
    canSee(p) {
      if (!p || p.dead) return false;
      const dx = p.cx - this.cx, dy = p.cy - this.cy;
      if (Math.abs(dx) > this.def.sight || Math.abs(dy) > 120) return false;
      return G.world.level.los(this.cx, this.cy - 4, p.cx, p.cy - 4);
    }
    setAggro() {
      if (!this.aggro) {
        this.aggro = true;
        this.alertT = 0.6;
        if (this.hanging) this.dropFromCeiling();
      }
      this.aggroT = 4;
    }
    think(dt, slow) {
      const p = this.player();
      const def = this.def;
      if (!p || p.dead || p.state === 'dead') { this.aggro = false; }
      else if (this.canSee(p)) this.setAggro();
      else if (this.aggro) { this.aggroT -= dt; if (this.aggroT <= 0) this.aggro = false; }
      if (this.atk) return this.updateAttack(dt, p);
      const dx = p ? p.cx - this.cx : 0, dy = p ? p.bottom - this.bottom : 0, dist = Math.abs(dx);
      // choose attack
      if (this.aggro && this.atkCd <= 0 && p && p.state !== 'dead') {
        const opts = (this.attacks || def.attacks).filter((a) => !(this.cds[a.id] > 0) && dist >= a.range[0] && dist <= a.range[1] * this.sc && Math.abs(dy) <= a.yr && (a.type === 'melee' || a.type === 'lunge' || a.type === 'spin' || a.type === 'slam' || a.type === 'cloud' || G.world.level.los(this.cx, this.cy - 4, p.cx, p.cy - 4)));
        if (opts.length) return this.startAttack(G.rng.pick(opts), p);
      }
      const spd = def.speed * this.speedMul;
      switch (def.ai) {
        case 'walk': this.aiWalk(dt, p, dx, dy, dist, spd); break;
        case 'keep': this.aiKeep(dt, p, dx, dy, dist, spd); break;
        case 'fly': this.aiFly(dt, p, dx, dy, dist, spd); break;
        case 'hop': this.aiHop(dt, p, dx, dy, dist); break;
        case 'static': if (this.aggro && p) this.facing = Math.sign(dx) || this.facing; break;
        case 'ceiling':
          if (this.hanging) {
            if (p && Math.abs(dx) < 30 && dy > 0 && dy < 200 && G.world.level.los(this.cx, this.bottom + 2, p.cx, p.y)) this.dropFromCeiling();
          } else this.aiWalk(dt, p, dx, dy, dist, spd);
          break;
      }
    }
    dropFromCeiling() {
      if (!this.hanging) return;
      this.hanging = false;
      this.aggro = true;
      this.vy = 50;
      this.alertT = 0.5;
      G.Audio.play('telegraph', { x: this.cx, y: this.cy });
      this.onLand = () => {
        this.onLand = null;
        G.shake(0.2);
        G.Audio.play('stomp', { x: this.cx, vol: 0.6 });
        const p = this.player();
        if (p && Math.abs(p.cx - this.cx) < 26 && Math.abs(p.bottom - this.bottom) < 16) p.takeHit({ dmg: this.def.dmg * this.dmgMul, team: 'enemy', x: this.cx, dir: Math.sign(p.cx - this.cx) || 1, knock: 200, src: this });
      };
    }
    aiWalk(dt, p, dx, dy, dist, spd) {
      if (this.aggro && p) {
        const dir = Math.sign(dx) || this.facing;
        this.facing = dir;
        const reach = (this.def.attacks[0] ? this.def.attacks[0].range[1] * 0.7 : 20) * this.sc;
        if (dist > reach || Math.abs(dy) > 30) {
          const ledge = !this.floorAhead(dir * 4);
          const wall = this.wallAhead(dir * 2);
          if (wall && this.onGround) {
            // hop small walls
            const L = G.world.level;
            const fx = dir > 0 ? this.x + this.w + 4 : this.x - 4;
            if (!L.rectSolid(fx - 2, this.y - 18, 4, this.h) && this.jumpCd <= 0) { this.vy = -330; this.jumpCd = 1; }
            this.vx = G.approach(this.vx, dir * spd, 600 * dt);
          } else if (ledge && dy <= 8) this.vx = G.approach(this.vx, 0, 600 * dt);
          else this.vx = G.approach(this.vx, dir * spd, 600 * dt);
          // drop through platforms when player is below
          if (dy > 30 && this.onGround && Math.abs(dx) < 60) {
            const tyB = Math.floor((this.bottom + 2) / TS);
            if (G.world.level.isOneWay(Math.floor(this.cx / TS), tyB)) this.dropT = 0.25;
          }
        } else this.vx = G.approach(this.vx, 0, 800 * dt);
      } else {
        // patrol
        this.patrolT -= dt;
        if (this.patrolT <= 0) { this.patrolT = G.rng.range(1.5, 4); this.patrolling = G.rng.chance(0.7); }
        if (this.patrolling) {
          if (!this.floorAhead(this.facing * 4) || this.wallAhead(this.facing * 2)) this.facing *= -1;
          this.vx = G.approach(this.vx, this.facing * spd * 0.45, 400 * dt);
        } else this.vx = G.approach(this.vx, 0, 400 * dt);
      }
      if (this.jumpCd > 0) this.jumpCd -= dt;
      else if (this.jumpCd === undefined) this.jumpCd = 0;
    }
    aiKeep(dt, p, dx, dy, dist, spd) {
      if (this.aggro && p) {
        const dir = Math.sign(dx) || this.facing;
        this.facing = dir;
        const [lo, hi] = this.def.pref;
        let mv = 0;
        if (dist < lo) mv = -dir;
        else if (dist > hi) mv = dir;
        if (mv && (!this.floorAhead(mv * 4) || this.wallAhead(mv * 2))) {
          mv = 0;
          if (dist < 50 && this.def.teleport && !(this.cds.tele > 0)) this.teleportAway(p);
        }
        this.vx = G.approach(this.vx, mv * spd, 500 * dt);
      } else this.aiWalk(dt, p, dx, dy, dist, spd);
    }
    teleportAway(p) {
      this.cds.tele = 4;
      const L = G.world.level;
      for (let k = 0; k < 12; k++) {
        const nx = p.cx + G.rng.sign() * G.rng.range(140, 220);
        const gy = L.groundBelow(nx, p.y - 40, 200);
        if (gy === null) continue;
        if (L.rectSolid(nx - this.w / 2, gy - this.h - 1, this.w, this.h)) continue;
        if (!L.los(nx, gy - 12, p.cx, p.cy)) continue;
        G.fx.burst(this.cx, this.cy, 14, { color: ['#60e0c0', '#ffffff'], speed: 100, life: 0.4, size: 2, add: true });
        this.setFeet(nx, gy);
        G.fx.burst(this.cx, this.cy, 14, { color: ['#60e0c0', '#ffffff'], speed: 100, life: 0.4, size: 2, add: true });
        G.Audio.play('teleport', { x: this.cx });
        return true;
      }
      return false;
    }
    aiFly(dt, p, dx, dy, dist, spd) {
      let tx, ty;
      if (this.aggro && p) {
        this.hover.t -= dt;
        if (this.hover.t <= 0) { this.hover.t = G.rng.range(1, 2.5); this.hover.ox = G.rng.range(40, 90) * (G.rng.chance(0.5) ? 1 : -1); this.hover.oy = G.rng.range(-80, -40); }
        tx = p.cx + this.hover.ox;
        ty = p.cy + this.hover.oy;
        this.facing = Math.sign(dx) || this.facing;
      } else {
        tx = this.homeX === undefined ? (this.homeX = this.cx) : this.homeX + Math.sin(this.animT * 0.7) * 40;
        ty = this.homeY === undefined ? (this.homeY = this.cy) : this.homeY + Math.sin(this.animT * 1.3) * 10;
      }
      const ax = G.clamp((tx - this.cx) * 3, -spd, spd), ay = G.clamp((ty - this.cy) * 3, -spd, spd);
      this.vx = G.approach(this.vx, ax, 300 * dt);
      this.vy = G.approach(this.vy, ay + Math.sin(this.animT * 5) * 12, 300 * dt);
    }
    aiHop(dt, p, dx, dy, dist) {
      if (this.onGround) {
        this.vx = G.approach(this.vx, 0, 900 * dt);
        this.hopT -= dt;
        if (this.hopT <= 0) {
          const dir = this.aggro && p ? Math.sign(dx) || 1 : G.rng.sign();
          this.facing = dir;
          const small = this.def.small;
          this.vx = dir * (this.aggro ? (small ? 110 : 130) : 50);
          this.vy = this.aggro ? -300 : -180;
          this.hopT = this.aggro ? G.rng.range(0.6, 1.1) : G.rng.range(1.5, 3);
          this.hopping = true;
          G.Audio.play('bubble', { x: this.cx, vol: 0.4 });
        }
      } else if (this.hopping && p && !p.dead && G.overlap(this, p)) {
        p.takeHit({ dmg: this.def.dmg * this.dmgMul, team: 'enemy', x: this.cx, dir: Math.sign(p.cx - this.cx) || 1, knock: 160, src: this });
        this.hopping = false;
      }
      if (this.onGround && this.vy === 0) this.hopping = false;
    }
    // ------------------------------------------------------------ attacks
    startAttack(ad, p) {
      this.atk = { d: ad, phase: 'w', t: 0, hit: false, hitsLeft: (ad.hits || 1) - 1 };
      this.facing = Math.sign(p.cx - this.cx) || this.facing;
      this.vx *= 0.3;
      if (ad.w >= 0.6 || ad.type !== 'melee') G.Audio.play('telegraph', { x: this.cx, y: this.cy, vol: 0.7 });
      this.alertT = Math.max(this.alertT, 0.01);
      if (ad.type === 'strikes') this.atk.targets = [];
      if (ad.aimLine) this.atk.aim = { x: p.cx, y: p.cy };
    }
    updateAttack(dt, p) {
      const a = this.atk;
      const d = a.d;
      const sp = this.elite ? 1.2 : 1;
      a.t += dt * sp;
      if (a.phase === 'w') {
        if (d.aimLine && p && a.t < d.w - 0.22) { a.aim.x = G.lerp(a.aim.x, p.cx, 0.2); a.aim.y = G.lerp(a.aim.y, p.cy - 2, 0.2); this.facing = Math.sign(p.cx - this.cx) || this.facing; }
        if (d.type === 'dive' && p && a.t < d.w * 0.7) { this.vx *= 0.9; this.vy = G.approach(this.vy, -30, 400 * dt); a.tx = p.cx; a.ty = p.cy; }
        if (d.type === 'charge') { this.vx = 0; if (Math.random() < 0.3) G.fx.spawn({ x: this.cx - this.facing * 10, y: this.bottom, vx: -this.facing * 40, vy: -30, life: 0.3, color: '#8a7a60', size: 2 }); }
        if (!this.flying) this.vx = G.approach(this.vx, 0, 600 * dt);
        if (a.t >= d.w) { a.phase = 'a'; a.t = 0; this.onActive(a, p); }
        return;
      }
      if (a.phase === 'a') {
        this.activeTick(dt, a, p);
        if (a.phase === 'a' && a.t >= d.a) {
          if (a.hitsLeft > 0) { a.hitsLeft--; a.phase = 'w'; a.t = d.w * 0.55; a.hit = false; this.facing = p ? Math.sign(p.cx - this.cx) || this.facing : this.facing; }
          else { a.phase = 'r'; a.t = 0; }
        }
        return;
      }
      // recovery
      if (!this.flying) this.vx = G.approach(this.vx, 0, 800 * dt);
      else { this.vx *= 0.92; this.vy *= 0.92; }
      if (a.t >= d.r) {
        this.atk = null;
        this.atkCd = 0.35 + G.rng.next() * 0.4;
        this.cds[d.id] = d.cd;
      }
    }
    boxWorld(box) {
      const s = this.sc;
      const [bx, by, bw, bh] = box;
      const x = this.facing > 0 ? this.cx + bx * s : this.cx - (bx + bw) * s;
      return { x, y: this.bottom + by * s, w: bw * s, h: bh * s };
    }
    meleeHit(a, p, box, mult) {
      if (!p || p.dead) return;
      const b = this.boxWorld(box);
      if (G.rectsOverlap(b.x, b.y, b.w, b.h, p.x, p.y, p.w, p.h)) {
        const d = a.d;
        const res = p.takeHit({ dmg: this.def.dmg * this.dmgMul * (d.dmg || 1) * (mult || 1), team: 'enemy', kind: 'melee', x: this.cx, y: this.cy, dir: this.facing, knock: d.knock, statuses: d.statuses, src: this, power: this.dmgMul });
        a.hit = true;
        if (res === 'blocked' || res === 'parried') { this.vx = -this.facing * 60; }
        return res;
      }
    }
    onActive(a, p) {
      const d = a.d;
      const def = this.def;
      const dmg = def.dmg * this.dmgMul * (d.dmg || 1);
      G.Audio.play(d.type === 'proj' ? 'throw' : 'swing', { x: this.cx, y: this.cy, vol: 0.6 });
      switch (d.type) {
        case 'lunge': this.vx = this.facing * d.lunge; break;
        case 'charge': a.chargeDir = this.facing; G.Audio.play('bossRoar', { x: this.cx, vol: 0.3 }); break;
        case 'dive': {
          const tx = a.tx !== undefined ? a.tx : p.cx, ty = a.ty !== undefined ? a.ty : p.cy;
          const ang = Math.atan2(ty - this.cy, tx - this.cx);
          this.vx = Math.cos(ang) * 320;
          this.vy = Math.sin(ang) * 320;
          this.facing = Math.sign(this.vx) || this.facing;
          break;
        }
        case 'leap': {
          const dx = p.cx - this.cx;
          const t = 0.7;
          this.vx = dx / t;
          this.vy = -GRAV * t / 2;
          a.landed = false;
          break;
        }
        case 'slam': {
          this.meleeHit(a, p, d.box);
          G.shake(0.3);
          G.Audio.play('stomp', { x: this.cx });
          G.fx.burst(this.cx + this.facing * 24, this.bottom, 12, { color: ['#a09080', '#c0b0a0'], speed: 140, life: 0.4, size: 2, angle: -Math.PI / 2, spread: 2.5, grav: 400 });
          if (d.shock) for (const s of [1, -1]) G.world.add(new G.Proj({ x: this.cx + s * 24, y: this.bottom - 7, w: 12, h: 14, vx: s * 220, type: 'shock', team: 'enemy', dmg: dmg * 0.6, life: 1.2, pierce: 99, color: '#c0a080', unblockable: false }));
          break;
        }
        case 'proj': this.fireProj(d, p, dmg); break;
        case 'cloud':
          G.fx.burst(this.cx, this.cy, 30, { color: ['#a060e0', '#60c040', '#c090ff'], speed: 70, life: 1.2, size: 3, size2: 8, type: 'smoke', drag: 0.05 });
          G.Audio.play('poison', { x: this.cx });
          if (p && Math.hypot(p.cx - this.cx, p.cy - this.cy) < 60 * this.sc) p.takeHit({ dmg: dmg * 0.5, team: 'enemy', kind: 'cloud', x: this.cx, dir: Math.sign(p.cx - this.cx) || 1, knock: 80, statuses: { poison: 2 }, src: this, power: this.dmgMul });
          break;
        case 'summon': {
          const n = G.world.enemies.filter((e) => e.summoned && !e.dead).length;
          if (n < 3) for (let i = 0; i < 2; i++) {
            const nx = this.cx + (i ? 1 : -1) * 30;
            const L = G.world.level;
            const gy = L.groundBelow(nx, this.cy, 120);
            if (gy === null || L.rectSolid(nx - 6, gy - 24, 12, 23)) continue;
            const m = G.world.add(new Enemy(d.minion, nx, gy, { tier: this.tier }));
            m.summoned = true;
            m.aggro = true;
            G.fx.burst(nx, gy - 10, 16, { color: ['#2a6a6a', '#60c0c0'], speed: 80, life: 0.6, size: 2, grav: 200 });
          }
          G.Audio.play('splash', { x: this.cx });
          break;
        }
        case 'scream':
          G.Audio.play('scream', { x: this.cx });
          break;
        case 'blink': {
          this.cds.blink = d.cd;
          const side = -p.facing || 1;
          const nx = p.cx + side * 26;
          const L = G.world.level;
          if (!L.rectSolid(nx - this.w / 2, p.bottom - this.h - 1, this.w, this.h)) {
            G.fx.burst(this.cx, this.cy, 16, { color: ['#ffd060', '#ffffff'], speed: 100, life: 0.4, size: 2, add: true });
            this.setFeet(nx, p.bottom);
            this.facing = Math.sign(p.cx - this.cx) || 1;
            G.fx.burst(this.cx, this.cy, 16, { color: ['#ffd060', '#ffffff'], speed: 100, life: 0.4, size: 2, add: true });
            G.Audio.play('teleport', { x: this.cx });
            G.Audio.play('bellHit', { x: this.cx, note: 84 });
            // follow up with a slash
            this.cds.slash = 0;
            this.atkCd = 0;
            this.atk = null;
            const slash = this.def.attacks.find((x) => x.id === 'slash');
            this.startAttack(Object.assign({}, slash, { w: 0.45 }), p);
          }
          break;
        }
        case 'strikes':
          a.targets = [p.cx - 50, p.cx, p.cx + 50];
          G.rng.shuffle(a.targets);
          a.si = 0;
          a.st = 0;
          break;
      }
    }
    fireProj(d, p, dmg) {
      const W = G.world;
      const x = this.cx + this.facing * 8, y = this.cy - 4;
      const aim = (sp) => { const ang = Math.atan2(p.cy - 2 - y, p.cx - x); return [Math.cos(ang) * sp, Math.sin(ang) * sp]; };
      switch (d.proj) {
        case 'glob': {
          const dx = p.cx - x, t = G.clamp(Math.abs(dx) / 200, 0.45, 1.1);
          W.add(new G.Proj({ x, y, w: 6, h: 6, vx: dx / t, vy: (p.cy - y - 0.5 * 700 * t * t) / t, grav: 700, type: 'glob', team: 'enemy', dmg, statuses: { poison: 1 }, life: 3, puddle: 'poison' }));
          break;
        }
        case 'eharpoon': {
          const a = this.atk && this.atk.aim ? this.atk.aim : { x: p.cx, y: p.cy };
          const ang = Math.atan2(a.y - y, a.x - x);
          W.add(new G.Proj({ x, y, w: 10, h: 4, vx: Math.cos(ang) * 480, vy: Math.sin(ang) * 480, type: 'eharpoon', team: 'enemy', dmg, life: 2, knock: 200 }));
          break;
        }
        case 'earrow': {
          const a = this.atk && this.atk.aim ? this.atk.aim : { x: p.cx, y: p.cy };
          const ang = Math.atan2(a.y - y, a.x - x);
          W.add(new G.Proj({ x, y, w: 8, h: 3, vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, type: 'earrow', team: 'enemy', dmg, life: 2 }));
          break;
        }
        case 'volley': {
          for (let i = 0; i < 3; i++) {
            const dx = p.cx - x + (i - 1) * 40, t = 0.9;
            W.add(new G.Proj({ x, y, w: 8, h: 3, vx: dx / t, vy: (p.cy - y - 0.5 * 600 * t * t) / t, grav: 600, type: 'earrow', team: 'enemy', dmg: dmg * 0.8, life: 3 }));
          }
          break;
        }
        case 'harpoon3': {
          for (let i = -1; i <= 1; i++) {
            const ang = Math.atan2(p.cy - y, p.cx - x) + i * 0.18;
            W.add(new G.Proj({ x, y, w: 10, h: 4, vx: Math.cos(ang) * 420, vy: Math.sin(ang) * 420, type: 'eharpoon', team: 'enemy', dmg: dmg * 0.8, life: 2, knock: 180 }));
          }
          break;
        }
        case 'thorns': {
          const [vx, vy] = aim(260);
          for (let i = -1; i <= 1; i++) {
            const c = Math.cos(i * 0.22), s = Math.sin(i * 0.22);
            W.add(new G.Proj({ x, y: this.y + 4, w: 6, h: 3, vx: vx * c - vy * s, vy: vx * s + vy * c, type: 'thorn', team: 'enemy', dmg: dmg * 0.8, life: 2 }));
          }
          break;
        }
        case 'spore': {
          const [vx, vy] = aim(90);
          W.add(new G.Proj({ x, y: this.y, w: 8, h: 8, vx, vy, type: 'spore', team: 'enemy', dmg, statuses: { poison: 2 }, life: 4, homing: 1.2, ghost: true }));
          break;
        }
        case 'sporeDrop':
          W.add(new G.Proj({ x: this.cx, y: this.bottom, w: 6, h: 6, vx: 0, vy: 60, grav: 500, type: 'glob', team: 'enemy', dmg, statuses: { poison: 1 }, color: '#40c0b0', life: 3, puddle: 'poison' }));
          break;
        case 'bomb': {
          const dx = p.cx - x, t = G.clamp(Math.abs(dx) / 220, 0.5, 1.1);
          const b = W.add(new G.Proj({ x, y: this.y, w: 7, h: 7, vx: dx / t, vy: (p.cy - this.y - 0.5 * 800 * t * t) / t, grav: 800, type: 'bomb', team: 'enemy', dmg, life: 1.6, aoe: 38 }));
          b.color = '#2a2a30';
          break;
        }
        case 'orbs':
          for (let i = 0; i < 3; i++) {
            const ang = -Math.PI / 2 + (i - 1) * 0.7;
            W.add(new G.Proj({ x: this.cx, y: this.y, w: 8, h: 8, vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140, type: 'orb', team: 'enemy', dmg: dmg * 0.8, life: 4, homing: 2.2, ghost: true, color: '#40d0b0' }));
          }
          G.Audio.play('magic', { x: this.cx });
          break;
        case 'firewave':
          W.add(new G.Proj({ x: this.cx + this.facing * 16, y: this.bottom - 9, w: 14, h: 18, vx: this.facing * 240, type: 'shock', team: 'enemy', dmg, life: 1.5, pierce: 99, color: '#ff8030', statuses: { burn: 1 } }));
          G.Audio.play('fire', { x: this.cx });
          break;
        case 'spark': {
          const [vx, vy] = aim(200);
          W.add(new G.Proj({ x, y, w: 8, h: 8, vx, vy, type: 'orb', team: 'enemy', dmg, life: 3, homing: 1.5, ghost: true, color: '#a0c0ff', statuses: { stun: 0.4 } }));
          G.Audio.play('lightning', { x: this.cx, vol: 0.4 });
          break;
        }
      }
    }
    activeTick(dt, a, p) {
      const d = a.d;
      switch (d.type) {
        case 'melee':
        case 'lunge':
          if (d.type === 'lunge') this.vx = G.approach(this.vx, 0, d.lunge * 2.5 * dt);
          if (!a.hit) this.meleeHit(a, p, d.box);
          break;
        case 'charge': {
          this.vx = a.chargeDir * d.speed * (this.elite ? 1.2 : 1);
          if (Math.random() < 0.5) G.fx.spawn({ x: this.cx - a.chargeDir * 10, y: this.bottom - 2, vx: -a.chargeDir * 60, vy: -40, life: 0.3, color: '#8a7a60', size: 2, grav: 300 });
          if (!a.hit) this.meleeHit(a, p, d.box);
          if (this.wallAhead(a.chargeDir * 3) || (!this.floorAhead(a.chargeDir * 6) && this.onGround)) {
            if (this.wallAhead(a.chargeDir * 3)) {
              G.shake(0.3);
              G.Audio.play('stomp', { x: this.cx });
              G.applyStatuses(this, { stun: 1.6 });
              G.fx.burst(this.cx + a.chargeDir * 12, this.cy, 10, { color: '#c0b0a0', speed: 120, life: 0.4, size: 2 });
            }
            this.vx = 0;
            a.phase = 'r';
            a.t = 0;
          }
          break;
        }
        case 'dive':
          if (!a.hit) this.meleeHit(a, p, d.box);
          this.vx *= Math.pow(0.4, dt);
          this.vy *= Math.pow(0.4, dt);
          break;
        case 'leap':
          if (!a.landed && this.onGround && a.t > 0.1) {
            a.landed = true;
            this.vx = 0;
            G.shake(0.35);
            G.Audio.play('stomp', { x: this.cx });
            G.fx.burst(this.cx, this.bottom, 14, { color: ['#8a7a60', '#c0b0a0'], speed: 150, life: 0.4, size: 2, angle: -Math.PI / 2, spread: 2.6, grav: 400 });
            this.meleeHit(a, p, d.box);
            a.t = d.a;
          }
          break;
        case 'spin': {
          const n = 3;
          const k = Math.floor((a.t / d.a) * n);
          if (k !== a.lastK) { a.lastK = k; a.hit = false; G.Audio.play('swingHeavy', { x: this.cx, vol: 0.5 }); }
          if (!a.hit) this.meleeHit(a, p, d.box, 0.5);
          break;
        }
        case 'scream': {
          const len = 130 * this.sc;
          if (Math.random() < 0.8) G.fx.spawn({ x: this.cx + this.facing * 8, y: this.cy, vx: this.facing * 260, vy: (Math.random() - 0.5) * 120, life: 0.45, color: '#c0d0ff', type: 'ring', size: 2, size2: 10, add: true, rot: 1 });
          if (!a.hit && p) {
            const dx = (p.cx - this.cx) * this.facing;
            if (dx > 0 && dx < len && Math.abs(p.cy - this.cy) < 20 + dx * 0.35) {
              p.takeHit({ dmg: this.def.dmg * this.dmgMul, team: 'enemy', kind: 'scream', x: this.cx, dir: this.facing, knock: 220, statuses: d.statuses, src: this, unblockable: false });
              a.hit = true;
            }
          }
          break;
        }
        case 'strikes': {
          a.st -= dt;
          if (a.si < a.targets.length && a.st <= 0) {
            a.st = 0.45;
            const tx = a.targets[a.si++];
            G.world.add(new StrikeMarker(tx, p ? p.bottom : this.bottom, this.def.dmg * this.dmgMul, 0.7));
          }
          break;
        }
      }
    }
    // ------------------------------------------------------------ damage
    takeHit(h) {
      if (this.dead || this.dying) return 'miss';
      if (this.hanging) this.dropFromCeiling();
      let dmg = h.dmg;
      // shields block frontal hits unless the enemy is attacking or disabled
      if (this.def.shield && h.kind !== 'dot' && !h.parried && !G.isDisabled(this) && !(this.atk && this.atk.phase !== 'w') && h.x !== undefined) {
        if (Math.sign(h.x - this.cx) === this.facing) {
          dmg *= 1 - this.def.shield;
          if (!h.silent) { G.Audio.play('hitMetal', { x: this.cx, y: this.cy }); G.hitFx(this.cx + this.facing * 8, this.cy - 4, -this.facing, '#c0d0ff'); }
          h.knock = (h.knock || 0) * 0.3;
          h.poise = (h.poise || 0) * 1.5;
          this.blockFlash = 0.15;
        }
      }
      this.hp -= dmg;
      this.hpBarT = 3;
      this.lastItem = h.item || this.lastItem;
      if (h.kind !== 'dot') {
        this.flashT = 0.1;
        this.setAggro();
        if (h.dir && !h.noKnock && !this.def.heavy) {
          const kb = (h.knock === undefined ? 100 : h.knock) * (this.elite ? 0.5 : 1);
          this.vx = h.dir * kb;
          if (h.knockUp && !this.flying) this.vy = -h.knockUp;
        }
        if (!this.def.heavy || h.poise >= 40) {
          this.poise -= h.poise || 10;
          if (this.poise <= 0) {
            this.poise = this.def.poise * (this.elite ? 1.5 : 1);
            if (this.atk && this.atk.phase === 'w') { this.atk = null; this.atkCd = 0.4; }
            this.hurtT = 0.25;
          }
        }
        if (h.statuses) G.applyStatuses(this, h.statuses, h.power || 1);
        if (!h.silent) {
          G.Audio.play(h.crit ? 'hitCrit' : 'hit', { x: this.cx, y: this.cy });
          G.hitFx(this.cx - (h.dir || 0) * 4, this.cy - 2, h.dir || 1, h.crit ? '#ffe14a' : '#ffffff', h.crit);
          G.bloodFx(this.cx, this.cy, h.dir || 1, this.def.blood, h.crit ? 10 : 5);
        }
        if (h.crit) G.hitStop(3);
      }
      if (!h.silent || dmg >= 1) G.dmgNumber(this.cx + (Math.random() - 0.5) * 8, this.y - 4, dmg, h.kind === 'dot' ? h.color : null, h.crit);
      const p = G.world.player;
      if (p && h.team === 'player' && h.kind !== 'dot') p.onDealtDamage(dmg);
      if (G.game) G.game.stats.damageDealt += dmg;
      if (this.hp <= 0) this.die(h);
      return 'hit';
    }
    die(h) {
      const p = G.world.player;
      // bonewalkers collapse and may reassemble
      if (this.def.revive && !(h && h.crit) && !G.hasSt(this, 'burn') && !this.revived) {
        this.dying = true;
        this.deathT = 0;
        this.boneT = 4;
        this.revived = true;
        this.atk = null;
        G.Audio.play('crumble', { x: this.cx });
        G.fx.burst(this.cx, this.cy, 12, { color: '#d8cfb8', speed: 120, life: 0.6, size: 2, grav: 500, collide: true });
        G.fx.text(this.cx, this.y - 10, 'It stirs...', '#90ffb0', 1, 1.2);
        return;
      }
      this.dying = true;
      this.deathT = 0;
      this.atk = null;
      this.hanging = false;
      G.Audio.play('enemyDie', { x: this.cx, y: this.cy });
      G.fx.burst(this.cx, this.cy, 18, { color: [this.def.blood, G.shade(this.def.blood, 0.3), '#ffffff'], speed: 160, life: 0.7, size: 2, size2: 1, grav: 500, collide: true });
      G.fx.spawn({ x: this.cx, y: this.cy, type: 'glow', size: 30, size2: 2, life: 0.3, color: '#ffffff', add: true });
      if (this.elite) { G.slowMo(0.5, 0.3); G.shake(0.4); }
      G.dropLoot(this);
      if (p) p.onKill(this);
      G.save.bestiary = G.save.bestiary || {};
      if (!this.def.noBestiary) G.save.bestiary[this.id] = (G.save.bestiary[this.id] || 0) + 1;
      if (this.def.split) {
        for (const s of [-1, 1]) {
          const m = G.world.add(new Enemy(this.def.split, this.cx + s * 6, this.bottom, { tier: this.tier }));
          m.vx = s * 120;
          m.vy = -200;
          m.aggro = true;
        }
      }
      if (this.def.deathCloud) {
        G.fx.burst(this.cx, this.cy, 30, { color: ['#60c040', '#a0e060'], speed: 80, life: 1.2, size: 3, size2: 9, type: 'smoke', drag: 0.05 });
        if (p && Math.hypot(p.cx - this.cx, p.cy - this.cy) < 55) G.applyStatuses(p, { poison: 2 }, this.dmgMul);
      }
      if (this.guardian) G.game.onGuardianDefeated(this);
      if (this.onDeath) this.onDeath();
    }
    reassemble() {
      this.dying = false;
      this.boneT = undefined;
      this.hp = Math.round(this.maxHp * 0.5);
      this.alertT = 0.6;
      G.Audio.play('crumble', { x: this.cx });
      G.fx.burst(this.cx, this.cy, 12, { color: ['#90ffb0', '#d8cfb8'], speed: 90, life: 0.5, size: 2, add: true });
    }
    onFrozen() { G.Audio.play('freeze', { x: this.cx, vol: 0.6 }); }

    // ------------------------------------------------------------ drawing
    draw(ctx, cx, cy) {
      const x = Math.round(this.cx - cx), y = Math.round(this.bottom - cy);
      const a = this.atk;
      const tele = a && a.phase === 'w' && (Math.floor(a.t * 12) % 2 === 0);
      const flash = this.flashT > 0;
      const frozen = G.hasSt(this, 'freeze');
      const tint = flash ? '#ffffff' : frozen ? '#a0e8ff' : tele ? '#ff5040' : null;
      const tintAmt = flash ? 1 : frozen ? 0.5 : 0.45;
      const C = tint ? (c) => G.mix(c, tint, tintAmt) : (c) => c;
      let alpha = 1;
      if (this.dying && this.boneT === undefined) alpha = Math.max(0, 1 - this.deathT / 0.45);
      ctx.save();
      ctx.globalAlpha = alpha * (this.def.ghost ? 0.85 : 1);
      ctx.translate(x, y);
      if (this.elite && !this.dying) {
        // aura
        const pulse = Math.sin(this.animT * 5) * 0.5 + 0.5;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + pulse * 0.15;
        const ac = this.guardian ? '#ffd060' : '#ff5a8a';
        ctx.drawImage(G.glowSprite(ac), -this.w - 6, -this.h * 1.5, this.w * 2 + 12, this.h * 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;
        G.addLight(this.cx, this.cy, 70, ac, 0.8);
      }
      ctx.scale(this.facing * this.sc, this.sc);
      if (this.hanging) ctx.scale(1, -1), ctx.translate(0, this.h / this.sc);
      if (this.boneT !== undefined) {
        // bone pile
        ctx.fillStyle = C('#d8cfb8');
        ctx.fillRect(-7, -3, 14, 3);
        ctx.fillRect(-4, -5, 6, 2);
        ctx.fillStyle = C('#b8af98');
        ctx.fillRect(3, -6, 4, 4);
        const f = Math.sin(this.animT * 10) > 0;
        if (this.boneT < 1.5 && f) { ctx.fillStyle = '#90ffb0'; ctx.fillRect(4, -5, 1, 1); }
      } else {
        DRAW[this.def.draw](ctx, this, C);
      }
      ctx.restore();
      if (frozen) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#b0f0ff';
        ctx.fillRect(Math.round(this.x - cx) - 2, Math.round(this.y - cy) - 2, this.w + 4, this.h + 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(this.x - cx), Math.round(this.y - cy), 2, this.h - 2);
        ctx.globalAlpha = 1;
      }
      if (G.hasSt(this, 'stun') && !this.dying) {
        for (let i = 0; i < 3; i++) {
          const ang = this.animT * 6 + (i / 3) * Math.PI * 2;
          ctx.fillStyle = '#ffe060';
          ctx.fillRect(Math.round(x + Math.cos(ang) * 8), Math.round(this.y - cy - 5 + Math.sin(ang) * 2), 2, 2);
        }
      }
      // telegraph "!"
      if (a && a.phase === 'w' && !this.dying) {
        const big = a.d.w >= 0.6;
        G.text(ctx, '!', x, Math.round(this.y - cy) - 14 - (big ? 2 : 0), big ? '#ff4030' : '#ffb040', { align: 'center', outline: '#000', scale: big ? 2 : 1 });
      } else if (this.alertT > 0 && !this.dying) {
        G.text(ctx, '?', x, Math.round(this.y - cy) - 12, '#ffe060', { align: 'center', outline: '#000' });
      }
      // aim line for harpooners / archers
      if (a && a.d.aimLine && a.phase === 'w' && a.aim) {
        const lock = a.t > a.d.w - 0.22;
        ctx.globalAlpha = lock ? 0.9 : 0.45;
        G.pixLine(ctx, this.cx - cx + this.facing * 8, this.cy - cy - 4, a.aim.x - cx, a.aim.y - cy, lock ? '#ffffff' : '#ff3030');
        ctx.globalAlpha = 1;
      }
      // hp bar
      if (!this.dying && (this.hpBarT > 0 || this.elite) && !this.guardian) {
        const bw = Math.max(18, this.w + 6);
        const bx = x - bw / 2, by = Math.round(this.y - cy) - 7;
        ctx.fillStyle = '#000';
        ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
        ctx.fillStyle = '#5a1010';
        ctx.fillRect(bx, by, bw, 2);
        ctx.fillStyle = this.elite ? '#ff5a8a' : '#e84040';
        ctx.fillRect(bx, by, Math.round(bw * Math.max(0, this.hp / this.maxHp)), 2);
        if (this.elite) G.text(ctx, this.name, x, by - 10, '#ffb0c8', { align: 'center', outline: '#000' });
      }
      if (!this.dying) G.drawStatusIcons(ctx, this, x - 8, Math.round(this.y - cy) - (this.elite ? 26 : 14));
    }
  }
  G.Enemy = Enemy;

  // lightning strike marker (stormcaller)
  class StrikeMarker extends G.Entity {
    constructor(x, groundY, dmg, delay) {
      super(x - 10, groundY - 120, 20, 120);
      const L = G.world.level;
      const gy = L.groundBelow(x, groundY - 60, 200);
      if (gy !== null) this.y = gy - 120;
      this.dmg = dmg;
      this.t = delay;
      this.layer = 4;
      this.alwaysDraw = true;
    }
    update(dt) {
      this.t -= dt;
      if (this.t <= 0 && !this.fired) {
        this.fired = true;
        this.after = 0.25;
        G.Audio.play('lightning', { x: this.cx });
        G.shake(0.25);
        G.boltFx(this.cx, this.y - 60, this.cx, this.bottom, '#c0d8ff');
        const p = G.world.player;
        if (p && G.rectsOverlap(this.x, this.y, this.w, this.h, p.x, p.y, p.w, p.h)) p.takeHit({ dmg: this.dmg, team: 'enemy', kind: 'lightning', x: this.cx, dir: Math.sign(p.cx - this.cx) || 1, knock: 160, statuses: { stun: 0.3 } });
      }
      if (this.fired) { this.after -= dt; if (this.after <= 0) G.world.kill(this); }
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      if (!this.fired) {
        ctx.globalAlpha = 0.4 + Math.sin(this.t * 40) * 0.2;
        ctx.fillStyle = '#80a0ff';
        ctx.fillRect(x, y - 2, this.w, 2);
        ctx.fillRect(x + this.w / 2 - 1, y - 30, 2, 28);
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = this.after * 4;
        ctx.fillStyle = '#e0e8ff';
        ctx.fillRect(x + 6, y - this.h, 8, this.h);
        ctx.globalAlpha = 1;
      }
    }
  }
  G.StrikeMarker = StrikeMarker;

  // ================================================================ drawing
  // local coords: origin at feet centre, facing right
  function R(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function atkPhase(e) {
    const a = e.atk;
    if (!a) return { ph: null, t: 0 };
    const d = a.d;
    return { ph: a.phase, t: a.phase === 'w' ? Math.min(1, a.t / d.w) : a.phase === 'a' ? Math.min(1, a.t / Math.max(0.01, d.a)) : Math.min(1, a.t / d.r), d };
  }
  function armAngle(e, rest) {
    const P = atkPhase(e);
    if (!P.ph) return rest + Math.sin(e.walkT) * 0.3;
    if (P.ph === 'w') return G.lerp(rest, -2.2, G.ease.outCubic(P.t));
    if (P.ph === 'a') return G.lerp(-2.2, 1.0, G.ease.outCubic(Math.min(1, P.t * 2)));
    return G.lerp(1.0, rest, P.t);
  }
  function legs(ctx, e, C, hipY, col, col2, spread) {
    spread = spread || 3;
    const moving = Math.abs(e.vx) > 5 && e.onGround;
    const s = moving ? Math.sin(e.walkT) : 0;
    const f1 = Math.round(s * spread), f2 = -f1;
    const l1 = moving ? Math.max(0, Math.cos(e.walkT)) * 2 : 0, l2 = moving ? Math.max(0, -Math.cos(e.walkT)) * 2 : 0;
    R(ctx, f2 - 1, hipY, 2, -hipY - l2, C(col2));
    R(ctx, f2 - 1, -1 - l2, 3, 1, C(col2));
    R(ctx, f1 - 1, hipY, 2, -hipY - l1, C(col));
    R(ctx, f1 - 1, -1 - l1, 3, 1, C(col));
  }
  function lean(e) {
    const P = atkPhase(e);
    if (P.ph === 'w') return -P.t * 2;
    if (P.ph === 'a') return 3;
    return 0;
  }
  function eyes(ctx, x, y, col, e) {
    R(ctx, x, y, 2, 1, col);
    G.addLight(e.cx + e.facing * 2, e.y + 4, 16, col, 0.5);
  }
  function weaponAt(ctx, sx, sy, ang, len, drawFn) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    drawFn(ctx, len);
    ctx.restore();
  }
  function trail(ctx, e, sx, sy, r, col) {
    const P = atkPhase(e);
    if (P.ph !== 'a' || P.t > 0.6) return;
    ctx.globalAlpha = 0.35 * (1 - P.t);
    ctx.strokeStyle = col || '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(sx, sy, r, -2.2, G.lerp(-2.2, 1.0, Math.min(1, P.t * 2)));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const DRAW = {
    husk(ctx, e, C) {
      const l = lean(e);
      legs(ctx, e, C, -8, '#3a3a30', '#2a2a22');
      R(ctx, -4 + l, -17, 8, 10, C('#4a4a3a'));
      R(ctx, -4 + l, -17, 8, 3, C('#7a8a78'));
      R(ctx, -3 + l, -23, 7, 7, C('#7a8a78'));
      R(ctx, 2 + l, -21, 3, 3, C('#5a6a58'));
      eyes(ctx, 2 + l, -21, '#e0f0a0', e);
      const ang = armAngle(e, 1.1);
      R(ctx, -5 + l, -16, 2, 7, C('#6a7a68'));
      weaponAt(ctx, 1 + l, -15, ang, 9, (c, len) => { R(c, 0, -1, len, 2, C('#7a8a78')); R(c, len - 1, -2, 3, 1, C('#c0c8b0')); R(c, len - 1, 1, 3, 1, C('#c0c8b0')); });
      trail(ctx, e, 1 + l, -15, 12);
    },
    spitter(ctx, e, C) {
      const P = atkPhase(e);
      const puff = P.ph === 'w' ? P.t * 2 : 0;
      legs(ctx, e, C, -5, '#4a5a2a', '#3a4a20', 2);
      G.pixCircle(ctx, 0, -11, 7 + Math.round(puff), C('#6a7a3a'));
      R(ctx, -5, -14, 3, 3, C('#8a9a4a'));
      R(ctx, 2, -9, 5, 3, C('#2a1a10'));
      if (P.ph === 'w') R(ctx, 3, -9, 3, 2, C('#a0e040'));
      eyes(ctx, 1, -15, '#ffe060', e);
      R(ctx, -2, -19, 2, 2, C('#8a9a4a'));
    },
    crawler(ctx, e, C) {
      const P = atkPhase(e);
      const s = Math.sin(e.walkT * 1.5);
      for (let i = 0; i < 4; i++) {
        const x = -6 + i * 4, h = 6 + (i === 3 ? 2 : 0) + (i % 2 ? s : -s);
        R(ctx, x, -h - 1, 4, h, C(i % 2 ? '#8a5a6a' : '#9a6a7a'));
      }
      R(ctx, 6, -8, 4, 5, C('#9a6a7a'));
      const open = P.ph === 'a' ? 3 : P.ph === 'w' ? 2 : 1;
      R(ctx, 9, -9, 3, 1, C('#e0d0c0'));
      R(ctx, 9, -9 + open + 2, 3, 1, C('#e0d0c0'));
      eyes(ctx, 7, -7, '#ff5050', e);
      for (let i = 0; i < 4; i++) R(ctx, -5 + i * 4, -1, 1, 1, C('#5a3a4a'));
    },
    jailer(ctx, e, C) {
      const l = lean(e);
      legs(ctx, e, C, -9, '#3a3a44', '#2a2a32');
      R(ctx, -5 + l, -19, 10, 11, C('#5a5a66'));
      R(ctx, -5 + l, -19, 10, 2, C('#7a7a88'));
      R(ctx, -4 + l, -26, 8, 8, C('#6a6a78'));
      R(ctx, -4 + l, -26, 8, 2, C('#8a8a98'));
      R(ctx, 0 + l, -23, 4, 1, C('#1a1a20'));
      eyes(ctx, 1 + l, -23, '#ff8040', e);
      // shield
      R(ctx, 5 + l, -20, 3, 13, C('#4a3a2a'));
      R(ctx, 7 + l, -20, 1, 13, C('#6a5a3a'));
      R(ctx, 5 + l, -15, 3, 2, C('#9a9aa4'));
      const ang = armAngle(e, 0.8);
      weaponAt(ctx, -2 + l, -17, ang, 11, (c, len) => { R(c, 0, -1, len, 2, C('#3a2a1a')); R(c, len - 3, -1, 3, 2, C('#6a6a74')); });
      trail(ctx, e, -2 + l, -17, 13);
    },
    hookhand(ctx, e, C) {
      const l = lean(e);
      legs(ctx, e, C, -8, '#3a4a5a', '#2a3a4a');
      R(ctx, -4 + l, -17, 8, 10, C('#6a5a4a'));
      R(ctx, -4 + l, -13, 8, 1, C('#8a7a5a'));
      R(ctx, -3 + l, -23, 7, 7, C('#7a8a9a'));
      R(ctx, -4 + l, -24, 8, 3, C('#a03030'));
      R(ctx, -6 + l, -23, 2, 2, C('#a03030'));
      eyes(ctx, 2 + l, -20, '#c0f0ff', e);
      const ang = armAngle(e, 1.0);
      weaponAt(ctx, 1 + l, -15, ang, 8, (c, len) => {
        R(c, 0, -1, len, 2, C('#7a8a9a'));
        R(c, len, -3, 2, 3, C('#b0b8c0'));
        R(c, len + 2, -3, 1, 5, C('#b0b8c0'));
        R(c, len, 2, 2, 1, C('#b0b8c0'));
      });
      trail(ctx, e, 1 + l, -15, 12);
    },
    gullbat(ctx, e, C) {
      const flap = Math.sin(e.animT * 16);
      R(ctx, -5, -8, 10, 5, C('#d0d0d8'));
      R(ctx, -5, -8, 10, 1, C('#f0f0f8'));
      R(ctx, 5, -9, 3, 3, C('#d0d0d8'));
      R(ctx, 8, -8, 3, 1, C('#e0a030'));
      eyes(ctx, 6, -9, '#ff3030', e);
      const wy = Math.round(flap * 4);
      R(ctx, -7, -8 - wy, 6, 2, C('#6a6a7a'));
      R(ctx, -9, -8 - wy * 1.5, 3, 2, C('#4a4a5a'));
      R(ctx, 1, -8 - wy, 6, 2, C('#6a6a7a'));
      R(ctx, -7, -4, 3, 1, C('#8a8a9a'));
    },
    slime(ctx, e, C) {
      const s = e.def.small ? 0.65 : 1;
      const sq = e.onGround ? 1 + Math.sin(e.animT * 6) * 0.08 : 0.85;
      const w = 16 * s / sq, h = 12 * s * sq;
      ctx.globalAlpha *= 0.85;
      R(ctx, -w / 2, -h, w, h, C('#3aa090'));
      R(ctx, -w / 2 + 1, -h - 1, w - 2, 1, C('#3aa090'));
      R(ctx, -w / 2 + 2, -h + 1, w / 3, 2, C('#a0f0e0'));
      ctx.globalAlpha /= 0.85;
      R(ctx, 1, -h * 0.6, 2, 2, C('#1a3a38'));
      R(ctx, 4 * s, -h * 0.6, 2, 2, C('#1a3a38'));
      R(ctx, -3 * s, -h * 0.35, 2, 2, C('#e0f0f0'));
      G.addLight(e.cx, e.cy, 30, '#50d0c0', 0.4);
    },
    harpooner(ctx, e, C) {
      const l = lean(e);
      legs(ctx, e, C, -8, '#3a3a2a', '#2a2a20');
      R(ctx, -4 + l, -17, 8, 10, C('#c0a030'));
      R(ctx, -4 + l, -17, 8, 1, C('#e0c050'));
      R(ctx, -3 + l, -23, 7, 7, C('#7a8a9a'));
      R(ctx, -5 + l, -25, 11, 3, C('#c0a030'));
      R(ctx, -6 + l, -23, 3, 2, C('#c0a030'));
      eyes(ctx, 2 + l, -20, '#c0f0ff', e);
      const P = atkPhase(e);
      const pull = P.ph === 'w' ? -P.t * 6 : P.ph === 'a' ? 8 : 0;
      const hasH = !(P.ph === 'r' && P.d.id === 'throw');
      if (hasH) weaponAt(ctx, 1 + l + pull, -16, P.ph === 'w' && P.d.id === 'throw' ? -0.3 : 0, 18, (c, len) => { R(c, -6, -1, len, 1, C('#6a5038')); R(c, len - 6, -2, 4, 3, C('#b0b8c0')); });
    },
    thornling(ctx, e, C) {
      const P = atkPhase(e);
      const open = P.ph === 'w' ? P.t : P.ph === 'a' ? 1 : 0;
      R(ctx, -1, -8, 2, 8, C('#3a6a2a'));
      R(ctx, -4, -4, 3, 1, C('#4a8a3a'));
      R(ctx, 1, -6, 3, 1, C('#4a8a3a'));
      G.pixCircle(ctx, 0, -11, 4, C('#6a8a3a'));
      R(ctx, -5, -13, 2, 1, C('#c0e060'));
      R(ctx, 4, -12, 2, 1, C('#c0e060'));
      R(ctx, -2 - open * 2, -17 - open, 4 + open * 4, 3, C('#c0306a'));
      R(ctx, -1, -18 - open * 2, 2, 2, C('#e0508a'));
      R(ctx, 2, -12, 2, 2, C('#1a2a10'));
    },
    mossback(ctx, e, C) {
      const P = atkPhase(e);
      const l = P.ph === 'w' ? -2 : P.ph === 'a' ? 2 : 0;
      const s = Math.abs(e.vx) > 5 ? Math.sin(e.walkT) : 0;
      for (const [x, ph] of [[-9, 0], [-5, 1], [5, 0], [9, 1]]) R(ctx, x + (ph ? s : -s) * 2, -6, 3, 6, C('#3a2a1a'));
      R(ctx, -13 + l, -18, 24, 13, C('#5a4a2a'));
      R(ctx, -13 + l, -20, 22, 4, C('#4f7a3a'));
      R(ctx, -10 + l, -22, 6, 2, C('#6f9a4a'));
      R(ctx, 0 + l, -21, 8, 2, C('#6f9a4a'));
      R(ctx, 9 + l, -15, 7, 9, C('#6a5a3a'));
      R(ctx, 15 + l, -10, 3, 2, C('#e0d8c0'));
      R(ctx, 16 + l, -12, 1, 3, C('#e0d8c0'));
      eyes(ctx, 12 + l, -13, '#ffb040', e);
    },
    sporebloom(ctx, e, C) {
      const P = atkPhase(e);
      const pulse = Math.sin(e.animT * 3) * 1 + (P.ph === 'w' ? P.t * 3 : 0);
      R(ctx, -2, -8, 4, 8, C('#4a3a5a'));
      G.pixCircle(ctx, 0, -12, 8 + Math.round(pulse), C('#7a3aa0'));
      G.pixCircle(ctx, 0, -12, 5 + Math.round(pulse * 0.5), C('#a060d0'));
      for (let i = 0; i < 5; i++) R(ctx, -6 + i * 3, -20 - pulse - (i % 2) * 2, 2, 2, C('#e0b0ff'));
      R(ctx, -2, -12, 4, 3, C('#2a1030'));
      G.addLight(e.cx, e.cy - 6, 50 + pulse * 6, '#b070ff', 0.7);
    },
    knight(ctx, e, C) {
      const l = lean(e);
      legs(ctx, e, C, -10, '#3a4a6a', '#2a3a52');
      R(ctx, -5 + l, -21, 10, 12, C('#4a6a8a'));
      R(ctx, -5 + l, -21, 10, 2, C('#7a9aba'));
      R(ctx, -5 + l, -13, 10, 1, C('#c0a050'));
      R(ctx, -4 + l, -28, 8, 8, C('#5a7a9a'));
      R(ctx, -4 + l, -28, 8, 2, C('#8aaaca'));
      R(ctx, 0 + l, -25, 4, 1, C('#0a1020'));
      eyes(ctx, 1 + l, -25, '#80e0ff', e);
      R(ctx, -2 + l, -32, 2, 4, C('#3a8aa0'));
      R(ctx, -4 + l, -33, 3, 2, C('#3a8aa0'));
      if (!(e.atk && e.atk.phase !== 'w')) {
        R(ctx, 5 + l, -22, 3, 15, C('#3a5a7a'));
        R(ctx, 7 + l, -22, 1, 15, C('#6a8aaa'));
        R(ctx, 5 + l, -16, 3, 3, C('#c0a050'));
      }
      const ang = armAngle(e, 0.9);
      weaponAt(ctx, -1 + l, -19, ang, 14, (c, len) => { R(c, 0, -1, 3, 2, C('#4a3a2a')); R(c, 3, -3, 1, 6, C('#c0a050')); R(c, 4, -1, len, 2, C('#c0d0e0')); R(c, 4, -1, len, 1, C('#ffffff')); });
      trail(ctx, e, -1 + l, -19, 18, '#c0e0ff');
    },
    archer(ctx, e, C) {
      const l = lean(e) * 0.3;
      legs(ctx, e, C, -8, '#3a2a30', '#2a1e22');
      R(ctx, -4 + l, -17, 8, 10, C('#5a3a4a'));
      R(ctx, -4 + l, -24, 8, 8, C('#4a2a3a'));
      R(ctx, -5 + l, -22, 2, 6, C('#4a2a3a'));
      R(ctx, 1 + l, -21, 3, 3, C('#1a1016'));
      eyes(ctx, 2 + l, -20, '#ff6060', e);
      const P = atkPhase(e);
      const pull = P.ph === 'w' ? P.t : 0;
      // bow
      ctx.save();
      ctx.translate(6 + l, -15);
      R(ctx, 0, -8, 1, 16, C('#8a6a4a'));
      R(ctx, -1, -9, 1, 2, C('#8a6a4a'));
      R(ctx, -1, 7, 1, 2, C('#8a6a4a'));
      R(ctx, -Math.round(pull * 5), -7, 1, 14, C('#d8d0c0'));
      if (P.ph === 'w') R(ctx, -Math.round(pull * 5), 0, 10, 1, C('#d8c090'));
      ctx.restore();
    },
    bomber(ctx, e, C) {
      const l = lean(e);
      legs(ctx, e, C, -7, '#3a2a1a', '#2a1e12');
      R(ctx, -5 + l, -16, 10, 10, C('#6a4a2a'));
      R(ctx, -6 + l, -13, 12, 2, C('#4a3020'));
      R(ctx, -3 + l, -22, 7, 7, C('#7a6a5a'));
      R(ctx, -4 + l, -23, 9, 2, C('#2a2a2a'));
      eyes(ctx, 2 + l, -19, '#ffa040', e);
      R(ctx, -8 + l, -15, 4, 6, C('#5a3a1a'));
      const P = atkPhase(e);
      if (P.ph === 'w') {
        const ang = G.lerp(0.8, -2.2, P.t);
        weaponAt(ctx, 0 + l, -14, ang, 7, (c, len) => { R(c, 0, -1, len, 2, C('#7a6a5a')); G.pixCircle(c, len + 2, 0, 3, C('#2a2a30')); R(c, len + 2, -5, 1, 2, '#ffd060'); });
      } else R(ctx, 3 + l, -12, 2, 5, C('#7a6a5a'));
    },
    glowmoth(ctx, e, C) {
      const flap = Math.sin(e.animT * 12);
      const wy = Math.round(flap * 5);
      ctx.globalAlpha *= 0.9;
      R(ctx, -8, -12 - wy, 8, 6, C('#40d0c0'));
      R(ctx, -6, -11 - wy, 4, 3, C('#a0fff0'));
      R(ctx, 0, -12 - wy, 7, 6, C('#40d0c0'));
      ctx.globalAlpha /= 0.9;
      R(ctx, -4, -9, 9, 4, C('#3a3050'));
      R(ctx, 4, -10, 3, 3, C('#3a3050'));
      R(ctx, 6, -12, 1, 2, C('#a0a0c0'));
      eyes(ctx, 5, -9, '#ffffff', e);
      G.addLight(e.cx, e.cy, 70, '#40e0d0', 0.9);
    },
    lurker(ctx, e, C) {
      const l = lean(e);
      legs(ctx, e, C, -6, '#2a1a3a', '#1e1228', 4);
      R(ctx, -7 + l, -16, 14, 10, C('#3a2a4a'));
      R(ctx, -6 + l, -20, 11, 5, C('#4a3a5a'));
      R(ctx, 1 + l, -18, 6, 4, C('#2a1a3a'));
      eyes(ctx, 3 + l, -17, '#d060ff', e);
      R(ctx, 6 + l, -17, 1, 1, '#d060ff');
      const ang = armAngle(e, 1.3);
      weaponAt(ctx, 2 + l, -14, ang, 12, (c, len) => { R(c, 0, -1, len, 2, C('#3a2a4a')); R(c, len, -2, 3, 1, C('#e0d0f0')); R(c, len, 0, 3, 1, C('#e0d0f0')); R(c, len, 2, 2, 1, C('#e0d0f0')); });
      R(ctx, -8 + l, -14, 2, 9, C('#3a2a4a'));
      trail(ctx, e, 2 + l, -14, 14, '#d0a0ff');
    },
    shambler(ctx, e, C) {
      const l = lean(e);
      legs(ctx, e, C, -9, '#4a4a3a', '#3a3a2a', 3);
      R(ctx, -8 + l, -22, 16, 14, C('#6a7a5a'));
      R(ctx, -6 + l, -27, 10, 7, C('#7a8a6a'));
      eyes(ctx, 1 + l, -24, '#e0ff90', e);
      for (const [x, y, c] of [[-8, -26, '#40e0d0'], [-3, -29, '#c070ff'], [3, -28, '#40e0d0'], [-9, -18, '#c070ff']]) { R(ctx, x + l, y, 4, 2, C(c)); R(ctx, x + 1 + l, y + 2, 1, 2, C('#d0d0c0')); }
      const ang = armAngle(e, 1.0);
      weaponAt(ctx, 3 + l, -19, ang, 11, (c, len) => { R(c, 0, -2, len, 4, C('#6a7a5a')); R(c, len - 1, -3, 5, 6, C('#7a8a6a')); });
      trail(ctx, e, 3 + l, -19, 14);
      G.addLight(e.cx, e.y + 2, 50, '#60e0c0', 0.6);
    },
    priest(ctx, e, C) {
      const P = atkPhase(e);
      const raise = P.ph === 'w' ? P.t : P.ph === 'a' ? 1 : 0;
      R(ctx, -5, -18, 10, 18, C('#2a5a5a'));
      R(ctx, -6, -3, 12, 3, C('#1e4444'));
      R(ctx, -1, -18, 2, 16, C('#c0a050'));
      R(ctx, -3, -24, 7, 7, C('#8a9a9a'));
      R(ctx, -3, -33, 7, 9, C('#d0c090'));
      R(ctx, -2, -35, 5, 2, C('#d0c090'));
      R(ctx, 0, -31, 1, 5, C('#a08040'));
      eyes(ctx, 2, -21, '#60ffe0', e);
      const ang = G.lerp(0.9, -1.3, raise);
      weaponAt(ctx, 0, -16, ang, 8, (c, len) => { R(c, 0, -1, len, 1, C('#8a9a9a')); G.pixLine(c, len, 0, len + 2, 6, '#8a8a70'); G.pixCircle(c, len + 2, 8, 2, C('#c0a050')); });
      if (raise > 0) G.addLight(e.cx + e.facing * 8, e.cy, 60 * raise, '#40e0c0', 0.9);
    },
    wraith(ctx, e, C) {
      const P = atkPhase(e);
      const mouth = P.ph === 'w' ? 1 + P.t * 3 : P.ph === 'a' && P.d.type === 'scream' ? 4 : 1;
      const wob = Math.sin(e.animT * 4);
      ctx.globalAlpha *= 0.8;
      R(ctx, -5, -18, 10, 12, C('#b0c0e0'));
      for (let i = 0; i < 5; i++) R(ctx, -5 + i * 2, -6, 2, 3 + ((i + Math.floor(e.animT * 6)) % 3), C('#8090b0'));
      R(ctx, -4, -24, 8, 7, C('#d0d8f0'));
      R(ctx, -6, -14 + wob, 2, 6, C('#b0c0e0'));
      R(ctx, 5, -15 - wob, 2, 6, C('#b0c0e0'));
      ctx.globalAlpha /= 0.8;
      R(ctx, -2, -22, 2, 2, C('#101020'));
      R(ctx, 2, -22, 2, 2, C('#101020'));
      R(ctx, 0, -19, 2, Math.round(mouth), C('#101020'));
      G.addLight(e.cx, e.cy, 50, '#b0c0ff', 0.6);
    },
    penitent(ctx, e, C) {
      const l = lean(e);
      legs(ctx, e, C, -10, '#3a2a2a', '#2a1e1e', 4);
      R(ctx, -9 + l, -26, 18, 17, C('#4a2a2a'));
      R(ctx, -7 + l, -32, 13, 8, C('#3a2020'));
      R(ctx, -9 + l, -30, 3, 10, C('#3a2020'));
      R(ctx, 1 + l, -29, 4, 2, C('#0a0505'));
      eyes(ctx, 2 + l, -29, '#ff4040', e);
      R(ctx, -9 + l, -18, 18, 2, C('#6a4a3a'));
      const P = atkPhase(e);
      let ang = armAngle(e, 1.2);
      if (P.ph === 'a' && P.d.type === 'spin') ang = e.animT * 15;
      const bx = Math.cos(ang) * 26, by = -20 + Math.sin(ang) * 26;
      G.pixLine(ctx, 4 + l, -20, bx + l, by, C('#7a7a80'));
      G.pixCircle(ctx, bx + l, by, 5, C('#5a5a64'));
      R(ctx, bx + l - 1, by - 7, 2, 2, C('#c0c0c8'));
      R(ctx, bx + l + 5, by - 1, 2, 2, C('#c0c0c8'));
      R(ctx, bx + l - 7, by - 1, 2, 2, C('#c0c0c8'));
      R(ctx, bx + l - 1, by + 5, 2, 2, C('#c0c0c8'));
    },
    bonewalker(ctx, e, C) {
      const l = lean(e);
      const P = atkPhase(e);
      legs(ctx, e, C, -8, '#d8cfb8', '#b8af98', 3);
      R(ctx, -3 + l, -17, 6, 1, C('#d8cfb8'));
      R(ctx, -3 + l, -14, 6, 1, C('#d8cfb8'));
      R(ctx, -3 + l, -11, 6, 1, C('#d8cfb8'));
      R(ctx, 0 + l, -18, 1, 10, C('#d8cfb8'));
      R(ctx, -3 + l, -9, 7, 2, C('#b8af98'));
      R(ctx, -3 + l, -25, 7, 7, C('#e8dfc8'));
      R(ctx, -2 + l, -19, 5, 2, C('#d8cfb8'));
      R(ctx, 0 + l, -23, 2, 2, C('#101010'));
      R(ctx, 3 + l, -23, 2, 2, C('#101010'));
      eyes(ctx, 1 + l, -22, '#90ffb0', e);
      const ang = armAngle(e, 0.9);
      weaponAt(ctx, 1 + l, -16, ang, 12, (c, len) => { R(c, 0, -1, 2, 2, C('#5a4030')); R(c, 2, -2, 1, 4, C('#8a7a5a')); R(c, 3, -1, len, 2, C('#8a8a80')); });
      trail(ctx, e, 1 + l, -16, 15, '#90ffb0');
    },
    digger(ctx, e, C) {
      const l = lean(e);
      legs(ctx, e, C, -9, '#3a3020', '#2a2218', 3);
      R(ctx, -7 + l, -21, 13, 13, C('#5a4a3a'));
      R(ctx, -8 + l, -24, 10, 6, C('#4a3a2a'));
      R(ctx, 0 + l, -25, 7, 7, C('#8a8070'));
      R(ctx, -1 + l, -27, 9, 2, C('#3a3020'));
      eyes(ctx, 4 + l, -22, '#ffd060', e);
      R(ctx, -9 + l, -14, 3, 5, C('#c0a050'));
      G.addLight(e.cx - e.facing * 9, e.bottom - 12, 50, '#ffc060', 0.8);
      const ang = armAngle(e, 1.0);
      weaponAt(ctx, 2 + l, -18, ang, 16, (c, len) => { R(c, 0, -1, len, 2, C('#6a5038')); R(c, len, -3, 5, 6, C('#8a8a90')); R(c, len + 4, -3, 1, 6, C('#c0c0c8')); });
      trail(ctx, e, 2 + l, -18, 20);
    },
    skull(ctx, e, C) {
      const b = Math.sin(e.animT * 6);
      R(ctx, -4, -9 + b, 8, 7, C('#e8dfc8'));
      R(ctx, -3, -2 + b, 6, 2, C('#d8cfb8'));
      R(ctx, -2, -7 + b, 2, 2, C('#101010'));
      R(ctx, 2, -7 + b, 2, 2, C('#101010'));
      R(ctx, 2, -6 + b, 1, 1, '#90ffb0');
      const f = Math.sin(e.animT * 14) * 0.5 + 0.5;
      R(ctx, -6, -8 + b, 2, 3 + f * 2, C('#60ff90'));
      R(ctx, -8, -7 + b, 2, 2, C('#a0ffc0'));
      G.addLight(e.cx, e.cy, 36, '#60ff90', 0.6);
    },
    guard(ctx, e, C) {
      const l = lean(e);
      legs(ctx, e, C, -11, '#8a7030', '#6a5420');
      R(ctx, -6 + l, -23, 12, 13, C('#c0a050'));
      R(ctx, -6 + l, -23, 12, 2, C('#f0d080'));
      R(ctx, -6 + l, -14, 12, 1, C('#6a2020'));
      R(ctx, -4 + l, -30, 9, 8, C('#b09040'));
      R(ctx, 0 + l, -27, 5, 1, C('#1a1008'));
      eyes(ctx, 1 + l, -27, '#ffb040', e);
      R(ctx, -2 + l, -35, 4, 5, C('#ffd070'));
      R(ctx, -1 + l, -34, 2, 3, '#fff0c0');
      G.addLight(e.cx, e.y + 2, 70, '#ffc060', 1);
      if (!(e.atk && e.atk.phase !== 'w')) {
        R(ctx, 6 + l, -24, 3, 16, C('#9a7a30'));
        R(ctx, 8 + l, -24, 1, 16, C('#f0d080'));
      }
      const ang = armAngle(e, 0.9);
      weaponAt(ctx, -1 + l, -21, ang, 16, (c, len) => { R(c, 0, -1, 3, 2, C('#4a3a2a')); R(c, 3, -3, 1, 6, C('#ffd070')); R(c, 4, -1, len, 2, C('#ff9040')); R(c, 4, -1, len, 1, C('#ffe0a0')); });
      trail(ctx, e, -1 + l, -21, 20, '#ff9040');
    },
    sentinel(ctx, e, C) {
      const fl = Math.sin(e.animT * 3) * 2;
      ctx.translate(0, -4 + fl);
      R(ctx, -5, -22, 10, 12, C('#c0a040'));
      R(ctx, -5, -22, 10, 2, C('#f0d880'));
      R(ctx, -3, -10, 6, 4, C('#9a8030'));
      R(ctx, -4, -30, 8, 8, C('#d0b050'));
      R(ctx, 0, -27, 4, 1, C('#1a1008'));
      R(ctx, -1, -17, 3, 3, '#fff0a0');
      G.addLight(e.cx, e.cy - 4, 50, '#ffe080', 0.8);
      eyes(ctx, 1, -27, '#ffffff', e);
      for (let i = 0; i < 3; i++) R(ctx, -3 + i * 3, -4 + ((i + Math.floor(e.animT * 8)) % 2), 1, 2, C('#ffe080'));
      const ang = armAngle(e, 0.6);
      weaponAt(ctx, 0, -19, ang, 16, (c, len) => { R(c, 0, -1, 3, 2, C('#6a5020')); R(c, 3, -1, len, 2, C('#fff0c0')); R(c, 3, -1, len, 1, '#ffffff'); });
      trail(ctx, e, 0, -19, 20, '#ffe080');
    },
    stormcaller(ctx, e, C) {
      const P = atkPhase(e);
      const raise = P.ph === 'w' || P.ph === 'a' ? 1 : 0;
      R(ctx, -5, -18, 10, 18, C('#2a2a4a'));
      R(ctx, -6, -3, 12, 3, C('#1e1e3a'));
      R(ctx, -4, -26, 8, 9, C('#3a3a5a'));
      R(ctx, 0, -23, 3, 3, C('#0a0a14'));
      eyes(ctx, 1, -22, '#a0c0ff', e);
      const ang = raise ? -1.4 : 0.3;
      weaponAt(ctx, 1, -16, ang, 18, (c, len) => { R(c, -4, -1, len, 2, C('#5a4a6a')); R(c, len - 4, -3, 4, 5, C('#a0c0ff')); });
      if (raise || Math.random() < 0.05) G.fx.spawn({ x: e.cx + e.facing * 4, y: e.y - 8, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.15, color: '#c0d8ff', size: 1, add: true });
      G.addLight(e.cx, e.y, 40 + raise * 40, '#a0c0ff', 0.8);
    },
  };
  G.ENEMY_DRAW = DRAW;
})();
