/**
 * Jnights.com — interactions du site vitrine
 * DA premium épurée : animations subtiles, navbar au scroll,
 * apparition des cartes, easter egg conservé (séquence de flèches).
 */

// ===========================
// PRELOADER
// ===========================
function initPreloader() {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  const hide = () => preloader.classList.add("hidden");

  window.addEventListener("load", () => setTimeout(hide, 400));
  // Filet de sécurité si l'event load ne se déclenche pas
  setTimeout(hide, 3000);
}

// ===========================
// NAVBAR — fond au scroll
// ===========================
function initNavbar() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// ===========================
// APPARITION DES CARTES AU SCROLL
// ===========================
function initScrollReveal() {
  const items = document.querySelectorAll(".feature-card");
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // léger décalage pour un effet en cascade
          setTimeout(() => entry.target.classList.add("visible"), i * 90);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

// ===========================
// SMOOTH SCROLL (ancres internes)
// ===========================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const id = this.getAttribute("href");
      if (id === "#") return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

// ===========================
// EASTER EGG — séquence ↑ ↓ ← →
// ===========================
function initEasterEgg() {
  const sequence = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  const image = document.getElementById("easterEggImage");
  const closeBtn = document.getElementById("closeEasterEgg");
  if (!image || !closeBtn) return;

  let index = 0;
  let lastKeyTime = Date.now();
  const RESET_MS = 2000;

  const show = () => {
    image.classList.add("active");
    document.body.style.overflow = "hidden";
  };
  const hide = () => {
    image.classList.remove("active");
    document.body.style.overflow = "";
  };

  document.addEventListener("keydown", (e) => {
    if (!sequence.includes(e.key)) return;

    const now = Date.now();
    if (now - lastKeyTime > RESET_MS) index = 0;

    if (e.key === sequence[index]) {
      e.preventDefault();
      index++;
      lastKeyTime = now;
      if (index === sequence.length) {
        show();
        index = 0;
      }
    } else {
      index = 0;
      lastKeyTime = now;
    }
  });

  closeBtn.addEventListener("click", hide);
  image.addEventListener("click", (e) => {
    if (e.target === image) hide();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && image.classList.contains("active")) hide();
  });
}

// ===========================
// CARROUSEL DU MOCKUP TÉLÉPHONE
// ===========================
function initPhoneCarousel() {
  const slides = document.querySelectorAll(".phone-screen");
  const dots = document.querySelectorAll(".dot-indicator");
  if (slides.length < 2) return;

  let current = 0;
  let timer = null;

  const show = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle("is-active", i === current));
    dots.forEach((d, i) => d.classList.toggle("is-active", i === current));
  };

  const start = () => {
    timer = setInterval(() => show(current + 1), 3000);
  };
  const restart = () => {
    if (timer) clearInterval(timer);
    start();
  };

  // Clic sur un point → va à la slide + relance le timer
  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      show(i);
      restart();
    });
  });

  start();
}

// ===========================
// INIT
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  initPreloader();
  initNavbar();
  initSmoothScroll();
  initEasterEgg();
  initPhoneCarousel();

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    initScrollReveal();
  } else {
    // Sans animation : afficher les cartes directement
    document
      .querySelectorAll(".feature-card")
      .forEach((el) => el.classList.add("visible"));
  }
});
