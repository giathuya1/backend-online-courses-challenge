const form = document.getElementById('loginForm');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    console.log('LOGIN RESPONSE:', data);

    if (data.success) {
      successDiv.style.display = 'block';
      successDiv.innerHTML = '✅ Login successful! Redirecting to profile...';

      localStorage.setItem('access_token', data.data.access_token);
      localStorage.setItem('user_email', data.data.user.email);
      localStorage.setItem('user_name', data.data.user.name);
      localStorage.setItem('user_username', data.data.user.username);
      localStorage.setItem('user_role', data.data.user.role);

      setTimeout(() => {
        window.location.href = '/profile.html';
      }, 1200);
    } else {
      errorDiv.style.display = 'block';
      if (data.violations && data.violations.length) {
        errorDiv.innerHTML = data.violations.map(v => `❌ ${v.field}: ${v.message}`).join('<br>');
      } else {
        errorDiv.innerHTML = `❌ ${data.message}`;
      }
    }
  } catch (error) {
    console.error('LOGIN JS ERROR:', error);
    errorDiv.style.display = 'block';
    errorDiv.innerHTML = `❌ Error: ${error.message}`;
  }
});