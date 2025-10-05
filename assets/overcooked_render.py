import sys
import os
import pandas as pd
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
from envs.minatar.environments.overcooked_new.src.overcooked_ai_py.visualization.state_visualizer import StateVisualizer
from envs.minatar.environments.overcooked_new.src.overcooked_ai_py.mdp.overcooked_mdp import *
from envs.overcooked import setup_env
import pygame
from PIL import Image
def surface_to_pil(surface):
    data = pygame.image.tostring(surface, 'RGBA')
    img = Image.frombytes('RGBA', surface.get_size(), data)
    return img.convert('RGB')
visualizer = StateVisualizer()

def turn_traj_to_gif(traj_path):
    seed = int(traj_path.split('_')[-1].split('.')[0])
    difficulty = 'M' if 'M' in traj_path else 'E' if 'E' in traj_path else 'H' if 'H' in traj_path else 'I'
    env, smp = setup_env(seed = seed, difficulty = difficulty)
    grid = env.env.gym_env.base_mdp.terrain_mtx
    df = pd.read_csv(traj_path)
    imgs = []
    for a in df['action']:
        hud_data = {}
        result = visualizer.render_state(env.env.gym_env.base_env.state, grid, hud_data = hud_data)
        img = surface_to_pil(result)
        imgs.append(img)
        env.act(a)
    result = visualizer.render_state(env.env.gym_env.base_env.state, grid, hud_data = hud_data)
    img = surface_to_pil(result)
    imgs.append(img)
    imgs[0].save(
        traj_path.replace('.csv', '.gif'),
        save_all=True,
        append_images=imgs[1:],
        duration=500,
        loop=1
    )
    # save the first frame as png
    imgs[50].save(traj_path.replace('.csv', '.png'))
# turn_traj_to_gif('new-logs-overcooked/overcooked_E_parallel_32768_2048_T/0_3.csv')

if __name__ == "__main__":
    world = OvercookedGridworld.from_layout_name('cc_hard')
    state = world.get_standard_start_state()
    for y in range(len(world.terrain_mtx)):
        for x in range(len(world.terrain_mtx[0])):
            pos = (x, y)
            terrain_type = world.get_terrain_type_at_pos(pos)
            if terrain_type == "P" and x == 2:
                item_type = np.random.choice(["onion"])
                num = 2
                state.add_object(SoupState(pos, ingredients=[], cook_time=20))
                soup = state.get_object(pos)
                [soup.add_ingredient(ObjectState(item_type, pos)) for _ in range(num)]
    p = [(1, 1), (4, 1)]
    ori = [Direction.SOUTH, Direction.WEST]
    players = [PlayerState(p[0], ori[0]), PlayerState(p[1], ori[1], held_object = ObjectState('onion', p[1]))]
    state.players = tuple(players)
    result = visualizer.render_state(state, world.terrain_mtx)
    img = surface_to_pil(result)
    img.save('assets/overcooked.png')

    # p = [(1, 1), (4, 1), (2, 1), (2, 3)]
    # ori = [Direction.NORTH, Direction.EAST, Direction.NORTH, Direction.SOUTH]
    # players = [PlayerState(p[0], ori[0]), PlayerState(p[1], ori[1]), PlayerState(p[2], ori[2], held_object = ObjectState('dish', p[2])), PlayerState(p[3], ori[3], held_object = ObjectState('onion', p[3]))]
    # state.players = tuple(players)
    # state.add_object(ObjectState('onion', (3, 0)))
    # state.add_object(ObjectState('dish', (1, 0)))
    # result = visualizer.render_state(state, world.terrain_mtx)
    # img = surface_to_pil(result)
    # img.save('assets/overcooked2.png')
    
