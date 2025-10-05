sample_freeway_state = """**Current Turn:** \\( t_0 = 18 \\) 
**Player Position:** \\( (0, 7) \\)
**Car State**:
| Freeway \\( k \\) | Cars (head \\( h \\), tail \\( \tau \\), direction \\( d \\), speed \\( s \\)) |  
|-----------------|------------------------------------------------------------------------|
| 1 | \\((60, 49, right, 12), (12, 1, right, 12)\\) |
| 2 | \\((96, 49, right, 48)\\) |
| 3 | \\((-72, -49, left, 24)\\) |
| 4 | \\((-36, -47, right, 12), (0, -11, right, 12), (36, 25, right, 12)\\) |
| 5 | \\((-20, -31, right, 4)\\) |
| 6 | \\((-20, -31, right, 4), (56, 45, right, 4), (20, 9, right, 4)\\) |
| 7 | \\((60, 49, right, 12), (12, 1, right, 12)\\) |
"""



formatted_freeway_state = {
  "pos": 7,           # 玩家当前行位置
  "game_turn": 18,  # 当前回合数
  "terminal": False,  # 游戏是否结束
  "cars": [             # 车辆数组
    [60, 1, 12, 12],
    [12, 1, 12, 12],
    [96, 2, 48, 48],
    [-72, 3, -24, 24],
    [-36, 4, 12, 12],
    [0, 4, 12, 12],
    [36, 4, 12, 12],
    [-20, 5, 4, 4],
    [-20, 6, 4, 4],
    [56, 6, 4, 4],
    [20, 6, 4, 4],
    [60, 7, 12, 12],
    [12, 7, 12, 12]
    
    # [x, y, speed, length],
    # x: 车头位置, y: 行号, speed: 速度(正右负左), length: 车长
  ]
}

def format_freeway(state_text):
    print("Formatting freeway state...")
    print(f"Original state text:\n{state_text}")

    pos = state_text.split("**Player Position:** \\( (")[1].split(", ")[1].split(" \\)")[0][0]
    game_turn = state_text.split(" = ")[1].split(" \\)")[0]
    terminal = "Game Over" in state_text #TODO: check if this is correct
    cars_section = state_text.split("**Car State**:")[1].strip()
    cars = []
    for line in cars_section.split("\n")[2:]:  # Skip header lines
        if line.strip() == "" or line.startswith("|-"):
            continue
        car_entries = line.split("|")[2].strip().strip("\\()").split("), (")
        for car_entry in car_entries:
            h, tau, d, s = car_entry.split(", ")
            h = int(h)
            tau = int(tau)
            s = int(s)
            length = abs(h - tau) + 1
            y = int(line.split("|")[1].strip())
            speed = s if d == "right" else -s
            cars.append([h, y, speed, length]) 
    return {
        "pos": int(pos),
        "game_turn": int(game_turn),
        "terminal": terminal,
        "cars": cars
    }

def format_snake(state_text):
    # todo
    pass

def format_overcooked(state_text):
    # todo
    pass

def test():
    assert format_freeway(sample_freeway_state) == formatted_freeway_state, f"Freeway state formatting failed: {format_freeway(sample_freeway_state)}"

if __name__ == "__main__":
    data_dir = 'static/data'
    import os
    import json
    for file_name in os.listdir(data_dir):
        if file_name.endswith('.json'):
            file_path = os.path.join(data_dir, file_name)
            with open(file_path, 'r', encoding='utf-8') as f:
                logs = json.load(f)
            for entry in logs:
                # 如果 original_state 已存在，读取 original_state；否则读取 state
                state = entry.get('original_state', entry['state'])

                # 删除 > 开头的行
                state = '\n'.join([line for line in state.split('\n') if not line.strip().startswith('>')])
                # 根据游戏类型格式化 state
                if 'freeway' in file_name:
                    entry['original_state'] = state
                    entry['state'] = format_freeway(state)
                # elif 'snake' in file_name:
                #     entry['original_state'] = state
                #     entry['state'] = format_snake(state)
                # elif 'overcooked' in file_name:
                #     entry['original_state'] = state
                #     entry['state'] = format_overcooked(state)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(logs, f, ensure_ascii=False, indent=4)
    print(f"Formatted states in {file_name}")

