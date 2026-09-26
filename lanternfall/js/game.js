'use strict';
// ============================================================================
// Game: states, runs, level flow, saving, main loop, title/intro/ending
// ============================================================================
(function () {
  const G = window.G;
  const W = G.W, H = G.H;

  // ---------------------------------------------------------------- save
  function defaultSave() {
    return {
      v: 1, unlocked: {}, bpFound: {}, invest: {}, upgrades: {}, mutUnlocked: {}, runes: {}, hasMap: false,
      lore: {}, pearls: {}, flags: {}, visited: {}, bestiary: {},
      stats: { runs: 0, deaths: 0, kills: 0, bestTime: 0, bossKills: {}, deepest: 1 },
      victories: 0, trueEndings: 0, goldReserve: 0, run: null,
    };
  }
  G.save = Object.assign(defaultSave(), G.store.get('save', {}));
  for (const k of ['unlocked', 'bpFound', 'invest', 'upgrades', 'mutUnlocked', 'runes', 'lore', 'pearls', 'flags', 'visited', 'bestiary']) G.save[k] = G.save[k] || {};
  G.save.stats = Object.assign(defaultSave().stats, G.save.stats || {});
  G.settings = Object.assign({ music: 0.7, sfx: 0.8, shake: 1 }, G.store.get('settings', {}));
  G.hasUpgrade = (id) => !!G.save.upgrades[id];

  const freshStats = () => ({ kills: 0, embers: 0, embersSpent: 0, damageTaken: 0, damageDealt: 0, parries: 0, chests: 0, secrets: 0, puzzles: 0, scrolls: 0, goldSpent: 0, biomes: 0 });

  const game = (G.game = {
    state: 'boot',
    stats: freshStats(),
    runTime: 0,
    puzzleState: {},
    goldFlash: 0,
    emberFlash: 0,
    prompt: null,
    nearItem: null,
    player: null,
    bg: null,
    darkPhase: false,
    bossDefeated: false,
    nextBiome: null,
    titleT: 0,
    cutscene: null,

    canControl() {
      return this.state === 'play' && !G.ui.modal && !this.cutscene && G.fade.a < 0.95;
    },
    notify(t) { G.ui.notify(t); },
    // one-time contextual tips, remembered across runs
    hint(id, text) {
      G.save.flags.hints = G.save.flags.hints || {};
      if (G.save.flags.hints[id]) return;
      G.save.flags.hints[id] = true;
      G.ui.notes.unshift({ text: '[#8ad0ff]TIP:[] ' + text, t: 7 });
      if (G.ui.notes.length > 4) G.ui.notes.pop();
    },
    banner(t, s, c, d) { G.ui.banner(t, s, c, d); },
    say(lines, cb) { G.ui.open('dialogue', { lines, cb }); },
    saveMeta() { G.store.set('save', G.save); },
    saveSettings() { G.store.set('settings', G.settings); },

    // ------------------------------------------------------------ runs
    newRun() {
      G.save.stats.runs++;
      G.save.run = null;
      const p = (this.player = new G.Player());
      p.gold = G.save.goldReserve || 0;
      G.save.goldReserve = 0;
      p.recalc();
      p.flask = p.flaskMax;
      p.hp = p.maxHp;
      this.runTime = 0;
      this.stats = freshStats();
      this.path = [];
      this.saveMeta();
      this.state = 'play';
      this.loadBiome('undercroft');
    },
    continueRun() {
      const r = G.save.run;
      if (!r) return this.newRun();
      const p = (this.player = new G.Player());
      Object.assign(p, r.player);
      p.recalc();
      this.runTime = r.runTime;
      this.stats = Object.assign(freshStats(), r.stats || {});
      this.path = r.path || [];
      this.state = 'play';
      this.loadPassage(r.next);
    },
    saveRun(next) {
      const p = this.player;
      const strip = (it) => (it ? { id: it.id, tier: it.tier, q: it.q, affixes: it.affixes, uid: it.uid } : null);
      G.save.run = {
        next, runTime: this.runTime, stats: this.stats, path: this.path,
        player: { hp: p.hp, baseHp: p.baseHp, weapons: p.weapons.map(strip), skills: p.skills.map(strip), stats: Object.assign({}, p.stats), scrolls: p.scrolls, muts: p.muts.slice(), gold: p.gold, embers: p.embers, curse: p.curse, flask: p.flask },
      };
      this.saveMeta();
    },
    abandonRun() {
      G.save.run = null;
      if (this.player) this.player.embers = 0;
      this.saveMeta();
      G.Audio.play('death');
      this.newRun();
    },
    toTitle() {
      this.state = 'title';
      this.titleT = 0;
      G.fx.clear();
      G.fade.a = 1;
      G.fadeTo(0, 1.5);
      G.Audio.playMusic('title');
      G.ui.closeAll();
      initTitle();
    },

    // ------------------------------------------------------------ level loading
    transition(fn) {
      if (this.transitioning) return;
      this.transitioning = true;
      G.Audio.play('transition');
      G.fadeTo(1, 3, () => {
        try { fn(); } catch (e) { console.error(e); }
        this.transitioning = false;
        G.fadeTo(0, 2);
      });
    },
    loadBiome(id) {
      const B = G.BIOMES[id];
      const doLoad = () => {
        const seed = (Math.random() * 1e9) | 0;
        let L;
        if (B.boss) L = G.buildBossLevel(id);
        else L = G.genBiomeLevel(id, seed);
        this.path.push(id);
        this.setupWorld(L, seed);
        this.stats.biomes++;
        G.save.stats.deepest = Math.max(G.save.stats.deepest || 1, B.tier);
        if (!B.boss) this.banner(B.name.toUpperCase(), B.sub + '  •  Tier ' + G.roman(B.tier), '#ffd080', 4);
        else this.banner(B.name.toUpperCase(), B.sub, '#ff9070', 3.5);
        if (B.music) G.Audio.playMusic(B.music);
        else G.Audio.playMusic('silence');
        if (id === 'undercroft') this.tutorialT = G.save.stats.runs <= 2 ? 30 : 0;
      };
      if (this.state === 'play' && G.world.level) this.transition(doLoad);
      else { G.fade.a = 1; doLoad(); G.fadeTo(0, 1.5); }
    },
    loadPassage(next) {
      const doLoad = () => {
        const L = G.buildPassage(next);
        this.nextBiome = next;
        this.setupWorld(L, 7);
        this.saveRun(next);
        G.Audio.playMusic('passage');
        this.banner('PASSAGE', 'Next: ' + G.BIOMES[next].name, '#ffb060', 3);
        this.player.deathsDoorUsed = false;
      };
      if (this.state === 'play' && G.world.level) this.transition(doLoad);
      else { G.fade.a = 1; doLoad(); G.fadeTo(0, 1.5); }
    },
    setupWorld(L, seed) {
      G.world.reset(L);
      G.ui.closeAll();
      this.bossDefeated = false;
      this.darkPhase = false;
      this.puzzleState = {};
      this.cutscene = null;
      this.prompt = null;
      this.nearItem = null;
      const p = this.player;
      p.dead = false;
      p.state = 'normal';
      p.atk = null;
      p.vx = p.vy = 0;
      p.invuln = 1;
      p.healLeft = 0;
      p.st = {};
      p.chakramOut = [false, false];
      let startX = 60, startY = 200;
      for (const sp of L.spawns) {
        const e = this.spawn(sp);
        if (sp.type === 'playerStart') { startX = sp.x; startY = sp.y; }
      }
      p.setFeet(startX, startY);
      p.facing = 1;
      p.resetScarf();
      G.world.player = p;
      G.world.add(p);
      G.cam.bounds = { x: 0, y: 0, w: L.pw, h: L.ph };
      G.cam.snapTo(p.cx, p.cy - 20);
      this.bg = G.buildBackground(L.style, seed || 1);
      if (L.biome.id !== 'passage') G.save.visited[L.biomeId] = true;
      this.revealAround(true);
      this.saveMeta();
    },
    spawn(sp) {
      const Wd = G.world;
      switch (sp.type) {
        case 'playerStart': return null;
        case 'exit': return Wd.add(new G.Exit(sp.x, sp.y, sp));
        case 'enemy': return Wd.add(new G.Enemy(sp.id, sp.x, sp.y, { elite: sp.elite, guardian: sp.guardian }));
        case 'chest': return Wd.add(new G.Chest(sp.x, sp.y, sp));
        case 'scroll': return Wd.add(new G.ScrollAltar(sp.x, sp.y, sp));
        case 'merchant': return Wd.add(new G.Merchant(sp.x, sp.y));
        case 'shopItem': return Wd.add(new G.ShopItem(sp.x, sp.y, sp));
        case 'lore': return sp.id ? Wd.add(new G.LoreTablet(sp.x, sp.y, sp.id)) : null;
        case 'mara': return Wd.add(new G.Mara(sp.x, sp.y, sp.first));
        case 'breakable': return Wd.add(new G.Breakable(sp.x, sp.y, sp.v));
        case 'food': return Wd.add(new G.FoodDrop(sp.x, sp.y, Wd.level.tier));
        case 'gold': {
          const n = 3 + Math.floor(Math.random() * 4);
          for (let i = 0; i < n; i++) { const c = Wd.add(new G.Coin(sp.x + (i - n / 2) * 4, sp.y - 4, Math.round((2 + (Wd.level.tier || 1) * 2) * (0.6 + Math.random())), 'gold')); c.vx = 0; c.vy = 0; c.age = 0.5; }
          return null;
        }
        case 'seed': return Wd.add(new G.Seed(sp.x, sp.y, sp));
        case 'hint': return Wd.add(new G.Hint(sp.x, sp.y, sp));
        case 'gate': return Wd.add(new G.Gate(sp.x, sp.y, (sp.h || 4) * 16, sp));
        case 'vaultReward': return Wd.add(new G.VaultReward(sp.x, sp.y, sp));
        case 'brazier': return Wd.add(new G.Brazier(sp.x, sp.y, sp));
        case 'mural': return Wd.add(new G.Mural(sp.x, sp.y, sp));
        case 'lever': return Wd.add(new G.Lever(sp.x, sp.y, sp));
        case 'bell': return Wd.add(new G.Bell(sp.x, sp.y, sp));
        case 'songstone': return Wd.add(new G.SongStone(sp.x, sp.y, sp));
        case 'plate': return Wd.add(new G.Plate(sp.x, sp.y, sp));
        case 'crate': return Wd.add(new G.Crate(sp.x, sp.y, sp));
        case 'startGear': G.spawnStartGear(sp.x, sp.y); return null;
        case 'keeper': return Wd.add(new G.Keeper(sp.x, sp.y));
        case 'fountain': return Wd.add(new G.Fountain(sp.x, sp.y));
        case 'mutationAltar': return Wd.add(new G.MutationAltar(sp.x, sp.y));
        case 'mapTable': return Wd.add(new G.MapTable(sp.x, sp.y));
        case 'salvage': return Wd.add(new G.Salvage(sp.x, sp.y));
        case 'boss': { const b = G.makeBoss(sp.id, sp.x, sp.y); Wd.boss = b; return Wd.add(b); }
        case 'lantern': return Wd.add(new G.LanternObj(sp.x, sp.y));
      }
      return null;
    },
    currentBiomeForMap() {
      const L = G.world.level;
      if (!L) return 'undercroft';
      if (L.biomeId === 'passage') return this.nextBiome;
      return L.biomeId;
    },
    revealAround(force) {
      const L = G.world.level;
      const p = this.player;
      if (!L || !p) return;
      for (let i = 0; i < L.cells.length; i++) {
        const c = L.cells[i];
        if (L.revealed[i]) continue;
        if (p.cx >= c.x && p.cx < c.x + c.w && p.cy >= c.y && p.cy < c.y + c.h) { L.revealed[i] = 1; L.mapDirty = true; }
      }
    },
    takeExit(ex) {
      const L = G.world.level;
      if (L.biomeId === 'passage') return this.loadBiome(ex.to);
      if (!ex.to) return;
      this.loadPassage(ex.to);
    },

    // ------------------------------------------------------------ items
    pickupItem(drop) {
      const p = this.player;
      const d = G.ITEMS[drop.inst.id];
      const slots = d.kind === 'skill' ? p.skills : p.weapons;
      if (!slots[0]) return this.equipFromDrop(drop, 0);
      if (!slots[1]) return this.equipFromDrop(drop, 1);
      G.ui.open('swap', { drop });
    },
    equipFromDrop(drop, slot) {
      const p = this.player;
      const d = G.ITEMS[drop.inst.id];
      const isSkill = d.kind === 'skill';
      const slots = isSkill ? p.skills : p.weapons;
      const old = slots[slot];
      slots[slot] = drop.inst;
      if (isSkill) { p.cds[slot] = Math.min(p.cds[slot], 1); }
      else { p.ammo[slot] = 0; p.reload[slot] = 0; p.chakramOut[slot] = false; if (p.atk && p.atk.slot === slot) p.cancelAtk(); p.lastAtk = null; }
      if (old) { drop.inst = old; drop.age = 0; }
      else G.world.kill(drop);
      G.Audio.play('pickup');
      this.notify('Equipped ' + '[q' + drop.inst.q + ']' + G.itemName(slots[slot]) + '[]');
      const K = (a) => '[#ffd080]' + G.Input.keyName(a) + '[]';
      const key = isSkill ? K(slot ? 'skill2' : 'skill1') : K(slot ? 'attack2' : 'attack1');
      if (d.kind === 'shield') setTimeout(() => this.hint('shield', 'Hold ' + key + ' to block. Raise the shield just before a blow lands to PARRY and stun the attacker.'), 600);
      else if (d.kind === 'ranged') setTimeout(() => this.hint('ranged', 'Press ' + key + ' to fire. Shots aim at the nearest enemy in front of you.'), 600);
      else if (isSkill) setTimeout(() => this.hint('skill', 'Skills use ' + K('skill1') + ' / ' + K('skill2') + ' and recharge over time.'), 600);
      else setTimeout(() => this.hint('melee', 'Press ' + key + ' repeatedly for a combo. Items scale with the color of their scroll stat.'), 600);
      if (!G.save.flags.firstItem) G.save.flags.firstItem = true;
    },
    foundBlueprint(id) {
      if (G.save.bpFound[id]) return;
      G.save.bpFound[id] = true;
      G.Audio.play('blueprint');
      setTimeout(() => this.hint('blueprint', 'Blueprints are kept forever. Bring embers to the Keeper between biomes to add the item to the isle.'), 1500);
      this.notify('[q2]Blueprint found:[] ' + G.ITEMS[id].name + '  [gray](unlock it with the Keeper)[]');
      this.saveMeta();
    },
    grantRune(r) {
      if (G.save.runes[r]) return false;
      G.save.runes[r] = true;
      this.saveMeta();
      G.Audio.play('rune');
      G.JINGLES.rune();
      const R = G.RUNES[r];
      this.banner(R.name.toUpperCase(), R.desc, R.color, 6);
      G.fx.burst(this.player.cx, this.player.cy, 60, { color: [R.color, '#ffffff'], speed: 200, life: 1.2, size: 2, add: true });
      return true;
    },

    // ------------------------------------------------------------ bosses
    startBossIntro(boss) {
      if (boss.state !== 'idle') return;
      boss.state = 'intro';
      const L = G.world.level;
      const ar = L.arena;
      const gh = (x) => {
        let y = ar.floor;
        const tx = Math.floor(x / 16);
        for (let k = 1; k < 30; k++) { if (L.isSolid(tx, Math.floor((ar.floor - 1 - k * 16) / 16))) { return k * 16; } }
        return 96;
      };
      const g1 = G.world.add(new G.Gate(ar.gateL - 8, ar.floor, gh(ar.gateL - 8), { kind: 'boss' }));
      const g2 = G.world.add(new G.Gate(ar.gateR + 8, ar.floor, gh(ar.gateR + 8), { kind: 'boss' }));
      g1.openAmt = g2.openAmt = 1;
      g1.isOpen = g2.isOpen = true;
      g1.setOpen(false);
      g2.setOpen(false);
      this.bossGates = [g1, g2];
      const p = this.player;
      p.state = 'cutscene';
      p.autoWalk = 0;
      p.atk = null;
      this.cutscene = { t: 0, focus: boss };
      G.Audio.playMusic('silence', 0.5);
      G.Audio.play('bossRoar');
      G.shake(0.5);
      G.setTimeoutWorld(0.8, () => this.banner(boss.name, boss.title, '#ff9070', 3.5));
      G.setTimeoutWorld(2.6, () => {
        const lines = G.DIALOGUE[boss.def.intro];
        const go = () => {
          this.cutscene = null;
          p.state = 'normal';
          boss.state = 'fight';
          G.Audio.playMusic(boss.def.music, 0.3);
        };
        if (lines) this.say(lines, go);
        else go();
      });
    },
    onBossDefeated(boss) {
      this.bossDefeated = true;
      G.save.stats.bossKills[boss.id] = (G.save.stats.bossKills[boss.id] || 0) + 1;
      const L = G.world.level;
      const tier = L.tier;
      G.spawnGold(boss.cx, boss.cy, 150 + tier * 80);
      G.spawnEmbers(boss.cx, boss.cy, 30 + tier * 10);
      // boss blueprint
      for (const id in G.ITEMS) {
        const d = G.ITEMS[id];
        if (d.bp && d.bp.from === 'boss:' + boss.id && !G.save.bpFound[id] && !G.save.unlocked[id]) G.world.add(new G.BlueprintDrop(boss.cx, boss.cy, id));
      }
      if (boss.id === 'bellwarden') this.grantRune('ram');
      if (boss.id !== 'oris') {
        // two reward items
        for (let i = 0; i < 2; i++) {
          const it = G.makeItem(G.rng.pick(G.itemPool()), tier, G.rng, { bonus: 0.7 });
          G.world.add(new G.ItemDrop(boss.cx + (i ? 30 : -30), L.arena.floor, it, { pop: true }));
        }
        for (const g of this.bossGates || []) g.setOpen(true);
        // real exits
        const B = G.BIOMES[L.biomeId];
        const ex = G.world.ents.find((e) => e instanceof G.Exit && e.o.bossExit);
        if (ex) {
          G.world.kill(ex);
          const exits = B.exits;
          exits.forEach((e, i) => {
            const x = ex.cx + (i - (exits.length - 1) / 2) * 60;
            if (e.rune && !G.save.runes[e.rune]) {
              const locked = G.world.add(new G.Exit(x, ex.bottom, { to: e.to }));
              locked.lockedRune = e.rune;
              locked.prompt = () => '[red]Sealed[] (' + G.RUNES[e.rune].short + ' needed)';
              locked.interact = () => this.notify('This way is sealed. You need the [' + G.RUNES[e.rune].color + ']' + G.RUNES[e.rune].name + '[].');
            } else G.world.add(new G.Exit(x, ex.bottom, { to: e.to }));
            if (i > 0) L.decos.push({ type: 'archway', x, y: ex.bottom });
          });
          L.chunks.clear();
        }
        this.banner('VICTORY', boss.name + ' has fallen', '#ffd080', 4);
        G.JINGLES.victory();
        setTimeout(() => G.Audio.playMusic('passage'), 3500);
      } else {
        // final boss: dialogue, then the Lantern
        const pearls = Object.keys(G.save.pearls).length >= 4;
        this.darkPhase = false;
        G.setTimeoutWorld(1.2, () => this.say(pearls ? G.DIALOGUE.orisTrue : G.DIALOGUE.orisDefeat, () => {
          this.notify('[orange]The Lantern waits. Relight it.[]');
          this.trueEnding = pearls;
        }));
      }
      this.saveMeta();
    },
    onGuardianDefeated(e) {
      const r = e.guardian;
      if (!this.grantRune(r)) {
        const it = G.makeItem(G.rng.pick(G.itemPool()), G.world.level.tier, G.rng, { bonus: 0.6 });
        G.world.add(new G.ItemDrop(e.cx, e.bottom, it, { pop: true }));
      }
      G.spawnEmbers(e.cx, e.cy, 12);
      if (!G.save.bpFound.drowned_blades && !G.save.unlocked.drowned_blades) G.world.add(new G.BlueprintDrop(e.cx, e.cy, 'drowned_blades'));
    },
    relightLantern() {
      const L = G.world.level;
      L.lanternLit = true;
      G.Audio.play('wick');
      G.Audio.play('rune');
      G.screenFlash('#fff0c0', 1.5, 0.9);
      G.shake(0.6);
      G.save.victories = (G.save.victories || 0) + 1;
      if (this.trueEnding) G.save.trueEndings = (G.save.trueEndings || 0) + 1;
      if (!G.save.stats.bestTime || this.runTime < G.save.stats.bestTime) G.save.stats.bestTime = this.runTime;
      G.save.run = null;
      this.saveMeta();
      this.player.state = 'cutscene';
      this.cutscene = { t: 0, focus: { cx: L.arena.x1 + 100, cy: L.arena.floor - 60 } };
      G.Audio.playMusic('ending', 2);
      setTimeout(() => {
        G.fadeTo(1, 0.6, () => {
          this.state = 'ending';
          this.endT = 0;
          this.endSlides = this.trueEnding ? G.TRUE_ENDING_TEXT : G.ENDING_TEXT;
          this.endIdx = 0;
          G.fadeTo(0, 0.8);
        });
      }, 5000);
    },

    // ------------------------------------------------------------ death
    onPlayerDeath(h) {
      if (this.deathT !== undefined && this.state === 'dying') return;
      const p = this.player;
      this.state = 'dying';
      this.deathT = 0;
      G.slowMo(1.2, 0.3);
      G.Audio.play('death');
      G.Audio.stopMusic(1.5);
      G.fx.burst(p.cx, p.y, 30, { color: p.flameColors(), speed: 120, life: 1.2, size: 2, add: true, vy: -60 });
      G.save.stats.deaths++;
      const reserve = G.hasUpgrade('reserve3') ? 0.5 : G.hasUpgrade('reserve2') ? 0.3 : G.hasUpgrade('reserve1') ? 0.15 : 0;
      this.deathInfo = {
        biome: G.world.level.biome.name,
        cause: h && h.src && h.src.name ? h.src.name : h && h.kind === 'hazard' ? 'the isle itself' : h && h.kind === 'dot' ? 'lingering wounds' : 'the Drowned',
        embersLost: p.embers,
        goldKept: Math.floor(p.gold * reserve),
        time: this.runTime,
      };
      G.save.goldReserve = this.deathInfo.goldKept;
      G.save.run = null;
      this.saveMeta();
    },
  });

  // ================================================================ update / render
  let titleBg = null, titleSel = 0, titleRects = [];
  function initTitle() {
    titleBg = G.buildBackground({
      sky: { top: '#050814', bottom: '#1c2a40', celestial: 'moon', stars: true, storm: true },
      layers: [
        { kind: 'sea', color: '#0e1e30', factor: 0.02 },
        { kind: 'lighthouse', color: '#0a1220', factor: 0.03, dist: 1 },
        { kind: 'clouds', color: '#1a2438', factor: 0.06 },
      ],
    }, 99);
    titleSel = 0;
  }
  function titleItems() {
    const items = [];
    if (G.save.run) items.push('Continue');
    items.push('New Run', 'Codex', 'Settings', 'Controls', 'Credits');
    return items;
  }

  game.update = function (dt) {
    G.Input.poll();
    G.time += dt;
    G.updateFade(dt);
    G.Audio && G.Audio.ready;
    if (this.goldFlash > 0) this.goldFlash -= dt;
    if (this.emberFlash > 0) this.emberFlash -= dt;
    const In = G.Input;
    switch (this.state) {
      case 'boot':
        if (In.anyPressed) { G.Audio.unlock(); game.toTitle(); }
        break;
      case 'title': {
        this.titleT += dt;
        G.fx.update(dt);
        if (G.ui.modal) { G.ui.update(dt); break; }
        const items = titleItems();
        G.ui.menuNav({ get sel() { return titleSel; }, set sel(v) { titleSel = v; } }, items.length, { rects: titleRects });
        if (G.ui.confirmPressed() && this.titleT > 0.4 && G.fade.a < 0.5) {
          const it = items[titleSel];
          G.Audio.play('uiSelect');
          if (it === 'Continue') G.fadeTo(1, 2, () => this.continueRun());
          else if (it === 'New Run') {
            const go = () => {
              if (!G.save.flags.introSeen) { this.state = 'intro'; this.introT = 0; this.introIdx = 0; G.fade.a = 1; G.fadeTo(0, 1); G.Audio.playMusic('title'); }
              else this.newRun();
            };
            if (G.save.run) G.ui.confirm('Start a new run? Your saved run will be lost.', (y) => { if (y) G.fadeTo(1, 2, go); });
            else G.fadeTo(1, 2, go);
          } else if (it === 'Codex') G.ui.open('codex');
          else if (it === 'Settings') G.ui.open('settings');
          else if (it === 'Controls') G.ui.open('controls');
          else if (it === 'Credits') { this.state = 'credits'; this.creditT = 0; }
        }
        break;
      }
      case 'intro': {
        this.introT += dt;
        G.fx.update(dt);
        if (Math.random() < 0.3) G.fx.spawn({ x: W / 2 + (Math.random() - 0.5) * 40, y: H - 60, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 30, life: 2, color: '#ff9a3c', size: 1, add: true });
        const slideT = 5.5;
        if (In.pressed.confirm || In.pressed.jump) { this.introT = Math.ceil(this.introT / slideT) * slideT + 0.01; }
        if (In.pressed.cancel) this.introT = 999;
        this.introIdx = Math.floor(this.introT / slideT);
        if (this.introIdx >= G.INTRO_TEXT.length && !this.introDone) {
          this.introDone = true;
          G.save.flags.introSeen = true;
          this.saveMeta();
          G.fadeTo(1, 1.5, () => { this.introDone = false; this.newRun(); });
        }
        break;
      }
      case 'play':
      case 'dying':
        this.updatePlay(dt);
        break;
      case 'ending': {
        this.endT += dt;
        G.fx.update(dt);
        if (Math.random() < 0.4) G.fx.spawn({ x: Math.random() * W, y: H + 5, vy: -20 - Math.random() * 30, life: 8, color: '#ffd070', size: 1, add: true });
        const slideT = 7;
        if (In.pressed.confirm) this.endT = Math.ceil(this.endT / slideT) * slideT + 0.01;
        this.endIdx = Math.floor(this.endT / slideT);
        if (this.endIdx >= this.endSlides.length && !this.endDone) {
          this.endDone = true;
          G.fadeTo(1, 0.8, () => { this.endDone = false; this.state = 'credits'; this.creditT = 0; G.fadeTo(0, 1); });
        }
        break;
      }
      case 'credits':
        this.creditT += dt;
        G.fx.update(dt);
        if ((In.pressed.confirm || In.pressed.cancel) && this.creditT > 1) this.toTitle();
        break;
      case 'death':
        this.deathT += dt;
        if (In.pressed.confirm && this.deathT > 1.2) { G.fadeTo(1, 2, () => this.newRun()); }
        if (In.pressed.cancel && this.deathT > 1.2) this.toTitle();
        break;
    }
    if (this.state !== 'title' && this.state !== 'play' && this.state !== 'dying') G.ui.update(dt);
  };

  game.updatePlay = function (dt) {
    const In = G.Input;
    const p = this.player;
    if (G.ui.modal) { G.ui.update(dt); return; }
    G.ui.update(dt);
    if (this.state === 'play' && !this.cutscene && G.fade.a < 0.5) {
      if (In.pressed.pause) { G.ui.open('pause'); return; }
      if (In.pressed.map) { G.ui.open('map'); return; }
    }
    // hitstop
    if (G.hitstop > 0) { G.hitstop--; G.cam.update(dt); return; }
    let sdt = dt;
    if (G.slowmo.t > 0) { G.slowmo.t -= dt; sdt = dt * G.slowmo.scale; }
    G.world.update(sdt);
    G.fx.update(sdt, G.world.level);
    if (this.state === 'play' && !this.cutscene) this.runTime += dt;
    if (this.tutorialT > 0) this.tutorialT -= dt;
    // camera
    if (this.cutscene && this.cutscene.focus) {
      this.cutscene.t += dt;
      const f = this.cutscene.focus;
      G.cam.x = G.lerp(G.cam.x, f.cx - W / 2, 1 - Math.pow(0.02, dt));
      G.cam.y = G.lerp(G.cam.y, f.cy - H / 2 - 20, 1 - Math.pow(0.02, dt));
      G.cam.clampBounds();
    } else G.cam.follow(p.cx, p.cy, dt, p.facing);
    G.cam.update(dt);
    G.Ambient.update(dt, G.world.level.style.particles, G.cam);
    this.revealAround();
    // interaction
    this.prompt = null;
    this.nearItem = null;
    if (this.state === 'play' && p.state !== 'dead' && !this.cutscene) {
      let best = null, bd = 1e9;
      for (const o of G.world.interactables) {
        if (o.dead || !o.interact) continue;
        if (!o.inRange || !o.inRange(p)) continue;
        const txt = o.prompt ? o.prompt() : 'Interact';
        if (!txt) continue;
        const d = Math.abs(o.cx - p.cx);
        if (d < bd) { bd = d; best = { obj: o, text: txt }; }
      }
      this.prompt = best;
      if (best && best.obj instanceof G.ItemDrop) this.nearItem = best.obj;
      if (best && In.pressed.interact && G.fade.a < 0.3) best.obj.interact(p);
    }
    // death sequence
    if (this.state === 'dying') {
      this.deathT += dt;
      if (this.deathT > 2.2 && !this.deathFading) {
        this.deathFading = true;
        G.fadeTo(1, 1.2, () => { this.state = 'death'; this.deathT = 0; this.deathFading = false; G.fadeTo(0, 1.5); G.JINGLES.death(); });
      }
    }
  };

  game.render = function (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    switch (this.state) {
      case 'boot': drawBoot(ctx); break;
      case 'title': drawTitle(ctx); break;
      case 'intro': drawIntro(ctx); break;
      case 'play': case 'dying': this.renderPlay(ctx); break;
      case 'death': drawDeath(ctx); break;
      case 'ending': drawEnding(ctx); break;
      case 'credits': drawCredits(ctx); break;
    }
    if (this.state !== 'play' && this.state !== 'dying') G.ui.draw(ctx);
    G.drawScreenFx(ctx);
  };

  game.renderPlay = function (ctx) {
    const L = G.world.level;
    if (!L) return;
    const cx = G.cam.rx, cy = G.cam.ry;
    this.bg.draw(ctx, cx, cy, L.ph, G.time, 1 / 60);
    L.draw(ctx, cx, cy);
    L.drawAnimDecos(ctx, cx, cy, G.time);
    G.world.draw(ctx, cx, cy);
    G.fx.draw(ctx, cx, cy, false);
    G.Ambient.draw(ctx, cx, cy);
    let dark = L.style.darkness;
    if (this.darkPhase) dark = 0.88;
    if (L.lanternLit) dark = 0.1;
    G.renderLighting(ctx, cx, cy, L.style.ambient, dark, L.style.glow);
    G.fx.draw(ctx, cx, cy, true);
    ctx.drawImage(G.vignette, 0, 0);
    // low health vignette
    const p = this.player;
    if (p && p.hp < p.maxHp * 0.3 && p.state !== 'dead') {
      ctx.globalAlpha = 0.25 + Math.sin(G.time * 5) * 0.1;
      ctx.drawImage(G.tinted(G.vignette, '#a01010'), 0, 0);
      ctx.globalAlpha = 1;
    }
    if (!this.cutscene) G.drawHUD(ctx);
    else {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, 24);
      ctx.fillRect(0, H - 24, W, 24);
      for (const b of G.ui.banners) { const a = Math.min(1, b.t * 2, (b.dur - b.t) * 2); ctx.globalAlpha = Math.max(0, a); G.text(ctx, b.title, W / 2, H / 2 + 40, b.color, { align: 'center', scale: 3, outline: '#000' }); G.text(ctx, b.sub, W / 2, H / 2 + 72, '#d8d0e0', { align: 'center', outline: '#000' }); ctx.globalAlpha = 1; }
    }
    if (this.tutorialT > 0 && !G.ui.modal) drawTutorial(ctx, this.tutorialT);
    G.ui.draw(ctx);
  };

  function drawTutorial(ctx, t) {
    const a = Math.min(1, t / 2);
    ctx.globalAlpha = a;
    const x = W - 158, y = 112;
    G.panel(ctx, x, y, 150, 104, { bg: 'rgba(8,6,14,0.8)', corner: false });
    const K = (a) => '[#ffd080]' + G.Input.keyName(a) + '[]';
    const lines = ['Move: ' + K('left') + '/' + K('right'), 'Jump: ' + K('jump') + ' (twice!)', 'Attack: ' + K('attack1') + ' / ' + K('attack2'), 'Roll: ' + K('roll'), 'Skills: ' + K('skill1') + ' / ' + K('skill2'), 'Heal: ' + K('heal') + '   Use: ' + K('interact'), 'Map: ' + K('map') + '   Menu: ' + K('pause'), '[gray]Controls in the pause menu[]'];
    lines.forEach((l, i) => G.text(ctx, l, x + 8, y + 7 + i * 12, '#d8d0e0'));
    ctx.globalAlpha = 1;
  }

  function drawBoot(ctx) {
    ctx.fillStyle = '#05040a';
    ctx.fillRect(0, 0, W, H);
    const t = G.time;
    G.text(ctx, 'LANTERNFALL', W / 2, H / 2 - 30, '#ffb060', { align: 'center', scale: 3, outline: '#200a00' });
    if (Math.floor(t * 2) % 2 === 0) G.text(ctx, 'Press any key', W / 2, H / 2 + 20, '#c8c0d0', { align: 'center' });
    G.text(ctx, 'Best with sound on', W / 2, H - 30, '#5a5068', { align: 'center' });
  }

  function drawTitle(ctx) {
    const t = game.titleT;
    titleBg.draw(ctx, t * 8, 0, H, G.time, 1 / 60);
    // cliff & lighthouse foreground
    ctx.fillStyle = '#05070c';
    ctx.beginPath();
    ctx.moveTo(380, H);
    ctx.lineTo(420, 250);
    ctx.lineTo(470, 220);
    ctx.lineTo(560, 215);
    ctx.lineTo(600, 240);
    ctx.lineTo(W, 230);
    ctx.lineTo(W, H);
    ctx.fill();
    ctx.fillRect(505, 110, 22, 110);
    ctx.fillRect(500, 104, 32, 8);
    ctx.fillRect(506, 84, 20, 20);
    ctx.beginPath();
    ctx.moveTo(502, 84); ctx.lineTo(516, 70); ctx.lineTo(530, 84); ctx.fill();
    // unlit lantern with a single ember
    const e = Math.sin(G.time * 3) * 0.5 + 0.5;
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(510, 88, 12, 12);
    ctx.fillStyle = G.mix('#6a2a10', '#ff9a3c', e);
    ctx.fillRect(515, 95, 2, 2);
    G.addLight(516 + 0, 96, 30 + e * 20, '#ff9a3c', 0.9);
    // sea waves foreground
    ctx.fillStyle = '#0a1422';
    for (let i = 0; i < W; i += 4) ctx.fillRect(i, H - 30 + Math.round(Math.sin(i * 0.05 + G.time * 2) * 3), 4, 30);
    G.Ambient.update(1 / 60, 'rain', { x: 0, y: 0 });
    G.Ambient.draw(ctx, 0, 0);
    G.renderLighting(ctx, 0, 0, '#02030a', 0.3, 1);
    ctx.drawImage(G.vignette, 0, 0);
    // title
    const a = Math.min(1, t / 2);
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * (0.25 + e * 0.1);
    ctx.drawImage(G.glowSprite('#ff8a30'), 30, 20, 320, 110);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a;
    G.text(ctx, 'LANTERNFALL', 190, 50, '#ffc070', { align: 'center', scale: 4, outline: '#2a0e00' });
    G.text(ctx, 'ISLE OF THE DROWNED CROWN', 190, 92, '#c8b8a0', { align: 'center', outline: '#000' });
    const items = titleItems();
    titleRects = [];
    items.forEach((it, i) => {
      const y = 132 + i * 26;
      titleRects.push(G.ui.button(ctx, 110, y, 160, 21, it, titleSel === i));
    });
    const s = G.save;
    const info = 'Runs ' + s.stats.runs + '   Victories ' + (s.victories || 0) + '   Pearls ' + Object.keys(s.pearls).length + '/4   Lore ' + Object.keys(s.lore).length;
    G.text(ctx, info, 190, H - 36, '#6a6078', { align: 'center' });
    if (s.run) G.text(ctx, 'Saved run: ' + G.BIOMES[s.run.next].name + ' (' + G.fmtTime(s.run.runTime) + ')', 190, H - 24, '#8a7a60', { align: 'center' });
    ctx.globalAlpha = 1;
  }

  function drawIntro(ctx) {
    ctx.fillStyle = '#030206';
    ctx.fillRect(0, 0, W, H);
    G.fx.draw(ctx, 0, 0, false);
    const slideT = 5.5;
    const i = Math.min(G.INTRO_TEXT.length - 1, game.introIdx);
    const lt = game.introT - i * slideT;
    const a = Math.min(1, lt / 1, (slideT - lt) / 0.8);
    ctx.globalAlpha = Math.max(0, a);
    const lines = G.INTRO_TEXT[i].split('\n');
    lines.forEach((l, k) => G.text(ctx, l, W / 2, H / 2 - lines.length * 8 + k * 16, '#e0d0b0', { align: 'center', scale: 1 }));
    ctx.globalAlpha = 1;
    // the ember
    const e = Math.sin(G.time * 3) * 0.5 + 0.5;
    G.pixCircle(ctx, W / 2, H - 60, 2 + (i >= 3 ? 1 : 0), G.mix('#a03010', '#ffb050', e));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3 + e * 0.2;
    ctx.drawImage(G.glowSprite('#ff8a30'), W / 2 - 30, H - 90, 60, 60);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    G.text(ctx, '[' + G.Input.keyName('confirm') + '] next   [' + G.Input.keyName('cancel') + '] skip', W - 10, H - 14, '#4a4058', { align: 'right' });
  }

  function drawDeath(ctx) {
    ctx.fillStyle = '#06040a';
    ctx.fillRect(0, 0, W, H);
    const d = game.deathInfo || {};
    const t = game.deathT;
    G.text(ctx, 'THE FLAME GUTTERS', W / 2, 60, '#c05030', { align: 'center', scale: 3, outline: '#000' });
    G.text(ctx, 'Your wax melts in ' + d.biome + ', undone by ' + d.cause + '.', W / 2, 100, '#b0a8b8', { align: 'center' });
    const s = game.stats;
    const rows = [
      ['Time', G.fmtTime(d.time)], ['Biomes reached', '' + s.biomes], ['Enemies slain', '' + s.kills], ['Parries', '' + s.parries],
      ['Scrolls read', '' + s.scrolls], ['Vaults opened', '' + s.puzzles], ['Embers lost', '[ember]' + d.embersLost + '[]'], ['Gold kept (reserve)', '[gold]' + d.goldKept + '[]'],
    ];
    rows.forEach(([k, v], i) => {
      if (t < 0.3 + i * 0.12) return;
      G.text(ctx, k, W / 2 - 110, 130 + i * 14, '#8a8098');
      G.text(ctx, v, W / 2 + 110, 130 + i * 14, '#e0d8e8', { align: 'right' });
    });
    if (t > 1.3) {
      G.text(ctx, '"The Tide always returns. So do you."', W / 2, 262, '#ffb060', { align: 'center' });
      G.drawKeyHint(ctx, W / 2, 290, 'confirm', 'Reform and try again', 'center');
      G.drawKeyHint(ctx, W / 2, 304, 'cancel', 'Return to title', 'center');
    }
  }

  function drawEnding(ctx) {
    ctx.fillStyle = '#0a0806';
    ctx.fillRect(0, 0, W, H);
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#1a1208');
    gr.addColorStop(1, '#3a2410');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    G.fx.draw(ctx, 0, 0, false);
    // the lit lighthouse
    ctx.fillStyle = '#0e0a06';
    ctx.fillRect(W / 2 - 10, 120, 20, 240);
    ctx.fillRect(W / 2 - 14, 112, 28, 8);
    ctx.fillStyle = '#ffd070';
    ctx.fillRect(W / 2 - 7, 96, 14, 16);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(G.glowSprite('#ffc060'), W / 2 - 120, 0, 240, 210);
    const beam = G.time * 0.6;
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffe0a0';
    ctx.beginPath();
    ctx.moveTo(W / 2, 104);
    ctx.lineTo(W / 2 + Math.cos(beam) * 700, 104 + Math.sin(beam) * 60 - 40);
    ctx.lineTo(W / 2 + Math.cos(beam) * 700, 104 + Math.sin(beam) * 60 + 40);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const slideT = 7;
    const i = Math.min(game.endSlides.length - 1, game.endIdx);
    const lt = game.endT - i * slideT;
    const a = Math.min(1, lt / 1.2, (slideT - lt) / 1);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, H - 110, W, 90);
    const lines = game.endSlides[i].split('\n');
    lines.forEach((l, k) => G.text(ctx, l, W / 2, H - 96 + k * 14, '#f0e0c0', { align: 'center' }));
    ctx.globalAlpha = 1;
  }

  function drawCredits(ctx) {
    ctx.fillStyle = '#05040a';
    ctx.fillRect(0, 0, W, H);
    G.fx.draw(ctx, 0, 0, false);
    const y0 = H - game.creditT * 22;
    const lines = [
      ['LANTERNFALL', '#ffc070', 3], ['Isle of the Drowned Crown', '#c8b8a0', 1], ['', null, 1],
      ['A roguelite action-platformer', '#a098a8', 1], ['', null, 1],
      ['Design, code, art & music', '#8a8098', 1], ['Generated entirely in code - every pixel and every note', '#e0d8e8', 1], ['', null, 1],
      ['Built with love for Dead Cells & Hollow Knight', '#8a8098', 1], ['', null, 1], ['', null, 1],
      [G.save.trueEndings ? 'The Tide has been released.' : 'Four memories of the Queen lie hidden in vaults...', G.save.trueEndings ? '#ff90d0' : '#8a7a90', 1],
      ['', null, 1], ['Thank you for playing.', '#ffd080', 2],
    ];
    let y = y0;
    for (const [t, c, s] of lines) {
      if (t) G.text(ctx, t, W / 2, y, c, { align: 'center', scale: s, outline: '#000' });
      y += 14 * s + 6;
    }
    if (y < -20) game.creditT = 0;
    G.drawKeyHint(ctx, W - 10, H - 14, 'confirm', 'Title', 'right');
  }

  // ================================================================ debug hooks (used by automated tests)
  G.debug = {
    load(id) { game.state = 'play'; if (!game.player) { game.player = new G.Player(); game.player.recalc(); } game.loadBiome(id); },
    passage(next) { game.state = 'play'; if (!game.player) { game.player = new G.Player(); game.player.recalc(); } game.loadPassage(next); },
    give(id, slot, tier, q) {
      const p = game.player;
      const it = G.makeItem(id, tier || 1, G.rng, { q: q || 0 });
      const d = G.ITEMS[id];
      (d.kind === 'skill' ? p.skills : p.weapons)[slot || 0] = it;
      return it;
    },
    god(v) { game.godMode = v !== false; },
  };

  // ================================================================ boot
  G.toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
    } catch (e) {}
  };
  G.boot = () => {
    G.initCanvas();
    G.Input.init(G.canvas);
    window.addEventListener('blur', () => {
      if (game.state === 'play' && !G.ui.modal && !game.cutscene) G.ui.open('pause');
    });
    window.addEventListener('keydown', (e) => { if (e.code === 'F11') { e.preventDefault(); G.toggleFullscreen(); } });
    initTitle();
    game.state = 'boot';
    let last = performance.now();
    let acc = 0;
    const step = G.DT;
    function frame(now) {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      acc += dt;
      let n = 0;
      while (acc >= step && n < 5) {
        try { game.update(step); } catch (e) { console.error(e); G.lastError = e; }
        acc -= step;
        n++;
      }
      if (n >= 5) acc = 0;
      try { game.render(G.ctx); } catch (e) { console.error(e); G.lastError = e; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
})();
