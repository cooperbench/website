#!/usr/bin/env python3
"""
Process Mini-SWE Agent trajectories into the website viewer format.

Mini-SWE Agent uses a chat-based format:
  - system/user/assistant roles
  - Assistant messages contain reasoning + ```bash command```
  - User messages contain <returncode>N</returncode> + <output>...</output>
  - send_message is a bash command: send_message <agent> "message"
  - echo COMPLETE_TASK_AND_SUBMIT_FINAL_OUTPUT to finish

Supports multiple runs. Each run config specifies:
  - logs_dir: source log directory
  - model_key / model_display: for index.json
  - output_setting: "coop" or "coop_git"

Usage:
  python3 scripts/prepare_miniswe_trajectories.py            # process all runs
  python3 scripts/prepare_miniswe_trajectories.py <key>       # process one run by model_key
"""

import json
import gzip
import re
import sys
from pathlib import Path
from datetime import datetime, timezone

ANSI_RE = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]|\x1b\[\?[0-9;]*[a-zA-Z]")
BASH_BLOCK_RE = re.compile(r"```bash\s*\n(.*?)```", re.DOTALL)
RETURNCODE_RE = re.compile(r"<returncode>(\d+)</returncode>")
OUTPUT_RE = re.compile(r"<output>(.*?)</output>", re.DOTALL)
OUTPUT_HEAD_RE = re.compile(r"<output_head>(.*?)</output_head>", re.DOTALL)
WARNING_RE = re.compile(r"<warning>(.*?)</warning>", re.DOTALL)
SEND_MSG_RE = re.compile(r'send_message\s+(\w+)\s+"((?:[^"\\]|\\.)*)"')
RECEIVED_MSG_RE = re.compile(r"\[Message from (\w+)\]:\s*(.*?)(?:\n\n|\Z)", re.DOTALL)

LOGS_BASE = Path("/Users/arpan/Desktop/CooperBench/logs")
WEBSITE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = WEBSITE_DIR / "public" / "static" / "data"

# ── Run configurations ─────────────────────────────────────────────────────────
RUNS = [
    {
        "logs_dir": LOGS_BASE / "coop-gemini-3-flash" / "coop",
        "model_key": "gemini_flash_miniswe",
        "model_display": "Gemini 3 Flash (Mini-SWE)",
        "output_setting": "coop",
    },
    {
        "logs_dir": LOGS_BASE / "coop-git-gemini-3-flash" / "coop",
        "model_key": "gemini_flash_miniswe_git",
        "model_display": "Gemini 3 Flash (Mini-SWE + Git)",
        "output_setting": "coop_git",
    },
    {
        "logs_dir": LOGS_BASE / "coop-msa-gemini-3-pro" / "coop",
        "model_key": "gemini_pro_miniswe",
        "model_display": "Gemini 3 Pro (Mini-SWE)",
        "output_setting": "coop",
    },
    {
        "logs_dir": LOGS_BASE / "coop-msa-git-gemini-3-pro" / "coop",
        "model_key": "gemini_pro_miniswe_git",
        "model_display": "Gemini 3 Pro (Mini-SWE + Git)",
        "output_setting": "coop_git",
    },
]


# ── Parsing helpers ───────────────────────────────────────────────────────────

def parse_assistant_message(content: str):
    """Extract thought and bash command from an assistant message."""
    m = BASH_BLOCK_RE.search(content)
    if m:
        command = m.group(1).strip()
        thought = content[:m.start()].strip()
    else:
        command = ""
        thought = content.strip()
    return thought, command


def parse_user_message(content: str):
    """Extract return code, output, and any warnings from a user message."""
    rc_m = RETURNCODE_RE.search(content)
    return_code = int(rc_m.group(1)) if rc_m else None

    # Try <output> first, then <output_head>
    out_m = OUTPUT_RE.search(content)
    if not out_m:
        out_m = OUTPUT_HEAD_RE.search(content)
    output = out_m.group(1).strip() if out_m else ""

    warn_m = WARNING_RE.search(content)
    warning = warn_m.group(1).strip() if warn_m else ""

    # Check for received messages
    received_msgs = RECEIVED_MSG_RE.findall(content)

    return return_code, output, warning, received_msgs


def split_command(command: str):
    """Split a command into send_message parts and remaining bash.

    Returns (send_matches, remaining_bash, is_finish) where:
      - send_matches: list of (recipient, message) tuples
      - remaining_bash: the non-send_message portion (empty if pure comm)
      - is_finish: True if this is a submit/finish command
    """
    stripped = command.strip()

    if "COMPLETE_TASK_AND_SUBMIT_FINAL_OUTPUT" in stripped:
        return [], "", True

    send_matches = SEND_MSG_RE.findall(stripped)
    if not send_matches:
        return [], stripped, False

    # Remove all send_message calls to get the remaining bash
    remaining = SEND_MSG_RE.sub("", stripped)
    # Clean up leftover && / || connectors and whitespace
    remaining = re.sub(r"\s*(?:&&|\|\|)\s*(?:&&|\|\|)\s*", " && ", remaining)
    remaining = re.sub(r"^\s*(?:&&|\|\|)\s*", "", remaining)
    remaining = re.sub(r"\s*(?:&&|\|\|)\s*$", "", remaining)
    remaining = remaining.strip()

    return send_matches, remaining, False


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


# ── Per-agent trajectory processing ───────────────────────────────────────────

def process_agent_traj(traj_data: dict, agent_label: str):
    """Convert one agent's mini-SWE trajectory to viewer steps."""
    messages = traj_data.get("messages", [])
    steps = []
    step_idx = 0

    i = 0
    while i < len(messages):
        msg = messages[i]
        role = msg.get("role", "")

        # Skip system messages
        if role == "system":
            i += 1
            continue

        # Skip the initial user message (task description)
        if role == "user" and step_idx == 0 and i <= 2:
            # The first user message is always the task prompt
            # Check if next message is assistant (normal flow)
            if i + 1 < len(messages) and messages[i + 1].get("role") == "assistant":
                i += 1
                continue
            i += 1
            continue

        if role == "assistant":
            thought, command = parse_assistant_message(msg.get("content", ""))
            ts = msg.get("timestamp", 0)
            timestamp = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat() if ts else ""

            # Get the observation from the next user message
            obs_output = ""
            obs_warning = ""
            obs_rc = None
            received_msgs = []
            if i + 1 < len(messages) and messages[i + 1].get("role") == "user":
                obs_rc, obs_output, obs_warning, received_msgs = parse_user_message(
                    messages[i + 1].get("content", "")
                )
                i += 1  # consume the observation

            # Strip ANSI codes
            obs_output = ANSI_RE.sub("", obs_output) if obs_output else ""
            obs_warning = ANSI_RE.sub("", obs_warning) if obs_warning else ""

            # Split the command into send_message parts + remaining bash
            send_matches, remaining_bash, is_finish = split_command(command)

            # Build observation text
            obs_text = obs_output
            if obs_warning:
                obs_text = f"[WARNING] {obs_warning}\n{obs_output}" if obs_output else f"[WARNING] {obs_warning}"
            if obs_rc is not None and obs_rc != 0:
                obs_text = f"[exit code: {obs_rc}]\n{obs_text}" if obs_text else f"[exit code: {obs_rc}]"

            if is_finish:
                step = {
                    "id": step_idx,
                    "timestamp": timestamp,
                    "source": "agent",
                    "action": command[:200],
                    "args": {"message": thought or "Task complete"},
                    "thought": thought[:5000] if thought else "",
                    "message": obs_text[:10000] if obs_text else thought[:2000],
                    "observation": obs_text[:10000],
                    "tool_call_metadata": {"function_name": "finish"},
                    "agentId": agent_label,
                }
                steps.append(step)
                step_idx += 1
            else:
                # Emit a comm step for each send_message
                for recipient, msg_content in send_matches:
                    comm_step = {
                        "id": step_idx,
                        "timestamp": timestamp,
                        "source": "agent",
                        "action": f"send_message {recipient}",
                        "args": {"recipient": recipient, "content": msg_content},
                        "thought": thought[:5000] if thought else "",
                        "message": msg_content[:10000],
                        "observation": "",
                        "tool_call_metadata": {"function_name": "openhands_comm_send"},
                        "agentId": agent_label,
                    }
                    steps.append(comm_step)
                    step_idx += 1
                    # Only attach thought to the first step
                    thought = ""

                # Emit the remaining bash command (or the full command if no sends)
                if remaining_bash:
                    bash_step = {
                        "id": step_idx,
                        "timestamp": timestamp,
                        "source": "agent",
                        "action": remaining_bash[:200],
                        "args": {"command": remaining_bash},
                        "thought": thought[:5000] if thought else "",
                        "message": obs_text[:10000] if obs_text else "",
                        "observation": obs_text[:10000],
                        "tool_call_metadata": {"function_name": "execute_bash"},
                        "agentId": agent_label,
                    }
                    steps.append(bash_step)
                    step_idx += 1
                elif not send_matches:
                    # Pure bash with no command (shouldn't happen, but handle gracefully)
                    step = {
                        "id": step_idx,
                        "timestamp": timestamp,
                        "source": "agent",
                        "action": command[:200] if command else thought[:200],
                        "args": {"command": command} if command else {},
                        "thought": thought[:5000] if thought else "",
                        "message": obs_text[:10000] if obs_text else thought[:2000],
                        "observation": obs_text[:10000],
                        "tool_call_metadata": {"function_name": "execute_bash"},
                        "agentId": agent_label,
                    }
                    steps.append(step)
                    step_idx += 1

            # If there were received messages in the observation, add them as
            # separate receive steps (they appear in the user message content)
            for sender, msg_content in received_msgs:
                recv_step = {
                    "id": step_idx,
                    "timestamp": timestamp,
                    "source": "agent",
                    "action": f"receive_message from {sender}",
                    "args": {"content": msg_content.strip()},
                    "thought": "",
                    "message": msg_content.strip(),
                    "observation": msg_content.strip(),
                    "tool_call_metadata": {"function_name": "openhands_comm_get"},
                    "agentId": agent_label,
                }
                steps.append(recv_step)
                step_idx += 1

            i += 1
            continue

        # Standalone user message (received messages without a preceding assistant)
        if role == "user":
            content = msg.get("content", "")
            received_msgs = RECEIVED_MSG_RE.findall(content)
            ts = msg.get("timestamp", 0)
            timestamp = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat() if ts else ""

            for sender, msg_content in received_msgs:
                recv_step = {
                    "id": step_idx,
                    "timestamp": timestamp,
                    "source": "agent",
                    "action": f"receive_message from {sender}",
                    "args": {"content": msg_content.strip()},
                    "thought": "",
                    "message": msg_content.strip(),
                    "observation": msg_content.strip(),
                    "tool_call_metadata": {"function_name": "openhands_comm_get"},
                    "agentId": agent_label,
                }
                steps.append(recv_step)
                step_idx += 1

        i += 1

    return steps


# ── Process a single run ──────────────────────────────────────────────────────

def process_run(run_config: dict):
    """Process one Mini-SWE run and return (tasks_index, stats, file_count)."""
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

    if not logs_dir.exists():
        print(f"  WARNING: Source directory does not exist!")
        return tasks_index, stats, file_count

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
                        merge_status = merge_info.get("status", "")
                        has_conflict = "conflict" in merge_status.lower()
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
                    steps_a = process_agent_traj(traj_a, "agent_1")
                    all_steps.extend(steps_a)
                    has_trajectory = True

                if agent_b_file.exists():
                    with open(agent_b_file) as f:
                        traj_b = json.load(f)
                    steps_b = process_agent_traj(traj_b, "agent_2")
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

                # Inject LLM metrics on last step per agent
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
    if file_count > 0:
        size_kb = sum(f.stat().st_size for f in traj_dir.glob("*.json.gz")) / 1024
        print(f"  Total trajectory size: {size_kb:.0f} KB")

    return tasks_index, stats, file_count


def write_index(output_setting: str, model_configs: list,
                all_tasks: dict, all_stats: dict):
    """Write or merge an index.json for the given output setting."""
    output_dir = DATA_DIR / output_setting
    index_path = output_dir / "index.json"

    # Load existing index if present (to merge with other models)
    existing = {}
    if index_path.exists():
        with open(index_path) as f:
            existing = json.load(f)

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

    # Merge tasks: build lookup by (repo, taskId, features)
    task_lookup = {}
    for t in existing_tasks:
        key = (t["repo"], t["taskId"], t["features"])
        task_lookup[key] = t

    for cfg in model_configs:
        mk = cfg["model_key"]
        for new_task in all_tasks.get(mk, []):
            key = (new_task["repo"], new_task["taskId"], new_task["features"])
            if key in task_lookup:
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
    filter_key = sys.argv[1] if len(sys.argv) > 1 else None
    runs_to_process = RUNS
    if filter_key:
        runs_to_process = [r for r in RUNS if r["model_key"] == filter_key]
        if not runs_to_process:
            print(f"Unknown model key: {filter_key}")
            print(f"Available: {[r['model_key'] for r in RUNS]}")
            sys.exit(1)

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

    for setting, configs in by_setting.items():
        write_index(setting, configs, all_tasks, all_stats)


if __name__ == "__main__":
    main()
