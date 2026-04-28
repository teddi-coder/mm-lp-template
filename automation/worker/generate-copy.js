// The MM copy prompt — imported at build time
// If you update prompts/copy-prompt.txt, copy the content here too
import COPY_PROMPT from '../prompts/copy-prompt.txt';

export async function generateCopy(formData, env) {
  const sellingPointsList = (formData.sellingPoints || [])
    .map((pt, i) => `${i + 1}. ${pt}`)
    .join('\n');

  const brief = `
**Business name:** ${formData.workshopName}
**Trading name (if different):** ${formData.tradingName || formData.workshopName}
**Phone number:** ${formData.phoneDisplay}
**Address:** ${formData.address}

**Primary service for this page:** ${formData.primaryService}
**Supporting services:** ${formData.supportingServices}
**Target suburb(s):** ${formData.suburb}
**Service area radius:** ${formData.serviceAreaRadius}
**Google Ads keyword theme:** ${formData.keywordTheme}

**Google reviews:** ${formData.reviewCount} reviews, ${formData.reviewRating} stars
**Years in business:** ${formData.yearsInBusiness}
**Certifications / awards:** ${formData.certification}
**Jobs/cars completed:** ${formData.jobsCompleted || 'not provided'}

**Key selling points:**
${sellingPointsList}

**Offer / hook:** ${formData.offer || 'none'}
**CTA preference:** ${formData.ctaPreference}
`.trim();

  const prompt = COPY_PROMPT.replace('## [BRIEF]', `## [BRIEF]\n\n${brief}`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const rawText = data.content[0].text;

  return parseCopyResponse(rawText);
}

function parseCopyResponse(text) {
  function extract(label) {
    const regex = new RegExp(`\\*\\*${label}\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*\\d+\\.|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  function extractVariants(label) {
    const block = extract(label);
    const lines = block.split('\n').map(l => l.replace(/^(Variant [AB]:|[12]\.|[-–—])\s*/i, '').trim()).filter(Boolean);
    return { v1: lines[0] || '', v2: lines[1] || '' };
  }

  function extractList(label) {
    const block = extract(label);
    return block.split('\n').map(l => l.replace(/^[-•*\d.]+\s*/, '').trim()).filter(Boolean);
  }

  function extractPairs(label) {
    const block = extract(label);
    const results = [];
    const lines = block.split('\n').filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const nameMatch = lines[i].match(/\*\*(.+?)\*\*/);
      if (nameMatch && lines[i + 1]) {
        results.push({ name: nameMatch[1].trim(), description: lines[i + 1].trim() });
        i++;
      } else if (nameMatch) {
        results.push({ name: nameMatch[1].trim(), description: '' });
      }
    }
    return results;
  }

  function extractSellingPoints(label) {
    const block = extract(label);
    const results = [];
    const lines = block.split('\n').filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const boldMatch = lines[i].match(/\*\*(.+?)\*\*/);
      if (boldMatch) {
        const labelText = boldMatch[1].trim();
        const desc = lines[i + 1] ? lines[i + 1].trim() : '';
        results.push({ label: labelText, description: desc });
        if (desc) i++;
      }
    }
    return results;
  }

  function extractMidCta(label) {
    const block = extract(label);
    const lines = block.split('\n').filter(Boolean);
    return {
      headline: (lines[0] || '').replace(/["""]/g, '').trim(),
      supporting: (lines[1] || '').replace(/["""]/g, '').trim(),
      buttonText: (lines[2] || '').replace(/[\[\]]/g, '').trim(),
    };
  }

  function extractFaq(label) {
    const block = extract(label);
    const results = [];
    const parts = block.split(/(?=\*\*Q[:\s])/i).filter(Boolean);
    for (const part of parts) {
      const qMatch = part.match(/\*\*Q[:\s]+(.+?)\*\*/i);
      const aMatch = part.match(/\*\*A[:\s]+\*\*([\s\S]+)/i) || part.match(/\*\*A[:\s]+([\s\S]+)/i);
      if (qMatch) {
        results.push({
          question: qMatch[1].trim(),
          answer: aMatch ? aMatch[1].trim() : '',
        });
      }
    }
    // Fallback: split by numbered items
    if (results.length === 0) {
      const numbered = block.split(/\n(?=\d+\.)/).filter(Boolean);
      for (const item of numbered) {
        const lines = item.split('\n').filter(Boolean);
        if (lines.length >= 2) {
          results.push({ question: lines[0].replace(/^\d+\.\s*/, '').trim(), answer: lines.slice(1).join(' ').trim() });
        }
      }
    }
    return results.slice(0, 6);
  }

  const trustItems = extractList('5. TRUST BAR ITEMS').slice(0, 4);
  const faqItems = extractFaq('12. FAQ ITEMS');
  const midCta = extractMidCta('10. MID-PAGE CTA STRIP');
  const footerCtaBlock = extract('14. FOOTER CTA');
  const footerLines = footerCtaBlock.split('\n').filter(Boolean);

  return {
    heroHeadline: extractVariants('1. HERO HEADLINE \\(H1\\)'),
    heroSubheadline: extractVariants('2. HERO SUBHEADLINE'),
    heroBody: extract('3. HERO BODY COPY'),
    heroCta: extract('4. HERO CTA TEXT'),
    trustBar: trustItems,
    servicesHeadline: extract('6. SERVICES SECTION HEADLINE'),
    services: extractPairs('7. SERVICE DESCRIPTIONS'),
    whyUsHeadline: extract('8. WHY CHOOSE US — SECTION HEADLINE'),
    whyUs: extractSellingPoints('9. WHY CHOOSE US — SELLING POINTS'),
    midPageCta: midCta,
    faqHeadline: extract('11. FAQ SECTION HEADLINE'),
    faq: faqItems,
    serviceAreaParagraph: extract('13. SERVICE AREA PARAGRAPH'),
    footerCta: {
      headline: (footerLines[0] || '').replace(/["""]/g, '').trim(),
      supporting: (footerLines[1] || '').replace(/["""]/g, '').trim(),
      buttonText: (footerLines[2] || '').replace(/[\[\]]/g, '').trim(),
    },
    metaTitle: extract('15. META TITLE'),
    metaDescription: extract('16. META DESCRIPTION'),
  };
}
