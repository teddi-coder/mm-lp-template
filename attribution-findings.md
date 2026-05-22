# UTM Attribution Diagnostic — MM LP Template
**Branch:** `explore/utm-attribution`
**Date:** 2026-05-22
**Scope:** Hero B inline quote form, `index.html` + `assets/js/main.js` + `automation/worker/`

---

## Step 1 — Form Submission Target

**Form location:** Block 5, `index.html` lines 192–218. The block is live (not commented out in the template).

```html
<form
  id="contact"
  action="#"
  method="POST"
  class="hero-form"
>
```

- `action="#"` — this is a placeholder. The template comment on line 191 reads:
  `<!-- TALLY: Replace action="#" with your Tally form URL, or use Tally's embed script -->`
- There is **no `fetch` or `XMLHttpRequest`** anywhere in `main.js`. The submit handler does
  client-side validation only (name + phone), then allows the native browser POST to fire.
- `main.js` does not intercept the submit or redirect it. If validation passes, the browser
  POSTs to `action="#"` — which means the form posts back to the current URL with form data
  appended as a query string (GET behaviour) or reloads the page (POST to `#` is a no-op
  in most browsers and silently drops the data).
- `build-page.js` does not inject a real `action` URL anywhere in its template replacements.
  There is no `replaceAll(html, 'action="#"', ...)` call. The `action="#"` placeholder ships
  to production unchanged for every client.

**Submission path:** Form → native browser POST to `action="#"` → data silently discarded.

---

## Step 2 — UTM Param Handling in JS

```
grep -rn "utm|URLSearchParams|location.search|location.href" assets/js/
```

**Result: ZERO MATCHES.**

There is no code anywhere in `assets/js/` that:
- Reads UTM params from the URL
- Stores them in sessionStorage or localStorage
- Injects them into hidden form fields
- Forwards them with a fetch/XHR submission

---

## Step 3 — Deployed Noranda Page Attribution Check

The live URL `https://services.mechanicsnoranda.com.au/` returns a **WordPress + Elementor**
site, not a Cloudflare Pages deployment of the mm-lp-template. This is the client's existing
main website, not the LP pipeline output.

**Attribution handling on the deployed site:**

The page includes a `$wc_leads` JavaScript snippet that captures `location.search` for
WhatConverts lead tracking:

```js
var $wc_leads = $wc_leads || {
  doc: {
    url: $wc_load(document.URL),
    ref: $wc_load(document.referrer),
    search: $wc_load(location.search)
  }
};
```

This captures `location.search` (which includes UTM params) at page load for WhatConverts'
own session tracking — but it has no connection to the Hero B form's hidden fields. It does
not inject UTMs into the form payload.

**Hidden inputs on the deployed form:** None found. No `<input type="hidden">` elements
containing `utm_source`, `utm_medium`, `utm_campaign`, or any attribution data.

**Conclusion:** The deployed Noranda site is architecturally separate from the mm-lp-template.
The LP pipeline has never shipped a production build for this client that is live on this URL.
The `$wc_leads` tracking is a WhatConverts plugin on the WordPress site and does not help the
mm-lp-template form.

---

## Step 4 — Submission Path Trace

**Worker directory:** `automation/worker/` — this is the **LP pipeline automation worker**
(generates copy, builds pages, commits to GitHub). It is NOT a form submission receiver.

The worker routes are:
- `GET /clients` — list KV-stored client configs
- `GET /clients/:slug` — retrieve a client config
- `POST /clients/:slug` — save/update a client config (requires `X-MM-Secret` header)
- `POST /` — trigger the copy generation + build + GitHub commit + Slack notify pipeline

None of these routes receive form submissions from a visitor on an LP. There is no
`/submit`, `/lead`, `/contact`, or `/quote` route in `index.js`.

**Full submission path (current state):**

```
Visitor fills Hero B form
  → clicks "Get a Free Quote"
  → main.js validates name + phone fields
  → if valid: browser POSTs to action="#"
  → data is discarded (no server-side handler exists for this form)
  → page reloads / scrolls to top
  → UTMs in the URL query string are never read, never injected, never sent anywhere
```

There is no Worker, Supabase edge function, or third-party handler that receives this form.

---

## Step 5 — Cloudflare KV Client Config

**KV namespace binding:** `CLIENT_CONFIGS` (namespace ID `4254ed917fc245368ae5e57ea279aaf1`)

```
wrangler kv key get --binding CLIENT_CONFIGS noranda
```

**Result:** `Value not found`

No KV config exists for the `noranda` slug. The `extractStaticConfig()` function in
`client-config.js` defines the fields that would be stored:
`workshopName`, `phoneDisplay`, `phoneE164`, `address`, `clientDomain`, `ga4MeasurementId`,
`gadsConversionLabel`, brand colours/fonts, etc.

None of these fields touch form submission handling or UTM attribution. The KV store is used
exclusively by the automation pipeline (copy generation side), not by the served HTML.

---

## 1. Current State

The Hero B form in the mm-lp-template:
- Has `action="#"` (placeholder, never replaced by `build-page.js`)
- Collects `name`, `phone`, `message` fields only
- Has no hidden attribution fields
- Has no JS that reads UTM params from the URL
- Submits to nothing — the form POST is silently dropped

When a visitor lands from Google Ads with
`?utm_source=google&utm_medium=cpc&utm_campaign=noranda-brakes`, those params exist only in
the browser URL bar. They are never read, stored, or forwarded. When the form is submitted,
zero attribution data travels with the lead.

---

## 2. Root Cause

There are three compounding causes:

**A. No form submission handler exists.**
`action="#"` is a placeholder left by the template. `build-page.js` does not replace it with
a real endpoint. There is no Cloudflare Worker route, Supabase function, Tally form, or other
receiver listening for form POSTs from the LP. The form fires and the data disappears.

**B. No UTM capture code exists.**
`main.js` contains only scroll observation and field validation. There is no `URLSearchParams`
call, no sessionStorage read/write, and no hidden field injection anywhere in the JS.

**C. The pipeline automation worker is unrelated to lead handling.**
The `automation/worker/` is a build tool, not a form receiver. Its routes are all
pipeline-internal (copy generation, GitHub commits, Slack). There is no `/lead` or `/quote`
endpoint.

---

## 3. Gap List

| # | Where | What is missing |
|---|-------|-----------------|
| 1 | `index.html` | `action="#"` is never replaced — no submission endpoint |
| 2 | `index.html` | No hidden fields for `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` |
| 3 | `assets/js/main.js` | No code to read `location.search` and populate hidden UTM fields on page load |
| 4 | `assets/js/main.js` | No sessionStorage fallback to survive cross-page navigations (e.g. user bounces to /thank-you) |
| 5 | `build-page.js` | No injection of a real form action URL from `formData` (e.g. `formData.formEndpointUrl`) |
| 6 | `automation/worker/index.js` | No `/lead` route exists to receive the form POST |
| 7 | `client-config.js` / KV schema | `extractStaticConfig()` has no `formEndpointUrl` or `formProvider` field |
| 8 | `thank-you.html` | GA4 conversion tag exists but will never fire because the form never reaches thank-you |

---

## 4. Recommended Fix (minimum viable, per gap)

These are directions only — no implementation.

**Gap 1 — Form endpoint**
Two viable paths:

- Path A (Tally): Per the existing template comment, replace `action="#"` with the client's
  Tally form URL. Add `formTallyUrl` to `extractStaticConfig()` in `client-config.js` and a
  corresponding `replaceAll(html, 'action="#"', formData.formTallyUrl)` line in `build-page.js`.
  Tally natively captures referrer and can store hidden fields passed via URL params.

- Path B (native Worker endpoint): Add a `/lead` POST route to `automation/worker/index.js`
  that accepts `{name, phone, message, utm_source, utm_medium, utm_campaign, utm_content, utm_term}`
  and writes to a Supabase table or sends a Slack notification. Update `action="#"` template
  placeholder to `action="{{FORM_ENDPOINT_URL}}"`.

**Gap 2 + 3 — UTM hidden fields and JS capture (~25 lines in main.js)**
Add a third IIFE to `main.js` that:
1. Reads `location.search` with `URLSearchParams` on page load
2. Stores the five UTM params in `sessionStorage` (so they survive if the user navigates
   before submitting)
3. On form submit, reads from `sessionStorage` and injects the values into hidden `<input>`
   fields before the POST fires

The hidden fields need to be pre-present in `index.html`:
```html
<input type="hidden" name="utm_source">
<input type="hidden" name="utm_medium">
<input type="hidden" name="utm_campaign">
<input type="hidden" name="utm_content">
<input type="hidden" name="utm_term">
```

**Gap 4 — sessionStorage fallback**
Covered by the sessionStorage approach in Gap 3. Write on first page load;
read back on submit.

**Gap 5 — build-page.js injection**
One `replaceAll` line per chosen path (Tally URL or Worker endpoint URL). Estimated 1–3 lines.

**Gap 6 — Worker /lead route**
If going Path B: add ~30 lines to `automation/worker/index.js` for the new POST route.
Requires adding `formEndpointUrl` to KV schema.

**Gap 7 — KV schema**
Add `formEndpointUrl` and optionally `formProvider: 'tally' | 'worker'` to
`extractStaticConfig()` in `client-config.js`. ~2 lines.

**Gap 8 — Thank-you conversion**
Already wired (`gadsConversionLabel` in `build-page.js`). Will start working once the form
submission path is fixed and actually lands on `/thank-you`.

---

## 5. Template-wide vs Per-Client Question

**Recommendation: bake UTM capture into `main.js` for all clients, make the form endpoint configurable.**

**Rationale:**

The UTM capture JS (Gap 3) is pure read-from-URL, write-to-hidden-fields logic with zero
client-specific knowledge. It costs nothing to run on a Tally client and is essential on a
native-form client. It should be in `main.js` unconditionally.

The form endpoint (Gap 1) is where the per-client split matters:

| Client type | Form approach | What build-page.js injects |
|-------------|---------------|---------------------------|
| Native form clients (6 of 8 LP clients currently) | Worker `/lead` endpoint or a shared Supabase function URL | `action="{{FORM_ENDPOINT_URL}}"` from KV config |
| Tally embed clients | Tally iframe or redirect URL | `action="{{FORM_TALLY_URL}}"` from KV config, or swap the entire form block |

The cleanest approach for 8 clients is a single `formProvider` field in the KV config
(`'tally'` or `'native'`) and a corresponding `formEndpointUrl`. `build-page.js` uses
`formProvider` to decide which template swap to apply. Clients using Tally still get the
hidden UTM fields pre-injected by `main.js` — Tally can forward them as hidden fields via
its `?tally-fields=utm_source,utm_medium...` URL approach.

The alternative — maintaining two separate template variants — creates drift risk across
8 clients every time the template is updated. One parameterised template with a configurable
endpoint is the safer long-term choice.
