import pygame
import numpy as np
from PIL import Image
import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
from envs.minatar.environment import Environment
from envs.minatar.environments.freeway import Env

class FreewayRenderer:
    def __init__(self, cell_size=60, assets_path="assets/freeway/"):
        pygame.init()
        self.cell_size = cell_size
        self.width = 9 * cell_size  # 9 columns
        self.height = 10 * cell_size  # 10 rows
        self.assets_path = assets_path
        
        # 加载图片素材
        self.sprites = {}
        self.load_sprites()
        
        # 字体
        self.font = pygame.font.Font(None, 36)
        
    def load_sprites(self):
        sprite_files = {
            'chicken': 'chicken.png',      # 玩家（小鸡）
            'car_1': 'car1.png',         # 长度为1的车
            'car_2': 'car2.png',         # 长度为2的车
            'car_3': 'car3.png',         # 长度为3的车
            'car_4': 'car4.png',         # 长度为4的车
            'grey': 'grey.png',           # 灰色道路
            'yellow': 'yellow.png',       # 黄色道路（玩家过路点）
            'grass': 'grass.png',         # 草地背景
            'target': 'map-pin.png',  # 目标点
            'hit': 'hit.png',
            'thinking': 'thinking.png', 
            'idea': 'idea.png',        # 添加想法图标
        }
        
        for name, filename in sprite_files.items():
            filepath = os.path.join(self.assets_path, filename)
            if os.path.exists(filepath):
                sprite = pygame.image.load(filepath)
                if name.startswith('car_'):
                    # 车辆精灵按长度缩放宽度，高度固定
                    length = int(name.split('_')[1])
                    sprite = pygame.transform.scale(sprite, (self.cell_size * length, self.cell_size))
                elif name in ['thinking', 'idea']:
                    # 思考和想法图标稍小一些
                    sprite = pygame.transform.scale(sprite, (self.cell_size * 1.2, self.cell_size * 1.2))
                else:
                    sprite = pygame.transform.scale(sprite, (self.cell_size * 0.95, self.cell_size * 0.95))
                self.sprites[name] = sprite
            else:
                raise FileNotFoundError(f"Sprite file {filename} not found in {self.assets_path}.")
                # self.sprites[name] = self.create_fallback_sprite(name)

    def render(self, env, show_hit=False, show_thinking=None, method=None):
        surface = pygame.Surface((self.width, self.height))
        surface.fill((255, 255, 255))  # 设置背景色为白色
        # 绘制背景
        for i in range(10):  # rows
            for j in range(9):  # columns
                pos = (j * self.cell_size, i * self.cell_size)
                if i == 0 or i == 9:  # 起始线和终点线
                    surface.blit(self.sprites['grass'], pos)
                else:  # 道路
                    # 玩家的x位置（第4列）使用黄色道路，其他使用灰色道路
                    if j == 4:  # 玩家的过路点
                        surface.blit(self.sprites['yellow'], pos)
                    else:
                        surface.blit(self.sprites['grey'], pos)
                    
                    # 绘制车道分隔线
                    if j < 8:  # 不在最右边
                        line_x = (j + 1) * self.cell_size - 1
                        pygame.draw.line(surface, (255, 255, 255), 
                                    (line_x, i * self.cell_size), 
                                    (line_x, (i + 1) * self.cell_size), 1)
        
        # 绘制车辆
        for car in env.cars:
            x, y, timer, speed, length = car
            if x is None or speed is None:
                continue
                
            is_right = speed > 0
            car_y = y * self.cell_size
            
            # 计算车辆的起始位置（考虑车辆长度和方向）
            if is_right:
                # 向右行驶时，x是车头位置
                car_x = (x - length + 1) * self.cell_size
            else:
                # 向左行驶时，x是车头位置
                car_x = x * self.cell_size
            
            # 确保车辆在屏幕范围内才绘制
            if car_x + length * self.cell_size > 0 and car_x < self.width:
                sprite = self.get_vehicle_sprite(length, is_right)
                surface.blit(sprite, (car_x, car_y))
        
        # 绘制玩家（小鸡）
        player_x = 4 * self.cell_size
        player_y = env.pos * self.cell_size
        target_x = player_x
        target_y = 0
        surface.blit(self.sprites['target'], (target_x, target_y))
        surface.blit(self.sprites['chicken'], (player_x, player_y))        
        # 如果被撞击，在玩家位置显示撞击图标
        if show_hit:
            surface.blit(self.sprites['hit'], (player_x, player_y))
        
        # 显示思考状态图标
        if show_thinking is not None:
            thinking_offset_x = self.cell_size * 0.7  # 在玩家右侧
            thinking_offset_y = -self.cell_size * 0.5  # 在玩家上方
            thinking_x = player_x + thinking_offset_x
            thinking_y = player_y + thinking_offset_y
            
            if show_thinking:
                # 显示思考图标 (meta_control = False)
                surface.blit(self.sprites['thinking'], (thinking_x, thinking_y))
            else:
                # 显示想法图标 (meta_control = True)
                surface.blit(self.sprites['idea'], (thinking_x, thinking_y))
        
        # 绘制游戏信息
        self.draw_game_info(surface, env, method)
        
        return surface
    
    def get_vehicle_sprite(self, vehicle_length, is_right_direction):
        sprite_name = f'car_{vehicle_length}'
        base_sprite = self.sprites[sprite_name]
        
        if is_right_direction:
            return base_sprite
        else:
            return pygame.transform.flip(base_sprite, True, False)
    
    def draw_game_info(self, surface, env, method=None):
        assert method
        info_text = f"Turn: {env.game_turn}"
        text_surface = self.font.render(info_text, True, (255, 255, 255))
        
        text_rect = text_surface.get_rect()
        text_rect.topleft = (self.cell_size // 4, self.cell_size // 4)
        bg_rect = text_rect.inflate(10, 5)
        pygame.draw.rect(surface, (0, 0, 0), bg_rect)
        surface.blit(text_surface, text_rect)        
        
        if env.terminal:
            if env.game_turn < 100:  # 胜利
                end_text = f"SUCCESS in {env.game_turn} turns!" 
                color = (0, 255, 0)
            else:
                end_text = "GAME OVER"
                color = (255, 0, 0)
            
            end_surface = pygame.font.Font(None, 48).render(end_text, True, color)
            end_rect = end_surface.get_rect()
            end_rect.center = (self.width // 2, self.height // 2)
            
            # 添加半透明背景
            overlay = pygame.Surface((self.width, self.height))
            overlay.set_alpha(128)
            overlay.fill((0, 0, 0))
            surface.blit(overlay, (0, 0))
            surface.blit(end_surface, end_rect)

    def surface_to_pil(self, surface):
        """将 pygame Surface 转为 PIL Image"""
        data = pygame.image.tostring(surface, 'RGB')
        img = Image.frombytes('RGB', surface.get_size(), data)
        return img
    
    def save_frame(self, env, filename, show_hit=False, show_thinking=None, method=None):
        surface = self.render(env, show_hit, show_thinking, method)
        img = self.surface_to_pil(surface)
        img.save(filename)

import pandas as pd
if __name__ == "__main__":
    env = Environment("freeway", sticky_action_prob=0.0)
    renderer = FreewayRenderer()
    
    files = [
            # 'new-logs-freeway/freeway_M_slow_8192_0_A/1_2.csv', 
             #'new-logs-freeway/freeway_E_slow_32768_0_A/0_0.csv', 
            #  'new-logs-freeway/freeway_M_parallel_8192_4096_T/1_2.csv',
            # 'new-logs-freeway/freeway_H_slow_32768_0_A/0_3.csv'
             'new-logs-freeway/freeway_E_fast_4096_4096_A/3_1.csv'
            ]
    for file in files:
        method = 'fast' if 'fast' in file else 'slow' if 'slow' in file else 'parallel'
        env.seed(1001)
        env.reset()        
        surface = renderer.render(env.env, method=method)
        frames = []
        durations = []
        frames.append(renderer.surface_to_pil(surface))
        durations.append(500) 
        df = pd.read_csv(file)
        actions = df['action'].tolist()
        print(df['action'].tolist())
        meta_controls = df['meta_control'].tolist() if 'meta_control' in df.columns else [True] * len(actions)
        
        print(env.env.state_string())
        for round_idx, action in enumerate(actions):
            r, t = env.act(action)
            print(f"Position: {env.env.pos}, Reward: {r}, Action: {action}")
            print(env.env.state_string())
            
            show_hit = r < 0
            show_thinking = None
            if round_idx + 1 < len(meta_controls):
                show_thinking = not meta_controls[round_idx + 1]  # False显示思考，True显示想法
            
            if show_hit:
                surface = renderer.render(env.env, show_hit=show_hit, 
                                        show_thinking=None if ('fast' in file) else show_thinking, 
                                        method=method)
                frames.append(renderer.surface_to_pil(surface))
                durations.append(1000)
                R = env.env.reward
                G = env.env.game_turn
                env.env.random = np.random.RandomState(env.env.seed)
                env.reset()
                env.env.reward = R
                env.env.game_turn = G
            
            surface = renderer.render(env.env, 
                                    show_thinking = None if ('fast' in file) else True if show_hit else
                                    show_thinking,
                                    method=method)
            frames.append(renderer.surface_to_pil(surface))
            durations.append(500 if (r <= 0 or not env.env.terminal) else 2000)
        
    frames[0].save(
        f'assets/{method}_freeway.gif',
        save_all=True,
        append_images=frames[1:],
        duration=durations,  # 使用动态持续时间列表
        loop=0
    )
    # print(env.env.cars)
    # frames[0].save(f'assets/ppt_freeway.png')