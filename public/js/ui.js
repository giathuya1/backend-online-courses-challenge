(function () {
    async function safeProfile() {
      try {
        return await DemoApi.apiFetch('/api/auth/profile', { method: 'GET' });
      } catch {
        return null;
      }
    }
  
    function isLoggedIn() {
      return !!(window.DemoApi && DemoApi.getToken && DemoApi.getToken());
    }
  
    function navHtml(user) {
      const logged = isLoggedIn();
      const role = user?.data?.roles?.[0] || user?.data?.role || null;
  
      return `
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark border-bottom border-secondary">
    <div class="container">
      <a class="navbar-brand fw-semibold" href="/home.html">Online Learning</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#topnav"
        aria-controls="topnav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
  
      <div class="collapse navbar-collapse" id="topnav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item"><a class="nav-link" href="/home.html">Home</a></li>
          <li class="nav-item"><a class="nav-link" href="/dashboard.html">Dashboard</a></li>
          <li class="nav-item"><a class="nav-link" href="/api/docs">Swagger</a></li>
  
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Admin</a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="/admin/roles.html">Roles</a></li>
            </ul>
          </li>
  
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Instructor</a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="/instructor/courses.html">Courses</a></li>
              <li><a class="dropdown-item" href="/instructor/classes.html">Classes</a></li>
            </ul>
          </li>
  
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Student</a>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="/student/enroll.html">Enroll</a></li>
            </ul>
          </li>
        </ul>
  
        <div class="d-flex align-items-center gap-2">
          ${logged
            ? `<span class="text-light small">Hello, <span class="fw-semibold">${user?.data?.name || user?.data?.username || 'user'}</span>${role ? ` <span class="badge text-bg-secondary ms-2">${role}</span>` : ''}</span>`
            : `<span class="text-light small">Not logged in</span>`}
  
          ${logged
            ? `<a class="btn btn-outline-light btn-sm" href="/profile.html">Profile</a>
               <button id="btnLogoutLocal" class="btn btn-warning btn-sm" type="button">Logout</button>`
            : `<a class="btn btn-success btn-sm" href="/auth-login.html">Login</a>`
          }
        </div>
      </div>
    </div>
  </nav>`;
    }
  
    async function mountNavbar() {
      const host = document.getElementById('app-navbar');
      if (!host) return;
  
      const user = isLoggedIn() ? await safeProfile() : null;
      host.innerHTML = navHtml(user);
  
      const btn = document.getElementById('btnLogoutLocal');
      if (btn) {
        btn.addEventListener('click', () => {
          DemoApi.setToken(null);
          location.href = '/home.html';
        });
      }
    }
  
    async function requireRole(allowed) {
      if (!isLoggedIn()) {
        location.href = '/auth-login.html?next=' + encodeURIComponent(location.pathname);
        return;
      }
  
      const profile = await safeProfile();
      const role = profile?.data?.roles?.[0] || null;
  
      if (!role || !allowed.includes(role)) {
        document.body.innerHTML = `
          <div class="container py-5">
            <div class="alert alert-danger card-soft">
              <div class="fw-bold mb-1">Forbidden</div>
              <div>You do not have permission to access this page.</div>
              <div class="mt-3"><a class="btn btn-outline-secondary" href="/home.html">Back to Home</a></div>
            </div>
          </div>`;
      }
    }
  
    window.DemoUI = { mountNavbar, requireRole };
  })();