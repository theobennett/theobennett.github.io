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

        // --- UTILITY: SMOOTH SCROLL ---
        initSmoothScroll() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    document.querySelector(this.getAttribute('href')).scrollIntoView({
                        behavior: 'smooth'
                    });
                });
            });
        },
        
        // --- UI FEATURE: SCROLL REVEAL ANIMATIONS ---
        initScrollReveal() {
            const revealElements = document.querySelectorAll('.fade-in-element');
            if (revealElements.length === 0) return;

            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            revealElements.forEach(element => {
                observer.observe(element);
            });
        },

        // --- UI FEATURE: ACCORDIONS ---
        initAccordions() {
            const accordionGroups = document.querySelectorAll('.accordion-group');
            accordionGroups.forEach(group => {
                const items = group.querySelectorAll('.accordion-item');
                items.forEach(item => {
                    const button = item.querySelector('.accordion-button');
                    const content = item.querySelector('.accordion-content');
                    
                    button.addEventListener('click', () => {
                        const isCurrentlyActive = button.classList.contains('active');
                        
                        // Deactivate all items in this group
                        items.forEach(i => {
                            i.querySelector('.accordion-button').classList.remove('active');
                            i.querySelector('.accordion-content').style.maxHeight = null;
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
