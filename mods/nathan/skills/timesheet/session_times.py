#!/usr/bin/env python3
"""Session timing from a Claude Code transcript: start, duration, focused time, work inventory."""
import json
import sys
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

PROJECTS_DIR = Path.home() / ".claude" / "projects"
IDLE_CAP = timedelta(minutes=10)  # reply->prompt gap credited at most this much
ASK_TOOL = "AskUserQuestion"  # answering Claude's questions counts as focus
EDIT_TOOLS = {"Edit", "Write", "NotebookEdit"}


def find_transcript(session_id):
    if session_id and not session_id.startswith("$"):
        hits = list(PROJECTS_DIR.glob(f"*/{session_id}.jsonl"))
        if hits:
            return hits[0]
    # fallback: newest top-level transcript (subagent files live one level deeper)
    return max(PROJECTS_DIR.glob("*/*.jsonl"), key=lambda p: p.stat().st_mtime)


def ts(event):
    return datetime.fromisoformat(event["timestamp"].replace("Z", "+00:00")).astimezone()


def is_prompt(event):
    if event.get("type") != "user" or event.get("isMeta") or event.get("isSidechain"):
        return False
    content = event.get("message", {}).get("content")
    if isinstance(content, str):
        return not content.startswith("<local-command")  # output of /clear, /model etc.
    return bool(content) and all(b.get("type") != "tool_result" for b in content)


def tool_results(event):
    content = event.get("message", {}).get("content")
    if event.get("type") != "user" or not isinstance(content, list):
        return []
    return [b for b in content if b.get("type") == "tool_result"]


def credit(gap):
    return min(max(gap, timedelta()), IDLE_CAP)  # queued prompts can predate the reply


def fmt(delta):
    mins = round(delta.total_seconds() / 60)
    return f"{mins // 60}h {mins % 60:02d}m"


def analyse(path):
    with path.open() as f:
        events = [json.loads(line) for line in f if line.strip()]
    events = [e for e in events if "timestamp" in e]

    focus = timedelta()
    gaps_capped = 0
    prompts = 0
    last_assistant = None
    ask_started = {}  # tool_use_id -> time Claude asked
    tools = Counter()
    files = set()

    for e in events:
        t = ts(e)
        if e.get("type") == "assistant" and not e.get("isSidechain"):
            last_assistant = t
            for b in e.get("message", {}).get("content", []):
                if b.get("type") != "tool_use":
                    continue
                tools[b["name"]] += 1
                if b["name"] == ASK_TOOL:
                    ask_started[b["id"]] = t
                if b["name"] in EDIT_TOOLS:
                    files.add(b.get("input", {}).get("file_path") or b.get("input", {}).get("notebook_path"))
            continue

        for r in tool_results(e):
            start = ask_started.pop(r.get("tool_use_id"), None)
            if start:
                gap = t - start
                gaps_capped += gap > IDLE_CAP
                focus += credit(gap)

        if is_prompt(e):
            prompts += 1
            if last_assistant:  # first prompt has no reply to read
                gap = t - last_assistant
                gaps_capped += gap > IDLE_CAP
                focus += credit(gap)
            last_assistant = None  # only first prompt after a reply counts

    times = [ts(e) for e in events]
    start, end = min(times), max(times)
    return {
        "transcript": str(path),
        "started": start.strftime("%a %d %b %Y %H:%M %Z"),
        "session_duration": fmt(end - start),
        "focused_time": fmt(focus),
        "prompts": prompts,
        "gaps_capped_at_10m": gaps_capped,
        "files_edited": sorted(f for f in files if f),
        "tool_calls": dict(tools.most_common()),
    }


if __name__ == "__main__":
    print(json.dumps(analyse(find_transcript(sys.argv[1] if len(sys.argv) > 1 else "")), indent=2))
