# Undersong

*A small light, descending.*

You are WICK-7, a survey probe about the size of a grapefruit, lowered off the research boat *Halcyon*. Six probes went down before you and none came back. All anyone has from them is a sound coming up from the bottom of the sea: one note each.

Dive through five zones of procedurally generated ocean (the sunlit Shallows, the Twilight, the black Midnight, the vent fields of the Abyss, and the Trench) and find out what is singing.

Nothing in this game gets killed. Your pulse emitter doesn't hurt anything; it persuades creatures to be somewhere else.

## Play

Open **`dist/undersong.html`** in a browser. It is one self-contained file: no install, no internet needed. `index.html` runs the same game from the source files.

- Works in Chrome, Edge, Firefox and Safari. Keyboard and mouse is best; gamepads work too.
- Headphones recommended. The soundtrack is generated as you play.
- Progress (banked pearls, workshop upgrades, field notes) is saved in the browser.
- If it's too hard, turn on **Calm Seas** in Settings: more hull, softer creatures, slower projectiles.

## Controls

| | Keyboard and mouse | Gamepad |
|---|---|---|
| Swim | W A S D or arrow keys | Left stick |
| Aim | Mouse | Right stick |
| Pulse emitter | Hold left click | RT |
| Dash (nothing can touch you mid-dash) | Space or Shift | LT or LB |
| Flare (stuns everything nearby, clears projectiles) | Right click or F | RB |
| Sonar (draws the cave, points the way on) | Q | Y |
| Use, open, buy | E | A |
| Chart | Hold Tab | Select |
| Pause | Esc or P | Start |

Hold your lamp on a creature for a moment to catalogue it in your field notes.

## What's down there

- **Five zones, five bosses**, each with its own creatures, scenery, hazards, palette and music. Every dive generates new caves.
- **Modules.** Collect glow to level up and choose an upgrade: about forty of them, from second and third pulse voices to ricochets, orbiting sea sparkles and a remora that bites things for you. Bosses drop relics.
- **Field notes.** 64 species and discoveries, each written up by Wick, with real biology.
- **The six wrecks.** The lost probes lie in side caves on the way down. Recover one's log and its note joins the soundtrack. Voices you carry to the bottom are on your side at the end.
- **The Hermit**, a crab in a borrowed shell, runs a shop at the top of every zone after the first.
- **The workshop** aboard the *Halcyon*: spend banked pearls on permanent upgrades and paint jobs between dives.
- **Two endings.**

## How it's made

Plain JavaScript and the browser's own Canvas 2D, WebGL and Web Audio. No libraries, and no image or sound files: every creature is drawn by code each frame and every sound is synthesized.

- Caves are signed-distance fields carved from noise. The same field drives collision, light, wall shading, creature pathfinding and decoration placement.
- Lighting is a quarter-resolution lightmap with a ray-marched lamp cone, so rock casts real shadows. A WebGL pass adds bloom, water wobble, shockwaves and colour grading.
- The music is a small generative band in D. Sound effects borrow notes from the chord that's playing, so firing your emitter plays along with the score.

## Development

Open `index.html` directly. There is no build step for development.

Useful URL parameters:

| Parameter | Effect |
|---|---|
| `?debug` | Stats overlay. F1 god mode, F2 skip to the next zone, F3 level up, F4 wake the boss (press again to drop it to 1 health), F6 +50 pearls, F7 jump to the boss arena |
| `?zone=N` | Start in zone N (0–4) with a plausible set of modules; add `&lv=K` to choose how many |
| `?seed=N` | Fixed cave layout |
| `?god`, `?mute`, `?nofx` | No damage; no sound; no WebGL post-processing |
| `?sheet=N` | Contact sheet of every field-notes entry for zone N |
| `?bot` | The playtest autopilot plays the game (source build only) |

`tools/` holds Node scripts that drive headless Chromium through Playwright:

| Script | What it does |
|---|---|
| `build.js` | Bundles everything into `dist/undersong.html` |
| `playtest.js` | The autopilot plays whole runs and reports depth, hits taken, deaths and errors |
| `inputtest.js` | Drives the game with real mouse and keyboard events |
| `shot.js` | Screenshot of any state, optionally after running code in the page |
| `profile.js` | Per-stage frame timings in each zone |
| `audiotest.js` | Renders the music or every sound effect to a WAV file for level checks |

### Code map

| File | Contents |
|---|---|
| `core.js`, `input.js` | Maths, noise, seeded random numbers, tweens, events; keyboard, mouse and gamepad |
| `gfx.js`, `light.js`, `backdrop.js`, `particles.js` | Canvases, camera, text, WebGL post chain; lightmap; sky, water and marine snow; particles |
| `audio.js`, `music.js` | Synthesized sound effects and ambience; the generative score |
| `world.js` | Zone definitions, cave generation, collision, flow fields, wall chunk painting |
| `player.js`, `entities.js`, `modules.js`, `companions.js` | The probe; pulses, hostile shots, pickups, telegraphed blasts; upgrades; companions |
| `creatures.js`, `decor.js`, `populate.js` | Creature framework and AI; reactive scenery and props; spawning |
| `zone1_*.js`, `boss1.js`, `zone2.js` … `zone5.js`, `curator.js` | Each zone's creatures, scenery, boss and field notes |
| `story.js`, `props.js`, `shop.js` | Radio and logs; pods, wrecks, sonar; the Hermit |
| `hud.js`, `menu.js`, `screens.js`, `map.js`, `ending.js`, `meta.js` | Interface, menus and screens, chart, finale, save data |
| `game.js` | The main loop and the director |

Made by Claude.
