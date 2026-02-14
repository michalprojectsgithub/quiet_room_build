#!/usr/bin/env python3
"""
Thumbnail generator for Master Study library

- Mirrors folder structure from /images -> /thumbnails
- Preserves aspect ratio (no crop)
- Outputs WebP thumbnails
- Skips files that are already up-to-date

Install:
  pip install pillow

Run:
  python generate_thumbnails.py

Optional:
  python generate_thumbnails.py --width 480
"""

import argparse
from pathlib import Path
from PIL import Image


SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}


def is_up_to_date(src: Path, dst: Path) -> bool:
    if not dst.exists():
        return False
    return dst.stat().st_mtime >= src.stat().st_mtime


def create_thumbnail(src: Path, dst: Path, width: int, quality: int):
    dst.parent.mkdir(parents=True, exist_ok=True)

    if is_up_to_date(src, dst):
        return False

    with Image.open(src) as img:

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        w, h = img.size
        new_w = width
        new_h = int(h * (width / w))

        img = img.resize((new_w, new_h), Image.LANCZOS)
        img.save(dst, "WEBP", quality=quality, method=6)

    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", default="images", help="Source images folder")
    parser.add_argument("--dst", default="thumbnails", help="Output thumbnails folder")
    parser.add_argument("--width", type=int, default=480, help="Thumbnail width")
    parser.add_argument("--quality", type=int, default=85, help="WebP quality")

    args = parser.parse_args()

    src_root = Path(args.src).resolve()
    dst_root = Path(args.dst).resolve()

    if not src_root.exists():
        print("❌ Source folder not found:", src_root)
        return

    generated = 0
    skipped = 0

    for src_file in src_root.rglob("*"):
        if not src_file.is_file():
            continue
        if src_file.suffix.lower() not in SUPPORTED_EXTS:
            continue

        rel_path = src_file.relative_to(src_root)
        dst_file = (dst_root / rel_path).with_suffix(".webp")

        try:
            did = create_thumbnail(
                src_file,
                dst_file,
                args.width,
                args.quality
            )

            if did:
                generated += 1
                print("✓", dst_file)
            else:
                skipped += 1

        except Exception as e:
            print("✗ ERROR:", src_file, e)

    print("\nDONE")
    print("Generated:", generated)
    print("Skipped:", skipped)
    print("Output:", dst_root)


if __name__ == "__main__":
    main()
