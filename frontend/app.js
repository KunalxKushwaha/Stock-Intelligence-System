let stockChart = null;
let rawHistoricalData = [];
let activeTimeframe = 'ALL';
let currentFactClaims = [];

const VERIFIED_FINANCIAL_SOURCES = [
  'reuters', 'bloomberg', 'the wall street journal', 'wsj', 
  'investopedia', 'cnbc', 'financial times', 'barron\'s', 
  'marketwatch', 'forbes', 'business insider', 'yahoo finance', 'biztoc'
];

function toggleTheme() {
  const html = document.documentElement;
  const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  document.getElementById('theme-btn').textContent = newTheme === 'dark' ? '🌙 Dark' : '☀️ Light';

  if (stockChart) {
    const gridColor = newTheme === 'dark' ? '#1e293b' : '#e2e8f0';
    stockChart.options.scales.x.grid.color = gridColor;
    stockChart.options.scales.y.grid.color = gridColor;
    stockChart.update();
  }
}

function setTimeframe(tf, btnElement) {
  activeTimeframe = tf;
  document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  const filteredData = filterDataByTimeframe(rawHistoricalData, tf);
  renderChart(document.getElementById('ticker-input').value.toUpperCase(), filteredData);
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
  document.getElementById('chart-title').textContent = `${ticker} Technical Trajectory`;
  const ctx = document.getElementById('stockChart').getContext('2d');
  
  // Format Date string cleanly (YYYY-MM-DD)
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
        x: { 
          grid: { color: gridColor }, 
          ticks: { color: '#64748b', maxTicksLimit: 8 } 
        },
        y: { 
          grid: { color: gridColor }, 
          ticks: { color: '#64748b' } 
        }
      }
    }
  });
}

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

    rawHistoricalData = resData.historical_chart || [];
    currentFactClaims = resFacts.claims || [];

    document.getElementById('val-price').textContent = `$${resData.current_price.toFixed(2)}`;
    
    const retPct = resData.predictions.next_return_pct;
    const retElem = document.getElementById('val-return');
    retElem.textContent = `${retPct >= 0 ? '+' : ''}${retPct}%`;
    retElem.style.color = retPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    document.getElementById('val-target').textContent = `$${resData.predictions.target_price.toFixed(2)}`;
    document.getElementById('val-lower').textContent = `$${resData.predictions.lower_bound_price.toFixed(2)}`;
    document.getElementById('val-upper').textContent = `$${resData.predictions.upper_bound_price.toFixed(2)}`;

    document.getElementById('val-rsi').textContent = resData.technical_indicators.rsi_14;
    document.getElementById('val-vix').textContent = resData.technical_indicators.vix;
    document.getElementById('val-macd').textContent = resData.technical_indicators.macd;
    document.getElementById('val-regime').textContent = `Regime: ${resData.market_regime.label}`;

    const filteredData = filterDataByTimeframe(rawHistoricalData, activeTimeframe);
    renderChart(resData.ticker, filteredData);

    renderNews(resNews.articles || [], currentFactClaims);
    renderFactChecks(currentFactClaims);

    loader.classList.add('hidden');
    dashboard.classList.remove('hidden');

  } catch (err) {
    console.error("API error:", err);
    alert("Error fetching stock intelligence data. Ensure FastAPI backend is running on port 8000.");
    loader.classList.add('hidden');
  }
}

function renderNews(articles, claims) {
  const container = document.getElementById('news-container');
  if (!articles || articles.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted);">No news articles available.</p>';
    return;
  }

  container.innerHTML = articles.map((art) => {
    const matchedClaimIdx = claims.findIndex(c => 
      c.claim && art.title && art.title.toLowerCase().includes(c.claim.toLowerCase().split(' ')[0])
    );

    const sourceName = (art.source || '').toLowerCase();
    const isVerifiedOutlet = VERIFIED_FINANCIAL_SOURCES.some(src => sourceName.includes(src));

    let badgeHtml = '';
    if (matchedClaimIdx !== -1) {
      badgeHtml = `<span class="fact-badge fact-badge-rumor" onclick="event.preventDefault(); openFactModal(${matchedClaimIdx});">⚠️ Rumor Checked</span>`;
    } else if (isVerifiedOutlet) {
      badgeHtml = `<span class="fact-badge fact-badge-verified" onclick="event.preventDefault(); alert('Headline verified by established financial news outlet.');">🛡️ Verified Source</span>`;
    } else {
      badgeHtml = `<span class="fact-badge" style="background: rgba(100, 116, 139, 0.15); color: var(--text-muted); border: 1px solid rgba(100, 116, 139, 0.3);">📰 News</span>`;
    }

    return `
      <a href="${art.url}" target="_blank" class="feed-item">
        <div class="feed-title-container">
          <h4>${art.title}</h4>
          ${badgeHtml}
        </div>
        <div class="feed-meta">
          <span>${art.source}</span>
          <span>${art.published_at}</span>
        </div>
      </a>
    `;
  }).join('');
}

function renderFactChecks(claims) {
  const container = document.getElementById('facts-container');
  if (!claims || claims.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No active unverified market rumors detected.</p>';
    return;
  }

  container.innerHTML = claims.map((c, idx) => `
    <div class="feed-item" style="cursor: pointer;" onclick="openFactModal(${idx})">
      <div class="feed-title-container">
        <h4 style="font-weight: 500;">"${c.claim}"</h4>
        <span class="fact-badge fact-badge-rumor">Inspect Claim</span>
      </div>
      <div class="feed-meta">
        <span>Source: ${c.publisher}</span>
        <strong style="color: var(--accent-red);">${c.rating}</strong>
      </div>
    </div>
  `).join('');
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

function handleSearch(event) {
  event.preventDefault();
  const symbol = document.getElementById('ticker-input').value.trim();
  if (symbol) fetchIntelligence(symbol.toUpperCase());
}

function selectTicker(symbol) {
  document.getElementById('ticker-input').value = symbol;
  fetchIntelligence(symbol);
}

window.addEventListener('DOMContentLoaded', () => {
  fetchIntelligence('AAPL');
});