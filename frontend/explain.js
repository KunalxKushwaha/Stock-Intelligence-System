/* ==========================================================
   Model Explainability (SHAP) — with natural-language summaries
   Standalone file, doesn't touch app.js or auth.js.
   ========================================================== */

const EXPLAIN_API_BASE = 'http://localhost:8000/api/stock/explain';
let explainViewMode = 'simple'; // 'simple' | 'advanced'

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

function setExplainView(mode) {
  explainViewMode = mode;
  document.getElementById('shap-view-simple').classList.toggle('active', mode === 'simple');
  document.getElementById('shap-view-advanced').classList.toggle('active', mode === 'advanced');
  document.querySelectorAll('.shap-simple-view').forEach(el => el.classList.toggle('hidden', mode !== 'simple'));
  document.querySelectorAll('.shap-advanced-view').forEach(el => el.classList.toggle('hidden', mode !== 'advanced'));
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

  // ---------- TL;DR executive header ----------
  const tldrBox = document.getElementById('explain-tldr');
  if (tldrBox && data.tldr) {
    tldrBox.className = 'explain-tldr explain-tldr-' +
      (data.final_prediction >= 0.002 ? 'gain' : (data.final_prediction <= -0.002 ? 'risk' : 'neutral'));
    tldrBox.innerHTML = `
      <span class="explain-tldr-emoji">${data.tldr.emoji}</span>
      <div>
        <strong class="explain-tldr-label">${data.tldr.sentiment_label}</strong>
        <p class="explain-tldr-summary">${data.tldr.summary}</p>
      </div>
    `;
  }

  // ---------- feature rows ----------
  const maxAbs = Math.max(...data.contributions.map(c => Math.abs(c.shap_value)), 0.0001);
  const badgeClass = { green: 'text-gain', red: 'text-risk', yellow: '' };

  document.getElementById('explain-bars-container').innerHTML = data.contributions.map(c => {
    const widthPct = Math.round((Math.abs(c.shap_value) / maxAbs) * 100);
    const isBullish = c.direction === 'bullish';
    const colorVar = isBullish ? 'var(--accent-green)' : 'var(--accent-red)';
    const sign = isBullish ? '+' : '−';
    const shadeClass = isBullish ? 'shap-row-gain' : 'shap-row-risk';

    return `
      <div class="shap-row ${shadeClass}">
        <div class="shap-row-header">
          <span class="shap-row-label">${c.label}</span>
          <span class="shap-badge shap-badge-${c.badge_color}">${c.badge}</span>
        </div>

        <div class="shap-simple-view ${explainViewMode !== 'simple' ? 'hidden' : ''}">
          <p class="shap-sentence">${c.sentence}</p>
        </div>

        <div class="shap-advanced-view ${explainViewMode !== 'advanced' ? 'hidden' : ''}">
          <div class="shap-bar-track">
            <div class="shap-bar-fill" style="width:${widthPct}%; background:${colorVar};"></div>
          </div>
          <div class="shap-quant-line">
            Raw value: <strong>${c.raw_value}</strong> &nbsp;·&nbsp;
            SHAP contribution: <strong style="color:${colorVar};">${sign}${Math.abs(c.shap_value * 100).toFixed(3)}%</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');

  setExplainView(explainViewMode); // re-apply toggle state to the freshly-rendered rows
}