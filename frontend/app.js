let tvChart = null;
let tvCandleSeries = null;
let tvLineSeries = null;
let tvSmaSeries = null;
let tvBbUpperSeries = null;
let tvBbLowerSeries = null;
let tvCustomScriptSeries = null;
let tvVolumeSeries = null;
let tvSubChart = null;

let backtestChart = null;
let btStrategySeries = null;
let btBenchmarkSeries = null;

let rawHistoricalData = [];
let activeTimeframe = 'ALL';
let activeChartType = 'candlestick';
let showSma = false;
let showBb = false;

let cachedArticles = [];
let activeNewsFilter = 'general';
let newsDisplayLimit = 5;
let activeTicker = 'AAPL';
let activeCurrentPrice = 0.0;
let activeTargetPrice = 0.0;
let activeLowerBound = 0.0;
let activeUpperBound = 0.0;
let activeReturnPct = 0.0;
let activeVerdict = 'Strong Buy';
let activeRegime = 'Low Volatility / Bullish';

let orderBookSocket = null;
let brokerStatusSocket = null;
let socialSocket = null;

let cachedOptionsData = null;
let selectedOptionsDays = 30;

let activeSocialFilter = 'ALL';
let cachedSocialIdeas = [];
let socialFeedTicker = '';
let clientUserId = localStorage.getItem('alp_client_user_id') || ('user_' + Math.random().toString(36).substring(2, 9));
localStorage.setItem('alp_client_user_id', clientUserId);

let currentOptAllocations = []; 

const ASSET_DIRECTORY = {
  "Equities": {
    "AAPL": { name: "Apple Inc.", class: "Equities", base: 305.59 },
    "NVDA": { name: "Nvidia Corp.", class: "Equities", base: 128.50 },
    "TSLA": { name: "Tesla Inc.", class: "Equities", base: 242.10 },
    "MSFT": { name: "Microsoft Corp.", class: "Equities", base: 425.00 },
    "AMZN": { name: "Amazon.com Inc.", class: "Equities", base: 185.20 },
    "GOOGL": { name: "Alphabet / Google", class: "Equities", base: 175.40 },
    "META": { name: "Meta Platforms", class: "Equities", base: 510.00 },
    "NFLX": { name: "Netflix Inc.", class: "Equities", base: 680.00 },
    "AMD": { name: "Advanced Micro Devices", class: "Equities", base: 145.30 },
    "INTC": { name: "Intel Corp.", class: "Equities", base: 21.50 },
    "JPM": { name: "JPMorgan Chase", class: "Equities", base: 215.00 },
    "V": { name: "Visa Inc.", class: "Equities", base: 275.00 }
  },
  "Crypto": {
    "BTCUSD": { name: "Bitcoin / USD", class: "Crypto", base: 65420.00 }
  },
  "Forex": {
    "EURUSD": { name: "Euro / US Dollar", class: "Forex", base: 1.08 }
  },
  "Commodities": {
    "GC=F": { name: "Gold Futures", class: "Commodities", base: 2450.00 }
  },
  "Derivatives": {
    "SPY": { name: "S&P 500 ETF Trust", class: "Derivatives", base: 545.00 }
  }
};

const VERIFIED_FINANCIAL_SOURCES = ['reuters', 'bloomberg', 'wsj', 'cnbc', 'yahoo finance', 'financial times'];

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.textContent = newTheme === 'dark' ? '☀️ Light' : '🌙 Dark';

  if (tvChart) {
    const isDark = newTheme === 'dark';
    tvChart.applyOptions({
      layout: { background: { color: isDark ? '#111827' : '#ffffff' }, textColor: isDark ? '#9ca3af' : '#4b5563' }
    });
  }
}

// ==========================================
// Advanced Professional Charting Suite
// ==========================================
function initTradingViewChart() {
  const container = document.getElementById('tradingview-chart-container');
  const subContainer = document.getElementById('tradingview-subchart-container');
  if (!container || !subContainer) return;

  container.innerHTML = '';
  subContainer.innerHTML = '';

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const bgColor = isDark ? '#111827' : '#ffffff';
  const textColor = isDark ? '#9ca3af' : '#4b5563';
  const gridColor = isDark ? '#1f2937' : '#f3f4f6';

  tvChart = LightweightCharts.createChart(container, {
    autoSize: true,
    layout: { background: { color: bgColor }, textColor: textColor },
    grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
    timeScale: { borderColor: gridColor, timeVisible: true },
    rightPriceScale: { borderColor: gridColor },
  });

  tvCandleSeries = tvChart.addCandlestickSeries({ upColor: '#22c55e', downColor: '#ef4444' });
  tvLineSeries = tvChart.addLineSeries({ color: '#3b82f6', lineWidth: 2 });
  tvLineSeries.applyOptions({ visible: activeChartType === 'line' });
  tvCandleSeries.applyOptions({ visible: activeChartType === 'candlestick' });

  tvSmaSeries = tvChart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, title: 'SMA 20' });
  tvBbUpperSeries = tvChart.addLineSeries({ color: 'rgba(59, 130, 246, 0.6)', lineWidth: 1, lineStyle: 2 });
  tvBbLowerSeries = tvChart.addLineSeries({ color: 'rgba(59, 130, 246, 0.6)', lineWidth: 1, lineStyle: 2 });
  tvCustomScriptSeries = tvChart.addLineSeries({ color: '#34d399', lineWidth: 2, title: 'Custom Pine Study' });

  tvSmaSeries.applyOptions({ visible: false });
  tvBbUpperSeries.applyOptions({ visible: false });
  tvBbLowerSeries.applyOptions({ visible: false });
  tvCustomScriptSeries.applyOptions({ visible: false });

  tvSubChart = LightweightCharts.createChart(subContainer, {
    autoSize: true,
    layout: { background: { color: bgColor }, textColor: textColor },
    grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
    timeScale: { visible: false },
    rightPriceScale: { borderColor: gridColor },
  });

  tvVolumeSeries = tvSubChart.addHistogramSeries({ color: '#3b82f6' });

  tvChart.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
    if (timeRange) tvSubChart.timeScale().setVisibleLogicalRange(timeRange);
  });
}

function setChartType(type) {
  activeChartType = type;
  document.getElementById('btn-type-candle').classList.toggle('active', type === 'candlestick');
  document.getElementById('btn-type-line').classList.toggle('active', type === 'line');
  if (tvCandleSeries && tvLineSeries) {
    tvCandleSeries.applyOptions({ visible: type === 'candlestick' });
    tvLineSeries.applyOptions({ visible: type === 'line' });
  }
}

function toggleIndicator(ind) {
  if (ind === 'sma') {
    showSma = !showSma;
    document.getElementById('ind-sma-btn').classList.toggle('active', showSma);
    if (tvSmaSeries) tvSmaSeries.applyOptions({ visible: showSma });
  } else if (ind === 'bb') {
    showBb = !showBb;
    document.getElementById('ind-bb-btn').classList.toggle('active', showBb);
    if (tvBbUpperSeries && tvBbLowerSeries) {
      tvBbUpperSeries.applyOptions({ visible: showBb });
      tvBbLowerSeries.applyOptions({ visible: showBb });
    }
  }
}

// ==========================================
// Real-Time Social Trading & Copy-Trading Controller
// ==========================================
function connectSocialWebSocket() {
  if (socialSocket) socialSocket.close();
  socialSocket = new WebSocket('ws://localhost:8000/ws/social');

  socialSocket.onmessage = function(event) {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'NEW_IDEA') {
        if (!cachedSocialIdeas.some(i => i.id === msg.idea.id)) {
          cachedSocialIdeas.unshift(msg.idea);
          renderSocialIdeas();
        }
      } else if (msg.type === 'LIKE_UPDATE') {
        const item = cachedSocialIdeas.find(i => i.id === msg.idea_id);
        if (item) item.likes = msg.likes;
        const countSpan = document.getElementById(`like-count-${msg.idea_id}`);
        if (countSpan) countSpan.textContent = msg.likes;
      }
    } catch (e) {
      console.error("Social WS error:", e);
    }
  };
}

function openSocialModal() {
  document.body.classList.add('modal-open');
  document.getElementById('social-modal').classList.remove('hidden');
  document.getElementById('pub-ticker').value = activeTicker;
  document.getElementById('pub-entry').value = activeCurrentPrice.toFixed(2);
  document.getElementById('pub-target').value = activeTargetPrice.toFixed(2);
  document.getElementById('pub-stop').value = activeLowerBound.toFixed(2);
  
  const activeBtn = document.getElementById('btn-social-filter-active');
  if (activeBtn) activeBtn.textContent = `${activeTicker} Only`;

  if (socialFeedTicker !== activeTicker || cachedSocialIdeas.length === 0) {
    fetchAndRenderSocialFeed(false);
    fetchAndRenderSocialSentiment();
  } else {
    renderSocialIdeas();
  }
  fetchAndRenderLeaderboard();
}

function closeSocialModal() {
  document.body.classList.remove('modal-open');
  document.getElementById('social-modal').classList.add('hidden');
}

function switchSocialTab(tabName, btnElem) {
  document.querySelectorAll('#social-modal .port-tab-btn').forEach(b => b.classList.remove('active'));
  btnElem.classList.add('active');
  document.getElementById('social-ideas-view').classList.toggle('hidden', tabName !== 'ideas');
  document.getElementById('social-leaderboard-view').classList.toggle('hidden', tabName !== 'leaderboard');
  document.getElementById('social-publish-view').classList.toggle('hidden', tabName !== 'publish');
  
  if (tabName === 'ideas') {
    if (socialFeedTicker === activeTicker && cachedSocialIdeas.length > 0) {
      renderSocialIdeas();
    } else {
      fetchAndRenderSocialFeed(false);
      fetchAndRenderSocialSentiment();
    }
  }
}

function filterSocialFeed(filterType, btnElem) {
  activeSocialFilter = filterType;
  document.querySelectorAll('.social-filter-btn').forEach(b => b.classList.remove('active'));
  btnElem.classList.add('active');
  fetchAndRenderSocialFeed(false);
}

function refreshSocialFeedManual() {
  fetchAndRenderSocialFeed(true);
  fetchAndRenderSocialSentiment();
}

async function fetchAndRenderSocialFeed(forceRefresh = false) {
  const container = document.getElementById('social-ideas-container');
  if (forceRefresh || cachedSocialIdeas.length === 0 || socialFeedTicker !== activeTicker) {
    container.innerHTML = `<p style="font-size:12px; color:var(--text-muted); padding:20px; text-align:center;">Querying live Reddit discussions & Bluesky stream for $${activeTicker}...</p>`;
  }

  try {
    const res = await fetch(`http://localhost:8000/api/social/feed?ticker=${activeTicker}&filter=${activeSocialFilter}&user_id=${clientUserId}&refresh=${forceRefresh}`);
    const data = await res.json();
    if (data.ideas && data.ideas.length > 0) {
      cachedSocialIdeas = data.ideas;
      socialFeedTicker = activeTicker;
    }
    renderSocialIdeas();
  } catch (err) {
    console.error("Social feed fetch error:", err);
    if (cachedSocialIdeas.length === 0) {
      container.innerHTML = '<p style="color:var(--accent-red); padding:20px; text-align:center;">Failed to load live social discussions.</p>';
    }
  }
}

function renderSocialIdeas() {
  const container = document.getElementById('social-ideas-container');
  if (!container) return;

  if (cachedSocialIdeas.length === 0) {
    container.innerHTML = `<p style="font-size:12px; color:var(--text-muted); padding:20px; text-align:center;">No live discussions found for $${activeTicker}. Be the first to publish a setup!</p>`;
    return;
  }

  const defaultTraderAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563eb'%3E%3Ccircle cx='12' cy='12' r='11' fill='%231f2937' stroke='%233b82f6' stroke-width='2'/%3E%3Cpath fill='%239ca3af' d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

  container.innerHTML = cachedSocialIdeas.map(item => {
    const isLong = (item.side || 'LONG').toUpperCase() === 'LONG';
    const sideClass = isLong ? 'text-gain' : 'text-risk';
    const hasScript = item.pine_script && item.pine_script.trim().length > 0;
    const isLiked = item.is_liked;
    const likedClass = isLiked ? 'liked' : '';
    const heartIcon = isLiked ? '❤️' : '🤍';

    return `
      <div class="social-idea-card">
        <div class="idea-card-header">
          <div class="idea-author-info">
            <img src="${item.avatar || defaultTraderAvatar}" onerror="this.onerror=null; this.src='${defaultTraderAvatar}'" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color);" alt="${item.author}">
            <div>
              <span class="idea-author-name">${item.author}</span>
              <a href="${item.post_url}" target="_blank" style="font-size:11px; color:var(--text-muted); text-decoration:none; margin-left:4px;">${item.handle}</a>
            </div>
            <span class="idea-badge">${item.badge}</span>
          </div>
          <span style="font-size:11px; color:var(--text-muted);">${item.created_at}</span>
        </div>

        ${item.entry_price ? `
          <div class="idea-metrics-bar">
            <div>
              <span>Asset</span>
              <strong>${item.ticker} <span class="${sideClass}">(${item.side})</span></strong>
            </div>
            <div>
              <span>Entry</span>
              <strong>$${Number(item.entry_price).toFixed(2)}</strong>
            </div>
            <div>
              <span>Target</span>
              <strong class="text-gain">$${Number(item.target_price).toFixed(2)}</strong>
            </div>
            <div>
              <span>Stop Loss</span>
              <strong class="text-risk">$${Number(item.stop_loss).toFixed(2)}</strong>
            </div>
          </div>
        ` : ''}

        <p class="idea-thesis">${item.thesis}</p>

        <div class="idea-card-footer">
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="idea-like-btn ${likedClass}" onclick="toggleLikeSocialIdea('${item.id}', this)" title="${isLiked ? 'Unlike' : 'Like'} this setup">
              <span class="like-icon">${heartIcon}</span> <span id="like-count-${item.id}">${item.likes}</span>
            </button>
            ${hasScript ? `
              <button class="btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="loadSharedPineScript('${item.pine_script.replace(/'/g, "\\'")}')" title="Render study on TradingView chart">
                📥 Load Study onto Chart
              </button>
            ` : ''}
          </div>
          ${item.entry_price ? `
            <button class="btn-primary" style="padding:5px 12px; font-size:11px;" onclick="stageSocialSetupToBroker('${item.ticker}', '${item.side}', ${item.entry_price}, ${item.stop_loss}, ${item.target_price})">
              ⚡ Stage Setup in Broker
            </button>
          ` : `
            <a href="${item.post_url}" target="_blank" class="btn-secondary" style="padding:4px 10px; font-size:11px; text-decoration:none;">
              View on ${item.source} ↗
            </a>
          `}
        </div>
      </div>
    `;
  }).join('');
}

async function toggleLikeSocialIdea(ideaId, btnElem) {
  try {
    const res = await fetch(`http://localhost:8000/api/social/like/${ideaId}?user_id=${clientUserId}`, { method: 'POST' });
    const data = await res.json();
    if (data.status === 'success') {
      const item = cachedSocialIdeas.find(i => i.id === ideaId);
      if (item) {
        item.likes = data.likes;
        item.is_liked = data.liked;
      }
      btnElem.classList.toggle('liked', data.liked);
      const icon = btnElem.querySelector('.like-icon');
      const count = btnElem.querySelector(`#like-count-${ideaId}`);
      if (icon) icon.textContent = data.liked ? '❤️' : '🤍';
      if (count) count.textContent = data.likes;
      btnElem.title = data.liked ? 'Unlike this setup' : 'Like this setup';
    }
  } catch (err) {
    console.error("Like toggle error:", err);
  }
}

async function fetchAndRenderSocialSentiment() {
  try {
    const res = await fetch(`http://localhost:8000/api/social/sentiment?ticker=${activeTicker}`);
    const data = await res.json();

    const tr = data.tradestie_reddit || {};
    const rankEl = document.getElementById('sent-reddit-rank');
    const mentionsEl = document.getElementById('sent-reddit-mentions');
    const orientEl = document.getElementById('sent-reddit-orientation');

    if (tr.status === 'success' && tr.rank) {
      rankEl.textContent = `Rank #${tr.rank}`;
      mentionsEl.textContent = `${Number(tr.mentions || 0).toLocaleString()} discussions`;
      orientEl.textContent = tr.sentiment || 'Bullish';
      orientEl.className = (tr.sentiment || '').toLowerCase() === 'bearish' ? 'text-risk' : 'text-gain';
    } else {
      rankEl.textContent = "Not in Top 50";
      mentionsEl.textContent = "Minimal activity";
      orientEl.textContent = "Neutral";
      orientEl.className = "text-muted";
    }

    const fh = data.finnhub_sentiment || {};
    const fhRedditEl = document.getElementById('sent-finnhub-reddit');
    const fhTwitterEl = document.getElementById('sent-finnhub-twitter');

    if (fh.status === 'success') {
      fhRedditEl.textContent = `${Math.round((fh.reddit_score || 0) * 100)}%`;
      fhTwitterEl.textContent = `${Math.round((fh.twitter_score || 0) * 100)}%`;
    } else {
      fhRedditEl.textContent = "No data";
      fhTwitterEl.textContent = "No data";
    }

  } catch (err) {
    console.error("Error fetching social sentiment:", err);
  }
}

function loadSharedPineScript(scriptCode) {
  closeSocialModal();
  const card = document.getElementById('script-editor-card');
  const btn = document.getElementById('ind-script-btn');
  const textarea = document.getElementById('script-textarea');

  if (card && textarea) {
    card.classList.remove('hidden');
    if (btn) btn.classList.add('script-active');
    textarea.value = `// Imported Community Study\n${scriptCode}`;
    executeCustomScript();
  }
}

function stageSocialSetupToBroker(ticker, side, entryPrice, stopLoss, targetPrice) {
  closeSocialModal();
  openBrokerModal();
  document.getElementById('broker-ticker-input').value = ticker;
  document.getElementById('broker-side-select').value = side.toLowerCase();
  document.getElementById('broker-type-select').value = 'limit';
  toggleLimitPriceField();
  document.getElementById('broker-limit-input').value = entryPrice;
  document.getElementById('broker-sl-input').value = stopLoss;
  document.getElementById('broker-tp-input').value = targetPrice;
}

async function fetchAndRenderLeaderboard() {
  const container = document.getElementById('social-leaderboard-container');
  if (!container) return;

  try {
    const res = await fetch('http://localhost:8000/api/social/leaderboard');
    const data = await res.json();
    const funds = data.leaderboard || [];

    container.innerHTML = funds.map(f => `
      <div class="trader-lead-card">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:22px;">🏛️</span>
            <div>
              <strong style="font-size:14px;">${f.name}</strong>
              <span style="font-size:11px; color:var(--text-muted); margin-left:4px;">(Manager: ${f.manager})</span>
            </div>
            <span class="idea-badge">${f.source}</span>
          </div>
          <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">Style: <strong>${f.style}</strong></p>
          <div class="trader-holdings-chips">
            ${(f.holdings || []).map(h => `<span class="holding-chip">${h.ticker}: ${h.allocation_pct}%</span>`).join('')}
          </div>
        </div>

        <button class="btn-primary" style="padding:6px 14px; font-size:12px;" onclick="copyTraderAllocation('${f.id}', '${f.name}')">
          ⚡ Copy Portfolio
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error("Leaderboard fetch error:", err);
  }
}

async function copyTraderAllocation(traderId, traderName) {
  const capital = prompt(`Enter capital ($) to allocate and replicate ${traderName}'s SEC 13F holdings via Alpaca:`, "5000");
  if (!capital || isNaN(capital) || Number(capital) <= 0) return;

  try {
    const res = await fetch('http://localhost:8000/api/social/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trader_id: traderId, capital: Number(capital) })
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "API validation failed");
    }
    
    const data = await res.json();
    if (data.status === 'success') {
      const orders = data.allocation.orders || [];
      const orderSummary = orders.map(o => `• ${o.ticker} (${o.allocation_pct}%): $${o.allocated_dollars.toLocaleString()}`).join('\n');
      
      alert(`✅ Live Portfolio Synchronized via Alpaca API!\n\nSuccessfully copied ${traderName} with $${Number(capital).toLocaleString()}:\n${orderSummary}\n\nAll positions are now live in your broker ledger!`);
      
      closeSocialModal();
      openPortfolioModal();
      switchPortfolioTab('positions', document.querySelectorAll('.port-tab-btn')[1]);
    }
  } catch (err) {
    console.error("Copy trader error:", err);
    alert(`❌ Failed to route orders to Alpaca Broker.\nEnsure you have configured ALPACA_API_KEY in your .env file.\nDetail: ${err.message}`);
  }
}

async function handlePublishSetup(event) {
  event.preventDefault();
  const statusMsg = document.getElementById('pub-status-msg');

  const payload = {
    author: document.getElementById('pub-author').value.trim(),
    handle: document.getElementById('pub-handle').value.trim(),
    ticker: document.getElementById('pub-ticker').value.trim().toUpperCase(),
    side: document.getElementById('pub-side').value,
    entry_price: parseFloat(document.getElementById('pub-entry').value),
    target_price: parseFloat(document.getElementById('pub-target').value),
    stop_loss: parseFloat(document.getElementById('pub-stop').value),
    thesis: document.getElementById('pub-thesis').value.trim(),
    pine_script: document.getElementById('pub-pine').value.trim()
  };

  try {
    const res = await fetch('http://localhost:8000/api/social/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'success') {
      statusMsg.textContent = "✅ Setup successfully published and broadcast to community feed!";
      statusMsg.style.color = "var(--accent-green)";
      statusMsg.classList.remove('hidden');
      
      setTimeout(() => {
        statusMsg.classList.add('hidden');
        switchSocialTab('ideas', document.getElementById('tab-btn-social-ideas'));
        fetchAndRenderSocialFeed(true);
      }, 800);
    }
  } catch (err) {
    statusMsg.textContent = "❌ Error publishing setup.";
    statusMsg.style.color = "var(--accent-red)";
    statusMsg.classList.remove('hidden');
  }
}

// ==========================================
// Options Chains & Greeks Analytics Controller
// ==========================================
function openOptionsModal() {
  document.body.classList.add('modal-open');
  document.getElementById('options-modal').classList.remove('hidden');
  document.getElementById('options-modal-title').textContent = `Options Chains & Greeks Analytics (${activeTicker})`;
  loadOptionsChain(selectedOptionsDays);
}

function closeOptionsModal() {
  document.body.classList.remove('modal-open');
  document.getElementById('options-modal').classList.add('hidden');
}

function switchOptionsTab(tabType, btnElem) {
  document.querySelectorAll('#options-modal .port-tab-btn').forEach(b => b.classList.remove('active'));
  btnElem.classList.add('active');
  document.getElementById('options-matrix-view').classList.toggle('hidden', tabType !== 'matrix');
  document.getElementById('options-smile-view').classList.toggle('hidden', tabType !== 'smile');
}

function onOptionsExpiryChange() {
  const sel = document.getElementById('options-expiry-select');
  selectedOptionsDays = parseInt(sel.value, 10);
  loadOptionsChain(selectedOptionsDays);
}

async function loadOptionsChain(days = 30) {
  const tbody = document.getElementById('options-table-body');
  tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding: 20px;">Computing real-time Greeks and chains...</td></tr>';

  try {
    const res = await fetch(`http://localhost:8000/api/options/chain?ticker=${activeTicker}&days=${days}`);
    const data = await res.json();
    cachedOptionsData = data;

    const expirySelect = document.getElementById('options-expiry-select');
    if (expirySelect.options.length === 0 || expirySelect.dataset.ticker !== activeTicker) {
      expirySelect.dataset.ticker = activeTicker;
      expirySelect.innerHTML = (data.expirations || []).map(exp => `
        <option value="${exp.days}" ${exp.days === days ? 'selected' : ''}>${exp.label}</option>
      `).join('');
    } else {
      expirySelect.value = String(days);
    }

    document.getElementById('opt-spot-price').textContent = `$${data.underlying_price.toFixed(2)}`;
    document.getElementById('opt-atm-iv').textContent = `${data.atm_iv}%`;
    document.getElementById('opt-exp-move').textContent = `±$${data.expected_move.toFixed(2)}`;
    document.getElementById('opt-pcr').textContent = data.put_call_ratio;

    tbody.innerHTML = (data.chain || []).map(row => {
      const c = row.call;
      const p = row.put;
      const atmClass = row.is_atm ? 'atm-strike-row' : '';

      return `
        <tr class="${atmClass}">
          <td style="color:var(--text-muted);">${c.open_interest.toLocaleString()}</td>
          <td class="text-gain">${c.delta}</td>
          <td style="color:var(--text-muted);">${c.theta}</td>
          <td>${c.iv}%</td>
          <td class="text-gain">$${c.bid.toFixed(2)}</td>
          <td class="text-risk">$${c.ask.toFixed(2)}</td>
          <td class="strike-col">$${row.strike.toFixed(2)}</td>
          <td class="text-gain">$${p.bid.toFixed(2)}</td>
          <td class="text-risk">$${p.ask.toFixed(2)}</td>
          <td>${p.iv}%</td>
          <td class="text-risk">${p.delta}</td>
          <td style="color:var(--text-muted);">${p.theta}</td>
          <td style="color:var(--text-muted);">${p.open_interest.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    renderIvSmile(data.iv_smile || []);

  } catch (err) {
    console.error("Options chain error:", err);
    tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; color:var(--accent-red); padding: 20px;">Failed to load options analytics.</td></tr>';
  }
}

function renderIvSmile(smilePoints) {
  const container = document.getElementById('options-smile-container');
  if (!container || !smilePoints || smilePoints.length === 0) return;

  const ivValues = smilePoints.map(p => p.iv);
  const minIv = Math.min(...ivValues);
  const maxIv = Math.max(...ivValues);
  const ivRange = Math.max(maxIv - minIv, 1.5);

  container.innerHTML = smilePoints.map(pt => {
    const barHeight = Math.round(25 + ((pt.iv - minIv) / ivRange) * 135);
    return `
      <div class="smile-bar-col">
        <span style="font-size:10px; color:var(--accent-blue); font-weight:600;">${pt.iv}%</span>
        <div class="smile-bar" style="height: ${barHeight}px;" title="Strike: $${pt.strike} | Expiry IV: ${pt.iv}%"></div>
        <span style="font-size:10px; font-weight:600;">$${pt.strike}</span>
      </div>
    `;
  }).join('');
}

// ==========================================
// AlphaBot Copilot: Unified Drag, Clear & Edit
// ==========================================
function toggleChatbot() {
  const win = document.getElementById('chatbot-window');
  if (win) {
    win.classList.toggle('hidden');
    if (!win.classList.contains('hidden')) {
      document.getElementById('chat-input').focus();
    }
  }
}

function clearChatHistory() {
  const container = document.getElementById('chat-messages-container');
  const cName = document.getElementById('val-company-name')?.textContent || activeTicker;
  container.innerHTML = `
    <div class="chat-msg bot-msg">
      <div class="msg-content">
        Chat cleared! I am actively tracking <strong>${cName} (${activeTicker})</strong> at <strong>$${activeCurrentPrice.toFixed(2)}</strong>. Ask me anything!
      </div>
    </div>
  `;
}

function editUserMessage(btnElem) {
  const msgContent = btnElem.closest('.msg-wrapper').querySelector('.msg-content').textContent;
  const input = document.getElementById('chat-input');
  input.value = msgContent.trim();
  input.focus();
}

function initDraggableChatbot() {
  const root = document.getElementById('chatbot-root');
  const win = document.getElementById('chatbot-window');
  const header = win ? win.querySelector('.chatbot-header') : null;
  if (!root || !header) return;

  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.close-btn') || e.target.closest('.chat-header-btn')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = root.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    root.style.bottom = 'auto';
    root.style.right = 'auto';
    root.style.left = `${initialLeft}px`;
    root.style.top = `${initialTop}px`;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    const maxLeft = window.innerWidth - root.offsetWidth - 10;
    const maxTop = window.innerHeight - root.offsetHeight - 10;
    newLeft = Math.max(10, Math.min(newLeft, maxLeft));
    newTop = Math.max(10, Math.min(newTop, maxTop));

    root.style.left = `${newLeft}px`;
    root.style.top = `${newTop}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

function sendQuickPrompt(promptText) {
  document.getElementById('chat-input').value = promptText;
  handleChatSubmit(new Event('submit'));
}

async function handleChatSubmit(e) {
  if (e) e.preventDefault();
  const inputElem = document.getElementById('chat-input');
  const userText = inputElem.value.trim();
  if (!userText) return;

  renderChatMessage('user', userText);
  inputElem.value = '';

  const messagesContainer = document.getElementById('chat-messages-container');
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'chat-msg bot-msg';
  typingIndicator.id = 'chat-typing-indicator';
  typingIndicator.innerHTML = '<div class="msg-content" style="color:var(--text-muted);">AlphaBot is thinking...</div>';
  messagesContainer.appendChild(typingIndicator);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  const terminalContext = {
    ticker: activeTicker,
    company_name: document.getElementById('val-company-name')?.textContent || activeTicker,
    current_price: activeCurrentPrice,
    target_price: activeTargetPrice,
    predicted_return: activeReturnPct,
    lower_bound: activeLowerBound,
    upper_bound: activeUpperBound,
    verdict: activeVerdict,
    regime: activeRegime
  };

  try {
    const res = await fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, context: terminalContext })
    });
    const data = await res.json();
    
    const indicator = document.getElementById('chat-typing-indicator');
    if (indicator) indicator.remove();

    renderChatMessage('bot', data.reply || "I encountered an error processing your query.", data.follow_ups || []);
  } catch (err) {
    console.error("Chat error:", err);
    const indicator = document.getElementById('chat-typing-indicator');
    if (indicator) indicator.remove();
    renderChatMessage('bot', "⚠️ Could not connect to AlphaBot service. Ensure backend is running on port 8000.");
  }
}

function renderChatMessage(sender, text, followUps = []) {
  const container = document.getElementById('chat-messages-container');
  const msgElem = document.createElement('div');
  msgElem.className = `chat-msg ${sender}-msg`;

  let html = '';
  if (sender === 'user') {
    html = `
      <div class="msg-wrapper">
        <div class="msg-content">${text.replace(/\n/g, '<br>')}</div>
        <button class="msg-edit-btn" onclick="editUserMessage(this)" title="Edit question">✏️</button>
      </div>
    `;
  } else {
    let followUpsHtml = '';
    if (followUps && followUps.length > 0) {
      followUpsHtml = `
        <div class="msg-follow-ups">
          <span class="follow-up-label">Suggested follow-ups:</span>
          <div class="follow-up-chips">
            ${followUps.map(fu => `<button onclick="sendQuickPrompt('${fu.replace(/'/g, "\\'")}')">${fu}</button>`).join('')}
          </div>
        </div>
      `;
    }
    html = `
      <div class="msg-wrapper">
        <div class="msg-content">${text.replace(/\n/g, '<br>')}</div>
      </div>
      ${followUpsHtml}
    `;
  }

  msgElem.innerHTML = html;
  container.appendChild(msgElem);
  container.scrollTop = container.scrollHeight;
}

// ==========================================
// Automated Backtesting Framework Controller
// ==========================================
function openBacktestModal() {
  document.body.classList.add('modal-open');
  document.getElementById('backtest-modal').classList.remove('hidden');
  runBacktestSimulation();
}

function closeBacktestModal() {
  document.body.classList.remove('modal-open');
  document.getElementById('backtest-modal').classList.add('hidden');
}

async function runBacktestSimulation() {
  const container = document.getElementById('backtest-chart-container');
  container.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-muted); font-size:13px;">Running historical backtest simulation...</div>';

  try {
    const res = await fetch(`http://localhost:8000/api/stock/backtest?ticker=${activeTicker}`);
    const data = await res.json();
    const m = data.metrics;

    // Performance Analytics
    document.getElementById('bt-max-drawdown').textContent =
      `${m.strategy_max_drawdown_pct}%`;

    document.getElementById('bt-total-trades').textContent =
      m.total_trades;

    document.getElementById('bt-win-rate').textContent =
      `${m.win_rate_pct}%`;

    document.getElementById('bt-trade-record').textContent =
      `${m.winning_trades} Wins / ${m.losing_trades} Losses`;

    document.getElementById('bt-avg-trade').textContent =
      `${m.average_trade_return_pct >= 0 ? '+' : ''}${m.average_trade_return_pct}%`;

    document.getElementById('bt-best-trade').textContent =
      `${m.best_trade_pct >= 0 ? '+' : ''}${m.best_trade_pct}%`;

    document.getElementById('bt-worst-trade').textContent =
      `${m.worst_trade_pct >= 0 ? '+' : ''}${m.worst_trade_pct}%`;

    document.getElementById('bt-strat-val').textContent = `$${m.strategy_final_value.toLocaleString()}`;
    document.getElementById('bt-strat-ret').textContent = `${m.strategy_return_pct >= 0 ? '+' : ''}${m.strategy_return_pct}% Return`;
    document.getElementById('bt-bh-val').textContent = `$${m.benchmark_final_value.toLocaleString()}`;
    document.getElementById('bt-bh-ret').textContent = `${m.benchmark_return_pct >= 0 ? '+' : ''}${m.benchmark_return_pct}% Return`;
    
    const outperfElem = document.getElementById('bt-outperf');
    outperfElem.textContent = `${m.outperformance_pct >= 0 ? '+' : ''}${m.outperformance_pct}%`;
    outperfElem.style.color = m.outperformance_pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    document.getElementById('bt-sharpe').textContent = m.strategy_sharpe;

    container.innerHTML = '';
    backtestChart = LightweightCharts.createChart(container, {
      autoSize: true,
      layout: { background: { color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#111827' : '#ffffff' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
      timeScale: { borderColor: '#374151', timeVisible: true },
      rightPriceScale: { borderColor: '#374151' },
    });

    btStrategySeries = backtestChart.addLineSeries({ color: '#22c55e', lineWidth: 2, title: 'Strategy (XGB + Conformal)' });
    btBenchmarkSeries = backtestChart.addLineSeries({ color: '#3b82f6', lineWidth: 1.5, title: 'Buy & Hold Benchmark' });

    const curve = data.equity_curve || [];
    btStrategySeries.setData(curve.map(pt => ({ time: pt.date, value: pt.strategy })));
    btBenchmarkSeries.setData(curve.map(pt => ({ time: pt.date, value: pt.benchmark })));
    backtestChart.timeScale().fitContent();

  } catch (err) {
    console.error("Backtest error:", err);
    container.innerHTML = '<p style="color:var(--accent-red); text-align:center; padding:20px;">Failed to execute backtest simulation.</p>';
  }
}

// ==========================================
// Categorized Asset Directory Modal
// ==========================================
function openStocksModal() {
  document.body.classList.add('modal-open');
  renderDirectoryHTML();
  document.getElementById('stocks-modal').classList.remove('hidden');
}

function closeStocksModal() {
  document.body.classList.remove('modal-open');
  document.getElementById('stocks-modal').classList.add('hidden');
}

function renderDirectoryHTML(filterQuery = "") {
  const directoryContainer = document.getElementById('stocks-directory-list');
  let htmlContent = "";

  for (const [category, assets] of Object.entries(ASSET_DIRECTORY)) {
    const matchingAssets = Object.entries(assets).filter(([symbol, info]) => 
      symbol.toLowerCase().includes(filterQuery) || 
      info.name.toLowerCase().includes(filterQuery) || 
      category.toLowerCase().includes(filterQuery)
    );

    if (matchingAssets.length > 0) {
      htmlContent += `<div class="dir-category-title" style="font-size:12px; font-weight:700; color:var(--accent-blue); margin: 10px 0 4px 4px; text-transform:uppercase; letter-spacing:0.5px;">${category}</div>`;
      htmlContent += matchingAssets.map(([symbol, info]) => `
        <div class="stock-dir-item" onclick="selectStockFromDirectory('${symbol}')">
          <span class="stock-dir-symbol"><strong>${symbol}</strong> <span style="font-size:11px; background:var(--accent-blue-soft); padding:2px 8px; border-radius:4px; color:var(--accent-blue);">${info.class}</span></span>
          <span class="stock-dir-name">${info.name}</span>
        </div>
      `).join('');
    }
  }

  directoryContainer.innerHTML = htmlContent || '<p style="font-size: 13px; color: var(--text-muted); padding: 10px;">No matching assets.</p>';
}

function filterStockDirectory() {
  const query = document.getElementById('modal-stock-filter').value.toLowerCase();
  renderDirectoryHTML(query);
}

function selectStockFromDirectory(symbol) {
  closeStocksModal();
  fetchIntelligence(symbol);
}

// ==========================================
// Guided Tour
// ==========================================
const tourSteps = [
  { id: "tour-step-1", title: "1. Current Asset Price", desc: "Displays live execution price across equities, crypto, forex, and derivatives." },
  { id: "tour-step-2", title: "2. Predicted Target Return", desc: "Outputs target return percentage predicted by the multi-asset AI model." },
  { id: "tour-step-3", title: "3. 90% Safety Floor", desc: "Calculates downside risk floor using Quantile Conformal XGBoost." },
  { id: "tour-social-btn", title: "4. Social Trading & Copy-Trading Feeds", desc: "Browse real-time Reddit/Bluesky discussions and replicate verified SEC 13F portfolios." },
  { id: "tour-options-btn", title: "5. Options Chains & Greeks Analytics", desc: "Interactive options expiry matrix, Implied Volatility smile, and Black-Scholes Greeks (Delta, Gamma, Theta, Vega)." },
  { id: "tour-backtest", title: "6. Automated Backtesting", desc: "Test historical strategy performance against a buy-and-hold benchmark." },
  { id: "broker-btn", title: "7. Direct Broker Router", desc: "Execute orders across multiple asset classes with bracket risk controls." },
  { id: "portfolio-btn", title: "8. Portfolio & Multi-Asset Sync", desc: "Manage custom watchlists and synchronized multi-asset positions." },
  { id: "tour-step-6", title: "9. AI Recommendation Engine", desc: "Evaluates RSI momentum and HMM regimes for actionable signals." },
  { id: "tour-step-7", title: "10. Advanced Professional Charting Suite", desc: "Interactive TradingView Lightweight Charts with candlestick/line modes, SMA, Bollinger Bands, and Pine Script." },
  { id: "tour-step-8", title: "11. Calculated Technical Indicators", desc: "Features RSI, MACD, and VIX volatility indicators." },
  { id: "tour-step-10", title: "12. Real-Time Market News", desc: "Aggregates filtered news feeds, unique relevance analysis, and impact scoring." }
];

let currentTourIdx = 0;
function startTour() {
  document.body.classList.add('modal-open');
  currentTourIdx = 0;
  document.getElementById('tour-modal').classList.remove('hidden');
  updateTourStep();
}

function closeTour() {
  document.body.classList.remove('modal-open');
  document.getElementById('tour-modal').classList.add('hidden');
  removeTourHighlights();
}

function updateTourStep() {
  removeTourHighlights();
  const step = tourSteps[currentTourIdx];
  document.getElementById('tour-step-number').textContent = `Step ${currentTourIdx + 1} of ${tourSteps.length}`;
  document.getElementById('tour-title').textContent = step.title;
  document.getElementById('tour-description').textContent = step.desc;

  const targetElem = document.getElementById(step.id);
  if (targetElem) {
    targetElem.classList.add('tour-highlight');
    targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  document.getElementById('tour-prev-btn').disabled = currentTourIdx === 0;
  document.getElementById('tour-next-btn').textContent = currentTourIdx === tourSteps.length - 1 ? "Finish" : "Next";
}

function nextTourStep() {
  if (currentTourIdx < tourSteps.length - 1) {
    currentTourIdx++;
    updateTourStep();
  } else {
    closeTour();
  }
}

function prevTourStep() {
  if (currentTourIdx > 0) {
    currentTourIdx--;
    updateTourStep();
  }
}

function removeTourHighlights() {
  tourSteps.forEach(s => {
    const e = document.getElementById(s.id);
    if (e) e.classList.remove('tour-highlight');
  });
}

// ==========================================
// Order Booking & Details
// ==========================================
function openBrokerModal() {
  document.body.classList.add('modal-open');
  document.getElementById('broker-ticker-input').value = activeTicker;
  document.getElementById('broker-response-box').classList.add('hidden');
  document.getElementById('broker-modal').classList.remove('hidden');
}

function closeBrokerModal() {
  document.body.classList.remove('modal-open');
  document.getElementById('broker-modal').classList.add('hidden');
}

function toggleLimitPriceField() {
  const type = document.getElementById('broker-type-select').value;
  document.getElementById('limit-price-group').classList.toggle('hidden', type !== 'limit');
}

async function submitBrokerOrder() {
  const broker = document.getElementById('broker-select').value;
  const side = document.getElementById('broker-side-select').value.toUpperCase();
  const qty = parseFloat(document.getElementById('broker-qty-input').value);
  const type = document.getElementById('broker-type-select').value;
  const limitPrice = document.getElementById('broker-limit-input').value ? parseFloat(document.getElementById('broker-limit-input').value) : null;
  const stopLoss = document.getElementById('broker-sl-input').value ? parseFloat(document.getElementById('broker-sl-input').value) : null;
  const takeProfit = document.getElementById('broker-tp-input').value ? parseFloat(document.getElementById('broker-tp-input').value) : null;

  try {
    const res = await fetch('http://localhost:8000/api/broker/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        broker: broker,
        ticker: activeTicker,
        side: side,
        qty: qty,
        order_type: type,
        limit_price: limitPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit
      })
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "API routing failed");
    }
    
    const data = await res.json();
    const details = data.order_details;

    const respBox = document.getElementById('broker-response-box');
    respBox.innerHTML = `
      <strong style="color: var(--accent-green);">✅ Order Execution & Booking Details:</strong><br>
      • Order ID: <code>${details.order_id}</code><br>
      • Broker Gateway: <strong>${broker.toUpperCase()}</strong><br>
      • Asset Ticker: <strong>${details.ticker}</strong><br>
      • Order Side: <strong>${details.side}</strong> | Quantity: <strong>${details.qty}</strong><br>
      • Execution Status: <strong style="color: var(--accent-green);">${details.execution_status} (Settled into Portfolio)</strong>
    `;
    respBox.classList.remove('hidden');
  } catch (err) {
    console.error("Order routing error:", err);
    alert(`❌ Failed to route order to Alpaca.\nEnsure ALPACA_API_KEY is active in .env.\nDetail: ${err.message}`);
  }
}

// ==========================================
// Multi-Asset Order Book Stream
// ==========================================
function connectOrderBookStream(ticker) {
  if (orderBookSocket) orderBookSocket.close();
  orderBookSocket = new WebSocket(`ws://localhost:8000/ws/orderbook/${ticker}`);
  
  orderBookSocket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    const bid = data.level1.bid;
    const ask = data.level1.ask;
    const spread = data.level1.spread;

    document.getElementById('ob-bid').textContent = `$${bid.toFixed(2)}`;
    document.getElementById('ob-ask').textContent = `$${ask.toFixed(2)}`;
    document.getElementById('ob-spread').textContent = `$${spread.toFixed(2)}`;

    const bids = data.level2?.bids || [
      { price: bid, size: 5000 },
      { price: Number((bid - 0.08).toFixed(2)), size: 12500 },
      { price: Number((bid - 0.16).toFixed(2)), size: 28000 }
    ];
    const asks = data.level2?.asks || [
      { price: ask, size: 5000 },
      { price: Number((ask + 0.08).toFixed(2)), size: 11200 },
      { price: Number((ask + 0.16).toFixed(2)), size: 24500 }
    ];

    document.getElementById('ob-bids-list').innerHTML = bids.map(b => `
      <div class="ob-row"><span class="text-gain">$${Number(b.price).toFixed(2)}</span><span style="font-weight:600;">${Number(b.size).toLocaleString()}</span></div>
    `).join('');

    document.getElementById('ob-asks-list').innerHTML = asks.map(a => `
      <div class="ob-row"><span class="text-risk">$${Number(a.price).toFixed(2)}</span><span style="font-weight:600;">${Number(a.size).toLocaleString()}</span></div>
    `).join('');
  };
}

// ==========================================
// Real-time Market News & Category Filtering
// ==========================================
function switchNewsTab(filterType, btnElem) {
  document.querySelectorAll('.news-tab-btn').forEach(b => b.classList.remove('active'));
  btnElem.classList.add('active');
  activeNewsFilter = filterType;
  newsDisplayLimit = 5;
  renderMergedNewsSection();
}

function loadMoreNews() {
  newsDisplayLimit += 5;
  renderMergedNewsSection();
}

async function fetchNewsForActiveTicker() {
  try {
    const res = await fetch(`http://localhost:8000/api/stock/news?ticker=${activeTicker}`);
    const data = await res.json();
    cachedArticles = data.articles || [];
  } catch (err) {
    console.error("News fetch error:", err);
    cachedArticles = [];
  }
}

function renderMergedNewsSection() {
  const container = document.getElementById('news-container');
  const moreContainer = document.getElementById('news-more-wrapper');
  if (!container) return;

  let dataset = [];
  if (activeNewsFilter === 'general') {
    dataset = cachedArticles;
  } else if (activeNewsFilter === 'verified') {
    dataset = cachedArticles.filter(art => {
      const src = (art.source || '').toLowerCase();
      return VERIFIED_FINANCIAL_SOURCES.some(v => src.includes(v));
    });
    if (dataset.length === 0) dataset = cachedArticles.slice(0, 3);
  } else if (activeNewsFilter === 'rumored') {
    dataset = [
      { title: `Market Speculation Suggests Upcoming Strategic Partnership or Expansion for ${activeTicker}`, url: '#', source: 'Rumor Desk', published_at: 'Unverified', impact: 'Neutral', relevance: `Unverified market chatter regarding potential future developments for ${activeTicker}.` },
      { title: `Unconfirmed Reports of Supply Chain Adjustments Impacting ${activeTicker}`, url: '#', source: 'Industry Insider', published_at: 'Unverified', impact: 'Negative', relevance: `Speculative whispers regarding operational hurdles for ${activeTicker}.` }
    ];
  }

  container.innerHTML = dataset.slice(0, newsDisplayLimit).map(art => {
    const impactClass = art.impact === 'Positive' ? 'text-gain' : (art.impact === 'Negative' ? 'text-risk' : '');
    return `
      <a href="${art.url || '#'}" target="_blank" class="feed-item" style="display:flex; flex-direction:column; gap:6px;">
        <div class="feed-title-container" style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h4 style="font-size:13px; font-weight:600;">${art.title}</h4>
          <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:var(--bg-surface-alt); border:1px solid var(--border-color);" class="${impactClass}">${art.impact || 'Neutral'}</span>
        </div>
        <p style="font-size:11px; color:var(--text-muted); line-height:1.4; margin:0;">💡 <strong>Relevance:</strong> ${art.relevance || 'Directly impacts market sentiment.'}</p>
        <div class="feed-meta" style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-top:2px;">
          <span>${art.source}</span><span>${art.published_at}</span>
        </div>
      </a>
    `;
  }).join('') || '<p style="font-size: 13px; color: var(--text-muted); padding: 10px;">No articles found for this category.</p>';

  if (moreContainer) {
    moreContainer.classList.toggle('hidden', dataset.length <= newsDisplayLimit);
  }
}

// ==========================================
// Portfolio & Watchlist Controllers
// ==========================================
function openPortfolioModal() { 
  document.body.classList.add('modal-open');
  renderWatchlistTab(); 
  renderLivePositionsTab(); 
  document.getElementById('portfolio-modal').classList.remove('hidden'); 
}
function closePortfolioModal() { document.body.classList.remove('modal-open'); document.getElementById('portfolio-modal').classList.add('hidden'); }
function switchPortfolioTab(tabName, btnElem) {
  document.querySelectorAll('.port-tab-btn').forEach(b => b.classList.remove('active'));
  btnElem.classList.add('active');
  document.getElementById('tab-watchlist').classList.toggle('hidden', tabName !== 'watchlist');
  document.getElementById('tab-positions').classList.toggle('hidden', tabName !== 'positions');
  document.getElementById('tab-optimizer').classList.toggle('hidden', tabName !== 'optimizer');
  
  if (tabName === 'positions') renderLivePositionsTab();
}
function getStoredWatchlist() {
  try { return JSON.parse(localStorage.getItem('user_watchlist')) || ['AAPL', 'BTCUSD']; } catch(e) { return ['AAPL']; }
}
function toggleCurrentWatchlist() {
  let w = getStoredWatchlist();
  if (w.includes(activeTicker)) w = w.filter(t => t !== activeTicker);
  else w.push(activeTicker);
  localStorage.setItem('user_watchlist', JSON.stringify(w));
  updateWatchlistStarState();
}
function updateWatchlistStarState() {
  const star = document.getElementById('watchlist-toggle-btn');
  if (star) star.textContent = getStoredWatchlist().includes(activeTicker) ? '★' : '☆';
}
function renderWatchlistTab() {
  document.getElementById('watchlist-items-container').innerHTML = getStoredWatchlist().map(t => `
    <div class="port-item-row"><div><strong>${t}</strong></div><button onclick="selectTicker('${t}'); closePortfolioModal();" class="btn-primary" style="padding:4px 10px; font-size:11px;">View</button></div>
  `).join('');
}

async function renderLivePositionsTab() {
  const container = document.getElementById('positions-items-container');
  if (!container) return;
  container.innerHTML = '<p style="font-size:12px; color:var(--text-muted); padding:10px;">Synchronizing broker ledger via Alpaca...</p>';

  try {
    const res = await fetch('http://localhost:8000/api/broker/account');
    const data = await res.json();

    if (data.error) {
      container.innerHTML = `<div style="padding:15px; color:var(--accent-yellow); background:rgba(217, 119, 6, 0.1); border-radius:6px; border:1px solid var(--accent-yellow); font-size:12.5px;">⚠️ <strong>Broker Gateway Unconfigured:</strong><br>${data.error}</div>`;
      document.getElementById('port-total-val').textContent = "$0.00";
      document.getElementById('port-cash-val').textContent = "$0.00";
      return;
    }

    document.getElementById('port-total-val').textContent = `$${parseFloat(data.portfolio_value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('port-cash-val').textContent = `$${parseFloat(data.cash).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    const positions = data.positions || [];
    if (positions.length === 0) {
      container.innerHTML = '<p style="font-size:12px; color:var(--text-muted); padding:10px;">No open positions in active account.</p>';
      return;
    }

    container.innerHTML = positions.map(pos => {
      const plClass = pos.unrealizedPL >= 0 ? 'text-gain' : 'text-risk';
      const plSign = pos.unrealizedPL >= 0 ? '+' : '';
      return `
        <div class="port-item-row" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${pos.ticker}</strong> 
            <span style="font-size:11px; color:var(--text-muted);">(${parseFloat(pos.shares).toFixed(4)} Units @ $${parseFloat(pos.buyPrice).toFixed(2)})</span>
            <div style="font-size:11px; color:var(--text-muted);">Market Value: $${parseFloat(pos.marketValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          </div>
          <div style="text-align:right;">
            <strong class="${plClass}">${plSign}$${parseFloat(pos.unrealizedPL).toFixed(2)}</strong>
            <div style="font-size:11px;" class="${plClass}">${plSign}${parseFloat(pos.unrealizedPLPct).toFixed(2)}%</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Error syncing positions:", err);
    container.innerHTML = '<p style="color:var(--accent-red); padding:10px;">Failed to synchronize live positions.</p>';
  }
}

// ==========================================
// Portfolio Optimization Engine
// ==========================================
async function runPortfolioOptimization() {
  const cap = document.getElementById('opt-capital-input').value || 100000;
  const profile = document.getElementById('opt-risk-select').value || 'balanced';
  
  document.getElementById('optimizer-loading').classList.remove('hidden');
  document.getElementById('optimizer-results-container').classList.add('hidden');
  document.getElementById('opt-rebalance-msg').classList.add('hidden');

  try {
    const res = await fetch(`http://localhost:8000/api/portfolio/optimize?capital=${cap}&risk_profile=${profile}`);
    const data = await res.json();
    
    if (data.status === 'success') {
      currentOptAllocations = data.allocations;
      const m = data.metrics;
      
      document.getElementById('opt-res-ret').textContent = `${m.optimized_expected_return}%`;
      document.getElementById('opt-res-vol').textContent = `${m.optimized_volatility}%`;
      document.getElementById('opt-res-sharpe').textContent = m.optimized_sharpe;
      
      const listContainer = document.getElementById('opt-allocations-list');
      listContainer.innerHTML = currentOptAllocations.map(a => `
        <div class="opt-alloc-row">
          <div class="alloc-ticker">${a.ticker}</div>
          <div class="alloc-bar-wrapper">
            <div class="alloc-bar-fill" style="width: ${a.optimized_weight_pct}%;"></div>
          </div>
          <div class="alloc-pct">${a.optimized_weight_pct}%</div>
        </div>
      `).join('');
      
      document.getElementById('optimizer-loading').classList.add('hidden');
      document.getElementById('optimizer-results-container').classList.remove('hidden');
    }
  } catch (err) {
    console.error("Optimization error:", err);
    document.getElementById('optimizer-loading').textContent = "Failed to run optimization engine.";
  }
}

async function executePortfolioRebalance() {
  if (currentOptAllocations.length === 0) return;
  const msgBox = document.getElementById('opt-rebalance-msg');
  msgBox.textContent = "Liquidating current positions and executing optimal weights via Alpaca API...";
  msgBox.classList.remove('hidden');

  try {
    const payload = currentOptAllocations.map(a => ({
      ticker: a.ticker,
      optimized_weight_pct: a.optimized_weight_pct
    }));

    const res = await fetch('http://localhost:8000/api/broker/rebalance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assets: payload })
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "API validation failed");
    }
    
    const data = await res.json();
    
    if (data.status === 'success') {
      msgBox.textContent = "✅ " + data.message;
      setTimeout(() => {
        switchPortfolioTab('positions', document.querySelectorAll('.port-tab-btn')[1]);
      }, 1500);
    }
  } catch (err) {
    console.error("Broker rebalance error:", err);
    msgBox.textContent = `❌ Failed to route rebalance orders to Alpaca. Make sure ALPACA_API_KEY is active in your .env file.`;
    msgBox.style.color = "var(--accent-red)";
  }
}

function setTimeframe(tf, btnElement) {
  activeTimeframe = tf;
  document.querySelectorAll('.timeframe-group .tf-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  renderProfessionalChart(activeTicker, filterDataByTimeframe(rawHistoricalData, tf));
}

function filterDataByTimeframe(data, tf) {
  if (!data || data.length === 0) return [];
  if (tf === 'ALL') return data;
  const pts = data.length;
  if (tf === '1D') return data.slice(pts - 2);
  if (tf === '1W') return data.slice(pts - 5);
  if (tf === '1M') return data.slice(pts - 22);
  if (tf === '1Y') return data.slice(pts - 252);
  return data;
}

function renderProfessionalChart(ticker, historicalData) {
  let assetInfo = { name: ticker };
  for (const catObj of Object.values(ASSET_DIRECTORY)) {
    if (catObj[ticker]) {
      assetInfo = catObj[ticker];
      break;
    }
  }

  document.getElementById('chart-title').textContent = `${assetInfo.name} (${ticker}) Professional Suite`;

  if (!tvChart) initTradingViewChart();
  if (!historicalData || historicalData.length === 0) return;

  const candleData = [], lineData = [], volumeData = [], smaData = [], bbUpper = [], bbLower = [];
  historicalData.forEach((d, idx) => {
    const timeStr = (d.Date || '').split('T')[0];
    const close = d.Close || 100;
    const open = idx > 0 ? (historicalData[idx-1].Close || close) : close;
    candleData.push({ time: timeStr, open, high: Math.max(open, close)*1.005, low: Math.min(open, close)*0.995, close });
    lineData.push({ time: timeStr, value: close });
    volumeData.push({ time: timeStr, value: 2000000, color: close >= open ? '#22c55e' : '#ef4444' });
    if (idx >= 19) {
      let sum = 0;
      for (let j = 0; j < 20; j++) sum += historicalData[idx - j].Close;
      smaData.push({ time: timeStr, value: sum / 20 });
    }
    if (d.BB_Upper) bbUpper.push({ time: timeStr, value: d.BB_Upper });
    if (d.BB_Lower) bbLower.push({ time: timeStr, value: d.BB_Lower });
  });

  if (tvCandleSeries) tvCandleSeries.setData(candleData);
  if (tvLineSeries) tvLineSeries.setData(lineData);
  if (tvVolumeSeries) tvVolumeSeries.setData(volumeData);
  if (tvSmaSeries) tvSmaSeries.setData(smaData);
  if (tvBbUpperSeries) tvBbUpperSeries.setData(bbUpper);
  if (tvBbLowerSeries) tvBbLowerSeries.setData(bbLower);
  if (tvChart) tvChart.timeScale().fitContent();
}

function onRiskProfileChange() { fetchIntelligence(activeTicker); }

async function fetchIntelligence(tickerInputVal) {
  activeTicker = String(tickerInputVal).trim().split(' ')[0].toUpperCase();
  document.getElementById('ticker-input').value = activeTicker;
  const riskProfile = document.getElementById('risk-profile-select').value;
  newsDisplayLimit = 5;

  const loader = document.getElementById('loader');
  const dashboard = document.getElementById('dashboard');
  loader.classList.remove('hidden');
  dashboard.classList.add('hidden');

  try {
    const resData = await fetch(`http://localhost:8000/api/stock/analyze?ticker=${activeTicker}&risk_profile=${riskProfile}`).then(r => r.json());

    rawHistoricalData = resData.historical_chart || [];
    activeCurrentPrice = resData.current_price;
    activeTargetPrice = resData.predictions.target_price;
    activeLowerBound = resData.predictions.lower_bound_price;
    activeUpperBound = resData.predictions.upper_bound_price;
    activeReturnPct = resData.predictions.next_return_pct;
    activeVerdict = resData.recommendation.verdict;
    activeRegime = resData.market_regime.label;

    document.getElementById('val-price').textContent = `$${activeCurrentPrice.toFixed(2)}`;
    document.getElementById('val-company-name').textContent = `${resData.company_name} (${resData.asset_class})`;
    
    const retPct = resData.predictions.next_return_pct;
    const retElem = document.getElementById('val-return');
    retElem.textContent = `${retPct >= 0 ? '+' : ''}${retPct}%`;
    retElem.style.color = retPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    document.getElementById('val-target').textContent = `$${activeTargetPrice.toFixed(2)}`;
    document.getElementById('val-lower').textContent = `$${activeLowerBound.toFixed(2)}`;
    document.getElementById('val-upper').textContent = `$${activeUpperBound.toFixed(2)}`;
    updateWatchlistStarState();

    const rec = resData.recommendation;
    document.getElementById('rec-verdict-text').textContent = rec.verdict;
    document.getElementById('rec-reasons-list').innerHTML = (rec.reasons || []).map(r => `<li>• ${r}</li>`).join('');
    document.getElementById('peer-chips-container').innerHTML = (resData.peers || []).map(p => `<button onclick="selectTicker('${p}')">${p}</button>`).join('');

    document.getElementById('val-rsi').textContent = resData.technical_indicators.rsi_14;
    document.getElementById('val-vix').textContent = resData.technical_indicators.vix;
    document.getElementById('val-macd').textContent = resData.technical_indicators.macd;

    renderProfessionalChart(activeTicker, filterDataByTimeframe(rawHistoricalData, activeTimeframe));
    
    await fetchNewsForActiveTicker();
    renderMergedNewsSection();
    
    connectOrderBookStream(activeTicker);

    loader.classList.add('hidden');
    dashboard.classList.remove('hidden');
  } catch (err) {
    console.error("API error:", err);
    alert("Error fetching asset intelligence data. Ensure FastAPI backend is running on port 8000.");
    loader.classList.add('hidden');
  }
}

function connectBrokerStatusStream() {
  brokerStatusSocket = new WebSocket('ws://localhost:8000/ws/broker/updates');
}

function handleSearch(event) {
  event.preventDefault();
  const symbol = document.getElementById('ticker-input').value.trim();
  if (symbol) fetchIntelligence(symbol);
}

function selectTicker(symbol) { fetchIntelligence(symbol); }

window.addEventListener('DOMContentLoaded', () => {
  fetchIntelligence('AAPL');
  connectBrokerStatusStream();
  connectSocialWebSocket();
  initDraggableChatbot();
});