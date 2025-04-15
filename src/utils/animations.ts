export const createConfetti = () => {
  const confettiCount = 100;
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '35vh';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    // Random initial position
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = (Math.random() * 20 - 20) + 'vh';
    
    // Random transform values
    const tx = (Math.random() - 0.5) * 500;
    const ty = Math.random() * 200 + 400;
    confetti.style.setProperty('--tx', `${tx}px`);
    confetti.style.setProperty('--ty', `${ty}px`);
    
    // Random colors
    const hue = Math.random() * 360;
    confetti.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
    
    // Random rotation
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

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