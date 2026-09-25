/* ==========================================================
   Model Explainability (SHAP)
   Standalone — doesn't modify app.js. Uses the global `activeTicker`
   that app.js already maintains.
   ========================================================== */

const EXPLAIN_API_BASE = 'http://localhost:8000/api/stock/explain';

function openExplainModal() {
  document.body.classList.add('modal-open');
  document.getElementById('explain-modal').classList.remove('hidden');
  document.getElementById('explain-ticker-label').textContent = activeTicker;
  loadExplainability();
}

function closeExplainModal() {
  document.body.classList.remove('modal-open');
  document.getElementById('explain-modal').classList.add('hidden');
}

async function loadExplainability() {
  const loading = document.getElementById('explain-loading');
  const content = document.getElementById('explain-content');
  loading.classList.remove('hidden');
  content.classList.add('hidden');

  try {
    const res = await fetch(`${EXPLAIN_API_BASE}?ticker=${activeTicker}`);
    if (!res.ok) throw new Error('Explainability request failed');
    const data = await res.json();
    renderExplainability(data);
  } catch (err) {
    console.error('Explainability error:', err);
    loading.textContent = 'Could not load explainability data. Is the backend running?';
  }
}

function renderExplainability(data) {
  document.getElementById('explain-loading').classList.add('hidden');
  const content = document.getElementById('explain-content');
  content.classList.remove('hidden');

  document.getElementById('explain-base').textContent = `${(data.base_value * 100).toFixed(3)}%`;
  document.getElementById('explain-final').textContent = `${(data.final_prediction * 100).toFixed(3)}%`;

  const maxAbs = Math.max(...data.contributions.map(c => Math.abs(c.shap_value)), 0.0001);

  document.getElementById('explain-bars-container').innerHTML = data.contributions.map(c => {
    const widthPct = Math.round((Math.abs(c.shap_value) / maxAbs) * 100);
    const colorVar = c.direction === 'bullish' ? 'var(--accent-green)' : 'var(--accent-red)';
    const sign = c.direction === 'bullish' ? '+' : '−';
    return `
      <div class="shap-row">
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
          <span>${c.label}</span>
          <span style="color:${colorVar}; font-weight:700;">${sign}${Math.abs(c.shap_value * 100).toFixed(3)}%</span>
        </div>
        <div style="background:var(--bg-surface-alt); border-radius:6px; height:10px; overflow:hidden;">
          <div style="width:${widthPct}%; height:100%; background:${colorVar}; border-radius:6px;"></div>
        </div>
        <div style="font-size:10.5px; color:var(--text-faint); margin-top:2px;">Raw value: ${c.raw_value}</div>
      </div>
    `;
  }).join('');
}