from PIL import Image
import os
import glob

def concatenate_gifs_by_method():
    """将snake和freeway的GIF按方法类型合并：先播放完整的snake，然后播放完整的freeway"""
    
    methods = ['fast', 'slow', 'parallel']
    
    for method in methods:
        print(f"Processing {method} method...")
        
        # 查找对应的GIF文件
        snake_pattern = f"assets/{method}_snake.gif"
        freeway_pattern = f"assets/{method}_freeway.gif"
        
        snake_files = glob.glob(snake_pattern)
        freeway_files = glob.glob(freeway_pattern)
        
        if not snake_files or not freeway_files:
            print(f"Warning: Missing GIF files for {method} method")
            print(f"Snake files found: {snake_files}")
            print(f"Freeway files found: {freeway_files}")
            continue
            
        snake_file = snake_files[0]
        freeway_file = freeway_files[0]
        
        print(f"  Snake: {snake_file}")
        print(f"  Freeway: {freeway_file}")
        
        # 加载GIF文件
        try:
            snake_gif = Image.open(snake_file)
            freeway_gif = Image.open(freeway_file)
            
            # 提取snake GIF的所有帧
            snake_frames = []
            snake_durations = []
            try:
                while True:
                    snake_frames.append(snake_gif.copy())
                    duration = snake_gif.info.get('duration', 400)
                    snake_durations.append(duration)
                    snake_gif.seek(snake_gif.tell() + 1)
            except EOFError:
                pass
            
            # 提取freeway GIF的所有帧
            freeway_frames = []
            freeway_durations = []
            try:
                while True:
                    freeway_frames.append(freeway_gif.copy())
                    duration = freeway_gif.info.get('duration', 500)
                    freeway_durations.append(duration)
                    freeway_gif.seek(freeway_gif.tell() + 1)
            except EOFError:
                pass
            # resize frames to the same size if necessary
            if snake_frames and freeway_frames:
                width = max(snake_frames[0].width, freeway_frames[0].width)
                height = max(snake_frames[0].height, freeway_frames[0].height)
                snake_frames = [frame.resize((width, height)) for frame in snake_frames]
                freeway_frames = [frame.resize((width, height)) for frame in freeway_frames]
            print(f"  Snake frames: {len(snake_frames)}, Freeway frames: {len(freeway_frames)}")
            
            # 合并策略：先添加所有snake帧，然后添加所有freeway帧
            combined_frames = []
            combined_durations = []
            
            # 添加所有snake帧
            combined_frames.extend(snake_frames)
            combined_durations.extend(snake_durations)
            
            # 添加所有freeway帧
            combined_frames.extend(freeway_frames)
            combined_durations.extend(freeway_durations)
            combined_frames.extend(freeway_frames)
            combined_durations.extend(freeway_durations)
            combined_frames.extend(freeway_frames)
            combined_durations.extend(freeway_durations)
            combined_frames.extend(freeway_frames)
            combined_durations.extend(freeway_durations)
            combined_frames.extend(freeway_frames)
            combined_durations.extend(freeway_durations)            
            # 保存合并后的GIF
            output_filename = f"assets/{method}_combined.gif"
            if combined_frames:
                combined_durations[-1] = 300000
                combined_frames[0].save(
                    output_filename,
                    save_all=True,
                    append_images=combined_frames[1:],
                    duration=combined_durations,
                    loop=1
                )
                print(f"  Saved: {output_filename} with {len(combined_frames)} frames")
                print(f"    Snake: {len(snake_frames)} frames, Freeway: {len(freeway_frames)} frames")
            else:
                print(f"  Error: No frames to save for {method}")
                
        except Exception as e:
            print(f"  Error processing {method}: {str(e)}")

if __name__ == "__main__":
    print("Available GIF files:")
    gif_files = glob.glob("assets/*.gif")
    for gif in gif_files:
        print(f"  {gif}")
    print()
    
    print("=== Creating Sequential Combined GIFs ===")
    print("Strategy: Play complete Snake GIF first, then complete Freeway GIF")
    concatenate_gifs_by_method()
    print()
    
    print("Done!")