#!/usr/bin/env python3
"""
Prepare trajectory files for the website.

This script reads execution trajectory files from the logs_legacy/coop directory
and creates merged trajectory files in the static/data/coop/trajectories directory.
"""

import json
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Paths
COOP_LOGS_DIR = Path("/Users/arpan/Desktop/CodeConflictBenchmark/logs_legacy/coop")
OUTPUT_DIR = Path("/Users/arpan/Desktop/CooperBench_website/static/data/coop/trajectories")

# Models to process
MODELS = ["gpt5", "claude", "minimax", "qwen_coder", "qwen"]


def merge_trajectories(traj_f1_path: Path, traj_f2_path: Path) -> list:
    """Merge two agent trajectories into a single sorted list."""
    steps = []
    
    # Load feature 1 trajectory
    if traj_f1_path.exists():
        with open(traj_f1_path) as f:
            data = json.load(f)
            for step in data:
                step["agentId"] = "agent_1"
                steps.append(step)
    
    # Load feature 2 trajectory
    if traj_f2_path.exists():
        with open(traj_f2_path) as f:
            data = json.load(f)
            for step in data:
                step["agentId"] = "agent_2"
                steps.append(step)
    
    # Sort by timestamp
    def get_timestamp(step):
        ts = step.get("timestamp") or step.get("timestampMs") or 0
        if isinstance(ts, str):
            try:
                from datetime import datetime
                return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp() * 1000
            except:
                return 0
        return ts
    
    steps.sort(key=get_timestamp)
    
    return steps


def process_feature_pair(args):
    """Process a single feature pair and return (output_path, success)."""
    model, repo_name, task_id, feature_dir = args
    
    # Extract feature numbers from directory name (e.g., "feature1_feature3" -> "feature1", "feature3")
    parts = feature_dir.name.split("_")
    if len(parts) >= 2:
        f1_name = parts[0]  # "feature1"
        f2_name = parts[1]  # "feature3"
    else:
        return None, False
    
    traj_f1 = feature_dir / f"execution_traj_{model}_k1_{f1_name}.json"
    traj_f2 = feature_dir / f"execution_traj_{model}_k1_{f2_name}.json"
    
    if not traj_f1.exists() or not traj_f2.exists():
        return None, False
    
    try:
        merged = merge_trajectories(traj_f1, traj_f2)
        if not merged:
            return None, False
        
        # Output path: trajectories/{model}/{repo}_{task}_{features}.json
        features = feature_dir.name
        output_path = OUTPUT_DIR / model / f"{repo_name}_{task_id}_{features}.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, "w") as f:
            json.dump(merged, f)
        
        return output_path, True
    except Exception as e:
        print(f"Error processing {feature_dir}: {e}")
        return None, False


def main():
    print("Preparing trajectory files...")
    
    # Collect all tasks to process
    tasks = []
    
    for repo_dir in sorted(COOP_LOGS_DIR.iterdir()):
        if not repo_dir.is_dir() or repo_dir.name.startswith("."):
            continue
        
        repo_name = repo_dir.name
        
        for task_dir in sorted(repo_dir.iterdir()):
            if not task_dir.is_dir() or not task_dir.name.startswith("task"):
                continue
            
            task_id = task_dir.name
            
            for feature_dir in sorted(task_dir.iterdir()):
                if not feature_dir.is_dir() or not feature_dir.name.startswith("feature"):
                    continue
                
                for model in MODELS:
                    tasks.append((model, repo_name, task_id, feature_dir))
    
    print(f"Found {len(tasks)} potential trajectory pairs to process...")
    
    # Process in parallel
    success_count = 0
    total_size = 0
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_feature_pair, task): task for task in tasks}
        
        for i, future in enumerate(as_completed(futures)):
            output_path, success = future.result()
            if success:
                success_count += 1
                total_size += output_path.stat().st_size
            
            if (i + 1) % 100 == 0:
                print(f"  Processed {i + 1}/{len(tasks)}...")
    
    print(f"\nGenerated {success_count} trajectory files")
    print(f"Total size: {total_size / 1024 / 1024:.1f} MB")
    
    # Print per-model counts
    print("\nPer-model counts:")
    for model in MODELS:
        model_dir = OUTPUT_DIR / model
        if model_dir.exists():
            count = len(list(model_dir.glob("*.json")))
            size = sum(f.stat().st_size for f in model_dir.glob("*.json"))
            print(f"  {model}: {count} files ({size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()
