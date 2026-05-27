function reducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Spawn (or reuse) a fullscreen dimming backdrop and remove it after
// `durationMs`. Used by the score / Yahtzee / emoji popups so the bright
// text reads cleanly against busy game contents instead of getting lost
// in the gradient + scorecard.
function showBackdrop(durationMs: number): void {
  if (typeof document === 'undefined') return;
  let backdrop = document.getElementById('score-fx-backdrop') as HTMLDivElement | null;
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'score-fx-backdrop';
    Object.assign(backdrop.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.72)',
      backdropFilter: 'blur(2px)',
      WebkitBackdropFilter: 'blur(2px)',
      opacity: '0',
      transition: 'opacity 0.18s ease',
      pointerEvents: 'none',
      zIndex: '950',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(backdrop);
  }
  // Reflow so the transition kicks in.
  void backdrop.offsetWidth;
  backdrop.style.opacity = '1';
  window.setTimeout(() => {
    if (!backdrop) return;
    backdrop.style.opacity = '0';
    window.setTimeout(() => backdrop?.remove(), 220);
  }, Math.max(0, durationMs - 220));
}

export const createConfetti = () => {
  // Skip the 150-particle blast under reduced motion. Caller animations
  // (score popup, Yahtzee banner) still render, just without confetti.
  if (reducedMotion()) return;
  const confettiCount = 150;
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  // Get the center position of the screen
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    // Start from center
    confetti.style.left = `${centerX}px`;
    confetti.style.top = `${centerY}px`;
    
    // Calculate random angle and distance for explosion effect
    const angle = Math.random() * Math.PI * 2; // Random angle in radians
    const distance = Math.random() * 400 + 200; // Random distance between 200-600px
    
    // Calculate end position based on angle and distance
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    confetti.style.setProperty('--tx', `${tx}px`);
    confetti.style.setProperty('--ty', `${ty}px`);
    
    // Random colors with more vibrant options
    const colors = [
      '#FFD700', // Gold
      '#FF6B6B', // Coral
      '#4ECDC4', // Turquoise
      '#45B7D1', // Sky Blue
      '#96CEB4', // Mint
      '#FF69B4', // Hot Pink
      '#9B59B6', // Purple
      '#3498DB', // Blue
      '#2ECC71', // Green
      '#F1C40F'  // Yellow
    ];
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Random size for variety
    const size = Math.random() * 8 + 6;
    confetti.style.width = `${size}px`;
    confetti.style.height = `${size}px`;
    
    // Random rotation
    const rotation = Math.random() * 720 - 360; // -360 to 360 degrees
    confetti.style.setProperty('--rotation', `${rotation}deg`);

    container.appendChild(confetti);
  }

  // Clean up after animation
  setTimeout(() => {
    document.body.removeChild(container);
  }, 3000);
}

export const showYahtzeeAnimation = () => {
  showBackdrop(2000);

  // Create the Yahtzee text animation
  const yahtzeeText = document.createElement('div');
  yahtzeeText.className = 'yahtzee-animation';
  yahtzeeText.textContent = 'YAHTZEE!';
  document.body.appendChild(yahtzeeText);

  // Create confetti
  createConfetti();

  // Clean up Yahtzee text
  setTimeout(() => {
    yahtzeeText.remove();
  }, 2000);
}

export const showScoreAnimation = (score: number, category: string = '') => {
  showBackdrop(2000);

  // Create the score text animation
  const scoreText = document.createElement('div');
  scoreText.className = 'score-popup-animation';

  let scoreToDisplay: string = score.toString();
  if(score === 0){
    scoreToDisplay = 'X';
  }else{
    scoreToDisplay = `+${score}`;
  }

  // Add color class based on score value
  if (score >= 50) {
    scoreText.classList.add('high-score');
  } else if (score >= 30) {
    scoreText.classList.add('medium-score');
  } else if(score === 0){
    scoreText.classList.add('no-score');
  }else {
    scoreText.classList.add('normal-score');
  }

  if(category){
    scoreText.style.whiteSpace = 'pre-line';
    scoreText.textContent = `${category}\n${scoreToDisplay} `;
  }else{
    scoreText.textContent = `${scoreToDisplay}`;
  }
  

  
  document.body.appendChild(scoreText);

  // Clean up after animation
  setTimeout(() => {
    scoreText.remove();
  }, 2000);
}

export function showEmojiAnimation(emoji: string) {
  // Remove any existing emoji animation
  const prev = document.querySelector('.emoji-animation');
  if (prev) prev.remove();

  // Create the emoji element
  const emojiDiv = document.createElement('div');
  emojiDiv.className = 'emoji-animation';
  emojiDiv.textContent = emoji;
  document.body.appendChild(emojiDiv);

  createConfetti();

  // Remove after animation
  setTimeout(() => {
    emojiDiv.remove();
    // document.querySelector('.overlay')?.classList.remove('active');
  }, 1200);
} 