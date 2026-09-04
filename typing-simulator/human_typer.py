"""Human-like typing engine.

Emits real OS-level key events (via pynput) so the target application -- a
Google Doc in a browser, a text editor, anything with keyboard focus -- sees
ordinary keystrokes. Speed varies, hands drift, and mistakes get made and
backspaced away, so the final text always ends up matching the script exactly.
"""

from __future__ import annotations

import random
import string
import threading
import time
from dataclasses import dataclass, asdict, field


# --- QWERTY neighbours, used to make "fat finger" slips land on a key that is
# --- physically next to the intended one rather than a random letter.
_NEIGHBOURS = {
    "q": "wa", "w": "qeas", "e": "wrsd", "r": "etdf", "t": "ryfg",
    "y": "tugh", "u": "yihj", "i": "uojk", "o": "ipkl", "p": "ol",
    "a": "qwsz", "s": "awedxz", "d": "serfcx", "f": "drtgvc", "g": "ftyhbv",
    "h": "gyujnb", "j": "huikmn", "k": "jiolm", "l": "kop",
    "z": "asx", "x": "zsdc", "c": "xdfv", "v": "cfgb", "b": "vghn",
    "n": "bhjm", "m": "njk",
    "1": "2q", "2": "13w", "3": "24e", "4": "35r", "5": "46t",
    "6": "57y", "7": "68u", "8": "79i", "9": "80o", "0": "9p",
    ",": "m.", ".": ",/", "/": ".", ";": "l'", "'": ";",
}

_SENTENCE_END = ".!?"
_CLAUSE_END = ",;:)"


@dataclass
class TypingConfig:
    """Everything the operator can tune from the UI."""

    wpm: float = 62.0                 # target average words per minute
    wpm_variance: float = 0.28        # 0 = metronome, 0.5 = very erratic
    typo_rate: float = 3.5            # mistakes per 100 characters
    start_delay: float = 5.0          # seconds to go click into the document
    line_pause: float = 0.9           # extra seconds after each newline
    paragraph_pause: float = 1.8      # extra seconds after a blank line
    think_rate: float = 1.5           # "pause and think" events per 100 chars
    think_min: float = 0.5            # shortest thinking pause, seconds
    think_max: float = 3.0            # longest thinking pause, seconds
    sentence_pause: float = 0.45      # extra pause after . ! ?
    min_gap_between_typos: int = 14   # characters of clean typing after a typo

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "TypingConfig":
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in data.items() if k in known})


class RealKeyboard:
    """Thin wrapper over pynput so the engine can be tested without a display."""

    def __init__(self) -> None:
        from pynput.keyboard import Controller, Key  # imported lazily

        self._kb = Controller()
        self._Key = Key

    def type_char(self, ch: str) -> None:
        self._kb.type(ch)

    def enter(self) -> None:
        self._kb.tap(self._Key.enter)

    def backspace(self) -> None:
        self._kb.tap(self._Key.backspace)


class DryRunKeyboard:
    """Records what would be typed. Used by the self-test and by --preview."""

    def __init__(self) -> None:
        self.buffer: list[str] = []
        self.trace: list[str] = []          # keystroke-by-keystroke record
        self.keystrokes = 0

    def type_char(self, ch: str) -> None:
        self.buffer.append(ch)
        self.trace.append(ch)
        self.keystrokes += 1

    def enter(self) -> None:
        self.buffer.append("\n")
        self.trace.append("\n")
        self.keystrokes += 1

    def backspace(self) -> None:
        if self.buffer:
            self.buffer.pop()
        self.trace.append("\u232b")
        self.keystrokes += 1

    @property
    def text(self) -> str:
        return "".join(self.buffer)


class TypingEngine(threading.Thread):
    """Types `text` into whatever window has focus, one keystroke at a time."""

    def __init__(
        self,
        text: str,
        config: TypingConfig,
        keyboard=None,
        on_progress=None,
        on_status=None,
        on_finished=None,
        start_index: int = 0,
        sleep_fn=time.sleep,
        realtime: bool = True,
    ) -> None:
        super().__init__(daemon=True)
        self.text = text
        self.cfg = config
        self.kb = keyboard if keyboard is not None else RealKeyboard()
        self.on_progress = on_progress or (lambda done, total: None)
        self.on_status = on_status or (lambda msg: None)
        self.on_finished = on_finished or (lambda reason, index: None)
        self.sleep = sleep_fn
        self.realtime = realtime      # False => run the schedule instantly (preview/tests)

        self._stop = threading.Event()
        self._resume = threading.Event()
        self._resume.set()

        self.index = start_index          # position in `text` still to be typed
        self.typos_made = 0
        self.simulated_seconds = 0.0
        self._chars_since_typo = 0
        self._drift = 1.0                 # slow random walk in typing tempo
        self._rng = random.Random()

    # -- control ---------------------------------------------------------

    def stop(self) -> None:
        self._stop.set()
        self._resume.set()

    def pause(self) -> None:
        self._resume.clear()

    def unpause(self) -> None:
        self._resume.set()

    @property
    def paused(self) -> bool:
        return not self._resume.is_set()

    def _wait(self, seconds: float) -> bool:
        """Sleep in slices so stop/pause stay responsive. False => aborted."""
        if not self.realtime:
            self.simulated_seconds += max(0.0, seconds)
            return not self._stop.is_set()
        deadline = time.monotonic() + max(0.0, seconds)
        while True:
            if self._stop.is_set():
                return False
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return True
            self.sleep(min(remaining, 0.05))

    def _checkpoint(self) -> bool:
        """Honour pause/stop between keystrokes. False => abort."""
        if self._stop.is_set():
            return False
        if self.paused:
            self.on_status("Paused")
            while not self._resume.wait(0.1):
                if self._stop.is_set():
                    return False
            if self._stop.is_set():
                return False
            self.on_status("Typing...")
        return True

    # -- timing ----------------------------------------------------------

    def _base_delay(self) -> float:
        # 1 word == 5 characters, so seconds per character is 12 / wpm.
        wpm = max(5.0, self.cfg.wpm)
        return 12.0 / wpm

    def _char_delay(self, ch: str, prev: str) -> float:
        delay = self._base_delay() * self._drift

        # Per-keystroke jitter: log-normal, so occasional slow keys but never
        # a negative or absurdly fast one.
        sigma = max(0.0, min(1.0, self.cfg.wpm_variance))
        if sigma:
            delay *= self._rng.lognormvariate(0.0, sigma)

        if ch == " ":
            delay *= 1.15
        elif ch in string.digits:
            delay *= 1.5
        elif ch.isupper():
            delay *= 1.35                     # shift key costs time
        elif ch in "\"'()[]{}@#$%&*_+=<>~`|\\/":
            delay *= 1.6                      # reaching for symbols

        if prev and prev in _SENTENCE_END and ch == " ":
            delay += self.cfg.sentence_pause * self._rng.uniform(0.6, 1.5)
        elif prev and prev in _CLAUSE_END and ch == " ":
            delay += self.cfg.sentence_pause * self._rng.uniform(0.2, 0.6)

        # Tempo drifts slowly: bursts of speed, then easing off.
        self._drift += self._rng.gauss(0.0, 0.02)
        self._drift = max(0.8, min(1.3, self._drift))

        return max(0.012, delay)

    def _maybe_think(self, ch: str, prev: str) -> float:
        """Occasional 'staring at the screen' pause, at a word boundary."""
        if self.cfg.think_rate <= 0 or prev != " ":
            return 0.0
        if self._rng.random() < self.cfg.think_rate / 100.0:
            lo, hi = sorted((self.cfg.think_min, self.cfg.think_max))
            return self._rng.uniform(lo, hi)
        return 0.0

    # -- mistakes --------------------------------------------------------

    def _slip_char(self, ch: str) -> str:
        """A key physically next to `ch`, preserving case."""
        neighbours = _NEIGHBOURS.get(ch.lower())
        if not neighbours:
            return ch
        wrong = self._rng.choice(neighbours)
        return wrong.upper() if ch.isupper() else wrong

    def _build_mistake(self, i: int) -> str:
        """Return the wrong characters to type at position i (never empty).

        Whatever comes back is typed, then fully backspaced away, so the
        document can only ever end up holding the correct script.
        """
        text = self.text
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""

        kinds = ["substitute", "double", "omit"]
        if nxt and nxt != "\n" and ch != " " and nxt != " ":
            kinds.append("transpose")
        kind = self._rng.choice(kinds)

        if kind == "substitute":
            wrong = self._slip_char(ch)
            if wrong == ch:
                wrong = self._rng.choice(string.ascii_lowercase)
            burst, consumed = wrong, 1
        elif kind == "double":
            burst, consumed = ch + ch, 1
        elif kind == "transpose":
            burst, consumed = nxt + ch, 2
        else:  # omit -- fingers ran ahead and skipped a letter
            skipped = text[i + 1 : i + 1 + self._rng.randint(2, 4)].split("\n")[0]
            if not skipped:
                burst, consumed = self._slip_char(ch), 1
            else:
                burst, consumed = skipped, 1 + len(skipped)

        # Keep typing correctly for a moment before noticing the mistake.
        overshoot = self._rng.choices([0, 1, 2, 3, 4, 5], weights=[28, 26, 18, 12, 9, 7])[0]
        if overshoot:
            burst += text[i + consumed : i + consumed + overshoot]

        burst = burst.split("\n")[0]          # never fake-type across a line break
        return burst or self._slip_char(ch)

    def _cleanup_burst(self, outstanding: int) -> None:
        """Erase a half-typed mistake so an abort never leaves junk behind.

        Runs even after stop() has been requested -- the document has to be
        left holding a clean prefix of the script, whatever happens.
        """
        for _ in range(outstanding):
            self.kb.backspace()
            if self.realtime:
                self.sleep(0.03)

    def _perform_mistake(self, i: int) -> bool:
        burst = self._build_mistake(i)
        prev = self.text[i - 1] if i else ""
        outstanding = 0                  # wrong characters currently on screen

        for ch in burst:
            if not self._checkpoint():
                self._cleanup_burst(outstanding)
                return False
            self.kb.type_char(ch)
            outstanding += 1
            if not self._wait(self._char_delay(ch, prev)):
                self._cleanup_burst(outstanding)
                return False
            prev = ch

        # The beat where the mistake registers.
        if not self._wait(self._rng.uniform(0.18, 0.75)):
            self._cleanup_burst(outstanding)
            return False

        while outstanding:
            if not self._checkpoint():
                self._cleanup_burst(outstanding)
                return False
            self.kb.backspace()
            outstanding -= 1
            if not self._wait(self._rng.uniform(0.05, 0.13)):
                self._cleanup_burst(outstanding)
                return False

        self.typos_made += 1
        self._chars_since_typo = 0
        return self._wait(self._rng.uniform(0.1, 0.4))

    def _should_slip(self, ch: str) -> bool:
        if self.cfg.typo_rate <= 0:
            return False
        if self._chars_since_typo < self.cfg.min_gap_between_typos:
            return False
        if ch == "\n" or not (ch.isalnum() or ch == " "):
            return False
        return self._rng.random() < self.cfg.typo_rate / 100.0

    # -- main loop -------------------------------------------------------

    def run(self) -> None:
        reason = "finished"
        try:
            if self.cfg.start_delay > 0:
                remaining = self.cfg.start_delay
                while remaining > 0:
                    self.on_status(f"Starting in {remaining:.0f}s -- click into your document")
                    if not self._wait(min(1.0, remaining)):
                        self.on_finished("stopped", self.index)
                        return
                    remaining -= 1.0

            self.on_status("Typing...")
            text = self.text
            total = len(text)

            while self.index < total:
                if not self._checkpoint():
                    reason = "stopped"
                    break

                i = self.index
                ch = text[i]
                prev = text[i - 1] if i else ""

                if ch == "\n":
                    self.kb.enter()
                    self.index += 1
                    self.on_progress(self.index, total)
                    blank_line = i + 1 < total and text[i + 1] == "\n"
                    pause = self.cfg.paragraph_pause if blank_line else self.cfg.line_pause
                    if not self._wait(pause * self._rng.uniform(0.7, 1.4)):
                        reason = "stopped"
                        break
                    continue

                think = self._maybe_think(ch, prev)
                if think and not self._wait(think):
                    reason = "stopped"
                    break

                if self._should_slip(ch):
                    if not self._perform_mistake(i):
                        reason = "stopped"
                        break
                    continue

                self.kb.type_char(ch)
                # Count it before the pause: an abort during the pause must
                # still leave index matching what is actually on screen.
                self.index += 1
                self._chars_since_typo += 1
                self.on_progress(self.index, total)
                if not self._wait(self._char_delay(ch, prev)):
                    reason = "stopped"
                    break

            if self._stop.is_set():
                reason = "stopped"
        except Exception as exc:  # surfaced in the UI rather than swallowed
            self.on_status(f"Error: {exc}")
            reason = "error"
        finally:
            self.on_finished(reason, self.index)


def estimate_duration(text: str, cfg: TypingConfig) -> float:
    """Rough wall-clock estimate in seconds, for the UI."""
    chars = len(text)
    newlines = text.count("\n")
    seconds = chars * (12.0 / max(5.0, cfg.wpm))
    seconds += newlines * cfg.line_pause
    seconds += (chars / 100.0) * cfg.think_rate * ((cfg.think_min + cfg.think_max) / 2.0)
    # Each mistake costs the wrong keys, the pause, and the backspaces.
    seconds += (chars / 100.0) * cfg.typo_rate * (12.0 / max(5.0, cfg.wpm) * 6 + 0.6)
    seconds += cfg.start_delay
    return seconds
