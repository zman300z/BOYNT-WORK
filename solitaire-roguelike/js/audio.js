/* ============================================================
   PILE-DRIVER  ::  audio.js   tiny web-audio noise box
   ============================================================ */
const Sfx = (() => {
  let ctx = null, on = true, master = null;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }

  function beep(freq, dur, type, vol, slide) {
    if (!on) return;
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, ctx.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  }

  function noise(dur, vol) {
    if (!on) return;
    init();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol || 0.2;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1200;
    s.connect(f); f.connect(g); g.connect(master);
    s.start();
  }

  /* ---------------- background music ----------------
     A short generated lounge loop: walking bass, off-beat chord stabs, a shaker
     and a little melody that drifts. All synthesised, so the file stays
     self-contained with no audio assets.                                      */
  let musicOn = false, musicTimer = null, step = 0, musicGain = null;
  const ROOT = 55;                                   // A1
  const PROG = [0, 0, 5, 5, 3, 3, 7, 7];             // i i iv iv III III v v (per bar)
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  const semi = n => Math.pow(2, n / 12);

  function tone(freq, dur, type, vol, when, slide) {
    if (!ctx) return;
    const t = when || ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function shaker(when, vol) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s2 = ctx.createBufferSource(); s2.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
    const g = ctx.createGain(); g.gain.value = vol;
    s2.connect(f); f.connect(g); g.connect(musicGain);
    s2.start(when || ctx.currentTime);
  }

  function tick() {
    if (!musicOn || !ctx) return;
    const bar = Math.floor(step / 8) % PROG.length;
    const deg = PROG[bar];
    const beat = step % 8;
    const t = ctx.currentTime + 0.02;
    const rootHz = ROOT * semi(MINOR[deg % 7] + (deg >= 7 ? 12 : 0));

    if (beat % 2 === 0) tone(rootHz, 0.34, 'triangle', 0.16, t);          // bass
    if (beat === 4) tone(rootHz * semi(7), 0.22, 'triangle', 0.09, t);
    if (beat === 2 || beat === 6) {                                        // chord stab
      [0, 3, 7, 10].forEach(iv => tone(rootHz * 2 * semi(iv), 0.2, 'sine', 0.05, t));
    }
    shaker(t, beat % 2 ? 0.03 : 0.05);
    if (Math.random() < 0.35) {                                            // drifting melody
      const note = MINOR[Math.floor(Math.random() * MINOR.length)];
      tone(rootHz * 4 * semi(note), 0.26, 'sine', 0.045, t + 0.06);
    }
    step++;
  }

  const api = {
    toggle(v) { on = v == null ? !on : v; return on; },
    music(v) {
      init();
      if (!ctx) return false;
      musicOn = v == null ? !musicOn : v;
      if (musicOn) {
        if (ctx.state === 'suspended') ctx.resume();
        if (!musicGain) {
          musicGain = ctx.createGain();
          musicGain.gain.value = 0.5;
          musicGain.connect(master);
        }
        musicGain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.3);
        if (!musicTimer) musicTimer = setInterval(tick, 250);   // 120bpm eighths
      } else if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
        if (musicGain) musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
      }
      return musicOn;
    },
    musicOn: () => musicOn,
    isOn: () => on,
    click: () => beep(420, 0.05, 'square', 0.15),
    flip:  () => { noise(0.06, 0.12); beep(700, 0.05, 'triangle', 0.12); },
    place: () => beep(520, 0.07, 'triangle', 0.2, 780),
    deal:  () => noise(0.05, 0.08),
    error: () => beep(150, 0.14, 'sawtooth', 0.18, 90),
    money: () => { beep(880, 0.06, 'square', 0.16); setTimeout(() => beep(1320, 0.09, 'square', 0.14), 60); },
    chip: (i) => beep(340 + Math.min(24, i) * 42, 0.05, 'square', 0.13),
    mult: (i) => beep(520 + Math.min(24, i) * 55, 0.06, 'sawtooth', 0.11),
    score: (mag) => {
      const base = 300 + Math.min(900, mag * 6);
      beep(base, 0.12, 'square', 0.22, base * 2);
      setTimeout(() => beep(base * 1.5, 0.16, 'triangle', 0.18, base * 3), 90);
    },
    big: () => {
      [0, 90, 180, 300].forEach((t, i) => setTimeout(() => beep(440 * Math.pow(1.26, i), 0.2, 'square', 0.2), t));
    },
    shatter: () => { noise(0.3, 0.3); beep(1800, 0.2, 'sawtooth', 0.12, 200); },
    win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => beep(f, 0.3, 'triangle', 0.22), i * 110)),
    lose: () => [400, 330, 260, 180].forEach((f, i) => setTimeout(() => beep(f, 0.35, 'sawtooth', 0.2), i * 150))
  };
  return api;
})();
