'use strict';
/* UNDERSONG — populate: turn a generated cave into a place.
   Each zone registers a content table in G.ZONE_CONTENT[idx]:
     decorAt(zone, rng, x, y, nx, ny, ctx)   called for every wall sample
     hostiles: [{type, cost, minT, w, wall}]  spawn table (t = 0 top .. 1 bottom of zone)
     budget(t)                                encounter size for a room at depth t
     ambient(zone, rng, H)                    free-form extras
     boss: 'type'                             sleeps in the arena
   H is the helper object below. */
(function () {
  const { sin, cos, min, max, abs, floor, hypot, PI } = Math;
  const TAU = G.TAU;
  G.ZONE_CONTENT = [];

  const H = G.popHelp = {
    // a random open spot within `rad` of (cx,cy) with at least `clear` px to rock
    open(rng, cx, cy, rad, clear) {
      for (let i = 0; i < 30; i++) {
        const a = rng.ang(), d = rng.range(0, rad), x = cx + cos(a) * d, y = cy + sin(a) * d * 0.8;
        if (G.sdf(x, y) > clear) return { x, y };
      }
      return G.sdf(cx, cy) > clear * 0.6 ? { x: cx, y: cy } : null;
    },
    // a wall sample within `rad` of (cx,cy); kind: 'floor' | 'ceil' | 'wall' | undefined (any)
    surface(rng, cx, cy, rad, kind, front) {
      const s = G.zone.surf, n = s.length >> 2, r2 = rad * rad, picks = [];
      for (let i = 0; i < n; i++) {
        const x = s[i * 4], y = s[i * 4 + 1];
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r2) continue;
        const ny = s[i * 4 + 3];
        if (kind === 'floor' && ny > -0.65) continue;
        if (kind === 'ceil' && ny < 0.65) continue;
        if (kind === 'wall' && abs(ny) > 0.6) continue;
        if (front && G.sdf(x + s[i * 4 + 2] * front, y + ny * front) < front * 0.6) continue;
        picks.push(i);
      }
      if (!picks.length) return null;
      const i = picks[floor(rng() * picks.length)];
      return { x: s[i * 4], y: s[i * 4 + 1], nx: s[i * 4 + 2], ny: s[i * 4 + 3] };
    },
    // spend an encounter budget from the zone's table around a point
    encounter(zone, rng, cx, cy, rad, budget, t) {
      const table = G.ZONE_CONTENT[zone.idx].hostiles.filter(h => (h.minT || 0) <= t && (h.maxT === undefined || h.maxT >= t));
      let guard = 0;
      const made = [];
      while (budget > 0 && guard++ < 40) {
        const opts = table.filter(h => h.cost <= budget);
        if (!opts.length) break;
        const h = rng.weighted(opts, o => o.w || 1);
        let c = null;
        if (h.wall) {
          const sp = this.surface(rng, cx, cy, rad, h.wall === true ? undefined : h.wall, 50);
          if (sp && !this.crowded(sp.x, sp.y, 70)) {
            const off = h.sink === undefined ? G.CREATURES[h.type].r - 3 : h.sink;
            c = G.creatures.spawn(h.type, sp.x + sp.nx * off, sp.y + sp.ny * off, { nx: sp.nx, ny: sp.ny });
          }
        } else {
          const p = this.open(rng, cx, cy, rad * 0.8, G.CREATURES[h.type].r + 16);
          if (p) c = G.creatures.spawn(h.type, p.x, p.y);
        }
        if (c) made.push(c);
        budget -= h.cost;
      }
      return made;
    },
    crowded(x, y, r) { for (const c of G.ents.creatures) if (G.dist2(c.x, c.y, x, y) < r * r) return true; for (const p of G.ents.props) if (G.dist2(p.x, p.y, x, y) < r * r) return true; return false; },
    specimens: null,
    // attach a scannable marker to scenery, a few per species per zone
    specimen(id, x, y, cap, r) {
      const n = this.specimens[id] || 0;
      if (n >= (cap || 2)) return;
      this.specimens[id] = n + 1;
      G.props.add('specimen', x, y, { codex: id, r: r || 26 });
    },
  };

  G.populate = function (zone) {
    const content = G.ZONE_CONTENT[zone.idx];
    G.decor.clear();
    H.specimens = {};
    if (!content) return;
    const rng = G.RNG((zone.seed ^ 0x5bd1e995) >>> 0);
    const A = zone.arena;

    // ---- scenery on every wall sample
    const s = zone.surf, n = s.length >> 2;
    if (content.decorAt) for (let i = 0; i < n; i++) content.decorAt(zone, rng, s[i * 4], s[i * 4 + 1], s[i * 4 + 2], s[i * 4 + 3]);

    // ---- side pockets
    const kinds = (content.pockets || ['pod', 'cleaner', 'wreck', 'pod', 'nest', 'pod']).slice(0, zone.pockets.length);
    // the wreck goes in the lower half when it can
    zone.pockets.forEach((pk, i) => { pk.kind = kinds[i] || 'pod'; });
    for (const pk of zone.pockets) {
      const fl = H.surface(rng, pk.x, pk.y + pk.r * 0.4, pk.r * 1.1, 'floor', 40) || { x: pk.x, y: pk.y + pk.r * 0.5, nx: 0, ny: -1 };
      const px = fl.x + fl.nx * 22, py = fl.y + fl.ny * 22;
      if (pk.kind === 'pod') { G.props.add('pod', px, py, { rare: false }); H.encounter(zone, rng, pk.x, pk.y, pk.r, content.budget(pk.t) * 0.5, pk.t); }
      else if (pk.kind === 'cleaner') G.props.add('cleaner', px, py + 4);
      else if (pk.kind === 'wreck') G.props.add('wreck', px, py, { n: zone.idx, nx: fl.nx, ny: fl.ny });
      else if (pk.kind === 'nest') { G.props.add('pod', px, py, { rare: true }); H.encounter(zone, rng, pk.x, pk.y, pk.r, content.budget(pk.t) * 1.5, pk.t); }
    }

    // ---- rooms and tunnels
    for (const c of zone.chambers) H.encounter(zone, rng, c.x, c.y, c.r, content.budget(c.t), c.t);
    let k = 0;
    for (const p of zone.path) {
      k++;
      if (p.y < (content.safeTop || 700) || p.y > A.gateY - 260) continue;
      if (zone.chambers.some(c => G.dist2(c.x, c.y, p.x, p.y) < (c.r + 120) * (c.r + 120))) continue;
      if (k % 3 === 0 && rng.chance(0.5)) H.encounter(zone, rng, p.x, p.y, p.r + 30, max(1, content.budget(p.y / zone.pxH) * 0.34), p.y / zone.pxH);
    }

    // ---- boss + the way out
    if (zone.exit.plugY < 1e8) G.props.add('barrier', zone.exit.x, zone.exit.plugY);
    if (content.boss) {
      const b = G.creatures.spawn(content.boss, A.x, A.y - A.ry * 0.1);
      if (b) { b.asleep = true; zone.boss = b; }
    }
    if (content.ambient) content.ambient(zone, rng, H);
  };

  // ================================================================= zone 0: the Shallows
  G.ZONE_CONTENT[0] = {
    boss: 'mantis', safeTop: 1200,
    pockets: ['pod', 'cleaner', 'wreck', 'pod', 'nest'],
    hostiles: [
      { type: 'puffer', cost: 2, w: 3 },
      { type: 'urchin', cost: 1, w: 3, wall: true },
      { type: 'barracuda', cost: 3, w: 2, minT: 0.28 },
      { type: 'moray', cost: 3, w: 1.5, minT: 0.36, wall: 'wall', sink: 2 },
    ],
    budget: t => 2.5 + t * 6.5,
    decorAt(zone, rng, x, y, nx, ny) {
      if (y < zone.surfaceY + 30) return;
      const D = G.decor, r = rng(), floorish = ny < -0.72, ceil = ny > 0.7;
      const lagoon = y < zone.floorY(x) + 40;
      const s = rng.range(0.85, 1.2);
      if (floorish) {
        if (lagoon) {
          if (r < 0.1) { if (G.sdf(x, y - 220) > 60) { D.add('kelp', x, y + 6, nx, ny, { s, len: rng.int(8, 14) }); H.specimen('kelp', x, y - 90, 2, 40); } }
          else if (r < 0.27) D.add('seagrass', x, y + 2, nx, ny, { s });
          else if (r < 0.315) D.add('lump', x, y + 4, nx, ny, { s });
          else if (r < 0.35) { const tenant = rng.chance(0.3); D.add('anemone', x, y, nx, ny, { s, tenant }); if (tenant) H.specimen('clownfish', x + nx * 30, y + ny * 30, 3, 22); else H.specimen('anemone', x + nx * 12, y + ny * 12, 2, 22); }
          else if (r < 0.372) { D.add('clam', x, y, nx, ny, { s }); H.specimen('clam', x + nx * 8, y + ny * 8, 3, 22); }
          else if (r < 0.386) { if (!zone._eels || abs(zone._eels - x) > 260) { zone._eels = x; D.add('eels', x, y + 2, nx, ny); H.specimen('gardeneel', x, y - 20, 4, 44); } }
          else if (r < 0.41) D.add('star', x, y, nx, ny, { s });
          else if (r < 0.44) { D.add('fan', x, y + 3, nx, ny, { s }); H.specimen('fan', x + nx * 40, y + ny * 40, 2, 30); }
          else if (r < 0.446) D.add('bubbler', x, y, nx, ny);
        } else {
          if (r < 0.07) D.add('seagrass', x, y + 2, nx, ny, { s });
          else if (r < 0.105) { if (G.sdf(x, y - 110) > 30) D.add('kelp', x, y + 6, nx, ny, { s: 0.85, len: rng.int(4, 7) }); }
          else if (r < 0.14) { const tenant = rng.chance(0.25); D.add('anemone', x, y, nx, ny, { s, tenant }); if (tenant) H.specimen('clownfish', x + nx * 30, y + ny * 30, 3, 22); }
          else if (r < 0.16) { D.add('clam', x, y, nx, ny, { s }); H.specimen('clam', x + nx * 8, y + ny * 8, 3, 22); }
          else if (r < 0.19) D.add('lump', x, y + 4, nx, ny, { s });
          else if (r < 0.205) D.add('star', x, y, nx, ny, { s });
          else if (r < 0.24) D.add('fan', x, y + 3, nx, ny, { s });
          else if (r < 0.246) D.add('bubbler', x, y, nx, ny);
        }
      } else if (ceil) {
        if (r < 0.035) D.add('fan', x, y - 3, nx, ny, { s: s * 0.8 });
        else if (r < 0.06) { D.add('xmas', x, y, nx, ny); H.specimen('xmas', x + nx * 8, y + ny * 8, 3, 24); }
      } else {
        if (r < 0.04) D.add('fan', x - nx * 3, y - ny * 3, nx, ny, { s });
        else if (r < 0.075) { D.add('xmas', x, y, nx, ny); H.specimen('xmas', x + nx * 8, y + ny * 8, 3, 24); }
        else if (r < 0.09) D.add('star', x, y, nx, ny, { s });
        else if (r < 0.11) D.add('anemone', x, y, nx, ny, { s });
      }
    },
    ambient(zone, rng, H) {
      const W = zone.pxW, sy = zone.surfaceY, CR = G.creatures;
      // the lagoon: gentle company and a first, mild lesson
      for (let i = 0; i < 3; i++) { const x = rng.range(300, W - 300), y = sy + rng.range(160, 380); if (G.sdf(x, y) > 60) CR.spawn('school', x, y); }
      for (let i = 0; i < 2; i++) { const x = rng.range(400, W - 400), y = sy + rng.range(200, 400); if (G.sdf(x, y) > 70) CR.spawn('turtle', x, y); }
      for (let i = 0; i < 5; i++) { const fl = H.surface(rng, rng.range(250, W - 250), zone.floorY(W / 2), 520, 'floor', 30); if (fl) CR.spawn('garibaldi', fl.x + fl.nx * 46, fl.y + fl.ny * 46); }
      for (let i = 0; i < 6; i++) { const fl = H.surface(rng, rng.range(200, W - 200), zone.floorY(W / 2), 560, 'floor', 20); if (fl) CR.spawn('crab', fl.x + fl.nx * 8, fl.y + fl.ny * 8); }
      const hx = zone.holeX, hy = zone.holeY;
      for (let i = 0; i < 2; i++) { const p = H.open(rng, hx + (i ? 1 : -1) * rng.range(240, 420), hy - rng.range(120, 220), 60, 40); if (p) CR.spawn('puffer', p.x, p.y); }
      for (let i = 0; i < 3; i++) { const fl = H.surface(rng, hx, hy, 300, 'floor', 30); if (fl && !H.crowded(fl.x, fl.y, 60)) CR.spawn('urchin', fl.x + fl.nx * 12, fl.y + fl.ny * 12, { nx: fl.nx, ny: fl.ny }); }
      // the reef caves
      for (const c of zone.chambers) {
        if (rng.chance(0.6)) { const p = H.open(rng, c.x, c.y, c.r * 0.5, 50); if (p) CR.spawn('school', p.x, p.y, { n: rng.int(10, 18) }); }
        if (rng.chance(0.5)) { const p = H.open(rng, c.x, c.y, c.r * 0.7, 30); if (p) CR.spawn('garibaldi', p.x, p.y); }
        for (let i = 0; i < 2; i++) { const sp = H.surface(rng, c.x, c.y, c.r * 1.2, undefined, 20); if (sp && rng.chance(0.6)) CR.spawn('crab', sp.x + sp.nx * 8, sp.y + sp.ny * 8); }
      }
    },
  };
})();
