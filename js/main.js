/**
 * Altos Psychiatry - Main Application Script
 *
 * This script is structured in a modular "App" object to keep code organized,
 * maintainable, and prevent pollution of the global namespace.
 *
 * Features:
 * - Asynchronous component loading (header/footer)
 * - Advanced mobile navigation (animated toggle, body scroll lock)
 * - "Scrolled" state management for the header
 * - Smooth scrolling for on-page anchor links
 * - Intersection Observer for scroll-reveal animations
 * - Grouped accordion functionality (only one item open at a time)
 */
document.addEventListener('DOMContentLoaded', () => {

    const App = {
        // --- INITIALIZATION ---
        init() {
            this.loadComponents();
            this.setupEventListeners();
            this.initScrollReveal();
        },

        // --- SETUP EVENT LISTENERS ---
        setupEventListeners() {
            this.initSmoothScroll();
            this.initAccordions();
        },

        // --- COMPONENT LOADING ---
        loadComponents() {
            const load = (url, placeholderId, callback) => {
                fetch(url)
                    .then(response => response.ok ? response.text() : Promise.reject(`File not found: ${url}`))
                    .then(data => {
                        const placeholder = document.getElementById(placeholderId);
                        if (placeholder) {
                            placeholder.innerHTML = data;
                            if (callback) callback();
                        }
                    })
                    .catch(error => console.error(`Error loading ${placeholderId}:`, error));
            };
            
            // Load header, then initialize header-dependent scripts
            load('/header.html', 'header-placeholder', () => {
                this.initMobileMenu();
                this.initHeaderScroll();
            });

            // Load footer
            load('/footer.html', 'footer-placeholder');
        },

        // --- UI FEATURE: ADVANCED MOBILE MENU ---
        initMobileMenu() {
            const navToggle = document.getElementById('nav-toggle');
            const mainNav = document.getElementById('main-nav');

            if (!navToggle || !mainNav) return;

            navToggle.addEventListener('click', () => {
                const isActive = mainNav.classList.toggle('is-active');
                navToggle.classList.toggle('is-active');
                document.body.classList.toggle('nav-is-active', isActive); // For scroll lock
            });
        },

        // --- UI FEATURE: HEADER SCROLL STATE ---
        initHeaderScroll() {
            const header = document.querySelector('.main-header');
            if (!header) return;

            // Use a threshold to prevent effect on minor scrolls
            const scrollThreshold = 50; 

            window.addEventListener('scroll', () => {
                header.classList.toggle('scrolled', window.scrollY > scrollThreshold);
            }, { passive: true }); // Improves scroll performance
        },

        // --- UI FEATURE: SMOOTH SCROLLING ---
        initSmoothScroll() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    const href = this.getAttribute('href');
                    // Ensure it's not just a standalone hash
                    if (href.length > 1) {
                        e.preventDefault();
                        const targetElement = document.querySelector(href);
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                });
            });
        },

        // --- UI FEATURE: SCROLL REVEAL ANIMATIONS ---
        initScrollReveal() {
            const elementsToAnimate = document.querySelectorAll('.fade-in-element');
            if (elementsToAnimate.length === 0) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry, i) => {
                    if (entry.isIntersecting) {
                        entry.target.style.transitionDelay = `${i * 100}ms`;
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target); // Optional: Stop observing once visible for performance
                    }
                });
            }, { threshold: 0.1 });

            elementsToAnimate.forEach(el => observer.observe(el));
        },

        // --- UI FEATURE: GROUPED ACCORDION ---
        initAccordions() {
            const accordions = document.querySelectorAll('.accordion');
            accordions.forEach(accordion => {
                const buttons = accordion.querySelectorAll('.accordion-button');
                buttons.forEach(button => {
                    button.addEventListener('click', () => {
                        const content = button.nextElementSibling;
                        const isCurrentlyActive = button.classList.contains('active');

                        // Close all other items in this group
                        buttons.forEach(otherButton => {
                            if (otherButton !== button) {
                                otherButton.classList.remove('active');
                                otherButton.nextElementSibling.style.maxHeight = null;
                            }
                        });

                        // Toggle the clicked item
                        if (!isCurrentlyActive) {
                            button.classList.add('active');
                            content.style.maxHeight = content.scrollHeight + "px";
                        } else {
                            button.classList.remove('active');
                            content.style.maxHeight = null;
                        }
                    });
                });
            });
        }
    };

    // Run the application
    App.init();
});
