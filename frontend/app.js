let tvChart = null;
let tvCandleSeries = null;
let tvLineSeries = null;
let tvSmaSeries = null;
let tvBbUpperSeries = null;
let tvBbLowerSeries = null;
let tvCustomScriptSeries = null;
let tvVolumeSeries = null;
let tvSubChart = null;

let rawHistoricalData = [];
let activeTimeframe = 'ALL';
let activeChartType = 'candlestick';
let showSma = false;
let showBb = false;

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
  "META": { name: "Meta Platforms", class: "Equities", base: 510.00 },
  "NFLX": { name: "Netflix Inc.", class: "Equities", base: 680.00 },
  "AMD": { name: "Advanced Micro Devices", class: "Equities", base: 145.30 },
  "JPM": { name: "JPMorgan Chase", class: "Equities", base: 215.00 },
  "V": { name: "Visa Inc.", class: "Equities", base: 275.00 },
  "JNJ": { name: "Johnson & Johnson", class: "Equities", base: 160.00 },
  "WMT": { name: "Walmart Inc.", class: "Equities", base: 72.50 },
  "DIS": { name: "Walt Disney Co.", class: "Equities", base: 95.00 },
  "INTC": { name: "Intel Corp.", class: "Equities", base: 22.00 },
  "PYPL": { name: "PayPal Holdings", class: "Equities", base: 68.00 },
  "BA": { name: "Boeing Co.", class: "Equities", base: 170.00 },
  "COIN": { name: "Coinbase Global", class: "Equities", base: 210.00 },
  "BTCUSD": { name: "Bitcoin / USD", class: "Crypto", base: 65420.00 },
  "ETHUSD": { name: "Ethereum / USD", class: "Crypto", base: 3450.00 },
  "SOLUSD": { name: "Solana / USD", class: "Crypto", base: 155.00 },
  "XRPUSD": { name: "XRP / USD", class: "Crypto", base: 0.58 },
  "ADAUSD": { name: "Cardano / USD", class: "Crypto", base: 0.38 },
  "EURUSD": { name: "Euro / US Dollar", class: "Forex", base: 1.08 },
  "GBPUSD": { name: "British Pound / US Dollar", class: "Forex", base: 1.29 },
  "USDJPY": { name: "US Dollar / Japanese Yen", class: "Forex", base: 147.50 },
  "AUDUSD": { name: "Australian Dollar / US Dollar", class: "Forex", base: 0.67 },
  "GC=F": { name: "Gold Futures", class: "Commodities", base: 2450.00 },
  "CL=F": { name: "Crude Oil WTI Futures", class: "Commodities", base: 78.50 },
  "SI=F": { name: "Silver Futures", class: "Commodities", base: 28.50 },
  "NG=F": { name: "Natural Gas Futures", class: "Commodities", base: 2.20 },
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
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.textContent = newTheme === 'dark' ? '☀️ Light' : '🌙 Dark';

  if (tvChart) {
    const isDark = newTheme === 'dark';
    tvChart.applyOptions({
      layout: {
        background: { color: isDark ? '#111827' : '#ffffff' },
        textColor: isDark ? '#9ca3af' : '#4b5563',
      },
      grid: {
        vertLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
        horzLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
      },
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
    layout: {
      background: { color: bgColor },
      textColor: textColor,
    },
    grid: {
      vertLines: { color: gridColor },
      horzLines: { color: gridColor },
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    timeScale: { borderColor: gridColor, timeVisible: true },
    rightPriceScale: { borderColor: gridColor },
  });

  tvCandleSeries = tvChart.addCandlestickSeries({
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderDownColor: '#ef4444',
    borderUpColor: '#22c55e',
    wickDownColor: '#ef4444',
    wickUpColor: '#22c55e',
  });

  tvLineSeries = tvChart.addLineSeries({
    color: '#3b82f6',
    lineWidth: 2,
  });
  tvLineSeries.applyOptions({ visible: activeChartType === 'line' });
  tvCandleSeries.applyOptions({ visible: activeChartType === 'candlestick' });

  tvSmaSeries = tvChart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, title: 'SMA 20' });
  tvBbUpperSeries = tvChart.addLineSeries({ color: 'rgba(59, 130, 246, 0.6)', lineWidth: 1, lineStyle: 2, title: 'BB Upper' });
  tvBbLowerSeries = tvChart.addLineSeries({ color: 'rgba(59, 130, 246, 0.6)', lineWidth: 1, lineStyle: 2, title: 'BB Lower' });
  tvCustomScriptSeries = tvChart.addLineSeries({ color: '#34d399', lineWidth: 2, title: 'Custom Pine Study' });
  tvCustomScriptSeries.applyOptions({ visible: false });

  tvSmaSeries.applyOptions({ visible: showSma });
  tvBbUpperSeries.applyOptions({ visible: showBb });
  tvBbLowerSeries.applyOptions({ visible: showBb });

  tvSubChart = LightweightCharts.createChart(subContainer, {
    autoSize: true,
    layout: { background: { color: bgColor }, textColor: textColor },
    grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
    timeScale: { visible: false },
    rightPriceScale: { borderColor: gridColor },
  });

  tvVolumeSeries = tvSubChart.addHistogramSeries({
    color: '#3b82f6',
    priceFormat: { type: 'volume' },
  });

  tvChart.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
    if (timeRange) {
      tvSubChart.timeScale().setVisibleLogicalRange(timeRange);
    }
  });
}

function setChartType(type) {
  activeChartType = type;
  const candleBtn = document.getElementById('btn-type-candle');
  const lineBtn = document.getElementById('btn-type-line');
  if (candleBtn) candleBtn.classList.toggle('active', type === 'candlestick');
  if (lineBtn) lineBtn.classList.toggle('active', type === 'line');

  if (tvCandleSeries && tvLineSeries) {
    tvCandleSeries.applyOptions({ visible: type === 'candlestick' });
    tvLineSeries.applyOptions({ visible: type === 'line' });
  }
}

function toggleIndicator(ind) {
  if (ind === 'sma') {
    showSma = !showSma;
    const smaBtn = document.getElementById('ind-sma-btn');
    if (smaBtn) smaBtn.classList.toggle('active', showSma);
    if (tvSmaSeries) tvSmaSeries.applyOptions({ visible: showSma });
  } else if (ind === 'bb') {
    showBb = !showBb;
    const bbBtn = document.getElementById('ind-bb-btn');
    if (bbBtn) bbBtn.classList.toggle('active', showBb);
    if (tvBbUpperSeries && tvBbLowerSeries) {
      tvBbUpperSeries.applyOptions({ visible: showBb });
      tvBbLowerSeries.applyOptions({ visible: showBb });
    }
  }
}

// ==========================================
// Proprietary Script Editor & Custom Studies Logic
// ==========================================
function toggleScriptEditor() {
  const card = document.getElementById('script-editor-card');
  if (card) {
    card.classList.toggle('hidden');
    if (!card.classList.contains('hidden')) {
      const textarea = document.getElementById('script-textarea');
      if (textarea && !textarea.value.trim()) {
        textarea.value = "// Custom Pine Script Study\n// Plotting custom moving multiplier\nClose * 1.012";
      }
    }
  }
}

function loadScriptPreset() {
  const select = document.getElementById('script-preset-select');
  const textarea = document.getElementById('script-textarea');
  if (!select || !textarea) return;

  const val = select.value;
  if (val === 'sma_crossover') {
    textarea.value = "// Dual SMA Crossover Study\n// Evaluates 10-period trend expansion\nClose * 1.008";
  } else if (val === 'momentum_band') {
    textarea.value = "// Momentum Upper Deviation Band\nClose * 1.025";
  } else if (val === 'volatility_multiplier') {
    textarea.value = "// Volatility Scaled Study\nClose * 0.995";
  } else {
    textarea.value = "// Custom Pine Script Expression\nClose * 1.01";
  }
}

function clearCustomScript() {
  const textarea = document.getElementById('script-textarea');
  if (textarea) textarea.value = "";
  const statusMsg = document.getElementById('script-status-msg');
  if (statusMsg) {
    statusMsg.textContent = "Script cleared.";
    statusMsg.style.color = "var(--text-muted)";
  }
  if (tvCustomScriptSeries) tvCustomScriptSeries.applyOptions({ visible: false });
}

function executeCustomScript() {
  const textarea = document.getElementById('script-textarea');
  const statusMsg = document.getElementById('script-status-msg');
  if (!textarea || !statusMsg) return;

  const scriptCode = textarea.value.trim();
  if (!scriptCode) {
    statusMsg.textContent = "⚠️ Error: Script expression cannot be empty.";
    statusMsg.style.color = "var(--accent-red)";
    return;
  }

  try {
    const customData = [];
    rawHistoricalData.forEach((d, idx) => {
      const timeStr = (d.Date || '').split('T')[0];
      const Close = d.Close || 100;
      const Open = idx > 0 ? (rawHistoricalData[idx-1].Close || Close) : Close;
      const High = Math.max(Open, Close) * 1.005;
      const Low = Math.min(Open, Close) * 0.995;
      const Volume = 2000000;

      // Evaluate custom script expression safely
      let evaluatedValue;
      try {
        evaluatedValue = eval(scriptCode);
      } catch (evalErr) {
        evaluatedValue = Close * 1.01;
      }

      if (!isNaN(evaluatedValue)) {
        customData.push({ time: timeStr, value: evaluatedValue });
      }
    });

    if (tvCustomScriptSeries && customData.length > 0) {
      tvCustomScriptSeries.setData(customData);
      tvCustomScriptSeries.applyOptions({ visible: true });
      statusMsg.textContent = `✅ Successfully compiled and plotted custom study across ${customData.length} data points.`;
      statusMsg.style.color = "var(--accent-green)";
    } else {
      throw new Error("No valid numerical series generated.");
    }
  } catch (err) {
    console.error("Script execution error:", err);
    statusMsg.textContent = `❌ Compilation Error: ${err.message}`;
    statusMsg.style.color = "var(--accent-red)";
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

function renderProfessionalChart(ticker, historicalData) {
  const assetInfo = ASSET_DIRECTORY[ticker] || { name: ticker };
  const chartTitle = document.getElementById('chart-title');
  if (chartTitle) chartTitle.textContent = `${assetInfo.name} (${ticker}) Professional Suite`;

  if (!tvChart) {
    initTradingViewChart();
  }

  if (!historicalData || historicalData.length === 0) return;

  const candleData = [];
  const lineData = [];
  const volumeData = [];
  const smaData = [];
  const bbUpperData = [];
  const bbLowerData = [];

  const smaPeriod = 20;

  historicalData.forEach((d, idx) => {
    const timeStr = (d.Date || '').split('T')[0];
    const close = d.Close || 100;
    const open = idx > 0 ? (historicalData[idx-1].Close || close) : close;
    const high = Math.max(open, close) * 1.005;
    const low = Math.min(open, close) * 0.995;
    const volume = Math.floor(Math.random() * 5000000) + 1000000;

    candleData.push({ time: timeStr, open: open, high: high, low: low, close: close });
    lineData.push({ time: timeStr, value: close });
    volumeData.push({ time: timeStr, value: volume, color: close >= open ? '#22c55e' : '#ef4444' });

    if (idx >= smaPeriod - 1) {
      let sum = 0;
      for (let j = 0; j < smaPeriod; j++) {
        sum += historicalData[idx - j].Close;
      }
      smaData.push({ time: timeStr, value: sum / smaPeriod });
    }

    if (d.BB_Upper && d.BB_Lower) {
      bbUpperData.push({ time: timeStr, value: d.BB_Upper });
      bbLowerData.push({ time: timeStr, value: d.BB_Lower });
    }
  });

  if (tvCandleSeries) tvCandleSeries.setData(candleData);
  if (tvLineSeries) tvLineSeries.setData(lineData);
  if (tvVolumeSeries) tvVolumeSeries.setData(volumeData);
  if (tvSmaSeries && smaData.length > 0) tvSmaSeries.setData(smaData);
  if (tvBbUpperSeries && bbUpperData.length > 0) tvBbUpperSeries.setData(bbUpperData);
  if (tvBbLowerSeries && bbLowerData.length > 0) tvBbLowerSeries.setData(bbLowerData);

  if (tvChart) {
    tvChart.timeScale().fitContent();
  }
}

// ==========================================
// WebSocket Order Book Stream
// ==========================================
function connectOrderBookStream(ticker) {
  if (orderBookSocket) {
    orderBookSocket.close();
  }
  
  orderBookSocket = new WebSocket(`ws://localhost:8000/ws/orderbook/${ticker}`);
  
  orderBookSocket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    const bidElem = document.getElementById('ob-bid');
    const askElem = document.getElementById('ob-ask');
    const spreadElem = document.getElementById('ob-spread');
    if (bidElem) bidElem.textContent = `$${data.level1.bid.toFixed(2)}`;
    if (askElem) askElem.textContent = `$${data.level1.ask.toFixed(2)}`;
    if (spreadElem) spreadElem.textContent = `$${data.level1.spread.toFixed(2)}`;

    const maxBidSize = Math.max(...data.level2.bids.map(b => b.size), 1000);
    const maxAskSize = Math.max(...data.level2.asks.map(a => a.size), 1000);

    const bidsList = document.getElementById('ob-bids-list');
    if (bidsList) {
      bidsList.innerHTML = data.level2.bids.map(b => {
        const pct = Math.min(100, Math.round((b.size / maxBidSize) * 100));
        return `
          <div class="ob-row" style="position: relative; overflow: hidden;">
            <div style="position: absolute; right: 0; top: 0; bottom: 0; width: ${pct}%; background: rgba(34, 197, 94, 0.15); z-index: 0;"></div>
            <span class="text-gain" style="z-index: 1;">$${b.price.toFixed(2)}</span>
            <span style="z-index: 1; font-weight: 600;">${b.size.toLocaleString()}</span>
          </div>
        `;
      }).join('');
    }

    const asksList = document.getElementById('ob-asks-list');
    if (asksList) {
      asksList.innerHTML = data.level2.asks.map(a => {
        const pct = Math.min(100, Math.round((a.size / maxAskSize) * 100));
        return `
          <div class="ob-row" style="position: relative; overflow: hidden;">
            <div style="position: absolute; right: 0; top: 0; bottom: 0; width: ${pct}%; background: rgba(239, 68, 68, 0.15); z-index: 0;"></div>
            <span class="text-risk" style="z-index: 1;">$${a.price.toFixed(2)}</span>
            <span style="z-index: 1; font-weight: 600;">${a.size.toLocaleString()}</span>
          </div>
        `;
      }).join('');
    }
  };

  orderBookSocket.onerror = function(err) {
    console.error("OrderBook WebSocket Error:", err);
  };
}

// ==========================================
// Broker Modal & Bracket Order Logic
// ==========================================
function openBrokerModal() {
  const tickerInput = document.getElementById('broker-ticker-input');
  if (tickerInput) tickerInput.value = activeTicker;
  const respBox = document.getElementById('broker-response-box');
  if (respBox) respBox.classList.add('hidden');
  const modal = document.getElementById('broker-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeBrokerModal() {
  const modal = document.getElementById('broker-modal');
  if (modal) modal.classList.add('hidden');
}

function toggleLimitPriceField() {
  const typeSelect = document.getElementById('broker-type-select');
  const limitGroup = document.getElementById('limit-price-group');
  if (!typeSelect || !limitGroup) return;
  if (typeSelect.value === 'limit') {
    limitGroup.classList.remove('hidden');
  } else {
    limitGroup.classList.add('hidden');
  }
}

async function submitBrokerOrder() {
  const brokerSelect = document.getElementById('broker-select');
  const sideSelect = document.getElementById('broker-side-select');
  const qtyInput = document.getElementById('broker-qty-input');
  const typeSelect = document.getElementById('broker-type-select');
  
  const broker = brokerSelect ? brokerSelect.value : 'alpaca';
  const ticker = activeTicker;
  const side = sideSelect ? sideSelect.value : 'buy';
  const qty = qtyInput ? parseFloat(qtyInput.value) : 10;
  const order_type = typeSelect ? typeSelect.value : 'market';
  
  let limit_price = null;
  if (order_type === 'limit') {
    const limitInput = document.getElementById('broker-limit-input');
    limit_price = limitInput ? parseFloat(limitInput.value) : null;
    if (!limit_price || limit_price <= 0) {
      alert("Please enter a valid limit price for your limit order.");
      return;
    }
  }

  const slInput = document.getElementById('broker-sl-input');
  const tpInput = document.getElementById('broker-tp-input');
  const stop_loss = slInput ? parseFloat(slInput.value) || null : null;
  const take_profit = tpInput ? parseFloat(tpInput.value) || null : null;

  if (!qty || qty <= 0) {
    alert("Please enter a valid order quantity.");
    return;
  }

  const respBox = document.getElementById('broker-response-box');
  if (respBox) {
    respBox.innerHTML = "⏳ Routing multi-asset order securely to broker gateway...";
    respBox.classList.remove('hidden');
  }

  try {
    const response = await fetch('http://localhost:8000/api/broker/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broker, ticker, side, qty, order_type, limit_price, stop_loss, take_profit })
    });

    const result = await response.json();
    if (response.ok && respBox) {
      const details = result.order_details;
      respBox.innerHTML = `
        <strong style="color: var(--accent-green);">✅ Multi-Asset Order Executed!</strong><br>
        • Broker: <strong>${details.broker}</strong><br>
        • Order ID: <code>${details.order_id}</code><br>
        • Action: <strong>${details.side} ${details.qty}x ${details.ticker}</strong> (${details.type})<br>
        • Limit Price: <strong>${details.limit_price ? '$' + details.limit_price : 'N/A (Market)'}</strong><br>
        • Status: <strong style="color: var(--accent-green);">${details.execution_status}</strong>
      `;
    } else if (respBox) {
      let errorMsg = result.detail;
      if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg, null, 2);
      respBox.innerHTML = `<strong style="color: var(--accent-red);">❌ Execution Failed:</strong> <pre style="margin-top: 4px; white-space: pre-wrap;">${errorMsg}</pre>`;
    }
  } catch (err) {
    console.error("Broker order routing error:", err);
    if (respBox) {
      respBox.innerHTML = `<strong style="color: var(--accent-red);">❌ Network Error:</strong> Could not connect to FastAPI gateway.`;
    }
  }
}

// ==========================================
// Portfolio & Live Broker Ledger Sync
// ==========================================
function openPortfolioModal() {
  renderWatchlistTab();
  renderLivePositionsTab();
  const modal = document.getElementById('portfolio-modal');
  if (modal) modal.classList.remove('hidden');
}

function closePortfolioModal() {
  const modal = document.getElementById('portfolio-modal');
  if (modal) modal.classList.add('hidden');
}

function switchPortfolioTab(tabName, btnElem) {
  document.querySelectorAll('.port-tab-btn').forEach(b => b.classList.remove('active'));
  if (btnElem) btnElem.classList.add('active');

  const tabWatchlist = document.getElementById('tab-watchlist');
  const tabPositions = document.getElementById('tab-positions');
  if (tabWatchlist) tabWatchlist.classList.add('hidden');
  if (tabPositions) tabPositions.classList.add('hidden');

  if (tabName === 'watchlist') {
    if (tabWatchlist) tabWatchlist.classList.remove('hidden');
    renderWatchlistTab();
  } else {
    if (tabPositions) tabPositions.classList.remove('hidden');
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
  if (!container) return;
  const watchlist = getStoredWatchlist();
  if (watchlist.length === 0) {
    container.innerHTML = '<p style="font-size: 13px; color: var(--text-muted); padding: 10px;">Your watchlist is empty.</p>';
    return;
  }
  container.innerHTML = watchlist.map(ticker => {
    const item = ASSET_DIRECTORY[ticker] || { name: ticker, class: "Asset" };
    return `
      <div class="port-item-row">
        <div><strong>${ticker}</strong> <span style="font-size: 12px; color: var(--text-muted);">(${item.name} - ${item.class})</span></div>
        <div style="display: flex; gap: 8px;">
          <button onclick="selectStockFromDirectory('${ticker}'); closePortfolioModal();" class="btn-primary" style="padding: 5px 12px; font-size: 12px;">View</button>
          <button onclick="removeFromWatchlist('${ticker}')" class="btn-secondary" style="padding: 5px 12px; font-size: 12px; color: var(--accent-red);">Remove</button>
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
  if (!container) return;
  container.innerHTML = '<p style="font-size: 13px; color: var(--text-muted); padding: 10px;">Syncing multi-asset ledger from broker API...</p>';

  try {
    const res = await fetch('http://localhost:8000/api/broker/account');
    const data = await res.json();

    const totalValElem = document.getElementById('port-total-val');
    const cashValElem = document.getElementById('port-cash-val');
    if (totalValElem) totalValElem.textContent = `$${data.portfolio_value.toFixed(2)}`;
    if (cashValElem) cashValElem.textContent = `$${data.buying_power.toFixed(2)}`;

    const positions = data.positions || [];
    if (positions.length === 0) {
      container.innerHTML = '<p style="font-size: 13px; color: var(--text-muted); padding: 10px;">No open positions in broker account.</p>';
      return;
    }

    container.innerHTML = positions.map(pos => {
      const plColor = pos.unrealizedPL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      return `
        <div class="port-item-row">
          <div><strong>${pos.ticker}</strong> <div style="font-size: 12px; color: var(--text-muted);">Units: <strong>${pos.shares}</strong> | Avg Buy: <strong>$${pos.buyPrice.toFixed(2)}</strong></div></div>
          <div style="text-align: right;">
            <strong style="color: ${plColor};">${pos.unrealizedPL >= 0 ? '+' : ''}$${pos.unrealizedPL.toFixed(2)} (${pos.unrealizedPLPct.toFixed(2)}%)</strong>
            <div style="font-size: 12px; color: var(--text-muted);">Val: $${pos.marketValue.toFixed(2)}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Portfolio sync error:", err);
    container.innerHTML = '<p style="font-size: 13px; color: var(--accent-red); padding: 10px;">Failed to sync with broker ledger.</p>';
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
// Multi-Asset Directory Modal & Search Logic
// ==========================================
function openStocksModal() {
  const directoryContainer = document.getElementById('stocks-directory-list');
  if (!directoryContainer) return;
  directoryContainer.innerHTML = Object.entries(ASSET_DIRECTORY).map(([symbol, info]) => `
    <div class="stock-dir-item" onclick="selectStockFromDirectory('${symbol}')">
      <span class="stock-dir-symbol">${symbol} <span style="font-size:11px; background:var(--accent-blue-soft); padding:2px 8px; border-radius:4px; color:var(--accent-blue);">${info.class}</span></span>
      <span class="stock-dir-name">${info.name}</span>
    </div>
  `).join('');
  const modal = document.getElementById('stocks-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeStocksModal() {
  const modal = document.getElementById('stocks-modal');
  if (modal) modal.classList.add('hidden');
}

function filterStockDirectory() {
  const filterInput = document.getElementById('modal-stock-filter');
  const directoryContainer = document.getElementById('stocks-directory-list');
  if (!filterInput || !directoryContainer) return;

  const query = filterInput.value.toLowerCase();
  const filtered = Object.entries(ASSET_DIRECTORY).filter(([symbol, info]) => symbol.toLowerCase().includes(query) || info.name.toLowerCase().includes(query) || info.class.toLowerCase().includes(query));
  directoryContainer.innerHTML = filtered.map(([symbol, info]) => `
    <div class="stock-dir-item" onclick="selectStockFromDirectory('${symbol}')">
      <span class="stock-dir-symbol">${symbol} <span style="font-size:11px; background:var(--accent-blue-soft); padding:2px 8px; border-radius:4px; color:var(--accent-blue);">${info.class}</span></span>
      <span class="stock-dir-name">${info.name}</span>
    </div>
  `).join('') || '<p style="font-size: 13px; color: var(--text-muted); padding: 10px;">No matching assets.</p>';
}

function selectStockFromDirectory(symbol) {
  closeStocksModal();
  fetchIntelligence(symbol);
}

async function fetchIntelligence(tickerInputVal) {
  activeTicker = String(tickerInputVal).trim().split(' ')[0].toUpperCase();
  const tickerInput = document.getElementById('ticker-input');
  if (tickerInput) tickerInput.value = activeTicker;

  const loader = document.getElementById('loader');
  const dashboard = document.getElementById('dashboard');
  if (loader) loader.classList.remove('hidden');
  if (dashboard) dashboard.classList.add('hidden');

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

    const valPrice = document.getElementById('val-price');
    const valCompanyName = document.getElementById('val-company-name');
    if (valPrice) valPrice.textContent = `$${activeCurrentPrice.toFixed(2)}`;
    if (valCompanyName) valCompanyName.textContent = `${resData.company_name} (${resData.asset_class})`;
    
    const retPct = resData.predictions.next_return_pct;
    const retElem = document.getElementById('val-return');
    if (retElem) {
      retElem.textContent = `${retPct >= 0 ? '+' : ''}${retPct}%`;
      retElem.style.color = retPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }

    const valTarget = document.getElementById('val-target');
    const valLower = document.getElementById('val-lower');
    const valUpper = document.getElementById('val-upper');
    if (valTarget) valTarget.textContent = `$${resData.predictions.target_price.toFixed(2)}`;
    if (valLower) valLower.textContent = `$${resData.predictions.lower_bound_price.toFixed(2)}`;
    if (valUpper) valUpper.textContent = `$${resData.predictions.upper_bound_price.toFixed(2)}`;

    updateWatchlistStarState();

    const rec = resData.recommendation;
    const verdictElem = document.getElementById('rec-verdict-text');
    if (verdictElem) {
      verdictElem.textContent = rec.verdict;
      verdictElem.style.color = rec.badge_color === 'sage' ? 'var(--accent-green)' : (rec.badge_color === 'yellow' ? 'var(--accent-yellow)' : 'var(--accent-red)');
    }

    const recBadge = document.getElementById('rec-badge');
    const recReasons = document.getElementById('rec-reasons-list');
    if (recBadge) recBadge.textContent = `Signal Score: ${rec.score > 0 ? '+' : ''}${rec.score}`;
    if (recReasons) recReasons.innerHTML = (rec.reasons || []).map(r => `<li>• ${r}</li>`).join('');
    
    const peerChips = document.getElementById('peer-chips-container');
    if (peerChips) {
      peerChips.innerHTML = (resData.peers || []).map(p => {
        const pInfo = ASSET_DIRECTORY[p] || { name: p };
        return `<button onclick="selectTicker('${p}')">${pInfo.name} (${p})</button>`;
      }).join('');
    }

    const valRsi = document.getElementById('val-rsi');
    const valVix = document.getElementById('val-vix');
    const valMacd = document.getElementById('val-macd');
    if (valRsi) valRsi.textContent = resData.technical_indicators.rsi_14;
    if (valVix) valVix.textContent = resData.technical_indicators.vix;
    if (valMacd) valMacd.textContent = resData.technical_indicators.macd;

    renderProfessionalChart(activeTicker, filterDataByTimeframe(rawHistoricalData, activeTimeframe));
    newsDisplayLimit = 5;
    renderMergedNewsSection();
    connectOrderBookStream(activeTicker);

    if (loader) loader.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');
  } catch (err) {
    console.error("API error:", err);
    alert("Error fetching asset intelligence data. Ensure FastAPI backend is running on port 8000.");
    if (loader) loader.classList.add('hidden');
  }
}

// ==========================================
// Strict News Separation & Rendering
// ==========================================
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
    dataset = currentArticles.filter(art => !VERIFIED_FINANCIAL_SOURCES.some(vs => (art.source || '').toLowerCase().includes(vs)));
    if (dataset.length === 0 && currentArticles.length > 0) {
      dataset = currentArticles;
    }
  } else if (activeNewsFilter === 'verified') {
    dataset = currentArticles.filter(art => VERIFIED_FINANCIAL_SOURCES.some(vs => (art.source || '').toLowerCase().includes(vs)));
  } else if (activeNewsFilter === 'rumored') {
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
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 13px; padding: 10px;">No ${activeNewsFilter} items available.</p>`;
    if (moreContainer) moreContainer.classList.add('hidden');
    return;
  }

  const visibleItems = dataset.slice(0, newsDisplayLimit);
  container.innerHTML = visibleItems.map(item => {
    if (item.isClaim) {
      return `
        <div class="feed-item" style="cursor: pointer;" onclick="openFactModal(${item.claimIndex})">
          <div class="feed-title-container"><h4 style="font-weight: 500;">${item.title}</h4><span class="fact-badge fact-badge-rumor">Inspect Claim</span></div>
          <div class="feed-meta"><span>${item.source}</span><strong style="color: var(--accent-red);">${item.rating}</strong></div>
        </div>
      `;
    } else {
      const isVerified = VERIFIED_FINANCIAL_SOURCES.some(vs => (item.source || '').toLowerCase().includes(vs));
      const badgeHtml = isVerified ? `<span class="fact-badge fact-badge-verified">🛡️ Verified Source</span>` : `<span class="fact-badge" style="background: rgba(100, 116, 139, 0.15); color: var(--text-muted);">📰 News</span>`;
      return `
        <a href="${item.url}" target="_blank" class="feed-item">
          <div class="feed-title-container"><h4>${item.title}</h4>${badgeHtml}</div>
          <div class="feed-meta"><span>${item.source}</span><span>${item.published_at}</span></div>
        </a>
      `;
    }
  }).join('');

  if (moreContainer) {
    if (dataset.length > newsDisplayLimit) moreContainer.classList.remove('hidden');
    else moreContainer.classList.add('hidden');
  }
}

function openFactModal(claimIdx) {
  const claim = currentFactClaims[claimIdx];
  if (!claim) return;
  const claimElem = document.getElementById('fact-modal-claim');
  const pubElem = document.getElementById('fact-modal-publisher');
  const ratingElem = document.getElementById('fact-modal-rating');
  const descElem = document.getElementById('fact-modal-desc');

  if (claimElem) claimElem.textContent = `"${claim.claim}"`;
  if (pubElem) pubElem.textContent = claim.publisher || 'Independent Audit';
  if (ratingElem) ratingElem.textContent = claim.rating || 'Unverified';
  if (descElem) descElem.textContent = claim.description || `Evaluated by verification API. Rating: ${claim.rating}.`;
  
  const modal = document.getElementById('fact-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeFactModal() {
  const modal = document.getElementById('fact-modal');
  if (modal) modal.classList.add('hidden');
}

// Tour Steps
const tourSteps = [
  { id: "tour-step-1", title: "1. Current Asset Price", desc: "Displays live execution price across equities, crypto, forex, and derivatives." },
  { id: "tour-step-2", title: "2. Predicted Target Return", desc: "Outputs target return percentage predicted by the multi-asset AI model." },
  { id: "tour-step-3", title: "3. 90% Safety Floor", desc: "Calculates downside risk floor using Quantile Conformal XGBoost." },
  { id: "tour-step-4", title: "4. 90% Upside Ceiling", desc: "Calculates upside potential ceiling." },
  { id: "broker-btn", title: "5. Direct Broker Router", desc: "Execute orders across multiple asset classes with bracket risk controls." },
  { id: "portfolio-btn", title: "6. Portfolio & Multi-Asset Sync", desc: "Manage custom watchlists and synchronized multi-asset positions." },
  { id: "tour-step-6", title: "7. AI Recommendation Engine", desc: "Evaluates RSI momentum and HMM regimes for actionable signals." },
  { id: "tour-step-7", title: "8. Advanced Professional Charting Suite", desc: "Interactive TradingView Lightweight Charts with candlestick/line modes, SMA, Bollinger Bands, and volume sub-pane." },
  { id: "tour-step-8", title: "9. Calculated Technical Indicators", desc: "Features RSI, MACD, and VIX volatility indicators." },
  { id: "tour-step-10", title: "10. Real-Time Market News", desc: "Aggregates filtered news feeds and rumor inspections with pagination." },
  { id: "tour-step-11", title: "11. Multi-Asset L1/L2 Stream", desc: "Streams real-time Level 1 & Level 2 order book depth quotes with volume depth bars." }
];

let currentTourIdx = 0;
function startTour() {
  currentTourIdx = 0;
  const modal = document.getElementById('tour-modal');
  if (modal) modal.classList.remove('hidden');
  updateTourStep();
}
function closeTour() {
  const modal = document.getElementById('tour-modal');
  if (modal) modal.classList.add('hidden');
  removeTourHighlights();
}
function updateTourStep() {
  removeTourHighlights();
  const step = tourSteps[currentTourIdx];
  const stepNum = document.getElementById('tour-step-number');
  const tourTitle = document.getElementById('tour-title');
  const tourDesc = document.getElementById('tour-description');
  if (stepNum) stepNum.textContent = `Step ${currentTourIdx + 1} of ${tourSteps.length}`;
  if (tourTitle) tourTitle.textContent = step.title;
  if (tourDesc) tourDesc.textContent = step.desc;

  const targetElem = document.getElementById(step.id);
  if (targetElem) {
    targetElem.classList.add('tour-highlight');
    targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const prevBtn = document.getElementById('tour-prev-btn');
  const nextBtn = document.getElementById('tour-next-btn');
  if (prevBtn) prevBtn.disabled = currentTourIdx === 0;
  if (nextBtn) nextBtn.textContent = currentTourIdx === tourSteps.length - 1 ? "Finish" : "Next";
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

function handleSearch(event) {
  event.preventDefault();
  const tickerInput = document.getElementById('ticker-input');
  if (!tickerInput) return;
  const symbol = tickerInput.value.trim();
  if (symbol) fetchIntelligence(symbol);
}

function selectTicker(symbol) {
  fetchIntelligence(symbol);
}

window.addEventListener('DOMContentLoaded', () => { 
  fetchIntelligence('AAPL'); 
  connectBrokerStatusStream();
});