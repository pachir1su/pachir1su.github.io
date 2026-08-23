#!/usr/bin/env python3
"""Strip privacy-sensitive metadata from public raster images and videos.

Requires `exiftool` for images and `ffmpeg` for video containers. Pixel data is not
resized/cropped. ICC profiles and Orientation are preserved for raster images so
color and display direction stay unchanged. Video streams are remuxed with
`-c copy`; they are not re-encoded.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
VIDEO_EXTS = {'.mp4', '.mov', '.m4v', '.3gp', '.webm', '.mkv', '.avi'}


def run_audit() -> dict:
    proc = subprocess.run(
        ['node', str(ROOT / 'tools' / 'verify-media-metadata.js')],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise SystemExit(f'metadata audit output is not JSON: {proc.stderr}') from exc


def sanitize_image(path: Path) -> None:
    # Keep only non-private rendering metadata that prevents color/orientation regressions.
    proc = subprocess.run(
        [
            'exiftool', '-overwrite_original', '-all=', '-tagsfromfile', '@',
            '-ICC_Profile', '-Orientation', str(path),
        ],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise SystemExit(f'exiftool failed for {path.relative_to(ROOT)}: {proc.stdout}')


def sanitize_video(path: Path) -> None:
    fd, tmp_name = tempfile.mkstemp(suffix=path.suffix)
    os.close(fd)
    tmp = Path(tmp_name)
    try:
        proc = subprocess.run(
            [
                'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(path),
                '-map', '0', '-map_metadata', '-1', '-map_chapters', '-1',
                '-c', 'copy', str(tmp),
            ],
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            raise SystemExit(f'ffmpeg failed for {path.relative_to(ROOT)}: {proc.stdout}')
        shutil.move(str(tmp), str(path))
    finally:
        if tmp.exists():
            tmp.unlink()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--report', type=Path, help='write a JSON summary to this path')
    args = parser.parse_args()

    before = run_audit()
    changed: list[str] = []
    skipped: list[dict] = []

    for item in before.get('issues', []):
        rel = item['file']
        path = ROOT / rel
        if not path.is_file():
            raise SystemExit(f'flagged file is missing: {rel}')
        ext = path.suffix.lower()
        old = path.read_bytes()
        if ext in IMAGE_EXTS:
            sanitize_image(path)
        elif ext in VIDEO_EXTS:
            sanitize_video(path)
        else:
            skipped.append(item)
            continue
        if path.read_bytes() != old:
            changed.append(rel)

    after = run_audit()
    result = {
        'before': {'scanned': before.get('scanned', 0), 'offenders': before.get('offenders', 0)},
        'changed': changed,
        'changedCount': len(changed),
        'skipped': skipped,
        'after': after,
    }

    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    print(rendered)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered + '\n', encoding='utf-8')

    return 0 if after.get('offenders', 0) == 0 else 1


if __name__ == '__main__':
    raise SystemExit(main())
