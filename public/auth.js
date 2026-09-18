const API = ""; // même origine → pas besoin de http://localhost:3000

// --- Gestion du token ---
function getToken()   { return localStorage.getItem("token"); }
function setToken(t)  { localStorage.setItem("token", t); }
function logout()     { localStorage.removeItem("token"); location.href = "/login.html"; }

// --- Vérifier qu'on est connecté (redirige sinon) ---
async function requireAuth() {
  const token = getToken();
  if (!token) { location.href = "/login.html"; return null; }
  const res = await fetch(`${API}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) { logout(); return null; }
  return res.json(); // { id, email }
}

// --- Si déjà connecté, on va sur le dashboard ---
async function redirectIfLoggedIn() {
  if (getToken()) location.href = "/dashboard.html";
}

// --- Helper fetch avec token ---
async function apiFetch(url, options = {}) {
  const token = getToken();
  options.headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };
  return fetch(`${API}${url}`, options);
}