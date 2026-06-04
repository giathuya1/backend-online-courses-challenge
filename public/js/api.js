(function () {
    const TOKEN_KEY = 'access_token';
  
    function getToken() {
      return localStorage.getItem(TOKEN_KEY);
    }
  
    function setToken(token) {
      if (!token) localStorage.removeItem(TOKEN_KEY);
      else localStorage.setItem(TOKEN_KEY, token);
    }
  
    async function apiFetch(path, options) {
      const url = path;
      const opts = options || {};
      const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
  
      const res = await fetch(url, Object.assign({}, opts, { headers }));
  
      const text = await res.text();
      let payload;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  
      if (!res.ok) {
        const msg = payload?.message || `Request failed (${res.status})`;
        const err = new Error(msg);
        err.status = res.status;
        err.payload = payload;
        throw err;
      }
      return payload;
    }
  
    window.DemoApi = { getToken, setToken, apiFetch };
  })();