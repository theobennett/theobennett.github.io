/* Altos Psychiatry — main.js */
(function () {
  'use strict';

  /* ── Component loader ─────────────────────────────────────── */
  function loadComponent(url, id, cb) {
    fetch(url)
      .then(function(r) { return r.ok ? r.text() : Promise.reject(url); })
      .then(function(html) {
        var el = document.getElementById(id);
        if (el) { el.innerHTML = html; if (cb) cb(); }
      })
      .catch(function(e) { console.warn('Component load failed:', e); });
  }

  /* ── Run on DOM ready ─────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function() {
    loadComponent('/header.html', 'header-placeholder', initHeader);
    loadComponent('/footer.html', 'footer-placeholder');
    initReveal();
    initAccordions();
    initSmoothScroll();
  });

  /* ================================================================
     HEADER
     ================================================================ */
  function initHeader() {
    var header  = document.querySelector('.main-header');
    var toggle  = document.getElementById('nav-toggle');
    var overlay = document.getElementById('mobile-nav-overlay');

    if (!header) return;

    /* ── No scroll color change — header stays ocean-deep always ── */

    /* ── Mobile: hamburger → overlay ── */
    if (toggle && overlay) {
      toggle.addEventListener('click', function() {
        var isOpen = overlay.classList.toggle('is-open');
        toggle.classList.toggle('is-open', isOpen);
        toggle.setAttribute('aria-expanded', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      /* Close on outside tap */
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeMobileNav();
      });

      /* Close on any link tap */
      overlay.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', closeMobileNav);
      });

      /* Escape key */
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeMobileNav();
      });
    }

    function closeMobileNav() {
      if (!overlay || !toggle) return;
      overlay.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      /* Also collapse all mobile dropdowns */
      overlay.querySelectorAll('.mobile-nav-item.is-expanded').forEach(function(item) {
        collapseItem(item);
      });
    }

    /* ── Mobile: tap to expand sub-sections ── */
    if (overlay) {
      overlay.querySelectorAll('.mobile-nav-link[data-toggle]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var item   = btn.closest('.mobile-nav-item');
          var isOpen = item.classList.contains('is-expanded');
          /* Close siblings */
          overlay.querySelectorAll('.mobile-nav-item.is-expanded').forEach(collapseItem);
          if (!isOpen) expandItem(item);
        });
      });
    }

    function expandItem(item) {
      var dd = item.querySelector('.mobile-dropdown');
      item.classList.add('is-expanded');
      if (dd) dd.style.maxHeight = dd.scrollHeight + 'px';
    }
    function collapseItem(item) {
      var dd = item.querySelector('.mobile-dropdown');
      item.classList.remove('is-expanded');
      if (dd) dd.style.maxHeight = null;
    }

    /* ── Desktop: hover dropdowns ── */
    var isMobile = function() { return window.innerWidth < 1024; };

    header.querySelectorAll('.nav-item').forEach(function(item) {
      var timer;

      item.addEventListener('mouseenter', function() {
        if (isMobile()) return;
        clearTimeout(timer);
        item.classList.add('is-hovered');
      });
      item.addEventListener('mouseleave', function() {
        if (isMobile()) return;
        /* Small delay so cursor can travel to dropdown */
        timer = setTimeout(function() {
          item.classList.remove('is-hovered');
        }, 120);
      });

      /* Keep open if mouse enters the panel */
      var panel = item.querySelector('.dropdown-panel');
      if (panel) {
        panel.addEventListener('mouseenter', function() { clearTimeout(timer); });
        panel.addEventListener('mouseleave', function() {
          if (isMobile()) return;
          timer = setTimeout(function() { item.classList.remove('is-hovered'); }, 80);
        });
      }

      /* Keyboard: Enter/Space opens, Escape closes */
      var link = item.querySelector('.nav-link');
      if (link) {
        link.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            if (panel) { e.preventDefault(); item.classList.toggle('is-hovered'); }
          }
          if (e.key === 'Escape') item.classList.remove('is-hovered');
        });
      }
    });

    /* Close dropdowns on outside click */
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.nav-item')) {
        header.querySelectorAll('.nav-item.is-hovered').forEach(function(item) {
          item.classList.remove('is-hovered');
        });
      }
    });
  }

  /* ================================================================
     SCROLL REVEAL
     ================================================================ */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach(function(el) { el.classList.add('visible'); });
      return;
    }

    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.07 });

    els.forEach(function(el) { obs.observe(el); });
  }

  /* ================================================================
     ACCORDIONS
     ================================================================ */
  function initAccordions() {
    document.querySelectorAll('.accordion-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var body   = btn.nextElementSibling;
        var isOpen = btn.classList.contains('open');
        /* Close siblings */
        var group = btn.closest('.accordion-group') || btn.closest('section') || document;
        group.querySelectorAll('.accordion-btn.open').forEach(function(b) {
          b.classList.remove('open');
          if (b.nextElementSibling) b.nextElementSibling.style.maxHeight = null;
        });
        if (!isOpen) {
          btn.classList.add('open');
          if (body) body.style.maxHeight = body.scrollHeight + 'px';
        }
      });
    });
  }

  /* ================================================================
     SMOOTH SCROLL
     ================================================================ */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(a) {
      a.addEventListener('click', function(e) {
        var target = document.querySelector(a.getAttribute('href'));
        if (target) {
          e.preventDefault();
          window.scrollTo({
            top: target.getBoundingClientRect().top + window.scrollY - 88,
            behavior: 'smooth'
          });
        }
      });
    });
  }

})();
