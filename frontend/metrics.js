/* Model Accuracy & Validation card. Standalone: reads /api/model/metrics. */
const METRICS_API = 'http://localhost:8000/api/model/metrics';
const pct = (v, d = 1) => (v === null || v === undefined) ? '--' : (v * 100).toFixed(d) + '%';

async function loadModelMetrics(refresh = false) {
  const note = document.getElementById('acc-note');
  try {
    const res = await fetch(METRICS_API + (refresh ? '?refresh=true' : ''));
    if (!res.ok) throw new Error('metrics request failed');
    renderModelMetrics(await res.json());
  } catch (e) {
    console.error('Metrics error:', e);
    if (note) note.textContent = 'Could not load model metrics. Is the backend running?';
  }
}

function renderModelMetrics(m) {
  const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  const acc = m.directional_accuracy;

  set('acc-val', pct(acc, 2));
  set('acc-sub', `Coin flip 50% · majority baseline ${pct(m.majority_baseline)} · edge ${m.edge_vs_baseline >= 0 ? '+' : ''}${(m.edge_vs_baseline * 100).toFixed(1)} pts`);
  set('acc-rmse', pct(m.rmse, 2));
  set('acc-rmse-sub', `Naive "no change" ${pct(m.naive_rmse, 2)} · skill ${(m.skill_vs_naive * 100).toFixed(1)}%`);
  set('acc-prec', `${pct(m.up_call_precision)} / ${pct(m.down_call_precision)}`);
  set('acc-cov', pct(m.interval.measured_coverage));
  set('acc-cov-sub', `Target 90% · measured on ${m.interval.eval_days} unseen days · width ${m.interval.avg_width_pct.toFixed(1)}%`);

  const badge = document.getElementById('acc-badge');
  if (badge) {
    badge.textContent = m.statistically_significant ? 'Statistically significant' : 'Not yet statistically significant';
    badge.className = 'acc-badge ' + (m.statistically_significant ? 'acc-badge-ok' : 'acc-badge-warn');
  }

  const fill = document.getElementById('acc-bar-fill');
  if (fill) fill.style.width = Math.min(100, acc * 100) + '%';
  const base = document.getElementById('acc-bar-base');
  if (base) base.style.left = (m.majority_baseline * 100) + '%';

  const tiers = document.getElementById('acc-tiers');
  if (tiers) tiers.innerHTML = m.confidence_tiers.map(t =>
    `<div class="acc-tier"><span>${t.label} <em>(${t.n} days)</em></span><strong>${pct(t.accuracy)}</strong></div>`).join('');

  set('acc-meta', `${m.test_days} hold-out days (${m.test_period[0]} to ${m.test_period[1]}) · 95% CI ${pct(m.accuracy_ci95[0])} to ${pct(m.accuracy_ci95[1])} · p = ${m.p_value_vs_coin_flip.toFixed(3)} vs coin flip`);
  set('acc-note', m.caveats.join(' '));
}

window.addEventListener('DOMContentLoaded', () => loadModelMetrics());
