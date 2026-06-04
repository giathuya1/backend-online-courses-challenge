const form = document.getElementById('registerForm');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const username = document.getElementById('username').value.trim();
  const name = document.getElementById('name').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, name, password, confirmPassword })
    });

    const data = await response.json();
    console.log('REGISTER RESPONSE:', data);

    if (data.success) {
      const toEmail = data?.data?.email || email;

      successDiv.style.display = 'block';
      successDiv.innerHTML = `
        <strong>✅ Đăng ký thành công!</strong><br>
        Mã OTP đã gửi tới <strong>${toEmail}</strong>. Vui lòng kiểm tra Gmail (Inbox/Spam).<br>
        <small>Tự động chuyển sang trang nhập OTP sau 2 giây...</small>
      `;

      localStorage.setItem('temp_token', data.data.temp_token);
      localStorage.setItem('user_email', data.data.email);
      localStorage.setItem('user_username', data.data.username);

      setTimeout(() => {
        window.location.href = '/otp.html';
      }, 2000);
    } else {
      errorDiv.style.display = 'block';
      if (data.violations) {
        errorDiv.innerHTML = data.violations.map(v => `❌ ${v.field}: ${v.message}`).join('<br>');
      } else {
        errorDiv.innerHTML = `❌ ${data.message}`;
      }
    }
  } catch (error) {
    console.error('REGISTER JS ERROR:', error);
    errorDiv.style.display = 'block';
    errorDiv.innerHTML = `❌ Error: ${error.message}`;
  }
});