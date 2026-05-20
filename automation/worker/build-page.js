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

  // ── SERVICE CHECKLIST ─────────────────────────────────────────────
  html = replaceAll(html, '[CHECKLIST_HEADLINE]', copy.checklistHeadline || '');
  // Build checklist <li> items from the raw CHECKLIST block (one item per line)
  const checklistLines = (copy.CHECKLIST || '').split('\n').map(l => l.trim()).filter(Boolean);
  const checklistHtml = checklistLines.length
    ? `<ul class="checklist-grid">\n${checklistLines.map(l => `      <li>${l}</li>`).join('\n')}\n    </ul>`
    : '';
  html = replaceAll(html, '{{CHECKLIST_ITEMS}}', checklistHtml);

  // ── BENEFIT CARDS ─────────────────────────────────────────────────
  html = replaceAll(html, '[BENEFITS_HEADLINE]', copy.benefitsHeadline || '');
  if (copy.benefitCards && copy.benefitCards.length) {
    const benefitCardsHtml = copy.benefitCards.map(card => `
      <div class="benefit-card">
        <h4>${card.name}</h4>
        <p>${card.description}</p>
      </div>`).join('\n');
    html = html.replace(
      /(<div class="benefits-grid[^>]*>)([\s\S]*?)(<\/div>\s*\n\s*<!-- Add or remove)/,
      (match, open, _inner, close) => `${open}\n${benefitCardsHtml}\n  ${close}`
    );
  }

  // ── HOW IT WORKS ──────────────────────────────────────────────────
  html = replaceAll(html, '[HOW_IT_WORKS_HEADLINE]', copy.howItWorksHeadline || '');
  // Build 3-step HTML from the raw HOW_IT_WORKS block
  // Format per step: "Headline\nOne sentence explanation" separated by blank lines
  const howBlocks = (copy.HOW_IT_WORKS || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  let howHtml = '';
  if (howBlocks.length >= 3) {
    const steps = howBlocks.slice(0, 3).map((block, i) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const label = lines[0] || `Step ${i + 1}`;
      const desc = lines.slice(1).join(' ') || '';
      return `      <div class="how-step">
        <span class="how-step__number">${i + 1}</span>
        <h3>${label}</h3>
        <p>${desc}</p>
      </div>`;
    });
    howHtml = steps[0] + '\n      <div class="how-step__connector" aria-hidden="true">→</div>\n' +
              steps[1] + '\n      <div class="how-step__connector" aria-hidden="true">→</div>\n' +
              steps[2];
  }
  html = replaceAll(html, '{{HOW_IT_WORKS_STEPS}}', howHtml);

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
  html = replaceAll(html, '{{ABOUT_PARAGRAPH}}', copy.ABOUT_PARAGRAPH || '');
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

  // ── REVIEWS ───────────────────────────────────────────────────────
  html = replaceAll(html, '[REVIEWS_HEADLINE]', copy.reviewsHeadline || '');
  // Build review cards from the raw REVIEWS block
  // Format per review: quote text, then "Name, Suburb" on next line, separated by blank lines
  const reviewBlocks = (copy.REVIEWS || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  let reviewsHtml = '';
  if (reviewBlocks.length >= 3) {
    reviewsHtml = '<div class="reviews-grid">\n' + reviewBlocks.slice(0, 3).map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const quoteText = lines[0] ? lines[0].replace(/^[""]|[""]$/g, '').trim() : '';
      const author = lines[1] || '';
      return `      <div class="review-card">
        <div class="review-stars" aria-label="5 stars">★★★★★</div>
        <blockquote class="review-text">"${quoteText}"</blockquote>
        <cite class="review-author">${author}</cite>
      </div>`;
    }).join('\n') + '\n    </div>';
  }
  html = replaceAll(html, '{{REVIEWS_BLOCK}}', reviewsHtml);

  // ── IMAGE ALT TEXT DEFAULTS ───────────────────────────────────────
  html = replaceAll(html, '{{LOGO_ALT}}', `${formData.workshopName} logo`);
  html = replaceAll(html, '{{HERO_IMAGE_ALT}}', `${formData.workshopName} — ${formData.primaryService || 'mechanic workshop'}`);
  html = replaceAll(html, '{{TEAM_IMAGE_ALT}}', `The team at ${formData.workshopName}`);

  // ── FOOTER CTA ────────────────────────────────────────────────────
  html = replaceAll(html, '[FOOTER_CTA_HEADLINE]', copy.footerCta.headline);
  html = replaceAll(html, '[FOOTER_CTA_SUPPORTING]', copy.footerCta.supporting);

  // ── THANK-YOU PAGE ────────────────────────────────────────────────
  const tyUrl = 'https://raw.githubusercontent.com/teddi-coder/mm-lp-template/main/thank-you.html';
  const tyResponse = await fetch(tyUrl);
  if (!tyResponse.ok) throw new Error(`Failed to fetch thank-you template: ${tyResponse.status}`);
  let tyHtml = await tyResponse.text();

  // Apply the same brand CSS injection
  tyHtml = tyHtml.replace(':root {', `:root {\n${cssVars}`);

  // Apply shared replacements
  tyHtml = replaceAll(tyHtml, '[WORKSHOP NAME]', formData.workshopName);
  tyHtml = replaceAll(tyHtml, 'tel:+61XXXXXXXXXX', `tel:${formData.phoneE164}`);
  tyHtml = replaceAll(tyHtml, '+61XXXXXXXXXX', formData.phoneE164);
  tyHtml = replaceAll(tyHtml, '[PHONE NUMBER]', formData.phoneDisplay);
  tyHtml = replaceAll(tyHtml, '[PHONE]', formData.phoneDisplay);
  tyHtml = replaceAll(tyHtml, '[SUBURB]', formData.suburb);
  tyHtml = replaceAll(tyHtml, '[ADDRESS]', formData.address);

  // GA4 + GAdS conversion tags
  tyHtml = replaceAll(tyHtml, '{{GA4_MEASUREMENT_ID}}', formData.ga4MeasurementId || 'GA_MEASUREMENT_ID');
  tyHtml = replaceAll(tyHtml, '{{GADS_CONVERSION_LABEL}}', formData.gadsConversionLabel || '');

  return { indexHtml: html, thankYouHtml: tyHtml };
}

function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}
