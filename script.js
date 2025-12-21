/**
 * Jnights.com - Interactive JavaScript
 * Modern animations and interactive effects
 */

// ===========================
// TWINKLING STARS ANIMATION
// ===========================
function createStars() {
  const starsContainer = document.getElementById('stars');
  const numberOfStars = 150; // Number of stars to create

  for (let i = 0; i < numberOfStars; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    
    // Random position
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    
    // Random size (1-3px)
    const size = Math.random() * 2 + 1;
    
    // Random animation duration (2-5 seconds)
    const duration = Math.random() * 3 + 2;
    
    // Random delay
    const delay = Math.random() * 5;
    
    star.style.left = `${x}%`;
    star.style.top = `${y}%`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.setProperty('--duration', `${duration}s`);
    star.style.setProperty('--delay', `${delay}s`);
    
    starsContainer.appendChild(star);
  }
}

// ===========================
// SMOOTH SCROLL
// ===========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ===========================
// PARALLAX MOUSE MOVEMENT
// ===========================
function initParallax() {
  const orbs = document.querySelectorAll('.orb');
  const logo = document.querySelector('.logo');
  let animationFrameId = null;
  
  document.addEventListener('mousemove', (e) => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    animationFrameId = requestAnimationFrame(() => {
      const mouseX = e.clientX / window.innerWidth;
      const mouseY = e.clientY / window.innerHeight;
      
      // Move orbs
      orbs.forEach((orb, index) => {
        const speed = (index + 1) * 20;
        const x = (mouseX - 0.5) * speed;
        const y = (mouseY - 0.5) * speed;
        orb.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      });
      
      // Subtle logo movement
      if (logo) {
        const logoX = (mouseX - 0.5) * 15;
        const logoY = (mouseY - 0.5) * 15;
        logo.style.transform = `translate(${logoX}px, ${logoY}px)`;
      }
    });
  });
}

// ===========================
// CARD TILT EFFECT
// ===========================
function initCardTilt() {
  const cards = document.querySelectorAll('.feature-card');
  
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.03)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)';
    });
  });
}

// ===========================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ===========================
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  
  // Observe elements
  const animatedElements = document.querySelectorAll('.feature-card, .coming-soon');
  animatedElements.forEach(el => observer.observe(el));
}

// ===========================
// GRADIENT ANIMATION
// ===========================
function animateGradient() {
  const title = document.querySelector('.main-title');
  let hue = 0;
  
  setInterval(() => {
    hue = (hue + 1) % 360;
    // The gradient animation is handled by CSS, but we can add extra effects here if needed
  }, 50);
}

// ===========================
// CURSOR TRAIL EFFECT (Optional)
// ===========================
function createCursorTrail() {
  const coords = { x: 0, y: 0 };
  const circles = [];
  const colors = ['#ff6b35', '#ff8c42', '#d946ef', '#8b5cf6'];
  
  // Create trail circles
  for (let i = 0; i < 12; i++) {
    const circle = document.createElement('div');
    circle.style.position = 'fixed';
    circle.style.width = '10px';
    circle.style.height = '10px';
    circle.style.borderRadius = '50%';
    circle.style.backgroundColor = colors[i % colors.length];
    circle.style.opacity = '0';
    circle.style.pointerEvents = 'none';
    circle.style.zIndex = '9999';
    circle.style.transition = 'opacity 0.3s ease';
    circle.style.mixBlendMode = 'screen';
    document.body.appendChild(circle);
    circles.push(circle);
  }
  
  // Update cursor position
  window.addEventListener('mousemove', (e) => {
    coords.x = e.clientX;
    coords.y = e.clientY;
  });
  
  // Animate trail
  function animateCircles() {
    let x = coords.x;
    let y = coords.y;
    
    circles.forEach((circle, index) => {
      circle.style.left = x - 5 + 'px';
      circle.style.top = y - 5 + 'px';
      circle.style.opacity = (12 - index) / 30;
      circle.style.transform = `scale(${(12 - index) / 12})`;
      
      const nextCircle = circles[index + 1] || circles[0];
      const nextX = parseFloat(nextCircle.style.left) || x;
      const nextY = parseFloat(nextCircle.style.top) || y;
      x += (nextX - x) * 0.3;
      y += (nextY - y) * 0.3;
    });
    
    requestAnimationFrame(animateCircles);
  }
  
  animateCircles();
}

// ===========================
// CLICK RIPPLE EFFECT
// ===========================
function initRippleEffect() {
  const buttons = document.querySelectorAll('.cta-button, .feature-card');
  
  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'rgba(255, 255, 255, 0.5)';
      ripple.style.transform = 'scale(0)';
      ripple.style.animation = 'ripple 0.6s ease-out';
      ripple.style.pointerEvents = 'none';
      
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
  
  // Add ripple animation
  if (!document.querySelector('#ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// ===========================
// LOADING ANIMATION
// ===========================
function initLoadingAnimation() {
  // Add a fade-in class instead of direct opacity manipulation
  window.addEventListener('load', () => {
    document.body.classList.add('loaded');
  });
}

// ===========================
// PERFORMANCE OPTIMIZATION
// ===========================
function checkReducedMotion() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    // Disable intensive animations for users who prefer reduced motion
    document.body.classList.add('reduced-motion');
  }
}

// ===========================
// INITIALIZE ALL FEATURES
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  // Core features
  createStars();
  checkReducedMotion();
  
  // New features
  initMusicPlayer();
  initArrowKeyEasterEgg();
  
  // Interactive features (only if not reduced motion)
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    initParallax();
    initCardTilt();
    createCursorTrail();
  }
  
  // Always enabled features
  initScrollAnimations();
  initRippleEffect();
  initLoadingAnimation();
});

// ===========================
// BACKGROUND MUSIC PLAYER
// ===========================
function initMusicPlayer() {
  const musicToggle = document.getElementById('musicToggle');
  const backgroundMusic = document.getElementById('backgroundMusic');
  const musicIcon = musicToggle.querySelector('.music-icon');
  let isPlaying = false;

  // Update UI based on playback state
  function updateUI(playing) {
    isPlaying = playing;
    if (playing) {
      musicToggle.classList.add('playing');
      musicIcon.textContent = '🎵';
      musicToggle.setAttribute('aria-label', 'Pause music');
    } else {
      musicToggle.classList.remove('playing');
      musicIcon.textContent = '🔇';
      musicToggle.setAttribute('aria-label', 'Play music');
    }
  }

  // Try to autoplay on user interaction
  const attemptAutoplay = () => {
    const playPromise = backgroundMusic.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        updateUI(true);
        console.log('Music autoplay started');
      }).catch(error => {
        // Autoplay was prevented by browser policy
        console.log('Autoplay prevented - user interaction required:', error.message);
        updateUI(false);
      });
    }
  };

  // Toggle music on button click
  musicToggle.addEventListener('click', (e) => {
    e.preventDefault();
    
    if (isPlaying) {
      backgroundMusic.pause();
      updateUI(false);
    } else {
      const playPromise = backgroundMusic.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          updateUI(true);
        }).catch(error => {
          console.error('Error playing music:', error);
          updateUI(false);
        });
      }
    }
  });

  // Listen to audio events for state synchronization
  backgroundMusic.addEventListener('play', () => {
    updateUI(true);
  });

  backgroundMusic.addEventListener('pause', () => {
    updateUI(false);
  });

  backgroundMusic.addEventListener('ended', () => {
    updateUI(false);
  });

  // Handle loading errors
  backgroundMusic.addEventListener('error', (e) => {
    console.error('Error loading audio:', e);
    updateUI(false);
  });

  // Try autoplay after a short delay (gives page time to load)
  setTimeout(() => {
    attemptAutoplay();
  }, 1000);

  // Attempt autoplay on first user interaction (click or touch)
  const tryAutoplayOnce = () => {
    if (!isPlaying) {
      attemptAutoplay();
    }
  };
  
  // Use { once: true } to automatically remove listeners after first trigger
  document.addEventListener('click', tryAutoplayOnce, { once: true });
  document.addEventListener('touchstart', tryAutoplayOnce, { once: true });
}

// ===========================
// EASTER EGG: ARROW KEY SEQUENCE
// ===========================
function initArrowKeyEasterEgg() {
  // Arrow key sequence: Up, Down, Left, Right
  const arrowSequence = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  let currentIndex = 0;
  let lastKeyTime = Date.now();
  const resetTimeout = 2000; // Reset if no key pressed for 2 seconds
  const easterEggImage = document.getElementById('easterEggImage');
  const closeButton = document.getElementById('closeEasterEgg');

  document.addEventListener('keydown', (e) => {
    const now = Date.now();
    
    // Reset if too much time has passed since last key
    if (now - lastKeyTime > resetTimeout) {
      currentIndex = 0;
    }
    
    // Prevent default behavior for arrow keys to avoid page scrolling during sequence
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      
      // Check if the pressed key matches the current position in sequence
      if (e.key === arrowSequence[currentIndex]) {
        e.preventDefault(); // Prevent scrolling only when sequence is being entered
        currentIndex++;
        lastKeyTime = now;
        
        // Optional: Console feedback for debugging
        console.log(`Easter egg progress: ${currentIndex}/${arrowSequence.length}`);
        
        // Check if sequence is complete
        if (currentIndex === arrowSequence.length) {
          showEasterEgg();
          currentIndex = 0; // Reset for next time
        }
      } else {
        // Wrong arrow key pressed, reset
        currentIndex = 0;
        lastKeyTime = now;
      }
    }
  });


  function showEasterEgg() {
    easterEggImage.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    console.log('Easter egg activated! 🎉');
  }

  function hideEasterEgg() {
    easterEggImage.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  }

  // Close button
  closeButton.addEventListener('click', hideEasterEgg);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && easterEggImage.classList.contains('active')) {
      hideEasterEgg();
      e.preventDefault();
    }
  });

  // Close on backdrop click
  easterEggImage.addEventListener('click', (e) => {
    if (e.target === easterEggImage) {
      hideEasterEgg();
    }
  });
}
