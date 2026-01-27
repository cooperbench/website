#!/usr/bin/env python3
"""
Gzip all trajectory JSON files to reduce repo size.
2.1GB -> ~190MB (91% reduction)
"""

import gzip
import os
from pathlib import Path
import shutil

TRAJECTORIES_DIR = Path("/Users/arpan/Desktop/CooperBench_website/static/data/coop/trajectories")

def main():
    print("Gzipping trajectory files...")
    
    total_original = 0
    total_compressed = 0
    count = 0
    
    for model_dir in TRAJECTORIES_DIR.iterdir():
        if not model_dir.is_dir():
            continue
            
        print(f"  Processing {model_dir.name}...")
        
        for json_file in model_dir.glob("*.json"):
            # Skip if already gzipped version exists
            gz_file = json_file.with_suffix(".json.gz")
            
            # Read original
            original_size = json_file.stat().st_size
            total_original += original_size
            
            # Compress
            with open(json_file, 'rb') as f_in:
                with gzip.open(gz_file, 'wb', compresslevel=9) as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            compressed_size = gz_file.stat().st_size
            total_compressed += compressed_size
            
            # Remove original
            json_file.unlink()
            
            count += 1
            if count % 100 == 0:
                print(f"    Processed {count} files...")
    
    print(f"\nDone! Processed {count} files")
    print(f"Original size: {total_original / 1024 / 1024:.1f} MB")
    print(f"Compressed size: {total_compressed / 1024 / 1024:.1f} MB")
    print(f"Reduction: {(1 - total_compressed / total_original) * 100:.1f}%")

if __name__ == "__main__":
    main()
