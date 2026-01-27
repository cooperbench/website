#!/usr/bin/env python3
"""
Generate coop/index.json from aggregated results files.

This script scans the logs_legacy/coop directory and creates an index file
with pass/fail status for each task+feature pair across all models.
"""

import json
import os
from pathlib import Path
from collections import defaultdict

# Paths
COOP_LOGS_DIR = Path("/Users/arpan/Desktop/CodeConflictBenchmark/logs_legacy/coop")
OUTPUT_DIR = Path("/Users/arpan/Desktop/CooperBench_website/static/data/coop")

# Model name mapping (file suffix -> display name)
MODEL_MAP = {
    "gpt5": "gpt5",
    "claude": "claude",
    "minimax": "minimax",
    "qwen_coder": "qwen_coder",
    "qwen": "qwen",
}

def parse_aggregated_results(filepath: Path) -> dict:
    """Parse an aggregated_results JSON file and extract task results."""
    with open(filepath) as f:
        data = json.load(f)
    
    results = {}
    for item in data.get("detailed_results", []):
        f1_id = item["feature1_id"]
        f2_id = item["feature2_id"]
        feature_key = f"feature{f1_id}_feature{f2_id}"
        
        # Determine if task passed (both features pass after merge)
        # Cotomata-Colab cascading logic:
        # 1. Try naive merge first
        # 2. If naive fails (or has conflict), try union merge
        # 3. If union fails, try LLM merge
        passed = False
        has_conflict = item.get("has_naive_merge_conflict", False)
        
        # Try naive merge first (only if no conflict)
        if not has_conflict:
            f1_naive = item.get("feature1_naive_merge_test_passed")
            f2_naive = item.get("feature2_naive_merge_test_passed")
            if f1_naive is True and f2_naive is True:
                passed = True
        
        # If naive didn't pass, try union merge
        if not passed:
            f1_union = item.get("feature1_union_merge_test_passed")
            f2_union = item.get("feature2_union_merge_test_passed")
            if f1_union is True and f2_union is True:
                passed = True
        
        # If union didn't pass, try LLM merge
        if not passed:
            f1_llm = item.get("feature1_llm_merge_test_passed")
            f2_llm = item.get("feature2_llm_merge_test_passed")
            if f1_llm is True and f2_llm is True:
                passed = True
        
        results[feature_key] = {
            "passed": passed,
            "hasConflict": has_conflict,
        }
    
    return results


def find_trajectory_files(task_dir: Path, feature_key: str) -> dict:
    """Find trajectory files for each model in a feature pair directory."""
    feature_dir = task_dir / feature_key
    if not feature_dir.exists():
        return {}
    
    # Extract feature names from feature_key (e.g., "feature1_feature3" -> "feature1", "feature3")
    parts = feature_key.split("_")
    if len(parts) >= 2:
        f1_name = parts[0]
        f2_name = parts[1]
    else:
        return {}
    
    trajectories = {}
    for model_key in MODEL_MAP.keys():
        traj_f1 = feature_dir / f"execution_traj_{model_key}_k1_{f1_name}.json"
        traj_f2 = feature_dir / f"execution_traj_{model_key}_k1_{f2_name}.json"
        
        if traj_f1.exists() and traj_f2.exists():
            trajectories[model_key] = True
    
    return trajectories


def main():
    print("Scanning coop logs directory...")
    
    # Structure to hold all task data
    tasks = []
    model_stats = defaultdict(lambda: {"total": 0, "passed": 0})
    
    # Iterate through repos
    for repo_dir in sorted(COOP_LOGS_DIR.iterdir()):
        if not repo_dir.is_dir() or repo_dir.name.startswith("."):
            continue
        
        repo_name = repo_dir.name
        print(f"  Processing {repo_name}...")
        
        # Iterate through tasks
        for task_dir in sorted(repo_dir.iterdir()):
            if not task_dir.is_dir() or not task_dir.name.startswith("task"):
                continue
            
            task_id = task_dir.name
            
            # Load aggregated results for each model
            model_results = {}
            for model_key in MODEL_MAP.keys():
                agg_file = task_dir / f"aggregated_results_{model_key}_k1.json"
                if agg_file.exists():
                    model_results[model_key] = parse_aggregated_results(agg_file)
            
            if not model_results:
                continue
            
            # Get all unique feature pairs from ALL models (not just first)
            # This ensures we don't miss tasks if one model has incomplete data
            all_feature_pairs = set()
            for model_key, results in model_results.items():
                all_feature_pairs.update(results.keys())
            feature_pairs = list(all_feature_pairs)
            
            # Create task entries for each feature pair
            for feature_key in sorted(feature_pairs):
                # Extract feature IDs
                parts = feature_key.split("_")
                f1 = parts[0]  # "feature1"
                f2 = parts[1]  # "feature2"
                
                # Build results for all models
                # Fill in missing model data with passed=false (assume failure)
                results = {}
                has_any_trajectory = False
                
                for model_key in MODEL_MAP.keys():
                    if model_key in model_results and feature_key in model_results[model_key]:
                        result = model_results[model_key][feature_key]
                        results[model_key] = result
                    else:
                        # Missing data - assume failure
                        results[model_key] = {"passed": False, "hasConflict": None, "missing": True}
                    
                    # Update stats (all models count toward total of 652)
                    model_stats[model_key]["total"] += 1
                    if results[model_key]["passed"]:
                        model_stats[model_key]["passed"] += 1
                
                # Check if trajectory files exist
                trajectories = find_trajectory_files(task_dir, feature_key)
                
                task_entry = {
                    "repo": repo_name,
                    "taskId": task_id,
                    "features": feature_key,
                    "f1": f1,
                    "f2": f2,
                    "results": results,
                    "hasTrajectory": trajectories,
                }
                
                tasks.append(task_entry)
    
    # Build final index
    index = {
        "models": list(MODEL_MAP.keys()),
        "modelDisplayNames": {
            "gpt5": "GPT-5",
            "claude": "Claude Sonnet 4.5",
            "minimax": "MiniMax M2",
            "qwen_coder": "Qwen3-Coder-30B",
            "qwen": "Qwen3-30B",
        },
        "stats": {
            model: {
                "total": stats["total"],
                "passed": stats["passed"],
                "rate": round(stats["passed"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0
            }
            for model, stats in model_stats.items()
        },
        "tasks": tasks,
    }
    
    # Write output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_file = OUTPUT_DIR / "index.json"
    
    with open(output_file, "w") as f:
        json.dump(index, f, indent=2)
    
    # Print summary
    print(f"\nGenerated {output_file}")
    print(f"Total tasks: {len(tasks)}")
    print("\nModel stats:")
    for model, stats in model_stats.items():
        rate = stats["passed"] / stats["total"] * 100 if stats["total"] > 0 else 0
        print(f"  {model}: {stats['passed']}/{stats['total']} ({rate:.1f}%)")
    
    # Check file size
    size_kb = output_file.stat().st_size / 1024
    print(f"\nFile size: {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
