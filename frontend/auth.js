
/* ==========================================================
   Cloud-Synced Auth & Multi-Device Sync
   ========================================================== */

const AUTH_API_BASE =
  'http://127.0.0.1:8000/api/auth';

const SYNC_API_BASE =
  'http://127.0.0.1:8000/api/sync';

let authToken =
  localStorage.getItem('auth_token') || null;

let currentUser = null;


// ==========================================================
// AUTH MODAL
// ==========================================================

function openAuthModal(tab = 'login') {

  const modal =
    document.getElementById('auth-modal');

  if (!modal) return;

  modal.classList.remove('hidden');

  document.body.classList.add('modal-open');

  switchAuthTab(tab);

  if (window.gsap) {
    gsap.fromTo(
      modal.querySelector('.modal-content'),
      {
        y: 18,
        opacity: 0,
        scale: 0.96
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.28,
        ease: 'power3.out'
      }
    );
  }
}


function closeAuthModal() {

  const modal =
    document.getElementById('auth-modal');

  if (!modal) return;

  modal.classList.add('hidden');

  document.body.classList.remove('modal-open');
}


function switchAuthTab(tab) {

  document
    .querySelectorAll('.auth-tab-btn')
    .forEach(btn => {

      btn.classList.toggle(
        'active',
        btn.dataset.tab === tab
      );

    });

  const loginForm =
    document.getElementById('auth-form-login');

  const registerForm =
    document.getElementById('auth-form-register');

  if (loginForm) {
    loginForm.classList.toggle(
      'hidden',
      tab !== 'login'
    );
  }

  if (registerForm) {
    registerForm.classList.toggle(
      'hidden',
      tab !== 'register'
    );
  }

  const errBox =
    document.getElementById('auth-error-box');

  if (errBox) {
    errBox.classList.add('hidden');
  }
}


function showAuthError(message) {

  const box =
    document.getElementById('auth-error-box');

  if (!box) return;

  box.textContent = message;

  box.classList.remove('hidden');

  if (window.gsap) {

    gsap.fromTo(
      box,
      {
        x: -6,
        opacity: 0
      },
      {
        x: 0,
        opacity: 1,
        duration: 0.2,
        ease: 'power2.out'
      }
    );

  }
}


// ==========================================================
// REGISTER
// ==========================================================

async function submitRegister() {

  const name =
    document
      .getElementById('register-name-input')
      .value
      .trim();

  const email =
    document
      .getElementById('register-email-input')
      .value
      .trim();

  const password =
    document
      .getElementById('register-password-input')
      .value;


  if (
    !name ||
    !email ||
    password.length < 8
  ) {

    showAuthError(
      'Please fill every field — password needs at least 8 characters.'
    );

    return;
  }


  try {

    const res =
      await fetch(
        `${AUTH_API_BASE}/register`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              name,
              email,
              password
            })
        }
      );


    const data =
      await res.json();


    if (!res.ok) {

      showAuthError(
        data.detail ||
        'Registration failed.'
      );

      return;
    }


    await onAuthSuccess(data);

  } catch (err) {

    console.error(
      'Register error:',
      err
    );

    showAuthError(
      'Could not reach the server. Is the backend running on :8000?'
    );
  }
}


// ==========================================================
// LOGIN
// ==========================================================

async function submitLogin() {

  const email =
    document
      .getElementById('login-email-input')
      .value
      .trim();

  const password =
    document
      .getElementById('login-password-input')
      .value;


  try {

    const res =
      await fetch(
        `${AUTH_API_BASE}/login`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              email,
              password
            })
        }
      );


    const data =
      await res.json();


    if (!res.ok) {

      showAuthError(
        data.detail ||
        'Login failed.'
      );

      return;
    }


    await onAuthSuccess(data);

  } catch (err) {

    console.error(
      'Login error:',
      err
    );

    showAuthError(
      'Could not reach the server. Is the backend running on :8000?'
    );
  }
}


// ==========================================================
// AUTH SUCCESS
// ==========================================================

async function onAuthSuccess(tokenResponse) {

  authToken =
    tokenResponse.access_token;

  currentUser =
    tokenResponse.user;


  localStorage.setItem(
    'auth_token',
    authToken
  );


  closeAuthModal();

  updateAuthNavUI();

  await pullSyncedDataFromServer();
}


// ==========================================================
// LOGOUT
// ==========================================================

function logout() {

  authToken = null;

  currentUser = null;

  localStorage.removeItem(
    'auth_token'
  );

  closeAccountPopover();

  updateAuthNavUI();
}


// ==========================================================
// ACCOUNT POPOVER
// ==========================================================

function toggleAccountPopover() {

  const popover =
    document.getElementById(
      'account-popover'
    );

  if (
    !popover ||
    !currentUser
  ) {
    return;
  }


  const willOpen =
    popover.classList.contains('hidden');


  popover.classList.toggle(
    'hidden',
    !willOpen
  );


  if (
    willOpen &&
    window.gsap
  ) {

    gsap.fromTo(
      popover,
      {
        y: -8,
        opacity: 0,
        scale: 0.97
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.22,
        ease: 'power3.out'
      }
    );

  }
}


function closeAccountPopover() {

  const popover =
    document.getElementById(
      'account-popover'
    );

  if (popover) {
    popover.classList.add(
      'hidden'
    );
  }
}


// ==========================================================
// ACCOUNT NAV UI
// ==========================================================

function updateAuthNavUI() {

  const btn =
    document.getElementById(
      'auth-nav-btn'
    );

  if (!btn) return;


  const label =
    btn.querySelector(
      '.account-trigger-label'
    );

  const icon =
    btn.querySelector(
      '.account-trigger-icon'
    );

  const chevron =
    btn.querySelector(
      '.account-trigger-chevron'
    );


  const nameEl =
    document.getElementById(
      'account-name'
    );

  const emailEl =
    document.getElementById(
      'account-email'
    );

  const avatarEl =
    document.getElementById(
      'account-avatar'
    );


  // ========================================================
  // SIGNED IN
  // ========================================================

  if (currentUser) {

    const displayName =
      currentUser.name ||
      'Account';


    if (label) {

      label.textContent =
        displayName;

    } else {

      btn.textContent =
        `👤 ${displayName}`;

    }


    if (icon) {
      icon.textContent = '◉';
    }


    if (chevron) {
      chevron.textContent = '⌄';
    }


    if (nameEl) {
      nameEl.textContent =
        displayName;
    }


    if (emailEl) {
      emailEl.textContent =
        currentUser.email ||
        'Signed in';
    }


    if (avatarEl) {

      avatarEl.textContent =
        displayName
          .charAt(0)
          .toUpperCase();

    }


    /*
      IMPORTANT:

      Clicking the account button now ONLY
      opens the account menu.

      It does NOT call logout().
    */

    btn.onclick =
      toggleAccountPopover;

    btn.title =
      'Open account menu';

    return;
  }


  // ========================================================
  // SIGNED OUT
  // ========================================================

  if (label) {
    label.textContent =
      'Sign In';
  } else {
    btn.textContent =
      '👤 Sign In';
  }


  if (icon) {
    icon.textContent = '◉';
  }


  if (chevron) {
    chevron.textContent = '';
  }


  if (nameEl) {
    nameEl.textContent =
      'Account';
  }


  if (emailEl) {
    emailEl.textContent =
      'Not signed in';
  }


  if (avatarEl) {
    avatarEl.textContent =
      'A';
  }


  btn.onclick =
    () => openAuthModal('login');


  btn.title =
    'Sign in to sync across devices';


  closeAccountPopover();
}


// ==========================================================
// CLOSE ACCOUNT POPOVER WHEN CLICKING OUTSIDE
// ==========================================================

document.addEventListener(
  'click',
  event => {

    const wrap =
      document.getElementById(
        'account-menu-wrap'
      );

    const popover =
      document.getElementById(
        'account-popover'
      );


    if (
      !wrap ||
      !popover ||
      !currentUser
    ) {
      return;
    }


    if (
      !wrap.contains(
        event.target
      )
    ) {

      closeAccountPopover();

    }
  }
);


// ==========================================================
// SYNC PULL
// ==========================================================

async function pullSyncedDataFromServer() {

  if (!authToken) return;


  try {

    const res =
      await fetch(
        SYNC_API_BASE,
        {
          headers: {
            'Authorization':
              `Bearer ${authToken}`
          }
        }
      );


    if (res.status === 401) {

      logout();

      return;
    }


    const data =
      await res.json();


    localStorage.setItem(
      'user_watchlist',
      JSON.stringify(
        data.watchlist ||
        ['AAPL']
      )
    );


    localStorage.setItem(
      'user_positions',
      JSON.stringify(
        data.positions ||
        []
      )
    );


    localStorage.setItem(
      'user_settings',
      JSON.stringify(
        data.settings || {
          risk_profile:
            'balanced',

          theme:
            'dark'
        }
      )
    );


    updateWatchlistStarState();


    const portfolioModal =
      document.getElementById(
        'portfolio-modal'
      );


    if (
      portfolioModal &&
      !portfolioModal
        .classList
        .contains('hidden')
    ) {

      renderWatchlistTab();

      renderLivePositionsTab();

    }

  } catch (err) {

    console.error(
      'Sync pull error:',
      err
    );
  }
}


// ==========================================================
// AUTO LOGIN
// ==========================================================

async function tryAutoLogin() {

  if (!authToken) {

    updateAuthNavUI();

    return;
  }


  try {

    const res =
      await fetch(
        `${AUTH_API_BASE}/me`,
        {
          headers: {
            'Authorization':
              `Bearer ${authToken}`
          }
        }
      );


    if (!res.ok) {

      logout();

      return;
    }


    currentUser =
      await res.json();


    updateAuthNavUI();


    await pullSyncedDataFromServer();

  } catch (err) {

    console.error(
      'Auto-login check failed:',
      err
    );

    updateAuthNavUI();
  }
}


// ==========================================================
// PUSH WATCHLIST
// ==========================================================

async function pushWatchlistToServer(
  watchlist
) {

  if (!authToken) return;


  try {

    await fetch(
      `${SYNC_API_BASE}/watchlist`,
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            'application/json',

          'Authorization':
            `Bearer ${authToken}`
        },

        body:
          JSON.stringify({
            watchlist
          })
      }
    );

  } catch (err) {

    console.error(
      'Watchlist sync push failed:',
      err
    );

  }
}


// ==========================================================
// PUSH POSITIONS
// ==========================================================

async function pushPositionsToServer(
  positions
) {

  if (!authToken) return;


  try {

    await fetch(
      `${SYNC_API_BASE}/positions`,
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            'application/json',

          'Authorization':
            `Bearer ${authToken}`
        },

        body:
          JSON.stringify({
            positions
          })
      }
    );

  } catch (err) {

    console.error(
      'Positions sync push failed:',
      err
    );

  }
}


// ==========================================================
// WATCHLIST OVERRIDE
// ==========================================================

function toggleCurrentWatchlist() {

  let w =
    getStoredWatchlist();


  if (
    w.includes(activeTicker)
  ) {

    w =
      w.filter(
        t => t !== activeTicker
      );

  } else {

    w.push(
      activeTicker
    );

  }


  localStorage.setItem(
    'user_watchlist',
    JSON.stringify(w)
  );


  updateWatchlistStarState();


  pushWatchlistToServer(w);
}


// ==========================================================
// WATCHLIST RENDER
// ==========================================================

function renderWatchlistTab() {

  document.getElementById(
    'watchlist-items-container'
  ).innerHTML =

    getStoredWatchlist()
      .map(t => `

        <div class="port-item-row">

          <div>
            <strong>
              ${t}
            </strong>
          </div>

          <button
            onclick="selectTicker('${t}'); closePortfolioModal();"
            class="btn-primary"
            style="
              padding:4px 10px;
              font-size:11px;
            "
          >
            View
          </button>

        </div>

      `)
      .join('');
}


// ==========================================================
// POSITION STORAGE
// ==========================================================

function getStoredPositions() {

  try {

    return JSON.parse(
      localStorage.getItem(
        'user_positions'
      )
    ) || [];

  } catch (e) {

    return [];

  }
}


// ==========================================================
// ADD POSITION
// ==========================================================

function addPortfolioPosition() {

  const tickerInput =
    document.getElementById(
      'pos-ticker-input'
    );

  const qtyInput =
    document.getElementById(
      'pos-qty-input'
    );

  const priceInput =
    document.getElementById(
      'pos-price-input'
    );


  if (
    !tickerInput ||
    !qtyInput ||
    !priceInput
  ) {
    return;
  }


  const ticker =
    tickerInput
      .value
      .trim()
      .toUpperCase();


  const qty =
    parseFloat(
      qtyInput.value
    );


  const buy_price =
    parseFloat(
      priceInput.value
    );


  if (
    !ticker ||
    !qty ||
    !buy_price
  ) {
    return;
  }


  const positions =
    getStoredPositions();


  positions.push({
    ticker,
    qty,
    buy_price,
    side: 'long'
  });


  localStorage.setItem(
    'user_positions',
    JSON.stringify(positions)
  );


  pushPositionsToServer(
    positions
  );


  renderLivePositionsTab();


  tickerInput.value = '';
  qtyInput.value = '';
  priceInput.value = '';
}


// ==========================================================
// REMOVE POSITION
// ==========================================================

function removePortfolioPosition(
  index
) {

  const positions =
    getStoredPositions();


  positions.splice(
    index,
    1
  );


  localStorage.setItem(
    'user_positions',
    JSON.stringify(
      positions
    )
  );


  pushPositionsToServer(
    positions
  );


  renderLivePositionsTab();
}


// ==========================================================
// POSITION RENDER
// ==========================================================

async function renderLivePositionsTab() {

  const positions =
    getStoredPositions();


  const container =
    document.getElementById(
      'positions-items-container'
    );


  if (!container) {
    return;
  }


  container.innerHTML =

    positions.length === 0

      ? `
        <p
          style="
            font-size:12px;
            color:var(--text-muted);
            padding:10px 0;
          "
        >
          No positions yet — add one above.
        </p>
      `

      : positions
          .map(
            (p, i) => `

              <div class="port-item-row">

                <div>
                  <strong>
                    ${p.ticker}
                  </strong>

                  (${p.qty} @
                  $${Number(
                    p.buy_price
                  ).toFixed(2)})
                </div>

                <button
                  onclick="removePortfolioPosition(${i})"
                  class="btn-secondary"
                  style="
                    padding:4px 10px;
                    font-size:11px;
                  "
                >
                  Remove
                </button>

              </div>

            `
          )
          .join('');


  const totalVal =
    positions.reduce(
      (
        sum,
        p
      ) =>
        sum +
        p.qty *
        p.buy_price,
      0
    );


  const totalEl =
    document.getElementById(
      'port-total-val'
    );


  if (totalEl) {

    totalEl.textContent =
      `$${totalVal.toFixed(2)}`;

  }
}


// ==========================================================
// INITIAL AUTH CHECK
// ==========================================================

window.addEventListener(
  'DOMContentLoaded',
  () => {

    tryAutoLogin();

  }
);