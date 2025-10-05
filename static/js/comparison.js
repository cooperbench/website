// Global state for comparison data
let comparisonData = {
  currentStep: 0,
  totalSteps: 0,
  reactive: [],
  planning: [],
  agile: []
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

  // Show loading state
  const loadBtn = document.getElementById('load-btn');
  loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-3"></i><span>Loading...</span>';
  loadBtn.disabled = true;

  try {
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
    // Render the actual game state
    renderGameState(ctx, canvas.width, canvas.height, data.state);
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

// Render game state on canvas (TODO: implement for each game type)
function renderGameState(ctx, width, height, state) {
  // This function should be customized based on the game type
  // For now, just a placeholder
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, width, height);
  
  // TODO: Add game-specific rendering logic
  // Example for Snake:
  // - Draw grid
  // - Draw snake body
  // - Draw food
  // - Draw obstacles
  
  // Example for Freeway:
  // - Draw road
  // - Draw cars
  // - Draw player
  
  // Example for Overcooked:
  // - Draw kitchen layout
  // - Draw ingredients
  // - Draw player position
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