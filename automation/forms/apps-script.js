// MM Landing Page Pipeline — Google Apps Script trigger
// Paste this into the Google Form's Apps Script editor (Extensions → Apps Script)
// Set up an onFormSubmit trigger: Triggers → Add Trigger → onFormSubmit → Form submit

const WORKER_URL = '[WORKER_URL]'; // Replace after deploying the Cloudflare Worker
const MM_SECRET = '[SECRET]';      // Replace with the same secret set in wrangler secret put MM_WEBHOOK_SECRET

function onFormSubmit(e) {
  const formData = parseFormResponse(e.response);

  const options = {
    method: 'POST',
    contentType: 'application/json',
    headers: { 'X-MM-Secret': MM_SECRET },
    payload: JSON.stringify(formData),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(WORKER_URL, options);
    Logger.log('Pipeline response: ' + response.getContentText());
  } catch (err) {
    Logger.log('Pipeline error: ' + err.message);
  }
}

function parseFormResponse(response) {
  const items = response.getItemResponses();
  const raw = {};
  for (const item of items) {
    raw[item.getItem().getTitle()] = item.getResponse();
  }

  const phoneDisplay = raw['Phone number'] || '';

  return {
    workshopName:       raw['Workshop name'] || '',
    tradingName:        raw['Trading name (if different)'] || raw['Workshop name'] || '',
    phoneDisplay:       phoneDisplay,
    phoneE164:          toE164(phoneDisplay),
    address:            raw['Address'] || '',
    clientDomain:       raw['Client domain'] || '',
    clientSlug:         toSlug(raw['Client slug'] || raw['Workshop name'] || ''),
    primaryService:     raw['Primary service'] || '',
    supportingServices: raw['Supporting services'] || '',
    suburb:             raw['Target suburb'] || '',
    serviceAreaRadius:  raw['Service area radius'] || '',
    keywordTheme:       raw['Google Ads keyword theme'] || '',
    reviewCount:        raw['Google review count'] || '',
    reviewRating:       raw['Google review rating'] || '',
    yearsInBusiness:    raw['Years in business'] || '',
    certification:      raw['Certification / award'] || '',
    jobsCompleted:      raw['Jobs/cars completed'] || '',
    sellingPoints: [
      raw['Key selling point 1'] || '',
      raw['Key selling point 2'] || '',
      raw['Key selling point 3'] || '',
      raw['Key selling point 4'] || '',
      raw['Key selling point 5'] || '',
    ].filter(Boolean),
    offer:              raw['Offer / hook'] || 'none',
    ctaPreference:      (raw['CTA preference'] || 'call').toLowerCase(),
    ga4MeasurementId:   raw['GA4 Measurement ID'] || '',
    brandPrimary:       raw['Brand primary colour'] || '#CC0000',
    brandSecondary:     raw['Brand secondary colour'] || '#1A1A2E',
    brandAccent:        raw['Brand accent colour'] || '#F5A623',
    brandBg:            raw['Brand background colour'] || '#F8F8F8',
    brandText:          raw['Brand text colour'] || '#1A1A1A',
    fontHeading:        raw['Heading font name'] || 'Barlow Condensed',
    fontBody:           raw['Body font name'] || 'Inter',
    mapsEmbedUrl:       raw['Google Maps embed URL'] || '',
    mapsLink:           raw['Google Maps link'] || '',
  };
}

function toE164(display) {
  const digits = display.replace(/\D/g, '');
  if (!digits) return '';
  return '+61' + digits.slice(1);
}

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
