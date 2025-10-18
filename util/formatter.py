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

sample_snake_state = """**Current Turn**: \\( t_0 = 46 \\)
**Cells occupied by walls**:
\t - Border Cells: x=0/x=7 or y=0/y=7.
\t - Internal Obstacles: [(3, 2), (4, 5), (3, 6), (3, 1), (2, 2)]
**Snake Positions**:[(5, 3), (4, 3), (3, 3), (2, 3), (1, 3), (1, 4), (2, 4), (3, 4), (4, 4), (5, 4)]
**Snake Head Direction**: R
**Food Positions, Life Span and Value**:
\t- (6, 2, 4, 1)
\t- (5, 5, 7, 1)
\t- (3, 4, 10, 1)\
"""

formatted_snake_state = {
    "snake": [[5, 3], [4, 3], [3, 3], [2, 3], [1, 3], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4]],
    "direction": "R",
    "food": [
        [6, 2, 4, 1],
        [5, 5, 7, 1],
        [3, 4, 10, 1]
    ],
    "obstacles": [[3, 2], [4, 5], [3, 6], [3, 1], [2, 2]],
    "game_turn": 46,
    "terminal": False
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
    print("Formatting snake state...")
    print(f"Original state text:\n{state_text}")

    game_turn = int(state_text.split(" = ")[1].split(" \\)")[0])
    terminal = "Game Over" in state_text #TODO: check if this is correct

    obstacles_section = state_text.split("**Cells occupied by walls**:")[1].split("**Snake Positions**:")[0].strip()
    obstacles = []
    for line in obstacles_section.split("\n"):
        if "Internal Obstacles" in line:
            obs_str = line.split(": ")[1].strip().strip("[]")
            if obs_str:
                for obs in obs_str.split("), ("):
                    obs = obs.strip("()")
                    x, y = map(int, obs.split(", "))
                    obstacles.append([x, y])

    snake_section = state_text.split("**Snake Positions**:")[1].split("**Snake Head Direction**:")[0].strip()
    snake_str = snake_section.strip().strip("[]")
    snake = []
    if snake_str:
        for seg in snake_str.split("), ("):
            seg = seg.strip("()")
            x, y = map(int, seg.split(", "))
            snake.append([x, y])

    direction_section = state_text.split("**Snake Head Direction**:")[1].split("**Food Positions, Life Span and Value**:")[0].strip()
    direction = direction_section

    food_section = state_text.split("**Food Positions, Life Span and Value**:")[1].strip()
    food = []
    for line in food_section.split("\n"):
        if line.strip().startswith("- ("):
            food_str = line.strip().lstrip("- ").strip("()")
            x, y, life_span, value = map(int, food_str.split(", "))
            food.append([x, y, life_span, value])

    return {
        "snake": snake,
        "direction": direction,
        "food": food,
        "obstacles": obstacles,
        "game_turn": game_turn,
        "terminal": terminal
    }

import re
from typing import Dict, List, Tuple, Optional, Any

def format_overcooked(state_text: str) -> Dict[str, Any]:
    """
    Convert Overcooked state text to the required dict format for JS rendering.
    
    Args:
        state_text: String containing the game state in text format
        
    Returns:
        Dictionary with terrain_mtx, players, objects, game_turn, terminal, score
    """
    
    # Helper function to parse coordinate lists
    def parse_coords(text: str) -> List[Tuple[int, int]]:
        """Extract list of (x, y) coordinates from text like '[(0, 0), (2, 0)]'"""
        if "No " in text or not text.strip():
            return []
        matches = re.findall(r'\((\d+),\s*(\d+)\)', text)
        return [(int(x), int(y)) for x, y in matches]
    
    # Helper function to parse single coordinate
    def parse_coord(text: str) -> Optional[Tuple[int, int]]:
        """Extract single (x, y) coordinate from text"""
        match = re.search(r'\((\d+),\s*(\d+)\)', text)
        if match:
            return (int(match.group(1)), int(match.group(2)))
        return None
    
    # Initialize result structure
    result = {
        "terrain_mtx": [],
        "players": [],
        "objects": [],
        "game_turn": 0,
        "terminal": False,
        "score": 0
    }
    
    # Parse game turn
    turn_match = re.search(r'Game Turn:\s*t_\d+\s*=\s*(\d+)', state_text)
    if turn_match:
        result["game_turn"] = int(turn_match.group(1))
    
    # Parse tile information
    tile_sections = {
        'counter': re.search(r'Kitchen Counter:\s*(.+?)(?:\n|$)', state_text),
        'tomato': re.search(r'Tomato Dispenser:\s*(.+?)(?:\n|$)', state_text),
        'onion': re.search(r'Onion Dispenser:\s*(.+?)(?:\n|$)', state_text),
        'plate': re.search(r'Plate Dispenser:\s*(.+?)(?:\n|$)', state_text),
        'pot': re.search(r'Pot:\s*(.+?)(?:\n|$)', state_text),
        'serve': re.search(r'Serving Counter:\s*(.+?)(?:\n|$)', state_text)
    }
    
    tile_coords = {
        'counter': parse_coords(tile_sections['counter'].group(1) if tile_sections['counter'] else ""),
        'tomato': parse_coords(tile_sections['tomato'].group(1) if tile_sections['tomato'] else ""),
        'onion': parse_coords(tile_sections['onion'].group(1) if tile_sections['onion'] else ""),
        'plate': parse_coords(tile_sections['plate'].group(1) if tile_sections['plate'] else ""),
        'pot': parse_coords(tile_sections['pot'].group(1) if tile_sections['pot'] else ""),
        'serve': parse_coords(tile_sections['serve'].group(1) if tile_sections['serve'] else "")
    }
    
    # Determine grid size
    all_coords = []
    for coords_list in tile_coords.values():
        all_coords.extend(coords_list)
    
    if all_coords:
        max_x = max(x for x, y in all_coords)
        max_y = max(y for x, y in all_coords)
        grid_width = max_x + 1
        grid_height = max_y + 1
    else:
        grid_width, grid_height = 5, 5  # Default size
    
    # Create terrain matrix (initialize with walls on borders, floor inside)
    terrain = [['X' if (x == 0 or x == grid_width + 1 or y == 0 or y == grid_height + 1) 
                else ' ' 
                for x in range(grid_width + 2)] 
               for y in range(grid_height + 2)]
    
    # Fill in tile types (offset by 1 due to wall border)
    for x, y in tile_coords['counter']:
        terrain[y + 1][x + 1] = 'C'  # Counter
    for x, y in tile_coords['tomato']:
        terrain[y + 1][x + 1] = 'T'  # Tomato dispenser
    for x, y in tile_coords['onion']:
        terrain[y + 1][x + 1] = 'O'  # Onion dispenser
    for x, y in tile_coords['plate']:
        terrain[y + 1][x + 1] = 'D'  # Dish/Plate dispenser
    for x, y in tile_coords['pot']:
        terrain[y + 1][x + 1] = 'P'  # Pot
    for x, y in tile_coords['serve']:
        terrain[y + 1][x + 1] = 'S'  # Serve
    
    result["terrain_mtx"] = terrain
    
    # Parse player information - updated pattern to handle both "You (Alice)" and "Teammate (Bob)"
    # Pattern matches:
    # - **You (Alice)** or **Teammate (Bob)** or just **Alice**
    player_pattern = r'-\s*\*\*(?:You \(|Teammate \()?(\w+)\)?\*\*\s*\n\s*-\s*Position:\s*\((\d+),\s*(\d+)\)\s*\n\s*-\s*Orientation:\s*(\w+)\s*\n\s*-\s*Holding:\s*(.+?)(?:\n|$)'
    players_matches = re.finditer(player_pattern, state_text, re.MULTILINE | re.DOTALL)
    
    orientation_map = {
        'U': 'NORTH',
        'D': 'SOUTH', 
        'L': 'WEST',
        'R': 'EAST',
        'N': 'NORTH',
        'S': 'SOUTH',
        'E': 'EAST',
        'W': 'WEST'
    }
    
    for match in players_matches:
        name, x, y, orientation, holding = match.groups()
        
        # Parse held object
        held_object = None
        holding_lower = holding.lower().strip()
        if 'nothing' not in holding_lower and 'empty' not in holding_lower:
            if 'onion' in holding_lower:
                held_object = {"name": "onion", "position": [int(x) + 1, int(y) + 1]}
            elif 'plate' in holding_lower or 'dish' in holding_lower:
                held_object = {"name": "dish", "position": [int(x) + 1, int(y) + 1]}
            elif 'soup' in holding_lower:
                held_object = {"name": "soup", "position": [int(x) + 1, int(y) + 1]}
            elif 'tomato' in holding_lower:
                held_object = {"name": "tomato", "position": [int(x) + 1, int(y) + 1]}
        
        player = {
            "name": name,  # Added name field for debugging
            "position": [int(x) + 1, int(y) + 1],  # Offset by 1 for wall border
            "orientation": orientation_map.get(orientation.upper(), 'NORTH'),
            "held_object": held_object
        }
        result["players"].append(player)
    
    # Parse objects on counters
    counter_pattern = r'Kitchen Counter on \((\d+),\s*(\d+)\):\s*contains\s+(?:a|an)\s+(\w+)'
    for match in re.finditer(counter_pattern, state_text):
        x, y, item = match.groups()
        obj = {
            "name": item.lower(),
            "position": [int(x) + 1, int(y) + 1]
        }
        result["objects"].append(obj)
    
    # Parse pot states
    pot_pattern = r'Pot on \((\d+),\s*(\d+)\):\s*contains\s+(\d+)\s+onions?\s+and\s+(\d+)\s+tomatoes?[^.]*'
    for match in re.finditer(pot_pattern, state_text):
        x, y, onion_count, tomato_count = match.groups()
        onion_count = int(onion_count)
        tomato_count = int(tomato_count)
        
        # Check if cooking or ready
        pot_line = match.group(0)
        is_cooking = 'cooking' in pot_line.lower() and 'hasn\'t started' not in pot_line.lower()
        is_ready = 'ready' in pot_line.lower() or 'done' in pot_line.lower()
        
        if onion_count > 0 or tomato_count > 0:
            ingredients = ['onion'] * onion_count + ['tomato'] * tomato_count
            obj = {
                "name": "soup",
                "position": [int(x) + 1, int(y) + 1],
                "ingredients": ingredients,
                "cook_time": 5,  # Default from recipe
                "is_cooking": is_cooking,
                "is_ready": is_ready
            }
            result["objects"].append(obj)
    
    return result

def test():
    # assert format_freeway(sample_freeway_state) == formatted_freeway_state, f"Freeway state formatting failed: {format_freeway(sample_freeway_state)}"
    assert format_snake(sample_snake_state) == formatted_snake_state, f"Snake state formatting failed: {format_snake(sample_snake_state)}"

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
                elif 'snake' in file_name:
                    entry['original_state'] = state
                    entry['state'] = format_snake(state)
                elif 'overcooked' in file_name:
                    entry['original_state'] = state
                    entry['state'] = format_overcooked(state)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(logs, f, ensure_ascii=False, indent=4)
    print(f"Formatted states in {file_name}")