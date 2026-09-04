# Ghost Typer

A small desktop app: paste a script into the box, press Start, click into your
Google Doc, and the text gets typed in for you — one character at a time, at a
human pace, with typos that get backspaced and retyped correctly.

It sends real OS-level keystrokes to whatever window has keyboard focus, so it
works in Google Docs, Word, a text editor, a form field, anywhere. There is no
Google account, extension, or API involved.

## Setup

You need Python 3.10 or newer ([python.org/downloads](https://www.python.org/downloads/) —
tick **"Add Python to PATH"** during the Windows install).

**Windows:** double-click `run.bat`. It installs the one dependency the first
time and then opens the app.

**macOS:** double-click `run.command`. macOS will ask for permission the first
time — grant your terminal **Accessibility** access under
System Settings → Privacy & Security → Accessibility, or the keystrokes go nowhere.

**Manual:**

```
pip install -r requirements.txt
python app.py
```

## Using it

1. Paste (or load) your text into the left pane.
2. Set the dials on the right, or pick a preset.
3. Press **Start typing** and click into your Google Doc before the countdown ends.
4. The app minimises itself and starts typing. Press **Esc** at any time to abort.

If you stop partway, the status bar tells you where it stopped and **Start**
picks up from that character — so you can type an essay across several sittings.

**Preview keystrokes** runs the first 600 characters through the engine without
touching your keyboard, so you can see the mistakes and corrections it would
make (`⌫` marks a backspace) before committing to a live run.

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

Settings are remembered in `~/.ghost_typer.json`.

## How the human-typing part works

- **Pace.** Each keystroke's delay is drawn from a log-normal distribution
  around your target WPM, so most keys land near the average and a few are
  noticeably slower. A slow random walk on top of that gives bursts of speed
  followed by easing off. Capitals, digits and symbols each cost extra time
  (shift key, reaching), and there are natural pauses after `.`, `!`, `?` and
  commas.
- **Mistakes.** Four kinds, all modelled on real ones: a *slip* onto a
  physically adjacent QWERTY key, a *doubled* letter, a *transposition* of two
  letters, and a *skipped* letter where the fingers run ahead. The mistake is
  not always noticed immediately — it keeps typing up to five more correct
  characters first, then pauses, then backspaces the whole run and continues
  correctly.
- **Correctness.** Every wrong character typed is backspaced away before typing
  resumes, including when you abort mid-mistake. The document can only ever end
  up holding your script exactly. `test_engine.py` checks this across 1,281
  runs covering different speeds, typo rates and text shapes:

  ```
  python test_engine.py
  ```

## Google Docs notes

- **Turn off autocorrect first:** Tools → Preferences → uncheck *Automatic
  substitution* and *Automatic capitalisation*. Otherwise Docs "fixes" the
  typos as they are made, which changes the text and can fight the backspaces.
- Straight quotes and `--` will still be converted to smart quotes and en-dashes
  by Docs itself unless you disable substitution as above.
- Don't click, scroll or switch windows while it types — keystrokes go to
  whatever has focus, so moving the cursor moves where the text lands. Press
  **Esc** first if you need to do something else.
- A 3,000-character essay at the default settings takes roughly 15 minutes.
  The estimate next to the Start button updates as you change the dials.

## Files

| File | |
| --- | --- |
| `app.py` | The Tk window: script pane, settings, start/pause/stop, preview. |
| `human_typer.py` | The engine: timing model, mistake model, keystroke output. |
| `test_engine.py` | Self-test proving the typed result always equals the script. |
