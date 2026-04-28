# Mechanic Marketing — Client Landing Page Template

This is the master template for all Mechanic Marketing client Google Ads landing pages. Every new client gets a copy of this folder, renamed and filled in. Do not edit this template directly for a live client — always duplicate it first.

---

## How to use this template — 8 steps

### Step 1 — Clone and rename for a new client

Duplicate the entire `mm-lp-template` folder. Rename the copy using the client's slug — lowercase, no spaces, hyphens only. Example: `smiths-auto-service`.

In VS Code: right-click the folder in the Explorer panel and choose Duplicate, then rename it.

---

### Step 2 — Find blocks using the HTML comments

Open `index.html`. Every section is wrapped in a comment block like this:

```
<!-- ============================================================
     BLOCK: [BLOCK NAME]
     EDIT: [what to change]
     ============================================================ -->
```

Use VS Code's Find (`Cmd+F`) to search for `BLOCK:` and jump between sections. The `EDIT:` line in each comment tells you exactly what to change.

---

### Step 3 — What to edit in each block

| Block | What to change |
|---|---|
| 1 — Head/Meta | Page title, meta description, GA4 ID, canonical URL |
| 2 — Header | Workshop name or logo image, phone number |
| 3 — Hero A (call) | H1 headline, subheadline, body copy, phone number, hero image path |
| 4 — Hero B (form) | Same as A, plus Tally form URL and form fields — uncomment to use |
| 5 — Trust Bar | Review count, star rating, years experience, certification, jobs count |
| 6 — Services | Section headline, card names and descriptions (3–6 cards) |
| 7 — Why Choose Us | Section headline, selling point labels and descriptions (3–5 items) |
| 8 — Mid-page CTA | Headline, supporting line, phone number |
| 9 — About | Workshop name, suburb, 2–3 paragraphs, optional team photo path |
| 10 — FAQ | Section headline, 5–7 questions and answers |
| 11 — Service Area | Primary suburb, suburb list, Google Maps embed URL |
| 12 — Footer CTA | Headline, supporting line, CTA button |
| 13 — Footer | Workshop name, address, phone, ABN, nav links, copyright year |

Also update `thank-you.html` — it has its own header and footer with the same placeholders.

---

### Step 4 — How to add client images

Create a subfolder inside `assets/images/` named after the client's slug. Example: `assets/images/smiths-auto-service/`.

Put images in that folder. The template references two images:

- `assets/images/[clientslug]/hero.jpg` — hero section image (recommended: 1200x800px, JPG, under 200KB)
- `assets/images/[clientslug]/team.jpg` — about section team/workshop photo (recommended: 900x600px, JPG, under 200KB)

Replace `[clientslug]` in both `index.html` and `thank-you.html` with the actual folder name.

If no image is available yet, the hero image container shows the brand primary colour as a fallback background. The about section image container collapses automatically if the `<img>` tag is removed.

See `assets/images/placeholder/README.md` for more detail on image requirements.

---

### Step 5 — How to swap client brand colours and fonts

Open `assets/css/style.css`. At the very top of the file is a `:root { }` block — this is the only place you need to edit for a full rebrand.

Change these variables to match the client's brand:

```css
:root {
  --brand-primary: #CC0000;       /* main brand colour */
  --brand-secondary: #1A1A2E;     /* dark background colour */
  --brand-accent: #F5A623;        /* accent colour */
  --brand-bg: #F8F8F8;            /* page background */
  --brand-text: #1A1A1A;          /* body text colour */
  --brand-text-light: #FFFFFF;    /* text on dark backgrounds */

  --font-heading: 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif;
  --font-body: 'Inter', Arial, sans-serif;
}
```

Do not change any colours anywhere else in the CSS file — every colour in the stylesheet references these variables, so editing only the `:root` block is all it takes to restyle the entire page.

If the client has custom brand fonts, see `assets/fonts/README.md`.

---

### Step 6 — Swap between Hero A (call) and Hero B (form)

By default, Hero Variant A (call button) is shown. If the client's landing page should capture leads via a form instead:

1. In `index.html`, find Block 3 (Hero A) and wrap the entire section in `<!-- ... -->` to comment it out.
2. Find Block 4 (Hero B) — it is already commented out. Remove the comment markers to show it.
3. Replace the `action="#"` on the form with the client's Tally.so form URL.
4. In Tally, set the redirect after submission to `thank-you.html` (the full URL for the deployed page).

---

### Step 7 — Push and deploy to Cloudflare Pages

1. In VS Code, open the Terminal (`Ctrl+`` `).
2. Run `git add .` then `git commit -m "Add [client name] landing page"`.
3. Push to GitHub: `git push`.
4. In Cloudflare Pages, the site will redeploy automatically if you have the repo connected. If not, log in to Cloudflare > Pages > your project > Deployments > Trigger deployment.
5. Verify the live URL, then set up the custom domain if required.

---

### Step 8 — Update a live page

Make your edits in VS Code, save, then commit and push exactly as in Step 7. Cloudflare Pages redeploys automatically — typically live within 60 seconds.

If you need to preview changes before they go live, create a new Git branch for your edits. Cloudflare Pages creates a preview URL for every branch automatically.

---

## File structure

```
mm-lp-template/
  index.html                      — main landing page
  thank-you.html                  — post-form submission page
  assets/
    css/
      style.css                   — all styles, variables at the top
    js/
      main.js                     — mobile CTA bar + form validation only
    fonts/
      README.md                   — instructions for custom brand fonts
    images/
      placeholder/
        README.md                 — image naming, sizing, and format guide
```
