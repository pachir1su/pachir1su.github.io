#!/usr/bin/env python3
"""Strip privacy-sensitive metadata from public raster images and videos.

PNG cleanup is byte-preserving for every chunk except privacy/descriptive chunks
(`eXIf`, `tEXt`, `zTXt`, `iTXt`), so color/rendering chunks such as ICC, gAMA,
sRGB, cHRM and pHYs are not accidentally removed. Other raster formats use
`exiftool`, preserving ICC profiles and Orientation. Video streams are remuxed
with `ffmpeg -c copy`; they are never re-encoded.
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
PNG_SIGNATURE = b'\x89PNG\r\n\x1a\n'
PNG_PRIVATE_CHUNKS = {b'eXIf', b'tEXt', b'zTXt', b'iTXt'}


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


def sanitize_png(path: Path) -> None:
    """Remove only privacy/descriptive PNG chunks; preserve all others verbatim."""
    data = path.read_bytes()
    if not data.startswith(PNG_SIGNATURE):
        raise SystemExit(f'invalid PNG signature: {path.relative_to(ROOT)}')

    out = bytearray(PNG_SIGNATURE)
    cursor = len(PNG_SIGNATURE)
    saw_iend = False

    while cursor + 12 <= len(data):
        length = int.from_bytes(data[cursor:cursor + 4], 'big')
        end = cursor + 12 + length
        if end > len(data):
            raise SystemExit(f'truncated PNG chunk: {path.relative_to(ROOT)}')

        chunk_type = data[cursor + 4:cursor + 8]
        if chunk_type not in PNG_PRIVATE_CHUNKS:
            out.extend(data[cursor:end])

        cursor = end
        if chunk_type == b'IEND':
            saw_iend = True
            # Preserve any trailing bytes exactly. They are outside the PNG chunk stream
            # and are not interpreted as PNG metadata by our public-media gate.
            out.extend(data[cursor:])
            break

    if not saw_iend:
        raise SystemExit(f'PNG missing IEND: {path.relative_to(ROOT)}')

    path.write_bytes(bytes(out))


def sanitize_image(path: Path) -> None:
    if path.suffix.lower() == '.png':
        sanitize_png(path)
        return

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
                '-c', 'copy', '-fflags', '+bitexact', str(tmp),
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
