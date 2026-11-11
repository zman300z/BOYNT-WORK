'use strict';
/* UNDERSONG — input: keyboard, mouse, gamepad -> a small set of actions.
   G.input.update() once per frame before game logic; G.input.endFrame() after. */
(function () {
  const { abs, sqrt, atan2 } = Math;
  const I = G.input = {
    keys: Object.create(null), pressed: Object.create(null), released: Object.create(null),
    mouse: { x: G.W / 2, y: G.H / 2, down: [false, false, false], pressed: [false, false, false], released: [false, false, false], wheel: 0, moved: 0, seen: false },
    pad: { connected: false, lx: 0, ly: 0, rx: 0, ry: 0, btn: [], prev: [] },
    usingPad: false,
    // actions, refreshed by update()
    moveX: 0, moveY: 0, aimX: 1, aimY: 0, aimStick: false,
    fire: false, dash: false, flare: false, sonar: false, interact: false, pause: false, map: false,
    confirm: false, back: false, navX: 0, navY: 0, anyPressed: false,
    locked: 0,           // >0 swallows gameplay actions for that many seconds (after menus)
  };
  let navHoldX = 0, navHoldY = 0, navTimer = 0;
  let anyFlag = false;

  const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyF', 'ShiftLeft', 'ShiftRight', 'Enter', 'Escape']);

  window.addEventListener('keydown', e => {
    if (e.repeat) { if (GAME_KEYS.has(e.code)) e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    I.keys[e.code] = true; I.pressed[e.code] = true; anyFlag = true; I.usingPad = false;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    G.emit('gesture');
  });
  window.addEventListener('keyup', e => { I.keys[e.code] = false; I.released[e.code] = true; });
  window.addEventListener('blur', () => {
    for (const k in I.keys) I.keys[k] = false;
    I.mouse.down[0] = I.mouse.down[1] = I.mouse.down[2] = false;
    G.emit('blur');
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.emit('blur'); });

  function setMouse(e) {
    const r = G.viewRect;
    if (!r) return;
    I.mouse.x = (e.clientX - r.x) / r.w * G.W;
    I.mouse.y = (e.clientY - r.y) / r.h * G.H;
    I.mouse.moved = G.time; I.mouse.seen = true; I.usingPad = false;
  }
  window.addEventListener('mousemove', setMouse);
  window.addEventListener('mousedown', e => {
    setMouse(e);
    if (e.button < 3) { I.mouse.down[e.button] = true; I.mouse.pressed[e.button] = true; }
    anyFlag = true;
    G.emit('gesture');
    if (e.button === 1) e.preventDefault();
  });
  window.addEventListener('mouseup', e => { if (e.button < 3) { I.mouse.down[e.button] = false; I.mouse.released[e.button] = true; } });
  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('wheel', e => { I.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
  // touch: treat as mouse so menus at least work on a tablet
  function touchToMouse(e, down) {
    const t = e.changedTouches[0]; if (!t) return;
    setMouse(t);
    if (down === true) { I.mouse.down[0] = true; I.mouse.pressed[0] = true; anyFlag = true; G.emit('gesture'); }
    if (down === false) { I.mouse.down[0] = false; I.mouse.released[0] = true; }
  }
  window.addEventListener('touchstart', e => touchToMouse(e, true), { passive: true });
  window.addEventListener('touchmove', e => touchToMouse(e), { passive: true });
  window.addEventListener('touchend', e => touchToMouse(e, false), { passive: true });

  window.addEventListener('gamepadconnected', () => { I.pad.connected = true; });
  window.addEventListener('gamepaddisconnected', () => { I.pad.connected = false; });

  const dz = v => abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82;
  function pollPad() {
    const P = I.pad;
    P.prev = P.btn; P.btn = [];
    let gp = null;
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) if (p && p.connected && p.mapping === 'standard') { gp = p; break; }
      if (!gp) for (const p of pads) if (p && p.connected) { gp = p; break; }
    } catch (e) { gp = null; }
    if (!gp) { P.lx = P.ly = P.rx = P.ry = 0; P.connected = false; return; }
    P.connected = true;
    P.lx = dz(gp.axes[0] || 0); P.ly = dz(gp.axes[1] || 0);
    P.rx = dz(gp.axes[2] || 0); P.ry = dz(gp.axes[3] || 0);
    for (let i = 0; i < gp.buttons.length; i++) P.btn[i] = gp.buttons[i].pressed || gp.buttons[i].value > 0.4;
    if (P.lx || P.ly || P.rx || P.ry || P.btn.some(Boolean)) { I.usingPad = true; if (P.btn.some(Boolean)) G.emit('gesture'); }
  }
  const padDown = i => !!I.pad.btn[i];
  const padHit = i => !!I.pad.btn[i] && !I.pad.prev[i];

  I.key = code => !!I.keys[code];
  I.hit = code => !!I.pressed[code];

  I.update = function (dt) {
    pollPad();
    const k = I.keys, p = I.pressed, P = I.pad;
    let mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    let my = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
    if (mx && my) { mx *= 0.7071; my *= 0.7071; }
    if (P.connected && (P.lx || P.ly)) { mx = P.lx; my = P.ly; const l = sqrt(mx * mx + my * my); if (l > 1) { mx /= l; my /= l; } }
    I.moveX = mx; I.moveY = my;
    I.aimStick = false;
    if (P.connected && (abs(P.rx) > 0.25 || abs(P.ry) > 0.25)) {
      const l = sqrt(P.rx * P.rx + P.ry * P.ry); I.aimX = P.rx / l; I.aimY = P.ry / l; I.aimStick = true;
    }
    I.fire = I.mouse.down[0] || padDown(7);
    I.dash = !!(p.Space || p.ShiftLeft || p.ShiftRight) || padHit(6) || padHit(4);
    I.flare = I.mouse.pressed[2] || !!p.KeyF || padHit(5);
    I.sonar = !!p.KeyQ || padHit(3);
    I.interact = !!p.KeyE || padHit(0);
    I.pause = !!p.Escape || !!p.KeyP || padHit(9);
    I.map = !!k.Tab || padDown(8);
    I.confirm = !!p.Enter || !!p.Space || padHit(0);
    I.back = !!p.Escape || padHit(1);
    I.anyPressed = anyFlag || padHit(0) || padHit(9);
    // menu navigation with key-repeat
    let nx = (p.ArrowRight || p.KeyD ? 1 : 0) - (p.ArrowLeft || p.KeyA ? 1 : 0);
    let ny = (p.ArrowDown || p.KeyS ? 1 : 0) - (p.ArrowUp || p.KeyW ? 1 : 0);
    const hx = (padDown(15) ? 1 : 0) - (padDown(14) ? 1 : 0) + (abs(P.lx) > 0.6 ? Math.sign(P.lx) : 0);
    const hy = (padDown(13) ? 1 : 0) - (padDown(12) ? 1 : 0) + (abs(P.ly) > 0.6 ? Math.sign(P.ly) : 0);
    if (hx !== navHoldX || hy !== navHoldY) { navHoldX = hx; navHoldY = hy; navTimer = 0.32; nx += hx; ny += hy; }
    else if (hx || hy) { navTimer -= dt; if (navTimer <= 0) { navTimer = 0.14; nx += hx; ny += hy; } }
    I.navX = Math.sign(nx); I.navY = Math.sign(ny);
    if (I.locked > 0) {
      I.locked -= dt;
      I.fire = I.dash = I.flare = I.sonar = I.interact = false;
    }
  };

  I.endFrame = function () {
    for (const c in I.pressed) delete I.pressed[c];
    for (const c in I.released) delete I.released[c];
    const m = I.mouse;
    m.pressed[0] = m.pressed[1] = m.pressed[2] = false;
    m.released[0] = m.released[1] = m.released[2] = false;
    m.wheel = 0; anyFlag = false;
  };

  // label for prompts, depending on the device last touched
  I.label = function (action) {
    const pad = I.usingPad;
    switch (action) {
      case 'move': return pad ? 'L-STICK' : 'W A S D';
      case 'aim': return pad ? 'R-STICK' : 'MOUSE';
      case 'fire': return pad ? 'RT' : 'LEFT CLICK';
      case 'dash': return pad ? 'LT' : 'SPACE';
      case 'flare': return pad ? 'RB' : 'RIGHT CLICK';
      case 'sonar': return pad ? 'Y' : 'Q';
      case 'interact': return pad ? 'A' : 'E';
      case 'pause': return pad ? 'START' : 'ESC';
      case 'map': return pad ? 'SELECT' : 'TAB';
    }
    return '';
  };
})();
