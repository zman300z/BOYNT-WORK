'use strict';
// ============================================================================
// Audio: WebAudio synth instruments, procedural SFX, music sequencer
// ============================================================================
(function () {
  const G = window.G;
  const A = (G.Audio = {
    ctx: null,
    ready: false,
    musicVol: 0.7,
    sfxVol: 0.8,
    last: {},
  });
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  A.mtof = mtof;

  A.unlock = () => {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let ctx;
    try { ctx = new AC(); } catch (e) { return; }
    A.ctx = ctx;
    A.master = ctx.createGain();
    A.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    A.master.connect(comp);
    comp.connect(ctx.destination);
    A.musicBus = ctx.createGain();
    A.sfxBus = ctx.createGain();
    A.musicBus.connect(A.master);
    A.sfxBus.connect(A.master);
    // reverb
    A.reverb = ctx.createConvolver();
    A.reverb.buffer = makeImpulse(ctx, 2.8, 2.6);
    A.revSend = ctx.createGain();
    A.revSend.gain.value = 0.35;
    A.revSend.connect(A.reverb);
    A.reverb.connect(A.master);
    A.sfxRev = ctx.createGain();
    A.sfxRev.gain.value = 0.18;
    A.sfxBus.connect(A.sfxRev);
    A.sfxRev.connect(A.reverb);
    // echo delay for leads
    A.delay = ctx.createDelay(1.5);
    A.delay.delayTime.value = 0.36;
    A.delayFb = ctx.createGain();
    A.delayFb.gain.value = 0.32;
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 2200;
    A.delay.connect(dlp);
    dlp.connect(A.delayFb);
    A.delayFb.connect(A.delay);
    A.delaySend = ctx.createGain();
    A.delaySend.gain.value = 0.25;
    A.delaySend.connect(A.delay);
    dlp.connect(A.musicBus);
    // noise
    const len = ctx.sampleRate * 2;
    A.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = A.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.ready = true;
    A.applyVolumes();
    if (A.pendingMusic) {
      const pm = A.pendingMusic;
      A.pendingMusic = null;
      A.playMusic(pm);
    }
    setInterval(schedulerTick, 25);
  };

  function makeImpulse(ctx, dur, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * dur);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  A.applyVolumes = () => {
    if (!A.ready) return;
    const s = G.settings || { music: 0.7, sfx: 0.8 };
    A.musicBus.gain.setTargetAtTime(s.music * 0.55, A.ctx.currentTime, 0.05);
    A.sfxBus.gain.setTargetAtTime(s.sfx * 0.9, A.ctx.currentTime, 0.05);
  };

  // ------------------------------------------------------------ low-level
  function env(g, t, a, d, s, r, peak, dur) {
    // ADSR on gain param; note lasts dur then release
    const p = g.gain;
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(peak * s, t + a, d / 3 + 0.001);
    const rel = t + Math.max(a, dur);
    p.cancelScheduledValues(rel);
    p.setTargetAtTime(0.0001, rel, r / 3 + 0.001);
    return rel + r * 1.2;
  }
  function osc(type, freq, t, end, dest, detune) {
    const o = A.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (detune) o.detune.setValueAtTime(detune, t);
    o.connect(dest);
    o.start(t);
    o.stop(end + 0.05);
    return o;
  }
  function noiseSrc(t, end, dest, rate) {
    const n = A.ctx.createBufferSource();
    n.buffer = A.noise;
    n.loop = true;
    if (rate) n.playbackRate.value = rate;
    n.connect(dest);
    n.start(t, Math.random() * 1.5);
    n.stop(end + 0.05);
    return n;
  }
  function filt(type, f, q, dest) {
    const b = A.ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    if (q) b.Q.value = q;
    b.connect(dest);
    return b;
  }
  function gainNode(v, dest) {
    const g = A.ctx.createGain();
    g.gain.value = v;
    g.connect(dest);
    return g;
  }
  function vibrato(o, t, rate, cents, delay) {
    const l = A.ctx.createOscillator();
    const lg = A.ctx.createGain();
    l.frequency.value = rate;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(cents, t + (delay || 0.2));
    l.connect(lg);
    lg.connect(o.detune);
    l.start(t);
    return l;
  }

  // ------------------------------------------------------------ instruments
  // play(inst, midi, t, dur, vol, out, opts)
  const INST = {
    pluck(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      const lp = filt('lowpass', f * 6, 2, g);
      lp.frequency.setValueAtTime(Math.min(9000, f * 10), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.5), t + 0.4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.5, dur * 1.5));
      const e = t + Math.max(0.5, dur * 1.5);
      osc('sawtooth', f, t, e, lp);
      osc('triangle', f * 2, t, e, lp, 3);
    },
    harp(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      osc('triangle', f, t, t + 1.6, g);
      const g2 = gainNode(0.3, g);
      osc('sine', f * 2, t, t + 1.6, g2);
    },
    kalimba(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc('sine', f, t, t + 0.9, g);
      const g2 = A.ctx.createGain();
      g2.connect(out);
      g2.gain.setValueAtTime(v * 0.4, t);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc('sine', f * 5.4, t, t + 0.15, g2);
    },
    pad(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      const lp = filt('lowpass', 900, 0.7, g);
      const end = env(g, t, 0.5, 0.5, 0.85, 1.0, v, dur);
      osc('sawtooth', f, t, end, lp, -8);
      osc('sawtooth', f, t, end, lp, 8);
      osc('triangle', f / 2, t, end, lp);
    },
    strings(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      const lp = filt('lowpass', 2200, 0.5, g);
      const end = env(g, t, 0.14, 0.3, 0.8, 0.4, v, dur);
      const o1 = osc('sawtooth', f, t, end, lp, -6);
      const o2 = osc('sawtooth', f, t, end, lp, 7);
      const l = vibrato(o1, t, 5.2, 9, 0.25);
      l.stop(end);
      const l2 = vibrato(o2, t, 4.8, 9, 0.3);
      l2.stop(end);
    },
    bass(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      const lp = filt('lowpass', 600, 4, g);
      lp.frequency.setValueAtTime(1400, t);
      lp.frequency.exponentialRampToValueAtTime(280, t + 0.25);
      const end = env(g, t, 0.008, 0.2, 0.6, 0.08, v, dur * 0.95);
      osc('sawtooth', f, t, end, lp);
      osc('square', f / 2, t, end, gainNode(0.5, lp));
    },
    subbass(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      const end = env(g, t, 0.02, 0.3, 0.8, 0.12, v, dur * 0.95);
      osc('sine', f, t, end, g);
      osc('triangle', f, t, end, gainNode(0.3, g));
    },
    lead(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      g.connect(A.delaySend);
      const lp = filt('lowpass', 2600, 1, g);
      const end = env(g, t, 0.02, 0.2, 0.7, 0.15, v, dur);
      const o = osc('square', f, t, end, lp);
      const l = vibrato(o, t, 5.5, 12, 0.18);
      l.stop(end);
      osc('triangle', f * 2, t, end, gainNode(0.25, lp));
    },
    flute(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      g.connect(A.delaySend);
      const end = env(g, t, 0.07, 0.2, 0.8, 0.18, v, dur);
      const o = osc('sine', f, t, end, g);
      const l = vibrato(o, t, 5, 14, 0.25);
      l.stop(end);
      osc('triangle', f, t, end, gainNode(0.35, g));
      const bn = gainNode(0.06, g);
      noiseSrc(t, end, filt('bandpass', f * 2, 3, bn));
    },
    reed(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      const lp = filt('lowpass', 1800, 1.5, g);
      const end = env(g, t, 0.03, 0.1, 0.85, 0.08, v, dur);
      osc('sawtooth', f, t, end, lp, -10);
      osc('square', f, t, end, lp, 10);
      const o = osc('sawtooth', f * 2, t, end, gainNode(0.2, lp));
      const l = vibrato(o, t, 6, 10, 0.1);
      l.stop(end);
    },
    brass(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      g.connect(A.delaySend);
      const lp = filt('lowpass', 400, 2, g);
      lp.frequency.setValueAtTime(350, t);
      lp.frequency.linearRampToValueAtTime(2600, t + 0.09);
      lp.frequency.setTargetAtTime(1500, t + 0.1, 0.2);
      const end = env(g, t, 0.05, 0.2, 0.8, 0.15, v, dur);
      const o = osc('sawtooth', f, t, end, lp);
      osc('sawtooth', f, t, end, lp, 9);
      const l = vibrato(o, t, 5, 10, 0.3);
      l.stop(end);
    },
    bell(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      g.connect(A.delaySend);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      const car = osc('sine', f, t, t + 2.4, g);
      const mod = A.ctx.createOscillator();
      mod.frequency.value = f * 3.5;
      const mg = A.ctx.createGain();
      mg.gain.setValueAtTime(f * 2.2, t);
      mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.2);
      mod.connect(mg);
      mg.connect(car.frequency);
      mod.start(t);
      mod.stop(t + 2.4);
      osc('sine', f * 2.01, t, t + 1.2, gainNode(0.15, g));
    },
    glass(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      g.connect(A.delaySend);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc('sine', f, t, t + 1.4, g);
      osc('sine', f * 2.76, t, t + 0.6, gainNode(0.25, g));
      osc('sine', f * 5.4, t, t + 0.3, gainNode(0.1, g));
    },
    organ(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      const end = env(g, t, 0.06, 0.1, 0.9, 0.35, v, dur);
      osc('sine', f, t, end, g);
      osc('sine', f * 2, t, end, gainNode(0.5, g));
      osc('sine', f * 3, t, end, gainNode(0.28, g));
      osc('sine', f * 4, t, end, gainNode(0.18, g));
      osc('sine', f / 2, t, end, gainNode(0.35, g));
    },
    choir(m, t, dur, v, out) {
      const f = mtof(m);
      const g = A.ctx.createGain();
      g.connect(out);
      const end = env(g, t, 0.35, 0.3, 0.85, 0.7, v, dur);
      const mixer = A.ctx.createGain();
      mixer.gain.value = 1;
      const b1 = filt('bandpass', 750, 5, g);
      const b2 = filt('bandpass', 1180, 6, gainNode(0.6, g));
      const b3 = filt('bandpass', 2600, 7, gainNode(0.25, g));
      mixer.connect(b1);
      mixer.connect(b2);
      mixer.connect(b3);
      const o1 = osc('sawtooth', f, t, end, mixer, -12);
      const o2 = osc('sawtooth', f, t, end, mixer, 10);
      const o3 = osc('sawtooth', f * 2, t, end, gainNode(0.3, mixer), 4);
      vibrato(o1, t, 4.6, 14, 0.4).stop(end);
      vibrato(o2, t, 5.1, 12, 0.5).stop(end);
      vibrato(o3, t, 4.9, 10, 0.4).stop(end);
    },
    // ---- drums
    kick(m, t, dur, v, out) {
      const g = A.ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      const o = osc('sine', 150, t, t + 0.35, g);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      const c = gainNode(v * 0.3, out);
      c.gain.setValueAtTime(v * 0.3, t);
      c.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
      noiseSrc(t, t + 0.03, filt('lowpass', 3000, 0, c));
    },
    snare(m, t, dur, v, out) {
      const g = A.ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      noiseSrc(t, t + 0.22, filt('highpass', 1200, 0, g));
      const g2 = A.ctx.createGain();
      g2.connect(out);
      g2.gain.setValueAtTime(v * 0.7, t);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      const o = osc('triangle', 210, t, t + 0.12, g2);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
    },
    hat(m, t, dur, v, out) {
      const g = A.ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      noiseSrc(t, t + 0.06, filt('highpass', 7500, 0, g));
    },
    ohat(m, t, dur, v, out) {
      const g = A.ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      noiseSrc(t, t + 0.32, filt('highpass', 6500, 0, g));
    },
    shaker(m, t, dur, v, out) {
      const g = A.ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      noiseSrc(t, t + 0.1, filt('bandpass', 5500, 1.5, g));
    },
    tom(m, t, dur, v, out) {
      const g = A.ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      const o = osc('sine', mtof(m || 45) * 1.5, t, t + 0.4, g);
      o.frequency.exponentialRampToValueAtTime(mtof(m || 45) * 0.8, t + 0.3);
    },
    taiko(m, t, dur, v, out) {
      const g = A.ctx.createGain();
      g.connect(out);
      g.connect(A.revSend);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      const o = osc('sine', 95, t, t + 0.8, g);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
      const n = gainNode(v * 0.5, out);
      n.gain.setValueAtTime(v * 0.5, t);
      n.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      noiseSrc(t, t + 0.16, filt('lowpass', 900, 0, n));
    },
    crash(m, t, dur, v, out) {
      const g = A.ctx.createGain();
      g.connect(out);
      g.connect(A.revSend);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      noiseSrc(t, t + 1.6, filt('highpass', 4000, 0, g));
    },
    clap(m, t, dur, v, out) {
      for (let i = 0; i < 3; i++) {
        const tt = t + i * 0.012;
        const g = A.ctx.createGain();
        g.connect(out);
        g.gain.setValueAtTime(v * (i === 2 ? 1 : 0.6), tt);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + (i === 2 ? 0.15 : 0.02));
        noiseSrc(tt, tt + 0.16, filt('bandpass', 1400, 1.2, g));
      }
    },
    tamb(m, t, dur, v, out) {
      const g = A.ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      noiseSrc(t, t + 0.13, filt('bandpass', 8000, 2, g));
      osc('square', 5200, t, t + 0.05, gainNode(v * 0.05, g));
    },
  };
  A.INST = INST;
  A.playNote = (inst, midi, t, dur, vol, out) => {
    if (!A.ready) return;
    const fn = INST[inst];
    if (fn) fn(midi, t, dur, vol, out || A.musicBus);
  };

  // ------------------------------------------------------------ SFX
  function sfxOut(opts) {
    let out = A.sfxBus;
    let vol = 1;
    if (opts && opts.x !== undefined && G.cam) {
      const cx = G.cam.x + G.W / 2, cy = G.cam.y + G.H / 2;
      const dx = opts.x - cx, dy = (opts.y !== undefined ? opts.y : cy) - cy;
      const d = Math.hypot(dx, dy);
      vol = G.clamp(1.2 - d / 500, 0, 1);
      if (vol <= 0.02) return null;
      if (A.ctx.createStereoPanner) {
        const p = A.ctx.createStereoPanner();
        p.pan.value = G.clamp(dx / 400, -0.8, 0.8);
        p.connect(out);
        out = p;
      }
    }
    if (opts && opts.vol !== undefined) vol *= opts.vol;
    const g = gainNode(vol, out);
    return g;
  }
  function tone(out, type, f0, f1, t, dur, v, att) {
    const g = A.ctx.createGain();
    g.connect(out);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + (att || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = osc(type, f0, t, t + dur, g);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    return o;
  }
  function nz(out, t, dur, v, type, f0, f1, q, att) {
    const g = A.ctx.createGain();
    g.connect(out);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + (att || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = filt(type || 'lowpass', f0, q || 1, g);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    noiseSrc(t, t + dur, f);
  }
  const SFX = {
    jump: (o, t) => { tone(o, 'square', 200, 420, t, 0.09, 0.07); nz(o, t, 0.06, 0.08, 'bandpass', 900, 1800, 1); },
    djump: (o, t) => { tone(o, 'triangle', 330, 700, t, 0.12, 0.1); nz(o, t, 0.15, 0.12, 'bandpass', 600, 2400, 1.5); },
    land: (o, t) => { nz(o, t, 0.08, 0.22, 'lowpass', 500, 150); },
    step: (o, t) => { nz(o, t, 0.035, 0.05, 'lowpass', 380 + Math.random() * 100); },
    roll: (o, t) => { nz(o, t, 0.22, 0.2, 'bandpass', 300, 1400, 1.2, 0.03); },
    swing: (o, t) => { const p = 0.85 + Math.random() * 0.3; nz(o, t, 0.13, 0.22, 'bandpass', 700 * p, 2600 * p, 1.4, 0.02); },
    swingHeavy: (o, t) => { nz(o, t, 0.26, 0.3, 'bandpass', 250, 1100, 1.2, 0.05); tone(o, 'sine', 90, 60, t, 0.2, 0.1); },
    thrust: (o, t) => { nz(o, t, 0.1, 0.22, 'bandpass', 1500, 3500, 2, 0.01); },
    hit: (o, t) => { nz(o, t, 0.09, 0.4, 'lowpass', 1800, 300); tone(o, 'sine', 170, 55, t, 0.12, 0.35); },
    hitCrit: (o, t) => { nz(o, t, 0.12, 0.5, 'lowpass', 3000, 300); tone(o, 'sine', 200, 50, t, 0.16, 0.45); tone(o, 'square', 1400, 2200, t, 0.08, 0.06); tone(o, 'triangle', 2100, 2100, t + 0.03, 0.2, 0.06); },
    hitMetal: (o, t) => { tone(o, 'square', 950, 900, t, 0.12, 0.08); tone(o, 'triangle', 1420, 1400, t, 0.2, 0.08); nz(o, t, 0.06, 0.2, 'highpass', 3000); },
    block: (o, t) => { tone(o, 'square', 620, 560, t, 0.1, 0.1); nz(o, t, 0.08, 0.25, 'bandpass', 2000, 800, 1); },
    parry: (o, t) => { tone(o, 'triangle', 1250, 1250, t, 0.6, 0.18); tone(o, 'sine', 1875, 1875, t, 0.5, 0.12); tone(o, 'sine', 2500, 2500, t + 0.02, 0.35, 0.06); nz(o, t, 0.2, 0.3, 'highpass', 2500, 6000); },
    enemyDie: (o, t) => { nz(o, t, 0.4, 0.35, 'lowpass', 1200, 90); tone(o, 'sawtooth', 220, 45, t, 0.3, 0.08); },
    hurt: (o, t) => { tone(o, 'square', 320, 110, t, 0.22, 0.14); nz(o, t, 0.15, 0.35, 'lowpass', 2000, 300); },
    gold: (o, t) => { tone(o, 'triangle', 1318, 1318, t, 0.06, 0.07); tone(o, 'triangle', 1976, 1976, t + 0.05, 0.12, 0.07); },
    ember: (o, t) => { tone(o, 'sine', 660 + Math.random() * 100, 1320, t, 0.2, 0.08); tone(o, 'sine', 1980, 2600, t + 0.03, 0.15, 0.04); },
    pickup: (o, t) => { [0, 4, 7, 12].forEach((s, i) => tone(o, 'triangle', mtof(72 + s), 0, t + i * 0.05, 0.18, 0.09)); },
    food: (o, t) => { tone(o, 'sine', 300, 500, t, 0.12, 0.15); tone(o, 'sine', 400, 700, t + 0.12, 0.12, 0.15); },
    scroll: (o, t) => { [0, 3, 7, 12, 15].forEach((s, i) => { A.playNote('bell', 74 + s, t + i * 0.08, 0.5, 0.09, o); }); },
    rune: (o, t) => {
      [0, 7, 12, 16, 19, 24].forEach((s, i) => A.playNote('bell', 62 + s, t + i * 0.12, 1, 0.1, o));
      A.playNote('choir', 62, t, 2, 0.12, o); A.playNote('choir', 69, t, 2, 0.1, o); A.playNote('choir', 74, t, 2, 0.1, o);
    },
    blueprint: (o, t) => { [0, 5, 9, 12].forEach((s, i) => A.playNote('glass', 79 + s, t + i * 0.07, 0.4, 0.08, o)); },
    door: (o, t) => { nz(o, t, 0.25, 0.3, 'lowpass', 700, 200); const c = tone(o, 'sawtooth', 120, 85, t, 0.3, 0.05); c.detune.setValueAtTime(0, t); },
    doorBreak: (o, t) => { nz(o, t, 0.35, 0.6, 'lowpass', 2400, 120); tone(o, 'sine', 110, 40, t, 0.3, 0.4); nz(o, t + 0.08, 0.15, 0.3, 'bandpass', 600, 300, 1); },
    chest: (o, t) => { nz(o, t, 0.2, 0.25, 'lowpass', 900, 200); [0, 4, 7, 11, 14].forEach((s, i) => A.playNote('glass', 76 + s, t + 0.15 + i * 0.06, 0.4, 0.07, o)); },
    lever: (o, t) => { tone(o, 'square', 220, 160, t, 0.05, 0.12); nz(o, t + 0.04, 0.08, 0.25, 'bandpass', 1800, 900, 2); },
    explosion: (o, t) => { nz(o, t, 0.9, 0.8, 'lowpass', 2500, 80); tone(o, 'sine', 90, 28, t, 0.6, 0.6); },
    arrow: (o, t) => { tone(o, 'triangle', 700, 380, t, 0.09, 0.1); nz(o, t, 0.12, 0.14, 'highpass', 3000, 6000); },
    bowDraw: (o, t) => { tone(o, 'sawtooth', 90, 140, t, 0.2, 0.03, 0.05); },
    magic: (o, t) => { tone(o, 'sine', 400, 1300, t, 0.3, 0.12); tone(o, 'triangle', 800, 2000, t, 0.25, 0.05); },
    fire: (o, t) => { nz(o, t, 0.45, 0.35, 'bandpass', 600, 1600, 0.8, 0.05); nz(o, t, 0.3, 0.2, 'lowpass', 400, 200); },
    freeze: (o, t) => { [0, 7, 14].forEach((s, i) => tone(o, 'sine', 1800 + s * 90, 2400 + s * 90, t + i * 0.03, 0.35, 0.05)); nz(o, t, 0.3, 0.2, 'highpass', 4000, 8000); },
    poison: (o, t) => { for (let i = 0; i < 4; i++) tone(o, 'sine', 180 + Math.random() * 200, 400 + Math.random() * 200, t + i * 0.05, 0.08, 0.08); },
    heal: (o, t) => { [0, 4, 7, 12].forEach((s, i) => tone(o, 'sine', mtof(67 + s), mtof(67 + s), t + i * 0.07, 0.4, 0.07)); },
    flask: (o, t) => { for (let i = 0; i < 3; i++) tone(o, 'sine', 180, 320, t + i * 0.13, 0.1, 0.15); },
    bellHit: (o, t, opts) => { A.playNote('bell', (opts && opts.note) || 72, t, 1, 0.22, o); },
    brazier: (o, t) => { nz(o, t, 0.5, 0.35, 'bandpass', 300, 1800, 0.8, 0.08); tone(o, 'sine', 200, 400, t, 0.3, 0.08); },
    solved: (o, t) => { [0, 3, 7, 10, 14].forEach((s, i) => A.playNote('bell', 69 + s, t + i * 0.1, 1, 0.12, o)); },
    wrong: (o, t) => { tone(o, 'square', 110, 100, t, 0.35, 0.1); tone(o, 'square', 116, 104, t, 0.35, 0.1); },
    uiMove: (o, t) => { tone(o, 'square', 1100, 1100, t, 0.025, 0.04); },
    uiSelect: (o, t) => { tone(o, 'square', 880, 880, t, 0.05, 0.06); tone(o, 'square', 1320, 1320, t + 0.05, 0.08, 0.06); },
    uiBack: (o, t) => { tone(o, 'square', 660, 440, t, 0.08, 0.05); },
    uiDeny: (o, t) => { tone(o, 'square', 180, 160, t, 0.15, 0.08); },
    buy: (o, t) => { tone(o, 'triangle', 1046, 1046, t, 0.07, 0.08); tone(o, 'triangle', 1568, 1568, t + 0.06, 0.07, 0.08); tone(o, 'triangle', 2093, 2093, t + 0.12, 0.15, 0.08); },
    telegraph: (o, t) => { tone(o, 'square', 1500, 1700, t, 0.05, 0.04); },
    bossRoar: (o, t) => { const s = tone(o, 'sawtooth', 90, 45, t, 1.3, 0.3, 0.1); nz(o, t, 1.2, 0.4, 'lowpass', 700, 150, 3, 0.1); s.detune.setValueAtTime(0, t); },
    stomp: (o, t) => { tone(o, 'sine', 120, 30, t, 0.3, 0.5); nz(o, t, 0.3, 0.5, 'lowpass', 1500, 100); },
    shield: (o, t) => { tone(o, 'triangle', 700, 650, t, 0.08, 0.08); },
    throw: (o, t) => { nz(o, t, 0.1, 0.18, 'bandpass', 1200, 2600, 1.5, 0.01); },
    turret: (o, t) => { tone(o, 'square', 300, 300, t, 0.04, 0.08); tone(o, 'square', 450, 450, t + 0.06, 0.04, 0.08); },
    shoot: (o, t) => { tone(o, 'square', 500, 200, t, 0.08, 0.06); nz(o, t, 0.06, 0.12, 'highpass', 2500); },
    lightning: (o, t) => { nz(o, t, 0.5, 0.6, 'highpass', 1500, 300); tone(o, 'sawtooth', 120, 60, t, 0.4, 0.2); },
    splash: (o, t) => { nz(o, t, 0.35, 0.3, 'bandpass', 1200, 400, 1); tone(o, 'sine', 400, 150, t, 0.12, 0.1); },
    death: (o, t) => { [0, -3, -7, -12].forEach((s, i) => tone(o, 'triangle', mtof(64 + s), mtof(60 + s), t + i * 0.18, 0.5, 0.12)); tone(o, 'sine', 80, 30, t + 0.6, 1.2, 0.4); },
    transition: (o, t) => { nz(o, t, 0.9, 0.25, 'bandpass', 200, 3000, 1, 0.6); },
    curse: (o, t) => { [0, 1, 6].forEach((s) => tone(o, 'sawtooth', mtof(38 + s), mtof(37 + s), t, 1.2, 0.08, 0.1)); },
    break: (o, t) => { nz(o, t, 0.25, 0.45, 'lowpass', 1600, 150); tone(o, 'sine', 140, 60, t, 0.15, 0.2); },
    crate: (o, t) => { nz(o, t, 0.2, 0.4, 'bandpass', 900, 300, 1); nz(o, t + 0.05, 0.1, 0.2, 'lowpass', 500, 200); },
    shockwave: (o, t) => { nz(o, t, 0.5, 0.45, 'lowpass', 500, 60); tone(o, 'sine', 70, 35, t, 0.4, 0.35); },
    teleport: (o, t) => { tone(o, 'sine', 300, 1600, t, 0.15, 0.1); tone(o, 'sine', 1600, 300, t + 0.15, 0.15, 0.08); },
    ladder: (o, t) => { nz(o, t, 0.03, 0.04, 'bandpass', 1200, 1200, 3); },
    toll: (o, t) => { A.playNote('bell', 43, t, 3, 0.5, o); A.playNote('bell', 55, t, 3, 0.25, o); tone(o, 'sine', 98, 98, t, 2.5, 0.3, 0.01); },
    bubble: (o, t) => { tone(o, 'sine', 300 + Math.random() * 300, 900, t, 0.08, 0.1); },
    scream: (o, t) => { const s = tone(o, 'sawtooth', 700, 500, t, 0.9, 0.12, 0.1); nz(o, t, 0.9, 0.25, 'bandpass', 1400, 800, 4, 0.1); s.detune.setValueAtTime(0, t); },
    charge: (o, t) => { tone(o, 'sawtooth', 120, 600, t, 0.5, 0.06, 0.2); },
    wick: (o, t) => { nz(o, t, 0.6, 0.3, 'bandpass', 400, 1600, 1, 0.3); [0, 7, 12].forEach((s, i) => A.playNote('glass', 74 + s, t + 0.3 + i * 0.1, 0.5, 0.06, o)); },
    thunder: (o, t) => { nz(o, t, 2.2, 0.35, 'lowpass', 400, 60, 1, 0.05); },
    crumble: (o, t) => { for (let i = 0; i < 5; i++) nz(o, t + i * 0.06, 0.12, 0.25, 'lowpass', 900, 200); },
    vine: (o, t) => { nz(o, t, 0.8, 0.2, 'bandpass', 300, 900, 2, 0.2); [0, 5, 7, 12].forEach((s, i) => A.playNote('harp', 67 + s, t + i * 0.1, 0.5, 0.08, o)); },
    timer: (o, t) => { tone(o, 'square', 1760, 1760, t, 0.04, 0.03); },
  };
  A.play = (name, opts) => {
    if (!A.ready) return;
    const now = A.ctx.currentTime;
    const l = A.last[name] || (A.last[name] = { t: 0, n: 0 });
    if (now - l.t < 0.035) {
      if (l.n >= 2) return;
      l.n++;
    } else { l.t = now; l.n = 0; }
    const fn = SFX[name];
    if (!fn) return;
    const out = sfxOut(opts);
    if (!out) return;
    try { fn(out, now + 0.005, opts); } catch (e) {}
  };

  // ------------------------------------------------------------ music sequencer
  const SCALES = {
    ionian: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11],
  };
  A.SCALES = SCALES;
  // degree -> semitone offset (degree may be negative / beyond 7)
  function degSemi(scale, d) {
    const oct = Math.floor(d / 7);
    const i = ((d % 7) + 7) % 7;
    return scale[i] + oct * 12;
  }
  A.degSemi = degSemi;
  function parseChord(ch) {
    // number or string like "4^" (raise the chord third — major in minor), "4m" (lower third), "0s4" (sus4), "5+7" (add 7)
    if (typeof ch === 'number') return { d: ch, mod: '' };
    const m = /^(-?\d+)(.*)$/.exec(ch);
    return { d: parseInt(m[1], 10), mod: m[2] || '' };
  }
  function chordTones(track, ch) {
    const sc = SCALES[track.mode] || SCALES.aeolian;
    const c = parseChord(ch);
    const r = degSemi(sc, c.d);
    let third = degSemi(sc, c.d + 2);
    let fifth = degSemi(sc, c.d + 4);
    if (c.mod.includes('^')) third = r + 4;
    if (c.mod.includes('m')) third = r + 3;
    if (c.mod.includes('s4')) third = degSemi(sc, c.d + 3);
    if (c.mod.includes('d')) fifth = r + 6;
    if (c.mod.includes('p')) fifth = r + 7;
    const tones = [r, third, fifth];
    if (c.mod.includes('7')) tones.push(degSemi(sc, c.d + 6));
    return tones;
  }
  A.chordTones = chordTones;

  // parse a melody string: tokens per step unit (default 8th = 2 sixteenth steps)
  // tokens: degree number (e.g. 4, -3, 11), with optional '#'/'b', '-' = hold, '.' = rest, '|' ignored
  function parseMelody(str) {
    const toks = str.split(/\s+/).filter((t) => t && t !== '|');
    return toks;
  }

  const music = (A.music = { cur: null, fading: [] });
  class TrackPlayer {
    constructor(def) {
      this.def = def;
      this.out = A.ctx.createGain();
      this.out.gain.value = 0.0001;
      this.out.connect(A.musicBus);
      this.rev = gainNode(def.reverb === undefined ? 0.5 : def.reverb, A.revSend);
      this.out.connect(this.rev);
      this.stepDur = 60 / def.bpm / 4;
      this.spb = def.stepsPerBar || 16;
      this.nextTime = A.ctx.currentTime + 0.1;
      this.step = 0;
      this.secIdx = 0;
      this.barInSec = 0;
      this.order = def.order || def.sections.map((s, i) => i);
      this.loopFrom = def.loopFrom || 0;
      this.pendingJump = null;
      this.lastBass = null;
      this.arpIdx = 0;
      this.stopped = false;
      this.melCache = {};
      const t = A.ctx.currentTime;
      this.out.gain.setValueAtTime(0.0001, t);
      this.out.gain.exponentialRampToValueAtTime(1, t + (def.fadeIn || 1.2));
    }
    section() {
      const s = this.def.sections[this.order[this.secIdx]];
      return s;
    }
    jumpTo(name) {
      const idx = this.def.sections.findIndex((s) => s.name === name);
      if (idx >= 0) this.pendingJump = idx;
    }
    fadeOut(time) {
      const t = A.ctx.currentTime;
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), t);
      this.out.gain.exponentialRampToValueAtTime(0.0001, t + time);
      this.stopAt = t + time + 0.1;
    }
    tick() {
      const ahead = A.ctx.currentTime + 0.15;
      while (this.nextTime < ahead) {
        this.playStep(this.nextTime);
        this.advance();
      }
    }
    advance() {
      const swing = this.def.swing || 0;
      const sd = this.stepDur * (this.step % 2 === 0 ? 1 + swing : 1 - swing);
      this.nextTime += sd;
      this.step++;
      if (this.step >= this.spb) {
        this.step = 0;
        this.barInSec++;
        const sec = this.section();
        if (this.pendingJump !== null) {
          const oi = this.order.indexOf(this.pendingJump);
          if (oi >= 0) this.secIdx = oi;
          else { this.order = this.order.concat([this.pendingJump]); this.secIdx = this.order.length - 1; }
          this.pendingJump = null;
          this.barInSec = 0;
        } else if (this.barInSec >= sec.bars) {
          this.barInSec = 0;
          this.secIdx++;
          if (sec.next) {
            const ni = this.def.sections.findIndex((s) => s.name === sec.next);
            const oi = this.order.indexOf(ni);
            this.secIdx = oi >= 0 ? oi : this.loopFrom;
          } else if (this.secIdx >= this.order.length) this.secIdx = this.loopFrom;
        }
      }
    }
    playStep(t) {
      const def = this.def;
      const sec = this.section();
      if (!sec) return;
      const prog = sec.prog || def.prog;
      const cpb = sec.chordBars || def.chordBars || 1; // bars per chord
      const chordIdx = Math.floor(this.barInSec / cpb) % prog.length;
      const chord = prog[chordIdx];
      const tones = chordTones(def, chord);
      const root = def.root;
      const st = this.step;
      const parts = sec.parts;
      for (const pname of parts) {
        const pd = def.parts[pname.replace(/\*.*/, '')];
        if (!pd) continue;
        const vol = pd.vol * (pname.includes('*') ? parseFloat(pname.split('*')[1]) : 1);
        const out = this.out;
        const kind = pd.kind || 'melodic';
        if (kind === 'pad') {
          const chordStart = this.barInSec % cpb === 0 && st === 0;
          if (chordStart) {
            const dur = this.stepDur * this.spb * cpb;
            const oct = 12 * (pd.oct || 0);
            for (let i = 0; i < tones.length; i++) {
              if (pd.voices && i >= pd.voices) break;
              A.playNote(pd.inst, root + oct + tones[i], t, dur * 0.98, vol, out);
            }
            if (pd.bassNote) A.playNote(pd.inst, root + oct - 12 + tones[0], t, dur * 0.98, vol * 0.8, out);
          }
        } else if (kind === 'bass') {
          const pat = pd.pat;
          const c = pat[st % pat.length];
          if (c && c !== '.' && c !== '-') {
            let len = 1;
            while (len < pat.length && pat[(st + len) % pat.length] === '-') len++;
            let n = tones[0];
            if (c === 'o') n = tones[2];
            if (c === '8') n = tones[0] + 12;
            if (c === '3') n = tones[1];
            if (c === 'b') n = tones[0] - 1 < 0 ? tones[0] : tones[0];
            A.playNote(pd.inst, root + 12 * (pd.oct || -1) + n, t, this.stepDur * len, vol * (c === 'X' ? 1.2 : 1), out);
          }
        } else if (kind === 'arp') {
          const pat = pd.pat;
          const c = pat[st % pat.length];
          if (c && c !== '.' && c !== '-') {
            const seq = pd.seq || [0, 1, 2, 1];
            if (st === 0 && pd.resetEachBar !== false) this.arpIdx = 0;
            const si = seq[this.arpIdx % seq.length];
            this.arpIdx++;
            const oct = Math.floor(si / tones.length);
            const n = tones[((si % tones.length) + tones.length) % tones.length] + oct * 12;
            A.playNote(pd.inst, root + 12 * (pd.oct || 0) + n, t, this.stepDur * (pd.len || 2), vol * (c === 'X' ? 1.25 : c === 'g' ? 0.5 : 1), out);
          }
        } else if (kind === 'drums') {
          for (const dn in pd.kit) {
            const pat = pd.kit[dn];
            const c = pat[st % pat.length];
            if (c && c !== '.' && c !== '-') {
              const v = vol * (c === 'X' ? 1.3 : c === 'g' ? 0.35 : 1) * (pd.mix && pd.mix[dn] !== undefined ? pd.mix[dn] : 1);
              A.playNote(dn, pd.toms && pd.toms[dn] ? pd.toms[dn] : 45, t, 0.2, v, out);
            }
          }
        } else if (kind === 'melody') {
          // melody tokens keyed by section
          const key = pname + ':' + sec.name;
          let toks = this.melCache[key];
          if (!toks) {
            const src = (pd.mel && (pd.mel[sec.name] || pd.mel.all)) || null;
            toks = src ? parseMelody(src) : [];
            this.melCache[key] = toks;
          }
          if (!toks.length) continue;
          const unit = pd.unit || 2; // steps per token
          if (st % unit !== 0) continue;
          const idx = (this.barInSec * (this.spb / unit) + st / unit) % toks.length;
          const tok = toks[idx];
          if (tok === '-' || tok === '.') continue;
          let len = 1;
          while (len < toks.length && toks[(idx + len) % toks.length] === '-') len++;
          const sc = SCALES[pd.mode || def.mode] || SCALES.aeolian;
          let acc = 0, s = tok;
          if (s.endsWith('#')) { acc = 1; s = s.slice(0, -1); }
          else if (s.endsWith('b')) { acc = -1; s = s.slice(0, -1); }
          const d = parseInt(s, 10);
          if (isNaN(d)) continue;
          const semi = degSemi(sc, d) + acc;
          A.playNote(pd.inst, root + 12 * (pd.oct || 1) + semi, t, this.stepDur * unit * len * 0.95, vol, out);
          if (pd.harm) A.playNote(pd.inst, root + 12 * (pd.oct || 1) + degSemi(sc, d + pd.harm) + acc, t, this.stepDur * unit * len * 0.95, vol * 0.6, out);
        }
      }
    }
  }

  function schedulerTick() {
    if (!A.ready) return;
    if (music.cur && !music.cur.stopped) music.cur.tick();
    for (let i = music.fading.length - 1; i >= 0; i--) {
      const tp = music.fading[i];
      if (A.ctx.currentTime > tp.stopAt) {
        tp.stopped = true;
        try { tp.out.disconnect(); } catch (e) {}
        music.fading.splice(i, 1);
      } else tp.tick();
    }
  }

  A.currentMusic = null;
  A.playMusic = (id, fade) => {
    if (A.currentMusic === id && music.cur) return;
    A.currentMusic = id;
    if (!A.ready) { A.pendingMusic = id; return; }
    if (music.cur) {
      music.cur.fadeOut(fade || 1.5);
      music.fading.push(music.cur);
      music.cur = null;
    }
    if (!id) return;
    const def = G.TRACKS && G.TRACKS[id];
    if (!def) return;
    music.cur = new TrackPlayer(def);
  };
  A.musicSection = (name) => {
    if (music.cur) music.cur.jumpTo(name);
  };
  A.stopMusic = (fade) => A.playMusic(null, fade);
  // one-shot jingle using a melody string at bpm
  A.jingle = (inst, root, mode, str, bpm, vol) => {
    if (!A.ready) return;
    const sc = SCALES[mode] || SCALES.aeolian;
    const toks = parseMelody(str);
    const sd = 60 / bpm / 2;
    let t = A.ctx.currentTime + 0.05;
    for (let i = 0; i < toks.length; i++) {
      const tok = toks[i];
      if (tok !== '-' && tok !== '.') {
        let len = 1;
        while (i + len < toks.length && toks[i + len] === '-') len++;
        const chord = tok.split('+');
        for (const c of chord) {
          const d = parseInt(c, 10);
          if (!isNaN(d)) A.playNote(inst, root + degSemi(sc, d), t, sd * len, vol || 0.12, A.musicBus);
        }
      }
      t += sd;
    }
  };
  A.duck = (amt, time) => {
    if (!A.ready || !music.cur) return;
    const g = music.cur.out.gain, t = A.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(0.0001, g.value), t);
    g.linearRampToValueAtTime(amt, t + 0.1);
    g.linearRampToValueAtTime(1, t + time);
  };
})();
