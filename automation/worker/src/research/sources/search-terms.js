// GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
// GOOGLE_ADS_REFRESH_TOKEN — all as Cloudflare Worker secrets if this module is used
// For now: if no customer ID, return [] immediately

export async function fetchSearchTerms(googleAdsCustomerId) {
  if (!googleAdsCustomerId) return [];

  // TODO: implement Google Ads search terms report pull (last 90 days, top 50 by impressions)
  // Requires: Google Ads REST API with OAuth token (GAQL via reportingService)
  // Query:
  //   SELECT search_term_view.search_term, metrics.impressions, metrics.clicks
  //   FROM search_term_view
  //   WHERE segments.date DURING LAST_90_DAYS
  //   ORDER BY metrics.impressions DESC
  //   LIMIT 50
  // Return array of search term strings only (strip metrics)
  // See: https://developers.google.com/google-ads/api/docs/reporting/overview
  //
  // Note: mm-google-ads-autopilot uses the hedgehog-campaign-builder MCP for data pulls,
  // not a direct REST client — a direct REST implementation is needed here.
  console.log('fetchSearchTerms: Google Ads integration not yet implemented — returning []');
  return [];
}
