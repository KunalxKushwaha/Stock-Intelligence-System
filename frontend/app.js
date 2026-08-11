let stockChart = null;
let rawHistoricalData = [];
let activeTimeframe = 'ALL';
let currentArticles = [];
let currentFactClaims = [];
let activeNewsFilter = 'general';
let newsDisplayLimit = 5;
let activeTicker = 'AAPL';
let activeCurrentPrice = 0.0;
let orderBookSocket = null;
let brokerStatusSocket = null;

const ASSET_DIRECTORY = {
  "AAPL": { name: "Apple Inc.", class: "Equities", base: 223.96 },
  "NVDA": { name: "Nvidia Corp.", class: "Equities", base: 128.50 },
  "TSLA": { name: "Tesla Inc.", class: "Equities", base: 242.10 },
  "MSFT": { name: "Microsoft Corp.", class: "Equities", base: 425.00 },
  "AMZN": { name: "Amazon.com Inc.", class: "Equities", base: 185.20 },
  "GOOGL": { name: "Alphabet / Google", class: "Equities", base: 175.40 },
  "META": { name: "Meta / Facebook", class: "Equities", base: 510.00 },
  "NFLX": { name: "Netflix Inc.", class: "Equities", base: 680.00 },
  "AMD": { name: "Advanced Micro Devices", class: "Equities", base: 145.30 },
  "JPM": { name: "JPMorgan Chase", class: "Equities", base: 215.00 },
  "BTCUSD": { name: "Bitcoin / USD", class: "Crypto", base: 65420.00 },
  "ETHUSD": { name: "Ethereum / USD", class: "Crypto", base: 3450.00 },
  "SOLUSD": { name: "Solana / USD", class: "Crypto", base: 155.00 },
  "EURUSD": { name: "Euro / US Dollar", class: "Forex", base: 1.08 },
  "GBPUSD": { name: "British Pound / US Dollar", class: "Forex", base: 1.29 },
  "USDJPY": { name: "US Dollar / Japanese Yen", class: "Forex", base: 147.50 },
  "GC=F": { name: "Gold Futures", class: "Commodities", base: 2450.00 },
  "CL=F": { name: "Crude Oil WTI Futures", class: "Commodities", base: 78.50 },
  "SI=F": { name: "Silver Futures", class: "Commodities", base: 28.50 },
  "SPY": { name: "S&P 500 ETF Trust", class: "Derivatives", base: 545.00 },
  "QQQ": { name: "Invesco QQQ Trust (Nasdaq)", class: "Derivatives", base: 465.00 },
  "VIX": { name: "CBOE Volatility Index", class: "Derivatives", base: 16.50 }
};

const VERIFIED_FINANCIAL_SOURCES = [
  'reuters', 'bloomberg', 'the wall street journal', 'wsj', 
  'investopedia', 'cnbc', 'financial times', 'barron\'s', 
  'marketwatch', 'forbes', 'business insider', 'yahoo finance', 'biztoc'
];

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  document.getElementById('theme-btn').textContent = newTheme === 'dark' ? '☀️ Light' : '🌙 Dark';

  if (stockChart) {
    const gridColor = newTheme === 'dark' ? '#1e293b' : '#e2e8f0';
    stockChart.options.scales.x.grid.color = gridColor;
    stockChart.options.scales.y.grid.color = gridColor;
    stockChart.update();
  }
}

// ==========================================
// Broker Modal & Bracket Order Logic
// ==========================================
function openBrokerModal() {
  document.getElementById('broker-ticker-input').value = activeTicker;
  document.getElementById('broker-response-box').classList.add('hidden');
  document.getElementById('broker-modal').classList.remove('hidden');
}

function closeBrokerModal() {
  document.getElementById('broker-modal').classList.add('hidden');
}

function toggleLimitPriceField() {
  const typeVal = document.getElementById('broker-type-select').value;
  const limitGroup = document.getElementById('limit-price-group');
  if (typeVal === 'limit') {
    limitGroup.classList.remove('hidden');
  } else {
    limitGroup.classList.add('hidden');
  }
}

async function submitBrokerOrder() {
  const broker = document.getElementById('broker-select').value;
  const ticker = activeTicker;
  const side = document.getElementById('broker-side-select').value;
  const qty = parseFloat(document.getElementById('broker-qty-input').value);
  const order_type = document.getElementById('broker-type-select').value;
  
  let limit_price = null;
  if (order_type === 'limit') {
    limit_price = parseFloat(document.getElementById('broker-limit-input').value);
    if (!limit_price || limit_price <= 0) {
      alert("Please enter a valid limit price for your limit order.");
      return;
    }
  }

  const stop_loss = parseFloat(document.getElementById('broker-sl-input').value) || null;
  const take_profit = parseFloat(document.getElementById('broker-tp-input').value) || null;

  if (!qty || qty <= 0) {
    alert("Please enter a valid order quantity.");
    return;
  }

  const respBox = document.getElementById('broker-response-box');
  respBox.innerHTML = "⏳ Routing multi-asset order securely to broker gateway...";
  respBox.classList.remove('hidden');

  try {
    const response = await fetch('http://localhost:8000/api/broker/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broker, ticker, side, qty, order_type, limit_price, stop_loss, take_profit })
    });

    const result = await response.json();
    if (response.ok) {
      const details = result.order_details;
      respBox.innerHTML = `
        <strong style="color: var(--accent-green);">✅ Multi-Asset Order Executed!</strong><br>
        • Broker: <strong>${details.broker}</strong><br>
        • Order ID: <code>${details.order_id}</code><br>
        • Action: <strong>${details.side} ${details.qty}x ${details.ticker}</strong> (${details.type})<br>
        • Limit Price: <strong>${details.limit_price ? '$' + details.limit_price : 'N/A (Market)'}</strong><br>
        • Status: <strong style="color: var(--accent-green);">${details.execution_status}</strong> at ${details.timestamp}
      `;
    } else {
      let errorMsg = result.detail;
      if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg, null, 2);
      respBox.innerHTML = `<strong style="color: var(--accent-red);">❌ Execution Failed:</strong> <pre style="margin-top: 4px; white-space: pre-wrap;">${errorMsg}</pre>`;
    }
  } catch (err) {
    console.error("Broker order routing error:", err);
    respBox.innerHTML = `<strong style="color: var(--accent-red);">❌ Network Error:</strong> Could not connect to FastAPI gateway.`;
  }
}

// ==========================================
// Portfolio & Live Broker Ledger Sync
// ==========================================
function openPortfolioModal() {
  renderWatchlistTab();
  renderLivePositionsTab();
  document.getElementById('portfolio-modal').classList.remove('hidden');
}

function closePortfolioModal() {
  document.getElementById('portfolio-modal').classList.add('hidden');
}

function switchPortfolioTab(tabName, btnElem) {
  document.querySelectorAll('.port-tab-btn').forEach(b => b.classList.remove('active'));
  btnElem.classList.add('active');

  document.getElementById('tab-watchlist').classList.add('hidden');
  document.getElementById('tab-positions').classList.add('hidden');

  if (tabName === 'watchlist') {
    document.getElementById('tab-watchlist').classList.remove('hidden');
    renderWatchlistTab();
  } else {
    document.getElementById('tab-positions').classList.remove('hidden');
    renderLivePositionsTab();
  }
}

function getStoredWatchlist() {
  try {
    return JSON.parse(localStorage.getItem('user_watchlist')) || ['AAPL', 'BTCUSD', 'EURUSD', 'GC=F'];
  } catch (e) {
    return ['AAPL', 'BTCUSD', 'EURUSD', 'GC=F'];
  }
}

function toggleCurrentWatchlist() {
  let watchlist = getStoredWatchlist();
  if (watchlist.includes(activeTicker)) {
    watchlist = watchlist.filter(t => t !== activeTicker);
  } else {
    watchlist.push(activeTicker);
  }
  localStorage.setItem('user_watchlist', JSON.stringify(watchlist));
  updateWatchlistStarState();
}

function updateWatchlistStarState() {
  const watchlist = getStoredWatchlist();
  const starBtn = document.getElementById('watchlist-toggle-btn');
  if (!starBtn) return;
  if (watchlist.includes(activeTicker)) {
    starBtn.textContent = '★';
    starBtn.classList.add('saved');
    starBtn.title = 'Remove from Watchlist';
  } else {
    starBtn.textContent = '☆';
    starBtn.classList.remove('saved');
    starBtn.title = 'Save to Watchlist';
  }
}

function renderWatchlistTab() {
  const container = document.getElementById('watchlist-items-container');
  const watchlist = getStoredWatchlist();
  if (watchlist.length === 0) {
    container.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); padding: 10px;">Your watchlist is empty.</p>';
    return;
  }
  container.innerHTML = watchlist.map(ticker => {
    const item = ASSET_DIRECTORY[ticker] || { name: ticker, class: "Asset" };
    return `
      <div class="port-item-row">
        <div><strong>${ticker}</strong> <span style="font-size: 11px; color: var(--text-muted);">(${item.name} - ${item.class})</span></div>
        <div style="display: flex; gap: 8px;">
          <button onclick="selectStockFromDirectory('${ticker}'); closePortfolioModal();" class="btn-primary" style="padding: 4px 10px; font-size: 11px;">View</button>
          <button onclick="removeFromWatchlist('${ticker}')" class="btn-secondary" style="padding: 4px 10px; font-size: 11px; color: var(--accent-red);">Remove</button>
        </div>
      </div>
    `;
  }).join('');
}

function removeFromWatchlist(ticker) {
  let watchlist = getStoredWatchlist();
  watchlist = watchlist.filter(t => t !== ticker);
  localStorage.setItem('user_watchlist', JSON.stringify(watchlist));
  renderWatchlistTab();
  updateWatchlistStarState();
}

async function renderLivePositionsTab() {
  const container = document.getElementById('positions-items-container');
  container.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); padding: 10px;">Syncing multi-asset ledger from broker API...</p>';

  try {
    const res = await fetch('http://localhost:8000/api/broker/account');
    const data = await res.json();

    document.getElementById('port-total-val').textContent = `$${data.portfolio_value.toFixed(2)}`;
    document.getElementById('port-cash-val').textContent = `$${data.buying_power.toFixed(2)}`;

    const positions = data.positions || [];
    if (positions.length === 0) {
      container.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); padding: 10px;">No open positions in broker account.</p>';
      return;
    }

    container.innerHTML = positions.map(pos => {
      const plColor = pos.unrealizedPL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      return `
        <div class="port-item-row">
          <div><strong>${pos.ticker}</strong> <div style="font-size: 11px; color: var(--text-muted);">Units: <strong>${pos.shares}</strong> | Avg Buy: <strong>$${pos.buyPrice.toFixed(2)}</strong></div></div>
          <div style="text-align: right;">
            <strong style="color: ${plColor};">${pos.unrealizedPL >= 0 ? '+' : ''}$${pos.unrealizedPL.toFixed(2)} (${pos.unrealizedPLPct.toFixed(2)}%)</strong>
            <div style="font-size: 11px; color: var(--text-muted);">Val: $${pos.marketValue.toFixed(2)}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Portfolio sync error:", err);
    container.innerHTML = '<p style="font-size: 12px; color: var(--accent-red); padding: 10px;">Failed to sync with broker ledger.</p>';
  }
}

// ==========================================
// Order Status WebSocket Stream Integration
// ==========================================
function connectBrokerStatusStream() {
  if (brokerStatusSocket) brokerStatusSocket.close();
  brokerStatusSocket = new WebSocket('ws://localhost:8000/ws/broker/updates');

  brokerStatusSocket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log("⚡ Broker Order Status Update:", data);
  };
}

// ==========================================
// Multi-Asset Directory Modal & Chart Logic
// ==========================================
function openStocksModal() {
  const directoryContainer = document.getElementById('stocks-directory-list');
  directoryContainer.innerHTML = Object.entries(ASSET_DIRECTORY).map(([symbol, info]) => `
    <div class="stock-dir-item" onclick="selectStockFromDirectory('${symbol}')">
      <span class="stock-dir-symbol">${symbol} <span style="font-size:10px; background:var(--accent-blue-soft); padding:2px 6px; border-radius:4px; color:var(--accent-blue);">${info.class}</span></span>
      <span class="stock-dir-name">${info.name}</span>
    </div>
  `).join('');
  document.getElementById('stocks-modal').classList.remove('hidden');
}

function closeStocksModal() { document.getElementById('stocks-modal').classList.add('hidden'); }

function filterStockDirectory() {
  const query = document.getElementById('modal-stock-filter').value.toLowerCase();
  const directoryContainer = document.getElementById('stocks-directory-list');
  const filtered = Object.entries(ASSET_DIRECTORY).filter(([symbol, info]) => symbol.toLowerCase().includes(query) || info.name.toLowerCase().includes(query) || info.class.toLowerCase().includes(query));
  directoryContainer.innerHTML = filtered.map(([symbol, info]) => `
    <div class="stock-dir-item" onclick="selectStockFromDirectory('${symbol}')">
      <span class="stock-dir-symbol">${symbol} <span style="font-size:10px; background:var(--accent-blue-soft); padding:2px 6px; border-radius:4px; color:var(--accent-blue);">${info.class}</span></span>
      <span class="stock-dir-name">${info.name}</span>
    </div>
  `).join('') || '<p style="font-size: 12px; color: var(--text-muted); padding: 10px;">No matching assets.</p>';
}

function selectStockFromDirectory(symbol) {
  closeStocksModal();
  fetchIntelligence(symbol);
}

function connectOrderBookStream(ticker) {
  if (orderBookSocket) orderBookSocket.close();
  orderBookSocket = new WebSocket(`ws://localhost:8000/ws/orderbook/${ticker}`);
  
  orderBookSocket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    document.getElementById('ob-bid').textContent = `$${data.level1.bid.toFixed(2)}`;
    document.getElementById('ob-ask').textContent = `$${data.level1.ask.toFixed(2)}`;
    document.getElementById('ob-spread').textContent = `$${data.level1.spread.toFixed(2)}`;

    const maxBidSize = Math.max(...data.level2.bids.map(b => b.size), 1000);
    const maxAskSize = Math.max(...data.level2.asks.map(a => a.size), 1000);

    document.getElementById('ob-bids-list').innerHTML = data.level2.bids.map(b => {
      const pct = Math.min(100, Math.round((b.size / maxBidSize) * 100));
      return `
        <div class="ob-row" style="position: relative; overflow: hidden;">
          <div style="position: absolute; right: 0; top: 0; bottom: 0; width: ${pct}%; background: rgba(34, 197, 94, 0.12); z-index: 0;"></div>
          <span class="text-gain" style="z-index: 1;">$${b.price.toFixed(2)}</span>
          <span style="z-index: 1; font-weight: 600;">${b.size.toLocaleString()}</span>
        </div>
      `;
    }).join('');

    document.getElementById('ob-asks-list').innerHTML = data.level2.asks.map(a => {
      const pct = Math.min(100, Math.round((a.size / maxAskSize) * 100));
      return `
        <div class="ob-row" style="position: relative; overflow: hidden;">
          <div style="position: absolute; right: 0; top: 0; bottom: 0; width: ${pct}%; background: rgba(239, 68, 68, 0.12); z-index: 0;"></div>
          <span class="text-risk" style="z-index: 1;">$${a.price.toFixed(2)}</span>
          <span style="z-index: 1; font-weight: 600;">${a.size.toLocaleString()}</span>
        </div>
      `;
    }).join('');
  };
}

function setTimeframe(tf, btnElement) {
  activeTimeframe = tf;
  document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  renderChart(activeTicker, filterDataByTimeframe(rawHistoricalData, tf));
}

function filterDataByTimeframe(data, tf) {
  if (!data || data.length === 0) return [];
  if (tf === 'ALL') return data;
  const totalPoints = data.length;
  let pointsToKeep = totalPoints;
  switch (tf) {
    case '1D': pointsToKeep = Math.min(2, totalPoints); break;
    case '1W': pointsToKeep = Math.min(5, totalPoints); break;
    case '1M': pointsToKeep = Math.min(22, totalPoints); break;
    case '1Y': pointsToKeep = Math.min(252, totalPoints); break;
  }
  return data.slice(totalPoints - pointsToKeep);
}

function renderChart(ticker, historicalData) {
  const assetInfo = ASSET_DIRECTORY[ticker] || { name: ticker };
  document.getElementById('chart-title').textContent = `${assetInfo.name} (${ticker}) Trajectory`;
  const ctx = document.getElementById('stockChart').getContext('2d');
  const labels = historicalData.map(d => (d.Date || '').split('T')[0]);
  const prices = historicalData.map(d => d.Close);

  if (stockChart) stockChart.destroy();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  stockChart = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: [{ label: 'Price Action', data: prices, borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.12)', borderWidth: 2.5, fill: true, tension: 0.2, pointRadius: 2 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: '#64748b', maxTicksLimit: 8 } },
        y: { grid: { color: gridColor }, ticks: { color: '#64748b' } }
      }
    }
  });
}

async function fetchIntelligence(tickerInputVal) {
  activeTicker = String(tickerInputVal).trim().split(' ')[0].toUpperCase();
  document.getElementById('ticker-input').value = activeTicker;

  const loader = document.getElementById('loader');
  const dashboard = document.getElementById('dashboard');
  loader.classList.remove('hidden');
  dashboard.classList.add('hidden');

  try {
    const [resData, resNews, resFacts] = await Promise.all([
      fetch(`http://localhost:8000/api/stock/analyze?ticker=${activeTicker}`).then(r => r.json()),
      fetch(`http://localhost:8000/api/stock/news?ticker=${activeTicker}`).then(r => r.json()),
      fetch(`http://localhost:8000/api/stock/factcheck?ticker=${activeTicker}`).then(r => r.json())
    ]);

    rawHistoricalData = resData.historical_chart || [];
    currentArticles = resNews.articles || [];
    currentFactClaims = resFacts.claims || [];
    activeCurrentPrice = resData.current_price;

    document.getElementById('val-price').textContent = `$${activeCurrentPrice.toFixed(2)}`;
    document.getElementById('val-company-name').textContent = `${resData.company_name} (${resData.asset_class})`;
    
    const retPct = resData.predictions.next_return_pct;
    const retElem = document.getElementById('val-return');
    retElem.textContent = `${retPct >= 0 ? '+' : ''}${retPct}%`;
    retElem.style.color = retPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    document.getElementById('val-target').textContent = `$${resData.predictions.target_price.toFixed(2)}`;
    document.getElementById('val-lower').textContent = `$${resData.predictions.lower_bound_price.toFixed(2)}`;
    document.getElementById('val-upper').textContent = `$${resData.predictions.upper_bound_price.toFixed(2)}`;

    updateWatchlistStarState();

    const rec = resData.recommendation;
    const verdictElem = document.getElementById('rec-verdict-text');
    verdictElem.textContent = rec.verdict;
    verdictElem.style.color = rec.badge_color === 'sage' ? 'var(--accent-green)' : (rec.badge_color === 'yellow' ? 'var(--accent-yellow)' : 'var(--accent-red)');

    document.getElementById('rec-badge').textContent = `Signal Score: ${rec.score > 0 ? '+' : ''}${rec.score}`;
    document.getElementById('rec-reasons-list').innerHTML = (rec.reasons || []).map(r => `<li>• ${r}</li>`).join('');
    
    const assetInfoMap = ASSET_DIRECTORY;
    document.getElementById('peer-chips-container').innerHTML = (resData.peers || []).map(p => {
      const pInfo = assetInfoMap[p] || { name: p };
      return `<button onclick="selectTicker('${p}')">${pInfo.name} (${p})</button>`;
    }).join('');

    document.getElementById('val-rsi').textContent = resData.technical_indicators.rsi_14;
    document.getElementById('val-vix').textContent = resData.technical_indicators.vix;
    document.getElementById('val-macd').textContent = resData.technical_indicators.macd;
    document.getElementById('val-regime').textContent = `Regime: ${resData.market_regime.label}`;

    document.getElementById('val-context').innerHTML = `
      Multi-Asset AI Engine predicts a target of <strong>$${resData.predictions.target_price.toFixed(2)}</strong> 
      for <strong>${resData.company_name}</strong> with a 90% confidence corridor between 
      <strong>$${resData.predictions.lower_bound_price.toFixed(2)}</strong> and <strong>$${resData.predictions.upper_bound_price.toFixed(2)}</strong>.
    `;

    renderChart(activeTicker, filterDataByTimeframe(rawHistoricalData, activeTimeframe));
    newsDisplayLimit = 5;
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

// News & Rumor Rendering (Strictly Separating General vs Verified News)
function switchNewsTab(filterType, btnElem) {
  activeNewsFilter = filterType;
  newsDisplayLimit = 5;
  document.querySelectorAll('.news-tab-btn').forEach(b => b.classList.remove('active'));
  if (btnElem) btnElem.classList.add('active');
  renderMergedNewsSection();
}

function loadMoreNews() {
  newsDisplayLimit += 5;
  renderMergedNewsSection();
}

function renderMergedNewsSection() {
  const container = document.getElementById('news-container');
  const moreContainer = document.getElementById('news-more-wrapper');
  if (!container) return;

  let dataset = [];
  if (activeNewsFilter === 'general') {
    // General News strictly shows non-verified / general financial items so verified sources don't mix in
    dataset = currentArticles.filter(art => !VERIFIED_FINANCIAL_SOURCES.some(vs => (art.source || '').toLowerCase().includes(vs)));
  } else if (activeNewsFilter === 'verified') {
    // Verified News exclusively shows trusted financial sources
    dataset = currentArticles.filter(art => VERIFIED_FINANCIAL_SOURCES.some(vs => (art.source || '').toLowerCase().includes(vs)));
  } else if (activeNewsFilter === 'rumored') {
    dataset = currentFactClaims.map((claim, idx) => ({ 
      title: `"${claim.claim}"`, 
      url: '#', 
      source: `Source: ${claim.publisher}`, 
      published_at: 'Rumor Checked', 
      isClaim: true, 
      claimIndex: idx, 
      rating: claim.rating,
      nlp_fake_news_analysis: claim.nlp_fake_news_analysis 
    }));
  }

  if (dataset.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 13px; padding: 10px;">No ${activeNewsFilter} items available.</p>`;
    moreContainer.classList.add('hidden');
    return;
  }

  const visibleItems = dataset.slice(0, newsDisplayLimit);
  container.innerHTML = visibleItems.map(item => {
    if (item.isClaim) {
      const nlpBadge = item.nlp_fake_news_analysis && item.nlp_fake_news_analysis.is_manipulated ? 
        `<span class="fact-badge" style="background: rgba(239, 68, 68, 0.15); color: var(--accent-red); margin-left:6px;">⚠️ ${item.nlp_fake_news_analysis.risk_type} (${item.nlp_fake_news_analysis.confidence}%)</span>` : '';
      return `
        <div class="feed-item" style="cursor: pointer;" onclick="openFactModal(${item.claimIndex})">
          <div class="feed-title-container"><h4 style="font-weight: 500;">${item.title}</h4>${nlpBadge}<span class="fact-badge fact-badge-rumor">Inspect Claim</span></div>
          <div class="feed-meta"><span>${item.source}</span><strong style="color: var(--accent-red);">${item.rating}</strong></div>
        </div>
      `;
    } else {
      const isVerified = VERIFIED_FINANCIAL_SOURCES.some(vs => (item.source || '').toLowerCase().includes(vs));
      const badgeHtml = isVerified ? `<span class="fact-badge fact-badge-verified">🛡️ Verified Source</span>` : `<span class="fact-badge" style="background: rgba(100, 116, 139, 0.15); color: var(--text-muted);">📰 News</span>`;
      
      const nlpBadge = item.nlp_fake_news_analysis && item.nlp_fake_news_analysis.is_manipulated ? 
        `<span class="fact-badge" style="background: rgba(239, 68, 68, 0.15); color: var(--accent-red); margin-left:6px;" title="NLP Flagged: ${item.nlp_fake_news_analysis.risk_type}">⚠️ NLP Flagged</span>` : '';

      return `
        <a href="${item.url}" target="_blank" class="feed-item">
          <div class="feed-title-container"><h4>${item.title}</h4>${badgeHtml}${nlpBadge}</div>
          <div class="feed-meta"><span>${item.source}</span><span>${item.published_at}</span></div>
        </a>
      `;
    }
  }).join('');

  if (dataset.length > newsDisplayLimit) moreContainer.classList.remove('hidden');
  else moreContainer.classList.add('hidden');
}

function openFactModal(claimIdx) {
  const claim = currentFactClaims[claimIdx];
  if (!claim) return;
  document.getElementById('fact-modal-claim').textContent = `"${claim.claim}"`;
  document.getElementById('fact-modal-publisher').textContent = claim.publisher || 'Independent Audit';
  document.getElementById('fact-modal-rating').textContent = claim.rating || 'Unverified';
  
  let nlpDesc = "";
  if (claim.nlp_fake_news_analysis) {
    nlpDesc = ` | NLP Classifier Verdict: ${claim.nlp_fake_news_analysis.verdict} (${claim.nlp_fake_news_analysis.risk_type} - ${claim.nlp_fake_news_analysis.confidence}% Confidence)`;
  }
  
  document.getElementById('fact-modal-desc').textContent = (claim.description || `Evaluated by verification API and Custom NLP Module. Rating: ${claim.rating}.`) + nlpDesc;
  document.getElementById('fact-modal').classList.remove('hidden');
}

function closeFactModal() { document.getElementById('fact-modal').classList.add('hidden'); }

// Tour Steps
const tourSteps = [
  { id: "tour-step-1", title: "1. Current Asset Price", desc: "Displays live execution price across equities, crypto, forex, and derivatives." },
  { id: "tour-step-2", title: "2. Predicted Target Return", desc: "Outputs target return percentage predicted by the multi-asset AI model." },
  { id: "tour-step-3", title: "3. 90% Safety Floor", desc: "Calculates downside risk floor using Quantile Conformal XGBoost." },
  { id: "tour-step-4", title: "4. 90% Upside Ceiling", desc: "Calculates upside potential ceiling." },
  { id: "broker-btn", title: "5. Direct Broker Router", desc: "Execute orders across multiple asset classes with bracket risk controls." },
  { id: "portfolio-btn", title: "6. Portfolio & Multi-Asset Sync", desc: "Manage custom watchlists and synchronized multi-asset positions." },
  { id: "tour-step-6", title: "7. AI Recommendation Engine", desc: "Evaluates RSI momentum and HMM regimes for actionable signals." },
  { id: "tour-step-7", title: "8. Technical Trajectory & Controls", desc: "Visualizes moving price history with Fibonacci and Support/Resistance tools." },
  { id: "tour-step-8", title: "9. Calculated Technical Indicators", desc: "Features RSI, MACD, and VIX volatility indicators." },
  { id: "tour-step-9", title: "10. Real-Time Market News", desc: "Aggregates filtered news feeds and rumor inspections with pagination." },
  { id: "tour-step-11", title: "11. Multi-Asset L1/L2 Stream", desc: "Streams real-time Level 1 & Level 2 order book depth quotes with volume depth bars." }
];

let currentTourIdx = 0;
function startTour() { currentTourIdx = 0; document.getElementById('tour-modal').classList.remove('hidden'); updateTourStep(); }
function closeTour() { document.getElementById('tour-modal').classList.add('hidden'); removeTourHighlights(); }
function updateTourStep() {
  removeTourHighlights();
  const step = tourSteps[currentTourIdx];
  document.getElementById('tour-step-number').textContent = `Step ${currentTourIdx + 1} of ${tourSteps.length}`;
  document.getElementById('tour-title').textContent = step.title;
  document.getElementById('tour-description').textContent = step.desc;
  const targetElem = document.getElementById(step.id);
  if (targetElem) { targetElem.classList.add('tour-highlight'); targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  document.getElementById('tour-prev-btn').disabled = currentTourIdx === 0;
  document.getElementById('tour-next-btn').textContent = currentTourIdx === tourSteps.length - 1 ? "Finish" : "Next";
}
function nextTourStep() { if (currentTourIdx < tourSteps.length - 1) { currentTourIdx++; updateTourStep(); } else closeTour(); }
function prevTourStep() { if (currentTourIdx > 0) { currentTourIdx--; updateTourStep(); } }
function removeTourHighlights() { tourSteps.forEach(s => { const e = document.getElementById(s.id); if (e) e.classList.remove('tour-highlight'); }); }

function handleSearch(event) {
  event.preventDefault();
  const symbol = document.getElementById('ticker-input').value.trim();
  if (symbol) fetchIntelligence(symbol);
}

function selectTicker(symbol) {
  fetchIntelligence(symbol);
}

window.addEventListener('DOMContentLoaded', () => { 
  fetchIntelligence('AAPL'); 
  connectBrokerStatusStream();
});