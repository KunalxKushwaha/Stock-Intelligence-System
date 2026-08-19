/* ==========================================================
   Cloud-Synced Auth & Multi-Device Sync
   Loaded AFTER app.js. Adds account creation/login and pushes the
   existing watchlist/positions/settings to MongoDB via the new
   /api/auth and /api/sync endpoints whenever someone is signed in.
   Guest mode is untouched — localStorage stays the fallback/cache
   when nobody is logged in, exactly like before.
   ========================================================== */

const AUTH_API_BASE = 'http://127.0.0.1:8000/api/auth';
const SYNC_API_BASE = 'http://127.0.0.1:8000/api/sync';

let authToken = localStorage.getItem('auth_token') || null;
let currentUser = null; // { id, name, email, created_at }

// ---------- modal open / close / tab switching ----------
function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal').classList.remove('hidden');
  document.body.classList.add('modal-open');
  switchAuthTab(tab);
}
function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  document.body.classList.remove('modal-open');
}
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('auth-form-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('auth-form-register').classList.toggle('hidden', tab !== 'register');
  const errBox = document.getElementById('auth-error-box');
  if (errBox) errBox.classList.add('hidden');
}
function showAuthError(message) {
  const box = document.getElementById('auth-error-box');
  if (!box) return;
  box.textContent = message;
  box.classList.remove('hidden');
}

// ---------- register / login / logout ----------
async function submitRegister() {
  const name = document.getElementById('register-name-input').value.trim();
  const email = document.getElementById('register-email-input').value.trim();
  const password = document.getElementById('register-password-input').value;

  if (!name || !email || password.length < 8) {
    showAuthError('Please fill every field — password needs at least 8 characters.');
    return;
  }
  try {
    const res = await fetch(`${AUTH_API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) { showAuthError(data.detail || 'Registration failed.'); return; }
    await onAuthSuccess(data);
  } catch (err) {
    console.error('Register error:', err);
    showAuthError('Could not reach the server. Is the backend running on :8000?');
  }
}

async function submitLogin() {
  const email = document.getElementById('login-email-input').value.trim();
  const password = document.getElementById('login-password-input').value;
  try {
    const res = await fetch(`${AUTH_API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { showAuthError(data.detail || 'Login failed.'); return; }
    await onAuthSuccess(data);
  } catch (err) {
    console.error('Login error:', err);
    showAuthError('Could not reach the server. Is the backend running on :8000?');
  }
}

async function onAuthSuccess(tokenResponse) {
  authToken = tokenResponse.access_token;
  currentUser = tokenResponse.user;
  localStorage.setItem('auth_token', authToken);
  closeAuthModal();
  updateAuthNavUI();
  await pullSyncedDataFromServer(); // hydrate this device with the account's saved data
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('auth_token');
  updateAuthNavUI();
}

function updateAuthNavUI() {
  const btn = document.getElementById('auth-nav-btn');
  if (!btn) return;
  btn.textContent = currentUser ? `👤 ${currentUser.name}` : '👤 Sign In';
  btn.onclick = currentUser ? logout : () => openAuthModal('login');
  btn.title = currentUser ? 'Click to sign out' : 'Sign in to sync across devices';
}

// ---------- pulling synced data down (on login and on page load) ----------
async function pullSyncedDataFromServer() {
  if (!authToken) return;
  try {
    const res = await fetch(SYNC_API_BASE, { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (res.status === 401) { logout(); return; }
    const data = await res.json();
    localStorage.setItem('user_watchlist', JSON.stringify(data.watchlist || ['AAPL']));
    localStorage.setItem('user_positions', JSON.stringify(data.positions || []));
    localStorage.setItem('user_settings', JSON.stringify(data.settings || { risk_profile: 'balanced', theme: 'dark' }));
    updateWatchlistStarState();
    const portfolioModal = document.getElementById('portfolio-modal');
    if (portfolioModal && !portfolioModal.classList.contains('hidden')) {
      renderWatchlistTab();
      renderLivePositionsTab();
    }
  } catch (err) {
    console.error('Sync pull error:', err);
  }
}

async function tryAutoLogin() {
  if (!authToken) { updateAuthNavUI(); return; }
  try {
    const res = await fetch(`${AUTH_API_BASE}/me`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (!res.ok) { logout(); return; }
    currentUser = await res.json();
    updateAuthNavUI();
    await pullSyncedDataFromServer();
  } catch (err) {
    console.error('Auto-login check failed:', err);
    updateAuthNavUI();
  }
}

// ---------- pushing changes up whenever they happen ----------
async function pushWatchlistToServer(watchlist) {
  if (!authToken) return;
  try {
    await fetch(`${SYNC_API_BASE}/watchlist`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ watchlist })
    });
  } catch (err) { console.error('Watchlist sync push failed:', err); }
}

async function pushPositionsToServer(positions) {
  if (!authToken) return;
  try {
    await fetch(`${SYNC_API_BASE}/positions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ positions })
    });
  } catch (err) { console.error('Positions sync push failed:', err); }
}

// ---------- extend the existing watchlist functions with sync ----------
// Identical guest behavior to before; signed-in users additionally get
// every change pushed to their account so it shows up on other devices.
// (Redeclaring these here — loaded after app.js — safely overrides the
// app.js versions; nothing else in app.js changes.)
function toggleCurrentWatchlist() {
  let w = getStoredWatchlist();
  if (w.includes(activeTicker)) w = w.filter(t => t !== activeTicker);
  else w.push(activeTicker);
  localStorage.setItem('user_watchlist', JSON.stringify(w));
  updateWatchlistStarState();
  pushWatchlistToServer(w);
}

function renderWatchlistTab() {
  document.getElementById('watchlist-items-container').innerHTML = getStoredWatchlist().map(t => `
    <div class="port-item-row"><div><strong>${t}</strong></div><button onclick="selectTicker('${t}'); closePortfolioModal();" class="btn-primary" style="padding:4px 10px; font-size:11px;">View</button></div>
  `).join('');
}

// ---------- real, synced positions (this replaces the old hardcoded placeholder) ----------
function getStoredPositions() {
  try { return JSON.parse(localStorage.getItem('user_positions')) || []; } catch (e) { return []; }
}

function addPortfolioPosition() {
  const tickerInput = document.getElementById('pos-ticker-input');
  const qtyInput = document.getElementById('pos-qty-input');
  const priceInput = document.getElementById('pos-price-input');
  if (!tickerInput || !qtyInput || !priceInput) return;

  const ticker = tickerInput.value.trim().toUpperCase();
  const qty = parseFloat(qtyInput.value);
  const buy_price = parseFloat(priceInput.value);
  if (!ticker || !qty || !buy_price) return;

  const positions = getStoredPositions();
  positions.push({ ticker, qty, buy_price, side: 'long' });
  localStorage.setItem('user_positions', JSON.stringify(positions));
  pushPositionsToServer(positions);
  renderLivePositionsTab();

  tickerInput.value = ''; qtyInput.value = ''; priceInput.value = '';
}

function removePortfolioPosition(index) {
  const positions = getStoredPositions();
  positions.splice(index, 1);
  localStorage.setItem('user_positions', JSON.stringify(positions));
  pushPositionsToServer(positions);
  renderLivePositionsTab();
}

async function renderLivePositionsTab() {
  const positions = getStoredPositions();
  const container = document.getElementById('positions-items-container');
  if (!container) return;

  container.innerHTML = positions.length === 0
    ? `<p style="font-size:12px; color: var(--text-muted); padding: 10px 0;">No positions yet — add one above.</p>`
    : positions.map((p, i) => `
      <div class="port-item-row">
        <div><strong>${p.ticker}</strong> (${p.qty} @ $${Number(p.buy_price).toFixed(2)})</div>
        <button onclick="removePortfolioPosition(${i})" class="btn-secondary" style="padding:4px 10px; font-size:11px;">Remove</button>
      </div>
    `).join('');

  const totalVal = positions.reduce((sum, p) => sum + p.qty * p.buy_price, 0);
  const totalEl = document.getElementById('port-total-val');
  if (totalEl) totalEl.textContent = `$${totalVal.toFixed(2)}`;
}

// ---------- bootstrap: check for an existing session on page load ----------
window.addEventListener('DOMContentLoaded', () => {
  tryAutoLogin();
});