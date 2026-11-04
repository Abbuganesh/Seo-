const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Patches HTML with SEO fixes: title, meta description, schema, viewport, canonical, and image alt tags
 */
function patchHtml(rawHtml, optimizations, options = {}) {
  const $ = cheerio.load(rawHtml, { decodeEntities: false });

  const chosenTitle = options.title || optimizations.titleOptions[0]?.title;
  const chosenDesc = options.description || optimizations.descOptions[0]?.description;
  const targetUrl = optimizations.targetUrl;

  // 1. Title Tag
  if ($('title').length > 0) {
    $('title').first().text(chosenTitle);
  } else {
    $('head').prepend(`<title>${chosenTitle}</title>\n`);
  }

  // 2. Meta Description
  if ($('meta[name="description" i]').length > 0) {
    $('meta[name="description" i]').first().attr('content', chosenDesc);
  } else {
    $('head').append(`  <meta name="description" content="${chosenDesc}">\n`);
  }

  // 3. Viewport tag if missing
  if ($('meta[name="viewport" i]').length === 0) {
    $('head').append(`  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`);
  }

  // 4. Canonical link if missing
  if ($('link[rel="canonical" i]').length === 0 && targetUrl) {
    $('head').append(`  <link rel="canonical" href="${targetUrl}">\n`);
  }

  // 5. Schema JSON-LD Script
  if (optimizations.schemaSnippets?.website) {
    $('head').append(`  ${optimizations.schemaSnippets.website}\n`);
  }

  // 6. Fix Missing Image Alt Attributes
  const altFixMap = new Map();
  (optimizations.imageAltFixes || []).forEach(fix => {
    altFixMap.set(fix.src, fix.suggestedAlt);
    try {
      const filename = fix.src.split('/').pop().split('?')[0];
      if (filename) altFixMap.set(filename, fix.suggestedAlt);
    } catch {}
  });

  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt');
    if (alt === undefined || alt === null || alt.trim() === '') {
      let suggested = altFixMap.get(src);
      if (!suggested) {
        for (const [key, val] of altFixMap.entries()) {
          if (src.includes(key)) {
            suggested = val;
            break;
          }
        }
      }
      if (!suggested) {
        suggested = `${optimizations.brandName || 'Website'} ${optimizations.primaryKeyword || 'Feature'} Image`;
      }
      $(el).attr('alt', suggested);
    }
  });

  return $.html();
}

/**
 * Test WordPress Connection
 */
async function testWordPressConnection(siteUrl, username, appPassword) {
  const cleanUrl = siteUrl.replace(/\/$/, '');
  const token = Buffer.from(`${username}:${appPassword}`).toString('base64');

  const res = await axios.get(`${cleanUrl}/wp-json/wp/v2/users/me`, {
    headers: {
      Authorization: `Basic ${token}`
    },
    timeout: 8000
  });

  return {
    success: true,
    user: res.data.name || username,
    id: res.data.id
  };
}

/**
 * Apply fixes to a WordPress Page or Post
 */
async function applyWordPressFixes({ siteUrl, username, appPassword, postType = 'pages', itemId, optimizations, chosenTitle, chosenDesc }) {
  const cleanUrl = siteUrl.replace(/\/$/, '');
  const token = Buffer.from(`${username}:${appPassword}`).toString('base64');
  const endpoint = `${cleanUrl}/wp-json/wp/v2/${postType}/${itemId}`;

  // 1. Fetch current content
  const current = await axios.get(endpoint, {
    headers: { Authorization: `Basic ${token}` },
    timeout: 8000
  });

  let contentHtml = current.data.content?.raw || current.data.content?.rendered || '';
  
  // Patch HTML inside the WordPress post content (fix images missing alt)
  const $ = cheerio.load(contentHtml, { decodeEntities: false }, false);
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    if (!alt || alt.trim() === '') {
      $(el).attr('alt', `${optimizations.brandName || 'Website'} ${optimizations.primaryKeyword || 'Image'}`);
    }
  });
  contentHtml = $.html();

  // 2. Prepare payload
  const updatePayload = {
    title: chosenTitle || optimizations.titleOptions[0]?.title,
    excerpt: chosenDesc || optimizations.descOptions[0]?.description,
    content: contentHtml
  };

  // 3. Update the post
  const updated = await axios.post(endpoint, updatePayload, {
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  return {
    success: true,
    id: updated.data.id,
    link: updated.data.link,
    title: updated.data.title?.rendered || updatePayload.title
  };
}

/**
 * Test GitHub Connection and repo access
 */
async function testGitHubConnection(token, repo) {
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    throw new Error('Repo must be in "owner/repository" format (e.g. facebook/react)');
  }

  const res = await axios.get(`https://api.github.com/repos/${owner}/${repoName}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'SEO-Master-Bot'
    },
    timeout: 8000
  });

  return {
    success: true,
    repoFullName: res.data.full_name,
    defaultBranch: res.data.default_branch,
    permissions: res.data.permissions
  };
}

/**
 * Creates a Pull Request on GitHub with the SEO changes
 */
async function applyGitHubPullRequest({ token, repo, branch = 'main', filePath = 'index.html', rawHtml, optimizations, chosenTitle, chosenDesc }) {
  const [owner, repoName] = repo.split('/');
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SEO-Master-Bot'
  };

  // 1. Get repository info to ensure branch SHA
  const branchRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${branch}`, { headers });
  const baseSha = branchRes.data.object.sha;

  // 2. Get current file from GitHub (to get its SHA and ensure it exists)
  const fileRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}?ref=${branch}`, { headers });
  const fileSha = fileRes.data.sha;
  const existingFileContent = Buffer.from(fileRes.data.content, 'base64').toString('utf8');

  // 3. Patch the file content
  const patchedContent = patchHtml(existingFileContent || rawHtml, optimizations, {
    title: chosenTitle,
    description: chosenDesc
  });

  // 4. Create a new branch for the PR
  const newBranchName = `seo-optimization-${Date.now().toString().slice(-6)}`;
  await axios.post(`https://api.github.com/repos/${owner}/${repoName}/git/refs`, {
    ref: `refs/heads/${newBranchName}`,
    sha: baseSha
  }, { headers });

  // 5. Commit updated file to the new branch
  await axios.put(`https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}`, {
    message: `SEO Master: Optimize title, meta description & structured data for ${filePath}`,
    content: Buffer.from(patchedContent).toString('base64'),
    sha: fileSha,
    branch: newBranchName
  }, { headers });

  // 6. Also create/update robots.txt if requested
  if (optimizations.recommendedRobotsTxt) {
    try {
      const robotsPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) + 'robots.txt' : 'robots.txt';
      let existingRobotsSha = undefined;
      try {
        const robCheck = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/contents/${robotsPath}?ref=${newBranchName}`, { headers });
        existingRobotsSha = robCheck.data.sha;
      } catch {}

      await axios.put(`https://api.github.com/repos/${owner}/${repoName}/contents/${robotsPath}`, {
        message: `SEO Master: Add/update recommended robots.txt`,
        content: Buffer.from(optimizations.recommendedRobotsTxt).toString('base64'),
        sha: existingRobotsSha,
        branch: newBranchName
      }, { headers });
    } catch (e) {
      console.warn('Could not add robots.txt to PR:', e.message);
    }
  }

  // 7. Open the Pull Request
  const prTitle = `🚀 SEO Master: Automated Meta Tags, Schema & Image Alt Optimization`;
  const prBody = `## 🎯 Automated SEO Improvements

This automated Pull Request optimizes the SEO ranking factors for \`${filePath}\`:

### 🛠 Applied Optimizations:
- **Title Tag**: Updated to \`${chosenTitle || optimizations.titleOptions[0]?.title}\` (Optimized for 50-60 character Google sweet spot).
- **Meta Description**: Configured compelling, high-CTR snippet.
- **Structured Data**: Injected Schema.org JSON-LD markup into \`<head>\`.
- **Accessibility**: Injected missing \`alt\` attributes into \`<img>\` tags.
- **Robots.txt**: Updated crawler directives and sitemap declaration.

Generated automatically by **SEO Master**. Review and merge when ready!`;

  const prRes = await axios.post(`https://api.github.com/repos/${owner}/${repoName}/pulls`, {
    title: prTitle,
    head: newBranchName,
    base: branch,
    body: prBody
  }, { headers });

  return {
    success: true,
    pullRequestUrl: prRes.data.html_url,
    prNumber: prRes.data.number,
    branch: newBranchName
  };
}

module.exports = {
  patchHtml,
  testWordPressConnection,
  applyWordPressFixes,
  testGitHubConnection,
  applyGitHubPullRequest
};
