const accessToken = localStorage.getItem('access_token');

const profileContainer = document.getElementById('profileContainer');
const errorDiv = document.getElementById('error');
const logoutBtn = document.getElementById('logoutBtn');

function showError(msg) {
  errorDiv.style.display = 'block';
  errorDiv.innerHTML = msg;
}

function logout() {
  localStorage.clear();
  window.location.href = '/login.html';
}

logoutBtn.addEventListener('click', logout);

if (!accessToken) {
  window.location.href = '/login.html';
} else {
  loadProfile();
}

async function loadProfile() {
  try {
    const response = await fetch('/api/auth/profile', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const data = await response.json();
    console.log('PROFILE RESPONSE:', data);

    if (!data.success) {
      showError(`❌ ${data.message}`);
      return;
    }

    const profile = data.data;

    profileContainer.innerHTML = `
      <div class="profile-item">
        <div class="profile-label">Name</div>
        <div class="profile-value">${profile.name}</div>
      </div>
      <div class="profile-item">
        <div class="profile-label">Email</div>
        <div class="profile-value">${profile.email}</div>
      </div>
      <div class="profile-item">
        <div class="profile-label">Status</div>
        <div class="profile-value">${profile.status}</div>
      </div>
      <div class="profile-item">
        <div class="profile-label">Roles</div>
        <div class="profile-value">${(profile.roles || []).join(', ')}</div>
      </div>
      <div class="profile-item">
        <div class="profile-label">Joined</div>
        <div class="profile-value">${new Date(profile.createdAt).toLocaleDateString()}</div>
      </div>
    `;
  } catch (err) {
    console.error('PROFILE JS ERROR:', err);
    showError(`❌ Error: ${err.message}`);
  }
}
 