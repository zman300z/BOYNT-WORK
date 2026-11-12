'use strict';
/* UNDERSONG — audio: WebAudio graph + every sound effect, synthesized.
   Nothing is sampled. Tonal effects ask the music for a note in the current chord, so the
   game's noises sit inside the soundtrack instead of on top of it. */
(function () {
  const { min, max, pow, random, PI } = Math;
  const { clamp } = G;

  const A = G.audio = {
    ctx: null, ready: false, master: null, limiter: null, muffleF: null, sfxBus: null, musicBus: null, ambBus: null, reverb: null, revIn: null,
    noiseBuf: null, last: {}, offline: false,

    init(ctx) {
      if (this.ready) return true;
      try { this.ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
      const c = this.ctx;
      this.offline = !!ctx;
      this.limiter = c.createDynamicsCompressor();
      this.limiter.threshold.value = -9; this.limiter.knee.value = 9; this.limiter.ratio.value = 14; this.limiter.attack.value = 0.003; this.limiter.release.value = 0.22;
      this.limiter.connect(c.destination);
      this.muffleF = c.createBiquadFilter(); this.muffleF.type = 'lowpass'; this.muffleF.frequency.value = 20000; this.muffleF.Q.value = 0.5;
      this.muffleF.connect(this.limiter);
      this.master = c.createGain(); this.master.connect(this.muffleF);
      this.sfxBus = c.createGain(); this.musicBus = c.createGain(); this.ambBus = c.createGain();
      const water = c.createBiquadFilter(); water.type = 'lowpass'; water.frequency.value = 7200; water.Q.value = 0.4;
      this.sfxBus.connect(water); water.connect(this.master);
      this.musicBus.connect(this.master); this.ambBus.connect(this.master);
      // reverb: a long, dark, generated impulse — the sound of a lot of water
      const len = Math.floor(c.sampleRate * 3.4), ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch); let lp = 0;
        for (let i = 0; i < len; i++) {
          const t = i / len, env = pow(1 - t, 2.6) * (i < 400 ? i / 400 : 1);
          const k = 0.5 - 0.4 * t;            // gets duller as it rings
          lp += ((random() * 2 - 1) - lp) * k;
          d[i] = lp * env;
        }
      }
      this.reverb = c.createConvolver(); this.reverb.buffer = ir;
      this.revIn = c.createGain(); this.revIn.gain.value = 1;
      const revOut = c.createGain(); revOut.gain.value = 0.9;
      this.revIn.connect(this.reverb); this.reverb.connect(revOut); revOut.connect(this.master);
      const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = random() * 2 - 1;
      this.noiseBuf = nb;
      this.ready = true;
      this.setVolumes();
      G.emit('audioReady');
      return true;
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    setVolumes() {
      if (!this.ready) return;
      const s = G.settings, t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(s.master, t, 0.05);
      this.sfxBus.gain.setTargetAtTime(s.sfx * 0.9, t, 0.05);
      this.musicBus.gain.setTargetAtTime(s.music * 0.72, t, 0.05);
      this.ambBus.gain.setTargetAtTime(s.sfx * 0.5, t, 0.05);
    },
    // 0 = clear, 1 = heard through a wall of water (pause, death)
    muffle(amount) {
      if (!this.ready) return;
      this.muffleF.frequency.setTargetAtTime(20000 * pow(0.022, clamp(amount, 0, 1)), this.ctx.currentTime, 0.12);
    },

    _out(node, o, t0) {
      const c = this.ctx, bus = o.bus || this.sfxBus;
      let last = node;
      if (o.pan) { const p = c.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); last.connect(p); last = p; }
      last.connect(bus);
      const rev = o.rev === undefined ? 0.15 : o.rev;
      if (rev > 0) { const s = c.createGain(); s.gain.value = rev; last.connect(s); s.connect(this.revIn); }
    },
    // o: {type,f,f2,ft,t,a,v,pan,when,rev,bus,detune,fm:{r,i,d},vib:{r,d},lp,lp2,hold}
    tone(o) {
      if (!this.ready) return;
      const c = this.ctx, t0 = o.at !== undefined ? o.at : c.currentTime + (o.when || 0), dur = o.t || 0.2, a = o.a === undefined ? 0.004 : o.a, v = o.v === undefined ? 0.2 : o.v;
      const osc = c.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(max(10, o.f), t0);
      if (o.f2) osc.frequency.exponentialRampToValueAtTime(max(10, o.f2), t0 + (o.ft || dur));
      if (o.detune) osc.detune.value = o.detune;
      let mod = null, lfo = null;
      if (o.fm) {
        mod = c.createOscillator(); mod.frequency.value = o.f * o.fm.r;
        const mg = c.createGain(); mg.gain.setValueAtTime(o.f * o.fm.i, t0); mg.gain.exponentialRampToValueAtTime(max(0.01, o.f * o.fm.i * 0.02), t0 + (o.fm.d || dur));
        mod.connect(mg); mg.connect(osc.frequency); mod.start(t0); mod.stop(t0 + dur + 0.05);
      }
      if (o.vib) {
        lfo = c.createOscillator(); lfo.frequency.value = o.vib.r;
        const lg = c.createGain(); lg.gain.value = o.vib.d; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
      }
      const g = c.createGain(), hold = o.hold || 0;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(v, t0 + a);
      if (hold) g.gain.setValueAtTime(v, t0 + a + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      let last = osc;
      if (o.lp) {
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t0);
        if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t0 + dur);
        last.connect(f); last = f;
      }
      last.connect(g);
      this._out(g, o, t0);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    },
    // o: {t,a,v,f,f2,q,type,pan,when,rev,bus}
    noise(o) {
      if (!this.ready) return;
      const c = this.ctx, t0 = o.at !== undefined ? o.at : c.currentTime + (o.when || 0), dur = o.t || 0.1, a = o.a === undefined ? 0.003 : o.a, v = o.v === undefined ? 0.2 : o.v;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q === undefined ? 1 : o.q;
      f.frequency.setValueAtTime(o.f || 1000, t0);
      if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g);
      this._out(g, o, t0);
      src.start(t0, random() * 1.5); src.stop(t0 + dur + 0.05);
    },
    limit(name, gap) {
      const t = this.ctx.currentTime;
      if (t - (this.last[name] || -9) < gap) return false;
      this.last[name] = t;
      return true;
    },
  };

  // note helpers --------------------------------------------------------------
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const fcache = {};
  G.noteFreq = function (name) {       // 'D4', 'Bb2', 'F#5'
    let f = fcache[name];
    if (f) return f;
    let i = 1, s = SEMI[name[0]];
    if (name[1] === '#') { s++; i++; } else if (name[1] === 'b') { s--; i++; }
    const oct = +name.slice(i);
    f = 440 * pow(2, (s - 9 + (oct - 4) * 12) / 12);
    fcache[name] = f;
    return f;
  };
  const N = G.noteFreq;
  const PENTA = ['D5', 'F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6', 'A6', 'C7', 'D7', 'F7', 'G7', 'A7', 'C8'];
  const chordTone = i => (G.music && G.music.tone ? G.music.tone(i) : N(['D5', 'A5', 'F5', 'E5'][i & 3]));

  // world position -> pan + distance falloff
  function place(o, out) {
    out.pan = 0; out.v = 1;
    if (o && o.x !== undefined && G.cam) {
      const dx = o.x - G.cam.x, dy = (o.y === undefined ? G.cam.y : o.y) - G.cam.y;
      out.pan = clamp(dx / 760, -1, 1) * 0.75;
      out.v = clamp(1.15 - Math.hypot(dx, dy) / 1000, 0.12, 1);
    }
    return out;
  }
  const _p = { pan: 0, v: 1 };
  const rnd = (a, b) => a + (b - a) * random();

  // ---------------------------------------------------------------- the sound table
  let shotI = 0;
  const S = {
    shoot(o) {
      if (!A.limit('shoot', 0.045)) return;
      const echo = o.echo, f = chordTone(shotI++) * (1 + (o.heat || 0) * 0.06) * rnd(0.995, 1.005), v = echo ? 0.06 : 0.11;
      A.tone({ f: f * 1.5, f2: f, ft: 0.035, t: 0.16, v, rev: 0.22 });
      A.tone({ type: 'triangle', f: f * 0.5, t: 0.09, v: v * 0.8, rev: 0.05 });
      if (!echo) A.noise({ f: 3200, q: 0.8, t: 0.03, v: 0.035, rev: 0 });
    },
    shootBig() {
      const f = chordTone(0) * 0.5;
      A.tone({ f: f * 2, f2: f, ft: 0.08, t: 0.5, v: 0.22, rev: 0.4 });
      A.tone({ type: 'triangle', f: f * 0.5, t: 0.4, v: 0.25, rev: 0.2 });
      A.noise({ f: 900, f2: 3800, q: 0.7, t: 0.22, v: 0.14 });
    },
    chord() {
      for (let i = 0; i < 3; i++) A.tone({ f: chordTone(i * 2) * (i === 2 ? 1 : 0.5), t: 0.55, v: 0.1, rev: 0.45, fm: { r: 2, i: 0.6, d: 0.2 } });
      A.noise({ f: 1500, f2: 5200, q: 0.6, t: 0.2, v: 0.07 });
    },
    tick(o) { if (!A.limit('tick', 0.05)) return; place(o, _p); A.noise({ f: 2800, q: 2, t: 0.03, v: 0.05 * _p.v, pan: _p.pan, rev: 0.05 }); },
    ricochet(o) { place(o, _p); A.tone({ f: rnd(1700, 2100), f2: 2900, t: 0.07, v: 0.06 * _p.v, pan: _p.pan, rev: 0.3 }); },
    pop(o) { if (!A.limit('pop', 0.04)) return; place(o, _p); A.tone({ f: rnd(380, 520), f2: rnd(1300, 1700), t: 0.06, v: 0.13 * _p.v, pan: _p.pan }); A.noise({ f: 700, q: 0.8, t: 0.09, v: 0.1 * _p.v, pan: _p.pan }); },
    hit(o) {
      if (!A.limit('hit', 0.04)) return;
      place(o, _p);
      const big = o && o.big ? 1 : 0;
      A.noise({ f: 820 - big * 300, q: 1.1, t: 0.07 + big * 0.05, v: (0.16 + big * 0.1) * _p.v, pan: _p.pan, rev: 0.08 });
      A.tone({ f: 300 - big * 110, f2: 150 - big * 60, t: 0.08 + big * 0.06, v: (0.15 + big * 0.1) * _p.v, pan: _p.pan, rev: 0.05 });
      if (o && o.crit) A.tone({ f: N('A6'), t: 0.3, v: 0.09 * _p.v, pan: _p.pan, fm: { r: 3.01, i: 1.2, d: 0.1 }, rev: 0.4 });
    },
    clang(o) { if (!A.limit('clang', 0.06)) return; place(o, _p); A.tone({ f: rnd(900, 1100), t: 0.22, v: 0.1 * _p.v, pan: _p.pan, fm: { r: 5.4, i: 2.2, d: 0.08 }, rev: 0.3 }); A.noise({ f: 4200, q: 3, t: 0.04, v: 0.07 * _p.v, pan: _p.pan }); },
    // a creature decides it has had enough and leaves; size 0 (tiny) .. 1 (huge)
    flee(o) {
      if (!A.limit('flee', 0.05)) return;
      place(o, _p);
      const sz = o && o.size !== undefined ? o.size : 0.3, f = 620 - sz * 420;
      A.tone({ f, f2: f * 2.6, ft: 0.13, t: 0.2, v: 0.2 * _p.v, pan: _p.pan, rev: 0.3, vib: { r: 30, d: f * 0.06 } });
      for (let i = 0; i < 3; i++) A.tone({ f: rnd(500, 900), f2: rnd(1500, 2200), t: 0.05, v: 0.07 * _p.v, pan: _p.pan, when: 0.05 + i * rnd(0.03, 0.06) });
      A.noise({ f: 600, f2: 1800, q: 0.7, t: 0.2, v: 0.09 * _p.v, pan: _p.pan });
    },
    spit(o) { if (!A.limit('spit', 0.05)) return; place(o, _p); A.noise({ f: 900, q: 3, t: 0.07, v: 0.14 * _p.v, pan: _p.pan }); A.tone({ f: 520, f2: 240, t: 0.09, v: 0.1 * _p.v, pan: _p.pan }); },
    zap(o) { if (!A.limit('zap', 0.08)) return; place(o, _p); for (let i = 0; i < 4; i++) A.tone({ type: 'sawtooth', f: rnd(500, 2400), f2: rnd(200, 1800), t: 0.035, v: 0.06 * _p.v, pan: _p.pan, when: i * 0.03, lp: 3500, rev: 0.2 }); },
    whoosh(o) { place(o, _p); A.noise({ f: 500, f2: 2600, q: 0.9, t: 0.26, a: 0.06, v: 0.2 * _p.v, pan: _p.pan }); },
    inflate(o) { place(o, _p); A.tone({ f: 130, f2: 360, t: 0.26, a: 0.05, v: 0.2 * _p.v, pan: _p.pan, type: 'triangle' }); A.noise({ f: 400, f2: 1400, q: 1, t: 0.24, a: 0.05, v: 0.08 * _p.v, pan: _p.pan }); },
    snap(o) { place(o, _p); A.noise({ f: 2400, q: 1.5, t: 0.035, v: 0.2 * _p.v, pan: _p.pan }); A.tone({ f: 180, f2: 70, t: 0.11, v: 0.24 * _p.v, pan: _p.pan }); },
    clack(o) { if (!A.limit('clack', 0.07)) return; place(o, _p); A.tone({ f: rnd(1000, 1300), t: 0.04, v: 0.1 * _p.v, pan: _p.pan, rev: 0.1 }); A.tone({ f: rnd(760, 900), t: 0.04, v: 0.09 * _p.v, pan: _p.pan, when: 0.07, rev: 0.1 }); },
    squelch(o) { place(o, _p); A.noise({ type: 'lowpass', f: 1800, f2: 200, q: 4, t: 0.3, v: 0.22 * _p.v, pan: _p.pan }); A.tone({ f: 220, f2: 90, t: 0.22, v: 0.12 * _p.v, pan: _p.pan }); },
    pulse(o) { if (!A.limit('pulse', 0.1)) return; place(o, _p); A.tone({ f: 150, f2: 96, t: 0.38, a: 0.08, v: 0.11 * _p.v, pan: _p.pan, rev: 0.3 }); },
    crack(o) {       // mantis strike: the snap, the thump, then the cavitation bubble collapsing
      place(o, _p);
      A.noise({ type: 'highpass', f: 2200, t: 0.05, v: 0.4 * _p.v, pan: _p.pan, rev: 0.3 });
      A.tone({ f: 150, f2: 42, t: 0.3, v: 0.5 * _p.v, pan: _p.pan, rev: 0.2 });
      A.tone({ f: 700, f2: 2400, t: 0.05, v: 0.2 * _p.v, pan: _p.pan, when: 0.07 });
    },
    telegraph(o) { place(o, _p); A.tone({ type: 'triangle', f: 600, f2: 1200, t: 0.22, a: 0.1, v: 0.1 * _p.v, pan: _p.pan, rev: 0.25 }); },
    growl(o) { place(o, _p); A.tone({ type: 'sawtooth', f: 78, f2: 52, t: 0.9, a: 0.1, v: 0.3 * _p.v, pan: _p.pan, lp: 520, lp2: 180, fm: { r: 0.31, i: 1.4, d: 0.9 }, rev: 0.4 }); },
    roar() {
      A.tone({ type: 'sawtooth', f: 64, f2: 38, t: 1.9, a: 0.18, v: 0.5, lp: 700, lp2: 140, fm: { r: 0.27, i: 2.2, d: 1.8 }, rev: 0.7 });
      A.tone({ type: 'sawtooth', f: 97, f2: 55, t: 1.6, a: 0.25, v: 0.3, lp: 900, lp2: 200, fm: { r: 0.52, i: 1.6, d: 1.5 }, rev: 0.7 });
      A.noise({ type: 'lowpass', f: 500, f2: 120, q: 1, t: 2, a: 0.2, v: 0.4, rev: 0.6 });
    },
    bossDown() {
      A.tone({ f: 90, f2: 30, t: 2.4, v: 0.6, rev: 0.7 });
      A.noise({ type: 'lowpass', f: 2400, f2: 90, q: 0.7, t: 2.4, v: 0.45, rev: 0.7 });
      for (let i = 0; i < 6; i++) A.tone({ f: N(PENTA[2 + i * 2]), t: 1.6, v: 0.08, when: 0.5 + i * 0.11, fm: { r: 2.01, i: 0.8, d: 0.3 }, rev: 0.8 });
    },
    whale(o) {      // somebody very large, very far away
      const base = rnd(150, 210), v = (o && o.v) || 0.2;
      let when = 0;
      for (let i = 0; i < 3; i++) {
        const d = rnd(1.1, 2.2), f1 = base * rnd(0.8, 1.5), f2 = base * rnd(0.7, 1.9);
        A.tone({ f: f1, f2, ft: d * 0.8, t: d, a: d * 0.3, v, when, rev: 1, vib: { r: rnd(3, 6), d: f1 * 0.02 }, bus: A.ambBus, pan: rnd(-0.6, 0.6) });
        A.tone({ f: f1 * 2.01, f2: f2 * 2.01, ft: d * 0.8, t: d, a: d * 0.3, v: v * 0.25, when, rev: 1, bus: A.ambBus });
        when += d * rnd(0.8, 1.15);
      }
    },
    creak() { const f = rnd(48, 90); A.tone({ type: 'sawtooth', f, f2: f * rnd(0.7, 1.4), t: rnd(0.8, 1.7), a: 0.2, v: 0.14, lp: 420, fm: { r: 0.11, i: 3, d: 1 }, rev: 0.6, bus: A.ambBus, pan: rnd(-0.7, 0.7) }); },
    bubble(o) { place(o, _p); const f = rnd(300, 900); A.tone({ f, f2: f * rnd(1.8, 2.6), t: rnd(0.04, 0.09), v: 0.05 * _p.v, pan: _p.pan, bus: A.ambBus, rev: 0.3 }); },

    // --- player
    dash() { A.noise({ f: 500, f2: 2600, q: 0.8, t: 0.24, a: 0.02, v: 0.24 }); A.tone({ f: 190, f2: 80, t: 0.2, v: 0.18 }); A.tone({ f: chordTone(1) * 0.5, f2: chordTone(1), ft: 0.12, t: 0.2, v: 0.05, rev: 0.4 }); },
    bump(o) { if (!A.limit('bump', 0.12)) return; const v = (o && o.v) || 0.5; A.tone({ f: 120, f2: 58, t: 0.12, v: 0.25 * v }); A.noise({ type: 'lowpass', f: 420, t: 0.08, v: 0.14 * v }); },
    splash() { if (!A.limit('splash', 0.3)) return; A.noise({ type: 'highpass', f: 1400, t: 0.32, a: 0.02, v: 0.18, rev: 0.2 }); },
    hurt() {
      A.tone({ f: 150, f2: 46, t: 0.32, v: 0.55, rev: 0.2 });
      A.noise({ f: 1300, q: 0.8, t: 0.18, v: 0.34 });
      A.tone({ type: 'square', f: 880, t: 0.07, v: 0.07, lp: 2400, when: 0.1 }); A.tone({ type: 'square', f: 660, t: 0.1, v: 0.07, lp: 2400, when: 0.2 });
    },
    death() {
      A.tone({ type: 'sawtooth', f: 330, f2: 36, t: 2.2, v: 0.3, lp: 2200, lp2: 120, rev: 0.6 });
      A.tone({ f: 82, f2: 28, t: 2.6, v: 0.55, rev: 0.5 });
      A.noise({ type: 'lowpass', f: 3000, f2: 80, t: 2.4, v: 0.3, rev: 0.5 });
    },
    heal() { ['F5', 'A5', 'C6'].forEach((n, i) => A.tone({ f: N(n), t: 0.4, v: 0.11, when: i * 0.07, rev: 0.5, fm: { r: 2, i: 0.4, d: 0.1 } })); },
    flare() {
      A.noise({ type: 'highpass', f: 1600, f2: 5200, t: 0.7, a: 0.01, v: 0.3, rev: 0.6 });
      A.tone({ f: 70, f2: 34, t: 0.6, v: 0.5 });
      ['D5', 'A5', 'E6'].forEach((n, i) => A.tone({ f: N(n), t: 1.3, v: 0.1, fm: { r: 3.01, i: 1, d: 0.3 }, rev: 0.8, when: i * 0.02 }));
    },
    flareReady() { A.tone({ f: N('A5'), t: 0.25, v: 0.08, rev: 0.4 }); A.tone({ f: N('D6'), t: 0.4, v: 0.08, when: 0.09, rev: 0.5 }); },
    sonar() {
      const f = N('D6');
      A.tone({ f, t: 1.7, a: 0.002, v: 0.2, rev: 0.9, fm: { r: 2.005, i: 0.5, d: 0.25 } });
      A.tone({ f: f * 0.995, t: 0.9, a: 0.002, v: 0.06, rev: 0.9, when: 0.42, lp: 1800 });
      A.tone({ f: f * 0.99, t: 0.8, a: 0.002, v: 0.03, rev: 0.9, when: 0.84, lp: 1300 });
    },
    deny() { if (!A.limit('deny', 0.2)) return; A.tone({ type: 'square', f: 116, t: 0.1, v: 0.1, lp: 420 }); },
    breathReady() { A.tone({ f: 420, f2: 880, t: 0.22, a: 0.1, v: 0.06, rev: 0.3 }); },
    plate() { A.tone({ f: N('E6'), t: 0.3, v: 0.07, fm: { r: 5.4, i: 1.4, d: 0.06 }, rev: 0.4 }); },
    plateBreak() { A.noise({ f: 2600, q: 1.2, t: 0.16, v: 0.28 }); A.tone({ f: 1500, t: 0.25, v: 0.12, fm: { r: 5.4, i: 3, d: 0.1 }, rev: 0.3 }); },

    // --- pickups & progress
    mote(o) { if (!A.limit('mote', 0.028)) return; A.tone({ f: N(PENTA[min(PENTA.length - 1, (o && o.n) || 0)]), t: 0.16, v: 0.075, rev: 0.3, fm: { r: 2, i: 0.5, d: 0.05 } }); },
    pearl() { if (!A.limit('pearl', 0.04)) return; const f = N(['A6', 'D7', 'E7'][(random() * 3) | 0]); A.tone({ f, t: 0.6, v: 0.09, rev: 0.6, fm: { r: 3.01, i: 0.9, d: 0.12 } }); },
    levelup() {
      ['D5', 'F5', 'A5', 'C6', 'E6', 'A6'].forEach((n, i) => A.tone({ f: N(n), t: 0.9, v: 0.11, when: i * 0.065, rev: 0.7, fm: { r: 2.005, i: 0.7, d: 0.2 } }));
      A.noise({ type: 'highpass', f: 5000, t: 0.8, a: 0.2, v: 0.04, rev: 0.6 });
    },
    module() { ['A5', 'D6', 'F6'].forEach((n, i) => A.tone({ f: N(n), t: 0.7, v: 0.1, when: i * 0.05, rev: 0.6, fm: { r: 2.005, i: 0.6, d: 0.2 } })); A.tone({ f: N('D3'), t: 0.6, v: 0.16, rev: 0.4 }); },
    scanTick(o) { if (!A.limit('scan', 0.085)) return; A.tone({ f: 700 + 700 * ((o && o.p) || 0), t: 0.045, v: 0.035, rev: 0.2 }); },
    scanDone() { A.tone({ f: N('E6'), t: 0.3, v: 0.1, rev: 0.5 }); A.tone({ f: N('A6'), t: 0.5, v: 0.1, when: 0.09, rev: 0.6 }); },
    newSpecies() {
      ['F5', 'A5', 'C6', 'F6', 'A6'].forEach((n, i) => A.tone({ f: N(n), t: 1.1, v: 0.1, when: 0.1 + i * 0.08, rev: 0.8, fm: { r: 3.01, i: 0.8, d: 0.25 } }));
      A.noise({ type: 'highpass', f: 6000, t: 1, a: 0.3, v: 0.03, rev: 0.6 });
    },
    // one of the seven: a found probe answers. o.i = which
    songNote(o) {
      const n = ['D4', 'A4', 'F4', 'C5', 'E5', 'G5', 'B5'][(o && o.i) || 0], f = N(n);
      A.tone({ f, t: 3.2, a: 0.01, v: 0.24, rev: 1, fm: { r: 2.003, i: 0.9, d: 0.5 } });
      A.tone({ f: f * 2.002, t: 2.2, a: 0.01, v: 0.07, rev: 1 });
      A.tone({ f: f / 2, t: 2.6, a: 0.05, v: 0.12, rev: 0.6 });
    },
    cache() { A.tone({ f: 130, f2: 80, t: 0.2, v: 0.3 }); A.noise({ f: 900, q: 1, t: 0.12, v: 0.2 }); ['D6', 'A6', 'D7'].forEach((n, i) => A.tone({ f: N(n), t: 0.7, v: 0.07, when: 0.12 + i * 0.06, rev: 0.7, fm: { r: 3.01, i: 0.8, d: 0.2 } })); },
    buy() { A.tone({ f: N('A5'), t: 0.3, v: 0.11, fm: { r: 3.01, i: 1, d: 0.1 }, rev: 0.4 }); A.tone({ f: N('E6'), t: 0.5, v: 0.11, when: 0.08, fm: { r: 3.01, i: 1, d: 0.1 }, rev: 0.5 }); },
    gate() { A.noise({ type: 'lowpass', f: 260, t: 1.3, a: 0.1, v: 0.5, rev: 0.4 }); A.tone({ f: 60, f2: 40, t: 1.2, a: 0.1, v: 0.4 }); },
    rumble(o) { A.noise({ type: 'lowpass', f: 180, t: (o && o.t) || 1, a: 0.15, v: 0.4, rev: 0.3 }); },
    clunk() { A.tone({ f: 170, f2: 70, t: 0.16, v: 0.4 }); A.noise({ f: 1200, q: 2, t: 0.05, v: 0.2 }); A.tone({ f: 950, t: 0.2, v: 0.06, fm: { r: 5.4, i: 2, d: 0.05 }, when: 0.03, rev: 0.3 }); },

    // --- ui & speech
    hover() { if (!A.limit('hover', 0.04)) return; A.tone({ f: 1250, t: 0.03, v: 0.03, rev: 0.1 }); },
    select() { A.tone({ f: N('A5'), f2: N('D6'), ft: 0.05, t: 0.12, v: 0.09, rev: 0.3 }); },
    back() { A.tone({ f: N('A5'), f2: N('E5'), ft: 0.05, t: 0.12, v: 0.08, rev: 0.3 }); },
    blip(o) {       // typewriter voices: who = 'noor' | 'wick' | 'hermit' | 'log' | 'deep'
      if (!A.limit('blip', 0.034)) return;
      const who = (o && o.who) || 'wick';
      if (who === 'noor') A.tone({ type: 'square', f: rnd(430, 500), t: 0.03, v: 0.035, lp: 1700, rev: 0 });
      else if (who === 'hermit') A.tone({ type: 'triangle', f: rnd(210, 290), t: 0.05, v: 0.07, rev: 0.1 });
      else if (who === 'deep') A.tone({ f: rnd(90, 130), t: 0.12, v: 0.1, rev: 0.6 });
      else if (who === 'log') A.tone({ type: 'square', f: rnd(640, 700), t: 0.02, v: 0.02, lp: 2400, rev: 0 });
      else A.tone({ f: rnd(860, 940), t: 0.035, v: 0.04, rev: 0.15 });
    },
    static(o) { A.noise({ type: 'highpass', f: 2600, t: (o && o.t) || 0.15, v: 0.06, rev: 0 }); },
    title() { ['D3', 'A3', 'F4', 'C5', 'E5', 'G5'].forEach((n, i) => A.tone({ f: N(n), t: 3.4, a: 0.02, v: 0.11, when: i * 0.22, rev: 1, fm: { r: 2.003, i: 0.7, d: 0.5 } })); },
  };
  G.sfxTable = S;

  G.sfx = function (name, o) {
    if (!A.ready || A.muted) return;
    const fn = S[name];
    if (fn) fn(o || null);
  };

  // ---------------------------------------------------------------- ambience
  const amb = A.amb = {
    bed: null, bedG: null, bedF: null, wash: null, washG: null, t: 0, next: 3, whaleT: 20, creakT: 8,
    start() {
      if (!A.ready || this.bed) return;
      const c = A.ctx;
      const mk = (type, f, q) => {
        const s = c.createBufferSource(); s.buffer = A.noiseBuf; s.loop = true;
        const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
        const g = c.createGain(); g.gain.value = 0;
        s.connect(fl); fl.connect(g); g.connect(A.ambBus); s.start();
        return { s, fl, g };
      };
      const b = mk('lowpass', 210, 0.6); this.bed = b.s; this.bedG = b.g; this.bedF = b.fl;
      const w = mk('bandpass', 620, 0.5); this.wash = w.s; this.washG = w.g;
    },
    // depth01: 0 at the surface .. 1 at the bottom of the world; surf: 0..1 how close to open air
    update(dt, depth01, surf) {
      if (!A.ready || !this.bed) return;
      const c = A.ctx, t = c.currentTime;
      this.t += dt;
      this.bedG.gain.setTargetAtTime(0.5 + 0.35 * depth01 + 0.08 * Math.sin(this.t * 0.31), t, 0.5);
      this.bedF.frequency.setTargetAtTime(260 - 130 * depth01 + 40 * Math.sin(this.t * 0.17), t, 0.5);
      this.washG.gain.setTargetAtTime(surf * (0.22 + 0.14 * Math.sin(this.t * 0.9) + 0.08 * Math.sin(this.t * 2.3)), t, 0.2);
      this.next -= dt;
      if (this.next <= 0) { this.next = rnd(0.6, 3.6); S.bubble({ x: G.cam.x + rnd(-600, 600), y: G.cam.y + rnd(-300, 300) }); }
      const zi = G.zone ? G.zone.idx : 0;
      if (zi === 1 || zi === 2) { this.whaleT -= dt; if (this.whaleT <= 0) { this.whaleT = rnd(38, 80); S.whale({ v: zi === 1 ? 0.2 : 0.11 }); G.emit('whale'); } }
      if (zi >= 3) { this.creakT -= dt; if (this.creakT <= 0) { this.creakT = rnd(9, 24) / (zi === 4 ? 1.6 : 1); S.creak(); } }
    },
  };

  G.on('gesture', () => { if (!A.ready && !G.params.mute) { if (A.init()) { amb.start(); } } else A.resume(); });
})();
