// GOOGLE_PLACES_API_KEY — Cloudflare Worker secret
// GET https://maps.googleapis.com/maps/api/place/details/json?place_id={id}&fields=reviews&key={key}

export async function fetchGbpReviews(placeIds) {
  const apiKey = typeof GOOGLE_PLACES_API_KEY !== 'undefined' ? GOOGLE_PLACES_API_KEY : process.env?.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn('fetchGbpReviews: GOOGLE_PLACES_API_KEY not set — skipping GBP reviews');
    return [];
  }

  const reviews = [];
  for (const placeId of placeIds.slice(0, 4)) { // max 4 place IDs (client + 3 competitors)
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.result?.reviews) {
        // Strip reviewer names, ratings, dates — return text only
        const texts = data.result.reviews
          .filter(r => r.text && r.text.trim().length > 20)
          .map(r => r.text.trim());
        reviews.push(...texts);
      }
    } catch (err) {
      console.warn(`fetchGbpReviews: failed for place ID ${placeId}:`, err.message);
      // Continue to next place ID
    }

    if (reviews.length >= 100) break; // cap at 100 total
  }

  return reviews.slice(0, 100);
}
