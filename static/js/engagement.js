// Engagement features for RealtimeGym website

// Social Sharing
function shareConfiguration() {
  const game = document.getElementById("game-select").value;
  const seed = document.getElementById("seed-select").value;
  const cognitiveLoad = document.getElementById("cognitive-load-select").value;
  const timePressure = document.getElementById("time-pressure-select").value;

  const cognitiveLoadLabels = ["Easy", "Medium", "Hard"];
  const timePressureLabels = ["Low", "Moderate", "High", "Extreme"];

  const gameNames = {
    freeway: "Freeway",
    snake: "Snake",
    overcooked: "Overcooked",
  };

  const shareText = `Check out this Real-Time Reasoning challenge: ${gameNames[game]} with ${cognitiveLoadLabels[cognitiveLoad]} cognitive load and ${timePressureLabels[timePressure]} time pressure! Can AgileThinker handle it?`;
  const url = `${window.location.origin}${window.location.pathname}#interactive-demo`;

  // Try to use native Web Share API first (mobile)
  if (navigator.share) {
    navigator
      .share({
        title: "Real-Time Reasoning Challenge",
        text: shareText,
        url: url,
      })
      .then(() => {
        showToast("Configuration shared successfully!", "success");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          fallbackShare(shareText, url);
        }
      });
  } else {
    fallbackShare(shareText, url);
  }
}

function fallbackShare(text, url) {
  // Create a modal with sharing options
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4";
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
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}

// Scroll-triggered animations
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -100px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  }, observerOptions);

  // Observe all sections with reveal-on-scroll class
  document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity 0.6s ease-out, transform 0.6s ease-out";
    observer.observe(el);
  });
}

// Progress tracking
let explorationProgress = {
  gamesViewed: new Set(),
  settingsChanged: 0,
  sectionsViewed: new Set(),
};

function trackGameChange(game) {
  explorationProgress.gamesViewed.add(game);
  explorationProgress.settingsChanged++;

  // Show thinking prompt every 5 setting changes
  if (
    explorationProgress.settingsChanged % 5 === 0 &&
    explorationProgress.settingsChanged > 0
  ) {
    showThinkingPrompt();
  }
}

function showThinkingPrompt() {
  const prompts = [
    "Which agent do you think will perform best in this scenario?",
    "Do you notice how the agents adapt to different time pressures?",
    "Can you spot the moment when AgileThinker switches strategies?",
    "What happens when cognitive load increases? Watch the reasoning patterns!",
    "Compare the agent scores - does the winner surprise you?",
  ];

  const prompt = prompts[Math.floor(Math.random() * prompts.length)];

  const promptBox = document.createElement("div");
  promptBox.className =
    "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 max-w-md w-full p-6 border border-gray-200";
  promptBox.innerHTML = `
    <h3 class="text-lg font-medium text-gray-900 mb-3">Think About It</h3>
    <p class="text-gray-700 mb-6">${prompt}</p>
    <button onclick="this.closest('.fixed').remove(); document.querySelector('.fixed.bg-black').remove();" class="px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded hover:bg-gray-600 transition-colors">
      Got it
    </button>
  `;

  // Add backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "fixed inset-0 bg-black bg-opacity-30 z-40";
  backdrop.onclick = () => {
    promptBox.remove();
    backdrop.remove();
  };

  document.body.appendChild(backdrop);
  document.body.appendChild(promptBox);
}

function trackSectionView(sectionId) {
  explorationProgress.sectionsViewed.add(sectionId);
  // Section tracking is kept for potential achievements
}

function updateProgressIndicator() {
  let progressBar = document.getElementById("exploration-progress");

  if (!progressBar) {
    // Create progress indicator
    progressBar = document.createElement("div");
    progressBar.id = "exploration-progress";
    progressBar.className = "fixed top-16 left-0 right-0 h-1 bg-gray-200 z-50";
    progressBar.innerHTML =
      '<div class="h-full bg-gray-600 transition-all duration-300" style="width: 0%"></div>';
    document.body.appendChild(progressBar);
  }

  // Calculate scroll progress
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const scrollTop = window.scrollY;
  const scrollableDistance = documentHeight - windowHeight;
  const scrollPercentage =
    scrollableDistance > 0 ? (scrollTop / scrollableDistance) * 100 : 0;

  progressBar.querySelector("div").style.width = `${scrollPercentage}%`;
}

// Section observer for tracking
function initSectionTracking() {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId =
            entry.target.id || entry.target.querySelector("h2")?.textContent;
          if (sectionId) {
            trackSectionView(sectionId);
          }
        }
      });
    },
    { threshold: 0.5 },
  );

  const sections = document.querySelectorAll("section");
  sections.forEach((section) => {
    sectionObserver.observe(section);
  });
}

// Enhanced game selector tracking
function initGameTracking() {
  const gameSelect = document.getElementById("game-select");
  if (gameSelect) {
    gameSelect.addEventListener("change", (e) => {
      trackGameChange(e.target.value);
    });
  }
}

// Initialize all engagement features
document.addEventListener("DOMContentLoaded", () => {
  initScrollAnimations();
  initSectionTracking();
  initGameTracking();
  initMobileTouchSupport();
  initResponsiveAdjustments();

  // Initialize progress bar
  updateProgressIndicator();

  // Update progress bar on scroll
  let scrollTimeout;
  window.addEventListener(
    "scroll",
    () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        updateProgressIndicator();
      }, 10); // Smooth throttling
    },
    { passive: true },
  );

  // Track initial game
  const initialGame = document.getElementById("game-select")?.value;
  if (initialGame) {
    trackGameChange(initialGame);
  }
});

// Mobile touch support for game canvas
function initMobileTouchSupport() {
  const comparisonResults = document.getElementById("comparison-results");
  if (!comparisonResults) return;

  let touchStartX = 0;
  let touchEndX = 0;

  comparisonResults.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true },
  );

  comparisonResults.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true },
  );

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next step
        if (typeof nextStep === "function") {
          nextStep();
        }
      } else {
        // Swipe right - previous step
        if (typeof previousStep === "function") {
          previousStep();
        }
      }
    }
  }
}

// Responsive adjustments
function initResponsiveAdjustments() {
  // Add mobile class to body if on mobile
  if (window.innerWidth <= 768) {
    document.body.classList.add("mobile-view");
  }

  // Update on resize
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 768) {
      document.body.classList.add("mobile-view");
    } else {
      document.body.classList.remove("mobile-view");
    }
  });
}

// Copy code to clipboard
function copyCode(elementId) {
  const codeElement = document.getElementById(elementId);
  if (!codeElement) return;

  const text = codeElement.textContent;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      // Find the button that was clicked
      const button = event.target.closest("button");
      if (button) {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          button.innerHTML = originalHTML;
        }, 2000);
      }
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
    });
}

// Make functions globally available
window.shareConfiguration = shareConfiguration;
window.copyCode = copyCode;
