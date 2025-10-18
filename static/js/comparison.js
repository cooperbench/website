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

//////////////////////////////////////////////////// Begin of Overcooked Rendering ////////////////////////////////////////////////////

let overcookedSprites = {
  loaded: false,
  images: {},
  compositeCache: {}
};

function preloadOvercookedSprites() {
  return new Promise((resolve) => {
    const basePath = 'assets/overcooked/';
    const spriteFiles = {
      'floor': 'floor.png',
      'counter': 'counter.png',
      'pot': 'pot.png',
      'onion_dispenser': 'onion_dispenser.png',
      'tomato_dispenser': 'tomato_dispenser.png',
      'dish_dispenser': 'dish_dispenser.png',
      'serve': 'serve.png',
      'wall': 'wall.png',
      'onion': 'onion.png',
      'tomato': 'tomato.png',
      'dish': 'dish.png',
      'player_NORTH': 'NORTH.png',
      'player_SOUTH': 'SOUTH.png',
      'player_EAST': 'EAST.png',
      'player_WEST': 'WEST.png',
      'player_NORTH_onion': 'NORTH-onion.png',
      'player_SOUTH_onion': 'SOUTH-onion.png',
      'player_EAST_onion': 'EAST-onion.png',
      'player_WEST_onion': 'WEST-onion.png',
      'player_NORTH_tomato': 'NORTH-tomato.png',
      'player_SOUTH_tomato': 'SOUTH-tomato.png',
      'player_EAST_tomato': 'EAST-tomato.png',
      'player_WEST_tomato': 'WEST-tomato.png',
      'player_NORTH_dish': 'NORTH-dish.png',
      'player_SOUTH_dish': 'SOUTH-dish.png',
      'player_EAST_dish': 'EAST-dish.png',
      'player_WEST_dish': 'WEST-dish.png',
      'player_NORTH_soup_onion': 'NORTH-soup-onion.png',
      'player_SOUTH_soup_onion': 'SOUTH-soup-onion.png',
      'player_EAST_soup_onion': 'EAST-soup-onion.png',
      'player_WEST_soup_onion': 'WEST-soup-onion.png',
      'player_NORTH_soup_tomato': 'NORTH-soup-tomato.png',
      'player_SOUTH_soup_tomato': 'SOUTH-soup-tomato.png',
      'player_EAST_soup_tomato': 'EAST-soup-tomato.png',
      'player_WEST_soup_tomato': 'WEST-soup-tomato.png',
      'hat_NORTH_blue': 'NORTH-bluehat.png',
      'hat_SOUTH_blue': 'SOUTH-bluehat.png',
      'hat_EAST_blue': 'EAST-bluehat.png',
      'hat_WEST_blue': 'WEST-bluehat.png',
      'hat_NORTH_green': 'NORTH-greenhat.png',
      'hat_SOUTH_green': 'SOUTH-greenhat.png',
      'hat_EAST_green': 'EAST-greenhat.png',
      'hat_WEST_green': 'WEST-greenhat.png',
      'soup_idle_0_1': 'soup_idle_tomato_0_onion_1.png',
      'soup_idle_0_2': 'soup_idle_tomato_0_onion_2.png',
      'soup_idle_0_3': 'soup_idle_tomato_0_onion_3.png',
      'soup_idle_1_0': 'soup_idle_tomato_1_onion_0.png',
      'soup_idle_1_1': 'soup_idle_tomato_1_onion_1.png',
      'soup_idle_1_2': 'soup_idle_tomato_1_onion_2.png',
      'soup_idle_2_0': 'soup_idle_tomato_2_onion_0.png',
      'soup_idle_2_1': 'soup_idle_tomato_2_onion_1.png',
      'soup_idle_3_0': 'soup_idle_tomato_3_onion_0.png',
      'soup_cooking_0_1': 'soup-onion-1-cooking.png',
      'soup_cooking_0_2': 'soup-onion-2-cooking.png',
      'soup_cooking_0_3': 'soup-onion-3-cooking.png',
      'soup_cooking_1_0': 'soup-tomato-1-cooking.png',
      'soup_cooking_1_1': 'soup-tomato-1-cooking.png',
      'soup_cooking_1_2': 'soup-tomato-2-cooking.png',
      'soup_cooking_2_0': 'soup-tomato-2-cooking.png',
      'soup_cooking_2_1': 'soup-tomato-2-cooking.png',
      'soup_cooking_3_0': 'soup-tomato-3-cooking.png',
      'soup_cooked_0_1': 'soup_cooked_tomato_0_onion_1.png',
      'soup_cooked_0_2': 'soup_cooked_tomato_0_onion_2.png',
      'soup_cooked_0_3': 'soup_cooked_tomato_0_onion_3.png',
      'soup_cooked_1_0': 'soup_cooked_tomato_1_onion_0.png',
      'soup_cooked_1_1': 'soup_cooked_tomato_1_onion_1.png',
      'soup_cooked_1_2': 'soup_cooked_tomato_1_onion_2.png',
      'soup_cooked_2_0': 'soup_cooked_tomato_2_onion_0.png',
      'soup_cooked_2_1': 'soup_cooked_tomato_2_onion_1.png',
      'soup_cooked_3_0': 'soup_cooked_tomato_3_onion_0.png',
      'soup_done_0_1': 'soup_done_tomato_0_onion_1.png',
      'soup_done_0_2': 'soup_done_tomato_0_onion_2.png',
      'soup_done_0_3': 'soup_done_tomato_0_onion_3.png',
      'soup_done_1_0': 'soup_done_tomato_1_onion_0.png',
      'soup_done_1_1': 'soup_done_tomato_1_onion_1.png',
      'soup_done_1_2': 'soup_done_tomato_1_onion_2.png',
      'soup_done_2_0': 'soup_done_tomato_2_onion_0.png',
      'soup_done_2_1': 'soup_done_tomato_2_onion_1.png',
      'soup_done_3_0': 'soup_done_tomato_3_onion_0.png'
    };
    
    let loadedCount = 0;
    const totalCount = Object.keys(spriteFiles).length;
    
    Object.keys(spriteFiles).forEach(name => {
      const img = new Image();
      img.onload = () => {
        overcookedSprites.images[name] = img;
        loadedCount++;
        if (loadedCount === totalCount) {
          overcookedSprites.loaded = true;
          console.log('✓ Overcooked sprites loaded successfully');
          resolve();
        }
      };
      img.onerror = () => {
        console.warn(`Failed to load Overcooked sprite: ${name}`);
        loadedCount++;
        if (loadedCount === totalCount) {
          overcookedSprites.loaded = true;
          resolve();
        }
      };
      img.src = basePath + spriteFiles[name];
    });
  });
}

function createCompositePlayerImage(baseImg, hatImg) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = baseImg.width;
    canvas.height = baseImg.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(baseImg, 0, 0);
    ctx.drawImage(hatImg, 0, 0);
    
    const compositeImg = new Image();
    compositeImg.onload = () => resolve(compositeImg);
    compositeImg.onerror = () => resolve(baseImg);
    compositeImg.src = canvas.toDataURL();
  });
}

async function getPlayerSprite(orientation, heldItem, hatColor) {
  const cacheKey = `${orientation}_${heldItem || 'empty'}_${hatColor}`;
  
  if (overcookedSprites.compositeCache[cacheKey]) {
    return overcookedSprites.compositeCache[cacheKey];
  }
  
  let baseKey = `player_${orientation}`;
  if (heldItem) {
    if (heldItem.startsWith('soup_')) {
      const soupType = heldItem.split('_')[1];
      baseKey = `player_${orientation}_soup_${soupType}`;
    } else {
      baseKey = `player_${orientation}_${heldItem}`;
    }
  }
  
  const baseImg = overcookedSprites.images[baseKey];
  const hatImg = overcookedSprites.images[`hat_${orientation}_${hatColor}`];
  
  if (!baseImg || !hatImg) {
    return baseImg;
  }
  
  const composite = await createCompositePlayerImage(baseImg, hatImg);
  overcookedSprites.compositeCache[cacheKey] = composite;
  return composite;
}

async function renderOvercookedState(ctx, width, height, state) {
  if (!state.terrain_mtx) {
    console.error('Invalid Overcooked state: missing terrain_mtx');
    return;
  }
  
  const rows = state.terrain_mtx.length;
  const cols = state.terrain_mtx[0].length;
  const cellSize = Math.min(width / cols, height / rows);
  
  const offsetX = (width - cols * cellSize) / 2;
  const offsetY = (height - rows * cellSize) / 2;
  
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(0, 0, width, height);
  
  if (!overcookedSprites.loaded) {
    renderOvercookedStateFallback(ctx, width, height, state);
    return;
  }
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;
      const terrainType = state.terrain_mtx[row][col];
      
      let sprite;
      switch (terrainType) {
        case 'X': sprite = overcookedSprites.images['wall']; break;
        case 'P': sprite = overcookedSprites.images['pot']; break;
        case 'O': sprite = overcookedSprites.images['onion_dispenser']; break;
        case 'T': sprite = overcookedSprites.images['tomato_dispenser']; break;
        case 'D': sprite = overcookedSprites.images['dish_dispenser']; break;
        case 'S': sprite = overcookedSprites.images['serve']; break;
        case ' ': sprite = overcookedSprites.images['floor']; break;
        default: sprite = overcookedSprites.images['counter']; break;
      }
      
      if (sprite) {
        ctx.drawImage(sprite, x, y, cellSize, cellSize);
      } else {
        const colors = {
          'X': '#4a5568', 'P': '#805ad5', 'O': '#48bb78', 'T': '#f56565',
          'D': '#ed8936', 'S': '#4299e1', ' ': '#edf2f7'
        };
        ctx.fillStyle = colors[terrainType] || '#cbd5e0';
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }
  
  if (state.objects && Array.isArray(state.objects)) {
    for (const obj of state.objects) {
      const [col, row] = obj.position;
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;
      
      if (obj.name === 'soup') {
        const tomatoCount = obj.ingredients.filter(i => i === 'tomato').length;
        const onionCount = obj.ingredients.filter(i => i === 'onion').length;
        
        let soupKey;
        const isCooking = obj.is_cooking || false;
        const isReady = obj.is_ready || false;
        
        if (!isCooking && !isReady) {
          soupKey = `soup_idle_${tomatoCount}_${onionCount}`;
        } else if (isCooking && !isReady) {
          soupKey = `soup_cooking_${tomatoCount}_${onionCount}`;
        } else if (isReady) {
          soupKey = `soup_cooked_${tomatoCount}_${onionCount}`;
        }
        
        const sprite = overcookedSprites.images[soupKey];
        if (sprite) {
          ctx.drawImage(sprite, x, y, cellSize, cellSize);
        } else {
          ctx.fillStyle = isReady ? '#f6ad55' : isCooking ? '#fc8181' : '#e53e3e';
          ctx.beginPath();
          ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.3, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${cellSize * 0.2}px Inter`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${tomatoCount}T ${onionCount}O`, x + cellSize/2, y + cellSize/2);
        }
      } else {
        const sprite = overcookedSprites.images[obj.name];
        if (sprite) {
          const objSize = cellSize * 0.6;
          ctx.drawImage(sprite, 
            x + (cellSize - objSize) / 2, 
            y + (cellSize - objSize) / 2, 
            objSize, objSize);
        } else {
          const colors = { 'onion': '#48bb78', 'tomato': '#f56565', 'dish': '#cbd5e0' };
          ctx.fillStyle = colors[obj.name] || '#a0aec0';
          ctx.beginPath();
          ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  if (state.players && Array.isArray(state.players)) {
    const hatColors = ['blue', 'green', 'orange', 'purple', 'red'];
    
    for (let i = 0; i < state.players.length; i++) {
      const player = state.players[i];
      const [col, row] = player.position;
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;
      
      const orientation = player.orientation.toUpperCase();
      const hatColor = hatColors[i] || 'blue';
      
      let heldItemKey = null;
      if (player.held_object) {
        const heldName = player.held_object.name;
        if (heldName === 'soup') {
          const ingredients = player.held_object.ingredients || [];
          const hasTomato = ingredients.some(i => i === 'tomato');
          const hasOnion = ingredients.some(i => i === 'onion');
          
          if (hasTomato && hasOnion) {
            heldItemKey = 'soup_tomato';
          } else if (hasTomato) {
            heldItemKey = 'soup_tomato';
          } else if (hasOnion) {
            heldItemKey = 'soup_onion';
          } else {
            heldItemKey = 'dish';
          }
        } else {
          heldItemKey = heldName;
        }
      }
      
      const playerSprite = await getPlayerSprite(orientation, heldItemKey, hatColor);
      
      if (playerSprite) {
        ctx.drawImage(playerSprite, x, y, cellSize, cellSize);
      } else {
        const colors = ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565'];
        ctx.fillStyle = colors[i] || '#a0aec0';
        ctx.beginPath();
        ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.35, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        const dirMap = {
          'NORTH': [0, -0.2], 'SOUTH': [0, 0.2],
          'EAST': [0.2, 0], 'WEST': [-0.2, 0]
        };
        const [dx, dy] = dirMap[orientation] || [0, -0.2];
        ctx.beginPath();
        ctx.arc(x + cellSize/2 + dx * cellSize, y + cellSize/2 + dy * cellSize, 
                cellSize * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(5, 5, 75, 25);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Turn: ${state.game_turn || 0}`, 12, 12);
  // ctx.fillText(`Score: ${state.score || 0}`, 12, 32);
  
  if (state.terminal) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#48bb78';
    ctx.font = 'bold 32px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', width / 2, height / 2);
    ctx.font = '16px Inter';
    ctx.fillText(`Final Score: ${state.score || 0}`, width / 2, height / 2 + 40);
  }
}

function renderOvercookedStateFallback(ctx, width, height, state) {
  const rows = state.terrain_mtx.length;
  const cols = state.terrain_mtx[0].length;
  const cellSize = Math.min(width / cols, height / rows);
  
  const offsetX = (width - cols * cellSize) / 2;
  const offsetY = (height - rows * cellSize) / 2;
  
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(0, 0, width, height);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;
      const terrainType = state.terrain_mtx[row][col];
      
      const colors = {
        'X': '#4a5568', 'P': '#805ad5', 'O': '#48bb78', 'T': '#f56565',
        'D': '#ed8936', 'S': '#4299e1', ' ': '#edf2f7'
      };
      ctx.fillStyle = colors[terrainType] || '#cbd5e0';
      ctx.fillRect(x, y, cellSize, cellSize);
      
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize, cellSize);
      
      if (terrainType !== ' ' && terrainType !== 'X') {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${cellSize * 0.3}px Inter`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(terrainType, x + cellSize/2, y + cellSize/2);
      }
    }
  }
  
  if (state.objects) {
    state.objects.forEach(obj => {
      const [col, row] = obj.position;
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;
      
      if (obj.name === 'soup') {
        const isCooking = obj.is_cooking || false;
        const isReady = obj.is_ready || false;
        ctx.fillStyle = isReady ? '#f6ad55' : isCooking ? '#fc8181' : '#e53e3e';
      } else {
        const colors = { 'onion': '#48bb78', 'tomato': '#f56565', 'dish': '#cbd5e0' };
        ctx.fillStyle = colors[obj.name] || '#a0aec0';
      }
      
      ctx.beginPath();
      ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.25, 0, Math.PI * 2);
      ctx.fill();
      
      if (obj.name === 'soup' && obj.ingredients) {
        const tomatoCount = obj.ingredients.filter(i => i === 'tomato').length;
        const onionCount = obj.ingredients.filter(i => i === 'onion').length;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${cellSize * 0.15}px Inter`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${tomatoCount}T ${onionCount}O`, x + cellSize/2, y + cellSize/2);
      }
    });
  }
  
  if (state.players) {
    const colors = ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565'];
    state.players.forEach((player, index) => {
      const [col, row] = player.position;
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;
      
      ctx.fillStyle = colors[index] || '#a0aec0';
      ctx.beginPath();
      ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${cellSize * 0.25}px Inter`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(index + 1, x + cellSize/2, y + cellSize/2);
      
      if (player.held_object) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${cellSize * 0.15}px Inter`;
        ctx.fillText(player.held_object.name.substring(0, 1).toUpperCase(), 
                     x + cellSize * 0.7, y + cellSize * 0.3);
      }
    });
  }
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(5, 5, 75, 25);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Turn: ${state.game_turn || 0}`, 12, 12);
  // ctx.fillText(`Score: ${state.score || 0}`, 12, 32);
  
  if (state.terminal) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#48bb78';
    ctx.font = 'bold 32px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', width / 2, height / 2);
    ctx.font = '16px Inter';
    ctx.fillText(`Final Score: ${state.score || 0}`, width / 2, height / 2 + 40);
  }
}

//////////////////////////////////////////////////// End of Overcooked Rendering ////////////////////////////////////////////////////


//////////////////////////////////////////////////// Begin of Snake Rendering ////////////////////////////////////////////////////
let snakeSprites = {
  loaded: false,
  images: {},
  pendingLoads: 0,
  failedLoads: []
};

const DEBUG_CONFIG = {
  enabled: true,
  logRendering: true,
  logStateChanges: true,
  highlightUpdates: true,
  logDirections: true
};

let lastRenderState = {};

function debugLog(category, message, data = null) {
  if (!DEBUG_CONFIG.enabled) return;
  
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const prefix = `[${timestamp}][${category}]`;
  
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

function compareStates(oldState, newState, agentName) {
  if (!DEBUG_CONFIG.logStateChanges) return;
  
  const changes = [];
  
  if (JSON.stringify(oldState.snake) !== JSON.stringify(newState.snake)) {
    changes.push(`Snake moved: ${JSON.stringify(newState.snake?.[0])} (head)`);
  }
  
  const oldTurn = oldState.game_turn ?? oldState.turn ?? 0;
  const newTurn = newState.game_turn ?? newState.turn ?? 0;
  if (oldTurn !== newTurn) {
    changes.push(`Turn: ${oldTurn} → ${newTurn}`);
  }
  
  if (oldState.direction !== newState.direction) {
    changes.push(`Direction: ${oldState.direction} → ${newState.direction}`);
  }
  
  if (JSON.stringify(oldState.food) !== JSON.stringify(newState.food)) {
    changes.push(`Food changed: ${newState.food?.length || 0} items`);
  }
  
  if (oldState.terminal !== newState.terminal) {
    changes.push(`Terminal: ${oldState.terminal} → ${newState.terminal}`);
  }
  
  if (changes.length > 0) {
    debugLog(agentName, '🔄 State Changes:', changes);
  } else {
    debugLog(agentName, '⚠️ No state changes detected!');
  }
}

function isImageValid(img) {
  if (!img) return false;
  if (img.complete === false) return false;
  if (img.naturalWidth === 0) return false;
  return true;
}

function rotateImage(img, degrees) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(degrees * Math.PI / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    
    const rotatedImg = new Image();
    rotatedImg.onload = () => resolve(rotatedImg);
    rotatedImg.onerror = () => {
      debugLog('LOADER', `❌ Failed to create rotated image (${degrees}°)`);
      resolve(null);
    };
    rotatedImg.src = canvas.toDataURL();
  });
}

function preloadSnakeSprites() {
  return new Promise((resolve) => {
    debugLog('LOADER', '📦 Starting sprite preload...');
    
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
    const asyncTasks = [];
    
    Object.keys(spriteFiles).forEach(name => {
      const img = new Image();
      
      img.onload = async () => {
        if (!isImageValid(img)) {
          debugLog('LOADER', `❌ Image loaded but invalid: ${name}`);
          snakeSprites.failedLoads.push(name);
          loadedCount++;
          checkCompletion();
          return;
        }
        
        debugLog('LOADER', `✓ Loaded: ${name}`);
        
        if (name === 'head_down') {
          snakeSprites.images['head_down'] = img;
          
          const task = (async () => {
            debugLog('LOADER', '↻ Rotating head sprites...');
            const [up, left, right] = await Promise.all([
              rotateImage(img, 180),
              rotateImage(img, -90),
              rotateImage(img, 90)
            ]);
            
            if (up) snakeSprites.images['head_up'] = up;
            if (left) snakeSprites.images['head_left'] = left;
            if (right) snakeSprites.images['head_right'] = right;
            debugLog('LOADER', '✓ Head rotations complete');
          })();
          asyncTasks.push(task);
          
        } else if (name === 'snake_sheet') {
          const task = (async () => {
            debugLog('LOADER', '✂️ Processing sprite sheet...');
            await processSnakeSpriteSheet(img);
            debugLog('LOADER', '✓ Sprite sheet complete');
          })();
          asyncTasks.push(task);
          
        } else {
          snakeSprites.images[name] = img;
        }
        
        loadedCount++;
        checkCompletion();
      };
      
      img.onerror = () => {
        debugLog('LOADER', `❌ Failed to load: ${name}`);
        snakeSprites.failedLoads.push(name);
        loadedCount++;
        checkCompletion();
      };
      
      img.src = basePath + spriteFiles[name];
    });
    
    async function checkCompletion() {
      if (loadedCount === totalCount) {
        debugLog('LOADER', '⏳ Waiting for async processing...');
        
        await Promise.all(asyncTasks);
        
        const criticalSprites = ['snake_sheet'];
        const criticalFailed = criticalSprites.some(s => snakeSprites.failedLoads.includes(s));
        
        if (criticalFailed || snakeSprites.failedLoads.length === totalCount) {
          debugLog('LOADER', '⚠️ Critical sprites failed, using fallback');
          snakeSprites.loaded = false;
        } else {
          snakeSprites.loaded = true;
          debugLog('LOADER', '✅ All sprites ready!');
        }
        
        debugLog('LOADER', 'Failed loads:', snakeSprites.failedLoads);
        debugLog('LOADER', 'Available sprites:', Object.keys(snakeSprites.images));
        resolve();
      }
    }
  });
}

async function processSnakeSpriteSheet(sheet) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const spriteWidth = sheet.width / 2;
  const spriteHeight = sheet.height / 2;
  
  canvas.width = spriteWidth;
  canvas.height = spriteHeight;
  
  const extractSprite = (sx, sy) => {
    return new Promise((resolve) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sheet, sx, sy, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = canvas.toDataURL();
    });
  };
  
  const headUp = await extractSprite(0, 0);
  if (headUp) {
    snakeSprites.images['snake_head_up'] = headUp;
    const [left, down, right] = await Promise.all([
      rotateImage(headUp, -90),
      rotateImage(headUp, 180),
      rotateImage(headUp, 90)
    ]);
    if (right) snakeSprites.images['snake_head_right'] = right;
    if (down) snakeSprites.images['snake_head_down'] = down;
    if (left) snakeSprites.images['snake_head_left'] = left;
  }
  
  const straightVert = await extractSprite(spriteWidth, 0);
  if (straightVert) {
    snakeSprites.images['straight_vertical'] = straightVert;
    const horiz = await rotateImage(straightVert, 90);
    if (horiz) snakeSprites.images['straight_horizontal'] = horiz;
  }
  
  const tailLeft = await extractSprite(0, spriteHeight);
  if (tailLeft) {
    const [up, right, down] = await Promise.all([
      rotateImage(tailLeft, -90),
      rotateImage(tailLeft, 180),
      rotateImage(tailLeft, 90)
    ]);

    snakeSprites.images['tail_right'] = tailLeft;
    if (up) snakeSprites.images['tail_up'] = up;
    if (right) snakeSprites.images['tail_left'] = right;
    if (down) snakeSprites.images['tail_down'] = down;
  }
  
  const turnUpLeft = await extractSprite(spriteWidth, spriteHeight);
  if (turnUpLeft) {
    const [upRight, downRight, downLeft] = await Promise.all([
      rotateImage(turnUpLeft, -90),
      rotateImage(turnUpLeft, 180),
      rotateImage(turnUpLeft, 90)
    ]);
    snakeSprites.images['turn_up_left'] = turnUpLeft;
    if (upRight) snakeSprites.images['turn_down_left'] = upRight;
    if (downRight) snakeSprites.images['turn_down_right'] = downRight;
    if (downLeft) snakeSprites.images['turn_up_right'] = downLeft;
  }
}

function getSnakeBodySprite(prevPos, currPos, nextPos, segmentIndex) {
  if (!prevPos || !nextPos) {
    if (DEBUG_CONFIG.logDirections) {
      debugLog('DIRECTION', `⚠️ Body segment ${segmentIndex}: Missing neighbor, using default horizontal`);
    }
    return snakeSprites.images['straight_horizontal'];
  }
  
  const fromDir = [prevPos[0] - currPos[0], prevPos[1] - currPos[1]];
  const toDir = [nextPos[0] - currPos[0], nextPos[1] - currPos[1]];
  
  if (DEBUG_CONFIG.logDirections) {
    debugLog('DIRECTION', `📍 Body segment ${segmentIndex}:`, {
      prev: prevPos,
      curr: currPos,
      next: nextPos,
      fromDir: fromDir,
      toDir: toDir,
      fromDirStr: `(${fromDir[0]}, ${fromDir[1]})`,
      toDirStr: `(${toDir[0]}, ${toDir[1]})`
    });
  }
  
  if (fromDir[0] === 0 && toDir[0] === 0) {
    if (DEBUG_CONFIG.logDirections) {
      debugLog('DIRECTION', `  → Vertical straight line`);
    }
    return snakeSprites.images['straight_vertical'];
  }
  if (fromDir[1] === 0 && toDir[1] === 0) {
    if (DEBUG_CONFIG.logDirections) {
      debugLog('DIRECTION', `  → Horizontal straight line`);
    }
    return snakeSprites.images['straight_horizontal'];
  }
  
  const dirKey = `${fromDir[0]},${fromDir[1]}_${toDir[0]},${toDir[1]}`;
  
  const turnMap = {
    '1,0_0,1': 'turn_up_right',
    '0,1_1,0': 'turn_up_right',
    '-1,0_0,1': 'turn_up_left',
    '0,1_-1,0': 'turn_up_left',
    '1,0_0,-1': 'turn_down_right',
    '0,-1_1,0': 'turn_down_right',
    '-1,0_0,-1': 'turn_down_left',
    '0,-1_-1,0': 'turn_down_left'
  };
  
  const spriteName = turnMap[dirKey];
  
  if (DEBUG_CONFIG.logDirections) {
    if (spriteName) {
      debugLog('DIRECTION', `  → Turn detected: ${spriteName} (key: ${dirKey})`);
    } else {
      debugLog('DIRECTION', `  ⚠️ Unknown turn pattern: ${dirKey}, using default`);
    }
  }
  
  return snakeSprites.images[spriteName] || snakeSprites.images['straight_horizontal'];
}

function getSnakeTailSprite(prevPos, currPos) {
  if (!prevPos) {
    if (DEBUG_CONFIG.logDirections) {
      debugLog('DIRECTION', '⚠️ Tail: No previous position, using default left');
    }
    return snakeSprites.images['tail_left'];
  }
  
  const dx = prevPos[0] - currPos[0];
  const dy = prevPos[1] - currPos[1];
  
  if (DEBUG_CONFIG.logDirections) {
    debugLog('DIRECTION', `🎯 Tail:`, {
      prev: prevPos,
      curr: currPos,
      direction: `(${dx}, ${dy})`,
      interpretation: dx > 0 ? 'pointing right' : dx < 0 ? 'pointing left' : dy > 0 ? 'pointing up' : 'pointing down'
    });
  }
  
  const dirMap = {
    '1,0': 'tail_right',
    '-1,0': 'tail_left',
    '0,1': 'tail_up',
    '0,-1': 'tail_down'
  };
  
  const dirKey = `${dx},${dy}`;
  const spriteName = dirMap[dirKey];
  
  if (DEBUG_CONFIG.logDirections) {
    if (spriteName) {
      debugLog('DIRECTION', `  → Tail sprite: ${spriteName}`);
    } else {
      debugLog('DIRECTION', `  ⚠️ Unknown tail direction: ${dirKey}, using default`);
    }
  }
  
  return snakeSprites.images[spriteName] || snakeSprites.images['tail_left'];
}

function drawLifeBar(ctx, life, maxLife, x, y, cellSize) {
  const barWidth = cellSize - 4;
  const barHeight = 6;
  const barX = x + 2;
  const barY = y + 10;
  
  ctx.fillStyle = 'rgb(100, 0, 0)';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  const lifeRatio = Math.max(0, life / maxLife);
  if (lifeRatio > 0) {
    const lifeWidth = barWidth * lifeRatio;
    
    if (lifeRatio > 0.6) {
      ctx.fillStyle = 'rgb(0, 255, 0)';
    } else if (lifeRatio > 0.3) {
      ctx.fillStyle = 'rgb(255, 255, 0)';
    } else {
      ctx.fillStyle = 'rgb(255, 0, 0)';
    }
    
    ctx.fillRect(barX, barY, lifeWidth, barHeight);
  }
  
  ctx.strokeStyle = 'rgb(255, 255, 255)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
}

function safeDrawImage(ctx, img, x, y, width, height) {
  try {
    if (!isImageValid(img)) {
      return false;
    }
    ctx.drawImage(img, x, y, width, height);
    return true;
  } catch (e) {
    debugLog('RENDER', '❌ drawImage error:', e.message);
    return false;
  }
}

function renderSnakeState(ctx, width, height, state, agentName = 'UNKNOWN') {
  const BOARD_SIZE = 8;
  const cellSize = width / BOARD_SIZE;
  
  const turnNum = state.game_turn !== undefined ? state.game_turn : (state.turn || 0);
  
  debugLog('RENDER', `State for ${agentName}:`, {
    snakeLength: state.snake?.length,
    snakeHead: state.snake?.[0],
    direction: state.direction,
    food: state.food?.length,
    obstacles: state.obstacles?.length,
    terminal: state.terminal
  });
  
  
  const lastKey = `${agentName}_last`;
  if (lastRenderState[lastKey]) {
    compareStates(lastRenderState[lastKey], state, agentName);
  }
  lastRenderState[lastKey] = JSON.parse(JSON.stringify(state));
  
  ctx.clearRect(0, 0, width, height);
  
  if (!snakeSprites.loaded) {
    debugLog('RENDER', `⚠️ Using fallback for ${agentName}`);
    renderSnakeStateFallback(ctx, width, height, state);
    return;
  }
  
  ctx.fillStyle = 'rgb(0, 51, 51)';
  ctx.fillRect(0, 0, width, height);
  
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (i === 0 || i === BOARD_SIZE - 1 || j === 0 || j === BOARD_SIZE - 1) continue;
      
      const x = j * cellSize;
      const y = (BOARD_SIZE - 1 - i) * cellSize;
      ctx.fillStyle = (i + j) % 2 === 0 ? 'rgb(0, 77, 77)' : 'rgb(0, 102, 102)';
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
  
  if (state.obstacles && Array.isArray(state.obstacles)) {
    state.obstacles.forEach(([ox, oy]) => {
      const x = ox * cellSize;
      const y = (BOARD_SIZE - 1 - oy) * cellSize;
      if (!safeDrawImage(ctx, snakeSprites.images['obstacle'], x, y, cellSize, cellSize)) {
        ctx.fillStyle = 'rgb(139, 69, 19)';
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    });
  }
  
  if (state.food && Array.isArray(state.food)) {
    state.food.forEach(food => {
      const [fx, fy, life, value] = food;
      if (life > 0) {
        const x = fx * cellSize;
        const y = (BOARD_SIZE - 1 - fy) * cellSize;
        
        if (!safeDrawImage(ctx, snakeSprites.images['apple'], x, y, cellSize, cellSize)) {
          ctx.fillStyle = 'rgb(255, 0, 0)';
          ctx.beginPath();
          ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        drawLifeBar(ctx, life, 12, x, y, cellSize);
      }
    });
  }
  
  if (state.snake && Array.isArray(state.snake) && state.snake.length > 0) {
    const snakeArray = state.snake;
    
    if (DEBUG_CONFIG.logDirections) {
      debugLog('DIRECTION', `\n========== RENDERING SNAKE (${agentName}) ==========`);
    }
    
    snakeArray.forEach((pos, i) => {
      const [sx, sy] = pos;
      const x = sx * cellSize;
      const y = (BOARD_SIZE - 1 - sy) * cellSize;
      
      if (DEBUG_CONFIG.logDirections) {
        debugLog('DIRECTION', `Rendering position [${sx}, ${sy}] → canvas (${x.toFixed(1)}, ${y.toFixed(1)}), Y-flip: ${BOARD_SIZE - 1 - sy}`);
      }
      
      if (i === 0) {
        const dirMap = { 'R': 'right', 'D': 'down', 'L': 'left', 'U': 'up' };
        const dir = dirMap[state.direction] || 'up';

        // const headSprite = snakeArray.length === 1 
        //   ? snakeSprites.images[`head_${dir}`]
        //   : snakeSprites.images[`snake_head_${dir}`];
        const headSprite = snakeSprites.images[`snake_head_${dir}`];
        
        if (DEBUG_CONFIG.logDirections) {
          debugLog('DIRECTION', `👑 HEAD (segment 0): direction=${state.direction} → ${dir}`);
        }
        
        if (!safeDrawImage(ctx, headSprite, x, y, cellSize, cellSize)) {
          ctx.fillStyle = 'rgb(0, 200, 0)';
          ctx.beginPath();
          ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (i === snakeArray.length - 1) {
        const prevPos = snakeArray.length > 1 ? snakeArray[i - 1] : null;
        const tailSprite = getSnakeTailSprite(prevPos, pos);
        if (!safeDrawImage(ctx, tailSprite, x, y, cellSize, cellSize)) {
          ctx.fillStyle = 'rgb(0, 150, 0)';
          ctx.beginPath();
          ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const prevPos = i > 0 ? snakeArray[i - 1] : null;
        const nextPos = i < snakeArray.length - 1 ? snakeArray[i + 1] : null;
        const bodySprite = getSnakeBodySprite(prevPos, pos, nextPos, i);
        if (!safeDrawImage(ctx, bodySprite, x, y, cellSize, cellSize)) {
          ctx.fillStyle = 'rgb(0, 180, 0)';
          ctx.beginPath();
          ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    
    if (DEBUG_CONFIG.logDirections) {
      debugLog('DIRECTION', `========== END SNAKE RENDERING ==========\n`);
    }
  }
  
  if (state.show_thinking !== undefined && state.show_thinking !== null && state.snake && state.snake.length > 0) {
    const [headX, headY] = state.snake[0];
    const x = headX * cellSize + cellSize * 0.7;
    const y = (BOARD_SIZE - 1 - headY) * cellSize - cellSize * 0.5;
    
    const iconName = state.show_thinking ? 'thinking' : 'idea';
    const iconSize = cellSize * 0.8;
    safeDrawImage(ctx, snakeSprites.images[iconName], x, y, iconSize, iconSize);
  }
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(5, 5, 120, 30);
  
  if (DEBUG_CONFIG.highlightUpdates && lastRenderState[lastKey + '_prev']) {
    const prevTurn = lastRenderState[lastKey + '_prev'].game_turn || 0;
    if (prevTurn !== turnNum) {
      ctx.strokeStyle = 'rgb(0, 255, 0)';
      ctx.lineWidth = 2;
      ctx.strokeRect(3, 3, 124, 34);
    }
  }
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Turn: ${turnNum}`, 12, 12);
  
  lastRenderState[lastKey + '_prev'] = { game_turn: turnNum };
  
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
  
  debugLog('RENDER', `✅ Complete for ${agentName}`);
}

function renderSnakeStateFallback(ctx, width, height, state) {
  const BOARD_SIZE = 8;
  const cellSize = width / BOARD_SIZE;
  
  ctx.fillStyle = 'rgb(0, 51, 51)';
  ctx.fillRect(0, 0, width, height);
  
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (i === 0 || i === BOARD_SIZE - 1 || j === 0 || j === BOARD_SIZE - 1) continue;
      
      const x = j * cellSize;
      const y = (BOARD_SIZE - 1 - i) * cellSize;
      ctx.fillStyle = (i + j) % 2 === 0 ? 'rgb(0, 77, 77)' : 'rgb(0, 102, 102)';
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
  
  if (state.obstacles) {
    ctx.fillStyle = 'rgb(139, 69, 19)';
    state.obstacles.forEach(([ox, oy]) => {
      const x = ox * cellSize;
      const y = (BOARD_SIZE - 1 - oy) * cellSize;
      ctx.fillRect(x, y, cellSize, cellSize);
    });
  }
  
  if (state.food) {
    state.food.forEach(([fx, fy, life, value]) => {
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
  
  if (state.snake) {
    state.snake.forEach(([sx, sy], i) => {
      const x = sx * cellSize + cellSize / 2;
      const y = (BOARD_SIZE - 1 - sy) * cellSize + cellSize / 2;
      const radius = i === 0 ? cellSize * 0.35 : cellSize * 0.3;
      ctx.fillStyle = i === 0 ? 'rgb(0, 255, 0)' : 'rgb(0, 200, 0)';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      if (i === 0) {
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.beginPath();
        ctx.arc(x - 5, y - 3, 2, 0, Math.PI * 2);
        ctx.arc(x + 5, y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(5, 5, 120, 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const turnNum = state.game_turn !== undefined ? state.game_turn : (state.turn || 0);
  ctx.fillText(`Turn: ${turnNum}`, 12, 12);
}

window.snakeDebug = {
  enable: () => { 
    DEBUG_CONFIG.enabled = true; 
    console.log('🐛 Debug enabled'); 
  },
  disable: () => { 
    DEBUG_CONFIG.enabled = false; 
    console.log('🐛 Debug disabled'); 
  },
  toggleRendering: () => { 
    DEBUG_CONFIG.logRendering = !DEBUG_CONFIG.logRendering; 
    console.log('🎨 Rendering logs:', DEBUG_CONFIG.logRendering ? 'ON' : 'OFF');
  },
  toggleStateChanges: () => { 
    DEBUG_CONFIG.logStateChanges = !DEBUG_CONFIG.logStateChanges; 
    console.log('🔄 State change logs:', DEBUG_CONFIG.logStateChanges ? 'ON' : 'OFF');
  },
  toggleDirections: () => {
    DEBUG_CONFIG.logDirections = !DEBUG_CONFIG.logDirections;
    console.log('🧭 Direction logs:', DEBUG_CONFIG.logDirections ? 'ON' : 'OFF');
  },
  enableDirectionsOnly: () => {
    DEBUG_CONFIG.enabled = true;
    DEBUG_CONFIG.logRendering = false;
    DEBUG_CONFIG.logStateChanges = false;
    DEBUG_CONFIG.logDirections = true;
    console.log('🎯 Direction-only debug mode enabled');
  },
  getLastStates: () => lastRenderState,
  clearHistory: () => { 
    lastRenderState = {}; 
    console.log('🗑️ History cleared'); 
  },
  getSpriteStatus: () => {
    console.log('Sprite Status:', {
      loaded: snakeSprites.loaded,
      failedLoads: snakeSprites.failedLoads,
      availableSprites: Object.keys(snakeSprites.images),
      pendingLoads: snakeSprites.pendingLoads
    });
  },
  help: () => {
    console.log(`
🐛 Snake Debug Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
snakeDebug.enable()              - 启用所有调试
snakeDebug.disable()             - 禁用所有调试
snakeDebug.toggleRendering()     - 切换渲染日志
snakeDebug.toggleStateChanges()  - 切换状态变化日志
snakeDebug.toggleDirections()    - 切换方向调试日志
snakeDebug.enableDirectionsOnly() - 只启用方向调试
snakeDebug.getSpriteStatus()     - 查看精灵加载状态
snakeDebug.getLastStates()       - 获取最后的状态
snakeDebug.clearHistory()        - 清除历史记录
snakeDebug.help()                - 显示此帮助
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }
};
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
  } else if (game === 'overcooked' && !overcookedSprites.loaded) {
    await preloadOvercookedSprites();
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


// Extract content from last \boxed{} in text

// Extract content from last \boxed{} in text
function extractBoxedContent(text) {
  if (!text) return 'Keep';
  
  // Find all \boxed{ positions
  const boxedPositions = [];
  let index = 0;
  while ((index = text.indexOf('\\boxed{', index)) !== -1) {
    boxedPositions.push(index);
    index += 7; // length of '\boxed{'
  }
  
  if (boxedPositions.length === 0) {
    return 'Keep';
  }
  
  // Extract content from the last \boxed{...} with proper brace matching
  const lastBoxedPos = boxedPositions[boxedPositions.length - 1];
  const startPos = lastBoxedPos + 7; // position after '\boxed{'
  
  // Count braces to find the matching closing brace
  let braceCount = 1;
  let endPos = startPos;
  
  while (endPos < text.length && braceCount > 0) {
    if (text[endPos] === '{') {
      braceCount++;
    } else if (text[endPos] === '}') {
      braceCount--;
    }
    endPos++;
  }
  
  if (braceCount !== 0) {
    // Unmatched braces, return Keep
    return 'Keep';
  }
  
  // Extract the content (excluding the final closing brace)
  let result_text = text.substring(startPos, endPos - 1);
  
  console.log('Extracted boxed content:', result_text);

  // Extract only the action letters (L, R, U, D, S, I)
  const actions = result_text.match(/[LRUDSI]/g);
  
  if (!actions || actions.length === 0) {
    return 'Keep';
  }

  // Convert letters to full action names and join with spaces
  result_text = actions.map(letter => {
    switch(letter) {
      case 'S': return 'Stay';
      case 'L': return 'Left';
      case 'R': return 'Right';
      case 'U': return 'Up';
      case 'D': return 'Down';
      case 'I': return 'Interact';
      default: return letter;
    }
  }).join(' ');

  console.log('Result:', result_text);
  return result_text;
}

// Update individual model display
function updateModelDisplay(model, dataArray, currentStep) {
  const isGameOver = currentStep >= dataArray.length;
  const data = isGameOver ? dataArray[dataArray.length - 1] : dataArray[currentStep];
  
  // Update score
  document.getElementById(`score-${model}`).textContent = data.score;
  
  // Update thinking result
  const thinkingResult = extractBoxedContent(data.thinking);
  document.getElementById(`thinking-result-${model}`).textContent = thinkingResult;
  
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
  } else if (game === 'overcooked') {
    renderOvercookedState(ctx, width, height, state);
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