/* Altos Psychiatry — Main JavaScript */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Component loader ─────────────────────────────── */
  function loadComponent(url, id, cb) {
    fetch(url)
      .then(r => r.ok ? r.text() : Promise.reject(url))
      .then(html => {
        const el = document.getElementById(id);
        if (el) { el.innerHTML = html; if (cb) cb(); }
      })
      .catch(err => console.warn('Component load failed:', err));
  }

  loadComponent('/header.html', 'header-placeholder', initHeader);
  loadComponent('/footer.html', 'footer-placeholder');

  /* ── Header ───────────────────────────────────────── */
  function initHeader() {
    const header = document.querySelector('.main-header');
    const toggle = document.getElementById('nav-toggle');
    const nav    = document.getElementById('main-nav');

    if (!header) return;

    // Scroll state
    function onScroll() {
      header.classList.toggle('scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile toggle
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        toggle.classList.toggle('is-open', open);
        document.body.style.overflow = open ? 'hidden' : '';
      });
    }

    // Close nav on link click (mobile)
    nav?.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('is-open');
        if (toggle) toggle.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Scroll reveal ────────────────────────────────── */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

  /* ── Accordions ───────────────────────────────────── */
  document.querySelectorAll('.accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const body = btn.nextElementSibling;
      const isOpen = btn.classList.contains('open');

      // Close all in same group
      const group = btn.closest('.accordion-group') || btn.closest('section');
      group?.querySelectorAll('.accordion-btn.open').forEach(b => {
        b.classList.remove('open');
        b.nextElementSibling.style.maxHeight = null;
      });

      if (!isOpen) {
        btn.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });

  /* ── Smooth scroll ────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 90;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
      }
    });
  });

});
