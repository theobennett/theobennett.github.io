/**
 * Altos Psychiatry - Main Application Script
 */
document.addEventListener('DOMContentLoaded', () => {

    const App = {
        init() {
            this.loadComponents();
            this.setupEventListeners();
            this.initScrollReveal();
        },

        setupEventListeners() {
            this.initSmoothScroll();
            this.initAccordions();
        },

        loadComponents() {
            const load = (url, placeholderId, callback) => {
                // CORRECTED: Paths are now relative to work with the <base> tag.
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
            
            load('header.html', 'header-placeholder', () => {
                this.initMobileMenu();
                this.initHeaderScroll();
            });

            load('footer.html', 'footer-placeholder');
        },

        initMobileMenu() {
            const navToggle = document.getElementById('nav-toggle');
            const mainNav = document.getElementById('main-nav');

            if (!navToggle || !mainNav) return;

            navToggle.addEventListener('click', () => {
                const isActive = mainNav.classList.toggle('is-active');
                navToggle.classList.toggle('is-active');
                document.body.classList.toggle('nav-is-active', isActive);
            });
        },

        initHeaderScroll() {
            const header = document.querySelector('.main-header');
            if (!header) return;
            const scrollThreshold = 50; 
            window.addEventListener('scroll', () => {
                header.classList.toggle('scrolled', window.scrollY > scrollThreshold);
            }, { passive: true });
        },

        initSmoothScroll() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    document.querySelector(this.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
                });
            });
        },
        
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
            revealElements.forEach(element => { observer.observe(element); });
        },

        initAccordions() {
            const accordionGroups = document.querySelectorAll('.accordion-group');
            accordionGroups.forEach(group => {
                const items = group.querySelectorAll('.accordion-item');
                items.forEach(item => {
                    const button = item.querySelector('.accordion-button');
                    const content = item.querySelector('.accordion-content');
                    
                    button.addEventListener('click', () => {
                        const isCurrentlyActive = button.classList.contains('active');
                        items.forEach(i => {
                            i.querySelector('.accordion-button').classList.remove('active');
                            i.querySelector('.accordion-content').style.maxHeight = null;
                        });

                        if (!isCurrentlyActive) {
                            button.classList.add('active');
                            content.style.maxHeight = content.scrollHeight + "px";
                        }
                    });
                });
            });
        }
    };

    App.init();
});
