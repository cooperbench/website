//////////////////////////////////////////////////// Begin of Freeway Rendering ////////////////////////////////////////////////////

// Sprite cache for Freeway game
let freewaySprites = {
  loaded: false,
  images: {}
};

// Preload Freeway sprites
function preloadFreewaySprites() {
  return new Promise((resolve, reject) => {
    const basePath = 'assets/freeway/';
    const spriteFiles = {
      'chicken': 'chicken.png',
      'car_1': 'car1.png',
      'car_2': 'car2.png',
      'car_3': 'car3.png',
      'car_4': 'car4.png',
      'grey': 'grey.png',
      'yellow': 'yellow.png',
      'grass': 'grass.png',
      'target': 'map-pin.png',
      'hit': 'hit.png',
      'thinking': 'thinking.png',
      'idea': 'idea.png'
    };
    
    let loadedCount = 0;
    const totalCount = Object.keys(spriteFiles).length;
    
    Object.keys(spriteFiles).forEach(name => {
      const img = new Image();
      img.onload = () => {
        freewaySprites.images[name] = img;
        loadedCount++;
        if (loadedCount === totalCount) {
          freewaySprites.loaded = true;
          console.log('✓ Freeway sprites loaded successfully');
          resolve();
        }
      };
      img.onerror = () => {
        console.warn(`Failed to load sprite: ${name}`);
        loadedCount++;
        if (loadedCount === totalCount) {
          freewaySprites.loaded = true;
          resolve(); // Continue even if some images fail
        }
      };
      img.src = basePath + spriteFiles[name];
    });
  });
}

// Render Freeway game state with actual sprites
function renderFreewayState(ctx, width, height, state) {
  const COLS = 9;
  const ROWS = 10;
  const cellWidth = width / COLS;
  const cellHeight = height / ROWS;
  const PLAYER_COL = 4; // Player always at column 4
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // If sprites not loaded, use fallback rendering
  if (!freewaySprites.loaded) {
    renderFreewayStateFallback(ctx, width, height, state);
    return;
  }
  
  // Draw background grid with sprites
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * cellWidth;
      const y = (ROWS - 1 - row) * cellHeight;
      
      if (row === 0 || row === ROWS - 1) {
        // Start and end zones - grass
        if (freewaySprites.images['grass']) {
          ctx.drawImage(freewaySprites.images['grass'], x, y, cellWidth, cellHeight);
        } else {
          ctx.fillStyle = '#86C456';
          ctx.fillRect(x, y, cellWidth, cellHeight);
        }
      } else {
        // Road - grey or yellow
        const spriteName = (col === PLAYER_COL) ? 'yellow' : 'grey';
        if (freewaySprites.images[spriteName]) {
          ctx.drawImage(freewaySprites.images[spriteName], x, y, cellWidth, cellHeight);
        } else {
          ctx.fillStyle = (col === PLAYER_COL) ? '#FFD700' : '#696969';
          ctx.fillRect(x, y, cellWidth, cellHeight);
        }
      }
    }
  }
  
  // Draw cars with sprites
  if (state.cars && Array.isArray(state.cars)) {
    state.cars.forEach(car => {
      const [x, y, speed, length] = car;
      
      // Skip invalid cars
      if (x === null || speed === null || y < 1 || y >= ROWS - 1) return;
      
      const isRight = speed > 0;
      const carY = (ROWS - 1 - y) * cellHeight;
      
      // Calculate car starting position
      let carX;
      if (isRight) {
        carX = (x - length + 1) * cellWidth;
      } else {
        carX = x * cellWidth;
      }
      
      // Only draw if car is visible
      if (carX + length * cellWidth > 0 && carX < width) {
        const carSpriteName = `car_${length}`;
        if (freewaySprites.images[carSpriteName]) {
          ctx.save();
          
          if (isRight) {
            // Draw normally for right-moving cars
            ctx.drawImage(
              freewaySprites.images[carSpriteName],
              carX, carY,
              length * cellWidth, cellHeight
            );
          } else {
            // Flip horizontally for left-moving cars
            ctx.translate(carX + length * cellWidth, carY);
            ctx.scale(-1, 1);
            ctx.drawImage(
              freewaySprites.images[carSpriteName],
              0, 0,
              length * cellWidth, cellHeight
            );
          }
          
          ctx.restore();
        } else {
          // Fallback: draw colored rectangle
          ctx.fillStyle = getCarColor(length);
          ctx.fillRect(carX + 2, carY + 5, length * cellWidth - 4, cellHeight - 10);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(carX + 2, carY + 5, length * cellWidth - 4, cellHeight - 10);
        }
      }
    });
  }
  
  // Draw target (at top)
  const targetX = PLAYER_COL * cellWidth;
  const targetY = 0;
  if (freewaySprites.images['target']) {
    const targetSize = cellWidth * 0.95;
    ctx.drawImage(
      freewaySprites.images['target'],
      targetX + (cellWidth - targetSize) / 2,
      targetY + (cellHeight - targetSize) / 2,
      targetSize, targetSize
    );
  } else {
    // Fallback target marker
    const centerX = targetX + cellWidth / 2;
    const centerY = targetY + cellHeight / 2;
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX - 6, centerY + 4);
    ctx.lineTo(centerX + 6, centerY + 4);
    ctx.closePath();
    ctx.fill();
  }
  
  // Draw player (chicken)
  const playerX = PLAYER_COL * cellWidth;
  const playerY = (ROWS - 1 - state.pos) * cellHeight;
  if (freewaySprites.images['chicken']) {
    const chickenSize = cellWidth * 0.95;
    ctx.drawImage(
      freewaySprites.images['chicken'],
      playerX + (cellWidth - chickenSize) / 2,
      playerY + (cellHeight - chickenSize) / 2,
      chickenSize, chickenSize
    );
  } else {
    // Fallback chicken drawing
    const centerX = playerX + cellWidth / 2;
    const centerY = playerY + cellHeight / 2;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(centerX, centerY, cellWidth * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // Draw hit indicator if needed
  if (state.show_hit && freewaySprites.images['hit']) {
    const hitSize = cellWidth * 0.95;
    ctx.drawImage(
      freewaySprites.images['hit'],
      playerX + (cellWidth - hitSize) / 2,
      playerY + (cellHeight - hitSize) / 2,
      hitSize, hitSize
    );
  }
  
  // Draw thinking/idea indicator if needed
  if (state.show_thinking !== undefined && state.show_thinking !== null) {
    const iconName = state.show_thinking ? 'thinking' : 'idea';
    if (freewaySprites.images[iconName]) {
      const iconSize = cellWidth * 1.2;
      const iconX = playerX + cellWidth * 0.7;
      const iconY = playerY - cellHeight * 0.5;
      ctx.drawImage(
        freewaySprites.images[iconName],
        iconX, iconY,
        iconSize, iconSize
      );
    }
  }
  
  // Draw game info
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(5, 5, 120, 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Turn: ${state.game_turn || 0}`, 12, 12);
  
  // Draw terminal state
  if (state.terminal) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    if (state.game_turn < 100) {
      ctx.fillStyle = '#00FF00';
      ctx.font = 'bold 32px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SUCCESS!', width / 2, height / 2);
      ctx.font = '16px Inter';
      ctx.fillText(`Completed in ${state.game_turn} turns`, width / 2, height / 2 + 40);
    } else {
      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 32px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', width / 2, height / 2);
    }
  }
}

// Fallback rendering without sprites (same as before)
function renderFreewayStateFallback(ctx, width, height, state) {
  const COLS = 9;
  const ROWS = 10;
  const cellWidth = width / COLS;
  const cellHeight = height / ROWS;
  const PLAYER_COL = 4;
  
  ctx.clearRect(0, 0, width, height);
  
  // Draw background grid
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * cellWidth;
      const y = row * cellHeight;
      
      if (row === 0 || row === ROWS - 1) {
        ctx.fillStyle = '#86C456';
      } else {
        ctx.fillStyle = (col === PLAYER_COL) ? '#FFD700' : '#696969';
      }
      ctx.fillRect(x, y, cellWidth, cellHeight);
      
      if (row > 0 && row < ROWS - 1 && col < COLS - 1) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + cellWidth, y);
        ctx.lineTo(x + cellWidth, y + cellHeight);
        ctx.stroke();
      }
    }
  }
  
  // Draw cars
  if (state.cars && Array.isArray(state.cars)) {
    state.cars.forEach(car => {
      const [x, y, speed, length] = car;
      if (x === null || speed === null || y < 1 || y >= ROWS - 1) return;
      
      const isRight = speed > 0;
      const carY = y * cellHeight;
      let carX = isRight ? (x - length + 1) * cellWidth : x * cellWidth;
      
      if (carX + length * cellWidth > 0 && carX < width) {
        ctx.fillStyle = getCarColor(length);
        ctx.fillRect(carX + 2, carY + 5, length * cellWidth - 4, cellHeight - 10);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(carX + 2, carY + 5, length * cellWidth - 4, cellHeight - 10);
        
        // Direction arrow
        ctx.fillStyle = '#FFFFFF';
        const arrowY = carY + cellHeight / 2;
        if (isRight) {
          const arrowX = carX + length * cellWidth - 15;
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(arrowX - 8, arrowY - 5);
          ctx.lineTo(arrowX - 8, arrowY + 5);
          ctx.closePath();
          ctx.fill();
        } else {
          const arrowX = carX + 15;
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(arrowX + 8, arrowY - 5);
          ctx.lineTo(arrowX + 8, arrowY + 5);
          ctx.closePath();
          ctx.fill();
        }
      }
    });
  }
  
  // Draw target
  const targetX = PLAYER_COL * cellWidth + cellWidth / 2;
  const targetY = cellHeight / 2;
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.moveTo(targetX, targetY - 8);
  ctx.lineTo(targetX - 6, targetY + 4);
  ctx.lineTo(targetX + 6, targetY + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(targetX, targetY - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw player
  const playerX = PLAYER_COL * cellWidth + cellWidth / 2;
  const playerY = (ROWS - 1 - state.pos) * cellHeight + cellHeight / 2;
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(playerX, playerY, cellWidth * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFA500';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(playerX - 5, playerY - 5, 2, 0, Math.PI * 2);
  ctx.arc(playerX + 5, playerY - 5, 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath();
  ctx.moveTo(playerX, playerY);
  ctx.lineTo(playerX - 4, playerY + 6);
  ctx.lineTo(playerX + 4, playerY + 6);
  ctx.closePath();
  ctx.fill();
  
  // Game info
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(5, 5, 120, 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Turn: ${state.game_turn || 0}`, 12, 12);
  
  if (state.terminal) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    if (state.game_turn < 100) {
      ctx.fillStyle = '#00FF00';
      ctx.font = 'bold 32px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SUCCESS!', width / 2, height / 2);
    } else {
      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 32px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', width / 2, height / 2);
    }
  }
}

// Get car color based on length
function getCarColor(length) {
  const colors = {
    1: '#FF6B6B',
    2: '#4ECDC4',
    3: '#45B7D1',
    4: '#FFA07A'
  };
  return colors[length] || '#95A5A6';
}


//////////////////////////////////////////////////// End of Freeway Rendering ////////////////////////////////////////////////////

//////////////////////////////////////////////////// Begin of Snake Rendering ////////////////////////////////////////////////////

// Snake sprite cache
let snakeSprites = {
  loaded: false,
  images: {},
  pendingLoads: 0
};

// Preload Snake sprites
function preloadSnakeSprites() {
  return new Promise((resolve, reject) => {
    const basePath = 'assets/snake/';
    const spriteFiles = {
      'apple': 'apple.png',
      'wall': 'brick-wall.png',
      'obstacle': 'brick-wall.png',
      'head_down': 'head.png',
      'snake_sheet': 'snake.png',
      'thinking': 'thinking.png',
      'idea': 'idea.png'
    };
    
    let loadedCount = 0;
    const totalCount = Object.keys(spriteFiles).length;
    
    Object.keys(spriteFiles).forEach(name => {
      const img = new Image();
      img.onload = () => {
        if (name === 'head_down') {
          // Wait for image to be fully loaded before rotating
          snakeSprites.images['head_down'] = img;
          snakeSprites.pendingLoads += 4;
          setTimeout(() => {
            snakeSprites.images['head_up'] = rotateImage(img, 180);
            snakeSprites.images['head_left'] = rotateImage(img, -90);
            snakeSprites.images['head_right'] = rotateImage(img, 90);
            snakeSprites.pendingLoads -= 4;
          }, 0);
        } else if (name === 'snake_sheet') {
          // Wait for sheet to load before processing
          snakeSprites.pendingLoads += 1;
          setTimeout(() => {
            processSnakeSpriteSheet(img);
            snakeSprites.pendingLoads -= 1;
          }, 0);
        } else {
          snakeSprites.images[name] = img;
        }
        
        loadedCount++;
        if (loadedCount === totalCount) {
          // Wait a bit for async processing to complete
          setTimeout(() => {
            snakeSprites.loaded = true;
            console.log('✓ Snake sprites loaded successfully');
            resolve();
          }, 100);
        }
      };
      img.onerror = () => {
        console.warn(`Failed to load sprite: ${name}`);
        loadedCount++;
        if (loadedCount === totalCount) {
          snakeSprites.loaded = true;
          resolve();
        }
      };
      img.src = basePath + spriteFiles[name];
    });
  });
}

// Helper function to rotate image
function rotateImage(img, degrees) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(degrees * Math.PI / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  
  const rotatedImg = new Image();
  rotatedImg.src = canvas.toDataURL();
  return rotatedImg;
}

// Process snake sprite sheet into individual sprites
function processSnakeSpriteSheet(sheet) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const spriteWidth = sheet.width / 2;
  const spriteHeight = sheet.height / 2;
  
  // Extract head sprite (top-left)
  canvas.width = spriteWidth;
  canvas.height = spriteHeight;
  ctx.drawImage(sheet, 0, 0, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);
  const headUp = new Image();
  headUp.src = canvas.toDataURL();
  snakeSprites.images['snake_head_up'] = headUp;
  
  // Create rotated versions
  snakeSprites.images['snake_head_right'] = rotateImage(headUp, -90);
  snakeSprites.images['snake_head_down'] = rotateImage(headUp, 180);
  snakeSprites.images['snake_head_left'] = rotateImage(headUp, 90);
  
  // Extract straight body (top-right) - vertical
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sheet, spriteWidth, 0, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);
  const straightVertical = new Image();
  straightVertical.src = canvas.toDataURL();
  snakeSprites.images['straight_vertical'] = straightVertical;
  snakeSprites.images['straight_horizontal'] = rotateImage(straightVertical, 90);
  
  // Extract tail (bottom-left) - pointing left
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sheet, 0, spriteHeight, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);
  const tailLeft = new Image();
  tailLeft.src = canvas.toDataURL();
  snakeSprites.images['tail_left'] = tailLeft;
  snakeSprites.images['tail_up'] = rotateImage(tailLeft, -90);
  snakeSprites.images['tail_right'] = rotateImage(tailLeft, 180);
  snakeSprites.images['tail_down'] = rotateImage(tailLeft, 90);
  
  // Extract turn sprite (bottom-right) - up-left turn
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sheet, spriteWidth, spriteHeight, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);
  const turnUpLeft = new Image();
  turnUpLeft.src = canvas.toDataURL();
  snakeSprites.images['turn_up_left'] = turnUpLeft;
  snakeSprites.images['turn_up_right'] = rotateImage(turnUpLeft, -90);
  snakeSprites.images['turn_down_right'] = rotateImage(turnUpLeft, 180);
  snakeSprites.images['turn_down_left'] = rotateImage(turnUpLeft, 90);
}

// Get snake body sprite based on positions
function getSnakeBodySprite(prevPos, currPos, nextPos) {
  if (!prevPos || !nextPos) {
    return snakeSprites.images['straight_horizontal'];
  }
  
  const fromDir = [prevPos[0] - currPos[0], prevPos[1] - currPos[1]];
  const toDir = [nextPos[0] - currPos[0], nextPos[1] - currPos[1]];
  
  // Straight segments
  if (fromDir[0] === 0 && toDir[0] === 0) {
    return snakeSprites.images['straight_vertical'];
  }
  if (fromDir[1] === 0 && toDir[1] === 0) {
    return snakeSprites.images['straight_horizontal'];
  }
  
  // Turn segments
  const dirs = [fromDir, toDir].sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1] - b[1];
  });
  
  const key = `${dirs[0][0]},${dirs[0][1]}_${dirs[1][0]},${dirs[1][1]}`;
  const turnMap = {
    '-1,0_0,1': 'turn_up_left',
    '0,1_1,0': 'turn_up_right',
    '0,-1_1,0': 'turn_down_right',
    '-1,0_0,-1': 'turn_down_left'
  };
  
  return snakeSprites.images[turnMap[key]] || snakeSprites.images['straight_horizontal'];
}

// Get snake tail sprite based on direction
function getSnakeTailSprite(prevPos, currPos) {
  if (!prevPos) {
    return snakeSprites.images['tail_left'];
  }
  
  const dx = currPos[0] - prevPos[0];
  const dy = currPos[1] - prevPos[1];
  
  const dirMap = {
    '1,0': 'tail_right',
    '-1,0': 'tail_left',
    '0,1': 'tail_up',
    '0,-1': 'tail_down'
  };
  
  return snakeSprites.images[dirMap[`${dx},${dy}`]] || snakeSprites.images['tail_left'];
}

// Draw life bar for food
function drawLifeBar(ctx, life, maxLife, x, y, cellSize) {
  const barWidth = cellSize - 4;
  const barHeight = 6;
  const barX = x + 2;
  const barY = y + 10;
  
  // Background (dark red)
  ctx.fillStyle = 'rgb(100, 0, 0)';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  // Life bar
  const lifeRatio = Math.max(0, life / maxLife);
  if (lifeRatio > 0) {
    const lifeWidth = barWidth * lifeRatio;
    
    // Color based on life ratio
    if (lifeRatio > 0.6) {
      ctx.fillStyle = 'rgb(0, 255, 0)'; // Green
    } else if (lifeRatio > 0.3) {
      ctx.fillStyle = 'rgb(255, 255, 0)'; // Yellow
    } else {
      ctx.fillStyle = 'rgb(255, 0, 0)'; // Red
    }
    
    ctx.fillRect(barX, barY, lifeWidth, barHeight);
  }
  
  // Border
  ctx.strokeStyle = 'rgb(255, 255, 255)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
}

// Render Snake game state
function renderSnakeState(ctx, width, height, state) {
  const BOARD_SIZE = 8;
  const cellSize = width / BOARD_SIZE;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // If sprites not loaded, use fallback
  if (!snakeSprites.loaded) {
    renderSnakeStateFallback(ctx, width, height, state);
    return;
  }
  
  // Draw checkerboard background
  ctx.fillStyle = 'rgb(0, 51, 51)';
  ctx.fillRect(0, 0, width, height);
  
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      // Skip borders
      if (i === 0 || i === BOARD_SIZE - 1 || j === 0 || j === BOARD_SIZE - 1) {
        continue;
      }
      
      const x = j * cellSize;
      const y = (BOARD_SIZE - 1 - i) * cellSize;
      
      if ((i + j) % 2 === 0) {
        ctx.fillStyle = 'rgb(0, 77, 77)';
      } else {
        ctx.fillStyle = 'rgb(0, 102, 102)';
      }
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
  
  // Draw obstacles
  if (state.obstacles && Array.isArray(state.obstacles)) {
    state.obstacles.forEach(([ox, oy]) => {
      const x = ox * cellSize;
      const y = (BOARD_SIZE - 1 - oy) * cellSize;
      if (snakeSprites.images['obstacle']) {
        ctx.drawImage(snakeSprites.images['obstacle'], x, y, cellSize, cellSize);
      }
    });
  }
  
  // Draw food with life bars
  if (state.food && Array.isArray(state.food)) {
    state.food.forEach(food => {
      const [fx, fy, life, value] = food;
      const x = fx * cellSize;
      const y = (BOARD_SIZE - 1 - fy) * cellSize;
      
      if (life > 0 && snakeSprites.images['apple']) {
        ctx.drawImage(snakeSprites.images['apple'], x, y, cellSize, cellSize);
        drawLifeBar(ctx, life, 12, x, y, cellSize);
      }
    });
  }
  
  // Draw snake
  if (state.snake && Array.isArray(state.snake) && state.snake.length > 0) {
    const snakeArray = state.snake;
    
    snakeArray.forEach((pos, i) => {
      const [sx, sy] = pos;
      const x = sx * cellSize;
      const y = (BOARD_SIZE - 1 - sy) * cellSize;
      
      // Head is at the FIRST position (index = 0)
      if (i === 0) {
        // Head
        const dirMap = { 'R': 'right', 'D': 'down', 'L': 'left', 'U': 'up' };
        const dir = dirMap[state.direction] || 'up';
        const headSprite = snakeArray.length === 1 
          ? snakeSprites.images[`head_${dir}`]
          : snakeSprites.images[`snake_head_${dir}`];
        
        if (headSprite && headSprite.complete) {
          ctx.drawImage(headSprite, x, y, cellSize, cellSize);
        } else {
          // Fallback: draw colored circle for head
          ctx.fillStyle = 'rgb(0, 200, 0)';
          ctx.beginPath();
          ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (i === snakeArray.length - 1) {
        // Tail is at LAST position (index = length - 1)
        const prevPos = snakeArray.length > 1 ? snakeArray[i - 1] : null;
        const tailSprite = getSnakeTailSprite(prevPos, pos);
        if (tailSprite && tailSprite.complete) {
          ctx.drawImage(tailSprite, x, y, cellSize, cellSize);
        } else {
          // Fallback: draw colored circle for tail
          ctx.fillStyle = 'rgb(0, 150, 0)';
          ctx.beginPath();
          ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Body segments
        const prevPos = i > 0 ? snakeArray[i - 1] : null;
        const nextPos = i < snakeArray.length - 1 ? snakeArray[i + 1] : null;
        const bodySprite = getSnakeBodySprite(prevPos, pos, nextPos);
        if (bodySprite && bodySprite.complete) {
          ctx.drawImage(bodySprite, x, y, cellSize, cellSize);
        } else {
          // Fallback: draw colored circle for body
          ctx.fillStyle = 'rgb(0, 180, 0)';
          ctx.beginPath();
          ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }
  
  // Draw thinking/idea indicator
  if (state.show_thinking !== undefined && state.show_thinking !== null && state.snake && state.snake.length > 0) {
    const [headX, headY] = state.snake[0];
    const x = headX * cellSize + cellSize * 0.7;
    const y = (BOARD_SIZE - 1 - headY) * cellSize - cellSize * 0.5;
    
    const iconName = state.show_thinking ? 'thinking' : 'idea';
    const icon = snakeSprites.images[iconName];
    if (icon && icon.complete) {
      const iconSize = cellSize * 0.8;
      ctx.drawImage(icon, x, y, iconSize, iconSize);
    }
  }
  
  // Draw game info - ALWAYS show turn number
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(5, 5, 120, 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const turnNum = state.game_turn !== undefined ? state.game_turn : (state.turn || 0);
  ctx.fillText(`Turn: ${turnNum}`, 12, 12);
  
  // Draw terminal state
  if (state.terminal) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    const endText = turnNum < 100 ? 'GAME OVER!' : 'SUCCESS!';
    const color = turnNum < 100 ? '#FF0000' : '#00FF00';
    
    ctx.fillStyle = color;
    ctx.font = 'bold 32px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(endText, width / 2, height / 2);
    ctx.font = '16px Inter';
    const rewardVal = state.reward !== undefined ? state.reward : (state.score || 0);
    ctx.fillText(`Reward: ${rewardVal}`, width / 2, height / 2 + 40);
  }
}

// Fallback rendering without sprites
function renderSnakeStateFallback(ctx, width, height, state) {
  const BOARD_SIZE = 8;
  const cellSize = width / BOARD_SIZE;
  
  // Clear and draw background
  ctx.fillStyle = 'rgb(0, 51, 51)';
  ctx.fillRect(0, 0, width, height);
  
  // Draw checkerboard
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (i === 0 || i === BOARD_SIZE - 1 || j === 0 || j === BOARD_SIZE - 1) continue;
      
      const x = j * cellSize;
      const y = (BOARD_SIZE - 1 - i) * cellSize;
      ctx.fillStyle = (i + j) % 2 === 0 ? 'rgb(0, 77, 77)' : 'rgb(0, 102, 102)';
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
  
  // Draw obstacles
  if (state.obstacles) {
    ctx.fillStyle = 'rgb(139, 69, 19)';
    state.obstacles.forEach(([ox, oy]) => {
      const x = ox * cellSize;
      const y = (BOARD_SIZE - 1 - oy) * cellSize;
      ctx.fillRect(x, y, cellSize, cellSize);
    });
  }
  
  // Draw food
  if (state.food) {
    state.food.forEach(([fx, fy, value, life]) => {
      if (life > 0) {
        const x = fx * cellSize + cellSize / 2;
        const y = (BOARD_SIZE - 1 - fy) * cellSize + cellSize / 2;
        ctx.fillStyle = 'rgb(255, 0, 0)';
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  
  // Draw snake - head is at FIRST position
  if (state.snake) {
    state.snake.forEach(([sx, sy], i) => {
      const x = sx * cellSize + cellSize / 2;
      const y = (BOARD_SIZE - 1 - sy) * cellSize + cellSize / 2;
      // Head is larger and at index 0
      const radius = i === 0 ? cellSize * 0.35 : cellSize * 0.3;
      ctx.fillStyle = i === 0 ? 'rgb(0, 255, 0)' : 'rgb(0, 200, 0)';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw eyes on head
      if (i === 0) {
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.beginPath();
        ctx.arc(x - 5, y - 3, 2, 0, Math.PI * 2);
        ctx.arc(x + 5, y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  
  // Game info
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(5, 5, 120, 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const turnNum = state.game_turn !== undefined ? state.game_turn : (state.turn || 0);
  ctx.fillText(`Turn: ${turnNum}`, 12, 12);
}

////////////////////////////////////////////////////// End of Snake Rendering ////////////////////////////////////////////////////



// Global state for comparison data
let comparisonData = {
  currentStep: 0,
  totalSteps: 0,
  reactive: [],
  planning: [],
  agile: [],
  game: 'freeway' // Store current game type
};


// Toggle thinking process display
function toggleThinking(model) {
  const content = document.getElementById(`thinking-content-${model}`);
  const icon = document.getElementById(`thinking-icon-${model}`);
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    icon.style.transform = 'rotate(180deg)';
  } else {
    content.style.display = 'none';
    icon.style.transform = 'rotate(0deg)';
  }
}

// Load comparison data
async function loadComparison() {
  const game = document.getElementById('game-select').value;
  const cognitiveLoad = document.getElementById('cognitive-load-select').value;
  const timePressure = document.getElementById('time-pressure-select').value;
  const seed = document.getElementById('seed-select').value;

  // Store game type in global state
  comparisonData.game = game;

  // Show loading state
  const loadBtn = document.getElementById('load-btn');
  loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i><span>Loading...</span>';
  loadBtn.disabled = true;

  try {
    // Preload sprites for freeway game
    if (game === 'freeway' && !freewaySprites.loaded) {
    await preloadFreewaySprites();
  } else if (game === 'snake' && !snakeSprites.loaded) {
    await preloadSnakeSprites();
  }
    
    // Load data from external files
    await loadComparisonData(game, cognitiveLoad, timePressure, seed);
    
    // Show comparison results
    document.getElementById('comparison-results').style.display = 'block';
    
    // Initialize step display
    updateStepDisplay();
    
    // Scroll to results
    document.getElementById('comparison-results').scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
    
  } catch (error) {
    console.error('Error loading comparison data:', error);
    alert('Failed to load comparison data. Please try again.');
  } finally {
    // Reset button
    loadBtn.innerHTML = '<i class="fas fa-play mr-3"></i><span>Load Comparison</span>';
    loadBtn.disabled = false;
  }
}

// Load data from external files
async function loadComparisonData(game, cognitiveLoad, timePressure, seed) {
  try {
    // 获取正确的基础路径
    const basePath = window.location.hostname === 'bleaves.github.io' 
      ? '/real-time-reasoning/static/data' 
      : 'http://localhost:8000/static/data';
    
    const baseUrl = `${basePath}/${game}_${cognitiveLoad}_${timePressure}_${seed}`;

    console.log('Current location:', window.location.href);
    console.log('Attempting to load:', `${baseUrl}_reactive.json`);

    
    const [reactiveData, planningData, agileData] = await Promise.all([
      fetch(`${baseUrl}_reactive.json`).then(r => {
        if (!r.ok) throw new Error(`Failed to load: ${r.status}`);
        return r.json();
      }),
      fetch(`${baseUrl}_planning.json`).then(r => {
        if (!r.ok) throw new Error(`Failed to load: ${r.status}`);
        return r.json();
      }),
      fetch(`${baseUrl}_agile.json`).then(r => {
        if (!r.ok) throw new Error(`Failed to load: ${r.status}`);
        return r.json();
      })
    ]);
    
    if (reactiveData && planningData && agileData) {
      comparisonData.reactive = reactiveData;
      comparisonData.planning = planningData;
      comparisonData.agile = agileData;
      comparisonData.totalSteps = Math.max(
        reactiveData.length, 
        planningData.length, 
        agileData.length
      );
      comparisonData.currentStep = 0;
      console.log('✓ Successfully loaded real data');
      return;
    }
  } catch (error) {
    console.warn('Failed to load real data, using mock data:', error);
  }
  
  // Fallback: use mock data
  generateMockData();
}

function generateMockData() {
  console.log('Using mock data for demonstration');
  
  comparisonData.totalSteps = 50;
  comparisonData.currentStep = 0;
  
  comparisonData.reactive = Array(50).fill(null).map((_, i) => ({
    step: i,
    score: Math.floor(Math.random() * 100),
    thinking: `Step ${i + 1}: Quick intuitive decision based on pattern recognition.`,
    state: null
  }));
  
  comparisonData.planning = Array(50).fill(null).map((_, i) => ({
    step: i,
    score: Math.floor(Math.random() * 120),
    thinking: `Step ${i + 1}: Analyzing environment thoroughly. Planning optimal path.`,
    state: null
  }));
  
  comparisonData.agile = Array(50).fill(null).map((_, i) => ({
    step: i,
    score: Math.floor(Math.random() * 150),
    thinking: `Step ${i + 1}: Hybrid approach combining fast intuition with deliberate reasoning.`,
    state: null
  }));
}

// Update step display
function updateStepDisplay() {
  const currentStep = comparisonData.currentStep;
  
  // Update step counter
  document.getElementById('current-step').textContent = currentStep + 1;
  document.getElementById('total-steps').textContent = comparisonData.totalSteps;
  
  // Update button states
  document.getElementById('prev-step-btn').disabled = currentStep === 0;
  document.getElementById('next-step-btn').disabled = currentStep === comparisonData.totalSteps - 1;
  
  // Update model displays
  updateModelDisplay('reactive', comparisonData.reactive, currentStep);
  updateModelDisplay('planning', comparisonData.planning, currentStep);
  updateModelDisplay('agile', comparisonData.agile, currentStep);
}

// Update individual model display
function updateModelDisplay(model, dataArray, currentStep) {
  const isGameOver = currentStep >= dataArray.length;
  const data = isGameOver ? dataArray[dataArray.length - 1] : dataArray[currentStep];
  
  // Update score
  document.getElementById(`score-${model}`).textContent = data.score;
  
  // Update thinking process
  const thinkingContent = isGameOver 
    ? '<p class="text-red-600 font-bold text-center py-4">GAME OVER</p>'
    : `<p class="whitespace-pre-wrap">${data.thinking}</p>`;
  document.getElementById(`thinking-content-${model}`).innerHTML = thinkingContent;
  
  // Update canvas
  const canvas = document.getElementById(`game-canvas-${model}`);
  const ctx = canvas.getContext('2d');
  
  // Set canvas size to match container
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  if (data.state) {
    // Render the actual game state with current game type
    renderGameState(ctx, canvas.width, canvas.height, data.state, comparisonData.game);
  } else {
    // Placeholder: draw simple visualization
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#374151';
    ctx.font = '16px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Step ${data.step + 1}`, canvas.width / 2, canvas.height / 2);
  }
  
  // Draw game over overlay if needed
  if (isGameOver) {
    // Semi-transparent gray overlay
    ctx.fillStyle = 'rgba(75, 85, 99, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw "GAME OVER" text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
    
    // Draw final step info
    ctx.font = '14px Inter';
    ctx.fillText(`Final Step: ${dataArray.length}`, canvas.width / 2, canvas.height / 2 + 40);
  }
}

// Render game state on canvas
function renderGameState(ctx, width, height, state, game) {
  if (game === 'freeway') {
    renderFreewayState(ctx, width, height, state);
  } else if (game === 'snake') {
    renderSnakeState(ctx, width, height, state);
  } else {
    // Placeholder for other games
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#374151';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Game: ${game}`, width / 2, height / 2);
  }
}


// Navigate to previous step
function previousStep() {
  if (comparisonData.currentStep > 0) {
    comparisonData.currentStep--;
    updateStepDisplay();
  }
}

// Navigate to next step
function nextStep() {
  if (comparisonData.currentStep < comparisonData.totalSteps - 1) {
    comparisonData.currentStep++;
    updateStepDisplay();
  }
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
  const results = document.getElementById('comparison-results');
  if (results && results.style.display !== 'none') {
    if (e.key === 'ArrowLeft') {
      previousStep();
    } else if (e.key === 'ArrowRight') {
      nextStep();
    }
  }
});

// Export functions for external use if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadComparison,
    toggleThinking,
    previousStep,
    nextStep
  };
}