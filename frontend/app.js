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

const COMPANY_NAME_MAP = {
  "AAPL": "Apple Inc.",
  "NVDA": "Nvidia Corp.",
  "TSLA": "Tesla Inc.",
  "MSFT": "Microsoft Corp.",
  "AMZN": "Amazon.com Inc.",
  "GOOGL": "Alphabet / Google",
  "META": "Meta / Facebook",
  "NFLX": "Netflix Inc.",
  "AMD": "Advanced Micro Devices",
  "AVGO": "Broadcom Inc.",
  "JPM": "JPMorgan Chase",
  "DIS": "Walt Disney Co."
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
// Technical Drawing Tools Logic
// ==========================================
function toggleDrawingTool(toolName, btnElem) {
  document.querySelectorAll('.draw-btn').forEach(b => b.classList.remove('active'));
  if (btnElem) btnElem.classList.add('active');

  const statusMsg = document.getElementById('drawing-status-msg');
  if (toolName === 'none') {
    statusMsg.classList.add('hidden');
    const filteredData = filterDataByTimeframe(rawHistoricalData, activeTimeframe);
    renderChart(activeTicker, filteredData);
  } else if (toolName === 'fibonacci') {
    statusMsg.textContent = "📐 Fibonacci Retracement: Auto-projecting key 0%, 38.2%, 50%, 61.8% levels.";
    statusMsg.classList.remove('hidden');
    applyFibonacciRetracement();
  } else if (toolName === 'support') {
    statusMsg.textContent = "🛡️ Support/Resistance: Auto-overlaying pivot and swing high/low bands.";
    statusMsg.classList.remove('hidden');
    applySupportResistance();
  }
}

function clearDrawings() {
  toggleDrawingTool('none', document.querySelector('.draw-btn'));
}

function applyFibonacciRetracement() {
  if (!rawHistoricalData || rawHistoricalData.length === 0) return;
  const prices = rawHistoricalData.map(d => d.Close);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const diff = maxPrice - minPrice;

  const fibLevels = [
    { label: 'Fib 0.0% (High)', price: maxPrice, color: '#ef4444' },
    { label: 'Fib 23.6%', price: maxPrice - diff * 0.236, color: '#f59e0b' },
    { label: 'Fib 38.2%', price: maxPrice - diff * 0.382, color: '#10b981' },
    { label: 'Fib 50.0% (Mid)', price: maxPrice - diff * 0.500, color: '#2563eb' },
    { label: 'Fib 61.8% (Golden)', price: maxPrice - diff * 0.618, color: '#8b5cf6' },
    { label: 'Fib 100.0% (Low)', price: minPrice, color: '#ef4444' }
  ];

  const filteredData = filterDataByTimeframe(rawHistoricalData, activeTimeframe);
  renderChartWithAnnotations(activeTicker, filteredData, fibLevels);
}

function applySupportResistance() {
  if (!rawHistoricalData || rawHistoricalData.length === 0) return;
  const prices = rawHistoricalData.map(d => d.Close);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  const srLevels = [
    { label: 'Resistance (R2)', price: maxPrice * 0.98, color: '#ef4444' },
    { label: 'Resistance (R1)', price: maxPrice * 0.94, color: '#f59e0b' },
    { label: 'Pivot / Mean', price: avgPrice, color: '#2563eb' },
    { label: 'Support (S1)', price: minPrice * 1.04, color: '#10b981' },
    { label: 'Support (S2)', price: minPrice * 1.01, color: '#059669' }
  ];

  const filteredData = filterDataByTimeframe(rawHistoricalData, activeTimeframe);
  renderChartWithAnnotations(activeTicker, filteredData, srLevels);
}

function renderChartWithAnnotations(ticker, historicalData, annotationLevels) {
  const cName = COMPANY_NAME_MAP[ticker] || ticker;
  document.getElementById('chart-title').textContent = `${cName} (${ticker}) - Technical Overlay`;
  const ctx = document.getElementById('stockChart').getContext('2d');
  
  const labels = historicalData.map(d => {
    const rawDate = d.Date || '';
    return rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
  });
  const prices = historicalData.map(d => d.Close);

  if (stockChart) stockChart.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  const datasets = [{
    label: 'Closing Price',
    data: prices,
    borderColor: '#2563eb',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderWidth: 2.5,
    fill: true,
    tension: 0.2,
    pointRadius: 2
  }];

  annotationLevels.forEach(lvl => {
    datasets.push({
      label: lvl.label,
      data: new Array(labels.length).fill(lvl.price),
      borderColor: lvl.color,
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 0,
      fill: false
    });
  });

  stockChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } 
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: '#64748b', maxTicksLimit: 8 } },
        y: { grid: { color: gridColor }, ticks: { color: '#64748b' } }
      }
    }
  });
}

// ==========================================
// Portfolio & Watchlist Tracker Management
// ==========================================
function openPortfolioModal() {
  populatePositionTickerDropdown();
  renderWatchlistTab();
  renderPositionsTab();
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
    renderPositionsTab();
  }
}

function populatePositionTickerDropdown() {
  const selectElem = document.getElementById('pos-ticker-select');
  if (!selectElem) return;
  selectElem.innerHTML = Object.keys(COMPANY_NAME_MAP).map(sym => `
    <option value="${sym}">${sym} - ${COMPANY_NAME_MAP[sym]}</option>
  `).join('');
}

function getStoredWatchlist() {
  try {
    return JSON.parse(localStorage.getItem('user_watchlist')) || ['AAPL', 'NVDA', 'MSFT'];
  } catch (e) {
    return ['AAPL', 'NVDA', 'MSFT'];
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
    container.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); padding: 10px;">Your watchlist is empty. Click the star icon next to the stock price to save tickers here.</p>';
    return;
  }

  container.innerHTML = watchlist.map(ticker => {
    const cName = COMPANY_NAME_MAP[ticker] || ticker;
    return `
      <div class="port-item-row">
        <div>
          <strong>${ticker}</strong> <span style="font-size: 11px; color: var(--text-muted);">(${cName})</span>
        </div>
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

function getStoredPositions() {
  try {
    return JSON.parse(localStorage.getItem('user_positions')) || [
      { ticker: 'AAPL', shares: 10, buyPrice: 180.00 }
    ];
  } catch (e) {
    return [{ ticker: 'AAPL', shares: 10, buyPrice: 180.00 }];
  }
}

function addPortfolioPosition() {
  const ticker = document.getElementById('pos-ticker-select').value;
  const shares = parseFloat(document.getElementById('pos-shares-input').value);
  const buyPrice = parseFloat(document.getElementById('pos-price-input').value);

  if (!shares || !buyPrice || shares <= 0 || buyPrice <= 0) {
    alert("Please enter valid positive numbers for shares and purchase price.");
    return;
  }

  const positions = getStoredPositions();
  positions.push({ ticker, shares, buyPrice });
  localStorage.setItem('user_positions', JSON.stringify(positions));
  renderPositionsTab();
}

function renderPositionsTab() {
  const container = document.getElementById('positions-items-container');
  const positions = getStoredPositions();

  if (positions.length === 0) {
    container.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); padding: 10px;">No portfolio positions tracked yet. Add positions above from any database stock.</p>';
    document.getElementById('port-total-val').textContent = '$0.00';
    document.getElementById('port-total-pl').textContent = '$0.00';
    return;
  }

  let totalValue = 0;
  let totalCost = 0;

  container.innerHTML = positions.map((pos, idx) => {
    const currPrice = (pos.ticker === activeTicker && activeCurrentPrice > 0) ? activeCurrentPrice : pos.buyPrice * 1.05;
    const posVal = currPrice * pos.shares;
    const posCost = pos.buyPrice * pos.shares;
    const pl = posVal - posCost;
    const plPct = (pl / posCost) * 100;

    totalValue += posVal;
    totalCost += posCost;

    const plColor = pl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    return `
      <div class="port-item-row">
        <div>
          <strong>${pos.ticker}</strong> 
          <div style="font-size: 11px; color: var(--text-muted);">Quantity: <strong>${pos.shares}</strong> shares | Buy Price: <strong>$${pos.buyPrice.toFixed(2)}</strong></div>
        </div>
        <div style="text-align: right;">
          <strong style="color: ${plColor};">${pl >= 0 ? '+' : ''}$${pl.toFixed(2)} (${plPct.toFixed(2)}%)</strong>
          <div><button onclick="removePosition(${idx})" style="background:none; border:none; color: var(--text-muted); font-size: 10px; cursor: pointer; text-decoration: underline;">Remove Position</button></div>
        </div>
      </div>
    `;
  }).join('');

  const totalPL = totalValue - totalCost;
  document.getElementById('port-total-val').textContent = `$${totalValue.toFixed(2)}`;
  const totalPLElem = document.getElementById('port-total-pl');
  totalPLElem.textContent = `${totalPL >= 0 ? '+' : ''}$${totalPL.toFixed(2)}`;
  totalPLElem.style.color = totalPL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
}

function removePosition(idx) {
  let positions = getStoredPositions();
  positions.splice(idx, 1);
  localStorage.setItem('user_positions', JSON.stringify(positions));
  renderPositionsTab();
}

// ==========================================
// Supported Stocks Modal Management
// ==========================================
function openStocksModal() {
  const directoryContainer = document.getElementById('stocks-directory-list');
  directoryContainer.innerHTML = Object.entries(COMPANY_NAME_MAP).map(([symbol, name]) => `
    <div class="stock-dir-item" onclick="selectStockFromDirectory('${symbol}')">
      <span class="stock-dir-symbol">${symbol}</span>
      <span class="stock-dir-name">${name}</span>
    </div>
  `).join('');
  document.getElementById('stocks-modal').classList.remove('hidden');
}

function closeStocksModal() {
  document.getElementById('stocks-modal').classList.add('hidden');
}

function filterStockDirectory() {
  const query = document.getElementById('modal-stock-filter').value.toLowerCase();
  const directoryContainer = document.getElementById('stocks-directory-list');
  
  const filtered = Object.entries(COMPANY_NAME_MAP).filter(([symbol, name]) => 
    symbol.toLowerCase().includes(query) || name.toLowerCase().includes(query)
  );

  directoryContainer.innerHTML = filtered.map(([symbol, name]) => `
    <div class="stock-dir-item" onclick="selectStockFromDirectory('${symbol}')">
      <span class="stock-dir-symbol">${symbol}</span>
      <span class="stock-dir-name">${name}</span>
    </div>
  `).join('') || '<p style="font-size: 12px; color: var(--text-muted); padding: 10px;">No matching stocks found.</p>';
}

function selectStockFromDirectory(symbol) {
  closeStocksModal();
  fetchIntelligence(symbol);
}

// ==========================================
// Sub-Second Order Book WebSocket Connection
// ==========================================
function connectOrderBookStream(ticker) {
  if (orderBookSocket) {
    orderBookSocket.close();
  }

  orderBookSocket = new WebSocket(`ws://localhost:8000/ws/orderbook/${ticker}`);

  orderBookSocket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    document.getElementById('ob-bid').textContent = `$${data.level1.bid.toFixed(2)}`;
    document.getElementById('ob-ask').textContent = `$${data.level1.ask.toFixed(2)}`;
    document.getElementById('ob-spread').textContent = `$${data.level1.spread.toFixed(2)}`;

    const bidsContainer = document.getElementById('ob-bids-list');
    bidsContainer.innerHTML = data.level2.bids.map(b => `
      <div class="ob-row">
        <span class="text-gain">$${b.price.toFixed(2)}</span>
        <span>${b.size}</span>
      </div>
    `).join('');

    const asksContainer = document.getElementById('ob-asks-list');
    asksContainer.innerHTML = data.level2.asks.map(a => `
      <div class="ob-row">
        <span class="text-risk">$${a.price.toFixed(2)}</span>
        <span>${a.size}</span>
      </div>
    `).join('');
  };

  orderBookSocket.onerror = function(err) {
    console.error("Order book WebSocket error:", err);
  };
}

// ==========================================
// Timeframe & Chart Logic
// ==========================================
function setTimeframe(tf, btnElement) {
  activeTimeframe = tf;
  document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  const filteredData = filterDataByTimeframe(rawHistoricalData, tf);
  renderChart(activeTicker, filteredData);
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
    default: pointsToKeep = totalPoints;
  }

  return data.slice(totalPoints - pointsToKeep);
}

function renderChart(ticker, historicalData) {
  const cName = COMPANY_NAME_MAP[ticker] || ticker;
  document.getElementById('chart-title').textContent = `${cName} (${ticker}) Trajectory`;
  const ctx = document.getElementById('stockChart').getContext('2d');
  
  const labels = historicalData.map(d => {
    const rawDate = d.Date || '';
    return rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
  });
  const prices = historicalData.map(d => d.Close);

  if (stockChart) stockChart.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  stockChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Closing Price',
        data: prices,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.2,
        pointRadius: 2
      }]
    },
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
    document.getElementById('val-company-name').textContent = `${resData.company_name} Market Base`;
    
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
    
    if (rec.badge_color === 'sage') {
      verdictElem.style.color = 'var(--accent-green)';
    } else if (rec.badge_color === 'yellow') {
      verdictElem.style.color = 'var(--accent-yellow)';
    } else {
      verdictElem.style.color = 'var(--accent-red)';
    }

    document.getElementById('rec-badge').textContent = `Signal Score: ${rec.score > 0 ? '+' : ''}${rec.score}`;

    const reasonsList = document.getElementById('rec-reasons-list');
    reasonsList.innerHTML = (rec.reasons || []).map(r => `<li>• ${r}</li>`).join('');

    const peersContainer = document.getElementById('peer-chips-container');
    peersContainer.innerHTML = (resData.peers || []).map(p => {
      const pName = COMPANY_NAME_MAP[p] || p;
      return `<button onclick="selectTicker('${p}')">${pName} (${p})</button>`;
    }).join('');

    document.getElementById('val-rsi').textContent = resData.technical_indicators.rsi_14;
    document.getElementById('val-vix').textContent = resData.technical_indicators.vix;
    document.getElementById('val-macd').textContent = resData.technical_indicators.macd;
    document.getElementById('val-regime').textContent = `Regime: ${resData.market_regime.label}`;

    let modelSourceLabel = resData.predictions.lstm_active 
      ? "Scratch-Built LSTM Sequential Neural Net & Conformal XGBoost" 
      : "XGBoost Conformal Ensemble";

    document.getElementById('val-context').innerHTML = `
      ${modelSourceLabel} predicts a target of <strong>$${resData.predictions.target_price.toFixed(2)}</strong> 
      for <strong>${resData.company_name}</strong> with a 90% confidence corridor between 
      <strong>$${resData.predictions.lower_bound_price.toFixed(2)}</strong> 
      and <strong>$${resData.predictions.upper_bound_price.toFixed(2)}</strong>.
    `;

    const filteredData = filterDataByTimeframe(rawHistoricalData, activeTimeframe);
    renderChart(activeTicker, filteredData);

    // Reset pagination limit on new stock fetch and render news tab
    newsDisplayLimit = 5;
    renderMergedNewsSection();

    connectOrderBookStream(activeTicker);

    loader.classList.add('hidden');
    dashboard.classList.remove('hidden');

  } catch (err) {
    console.error("API error:", err);
    alert("Error fetching stock intelligence data. Ensure FastAPI backend is running on port 8000.");
    loader.classList.add('hidden');
  }
}

// ==========================================
// Merged News & Rumor Sub-Tab Management (Strict Separation)
// ==========================================
function switchNewsTab(filterType, btnElem) {
  activeNewsFilter = filterType;
  newsDisplayLimit = 5; // Reset limit when switching tabs

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
    // Strictly general news items
    dataset = currentArticles;
  } else if (activeNewsFilter === 'verified') {
    // Strictly verified institutional sources
    dataset = currentArticles.filter(art => {
      const src = (art.source || '').toLowerCase();
      return VERIFIED_FINANCIAL_SOURCES.some(vs => src.includes(vs));
    });
  } else if (activeNewsFilter === 'rumored') {
    // Strictly unverified rumor claims and fact-checks
    dataset = currentFactClaims.map((claim, idx) => ({
      title: `"${claim.claim}"`,
      url: '#',
      source: `Source: ${claim.publisher}`,
      published_at: 'Rumor Checked',
      isClaim: true,
      claimIndex: idx,
      rating: claim.rating
    }));
  }

  if (dataset.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 13px; padding: 10px;">No ${activeNewsFilter} articles or claims available for this stock.</p>`;
    moreContainer.classList.add('hidden');
    return;
  }

  const visibleItems = dataset.slice(0, newsDisplayLimit);

  container.innerHTML = visibleItems.map(item => {
    if (item.isClaim) {
      return `
        <div class="feed-item" style="cursor: pointer;" onclick="openFactModal(${item.claimIndex})">
          <div class="feed-title-container">
            <h4 style="font-weight: 500;">${item.title}</h4>
            <span class="fact-badge fact-badge-rumor">Inspect Claim</span>
          </div>
          <div class="feed-meta">
            <span>${item.source}</span>
            <strong style="color: var(--accent-red);">${item.rating}</strong>
          </div>
        </div>
      `;
    } else {
      const sourceName = (item.source || '').toLowerCase();
      const isVerifiedOutlet = VERIFIED_FINANCIAL_SOURCES.some(src => sourceName.includes(src));

      let badgeHtml = isVerifiedOutlet 
        ? `<span class="fact-badge fact-badge-verified" onclick="event.preventDefault(); alert('Headline verified by established financial news outlet.');">🛡️ Verified Source</span>`
        : `<span class="fact-badge" style="background: rgba(100, 116, 139, 0.15); color: var(--text-muted); border: 1px solid rgba(100, 116, 139, 0.3);">📰 News</span>`;

      return `
        <a href="${item.url}" target="_blank" class="feed-item">
          <div class="feed-title-container">
            <h4>${item.title}</h4>
            ${badgeHtml}
          </div>
          <div class="feed-meta">
            <span>${item.source}</span>
            <span>${item.published_at}</span>
          </div>
        </a>
      `;
    }
  }).join('');

  if (dataset.length > newsDisplayLimit) {
    moreContainer.classList.remove('hidden');
  } else {
    moreContainer.classList.add('hidden');
  }
}

function openFactModal(claimIdx) {
  const claim = currentFactClaims[claimIdx];
  if (!claim) return;

  document.getElementById('fact-modal-claim').textContent = `"${claim.claim}"`;
  document.getElementById('fact-modal-publisher').textContent = claim.publisher || 'Independent Fact Check Network';
  document.getElementById('fact-modal-rating').textContent = claim.rating || 'Unverified Claim';
  document.getElementById('fact-modal-desc').textContent = claim.description || 
    `This financial news statement was evaluated by Google Fact Check Tools API. Rating: ${claim.rating}.`;

  document.getElementById('fact-modal').classList.remove('hidden');
}

function closeFactModal() {
  document.getElementById('fact-modal').classList.add('hidden');
}

// Guided Tour Steps
const tourSteps = [
  { id: "tour-step-1", title: "1. Current Market Price", desc: "Displays live execution price and allows one-click star saving to your custom watchlist." },
  { id: "tour-step-2", title: "2. Predicted Target Return", desc: "Outputs target return percentage predicted by the hybrid LSTM + XGBoost architecture." },
  { id: "tour-step-3", title: "3. 90% Safety Floor", desc: "Calculates downside risk floor using Quantile Conformal XGBoost." },
  { id: "tour-step-4", title: "4. 90% Upside Ceiling", desc: "Calculates upside potential ceiling using Quantile Conformal XGBoost." },
  { id: "stocks-btn", title: "5. Supported Stocks Directory Tab", desc: "Click here anytime to open the modal directory listing all indexed database equities." },
  { id: "portfolio-btn", title: "6. Portfolio & Watchlist Tracker", desc: "Manage your saved custom watchlists and simulate portfolio gain/loss history over time." },
  { id: "tour-step-6", title: "7. AI Recommendation Engine", desc: "Evaluates RSI momentum, HMM regimes, and risk corridors to give a Signal Score verdict." },
  { id: "tour-step-7", title: "8. Technical Trajectory & Controls", desc: "Visualizes moving price history with Fibonacci and Support/Resistance overlay tools." },
  { id: "tour-step-8", title: "9. Calculated Technical Indicators", desc: "Features 14-day RSI, MACD histogram, and VIX volatility indicators." },
  { id: "tour-step-9", title: "10. Real-Time Financial News", desc: "Aggregates filtered news feeds, verified outlets, and rumor inspections with pagination." },
  { id: "tour-step-11", title: "11. Sub-Second Order Book Stream", desc: "Streams real-time Level 1 & Level 2 order book buy/sell depth quotes." }
];

let currentTourIdx = 0;

function startTour() {
  currentTourIdx = 0;
  document.getElementById('tour-modal').classList.remove('hidden');
  updateTourStep();
}

function closeTour() {
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
  document.getElementById('tour-next-btn').textContent = currentTourIdx === tourSteps.length - 1 ? "Finish Tour" : "Next";
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
    const elem = document.getElementById(s.id);
    if (elem) elem.classList.remove('tour-highlight');
  });
}

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
});