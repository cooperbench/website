// Animated Grid Pattern - Vanilla JS implementation
class AnimatedGridPattern {
  constructor(container, options = {}) {
    this.container = container;
    this.width = options.width || 40;
    this.height = options.height || 40;
    this.numSquares = options.numSquares || 50;
    this.maxOpacity = options.maxOpacity || 0.5;
    this.duration = options.duration || 4;
    this.repeatDelay = options.repeatDelay || 0.5;
    
    this.svg = null;
    this.squares = [];
    this.dimensions = { width: 0, height: 0 };
    
    this.init();
  }

  init() {
    this.createSVG();
    this.setupResizeObserver();
    this.generateSquares();
  }

  createSVG() {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('aria-hidden', 'true');
    this.svg.className = 'pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30';
    this.svg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%;';
    
    // Create pattern
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.id = `grid-pattern-${Math.random().toString(36).substr(2, 9)}`;
    pattern.setAttribute('width', this.width);
    pattern.setAttribute('height', this.height);
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M.5 ${this.height}V.5H${this.width}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '0.5');
    
    pattern.appendChild(path);
    defs.appendChild(pattern);
    this.svg.appendChild(defs);
    
    // Create background rect
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', `url(#${pattern.id})`);
    this.svg.appendChild(rect);
    
    // Create squares container
    const squaresGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    squaresGroup.id = 'squares-container';
    this.svg.appendChild(squaresGroup);
    
    this.container.appendChild(this.svg);
  }

  setupResizeObserver() {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        this.dimensions = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
        this.regenerateSquares();
      }
    });
    
    resizeObserver.observe(this.container);
  }

  getRandomPos() {
    return [
      Math.floor((Math.random() * this.dimensions.width) / this.width),
      Math.floor((Math.random() * this.dimensions.height) / this.height),
    ];
  }

  generateSquares() {
    this.squares = Array.from({ length: this.numSquares }, (_, i) => ({
      id: i,
      pos: this.getRandomPos(),
    }));
    this.renderSquares();
  }

  regenerateSquares() {
    if (this.dimensions.width && this.dimensions.height) {
      this.generateSquares();
    }
  }

  renderSquares() {
    const squaresContainer = this.svg.querySelector('#squares-container');
    if (!squaresContainer) return;
    
    squaresContainer.innerHTML = '';
    
    this.squares.forEach(({ pos: [x, y], id }, index) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', this.width - 1);
      rect.setAttribute('height', this.height - 1);
      rect.setAttribute('x', x * this.width + 1);
      rect.setAttribute('y', y * this.height + 1);
      rect.setAttribute('fill', 'currentColor');
      rect.setAttribute('stroke-width', '0');
      
      // Set initial opacity to 0
      rect.style.opacity = '0';
      
      // Create animation using CSS
      const style = document.createElement('style');
      const keyframesId = `anim-${id}-${index}`;
      style.textContent = `
        @keyframes ${keyframesId} {
          0% { opacity: 0; }
          50% { opacity: ${this.maxOpacity}; }
          100% { opacity: 0; }
        }
        #rect-${id}-${index} {
          animation: ${keyframesId} ${this.duration}s ease-in-out ${index * 0.1}s infinite;
          animation-delay: ${index * 0.1}s;
        }
      `;
      if (!document.head.querySelector(`#style-${keyframesId}`)) {
        style.id = `style-${keyframesId}`;
        document.head.appendChild(style);
      }
      
      rect.id = `rect-${id}-${index}`;
      squaresContainer.appendChild(rect);
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const heroSection = document.getElementById('animated-grid-container');
  if (heroSection) {
    new AnimatedGridPattern(heroSection, {
      width: 40,
      height: 40,
      numSquares: 30,
      maxOpacity: 0.1,
      duration: 3,
      repeatDelay: 1,
    });
  }
});
