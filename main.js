/**
 * Altos Psychiatry - Header Scroll Effect
 * 
 * This script detects when the user scrolls down the page and adds
 * a 'scrolled' class to the main header. The CSS then uses this class
 * to change the header's background from transparent to a solid,
 * blurred style for better visibility.
 */
document.addEventListener('DOMContentLoaded', function() {

    const header = document.querySelector('.main-header');

    // Ensure the header element exists before adding the event listener
    if (header) {
        
        const scrollThreshold = 50; // Pixels to scroll before the header changes

        window.addEventListener('scroll', function() {
            // If the user has scrolled past the threshold
            if (window.scrollY > scrollThreshold) {
                // Add the .scrolled class if it's not already there
                header.classList.add('scrolled');
            } else {
                // Remove the .scrolled class
                header.classList.remove('scrolled');
            }
        });
    }

});
