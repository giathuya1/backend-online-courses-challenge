const tempToken = localStorage.getItem('temp_token');
const userEmail = localStorage.getItem('user_email');

const emailBadge = document.getElementById('emailBadge');
const otpInput = document.getElementById('otp');

const otpForm = document.getElementById('otpForm');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');

const errorDiv = document.getElementById('errorDiv');
const infoDiv = document.getElementById('infoDiv');

const successOverlay = document.getElementById('successOverlay');
const redirectNum = document.getElementById('redirectNum');
const redirectBar = document.getElementById('redirectBar');
const goHomeBtn = document.getElementById('goHomeBtn');

function showError(html) {
  errorDiv.innerHTML = html;
  errorDiv.style.display = 'block';
  infoDiv.style.display = 'none';
}

function showInfo(html) {
  infoDiv.innerHTML = html;
  infoDiv.style.display = 'block';
  errorDiv.style.display = 'none';
}

function clearMessages() {
  errorDiv.style.display = 'none';
  infoDiv.style.display = 'none';
}

function goHome() {
    window.location.href = '/profile.html';
}

// show email
emailBadge.textContent = userEmail || 'your@email.com';

if (!tempToken) {
  showError('❌ Không tìm thấy temp_token. Vui lòng <a href="/register.html">đăng ký lại</a>.');
}

otpInput.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '');
});

// resend countdown
let resendInterval = null;

function startResendCountdown(seconds = 30) {
  resendBtn.disabled = true;
  resendBtn.textContent = `Gửi lại (${seconds}s)`;

  if (resendInterval) clearInterval(resendInterval);

  resendInterval = setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) {
      clearInterval(resendInterval);
      resendBtn.disabled = false;
      resendBtn.textContent = 'Gửi lại OTP';
      return;
    }
    resendBtn.textContent = `Gửi lại (${seconds}s)`;
  }, 1000);
}

startResendCountdown(30);

// resend OTP
resendBtn.addEventListener('click', async () => {
  if (!tempToken) return;

  clearMessages();
  resendBtn.disabled = true;
  resendBtn.textContent = 'Đang gửi...';

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempToken}`
      }
    });

    const data = await res.json();
    console.log('RESEND OTP RESPONSE:', data);

    if (data.success) {
      otpInput.value = '';
      otpInput.focus();

      showInfo(`✅ OTP đã được gửi lại tới <strong>${userEmail || '(email)'}</strong>. Dùng mã mới nhất trong Gmail.`);
      startResendCountdown(30);
    } else {
      showError(`❌ ${data.message}`);
      resendBtn.disabled = false;
      resendBtn.textContent = 'Gửi lại OTP';
    }
  } catch (err) {
    console.error('RESEND OTP ERROR:', err);
    showError(`❌ Lỗi kết nối: ${err.message}`);
    resendBtn.disabled = false;
    resendBtn.textContent = 'Gửi lại OTP';
  }
});

// verify OTP
otpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!tempToken) return;

  clearMessages();

  const otp = otpInput.value.trim();
  if (otp.length !== 6) {
    showError('❌ OTP phải đủ 6 chữ số.');
    return;
  }

  verifyBtn.disabled = true;
  verifyBtn.textContent = 'Đang xác nhận...';

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempToken}`
      },
      body: JSON.stringify({ otp })
    });

    const data = await res.json();
    console.log('VERIFY OTP RESPONSE:', data);

    if (data.success) {
      localStorage.setItem('access_token', data.data.access_token);
      localStorage.removeItem('temp_token');
      showActivatedPopupAndRedirect();
    } else {
      if (data.violations && data.violations.length) {
        console.warn('OTP VERIFY VIOLATIONS:', data.violations);
        showError(
          data.violations
            .map(v => {
              const field = v.field ? `${v.field}: ` : '';
              const rule = v.rule ? `[${v.rule}] ` : '';
              const msg = v.message || 'Validation error';
              return `❌ ${field}${rule}${msg}`;
            })
            .join('<br>')
        );
      } else {
        showError(`❌ ${data.message}`);
      }

      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Xác nhận';
    }
  } catch (err) {
    console.error('VERIFY OTP ERROR:', err);
    showError(`❌ Lỗi kết nối: ${err.message}`);
    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Xác nhận';
  }
});

// popup
let redirectTimer = null;

function showActivatedPopupAndRedirect() {
  successOverlay.classList.add('show');

  let seconds = 3;
  redirectNum.textContent = String(seconds);
  redirectBar.style.width = '100%';

  if (redirectTimer) clearInterval(redirectTimer);

  redirectTimer = setInterval(() => {
    seconds -= 1;
    redirectNum.textContent = String(seconds);
    redirectBar.style.width = `${(seconds / 3) * 100}%`;

    if (seconds <= 0) {
      clearInterval(redirectTimer);
      goHome();
    }
  }, 1000);
}

goHomeBtn.addEventListener('click', () => {
  if (redirectTimer) clearInterval(redirectTimer);
  goHome();
});