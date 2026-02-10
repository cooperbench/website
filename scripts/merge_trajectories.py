#!/usr/bin/env python3
"""
Merge agent trajectories into a single chronological timeline.

Reads agent1_traj.json, agent2_traj.json, and conversation.json,
interleaves them by timestamp, and outputs a readable merged timeline.

Focuses on extracting:
- Git commands (push, pull, fetch, merge, rebase, force, etc.)
- Messages between agents (from conversation.json)
- Errors
- Submit actions

Filters for failed tasks (eval.json both_passed=false).
"""

import json
import os
import sys
import re
from datetime import datetime
from pathlib import Path


LOG_DIRS = [
    "/Users/arpan/Desktop/CooperBench/logs/coop-git-gemini-3-flash",
    "/Users/arpan/Desktop/CooperBench/logs/coop-oh-git-gemini-3-flash",
    "/Users/arpan/Desktop/CooperBench/logs/coop-msa-git-gemini-3-pro",
]

OUTPUT_DIR = "/Users/arpan/Desktop/CooperBench_website/scripts/merged_timelines"

GIT_PATTERN = re.compile(
    r'git\s+(push|pull|fetch|merge|rebase|checkout|branch|log|diff|status|add|commit|reset|stash|clone|remote|cherry-pick|revert|am|apply|format-patch)',
    re.IGNORECASE
)

GIT_DANGEROUS_PATTERN = re.compile(
    r'(--force|--hard|push\s+--force|-f\s|force\s+push|git\s+reset\s+--hard|git\s+push\s+-f)',
    re.IGNORECASE
)

SUBMIT_PATTERN = re.compile(r'COMPLETE_TASK_AND_SUBMIT|FinishAction|finish', re.IGNORECASE)

ERROR_PATTERNS = re.compile(
    r'(error:|fatal:|CONFLICT|merge conflict|failed to|cannot|rejected|non-fast-forward|unmerged files)',
    re.IGNORECASE
)


def extract_bash_commands(content):
    """Extract bash commands from assistant messages."""
    commands = []
    # Match ```bash ... ``` blocks
    bash_blocks = re.findall(r'```bash\s*\n(.*?)```', content, re.DOTALL)
    for block in bash_blocks:
        for line in block.strip().split('\n'):
            line = line.strip()
            if line and not line.startswith('#'):
                commands.append(line)
    return commands


def extract_git_commands(content):
    """Extract git commands from content."""
    commands = []
    # From bash blocks
    bash_commands = extract_bash_commands(content)
    for cmd in bash_commands:
        if 'git ' in cmd:
            commands.append(cmd)
    # Also look for inline git commands
    if not commands:
        for line in content.split('\n'):
            if GIT_PATTERN.search(line) and '```' not in line:
                # Only grab the actual command part
                match = re.search(r'(git\s+\S+(?:\s+\S+)*)', line)
                if match:
                    cmd = match.group(1).strip()
                    if len(cmd) < 200:  # sanity check
                        commands.append(cmd)
    return commands


def extract_send_message(content):
    """Extract send_message calls from content."""
    messages = []
    # Match send_message patterns
    patterns = [
        r'send_message\s+(\w+)\s+"([^"]*)"',
        r'send_message\s+(\w+)\s+\'([^\']*)\'',
        r'send_message\(recipient="(\w+)",\s*content="([^"]*)"',
        r'send_message\(recipient="(\w+)",\s*content=\'([^\']*)\'',
        r"send_message\(recipient='(\w+)',\s*content='([^']*)'",
        r"send_message\(recipient='(\w+)',\s*content=\"([^\"]*)\"",
    ]
    for pat in patterns:
        for match in re.finditer(pat, content, re.DOTALL):
            messages.append((match.group(1), match.group(2)))
    return messages


def extract_received_messages(content):
    """Extract received messages from user turn content."""
    messages = []
    pattern = r'\[Message from (\w+)\]:\s*(.*?)(?=\[Message from|\Z)'
    for match in re.finditer(pattern, content, re.DOTALL):
        messages.append((match.group(1), match.group(2).strip()))
    return messages


def has_errors(content):
    """Check if content contains error indicators."""
    return bool(ERROR_PATTERNS.search(content))


def format_timestamp(ts):
    """Convert unix timestamp to HH:MM:SS."""
    try:
        dt = datetime.fromtimestamp(ts)
        return dt.strftime("%H:%M:%S")
    except:
        return "??:??:??"


def process_msa_trajectory(traj_path, agent_id):
    """Process an MSA-format trajectory and extract events."""
    events = []
    try:
        with open(traj_path) as f:
            traj = json.load(f)
    except:
        return events

    messages = traj.get("messages", [])

    for i, msg in enumerate(messages):
        ts = msg.get("timestamp", 0)
        role = msg.get("role", "")
        content = msg.get("content", "")

        if role == "assistant":
            # Extract git commands
            git_cmds = extract_git_commands(content)
            for cmd in git_cmds:
                is_dangerous = bool(GIT_DANGEROUS_PATTERN.search(cmd))
                events.append({
                    "timestamp": ts,
                    "time": format_timestamp(ts),
                    "agent": agent_id,
                    "type": "git_dangerous" if is_dangerous else "git",
                    "content": cmd,
                })

            # Extract send_message calls
            sent = extract_send_message(content)
            for recipient, msg_text in sent:
                events.append({
                    "timestamp": ts,
                    "time": format_timestamp(ts),
                    "agent": agent_id,
                    "type": "message_sent",
                    "content": f"[to {recipient}]: {msg_text}",
                })

            # Check for submit
            if SUBMIT_PATTERN.search(content):
                events.append({
                    "timestamp": ts,
                    "time": format_timestamp(ts),
                    "agent": agent_id,
                    "type": "submit",
                    "content": "SUBMITS FINAL OUTPUT",
                })

            # Extract THOUGHT
            thought_match = re.search(r'THOUGHT:\s*(.*?)(?=```|$)', content, re.DOTALL)
            if not thought_match:
                thought_match = re.search(r'^(.*?)(?=```|$)', content, re.DOTALL)

        elif role == "user":
            # Check for errors in command output
            if has_errors(content):
                # Extract the error lines
                error_lines = []
                for line in content.split('\n'):
                    if ERROR_PATTERNS.search(line):
                        error_lines.append(line.strip())
                if error_lines:
                    events.append({
                        "timestamp": ts,
                        "time": format_timestamp(ts),
                        "agent": agent_id,
                        "type": "error",
                        "content": '\n'.join(error_lines[:5]),  # max 5 error lines
                    })

            # Check for received messages
            received = extract_received_messages(content)
            for from_agent, msg_text in received:
                # We'll use conversation.json for inter-agent messages instead
                pass

    return events


def process_oh_trajectory(traj_path, agent_id):
    """Process an OpenHands-format trajectory and extract events."""
    events = []
    try:
        with open(traj_path) as f:
            traj = json.load(f)
    except:
        return events

    messages = traj.get("messages", [])
    # OH format doesn't have timestamps in events, so we approximate
    # using started_at from result.json if available
    started_at = None
    result_path = traj_path.parent / "result.json" if isinstance(traj_path, Path) else Path(traj_path).parent / "result.json"
    try:
        with open(result_path) as f:
            result = json.load(f)
            started_at = datetime.fromisoformat(result["started_at"]).timestamp()
            ended_at = datetime.fromisoformat(result["ended_at"]).timestamp()
            duration = ended_at - started_at
    except:
        started_at = 0
        duration = 600  # default 10 minutes

    total_steps = len(messages)

    for i, msg in enumerate(messages):
        step = msg.get("step", i)
        event_type = msg.get("event_type", "")
        event = msg.get("event", "")

        # Approximate timestamp
        if started_at and total_steps > 0:
            ts = started_at + (step / total_steps) * duration
        else:
            ts = step

        if event_type == "ActionEvent":
            # Extract git commands from action events
            git_cmds = extract_git_commands(event)
            for cmd in git_cmds:
                is_dangerous = bool(GIT_DANGEROUS_PATTERN.search(cmd))
                events.append({
                    "timestamp": ts,
                    "time": format_timestamp(ts),
                    "agent": agent_id,
                    "type": "git_dangerous" if is_dangerous else "git",
                    "content": cmd,
                })

            # Check for send_message
            if "send_message" in event.lower() or "SendMessageAction" in event:
                msg_match = re.search(r'content[=:]\s*["\']?(.*?)(?:["\']?\s*$|\n)', event, re.DOTALL)
                if msg_match:
                    events.append({
                        "timestamp": ts,
                        "time": format_timestamp(ts),
                        "agent": agent_id,
                        "type": "message_sent",
                        "content": msg_match.group(1).strip()[:500],
                    })

            # Check for submit/finish
            if "FinishAction" in event or SUBMIT_PATTERN.search(event):
                events.append({
                    "timestamp": ts,
                    "time": format_timestamp(ts),
                    "agent": agent_id,
                    "type": "submit",
                    "content": "SUBMITS FINAL OUTPUT",
                })

        elif event_type == "ObservationEvent":
            # Check for errors
            if has_errors(event):
                error_lines = []
                for line in event.split('\n'):
                    if ERROR_PATTERNS.search(line):
                        error_lines.append(line.strip())
                if error_lines:
                    events.append({
                        "timestamp": ts,
                        "time": format_timestamp(ts),
                        "agent": agent_id,
                        "type": "error",
                        "content": '\n'.join(error_lines[:5]),
                    })

    return events


def process_conversation(conv_path):
    """Process conversation.json and extract message events."""
    events = []
    try:
        with open(conv_path) as f:
            conv = json.load(f)
    except:
        return events

    for msg in conv:
        ts = msg.get("timestamp", 0)
        from_agent = msg.get("from", "unknown")
        to_agent = msg.get("to", "unknown")
        content = msg.get("message", "")

        events.append({
            "timestamp": ts,
            "time": format_timestamp(ts),
            "agent": from_agent,
            "type": "message",
            "content": f"[to {to_agent}]: {content}",
        })

    return events


def merge_and_sort(events):
    """Merge all events and sort by timestamp."""
    return sorted(events, key=lambda e: e["timestamp"])


def format_event(event):
    """Format a single event for display."""
    type_indicators = {
        "git": "  GIT  ",
        "git_dangerous": "!!GIT!!",
        "message": "  MSG  ",
        "message_sent": " SEND  ",
        "error": " ERROR ",
        "submit": "SUBMIT ",
        "action": "  ACT  ",
    }
    indicator = type_indicators.get(event["type"], "  ???  ")
    agent = event["agent"].ljust(8)
    time = event["time"]
    content = event["content"].replace('\n', '\n' + ' ' * 30)

    return f"{time}  {agent} [{indicator}] {content}"


def format_timeline(events, metadata=None):
    """Format full timeline as readable text."""
    lines = []

    if metadata:
        lines.append("=" * 80)
        lines.append(f"RUN: {metadata.get('run_name', '?')}")
        lines.append(f"REPO: {metadata.get('repo', '?')}")
        lines.append(f"TASK: {metadata.get('task_id', '?')}")
        lines.append(f"FEATURES: {metadata.get('features', '?')}")
        lines.append(f"RESULT: {'BOTH PASSED' if metadata.get('both_passed') else 'FAILED'}")
        if metadata.get('f1_passed') is not None:
            lines.append(f"  Feature 1: {'PASSED' if metadata['f1_passed'] else 'FAILED'}")
            lines.append(f"  Feature 2: {'PASSED' if metadata['f2_passed'] else 'FAILED'}")
        lines.append(f"DURATION: {metadata.get('duration', '?')}s")
        lines.append(f"MESSAGES: {metadata.get('messages_sent', '?')}")
        lines.append("=" * 80)
        lines.append("")

    # Count stats
    git_count = sum(1 for e in events if e["type"] in ("git", "git_dangerous"))
    git_dangerous_count = sum(1 for e in events if e["type"] == "git_dangerous")
    msg_count = sum(1 for e in events if e["type"] in ("message", "message_sent"))
    error_count = sum(1 for e in events if e["type"] == "error")

    lines.append(f"STATS: {git_count} git commands ({git_dangerous_count} dangerous), "
                 f"{msg_count} messages, {error_count} errors")
    lines.append("-" * 80)

    for event in events:
        lines.append(format_event(event))

    lines.append("-" * 80)
    return '\n'.join(lines)


def detect_format(log_dir):
    """Detect whether this is MSA or OH format."""
    if "oh" in log_dir.lower():
        return "oh"
    return "msa"


def process_feature_combo(combo_dir, run_name, fmt):
    """Process a single feature combination directory."""
    combo_path = Path(combo_dir)

    # Check eval.json
    eval_path = combo_path / "eval.json"
    if not eval_path.exists():
        return None

    try:
        with open(eval_path) as f:
            eval_data = json.load(f)
    except:
        return None

    both_passed = eval_data.get("both_passed", True)

    # Check result.json for metadata
    result_path = combo_path / "result.json"
    metadata = {
        "run_name": run_name,
        "repo": eval_data.get("repo", "?"),
        "task_id": eval_data.get("task_id", "?"),
        "features": eval_data.get("features", []),
        "both_passed": both_passed,
        "f1_passed": eval_data.get("feature1", {}).get("passed"),
        "f2_passed": eval_data.get("feature2", {}).get("passed"),
    }

    try:
        with open(result_path) as f:
            result = json.load(f)
            metadata["duration"] = round(result.get("duration_seconds", 0))
            metadata["messages_sent"] = result.get("messages_sent", 0)
    except:
        metadata["duration"] = "?"
        metadata["messages_sent"] = "?"

    # Process trajectories
    agent1_path = combo_path / "agent1_traj.json"
    agent2_path = combo_path / "agent2_traj.json"
    conv_path = combo_path / "conversation.json"

    all_events = []

    if fmt == "msa":
        if agent1_path.exists():
            all_events.extend(process_msa_trajectory(str(agent1_path), "agent1"))
        if agent2_path.exists():
            all_events.extend(process_msa_trajectory(str(agent2_path), "agent2"))
    else:
        if agent1_path.exists():
            all_events.extend(process_oh_trajectory(str(agent1_path), "agent1"))
        if agent2_path.exists():
            all_events.extend(process_oh_trajectory(str(agent2_path), "agent2"))

    if conv_path.exists():
        all_events.extend(process_conversation(str(conv_path)))

    # Sort by timestamp
    timeline = merge_and_sort(all_events)

    return {
        "metadata": metadata,
        "events": timeline,
        "both_passed": both_passed,
        "path": str(combo_path),
    }


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_results = []

    for log_dir in LOG_DIRS:
        if not os.path.exists(log_dir):
            print(f"Skipping {log_dir} (not found)")
            continue

        run_name = os.path.basename(log_dir)
        fmt = detect_format(log_dir)
        print(f"\nProcessing {run_name} (format: {fmt})")

        coop_dir = os.path.join(log_dir, "coop")
        if not os.path.exists(coop_dir):
            print(f"  No coop/ directory found")
            continue

        # Walk through repo/task/feature_combo structure
        for repo_name in sorted(os.listdir(coop_dir)):
            repo_dir = os.path.join(coop_dir, repo_name)
            if not os.path.isdir(repo_dir):
                continue

            for task_id in sorted(os.listdir(repo_dir)):
                task_dir = os.path.join(repo_dir, task_id)
                if not os.path.isdir(task_dir):
                    continue

                for feature_combo in sorted(os.listdir(task_dir)):
                    combo_dir = os.path.join(task_dir, feature_combo)
                    if not os.path.isdir(combo_dir):
                        continue

                    result = process_feature_combo(combo_dir, run_name, fmt)
                    if result:
                        all_results.append(result)

    # Filter for failed tasks only
    failed = [r for r in all_results if not r["both_passed"]]
    passed = [r for r in all_results if r["both_passed"]]

    print(f"\n{'='*60}")
    print(f"Total tasks processed: {len(all_results)}")
    print(f"Failed: {len(failed)}")
    print(f"Passed: {len(passed)}")
    print(f"{'='*60}")

    # Sort failed by number of events (more events = more interesting usually)
    failed.sort(key=lambda r: len(r["events"]), reverse=True)

    # Write individual timeline files for failed tasks
    # Group by interesting characteristics
    interesting = {
        "git_heavy": [],      # Many git commands
        "git_dangerous": [],  # Has force push, reset --hard, etc.
        "high_message": [],   # Lots of messages
        "has_errors": [],     # Has errors
    }

    for r in failed:
        events = r["events"]
        git_count = sum(1 for e in events if e["type"] in ("git", "git_dangerous"))
        git_dangerous = sum(1 for e in events if e["type"] == "git_dangerous")
        msg_count = sum(1 for e in events if e["type"] in ("message", "message_sent"))
        error_count = sum(1 for e in events if e["type"] == "error")

        if git_dangerous > 0:
            interesting["git_dangerous"].append(r)
        if git_count >= 5:
            interesting["git_heavy"].append(r)
        if msg_count >= 5:
            interesting["high_message"].append(r)
        if error_count >= 2:
            interesting["has_errors"].append(r)

    # Write summary
    summary_lines = []
    summary_lines.append(f"FAILED TASK ANALYSIS")
    summary_lines.append(f"Total failed: {len(failed)}")
    summary_lines.append(f"With dangerous git: {len(interesting['git_dangerous'])}")
    summary_lines.append(f"Git-heavy (5+): {len(interesting['git_heavy'])}")
    summary_lines.append(f"High message (5+): {len(interesting['high_message'])}")
    summary_lines.append(f"Multiple errors (2+): {len(interesting['has_errors'])}")
    summary_lines.append("")
    summary_lines.append("=" * 80)

    # List all interesting ones
    for category, label in [
        ("git_dangerous", "DANGEROUS GIT COMMANDS"),
        ("git_heavy", "GIT-HEAVY FAILURES"),
        ("high_message", "HIGH MESSAGE COUNT"),
        ("has_errors", "MULTIPLE ERRORS"),
    ]:
        summary_lines.append(f"\n### {label} ###")
        for r in interesting[category]:
            events = r["events"]
            git_d = sum(1 for e in events if e["type"] == "git_dangerous")
            git_c = sum(1 for e in events if e["type"] in ("git", "git_dangerous"))
            msg_c = sum(1 for e in events if e["type"] in ("message", "message_sent"))
            err_c = sum(1 for e in events if e["type"] == "error")
            meta = r["metadata"]
            summary_lines.append(
                f"  {meta['run_name']}/{meta['repo']}/{meta['task_id']}/f{'_f'.join(str(f) for f in meta['features'])} "
                f"| git:{git_c}({git_d}dangerous) msg:{msg_c} err:{err_c} dur:{meta['duration']}s"
            )

    with open(os.path.join(OUTPUT_DIR, "summary.txt"), 'w') as f:
        f.write('\n'.join(summary_lines))

    print(f"\nSummary written to {OUTPUT_DIR}/summary.txt")

    # Write top 50 most interesting timelines (combined: git_dangerous + git_heavy + high_message)
    # Deduplicate
    written = set()
    count = 0
    all_interesting = (
        interesting["git_dangerous"] +
        interesting["git_heavy"] +
        interesting["has_errors"] +
        interesting["high_message"]
    )

    for r in all_interesting:
        path_key = r["path"]
        if path_key in written:
            continue
        written.add(path_key)

        meta = r["metadata"]
        filename = f"{meta['run_name']}__{meta['repo']}__{meta['task_id']}__f{'_f'.join(str(f) for f in meta['features'])}.txt"
        filename = filename.replace("/", "_")

        timeline_text = format_timeline(r["events"], r["metadata"])
        with open(os.path.join(OUTPUT_DIR, filename), 'w') as f:
            f.write(timeline_text)

        count += 1
        if count >= 100:
            break

    print(f"Wrote {count} timeline files to {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
