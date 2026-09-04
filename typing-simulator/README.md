# Ghost Typer

Paste a script into the box, press Start, click into your Google Doc, and the
text gets typed in for you — one character at a time, at a human pace, with
typos that get backspaced and retyped correctly.

It sends real OS-level keystrokes to whatever window has keyboard focus, so it
works in Google Docs, Word, a text editor, any form field. No Google account,
extension or API involved.

Two versions of the same thing:

| | |
| --- | --- |
| **`GhostTyper.hta`** | **Windows, no install.** Double-click and it opens. Start here. |
| `app.py` | Python version, works on Windows and macOS, needs Python installed. |

## The easy one: GhostTyper.hta

An HTA is an HTML file that Windows runs as a real program instead of opening
in a browser — same HTML, CSS and JavaScript, but with permission to send
keystrokes to other windows, which a web page in a browser tab can never do.
Every copy of Windows can run one; there is nothing to install.

1. Download the project zip and unzip it.
2. Open the `typing-simulator` folder and **double-click `GhostTyper.hta`**.
3. If Windows shows "Windows protected your PC", click **More info → Run anyway**.

Then: paste your text on the left, adjust the settings or hit a preset, press
**Start typing**, and click into your Google Doc before the countdown ends.

The window will not type into itself — if it still has focus when the countdown
ends it waits and says so, until you click into your document.

**Esc** stops it. So does the Stop button, which also erases a half-typed
mistake first, so you are never left with stray characters in the document.
If you stop partway, the status bar tells you where, and Start picks up from
that character.

**Preview keystrokes** runs the first 600 characters through the engine without
touching your keyboard, so you can see the mistakes and corrections it would
make (`⌫` marks a backspace) before a live run.

## The Python one

Needs Python 3.10+ from [python.org](https://www.python.org/downloads/) with
**"Add Python to PATH"** ticked during install.

- **Windows:** double-click `run.bat`.
- **macOS:** double-click `run.command`, then grant your terminal
  **Accessibility** access under System Settings → Privacy & Security →
  Accessibility, or the keystrokes go nowhere.
- **Manual:** `pip install -r requirements.txt` then `python app.py`.

Same features, plus it remembers your settings in `~/.ghost_typer.json`.

## Settings

| Setting | What it does |
| --- | --- |
| Speed (WPM) | Average words per minute. 40 is unhurried, 60–70 is a normal typist, 90+ is fast. |
| Speed variation | How uneven the rhythm is. 0 is a metronome; higher means bursts and hesitations. |
| Typos per 100 chars | How often a mistake happens. 3–4 is typical for a decent typist. |
| Countdown before start | Seconds to get your cursor into the document. |
| Pause after each line | Extra beat at every line break. |
| Pause after blank line | Longer beat between paragraphs. |
| Thinking pauses | How often it stops mid-sentence, and for how long. |

Note that the mistakes and pauses cost real time: at the 62 WPM default the
text actually lands at roughly 45 WPM. The estimate next to the Start button
accounts for it, so trust that number over the WPM dial.

## How the human-typing part works

- **Pace.** Each keystroke's delay is drawn from a log-normal distribution
  around your target WPM, so most keys land near the average and a few are
  noticeably slower. A slow random walk on top of that gives bursts of speed
  followed by easing off. Capitals, digits and symbols each cost extra time
  (shift key, reaching), and there are natural pauses after `.`, `!`, `?` and
  commas, plus occasional thinking pauses between words.
- **Mistakes.** Four kinds, all modelled on real ones: a *slip* onto a
  physically adjacent QWERTY key, a *doubled* letter, a *transposition* of two
  letters, and a *skipped* letter where the fingers run ahead. The mistake is
  not noticed immediately — it keeps typing up to five more correct characters
  first, then pauses, then backspaces the whole run and continues correctly.
- **Correctness.** Every wrong character is backspaced away before typing
  resumes, including when you abort mid-mistake, so the document can only end
  up holding your script exactly. Both engines are tested against a buffer
  where backspaces really delete:

  ```
  python test_engine.py        # the Python engine, 1,281 runs
  node test_hta_engine.js      # the engine inside GhostTyper.hta, 1,480 runs
  ```

  `test_hta_engine.js` reads the engine straight out of `GhostTyper.hta`, so it
  tests the code that actually ships.

## Google Docs notes

- **Turn off autocorrect first:** Tools → Preferences → uncheck *Automatic
  substitution* and *Automatic capitalisation*. Otherwise Docs "fixes" the
  typos as they are made and fights the backspaces.
- Curly quotes, em-dashes, ellipses and tabs in your pasted text get flattened
  to plain `"`, `--`, `...` and spaces before typing — a keystroke is a key on
  a keyboard, and there is no em-dash key. Leave Docs' substitution on if you
  want it to curl the quotes back itself.
- Don't click, scroll or switch windows while it types — keystrokes go to
  whatever has focus. Stop it first if you need to do something else.
- A 3,000-character essay at the default settings takes roughly 15 minutes.

## Files

| File | |
| --- | --- |
| `GhostTyper.hta` | The no-install Windows app: UI and engine in one HTML file. |
| `app.py` | The Python app's Tk window. |
| `human_typer.py` | The Python typing engine. |
| `test_engine.py` | Self-test for the Python engine. |
| `test_hta_engine.js` | Self-test for the engine inside `GhostTyper.hta`. |
