export const createConfetti = () => {
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
  // Create the Yahtzee text animation
  const yahtzeeText = document.createElement('div');
  yahtzeeText.className = 'yahtzee-animation';
  yahtzeeText.textContent = 'YAHTZEE!';
  document.body.appendChild(yahtzeeText);

  // Create confetti
  createConfetti();

  // Clean up Yahtzee text
  setTimeout(() => {
    document.body.removeChild(yahtzeeText);
  }, 4000);
} 