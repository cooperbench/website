#!/usr/bin/env python3
"""
Process OH SDK trajectories into the website viewer format.

Supports multiple runs. Each run config specifies:
  - logs_dir: source log directory
  - model_key / model_display: for index.json
  - output_setting: "coop" or "coop_git" (determines output data dir)

Usage:
  python3 scripts/prepare_oh_sdk_trajectories.py          # process all runs
  python3 scripts/prepare_oh_sdk_trajectories.py <key>     # process one run by model_key
"""

import json
import gzip
import re
import sys
from pathlib import Path
from datetime import datetime, timezone

ANSI_RE = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]|\x1b\[\?[0-9;]*[a-zA-Z]")

LOGS_BASE = Path("/Users/arpan/Desktop/CooperBench/logs")
WEBSITE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = WEBSITE_DIR / "public" / "static" / "data"

# ── Run configurations ─────────────────────────────────────────────────────────
RUNS = [
    {
        "logs_dir": LOGS_BASE / "coop-oh-git-gemini-3-flash" / "coop",
        "model_key": "gemini_flash_sdk_git",
        "model_display": "Gemini 3 Flash (SDK + Git)",
        "output_setting": "coop_git",
    },
    {
        "logs_dir": LOGS_BASE / "coop-oh-gemini-3-flash" / "coop",
        "model_key": "gemini_flash_sdk",
        "model_display": "Gemini 3 Flash (SDK)",
        "output_setting": "coop",
    },
]


# ── Event parsing helpers ──────────────────────────────────────────────────────

def parse_action_event(event_str: str):
    """Extract action name and thought from an ActionEvent string."""
    thought = ""
    action = "unknown"
    m = re.search(r"Thought:\s*(.*?)(?:\n|$)", event_str)
    if m:
        thought = m.group(1).strip()
    m = re.search(r"Action:\s*(\w+)", event_str)
    if m:
        action = m.group(1)
    return action, thought


def parse_observation_event(event_str: str):
    """Extract tool name and result text from an ObservationEvent string."""
    tool = ""
    result = ""
    m = re.search(r"Tool:\s*(\S+)", event_str)
    if m:
        tool = m.group(1)
    m = re.search(r"Result:\s*(.*)", event_str, re.DOTALL)
    if m:
        result = m.group(1).strip()
    return tool, result


def map_tool(action_name: str, tool_name: str, result_text: str):
    """Map OH SDK action/tool names to viewer function_name + args."""
    fn = "other"
    args = {}

    if action_name == "TerminalAction" or tool_name == "terminal":
        fn = "execute_bash"
        # OH SDK format doesn't store the actual command, only the output.
        # Leave args.command empty so the viewer shows the observation instead.

    elif action_name == "FileEditorAction" or tool_name == "file_editor":
        fn = "str_replace_editor"
        lower = result_text.lower() if result_text else ""
        if "file created" in lower or "created successfully" in lower:
            args["command"] = "create"
            # Extract path: "File created successfully at: /workspace/repo/foo.py"
            pm = re.search(r"(?:at|File created successfully at):\s*(/\S+)", result_text)
            if pm:
                args["path"] = pm.group(1)
        elif "edited" in lower or "applied" in lower or "replaced" in lower:
            args["command"] = "str_replace"
            # Extract path: "The file /workspace/repo/foo.py has been edited"
            pm = re.search(r"The file (/\S+) has been edited", result_text)
            if pm:
                args["path"] = pm.group(1)
            # Extract the post-edit snippet as new_str for display
            snippet_match = re.search(r"cat -n.*?:\n(.*)", result_text, re.DOTALL)
            if snippet_match:
                snippet = snippet_match.group(1).strip()
                if snippet:
                    args["new_str"] = snippet[:2000]
        elif "cat -n" in lower:
            args["command"] = "view"
            # Extract path from "cat -n` on /workspace/repo/foo.py:"
            pm = re.search(r"cat -n.*?on\s+(/\S+?):", result_text)
            if pm:
                args["path"] = pm.group(1)
        elif "error" in lower:
            args["command"] = "str_replace"  # attempted edit
            # Try to extract path from error messages
            pm = re.search(r"(?:file |File )(/\S+)", result_text)
            if pm:
                args["path"] = pm.group(1)
        else:
            args["command"] = "view"

    elif action_name == "TaskTrackerAction" or tool_name == "task_tracker":
        fn = "task_tracker"

    elif tool_name == "send_message":
        fn = "openhands_comm_send"
        args["content"] = result_text

    elif tool_name == "receive_message":
        fn = "openhands_comm_get"
        args["content"] = result_text

    elif action_name == "FinishAction" or tool_name == "finish":
        fn = "finish"
        args["message"] = result_text

    elif action_name == "ThinkAction":
        fn = "think"

    return fn, args


def interpolate_timestamps(started_at: str, ended_at: str, count: int):
    """Generate evenly-spaced ISO timestamps between start and end."""
    if not started_at or not ended_at or count <= 0:
        return [datetime.now(timezone.utc).isoformat() for _ in range(count)]
    try:
        start = datetime.fromisoformat(started_at)
        end = datetime.fromisoformat(ended_at)
    except ValueError:
        return [datetime.now(timezone.utc).isoformat() for _ in range(count)]
    if count == 1:
        return [start.isoformat()]
    delta = (end - start) / (count - 1)
    return [(start + delta * i).isoformat() for i in range(count)]


# ── Per-agent trajectory processing ───────────────────────────────────────────

def process_agent_traj(traj_data: dict, agent_label: str, timestamps: list):
    """Convert one agent's trajectory to viewer steps."""
    messages = traj_data.get("messages", [])
    steps = []

    i = 0
    step_idx = 0
    while i < len(messages):
        msg = messages[i]
        event_type = msg.get("event_type", "")

        if event_type in ("ConversationStateUpdateEvent", "SystemPromptEvent", "Condensation", "ConversationErrorEvent"):
            i += 1
            continue

        if event_type == "MessageEvent":
            i += 1
            continue

        if event_type == "AgentErrorEvent":
            ts = timestamps[step_idx] if step_idx < len(timestamps) else timestamps[-1] if timestamps else ""
            steps.append({
                "id": step_idx,
                "timestamp": ts,
                "source": "agent",
                "action": "error",
                "args": {},
                "message": msg.get("event", ""),
                "observation": msg.get("event", ""),
                "tool_call_metadata": {"function_name": "other"},
                "agentId": agent_label,
            })
            step_idx += 1
            i += 1
            continue

        if event_type == "ActionEvent":
            action_name, thought = parse_action_event(msg.get("event", ""))

            obs_tool = ""
            obs_result = ""
            if i + 1 < len(messages) and messages[i + 1].get("event_type") == "ObservationEvent":
                obs_tool, obs_result = parse_observation_event(messages[i + 1].get("event", ""))
                i += 1

            fn, args = map_tool(action_name, obs_tool, obs_result)

            ts = timestamps[step_idx] if step_idx < len(timestamps) else timestamps[-1] if timestamps else ""

            # Strip ANSI escape codes from observation text
            clean_result = ANSI_RE.sub("", obs_result) if obs_result else ""

            step = {
                "id": step_idx,
                "timestamp": ts,
                "source": "agent",
                "action": action_name,
                "args": args,
                "message": clean_result[:10000] if clean_result else thought,
                "observation": clean_result[:10000] if clean_result else "",
                "tool_call_metadata": {"function_name": fn},
                "agentId": agent_label,
            }

            steps.append(step)
            step_idx += 1
            i += 1
            continue

        if event_type == "ObservationEvent":
            obs_tool, obs_result = parse_observation_event(msg.get("event", ""))
            fn, args = map_tool("", obs_tool, obs_result)
            ts = timestamps[step_idx] if step_idx < len(timestamps) else timestamps[-1] if timestamps else ""
            steps.append({
                "id": step_idx,
                "timestamp": ts,
                "source": "agent",
                "action": obs_tool,
                "args": args,
                "message": obs_result[:10000],
                "observation": obs_result[:10000],
                "tool_call_metadata": {"function_name": fn},
                "agentId": agent_label,
            })
            step_idx += 1

        i += 1

    return steps


def normalize_feature_name(feat_dir_name: str) -> str:
    """Convert 'f1_f2' -> 'feature1_feature2'."""
    parts = feat_dir_name.split("_")
    normalized = []
    for p in parts:
        m = re.match(r"f(\d+)", p)
        if m:
            normalized.append(f"feature{m.group(1)}")
        else:
            normalized.append(p)
    return "_".join(normalized)


# ── Process a single run ──────────────────────────────────────────────────────

def process_run(run_config: dict):
    """Process one OH SDK run and return (tasks_index, stats, file_count)."""
    logs_dir = run_config["logs_dir"]
    model_key = run_config["model_key"]
    output_setting = run_config["output_setting"]

    output_dir = DATA_DIR / output_setting
    traj_dir = output_dir / "trajectories" / model_key
    traj_dir.mkdir(parents=True, exist_ok=True)

    tasks_index = []
    stats = {"total": 0, "passed": 0}
    file_count = 0

    print(f"\n{'='*60}")
    print(f"Processing: {model_key}")
    print(f"  Source: {logs_dir}")
    print(f"  Output: {traj_dir}")
    print(f"{'='*60}")

    for repo_dir in sorted(logs_dir.iterdir()):
        if not repo_dir.is_dir() or repo_dir.name.startswith("."):
            continue
        repo_name = repo_dir.name
        print(f"  {repo_name}...")

        for task_id_dir in sorted(repo_dir.iterdir()):
            if not task_id_dir.is_dir():
                continue
            task_id_raw = task_id_dir.name

            for feat_dir in sorted(task_id_dir.iterdir()):
                if not feat_dir.is_dir():
                    continue
                feat_name = feat_dir.name

                result_file = feat_dir / "result.json"
                eval_file = feat_dir / "eval.json"

                if not result_file.exists():
                    continue

                with open(result_file) as f:
                    result = json.load(f)

                started_at = result.get("started_at", "")
                ended_at = result.get("ended_at", "")
                agents_meta = result.get("agents", {})

                feat_parts = feat_name.split("_")
                if len(feat_parts) != 2:
                    continue
                agent_a_num = feat_parts[0].replace("f", "")
                agent_b_num = feat_parts[1].replace("f", "")

                agent_a_file = feat_dir / f"agent{agent_a_num}_traj.json"
                agent_b_file = feat_dir / f"agent{agent_b_num}_traj.json"

                task_id_norm = f"task{task_id_raw}"
                features_norm = normalize_feature_name(feat_name)
                feat_parts_norm = features_norm.split("_")
                f1_norm = feat_parts_norm[0]
                f2_norm = feat_parts_norm[1]

                passed = False
                has_conflict = False
                if eval_file.exists():
                    try:
                        with open(eval_file) as f:
                            eval_data = json.load(f)
                        passed = eval_data.get("both_passed", False)
                        merge_info = eval_data.get("merge", {})
                        has_conflict = merge_info.get("status") == "conflicts"
                    except (json.JSONDecodeError, KeyError):
                        pass

                stats["total"] += 1
                if passed:
                    stats["passed"] += 1

                all_steps = []
                agent_a_meta = agents_meta.get(f"agent{agent_a_num}", {})
                agent_b_meta = agents_meta.get(f"agent{agent_b_num}", {})

                has_trajectory = False

                if agent_a_file.exists():
                    with open(agent_a_file) as f:
                        traj_a = json.load(f)
                    a_step_count = len([m for m in traj_a.get("messages", [])
                                        if m.get("event_type") in ("ActionEvent", "AgentErrorEvent")])
                    ts_a = interpolate_timestamps(started_at, ended_at, max(a_step_count, 1))
                    steps_a = process_agent_traj(traj_a, "agent_1", ts_a)
                    all_steps.extend(steps_a)
                    has_trajectory = True

                if agent_b_file.exists():
                    with open(agent_b_file) as f:
                        traj_b = json.load(f)
                    b_step_count = len([m for m in traj_b.get("messages", [])
                                        if m.get("event_type") in ("ActionEvent", "AgentErrorEvent")])
                    ts_b = interpolate_timestamps(started_at, ended_at, max(b_step_count, 1))
                    steps_b = process_agent_traj(traj_b, "agent_2", ts_b)
                    all_steps.extend(steps_b)
                    has_trajectory = True

                tasks_index.append({
                    "repo": repo_name,
                    "taskId": task_id_norm,
                    "features": features_norm,
                    "f1": f1_norm,
                    "f2": f2_norm,
                    "results": {
                        model_key: {
                            "passed": passed,
                            "hasConflict": has_conflict,
                        }
                    },
                    "hasTrajectory": {
                        model_key: has_trajectory,
                    },
                })

                if not has_trajectory:
                    continue

                all_steps.sort(key=lambda s: s.get("timestamp", ""))
                for idx, step in enumerate(all_steps):
                    step["id"] = idx

                for agent_label, agent_info in [("agent_1", agent_a_meta), ("agent_2", agent_b_meta)]:
                    agent_steps = [s for s in all_steps if s.get("agentId") == agent_label]
                    if agent_steps and agent_info:
                        agent_steps[-1]["llm_metrics"] = {
                            "accumulated_cost": agent_info.get("cost", 0),
                            "accumulated_token_usage": {
                                "prompt_tokens": 0,
                                "completion_tokens": 0,
                            },
                            "model": result.get("model", ""),
                        }

                output = {
                    "metadata": {
                        "repo": repo_name,
                        "task_id": task_id_norm,
                        "features": features_norm,
                        "agent_1": {
                            "model": result.get("model", ""),
                            "steps": agent_a_meta.get("steps", 0),
                            "cost": agent_a_meta.get("cost", 0),
                        },
                        "agent_2": {
                            "model": result.get("model", ""),
                            "steps": agent_b_meta.get("steps", 0),
                            "cost": agent_b_meta.get("cost", 0),
                        },
                        "total_cost": result.get("total_cost", 0),
                        "started_at": started_at,
                        "duration_seconds": result.get("duration_seconds", 0),
                    },
                    "steps": all_steps,
                }

                out_name = f"{repo_name}_{task_id_norm}_{features_norm}.json.gz"
                out_path = traj_dir / out_name
                with gzip.open(out_path, "wt", compresslevel=9, encoding="utf-8") as f:
                    json.dump(output, f, separators=(",", ":"))

                file_count += 1

    rate = round(stats["passed"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0
    print(f"\n  {model_key}: {file_count} trajectory files, "
          f"{stats['passed']}/{stats['total']} passed ({rate}%)")
    size_kb = sum(f.stat().st_size for f in traj_dir.glob("*.json.gz")) / 1024
    print(f"  Total trajectory size: {size_kb:.0f} KB")

    return tasks_index, stats, file_count


def write_index(output_setting: str, model_configs: list,
                all_tasks: dict, all_stats: dict):
    """Write or merge an index.json for the given output setting."""
    output_dir = DATA_DIR / output_setting
    index_path = output_dir / "index.json"

    # Load existing index if present (to merge with legacy models)
    existing = {}
    if index_path.exists():
        with open(index_path) as f:
            existing = json.load(f)

    # Build model lists
    existing_models = existing.get("models", [])
    existing_display = existing.get("modelDisplayNames", {})
    existing_stats = existing.get("stats", {})
    existing_tasks = existing.get("tasks", [])

    for cfg in model_configs:
        mk = cfg["model_key"]
        md = cfg["model_display"]

        if mk not in existing_models:
            existing_models.append(mk)
        existing_display[mk] = md

        if mk in all_stats:
            s = all_stats[mk]
            rate = round(s["passed"] / s["total"] * 100, 1) if s["total"] > 0 else 0
            existing_stats[mk] = {
                "total": s["total"],
                "passed": s["passed"],
                "rate": rate,
            }

    # Merge tasks: build lookup of existing tasks by (repo, taskId, features)
    task_lookup = {}
    for t in existing_tasks:
        key = (t["repo"], t["taskId"], t["features"])
        task_lookup[key] = t

    # Add/merge new tasks
    for cfg in model_configs:
        mk = cfg["model_key"]
        for new_task in all_tasks.get(mk, []):
            key = (new_task["repo"], new_task["taskId"], new_task["features"])
            if key in task_lookup:
                # Merge into existing task
                task_lookup[key]["results"][mk] = new_task["results"][mk]
                task_lookup[key]["hasTrajectory"][mk] = new_task["hasTrajectory"][mk]
            else:
                task_lookup[key] = new_task

    merged_tasks = sorted(task_lookup.values(),
                          key=lambda t: (t["repo"], t["taskId"], t["features"]))

    index = {
        "models": existing_models,
        "modelDisplayNames": existing_display,
        "stats": existing_stats,
        "tasks": merged_tasks,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    with open(index_path, "w") as f:
        json.dump(index, f, indent=2)

    print(f"\nIndex written: {index_path}")
    print(f"  Models: {existing_models}")
    for mk in existing_models:
        if mk in existing_stats:
            s = existing_stats[mk]
            print(f"  {mk}: {s['passed']}/{s['total']} ({s['rate']}%)")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # Filter to a specific run if model_key passed as arg
    filter_key = sys.argv[1] if len(sys.argv) > 1 else None
    runs_to_process = RUNS
    if filter_key:
        runs_to_process = [r for r in RUNS if r["model_key"] == filter_key]
        if not runs_to_process:
            print(f"Unknown model key: {filter_key}")
            print(f"Available: {[r['model_key'] for r in RUNS]}")
            sys.exit(1)

    # Group runs by output_setting so we can merge indexes per setting
    by_setting = {}
    all_tasks = {}
    all_stats = {}

    for run_config in runs_to_process:
        tasks, stats, count = process_run(run_config)
        mk = run_config["model_key"]
        setting = run_config["output_setting"]

        all_tasks[mk] = tasks
        all_stats[mk] = stats

        if setting not in by_setting:
            by_setting[setting] = []
        by_setting[setting].append(run_config)

    # Write/merge indexes per setting
    for setting, configs in by_setting.items():
        write_index(setting, configs, all_tasks, all_stats)


if __name__ == "__main__":
    main()
