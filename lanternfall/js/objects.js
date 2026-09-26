'use strict';
// ============================================================================
// Objects: pickups, chests, altars, NPCs, shops, puzzles, exits, gates
// ============================================================================
(function () {
  const G = window.G;
  const TS = G.TS;
  const W = () => G.world;

  const SYMBOLS = [
    { name: 'Sun', color: '#ffd24a' },
    { name: 'Moon', color: '#c8d0e0' },
    { name: 'Star', color: '#6ee8e8' },
    { name: 'Wave', color: '#6cb8ff' },
  ];
  G.SYMBOLS = SYMBOLS;
  G.drawSymbol = (ctx, i, x, y, col) => {
    ctx.fillStyle = col || SYMBOLS[i].color;
    x = Math.round(x);
    y = Math.round(y);
    if (i === 0) { ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillRect(x, y - 5, 1, 2); ctx.fillRect(x, y + 4, 1, 2); ctx.fillRect(x - 5, y, 2, 1); ctx.fillRect(x + 4, y, 2, 1); ctx.fillRect(x - 4, y - 4, 1, 1); ctx.fillRect(x + 4, y - 4, 1, 1); ctx.fillRect(x - 4, y + 4, 1, 1); ctx.fillRect(x + 4, y + 4, 1, 1); }
    else if (i === 1) { ctx.fillRect(x - 2, y - 4, 3, 1); ctx.fillRect(x - 3, y - 3, 2, 7); ctx.fillRect(x - 2, y + 4, 3, 1); ctx.fillRect(x + 1, y - 3, 1, 1); ctx.fillRect(x + 1, y + 3, 1, 1); }
    else if (i === 2) { ctx.fillRect(x, y - 5, 1, 11); ctx.fillRect(x - 5, y, 11, 1); ctx.fillRect(x - 1, y - 1, 3, 3); }
    else { for (let k = 0; k < 2; k++) for (let j = -4; j <= 4; j++) ctx.fillRect(x + j, y - 2 + k * 4 + Math.round(Math.sin(j * 0.8)), 1, 1); }
  };

  // generic interactable base
  class Obj extends G.Entity {
    constructor(x, y, w, h) {
      super(x - w / 2, y - h, w, h);
      this.layer = 1;
      this.range = 20;
    }
    inRange(p) {
      return Math.abs(p.cx - this.cx) < this.w / 2 + this.range && p.bottom > this.y - 8 && p.y < this.bottom + 6 && Math.abs(p.bottom - this.bottom) < 40;
    }
    update() {}
  }
  G.Obj = Obj;

  // ------------------------------------------------------------------ item drop
  class ItemDrop extends Obj {
    constructor(x, y, inst, opts) {
      super(x, y, 16, 16);
      this.inst = inst;
      this.age = 0;
      this.layer = 3;
      opts = opts || {};
      if (opts.pop) { this.vy = -220; this.vx = (Math.random() - 0.5) * 80; }
      this.pedestal = !!opts.pedestal;
    }
    interact(p) { G.game.pickupItem(this); }
    prompt() { return 'Take'; }
    update(dt) {
      this.age += dt;
      if (!this.pedestal) {
        this.vy = Math.min(400, (this.vy || 0) + 900 * dt);
        this.vx = (this.vx || 0) * Math.pow(0.1, dt);
        this.moveX(this.vx * dt);
        if (this.moveY(this.vy * dt) === 'floor') this.vy = 0;
      }
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy + Math.sin(this.age * 3) * 2 - 4);
      const q = this.inst.q;
      const col = G.QUALITY_COLORS[q];
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + Math.sin(this.age * 4) * 0.1;
      ctx.drawImage(G.glowSprite(col), x - 8, y - 8, 32, 32);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (this.pedestal) {
        ctx.fillStyle = '#4a4050';
        ctx.fillRect(x - 2, Math.round(this.bottom - cy) - 6, 20, 6);
        ctx.fillStyle = '#6a6070';
        ctx.fillRect(x - 2, Math.round(this.bottom - cy) - 6, 20, 1);
      }
      ctx.drawImage(G.itemIcon(this.inst.id), x, y);
      if (q === 3 && Math.random() < 0.1) G.fx.spawn({ x: this.cx + (Math.random() - 0.5) * 16, y: this.cy, vy: -30, life: 0.8, color: '#ffd060', size: 1, add: true });
      G.addLight(this.cx, this.cy, 40, col, 0.5);
    }
  }
  G.ItemDrop = ItemDrop;

  class BlueprintDrop extends Obj {
    constructor(x, y, itemId) {
      super(x, y, 10, 10);
      this.itemId = itemId;
      this.vy = -200;
      this.vx = (Math.random() - 0.5) * 100;
      this.age = 0;
      this.layer = 4;
    }
    update(dt) {
      this.age += dt;
      this.vy = Math.min(300, this.vy + 700 * dt);
      this.vx *= Math.pow(0.2, dt);
      this.moveX(this.vx * dt);
      if (this.moveY(this.vy * dt) === 'floor') this.vy = 0;
      const p = W().player;
      if (p && this.age > 0.4 && G.overlap(this, p)) {
        W().kill(this);
        G.game.foundBlueprint(this.itemId);
      }
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy + Math.sin(this.age * 4) * 1.5);
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(x, y, 10, 8);
      ctx.fillStyle = '#6a8ac0';
      ctx.fillRect(x + 1, y + 1, 8, 6);
      ctx.fillStyle = '#e0ecff';
      ctx.fillRect(x + 2, y + 3, 6, 1);
      ctx.fillRect(x + 4, y + 2, 1, 4);
      G.addLight(this.cx, this.cy, 36, '#80a8ff', 0.7);
    }
  }
  G.BlueprintDrop = BlueprintDrop;

  const FOODS = [
    { name: 'Salted Fish', color: '#a0b8c0' },
    { name: 'Hard Bread', color: '#c09050' },
    { name: 'Wild Apple', color: '#d04040' },
    { name: 'Cured Ham', color: '#c07070' },
    { name: 'Honeyed Pear', color: '#d0c050' },
  ];
  class FoodDrop extends Obj {
    constructor(x, y, tier, opts) {
      super(x, y, 12, 10);
      this.food = G.rng.pick(FOODS);
      this.pct = 0.35 + Math.min(0.2, (tier || 1) * 0.03);
      this.age = 0;
      this.price = opts && opts.price;
      this.layer = 3;
    }
    prompt() { return this.price ? 'Buy ' + this.food.name + ' ([gold]' + this.price + 'g[])' : 'Eat ' + this.food.name; }
    interact(p) {
      if (this.price) {
        if (p.gold < this.price) { G.game.notify('[red]Not enough gold.[]'); G.Audio.play('uiDeny'); return; }
        p.gold -= this.price;
        G.Audio.play('buy');
      }
      if (p.hp >= p.maxHp && !this.price) { G.game.notify('[gray]You are not hungry.[]'); return; }
      p.heal(p.maxHp * this.pct);
      G.Audio.play('food');
      G.fx.burst(this.cx, this.cy, 10, { color: ['#70f070', '#ffffff'], speed: 60, life: 0.5, size: 2, add: true });
      W().kill(this);
    }
    update(dt) {
      this.age += dt;
      this.vy = Math.min(300, (this.vy || 0) + 700 * dt);
      if (this.moveY(this.vy * dt) === 'floor') this.vy = 0;
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      const c = this.food.color;
      ctx.fillStyle = G.shade(c, -0.3);
      ctx.fillRect(x + 1, y + 4, 10, 6);
      ctx.fillStyle = c;
      ctx.fillRect(x + 2, y + 3, 8, 5);
      ctx.fillStyle = G.shade(c, 0.4);
      ctx.fillRect(x + 3, y + 4, 3, 1);
      if (this.price) G.text(ctx, this.price + 'g', x + 6, y - 9, '#ffd24a', { align: 'center', outline: '#000' });
    }
  }
  G.FoodDrop = FoodDrop;

  // ------------------------------------------------------------------ chest
  class Chest extends Obj {
    constructor(x, y, o) {
      super(x, y, 20, 14);
      this.o = o || {};
      this.cursed = !!this.o.cursed;
      this.opened = false;
      this.age = 0;
      this.mapIcon = this.cursed ? 'cursed' : 'chest';
    }
    prompt() { return this.opened ? null : this.cursed ? '[purple]Open Cursed Chest[]' : 'Open'; }
    interact(p) {
      if (this.opened) return;
      if (this.cursed && !this.confirming) {
        this.confirming = true;
        G.ui.confirm(G.DIALOGUE.cursedChest[0][1] + '\n\nOpen it anyway?', (yes) => { this.confirming = false; if (yes) this.open(p); });
        return;
      }
      this.open(p);
    }
    open(p) {
      this.opened = true;
      this.mapIcon = null;
      const tier = W().level.tier || 1;
      G.Audio.play('chest');
      G.fx.burst(this.cx, this.y, 20, { color: ['#ffd24a', '#ffffff'], speed: 120, life: 0.6, size: 2, add: true, angle: -Math.PI / 2, spread: 1.6 });
      const bonus = (this.o.bonus || 0) + (this.cursed ? 0.8 : 0);
      if (!this.o.small || G.rng.chance(0.5)) {
        const inst = G.makeItem(G.rng.pick(G.itemPool()), tier, G.rng, { bonus });
        W().add(new ItemDrop(this.cx, this.y, inst, { pop: true }));
      }
      G.spawnGold(this.cx, this.y, (20 + tier * 18) * (this.cursed ? 3 : 1) * (this.o.small ? 0.5 : 1) * (p.hasMut('greed') ? 1.6 : 1));
      if (this.o.rune || this.cursed) G.spawnEmbers(this.cx, this.y, 4 + G.rng.int(0, 6));
      if (G.rng.chance(this.o.rune ? 0.45 : this.cursed ? 0.4 : 0.15)) {
        const locked = Object.keys(G.ITEMS).filter((id) => G.ITEMS[id].bp && !G.ITEMS[id].bossItem && G.ITEMS[id].bp.from !== 'guardian' && !G.save.bpFound[id] && !G.save.unlocked[id]);
        if (locked.length) W().add(new BlueprintDrop(this.cx, this.y - 4, G.rng.pick(locked)));
      }
      if (this.cursed) {
        p.curse = Math.max(p.curse, 8 + tier * 2);
        G.Audio.play('curse');
        G.screenFlash('#8030c0', 0.6, 0.5);
        G.game.notify('[purple]Cursed![] Any hit will kill you. Slay ' + p.curse + ' foes to lift it.');
      }
      G.game.stats.chests++;
    }
    update(dt) { this.age += dt; }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      const wood = this.cursed ? '#3a2a40' : '#7a5030', band = this.cursed ? '#8a40c0' : '#c0a050';
      ctx.fillStyle = G.shade(wood, -0.3);
      ctx.fillRect(x, y + 5, 20, 9);
      ctx.fillStyle = wood;
      ctx.fillRect(x + 1, y + 6, 18, 7);
      if (this.opened) {
        ctx.fillStyle = wood;
        ctx.fillRect(x, y - 2, 20, 4);
        ctx.fillStyle = '#1a1008';
        ctx.fillRect(x + 1, y + 5, 18, 2);
      } else {
        ctx.fillStyle = wood;
        ctx.fillRect(x, y, 20, 6);
        ctx.fillStyle = G.shade(wood, 0.2);
        ctx.fillRect(x + 1, y, 18, 1);
        ctx.fillStyle = band;
        ctx.fillRect(x + 3, y, 2, 14);
        ctx.fillRect(x + 15, y, 2, 14);
        ctx.fillRect(x + 8, y + 4, 4, 4);
        ctx.fillStyle = '#1a1008';
        ctx.fillRect(x + 9, y + 6, 2, 1);
        if (this.cursed) {
          for (let i = 0; i < 2; i++) { ctx.fillStyle = '#5a5060'; ctx.fillRect(x - 1, y + 3 + i * 5, 22, 1); }
          if (Math.random() < 0.2) G.fx.spawn({ x: this.x + Math.random() * 20, y: this.y + 4, vy: -20, life: 0.8, color: '#a050ff', size: 2, size2: 0, add: true });
          G.addLight(this.cx, this.cy, 50, '#a050ff', 0.8);
        } else G.addLight(this.cx, this.cy, 30, '#ffd070', 0.4);
      }
    }
  }
  G.Chest = Chest;

  // ------------------------------------------------------------------ scroll altar
  class ScrollAltar extends Obj {
    constructor(x, y, o) {
      super(x, y, 14, 20);
      this.used = false;
      this.age = Math.random() * 5;
      this.mapIcon = 'scroll';
      const opts = G.rng.shuffle(['fury', 'cunning', 'vigor']);
      this.choices = (o && o.grand) ? ['fury', 'cunning', 'vigor'] : opts.slice(0, 2);
    }
    prompt() { return this.used ? null : 'Read Scroll of Power'; }
    interact(p) {
      if (this.used) return;
      G.ui.open('scroll', { altar: this });
    }
    apply(stat) {
      const p = W().player;
      this.used = true;
      this.mapIcon = null;
      p.stats[stat]++;
      p.scrolls++;
      p.recalc();
      p.heal(p.maxHp * 0.15, true);
      G.Audio.play('scroll');
      G.fx.burst(p.cx, p.cy, 30, { color: [G.STAT_COLORS[stat], '#ffffff'], speed: 140, life: 0.8, size: 2, add: true });
      G.fx.ring(p.cx, p.cy, 40, G.STAT_COLORS[stat], 0.5, 3);
      G.game.notify('Scroll of Power: [' + stat + ']' + G.STAT_NAMES[stat] + ' +1[]  (' + G.STAT_NAMES[stat] + ' weapons deal more damage, +HP)');
      G.game.stats.scrolls++;
    }
    update(dt) { this.age += dt; }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = '#4a4050';
      ctx.fillRect(x, y - 8, 14, 8);
      ctx.fillStyle = '#6a6070';
      ctx.fillRect(x, y - 8, 14, 1);
      ctx.fillRect(x + 3, y - 12, 8, 4);
      if (!this.used) {
        const fy = y - 22 + Math.sin(this.age * 2.5) * 2;
        const col = G.STAT_COLORS[this.choices[Math.floor(this.age) % this.choices.length]];
        ctx.fillStyle = '#e8dcc0';
        ctx.fillRect(x + 2, fy, 10, 8);
        ctx.fillStyle = '#b8a888';
        ctx.fillRect(x + 1, fy - 1, 12, 2);
        ctx.fillRect(x + 1, fy + 7, 12, 2);
        ctx.fillStyle = col;
        ctx.fillRect(x + 5, fy + 2, 4, 4);
        G.addLight(this.cx, fy + 4 + cy, 60, col, 0.9);
        if (Math.random() < 0.15) G.fx.spawn({ x: this.cx + (Math.random() - 0.5) * 12, y: fy + cy + 8, vy: -20, life: 0.8, color: col, size: 1, add: true });
      }
    }
  }
  G.ScrollAltar = ScrollAltar;

  // ------------------------------------------------------------------ lore tablet
  class LoreTablet extends Obj {
    constructor(x, y, id) {
      super(x, y, 16, 22);
      this.id = id;
      this.mapIcon = G.save.lore[id] ? null : 'lore';
      this.age = Math.random() * 3;
    }
    prompt() { return 'Read'; }
    interact(p) {
      const L = G.LORE[this.id] || G.PEARLS[this.id];
      if (!L) return;
      const isNew = !G.save.lore[this.id];
      G.save.lore[this.id] = true;
      this.mapIcon = null;
      G.ui.open('lore', { title: L.title, text: L.text, isNew });
      if (isNew) { G.Audio.play('blueprint'); G.game.saveMeta(); }
    }
    update(dt) { this.age += dt; }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = '#5a5664';
      ctx.fillRect(x, y - 20, 16, 20);
      ctx.fillRect(x + 2, y - 22, 12, 2);
      ctx.fillStyle = '#7a7684';
      ctx.fillRect(x, y - 20, 16, 1);
      ctx.fillStyle = '#3a3644';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 3, y - 16 + i * 4, 10 - (i % 2) * 3, 1);
      if (!G.save.lore[this.id]) {
        const a = Math.sin(this.age * 3) * 0.5 + 0.5;
        G.addLight(this.cx, this.cy, 40, '#c0e0ff', 0.4 + a * 0.4);
        ctx.fillStyle = '#c0e0ff';
        ctx.fillRect(x + 7, y - 26 - Math.round(a * 2), 2, 2);
      }
    }
  }
  G.LoreTablet = LoreTablet;

  // ------------------------------------------------------------------ exits
  class Exit extends Obj {
    constructor(x, y, o) {
      super(x, y, 36, 58);
      this.to = o.to;
      this.o = o;
      this.mapIcon = 'exit';
      this.range = 4;
      this.age = 0;
    }
    prompt() {
      if (this.o.bossExit) return G.world.boss && !G.world.boss.dead && G.world.boss.state !== 'dying' ? null : 'Continue';
      const B = G.BIOMES[this.to];
      if (!B) return 'Enter';
      return this.o.passage ? 'Enter [yellow]' + B.name + '[]' : 'Leave toward [yellow]' + B.name + '[]';
    }
    interact(p) {
      if (this.o.bossExit && G.world.boss && G.world.boss.state !== 'dead' && !G.game.bossDefeated) return;
      G.game.takeExit(this);
    }
    update(dt) { this.age += dt; }
    draw(ctx, cx, cy) {
      const x = Math.round(this.cx - cx), y = Math.round(this.bottom - cy);
      // swirling portal inside the archway
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#0a0612';
      ctx.fillRect(x - 14, y - 58, 28, 58);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 10; i++) {
        const a = this.age * 2 + i;
        ctx.fillStyle = i % 2 ? '#ffb060' : '#ff8040';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(Math.round(x + Math.sin(a) * 10), Math.round(y - 30 + Math.cos(a * 1.3) * 22), 2, 2);
      }
      ctx.globalAlpha = 1;
      G.addLight(this.cx, this.y + 30, 70, '#ff9a50', 0.7);
      const B = G.BIOMES[this.to];
      if (B && !this.o.bossExit) {
        G.text(ctx, B.name, x, y - 78, '#e8d8b0', { align: 'center', outline: '#000' });
        if (B.tier) G.text(ctx, 'Tier ' + G.roman(B.tier), x, y - 68, '#9a8a70', { align: 'center', outline: '#000' });
      }
    }
  }
  G.Exit = Exit;

  // ------------------------------------------------------------------ breakables
  class Breakable extends Obj {
    constructor(x, y, v) {
      const kind = v < 0.4 ? 'crate' : v < 0.75 ? 'barrel' : 'pot';
      super(x, y, kind === 'pot' ? 10 : 14, kind === 'pot' ? 12 : 14);
      this.kind = kind;
      this.hp = 1;
      this.projHittable = true;
    }
    onHit(h) {
      if (this.dead) return;
      W().kill(this);
      G.Audio.play('crate', { x: this.cx });
      const cols = this.kind === 'pot' ? ['#a06a4a', '#7a4a3a'] : ['#8a6a48', '#5a4030'];
      G.fx.burst(this.cx, this.cy, 12, { color: cols, speed: 140, life: 0.7, size: 2, grav: 600, collide: true });
      const tier = W().level.tier || 1;
      const r = Math.random();
      if (r < 0.55) G.spawnGold(this.cx, this.cy, (3 + tier * 3) * (0.5 + Math.random()));
      else if (r < 0.62) W().add(new FoodDrop(this.cx, this.bottom, tier));
      else if (r < 0.72) G.spawnEmbers(this.cx, this.cy, 1);
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      if (this.kind === 'crate') {
        ctx.fillStyle = '#5a4030'; ctx.fillRect(x, y, 14, 14);
        ctx.fillStyle = '#8a6a48'; ctx.fillRect(x + 1, y + 1, 12, 12);
        ctx.fillStyle = '#5a4030'; ctx.fillRect(x + 1, y + 6, 12, 2); ctx.fillRect(x + 6, y + 1, 2, 12);
      } else if (this.kind === 'barrel') {
        ctx.fillStyle = '#6a4a30'; ctx.fillRect(x + 1, y, 12, 14);
        ctx.fillStyle = '#8a6a48'; ctx.fillRect(x + 2, y + 1, 4, 12);
        ctx.fillStyle = '#3a3a40'; ctx.fillRect(x + 1, y + 2, 12, 1); ctx.fillRect(x + 1, y + 11, 12, 1);
      } else {
        ctx.fillStyle = '#7a4a3a'; ctx.fillRect(x + 1, y + 3, 8, 9);
        ctx.fillStyle = '#a06a4a'; ctx.fillRect(x + 2, y + 4, 3, 6);
        ctx.fillStyle = '#7a4a3a'; ctx.fillRect(x + 3, y, 4, 3);
      }
    }
  }
  G.Breakable = Breakable;

  // ------------------------------------------------------------------ shop
  class Merchant extends Obj {
    constructor(x, y) {
      super(x, y, 16, 26);
      this.age = 0;
      this.mapIcon = 'shop';
      this.facing = -1;
    }
    prompt() { return 'Talk'; }
    interact(p) { G.game.say(G.rng.pick(G.DIALOGUE.pellamGreet)); }
    update(dt) {
      this.age += dt;
      const p = W().player;
      if (p) this.facing = Math.sign(p.cx - this.cx) || this.facing;
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.cx - cx), y = Math.round(this.bottom - cy);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(this.facing, 1);
      const b = Math.round(Math.sin(this.age * 2) * 0.6);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-4, -8, 3, 8); ctx.fillRect(1, -8, 3, 8);
      ctx.fillStyle = '#6a3a5a'; ctx.fillRect(-6, -20 + b, 12, 13);
      ctx.fillStyle = '#c0a050'; ctx.fillRect(-6, -13 + b, 12, 1);
      ctx.fillStyle = '#b09080'; ctx.fillRect(-3, -26 + b, 7, 7);
      ctx.fillStyle = '#4a2a3a'; ctx.fillRect(-5, -29 + b, 11, 4); ctx.fillRect(-3, -32 + b, 7, 3);
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(1, -24 + b, 2, 1);
      ctx.fillStyle = '#7a5a30'; ctx.fillRect(-10, -18 + b, 5, 10);
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(-9, -16 + b, 3, 3);
      ctx.restore();
      G.addLight(this.cx, this.cy, 60, '#ffd070', 0.5);
    }
  }
  G.Merchant = Merchant;

  class ShopItem extends Obj {
    constructor(x, y, o) {
      super(x, y, 16, 22);
      const rng = new G.RNG(o.seed || 1);
      const tier = W().level.tier || 1;
      this.slot = o.slot;
      let kinds = o.slot === 2 ? ['skill'] : o.slot === 3 ? null : ['melee', 'ranged', 'shield'];
      if (o.slot === 3 && rng.chance(0.5)) { this.food = true; }
      if (this.food) {
        this.foodDrop = new FoodDrop(x, y, tier, { price: Math.round((40 + tier * 30) / 5) * 5 });
      } else {
        const pool = G.itemPool(kinds);
        this.inst = G.makeItem(rng.pick(pool), tier, rng, { bonus: 0.15 });
        this.price = G.itemPrice(this.inst);
      }
      this.age = 0;
      this.pedestal = true;
    }
    onAdd() {
      if (this.food) { W().kill(this); this.foodDrop.setFeet(this.cx, this.bottom); W().add(this.foodDrop); }
    }
    prompt() { return this.inst ? 'Buy for [gold]' + this.price + ' gold[]' : null; }
    interact(p) {
      if (!this.inst) return;
      if (p.gold < this.price) { G.game.notify('[red]Not enough gold.[] Pellam shakes his head.'); G.Audio.play('uiDeny'); return; }
      p.gold -= this.price;
      G.Audio.play('buy');
      G.game.stats.goldSpent += this.price;
      const d = new ItemDrop(this.cx, this.bottom, this.inst, { pedestal: true });
      W().kill(this);
      W().add(d);
      G.game.pickupItem(d);
    }
    update(dt) { this.age += dt; }
    draw(ctx, cx, cy) {
      if (!this.inst) return;
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(x - 2, y - 6, 20, 6);
      ctx.fillStyle = '#6a5a3a';
      ctx.fillRect(x - 2, y - 6, 20, 1);
      const col = G.QUALITY_COLORS[this.inst.q];
      const iy = y - 24 + Math.round(Math.sin(this.age * 3) * 1.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.3;
      ctx.drawImage(G.glowSprite(col), x - 8, iy - 8, 32, 32);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(G.itemIcon(this.inst.id), x, iy);
      const p = W().player;
      G.text(ctx, this.price + 'g', x + 8, y - 36, p && p.gold >= this.price ? '#ffd24a' : '#a05050', { align: 'center', outline: '#000' });
    }
  }
  G.ShopItem = ShopItem;

  // ------------------------------------------------------------------ NPCs
  class Mara extends Obj {
    constructor(x, y, first) {
      super(x, y, 14, 24);
      this.first = first;
      this.age = 0;
      this.facing = -1;
      this.mapIcon = 'npc';
      this.sold = false;
    }
    prompt() { return 'Talk to Mara'; }
    interact(p) {
      if (!G.save.flags.metMara) {
        G.game.say(G.DIALOGUE.maraFirst, () => {
          G.save.flags.metMara = true;
          G.save.hasMap = true;
          G.game.saveMeta();
          G.Audio.play('rune');
          G.game.banner('MARA’S QUILL', 'The map is now yours. Press [yellow]' + G.Input.keyName('map') + '[] to view it.', '#8ad0ff');
          G.world.level.revealed.fill(0);
          G.game.revealAround(true);
        });
        return;
      }
      const cost = 60 + (W().level.tier || 1) * 40;
      G.game.say(G.rng.pick(G.DIALOGUE.maraLater), () => {
        if (this.sold) return;
        G.ui.confirm('Buy Mara’s chart of this area for [gold]' + cost + ' gold[]? (Reveals the whole map)', (yes) => {
          if (!yes) return;
          if (p.gold < cost) { G.game.notify('[red]Not enough gold.[]'); return; }
          p.gold -= cost;
          this.sold = true;
          G.world.level.revealed.fill(1);
          G.Audio.play('buy');
          G.game.notify('[cyan]The whole area is charted on your map.[]');
        });
      });
    }
    update(dt) {
      this.age += dt;
      const p = W().player;
      if (p) this.facing = Math.sign(p.cx - this.cx) || this.facing;
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.cx - cx), y = Math.round(this.bottom - cy);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(this.facing, 1);
      const b = Math.round(Math.sin(this.age * 2.2) * 0.6);
      ctx.fillStyle = '#3a3040'; ctx.fillRect(-3, -8, 2, 8); ctx.fillRect(1, -8, 2, 8);
      ctx.fillStyle = '#3a6a8a'; ctx.fillRect(-4, -17 + b, 8, 10);
      ctx.fillStyle = '#8a6a40'; ctx.fillRect(-8, -18 + b, 5, 11);
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-9, -21 + b, 2, 6); ctx.fillRect(-6, -22 + b, 2, 5);
      ctx.fillStyle = '#e0c0a0'; ctx.fillRect(-3, -23 + b, 6, 6);
      ctx.fillStyle = '#c05a30'; ctx.fillRect(-4, -25 + b, 8, 3); ctx.fillRect(-5, -23 + b, 2, 6);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(1, -21 + b, 1, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(4, -18 + b, 1, 5);
      ctx.restore();
      if (!G.save.flags.metMara) G.text(ctx, '!', x, y - 34 + Math.round(Math.sin(this.age * 4) * 2), '#ffe060', { align: 'center', outline: '#000' });
    }
  }
  G.Mara = Mara;

  class Keeper extends Obj {
    constructor(x, y) {
      super(x, y, 18, 30);
      this.age = 0;
      this.mapIcon = 'keeper';
    }
    prompt() { return 'Speak with the Keeper'; }
    interact(p) {
      if (!G.save.flags.metKeeper) {
        G.game.say(G.DIALOGUE.keeperFirst, () => { G.save.flags.metKeeper = true; G.game.saveMeta(); G.ui.open('keeper'); });
        return;
      }
      G.ui.open('keeper');
    }
    update(dt) { this.age += dt; }
    draw(ctx, cx, cy) {
      const x = Math.round(this.cx - cx), y = Math.round(this.bottom - cy);
      const b = Math.sin(this.age * 1.5);
      ctx.fillStyle = '#2a2230'; ctx.fillRect(x - 9, y - 26, 18, 26);
      ctx.fillStyle = '#3a3040'; ctx.fillRect(x - 8, y - 26, 3, 26);
      ctx.fillStyle = '#1a1420'; ctx.fillRect(x - 7, y - 34, 14, 10);
      ctx.fillStyle = '#e8dcc8'; ctx.fillRect(x - 4, y - 31, 8, 7);
      ctx.fillStyle = '#d8ccb0'; ctx.fillRect(x - 4, y - 25, 3, 4);
      ctx.fillRect(x + 2, y - 24, 2, 5);
      ctx.fillStyle = '#ffb060'; ctx.fillRect(x - 2, y - 29, 1, 1); ctx.fillRect(x + 2, y - 29, 1, 1);
      // ladle of molten wax
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x + 8, y - 20, 1, 12);
      ctx.fillStyle = '#8a7a6a'; ctx.fillRect(x + 6, y - 8, 5, 3);
      ctx.fillStyle = '#ffb060'; ctx.fillRect(x + 7, y - 8, 3, 1);
      // floating embers around
      for (let i = 0; i < 3; i++) {
        const a = this.age * 1.2 + i * 2.1;
        ctx.fillStyle = '#ff9a3c';
        ctx.fillRect(Math.round(x + Math.cos(a) * 14), Math.round(y - 20 + Math.sin(a * 1.3) * 8 + b), 2, 2);
      }
      G.addLight(this.cx, this.cy, 90, '#ffb060', 0.9);
    }
  }
  G.Keeper = Keeper;

  class Fountain extends Obj {
    constructor(x, y) { super(x, y, 28, 20); this.age = 0; this.mapIcon = 'fountain'; }
    prompt() { return 'Drink from the fountain'; }
    interact(p) {
      p.flask = p.flaskMax;
      p.heal(p.maxHp * 0.1);
      G.Audio.play('splash');
      G.Audio.play('heal');
      G.game.notify('[green]Your flasks are refilled.[] (' + p.flask + '/' + p.flaskMax + ')');
    }
    update(dt) {
      this.age += dt;
      if (Math.random() < 0.4) G.fx.spawn({ x: this.cx + (Math.random() - 0.5) * 4, y: this.y + 2, vx: (Math.random() - 0.5) * 30, vy: -60, grav: 300, life: 0.5, color: '#80d0ff', size: 1 });
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = '#5a5664'; ctx.fillRect(x, y - 8, 28, 8);
      ctx.fillStyle = '#7a7684'; ctx.fillRect(x, y - 8, 28, 1);
      ctx.fillStyle = '#3a8aa0'; ctx.fillRect(x + 2, y - 7, 24, 3);
      ctx.fillStyle = '#5a5664'; ctx.fillRect(x + 11, y - 20, 6, 12);
      ctx.fillRect(x + 8, y - 22, 12, 3);
      G.addLight(this.cx, this.cy, 50, '#80d0ff', 0.6);
    }
  }
  G.Fountain = Fountain;

  class MutationAltar extends Obj {
    constructor(x, y) { super(x, y, 20, 22); this.age = 0; this.used = false; this.mapIcon = 'mutation'; }
    prompt() { return this.used ? 'Mutations (chosen)' : 'Choose a Mutation'; }
    interact(p) { G.ui.open('mutations', { altar: this }); }
    update(dt) { this.age += dt; }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = '#3a3040'; ctx.fillRect(x + 2, y - 14, 16, 14);
      ctx.fillStyle = '#5a4a60'; ctx.fillRect(x, y - 16, 20, 3);
      const cols = ['#e8483c', '#a55cf0', '#4fcf5a'];
      for (let i = 0; i < 3; i++) {
        const a = this.age * 1.5 + (i / 3) * Math.PI * 2;
        ctx.fillStyle = cols[i];
        ctx.fillRect(Math.round(x + 10 + Math.cos(a) * 8), Math.round(y - 24 + Math.sin(a) * 3), 3, 3);
      }
      if (!this.used) G.addLight(this.cx, this.y, 50, '#c080ff', 0.7);
    }
  }
  G.MutationAltar = MutationAltar;

  class MapTable extends Obj {
    constructor(x, y) { super(x, y, 22, 16); this.age = 0; }
    prompt() { return 'Study the Isle map'; }
    interact(p) {
      if (!G.save.hasMap) { G.game.say([['tablet', 'A map of the isle... but it is blank, as if the ink has been washed away by the tide. Perhaps a cartographer could help.']]); return; }
      G.ui.open('islemap');
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = '#5a4030'; ctx.fillRect(x + 2, y - 10, 3, 10); ctx.fillRect(x + 17, y - 10, 3, 10);
      ctx.fillStyle = '#7a5a40'; ctx.fillRect(x, y - 14, 22, 4);
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x + 2, y - 16, 18, 3);
      ctx.fillStyle = '#6a8ac0'; ctx.fillRect(x + 6, y - 16, 6, 2);
    }
  }
  G.MapTable = MapTable;

  class Salvage extends Obj {
    constructor(x, y) { super(x, y, 16, 20); this.age = 0; }
    prompt() { return 'Salvage items on the ground'; }
    interact(p) {
      let total = 0;
      for (const e of W().ents) if (e instanceof ItemDrop && !e.dead) { total += Math.round(G.itemPrice(e.inst) * 0.3); W().kill(e); G.fx.burst(e.cx, e.cy, 10, { color: '#ff9040', speed: 80, life: 0.4, size: 2, add: true }); }
      if (total) { p.addGold(total); G.game.notify('Salvaged for [gold]' + total + ' gold[].'); G.Audio.play('fire'); }
      else G.game.notify('[gray]Drop unwanted items here first (swap them out), then salvage.[]');
    }
    update(dt) { this.age += dt; }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = '#4a3a3a'; ctx.fillRect(x, y - 12, 16, 12);
      ctx.fillStyle = '#ff7030'; ctx.fillRect(x + 3, y - 16 - Math.round(Math.sin(this.age * 10)), 10, 5);
      G.addLight(this.cx, this.y, 50, '#ff8040', 0.7);
    }
  }
  G.Salvage = Salvage;

  // ------------------------------------------------------------------ rune things
  class Seed extends Obj {
    constructor(x, y, o) { super(x, y, 14, 12); this.o = o; this.grown = false; this.age = 0; this.mapIcon = 'seed'; }
    prompt() { return this.grown ? null : G.save.runes.vine ? '[green]Grow the vine[]' : 'Examine the withered seed'; }
    interact(p) {
      if (this.grown) return;
      if (!G.save.runes.vine) { G.game.say(G.DIALOGUE.seedNoRune); return; }
      this.grown = true;
      this.mapIcon = null;
      this.growT = 0;
      this.growY = this.o.ty0;
      G.Audio.play('vine');
    }
    update(dt) {
      this.age += dt;
      if (this.grown && this.growY >= this.o.ty1) {
        this.growT += dt;
        while (this.growT > 0.035 && this.growY >= this.o.ty1) {
          this.growT -= 0.035;
          const L = W().level;
          L.set(this.o.tx, this.growY, G.T.VINE);
          G.fx.burst(this.o.tx * TS + 8, this.growY * TS + 8, 3, { color: ['#5fae4a', '#8ae070'], speed: 50, life: 0.4, size: 1 });
          this.growY--;
        }
      }
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = this.grown ? '#4f9a3a' : '#5a4a3a';
      ctx.fillRect(x + 3, y - 8, 8, 8);
      ctx.fillStyle = this.grown ? '#8ae070' : '#7a6a4a';
      ctx.fillRect(x + 5, y - 10, 4, 3);
      if (!this.grown) {
        const a = Math.sin(this.age * 3) * 0.5 + 0.5;
        ctx.fillStyle = G.mix('#3a6a2a', '#8ae070', a);
        ctx.fillRect(x + 6, y - 6, 2, 2);
        G.addLight(this.cx, this.cy, 30 + a * 10, '#6fdc5a', 0.5);
      }
    }
  }
  G.Seed = Seed;

  class Hint extends Obj {
    constructor(x, y, o) { super(x, y, 30, 30); this.hint = o.hint; this.t = 0; }
    update(dt) {
      const p = W().player;
      if (!p) return;
      if (Math.abs(p.cx - this.cx) < 40 && Math.abs(p.bottom - this.bottom) < 40) {
        this.t += dt;
        if (this.t > 0.6 && !this.shown) {
          this.shown = true;
          if (this.hint === 'ram' && !G.save.runes.ram) G.game.notify('Rune-marked cracks. A [orange]Ram Rune[] ground-slam could shatter them.');
          if (this.hint === 'shaft' && !G.save.runes.spider) G.game.notify('A sheer shaft. Only something that could [purple]cling to walls[] could climb it.');
          if (this.hint === 'timed') G.game.notify('[yellow]A timed vault.[] Its seal opens only for the swift.');
        }
      } else this.t = 0;
    }
    draw() {}
  }
  G.Hint = Hint;

  // ------------------------------------------------------------------ gates & puzzles
  class Gate extends G.Entity {
    constructor(x, y, h, o) {
      super(x - 4, y - h, 8, h);
      this.o = o || {};
      this.id = this.o.id;
      this.solid = true;
      this.canBeSolid = true;
      this.openAmt = 0;
      this.layer = 1;
      this.fullH = h;
      this.kind = this.o.kind;
      this.mapIcon = this.kind && this.kind !== 'boss' ? 'vault' : null;
      if (this.kind === 'timed' && G.game.runTime < (this.o.limit || 0)) { this.isOpen = true; this.openAmt = 1; }
    }
    setOpen(v) {
      if (this.isOpen === v) return;
      this.isOpen = v;
      G.Audio.play(v ? 'door' : 'lever', { x: this.cx });
      if (v && this.kind && this.kind !== 'boss' && this.kind !== 'crate' && this.kind !== 'timed' && !this.solvedOnce) {
        this.solvedOnce = true;
        G.Audio.play('solved');
        G.game.notify('[yellow]The vault seal opens.[]');
        G.game.stats.puzzles++;
        this.mapIcon = null;
      }
    }
    update(dt) {
      if (this.kind === 'timed') {
        const lim = this.o.limit || 0;
        this.setOpen(G.game.runTime < lim);
      }
      this.openAmt = G.approach(this.openAmt, this.isOpen ? 1 : 0, dt * 2.5);
      this.solid = this.openAmt < 0.8;
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      const vis = Math.round(this.fullH * (1 - this.openAmt));
      ctx.fillStyle = '#2a2a30';
      ctx.fillRect(x - 2, y - 3, 12, 3);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#5a5a66';
        ctx.fillRect(x + i * 3, y, 2, vis);
        ctx.fillStyle = '#8a8a96';
        ctx.fillRect(x + i * 3, y, 1, vis);
      }
      ctx.fillStyle = '#4a4a56';
      for (let yy = 6; yy < vis; yy += 12) ctx.fillRect(x - 1, y + yy, 10, 2);
      if (vis > 2) { ctx.fillStyle = '#9a9aa6'; ctx.fillRect(x - 1, y + vis - 3, 10, 3); }
      if (this.kind === 'timed') {
        const left = (this.o.limit || 0) - G.game.runTime;
        G.text(ctx, left > 0 ? G.fmtTime(left) : 'SEALED', x + 4, y - 14, left > 0 ? '#ffe060' : '#a05050', { align: 'center', outline: '#000' });
      }
      if (this.kind === 'levers') {
        const levers = W().ents.filter((e) => e instanceof Lever && e.id === this.id).sort((a, b) => a.idx - b.idx);
        levers.forEach((lv, i) => {
          const on = lv.state[lv.idx];
          ctx.fillStyle = on ? '#80ff90' : '#5a2020';
          ctx.fillRect(x - 10 + i * 8, y - 12, 5, 5);
          if (on) G.addLight(this.x - 8 + i * 8, this.y - 10, 20, '#80ff90', 0.6);
        });
      }
    }
  }
  G.Gate = Gate;

  class VaultReward extends Obj {
    constructor(x, y, o) {
      super(x, y, 18, 16);
      this.o = o;
      this.age = 0;
      this.pearl = o.pearl;
      this.taken = false;
      if (!this.pearl) this.chest = true;
    }
    onAdd() {
      if (this.chest) {
        W().kill(this);
        W().add(new Chest(this.cx, this.bottom, { bonus: 0.6, rune: true }));
      } else this.mapIcon = 'pearl';
    }
    prompt() { return this.taken ? null : 'Take the [pink]Pearl[]'; }
    interact(p) {
      if (this.taken) return;
      this.taken = true;
      this.mapIcon = null;
      G.save.pearls[this.pearl] = true;
      G.save.lore[this.pearl] = true;
      G.game.saveMeta();
      G.Audio.play('rune');
      const P = G.PEARLS[this.pearl];
      const n = Object.keys(G.save.pearls).length;
      G.game.banner(P.title.toUpperCase(), 'A memory of Queen Ilyse (' + n + '/4)', '#ff90d0');
      setTimeout(() => G.ui.open('lore', { title: P.title, text: P.text, isNew: true }), 1200);
      G.fx.burst(this.cx, this.cy, 40, { color: ['#ff90d0', '#ffffff'], speed: 160, life: 1, size: 2, add: true });
    }
    update(dt) { this.age += dt; }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = '#4a4050';
      ctx.fillRect(x, y - 8, 18, 8);
      ctx.fillStyle = '#6a6070';
      ctx.fillRect(x, y - 8, 18, 1);
      if (!this.taken) {
        const fy = y - 18 + Math.sin(this.age * 2) * 2;
        G.pixCircle(ctx, x + 9, fy, 4, '#f0d0e8');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 7, fy - 3, 2, 2);
        G.addLight(this.cx, fy + cy, 80, '#ff90d0', 1);
        if (Math.random() < 0.2) G.fx.spawn({ x: this.cx + (Math.random() - 0.5) * 12, y: fy + cy, vy: -20, life: 0.8, color: '#ffc0e0', size: 1, add: true });
      }
    }
  }
  G.VaultReward = VaultReward;

  const gateFor = (id) => W().ents.find((e) => e instanceof Gate && e.id === id);

  class Brazier extends Obj {
    constructor(x, y, o) {
      super(x, y, 12, 18);
      this.o = o;
      this.id = o.id;
      this.sym = o.sym;
      this.lit = false;
      this.age = Math.random() * 3;
      this.projHittable = true;
    }
    onHit() {
      if (this.lit) return;
      const all = W().ents.filter((e) => e instanceof Brazier && e.id === this.id);
      const litCount = all.filter((b) => b.lit).length;
      const expected = this.o.order[litCount];
      if (this.sym === expected) {
        this.lit = true;
        G.Audio.play('brazier', { x: this.cx });
        G.fx.burst(this.cx, this.y, 12, { color: ['#ffd060', '#ff8030'], speed: 90, life: 0.5, size: 2, add: true, angle: -Math.PI / 2, spread: 1.2 });
        if (litCount + 1 === all.length) { const g = gateFor(this.id); if (g) g.setOpen(true); }
      } else {
        G.Audio.play('wrong', { x: this.cx });
        G.game.notify('[red]The flames gutter out.[] The order was wrong.');
        for (const b of all) b.lit = false;
        G.fx.burst(this.cx, this.y, 10, { color: '#606060', speed: 50, life: 0.8, size: 4, size2: 8, type: 'smoke' });
      }
    }
    update(dt) { this.age += dt; }
    draw(ctx, cx, cy) {
      const x = Math.round(this.cx - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - 6, y - 12, 12, 4);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 2, y - 8, 4, 8); ctx.fillRect(x - 5, y - 2, 10, 2);
      G.drawSymbol(ctx, this.sym, x, y - 26, this.lit ? SYMBOLS[this.sym].color : '#6a6070');
      if (this.lit) {
        const f = Math.sin(this.age * 10) * 0.5 + 0.5;
        ctx.fillStyle = '#ff8030'; ctx.fillRect(x - 4, y - 18 - f * 2, 8, 6);
        ctx.fillStyle = '#ffd060'; ctx.fillRect(x - 2, y - 20 - f * 3, 4, 5);
        G.addLight(this.cx, this.y, 90, '#ffa050', 1);
      } else {
        ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x - 4, y - 14, 8, 2);
      }
    }
  }
  G.Brazier = Brazier;

  class Mural extends Obj {
    constructor(x, y, o) { super(x, y, 28, 30); this.o = o; this.mapIcon = 'mural'; }
    prompt() { return 'Study the mural'; }
    interact(p) {
      const names = this.o.order.map((i) => '[' + SYMBOLS[i].color + ']' + SYMBOLS[i].name + '[]').join('  then  ');
      G.ui.open('lore', { title: 'A Scorched Mural', text: 'Four flames are painted here, each beneath a sigil. Soot marks show the order in which they were lit:\n\n' + names + '\n\nSomewhere on this level, braziers bearing these sigils guard a sealed vault.', symbols: this.o.order });
      this.mapIcon = null;
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = '#4a3a3a'; ctx.fillRect(x, y - 30, 28, 22);
      ctx.fillStyle = '#6a5a4a'; ctx.fillRect(x + 1, y - 29, 26, 20);
      this.o.order.forEach((s, i) => G.drawSymbol(ctx, s, x + 5 + i * 6, y - 20, SYMBOLS[s].color));
      ctx.fillStyle = '#2a2020'; ctx.fillRect(x + 3, y - 13, 22, 1);
    }
  }
  G.Mural = Mural;

  class Lever extends Obj {
    constructor(x, y, o) {
      super(x, y, 10, 16);
      this.id = o.id;
      this.idx = o.idx;
      this.state = o.state; // shared array
      this.age = 0;
    }
    prompt() { return 'Pull lever'; }
    interact(p) {
      for (const j of [this.idx - 1, this.idx, this.idx + 1]) if (j >= 0 && j < this.state.length) this.state[j] ^= 1;
      G.Audio.play('lever', { x: this.cx });
      const g = gateFor(this.id);
      if (g && this.state.every((s) => s === 1)) g.setOpen(true);
    }
    update(dt) { this.age += dt; }
    draw(ctx, cx, cy) {
      const x = Math.round(this.cx - cx), y = Math.round(this.bottom - cy);
      const on = this.state[this.idx];
      ctx.fillStyle = '#4a4050'; ctx.fillRect(x - 5, y - 4, 10, 4);
      ctx.save();
      ctx.translate(x, y - 3);
      ctx.rotate(on ? 0.6 : -0.6);
      ctx.fillStyle = '#6a5a4a'; ctx.fillRect(-1, -12, 2, 12);
      ctx.fillStyle = on ? '#80ff90' : '#c05050'; ctx.fillRect(-2, -14, 4, 3);
      ctx.restore();
    }
  }
  G.Lever = Lever;

  class Bell extends Obj {
    constructor(x, y, o) {
      super(x, y, 12, 14);
      this.id = o.id;
      this.idx = o.idx;
      this.song = o.song;
      this.ring = 0;
      this.projHittable = true;
      this.glow = 0;
    }
    static notes() { return [67, 70, 74, 77]; }
    onHit() {
      this.play(true);
      const all = W().ents.filter((e) => e instanceof Bell && e.id === this.id);
      const st = G.game.puzzleState[this.id] || (G.game.puzzleState[this.id] = { seq: [] });
      if (st.done) return;
      st.seq.push(this.idx);
      const n = st.seq.length;
      if (st.seq[n - 1] !== this.song[n - 1]) {
        st.seq = [];
        G.setTimeoutWorld(0.4, () => { G.Audio.play('wrong'); G.game.notify('[red]Discord.[] The song must be played exactly.'); });
        return;
      }
      if (n === this.song.length) {
        st.done = true;
        G.setTimeoutWorld(0.5, () => { const g = gateFor(this.id); if (g) g.setOpen(true); });
      }
    }
    play(fx) {
      this.ring = 1;
      this.glow = 1;
      G.Audio.play('bellHit', { x: this.cx, note: Bell.notes()[this.idx] });
      if (fx) G.fx.ring(this.cx, this.cy, 14, '#ffe0a0', 0.3, 2);
    }
    update(dt) { this.ring = Math.max(0, this.ring - dt * 1.5); this.glow = Math.max(0, this.glow - dt * 1.5); }
    draw(ctx, cx, cy) {
      const x = Math.round(this.cx - cx), y = Math.round(this.y - cy);
      const sw = Math.sin(G.world.time * 25) * this.ring * 0.3;
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(x, y - 30, 1, 30);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sw);
      const col = ['#c09040', '#a0a8b0', '#60b0c0', '#b070a0'][this.idx];
      ctx.fillStyle = col;
      ctx.fillRect(-4, 0, 8, 9);
      ctx.fillRect(-6, 9, 12, 3);
      ctx.fillStyle = G.shade(col, 0.4);
      ctx.fillRect(-3, 1, 2, 7);
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(-1, 12, 2, 2);
      ctx.restore();
      if (this.glow > 0) G.addLight(this.cx, this.cy, 60 * this.glow, '#ffe0a0', this.glow);
      G.text(ctx, '' + (this.idx + 1), x, y + 16, '#8a8070', { align: 'center' });
    }
  }
  G.Bell = Bell;

  class SongStone extends Obj {
    constructor(x, y, o) { super(x, y, 16, 20); this.id = o.id; this.song = o.song; this.playing = false; }
    prompt() { return 'Touch the song-stone'; }
    interact(p) {
      if (this.playing) return;
      this.playing = true;
      const bells = W().ents.filter((e) => e instanceof Bell && e.id === this.id).sort((a, b) => a.idx - b.idx);
      const st = G.game.puzzleState[this.id] || (G.game.puzzleState[this.id] = { seq: [] });
      st.seq = [];
      this.song.forEach((n, i) => G.setTimeoutWorld(0.3 + i * 0.6, () => bells[n] && bells[n].play(false)));
      G.setTimeoutWorld(0.3 + this.song.length * 0.6, () => { this.playing = false; G.game.notify('Strike the bells in the same order.'); });
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.fillStyle = '#5a5a6a'; ctx.fillRect(x, y - 18, 16, 18);
      ctx.fillStyle = '#7a7a8a'; ctx.fillRect(x, y - 18, 16, 1);
      ctx.fillStyle = this.playing ? '#ffe0a0' : '#a0a0b0';
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 3 + i * 4, y - 13 + (i % 2) * 3, 2, 2);
      if (this.playing) G.addLight(this.cx, this.cy, 50, '#ffe0a0', 0.8);
    }
  }
  G.SongStone = SongStone;

  class Plate extends G.Entity {
    constructor(x, y, o) { super(x - 10, y - 3, 20, 3); this.id = o.id; this.layer = 0; this.down = false; }
    update(dt) {
      let pressed = false;
      const p = W().player;
      if (p && G.rectsOverlap(this.x, this.y - 4, this.w, 8, p.x, p.y, p.w, p.h)) pressed = true;
      for (const e of W().ents) if (e instanceof Crate && G.rectsOverlap(this.x, this.y - 4, this.w, 8, e.x, e.y, e.w, e.h)) pressed = true;
      if (pressed !== this.down) {
        this.down = pressed;
        G.Audio.play('lever', { x: this.cx });
        const g = gateFor(this.id);
        if (g) g.setOpen(pressed);
        if (pressed && !this.everPressed) { this.everPressed = true; }
      }
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      ctx.fillStyle = '#3a3a44';
      ctx.fillRect(x - 1, y + 1, 22, 2);
      ctx.fillStyle = this.down ? '#80ff90' : '#8a8a96';
      ctx.fillRect(x + 1, y + (this.down ? 1 : 0), 18, this.down ? 1 : 2);
      if (this.down) G.addLight(this.cx, this.y, 30, '#80ff90', 0.6);
    }
  }
  G.Plate = Plate;

  class Crate extends G.Entity {
    constructor(x, y, o) {
      super(x - 9, y - 18, 18, 18);
      this.solid = true;
      this.canBeSolid = true;
      this.layer = 1;
      this.id = o.id;
    }
    ignoreSolid(s) { return s instanceof Gate && s.openAmt > 0.5; }
    update(dt) {
      this.vy = Math.min(400, this.vy + 1200 * dt);
      const r = this.moveY(this.vy * dt);
      if (r === 'floor') this.vy = 0;
      this.vx *= 0.8;
    }
    push(dx) {
      const before = this.x;
      this.solid = false;
      this.moveX(dx);
      this.solid = true;
      if (Math.abs(this.x - before) > 0.1 && Math.random() < 0.15) G.Audio.play('step', { x: this.cx, vol: 0.4 });
      return Math.abs(this.x - before) > 0.05;
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      ctx.fillStyle = '#4a3020'; ctx.fillRect(x, y, 18, 18);
      ctx.fillStyle = '#7a5a38'; ctx.fillRect(x + 1, y + 1, 16, 16);
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(x + 1, y + 8, 16, 2);
      G.pixLine(ctx, x + 2, y + 2, x + 15, y + 15, '#4a3020');
      ctx.fillStyle = '#9a7a50'; ctx.fillRect(x + 1, y + 1, 16, 1);
    }
  }
  G.Crate = Crate;
  // player pushes crates
  G.Player.prototype.pushSolid = function (s, dx) {
    if (s instanceof Crate && this.onGround) return s.push(dx * 0.7);
    return false;
  };

  // ------------------------------------------------------------------ the Lantern
  class LanternObj extends Obj {
    constructor(x, y) { super(x, y, 30, 40); this.range = 10; }
    prompt() { return G.game.bossDefeated && !G.world.level.lanternLit ? '[orange]Relight the Lantern[]' : null; }
    interact(p) {
      if (!G.game.bossDefeated || G.world.level.lanternLit) return;
      G.game.relightLantern();
    }
    draw() {}
  }
  G.LanternObj = LanternObj;

  // starting gear pedestal (Undercroft)
  G.spawnStartGear = (x, y) => {
    const rng = G.rng;
    const melee = G.hasUpgrade('kit3') ? rng.shuffle(G.itemPool(['melee'])).slice(0, 2) : ['rusty_blade'];
    const secPool = G.itemPool(['ranged', 'shield']);
    const second = G.hasUpgrade('kit1') ? rng.shuffle(secPool).slice(0, 2) : [rng.pick(['driftwood_bow', 'driftplank_shield'])];
    let i = 0;
    const items = [];
    for (const id of melee) items.push(G.makeItem(id, 1, rng, { q: 0 }));
    for (const id of second) items.push(G.makeItem(id, 1, rng, { q: 0 }));
    if (G.hasUpgrade('kit2')) items.push(G.makeItem(rng.pick(G.itemPool(['skill'])), 1, rng, { q: 0 }));
    for (const it of items) { W().add(new ItemDrop(x + i * 22, y, it, { pedestal: true })); i++; }
  };
})();
