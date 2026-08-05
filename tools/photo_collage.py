#!/usr/bin/env python3
"""BOYNT photo utilities: remove the corner sparkle mark, then build an IG collage.

Two subcommands:

    clean    remove the small 4-point sparkle watermark from the bottom-right
             corner of each photo, writing full-resolution cleaned copies

    collage  arrange four (already cleaned) photos into a 2x2 grid sized for a
             portrait Instagram post

Typical run:

    python3 tools/photo_collage.py clean assets/source/*.png -o assets/clean
    python3 tools/photo_collage.py collage assets/clean/*.png \
        -o assets/collage/boynt-collage.jpg
"""

from __future__ import annotations

import argparse
import os
import sys

import cv2
import numpy as np

# The sparkle sits inside the bottom-right corner. Search a slightly generous
# box so a few percent of placement drift between renders still gets caught.
SEARCH_W = 0.16   # fraction of image width
SEARCH_H = 0.16   # fraction of image height

# Sanity bounds on the detected mark, as a fraction of the search box area.
MIN_AREA = 0.004
MAX_AREA = 0.40


def find_mark_mask(img: np.ndarray) -> tuple[np.ndarray, str]:
    """Return a full-frame uint8 mask covering the corner sparkle.

    The sparkle is a soft white glyph laid over ordinary photo content, so it
    reads as a small bright blob against its own local neighbourhood even when
    it sits on a pale shirt. Compare each pixel to a heavily blurred copy of
    the corner rather than to a global threshold.

    Falls back to masking the whole expected glyph box when detection returns
    something implausible, which keeps the caller from silently shipping an
    uncleaned photo.
    """
    h, w = img.shape[:2]
    sw, sh = int(w * SEARCH_W), int(h * SEARCH_H)
    x0, y0 = w - sw, h - sh

    roi = img[y0:h, x0:w]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY).astype(np.float32)

    # Local background estimate; kernel must be odd and comfortably larger than
    # the sparkle's stroke width.
    k = max(3, (min(sw, sh) // 2) | 1)
    background = cv2.GaussianBlur(gray, (k, k), 0)
    lift = gray - background

    # The glyph is the brightest thing relative to its surroundings. Use a
    # percentile so the threshold adapts to shirt vs. cobblestone backdrops.
    cutoff = max(6.0, float(np.percentile(lift, 99.0)) * 0.45)
    raw = (lift > cutoff).astype(np.uint8) * 255

    raw = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    raw = cv2.morphologyEx(raw, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))

    area_frac = float(raw.sum()) / 255.0 / (sw * sh)
    mode = "detected"
    if not (MIN_AREA <= area_frac <= MAX_AREA):
        mode = "fallback-box"
        raw = np.zeros((sh, sw), np.uint8)
        # Expected glyph footprint: ~6% of image width, inset ~2.5% from edges.
        gw = int(w * 0.075)
        pad_x = int(w * 0.02)
        pad_y = int(h * 0.02)
        raw[max(0, sh - pad_y - gw):sh - pad_y, max(0, sw - pad_x - gw):sw - pad_x] = 255

    # Grow the mask so the glyph's soft outer glow is repainted too.
    grow = max(5, int(min(w, h) * 0.006)) | 1
    raw = cv2.dilate(raw, np.ones((grow, grow), np.uint8))

    mask = np.zeros((h, w), np.uint8)
    mask[y0:h, x0:w] = raw
    return mask, mode


def clean_image(path: str, out_dir: str, debug: bool = False) -> str:
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit(f"could not read image: {path}")

    mask, mode = find_mark_mask(img)
    radius = max(4, int(min(img.shape[:2]) * 0.004))
    fixed = cv2.inpaint(img, mask, radius, cv2.INPAINT_TELEA)

    os.makedirs(out_dir, exist_ok=True)
    stem = os.path.splitext(os.path.basename(path))[0]
    out = os.path.join(out_dir, f"{stem}-clean.png")
    cv2.imwrite(out, fixed)

    if debug:
        overlay = img.copy()
        overlay[mask > 0] = (0, 0, 255)
        cv2.imwrite(os.path.join(out_dir, f"{stem}-mask.png"), overlay)

    print(f"{os.path.basename(path)}: mark removed ({mode}) -> {out}")
    return out


def cover_crop(img: np.ndarray, cw: int, ch: int, anchor: float) -> np.ndarray:
    """Scale-and-crop `img` to exactly cw x ch, keeping `anchor` vertically.

    anchor 0.0 keeps the top of the frame, 1.0 the bottom, 0.5 the centre.
    """
    h, w = img.shape[:2]
    scale = max(cw / w, ch / h)
    nw, nh = int(round(w * scale)), int(round(h * scale))
    img = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)

    x = max(0, min(nw - cw, (nw - cw) // 2))
    y = max(0, min(nh - ch, int(round((nh - ch) * anchor))))
    return img[y:y + ch, x:x + cw]


def build_collage(paths: list[str], out: str, width: int, height: int,
                  gutter: int, margin: int, bg: tuple[int, int, int],
                  anchors: list[float]) -> str:
    if len(paths) != 4:
        raise SystemExit(f"collage expects exactly 4 photos, got {len(paths)}")

    canvas = np.zeros((height, width, 3), np.uint8)
    canvas[:] = bg

    cw = (width - 2 * margin - gutter) // 2
    ch = (height - 2 * margin - gutter) // 2

    for i, path in enumerate(paths):
        img = cv2.imread(path, cv2.IMREAD_COLOR)
        if img is None:
            raise SystemExit(f"could not read image: {path}")
        cell = cover_crop(img, cw, ch, anchors[i])
        x = margin + (i % 2) * (cw + gutter)
        y = margin + (i // 2) * (ch + gutter)
        canvas[y:y + ch, x:x + cw] = cell

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    params = [cv2.IMWRITE_JPEG_QUALITY, 95] if out.lower().endswith((".jpg", ".jpeg")) else []
    cv2.imwrite(out, canvas, params)
    print(f"collage {width}x{height} -> {out}")
    return out


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("clean", help="remove the corner sparkle mark")
    c.add_argument("images", nargs="+")
    c.add_argument("-o", "--out-dir", default="assets/clean")
    c.add_argument("--debug", action="store_true",
                   help="also write a red-overlay preview of each mask")

    g = sub.add_parser("collage", help="build the 2x2 Instagram collage")
    g.add_argument("images", nargs=4)
    g.add_argument("-o", "--out", default="assets/collage/boynt-collage.jpg")
    g.add_argument("--width", type=int, default=1080)
    g.add_argument("--height", type=int, default=1350)  # 4:5 portrait IG post
    g.add_argument("--gutter", type=int, default=12)
    g.add_argument("--margin", type=int, default=12)
    g.add_argument("--bg", default="255,255,255", help="B,G,R background colour")
    g.add_argument("--anchors", default="0.5,0.5,0.5,0.5",
                   help="per-photo vertical crop anchor, 0=top 1=bottom")

    a = ap.parse_args(argv)

    if a.cmd == "clean":
        for p in a.images:
            clean_image(p, a.out_dir, a.debug)
        return 0

    bg = tuple(int(v) for v in a.bg.split(","))
    anchors = [float(v) for v in a.anchors.split(",")]
    if len(anchors) != 4:
        raise SystemExit("--anchors needs 4 comma-separated values")
    build_collage(a.images, a.out, a.width, a.height, a.gutter, a.margin, bg, anchors)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
