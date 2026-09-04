// Self-test for GhostTyper.hta: pulls the engine straight out of the .hta file,
// runs it against a buffer where backspaces really delete, and checks the
// result always equals the script exactly.   Run with: node test_hta_engine.js

var fs = require("fs");

var source = fs.readFileSync(__dirname + "/GhostTyper.hta", "utf8");
var start = source.indexOf("// ---- ENGINE START ----");
var end = source.indexOf("// ---- ENGINE END ----");
if (start < 0 || end < 0) { throw new Error("engine markers not found in GhostTyper.hta"); }
var engine = source.substring(start, end);

// ES3-only sanity check: the HTA runs on JScript, which has none of these.
var banned = [/\blet\s/, /\bconst\s/, /=>/, /\$\{/, /\bJSON\./, /\.forEach\(/, /\bMap\(/];
banned.forEach(function (re) {
  if (re.test(engine)) { throw new Error("engine uses syntax JScript lacks: " + re); }
});

eval(engine + "\nvar __exports = {makeState:makeState, nextAction:nextAction," +
     "normalizeForTyping:normalizeForTyping, estimateSeconds:estimateSeconds};");
var makeStateF = __exports.makeState;
var nextActionF = __exports.nextAction;
var normalize = __exports.normalizeForTyping;

function baseConfig(over) {
  var cfg = { wpm: 62, wpmVariance: 0.28, typoRate: 3.5, startDelay: 0, linePause: 0.9,
              paragraphPause: 1.8, thinkRate: 1.5, thinkMin: 0.5, thinkMax: 3,
              sentencePause: 0.45, minGap: 14 };
  for (var k in over) { if (over.hasOwnProperty(k)) { cfg[k] = over[k]; } }
  return cfg;
}

// Applies the engine's actions to a buffer, exactly as the document would see them.
function typeOut(text, cfg, stopAfter) {
  var st = makeStateF(text, cfg);
  var buffer = [], keystrokes = 0, millis = 0, guard = 0;
  while (guard++ < 500000) {
    var a = nextActionF(st);
    if (a === null) { break; }
    if (a.t === "char") { buffer.push(a.ch); keystrokes++; }
    else if (a.t === "enter") { buffer.push("\n"); keystrokes++; }
    else if (a.t === "bs") { buffer.pop(); keystrokes++; }
    millis += a.d;
    if (stopAfter && keystrokes >= stopAfter) { break; }
  }
  return { text: buffer.join(""), state: st, keystrokes: keystrokes, millis: millis };
}

var SAMPLES = [
  "The quick brown fox jumps over the lazy dog.",
  "Line one\nLine two\n\nA new paragraph after a blank line.\n",
  "Numbers 12345, symbols @#$%^&*(), and CAPS LOCK SHOUTING.",
  "Short.",
  "a",
  "\n\n\n",
  "Braces {like this} and [brackets] plus + ^ % ~ which SendKeys treats specially.",
  "Floating sunglasses are a small product with a specific promise: drop them off a " +
  "boat and they come back up. That single behaviour is the whole pitch.\n\n" +
  "The hard part is doing it without the frames looking like pool toys.\n"
];

var CONFIGS = [
  baseConfig({}),
  baseConfig({ typoRate: 12, minGap: 1 }),
  baseConfig({ typoRate: 0 }),
  baseConfig({ wpm: 130, wpmVariance: 0.6, typoRate: 8 })
];

var failures = 0, runs = 0, typos = 0, keystrokes = 0, chars = 0;

for (var c = 0; c < CONFIGS.length; c++) {
  for (var s = 0; s < SAMPLES.length; s++) {
    for (var n = 0; n < 40; n++) {
      var out = typeOut(SAMPLES[s], CONFIGS[c]);
      runs++; typos += out.state.typos; keystrokes += out.keystrokes; chars += SAMPLES[s].length;
      if (out.text !== SAMPLES[s]) {
        failures++;
        console.log("MISMATCH  config=" + c + " sample=" + s);
        console.log("  expected: " + JSON.stringify(SAMPLES[s].substring(0, 90)));
        console.log("  got:      " + JSON.stringify(out.text.substring(0, 90)));
      }
    }
  }
}

// A run cut off partway must leave a clean prefix once the stop cleanup
// (the backspaces stopTyping() queues) has been applied.
for (var n2 = 0; n2 < 200; n2++) {
  var cut = typeOut(SAMPLES[7], baseConfig({ typoRate: 8, minGap: 4 }), 60 + n2);
  var buf = cut.text.split("");
  for (var b = 0; b < cut.state.outstanding; b++) { buf.pop(); }
  var cleaned = buf.join("");
  runs++;
  if (cleaned !== SAMPLES[7].substring(0, cut.state.i)) {
    failures++;
    console.log("MISMATCH after stop cleanup at keystroke " + (60 + n2));
    console.log("  expected: " + JSON.stringify(SAMPLES[7].substring(0, cut.state.i)));
    console.log("  got:      " + JSON.stringify(cleaned));
  }
}

// Smart quotes and tabs must be flattened to things SendKeys can actually type.
var messy = "“Smart quotes”, an em—dash, ellipsis… and\ta tab.";
var clean = normalize(messy);
if (/[^\x20-\x7E\n]/.test(clean)) { failures++; console.log("normalize left: " + JSON.stringify(clean)); }

var pace = typeOut("x ".repeat(400).trim(), baseConfig({}));
console.log("\nruns checked: " + runs);
console.log("mistakes made and corrected: " + typos);
console.log("keystroke overhead from corrections: " +
            ((keystrokes / chars - 1) * 100).toFixed(1) + "%");
console.log("effective speed at 62 WPM setting: " +
            ((pace.text.length / 5) / (pace.millis / 60000)).toFixed(0) + " WPM");
console.log("normalized sample: " + JSON.stringify(clean));
console.log("FAILURES: " + failures);
process.exit(failures ? 1 : 0);
