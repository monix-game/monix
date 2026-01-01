#!/usr/bin/env python3
"""
vis_to_gif.py

Create a bar-based music visualiser for the entire audio file and save as a GIF
with a transparent background.

Usage:
    python vis_to_gif.py input.mp3 -o out.gif --fps 20 --bars 64 --width 800 --height 120

Dependencies:
    pip install numpy librosa pillow tqdm soundfile

Notes:
- Long audio files at high FPS use a lot of memory. If you run out of memory,
  lower --fps, reduce --width/--height, or shorten the audio beforehand.
- The script uses a "magic" background color (#ff00ff) and saves the GIF
  with that palette index set as transparent.
"""
import argparse
import math
import os
from typing import Tuple

import numpy as np
from PIL import Image, ImageDraw
from tqdm import tqdm

try:
    import librosa
except Exception as e:
    raise RuntimeError(
        "librosa is required. Install with: pip install librosa soundfile"
    ) from e


def hex_to_rgb(hexstr: str) -> Tuple[int, int, int]:
    s = hexstr.strip().lstrip("#")
    if len(s) == 3:
        s = "".join([c * 2 for c in s])
    return tuple(int(s[i : i + 2], 16) for i in (0, 2, 4))


def compute_bar_energies(
    y: np.ndarray, sr: int, fps: int, bars: int, n_fft: int = 2048
) -> np.ndarray:
    """
    Compute grouped band energies for each frame.

    Returns:
        energies: (bars, frames) array with linear magnitudes (non-negative)
    """
    # hop length to get approximately fps frames per second
    hop_length = max(1, int(sr / fps))
    # choose n_fft at least hop_length*2 and power of two
    n_fft = max(
        n_fft, 1 << (int(math.log2(hop_length * 2)) if hop_length * 2 > 0 else 11)
    )
    # compute STFT magnitudes
    S = np.abs(
        librosa.stft(y, n_fft=n_fft, hop_length=hop_length, window="hann", center=True)
    )
    # S: shape (freq_bins, frames)
    freq_bins, frames = S.shape

    # Group frequency bins into 'bars' bands (linear mapping)
    bins_per_bar = max(1, freq_bins // bars)
    energies = np.zeros((bars, frames), dtype=float)

    for b in range(bars):
        start = b * bins_per_bar
        # last bar takes remainder
        end = freq_bins if b == bars - 1 else (start + bins_per_bar)
        # average energy across bins in this band
        band = S[start:end, :]
        # mean over frequency axis (preserve frames)
        energies[b, :] = band.mean(axis=0)

    return energies


def render_frames(
    energies: np.ndarray,
    width: int,
    height: int,
    bar_color: Tuple[int, int, int],
    bg_color: Tuple[int, int, int],
    bar_spacing: int,
) -> list:
    """
    Render RGB frames with solid background color (bg_color).
    Returns a list of PIL.Image in "RGB".
    """
    bars, frames = energies.shape
    # Normalize energies globally so the GIF shows full dynamics
    max_energy = float(np.max(energies)) if np.max(energies) > 0 else 1.0
    norm = energies / max_energy

    # Compute bar width (fit bars and spacing inside width)
    total_spacing = (bars - 1) * bar_spacing
    bar_width = max(1, (width - total_spacing) // bars)
    used_width = bars * bar_width + total_spacing
    x_offset = (width - used_width) // 2  # center horizontally

    frames_imgs = []
    for t in range(frames):
        im = Image.new("RGB", (width, height), bg_color)
        draw = ImageDraw.Draw(im)
        for b in range(bars):
            val = norm[b, t]
            h = int(round(val * height))
            # draw from bottom up
            x = x_offset + b * (bar_width + bar_spacing)
            y0 = height - h
            x1 = x + bar_width - 1
            y1 = height - 1
            if h > 0:
                draw.rectangle([x, y0, x1, y1], fill=bar_color)
        frames_imgs.append(im)
    return frames_imgs


def find_color_index_in_palette(pal: list, target_rgb: Tuple[int, int, int]) -> int:
    """
    Given a flat palette list (len 768), find the palette index for target_rgb.
    Returns index or -1 if not found.
    """
    r_t, g_t, b_t = target_rgb
    for i in range(256):
        r = pal[3 * i]
        g = pal[3 * i + 1]
        b = pal[3 * i + 2]
        if (r, g, b) == (r_t, g_t, b_t):
            return i
    return -1


def save_frames_as_transparent_gif(
    frames: list,
    out_path: str,
    duration_ms: int,
    loop: int,
    bg_color: Tuple[int, int, int],
):
    """
    Save frames (PIL RGB images) as a GIF with bg_color treated as transparent.
    Uses the palette of the first frame and quantizes subsequent frames to that palette.
    """
    if len(frames) == 0:
        raise ValueError("No frames to save")

    # Convert first frame to 'P' with adaptive palette
    first = frames[0].convert("P", palette=Image.ADAPTIVE, colors=256)
    palette = first.getpalette()
    idx = find_color_index_in_palette(palette, bg_color)
    if idx == -1:
        # In rare cases adaptive palette may not include bg_color.
        # Try forcing it: create a temporary palette that contains bg_color at index 0.
        # A simple fallback is to quantize with fewer colors to encourage inclusion.
        first = frames[0].quantize(colors=255, method=Image.FASTOCTREE)
        palette = first.getpalette()
        idx = find_color_index_in_palette(palette, bg_color)
        if idx == -1:
            # give up and use index 0 (may not be the exact bg color)
            idx = 0
            print(
                "WARNING: background color not found in palette; transparency index set to 0"
            )

    # Quantize other frames to the palette of first
    others = []
    for im in frames[1:]:
        q = im.quantize(palette=first)
        others.append(q)

    # Save
    save_kwargs = dict(
        save_all=True,
        append_images=others,
        duration=duration_ms,
        loop=loop,
        transparency=idx,
        disposal=2,
    )
    # Pillow requires the first image to be in 'P' mode when saving GIF with transparency param
    first.save(out_path, format="GIF", **save_kwargs)


def main():
    p = argparse.ArgumentParser(
        description="Create a bar visualiser GIF (transparent) from audio."
    )
    p.add_argument("input", help="Input audio file (wav/mp3/ogg/...)")
    p.add_argument("-o", "--output", default="visualiser.gif", help="Output GIF path")
    p.add_argument("--width", type=int, default=800, help="Canvas width in pixels")
    p.add_argument("--height", type=int, default=120, help="Canvas height in pixels")
    p.add_argument("--fps", type=int, default=20, help="Frames per second for the GIF")
    p.add_argument(
        "--bars",
        type=int,
        default=64,
        help="Number of bars (columns) in the visualiser",
    )
    p.add_argument(
        "--bar-color", default="#00bfff", help="Bar color as hex (default: #00bfff)"
    )
    p.add_argument(
        "--bg-color",
        default="#ff00ff",
        help="Magic background color / will be transparent (default: magenta #ff00ff)",
    )
    p.add_argument(
        "--bar-spacing", type=int, default=2, help="Spacing in pixels between bars"
    )
    p.add_argument(
        "--n-fft",
        type=int,
        default=2048,
        help="n_fft for STFT (higher=more freq resolution)",
    )
    p.add_argument("--no-progress", action="store_true", help="Hide progress output")
    args = p.parse_args()

    if not os.path.isfile(args.input):
        raise SystemExit(f"Input file not found: {args.input}")

    bar_color = hex_to_rgb(args.bar_color)
    bg_color = hex_to_rgb(args.bg_color)

    print("Loading audio (this may take a moment)...")
    y, sr = librosa.load(args.input, sr=None, mono=True)
    duration_s = len(y) / sr
    print(f"Loaded: {args.input} — {duration_s:.2f}s @ {sr} Hz")

    print("Computing spectrogram and grouping into bars...")
    energies = compute_bar_energies(
        y, sr, fps=args.fps, bars=args.bars, n_fft=args.n_fft
    )
    frames_count = energies.shape[1]
    print(f"Frames to render: {frames_count} (fps={args.fps})")

    try:
        print("Rendering frames...")
        frames = []
        iterator = range(frames_count)
        if not args.no_progress:
            iterator = tqdm(iterator, desc="Rendering frames", unit="frame")
        for t in iterator:
            # Render per frame lazily to reduce peak memory; we still store frames in memory for final GIF
            # (could be changed to saving to disk to reduce memory)
            # We render one frame at a time by slicing energies[:, t:t+1]
            im_list = render_frames(
                energies[:, t : t + 1],
                args.width,
                args.height,
                bar_color,
                bg_color,
                args.bar_spacing,
            )
            frames.append(im_list[0])
    except MemoryError:
        raise SystemExit(
            "MemoryError: Too many frames for available memory. Try reducing fps, width, or bars."
        )

    print(f"Saving GIF to {args.output} (this may take a bit)...")
    duration_ms = int(round(1000.0 / args.fps))
    save_frames_as_transparent_gif(
        frames, args.output, duration_ms=duration_ms, loop=0, bg_color=bg_color
    )
    print("Done. GIF saved:", args.output)


if __name__ == "__main__":
    main()
