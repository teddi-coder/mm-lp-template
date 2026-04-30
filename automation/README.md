# MM Landing Page Automation Pipeline

Google Form submission triggers a Cloudflare Worker that generates copy with Claude, populates the HTML template, commits it to a client-specific GitHub repo, opens a PR, and posts a Slack notification with a preview URL.

---

## Prerequisites

- Cloudflare account with Workers enabled
- `wrangler` CLI: `npm install -g wrangler`
- GitHub personal access token with `repo` scope
- Anthropic API key
- Slack Incoming Webhook URL (create one at api.slack.com/apps)

---

## 1. Deploy the Worker

```bash
cd automation/worker
wrangler login
wrangler deploy
```

Note the Worker URL printed at the end — you need it for the Apps Script setup.

---

## 2. Set secrets

Run each command below. You'll be prompted to paste the value — nothing is stored in the repo.

```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put GITHUB_TOKEN
wrangler secret put SLACK_WEBHOOK_URL
wrangler secret put MM_WEBHOOK_SECRET
```

`MM_WEBHOOK_SECRET` is any string you choose — use a password generator, 32+ characters. You'll put the same value in the Apps Script.

---

## 3. Set up the Google Form Apps Script trigger

1. Open the Google Form
2. Extensions → Apps Script
3. Paste the contents of `forms/apps-script.js`
4. Replace `[WORKER_URL]` with the Worker URL from step 1
5. Replace `[SECRET]` with the same value you set as `MM_WEBHOOK_SECRET`
6. Set up the trigger: click the clock icon (Triggers) → Add Trigger → Function: `onFormSubmit` → Event source: From form → Event type: On form submit
7. Save and authorise when prompted

---

## 4. Connect Cloudflare Pages (one-time per client)

Each client gets their own private repo (`mm-lp-{clientslug}`). The pipeline creates it automatically on the first form submission for that client.

To enable branch preview URLs:

1. Cloudflare Dashboard → Workers & Pages → Create application → Pages
2. Connect the `mm-lp-{clientslug}` GitHub repo
3. No build command needed — these are static HTML files
4. Deploy settings: output directory `/` (root), no build command

Branch preview URLs follow the pattern `https://lp-{service}-{suburb}.mm-lp-{clientslug}.pages.dev` and appear automatically in the Slack notification.

---

## 5. Test the pipeline

Submit a test form response and watch your Slack channel for the notification.

To test locally without submitting the form:

```bash
cd automation/worker
wrangler dev
```

Then POST a test payload:

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -H "X-MM-Secret: your-secret-here" \
  -d '{
    "workshopName": "Test Workshop",
    "primaryService": "Logbook Service",
    "suburb": "Norwood",
    "phoneDisplay": "08 8123 4567",
    "phoneE164": "+61881234567",
    "address": "123 Test St, Norwood SA 5067",
    "clientDomain": "testworkshop.com.au",
    "reviewCount": "247",
    "reviewRating": "4.9",
    "yearsInBusiness": "15",
    "certification": "RAA Approved",
    "sellingPoints": ["Same-day bookings", "All makes and models", "Genuine parts"],
    "ctaPreference": "call"
  }'
```

---

## 6. Google Form field names

These must match exactly — the Apps Script maps form question titles to the payload keys.

| Form question title | Notes |
|---|---|
| Workshop name | Legal entity name |
| Trading name (if different) | Leave blank if same as workshop name |
| Phone number | Display format, e.g. 08 8123 4567 |
| Address | Full street address including suburb and postcode |
| Client domain | e.g. smithsauto.com.au (no https://) |
| Client slug | Short URL-safe ID, e.g. smiths-auto. Auto-generated from workshop name if blank |
| Primary service | The main service this page targets, e.g. Logbook Service |
| Supporting services | Comma-separated list of additional services to include |
| Target suburb | The suburb the page targets, e.g. Norwood |
| Service area radius | e.g. 15km, or a list of suburbs |
| Google Ads keyword theme | The exact keyword theme from the campaign, e.g. "logbook service Norwood" |
| Google review count | Number only, e.g. 247 |
| Google review rating | Decimal, e.g. 4.9 |
| Years in business | Number only, e.g. 15 |
| Certification / award | e.g. RAA Approved Repairer, VACC Member |
| Jobs/cars completed | Optional. Number only if provided |
| Key selling point 1 | First selling point (required) |
| Key selling point 2 | Second selling point (required) |
| Key selling point 3 | Third selling point (required) |
| Key selling point 4 | Optional |
| Key selling point 5 | Optional |
| Offer / hook | e.g. "Free tyre check with every service" — or leave blank |
| CTA preference | Call only / Form only / Both |
| GA4 Measurement ID | e.g. G-XXXXXXXXXX — leave blank to fill in later |
| Brand primary colour | Hex code, e.g. #CC0000. Defaults to MM red if blank |
| Brand secondary colour | Hex code. Defaults to #1A1A2E |
| Brand accent colour | Hex code. Defaults to #F5A623 |
| Brand background colour | Hex code. Defaults to #F8F8F8 |
| Brand text colour | Hex code. Defaults to #1A1A1A |
| Heading font name | Google Fonts name, e.g. Barlow Condensed. Defaults to Barlow Condensed |
| Body font name | Google Fonts name, e.g. Inter. Defaults to Inter |
| Google Maps embed URL | From Google Maps → Share → Embed a map → copy src URL |
| Google Maps link | Direct link to the business on Google Maps |

---

## 7. Troubleshooting

**Worker errors:** Stream live logs with `wrangler tail` — shows each request and any unhandled exceptions.

**Apps Script errors:** Open the Apps Script editor → Executions (left sidebar) — shows the log output from each form submission trigger.

**GitHub API errors:** The Worker returns a 500 with the error message, which also posts to Slack. Common causes: token doesn't have `repo` scope, branch already exists (re-submission for same service + suburb combination).

**Copy parsing issues:** If Claude's response format changes, the `parseCopyResponse` function in `generate-copy.js` will need updating. Check the raw response in Worker logs to diagnose.

**Branch already exists:** If you re-submit for the same service + suburb combination, the GitHub branch creation will fail. Either delete the existing branch manually or change the service or suburb slightly.
