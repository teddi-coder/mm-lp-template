// Client config KV store — saves and retrieves static business/brand details
// so returning clients only need to fill in campaign fields

export async function saveClientConfig(slug, config, env) {
  await env.CLIENT_CONFIGS.put(`client:${slug}`, JSON.stringify(config));
}

export async function getClientConfig(slug, env) {
  const val = await env.CLIENT_CONFIGS.get(`client:${slug}`);
  return val ? JSON.parse(val) : null;
}

export async function listClients(env) {
  const list = await env.CLIENT_CONFIGS.list({ prefix: 'client:' });
  const clients = [];
  for (const key of list.keys) {
    const slug = key.name.replace('client:', '');
    const config = await getClientConfig(slug, env);
    if (config) clients.push({ slug, name: config.workshopName });
  }
  return clients;
}

// Extracts only the static fields that never change between campaigns
export function extractStaticConfig(formData) {
  return {
    workshopName:     formData.workshopName,
    tradingName:      formData.tradingName,
    phoneDisplay:     formData.phoneDisplay,
    phoneE164:        formData.phoneE164,
    address:          formData.address,
    clientDomain:     formData.clientDomain,
    clientSlug:       formData.clientSlug,
    mapsEmbedUrl:     formData.mapsEmbedUrl || '',
    mapsLink:         formData.mapsLink || '',
    ga4MeasurementId: formData.ga4MeasurementId,
    reviewCount:      formData.reviewCount,
    reviewRating:     formData.reviewRating,
    yearsInBusiness:  formData.yearsInBusiness,
    certification:    formData.certification || '',
    brandPrimary:     formData.brandPrimary,
    brandSecondary:   formData.brandSecondary,
    brandAccent:      formData.brandAccent,
    brandBg:          formData.brandBg,
    brandText:        formData.brandText,
    fontHeading:      formData.fontHeading,
    fontBody:         formData.fontBody,
  };
}
