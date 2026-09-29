/* ==========================================================
   Access Gate
   Loaded AFTER app.js and auth.js (and before or after
   explain.js / animations.js - doesn't matter).

   The default page (whatever loads automatically on open -
   AAPL data, news, order book) stays visible to everyone,
   exactly like before this feature existed. The moment a
   guest tries to DO something - search a new ticker, open
   any toolbar feature - they get the sign-in popup instead.
   Once signed in, everything behaves normally, no gate at all.

   Nothing in app.js / auth.js is edited. Inline onclick="..."
   handlers look up the function by name at click time, so they
   automatically pick up the wrapped versions below.
   ========================================================== */

(function () {
  'use strict';

  const API_HOSTS = ['http://localhost:8000', 'http://127.0.0.1:8000'];

  // Friendly names shown in the login popup ("Sign in to use ...").
  // NOT gated on purpose: startTour, toggleTheme.
  const GATED = {
    openStocksModal:        'the Asset Directory',
    openSocialModal:        'Social & Copy-Trade',
    openOptionsModal:       'Options & Greeks',
    openBacktestModal:      'Backtesting',
    openBrokerModal:        'the Broker Router',
    openPortfolioModal:     'Portfolio Sync',
    openExplainModal:       'Model Explainability',
    toggleCurrentWatchlist: 'your Watchlist',
    toggleChatbot:          'AlphaBot Copilot'
  };

  let booting = true;   // true only during the automatic page-load AAPL fetch
  let pending = null;   // what the guest tried to do, so it resumes right after login

  const isLoggedIn = () => typeof authToken !== 'undefined' && !!authToken;
  const $ = (id) => document.getElementById(id);

  // ---------- "please sign in" notice inside the auth modal ----------
  function setNotice(text) {
    const body = document.querySelector('#auth-modal .modal-body');
    if (!body) return;
    let notice = $('auth-gate-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'auth-gate-notice';
      notice.className = 'auth-gate-notice hidden';
      body.insertBefore(notice, body.firstChild);
    }
    if (text) { notice.textContent = text; notice.classList.remove('hidden'); }
    else { notice.classList.add('hidden'); }
  }

  function promptLogin(label, pendingAction, customText) {
    pending = pendingAction || null;
    window.__gateNotice = customText || (label ? `🔒 Sign in or create an account to use ${label}.` : null);
    window.openAuthModal('login');
  }

  const origOpenAuthModal = window.openAuthModal;
  window.openAuthModal = function (tab) {
    origOpenAuthModal.call(this, tab || 'login');
    setNotice(window.__gateNotice || null);
    window.__gateNotice = null;
  };

  const origCloseAuthModal = window.closeAuthModal;
  window.closeAuthModal = function () {
    pending = null;
    return origCloseAuthModal.apply(this, arguments);
  };

  // ---------- wrap the simple gated functions ----------
  Object.keys(GATED).forEach((name) => {
    const orig = window[name];
    if (typeof orig !== 'function') { console.warn(`[gate] ${name} not found - skipped`); return; }
    window[name] = function (...args) {
      if (isLoggedIn()) return orig.apply(this, args);
      promptLogin(GATED[name], { run: () => window[name].apply(null, args) });
    };
  });

  // ---------- analysis / search ----------
  // During boot, the very first automatic call is let through unauthenticated
  // so the page shows real data immediately, same as before this feature.
  // Any call after that (typing a new ticker, clicking a quick-chip) gates normally.
  const origFetchIntelligence = window.fetchIntelligence;
  window.fetchIntelligence = function (ticker) {
    if (isLoggedIn() || booting) return origFetchIntelligence.call(this, ticker);
    promptLogin('search & analysis', { run: () => window.fetchIntelligence(ticker) });
  };

  const origHandleSearch = window.handleSearch;
  window.handleSearch = function (event) {
    if (isLoggedIn()) return origHandleSearch.call(this, event);
    if (event && event.preventDefault) event.preventDefault();
    const input = $('ticker-input');
    const symbol = input ? input.value.trim() : '';
    promptLogin('search & analysis', { run: () => { if (symbol) window.fetchIntelligence(symbol); } });
  };

  // connectBrokerStatusStream also auto-runs on boot in app.js. It's a background
  // nice-to-have (order fill notifications), not part of the visible default page,
  // so it's simply skipped for guests rather than popping a login box on load.
  if (typeof window.connectBrokerStatusStream === 'function') {
    const origConnectBroker = window.connectBrokerStatusStream;
    window.connectBrokerStatusStream = function (...args) {
      if (isLoggedIn()) return origConnectBroker.apply(this, args);
      // silently skipped while signed out
    };
  }

  // ---------- after a successful login / signup ----------
  const origOnAuthSuccess = window.onAuthSuccess;
  window.onAuthSuccess = async function () {
    const resume = pending; // capture before closeAuthModal() clears it
    await origOnAuthSuccess.apply(this, arguments);
    if (typeof window.connectBrokerStatusStream === 'function') {
      try { window.connectBrokerStatusStream(); } catch (e) { /* ignore */ }
    }
    if (resume && typeof resume.run === 'function') resume.run();
    pending = null;
  };

  // ---------- logout ----------
  const origLogout = window.logout;
  window.logout = function () {
    pending = null;
    document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
    document.body.classList.remove('modal-open');
    const chat = $('chatbot-window');
    if (chat) chat.classList.add('hidden');
    // don't leave one account's cached data behind for the next person on this browser
    ['user_watchlist', 'user_positions', 'user_settings'].forEach((k) => localStorage.removeItem(k));
    return origLogout.apply(this, arguments);
  };

  function expireSession() {
    window.logout();
    promptLogin(null, null, '⏳ Your session expired. Please sign in again.');
  }

  // ---------- attach the token to every API call; handle expiry ----------
  const origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : ((input && input.url) || '');
    const isApi = API_HOSTS.some((h) => url.startsWith(h + '/api/'));
    if (!isApi) return origFetch(input, init);

    if (isLoggedIn()) {
      const headers = new Headers((init && init.headers) || {});
      if (!headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + authToken);
      init = Object.assign({}, init, { headers });
    }

    return origFetch(input, init).then((res) => {
      let path = '';
      try { path = new URL(url).pathname; } catch (e) { /* ignore */ }
      const selfHandled = path.startsWith('/api/auth/') || path.startsWith('/api/sync');
      if (res.status === 401 && isLoggedIn() && !selfHandled) {
        expireSession();
        return new Promise(() => {}); // leave the caller waiting quietly, no error popups
      }
      return res;
    });
  };

  // ---------- attach the token to our own WebSocket connections ----------
  const OrigWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    const isOurs = /^wss?:\/\/(localhost|127\.0\.0\.1):8000\/ws\//.test(url);
    if (isOurs && isLoggedIn()) {
      url += (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(authToken);
    }
    return protocols ? new OrigWebSocket(url, protocols) : new OrigWebSocket(url);
  };
  window.WebSocket.prototype = OrigWebSocket.prototype;

  // ---------- boot flag: only the very first automatic load is unauthenticated ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { booting = false; }, 0); });
  } else {
    setTimeout(() => { booting = false; }, 0);
  }
})();