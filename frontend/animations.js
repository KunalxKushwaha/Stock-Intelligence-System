/* ==========================================================
   AlphaTerminal — Motion Layer (GSAP)
   Loaded last. Purely additive: watches the DOM for the same
   state changes app.js/auth.js already produce (dashboard
   appearing, a modal losing .hidden, a price updating) and
   choreographs entrance/hover/counter animation on top of it.
   Nothing here calls into or overrides app.js or auth.js.
   ========================================================== */

(function () {
  if (!window.gsap) return;

  // ---------- entrance choreography on first load ----------
  function playNavEntrance() {
    gsap.from('.nav-brand', { x: -22, opacity: 0, duration: 0.6, ease: 'power3.out' });
    gsap.from('.search-form', { y: -10, opacity: 0, duration: 0.55, delay: 0.08, ease: 'power3.out' });
    gsap.from('.nav-user-actions > *', { y: -10, opacity: 0, duration: 0.4, stagger: 0.06, delay: 0.16, ease: 'power3.out' });
    gsap.from('.toolbar-btn, .market-status', { y: -6, opacity: 0, duration: 0.35, stagger: 0.04, delay: 0.28, ease: 'power2.out' });
    gsap.from('.quick-chips-bar button', { x: -8, opacity: 0, duration: 0.35, stagger: 0.03, delay: 0.36, ease: 'power2.out' });
  }

  // Reveals the dashboard body the first time #dashboard loses .hidden
  // (i.e. once real data has loaded) — cards cascade in rather than pop.
  function playDashboardEntrance() {
    const targets = [
      '.summary-banner',
      '.pred-card',
      '.left-column .card',
      '.right-column .card'
    ];
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.asset-identity', { y: 14, opacity: 0, duration: 0.5 }, 0)
      .from('.pred-card', { y: 14, opacity: 0, duration: 0.45, stagger: 0.07 }, 0.08)
      .from('.left-column .card', { y: 18, opacity: 0, duration: 0.5, stagger: 0.08 }, 0.16)
      .from('.right-column .card', { y: 18, opacity: 0, duration: 0.5, stagger: 0.08 }, 0.22);
  }

  // ---------- modal open animation (in addition to the CSS keyframe) ----------
  function animateModalOpen(modalEl) {
    const content = modalEl.querySelector('.modal-content');
    if (!content) return;
    gsap.fromTo(content,
      { y: 18, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(1.6)' }
    );
  }

  // ---------- animated counter for the headline price ----------
  // Reads the already-updated text (app.js sets it), then replays the
  // transition from the previous value instead of just snapping to it.
  const counterState = { price: null };
  function animatePriceIfChanged() {
    const el = document.getElementById('val-price');
    if (!el) return;
    const raw = el.textContent.replace(/[^0-9.\-]/g, '');
    const next = parseFloat(raw);
    if (isNaN(next)) return;

    const prev = counterState.price;
    counterState.price = next;
    if (prev === null || prev === next) return;

    const obj = { v: prev };
    gsap.to(obj, {
      v: next,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => { el.textContent = '$' + obj.v.toFixed(2); },
      onComplete: () => { el.textContent = '$' + next.toFixed(2); }
    });
  }

  // ---------- watch for #dashboard and modals becoming visible ----------
  const dashboard = document.getElementById('dashboard');
  let dashboardRevealed = false;

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
      const el = m.target;

      if (el === dashboard && !el.classList.contains('hidden') && !dashboardRevealed) {
        dashboardRevealed = true;
        playDashboardEntrance();
        animatePriceIfChanged();
      }

      if (el.classList && el.classList.contains('modal') && !el.classList.contains('hidden')) {
        animateModalOpen(el);
      }

      if (el === dashboard && !el.classList.contains('hidden') && dashboardRevealed) {
        // Ticker switched after the first reveal — just animate the price delta.
        animatePriceIfChanged();
      }
    }
  });

  document.querySelectorAll('.modal, #dashboard').forEach(el => {
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
  });

  // Also catch price updates that don't toggle any class (re-analyzing the
  // same ticker) by lightly polling the text content — cheap and bounded.
  setInterval(animatePriceIfChanged, 1200);

  // ---------- micro hover-lift for cards ----------
  document.querySelectorAll('.card, .pred-card, .metric-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { y: -3, boxShadow: '0 14px 30px -10px rgba(0,0,0,0.18)', duration: 0.22, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { y: 0, boxShadow: '', duration: 0.22, ease: 'power2.out', clearProps: 'boxShadow' });
    });
  });

  document.addEventListener('DOMContentLoaded', playNavEntrance);
  if (document.readyState !== 'loading') playNavEntrance();
})();