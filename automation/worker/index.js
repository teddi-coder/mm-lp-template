import { generateCopy } from './generate-copy.js';
import { buildPage } from './build-page.js';
import { commitToGitHub } from './github.js';
import { notifySlack } from './notify.js';
import { saveClientConfig, getClientConfig, listClients, extractStaticConfig } from './client-config.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-MM-Secret',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function text(body, status = 200) {
  return new Response(body, { status, headers: CORS });
}

function validateSecret(request, env) {
  const secret = request.headers.get('X-MM-Secret');
  if (secret !== env.MM_WEBHOOK_SECRET) {
    throw Object.assign(new Error('Unauthorised'), { status: 401 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // GET /clients — list all stored clients
    if (request.method === 'GET' && path === '/clients') {
      const clients = await listClients(env);
      return json({ clients });
    }

    // GET /clients/:slug — get a specific client config
    if (request.method === 'GET' && path.startsWith('/clients/')) {
      const slug = path.slice('/clients/'.length);
      const config = await getClientConfig(slug, env);
      if (!config) return text('Not found', 404);
      return json(config);
    }

    // POST /clients/:slug — save/update a client config
    if (request.method === 'POST' && path.startsWith('/clients/')) {
      try { validateSecret(request, env); } catch { return text('Unauthorised', 401); }
      const slug = path.slice('/clients/'.length);
      let config;
      try { config = await request.json(); } catch { return text('Invalid JSON body', 400); }
      await saveClientConfig(slug, config, env);
      return text('OK');
    }

    // POST / — pipeline trigger
    if (request.method === 'POST' && path === '/') {
      try { validateSecret(request, env); } catch { return text('Unauthorised', 401); }

      let formData;
      try { formData = await request.json(); } catch { return text('Invalid JSON body', 400); }

      let stepName = '';
      try {
        // Merge stored client config if returning client
        if (formData.useStoredConfig && formData.clientSlug) {
          const storedConfig = await getClientConfig(formData.clientSlug, env);
          if (storedConfig) {
            formData = { ...storedConfig, ...formData }; // campaign fields override stored
          }
        }

        // Always persist the static config so it stays current
        if (formData.clientSlug) {
          await saveClientConfig(formData.clientSlug, extractStaticConfig(formData), env);
        }

        stepName = 'generate-copy';
        const structuredCopy = await generateCopy(formData, env);

        stepName = 'build-page';
        const populatedHTML = await buildPage(structuredCopy, formData, env);

        stepName = 'commit-to-github';
        const { previewUrl, prUrl } = await commitToGitHub(populatedHTML, formData, env);

        stepName = 'notify-slack';
        await notifySlack({
          success: true,
          workshopName: formData.workshopName,
          primaryService: formData.primaryService,
          suburb: formData.suburb,
          serviceSlug: toSlug(formData.primaryService),
          suburbSlug: toSlug(formData.suburb),
          previewUrl,
          prUrl,
        }, env);

        return text('OK');
      } catch (err) {
        await notifySlack({
          success: false,
          workshopName: formData?.workshopName ?? 'Unknown',
          primaryService: formData?.primaryService ?? '',
          suburb: formData?.suburb ?? '',
          stepName,
          errorMessage: err.message,
        }, env);
        return text('Pipeline error: ' + err.message, 500);
      }
    }

    return text('Not found', 404);
  }
};

export function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
