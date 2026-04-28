export async function notifySlack(data, env) {
  const { success } = data;

  const text = success
    ? formatSuccess(data)
    : formatFailure(data);

  await fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

function formatSuccess({ workshopName, primaryService, suburb, serviceSlug, suburbSlug, previewUrl, prUrl }) {
  return `✅ *New landing page ready for review*

*Client:* ${workshopName}
*Page:* ${primaryService} — ${suburb}
*Branch:* \`lp/${serviceSlug}-${suburbSlug}\`

🔍 *Preview:* ${previewUrl}
🔀 *Pull Request:* ${prUrl}

*Before merging, check the PR checklist:*
• Upload logo + hero image to the repo
• Add GA4 + Google Ads conversion tags to thank-you.html
• Review copy on the preview URL
• Check mobile layout

Merge the PR to push live.`;
}

function formatFailure({ workshopName, primaryService, suburb, stepName, errorMessage }) {
  return `❌ *Landing page automation failed*

*Client:* ${workshopName} (${primaryService} — ${suburb})
*Failed at step:* \`${stepName}\`
*Error:* ${errorMessage}

The form submission data has been logged. Fix the issue and re-submit the form, or build manually using the workflow doc.`;
}
