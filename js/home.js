/* ============================================================
   ALTOS PSYCHIATRY — Homepage JavaScript (home.js)
   Used ONLY by index.html. Other pages keep using main.js.

   Modules:
   1. Nav       — frosted glass on scroll
   2. Menu      — mobile overlay with staggered links
   3. Reveal    — gentle scroll-in animations
   4. FAQ       — accessible accordion
   5. Video     — hero + interlude: autoplay fallback,
                  pause when off-screen or tab hidden
   ============================================================ */

;(function () {
  'use strict'

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function $ (sel, parent) {
    return (parent || document).querySelector(sel)
  }

  function $$ (sel, parent) {
    return Array.prototype.slice.call(
      (parent || document).querySelectorAll(sel)
    )
  }

  /* ══════════════════════════════════════════════
     1. NAV — solid after small scroll
     ══════════════════════════════════════════════ */
  function initNav () {
    var nav = $('.nav')
    if (!nav) return

    var ticking = false

    function update () {
      nav.classList.toggle('nav--solid', window.pageYOffset > 40)
      ticking = false
    }

    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          requestAnimationFrame(update)
          ticking = true
        }
      },
      { passive: true }
    )

    update()
  }

  /* ══════════════════════════════════════════════
     2. MOBILE MENU
     ══════════════════════════════════════════════ */
  function initMenu () {
    var burger = $('.nav__burger')
    var menu = $('.mobile-menu')
    if (!burger || !menu) return

    var links = $$('a', menu)
    var open = false

    function setOpen (next) {
      open = next
      burger.classList.toggle('is-open', open)
      burger.setAttribute('aria-expanded', open ? 'true' : 'false')
      menu.classList.toggle('is-open', open)
      menu.setAttribute('aria-hidden', open ? 'false' : 'true')
      document.body.classList.toggle('menu-open', open)

      /* Staggered link entrance */
      links.forEach(function (link, i) {
        link.style.transitionDelay = open ? 80 + i * 55 + 'ms' : '0ms'
      })
    }

    burger.addEventListener('click', function () {
      setOpen(!open)
    })

    links.forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false)
      })
    })

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) {
        setOpen(false)
        burger.focus()
      }
    })
  }

  /* ══════════════════════════════════════════════
     3. SCROLL REVEAL
     ══════════════════════════════════════════════ */
  function initReveal () {
    var items = $$('.reveal')
    if (!items.length) return

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in') })
      return
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return
          var el = entry.target
          var delay = parseInt(el.getAttribute('data-delay'), 10) || 0
          setTimeout(function () { el.classList.add('in') }, delay)
          observer.unobserve(el)
        })
      },
      { rootMargin: '0px 0px -70px 0px', threshold: 0.08 }
    )

    items.forEach(function (el) { observer.observe(el) })
  }

  /* ══════════════════════════════════════════════
     4. FAQ ACCORDION (single-open, accessible)
     ══════════════════════════════════════════════ */
  function initFaq () {
    var items = $$('.faq__item')
    if (!items.length) return

    items.forEach(function (item, i) {
      var q = $('.faq__q', item)
      var a = $('.faq__a', item)
      if (!q || !a) return

      var id = 'faq-a-' + i
      a.id = id
      q.setAttribute('aria-controls', id)
      q.setAttribute('aria-expanded', 'false')

      q.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open')

        /* close all */
        items.forEach(function (other) {
          other.classList.remove('is-open')
          var oq = $('.faq__q', other)
          var oa = $('.faq__a', other)
          if (oq) oq.setAttribute('aria-expanded', 'false')
          if (oa) oa.style.maxHeight = '0'
        })

        if (!isOpen) {
          item.classList.add('is-open')
          q.setAttribute('aria-expanded', 'true')
          a.style.maxHeight = a.scrollHeight + 'px'
        }
      })
    })
  }

  /* ══════════════════════════════════════════════
     5. AMBIENT VIDEOS
        Fallback to poster if autoplay fails,
        pause off-screen or when tab hidden.
     ══════════════════════════════════════════════ */
  function initVideos () {
    var wraps = [
      { el: $('.hero'), video: $('.hero video'), failClass: 'hero--no-video' },
      { el: $('.interlude'), video: $('.interlude video'), failClass: 'no-video' }
    ]

    wraps.forEach(function (w) {
      if (!w.el || !w.video) return

      if (reduceMotion) {
        w.el.classList.add(w.failClass)
        return
      }

      w.video.addEventListener('error', function () {
        w.el.classList.add(w.failClass)
      })

      var source = $('source', w.video)
      if (source) {
        source.addEventListener('error', function () {
          w.el.classList.add(w.failClass)
        })
      }

      var p = w.video.play()
      if (p !== undefined) {
        p.catch(function () {
          w.el.classList.add(w.failClass)
        })
      }

      /* Pause off-screen */
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              try {
                if (entry.isIntersecting) {
                  var pp = w.video.play()
                  if (pp) pp.catch(function () {})
                } else {
                  w.video.pause()
                }
              } catch (e) {}
            })
          },
          { threshold: 0.1 }
        )
        observer.observe(w.el)
      }
    })

    /* Pause everything when tab hidden */
    document.addEventListener('visibilitychange', function () {
      wraps.forEach(function (w) {
        if (!w.video) return
        try {
          if (document.hidden) {
            w.video.pause()
          } else if (!w.el.classList.contains(w.failClass)) {
            var p = w.video.play()
            if (p) p.catch(function () {})
          }
        } catch (e) {}
      })
    })
  }

  /* ══════════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════════ */
  function init () {
    initNav()
    initMenu()
    initReveal()
    initFaq()
    initVideos()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
