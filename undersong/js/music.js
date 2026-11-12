'use strict';
/* UNDERSONG — music: a small generative band.
   One key (D), one idea: six lost probes each still sounding one note — D A F C E G, a stack of
   thirds with the sixth degree missing, so the song never says whether it is the sad minor or the
   hopeful Dorian. The seventh note (B) settles it. Every zone is a different arrangement of that.

   Layers: pad, bass, arp, melody, percussion, and the motif pings (one per probe found).
   `intensity` (0 calm .. 1 fight) opens the filter and brings in the drums. */
(function () {
  const { min, max, floor, random, pow, abs } = Math;
  const A = G.audio, N = G.noteFreq;
  const rnd = (a, b) => a + (b - a) * random();
  const pick = arr => arr[(random() * arr.length) | 0];

  const CH = {
    Dm9: { b: 'D2', n: ['D3', 'A3', 'F4', 'C4', 'E4'] },
    Dm11: { b: 'D2', n: ['D3', 'A3', 'F4', 'C4', 'E4', 'G4'] },
    F: { b: 'F2', n: ['F3', 'C4', 'A4', 'E4', 'G4'] },
    C: { b: 'C2', n: ['C3', 'G3', 'E4', 'D4', 'G4'] },
    Am: { b: 'A1', n: ['A2', 'E3', 'C4', 'G4', 'E4'] },
    G: { b: 'G1', n: ['G2', 'D3', 'F4', 'C4', 'D4'] },
    Bb: { b: 'Bb1', n: ['Bb2', 'F3', 'D4', 'A4', 'E4'] },
    Eb: { b: 'D2', n: ['Eb3', 'Bb3', 'G4', 'D4'], avoid: ['E', 'A'] },
    Gm: { b: 'D2', n: ['G3', 'Bb3', 'D4', 'F4'] },
    D5: { b: 'D2', n: ['D3', 'A3', 'D4', 'A4'] },
    Dm13: { b: 'D2', n: ['D3', 'A3', 'F4', 'C4', 'E4', 'G4', 'B4'] },
    Gmaj: { b: 'G1', n: ['G2', 'D3', 'B3', 'D4', 'G4', 'B4'] },
  };
  const HEX = ['D', 'E', 'F', 'G', 'A', 'C'], DOR = ['D', 'E', 'F', 'G', 'A', 'B', 'C'];
  const MOTIF = ['D4', 'A4', 'F4', 'C5', 'E5', 'G5', 'B5'];
  // rhythm cells for melody phrases: [step, lengthInSteps]
  const CELLS = [
    [[0, 4], [4, 2], [6, 6]], [[2, 2], [4, 4], [10, 6]], [[0, 6], [8, 8]], [[0, 2], [3, 3], [6, 2], [8, 8]],
    [[4, 4], [8, 2], [10, 2], [12, 4]], [[0, 8]], [[6, 2], [8, 4], [12, 4]], [[0, 3], [3, 3], [6, 4], [12, 4]],
  ];

  const MODES = {
    title: { bpm: 63, prog: ['Dm9', 'F', 'C', 'Am'], bars: 2, pad: 1, cut: 950, bass: 0.55, mel: { vol: 0.5, prob: 0.6, inst: 'bell' }, perc: 0, percAt: 2, motif: 0.55 },
    shallows: {
      bpm: 92, prog: ['F', 'C', 'Dm9', 'Am'], bars: 2, pad: 0.9, cut: 1500, bass: 0.6, bassPat: 'x.....x...x.....',
      arp: { vol: 0.46, pat: [0, 2, 1, 3, 2, 4, 1, 3], every: 2, oct: 2, decay: 0.24, wave: 'triangle' },
      mel: { vol: 0.5, prob: 0.5, inst: 'pluck' }, kick: 'x.......x.....x.', hat: '..x...x...x...x.', perc: 0.7, percAt: 0.3, motif: 0.6,
    },
    twilight: {
      bpm: 80, prog: ['Dm9', 'Am', 'F', 'G'], bars: 2, pad: 1, cut: 1000, bass: 0.62,
      arp: { vol: 0.4, pat: [0, -1, 2, -1, 4, -1, 3, -1, 1, -1, 2, -1, 4, -1, -1, -1], every: 1, oct: 2, decay: 0.55, wave: 'sine' },
      mel: { vol: 0.5, prob: 0.4, inst: 'whale' }, kick: 'x.........x.....', hat: '....x.......x...', perc: 0.75, percAt: 0.35, motif: 0.7,
    },
    midnight: {
      bpm: 66, prog: ['Dm9', 'Bb', 'Dm9', 'C'], bars: 2, pad: 0.95, cut: 620, bass: 0.72,
      arp: { vol: 0.3, rand: 0.17, oct: 3, decay: 1.1, wave: 'sine' },
      mel: { vol: 0.45, prob: 0.3, inst: 'bell' }, kick: 'x.......x.......', hat: '......x.......x.', perc: 0.8, percAt: 0.35, motif: 0.8,
    },
    abyss: {
      bpm: 76, prog: ['Dm9', 'Eb', 'Dm9', 'Gm'], bars: 2, pad: 0.9, cut: 520, bass: 0.85, bassPat: 'x..x..x.x..x..x.',
      arp: { vol: 0.2, rand: 0.14, oct: 2, decay: 0.3, wave: 'square' },
      mel: { vol: 0.4, prob: 0.25, inst: 'bell' }, kick: 'x.....x...x.....', hat: '..x.x...x.x...x.', perc: 0.85, percAt: 0.3, motif: 0.8,
    },
    trench: { bpm: 54, prog: ['D5'], bars: 4, pad: 0.7, cut: 420, bass: 0.9, mel: { vol: 0.35, prob: 0.22, inst: 'whale' }, kick: 'x...............', perc: 0.6, percAt: 0.5, motif: 1 },
    garden: {
      bpm: 72, prog: ['Dm11', 'F', 'C', 'Dm11'], bars: 2, pad: 1, cut: 1300, bass: 0.6,
      arp: { vol: 0.38, pat: [0, 2, 4, 5, 4, 2, 3, 1], every: 2, oct: 2, decay: 0.6, wave: 'sine' },
      mel: { vol: 0.5, prob: 0.5, inst: 'bell' }, perc: 0, percAt: 2, motif: 1.1,
    },
    shop: {
      bpm: 88, prog: ['F', 'C', 'Dm9', 'C'], bars: 1, pad: 0.5, cut: 1300, bass: 0.6, bassPat: 'x.....x.x.......',
      arp: { vol: 0.5, pat: [0, 2, 4, 2, 3, 2, 1, 2], every: 2, oct: 2, decay: 0.18, wave: 'triangle' },
      mel: { vol: 0.55, prob: 0.7, inst: 'pluck' }, hat: '....x.......x...', perc: 0.35, percAt: -1, motif: 0.3,
    },
    boss: {
      bpm: 126, prog: ['Dm9', 'Dm9', 'Bb', 'C'], bars: 1, pad: 0.72, cut: 1400, bass: 0.95, bassPat: 'x.x.x.x.x.x.x.xx',
      arp: { vol: 0.4, pat: [0, 2, 4, 2, 1, 2, 4, 2, 0, 2, 3, 2, 1, 2, 4, 3], every: 1, oct: 2, decay: 0.14, wave: 'triangle' },
      mel: { vol: 0.5, prob: 0.5, inst: 'bell' }, kick: 'x...x...x...x...', hat: '..x...x...x.x.x.', snare: '....x.......x...', perc: 1, percAt: -1, motif: 0.6,
    },
    curator: {
      bpm: 116, prog: ['Dm11', 'F', 'C', 'G'], bars: 2, pad: 0.8, cut: 1500, bass: 0.9, bassPat: 'x..x..x.x..x..x.',
      arp: { vol: 0.4, pat: [0, 2, 4, 5, 4, 2, 3, 1, 0, 2, 4, 5, 3, 2, 4, 1], every: 1, oct: 2, decay: 0.16, wave: 'triangle' },
      mel: { vol: 0.5, prob: 0.4, inst: 'bell' }, kick: 'x...x...x...x...', hat: '..x...x...x...x.', snare: '....x.......x..x', perc: 1, percAt: -1, motif: 1.3,
    },
    ending: {
      bpm: 74, prog: ['Dm13', 'Gmaj'], bars: 2, pad: 1.1, cut: 1900, bass: 0.7, scale: DOR,
      arp: { vol: 0.42, pat: [0, 2, 4, 6, 5, 4, 2, 4], every: 2, oct: 2, decay: 0.7, wave: 'sine' },
      mel: { vol: 0.6, prob: 0.75, inst: 'bell' }, kick: 'x.......x.......', perc: 0.5, percAt: -1, motif: 1.2,
    },
    dead: { bpm: 50, prog: ['Dm9'], bars: 4, pad: 0.6, cut: 380, bass: 0.6, perc: 0, percAt: 2, motif: 0.4 },
  };

  const M = G.music = {
    on: false, mode: null, cfg: null, pending: null, step: 0, next: 0, bar: 0, ci: -1, chord: CH.Dm9,
    inten: 0, target: 0, found: 0, vol: 1, volTarget: 1,
    L: null, padVoices: [], melQ: [], evq: [], sfxNotes: [587, 880, 698, 659], lastMel: 9, table: null, tableScale: null,
    beatPhase: 0, lastBeatT: 0, stepLen: 0.2,

    build() {
      if (this.L) return;
      const c = A.ctx, L = this.L = {};
      this.out = c.createGain(); this.out.gain.value = 1; this.out.connect(A.musicBus);
      const layer = (name, rev) => {
        const g = c.createGain(); g.gain.value = 0;
        g.connect(this.out);
        if (rev) { const s = c.createGain(); s.gain.value = rev; g.connect(s); s.connect(A.revIn); }
        L[name] = g;
        return g;
      };
      layer('pad', 0.5); layer('bass', 0.1); layer('mel', 0.75); layer('perc', 0.12); layer('motif', 1);
      // pad runs through one shared filter
      this.padF = c.createBiquadFilter(); this.padF.type = 'lowpass'; this.padF.frequency.value = 900; this.padF.Q.value = 0.7;
      this.padIn = c.createGain(); this.padIn.connect(this.padF); this.padF.connect(L.pad);
      // arp has a feedback delay
      const arp = layer('arp', 0.35);
      this.arpIn = c.createGain(); this.arpIn.connect(arp);
      this.delay = c.createDelay(1.5); this.delay.delayTime.value = 0.4;
      const fb = c.createGain(); fb.gain.value = 0.36;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      const wet = c.createGain(); wet.gain.value = 0.45;
      this.arpIn.connect(this.delay); this.delay.connect(lp); lp.connect(fb); fb.connect(this.delay); lp.connect(wet); wet.connect(arp);
    },

    // switch arrangement at the next bar line (or right away with now=true)
    set(mode, now) {
      if (!MODES[mode]) return;
      if (this.mode === mode && !this.pending) return;
      this.pending = mode;
      if (now || !this.on) this.step = Math.ceil(this.step / 16) * 16;
      if (!this.on && A.ready) this.start();
    },
    start() {
      if (!A.ready) return;
      this.build();
      this.on = true;
      this.next = A.ctx.currentTime + 0.08; this.step = 0;
      if (!this.pending && !this.cfg) this.pending = 'title';
    },
    setIntensity(v) { this.target = v; },
    fade(v) { this.volTarget = v; },

    // frequency of a chord tone for sound effects (keeps the game's noises in key)
    tone(i) { const n = this.sfxNotes; return n[((i % n.length) + n.length) % n.length]; },

    buildTable(scale) {
      if (this.tableScale === scale) return;
      this.tableScale = scale; this.table = [];
      for (let oct = 4; oct <= 6; oct++) for (const nm of scale) this.table.push({ name: nm, f: N(nm + oct) });
      this.table.sort((a, b) => a.f - b.f);
    },

    newChord(t, dur) {
      const c = A.ctx, cfg = this.cfg, ch = this.chord;
      // pad
      const att = min(1.8, dur * 0.35), rel = 2.4, v = 0.05;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att);
      g.gain.setValueAtTime(v, t + dur - 0.1); g.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
      g.connect(this.padIn);
      const oscs = [];
      for (const nm of ch.n) {
        const f = N(nm);
        for (let d = -1; d <= 1; d += 2) {
          const o = c.createOscillator(); o.type = d < 0 ? 'sawtooth' : 'triangle';
          o.frequency.value = f; o.detune.value = d * rnd(5, 9);
          o.connect(g); o.start(t); o.stop(t + dur + rel + 0.1);
          oscs.push(o);
        }
      }
      this.padVoices.push({ g, oscs, end: t + dur + rel + 0.2 });
      // bass drone (when there is no pulse pattern)
      if (!cfg.bassPat) {
        const f = N(ch.b);
        A.tone({ at: t, f, t: dur + 1.2, a: min(1.2, dur * 0.3), hold: dur * 0.5, v: 0.34, bus: this.L.bass, rev: 0 });
        A.tone({ at: t, type: 'triangle', f: f * 2, t: dur + 1, a: min(1.4, dur * 0.3), hold: dur * 0.4, v: 0.07, bus: this.L.bass, rev: 0 });
      }
      // notes for sound effects: chord tones folded into one octave around D5..D6
      this.sfxNotes = ch.n.map(nm => { let f = N(nm); while (f < 560) f *= 2; while (f > 1130) f /= 2; return f; });
    },
    releasePads(t) {
      for (const v of this.padVoices) {
        try { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0.0001, t, 0.5); for (const o of v.oscs) o.stop(t + 3); } catch (e) { /* already stopped */ }
        v.end = t + 3.2;
      }
    },

    planBar(absStep) {
      const cfg = this.cfg, mel = cfg.mel;
      if (!mel) return;
      if (this.melQ.length > 2) return;
      if (random() > mel.prob * (0.75 + 0.5 * this.inten)) return;
      this.buildTable(cfg.scale || HEX);
      const tb = this.table, ch = this.chord;
      const tones = new Set(ch.n.map(nm => nm.replace(/\d/g, '')));
      const cell = pick(CELLS);
      let deg = this.lastMel;
      const stepLen = 60 / cfg.bpm / 4;
      for (const [so, len] of cell) {
        let tries = 0, nd = deg;
        do {
          nd = deg + pick([-2, -1, -1, 1, 1, 2, 0]);
          if (nd < 3) nd += 2; if (nd > tb.length - 3) nd -= 3;
          tries++;
        } while (tries < 8 && ((ch.avoid && ch.avoid.includes(tb[nd].name)) || (so % 4 === 0 && !tones.has(tb[nd].name) && random() < 0.7)));
        deg = nd;
        this.melQ.push({ step: absStep + so, f: tb[deg].f, dur: len * stepLen });
      }
      this.lastMel = deg;
    },

    playMel(q, t) {
      const inst = this.cfg.mel.inst, L = this.L.mel;
      if (inst === 'bell') {
        A.tone({ at: t, f: q.f, t: max(1.2, q.dur * 2.2), v: 0.13, bus: L, rev: 0, fm: { r: 2.005, i: 0.9, d: 0.35 } });
        A.tone({ at: t, f: q.f * 2, t: 0.5, v: 0.03, bus: L, rev: 0 });
      } else if (inst === 'pluck') {
        A.tone({ at: t, type: 'triangle', f: q.f, t: max(0.35, q.dur * 1.2), v: 0.16, bus: L, rev: 0 });
        A.tone({ at: t, f: q.f * 2, t: 0.18, v: 0.05, bus: L, rev: 0 });
      } else {      // whale: slow, sliding, far away
        const from = this.lastWhaleF || q.f, d = max(1.6, q.dur * 2.4);
        A.tone({ at: t, f: from * 0.5, f2: q.f * 0.5, ft: 0.4, t: d, a: 0.35, v: 0.16, bus: L, rev: 0, vib: { r: 4.4, d: q.f * 0.006 } });
        A.tone({ at: t, f: from, f2: q.f, ft: 0.4, t: d * 0.8, a: 0.5, v: 0.035, bus: L, rev: 0 });
        this.lastWhaleF = q.f;
      }
    },

    schedule(step, t) {
      const s16 = step & 15;
      if (s16 === 0) {
        if (this.pending) {
          const nm = this.pending; this.pending = null;
          this.mode = nm; this.cfg = MODES[nm]; this.bar = 0; this.ci = -1; this.melQ.length = 0;
          this.releasePads(t);
          this.delay.delayTime.setTargetAtTime(min(1.4, 60 / this.cfg.bpm / 4 * 3), t, 0.05);
        }
        const cfg = this.cfg;
        if (this.bar % cfg.bars === 0) {
          this.ci = (this.ci + 1) % cfg.prog.length;
          this.chord = CH[cfg.prog[this.ci]];
          this.newChord(t, cfg.bars * 16 * (60 / cfg.bpm / 4));
        }
        this.planBar(step);
        this.bar++;
      }
      const cfg = this.cfg, ch = this.chord, L = this.L, sl = 60 / cfg.bpm / 4;
      this.stepLen = sl;
      // percussion
      if (cfg.kick && cfg.kick[s16] === 'x') A.tone({ at: t, f: 108, f2: 40, t: 0.24, v: 0.5, bus: L.perc, rev: 0 });
      if (cfg.hat && cfg.hat[s16] === 'x') A.noise({ at: t, type: 'highpass', f: 6400, t: 0.04, v: 0.11, bus: L.perc, rev: 0 });
      if (cfg.snare && cfg.snare[s16] === 'x') { A.noise({ at: t, f: 1700, q: 0.7, t: 0.13, v: 0.22, bus: L.perc, rev: 0 }); A.tone({ at: t, f: 196, f2: 130, t: 0.1, v: 0.16, bus: L.perc, rev: 0 }); }
      // bass pulse
      if (cfg.bassPat && cfg.bassPat[s16] === 'x') {
        const f = N(ch.b);
        A.tone({ at: t, f, t: sl * 2.6, v: 0.36, bus: L.bass, rev: 0 });
        A.tone({ at: t, type: 'triangle', f: f * 2, t: sl * 1.6, v: 0.1, bus: L.bass, rev: 0, lp: 900 });
      }
      // arp
      const arp = cfg.arp;
      if (arp) {
        let idx = -1;
        if (arp.pat) { if (step % arp.every === 0) idx = arp.pat[(step / arp.every | 0) % arp.pat.length]; }
        else if (random() < arp.rand * (0.7 + 0.8 * this.inten)) idx = (random() * ch.n.length) | 0;
        if (idx >= 0) {
          const f = N(ch.n[idx % ch.n.length]) * pow(2, arp.oct - 1);
          A.tone({ at: t, type: arp.wave, f, t: arp.decay, v: arp.wave === 'square' ? 0.05 : 0.13, bus: this.arpIn, rev: 0, lp: arp.wave === 'square' ? 1400 : 0 });
        }
      }
      // melody
      for (let i = this.melQ.length - 1; i >= 0; i--) {
        const q = this.melQ[i];
        if (q.step === step) { this.playMel(q, t); this.melQ.splice(i, 1); }
        else if (q.step < step) this.melQ.splice(i, 1);
      }
      // the motif: each found probe sounds its note once every two bars
      if (this.found > 0 && cfg.motif) {
        const s32 = step & 31;
        if ((s32 & 3) === 2) {
          const i = s32 >> 2;
          if (i < this.found && i < 7) {
            const f = N(MOTIF[i]);
            A.tone({ at: t, f, t: 2.4, a: 0.006, v: 0.1, bus: L.motif, rev: 0, fm: { r: 2.003, i: 0.7, d: 0.4 } });
            A.tone({ at: t, f: f * 2.003, t: 1.2, v: 0.02, bus: L.motif, rev: 0 });
            this.evq.push({ t, kind: 'motif', i });
          }
        }
      }
      this.evq.push({ t, kind: 'step', i: s16 });
    },

    update(dt) {
      if (!A.ready || !this.on) return;
      const c = A.ctx, now = c.currentTime, cfg = this.cfg;
      this.inten += (this.target - this.inten) * min(1, dt * (this.target > this.inten ? 2.2 : 0.45));
      this.vol += (this.volTarget - this.vol) * min(1, dt * 1.2);
      if (this.next < now - 0.3) this.next = now + 0.06;
      while (this.next < now + 0.15) {
        this.schedule(this.step, this.next);
        this.next += 60 / this.cfg.bpm / 4;
        this.step++;
      }
      const g = this.cfg, L = this.L, k = 0.25, it = this.inten;
      this.out.gain.setTargetAtTime(this.vol, now, 0.1);
      L.pad.gain.setTargetAtTime(g.pad * 1.0, now, k);
      L.bass.gain.setTargetAtTime(g.bass * (0.8 + 0.3 * it), now, k);
      L.arp.gain.setTargetAtTime(g.arp ? g.arp.vol * (0.55 + 0.6 * it) : 0, now, k);
      L.mel.gain.setTargetAtTime(g.mel ? g.mel.vol : 0, now, k);
      L.perc.gain.setTargetAtTime(g.perc * G.smoothstep(g.percAt, g.percAt + 0.3, it), now, k);
      L.motif.gain.setTargetAtTime(g.motif || 0, now, k);
      this.padF.frequency.setTargetAtTime(g.cut * (1 + it * 0.9) * (1 + 0.12 * Math.sin(now * 0.23)), now, 0.3);
      // deliver timed events to the game as their audio becomes audible
      while (this.evq.length && this.evq[0].t <= now) {
        const e = this.evq.shift();
        if (e.kind === 'step') { if ((e.i & 3) === 0) { this.lastBeatT = now; G.emit('beat', e.i >> 2); } G.emit('step16', e.i); }
        else G.emit('motif', e.i);
      }
      this.beatPhase = G.clamp01((now - this.lastBeatT) / (this.stepLen * 4));
      for (let i = this.padVoices.length - 1; i >= 0; i--) if (this.padVoices[i].end < now) { try { this.padVoices[i].g.disconnect(); } catch (e) { /* gone */ } this.padVoices.splice(i, 1); }
    },

    // a single dramatic low hit (boss entrances, big reveals)
    hit(v) {
      if (!A.ready || !this.L) return;
      A.tone({ f: 73.4, f2: 36.7, t: 2.4, v: 0.6 * (v || 1), bus: this.L.perc, rev: 0.5 });
      A.tone({ type: 'sawtooth', f: 73.4, t: 2.2, a: 0.01, v: 0.16 * (v || 1), lp: 900, lp2: 120, bus: this.L.pad, rev: 0.6 });
      A.noise({ type: 'lowpass', f: 900, f2: 90, t: 1.6, v: 0.3 * (v || 1), bus: this.L.perc, rev: 0.5 });
    },
  };
  M.MODES = MODES;

  G.on('audioReady', () => { if (!A.offline) M.start(); });
})();
