import pandas as pd
import json

def csv_to_json(csv_file_path, json_file_path):
    """
    将CSV文件转换为指定格式的JSON文件
    
    参数:
        csv_file_path: CSV文件路径
        json_file_path: 输出的JSON文件路径
    """
    # 读取CSV文件
    df = pd.read_csv(csv_file_path)
    
    # 创建结果列表
    result = []
    
    # 遍历每一行
    for index, row in df.iterrows():
        # 获取thinking值：优先使用fast_agent_response，如果为空则使用slow_agent_response
        fast_response = row['fast_agent_response']
        slow_response = row['slow_agent_response']
        
        # 判断fast_agent_response是否为空
        if pd.isna(fast_response) or str(fast_response).strip() == '':
            thinking = slow_response if not pd.isna(slow_response) else ''
        else:
            thinking = fast_response
        if pd.isna(thinking) or str(thinking).strip() == '':
            thinking = "Still thinking..."
        
        
        # 构建JSON对象
        item = {
            "step": index,
            "score": row['reward'] if not pd.isna(row['reward']) else 0,
            "thinking": str(thinking) if not pd.isna(thinking) else '',
            "state": str(row['description']) if not pd.isna(row['description']) else '',
            "action": str(row['action']) if not pd.isna(row['action']) else ''
        }
        
        result.append(item)
    
    # 检查路径是否存在，如果不存在创建
    import os
    os.makedirs(os.path.dirname(json_file_path), exist_ok=True)

    # 写入JSON文件
    with open(json_file_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=4)
    
    return result

cognitive_load_map = {
    "E": "easy",
    "M": "medium",
    "H": "hard"
}

model_map = {
    "fast": "reactive",
    "slow": "planning",
    "parallel": "agile"
}

time_pressure_map = {
    "4096": "4k",
    "8192": "8k",
    "16384": "16k",
    "32768": "32k"
}

def logs_to_data():
    import os
    import glob

    # 找出所有 static/logs 目录下的文件夹
    log_dirs = [d for d in glob.glob('static/logs/*') if os.path.isdir(d)]
    print(f"Found {len(log_dirs)} log directories.")

    index_to_csv = {}

    for log_dir in log_dirs:
        # 提取文件夹名称作为前缀
        prefix = os.path.basename(log_dir)
        
        # 文件名如 freeway_E_parallel_32768_4096_T
        game, cognitive_load, model, time_pressure, _ , _ = prefix.split('_')
        
        # 名字映射
        cognitive_load = cognitive_load_map.get(cognitive_load, cognitive_load)
        model = model_map.get(model, model)
        time_pressure = time_pressure_map.get(time_pressure, time_pressure)

        # 检查重复
        index = f"{game}_{cognitive_load}_{time_pressure}_{model}"
        assert index_to_csv.get(index) is None, f"Duplicate prefix found: {index}"
        index_to_csv[index] = prefix

        # 读取 0_0.csv, 0_1.csv, ... 0_7.csv
        json_prefix = f"static/data/{game}_{cognitive_load}_{time_pressure}"
        for i in range(8):
            csv_file_path = os.path.join(log_dir, f"0_{i}.csv")
            if not os.path.exists(csv_file_path):
                print(f"Warning: {csv_file_path} does not exist. Skipping.")
                continue
            
            json_file_path = f"{json_prefix}_seed{i}_{model}.json"
            print(f"Converting {csv_file_path} to {json_file_path}...")
            csv_to_json(csv_file_path, json_file_path)

    # 把每个 reactive 的 8k 结果复制一份到 16k 和 32k
    for index, prefix in index_to_csv.items():
        game, cognitive_load, time_pressure, model = index.split('_')
        json_prefix = f"static/data/{game}_{cognitive_load}_{time_pressure}"
        if time_pressure == "8k" and model == "reactive":
            for tp in ["16k", "32k"]:
                for i in range(8):
                    src_file = f"{json_prefix}_seed{i}_reactive.json"
                    dst_file = f"static/data/{game}_{cognitive_load}_{tp}_seed{i}_reactive.json"
                    if os.path.exists(src_file):
                        print(f"Copying {src_file} to {dst_file}...")
                        with open(src_file, 'r', encoding='utf-8') as f_src:
                            data = json.load(f_src)
                        with open(dst_file, 'w', encoding='utf-8') as f_dst:
                            json.dump(data, f_dst, ensure_ascii=False, indent=4)
                    else:
                        print(f"Warning: {src_file} does not exist. Cannot copy to {dst_file}.")


def check_exist():
    import os
    import itertools

    games = ["freeway", "snake", "overcooked"]
    cognitive_loads = ["easy", "medium", "hard"]
    time_pressures = ["4k", "8k", "16k", "32k"]
    models = ["reactive", "planning", "agile"]

    missing_files = []

    for game, cognitive_load, time_pressure, model, seed in itertools.product(
        games, cognitive_loads, time_pressures, models, range(8)
    ):
        file_path = f"static/data/{game}_{cognitive_load}_{time_pressure}_seed{seed}_{model}.json"
        if not os.path.exists(file_path):
            missing_files.append(file_path)

    if missing_files:
        print("Missing files:")
        for file in missing_files:
            print(f" - {file}")
    else:
        print("All expected files are present.")

if __name__ == "__main__":
    
    # 在根目录执行
    
    logs_to_data()

    check_exist()