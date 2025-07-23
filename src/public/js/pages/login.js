(function() {
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('toggle-password');
    
    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });

    async function handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        const loginBtn = document.getElementById('login-btn');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        errorMessage.style.display = 'none';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (data.success) {
                if (data.role === 'super_admin') {
                    window.location.href = '/super-admin';
                } else {
                    window.location.href = '/';
                }
            } else {
                if (data.code === 'SUBSCRIPTION_INACTIVE') {
                    if (data.role === 'agency_admin') {
                        window.location.href = '/subscribe';
                    } else {
                        errorMessage.textContent = 'اشتراک بنگاه شما منقضی شده است. لطفاً با مدیر خود تماس بگیرید.';
                        errorMessage.style.display = 'block';
                    }
                } else {
                    errorMessage.textContent = data.error || 'خطا در ورود';
                    errorMessage.style.display = 'block';
                }
            }
        } catch (error) {
            errorMessage.textContent = 'خطا در ارتباط با سرور';
            errorMessage.style.display = 'block';
        } finally {
             loginBtn.disabled = false;
             loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ورود';
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });
})();