import { toSlug } from './index.js';

const GITHUB_API = 'https://api.github.com';
const TEMPLATE_OWNER = 'teddi-coder';
const TEMPLATE_REPO = 'mm-lp-template';

export async function commitToGitHub(populatedHTML, formData, env) {
  const token = env.GITHUB_TOKEN;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'mm-lp-pipeline',
  };

  const clientSlug = formData.clientSlug || toSlug(formData.workshopName);
  const serviceSlug = toSlug(formData.primaryService);
  const suburbSlug = toSlug(formData.suburb);
  const repoName = `mm-lp-${clientSlug}`;
  let branchName = `lp/${clientSlug}/${serviceSlug}-${suburbSlug}`;
  const filePath = `${serviceSlug}-${suburbSlug}.html`;

  // 1. Check if client repo exists; create if not
  let mainSha;
  const repoCheck = await ghFetch(`/repos/${TEMPLATE_OWNER}/${repoName}`, headers);
  if (repoCheck.status === 404) {
    await ghPost(`/user/repos`, headers, {
      name: repoName,
      private: true,
      auto_init: false,
      description: `Mechanic Marketing landing pages — ${formData.workshopName}`,
    });
    await new Promise(r => setTimeout(r, 1500));
    // Bootstrap: copy template files to new repo
    mainSha = await bootstrapRepo(repoName, headers);
  } else {
    const repoData = await repoCheck.json();
    const defaultBranch = repoData.default_branch || 'main';
    const refRes = await ghFetch(`/repos/${TEMPLATE_OWNER}/${repoName}/git/refs/heads/${defaultBranch}`, headers);
    if (refRes.status === 404) {
      // Repo exists but has no commits yet (previous bootstrap may have failed) — re-bootstrap
      mainSha = await bootstrapRepo(repoName, headers);
    } else if (refRes.status !== 200) {
      throw new Error(`GitHub GET ref unexpected status ${refRes.status}`);
    } else {
      const refData = await refRes.json();
      mainSha = refData.object.sha;
    }
  }

  // 2. Create new branch — if it already exists, append today's date and retry once
  let createBranchRes = await ghPost(`/repos/${TEMPLATE_OWNER}/${repoName}/git/refs`, headers, {
    ref: `refs/heads/${branchName}`,
    sha: mainSha,
  });
  if (createBranchRes.status === 422) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    branchName = `${branchName}-${today}`;
    createBranchRes = await ghPost(`/repos/${TEMPLATE_OWNER}/${repoName}/git/refs`, headers, {
      ref: `refs/heads/${branchName}`,
      sha: mainSha,
    });
  }
  if (!createBranchRes.ok) {
    const err = await createBranchRes.json();
    throw new Error(`GitHub create branch failed: ${err.message}`);
  }

  // 3. Commit the populated HTML via Git Data API
  // Create blob
  const blobRes = await ghPost(`/repos/${TEMPLATE_OWNER}/${repoName}/git/blobs`, headers, {
    content: btoa(unescape(encodeURIComponent(populatedHTML))),
    encoding: 'base64',
  });
  const blob = await blobRes.json();

  // Get base tree
  const baseCommitRes = await ghFetch(`/repos/${TEMPLATE_OWNER}/${repoName}/git/commits/${mainSha}`, headers);
  const baseCommit = await baseCommitRes.json();

  // Create tree
  const treeRes = await ghPost(`/repos/${TEMPLATE_OWNER}/${repoName}/git/trees`, headers, {
    base_tree: baseCommit.tree.sha,
    tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }],
  });
  const tree = await treeRes.json();

  // Create commit
  const commitRes = await ghPost(`/repos/${TEMPLATE_OWNER}/${repoName}/git/commits`, headers, {
    message: `Add ${formData.primaryService} landing page for ${formData.suburb}`,
    tree: tree.sha,
    parents: [mainSha],
  });
  const commit = await commitRes.json();

  // Update branch ref (branch name may contain slashes — do NOT encodeURIComponent)
  await fetch(`${GITHUB_API}/repos/${TEMPLATE_OWNER}/${repoName}/git/refs/heads/${branchName}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sha: commit.sha }),
  });

  // 4. Create Pull Request
  const prBody = `## ${formData.workshopName} — ${formData.primaryService} (${formData.suburb})

**Meta title:** ${formData.primaryService} ${formData.suburb} | ${formData.workshopName}

---

## Before merging
- [ ] Upload logo to \`assets/images/${clientSlug}/logo.png\`
- [ ] Upload hero image to \`assets/images/${clientSlug}/hero.jpg\`
- [ ] Add GA4 + Google Ads conversion tags to \`thank-you.html\`
- [ ] Review copy on the preview URL
- [ ] Check mobile layout (375px)
- [ ] Verify phone number click-to-call works`;

  const prRes = await ghPost(`/repos/${TEMPLATE_OWNER}/${repoName}/pulls`, headers, {
    title: `[${formData.workshopName}] ${formData.primaryService} — ${formData.suburb}`,
    body: prBody,
    head: branchName,
    base: 'main',
  });
  const pr = await prRes.json();
  // 422 = PR already exists for this branch (retry scenario) — fall back to the pulls list URL
  const prUrl = pr.html_url || `https://github.com/${TEMPLATE_OWNER}/${repoName}/pulls`;

  const cfProject = `${env.CF_PAGES_PROJECT_PREFIX}-${clientSlug}`;
  const cfBranchSlug = branchName.replace(/\//g, '-'); // replace all slashes for CF Pages subdomain
  const previewUrl = `https://${cfBranchSlug}.${cfProject}.pages.dev`;

  return { previewUrl, prUrl };
}

async function bootstrapRepo(repoName, headers) {
  // Fetch key template files and commit them as the initial state
  const templateFiles = ['index.html', 'thank-you.html', 'assets/css/style.css', 'assets/js/main.js'];
  const treeItems = [];

  for (const filePath of templateFiles) {
    const raw = await fetch(`https://raw.githubusercontent.com/${TEMPLATE_OWNER}/${TEMPLATE_REPO}/main/${filePath}`);
    if (!raw.ok) continue;
    const content = await raw.text();
    const blobRes = await ghPost(`/repos/${TEMPLATE_OWNER}/${repoName}/git/blobs`, headers, {
      content: btoa(unescape(encodeURIComponent(content))),
      encoding: 'base64',
    });
    const blob = await blobRes.json();
    treeItems.push({ path: filePath, mode: '100644', type: 'blob', sha: blob.sha });
  }

  // Create initial tree (no base_tree — fresh repo)
  const treeRes = await ghPost(`/repos/${TEMPLATE_OWNER}/${repoName}/git/trees`, headers, { tree: treeItems });
  const tree = await treeRes.json();

  const commitRes = await ghPost(`/repos/${TEMPLATE_OWNER}/${repoName}/git/commits`, headers, {
    message: 'Initial commit — MM landing page template',
    tree: tree.sha,
    parents: [],
  });
  const commit = await commitRes.json();

  // Create main branch
  await ghPost(`/repos/${TEMPLATE_OWNER}/${repoName}/git/refs`, headers, {
    ref: 'refs/heads/main',
    sha: commit.sha,
  });

  return commit.sha;
}

async function ghFetch(path, headers) {
  return fetch(`${GITHUB_API}${path}`, { headers });
}

async function ghPost(path, headers, body) {
  return fetch(`${GITHUB_API}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}
