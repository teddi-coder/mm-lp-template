# Pipeline Architecture — Confirmed State

Updated 2026-05-20. Documents the confirmed end-to-end architecture after
audit of both `mm-lp-brief-form` and `mm-lp-template` repos.

---

## Cloudways — Not part of this pipeline

There is no Cloudways deploy step and there should not be one.

Cloudflare Pages IS the live hosting environment for all per-client landing pages.
Both repos were audited on 2026-05-20 — zero references to Cloudways were found
anywhere in source files, docs, or config.

---

## Confirmed pipeline architecture

```
Form submit (mm-brief.mechanicmarketing.co)
  → POST to Cloudflare Worker (mm-lp-pipeline.calm-thunder-d72d.workers.dev)
  → KV lookup (CLIENT_CONFIGS, key: client:{clientSlug})
  → Claude API copy generation (single call, all sections)
  → HTML template population (build-page.js)
  → GitHub: create/use per-client repo (teddi-coder/mm-lp-{clientSlug})
  → GitHub: create branch (lp/{clientSlug}/{serviceSlug}-{suburbSlug})
  → GitHub: commit populated HTML
  → GitHub: open PR
  → Slack notification (preview URL + PR link)
  → Manual: review preview, upload images, add conversion tags, merge PR
  → Cloudflare Pages: auto-deploy on merge to main (preview URLs on branches)
```

Per-client repos are **private** and created automatically on first form submission.
Cloudflare Pages projects must be **manually connected** to each per-client repo
after the pipeline creates it (Cloudflare Pages dashboard → Create project →
Connect to Git → select teddi-coder/mm-lp-{clientSlug}).

---

## End-to-end test plan

Blocked until the two fixes in `mm-lp-brief-form/INFRA-FIXES.md` are complete:
- KV slug corrected to `noranda-service-centre`
- `mm-brief.mechanicmarketing.co` DNS record live

### Test data

| Field | Value |
|---|---|
| Client | Noranda Service Centre |
| Slug | noranda-service-centre |
| Primary service | Log Book Servicing |
| Suburb | Mirrabooka |
| GA4 Measurement ID | G-8TCTK7X0SF |

### Expected pipeline trace

1. Navigate to `mm-brief.mechanicmarketing.co`
2. Select "Returning client" → choose Noranda Service Centre from dropdown
3. Fill campaign fields: service = Log Book Servicing, suburb = Mirrabooka
4. Submit → Worker processes in ~3 minutes
5. Slack notification arrives with:
   - Preview URL: `https://lp-noranda-service-centre-log-book-servicing-mirrabooka.mm-lp-noranda-service-centre.pages.dev`
   - PR URL: `https://github.com/teddi-coder/mm-lp-noranda-service-centre/pulls`
6. PR file: `log-book-servicing-mirrabooka.html`
7. Verify all template `{{TOKEN}}` placeholders are replaced (zero remaining)
8. Check Slack notification contains no error markers

### Post-test manual steps (do not merge the test PR — it is for testing only)

- Confirm GA4 ID `G-8TCTK7X0SF` appears in `thank-you.html` after Brief 3 is merged
- Close the test PR without merging
