'use strict';
// ============================================================================
// World & entity physics
// ============================================================================
(function () {
  const G = window.G;
  const TS = G.TS;

  class Entity {
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.vx = 0;
      this.vy = 0;
      this.onGround = false;
      this.dead = false;
      this.layer = 1;
      this.solid = false; // blocks other movers
      this.facing = 1;
    }
    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }
    get bottom() { return this.y + this.h; }
    setFeet(x, y) {
      this.x = x - this.w / 2;
      this.y = y - this.h;
    }
    blockedBySolids(nx, ny) {
      for (const s of G.world.solids) {
        if (s === this || s.dead || !s.solid) continue;
        if (this.ignoreSolid && this.ignoreSolid(s)) continue;
        if (nx < s.x + s.w && nx + this.w > s.x && ny < s.y + s.h && ny + this.h > s.y) return s;
      }
      return null;
    }
    moveX(dx) {
      if (!dx) return false;
      const L = G.world.level;
      const steps = Math.max(1, Math.ceil(Math.abs(dx) / 6));
      const s = dx / steps;
      for (let i = 0; i < steps; i++) {
        const nx = this.x + s;
        if (L.rectSolid(nx, this.y, this.w, this.h)) {
          if (s > 0) this.x = Math.floor((nx + this.w) / TS) * TS - this.w - 0.001;
          else this.x = Math.floor(nx / TS) * TS + TS + 0.001;
          if (L.rectSolid(this.x, this.y, this.w, this.h)) this.x = nx - s;
          return true;
        }
        const b = this.blockedBySolids(nx, this.y);
        if (b) {
          if (this.pushSolid && this.pushSolid(b, s) && !this.blockedBySolids(nx, this.y)) { this.x = nx; continue; }
          if (s > 0) this.x = Math.min(this.x, b.x - this.w - 0.001);
          else this.x = Math.max(this.x, b.x + b.w + 0.001);
          return true;
        }
        this.x = nx;
      }
      return false;
    }
    // returns 'floor' | 'ceil' | false
    moveY(dy, dropThrough) {
      if (!dy) return false;
      const L = G.world.level;
      const steps = Math.max(1, Math.ceil(Math.abs(dy) / 6));
      const s = dy / steps;
      for (let i = 0; i < steps; i++) {
        const ny = this.y + s;
        if (s > 0) {
          // one-way platforms
          if (!dropThrough) {
            const oldB = this.y + this.h, newB = ny + this.h;
            const ty = Math.floor((newB - 0.001) / TS);
            const top = ty * TS;
            if (oldB <= top + 0.5 && newB >= top) {
              const x0 = Math.floor(this.x / TS), x1 = Math.floor((this.x + this.w - 0.001) / TS);
              for (let tx = x0; tx <= x1; tx++)
                if (L.isOneWay(tx, ty)) {
                  this.y = top - this.h;
                  return 'floor';
                }
            }
          }
          if (L.rectSolid(this.x, ny, this.w, this.h)) {
            this.y = Math.floor((ny + this.h) / TS) * TS - this.h - 0.001;
            if (L.rectSolid(this.x, this.y, this.w, this.h)) this.y = ny - s;
            return 'floor';
          }
          const b = this.blockedBySolids(this.x, ny);
          if (b) { this.y = b.y - this.h - 0.001; return 'floor'; }
        } else {
          if (L.rectSolid(this.x, ny, this.w, this.h)) {
            this.y = Math.floor(ny / TS) * TS + TS + 0.001;
            if (L.rectSolid(this.x, this.y, this.w, this.h)) this.y = ny - s;
            return 'ceil';
          }
          const b = this.blockedBySolids(this.x, ny);
          if (b) { this.y = b.y + b.h + 0.001; return 'ceil'; }
        }
        this.y = ny;
      }
      return false;
    }
    // is there ground directly under the feet (tile or platform)?
    groundCheck() {
      const L = G.world.level;
      const y = this.y + this.h + 1;
      const ty = Math.floor(y / TS);
      const x0 = Math.floor((this.x + 1) / TS), x1 = Math.floor((this.x + this.w - 1) / TS);
      for (let tx = x0; tx <= x1; tx++) {
        if (L.isSolid(tx, ty)) return true;
        if (L.isOneWay(tx, ty) && this.y + this.h <= ty * TS + 1) return true;
      }
      for (const s of G.world.solids) {
        if (s === this || s.dead || !s.solid) continue;
        if (this.x < s.x + s.w && this.x + this.w > s.x && Math.abs(this.y + this.h - s.y) < 1.5) return true;
      }
      return false;
    }
    // ledge check for AI: is there floor ahead at distance dx?
    floorAhead(dx) {
      const L = G.world.level;
      const x = dx > 0 ? this.x + this.w + dx : this.x + dx;
      const ty = Math.floor((this.y + this.h + 2) / TS);
      const tx = Math.floor(x / TS);
      return L.isSolid(tx, ty) || L.isOneWay(tx, ty);
    }
    wallAhead(dx) {
      const L = G.world.level;
      const x = dx > 0 ? this.x + this.w + dx : this.x + dx;
      return L.rectSolid(x, this.y + 2, 1, this.h - 4) || !!this.blockedBySolids(this.x + dx, this.y);
    }
    update() {}
    draw() {}
  }
  G.Entity = Entity;

  const world = (G.world = {
    level: null,
    player: null,
    ents: [],
    enemies: [],
    solids: [],
    interactables: [],
    time: 0,
    bg: null,
    reset(level) {
      this.level = level;
      this.ents = [];
      this.enemies = [];
      this.solids = [];
      this.interactables = [];
      this.time = 0;
      this.boss = null;
      G.fx.clear();
      G.Ambient.clear();
    },
    add(e) {
      this.ents.push(e);
      if (e.isEnemy) this.enemies.push(e);
      if (e.solid || e.canBeSolid) this.solids.push(e);
      if (e.interact) this.interactables.push(e);
      if (e.onAdd) e.onAdd();
      return e;
    },
    update(dt) {
      this.time += dt;
      const list = this.ents;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.dead) e.update(dt);
      }
      if (this.anyDead) {
        this.ents = this.ents.filter((e) => !e.dead);
        this.enemies = this.enemies.filter((e) => !e.dead);
        this.solids = this.solids.filter((e) => !e.dead);
        this.interactables = this.interactables.filter((e) => !e.dead);
        this.anyDead = false;
      }
    },
    kill(e) {
      e.dead = true;
      this.anyDead = true;
    },
    draw(ctx, cx, cy) {
      const sorted = this.ents.slice().sort((a, b) => a.layer - b.layer);
      for (const e of sorted) {
        if (e.dead) continue;
        if (e.x + e.w < cx - 96 || e.x > cx + G.W + 96 || e.y + e.h < cy - 128 || e.y > cy + G.H + 128) {
          if (!e.alwaysDraw) continue;
        }
        e.draw(ctx, cx, cy);
      }
    },
    enemiesIn(x, y, w, h) {
      const out = [];
      for (const e of this.enemies) {
        if (e.dead || e.dying) continue;
        const hb = e.hurtbox ? e.hurtbox() : e;
        if (x < hb.x + hb.w && x + w > hb.x && y < hb.y + hb.h && y + h > hb.y) out.push(e);
      }
      return out;
    },
    nearestEnemy(x, y, range, filter) {
      let best = null, bd = range;
      for (const e of this.enemies) {
        if (e.dead || e.dying || e.hidden) continue;
        if (filter && !filter(e)) continue;
        const d = Math.hypot(e.cx - x, e.cy - y);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    },
    // objects hittable by player attacks (breakables, doors, braziers, bells)
    hittablesIn(x, y, w, h) {
      const out = [];
      for (const e of this.ents) {
        if (e.dead || !e.onHit) continue;
        if (x < e.x + e.w && x + w > e.x && y < e.y + e.h && y + h > e.y) out.push(e);
      }
      return out;
    },
  });
})();
