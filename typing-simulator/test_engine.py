"""Self-test: whatever the mistakes, the document must end up exact.

Runs the engine against a fake keyboard that applies the keystrokes to a
string buffer, so backspaces really delete. Run with: python test_engine.py
"""

from __future__ import annotations

import random

from human_typer import DryRunKeyboard, TypingConfig, TypingEngine, estimate_duration

SAMPLES = [
    "The quick brown fox jumps over the lazy dog.",
    "Line one\nLine two\n\nA new paragraph after a blank line.\n",
    "Numbers 12345, symbols @#$%^&*(), and CAPS LOCK SHOUTING.",
    "Short.",
    "a",
    "\n\n\n",
    "Mixed: 'quotes', \"double quotes\", em-dash -- and a URL example.com/path?q=1",
    ("Floating sunglasses are a small product with a specific promise: drop them "
     "off a boat and they come back up. That single behaviour is the whole pitch, "
     "and every design decision -- frame density, lens weight, hinge hardware -- "
     "has to serve it.\n\nThe hard part is doing it without the frames looking "
     "like pool toys.\n"),
]


def run_case(text: str, cfg: TypingConfig, seed: int) -> tuple[bool, DryRunKeyboard, TypingEngine]:
    kb = DryRunKeyboard()
    engine = TypingEngine(text, cfg, keyboard=kb, realtime=False)
    engine._rng = random.Random(seed)
    engine.run()
    return kb.text == text, kb, engine


def main() -> int:
    failures = 0
    total_typos = 0
    total_keystrokes = 0
    total_chars = 0

    configs = [
        TypingConfig(start_delay=0),
        TypingConfig(start_delay=0, typo_rate=12.0, min_gap_between_typos=1),
        TypingConfig(start_delay=0, typo_rate=0.0),
        TypingConfig(start_delay=0, wpm=130, wpm_variance=0.6, typo_rate=8.0),
    ]

    for cfg in configs:
        for text in SAMPLES:
            for seed in range(40):
                ok, kb, engine = run_case(text, cfg, seed)
                total_typos += engine.typos_made
                total_keystrokes += kb.keystrokes
                total_chars += len(text)
                if not ok:
                    failures += 1
                    print(f"MISMATCH seed={seed} typo_rate={cfg.typo_rate}")
                    print("  expected:", repr(text[:120]))
                    print("  got:     ", repr(kb.text[:120]))

    # Stopping mid-run must leave a resume index that finishes the job exactly.
    text = SAMPLES[-1]
    cfg = TypingConfig(start_delay=0, typo_rate=6.0)
    kb = DryRunKeyboard()
    engine = TypingEngine(text, cfg, keyboard=kb, realtime=False)
    engine._rng = random.Random(7)
    original_type = kb.type_char
    state = {"n": 0}

    def counted(ch: str) -> None:
        state["n"] += 1
        if state["n"] == 120:
            engine.stop()
        original_type(ch)

    kb.type_char = counted
    engine.run()
    stopped_at = engine.index
    assert kb.text == text[:stopped_at], "partial output should be a clean prefix"

    resume = TypingEngine(text, cfg, keyboard=kb, realtime=False, start_index=stopped_at)
    resume._rng = random.Random(9)
    resume.run()
    if kb.text != text:
        failures += 1
        print("MISMATCH after resume")

    print(f"\nchecked {len(configs) * len(SAMPLES) * 40 + 1} runs")
    print(f"typos injected and corrected: {total_typos}")
    print(f"keystroke overhead from corrections: "
          f"{(total_keystrokes / max(1, total_chars) - 1) * 100:.1f}%")
    print(f"estimate for a 3,000 char essay at defaults: "
          f"{estimate_duration('x' * 3000, TypingConfig()) / 60:.1f} min")
    print("FAILURES:", failures)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
