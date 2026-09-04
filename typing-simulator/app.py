"""Ghost Typer -- paste a script, then watch it get typed into any window.

Run it, paste your text, hit Start, and click into your Google Doc during the
countdown. The app sends real keystrokes to whatever window has focus, so the
document fills in the way a person would fill it in: uneven speed, pauses at
sentence breaks, and typos that get backspaced and retyped correctly.

Press Esc at any time to abort immediately.
"""

from __future__ import annotations

import json
import os
import queue
import sys
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from human_typer import (
    DryRunKeyboard,
    TypingConfig,
    TypingEngine,
    estimate_duration,
)

CONFIG_PATH = os.path.join(os.path.expanduser("~"), ".ghost_typer.json")

# label, config field, from, to, resolution
SETTINGS = [
    ("Speed (WPM)", "wpm", 15, 140, 1),
    ("Speed variation", "wpm_variance", 0.0, 0.8, 0.01),
    ("Typos per 100 chars", "typo_rate", 0.0, 12.0, 0.1),
    ("Countdown before start (s)", "start_delay", 0, 30, 1),
    ("Pause after each line (s)", "line_pause", 0.0, 6.0, 0.1),
    ("Pause after blank line (s)", "paragraph_pause", 0.0, 10.0, 0.1),
    ("Thinking pauses per 100 chars", "think_rate", 0.0, 8.0, 0.1),
    ("Shortest thinking pause (s)", "think_min", 0.0, 5.0, 0.1),
    ("Longest thinking pause (s)", "think_max", 0.5, 15.0, 0.5),
]


def format_duration(seconds: float) -> str:
    seconds = int(round(seconds))
    hours, rem = divmod(seconds, 3600)
    minutes, secs = divmod(rem, 60)
    if hours:
        return f"{hours}h {minutes}m"
    if minutes:
        return f"{minutes}m {secs}s"
    return f"{secs}s"


class App:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.engine: TypingEngine | None = None
        self.events: queue.Queue = queue.Queue()
        self.vars: dict[str, tk.DoubleVar] = {}
        self._label_updaters: list = []
        self.resume_index = 0

        root.title("Ghost Typer")
        root.geometry("980x660")
        root.minsize(820, 560)

        self._build_ui()
        self._load_config()
        self._poll_events()
        self._start_hotkey_listener()
        root.protocol("WM_DELETE_WINDOW", self._on_close)

    # -- layout ----------------------------------------------------------

    def _build_ui(self) -> None:
        outer = ttk.Frame(self.root, padding=10)
        outer.pack(fill="both", expand=True)

        panes = ttk.Frame(outer)
        panes.pack(fill="both", expand=True)

        # Left: the script.
        left = ttk.Frame(panes)
        left.pack(side="left", fill="both", expand=True)

        header = ttk.Frame(left)
        header.pack(fill="x")
        ttk.Label(header, text="Script to type", font=("Segoe UI", 11, "bold")).pack(side="left")
        ttk.Button(header, text="Load .txt", command=self._load_file).pack(side="right")
        ttk.Button(header, text="Clear", command=self._clear_text).pack(side="right", padx=4)

        text_frame = ttk.Frame(left)
        text_frame.pack(fill="both", expand=True, pady=(6, 0))
        self.text = tk.Text(text_frame, wrap="word", undo=True, font=("Consolas", 11))
        scroll = ttk.Scrollbar(text_frame, command=self.text.yview)
        self.text.configure(yscrollcommand=scroll.set)
        scroll.pack(side="right", fill="y")
        self.text.pack(side="left", fill="both", expand=True)
        self.text.bind("<<Modified>>", self._on_text_modified)

        # Right: the dials.
        right = ttk.Frame(panes, width=310)
        right.pack(side="right", fill="y", padx=(12, 0))
        right.pack_propagate(False)

        ttk.Label(right, text="Settings", font=("Segoe UI", 11, "bold")).pack(anchor="w")

        for label, field, lo, hi, step in SETTINGS:
            row = ttk.Frame(right)
            row.pack(fill="x", pady=3)
            var = tk.DoubleVar(value=getattr(TypingConfig(), field))
            self.vars[field] = var
            head = ttk.Frame(row)
            head.pack(fill="x")
            ttk.Label(head, text=label).pack(side="left")
            value_label = ttk.Label(head, text="")
            value_label.pack(side="right")

            def on_change(_value, v=var, lbl=value_label, s=step):
                lbl.configure(text=f"{v.get():.0f}" if s >= 1 else f"{v.get():.2f}")
                self._update_estimate()

            scale = ttk.Scale(row, from_=lo, to=hi, variable=var,
                              orient="horizontal", command=on_change)
            scale.pack(fill="x")
            self._label_updaters.append(on_change)
            on_change(None)

        ttk.Separator(right).pack(fill="x", pady=8)

        presets = ttk.Frame(right)
        presets.pack(fill="x")
        ttk.Label(presets, text="Presets:").pack(side="left")
        for name in ("Careful", "Natural", "Rushed"):
            ttk.Button(presets, text=name, width=8,
                       command=lambda n=name: self._apply_preset(n)).pack(side="left", padx=2)

        ttk.Button(right, text="Preview keystrokes (no typing)",
                   command=self._preview).pack(fill="x", pady=(10, 0))

        # Bottom: controls and status.
        controls = ttk.Frame(outer)
        controls.pack(fill="x", pady=(10, 0))

        self.start_btn = ttk.Button(controls, text="Start typing", command=self._start)
        self.start_btn.pack(side="left")
        self.pause_btn = ttk.Button(controls, text="Pause", command=self._toggle_pause,
                                    state="disabled")
        self.pause_btn.pack(side="left", padx=6)
        self.stop_btn = ttk.Button(controls, text="Stop", command=self._stop, state="disabled")
        self.stop_btn.pack(side="left")

        self.resume_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(controls, text="Resume where I left off",
                        variable=self.resume_var).pack(side="left", padx=12)

        self.estimate_label = ttk.Label(controls, text="")
        self.estimate_label.pack(side="right")

        self.progress = ttk.Progressbar(outer, mode="determinate", maximum=100)
        self.progress.pack(fill="x", pady=(8, 4))

        self.status = ttk.Label(outer, text="Ready. Paste your script, then press Start.")
        self.status.pack(anchor="w")
        ttk.Label(
            outer,
            text="Tip: press Esc at any time to abort. In Google Docs, turn off "
                 "Tools → Preferences → Autocorrect so it does not undo the typos.",
            foreground="#666",
        ).pack(anchor="w", pady=(2, 0))

    # -- helpers ---------------------------------------------------------

    def _config(self) -> TypingConfig:
        cfg = TypingConfig()
        for field, var in self.vars.items():
            setattr(cfg, field, float(var.get()))
        if cfg.think_max < cfg.think_min:
            cfg.think_min, cfg.think_max = cfg.think_max, cfg.think_min
        return cfg

    def _script(self) -> str:
        # Tk always reports a trailing newline; drop it so we do not add a
        # stray paragraph at the end of the document.
        return self.text.get("1.0", "end-1c")

    def _on_text_modified(self, _event=None) -> None:
        self.text.edit_modified(False)
        self.resume_index = 0
        self._update_estimate()

    def _update_estimate(self) -> None:
        text = self._script()
        if not text:
            self.estimate_label.configure(text="")
            return
        seconds = estimate_duration(text, self._config())
        self.estimate_label.configure(
            text=f"{len(text):,} chars  ·  about {format_duration(seconds)}"
        )

    def _refresh_labels(self) -> None:
        for updater in self._label_updaters:
            updater(None)
        self._update_estimate()

    def _apply_preset(self, name: str) -> None:
        presets = {
            "Careful": dict(wpm=45, wpm_variance=0.22, typo_rate=1.2, think_rate=2.5,
                            line_pause=1.4, paragraph_pause=2.5),
            "Natural": dict(wpm=62, wpm_variance=0.28, typo_rate=3.5, think_rate=1.5,
                            line_pause=0.9, paragraph_pause=1.8),
            "Rushed": dict(wpm=88, wpm_variance=0.38, typo_rate=6.5, think_rate=0.6,
                           line_pause=0.4, paragraph_pause=0.9),
        }
        for field, value in presets[name].items():
            self.vars[field].set(value)
        self._refresh_labels()

    def _clear_text(self) -> None:
        self.text.delete("1.0", "end")
        self.resume_index = 0

    def _load_file(self) -> None:
        path = filedialog.askopenfilename(
            filetypes=[("Text files", "*.txt *.md"), ("All files", "*.*")]
        )
        if not path:
            return
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            self.text.delete("1.0", "end")
            self.text.insert("1.0", handle.read())
        self.resume_index = 0

    def _preview(self) -> None:
        text = self._script()
        if not text.strip():
            messagebox.showinfo("Nothing to preview", "Paste some text first.")
            return
        sample = text[:600]
        kb = DryRunKeyboard()
        cfg = self._config()
        cfg.start_delay = 0
        engine = TypingEngine(sample, cfg, keyboard=kb, realtime=False)
        engine.run()

        window = tk.Toplevel(self.root)
        window.title("Keystroke preview")
        window.geometry("720x480")
        ttk.Label(
            window,
            text=f"{kb.keystrokes} keystrokes for {len(sample)} characters, "
                 f"{engine.typos_made} mistakes corrected. ⌫ = backspace.",
            padding=8,
        ).pack(anchor="w")
        box = tk.Text(window, wrap="word", font=("Consolas", 10))
        box.pack(fill="both", expand=True, padx=8, pady=(0, 8))
        box.insert("1.0", "".join(kb.trace))
        box.insert("end", "\n\n--- resulting document text ---\n\n" + kb.text)
        box.configure(state="disabled")

    # -- run control -----------------------------------------------------

    def _start(self) -> None:
        if self.engine and self.engine.is_alive():
            return
        text = self._script()
        if not text.strip():
            messagebox.showinfo("Nothing to type", "Paste the text you want typed first.")
            return

        start_index = self.resume_index if self.resume_var.get() else 0
        if start_index >= len(text):
            start_index = 0

        try:
            self.engine = TypingEngine(
                text,
                self._config(),
                on_progress=lambda done, total: self.events.put(("progress", (done, total))),
                on_status=lambda msg: self.events.put(("status", msg)),
                on_finished=lambda reason, index: self.events.put(("done", (reason, index))),
                start_index=start_index,
            )
        except ImportError:
            messagebox.showerror(
                "pynput is missing",
                "Install the keyboard library first:\n\n    pip install pynput",
            )
            return

        self.start_btn.configure(state="disabled")
        self.pause_btn.configure(state="normal", text="Pause")
        self.stop_btn.configure(state="normal")
        self.root.iconify()          # get out of the way of the document
        self.engine.start()

    def _toggle_pause(self) -> None:
        if not self.engine:
            return
        if self.engine.paused:
            self.engine.unpause()
            self.pause_btn.configure(text="Pause")
        else:
            self.engine.pause()
            self.pause_btn.configure(text="Resume")

    def _stop(self) -> None:
        if self.engine:
            self.engine.stop()

    def _on_finished(self, reason: str, index: int) -> None:
        self.resume_index = index
        self.start_btn.configure(state="normal")
        self.pause_btn.configure(state="disabled", text="Pause")
        self.stop_btn.configure(state="disabled")
        self.root.deiconify()
        total = len(self._script())
        if reason == "finished":
            self.status.configure(text=f"Done. Typed {total:,} characters.")
            self.resume_index = 0
        elif reason == "stopped":
            self.status.configure(
                text=f"Stopped at character {index:,} of {total:,}. "
                     f"Press Start to pick up from here."
            )

    def _poll_events(self) -> None:
        try:
            while True:
                kind, payload = self.events.get_nowait()
                if kind == "progress":
                    done, total = payload
                    self.progress["value"] = (done / total) * 100 if total else 0
                elif kind == "status":
                    self.status.configure(text=payload)
                elif kind == "done":
                    self._on_finished(*payload)
        except queue.Empty:
            pass
        self.root.after(60, self._poll_events)

    # -- global Esc abort -------------------------------------------------

    def _start_hotkey_listener(self) -> None:
        try:
            from pynput import keyboard
        except ImportError:
            return

        def on_press(key):
            if key == keyboard.Key.esc and self.engine and self.engine.is_alive():
                self.engine.stop()

        try:
            self._listener = keyboard.Listener(on_press=on_press)
            self._listener.daemon = True
            self._listener.start()
        except Exception:
            self._listener = None

    # -- persistence ------------------------------------------------------

    def _load_config(self) -> None:
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as handle:
                data = json.load(handle)
        except (OSError, ValueError):
            return
        for field, var in self.vars.items():
            if field in data:
                try:
                    var.set(float(data[field]))
                except (TypeError, ValueError):
                    pass
        self._refresh_labels()

    def _save_config(self) -> None:
        try:
            with open(CONFIG_PATH, "w", encoding="utf-8") as handle:
                json.dump({f: v.get() for f, v in self.vars.items()}, handle, indent=2)
        except OSError:
            pass

    def _on_close(self) -> None:
        if self.engine:
            self.engine.stop()
        self._save_config()
        self.root.destroy()


def main() -> int:
    root = tk.Tk()
    try:
        ttk.Style().theme_use("vista" if sys.platform == "win32" else "clam")
    except tk.TclError:
        pass
    App(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
