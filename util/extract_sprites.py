#!/usr/bin/env python3
"""
Sprite Sheet Extractor
批量从精灵图集中提取单个精灵图片

用法:
    python extract_sprites.py <source_dir> [output_dir]
    
示例:
    python extract_sprites.py ./sprite_sheets ./assets/overcooked
"""

import json
import os
import sys
from pathlib import Path
from PIL import Image


def extract_sprites_from_sheet(png_path, json_path, output_dir):
    """
    从一个精灵图集中提取所有精灵
    
    Args:
        png_path: 精灵图集的路径
        json_path: 对应的JSON配置文件路径
        output_dir: 输出目录
    """
    # 读取JSON配置
    with open(json_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # 打开精灵图集
    sheet_image = Image.open(png_path)
    sheet_name = Path(png_path).stem
    
    print(f"\n处理精灵图集: {png_path}")
    print(f"图集尺寸: {sheet_image.size}")
    
    extracted_count = 0
    
    # 检测JSON格式类型
    # 格式1: 旧版 TexturePacker (直接的 frames 对象)
    if 'frames' in config and isinstance(config['frames'], dict):
        print(f"  检测到格式: TexturePacker 旧版 (frames 对象)")
        frames = config['frames']
        
        for sprite_name, sprite_data in frames.items():
            frame = sprite_data['frame']
            x = frame['x']
            y = frame['y']
            w = frame['w']
            h = frame['h']
            
            # 裁剪精灵
            sprite = sheet_image.crop((x, y, x + w, y + h))
            
            # 构建输出路径
            output_name = sprite_name
            if not output_name.endswith('.png'):
                output_name += '.png'
            
            output_path = output_dir / output_name
            
            # 保存精灵
            sprite.save(output_path)
            extracted_count += 1
            print(f"  ✓ 提取: {sprite_name} ({w}x{h}) -> {output_path}")
    
    # 格式2: 新版 TexturePacker (textures 数组包含 frames 数组)
    elif 'textures' in config and isinstance(config['textures'], list):
        print(f"  检测到格式: TexturePacker 新版 (textures 数组)")
        
        for texture in config['textures']:
            frames = texture.get('frames', [])
            
            for frame_data in frames:
                sprite_name = frame_data['filename']
                frame = frame_data['frame']
                x = frame['x']
                y = frame['y']
                w = frame['w']
                h = frame['h']
                
                # 裁剪精灵
                sprite = sheet_image.crop((x, y, x + w, y + h))
                
                # 构建输出路径
                output_name = sprite_name
                if not output_name.endswith('.png'):
                    output_name += '.png'
                
                output_path = output_dir / output_name
                
                # 保存精灵
                sprite.save(output_path)
                extracted_count += 1
                print(f"  ✓ 提取: {sprite_name} ({w}x{h}) -> {output_path}")
    
    else:
        print(f"  ⚠ 警告: 无法识别的JSON格式")
        print(f"  JSON结构: {list(config.keys())}")
        return 0
    
    print(f"完成! 从 {sheet_name} 提取了 {extracted_count} 个精灵")
    return extracted_count


def process_directory(source_dir, output_dir):
    """
    处理目录中所有的PNG+JSON配对
    
    Args:
        source_dir: 源目录路径
        output_dir: 输出目录路径
    """
    source_path = Path(source_dir)
    output_path = Path(output_dir)
    
    # 确保输出目录存在
    output_path.mkdir(parents=True, exist_ok=True)
    
    print(f"源目录: {source_path.absolute()}")
    print(f"输出目录: {output_path.absolute()}")
    print("=" * 60)
    
    # 查找所有PNG文件
    png_files = list(source_path.glob('*.png'))
    
    if not png_files:
        print(f"错误: 在 {source_dir} 中未找到PNG文件")
        return 0
    
    total_extracted = 0
    processed_count = 0
    
    for png_file in png_files:
        # 查找对应的JSON文件
        json_file = png_file.with_suffix('.json')
        
        if not json_file.exists():
            print(f"⚠ 跳过 {png_file.name}: 未找到对应的JSON文件")
            continue
        
        try:
            count = extract_sprites_from_sheet(png_file, json_file, output_path)
            total_extracted += count
            processed_count += 1
        except Exception as e:
            print(f"✗ 处理 {png_file.name} 时出错: {e}")
            import traceback
            traceback.print_exc()
    
    print("=" * 60)
    print(f"处理完成!")
    print(f"  处理的图集: {processed_count}/{len(png_files)}")
    print(f"  提取的精灵: {total_extracted}")
    
    return total_extracted


def rename_sprites(output_dir):
    """
    重命名某些精灵以匹配JavaScript代码的期望
    
    Args:
        output_dir: 输出目录路径
    """
    output_path = Path(output_dir)
    
    # 定义重命名映射
    rename_map = {
        'dishes.png': 'dish_dispenser.png',
        'onions.png': 'onion_dispenser.png',
        'tomatoes.png': 'tomato_dispenser.png',
    }
    
    print("\n检查是否需要重命名...")
    
    for old_name, new_name in rename_map.items():
        old_path = output_path / old_name
        new_path = output_path / new_name
        
        if old_path.exists():
            old_path.rename(new_path)
            print(f"  ✓ 重命名: {old_name} -> {new_name}")


def create_missing_sprites(output_dir):
    """
    为缺失的精灵创建占位符或从现有精灵复制
    
    Args:
        output_dir: 输出目录路径
    """
    output_path = Path(output_dir)
    
    print("\n检查缺失的精灵...")
    
    # 如果没有wall.png，从counter.png复制一个深色版本
    wall_path = output_path / 'wall.png'
    counter_path = output_path / 'counter.png'
    
    if not wall_path.exists() and counter_path.exists():
        counter = Image.open(counter_path)
        # 创建深色版本作为墙壁
        wall = counter.copy()
        # 降低亮度
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Brightness(wall)
        wall = enhancer.enhance(0.5)
        wall.save(wall_path)
        print(f"  ✓ 创建: wall.png (从counter.png派生)")
    
    # 为简化的 soup 和 soup_ready 创建通用版本
    # 如果没有 soup.png，尝试从 soup_idle 或 soup_cooked 创建
    soup_path = output_path / 'soup.png'
    soup_ready_path = output_path / 'soup_ready.png'
    
    if not soup_path.exists():
        # 查找任何 soup_idle 或 soup_cooked 文件
        idle_soups = list(output_path.glob('soup_idle_*.png'))
        cooked_soups = list(output_path.glob('soup_cooked_*.png'))
        
        if idle_soups:
            # 使用第一个找到的 soup_idle 作为通用 soup
            import shutil
            shutil.copy(idle_soups[0], soup_path)
            print(f"  ✓ 创建: soup.png (从 {idle_soups[0].name} 复制)")
        elif cooked_soups:
            import shutil
            shutil.copy(cooked_soups[0], soup_path)
            print(f"  ✓ 创建: soup.png (从 {cooked_soups[0].name} 复制)")
    
    if not soup_ready_path.exists():
        # 查找任何 soup_done 文件
        done_soups = list(output_path.glob('soup_done_*.png'))
        
        if done_soups:
            import shutil
            shutil.copy(done_soups[0], soup_ready_path)
            print(f"  ✓ 创建: soup_ready.png (从 {done_soups[0].name} 复制)")
    
    # 检查其他可能缺失的精灵
    required_sprites = [
        'floor.png', 'counter.png', 'pot.png', 'serve.png',
        'onion_dispenser.png', 'dish_dispenser.png',
        'soup.png', 'soup_ready.png'
    ]
    
    missing = [s for s in required_sprites if not (output_path / s).exists()]
    if missing:
        print(f"  ⚠ 仍然缺失的精灵: {', '.join(missing)}")
        print(f"    请手动检查源文件或提供这些精灵")
    
    # 统计提取的 soup 变体数量
    soup_variants = len(list(output_path.glob('soup_*.png')))
    if soup_variants > 2:  # 除了 soup.png 和 soup_ready.png
        print(f"  ℹ 提取了 {soup_variants} 个汤的变体（不同配方）")


def main():
    """主函数"""
    # 解析命令行参数
    if len(sys.argv) < 2:
        print(__doc__)
        print("\n错误: 请提供源目录路径")
        sys.exit(1)
    
    source_dir = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else './assets/overcooked'
    
    # 检查源目录是否存在
    if not os.path.isdir(source_dir):
        print(f"错误: 源目录不存在: {source_dir}")
        sys.exit(1)
    
    # 处理所有精灵图集
    total = process_directory(source_dir, output_dir)
    
    if total > 0:
        # 重命名某些精灵
        rename_sprites(output_dir)
        
        # 创建缺失的精灵
        create_missing_sprites(output_dir)
        
        print("\n✅ 所有精灵已提取到:", Path(output_dir).absolute())
    else:
        print("\n❌ 未提取任何精灵")
        sys.exit(1)


if __name__ == '__main__':
    main()