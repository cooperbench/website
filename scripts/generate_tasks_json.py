#!/usr/bin/env python3
"""
Generate a JSON file with all task content for the website.
Reads from the CooperBench dataset and outputs to static/data/tasks.json
"""

import json
import os
from pathlib import Path

DATASET_PATH = Path("/Users/arpan/Desktop/CooperBench/dataset")
OUTPUT_PATH = Path("/Users/arpan/Desktop/CooperBench_website/static/data/tasks.json")

REPO_INFO = {
    "dottxt_ai_outlines_task": {"repo": "dottxt-ai/outlines", "language": "python", "url": "https://github.com/dottxt-ai/outlines"},
    "dspy_task": {"repo": "stanfordnlp/dspy", "language": "python", "url": "https://github.com/stanfordnlp/dspy"},
    "go_chi_task": {"repo": "go-chi/chi", "language": "go", "url": "https://github.com/go-chi/chi"},
    "huggingface_datasets_task": {"repo": "huggingface/datasets", "language": "python", "url": "https://github.com/huggingface/datasets"},
    "llama_index_task": {"repo": "run-llama/llama_index", "language": "python", "url": "https://github.com/run-llama/llama_index"},
    "openai_tiktoken_task": {"repo": "openai/tiktoken", "language": "python", "url": "https://github.com/openai/tiktoken"},
    "pallets_click_task": {"repo": "pallets/click", "language": "python", "url": "https://github.com/pallets/click"},
    "pallets_jinja_task": {"repo": "pallets/jinja", "language": "python", "url": "https://github.com/pallets/jinja"},
    "pillow_task": {"repo": "python-pillow/Pillow", "language": "python", "url": "https://github.com/python-pillow/Pillow"},
    "react_hook_form_task": {"repo": "react-hook-form/react-hook-form", "language": "typescript", "url": "https://github.com/react-hook-form/react-hook-form"},
    "samuelcolvin_dirty_equals_task": {"repo": "samuelcolvin/dirty-equals", "language": "python", "url": "https://github.com/samuelcolvin/dirty-equals"},
    "typst": {"repo": "typst/typst", "language": "rust", "url": "https://github.com/typst/typst"},
}

def read_file_safe(path):
    """Read file content, return empty string if not found."""
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            return f.read()
    except:
        return ""

def extract_title(content):
    """Extract title from feature.md content."""
    lines = content.strip().split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('**Title**:'):
            return line.replace('**Title**:', '').strip()
        if line.startswith('# '):
            return line[2:].strip()
        if line.startswith('**Title'):
            # Handle **Title**: format
            if ':' in line:
                return line.split(':', 1)[1].strip()
    # Return first non-empty line as fallback
    for line in lines[:5]:
        if line.strip() and not line.startswith('#'):
            return line.strip()[:100]
    return "Untitled Feature"

def main():
    all_tasks = []
    
    for repo_dir in sorted(DATASET_PATH.iterdir()):
        if not repo_dir.is_dir() or repo_dir.name == "README.md":
            continue
        
        repo_key = repo_dir.name
        if repo_key not in REPO_INFO:
            print(f"Warning: Unknown repo {repo_key}")
            continue
        
        repo_info = REPO_INFO[repo_key]
        
        for task_dir in sorted(repo_dir.iterdir()):
            if not task_dir.is_dir() or not task_dir.name.startswith("task"):
                continue
            
            task_id = task_dir.name
            features = []
            
            # Find all feature directories
            for feature_dir in sorted(task_dir.iterdir()):
                if not feature_dir.is_dir() or not feature_dir.name.startswith("feature"):
                    continue
                
                feature_id = feature_dir.name
                feature_md_path = feature_dir / "feature.md"
                feature_patch_path = feature_dir / "feature.patch"
                tests_patch_path = feature_dir / "tests.patch"
                
                feature_md = read_file_safe(feature_md_path)
                feature_patch = read_file_safe(feature_patch_path)
                tests_patch = read_file_safe(tests_patch_path)
                
                title = extract_title(feature_md)
                
                features.append({
                    "id": feature_id,
                    "title": title,
                    "description": feature_md,
                    "patch": feature_patch,
                    "tests": tests_patch,
                })
            
            if features:
                all_tasks.append({
                    "repo": repo_info["repo"],
                    "repoUrl": repo_info["url"],
                    "language": repo_info["language"],
                    "taskId": task_id,
                    "repoKey": repo_key,
                    "features": features,
                })
    
    # Write output
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_tasks, f, indent=2, ensure_ascii=False)
    
    print(f"Generated {OUTPUT_PATH}")
    print(f"Total tasks: {len(all_tasks)}")
    print(f"Total features: {sum(len(t['features']) for t in all_tasks)}")

if __name__ == "__main__":
    main()
