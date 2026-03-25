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
                // CORRECTED: Paths are now absolute for a User Page setup.
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
            
            // CORRECTED: Using absolute paths
            load('/header.html', 'header-placeholder', () => {
                this.initMobileMenu();
                this.initHeaderScroll();
            });

            load('/footer.html', 'footer-placeholder');
        },
        // ... rest of the JS file is correct ...
    };

    App.init();
});
