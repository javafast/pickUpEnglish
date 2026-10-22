#!/usr/bin/env python3
"""Download the prepared A1 audio list into a server media directory."""

import argparse
import json
import os
import tempfile
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


parser = argparse.ArgumentParser()
parser.add_argument("manifest")
parser.add_argument("destination")
parser.add_argument("--workers", type=int, default=8)
args = parser.parse_args()
destination = Path(args.destination)
items = json.loads(Path(args.manifest).read_text())


def download(item):
    target = destination / item["path"]
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size > 10000:
        return item["path"], "cached"
    parts = urllib.parse.urlsplit(item["url"])
    safe_url = urllib.parse.urlunsplit((parts.scheme, parts.netloc, urllib.parse.quote(parts.path), parts.query, parts.fragment))
    request = urllib.request.Request(safe_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as temp:
            while chunk := response.read(1024 * 1024):
                temp.write(chunk)
            temp_path = Path(temp.name)
    os.replace(temp_path, target)
    return item["path"], target.stat().st_size


failures = []
with ThreadPoolExecutor(max_workers=args.workers) as pool:
    futures = [pool.submit(download, item) for item in items]
    for completed, future in enumerate(as_completed(futures), 1):
        try:
            path, result = future.result()
            print(f"{completed:03d}/{len(items)} {path} {result}", flush=True)
        except Exception as error:
            failures.append(str(error))
            print(f"ERROR {error}", flush=True)

if failures:
    raise SystemExit(f"{len(failures)} downloads failed")
