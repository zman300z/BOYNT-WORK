'use strict';
// ============================================================================
// Level generation: procedural biomes, passage, boss arenas
// ============================================================================
(function () {
  const G = window.G;
  const T = G.T;
  const TS = G.TS;
  const CW = 36, CH = 22;
  G.CELL_W = CW;
  G.CELL_H = CH;
  const FLYERS = new Set(['gullbat', 'glowmoth', 'wraith', 'skulls']);
  G.FLYERS = FLYERS;

  G.genBiomeLevel = function (biomeId, seed) {
    const B = G.BIOMES[biomeId];
    const rng = new G.RNG(seed);
    const save = G.save;
    const gw = B.grid[0], gh = B.grid[1], GH = gh + 2;
    const L = new G.Level(gw * CW, GH * CH, biomeId);
    L.seed = seed;
    L.tier = B.tier;
    const cells = [];
    for (let cy = 0; cy < GH; cy++) {
      cells.push([]);
      for (let cx = 0; cx < gw; cx++) cells[cy].push({ cx, cy, active: false, edges: {}, type: 'normal', deg: 0, dist: 0, inline: [] });
    }
    const cellAt = (cx, cy) => (cx >= 0 && cy >= 0 && cx < gw && cy < GH ? cells[cy][cx] : null);
    const inMain = (c) => c.cy >= 1 && c.cy <= gh;

    // ---------------------------------------------------- 1. grow active cells
    const start = cells[1 + rng.int(0, gh - 1)][0];
    start.active = true;
    start.type = 'start';
    const active = [start];
    const target = Math.max(4, Math.round(gw * gh * B.fill));
    let guard = 0;
    while (active.length < target && guard++ < 8000) {
      const c = rng.pick(active);
      const d = rng.weighted([[1, 0, 1.6], [-1, 0, 0.6], [0, 1, 0.8], [0, -1, 0.8]], (x) => x[2]);
      const n = cellAt(c.cx + d[0], c.cy + d[1]);
      if (n && inMain(n) && !n.active) { n.active = true; active.push(n); }
    }

    // ---------------------------------------------------- 2. connections
    function connect(a, b, gate) {
      let e;
      if (a.cy === b.cy) {
        const left = a.cx < b.cx ? a : b, right = left === a ? b : a;
        e = { kind: 'h', left, right, floor: rng.int(CH - 9, CH - 4), gate: gate || null };
        left.edges.R = e;
        right.edges.L = e;
      } else {
        const up = a.cy < b.cy ? a : b, dn = up === a ? b : a;
        let sx = up.type === 'start' || dn.type === 'start' ? rng.int(13, CW - 9) : rng.int(5, CW - 9);
        // keep shafts away from each other within a cell
        const other = (up.edges.U && up.edges.U.sx) || (dn.edges.D && dn.edges.D.sx);
        if (other !== undefined && other !== null && Math.abs(other - sx) < 7) sx = other < CW / 2 ? rng.int(CW / 2 + 2, CW - 9) : rng.int(5, CW / 2 - 6);
        e = { kind: 'v', up, dn, sx, gate: gate || null };
        up.edges.D = e;
        dn.edges.U = e;
      }
      a.deg++;
      b.deg++;
      return e;
    }
    const inTree = new Set([start]);
    const frontier = [];
    const addFrontier = (c) => {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = cellAt(c.cx + dx, c.cy + dy);
        if (n && n.active && !inTree.has(n)) frontier.push({ a: c, b: n, w: dy === 0 ? rng.next() : rng.next() * 1.7 + 0.25 });
      }
    };
    addFrontier(start);
    while (frontier.length) {
      let mi = 0;
      for (let i = 1; i < frontier.length; i++) if (frontier[i].w < frontier[mi].w) mi = i;
      const e = frontier.splice(mi, 1)[0];
      if (inTree.has(e.b)) continue;
      inTree.add(e.b);
      connect(e.a, e.b);
      addFrontier(e.b);
    }
    for (const c of active)
      for (const [dx, dy, dir] of [[1, 0, 'R'], [0, 1, 'D']]) {
        const n = cellAt(c.cx + dx, c.cy + dy);
        if (n && n.active && !c.edges[dir] && rng.chance(B.loops)) connect(c, n);
      }

    // ---------------------------------------------------- 3. distances
    const bfs = () => {
      for (const c of active) c.dist = 999;
      start.dist = 0;
      const q = [start];
      while (q.length) {
        const c = q.shift();
        for (const k in c.edges) {
          const e = c.edges[k];
          const n = e.kind === 'h' ? (e.left === c ? e.right : e.left) : e.up === c ? e.dn : e.up;
          if (n.dist > c.dist + 1) { n.dist = c.dist + 1; q.push(n); }
        }
      }
    };
    bfs();
    const maxDist = Math.max(...active.map((c) => c.dist));

    // ---------------------------------------------------- 4. exits
    const freeExits = B.exits.filter((e) => !e.rune);
    const gatedExits = B.exits.filter((e) => e.rune);
    const byDist = active.filter((c) => c !== start).sort((a, b) => b.dist - a.dist || b.cx - a.cx);
    const pickFar = (exclude) => {
      const leaves = byDist.filter((c) => c.deg === 1 && c.type === 'normal' && !exclude(c));
      const good = leaves.filter((c) => c.dist >= maxDist * 0.6);
      if (good.length) return good[0];
      const any = byDist.filter((c) => c.type === 'normal' && !exclude(c));
      return any[0];
    };
    const exitCells = [];
    for (let i = 0; i < freeExits.length; i++) {
      const c = pickFar((c) => exitCells.some((x) => Math.abs(x.cx - c.cx) + Math.abs(x.cy - c.cy) < 2));
      if (!c) break;
      c.type = 'exit';
      c.exitTo = freeExits[i].to;
      exitCells.push(c);
    }

    // ---------------------------------------------------- 5. rune-gated cells
    const gatedCells = [];
    function addGated(rune, purpose, extra) {
      const dir = rune === 'ram' ? 1 : -1;
      const cands = active.filter((c) => {
        if (c.type !== 'normal' || c === start) return false;
        const n = cellAt(c.cx, c.cy + dir);
        if (!n || n.active) return false;
        if (dir === -1 && c.edges.U) return false;
        if (dir === 1 && c.edges.D) return false;
        return true;
      });
      if (!cands.length) return null;
      if (purpose === 'exit') cands.sort((a, b) => b.dist - a.dist);
      else rng.shuffle(cands);
      const p = cands[0];
      const n = cellAt(p.cx, p.cy + dir);
      n.active = true;
      n.type = 'gated';
      n.gate = rune;
      n.purpose = purpose;
      Object.assign(n, extra || {});
      active.push(n);
      const e = connect(p, n, rune);
      n.dist = p.dist + 1;
      gatedCells.push(n);
      return n;
    }
    for (const ge of gatedExits) {
      const n = addGated(ge.rune, 'exit', { exitTo: ge.to });
      if (n) exitCells.push(n);
    }
    for (const r of B.runeRooms || []) if (rng.chance(0.55)) addGated(r, 'treasure');

    // ---------------------------------------------------- 6. specials
    const leaves = rng.shuffle(active.filter((c) => c.deg === 1 && c.type === 'normal'));
    const normals = () => active.filter((c) => c.type === 'normal' && c !== start);
    let specials = (B.specials || []).slice();
    const foundLore = (save && save.lore) || {};
    const unfoundLore = (B.lore || []).filter((id) => !foundLore[id]);
    let loreQueue = rng.shuffle(unfoundLore.slice());
    let loreCount = specials.filter((s) => s === 'lore').length;
    specials = specials.filter((s) => s !== 'lore');
    const nLore = Math.min(loreCount, Math.max(loreQueue.length, 1));
    const cursedOk = rng.chance(0.55);
    specials = specials.filter((s) => s !== 'cursed' || cursedOk);
    if (B.timed) specials.push('timed');
    const prio = { guardian: 0, puzzle: 1, shop: 2, timed: 3, treasure: 4, scroll: 5, cursed: 6 };
    specials.sort((a, b) => (prio[a] || 9) - (prio[b] || 9));
    for (let i = 0; i < nLore; i++) specials.push('lore');
    const exitSet = new Set(exitCells);
    for (const sp of specials) {
      let leaf = null;
      if (sp === 'timed') {
        // prefer a leaf near an exit
        leaf = leaves.find((c) => c.type === 'normal' && [...exitSet].some((e) => Math.abs(e.cx - c.cx) + Math.abs(e.cy - c.cy) <= 2));
        if (leaf) leaves.splice(leaves.indexOf(leaf), 1);
      }
      if (!leaf) {
        while (leaves.length && !leaf) {
          const l = leaves.pop();
          if (l.type === 'normal') leaf = l;
        }
      }
      if (leaf) {
        leaf.type = sp;
        if (sp === 'lore') leaf.loreId = loreQueue.pop() || rng.pick(B.lore);
      } else if (['shop', 'scroll', 'lore', 'treasure'].includes(sp)) {
        const ns = normals().filter((c) => c.inline.length === 0);
        if (ns.length) {
          const c = rng.pick(ns);
          c.inline.push(sp === 'lore' ? { kind: 'lore', id: loreQueue.pop() || rng.pick(B.lore) } : { kind: sp });
        }
      }
    }
    // rune guardians are essential for progression: always place one
    if (B.guardian && !active.some((c) => c.type === 'guardian')) {
      const cands = normals().filter((c) => c.dist >= 2 && !c.inline.length).sort((a, b) => b.dist - a.dist);
      const c = cands[0] || normals().sort((a, b) => b.dist - a.dist)[0];
      if (c) c.type = 'guardian';
    }
    // scrolls placed inline to reach quota
    let scrollCount = active.filter((c) => c.type === 'scroll').length + active.reduce((n, c) => n + c.inline.filter((x) => x.kind === 'scroll').length, 0);
    const scrollCands = rng.shuffle(normals().filter((c) => c.dist >= 1));
    for (const c of scrollCands) {
      if (scrollCount >= (B.scrolls || 2)) break;
      if (c.inline.some((x) => x.kind === 'scroll')) continue;
      c.inline.push({ kind: 'scroll' });
      scrollCount++;
    }
    // Mara the cartographer
    const metMara = save && save.flags && save.flags.metMara;
    if (!metMara && biomeId === 'undercroft') {
      const c = normals().filter((c) => c.dist >= 1 && c.dist <= 2 && !c.inline.length)[0] || normals()[0];
      if (c) { c.mara = true; c.noEnemies = true; }
    } else if (metMara && rng.chance(0.3)) {
      const c = rng.pick(normals().filter((c) => c.dist >= 1) || []);
      if (c) { c.mara = true; c.noEnemies = true; }
    }
    // elite
    let eliteCells = 0;
    const eliteChance = B.elite || 0;
    if (rng.chance(eliteChance)) {
      const cands = normals().filter((c) => c.dist >= 2 && !c.noEnemies);
      if (cands.length) { rng.pick(cands).elite = true; eliteCells++; }
    }
    if (B.tier >= 3 && rng.chance(eliteChance * 0.5)) {
      const cands = normals().filter((c) => c.dist >= 2 && !c.elite && !c.noEnemies);
      if (cands.length) rng.pick(cands).elite = true;
    }

    // ---------------------------------------------------- 7. carve cells
    const puzzleCells = [];
    for (const c of active) carveCell(L, c, rng, B);
    // secret alcoves behind breakable walls
    let alcoves = 0;
    for (const c of rng.shuffle(active.slice())) {
      if (alcoves >= 2) break;
      if (c.type !== 'normal' || !c.ground) continue;
      for (const side of rng.shuffle(['L', 'R'])) {
        if (c.edges[side]) continue;
        const n = cellAt(c.cx + (side === 'R' ? 1 : -1), c.cy);
        if (!n || n.active || n.used) continue;
        const gx = side === 'R' ? CW - 2 : 1;
        const f = c.ground[gx];
        if (f < 6) continue;
        n.used = true;
        const ox = c.cx * CW, oy = c.cy * CH;
        const wallX = side === 'R' ? ox + CW - 1 : ox;
        const dir = side === 'R' ? 1 : -1;
        // make sure the room reaches the wall at floor level
        for (let y = f - 3; y < f; y++) {
          L.set(wallX - dir, oy + y, T.AIR);
          L.set(wallX, oy + y, T.BREAK);
          L.set(wallX + dir, oy + y, T.AIR);
        }
        for (let i = 2; i <= 6; i++) for (let y = f - 4; y < f; y++) L.set(wallX + dir * i, oy + y, T.AIR);
        for (let i = 1; i <= 6; i++) L.setBack(wallX + dir * i, oy + f - 1, 1);
        L.fillBack(Math.min(wallX + dir, wallX + dir * 6), oy + f - 4, 6, 4, 1);
        const sx = (wallX + dir * 4) * TS + 8, sy = (oy + f) * TS;
        const roll = rng.next();
        L.spawns.push({ type: roll < 0.3 ? 'scroll' : roll < 0.55 ? 'chest' : roll < 0.8 ? 'gold' : 'food', x: sx, y: sy, small: true, secret: true });
        L.cells.push({ x: Math.min(wallX + dir, wallX + dir * 6) * TS, y: (oy + f - 4) * TS, w: 6 * TS, h: 4 * TS, type: 'secret', secret: true });
        alcoves++;
        break;
      }
    }

    // ---------------------------------------------------- 8. populate
    const enemyIds = Object.keys(B.enemies);
    const clueCells = [];
    for (const c of active) {
      const ox = c.cx * CW, oy = c.cy * CH;
      const px = ox * TS, py = oy * TS;
      L.cells.push({ x: px, y: py, w: CW * TS, h: CH * TS, type: c.type, cx: c.cx, cy: c.cy, gate: c.gate });
      const spots = floorSpots(L, c);
      const flatX = (off) => (ox + freeCol(c, off)) * TS + 8;
      const floorY = c.flatF !== undefined ? (oy + c.flatF) * TS : null;
      switch (c.type) {
        case 'start': {
          const f = c.ground[4];
          L.spawns.push({ type: 'playerStart', x: (ox + 4) * TS + 8, y: (oy + f) * TS });
          L.decos.push({ type: 'archway', x: (ox + 3) * TS, y: (oy + f) * TS });
          if (biomeId === 'undercroft') {
            L.spawns.push({ type: 'startGear', x: (ox + 9) * TS, y: (oy + c.ground[9]) * TS });
            L.decos.push({ type: 'brazierDeco', x: (ox + 7) * TS, y: (oy + c.ground[7]) * TS, v: 0.3 });
          }
          break;
        }
        case 'exit': {
          const shaft = (c.edges.U && c.edges.U.sx) || (c.edges.D && c.edges.D.sx);
          const side = c.edges.L ? 'R' : c.edges.R ? 'L' : shaft ? (shaft < CW / 2 ? 'R' : 'L') : 'C';
          const xOff = side === 'R' ? CW - 7 : side === 'L' ? 6 : Math.floor(CW / 2);
          const f = c.ground[xOff];
          L.spawns.push({ type: 'exit', to: c.exitTo, x: (ox + xOff) * TS + 8, y: (oy + f) * TS });
          L.decos.push({ type: 'archway', x: (ox + xOff) * TS + 8, y: (oy + f) * TS });
          break;
        }
        case 'gated': {
          const x = flatX(Math.floor(CW / 2) + (c.edges.D && c.edges.D.sx < CW / 2 ? 6 : c.edges.U && c.edges.U.sx < CW / 2 ? 6 : -6));
          if (c.purpose === 'exit') {
            L.spawns.push({ type: 'exit', to: c.exitTo, x, y: floorY });
            L.decos.push({ type: 'archway', x, y: floorY });
          } else {
            L.spawns.push({ type: 'chest', x, y: floorY, bonus: 0.6, rune: c.gate });
            L.decos.push({ type: 'candle', x: x - 30, y: floorY, v: 0.2 }, { type: 'candle', x: x + 26, y: floorY, v: 0.7 });
          }
          break;
        }
        case 'shop': {
          // collect free columns spaced 4 apart, starting away from the entrance/shaft
          const cols = [];
          const shaft = (c.edges.U && c.edges.U.sx) || (c.edges.D && c.edges.D.sx);
          const fromRight = c.edges.L ? false : c.edges.R ? true : shaft !== undefined && shaft !== null ? shaft < CW / 2 : false;
          for (let k = 0; k < CW && cols.length < 5; k++) {
            const col = fromRight ? CW - 6 - k : 5 + k;
            if (col < 4 || col > CW - 5 || shaftBlocked(c, col)) continue;
            if (cols.length && Math.abs(cols[cols.length - 1] - col) < 4) continue;
            cols.push(col);
          }
          L.spawns.push({ type: 'merchant', x: (ox + cols[0]) * TS + 8, y: floorY, seed: rng.int(1, 1e9) });
          for (let i = 1; i < cols.length; i++) L.spawns.push({ type: 'shopItem', slot: i - 1, x: (ox + cols[i]) * TS + 8, y: floorY, seed: rng.int(1, 1e9) });
          L.decos.push({ type: 'lantern', x: (ox + cols[2]) * TS + 8, y: (oy + c.ceil[cols[2]]) * TS, len: 2, v: 0.4 });
          break;
        }
        case 'treasure':
          L.spawns.push({ type: 'chest', x: flatX(CW / 2), y: floorY });
          break;
        case 'scroll':
          L.spawns.push({ type: 'scroll', x: flatX(CW / 2), y: floorY });
          L.decos.push({ type: 'candle', x: flatX(CW / 2 - 3), y: floorY, v: 0.1 }, { type: 'candle', x: flatX(CW / 2 + 3), y: floorY, v: 0.6 });
          break;
        case 'lore':
          L.spawns.push({ type: 'lore', id: c.loreId, x: flatX(CW / 2), y: floorY });
          break;
        case 'cursed':
          L.spawns.push({ type: 'chest', cursed: true, x: flatX(CW / 2), y: floorY });
          break;
        case 'guardian': {
          const rune = B.guardian;
          const gid = rune === 'vine' ? 'harpooner' : 'knight';
          L.spawns.push({ type: 'enemy', id: gid, guardian: rune, x: flatX(CW / 2), y: floorY });
          break;
        }
        case 'puzzle':
        case 'timed': {
          const info = buildVault(L, c, rng, c.type);
          if (info.kind === 'braziers') clueCells.push(info);
          puzzleCells.push(info);
          break;
        }
      }
      // inline specials (in normal cells)
      for (const inl of c.inline) {
        const s = pickSpot(spots, rng, 0);
        if (!s) continue;
        if (inl.kind === 'shop') {
          L.spawns.push({ type: 'merchant', x: s.x, y: s.y, seed: rng.int(1, 1e9) });
          let k = 0;
          for (const s2 of spots) {
            if (k >= 3) break;
            if (Math.abs(s2.x - s.x) >= 40 && Math.abs(s2.x - s.x) <= 150 && s2.y === s.y && !s2.used) {
              if (spots.some((o) => o.used && Math.abs(o.x - s2.x) < 40)) continue;
              s2.used = true;
              L.spawns.push({ type: 'shopItem', slot: k, x: s2.x, y: s2.y, seed: rng.int(1, 1e9) });
              k++;
            }
          }
          c.noEnemies = true;
        } else if (inl.kind === 'lore') L.spawns.push({ type: 'lore', id: inl.id, x: s.x, y: s.y });
        else L.spawns.push({ type: inl.kind === 'treasure' ? 'chest' : inl.kind, x: s.x, y: s.y });
      }
      if (c.mara) {
        const s = pickSpot(spots, rng, 0);
        if (s) L.spawns.push({ type: 'mara', x: s.x, y: s.y, first: !metMara });
      }
      // enemies
      const noEnemy = c.type === 'start' || c.noEnemies || ['shop', 'lore', 'scroll', 'puzzle', 'guardian', 'timed'].includes(c.type);
      if (!noEnemy) {
        let n = rng.int(B.density[0], B.density[1]);
        if (c.dist === 1) n = Math.max(0, n - 1);
        if (c.type === 'treasure' || c.type === 'cursed' || c.type === 'gated') n = Math.max(1, n - 1);
        if (biomeId === 'undercroft' && c.dist <= 1) n = Math.min(n, 1);
        for (let i = 0; i < n; i++) {
          const id = rng.weighted(enemyIds, (k) => B.enemies[k]);
          const s = pickSpot(spots, rng, 3);
          if (!s) break;
          const fly = FLYERS.has(id);
          L.spawns.push({ type: 'enemy', id, x: s.x, y: fly ? s.y - rng.int(40, 70) : s.y, elite: c.elite && i === 0 });
        }
      }
      // breakables & gold & food
      const nb = rng.int(0, 2);
      for (let i = 0; i < nb; i++) {
        const s = pickSpot(spots, rng, 0);
        if (s) L.spawns.push({ type: 'breakable', x: s.x, y: s.y, v: rng.next() });
      }
      if (rng.chance(0.12)) { const s = pickSpot(spots, rng, 0); if (s) L.spawns.push({ type: 'food', x: s.x, y: s.y }); }
      if (rng.chance(0.18)) { const s = pickSpot(spots, rng, 0); if (s) L.spawns.push({ type: 'gold', x: s.x, y: s.y }); }
      decorateCell(L, c, rng, B);
    }
    // brazier puzzle clue murals
    for (const info of clueCells) {
      const cands = active.filter((c) => c.type === 'normal' && c.ground);
      const c = cands.length ? rng.pick(cands) : null;
      if (!c) continue;
      const spots = floorSpots(L, c);
      const s = pickSpot(spots, rng, 0);
      if (s) L.spawns.push({ type: 'mural', x: s.x, y: s.y, order: info.order, puzzleId: info.id });
    }
    // food for longer levels
    L.gridW = gw;
    L.gridH = GH;
    L.finalize();
    return L;
  };

  // ------------------------------------------------------------------ carving
  function carveCell(L, c, rng, B) {
    const ox = c.cx * CW, oy = c.cy * CH;
    const e = c.edges;
    const special = c.type !== 'normal';
    const Lf = e.L ? e.L.floor : null, Rf = e.R ? e.R.floor : null;
    const g = new Array(CW);
    let a = Lf !== null ? Lf : Rf !== null ? Rf : rng.int(14, 18);
    let b = Rf !== null ? Rf : Lf !== null ? Lf : a;
    if (c.type === 'gated' && (c.gate === 'vine' || c.gate === 'spider')) a = b = 13;
    if (c.type === 'gated' && c.gate === 'ram') a = b = rng.int(15, 18);
    // segments
    const segs = [];
    let x = 0;
    while (x < CW) {
      const w = special ? CW : rng.int(4, 9);
      segs.push({ x0: x, x1: Math.min(CW, x + w) });
      x += w;
    }
    if (segs.length > 1 && segs[segs.length - 1].x1 - segs[segs.length - 1].x0 < 3) {
      segs[segs.length - 2].x1 = CW;
      segs.pop();
    }
    const n = segs.length;
    const hts = new Array(n);
    if (special && a !== b) {
      // flat with a single step in the middle region if needed
      for (let i = 0; i < n; i++) hts[i] = a;
    } else if (n === 1) hts[0] = a;
    else {
      hts[0] = a;
      hts[n - 1] = b;
      for (let i = 1; i < n - 1; i++) {
        const rem = n - 1 - i;
        let t = hts[i - 1] + Math.round((b - hts[i - 1]) / (rem + 1)) + rng.int(-2, 2);
        hts[i] = G.clamp(t, 12, CH - 3);
      }
      let ok = true;
      for (let i = 1; i < n; i++) if (Math.abs(hts[i] - hts[i - 1]) > 3) ok = false;
      if (!ok) for (let i = 0; i < n; i++) hts[i] = Math.round(a + ((b - a) * i) / (n - 1));
    }
    for (let i = 0; i < n; i++) for (let xx = segs[i].x0; xx < segs[i].x1; xx++) g[xx] = hts[i];
    if (special && a !== b) {
      // special cell with two differing doors: a staircase in the middle
      const mid = Math.floor(CW / 2);
      const steps = Math.abs(b - a), st = Math.sign(b - a), s0 = mid - steps;
      for (let xx = 0; xx < CW; xx++) g[xx] = xx < s0 ? a : xx >= s0 + steps * 2 ? b : a + st * (1 + Math.floor((xx - s0) / 2));
    }
    // flatten around shafts
    const shafts = [];
    if (e.U) shafts.push(e.U.sx);
    if (e.D) shafts.push(e.D.sx);
    for (const sx of shafts) {
      const v = g[sx + 1];
      for (let xx = Math.max(1, sx - 1); xx <= Math.min(CW - 2, sx + 3); xx++) g[xx] = v;
    }
    if (Lf !== null) { g[0] = Lf; g[1] = Lf; g[2] = Lf; }
    if (Rf !== null) { g[CW - 1] = Rf; g[CW - 2] = Rf; g[CW - 3] = Rf; }
    // ceiling
    const cl = new Array(CW);
    const hall = special || !!e.U || rng.chance(0.45);
    const tallBase = rng.int(7, 10);
    for (let i = 0; i < n; i++) {
      const cv = hall ? rng.int(1, 3) : Math.max(1, hts[i] - tallBase - rng.int(0, 1));
      for (let xx = segs[i].x0; xx < segs[i].x1; xx++) cl[xx] = cv;
    }
    if (special) for (let xx = 0; xx < CW; xx++) cl[xx] = Math.max(1, Math.min(g[xx] - 8, 4));
    for (let xx = 0; xx < CW; xx++) cl[xx] = Math.min(cl[xx], g[xx] - 5);
    if (Lf !== null) for (let xx = 0; xx < 4; xx++) cl[xx] = Math.min(cl[xx], Lf - 5);
    if (Rf !== null) for (let xx = CW - 4; xx < CW; xx++) cl[xx] = Math.min(cl[xx], Rf - 5);
    // spider shafts need a low ceiling nearby so the shaft mouth is reachable
    if (e.U && e.U.gate === 'spider') {
      const sx = e.U.sx;
      for (let xx = Math.max(1, sx - 4); xx <= Math.min(CW - 2, sx + 6); xx++) cl[xx] = Math.max(cl[xx], g[xx] - 5);
    }
    // carve air
    for (let xx = 1; xx < CW - 1; xx++) for (let y = Math.max(1, cl[xx]); y < g[xx]; y++) L.set(ox + xx, oy + y, T.AIR);
    if (Lf !== null) for (let y = Lf - 4; y < Lf; y++) L.set(ox, oy + y, T.AIR);
    if (Rf !== null) for (let y = Rf - 4; y < Rf; y++) L.set(ox + CW - 1, oy + y, T.AIR);
    c.ground = g;
    c.ceil = cl;
    if (special || c.type === 'start') c.flatF = g[Math.floor(CW / 2)];

    // shafts: U (this is lower cell)
    if (e.U) {
      const sx = e.U.sx;
      for (let xx = sx; xx <= sx + 2; xx++) for (let y = 0; y <= cl[xx]; y++) L.set(ox + xx, oy + y, T.AIR);
      if (!e.U.gate || e.U.gate === 'ram') {
        for (let y = 0; y < g[sx + 1]; y++) L.set(ox + sx + 1, oy + y, T.LADDER);
      } else if (e.U.gate === 'vine') {
        L.spawns.push({ type: 'seed', x: (ox + sx + 1) * TS + 8, y: (oy + g[sx + 1]) * TS, tx: ox + sx + 1, ty0: oy + g[sx + 1] - 1, ty1: e.U.up.cy * CH + 13 });
      } else if (e.U.gate === 'spider') {
        for (let y = 0; y <= cl[sx]; y++) { if (L.isSolid(ox + sx - 1, oy + y)) L.set(ox + sx - 1, oy + y, T.GRIP); if (L.isSolid(ox + sx + 3, oy + y)) L.set(ox + sx + 3, oy + y, T.GRIP); }
        L.spawns.push({ type: 'hint', hint: 'shaft', x: (ox + sx + 1) * TS + 8, y: (oy + g[sx + 1]) * TS });
      }
    }
    // shafts: D (this is upper cell)
    if (e.D) {
      const sx = e.D.sx;
      const gs = g[sx + 1];
      for (let xx = sx; xx <= sx + 2; xx++) for (let y = g[xx]; y < CH; y++) L.set(ox + xx, oy + y, T.AIR);
      if (e.D.gate === 'ram') {
        for (let xx = sx; xx <= sx + 2; xx++) { L.set(ox + xx, oy + gs, T.RAM); L.set(ox + xx, oy + gs + 1, T.RAM); }
        for (let y = gs + 2; y < CH; y++) L.set(ox + sx + 1, oy + y, T.LADDER);
        L.spawns.push({ type: 'hint', hint: 'ram', x: (ox + sx + 1) * TS + 8, y: (oy + gs) * TS });
      } else if (e.D.gate === 'vine' || e.D.gate === 'spider') {
        L.set(ox + sx, oy + gs, T.PLAT);
        L.set(ox + sx + 1, oy + gs, T.PLAT);
        L.set(ox + sx + 2, oy + gs, T.PLAT);
        if (e.D.gate === 'spider') for (let y = gs + 1; y < CH; y++) { L.set(ox + sx - 1, oy + y, T.GRIP); L.set(ox + sx + 3, oy + y, T.GRIP); }
      } else {
        for (let y = gs; y < CH; y++) L.set(ox + sx + 1, oy + y, T.LADDER);
        L.set(ox + sx, oy + gs, T.PLAT);
        L.set(ox + sx + 2, oy + gs, T.PLAT);
      }
    }
    const reserved = new Set();
    for (const sx of shafts) for (let xx = sx - 2; xx <= sx + 4; xx++) reserved.add(xx);
    for (let xx = 0; xx < 5; xx++) { reserved.add(xx); reserved.add(CW - 1 - xx); }
    c.reserved = reserved;

    // features (normal cells only)
    if (c.type === 'normal' || c.type === 'start') {
      // pits with hazards
      if (c.type === 'normal') {
        for (let i = 1; i < n - 1; i++) {
          const s = segs[i];
          const w = s.x1 - s.x0;
          if (w < 5 || !rng.chance(0.3)) continue;
          const pw = rng.int(2, B.style.hazard === 'brine' ? 4 : 3);
          const px0 = s.x0 + rng.int(1, w - pw - 1);
          let bad = false;
          for (let xx = px0 - 1; xx <= px0 + pw; xx++) if (reserved.has(xx)) bad = true;
          const gy = hts[i];
          if (bad || gy + 2 >= CH) continue;
          for (let xx = px0; xx < px0 + pw; xx++) {
            L.set(ox + xx, oy + gy, T.AIR);
            L.set(ox + xx, oy + gy + 1, T.HAZARD);
          }
          if (pw >= 3 && rng.chance(0.5)) for (let xx = px0; xx < px0 + pw; xx++) L.set(ox + xx, oy + gy - 3, T.PLAT);
        }
      }
      // floating platforms
      const nPlat = rng.int(0, 3);
      for (let k = 0; k < nPlat; k++) {
        const w = rng.int(3, 6);
        const x0 = rng.int(3, CW - 4 - w);
        let gmin = 99, cmax = 0, bad = false;
        for (let xx = x0 - 1; xx <= x0 + w; xx++) {
          gmin = Math.min(gmin, g[xx]);
          cmax = Math.max(cmax, cl[xx]);
          if (reserved.has(xx) && shafts.some((sx) => xx >= sx - 1 && xx <= sx + 3)) bad = true;
        }
        const y = gmin - rng.int(4, 5);
        if (bad || y - cmax < 3) continue;
        let clear = true;
        for (let xx = x0; xx < x0 + w; xx++) if (L.get(ox + xx, oy + y) !== T.AIR) clear = false;
        if (!clear) continue;
        for (let xx = x0; xx < x0 + w; xx++) L.set(ox + xx, oy + y, T.PLAT);
        // second tier
        const y2 = y - rng.int(4, 5);
        if (y2 - cmax >= 3 && rng.chance(0.4)) {
          const x2 = G.clamp(x0 + rng.int(-4, 4), 3, CW - 4 - w);
          let ok2 = true;
          for (let xx = x2; xx < x2 + w; xx++) if (L.get(ox + xx, oy + y2) !== T.AIR || shafts.some((sx) => xx >= sx - 1 && xx <= sx + 3)) ok2 = false;
          if (ok2) for (let xx = x2; xx < x2 + w; xx++) L.set(ox + xx, oy + y2, T.PLAT);
        }
      }
      // small solid blocks
      if (c.type === 'normal' && rng.chance(0.35)) {
        const x0 = rng.int(6, CW - 9);
        let bad = false;
        for (let xx = x0 - 1; xx <= x0 + 2; xx++) if (reserved.has(xx) || g[xx] !== g[x0]) bad = true;
        const hh = rng.int(1, 2);
        if (!bad && g[x0] - hh - cl[x0] > 5) for (let xx = x0; xx < x0 + 2; xx++) for (let y = g[x0] - hh; y < g[x0]; y++) L.set(ox + xx, oy + y, T.SOLID);
      }
    }
    // backwall
    const outdoorP = B.style.outdoor || 0;
    const outdoor = rng.chance(c.cy <= 1 ? outdoorP : outdoorP * 0.45);
    c.outdoor = outdoor;
    if (!outdoor) {
      L.fillBack(ox, oy, CW, CH, 1);
      if (rng.chance(0.3)) {
        const hx = ox + rng.int(4, CW - 10), hy = oy + rng.int(2, 8), hw = rng.int(4, 8), hh = rng.int(3, 6);
        for (let y = 0; y < hh; y++) for (let xx = 0; xx < hw; xx++) {
          const d = Math.hypot((xx - hw / 2) / (hw / 2), (y - hh / 2) / (hh / 2));
          if (d < 1 - G.hash(xx, y, 3) * 0.3) L.setBack(hx + xx, hy + y, 0);
        }
      }
    } else {
      const nS = rng.int(1, 3);
      for (let k = 0; k < nS; k++) {
        const w = rng.int(4, 11), x0 = rng.int(1, CW - w - 1);
        const top = g[x0] - rng.int(3, 9);
        for (let xx = x0; xx < x0 + w; xx++) for (let y = Math.max(0, top + ((xx === x0 || xx === x0 + w - 1) ? 1 : 0)); y < CH; y++) L.setBack(ox + xx, oy + y, 1);
      }
    }
  }

  // columns occupied by a vertical shaft (plus margin) cannot hold objects
  function shaftBlocked(c, col) {
    for (const k of ['U', 'D']) {
      const e = c.edges[k];
      if (e && col >= e.sx - 1 && col <= e.sx + 3) return true;
    }
    return false;
  }
  function freeCol(c, col, lo, hi) {
    lo = lo === undefined ? 3 : lo;
    hi = hi === undefined ? CW - 4 : hi;
    col = G.clamp(Math.round(col), lo, hi);
    if (!shaftBlocked(c, col)) return col;
    for (let d = 1; d < CW; d++) {
      if (col + d <= hi && !shaftBlocked(c, col + d)) return col + d;
      if (col - d >= lo && !shaftBlocked(c, col - d)) return col - d;
    }
    return col;
  }
  G._freeCol = freeCol;

  // ---------------------------------------------------------------- vaults
  let vaultId = 1;
  function buildVault(L, c, rng, kind) {
    const ox = c.cx * CW, oy = c.cy * CH;
    const F = c.flatF;
    // entrance side
    let entrLeft = !!c.edges.L || (!c.edges.R && rng.chance(0.5));
    if (c.edges.U) entrLeft = c.edges.U.sx < CW / 2;
    if (c.edges.D) entrLeft = c.edges.D.sx < CW / 2;
    const wallX = entrLeft ? CW - 11 : 10; // wall column (2 thick)
    const top = c.ceil[Math.floor(CW / 2)];
    for (let y = Math.max(1, top); y < F - 4; y++) { L.set(ox + wallX, oy + y, T.SOLID); L.set(ox + wallX + 1, oy + y, T.SOLID); }
    const gateX = (ox + wallX) * TS + 16;
    const vaultCx = entrLeft ? (ox + CW - 6) * TS : (ox + 5) * TS + 8;
    const id = 'v' + vaultId++;
    let pk = kind === 'timed' ? 'timed' : rng.pick(['braziers', 'levers', 'bells', 'crate']);
    const B = G.BIOMES[L.biomeId];
    const pearl = kind === 'puzzle' && B.pearl && !(G.save && G.save.pearls && G.save.pearls[B.pearl]) ? B.pearl : null;
    L.spawns.push({ type: 'gate', id, x: gateX, y: (oy + F) * TS, h: 4, kind: pk, limit: B.timed || 0 });
    L.spawns.push({ type: 'vaultReward', id, x: vaultCx, y: (oy + F) * TS, pearl, kind: pk });
    const ante0 = entrLeft ? 5 : wallX + 3, ante1 = entrLeft ? wallX - 2 : CW - 5;
    const usedCols = new Set();
    const antex = (i, n) => {
      let col = freeCol(c, ante0 + ((ante1 - ante0) * (i + 0.5)) / n, Math.min(ante0, ante1), Math.max(ante0, ante1));
      while (usedCols.has(col)) col++;
      usedCols.add(col);
      return (ox + col) * TS + 8;
    };
    const info = { id, kind: pk, order: null };
    const symbols = [0, 1, 2, 3];
    if (pk === 'braziers') {
      const order = rng.shuffle(symbols.slice());
      info.order = order;
      for (let i = 0; i < 4; i++) L.spawns.push({ type: 'brazier', id, sym: i, x: antex(i, 4), y: (oy + F) * TS, order });
    } else if (pk === 'levers') {
      // lights-out: start from solved, apply random presses
      const state = [1, 1, 1, 1];
      const presses = rng.int(2, 3);
      const used = new Set();
      for (let k = 0; k < presses; k++) {
        let p;
        do { p = rng.int(0, 3); } while (used.has(p));
        used.add(p);
        for (const j of [p - 1, p, p + 1]) if (j >= 0 && j < 4) state[j] ^= 1;
      }
      if (state.every((s) => s === 1)) state[0] ^= 1, state[1] ^= 1;
      for (let i = 0; i < 4; i++) L.spawns.push({ type: 'lever', id, idx: i, x: antex(i, 4), y: (oy + F) * TS, state });
    } else if (pk === 'bells') {
      const notes = [0, 1, 2, 3];
      const len = rng.int(4, 5);
      const song = [];
      for (let i = 0; i < len; i++) song.push(rng.pick(notes));
      for (let i = 0; i < 4; i++) L.spawns.push({ type: 'bell', id, idx: i, x: antex(i + 1, 5), y: (oy + F - 4) * TS, song });
      L.spawns.push({ type: 'songstone', id, x: antex(0, 5), y: (oy + F) * TS, song });
    } else if (pk === 'crate') {
      const plateX = freeCol(c, entrLeft ? ante1 - 1 : ante0 + 1, Math.min(ante0, ante1), Math.max(ante0, ante1));
      const crateX = freeCol(c, entrLeft ? ante0 + 3 : ante1 - 3, Math.min(ante0, ante1), Math.max(ante0, ante1));
      L.spawns.push({ type: 'plate', id, x: (ox + plateX) * TS + 8, y: (oy + F) * TS });
      L.spawns.push({ type: 'crate', id, x: (ox + crateX) * TS + 8, y: (oy + F) * TS });
    } else if (pk === 'timed') {
      L.spawns.push({ type: 'hint', hint: 'timed', x: antex(1, 3), y: (oy + F) * TS });
    }
    L.decos.push({ type: 'candle', x: vaultCx - 24, y: (oy + F) * TS, v: 0.4 }, { type: 'candle', x: vaultCx + 20, y: (oy + F) * TS, v: 0.9 });
    return info;
  }

  // ---------------------------------------------------------------- helpers
  function floorSpots(L, c) {
    const ox = c.cx * CW, oy = c.cy * CH;
    const out = [];
    for (let xx = 2; xx < CW - 2; xx++) {
      if (c.reserved && c.reserved.has(xx)) continue;
      for (let y = 1; y < CH - 1; y++) {
        const tx = ox + xx, ty = oy + y;
        const t = L.get(tx, ty);
        if (t !== T.AIR) continue;
        const below = L.get(tx, ty + 1);
        if (!(G.isSolidT(below) || below === T.PLAT)) continue;
        if (L.get(tx, ty - 1) !== T.AIR || L.get(tx, ty - 2) === T.SOLID) continue;
        if (L.get(tx - 1, ty + 1) === T.HAZARD || L.get(tx + 1, ty + 1) === T.HAZARD) continue;
        if (!(G.isSolidT(L.get(tx - 1, ty + 1)) || L.get(tx - 1, ty + 1) === T.PLAT)) continue;
        if (!(G.isSolidT(L.get(tx + 1, ty + 1)) || L.get(tx + 1, ty + 1) === T.PLAT)) continue;
        out.push({ x: tx * TS + 8, y: (ty + 1) * TS, tx, ty, plat: below === T.PLAT });
      }
    }
    return out;
  }
  function pickSpot(spots, rng, minSep) {
    const free = spots.filter((s) => !s.used);
    if (!free.length) return null;
    const s = rng.pick(free);
    s.used = true;
    for (const o of spots) if (Math.abs(o.x - s.x) < 20 + minSep * 8 && Math.abs(o.y - s.y) < 32) o.used = true;
    return s;
  }

  // ---------------------------------------------------------------- decoration
  function decorateCell(L, c, rng, B) {
    const ox = c.cx * CW, oy = c.cy * CH;
    const dw = B.style.deco || {};
    let lastTorch = -99;
    for (let xx = 1; xx < CW - 1; xx++) {
      const tx = ox + xx;
      for (let y = 1; y < CH - 1; y++) {
        const ty = oy + y;
        const t = L.get(tx, ty);
        if (t !== T.AIR) continue;
        const above = L.get(tx, ty - 1), below = L.get(tx, ty + 1);
        const back = L.getBack(tx, ty);
        const r = rng.next();
        // floor decorations
        if (G.isSolidT(below)) {
          if (dw.bones && r < 0.05 * dw.bones) L.decos.push({ type: 'bones', x: tx * TS + 4, y: (ty + 1) * TS, v: rng.next() });
          else if (dw.skull && r < 0.08 * dw.skull) L.decos.push({ type: 'skull', x: tx * TS + 5, y: (ty + 1) * TS });
          else if ((B.style.tile.rimKind === 'grass' || B.style.tile.rimKind === 'moss') && r < 0.3) L.decos.push({ type: 'grass', x: tx * TS + 2, y: (ty + 1) * TS });
          else if (dw.flower && r < 0.36 * dw.flower) L.decos.push({ type: 'flower', x: tx * TS + 6, y: (ty + 1) * TS, v: rng.next() });
          else if (dw.mushroom && r < 0.42 * dw.mushroom) L.decos.push({ type: 'mushroom', x: tx * TS + 5, y: (ty + 1) * TS, v: rng.next(), big: rng.chance(0.25) });
          else if (dw.crystal && r < 0.47 * dw.crystal) L.decos.push({ type: 'crystal', x: tx * TS + 5, y: (ty + 1) * TS, v: rng.next() });
          else if (dw.candle && r < 0.5 * dw.candle && r > 0.44) L.decos.push({ type: 'candle', x: tx * TS + 6, y: (ty + 1) * TS, v: rng.next() });
          else if (dw.statue && r > 0.985 && back) L.decos.push({ type: 'statue', x: tx * TS - 2, y: (ty + 1) * TS });
          else if (dw.weaponrack && r > 0.98 && back) L.decos.push({ type: 'weaponrack', x: tx * TS, y: (ty + 1) * TS });
        }
        // ceiling hangers
        if (G.isSolidT(above)) {
          const len = rng.int(2, 6);
          let room = 0;
          for (let k = 1; k <= len + 2; k++) if (L.get(tx, ty + k) === T.AIR) room++;
          if (room >= len + 2) {
            if (dw.chain && r < 0.05 * dw.chain) L.decos.push({ type: 'chain', x: tx * TS + 7, y: ty * TS, len: len * 3, hook: rng.chance(0.5) });
            else if (dw.vine && r < 0.1 * dw.vine) L.decos.push({ type: B.style.tile.rimKind === 'glow' ? 'glowvine' : 'vine', x: tx * TS + 8, y: ty * TS, len: len * 2, v: rng.next() });
            else if (dw.weed && r < 0.1 * dw.weed) L.decos.push({ type: 'weed', x: tx * TS + 8, y: ty * TS, len: len });
            else if (dw.rope && r < 0.13 * dw.rope) L.decos.push({ type: 'rope', x: tx * TS + 8, y: ty * TS, len: len });
            else if (dw.lantern && r < 0.18 * dw.lantern) L.decos.push({ type: 'lantern', x: tx * TS + 8, y: ty * TS, len: rng.int(1, 3), v: rng.next() });
          }
          if (dw.cobweb && r > 0.93) {
            if (G.isSolidT(L.get(tx - 1, ty))) L.decos.push({ type: 'cobweb', x: tx * TS, y: ty * TS, flip: false });
            else if (G.isSolidT(L.get(tx + 1, ty))) L.decos.push({ type: 'cobweb', x: tx * TS + 15, y: ty * TS, flip: true });
          }
        }
        // wall mounted
        if (back && G.isSolidT(L.get(tx, ty + 3)) && L.get(tx, ty + 1) === T.AIR && L.get(tx, ty + 2) === T.AIR && !G.isSolidT(above)) {
          if (dw.torch && xx - lastTorch > 8 && r < 0.25 * dw.torch) {
            L.decos.push({ type: 'torch', x: tx * TS + 7, y: ty * TS + 4, v: rng.next(), color: B.id === 'ossuary' ? '#70ff90' : null });
            lastTorch = xx;
          } else if (dw.bars && r > 0.97 && L.get(tx + 1, ty) === T.AIR) L.decos.push({ type: 'bars', x: tx * TS, y: ty * TS - 16 });
        }
        if (back && y > 3 && L.get(tx, ty - 2) === T.AIR && L.get(tx, ty + 2) === T.AIR && L.get(tx + 1, ty) === T.AIR && L.get(tx, ty + 1) === T.AIR) {
          if (dw.window && r > 1 - 0.012 * dw.window) L.decos.push({ type: 'window', x: tx * TS, y: ty * TS - 16, v: rng.next(), stained: B.id === 'cathedral' || B.id === 'throne' });
          else if (dw.banner && r > 1 - 0.006 * dw.banner && G.isSolidT(L.get(tx, ty - 3))) L.decos.push({ type: 'banner', x: tx * TS + 2, y: (ty - 2) * TS, len: rng.int(2, 3), color: rng.pick(['#6a2030', '#203a6a', '#3a2a5a']) });
          else if (dw.net && r > 1 - 0.004 * dw.net) L.decos.push({ type: 'net', x: tx * TS, y: ty * TS });
        }
      }
    }
  }

  // ================================================================ handcrafted
  function room(L, x0, y0, w, h) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) L.set(x, y, T.AIR);
  }

  G.buildPassage = function (nextBiome, fromBiome) {
    const L = new G.Level(62, 20, 'passage');
    L.tier = 0;
    room(L, 1, 3, 60, 12);
    L.fillBack(0, 0, 62, 20, 1);
    const F = 15;
    L.cells.push({ x: 0, y: 0, w: L.pw, h: L.ph, type: 'passage' });
    L.spawns.push({ type: 'playerStart', x: 5 * TS, y: F * TS });
    L.decos.push({ type: 'archway', x: 4 * TS, y: F * TS });
    L.spawns.push({ type: 'keeper', x: 19 * TS, y: F * TS });
    L.spawns.push({ type: 'fountain', x: 28 * TS, y: F * TS });
    L.spawns.push({ type: 'mutationAltar', x: 36 * TS, y: F * TS });
    L.spawns.push({ type: 'mapTable', x: 44 * TS, y: F * TS });
    if (G.hasUpgrade && G.hasUpgrade('recycle')) L.spawns.push({ type: 'salvage', x: 11 * TS, y: F * TS });
    L.spawns.push({ type: 'exit', to: nextBiome, x: 55 * TS, y: F * TS, passage: true });
    L.decos.push({ type: 'archway', x: 55 * TS, y: F * TS });
    for (const x of [8, 15, 24, 33, 40, 49]) L.decos.push({ type: 'torch', x: x * TS + 7, y: (F - 4) * TS + 4, v: x * 0.13 });
    for (const x of [16, 17, 22, 26, 31, 38, 47, 51]) L.decos.push({ type: 'candle', x: x * TS + 5, y: F * TS, v: x * 0.07 });
    L.decos.push({ type: 'brazierDeco', x: 52 * TS, y: F * TS, v: 0.2 }, { type: 'brazierDeco', x: 58 * TS, y: F * TS, v: 0.7 });
    L.decos.push({ type: 'banner', x: 30 * TS, y: 3 * TS, len: 3, color: '#6a4020' }, { type: 'banner', x: 12 * TS, y: 3 * TS, len: 2, color: '#3a2a5a' });
    L.decos.push({ type: 'chain', x: 22 * TS, y: 3 * TS, len: 9, hook: true }, { type: 'chain', x: 46 * TS, y: 3 * TS, len: 12 });
    L.finalize();
    return L;
  };

  G.buildBossLevel = function (biomeId) {
    const B = G.BIOMES[biomeId];
    let L;
    if (biomeId === 'belfry') {
      L = new G.Level(84, 24, biomeId);
      const F = 19;
      room(L, 1, 4, 18, F - 4);
      room(L, 19, 1, 48, F - 1);
      room(L, 67, 8, 16, F - 8);
      for (let x = 19; x < 67; x++) L.set(x, 0, T.SOLID);
      L.fill(19, 1, 48, 1, T.AIR);
      // side platforms
      for (let x = 24; x < 30; x++) L.set(x, 13, T.PLAT);
      for (let x = 56; x < 62; x++) L.set(x, 13, T.PLAT);
      for (let x = 38; x < 48; x++) L.set(x, 9, T.PLAT);
      L.fillBack(0, 0, 19, 24, 1);
      L.fillBack(67, 0, 17, 24, 1);
      for (let x = 19; x < 67; x += 7) L.fillBack(x, 10, 3, 14, 1);
      L.arena = { x0: 20 * TS, x1: 66 * TS, floor: F * TS, gateL: 19 * TS, gateR: 66 * TS };
      L.spawns.push({ type: 'playerStart', x: 4 * TS, y: F * TS });
      L.spawns.push({ type: 'boss', id: 'bellwarden', x: 50 * TS, y: F * TS });
      L.spawns.push({ type: 'lore', id: 'bf1', x: 11 * TS, y: F * TS });
      L.spawns.push({ type: 'exit', to: null, x: 78 * TS, y: F * TS, bossExit: true });
      L.decos.push({ type: 'archway', x: 78 * TS, y: F * TS }, { type: 'archway', x: 3 * TS, y: F * TS });
      L.decos.push({ type: 'bigbell', x: 43 * TS, y: 1 * TS });
      for (const x of [6, 14, 72, 80]) L.decos.push({ type: 'torch', x: x * TS + 7, y: (F - 4) * TS, v: x * 0.1 });
    } else if (biomeId === 'maw') {
      L = new G.Level(86, 26, biomeId);
      const F = 21;
      room(L, 1, 8, 18, F - 8);
      room(L, 19, 2, 50, F - 2);
      room(L, 69, 8, 16, F - 8);
      for (const [x0, x1, y] of [[22, 28, 16], [60, 66, 16], [30, 37, 12], [51, 58, 12], [40, 48, 8], [22, 27, 8], [61, 66, 8]]) for (let x = x0; x < x1; x++) L.set(x, y, T.PLAT);
      L.fillBack(0, 0, 86, 26, 1);
      L.arena = { x0: 20 * TS, x1: 68 * TS, floor: F * TS, gateL: 19 * TS, gateR: 68 * TS };
      L.spawns.push({ type: 'playerStart', x: 4 * TS, y: F * TS });
      L.spawns.push({ type: 'boss', id: 'motherbrine', x: 44 * TS, y: F * TS });
      L.spawns.push({ type: 'lore', id: 'mw1', x: 12 * TS, y: F * TS });
      L.spawns.push({ type: 'exit', to: null, x: 80 * TS, y: F * TS, bossExit: true });
      L.decos.push({ type: 'archway', x: 80 * TS, y: F * TS }, { type: 'archway', x: 3 * TS, y: F * TS });
      for (const x of [7, 15, 73, 81]) L.decos.push({ type: 'torch', x: x * TS + 7, y: (F - 4) * TS, v: x * 0.1, color: '#ff90c0' });
      for (const x of [21, 34, 55, 66]) L.decos.push({ type: 'glowvine', x: x * TS + 8, y: 2 * TS, len: 6 + (x % 4), v: x * 0.1 });
    } else {
      // throne
      L = new G.Level(90, 26, biomeId);
      const F = 21;
      room(L, 1, 10, 22, F - 10);
      room(L, 23, 1, 56, F - 1);
      for (let x = 23; x < 79; x++) L.set(x, 0, T.SOLID);
      room(L, 79, 6, 10, F - 6);
      for (const [x0, x1, y] of [[28, 34, 15], [68, 74, 15], [40, 48, 11], [54, 62, 11]]) for (let x = x0; x < x1; x++) L.set(x, y, T.PLAT);
      // dais for the lantern at far right
      L.fill(80, F - 2, 9, 2, T.SOLID);
      L.fillBack(0, 0, 23, 26, 1);
      L.fillBack(79, 0, 11, 26, 1);
      for (let x = 26; x < 79; x += 9) L.fillBack(x, 4, 2, 22, 1);
      L.arena = { x0: 24 * TS, x1: 78 * TS, floor: F * TS, gateL: 23 * TS, gateR: 78 * TS };
      L.spawns.push({ type: 'playerStart', x: 5 * TS, y: F * TS });
      L.spawns.push({ type: 'boss', id: 'oris', x: 60 * TS, y: F * TS });
      L.spawns.push({ type: 'lantern', x: 85 * TS, y: (F - 2) * TS });
      L.decos.push({ type: 'lanternTop', x: 85 * TS, y: (F - 2) * TS });
      L.decos.push({ type: 'archway', x: 4 * TS, y: F * TS });
      for (const x of [9, 17]) L.decos.push({ type: 'torch', x: x * TS + 7, y: (F - 4) * TS, v: x * 0.1 });
      for (const x of [30, 45, 57, 72]) L.decos.push({ type: 'banner', x: x * TS, y: 2 * TS, len: 4, color: '#1a2a4a' });
    }
    L.cells.push({ x: 0, y: 0, w: L.pw, h: L.ph, type: 'boss' });
    L.tier = B.tier;
    L.finalize();
    return L;
  };
})();
