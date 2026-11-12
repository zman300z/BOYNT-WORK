'use strict';
/* UNDERSONG — meta: what survives between dives. Pearls, workshop upgrades, the codex,
   recovered logs, paint jobs, settings. Stored in localStorage, and the game is fine without it. */
(function () {
  const KEY = 'undersong.save.v1';
  const fresh = () => ({
    v: 1, pearls: 0, workshop: {}, codex: {}, echoes: {}, paints: ['classic'], paint: 'classic', shades: false, shadesOn: true,
    stats: { dives: 0, wins: 0, bestDepth: 0, bestZone: 0, dissuaded: 0, time: 0 }, settings: null, flags: {},
  });

  G.CODEX = {};
  G.CODEX_ORDER = [];
  G.codexAdd = function (id, entry) { entry.id = id; G.CODEX[id] = entry; G.CODEX_ORDER.push(id); };

  const meta = G.meta = {
    data: fresh(), ok: true,

    WORKSHOP: [
      { id: 'hull', name: 'Reinforced Frame', desc: '+1 hull', max: 2, cost: [30, 75], apply: (st, n) => { st.maxHull += n; } },
      { id: 'emitter', name: 'Tuned Emitter', desc: '+8% pulse strength', max: 3, cost: [25, 50, 90], apply: (st, n) => { st.dmg *= 1 + 0.08 * n; } },
      { id: 'flare', name: 'Flare Rack', desc: '+1 flare', max: 1, cost: [45], apply: (st, n) => { st.flareMax += n; } },
      { id: 'magnet', name: 'Collector Coil', desc: '+25% pickup reach', max: 2, cost: [15, 35], apply: (st, n) => { st.magnet *= 1 + 0.25 * n; } },
      { id: 'lamp', name: 'Wide Lens', desc: 'Longer lamp, faster scans', max: 2, cost: [20, 45], apply: (st, n) => { st.lampR *= 1 + 0.08 * n; st.scanMul *= 1 + 0.25 * n; } },
      { id: 'reroll', name: 'Second Opinion', desc: '+1 reroll each dive', max: 3, cost: [20, 40, 70], apply: () => { } },
      { id: 'luck', name: 'Lucky Barnacle', desc: 'Rarer modules turn up more', max: 2, cost: [35, 75], apply: (st, n) => { st.luck += n; } },
      { id: 'head', name: 'Head Start', desc: 'Begin each dive with a module', max: 1, cost: [80], apply: () => { } },
    ],

    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw), base = fresh();
          if (d && d.v === 1) { this.data = Object.assign(base, d); this.data.stats = Object.assign(fresh().stats, d.stats || {}); }
        }
      } catch (e) { this.ok = false; }
      if (this.data.settings) Object.assign(G.settings, this.data.settings);
    },
    save() {
      this.data.settings = Object.assign({}, G.settings);
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { this.ok = false; }
    },
    wipe() { this.data = fresh(); this.save(); },

    seen(id) { return !!this.data.codex[id]; },
    // returns true the first time a species is ever catalogued
    catalog(id) {
      if (this.data.codex[id]) return false;
      this.data.codex[id] = { n: 0, d: Date.now() };
      this.save();
      return true;
    },
    count(id) { const e = this.data.codex[id]; if (e) e.n++; this.data.stats.dissuaded++; },
    codexProgress() {
      let have = 0;
      for (const id of G.CODEX_ORDER) if (this.data.codex[id]) have++;
      return { have, total: G.CODEX_ORDER.length };
    },

    level(id) { return this.data.workshop[id] || 0; },
    applyWorkshop(st) { for (const w of this.WORKSHOP) { const n = this.level(w.id); if (n) w.apply(st, n); } },
    price(w) { const n = this.level(w.id); return n >= w.max ? null : w.cost[n]; },
    buy(id) {
      const w = this.WORKSHOP.find(x => x.id === id), price = w && this.price(w);
      if (price === null || price === undefined || this.data.pearls < price) return false;
      this.data.pearls -= price; this.data.workshop[id] = this.level(id) + 1;
      this.save();
      return true;
    },
    paintOwned(id) { return this.data.paints.includes(id); },
    buyPaint(id) {
      const p = G.PAINTS.find(x => x.id === id);
      if (!p || this.paintOwned(id) || this.data.pearls < p.cost) return false;
      this.data.pearls -= p.cost; this.data.paints.push(id); this.data.paint = id; this.save();
      return true;
    },
    flag(name, v) { if (v === undefined) return !!this.data.flags[name]; this.data.flags[name] = v; this.save(); },
  };
})();
