#!/usr/bin/env bash
# usage: encode.sh <frames_dir> <out.mp4> [trim_start_seconds]
# Builds a CFR 30 fps H.264 MP4 from CDP screencast frames (concat list with durations).
set -Eeuo pipefail
dir="$1"; out="$2"; trim="${3:-0}"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$dir/list.txt" \
  -vf "fps=30,scale=1600:900:force_original_aspect_ratio=decrease,pad=1600:900:(ow-iw)/2:(oh-ih)/2:color=white,trim=start=${trim},setpts=PTS-STARTPTS,format=yuv420p" \
  -c:v libx264 -crf 18 -preset medium -movflags +faststart "$out"
ffprobe -v error -select_streams v -show_entries stream=start_time,duration -of csv=p=0 "$out"
