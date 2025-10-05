import pygame
import numpy as np
from PIL import Image
import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
from envs.minatar.environment import Environment
from envs.minatar.environments.snake import Env

class SnakeRenderer:
    def __init__(self, cell_size=60, assets_path="assets/snake"):
        pygame.init()
        self.cell_size = cell_size
        self.assets_path = assets_path
        self.width = 8 * cell_size
        self.height = 8 * cell_size

        self.sprites = {}
        self.snake_sprites = {}
        self.load_sprites()
        self.font = pygame.font.Font(None, 36)


    def load_sprites(self):
        sprite_files = {
            'apple': 'apple.png',
            'wall': 'brick-wall.png',
            'obstacle': 'brick-wall.png',
            'head': 'head.png',
            'thinking': 'thinking.png',  # 添加思考图标
            'idea': 'idea.png',         # 添加想法图标
        }

        for name, filename in sprite_files.items():
            filepath = os.path.join(self.assets_path, filename)
            if name == 'head':
                self.sprites['head_down'] = pygame.image.load(filepath)
                self.sprites['head_down'] = pygame.transform.scale(self.sprites['head_down'], (self.cell_size, self.cell_size))
                self.sprites['head_up'] = pygame.transform.rotate(self.sprites['head_down'], 180)
                self.sprites['head_left'] = pygame.transform.rotate(self.sprites['head_down'], -90)
                self.sprites['head_right'] = pygame.transform.rotate(self.sprites['head_down'], 90)
            elif name in ['thinking', 'idea']:
                # 思考和想法图标稍小一些
                if os.path.exists(filepath):
                    sprite = pygame.image.load(filepath)
                    sprite = pygame.transform.scale(sprite, (int(self.cell_size * 0.8), int(self.cell_size * 0.8)))
                    self.sprites[name] = sprite
                else:
                    raise FileNotFoundError(f"Sprite file {filename} not found in {self.assets_path}. Please ensure the file exists.")
            elif os.path.exists(filepath):
                sprite = pygame.image.load(filepath)
                sprite = pygame.transform.scale(sprite, (self.cell_size, self.cell_size))
                self.sprites[name] = sprite
            else:
              raise FileNotFoundError(f"Sprite file {filename} not found in {self.assets_path}. Please ensure the file exists.")
        print(f"Loaded sprites: {list(self.sprites.keys())}")


        # 加载蛇的sprite sheet
        snake_path = os.path.join(self.assets_path, 'snake.png')
        if os.path.exists(snake_path):
            snake_sheet = pygame.image.load(snake_path)
            sheet_width, sheet_height = snake_sheet.get_size()
            sprite_width = sheet_width // 2
            sprite_height = sheet_height // 2

            # 提取各个子图像
            # 左上角：蛇头（朝上）
            head_rect = pygame.Rect(0, 0, sprite_width, sprite_height)
            head_sprite = snake_sheet.subsurface(head_rect)
            head_sprite = pygame.transform.scale(head_sprite, (self.cell_size, self.cell_size))

            # 右上角：直蛇身（上下连接）
            straight_rect = pygame.Rect(sprite_width, 0, sprite_width, sprite_height)
            straight_sprite = snake_sheet.subsurface(straight_rect)
            straight_sprite = pygame.transform.scale(straight_sprite, (self.cell_size, self.cell_size))

            # 左下角：蛇尾（从右到左）
            tail_rect = pygame.Rect(0, sprite_height, sprite_width, sprite_height)
            tail_sprite = snake_sheet.subsurface(tail_rect)
            tail_sprite = pygame.transform.scale(tail_sprite, (self.cell_size, self.cell_size))

            # 右下角：转弯蛇身（上左连接）
            turn_rect = pygame.Rect(sprite_width, sprite_height, sprite_width, sprite_height)
            turn_sprite = snake_sheet.subsurface(turn_rect)
            turn_sprite = pygame.transform.scale(turn_sprite, (self.cell_size, self.cell_size))

            # 存储基础蛇头（朝上）
            self.snake_sprites['head_up'] = head_sprite

            # 生成不同方向的蛇头
            self.snake_sprites['head_right'] = pygame.transform.rotate(head_sprite, -90)
            self.snake_sprites['head_down'] = pygame.transform.rotate(head_sprite, 180)
            self.snake_sprites['head_left'] = pygame.transform.rotate(head_sprite, 90)

            # 存储蛇尾（从右到左），生成不同方向
            self.snake_sprites['tail_left'] = tail_sprite  # 原始：从右到左
            self.snake_sprites['tail_up'] = pygame.transform.rotate(tail_sprite, -90)  # 从下到上
            self.snake_sprites['tail_right'] = pygame.transform.rotate(tail_sprite, 180)  # 从左到右
            self.snake_sprites['tail_down'] = pygame.transform.rotate(tail_sprite, 90)  # 从上到下

            # 存储蛇身类型
            self.snake_sprites['straight_vertical'] = straight_sprite
            self.snake_sprites['straight_horizontal'] = pygame.transform.rotate(straight_sprite, 90)
            self.snake_sprites['turn_up_left'] = turn_sprite
            self.snake_sprites['turn_up_right'] = pygame.transform.rotate(turn_sprite, -90)
            self.snake_sprites['turn_down_right'] = pygame.transform.rotate(turn_sprite, 180)
            self.snake_sprites['turn_down_left'] = pygame.transform.rotate(turn_sprite, 90)
        else:
            raise FileNotFoundError(f"Snake sprite sheet not found at {snake_path}. Please ensure the file exists.")

    def get_snake_body_sprite(self, prev_pos, curr_pos, next_pos, board_size):
        """根据前后位置确定蛇身应该使用的sprite"""
        if prev_pos is None or next_pos is None:
            return self.snake_sprites['straight_horizontal']

        prev_x, prev_y = prev_pos
        curr_x, curr_y = curr_pos
        next_x, next_y = next_pos

        # 计算相对方向
        from_dir = (prev_x - curr_x, prev_y - curr_y)
        to_dir = (next_x - curr_x, next_y - curr_y)

        # 直线段
        if from_dir[0] == 0 and to_dir[0] == 0:  # 垂直
            return self.snake_sprites['straight_vertical']
        elif from_dir[1] == 0 and to_dir[1] == 0:  # 水平
            return self.snake_sprites['straight_horizontal']

        # 转弯段
        dirs = sorted([from_dir, to_dir])
        if dirs == [(-1, 0), (0, 1)]:  # 左到上 或 上到左
            return self.snake_sprites['turn_up_left']
        elif dirs == [(0, 1), (1, 0)]:  # 上到右 或 右到上
            return self.snake_sprites['turn_up_right']
        elif dirs == [(0, -1), (1, 0)]:  # 下到右 或 右到下
            return self.snake_sprites['turn_down_right']
        elif dirs == [(-1, 0), (0, -1)]:  # 左到下 或 下到左
            return self.snake_sprites['turn_down_left']

        # 默认返回水平直线
        return self.snake_sprites['straight_horizontal']

    def get_snake_tail_sprite(self, prev_pos, curr_pos):
        """根据前一个位置确定蛇尾应该使用的sprite"""
        if prev_pos is None:
            return self.snake_sprites['tail_left']

        prev_x, prev_y = prev_pos
        curr_x, curr_y = curr_pos

        # 计算尾巴的方向（从前一个节点指向当前尾巴）
        direction = (curr_x - prev_x, curr_y - prev_y)

        direction_map = {
            (1, 0): 'tail_right',   # 尾巴在右边
            (-1, 0): 'tail_left',   # 尾巴在左边
            (0, 1): 'tail_up',      # 尾巴在上边
            (0, -1): 'tail_down'    # 尾巴在下边
        }

        return self.snake_sprites.get(direction_map.get(direction, 'tail_left'),
                                     self.snake_sprites['tail_left'])

    def render(self, env : Env, show_thinking=None):
        size = env.B * self.cell_size
        surface = pygame.Surface((size, size))
        surface.fill((0, 51, 51))
        for i in range(env.B):
            for j in range(env.B):
                pos = pygame.Rect(j * self.cell_size, (env.B - 1 - i) * self.cell_size,
                                 self.cell_size, self.cell_size)
                if i == 0 or i == env.B - 1 or j == 0 or j == env.B - 1:
                    continue
                if (i + j) % 2 == 0:
                    surface.fill((0, 77, 77), pos)
                else:
                    surface.fill((0, 102, 102), pos)

        for (x, y) in env.obstacle:
            pos = (x * self.cell_size, (env.B-1-y) * self.cell_size)
            surface.blit(self.sprites['obstacle'], pos)

        # 绘制食物和生命条
        for (x, y) in env.food:
            pos = (x * self.cell_size, (env.B-1-y) * self.cell_size)
            if env.food_attributes[x][y][1] > 0:
                surface.blit(self.sprites['apple'], pos)
                life = env.food_attributes[x][y][0]
                self.draw_life_bar(surface, life, 30, pos) #TODO: 30 -> 12

        # 绘制蛇
        for i, (x, y) in enumerate(env.snake):
            pos = (x * self.cell_size, (env.B-1-y) * self.cell_size)
            if i == len(env.snake) - 1:  # 蛇头
                direction_map = {'R': 'right', 'D': 'down', 'L': 'left', 'U': 'up'}
                if len(env.snake) == 1:
                    head_sprite = self.sprites[f'head_{direction_map.get(env.dir, "up")}']
                else:
                    head_sprite = self.snake_sprites[f'head_{direction_map.get(env.dir, "up")}']
                surface.blit(head_sprite, pos)
            elif i == 0:  # 蛇尾
                prev_pos = env.snake[1] if len(env.snake) > 1 else None
                tail_sprite = self.get_snake_tail_sprite(prev_pos, (x, y))
                surface.blit(tail_sprite, pos)
            else:  # 蛇身
                prev_pos = env.snake[i+1] if i < len(env.snake) - 1 else None
                next_pos = env.snake[i-1] if i > 0 else None
                body_sprite = self.get_snake_body_sprite(prev_pos, (x, y), next_pos, env.B)
                surface.blit(body_sprite, pos)

        # 显示思考状态图标（在蛇头附近）
        if show_thinking is not None and len(env.snake) > 0:
            head_x, head_y = env.snake[-1]
            head_pos_x = head_x * self.cell_size
            head_pos_y = (env.B - 1 - head_y) * self.cell_size

            # 计算图标位置（在蛇头右上方）
            thinking_offset_x = self.cell_size * 0.7
            thinking_offset_y = -self.cell_size * 0.5
            thinking_x = head_pos_x + thinking_offset_x
            thinking_y = head_pos_y + thinking_offset_y

            # 确保图标在屏幕范围内
            thinking_x = max(0, min(thinking_x, size - self.cell_size * 0.6))
            thinking_y = max(0, min(thinking_y, size - self.cell_size * 0.6))

            if show_thinking:
                # 显示思考图标 (meta_control = False)
                surface.blit(self.sprites['thinking'], (thinking_x, thinking_y))
            else:
                # 显示想法图标 (meta_control = True)
                surface.blit(self.sprites['idea'], (thinking_x, thinking_y))

        self.draw_game_info(surface, env)

        crop_margin = self.cell_size // 4 * 3
        cropped_size = size - 2 * crop_margin
        cropped_surface = pygame.Surface((cropped_size, cropped_size))

        crop_rect = pygame.Rect(crop_margin, crop_margin, cropped_size, cropped_size)
        cropped_surface.blit(surface, (0, 0), crop_rect)
        return cropped_surface

    def draw_life_bar(self, surface, life, max_life, pos):
        """绘制生命条"""
        bar_width = self.cell_size - 4
        bar_height = 6
        bar_x = pos[0] + 2
        bar_y = pos[1] + 10  # 在格子上方

        # 绘制背景条（红色）
        background_rect = pygame.Rect(bar_x, bar_y, bar_width, bar_height)
        pygame.draw.rect(surface, (100, 0, 0), background_rect)

        # 计算生命比例
        life_ratio = max(0, life / max_life)

        # 绘制生命条（绿色到红色渐变）
        if life_ratio > 0:
            life_width = int(bar_width * life_ratio)
            life_rect = pygame.Rect(bar_x, bar_y, life_width, bar_height)

            # 根据生命比例选择颜色（绿->黄->红）
            if life_ratio > 0.6:
                color = (0, 255, 0)  # 绿色
            elif life_ratio > 0.3:
                color = (255, 255, 0)  # 黄色
            else:
                color = (255, 0, 0)  # 红色

            pygame.draw.rect(surface, color, life_rect)

        # 绘制边框
        pygame.draw.rect(surface, (255, 255, 255), background_rect, 1)

    def draw_game_info(self, surface, env):
        # info_text = f"Turn: {env.game_turn}, Score: {env.reward}"
        # text_surface = self.font.render(info_text, True, (255, 255, 255))

        # text_rect = text_surface.get_rect()
        # text_rect.topleft = (self.cell_size, self.cell_size)
        # bg_rect = text_rect.inflate(10, 5)
        # pygame.draw.rect(surface, (0, 0, 0), bg_rect)
        # surface.blit(text_surface, text_rect)

        if env.terminal:
            if env.game_turn < 100:
                end_text = f"GAME OVER! REWARD {env.reward}"
                color = (255, 0, 0)
            else:
                end_text = f"REWARD {env.reward}"
                color = (0, 255, 0)

            end_surface = self.font.render(end_text, True, color)
            end_rect = end_surface.get_rect()
            end_rect.center = (self.width // 2, self.height // 2)

            # 添加半透明背景
            overlay = pygame.Surface((self.width, self.height))
            overlay.set_alpha(128)
            overlay.fill((0, 0, 0))
            surface.blit(overlay, (0, 0))
            surface.blit(end_surface, end_rect)


    def surface_to_pil(self, surface):
        data = pygame.image.tostring(surface, 'RGB')
        img = Image.frombytes('RGB', surface.get_size(), data)
        return img

import pandas as pd
def get_gif():
    env = Environment("snake", sticky_action_prob=0.0)
    renderer = SnakeRenderer()

    files = [f'new-logs-snake/snake_M_parallel_8192_2048_T/0_{b}.csv' for b in [14, 31]]
    FRAMES = []
    DURATIONS = []
    for file in files:
        seed = int(file.split('_')[-1].split('.')[0])
        env.seed(5000 + seed)
        env.reset()
        surface = renderer.render(env.env)
        frames = [renderer.surface_to_pil(surface)]

        df = pd.read_csv(file)
        actions = df['action'].tolist()
        method = 'fast' if 'fast' in file else 'slow' if 'slow' in file else 'parallel'
        if method == 'fast':
            actions[-1] = 'S'
        meta_controls = df['meta_control'].tolist() if 'meta_control' in df.columns else [True] * len(actions)
        for round_idx, action in enumerate(actions):
            reward, terminal = env.act(action)
            show_thinking = None
            if round_idx + 1 < len(meta_controls):
                show_thinking = not meta_controls[round_idx + 1]  # False显示思考，True显示想法

            surface = renderer.render(env.env, show_thinking = None if 'fast' in file else show_thinking)
            frames.append(renderer.surface_to_pil(surface))
        # The last frame lasts longer
        durations = [500] * (len(frames) - 1) + [2000]
        FRAMES.extend(frames)
        DURATIONS.extend(durations)
        # save png
        #frames[2].save(f'assets/{method}_snake.png')
    FRAMES[0].save(
        f'assets/{method}_snake.gif',
        save_all=True,
        append_images=FRAMES[1:],
        duration=DURATIONS,
        loop=0
    )
    print(f"Saved {method} snake GIF with {len(FRAMES)} frames.")

from envs.minatar.environments.snake import Env
if __name__ == "__main__":
    # get_gif()
    # exit(0)
    renderer = SnakeRenderer()
    env = Env()
    env.reset()

# ## Current State (Turn \(t_0\)):
# **Current Turn**: \( t_0 = 20 \)
# **Cells occupied by walls**:
#      - Border Cells: x=0/x=7 or y=0/y=7.
#      - Internal Obstacles: [(4, 3)]
# **Snake Positions**:[(3, 2), (3, 1), (4, 1), (5, 1), (6, 1), (6, 2), (6, 3), (5, 3), (5, 4)]
# **Snake Head Direction**: U
# **Food Positions, Value and Life Span**:
#     - (2, 6, 1, 7)
#     - (5, 2, 1, 28)
#     - (3, 5, 1, 14)


# ## Current State (Turn \(t_0\)):
# **Current Turn**: \( t_0 = 19 \)
# **Cells occupied by walls**:
#      - Border Cells: x=0/x=7 or y=0/y=7.
#      - Internal Obstacles: [(4, 3)]
# **Snake Positions**:[(3, 1), (4, 1), (5, 1), (6, 1), (6, 2), (6, 3), (5, 3), (5, 4), (5, 5)]
# **Snake Head Direction**: U
# **Food Positions, Value and Life Span**:
#     - (2, 6, 1, 8)
#     - (5, 2, 1, 29)
#     - (3, 5, 1, 15)

    env.B = 8
    env.dir = 'L'
    env.food_attributes = [[0 for _ in range(env.B)] for _ in range(env.B)]

    env.snake = [(1, 1), (2, 1), (3, 1), (4, 1), (5, 1), (6, 1), (6, 2), (6, 3), (5, 3)]
    env.snake.reverse()
    env.obstacle = [(4, 3)]
    env.food = [(2, 6), (5, 2), (3, 5)]
    env.food_attributes = [[0 for _ in range(env.B)] for _ in range(env.B)]
    env.food_attributes[2][6] = (6, 1)
    env.food_attributes[5][2] = (27, 1)
    env.food_attributes[3][5] = (13, 1)
    frame = renderer.surface_to_pil(renderer.render(env))
    frame.save("assets/snake_t21_slow.png")
