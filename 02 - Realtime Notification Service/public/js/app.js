// Notification Service Dashboard
const API_BASE = '';

// State
let token = localStorage.getItem('token');
let user = null;
let apiKeys = [];

// DOM Elements
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabs = document.querySelectorAll('.tab');

// ========================================
// Toast Notification System
// ========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 4 12 14.01l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m15 9-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// API Helper
async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(API_BASE + endpoint, { ...options, headers });
  const data = await res.json();
  
  if (!res.ok) throw new Error(data.error?.message || 'Request failed');
  return data;
}

// ========================================
// Password Toggle & Strength Functions
// ========================================
function togglePassword(btn) {
  const input = btn.previousElementSibling;
  const type = input.type === 'password' ? 'text' : 'password';
  input.type = type;
  
  // Update icon
  if (type === 'text') {
    btn.innerHTML = `
      <svg class="eye-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  } else {
    btn.innerHTML = `
      <svg class="eye-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }
}

function checkPasswordStrength(password) {
  const strengthBars = document.querySelectorAll('.strength-bar');
  const strengthText = document.querySelector('.strength-text');
  
  if (!strengthBars.length || !strengthText) return;
  
  let strength = 0;
  let strengthLevel = 'weak';
  
  // Length check
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  
  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  // Determine strength level
  if (strength <= 2) {
    strengthLevel = 'weak';
  } else if (strength <= 3) {
    strengthLevel = 'medium';
  } else {
    strengthLevel = 'strong';
  }
  
  // Update bars
  strengthBars.forEach((bar, index) => {
    if (index < strength) {
      bar.classList.add('active', strengthLevel);
    } else {
      bar.classList.remove('active', 'weak', 'medium', 'strong');
    }
  });
  
  // Update text
  strengthText.className = `strength-text ${strengthLevel}`;
  if (password.length === 0) {
    strengthText.textContent = 'Password strength';
    strengthBars.forEach(bar => bar.classList.remove('active', 'weak', 'medium', 'strong'));
  } else if (strengthLevel === 'weak') {
    strengthText.textContent = 'Weak password';
  } else if (strengthLevel === 'medium') {
    strengthText.textContent = 'Medium strength';
  } else {
    strengthText.textContent = 'Strong password';
  }
}

// ========================================
// Auth Functions
// ========================================
async function login(email, password) {
  try {
    const btn = loginForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="loading"></div><span>Signing in...</span>';
    btn.disabled = true;
    
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    token = data.token;
    user = data.user;
    localStorage.setItem('token', token);
    
    showToast('Welcome back! Logging you in...', 'success');
    setTimeout(() => showDashboard(), 500);
  } catch (e) {
    showToast(e.message, 'error');
    const btn = loginForm.querySelector('button[type="submit"]');
    btn.innerHTML = '<span>Sign In</span><svg class="btn-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btn.disabled = false;
  }
}

async function register(name, email, password) {
  try {
    const btn = registerForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="loading"></div><span>Creating account...</span>';
    btn.disabled = true;
    
    // Validate password match
    const confirmPassword = registerForm.querySelector('input[name="confirmPassword"]').value;
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      btn.innerHTML = originalText;
      btn.disabled = false;
      return;
    }
    
    // Validate password strength
    if (password.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      btn.innerHTML = originalText;
      btn.disabled = false;
      return;
    }
    
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    token = data.token;
    localStorage.setItem('token', token);
    await checkAuth();
    
    showToast('Account created successfully! Welcome aboard!', 'success');
    setTimeout(() => showDashboard(), 500);
  } catch (e) {
    showToast(e.message, 'error');
    const btn = registerForm.querySelector('button[type="submit"]');
    btn.innerHTML = '<span>Create Account</span><svg class="btn-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btn.disabled = false;
  }
}

async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // Ignore logout errors
  }
  token = null;
  user = null;
  localStorage.removeItem('token');
  showToast('Logged out successfully', 'info');
  setTimeout(() => showAuth(), 300);
}

async function checkAuth() {
  try {
    const data = await api('/api/auth/me');
    user = data.user;
    return true;
  } catch {
    token = null;
    localStorage.removeItem('token');
    return false;
  }
}

// ========================================
// View Functions
// ========================================
function showAuth() {
  authView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
}

function showDashboard() {
  authView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  
  // Set user name and initials
  const userName = user?.name || 'User';
  document.getElementById('user-name').textContent = userName;
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  document.getElementById('user-initials').textContent = initials;
  
  loadData();
}

// ========================================
// Dashboard Functions
// ========================================
async function loadData() {
  await Promise.all([loadApiKeys(), loadStats()]);
}

async function loadApiKeys() {
  try {
    const data = await api('/api/keys');
    apiKeys = data.keys || [];
    renderApiKeys();
    updateApiKeySelect();
  } catch (e) {
    console.error('Failed to load API keys:', e);
    showToast('Failed to load API keys', 'error');
  }
}

async function loadStats() {
  try {
    const data = await api('/api/stats');
    animateValue('stat-keys', 0, data.apiKeys || 0, 1000);
    animateValue('stat-notifications', 0, data.totalNotifications || 0, 1000);
    animateValue('stat-queue', 0, data.queue?.size || 0, 1000);
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

// Animate numbers counting up
function animateValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }
    obj.textContent = Math.floor(current);
  }, 16);
}

function renderApiKeys() {
  const list = document.getElementById('api-keys-list');
  
  if (apiKeys.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>No API keys yet</h3>
        <p>Create your first API key to get started with the notification service</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = apiKeys.map(k => `
    <div class="api-key-item">
      <div class="api-key-info">
        <h4>${escapeHtml(k.name)}</h4>
        <code>${k.apiKey}</code>
        <small>Created: ${new Date(k.createdAt).toLocaleDateString()} | 
               Notifications: ${k.stats?.totalNotifications || 0}</small>
      </div>
      <div class="api-key-actions">
        <button class="copy-btn" onclick="copyKey('${k.apiKey}')">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Copy
        </button>
        <button class="delete-btn" onclick="deleteKey('${k.apiKey}')">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

function updateApiKeySelect() {
  const select = document.getElementById('notif-api-key');
  select.innerHTML = '<option value="">Select an API key</option>' + 
    apiKeys.map(k => `<option value="${k.apiKey}">${escapeHtml(k.name)}</option>`).join('');
}

async function createApiKey() {
  const nameInput = document.getElementById('key-name');
  const name = nameInput.value.trim();
  
  if (!name) {
    showToast('Please enter a name for the API key', 'warning');
    nameInput.focus();
    return;
  }
  
  try {
    const btn = document.getElementById('create-key-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Creating...';
    btn.disabled = true;
    
    const data = await api('/api/keys', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    
    showToast(`API Key created: ${data.apiKey}`, 'success');
    
    nameInput.value = '';
    document.getElementById('new-key-form').classList.add('hidden');
    await loadData();
    
    btn.textContent = originalText;
    btn.disabled = false;
  } catch (e) {
    showToast('Failed to create API key: ' + e.message, 'error');
    const btn = document.getElementById('create-key-btn');
    btn.textContent = 'Create';
    btn.disabled = false;
  }
}

async function deleteKey(apiKey) {
  if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return;
  
  try {
    await api(`/api/keys/${apiKey}`, { method: 'DELETE' });
    showToast('API key deleted successfully', 'success');
    await loadData();
  } catch (e) {
    showToast('Failed to delete API key: ' + e.message, 'error');
  }
}

function copyKey(apiKey) {
  navigator.clipboard.writeText(apiKey).then(() => {
    showToast('API key copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy API key', 'error');
  });
}

async function sendNotification(e) {
  e.preventDefault();
  
  const apiKey = document.getElementById('notif-api-key').value;
  const channel = document.getElementById('notif-channel').value;
  const message = document.getElementById('notif-message').value;
  
  if (!apiKey) {
    showToast('Please select an API key', 'warning');
    return;
  }
  
  try {
    const btn = e.target.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<div class="loading"></div><span>Sending...</span>';
    btn.disabled = true;
    
    const res = await fetch(API_BASE + '/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        channel,
        data: { message, timestamp: new Date().toISOString() },
        priority: 5
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showToast(`Notification sent successfully! ID: ${data.notificationId}`, 'success');
      document.getElementById('notif-message').value = '';
      loadStats();
    } else {
      showToast(`Failed to send: ${data.error?.message || 'Unknown error'}`, 'error');
    }
    
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  } catch (e) {
    showToast(`Error: ${e.message}`, 'error');
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Send Notification</span>';
    btn.disabled = false;
  }
}

// Code copy function for quick start
function copyCode(btn) {
  const codeBlock = btn.closest('.code-block').querySelector('code');
  navigator.clipboard.writeText(codeBlock.textContent).then(() => {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 4 12 14.01l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Copied!
    `;
    setTimeout(() => {
      btn.innerHTML = originalHTML;
    }, 2000);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// Event Listeners
// ========================================
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    if (tab.dataset.tab === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
    }
  });
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(loginForm);
  login(formData.get('email'), formData.get('password'));
});

registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(registerForm);
  register(formData.get('name'), formData.get('email'), formData.get('password'));
});

// Password strength checker
const registerPasswordInput = document.getElementById('register-password');
if (registerPasswordInput) {
  registerPasswordInput.addEventListener('input', (e) => {
    checkPasswordStrength(e.target.value);
  });
}

// Prevent form submission on social button click
document.querySelectorAll('.btn-social').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Social login coming soon!', 'info');
  });
});

// Prevent default behavior for placeholder links
document.querySelectorAll('a[href="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
  });
});

document.getElementById('logout-btn').addEventListener('click', logout);

document.getElementById('new-key-btn').addEventListener('click', () => {
  const form = document.getElementById('new-key-form');
  form.classList.remove('hidden');
  document.getElementById('key-name').focus();
});

document.getElementById('cancel-key-btn').addEventListener('click', () => {
  document.getElementById('new-key-form').classList.add('hidden');
  document.getElementById('key-name').value = '';
});

document.getElementById('create-key-btn').addEventListener('click', createApiKey);

document.getElementById('notification-form').addEventListener('submit', sendNotification);

// ========================================
// Initialize App
// ========================================
(async () => {
  if (token && await checkAuth()) {
    showDashboard();
  } else {
    showAuth();
  }
})();