document.addEventListener('DOMContentLoaded', () => {
    const App = {
        init() {
            this.loadComponents();
            this.setupEventListeners();
            this.initScrollReveal();
        },
        setupEventListeners() { /* ... */ },
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
            
            // Correct Absolute Paths
            load('/header.html', 'header-placeholder', () => {
                this.initMobileMenu();
                this.initHeaderScroll();
            });
            load('/footer.html', 'footer-placeholder');
        },
        initMobileMenu() { /* ... */ },
        initHeaderScroll() { /* ... */ },
        initSmoothScroll() { /* ... */ },
        initScrollReveal() { /* ... */ },
        initAccordions() { /* ... */ }
    };
    App.init();
});
