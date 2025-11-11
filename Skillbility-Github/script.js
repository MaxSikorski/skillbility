// Tab functionality for categories
const tabs = document.querySelectorAll('.tab');
const thumbs = document.querySelectorAll('.thumb');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');

        const category = tab.getAttribute('data-category');
        thumbs.forEach(thumb => {
            if (category === 'all' || thumb.classList.contains(category)) {
                thumb.classList.add('active');
                thumb.style.display = 'block';
            } else {
                thumb.classList.remove('active');
                thumb.style.display = 'none';
            }
        });
    });
});

// Form submission
const form = document.getElementById('signup-form');
form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thanks for signing up! We\'ll be in touch soon.');
    console.log('Form submitted:', {
        email: document.getElementById('email').value,
        name: document.getElementById('name').value,
        type: document.getElementById('type').value
    });
    // Reset form
    form.reset();
});
