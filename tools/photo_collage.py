#!/usr/bin/env python3
"""BOYNT photo utilities: remove the sparkle mark, then build an IG collage.

Two subcommands:

    clean    remove the four-point sparkle watermark, writing full-resolution
             cleaned copies

    collage  arrange four photos into a 2x2 grid sized for a portrait
             Instagram post

Typical run:

    python3 tools/photo_collage.py clean -o assets/clean
    python3 tools/photo_collage.py collage -o assets/collage/boynt-collage.jpg

On removal method: automatic detection was tried first and abandoned. The
sparkle is a soft, low-contrast overlay, so local-contrast thresholding scored
wood grain and fabric folds higher than the glyph itself, and template matching
locked onto background bokeh. Diffusion inpainting (Telea, Navier-Stokes, and
xphoto FSR) all left a visible ghost of the glyph.

What works is copying real pixels from a nearby patch of the same material.
The glyph sits at a fixed spot in every marked frame, so each photo carries an
explicit, eyeballed source offset below rather than a guess at runtime.
"""

from __future__ import annotations

import argparse
import os
import sys

import cv2
import numpy as np

# Glyph centre, measured off a coordinate grid; identical in every marked
# frame, at 88% across and 88% down a 2048px square.
MARK_CX_FRAC = 1807 / 2048
MARK_CY_FRAC = 1806 / 2048
MARK_R_FRAC = 70 / 2048     # covers the glyph's tips plus its soft halo

# Per-photo fill source, as a (dy, dx) shift in pixels. dst[p] = src[p - shift],
# so a negative dy samples from below and a positive dx samples from the left.
# A shift must clear the glyph itself (>=135px here) or it copies the mark back
# in, and must not reach past the frame edge into unrelated content.
PHOTOS = {
    # navy cap, cobblestone patio  -> cream shirt below
    "Gemini_Generated_Image_s1vri5s1vri5s1vr": (-140, 0),
    # orange cap, wooden barn      -> sage shirt below
    "Gemini_Generated_Image_ga6m8sga6m8sga6m": (-140, 0),
    # back print, wooden fence     -> blurred fence to the left
    "Gemini_Generated_Image_63jdvl63jdvl63jd": (0, 150),
    # orange cap, cobblestone      -> no mark present, passed through untouched
    "Gemini_Generated_Image_iq9t7ciq9t7ciq9t": None,
}

# Photo order in the collage: top-left, top-right, bottom-left, bottom-right.
ORDER = [
    "Gemini_Generated_Image_s1vri5s1vri5s1vr",
    "Gemini_Generated_Image_iq9t7ciq9t7ciq9t",
    "Gemini_Generated_Image_63jdvl63jdvl63jd",
    "Gemini_Generated_Image_ga6m8sga6m8sga6m",
]


def remove_mark(img: np.ndarray, dy: int, dx: int, feather: float = 9.0) -> np.ndarray:
    """Patch out the sparkle by blending in a shifted copy of the photo."""
    h, w = img.shape[:2]
    cx, cy = int(w * MARK_CX_FRAC), int(h * MARK_CY_FRAC)
    r = int(min(w, h) * MARK_R_FRAC)

    mask = np.zeros((h, w), np.uint8)
    cv2.circle(mask, (cx, cy), r, 255, -1)

    src = np.roll(np.roll(img, dy, axis=0), dx, axis=1)
    alpha = cv2.GaussianBlur(mask.astype(np.float32) / 255.0, (0, 0), feather)[..., None]
    return (img * (1 - alpha) + src * alpha).astype(np.uint8)


def clean_all(src_dir: str, out_dir: str) -> list[str]:
    os.makedirs(out_dir, exist_ok=True)
    outs = []
    for stem, shift in PHOTOS.items():
        path = os.path.join(src_dir, f"{stem}.png")
        img = cv2.imread(path, cv2.IMREAD_COLOR)
        if img is None:
            raise SystemExit(f"could not read image: {path}")

        out = os.path.join(out_dir, f"{stem}-clean.png")
        if shift is None:
            cv2.imwrite(out, img)
            print(f"{stem[-8:]}: no mark present, copied unchanged")
        else:
            cv2.imwrite(out, remove_mark(img, *shift))
            print(f"{stem[-8:]}: mark removed, fill from shift {shift}")
        outs.append(out)
    return outs


def cover_crop(img: np.ndarray, cw: int, ch: int, ax: float, ay: float) -> np.ndarray:
    """Scale-and-crop to exactly cw x ch. ax/ay pick which part survives the
    crop on each axis: 0.0 keeps the left/top edge, 1.0 the right/bottom."""
    h, w = img.shape[:2]
    scale = max(cw / w, ch / h)
    nw, nh = int(round(w * scale)), int(round(h * scale))
    img = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
    x = int(round((nw - cw) * ax))
    y = int(round((nh - ch) * ay))
    return img[y:y + ch, x:x + cw]


def build_collage(paths: list[str], out: str, width: int, height: int,
                  gutter: int, margin: int, bg: tuple[int, int, int],
                  xa: list[float], ya: list[float]) -> str:
    canvas = np.zeros((height, width, 3), np.uint8)
    canvas[:] = bg

    cw = (width - 2 * margin - gutter) // 2
    ch = (height - 2 * margin - gutter) // 2

    for i, path in enumerate(paths):
        img = cv2.imread(path, cv2.IMREAD_COLOR)
        if img is None:
            raise SystemExit(f"could not read image: {path}")
        cell = cover_crop(img, cw, ch, xa[i], ya[i])
        x = margin + (i % 2) * (cw + gutter)
        y = margin + (i // 2) * (ch + gutter)
        canvas[y:y + ch, x:x + cw] = cell

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    params = [cv2.IMWRITE_JPEG_QUALITY, 95] if out.lower().endswith((".jpg", ".jpeg")) else []
    cv2.imwrite(out, canvas, params)
    print(f"collage {width}x{height}, cells {cw}x{ch} -> {out}")
    return out


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("clean", help="remove the sparkle mark")
    c.add_argument("--src-dir", default="assets/source")
    c.add_argument("-o", "--out-dir", default="assets/clean")

    g = sub.add_parser("collage", help="build the 2x2 Instagram collage")
    g.add_argument("--src-dir", default="assets/clean")
    g.add_argument("-o", "--out", default="assets/collage/boynt-collage.jpg")
    g.add_argument("--width", type=int, default=1080)
    g.add_argument("--height", type=int, default=1350)  # 4:5 portrait IG post
    # Edge to edge by default: at 0/0 the cells land on an exact 540x675, so
    # each photo keeps a true 4:5 crop with no seam between them.
    g.add_argument("--gutter", type=int, default=0)
    g.add_argument("--margin", type=int, default=0)
    g.add_argument("--bg", default="255,255,255", help="B,G,R background colour")
    g.add_argument("--xanchors", default="0.5,0.45,0.5,0.5")
    g.add_argument("--yanchors", default="0.5,0.5,0.5,0.5")

    a = ap.parse_args(argv)

    if a.cmd == "clean":
        clean_all(a.src_dir, a.out_dir)
        return 0

    paths = [os.path.join(a.src_dir, f"{s}-clean.png") for s in ORDER]
    bg = tuple(int(v) for v in a.bg.split(","))
    xa = [float(v) for v in a.xanchors.split(",")]
    ya = [float(v) for v in a.yanchors.split(",")]
    if len(xa) != 4 or len(ya) != 4:
        raise SystemExit("anchors need 4 comma-separated values each")
    build_collage(paths, a.out, a.width, a.height, a.gutter, a.margin, bg, xa, ya)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
