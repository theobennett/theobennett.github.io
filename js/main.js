document.addEventListener("DOMContentLoaded", function() {
    // --- Fetch and inject the header ---
    fetch('/header.html') // CORRECTED PATH
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading header:', error));

    // --- Fetch and inject the footer ---
    fetch('/footer.html') // CORRECTED PATH
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading footer:', error));
});
