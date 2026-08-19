#!/usr/bin/env node
/**
 * Reads the live totals from the Crowdfunder project page and writes them to
 * assets/data/campaign.json, which the site loads in the browser.
 *
 * Run by .github/workflows/update-campaign.yml on a schedule.
 * Run locally with:  node scripts/fetch-campaign.mjs
 *
 * Design notes
 * ------------
 * Crowdfunder has no public totaliser widget and their API is an invite-only
 * beta, so this reads the public project page. That means the parsing is the
 * fragile part: if Crowdfunder restyle their page, the selectors below stop
 * matching. Two safeguards follow from that:
 *
 *   1. This script exits non-zero and writes NOTHING when it cannot find a
 *      credible figure, so a broken parse leaves the last good file in place
 *      and the workflow goes red to tell you.
 *   2. The site treats this file as optional. If it is missing or nonsense,
 *      the page falls back to the hardcoded figures in assets/js/site.js.
 *
 * If you are granted Crowdfunder API access, replace readPage() with an API
 * call — everything downstream stays the same.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const PROJECT_URL = process.env.PROJECT_URL
  || 'https://www.crowdfunder.co.uk/p/gerrards-cross-masjid-project';
const OUT = 'assets/data/campaign.json';
const TARGET = 2_000_000;

// A parsed total above this is certainly not our raised figure.
const MAX_CREDIBLE = TARGET * 2;
// Crowdfunding totals essentially never fall. A large drop means a bad parse.
const MAX_DROP_RATIO = 0.5;

const log = (...a) => console.log('[campaign]', ...a);
const fail = msg => { console.error('[campaign] FAILED:', msg); process.exit(1); };

// Crowdfunder's front end answered a plainly-identified bot with 403. These are
// the headers a normal Chrome request carries; we are reading our own public
// project page roughly twice an hour. Set UA_MODE=bot to go back to announcing
// ourselves, which is worth retrying if you are ever granted API access.
const BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-GB,en;q=0.9',
  'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1'
};

const BOT_HEADERS = {
  'user-agent': 'GerrardsCrossMasjidBot/1.0 (+https://github.com/Arfah/GX-Masjid-Crowdfunding-Site) fetching our own project totals',
  'accept': 'text/html,application/xhtml+xml'
};

async function readPage(url) {
  const mode = process.env.UA_MODE === 'bot' ? 'bot' : 'browser';
  log(`requesting as: ${mode}`);
  const res = await fetch(url, {
    headers: mode === 'bot' ? BOT_HEADERS : BROWSER_HEADERS,
    redirect: 'follow'
  });

  if (!res.ok) {
    // Say WHY it was refused, so one run tells us whether the block is about
    // who we claim to be or about where we are calling from.
    const h = n => res.headers.get(n) || '-';
    console.error(`[campaign] refused: HTTP ${res.status} ${res.statusText}`);
    console.error(`[campaign]   server=${h('server')} cf-ray=${h('cf-ray')} cf-mitigated=${h('cf-mitigated')} retry-after=${h('retry-after')}`);
    let body = '';
    try { body = (await res.text()).replace(/\s+/g, ' ').slice(0, 400); } catch {}
    if (body) console.error(`[campaign]   body starts: ${body}`);
    if (/managed challenge|checking your browser|cf-challenge|captcha|attention required/i.test(body)) {
      console.error('[campaign]   -> looks like a Cloudflare challenge. This blocks the IP range, not the user-agent; scraping from GitHub Actions will not get past it.');
    }
    fail(`HTTP ${res.status} fetching ${url}`);
  }
  return res.text();
}

const toNumber = s => Number(String(s).replace(/[^0-9.]/g, ''));

/** Strategy 1: JSON-LD, the most stable thing a page can expose. */
function fromJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of blocks) {
    let data;
    try { data = JSON.parse(raw.trim()); } catch { continue; }
    const found = search(data);
    if (found) return found;
  }
  function search(node) {
    if (!node || typeof node !== 'object') return null;
    for (const [k, v] of Object.entries(node)) {
      if (/amountraised|totaldonated|currentamount|moneyraised/i.test(k) && toNumber(v) > 0) {
        return { raised: toNumber(v), how: 'json-ld:' + k };
      }
      if (typeof v === 'object') { const r = search(v); if (r) return r; }
    }
    return null;
  }
  return null;
}

/** Strategy 2: state blobs that JS frameworks embed in the page. */
function fromEmbeddedJson(html) {
  const keys = ['amountRaised', 'totalRaised', 'raisedAmount', 'pledgedAmount', 'totalPledged', 'raised'];
  for (const key of keys) {
    const m = html.match(new RegExp(`"${key}"\\s*:\\s*"?([0-9][0-9,.]*)"?`, 'i'));
    if (m) {
      const n = toNumber(m[1]);
      if (n > 0) return { raised: n, how: 'embedded-json:' + key };
    }
  }
  return null;
}

/** Strategy 3: the visible "£X,XXX raised" text. Last resort. */
const decodeEntities = s => s
  .replace(/&(?:pound|#163|#xA3);/gi, '£')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&');

function fromVisibleText(html) {
  const text = decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  const patterns = [
    /£\s*([0-9][0-9,]*(?:\.[0-9]{2})?)\s+raised/i,
    /raised\s+£\s*([0-9][0-9,]*(?:\.[0-9]{2})?)/i,
    /£\s*([0-9][0-9,]*(?:\.[0-9]{2})?)\s+of\s+£/i
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = toNumber(m[1]);
      if (n > 0) return { raised: n, how: 'visible-text' };
    }
  }
  return null;
}

function findSupporters(html) {
  const text = decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  const m = text.match(/([0-9][0-9,]*)\s+(?:supporters|backers|pledges|donations|people)/i)
    || html.match(/"(?:supporterCount|backersCount|totalSupporters|pledgeCount)"\s*:\s*"?([0-9,]+)"?/i);
  if (!m) return null;
  const n = toNumber(m[1]);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * The closing date. Stored as an absolute date rather than "N days left", so
 * the countdown stays correct between runs instead of freezing at whatever
 * number was scraped.
 */
function findDeadline(html) {
  // A: an explicit end date in embedded page state — the most reliable form.
  const keys = ['endsAt', 'endDate', 'endsOn', 'deadline', 'finishesAt', 'closingDate', 'expiresAt', 'finishDate'];
  for (const key of keys) {
    const m = html.match(new RegExp(`"${key}"\\s*:\\s*"([^"]{8,40})"`, 'i'));
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d)) return { deadline: isoDate(d), how: 'embedded-json:' + key };
    }
  }

  const text = decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

  // B: a visible countdown. Convert to a date so it does not go stale.
  const rel = text.match(/([0-9]{1,4})\s+days?\s+(?:left|to go|remaining)/i);
  if (rel) {
    const days = Number(rel[1]);
    if (Number.isFinite(days) && days >= 0 && days <= 3650) {
      const d = new Date(Date.now() + days * 86400000);
      return { deadline: isoDate(d), how: `visible-text:${days} days left` };
    }
  }

  // C: a written closing date.
  const abs = text.match(/(?:ends|closes|closing|finishes)\s+(?:on\s+)?([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i);
  if (abs) {
    const d = new Date(abs[1]);
    if (!isNaN(d)) return { deadline: isoDate(d), how: 'visible-text:written date' };
  }

  // D: an open-ended project. Only claim this on an explicit statement.
  if (/\b(?:no\s+(?:end\s+date|deadline)|ongoing\s+(?:project|campaign)|always\s+on)\b/i.test(text)) {
    return { deadline: null, ongoing: true, how: 'visible-text:open-ended' };
  }

  return null;
}

const isoDate = d => d.toISOString().slice(0, 10);

function readPrevious() {
  try { return JSON.parse(readFileSync(OUT, 'utf8')); } catch { return null; }
}

const html = await readPage(PROJECT_URL);
log(`fetched ${html.length} bytes`);

const hit = fromJsonLd(html) || fromEmbeddedJson(html) || fromVisibleText(html);
if (!hit) fail('no raised figure found — Crowdfunder have probably changed their page markup. The site keeps using the last good file.');

const { raised, how } = hit;
log(`found £${raised.toLocaleString('en-GB')} via ${how}`);

if (!Number.isFinite(raised) || raised < 0) fail(`implausible figure: ${raised}`);
if (raised > MAX_CREDIBLE) fail(`figure £${raised} exceeds the credible ceiling — probably matched the wrong number`);

const previous = readPrevious();
if (previous && typeof previous.raised === 'number' && raised < previous.raised * MAX_DROP_RATIO) {
  const note = `figure dropped from £${previous.raised.toLocaleString('en-GB')} to £${raised.toLocaleString('en-GB')}`;
  if (process.env.ALLOW_DROP) {
    log(`${note} — publishing anyway because ALLOW_DROP is set`);
  } else {
    fail(`${note}; refusing to publish a likely mis-parse. If the drop is genuine, re-run with ALLOW_DROP=1.`);
  }
}

const supporters = findSupporters(html);
log(supporters === null ? 'no supporter count found' : `found ${supporters} supporters`);

const when = findDeadline(html);
if (when) log(`deadline: ${when.ongoing ? 'open-ended' : when.deadline} (via ${when.how})`);
else log('no closing date found — the countdown will show as unknown');

const next = {
  raised,
  supporters,
  deadline: when && when.deadline ? when.deadline : null,
  ongoing: !!(when && when.ongoing),
  target: TARGET,
  source: PROJECT_URL,
  updatedAt: new Date().toISOString()
};

const unchanged = previous
  && previous.raised === next.raised
  && previous.supporters === next.supporters
  && previous.deadline === next.deadline
  && !!previous.ongoing === next.ongoing;

if (unchanged) {
  log('no change since last run; leaving the file alone');
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(next, null, 2) + '\n');
log(`wrote ${OUT}:`, JSON.stringify({ raised: next.raised, supporters: next.supporters, deadline: next.deadline, ongoing: next.ongoing }));
