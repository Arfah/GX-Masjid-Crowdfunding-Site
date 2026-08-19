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

  // Where the automatic updater writes the latest figures. A GitHub Action
  // refreshes this file from Crowdfunder every 30 minutes. If the file is
  // missing, stale or unreadable, the page silently falls back to the
  // `raised`/`supporters`/`deadline` values above — it never shows nothing.
  // Set to null to switch the automation off and go back to manual figures.
  liveDataUrl: 'assets/data/campaign.json',

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

  /* ---------- 2. Campaign figures ----------
     `state` is what the card actually renders. It starts from CONFIG and is
     replaced by live figures if the updater file loads. Everything downstream
     reads `state`, never CONFIG, so one render path serves both cases. */
  const state = {
    raised: CONFIG.raised,
    supporters: CONFIG.supporters,
    deadline: CONFIG.deadline,
    updatedAt: null,
    live: false
  };

  const raisedEl     = $('#raisedFigure');
  const meterFill    = $('#meterFill');
  const meterLabel   = $('#meterLabel');
  const remainingEl  = $('#statRemaining');
  const supportersEl = $('#statSupporters');
  const daysEl       = $('#statDays');
  const noteEl       = $('#progressNote');
  const stickyFill   = $('#stickyFill');
  const stickyRaised = $('#stickyRaised');

  const hasRaised = () => typeof state.raised === 'number' && state.raised >= 0;
  const pct = () => hasRaised()
    ? Math.max(0, Math.min(100, (state.raised / CONFIG.target) * 100))
    : 0;

  let hasAnimated = false;

  function render() {
    if (hasRaised()) {
      // Give any non-zero total a visible sliver, so an early campaign reads as
      // "barely begun" rather than as an empty, broken-looking track.
      if (state.raised > 0) {
        meterFill.classList.add('has-progress');
        if (stickyFill) stickyFill.classList.add('has-progress');
      }
      raisedEl.style.color = '';
      const p = pct();
      meterLabel.textContent = p < 1
        ? 'Just getting started — early donations are what give a campaign momentum.'
        : `${p.toFixed(1)}% of the way to £2 million.`;
      remainingEl.textContent = gbp(Math.max(0, CONFIG.target - state.raised), { notation: 'compact' });
      if (stickyRaised) stickyRaised.textContent = gbp(state.raised, { notation: 'compact' });
      // Only claim to be automatic once the updater has actually stamped a run.
      noteEl.textContent = (state.live && state.updatedAt)
        ? `Updated automatically from Crowdfunder · ${timeAgo(state.updatedAt)}`
        : 'Totals are updated by hand from Crowdfunder.';
      if (hasAnimated) {
        meterFill.style.width = p + '%';
        if (stickyFill) stickyFill.style.width = p + '%';
        raisedEl.textContent = gbp(state.raised);
      }
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

    supportersEl.textContent = typeof state.supporters === 'number'
      ? state.supporters.toLocaleString('en-GB')
      : '—';

    if (state.deadline) {
      const end = new Date(state.deadline + 'T23:59:59');
      const days = Math.ceil((end - new Date()) / 86400000);
      daysEl.textContent = days > 0 ? days.toLocaleString('en-GB') : 'Closed';
    } else {
      daysEl.textContent = '—';
    }
  }

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso)) / 60000);
    if (!isFinite(mins) || mins < 0) return 'just now';
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins} minutes ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs === 1 ? 'an hour ago' : `${hrs} hours ago`;
    const days = Math.round(hrs / 24);
    return days === 1 ? 'yesterday' : `${days} days ago`;
  }

  render();

  /* ---------- 3. Live figures, then animate ---------- */
  function animateProgress() {
    hasAnimated = true;
    const p = pct();
    if (meterFill) meterFill.style.width = p + '%';
    if (stickyFill) stickyFill.style.width = p + '%';
    if (!hasRaised()) return;

    if (reduceMotion) { raisedEl.textContent = gbp(state.raised); return; }

    const target = state.raised;
    const duration = 1600;
    const start = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    (function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      raisedEl.textContent = gbp(Math.round(target * easeOut(t)));
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  // Pull the live figures. Any failure leaves the CONFIG fallback in place.
  if (CONFIG.liveDataUrl && typeof fetch === 'function') {
    fetch(CONFIG.liveDataUrl, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then(d => {
        // Only trust a sane number. A broken scrape must not blank the card.
        if (typeof d.raised !== 'number' || !isFinite(d.raised) || d.raised < 0) return;
        state.raised = d.raised;
        if (typeof d.supporters === 'number' && d.supporters >= 0) state.supporters = d.supporters;
        if (typeof d.deadline === 'string') state.deadline = d.deadline;
        state.updatedAt = typeof d.updatedAt === 'string' ? d.updatedAt : null;
        state.live = true;
        render();
      })
      .catch(() => { /* keep the static figures */ });
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

  /* ---------- 9. Concept illustration ----------
     The figure ships visible and removes itself if the image fails to load,
     so a missing file degrades to nothing rather than to a broken image icon
     on a live fundraising page. */
  const conceptFigure = $('#conceptFigure');
  const conceptImage = $('#conceptImage');
  if (conceptFigure && conceptImage) {
    const dropConcept = () => { conceptFigure.hidden = true; };
    // The image can fail before this script runs (it is parsed earlier in the
    // document), in which case the error event is already gone — so check the
    // finished-but-empty state as well as listening for a later failure.
    if (conceptImage.complete && conceptImage.naturalWidth === 0) dropConcept();
    conceptImage.addEventListener('error', dropConcept, { once: true });
  }

  /* ---------- 10. Footer year ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
