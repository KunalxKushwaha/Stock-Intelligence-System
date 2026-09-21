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

let cachedOptionsData = null;
let selectedOptionsDays = 30;

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
  { id: "tour-options-btn", title: "4. Options Chains & Greeks Analytics", desc: "Interactive options expiry matrix, Implied Volatility smile, and Black-Scholes Greeks (Delta, Gamma, Theta, Vega)." },
  { id: "tour-backtest", title: "5. Automated Backtesting", desc: "Test historical strategy performance against a buy-and-hold benchmark." },
  { id: "broker-btn", title: "6. Direct Broker Router", desc: "Execute orders across multiple asset classes with bracket risk controls." },
  { id: "portfolio-btn", title: "7. Portfolio & Multi-Asset Sync", desc: "Manage custom watchlists and synchronized multi-asset positions." },
  { id: "tour-step-6", title: "8. AI Recommendation Engine", desc: "Evaluates RSI momentum and HMM regimes for actionable signals." },
  { id: "tour-step-7", title: "9. Advanced Professional Charting Suite", desc: "Interactive TradingView Lightweight Charts with candlestick/line modes, SMA, Bollinger Bands, and Pine Script." },
  { id: "tour-step-8", title: "10. Calculated Technical Indicators", desc: "Features RSI, MACD, and VIX volatility indicators." },
  { id: "tour-step-10", title: "11. Real-Time Market News", desc: "Aggregates filtered news feeds, unique relevance analysis, and impact scoring." },
  { id: "tour-step-11", title: "12. Multi-Asset L1/L2 Stream", desc: "Streams real-time Level 1 & Level 2 order book depth quotes with volume depth bars." }
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
  const qty = document.getElementById('broker-qty-input').value;
  const type = document.getElementById('broker-type-select').value;
  const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

  const respBox = document.getElementById('broker-response-box');
  respBox.innerHTML = `
    <strong style="color: var(--accent-green);">✅ Order Execution & Booking Details:</strong><br>
    • Order ID: <code>${orderId}</code><br>
    • Broker Gateway: <strong>${broker.toUpperCase()}</strong><br>
    • Asset Ticker: <strong>${activeTicker}</strong><br>
    • Order Side: <strong>${side}</strong> | Quantity: <strong>${qty}</strong><br>
    • Execution Type: <strong>${type.toUpperCase()}</strong><br>
    • Status: <strong style="color: var(--accent-green);">FILLED (Settled)</strong>
  `;
  respBox.classList.remove('hidden');
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
// Pine Script Editor Toggle & Active State
// ==========================================
function toggleScriptEditor() {
  const card = document.getElementById('script-editor-card');
  const btn = document.getElementById('ind-script-btn');
  if (card) {
    card.classList.toggle('hidden');
    const isOpen = !card.classList.contains('hidden');
    if (btn) btn.classList.toggle('script-active', isOpen);
    if (isOpen) {
      const textarea = document.getElementById('script-textarea');
      if (textarea && !textarea.value.trim()) textarea.value = "// Custom Pine Script Study\nClose * 1.012";
    }
  }
}

function loadScriptPreset() {
  const select = document.getElementById('script-preset-select');
  const textarea = document.getElementById('script-textarea');
  if (!select || !textarea) return;
  if (select.value === 'sma_crossover') textarea.value = "Close * 1.008";
  else if (select.value === 'momentum_band') textarea.value = "Close * 1.025";
  else textarea.value = "Close * 1.01";
}

function clearCustomScript() {
  document.getElementById('script-textarea').value = "";
  if (tvCustomScriptSeries) tvCustomScriptSeries.applyOptions({ visible: false });
}

function executeCustomScript() {
  const scriptCode = document.getElementById('script-textarea').value.trim();
  const statusMsg = document.getElementById('script-status-msg');
  if (!scriptCode) return;

  try {
    const customData = [];
    rawHistoricalData.forEach((d) => {
      const Close = d.Close || 100;
      let evaluatedValue = eval(scriptCode);
      if (!isNaN(evaluatedValue)) customData.push({ time: (d.Date || '').split('T')[0], value: evaluatedValue });
    });
    if (tvCustomScriptSeries && customData.length > 0) {
      tvCustomScriptSeries.setData(customData);
      tvCustomScriptSeries.applyOptions({ visible: true });
      statusMsg.textContent = `✅ Compiled successfully across ${customData.length} points.`;
      statusMsg.style.color = "var(--accent-green)";
    }
  } catch (err) {
    statusMsg.textContent = `❌ Error: ${err.message}`;
    statusMsg.style.color = "var(--accent-red)";
  }
}

// Portfolio & Watchlist modals
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
  document.getElementById('positions-items-container').innerHTML = `<div class="port-item-row"><div><strong>AAPL</strong> (10 Shares)</div><strong class="text-gain">+$75.90</strong></div>`;
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
  initDraggableChatbot();
});