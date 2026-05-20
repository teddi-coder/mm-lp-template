// GOOGLE_PLACES_API_KEY — add as a Cloudflare Worker secret (not a wrangler.toml var)
// Document in .env.example: GOOGLE_PLACES_API_KEY=

import { fetchGbpReviews } from './sources/gbp-reviews.js';
import { fetchSearchTerms } from './sources/search-terms.js';

export async function buyerSignals({ clientName, suburb, state, serviceCategory, gbpPlaceId, competitorPlaceIds = [], googleAdsCustomerId = null }) {
  // Guard: if no gbpPlaceId and no googleAdsCustomerId, return null immediately
  if (!gbpPlaceId && !googleAdsCustomerId) return null;

  try {
    // Collect signals in parallel
    const placeIds = [gbpPlaceId, ...competitorPlaceIds].filter(Boolean);
    const [reviewTexts, searchTerms] = await Promise.all([
      placeIds.length > 0 ? fetchGbpReviews(placeIds) : [],
      fetchSearchTerms(googleAdsCustomerId)
    ]);

    const allSignals = [...reviewTexts, ...searchTerms];
    if (allSignals.length === 0) return null;

    // Truncate to ~3000 tokens worth of signals (rough: 12000 chars ≈ 3000 tokens)
    const signalText = allSignals.join('\n').slice(0, 12000);

    // Use the Anthropic API directly via fetch (Cloudflare Worker pattern — no npm SDK)
    const apiKey = typeof ANTHROPIC_API_KEY !== 'undefined' ? ANTHROPIC_API_KEY : process.env?.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('buyerSignals: ANTHROPIC_API_KEY not available — skipping synthesis');
      return null;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a buyer research analyst for a local automotive workshop marketing campaign.

The business is: ${clientName}, a ${serviceCategory} workshop in ${suburb}, ${state}.

Below are real signals: customer reviews of this workshop and local competitors, plus search queries people used before booking. Analyse them and return ONLY a JSON object (no markdown, no preamble) with:
- painPoints: array of 5-7 pain points in the customer's own language
- objections: array of 3-5 objections customers have before booking
- voiceOfCustomer: array of 8-12 short phrases customers actually use
- awarenessStage: one of 'problem-aware', 'solution-aware', 'most-aware'
- topHooks: array of 5 headline or hook angles derived from these signals
- rawSignalSummary: 2-3 sentence plain-English summary

Signals:
${signalText}`
        }]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${body}`);
    }

    const data = await response.json();
    const rawText = data.content[0].text.trim();

    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('buyerSignals: JSON parse failed. Raw output:', rawText);
      return null;
    }

    // Log for pipeline review
    console.log('buyerSignals result:', JSON.stringify(result, null, 2));
    return result;

  } catch (err) {
    // Non-blocking — log and fall back to null
    console.error('buyerSignals: error (falling back to brief-only generation):', err.message);
    return null;
  }
}
