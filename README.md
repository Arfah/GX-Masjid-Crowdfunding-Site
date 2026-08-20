# Gerrards Cross Masjid Project — campaign site

A single-page site for the £2m appeal to build a permanent masjid in Gerrards Cross.
Static HTML/CSS/JS — no build step, no dependencies, no framework. Open `index.html`
in a browser and it just works.

---

## ⚠️ Read this before you publish

The site ships with placeholder content. Four things **must** be replaced,
and a fifth **should** be checked.

### 0. Automatic totals from Crowdfunder

The figures update themselves. `.github/workflows/update-campaign.yml` runs
twice an hour, reads the totals from your Crowdfunder page via
`scripts/fetch-campaign.mjs`, and commits them to `assets/data/campaign.json`.
The site reads that file in the browser. No manual editing.

> **Status: scraping does not work, and will not. The schedule is off.**
> Confirmed on 19 August 2026: Crowdfunder sit behind Cloudflare, which answers
> requests from GitHub Actions with a challenge page (`cf-mitigated: challenge`,
> "Just a moment...") rather than the project page. Browser headers were tried
> and make no difference — a challenge is not a user-agent check. Use the API or
> the manual route below.
>
> Historical detail follows. Crowdfunder's first response to this script was **HTTP 403** — the
> page never downloaded, so no parsing ran. The request now carries ordinary
> browser headers, and the script reports *why* it was refused rather than just
> that it was.
>
> Run it by hand (Actions → Update campaign totals → Run workflow) and read the
> log:
>
> - **Green** — it works. Re-add the `schedule:` block to the workflow.
> - **`-> looks like a Cloudflare challenge`** — the block is on the IP range,
>   not the user-agent. No header will get past it from GitHub Actions, and
>   scraping is a dead end. Use the manual route below, or the API.
> - **403 with no challenge markers** — something else is refusing us; send the
>   log and it can be diagnosed.
>
> `UA_MODE=bot` switches back to announcing ourselves plainly.
>
> The durable answer either way is the
> [Crowdfunder API beta](https://crowdfunder.co.uk/partners/crowdfunder-api-beta).
> Once granted, replace `readPage()` in `scripts/fetch-campaign.mjs` with an API
> call and everything downstream — the guards, the JSON file, the page — works
> unchanged. Worth applying for regardless of how the test above goes.
>
> The site is unaffected throughout: it serves the figures in
> `assets/data/campaign.json`, and editing those by hand takes about a minute.

### Updating the figures by hand (one minute, no software)

1. Open [`assets/data/campaign.json`](../../edit/main/assets/data/campaign.json) on GitHub
2. Click the pencil icon, change `raised` and `supporters`
3. Click **Commit changes**

The site redeploys itself and the new figures are live in about a minute. No
laptop, no git, no code — this works from a phone.

**Before you rely on the automation, run it once by hand.** Repo → Actions → "Update
campaign totals" → Run workflow. I could not test it against the real
Crowdfunder page (their site is unreachable from the machine this was built
on), so the very first run is the real test. If it goes green and the numbers
look right, you are done.

It updates four things on the card:

| Figure | Where it comes from |
| --- | --- |
| Raised | Scraped from the project page |
| Supporters | Scraped from the project page |
| Days left | Counted down in the browser from `deadline` in site.js — currently 15 October 2026. Needs nothing running |
| Still needed | Calculated in the browser as target minus raised |

If it goes red, the site is unaffected — it keeps serving the last good figures
— and the log will say which parsing strategy failed. For the raised total the
script tries three, in order: JSON-LD, embedded page state, then the visible
"£X raised" text. For the closing date it tries an explicit end date, then a
visible "N days left", then a written date such as "closes on 14 March 2027".

The closing date in `site.js` **overrides** anything the updater scrapes. A date
you have confirmed should not be at the mercy of a mis-read page. If you extend
the campaign on Crowdfunder, change it here too — or set `deadline: null` and
let the updater find it, in which case "Ongoing" is shown only when the page
explicitly says the appeal is open-ended, and an unknown date shows as a dash.

**Things that will eventually bite:**

- *Crowdfunder redesign their page.* The parser stops matching and the workflow
  goes red. The fix is a small edit to `scripts/fetch-campaign.mjs`.
- *GitHub disables the schedule.* Scheduled workflows are switched off
  automatically after 60 days without any repo activity. GitHub emails you.
  Re-enable it from the Actions tab.
- *Terms of service.* This reads your own project page as a visitor would.
  Crowdfunder run an [API in open beta](https://crowdfunder.co.uk/partners/crowdfunder-api-beta)
  — worth applying for, since an official feed cannot break the way scraping
  can. If you get access, replace `readPage()` in the script and nothing else
  changes.

To switch the automation off, set `liveDataUrl: null` in `assets/js/site.js`.
The site reverts to the manual figures below.

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

These values are the **fallback**. When the automatic updater above is working,
the figures it writes take over and these are only used if that file is missing
or unreadable. Keep them roughly current anyway — they are what visitors see if
the automation breaks.

### 2. Contact email — done

`m_razwan@outlook.com`, in the final call-to-action and the footer.

### 3. Registered charity number — done

1219279, in the footer.

### 3a. The Islamic Centre website — still outstanding

The old `gxma.org.uk` link has been removed from the footer. In its place is an
HTML comment marking where the real address goes:

```html
<!-- REMINDER: add the Islamic Centre website here once it is live, e.g.
     <a href="https://example.org" rel="noopener">example.org</a> -->
```

It is a comment rather than visible text on purpose — a "website coming soon"
line in the footer of a fundraising page reads as unfinished, and unfinished
costs donations. Uncomment it and fill in the address when the site exists.

### 4. Facts in the copy that I could not verify

I had no access to your Crowdfunder page when writing this, so the
narrative in **"The need"** and **"The vision"** is written from what is typical for a
community at this stage. Read those two sections and correct anything that isn't true
of Gerrards Cross specifically. In particular:

- "The need" — now rewritten so every claim follows from the one fact your own
  copy establishes: there is no masjid in Gerrards Cross. The earlier version
  named specific towns and described overcrowding; none of that was verified,
  and it has been removed.
- "The vision" — the list of facilities is an aspiration list, and the section
  says so. Cut anything that isn't in your actual plan.
- "What your money builds" — the amounts (£50 mat → £5,000 pillar) are plausible
  but they are **not costed from your quantity surveyor**. Replace with real
  costings, or soften the wording to "roughly".
- "The plan" — four generic stages. Set `currentPhase` honestly.

### 5. A share image (optional but worth it)

`assets/img/share-card.png` is referenced by the Open Graph tags but doesn't exist
yet. Until you add one, WhatsApp and Facebook links will show no preview image.
Make it 1200×630px with the headline and the £2m goal on it.

---

## The two images to add

You have one asset already — the concept banner from the Crowdfunder page. It
should become **two separate files**, because it is doing two different jobs.

**1. `assets/img/masjid-concept.jpg` — the architectural sketch, cropped out.**
Crop the banner down to just the drawing of the building (everything to the
right, above the dark green bar). Drop it in and it appears automatically at the
top of "The vision", matted in sand against the dark green. If the file is
missing the figure removes itself, so nothing breaks in the meantime.

Do **not** use the whole banner here. The banner carries its own title lockup,
its own four icon chips and its own "Donate today" bar — all three of which this
page already does at full size. Dropping it in mid-page gives you two headlines
and two donate bars, and reads like a poster pasted onto a website. The drawing
is the part the page doesn't have.

The banner's own "concept illustration" disclaimers may be cropped away — that's
fine, the figure caption underneath carries the same statement in words.

**2. `assets/img/share-card.png` — the whole banner, unchanged.**
This is what WhatsApp, Facebook and iMessage show when someone pastes the link.
A composite of title, artwork and call-to-action is exactly right for that job,
and duplication doesn't matter because it never appears on the page itself.
It's already wired up in the `og:image` tag.

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

The live site is **https://gx-masjid-crowdfunding.netlify.app/**, hosted on
Netlify. Pushing to `main` deploys it automatically — there is no build step, so
Netlify simply serves the repo root. Settings live in `netlify.toml`; the only
one worth knowing is that `assets/data/campaign.json` is served `no-cache`, so a
figures update is never held back by a stale browser cache.

GitHub Pages still builds from `.github/workflows/deploy.yml` and remains
reachable at `https://arfah.github.io/GX-Masjid-Crowdfunding-Site/`. It is a
spare, not the address to hand out. The `og:` tags and the `canonical` link in
`index.html` both name the Netlify URL, so shared links and search results point
at the live site regardless of which copy someone lands on. **If you ever change
the Netlify site name, change those three tags to match** — otherwise every
WhatsApp and Facebook share will keep advertising the old address. To retire the
Pages copy entirely, delete `.github/workflows/deploy.yml`.

**Custom domain** (e.g. `appeal.gxmasjid.org`): add it under **Domain management**
in the Netlify site settings and follow the DNS records it gives you. Netlify
issues the HTTPS certificate itself. Update the `og:` and `canonical` tags to the
new domain once it resolves.

---

## Structure

```
index.html              all page content and copy
assets/css/style.css    all styling (design tokens at the top under :root)
assets/js/site.js       CONFIG block + progress bar, countdown, share, scroll reveal
assets/img/favicon.svg  browser tab icon
netlify.toml            Netlify deployment settings (the live site)
.github/workflows/      GitHub Pages deployment + the campaign totals updater
```

## Notes on how it's built

- Every "Donate" button on the page is wired from `CONFIG.donateUrl` in JS, so
  changing the Crowdfunder link is a one-line change, not a find-and-replace.
- Colours are CSS custom properties at the top of `style.css` — change
  `--green-800` and `--gold` and the whole site re-themes.
- Accessibility: skip link, semantic landmarks, keyboard-operable nav, visible focus
  rings, and all motion disabled under `prefers-reduced-motion`.
- The sticky bottom donate bar appears on mobile once you scroll past the hero.

---

## Optional: self-host the fonts

The page currently loads Fraunces and Inter from Google Fonts. That works fine,
but self-hosting them is faster and means the site makes **no third-party
requests at all** — worth doing for a UK charity site. To switch:

1. Download the latin and latin-ext `woff2` files for both families.
2. Drop them in `assets/fonts/` and put the matching `@font-face` rules in
   `assets/css/fonts.css`.
3. In `index.html`, replace the three `fonts.googleapis.com` / `fonts.gstatic.com`
   lines with `<link rel="stylesheet" href="assets/css/fonts.css">`.

Ask and I'll do it.
