// Engagement features for RealtimeGym website

// Social Sharing
function shareConfiguration() {
  const game = document.getElementById('game-select').value;
  const seed = document.getElementById('seed-select').value;
  const cognitiveLoad = document.getElementById('cognitive-load-select').value;
  const timePressure = document.getElementById('time-pressure-select').value;

  const cognitiveLoadLabels = ['Easy', 'Medium', 'Hard'];
  const timePressureLabels = ['Low', 'Moderate', 'High', 'Extreme'];

  const gameNames = {
    'freeway': 'Freeway',
    'snake': 'Snake',
    'overcooked': 'Overcooked'
  };

  const shareText = `Check out this Real-Time Reasoning challenge: ${gameNames[game]} with ${cognitiveLoadLabels[cognitiveLoad]} cognitive load and ${timePressureLabels[timePressure]} time pressure! Can AgileThinker handle it?`;
  const url = `${window.location.origin}${window.location.pathname}#interactive-demo`;

  // Try to use native Web Share API first (mobile)
  if (navigator.share) {
    navigator.share({
      title: 'Real-Time Reasoning Challenge',
      text: shareText,
      url: url
    }).then(() => {
      showToast('Configuration shared successfully!', 'success');
    }).catch((error) => {
      if (error.name !== 'AbortError') {
        fallbackShare(shareText, url);
      }
    });
  } else {
    fallbackShare(shareText, url);
  }
}

function fallbackShare(text, url) {
  // Create a modal with sharing options
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-gray-900">Share Configuration</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
      </div>
      <p class="text-gray-600 mb-4 text-sm">${text}</p>
      <div class="flex flex-col gap-3">
        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}" target="_blank"
           class="inline-flex items-center justify-center px-4 py-3 bg-blue-400 text-white font-semibold rounded-lg hover:bg-blue-500 transition-colors">
          <i class="fab fa-twitter mr-2"></i> Share on Twitter
        </a>
        <button onclick="copyToClipboard('${url}'); showToast('Link copied!', 'success'); this.closest('.fixed').remove();"
                class="inline-flex items-center justify-center px-4 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors">
          <i class="fas fa-link mr-2"></i> Copy Link
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}

// Toast notification system
function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const colors = {
    'success': 'bg-green-500',
    'error': 'bg-red-500',
    'info': 'bg-blue-500'
  };

  const icons = {
    'success': 'fa-check-circle',
    'error': 'fa-exclamation-circle',
    'info': 'fa-info-circle'
  };

  const toast = document.createElement('div');
  toast.className = `toast-notification fixed bottom-24 right-8 ${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-fade-in-up`;
  toast.innerHTML = `
    <i class="fas ${icons[type]} text-xl"></i>
    <span class="font-semibold">${message}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Scroll-triggered animations
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe all sections with reveal-on-scroll class
  document.querySelectorAll('.reveal-on-scroll').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
  });
}

// Progress tracking
let explorationProgress = {
  gamesViewed: new Set(),
  settingsChanged: 0,
  sectionsViewed: new Set()
};

function trackGameChange(game) {
  explorationProgress.gamesViewed.add(game);
  explorationProgress.settingsChanged++;
  updateProgressIndicator();

  // Show achievement for trying all games
  if (explorationProgress.gamesViewed.size === 3) {
    showAchievement('Explorer', 'You\'ve tried all three games!');
  }

  // Show thinking prompt every 5 setting changes
  if (explorationProgress.settingsChanged % 5 === 0 && explorationProgress.settingsChanged > 0) {
    showThinkingPrompt();
  }
}

function showThinkingPrompt() {
  const prompts = [
    "Which agent do you think will perform best in this scenario?",
    "Do you notice how the agents adapt to different time pressures?",
    "Can you spot the moment when AgileThinker switches strategies?",
    "What happens when cognitive load increases? Watch the reasoning patterns!",
    "Compare the agent scores - does the winner surprise you?"
  ];

  const prompt = prompts[Math.floor(Math.random() * prompts.length)];

  const promptBox = document.createElement('div');
  promptBox.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 max-w-md w-full p-6 border-4 border-blue-500 animate-fade-in-up';
  promptBox.innerHTML = `
    <div class="text-center">
      <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <i class="fas fa-brain text-white text-2xl"></i>
      </div>
      <h3 class="text-xl font-bold text-gray-900 mb-3">Think About It</h3>
      <p class="text-gray-700 mb-6">${prompt}</p>
      <button onclick="this.closest('.fixed').remove()" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl">
        Got it!
      </button>
    </div>
  `;

  // Add backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-40';
  backdrop.onclick = () => {
    promptBox.remove();
    backdrop.remove();
  };

  document.body.appendChild(backdrop);
  document.body.appendChild(promptBox);
}

function trackSectionView(sectionId) {
  explorationProgress.sectionsViewed.add(sectionId);
  updateProgressIndicator();
}

function updateProgressIndicator() {
  let progressBar = document.getElementById('exploration-progress');

  if (!progressBar) {
    // Create progress indicator
    progressBar = document.createElement('div');
    progressBar.id = 'exploration-progress';
    progressBar.className = 'fixed top-16 left-0 right-0 h-2 bg-gray-200 z-50';
    progressBar.innerHTML = '<div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" style="width: 0%"></div>';
    document.body.appendChild(progressBar);
    console.log('Progress bar created');
  }

  const totalItems = 6; // 3 games + 3 key sections
  const completed = explorationProgress.gamesViewed.size + Math.min(explorationProgress.sectionsViewed.size, 3);
  const percentage = Math.round((completed / totalItems) * 100);

  console.log('Progress update:', {
    gamesViewed: Array.from(explorationProgress.gamesViewed),
    sectionsViewed: Array.from(explorationProgress.sectionsViewed),
    completed,
    percentage
  });

  progressBar.querySelector('div').style.width = `${percentage}%`;

  // Show milestone messages
  if (percentage === 50 && !sessionStorage.getItem('milestone50')) {
    showToast('Halfway there! Keep exploring 🎉', 'success');
    sessionStorage.setItem('milestone50', 'true');
  } else if (percentage === 100 && !sessionStorage.getItem('milestone100')) {
    showAchievement('Master Explorer', 'You\'ve explored everything on this page!');
    sessionStorage.setItem('milestone100', 'true');
  }
}

function showAchievement(title, description) {
  const achievement = document.createElement('div');
  achievement.className = 'fixed top-24 right-8 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50 max-w-sm animate-fade-in-up';
  achievement.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0">
        <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
          <i class="fas fa-trophy text-2xl"></i>
        </div>
      </div>
      <div>
        <h4 class="font-bold text-lg mb-1">Achievement Unlocked!</h4>
        <p class="text-sm opacity-90"><strong>${title}:</strong> ${description}</p>
      </div>
    </div>
  `;

  document.body.appendChild(achievement);

  setTimeout(() => {
    achievement.style.opacity = '0';
    achievement.style.transform = 'translateX(400px)';
    achievement.style.transition = 'all 0.5s ease-out';
    setTimeout(() => achievement.remove(), 500);
  }, 5000);
}

// Section observer for progress tracking
function initSectionTracking() {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.id || entry.target.querySelector('h2')?.textContent;
        if (sectionId) {
          console.log('Section viewed:', sectionId);
          trackSectionView(sectionId);
        }
      }
    });
  }, { threshold: 0.5 });

  const sections = document.querySelectorAll('section');
  console.log('Tracking', sections.length, 'sections');
  sections.forEach(section => {
    sectionObserver.observe(section);
  });
}

// Enhanced game selector tracking
function initGameTracking() {
  const gameSelect = document.getElementById('game-select');
  if (gameSelect) {
    console.log('Game tracking initialized');
    gameSelect.addEventListener('change', (e) => {
      console.log('Game changed to:', e.target.value);
      trackGameChange(e.target.value);
    });
  } else {
    console.log('Game select not found');
  }
}

// Initialize all engagement features
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initSectionTracking();
  initGameTracking();
  initMobileTouchSupport();
  initResponsiveAdjustments();

  // Track initial game
  const initialGame = document.getElementById('game-select')?.value;
  if (initialGame) {
    trackGameChange(initialGame);
  }
});

// Mobile touch support for game canvas
function initMobileTouchSupport() {
  const comparisonResults = document.getElementById('comparison-results');
  if (!comparisonResults) return;

  let touchStartX = 0;
  let touchEndX = 0;

  comparisonResults.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  comparisonResults.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next step
        if (typeof nextStep === 'function') {
          nextStep();
          showToast('Next step', 'info');
        }
      } else {
        // Swipe right - previous step
        if (typeof previousStep === 'function') {
          previousStep();
          showToast('Previous step', 'info');
        }
      }
    }
  }
}

// Responsive adjustments
function initResponsiveAdjustments() {
  // Add mobile class to body if on mobile
  if (window.innerWidth <= 768) {
    document.body.classList.add('mobile-view');

    // Show mobile hint for swipe gestures
    const comparisonResults = document.getElementById('comparison-results');
    if (comparisonResults && !sessionStorage.getItem('swipeHintShown')) {
      setTimeout(() => {
        showToast('💡 Tip: Swipe left/right to navigate steps', 'info');
        sessionStorage.setItem('swipeHintShown', 'true');
      }, 2000);
    }
  }

  // Update on resize
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
      document.body.classList.add('mobile-view');
    } else {
      document.body.classList.remove('mobile-view');
    }
  });
}

// Make functions globally available
window.shareConfiguration = shareConfiguration;
window.showToast = showToast;
