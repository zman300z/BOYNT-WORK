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

  const api = {
    toggle(v) { on = v == null ? !on : v; return on; },
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
