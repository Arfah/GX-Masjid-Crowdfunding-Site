# Gerrards Cross Masjid Project — campaign site

A single-page site for the £2m appeal to build a permanent masjid in Gerrards Cross.
Static HTML/CSS/JS — no build step, no dependencies, no framework. Open `index.html`
in a browser and it just works.

---

## ⚠️ Read this before you publish

The site ships with placeholder content. Four things **must** be replaced,
and a fifth **should** be checked.

### 1. The campaign numbers — `assets/js/site.js`

Everything numeric lives in one `CONFIG` block at the very top of the file:

```js
const CONFIG = {
  donateUrl:    'https://www.crowdfunder.co.uk/p/gerrards-cross-masjid-project',
  target:       2000000,
  raised:       null,   // ← SET THIS
  supporters:   null,   // ← SET THIS
  deadline:     null,   // ← SET THIS, format 'YYYY-MM-DD'
  currentPhase: 1,      // which of the four stages you're in (1–4)
  shareText:    '…'
};
```

While `raised` is `null`, the progress card shows an **orange "Set-up needed"
warning** instead of a figure. That is deliberate — it means the site can never
publish a made-up total. The warning vanishes the moment you put a real number in.

The site cannot read Crowdfunder automatically (Crowdfunder has no public API and
a static page can't scrape it), so `raised` and `supporters` are updated by hand.
Editing one line once a week is enough.

### 2. Contact email

Search the project for `REPLACE_ME@example.org` — it appears twice in `index.html`
(final call-to-action, and the footer).

### 3. Registered charity number

In the footer of `index.html`, `<span class="placeholder">REPLACE_ME</span>`.
If GXMA isn't a registered charity, delete that sentence rather than leaving it blank —
donors do check.

### 4. Facts in the copy that I could not verify

I had no access to your Crowdfunder page or gxma.org.uk when writing this, so the
narrative in **"The need"** and **"The vision"** is written from what is typical for a
community at this stage. Read those two sections and correct anything that isn't true
of Gerrards Cross specifically. In particular:

- "The need" cards — where Jumu'ah is currently held, whether people travel to
  Slough/Uxbridge/High Wycombe, whether there's a funeral provision gap.
- "The vision" — the list of facilities is an aspiration list. Cut anything that
  isn't in your actual plan.
- "What your money builds" — the amounts (£50 mat → £5,000 pillar) are plausible
  but they are **not costed from your quantity surveyor**. Replace with real
  costings, or soften the wording to "roughly".
- "The plan" — four generic stages. Set `currentPhase` honestly.

### 5. A share image (optional but worth it)

`assets/img/share-card.png` is referenced by the Open Graph tags but doesn't exist
yet. Until you add one, WhatsApp and Facebook links will show no preview image.
Make it 1200×630px with the headline and the £2m goal on it.

---

## Adding photographs

The design deliberately works with **zero photography** — it leans on typography,
colour and geometric pattern instead, because a half-empty photo grid looks worse
than none. When you do have images (the community at Jumu'ah, the site, an
architect's render), the natural places to drop them are:

- Beside the "The need" section, as a full-bleed band
- Replacing the icon tiles in "The vision"
- Above "The plan", as an architect's visual

Ask and I'll wire them in.

---

## Publishing

Pushing to `main` deploys automatically via `.github/workflows/deploy.yml`.

**One-time setup:** in the repo, go to **Settings → Pages → Build and deployment**
and set **Source: GitHub Actions**. The first push after that goes live at
`https://arfah.github.io/GX-Masjid-Crowdfunding-Site/`.

**Custom domain** (e.g. `appeal.gxma.org.uk`): add a file called `CNAME` at the repo
root containing just the domain, then point a DNS `CNAME` record at
`arfah.github.io`.

---

## Structure

```
index.html              all page content and copy
assets/css/style.css    all styling (design tokens at the top under :root)
assets/js/site.js       CONFIG block + progress bar, countdown, share, scroll reveal
assets/img/favicon.svg  browser tab icon
.github/workflows/      GitHub Pages deployment
```

## Notes on how it's built

- Every "Donate" button on the page is wired from `CONFIG.donateUrl` in JS, so
  changing the Crowdfunder link is a one-line change, not a find-and-replace.
- Colours are CSS custom properties at the top of `style.css` — change
  `--green-800` and `--gold` and the whole site re-themes.
- Accessibility: skip link, semantic landmarks, keyboard-operable nav, visible focus
  rings, and all motion disabled under `prefers-reduced-motion`.
- The sticky bottom donate bar appears on mobile once you scroll past the hero.
