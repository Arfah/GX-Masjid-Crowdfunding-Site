/* ==========================================================================
   Gerrards Cross Masjid Project — site behaviour

   ┌────────────────────────────────────────────────────────────────────────┐
   │  EDIT THIS BLOCK. It is the only part of the site with real numbers    │
   │  in it. Everything below CONFIG is machinery you can ignore.           │
   └────────────────────────────────────────────────────────────────────────┘
   ========================================================================== */

const CONFIG = {

  // Your live Crowdfunder page. Every "Donate" button on the site points here.
  donateUrl: 'https://www.crowdfunder.co.uk/p/gerrards-cross-masjid-project',

  // The fundraising goal, in pounds.
  target: 2000000,

  // How much has been raised so far, in pounds.
  // Update this whenever you check Crowdfunder — it takes 10 seconds, and a
  // number that visibly moves is what makes a campaign feel alive.
  // Setting it back to `null` restores the orange "not set yet" warning
  // instead of showing an invented figure.
  raised: 1400,

  // Number of people who have donated. `null` hides the stat.
  supporters: null,      // e.g. 187

  // Campaign closing date, 'YYYY-MM-DD'. `null` hides the countdown.
  deadline: null,        // e.g. '2026-12-31'

  // Which stage of the plan you're currently in (1–4). Marks it "We are here"
  // on the timeline and ticks off everything before it.
  currentPhase: 1,

  // Text shown under the progress bar and in share messages.
  shareText: 'We’re building a masjid in Gerrards Cross. Every pound is sadaqah jariyah — please give what you can and pass this on.'
};

/* ==========================================================================
   Nothing below here needs editing.
   ========================================================================== */

(function () {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const gbp = (n, opts = {}) => new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', maximumFractionDigits: 0, ...opts
  }).format(n);

  /* ---------- 1. Wire every donate link to the Crowdfunder page ---------- */
  $$('[data-donate]').forEach(el => {
    el.href = CONFIG.donateUrl;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });

  /* ---------- 2. Progress card ---------- */
  const hasRaised = typeof CONFIG.raised === 'number' && CONFIG.raised >= 0;
  const pct = hasRaised
    ? Math.max(0, Math.min(100, (CONFIG.raised / CONFIG.target) * 100))
    : 0;

  const raisedEl    = $('#raisedFigure');
  const meterFill   = $('#meterFill');
  const meterLabel  = $('#meterLabel');
  const remainingEl = $('#statRemaining');
  const supportersEl= $('#statSupporters');
  const daysEl      = $('#statDays');
  const noteEl      = $('#progressNote');
  const stickyFill  = $('#stickyFill');
  const stickyRaised= $('#stickyRaised');

  if (hasRaised) {
    // Give any non-zero total a visible sliver, so an early campaign reads as
    // "barely begun" rather than as an empty, broken-looking track.
    if (CONFIG.raised > 0) meterFill.classList.add('has-progress');
    if (stickyFill && CONFIG.raised > 0) stickyFill.classList.add('has-progress');

    meterLabel.textContent = pct < 1
      ? 'Just getting started — early donations are what give a campaign momentum.'
      : `${pct.toFixed(1)}% of the way to £2 million.`;
    remainingEl.textContent = gbp(Math.max(0, CONFIG.target - CONFIG.raised), { notation: 'compact' });
    if (stickyRaised) stickyRaised.textContent = gbp(CONFIG.raised, { notation: 'compact' });
    noteEl.textContent = 'Totals are updated by hand from Crowdfunder.';
  } else {
    // Loud, unmissable, and impossible to publish by accident.
    raisedEl.textContent = '£ —';
    raisedEl.style.color = '#B45309';
    meterLabel.innerHTML = '<strong style="color:#B45309">Set-up needed:</strong> open ' +
      '<code>assets/js/site.js</code> and fill in <code>raised</code>, <code>supporters</code> ' +
      'and <code>deadline</code>. This warning disappears once you do.';
    remainingEl.textContent = '—';
    noteEl.textContent = '';
    if (stickyRaised) stickyRaised.textContent = '£—';
  }

  supportersEl.textContent = typeof CONFIG.supporters === 'number'
    ? CONFIG.supporters.toLocaleString('en-GB')
    : '—';

  if (CONFIG.deadline) {
    const end = new Date(CONFIG.deadline + 'T23:59:59');
    const days = Math.ceil((end - new Date()) / 86400000);
    daysEl.textContent = days > 0 ? days.toLocaleString('en-GB') : 'Closed';
  } else {
    daysEl.textContent = '—';
  }

  /* ---------- 3. Animate the meter + count up, once it scrolls into view --- */
  function animateProgress() {
    if (meterFill) meterFill.style.width = pct + '%';
    if (stickyFill) stickyFill.style.width = pct + '%';
    if (!hasRaised) return;

    if (reduceMotion) { raisedEl.textContent = gbp(CONFIG.raised); return; }

    const duration = 1600;
    const start = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    (function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      raisedEl.textContent = gbp(Math.round(CONFIG.raised * easeOut(t)));
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  const card = $('.progress-card');
  if (card && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) { animateProgress(); obs.disconnect(); }
      });
    }, { threshold: .35 });
    io.observe(card);
  } else {
    animateProgress();
  }

  /* ---------- 4. Timeline current phase ---------- */
  $$('#timeline .tl-step').forEach(step => {
    const phase = Number(step.dataset.phase);
    if (phase < CONFIG.currentPhase) step.classList.add('is-done');
    if (phase === CONFIG.currentPhase) step.classList.add('is-current');
  });

  /* ---------- 5. Reveal on scroll ----------
     IntersectionObserver coalesces notifications, so flicking quickly down a
     long page can leave an element visible but still at opacity 0. `sweep()`
     is the safety net: on every scroll settle it force-reveals anything that
     is actually on screen. Nothing can end up invisible in the viewport. */
  const revealables = $$('.reveal');
  let sweep = () => {};

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e, i) => {
        if (!e.isIntersecting) return;
        // Small stagger so grids cascade rather than popping in together.
        setTimeout(() => e.target.classList.add('is-in'), i * 70);
        obs.unobserve(e.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    revealables.forEach(el => io.observe(el));

    sweep = () => {
      const h = window.innerHeight;
      revealables.forEach(el => {
        if (el.classList.contains('is-in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < h && r.bottom > 0) { el.classList.add('is-in'); io.unobserve(el); }
      });
    };
  }

  /* ---------- 6. Header state + sticky donate bar ---------- */
  const header = $('#siteHeader');
  const stickyBar = $('#stickyBar');
  const hero = $('.hero');

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-stuck', y > 40);
    if (stickyBar && hero) {
      const past = y > hero.offsetHeight * 0.85;
      stickyBar.classList.toggle('is-visible', past);
      stickyBar.setAttribute('aria-hidden', past ? 'false' : 'true');
    }
  }
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); sweep(); ticking = false; });
  }, { passive: true });
  onScroll();

  /* ---------- 7. Mobile nav ---------- */
  const toggle = $('#navToggle');
  const mobileNav = $('#mobileNav');

  function setNav(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileNav.hidden = !open;
    mobileNav.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
  }
  toggle.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('#mobileNav a').forEach(a => a.addEventListener('click', () => setNav(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setNav(false); toggle.focus();
    }
  });

  /* ---------- 8. Share ---------- */
  async function share(button, label) {
    const url = window.location.href.split('#')[0];
    const data = { title: 'Gerrards Cross Masjid Project', text: CONFIG.shareText, url };

    if (navigator.share) {
      try { await navigator.share(data); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(`${CONFIG.shareText} ${url}`);
      flash(button, label, 'Link copied ✓');
    } catch {
      window.prompt('Copy this link and send it on:', url);
    }
  }

  function flash(button, target, message) {
    const original = target.textContent;
    target.textContent = message;
    button.disabled = true;
    setTimeout(() => { target.textContent = original; button.disabled = false; }, 2200);
  }

  const shareBtn = $('#shareBtn');
  if (shareBtn) shareBtn.addEventListener('click', () => share(shareBtn, $('#shareBtnText')));
  $$('[data-share]').forEach(btn => btn.addEventListener('click', () => share(btn, btn)));

  /* ---------- 9. Footer year ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
