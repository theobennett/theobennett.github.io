document.addEventListener("DOMContentLoaded", function() {
    // --- Fetch and inject the header ---
    fetch('/theobennett.github.io/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading header:', error));

    // --- Fetch and inject the footer ---
    fetch('/theobennett.github.io/footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading footer:', error));
});
