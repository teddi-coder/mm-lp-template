import { generateCopy } from './generate-copy.js';
import { buildPage } from './build-page.js';
import { commitToGitHub } from './github.js';
import { notifySlack } from './notify.js';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const secret = request.headers.get('X-MM-Secret');
    if (secret !== env.MM_WEBHOOK_SECRET) {
      return new Response('Unauthorised', { status: 401 });
    }

    let formData;
    try {
      formData = await request.json();
    } catch {
      return new Response('Invalid JSON body', { status: 400 });
    }

    let stepName = '';
    try {
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

      return new Response('OK', { status: 200 });
    } catch (err) {
      await notifySlack({
        success: false,
        workshopName: formData?.workshopName ?? 'Unknown',
        primaryService: formData?.primaryService ?? '',
        suburb: formData?.suburb ?? '',
        stepName,
        errorMessage: err.message,
      }, env);
      return new Response('Pipeline error: ' + err.message, { status: 500 });
    }
  }
};

export function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
