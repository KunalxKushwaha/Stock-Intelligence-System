let stockChart = null;

// ==========================================
// 1. Theme Toggle Logic (Dark / Light)
// ==========================================
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  
  const themeBtn = document.getElementById('theme-btn');
  themeBtn.textContent = newTheme === 'dark' ? '🌙 Dark' : '☀️ Light';

  // Re-render chart grid lines with matching theme colors
  if (stockChart) {
    const gridColor = newTheme === 'dark' ? '#1e293b' : '#e2e8f0';
    const textColor = newTheme === 'dark' ? '#64748b' : '#64748b';
    stockChart.options.scales.x.grid.color = gridColor;
    stockChart.options.scales.y.grid.color = gridColor;
    stockChart.options.scales.x.ticks.color = textColor;
    stockChart.options.scales.y.ticks.color = textColor;
    stockChart.update();
  }
}

// ==========================================
// 2. Guided Tour Engine
// ==========================================
const tourSteps = [
  {
    id: "tour-step-1",
    title: "1. Current Market Price",
    desc: "Displays the live execution price of the selected stock from Yahoo Finance real-time feeds."
  },
  {
    id: "tour-step-2",
    title: "2. Predicted Target Return",
    desc: "Outputs the expected next-day price return percentage predicted by the classical ML ensemble (XGBoost)."
  },
  {
    id: "tour-step-3",
    title: "3. 90% Safety Floor (Lower Bound)",
    desc: "Calculates the mathematical downside risk floor using Quantile Conformal XGBoost (5th percentile confidence)."
  },
  {
    id: "tour-step-4",
    title: "4. 90% Upside Ceiling (Upper Bound)",
    desc: "Calculates the mathematical upside potential ceiling using Quantile Conformal XGBoost (95th percentile confidence)."
  },
  {
    id: "tour-step-5",
    title: "5. Technical Trajectory & HMM Regime",
    desc: "Visualizes the 90-day moving price action while classifying the current market state (Bullish, Neutral, or Bearish Volatility) using a Hidden Markov Model."
  },
  {
    id: "tour-step-6",
    title: "6. Calculated Technical Indicators",
    desc: "Features 14-day RSI momentum, MACD histogram, and CBOE VIX volatility indicators engineered dynamically."
  },
  {
    id: "tour-step-7",
    title: "7. Real-Time Financial News Stream",
    desc: "Aggregates breaking stock news headlines from NewsAPI in real time."
  },
  {
    id: "tour-step-8",
    title: "8. Rumor & Fact-Check Verifier",
    desc: "Queries Google Fact Check Tools to highlight unverified rumors, rating market claims instantly."
  }
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

  // Highlight active element on dashboard
  const targetElem = document.getElementById(step.id);
  if (targetElem) {
    targetElem.classList.add('tour-highlight');
    targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Button States
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
  tourSteps.forEach(step => {
    const elem = document.getElementById(step.id);
    if (elem) elem.classList.remove('tour-highlight');
  });
}

// ==========================================
// 3. API & Data Engine
// ==========================================
async function fetchIntelligence(ticker) {
  const loader = document.getElementById('loader');
  const dashboard = document.getElementById('dashboard');

  loader.classList.remove('hidden');
  dashboard.classList.add('hidden');

  try {
    const [resData, resNews, resFacts] = await Promise.all([
      fetch(`http://localhost:8000/api/stock/analyze?ticker=${ticker}`).then(r => r.json()),
      fetch(`http://localhost:8000/api/stock/news?ticker=${ticker}`).then(r => r.json()),
      fetch(`http://localhost:8000/api/stock/factcheck?ticker=${ticker}`).then(r => r.json())
    ]);

    // Populate Top Metrics
    document.getElementById('val-price').textContent = `$${resData.current_price.toFixed(2)}`;
    
    const retPct = resData.predictions.next_return_pct;
    const retElem = document.getElementById('val-return');
    retElem.textContent = `${retPct >= 0 ? '+' : ''}${retPct}%`;
    retElem.style.color = retPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    document.getElementById('val-target').textContent = `$${resData.predictions.target_price.toFixed(2)}`;
    document.getElementById('val-lower').textContent = `$${resData.predictions.lower_bound_price.toFixed(2)}`;
    document.getElementById('val-upper').textContent = `$${resData.predictions.upper_bound_price.toFixed(2)}`;

    // Technical Indicators
    document.getElementById('val-rsi').textContent = resData.technical_indicators.rsi_14;
    document.getElementById('val-vix').textContent = resData.technical_indicators.vix;
    document.getElementById('val-macd').textContent = resData.technical_indicators.macd;
    document.getElementById('val-regime').textContent = `Regime: ${resData.market_regime.label}`;

    document.getElementById('val-context').innerHTML = `
      XGBoost predicts a target of <strong>$${resData.predictions.target_price.toFixed(2)}</strong> 
      with a 90% confidence corridor between <strong>$${resData.predictions.lower_bound_price.toFixed(2)}</strong> 
      and <strong>$${resData.predictions.upper_bound_price.toFixed(2)}</strong>.
    `;

    // Render Historical Chart
    renderChart(resData.ticker, resData.historical_chart);

    // Render Feeds
    renderNews(resNews.articles || []);
    renderFactChecks(resFacts.claims || []);

    loader.classList.add('hidden');
    dashboard.classList.remove('hidden');

  } catch (err) {
    console.error("API error:", err);
    alert("Error fetching stock intelligence data. Ensure FastAPI backend is running on port 8000.");
    loader.classList.add('hidden');
  }
}

function renderChart(ticker, historicalData) {
  document.getElementById('chart-title').textContent = `${ticker} Technical Trajectory`;
  const ctx = document.getElementById('stockChart').getContext('2d');
  
  const labels = historicalData.map(d => d.Date);
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
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: '#64748b' } },
        y: { grid: { color: gridColor }, ticks: { color: '#64748b' } }
      }
    }
  });
}

function renderNews(articles) {
  const container = document.getElementById('news-container');
  container.innerHTML = articles.map(art => `
    <a href="${art.url}" target="_blank" class="feed-item">
      <h4>${art.title}</h4>
      <div class="feed-meta">
        <span>${art.source}</span>
        <span>${art.published_at}</span>
      </div>
    </a>
  `).join('') || '<p style="color: var(--text-muted);">No news articles available.</p>';
}

function renderFactChecks(claims) {
  const container = document.getElementById('facts-container');
  if (!claims || claims.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No active unverified market rumors detected.</p>';
    return;
  }

  container.innerHTML = claims.map(c => `
    <div class="feed-item">
      <h4 style="font-weight: 500;">"${c.claim}"</h4>
      <div class="feed-meta">
        <span>Source: ${c.publisher}</span>
        <strong style="color: var(--accent-red);">${c.rating}</strong>
      </div>
    </div>
  `).join('');
}

function handleSearch(event) {
  event.preventDefault();
  const symbol = document.getElementById('ticker-input').value.trim();
  if (symbol) fetchIntelligence(symbol.toUpperCase());
}

function selectTicker(symbol) {
  document.getElementById('ticker-input').value = symbol;
  fetchIntelligence(symbol);
}

// Initialize Dashboard
window.addEventListener('DOMContentLoaded', () => {
  fetchIntelligence('AAPL');
});