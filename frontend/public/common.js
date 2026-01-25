// common.js
// helpers used by messages.js and slots.js

const API_BASE = 'http://localhost:4000';

export function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

export function formatDate(dtStr) {
  try {
    const d = new Date(dtStr);
    return d.toLocaleString();
  } catch (e) {
    return dtStr;
  }
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'mb-2 rounded-lg px-4 py-2 bg-neutral-800 border border-white/10 text-sm';
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

export function roleGuard() {
  const role = localStorage.getItem('role') || 'MEMBER';
  document.querySelectorAll('[data-role]').forEach(el => {
    const want = el.getAttribute('data-role');
    if (want !== role) el.style.display = 'none';
  });
}
