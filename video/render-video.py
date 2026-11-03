#!/usr/bin/env python3
"""Render a simple, editable video timeline from local MP4 clips."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


def number(value: Any, label: str, *, minimum: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"{label} must be a number") from error
    if parsed < minimum:
        raise ValueError(f"{label} must be at least {minimum}")
    return parsed


def render(config_path: Path, output_override: str | None = None) -> None:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    base = config_path.resolve().parent
    width = int(config.get("width", 1600))
    height = int(config.get("height", 900))
    fps = number(config.get("fps", 30), "fps", minimum=1)
    crf = int(config.get("crf", 18))
    preset = str(config.get("preset", "medium"))
    segments = config.get("segments")
    if not isinstance(segments, list) or not segments:
        raise ValueError("segments must be a non-empty array")
    if width < 2 or height < 2 or crf < 0 or crf > 51:
        raise ValueError("invalid output dimensions or CRF")

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required; install it with Homebrew")

    command = [ffmpeg, "-y", "-hide_banner", "-loglevel", "warning"]
    filters: list[str] = []
    for index, segment in enumerate(segments):
        source = (base / segment["file"]).resolve()
        if not source.is_file():
            raise FileNotFoundError(f"Missing segment source: {source}")

        segment_type = segment.get("type", "video")
        if segment_type not in {"video", "image"}:
            raise ValueError(f"segments[{index}].type must be 'video' or 'image'")
        if segment_type == "image":
            duration = number(
                segment.get("duration"), f"segments[{index}].duration", minimum=0.04
            )
            if "start" in segment or "end" in segment:
                raise ValueError(f"segments[{index}] image segments use duration, not start/end")
            start, end = 0.0, duration
            command.extend(
                ["-loop", "1", "-framerate", f"{fps:g}", "-t", f"{duration:.3f}", "-i", str(source)]
            )
        else:
            start = number(segment.get("start", 0), f"segments[{index}].start")
            end_value = segment.get("end")
            end = None if end_value is None else number(
                end_value, f"segments[{index}].end", minimum=0.001
            )
            if end is not None and end <= start:
                raise ValueError(f"segments[{index}].end must be greater than start")
            command.extend(["-i", str(source)])
        speed = number(segment.get("speed", 1), f"segments[{index}].speed", minimum=0.01)
        trim = f"trim=start={start:.3f}"
        if end is not None:
            trim += f":end={end:.3f}"
        filters.append(
            f"[{index}:v]{trim},setpts=(PTS-STARTPTS)/{speed:.4f},"
            f"fps={fps:g},scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=white,"
            f"setsar=1,format=yuv420p[v{index}]"
        )

    labels = "".join(f"[v{index}]" for index in range(len(segments)))
    filters.append(f"{labels}concat=n={len(segments)}:v=1:a=0[outv]")
    output_value = output_override or config.get("output", "out/video.mp4")
    output = Path(output_value)
    if not output.is_absolute():
        output = base / output
    output.parent.mkdir(parents=True, exist_ok=True)

    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[outv]",
            "-an",
            "-c:v",
            "libx264",
            "-crf",
            str(crf),
            "-preset",
            preset,
            "-movflags",
            "+faststart",
            str(output),
        ]
    )

    print("Timeline:")
    for segment in segments:
        if segment.get("type", "video") == "image":
            timing = f"still for {segment['duration']} s"
        else:
            end = "end" if segment.get("end") is None else f"{segment['end']} s"
            timing = f"{segment.get('start', 0)}–{end}"
        print(f"  {segment.get('name', segment['file'])}: {timing}, speed ×{segment.get('speed', 1)}")
    subprocess.run(command, check=True)
    print(f"Rendered {output}")


def main() -> int:
    config_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("timeline-1-2.json")
    output_override = sys.argv[2] if len(sys.argv) > 2 else None
    try:
        render(config_path, output_override)
    except (KeyError, TypeError, ValueError, FileNotFoundError, RuntimeError) as error:
        print(f"render-video: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
