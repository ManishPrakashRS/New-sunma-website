/* ===================================================================
   SUNMA FISHNET — Shared site behavior
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Scroll-triggered reveals
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // Mobile nav toggle
  const toggle = document.querySelector('.nav__toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const backdrop = document.querySelector('.mobile-menu__backdrop');

  function closeMenu() {
    mobileMenu.classList.remove('is-open');
    toggle.classList.remove('is-active');
    if (backdrop) backdrop.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }

  function openMenu() {
    mobileMenu.classList.add('is-open');
    toggle.classList.add('is-active');
    if (backdrop) backdrop.classList.add('is-open');
    document.body.classList.add('menu-open');
  }

  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('is-open');
      if (isOpen) closeMenu(); else openMenu();
    });
    mobileMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', closeMenu);
    });
    if (backdrop) backdrop.addEventListener('click', closeMenu);
  }

  // Nav background intensifies on scroll
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 24) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    }, { passive: true });
  }

  // Stat counters
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const counterIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const isDecimal = target % 1 !== 0;
        const duration = 1400;
        const start = performance.now();
        function tick(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const val = target * eased;
          el.textContent = isDecimal ? val.toFixed(1) : Math.round(val).toLocaleString();
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        counterIO.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => counterIO.observe(c));
  }
});
