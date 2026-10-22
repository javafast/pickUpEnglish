#!/usr/bin/env python3
"""Build the ELLLO A1 sentence-reader manifest from the existing course index."""

import argparse
import json
import re
import shlex
import subprocess
import tempfile
from difflib import SequenceMatcher
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, NavigableString, Tag


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "learning-hub/a1-video/index.html"
OUTPUT = ROOT / "reader/data/a1.json"
CACHE = ROOT / ".cache/a1-reader"
NAMES = {"views": "自然对话", "video": "一分钟视频", "book": "语法对话"}


def course_groups():
    source = INDEX.read_text()
    video = json.loads(re.search(r"const lessons=(\[.*?\]);", source).group(1))
    groups = re.search(r"const groups=\{views:(\[.*?\]),video:lessons,book:(\[.*?\])\};", source)
    return {"views": json.loads(groups.group(1)), "video": video, "book": json.loads(groups.group(2))}


def clean(value):
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip()


def split_paragraph(paragraph):
    pieces, current = [], []
    for node in paragraph.descendants:
        if isinstance(node, Tag) and node.name == "br":
            text = clean(" ".join(current))
            if text:
                pieces.append(text)
            current = []
        elif isinstance(node, NavigableString):
            current.append(str(node))
    text = clean(" ".join(current))
    if text:
        pieces.append(text)
    return pieces


def line_record(text):
    match = re.match(r"^([^:]{1,24}):\s*(.+)$", text)
    if match:
        return {"speaker": clean(match.group(1)), "text": clean(match.group(2))}
    return {"text": clean(text)}


def extract_page(url, kind):
    response = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"}, verify=False)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    source = soup.select_one("audio source")
    if not source:
        raise ValueError("audio source not found")
    audio = urljoin(url, source.get("src"))
    transcript = soup.select_one("#transcript") if kind != "book" else soup.select_one(".transcript, .transcriptScroll2")
    if not transcript:
        raise ValueError("transcript not found")
    lines = []
    for paragraph in transcript.find_all("p", recursive=True):
        for text in split_paragraph(paragraph):
            if text:
                lines.append(line_record(text))
    if not lines:
        raise ValueError("transcript is empty")
    return audio, lines


def tokens(value):
    return re.findall(r"[a-z0-9]+(?:'[a-z]+)?", value.lower().replace("’", "'"))


def align(lines, words, duration):
    transcript_tokens, owners = [], []
    for index, line in enumerate(lines):
        for token in tokens(line["text"]):
            transcript_tokens.append(token)
            owners.append(index)
    heard_tokens = [token for word in words for token in tokens(word["word"])]
    heard_owner = [index for index, word in enumerate(words) for _ in tokens(word["word"])]
    matcher = SequenceMatcher(None, transcript_tokens, heard_tokens, autojunk=False)
    mapped = [[] for _ in lines]
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            mapped[owners[block.a + offset]].append(heard_owner[block.b + offset])
    starts = [None] * len(lines)
    ends = [None] * len(lines)
    for index, matches in enumerate(mapped):
        if matches:
            starts[index] = words[min(matches)]["start"]
            ends[index] = words[max(matches)]["end"]
    anchors = [index for index, start in enumerate(starts) if start is not None]
    if not anchors:
        raise ValueError("no transcript words matched the audio")
    for index in range(len(lines)):
        if starts[index] is not None:
            continue
        before = max((item for item in anchors if item < index), default=None)
        after = min((item for item in anchors if item > index), default=None)
        low = ends[before] if before is not None else 0
        high = starts[after] if after is not None else duration
        span = (after - before) if before is not None and after is not None else 1
        position = (index - before) if before is not None else 0
        starts[index] = low + (high - low) * position / span
        ends[index] = starts[index] + max(0.6, (high - low) / span)
    for index, line in enumerate(lines):
        line["start"] = round(max(0, starts[index]), 2)
        next_start = starts[index + 1] if index + 1 < len(lines) else duration
        line["end"] = round(max(line["start"] + 0.25, min(ends[index], next_start)), 2)
    return matcher.ratio()


def transcribe(audio_url, model):
    CACHE.mkdir(parents=True, exist_ok=True)
    suffix = Path(audio_url.split("?")[0]).suffix or ".mp3"
    with tempfile.NamedTemporaryFile(suffix=suffix) as target:
        with requests.get(audio_url, stream=True, timeout=60, verify=False) as response:
            response.raise_for_status()
            for chunk in response.iter_content(1024 * 256):
                target.write(chunk)
        target.flush()
        segments, info = model.transcribe(target.name, language="en", word_timestamps=True, vad_filter=True)
        words = [
            {"word": word.word, "start": word.start, "end": word.end}
            for segment in segments
            for word in (segment.words or [])
        ]
    return words, info.duration


def download_audio(audio_url, target, fetch_host=None):
    if fetch_host:
        command = f"curl -Ls -- {shlex.quote(audio_url)}"
        subprocess.run(["ssh", fetch_host, command], stdout=target, check=True)
        return
    with requests.get(audio_url, stream=True, timeout=60, verify=False) as response:
        response.raise_for_status()
        for chunk in response.iter_content(1024 * 256):
            target.write(chunk)


def energy_timeline(audio_url, lines, fetch_host=None):
    import av
    import numpy as np

    with tempfile.NamedTemporaryFile(suffix=".mp3") as target:
        download_audio(audio_url, target, fetch_host)
        target.flush()
        container = av.open(target.name)
        resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
        chunks = []
        try:
            for frame in container.decode(audio=0):
                for converted in resampler.resample(frame):
                    chunks.append(converted.to_ndarray().reshape(-1))
        except av.error.InvalidDataError:
            if not chunks:
                raise
        samples = np.concatenate(chunks).astype(np.float32) / 32768
    frame_size = 320
    usable = samples[: len(samples) // frame_size * frame_size]
    rms = np.sqrt(np.mean(usable.reshape(-1, frame_size) ** 2, axis=1))
    threshold = max(float(np.percentile(rms, 25)) * 2.2, float(np.max(rms)) * 0.025, 0.003)
    quiet = rms < threshold
    pauses = []
    start = None
    for index, is_quiet in enumerate(np.append(quiet, False)):
        if is_quiet and start is None:
            start = index
        elif not is_quiet and start is not None:
            if (index - start) * 0.02 >= 0.14:
                pauses.append((start + index) * 0.01)
            start = None
    duration = len(samples) / 16000
    weights = [max(1, len(tokens(line["text"]))) for line in lines]
    total = sum(weights)
    expected = []
    consumed = 0
    for weight in weights[:-1]:
        consumed += weight
        expected.append(duration * consumed / total)
    boundaries = [0.0]
    for index, target in enumerate(expected):
        minimum = boundaries[-1] + 0.3
        maximum = duration - (len(expected) - index) * 0.3
        choices = [pause for pause in pauses if minimum <= pause <= maximum and abs(pause - target) <= 2.5]
        boundaries.append(min(choices, key=lambda pause: abs(pause - target)) if choices else max(minimum, min(target, maximum)))
    boundaries.append(duration)
    for index, line in enumerate(lines):
        line["start"] = round(boundaries[index], 2)
        line["end"] = round(max(boundaries[index] + 0.25, boundaries[index + 1]), 2)
    return duration


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="maximum lessons per category; 0 means all")
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--category", choices=NAMES)
    parser.add_argument("--fetch-host", help="SSH host used as a faster audio download relay")
    parser.add_argument("--scrape-only", action="store_true")
    parser.add_argument("--energy-align", action="store_true", help="align lines to detected pauses without speech recognition")
    parser.add_argument("--model", default="tiny.en")
    args = parser.parse_args()
    groups = course_groups()
    if args.category:
        groups = {args.category: groups[args.category]}
    output = {"categories": []}
    errors = []
    whisper = None
    if not args.scrape_only and not args.energy_align:
        from faster_whisper import WhisperModel
        whisper = WhisperModel(args.model, device="cpu", compute_type="int8")
    for kind, lessons in groups.items():
        built = []
        selected = lessons[args.offset : args.offset + args.limit if args.limit else None]
        for lesson in selected:
            cache_file = CACHE / f"{kind}-{lesson['n']:02d}.json"
            if cache_file.exists():
                item = json.loads(cache_file.read_text())
            else:
                try:
                    audio, lines = extract_page(lesson["url"], kind)
                except Exception as error:
                    errors.append(f"{kind} {lesson['n']:02d}: {error}")
                    print(f"SKIP {errors[-1]}", flush=True)
                    continue
                item = {"title": lesson["title"], "source": lesson["url"], "audio": audio, "lines": lines}
            if args.energy_align and item["lines"] and "start" not in item["lines"][0]:
                item["duration"] = round(energy_timeline(item["audio"], item["lines"], args.fetch_host), 2)
                item["alignment"] = "pause-detection"
            elif whisper and item["lines"] and "start" not in item["lines"][0]:
                words, duration = transcribe(item["audio"], whisper)
                item["match"] = round(align(item["lines"], words, duration), 3)
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(json.dumps(item, ensure_ascii=False, indent=2))
            built.append(item)
            print(f"{kind} {lesson['n']:02d}: {lesson['title']} ({len(item['lines'])} lines)", flush=True)
        output["categories"].append({"id": kind, "name": NAMES[kind], "lessons": built})
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")))
    print(f"Wrote {OUTPUT}")
    if errors:
        print("Unavailable lessons:")
        print("\n".join(errors))


if __name__ == "__main__":
    main()
