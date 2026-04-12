/* ============================================================
   ALTOS PSYCHIATRY — Main JavaScript
   
   Premium UI Engine
   Handles: navigation, scroll effects, reveals, counters,
   accordions, parallax, accessibility, component loading
   
   Table of Contents:
   ─────────────────
   0.  Utilities (debounce, throttle, lerp, RAF)
   1.  Component Loader (header/footer includes)
   2.  Header (scroll solid/hide, active link)
   3.  Mobile Navigation
   4.  Scroll Progress Bar
   5.  Scroll Reveal (IntersectionObserver)
   6.  Counter Animation (trust bar numbers)
   7.  Smooth Scroll (anchor links)
   8.  Accordion / FAQ
   9.  Parallax (hero orbs + images)
   10. Magnetic Buttons (premium hover)
   11. Cursor Glow (subtle pointer light)
   12. Image Lazy Load (native + fallback)
   13. Staggered Grid Animation
   14. Text Split Animation (hero titles)
   15. Accessibility (announcer, focus trap, ESC)
   16. Page Transitions
   17. Initialization
   ============================================================ */

;(function () {
  'use strict'

  /* ══════════════════════════════════════════════════════════
     0. UTILITIES
     ══════════════════════════════════════════════════════════ */

  /**
   * Debounce — delays execution until idle
   * @param {Function} fn
   * @param {number} ms
   * @returns {Function}
   */
  function debounce(fn, ms) {
    var timer
    return function () {
      var ctx = this,
        args = arguments
      clearTimeout(timer)
      timer = setTimeout(function () {
        fn.apply(ctx, args)
      }, ms)
    }
  }

  /**
   * Throttle — limits execution to once per interval
   * @param {Function} fn
   * @param {number} ms
   * @returns {Function}
   */
  function throttle(fn, ms) {
    var last = 0
    return function () {
      var now = Date.now()
      if (now - last >= ms) {
        last = now
        fn.apply(this, arguments)
      }
    }
  }

  /**
   * Linear interpolation
   */
  function lerp(start, end, factor) {
    return start + (end - start) * factor
  }

  /**
   * Clamp a number between min and max
   */
  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max)
  }

  /**
   * Map a value from one range to another
   */
  function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
  }

  /**
   * Check if user prefers reduced motion
   */
  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  /**
   * Check if device is touch-primary
   */
  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }

  /**
   * Request Animation Frame with auto-cancel
   */
  function createRAFLoop(callback) {
    var id = null
    var running = false

    function loop(timestamp) {
      if (!running) return
      callback(timestamp)
      id = requestAnimationFrame(loop)
    }

    return {
      start: function () {
        if (running) return
        running = true
        id = requestAnimationFrame(loop)
      },
      stop: function () {
        running = false
        if (id) cancelAnimationFrame(id)
      },
      isRunning: function () {
        return running
      },
    }
  }

  /**
   * Query helper
   */
  function $(selector, parent) {
    return (parent || document).querySelector(selector)
  }

  function $$(selector, parent) {
    return Array.prototype.slice.call(
      (parent || document).querySelectorAll(selector)
    )
  }

  /**
   * Get scroll position
   */
  function getScrollY() {
    return window.pageYOffset || document.documentElement.scrollTop
  }

  /**
   * Get viewport dimensions
   */
  function getViewport() {
    return {
      w: window.innerWidth,
      h: window.innerHeight,
    }
  }

  /* ══════════════════════════════════════════════════════════
     1. COMPONENT LOADER
     Fetches header.html and footer.html, injects into
     placeholder divs. Runs post-load callbacks once both
     are mounted so nav, accordion, etc. can initialize.
     ══════════════════════════════════════════════════════════ */

  var ComponentLoader = {
    loaded: { header: false, footer: false },
    callbacks: [],

    init: function () {
      var self = this
      var headerEl = $('#header-placeholder')
      var footerEl = $('#footer-placeholder')

      var promises = []

      if (headerEl) {
        promises.push(
          this._fetch('/header.html')
            .then(function (html) {
              headerEl.innerHTML = html
              self.loaded.header = true
            })
            .catch(function () {
              console.warn('Header not loaded — using inline header if present.')
              self.loaded.header = true
            })
        )
      } else {
        this.loaded.header = true
      }

      if (footerEl) {
        promises.push(
          this._fetch('/footer.html')
            .then(function (html) {
              footerEl.innerHTML = html
              self.loaded.footer = true
            })
            .catch(function () {
              console.warn('Footer not loaded — using inline footer if present.')
              self.loaded.footer = true
            })
        )
      } else {
        this.loaded.footer = true
      }

      Promise.all(promises).then(function () {
        self._runCallbacks()
      })
    },

    onReady: function (fn) {
      if (this.loaded.header && this.loaded.footer) {
        fn()
      } else {
        this.callbacks.push(fn)
      }
    },

    _runCallbacks: function () {
      this.callbacks.forEach(function (fn) {
        try {
          fn()
        } catch (e) {
          console.error('ComponentLoader callback error:', e)
        }
      })
      this.callbacks = []
    },

    _fetch: function (url) {
      return fetch(url).then(function (res) {
        if (!res.ok) throw new Error(res.status)
        return res.text()
      })
    },
  }

  /* ══════════════════════════════════════════════════════════
     2. HEADER
     Transparent → solid on scroll, hide/show on direction,
     active page link highlighting
     ══════════════════════════════════════════════════════════ */

  var Header = {
    el: null,
    lastY: 0,
    scrollThreshold: 60,
    hideThreshold: 400,
    ticking: false,
    isHidden: false,
    isSolid: false,

    init: function () {
      this.el = $('.site-header')
      if (!this.el) return

      this.lastY = getScrollY()
      this._update()
      this._bindEvents()
      this._setActiveLink()
    },

    _bindEvents: function () {
      var self = this
      window.addEventListener(
        'scroll',
        function () {
          if (!self.ticking) {
            requestAnimationFrame(function () {
              self._update()
              self.ticking = false
            })
            self.ticking = true
          }
        },
        { passive: true }
      )
    },

    _update: function () {
      var y = getScrollY()
      var direction = y > this.lastY ? 'down' : 'up'
      var delta = Math.abs(y - this.lastY)

      // Solid background
      var shouldBeSolid = y > this.scrollThreshold
      if (shouldBeSolid !== this.isSolid) {
        this.el.classList.toggle('site-header--solid', shouldBeSolid)
        this.isSolid = shouldBeSolid
      }

      // Hide/show on scroll direction
      if (y > this.hideThreshold && direction === 'down' && delta > 8) {
        if (!this.isHidden && !MobileNav.isOpen) {
          this.el.classList.add('site-header--hidden')
          this.isHidden = true
        }
      } else if (direction === 'up' && delta > 4) {
        if (this.isHidden) {
          this.el.classList.remove('site-header--hidden')
          this.isHidden = false
        }
      }

      // Always show at top
      if (y <= 10) {
        this.el.classList.remove('site-header--hidden')
        this.isHidden = false
      }

      this.lastY = y
    },

    _setActiveLink: function () {
      var path = window.location.pathname
      // Normalize: remove trailing slash and index.html
      var normalized = path
        .replace(/\/index\.html$/, '/')
        .replace(/\/$/, '')

      // Desktop nav links
      $$('.nav__link').forEach(function (link) {
        var href = link
          .getAttribute('href')
          .replace(/\/index\.html$/, '/')
          .replace(/\/$/, '')

        var isActive =
          href === normalized ||
          (normalized === '' && (href === '/' || href === ''))

        link.classList.toggle('nav__link--active', isActive)
      })

      // Mobile nav links
      $$('.mobile-nav__link').forEach(function (link) {
        var href = link
          .getAttribute('href')
          .replace(/\/index\.html$/, '/')
          .replace(/\/$/, '')

        var isActive =
          href === normalized ||
          (normalized === '' && (href === '/' || href === ''))

        link.classList.toggle('mobile-nav__link--active', isActive)
      })
    },

    show: function () {
      if (this.el) {
        this.el.classList.remove('site-header--hidden')
        this.isHidden = false
      }
    },
  }

  /* ══════════════════════════════════════════════════════════
     3. MOBILE NAVIGATION
     Hamburger toggle, overlay, staggered link animations,
     body scroll lock, focus trap
     ══════════════════════════════════════════════════════════ */

  var MobileNav = {
    isOpen: false,
    toggle: null,
    overlay: null,
    links: [],
    focusTrap: null,
    previousFocus: null,

    init: function () {
      this.toggle = $('.nav-toggle')
      this.overlay = $('.mobile-nav')
      if (!this.toggle || !this.overlay) return

      this.links = $$('.mobile-nav__link', this.overlay)
      this._bindEvents()
    },

    _bindEvents: function () {
      var self = this

      this.toggle.addEventListener('click', function (e) {
        e.stopPropagation()
        self.isOpen ? self.close() : self.open()
      })

      // Close on link click
      this.links.forEach(function (link) {
        link.addEventListener('click', function () {
          self.close()
        })
      })

      // Close on Escape
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && self.isOpen) {
          self.close()
          if (self.toggle) self.toggle.focus()
        }
      })

      // Close on overlay background click
      this.overlay.addEventListener('click', function (e) {
        if (e.target === self.overlay) {
          self.close()
        }
      })
    },

    open: function () {
      this.isOpen = true
      this.previousFocus = document.activeElement

      this.toggle.classList.add('nav-toggle--active')
      this.toggle.setAttribute('aria-expanded', 'true')
      this.overlay.classList.add('mobile-nav--open')
      document.body.classList.add('nav-open')

      // Ensure header stays visible
      Header.show()

      // Stagger link reveal
      var self = this
      this.links.forEach(function (link, i) {
        link.classList.remove('mobile-nav__link--visible')
        setTimeout(function () {
          link.classList.add('mobile-nav__link--visible')
        }, 80 + i * 60)
      })

      // Focus first link after animation
      setTimeout(function () {
        if (self.links[0]) self.links[0].focus()
      }, 300)

      // Setup focus trap
      this._initFocusTrap()
    },

    close: function () {
      this.isOpen = false

      this.toggle.classList.remove('nav-toggle--active')
      this.toggle.setAttribute('aria-expanded', 'false')
      this.overlay.classList.remove('mobile-nav--open')
      document.body.classList.remove('nav-open')

      // Remove link visibility
      this.links.forEach(function (link) {
        link.classList.remove('mobile-nav__link--visible')
      })

      // Restore focus
      if (this.previousFocus) {
        this.previousFocus.focus()
      }

      // Cleanup focus trap
      this._destroyFocusTrap()
    },

    _initFocusTrap: function () {
      var self = this
      var focusable = $$('a, button, [tabindex]', this.overlay)
      // Add toggle button to focusable list
      focusable.unshift(this.toggle)

      this.focusTrap = function (e) {
        if (e.key !== 'Tab' || !self.isOpen) return

        var first = focusable[0]
        var last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }

      document.addEventListener('keydown', this.focusTrap)
    },

    _destroyFocusTrap: function () {
      if (this.focusTrap) {
        document.removeEventListener('keydown', this.focusTrap)
        this.focusTrap = null
      }
    },
  }

  /* ══════════════════════════════════════════════════════════
     4. SCROLL PROGRESS BAR
     Thin gradient bar at the top of the viewport
     ══════════════════════════════════════════════════════════ */

  var ScrollProgress = {
    el: null,
    ticking: false,

    init: function () {
      // Create element if not present
      this.el = $('.scroll-progress')
      if (!this.el) {
        this.el = document.createElement('div')
        this.el.className = 'scroll-progress'
        this.el.setAttribute('role', 'progressbar')
        this.el.setAttribute('aria-label', 'Page scroll progress')
        this.el.setAttribute('aria-valuemin', '0')
        this.el.setAttribute('aria-valuemax', '100')
        document.body.prepend(this.el)
      }

      this._bindEvents()
      this._update()
    },

    _bindEvents: function () {
      var self = this
      window.addEventListener(
        'scroll',
        function () {
          if (!self.ticking) {
            requestAnimationFrame(function () {
              self._update()
              self.ticking = false
            })
            self.ticking = true
          }
        },
        { passive: true }
      )
    },

    _update: function () {
      var scrollTop = getScrollY()
      var docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0

      this.el.style.width = progress + '%'
      this.el.setAttribute('aria-valuenow', Math.round(progress))
    },
  }

  /* ══════════════════════════════════════════════════════════
     5. SCROLL REVEAL
     IntersectionObserver-based reveal animations.
     Supports: .reveal, .reveal--up, .reveal--left,
     .reveal--right, .reveal--scale, .reveal--fade
     data-reveal-delay="100" for staggered timing
     ══════════════════════════════════════════════════════════ */

  var ScrollReveal = {
    observer: null,

    init: function () {
      if (prefersReducedMotion()) {
        // Immediately show all reveal elements
        $$('.reveal').forEach(function (el) {
          el.classList.add('is-revealed')
        })
        return
      }

      if (!('IntersectionObserver' in window)) {
        $$('.reveal').forEach(function (el) {
          el.classList.add('is-revealed')
        })
        return
      }

      this.observer = new IntersectionObserver(
        this._onIntersect.bind(this),
        {
          root: null,
          rootMargin: '0px 0px -60px 0px',
          threshold: 0.08,
        }
      )

      $$('.reveal').forEach(
        function (el) {
          this.observer.observe(el)
        }.bind(this)
      )
    },

    _onIntersect: function (entries) {
      var self = this
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target
          var delay = parseInt(el.getAttribute('data-reveal-delay'), 10) || 0

          if (delay > 0) {
            setTimeout(function () {
              el.classList.add('is-revealed')
            }, delay)
          } else {
            el.classList.add('is-revealed')
          }

          self.observer.unobserve(el)
        }
      })
    },

    // Re-observe new elements (e.g., after AJAX load)
    observe: function (el) {
      if (this.observer && el) {
        this.observer.observe(el)
      }
    },
  }

  /* ══════════════════════════════════════════════════════════
     6. COUNTER ANIMATION
     Animates numbers from 0 to target value.
     Usage: <span class="counter" data-target="500">0</span>
     Optional: data-suffix="+" data-prefix="$" data-duration="2000"
     ══════════════════════════════════════════════════════════ */

  var CounterAnimation = {
    observer: null,

    init: function () {
      var counters = $$('.counter, [data-counter]')
      if (!counters.length) return

      if (prefersReducedMotion()) {
        counters.forEach(function (el) {
          var target = el.getAttribute('data-target') || el.textContent
          var prefix = el.getAttribute('data-prefix') || ''
          var suffix = el.getAttribute('data-suffix') || ''
          el.textContent = prefix + target + suffix
        })
        return
      }

      this.observer = new IntersectionObserver(
        this._onIntersect.bind(this),
        { threshold: 0.3 }
      )

      counters.forEach(
        function (el) {
          // Store original text as target
          if (!el.getAttribute('data-target')) {
            var text = el.textContent.trim()
            var num = text.replace(/[^0-9.]/g, '')
            el.setAttribute('data-target', num)

            // Extract prefix/suffix
            var prefix = text.match(/^[^0-9]*/) || ['']
            var suffix = text.match(/[^0-9]*$/) || ['']
            if (prefix[0]) el.setAttribute('data-prefix', prefix[0])
            if (suffix[0] && suffix[0] !== text)
              el.setAttribute('data-suffix', suffix[0])
          }

          el.textContent = (el.getAttribute('data-prefix') || '') + '0'
          this.observer.observe(el)
        }.bind(this)
      )
    },

    _onIntersect: function (entries) {
      var self = this
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          self._animate(entry.target)
          self.observer.unobserve(entry.target)
        }
      })
    },

    _animate: function (el) {
      var target = parseFloat(el.getAttribute('data-target')) || 0
      var prefix = el.getAttribute('data-prefix') || ''
      var suffix = el.getAttribute('data-suffix') || ''
      var duration = parseInt(el.getAttribute('data-duration'), 10) || 2000
      var isFloat = target % 1 !== 0
      var decimals = isFloat
        ? (target.toString().split('.')[1] || '').length
        : 0

      var start = performance.now()

      function update(now) {
        var elapsed = now - start
        var progress = Math.min(elapsed / duration, 1)

        // Ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3)

        var current = target * eased
        var display = isFloat ? current.toFixed(decimals) : Math.round(current)

        el.textContent = prefix + display + suffix

        if (progress < 1) {
          requestAnimationFrame(update)
        } else {
          el.textContent = prefix + target + suffix
        }
      }

      requestAnimationFrame(update)
    },
  }

  /* ══════════════════════════════════════════════════════════
     7. SMOOTH SCROLL
     Handles anchor links with offset for fixed header.
     Also handles cross-page anchors (e.g., /#services).
     ══════════════════════════════════════════════════════════ */

  var SmoothScroll = {
    headerOffset: 90,

    init: function () {
      var self = this
      document.addEventListener('click', function (e) {
        var link = e.target.closest('a[href*="#"]')
        if (!link) return

        var href = link.getAttribute('href')
        if (!href || href === '#') return

        // Handle same-page anchors
        var hashIndex = href.indexOf('#')
        var hash = href.substring(hashIndex)
        var path = href.substring(0, hashIndex)

        // If the link points to a different page, let it navigate normally
        var currentPath = window.location.pathname.replace(/\/$/, '')
        var linkPath = path.replace(/\/$/, '')
        if (linkPath && linkPath !== currentPath && linkPath !== '') return

        var target = document.querySelector(hash)
        if (!target) return

        e.preventDefault()

        // Close mobile nav if open
        if (MobileNav.isOpen) {
          MobileNav.close()
        }

        var top =
          target.getBoundingClientRect().top +
          window.pageYOffset -
          self.headerOffset

        window.scrollTo({
          top: top,
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })

        // Update URL without triggering scroll
        history.pushState(null, '', hash)

        // Focus the target for accessibility
        target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
        target.addEventListener(
          'blur',
          function () {
            target.removeAttribute('tabindex')
          },
          { once: true }
        )
      })

      // Handle hash on page load (e.g., arriving from /#services)
      this._scrollToHashOnLoad()
    },

    _scrollToHashOnLoad: function () {
      var self = this
      if (!window.location.hash) return

      // Wait for DOM and components to settle
      setTimeout(function () {
        var target = document.querySelector(window.location.hash)
        if (target) {
          var top =
            target.getBoundingClientRect().top +
            window.pageYOffset -
            self.headerOffset

          window.scrollTo({ top: top, behavior: 'auto' })
        }
      }, 400)
    },
  }

  /* ══════════════════════════════════════════════════════════
     8. ACCORDION / FAQ
     Accessible expand/collapse with ARIA attributes.
     Supports multiple open or single-open mode via
     data-accordion="single" on the parent.
     ══════════════════════════════════════════════════════════ */

  var Accordion = {
    init: function () {
      var accordions = $$('.accordion')
      accordions.forEach(this._setup.bind(this))
    },

    _setup: function (accordion) {
      var self = this
      var isSingle = accordion.getAttribute('data-accordion') === 'single'
      var items = $$('.accordion__item', accordion)

      items.forEach(function (item, index) {
        var trigger = $('.accordion__trigger', item)
        var content = $('.accordion__content', item)
        if (!trigger || !content) return

        // Set ARIA attributes
        var id = 'acc-content-' + Date.now() + '-' + index
        content.id = id
        trigger.setAttribute('aria-controls', id)
        trigger.setAttribute('aria-expanded', 'false')
        content.setAttribute('role', 'region')
        content.setAttribute('aria-labelledby', trigger.id || '')

        // Ensure content is collapsed
        content.style.maxHeight = '0'
        content.style.overflow = 'hidden'

        trigger.addEventListener('click', function () {
          var isOpen = item.classList.contains('accordion__item--open')

          // Single mode: close others
          if (isSingle && !isOpen) {
            items.forEach(function (other) {
              if (other !== item) {
                self._close(other)
              }
            })
          }

          if (isOpen) {
            self._close(item)
          } else {
            self._open(item)
          }
        })

        // Keyboard: Enter or Space
        trigger.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            trigger.click()
          }
        })
      })
    },

    _open: function (item) {
      var trigger = $('.accordion__trigger', item)
      var content = $('.accordion__content', item)
      if (!content) return

      item.classList.add('accordion__item--open')
      trigger.setAttribute('aria-expanded', 'true')
      content.style.maxHeight = content.scrollHeight + 'px'

      // Re-measure after transitions in case of nested content
      var onEnd = function () {
        content.style.maxHeight = content.scrollHeight + 'px'
        content.removeEventListener('transitionend', onEnd)
      }
      content.addEventListener('transitionend', onEnd)
    },

    _close: function (item) {
      var trigger = $('.accordion__trigger', item)
      var content = $('.accordion__content', item)
      if (!content) return

      item.classList.remove('accordion__item--open')
      trigger.setAttribute('aria-expanded', 'false')
      content.style.maxHeight = '0'
    },
  }

  /* ══════════════════════════════════════════════════════════
     9. PARALLAX
     Subtle parallax on hero orbs and designated images.
     Uses requestAnimationFrame for smoothness.
     Disabled on touch devices and reduced motion.
     ══════════════════════════════════════════════════════════ */

  var Parallax = {
    elements: [],
    raf: null,
    active: false,

    init: function () {
      if (prefersReducedMotion() || isTouchDevice()) return

      this.elements = $$('[data-parallax]').concat($$('.hero__orb'))
      if (!this.elements.length) return

      this.active = true
      this._bindEvents()
      this._update()
    },

    _bindEvents: function () {
      var self = this
      window.addEventListener(
        'scroll',
        function () {
          if (!self.raf) {
            self.raf = requestAnimationFrame(function () {
              self._update()
              self.raf = null
            })
          }
        },
        { passive: true }
      )
    },

    _update: function () {
      var scrollY = getScrollY()
      var vh = getViewport().h

      this.elements.forEach(function (el) {
        var rect = el.getBoundingClientRect()
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15

        // Only animate if in viewport (with buffer)
        if (rect.bottom < -100 || rect.top > vh + 100) return

        // Calculate offset relative to element center
        var center = rect.top + rect.height / 2
        var offset = (center - vh / 2) * speed

        el.style.transform = 'translate3d(0, ' + offset + 'px, 0)'
      })
    },
  }

  /* ══════════════════════════════════════════════════════════
     10. MAGNETIC BUTTONS
     Premium hover effect — button slightly follows cursor.
     Applied to elements with .btn--magnetic or data-magnetic
     Disabled on touch devices and reduced motion.
     ══════════════════════════════════════════════════════════ */

  var MagneticButtons = {
    init: function () {
      if (prefersReducedMotion() || isTouchDevice()) return

      var buttons = $$('.btn--magnetic, [data-magnetic]')
      buttons.forEach(this._setup.bind(this))
    },

    _setup: function (btn) {
      var strength = parseFloat(btn.getAttribute('data-magnetic')) || 0.3

      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect()
        var x = e.clientX - rect.left - rect.width / 2
        var y = e.clientY - rect.top - rect.height / 2

        btn.style.transform =
          'translate(' +
          x * strength +
          'px, ' +
          y * strength +
          'px)'
      })

      btn.addEventListener('mouseleave', function () {
        btn.style.transform = ''
        btn.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        setTimeout(function () {
          btn.style.transition = ''
        }, 400)
      })
    },
  }

  /* ══════════════════════════════════════════════════════════
     11. CURSOR GLOW
     Subtle radial glow that follows the cursor.
     Applied on sections with .has-cursor-glow
     Disabled on touch and reduced motion.
     ══════════════════════════════════════════════════════════ */

  var CursorGlow = {
    init: function () {
      if (prefersReducedMotion() || isTouchDevice()) return

      var sections = $$('.has-cursor-glow')
      sections.forEach(this._setup.bind(this))
    },

    _setup: function (section) {
      var glow = document.createElement('div')
      glow.style.cssText =
        'position:absolute;width:400px;height:400px;border-radius:50%;' +
        'background:radial-gradient(circle,rgba(42,107,124,0.06) 0%,transparent 70%);' +
        'pointer-events:none;transform:translate(-50%,-50%);z-index:0;' +
        'transition:opacity 0.3s ease;opacity:0;'

      // Ensure section has relative positioning
      var pos = getComputedStyle(section).position
      if (pos === 'static') section.style.position = 'relative'
      section.style.overflow = 'hidden'
      section.appendChild(glow)

      section.addEventListener('mousemove', function (e) {
        var rect = section.getBoundingClientRect()
        glow.style.left = e.clientX - rect.left + 'px'
        glow.style.top = e.clientY - rect.top + 'px'
        glow.style.opacity = '1'
      })

      section.addEventListener('mouseleave', function () {
        glow.style.opacity = '0'
      })
    },
  }

  /* ══════════════════════════════════════════════════════════
     12. IMAGE LAZY LOAD
     Native loading="lazy" with IntersectionObserver fallback.
     Adds a fade-in effect when images enter viewport.
     ══════════════════════════════════════════════════════════ */

  var LazyImages = {
    init: function () {
      var images = $$('img[data-src], img[loading="lazy"]')
      if (!images.length) return

      // For data-src images, use IntersectionObserver
      var dataSrcImages = images.filter(function (img) {
        return img.hasAttribute('data-src')
      })

      if (!dataSrcImages.length) return

      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                var img = entry.target
                img.src = img.getAttribute('data-src')
                img.removeAttribute('data-src')
                img.classList.add('is-loaded')
                observer.unobserve(img)
              }
            })
          },
          { rootMargin: '200px' }
        )

        dataSrcImages.forEach(function (img) {
          img.style.opacity = '0'
          img.style.transition = 'opacity 0.6s ease'
          observer.observe(img)

          img.addEventListener('load', function () {
            img.style.opacity = '1'
          })
        })
      } else {
        // Fallback: load all immediately
        dataSrcImages.forEach(function (img) {
          img.src = img.getAttribute('data-src')
          img.removeAttribute('data-src')
        })
      }
    },
  }

  /* ══════════════════════════════════════════════════════════
     13. STAGGERED GRID ANIMATION
     Auto-adds staggered delays to grid children.
     Usage: <div class="grid stagger-children">
     ══════════════════════════════════════════════════════════ */

  var StaggeredGrid = {
    init: function () {
      if (prefersReducedMotion()) return

      var grids = $$('.stagger-children, [data-stagger]')
      if (!grids.length) return

      grids.forEach(this._setup.bind(this))
    },

    _setup: function (grid) {
      var children = Array.prototype.slice.call(grid.children)
      var baseDelay = parseInt(grid.getAttribute('data-stagger'), 10) || 80

      children.forEach(function (child, i) {
        if (child.classList.contains('reveal')) {
          child.setAttribute('data-reveal-delay', String(i * baseDelay))
        } else {
          child.classList.add('reveal')
          child.setAttribute('data-reveal-delay', String(i * baseDelay))
        }
      })
    },
  }

  /* ══════════════════════════════════════════════════════════
     14. TEXT SPLIT ANIMATION
     Splits text into wrapped spans for per-word or per-char
     animation. Usage: <h1 class="text-split" data-split="word">
     ══════════════════════════════════════════════════════════ */

  var TextSplit = {
    init: function () {
      if (prefersReducedMotion()) return

      var elements = $$('.text-split, [data-split]')
      elements.forEach(this._split.bind(this))
    },

    _split: function (el) {
      var mode = el.getAttribute('data-split') || 'word'
      var text = el.textContent.trim()
      var delay = parseInt(el.getAttribute('data-split-delay'), 10) || 40

      el.setAttribute('aria-label', text)
      el.innerHTML = ''

      if (mode === 'char') {
        text.split('').forEach(function (char, i) {
          var span = document.createElement('span')
          span.textContent = char === ' ' ? '\u00A0' : char
          span.style.cssText =
            'display:inline-block;opacity:0;transform:translateY(20px);' +
            'transition:opacity 0.5s ease, transform 0.5s ease;' +
            'transition-delay:' + i * delay + 'ms;'
          span.setAttribute('aria-hidden', 'true')
          el.appendChild(span)
        })
      } else {
        text.split(/\s+/).forEach(function (word, i) {
          var span = document.createElement('span')
          span.textContent = word
          span.style.cssText =
            'display:inline-block;opacity:0;transform:translateY(16px);' +
            'transition:opacity 0.5s ease, transform 0.5s ease;' +
            'transition-delay:' + i * delay + 'ms;margin-right:0.3em;'
          span.setAttribute('aria-hidden', 'true')
          el.appendChild(span)
        })
      }

      // Observe for viewport entry
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                var spans = $$('span', entry.target)
                spans.forEach(function (s) {
                  s.style.opacity = '1'
                  s.style.transform = 'translateY(0)'
                })
                observer.unobserve(entry.target)
              }
            })
          },
          { threshold: 0.2 }
        )
        observer.observe(el)
      } else {
        $$('span', el).forEach(function (s) {
          s.style.opacity = '1'
          s.style.transform = 'translateY(0)'
        })
      }
    },
  }

  /* ══════════════════════════════════════════════════════════
     15. ACCESSIBILITY
     Live region announcer, keyboard helpers
     ══════════════════════════════════════════════════════════ */

  var Accessibility = {
    announcer: null,

    init: function () {
      this._createAnnouncer()
      this._handleTabKey()
    },

    /**
     * Create an ARIA live region for dynamic announcements
     */
    _createAnnouncer: function () {
      this.announcer = document.createElement('div')
      this.announcer.setAttribute('role', 'status')
      this.announcer.setAttribute('aria-live', 'polite')
      this.announcer.setAttribute('aria-atomic', 'true')
      this.announcer.className = 'sr-only'
      document.body.appendChild(this.announcer)

      // Expose globally for form handlers
      window.announce = this.announce.bind(this)
    },

    /**
     * Announce a message to screen readers
     * @param {string} message
     */
    announce: function (message) {
      if (!this.announcer) return
      this.announcer.textContent = ''
      // Slight delay to ensure screen readers pick up the change
      var ann = this.announcer
      setTimeout(function () {
        ann.textContent = message
      }, 50)
    },

    /**
     * Show focus outlines only when tabbing (not clicking)
     */
    _handleTabKey: function () {
      var usingKeyboard = false

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          usingKeyboard = true
          document.body.classList.add('using-keyboard')
        }
      })

      document.addEventListener('mousedown', function () {
        usingKeyboard = false
        document.body.classList.remove('using-keyboard')
      })
    },
  }

  /* ══════════════════════════════════════════════════════════
     16. PAGE TRANSITIONS
     Subtle fade when navigating between pages.
     Applied via CSS class on body; links trigger it.
     ══════════════════════════════════════════════════════════ */

  var PageTransition = {
    init: function () {
      if (prefersReducedMotion()) return

      // Fade in on page load
      document.body.style.opacity = '0'
      document.body.style.transition = 'opacity 0.4s ease'

      // Use requestAnimationFrame to ensure styles are applied first
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          document.body.style.opacity = '1'
        })
      })

      // Fade out on internal link clicks
      document.addEventListener('click', function (e) {
        var link = e.target.closest('a')
        if (!link) return

        var href = link.getAttribute('href')
        if (!href) return

        // Skip external links, anchors, new-tab links, tel/mailto
        if (
          href.startsWith('#') ||
          href.startsWith('http') ||
          href.startsWith('tel:') ||
          href.startsWith('mailto:') ||
          link.getAttribute('target') === '_blank' ||
          link.hasAttribute('download') ||
          e.ctrlKey ||
          e.metaKey ||
          e.shiftKey
        ) {
          return
        }

        e.preventDefault()

        document.body.style.opacity = '0'

        setTimeout(function () {
          window.location.href = href
        }, 350)
      })

      // Handle browser back/forward
      window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
          document.body.style.opacity = '1'
        }
      })
    },
  }

  /* ══════════════════════════════════════════════════════════
     17. INITIALIZATION
     Orchestrates all modules in the correct order.
     ══════════════════════════════════════════════════════════ */

  function init() {
    // Phase 1: Accessibility + page transition (immediately)
    Accessibility.init()
    PageTransition.init()

    // Phase 2: Load components (header/footer), then init nav-dependent modules
    ComponentLoader.init()

    ComponentLoader.onReady(function () {
      Header.init()
      MobileNav.init()
    })

    // Phase 3: Content-driven modules (work with or without header/footer)
    ScrollProgress.init()
    SmoothScroll.init()
    StaggeredGrid.init()
    ScrollReveal.init()
    CounterAnimation.init()
    TextSplit.init()
    Accordion.init()
    Parallax.init()
    LazyImages.init()

    // Phase 4: Premium effects (non-essential, progressive enhancement)
    MagneticButtons.init()
    CursorGlow.init()
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
