import { toSlug } from './index.js';

export async function buildPage(copy, formData, env) {
  const templateUrl = 'https://raw.githubusercontent.com/teddi-coder/mm-lp-template/main/index.html';
  const response = await fetch(templateUrl);
  if (!response.ok) throw new Error(`Failed to fetch template: ${response.status}`);
  let html = await response.text();

  // ── CSS VARIABLES ──────────────────────────────────────────────────
  const cssVars = `
  /* CLIENT BRAND — auto-injected by MM pipeline */
  --brand-primary: ${formData.brandPrimary || '#CC0000'};
  --brand-secondary: ${formData.brandSecondary || '#1A1A2E'};
  --brand-accent: ${formData.brandAccent || '#F5A623'};
  --brand-bg: ${formData.brandBg || '#F8F8F8'};
  --brand-text: ${formData.brandText || '#1A1A1A'};
  --brand-text-light: #FFFFFF;
  --font-heading: '${formData.fontHeading || 'Barlow Condensed'}', 'Arial Narrow', Arial, sans-serif;
  --font-body: '${formData.fontBody || 'Inter'}', Arial, sans-serif;`;
  html = html.replace(':root {', `:root {\n${cssVars}`);

  const clientSlug = formData.clientSlug || toSlug(formData.workshopName);
  const serviceSlug = toSlug(formData.primaryService);
  const suburbSlug = toSlug(formData.suburb);

  // ── META / HEAD ────────────────────────────────────────────────────
  html = html.replace(
    '[PRIMARY SERVICE] [SUBURB] | [WORKSHOP NAME]',
    `${formData.primaryService} ${formData.suburb} | ${formData.workshopName}`
  );
  html = replaceAll(html, '[META_DESCRIPTION]', copy.metaDescription);
  html = replaceAll(html, '[CANONICAL_URL]', `https://${formData.clientDomain}`);
  html = replaceAll(html, 'GA_MEASUREMENT_ID', formData.ga4MeasurementId || 'GA_MEASUREMENT_ID');

  // ── HEADER ─────────────────────────────────────────────────────────
  html = replaceAll(html, '[clientslug]/logo.png', `assets/images/${clientSlug}/logo.png`);
  html = replaceAll(html, '[WORKSHOP NAME]', formData.workshopName);
  // Phone — replace all tel: placeholders
  html = replaceAll(html, 'tel:+61XXXXXXXXXX', `tel:${formData.phoneE164}`);
  html = replaceAll(html, '+61XXXXXXXXXX', formData.phoneE164);
  html = replaceAll(html, '[PHONE NUMBER]', formData.phoneDisplay);
  html = replaceAll(html, '[PHONE]', formData.phoneDisplay);

  // ── HERO A ─────────────────────────────────────────────────────────
  // H1 — insert v1 with v2 in comment
  html = html.replace(
    /(<h1[^>]*>)([\s\S]*?)(<\/h1>)/,
    `$1${copy.heroHeadline.v1}<!-- HEADLINE VARIANT 2: ${copy.heroHeadline.v2} -->$3`
  );
  // Subheadline
  html = html.replace(
    /(<p class="hero__subheadline[^"]*">)([\s\S]*?)(<\/p>)/,
    `$1${copy.heroSubheadline.v1}<!-- SUBHEADLINE VARIANT 2: ${copy.heroSubheadline.v2} -->$3`
  );
  // Body copy
  html = html.replace(
    /(<p class="hero__body[^"]*">)([\s\S]*?)(<\/p>)/,
    `$1${copy.heroBody}$3`
  );
  // Hero image
  html = replaceAll(html, 'assets/images/[clientslug]/hero.jpg', `assets/images/${clientSlug}/hero.jpg`);

  // ── TRUST BAR ─────────────────────────────────────────────────────
  // Trust bar items are the 4 from formData, not from copy (trust bar is factual data)
  const trustItems = [
    { stat: formData.reviewCount || '500+', label: 'Five-Star Reviews' },
    { stat: (formData.reviewRating || '4.9') + '★', label: 'Google Rating' },
    { stat: (formData.yearsInBusiness || '10') + '+', label: 'Years Experience' },
    { stat: formData.certification || 'Licensed', label: 'Approved Repairer' },
  ];
  const trustBarHtml = trustItems.map(item => `
    <div class="trust-bar__item">
      <span class="trust-bar__stat">${item.stat}</span>
      <span class="trust-bar__label">${item.label}</span>
    </div>`).join('\n');
  html = html.replace(
    /(<div class="trust-bar[^>]*>)([\s\S]*?)(<\/div>\s*<!-- END BLOCK|<\/section>)/,
    (match, open, _inner, close) => `${open}\n${trustBarHtml}\n  ${close}`
  );

  // ── SERVICES ──────────────────────────────────────────────────────
  html = replaceAll(html, '[SERVICES_HEADLINE]', copy.servicesHeadline);
  const serviceCards = copy.services.map(svc => `
    <div class="services__card">
      <h4>${svc.name}</h4>
      <p>${svc.description}</p>
    </div>`).join('\n');
  html = html.replace(
    /(<div class="services__grid[^>]*>)([\s\S]*?)(<\/div>\s*\n\s*<p class="services-cta)/,
    (match, open, _inner, close) => `${open}\n${serviceCards}\n  ${close}`
  );

  // ── WHY CHOOSE US ─────────────────────────────────────────────────
  html = replaceAll(html, '[WHY_US_HEADLINE]', copy.whyUsHeadline);
  const whyUsItems = copy.whyUs.map(item => `
    <div class="why-us__item">
      <h4>${item.label}</h4>
      <p>${item.description}</p>
    </div>`).join('\n');
  html = html.replace(
    /(<div class="why-us__grid[^>]*>)([\s\S]*?)(<\/div>\s*\n\s*<\/section>)/,
    (match, open, _inner, close) => `${open}\n${whyUsItems}\n  ${close}`
  );

  // ── MID-PAGE CTA ──────────────────────────────────────────────────
  html = replaceAll(html, '[MID_CTA_HEADLINE]', copy.midPageCta.headline);
  html = replaceAll(html, '[MID_CTA_SUPPORTING]', copy.midPageCta.supporting);

  // ── ABOUT ─────────────────────────────────────────────────────────
  html = replaceAll(html, '[ABOUT_HEADLINE]', `${formData.workshopName} — ${formData.suburb}`);
  html = replaceAll(html, '[ABOUT_PARAGRAPH]', '[Add about copy here — describe the workshop, team, and local presence. 2–3 sentences.]');
  html = replaceAll(html, '[clientslug]/team.jpg', `assets/images/${clientSlug}/team.jpg`);

  // ── FAQ ───────────────────────────────────────────────────────────
  html = replaceAll(html, '[FAQ_HEADLINE]', copy.faqHeadline);
  const faqItems = copy.faq.map((item, i) => `
    <details${i === 0 ? ' open' : ''}>
      <summary>${item.question}</summary>
      <p>${item.answer}</p>
    </details>`).join('\n');
  html = html.replace(
    /(<div class="faq__list[^>]*>)([\s\S]*?)(<\/div>\s*\n\s*<\/section>)/,
    (match, open, _inner, close) => `${open}\n${faqItems}\n  ${close}`
  );

  // ── SERVICE AREA ──────────────────────────────────────────────────
  html = replaceAll(html, '[PRIMARY SUBURB]', formData.suburb.toUpperCase());
  html = replaceAll(html, '[SERVICE_AREA_PARAGRAPH]', copy.serviceAreaParagraph);
  html = replaceAll(html, '[GOOGLE_MAPS_EMBED_URL]', formData.mapsEmbedUrl || 'https://www.google.com/maps/embed?pb=REPLACE_THIS_WITH_CLIENT_EMBED_URL');
  html = replaceAll(html, '[GOOGLE_MAPS_LINK]', formData.mapsLink || '#');
  html = replaceAll(html, '[ADDRESS]', formData.address);

  // ── FOOTER CTA ────────────────────────────────────────────────────
  html = replaceAll(html, '[FOOTER_CTA_HEADLINE]', copy.footerCta.headline);
  html = replaceAll(html, '[FOOTER_CTA_SUPPORTING]', copy.footerCta.supporting);

  return html;
}

function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}
