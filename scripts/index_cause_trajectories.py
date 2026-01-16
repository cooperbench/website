#!/usr/bin/env python3
"""
Index cause_annotation trajectories by their cause classification.
Parses analysis.md files and finds corresponding execution trajectories.
Transforms raw OpenHands trajectories into viewer-compatible format.
"""

import json
import os
import re
import shutil
from pathlib import Path
from datetime import datetime

CAUSE_ANNOTATION_DIR = Path("/Users/arpan/Desktop/CodeConflictBenchmark/cause_annotation")
OUTPUT_DIR = Path("/Users/arpan/Desktop/CodeConflictBenchmark/cooperatorbench-website/static/data/causes")


def get_tool_type(step: dict) -> str:
    """Determine tool type from raw OpenHands step."""
    action = step.get("action", "")
    tool_name = step.get("tool_call_metadata", {}).get("function_name", "")
    args = step.get("args", {}) or {}
    
    # Handle nested arguments structure
    if "arguments" in args and isinstance(args["arguments"], dict):
        inner_args = args["arguments"]
    else:
        inner_args = args
    
    # Communication - check action first (call_tool_mcp is used for communication)
    if action == "call_tool_mcp":
        return "communication"
    if "openhands_comm" in tool_name or "comm_send" in tool_name or "comm_get" in tool_name:
        return "communication"
    
    # Submit/finish
    if action == "finish" or tool_name == "finish":
        return "submit"
    
    # Task tracking - check both action and tool_name
    if action == "task_tracking" or "task_tracker" in tool_name:
        return "task_tracking"
    
    # Think
    if action == "think" or tool_name == "think":
        return "think"
    
    # Recall (memory retrieval)
    if action == "recall":
        return "recall"
    
    # Condensation (context compression)
    if action == "condensation":
        return "condensation"
    
    # Message (typically agent-to-agent or status messages)
    if action == "message":
        return "message"
    
    # Bash - check action first
    if action == "run" or tool_name == "execute_bash":
        return "bash"
    
    # Read/view operations - check action first
    if action == "read":
        return "view"
    
    # Edit operations - check action first
    if action == "edit":
        return "edit"
    
    # File operations with str_replace_editor (fallback)
    if tool_name in ("str_replace_editor", "edit_file"):
        command = inner_args.get("command", "")
        if command == "create":
            return "create"
        elif command == "str_replace":
            return "edit"
        elif command == "view":
            return "view"
        # If no command but has view_range or start/end, it's a view
        elif "view_range" in inner_args or "start" in inner_args:
            return "view"
        return "edit"
    
    # View operations
    if tool_name in ("view_file", "read_file"):
        return "view"
    
    # Find/grep
    if any(x in tool_name.lower() for x in ("find", "grep", "search", "glob")):
        return "find_grep"
    
    # IPython
    if "ipython" in tool_name.lower():
        return "ipython"
    
    # Browser
    if "browser" in tool_name.lower():
        return "browser"
    
    return "other"


def transform_step(step: dict, agent_id: str) -> dict | None:
    """Transform a raw OpenHands step into viewer format."""
    # Skip system messages and empty steps
    action = step.get("action", "")
    source = step.get("source", "")
    
    # Only process agent actions
    if source != "agent":
        return None
    
    # Skip entries without a meaningful action - these are "shadow" entries
    # that duplicate real entries but have empty args
    # Valid actions: run, read, edit, finish, think, recall, call_tool_mcp, condensation, task_tracking
    valid_actions = {"run", "read", "edit", "finish", "think", "recall", 
                     "call_tool_mcp", "condensation", "task_tracking", "message"}
    if action not in valid_actions:
        return None
    
    tool_name = step.get("tool_call_metadata", {}).get("function_name", "")
    
    # Parse timestamp
    ts_str = step.get("timestamp", "")
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        timestamp_ms = int(dt.timestamp() * 1000)
    except:
        timestamp_ms = 0
    
    # Get tool type
    tool_type = get_tool_type(step)
    
    # Extract args
    args = step.get("args", {})
    
    # Extract details for communication steps
    details = None
    if tool_type == "communication":
        # The message content may be in args.message, args.content, or args.arguments.content
        details = args.get("message") or args.get("content")
        if not details and isinstance(args.get("arguments"), dict):
            details = args["arguments"].get("content", args["arguments"].get("message", ""))
        # Don't include args for communication - just the message
        args = None
    
    return {
        "id": step.get("id", 0),
        "timestampMs": timestamp_ms,
        "toolType": tool_type,
        "toolName": tool_name or action,
        "details": details,
        "args": args,
        "agentId": agent_id
    }


def transform_trajectory(raw_traj: list, agent_id: str) -> list:
    """Transform a raw trajectory into viewer format."""
    steps = []
    for step in raw_traj:
        transformed = transform_step(step, agent_id)
        if transformed:
            steps.append(transformed)
    return steps

def extract_classification(analysis_path: Path) -> dict | None:
    """Extract classification and metadata from an analysis.md file."""
    try:
        content = analysis_path.read_text()
        
        # Extract classification
        class_match = re.search(r'## Classification:\s*\*\*(\w+)\*\*', content)
        if not class_match:
            return None
        classification = class_match.group(1).lower()
        
        # Extract task info from header
        task_match = re.search(r'\*\*Task\*\*:\s*(\w+)\s*\|\s*\*\*Model\*\*:\s*(\w+)\s*\|\s*\*\*Features\*\*:\s*(\w+)', content)
        if not task_match:
            return None
        
        task_id = task_match.group(1)
        model = task_match.group(2)
        features = task_match.group(3)
        
        # Extract summary (first few bullet points)
        summary_match = re.search(r'## Summary\s*\n((?:- \*\*.*?\n)+)', content)
        summary = summary_match.group(1).strip() if summary_match else ""
        
        # Extract the failure description
        failure_match = re.search(r'## The Failure\s*\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
        failure = failure_match.group(1).strip()[:500] if failure_match else ""
        
        return {
            "classification": classification,
            "task_id": task_id,
            "model": model,
            "features": features,
            "summary": summary,
            "failure": failure,
            "analysis_path": str(analysis_path)
        }
    except Exception as e:
        print(f"Error parsing {analysis_path}: {e}")
        return None


def find_trajectory_files(analysis_path: Path, info: dict) -> dict:
    """Find execution trajectory files near the analysis.md file."""
    parent = analysis_path.parent
    
    # Parse features (e.g., "feature1_feature2")
    features = info["features"]
    feature_match = re.match(r'feature(\d+)_feature(\d+)', features)
    if not feature_match:
        return {}
    
    f1, f2 = feature_match.groups()
    model = info["model"]
    
    # Look for execution trajectory files
    # Pattern: execution_traj_{model}_k1_feature{N}.json
    traj_a = None
    traj_b = None
    conversation = None
    
    # Check in the same directory or subdirectories
    search_dirs = [parent]
    
    # Also check for model_k1/features subdirectory structure
    for subdir in parent.iterdir():
        if subdir.is_dir():
            search_dirs.append(subdir)
            for subsubdir in subdir.iterdir():
                if subsubdir.is_dir():
                    search_dirs.append(subsubdir)
    
    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
            
        for f in search_dir.glob("*.json"):
            fname = f.name.lower()
            
            # Execution trajectories
            if f"execution_traj" in fname and f"feature{f1}" in fname:
                traj_a = f
            elif f"execution_traj" in fname and f"feature{f2}" in fname:
                traj_b = f
            
            # Conversation file
            if "conversation" in fname:
                conversation = f
    
    return {
        "traj_a": str(traj_a) if traj_a else None,
        "traj_b": str(traj_b) if traj_b else None,
        "conversation": str(conversation) if conversation else None
    }


def check_timeline_overlap(steps_a: list, steps_b: list) -> bool:
    """Check if two agent timelines overlap temporally."""
    if not steps_a or not steps_b:
        return False
    
    # Get time ranges
    times_a = [s.get("timestampMs", 0) for s in steps_a if s.get("timestampMs")]
    times_b = [s.get("timestampMs", 0) for s in steps_b if s.get("timestampMs")]
    
    if not times_a or not times_b:
        return False
    
    min_a, max_a = min(times_a), max(times_a)
    min_b, max_b = min(times_b), max(times_b)
    
    # Check for overlap: ranges overlap if one starts before the other ends
    return min_a <= max_b and min_b <= max_a


def main():
    # Find all analysis.md files
    analysis_files = list(CAUSE_ANNOTATION_DIR.glob("**/*analysis.md"))
    print(f"Found {len(analysis_files)} analysis files")
    
    # Index by cause
    index = {
        "expectation": [],
        "communication": [],
        "commitment": []
    }
    
    for analysis_path in analysis_files:
        info = extract_classification(analysis_path)
        if not info:
            continue
        
        # Find trajectory files
        traj_files = find_trajectory_files(analysis_path, info)
        info.update(traj_files)
        
        # Only include if we have execution trajectories
        if info.get("traj_a") or info.get("traj_b"):
            cause = info["classification"]
            if cause in index:
                # Create a unique ID
                project = analysis_path.parts[-4] if len(analysis_path.parts) >= 4 else "unknown"
                info["project"] = project
                info["id"] = f"{project}_{info['task_id']}_{info['features']}_{info['model']}"
                index[cause].append(info)
                print(f"  [{cause}] {info['id']}")
    
    # Print summary
    print(f"\nSummary:")
    for cause, items in index.items():
        print(f"  {cause}: {len(items)} trajectories")
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Process and transform execution trajectories
    processed_count = 0
    skipped_no_overlap = 0
    items_to_remove = {cause: [] for cause in index}
    
    for cause, items in index.items():
        cause_dir = OUTPUT_DIR / cause
        cause_dir.mkdir(exist_ok=True)
        
        for item in items:
            try:
                steps_a = []
                steps_b = []
                
                # Load and transform Agent A trajectory
                if item.get("traj_a"):
                    traj_a_path = Path(item["traj_a"])
                    if traj_a_path.exists():
                        with open(traj_a_path) as f:
                            raw_a = json.load(f)
                        steps_a = transform_trajectory(raw_a, "agent_1")
                
                # Load and transform Agent B trajectory
                if item.get("traj_b"):
                    traj_b_path = Path(item["traj_b"])
                    if traj_b_path.exists():
                        with open(traj_b_path) as f:
                            raw_b = json.load(f)
                        steps_b = transform_trajectory(raw_b, "agent_2")
                
                # Check for timeline overlap
                if not check_timeline_overlap(steps_a, steps_b):
                    print(f"    Skipping {item['id']} - no timeline overlap")
                    items_to_remove[cause].append(item)
                    skipped_no_overlap += 1
                    continue
                
                combined_steps = steps_a + steps_b
                print(f"    Agent A: {len(steps_a)} steps, Agent B: {len(steps_b)} steps")
                
                if combined_steps:
                    # Sort by timestamp
                    combined_steps.sort(key=lambda x: x["timestampMs"])
                    
                    # Save combined trajectory
                    output_path = cause_dir / f"{item['id']}_trajectory.json"
                    with open(output_path, "w") as f:
                        json.dump(combined_steps, f)
                    
                    item["trajectory_url"] = f"static/data/causes/{cause}/{output_path.name}"
                    item["step_count"] = len(combined_steps)
                    processed_count += 1
                    
            except Exception as e:
                print(f"    Error processing {item['id']}: {e}")
                items_to_remove[cause].append(item)
    
    # Remove items without overlap
    for cause, to_remove in items_to_remove.items():
        for item in to_remove:
            if item in index[cause]:
                index[cause].remove(item)
    
    print(f"\nSkipped {skipped_no_overlap} trajectories with no timeline overlap")
    
    # Clean up index - remove file paths, keep only URLs and metadata
    for cause, items in index.items():
        for item in items:
            # Remove local paths
            item.pop("traj_a", None)
            item.pop("traj_b", None)
            item.pop("conversation", None)
            item.pop("analysis_path", None)
    
    # Write index file
    index_path = OUTPUT_DIR / "index.json"
    with open(index_path, "w") as f:
        json.dump(index, f, indent=2)
    
    print(f"\nDone! Processed {processed_count} trajectories to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
