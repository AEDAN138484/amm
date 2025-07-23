(function() {
    const checkbox = document.getElementById('checkbox');
    
    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if(checkbox) checkbox.checked = (theme === 'dark');
    }

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    if(checkbox) {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                applyTheme('dark');
            } else {
                applyTheme('light');
            }
        });
    }

    window.addEventListener('storage', (event) => {
        if (event.key === 'theme') {
            applyTheme(event.newValue);
        }
    });
})();