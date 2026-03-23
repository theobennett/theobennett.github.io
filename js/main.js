document.addEventListener("DOMContentLoaded", function() {

    // --- 1. Load Header and Footer ---
    const loadComponent = (url, placeholderId) => {
        fetch(url)
            .then(response => response.ok ? response.text() : Promise.reject('File not found'))
            .then(data => {
                document.getElementById(placeholderId).innerHTML = data;
                if (placeholderId === 'header-placeholder') {
                    initMobileMenu();
                    initHeaderScroll();
                }
            })
            .catch(error => console.error(`Error loading ${placeholderId}:`, error));
    };
    
    loadComponent('/header.html', 'header-placeholder');
    loadComponent('/footer.html', 'footer-placeholder');

    // --- 2. Initialize Mobile Menu ---
    const initMobileMenu = () => {
        const navToggle = document.getElementById('nav-toggle');
        const mainNav = document.getElementById('main-nav');
        if (navToggle && mainNav) {
            navToggle.addEventListener('click', () => {
                mainNav.classList.toggle('is-active');
            });
        }
    };

    // --- 3. NEW: Header On-Scroll Effect ---
    const initHeaderScroll = () => {
        const header = document.querySelector('.main-header');
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            });
        }
    };

    // --- 4. Initialize Scroll-Reveal Animations ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                // Apply a staggered delay for a more elegant effect
                entry.target.style.transitionDelay = `${i * 100}ms`;
                entry.target.classList.add('is-visible');
            }
        });
    }, {
        threshold: 0.1
    });

    const elementsToAnimate = document.querySelectorAll('.fade-in-element');
    elementsToAnimate.forEach(el => observer.observe(el));

    // --- 5. Initialize Accordion ---
    const accordionButtons = document.querySelectorAll('.accordion-button');
    accordionButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            const content = button.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            } 
        });
    });

});
