#!/usr/bin/env python3
"""Add local media paths to the A2 manifest and export matching LRC files."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "reader/data/a2.json"
MEDIA = ROOT / "media"


def timestamp(seconds):
    minutes = int(seconds // 60)
    rest = seconds - minutes * 60
    return f"{minutes:02d}:{rest:05.2f}"


data = json.loads(MANIFEST.read_text())
downloads = []
for category in data["categories"]:
    folder = MEDIA / "a2" / category["id"]
    folder.mkdir(parents=True, exist_ok=True)
    for index, lesson in enumerate(category["lessons"], 1):
        filename = f"{index:03d}"
        lesson["bookPath"] = f"/books/a2/{category['id']}"
        lesson["filename"] = filename
        lrc = []
        for line in lesson["lines"]:
            speaker = f"{line['speaker']}: " if line.get("speaker") else ""
            lrc.append(f"[{timestamp(line['start'])}]{speaker}{line['text']}")
        (folder / f"{filename}.lrc").write_text("\n".join(lrc) + "\n")
        downloads.append({"url": lesson["audio"], "path": f"a2/{category['id']}/{filename}.mp3"})

MANIFEST.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
(MEDIA / "downloads.json").write_text(json.dumps(downloads, ensure_ascii=False, indent=2))
print(f"Prepared {len(downloads)} MP3/LRC pairs")
