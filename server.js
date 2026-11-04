const express = require('express');
const cors = require('cors');
const path = require('path');
const { analyzeUrl } = require('./src/analyzer');
const { generateOptimizations } = require('./src/optimizer');
const {
  patchHtml,
  testWordPressConnection,
  applyWordPressFixes,
  testGitHubConnection,
  applyGitHubPullRequest
} = require('./src/integrations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Store latest audited HTML in memory for quick patching / download
const auditCache = new Map();

// API: Analyze single URL
app.post('/api/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const auditData = await analyzeUrl(url);
    const optimizations = generateOptimizations(auditData);

    // Save in cache
    auditCache.set(auditData.url, {
      auditData,
      optimizations
    });

    return res.json({
      success: true,
      data: auditData,
      optimizations
    });
  } catch (error) {
    console.error('Audit Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze website'
    });
  }
});

// API: Generate Optimizations
app.post('/api/optimize', (req, res) => {
  try {
    const { auditData } = req.body;
    if (!auditData) {
      return res.status(400).json({ error: 'Audit data is required' });
    }
    const optimizations = generateOptimizations(auditData);
    return res.json({ success: true, optimizations });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get Patched HTML / Preview
app.post('/api/patch-html', (req, res) => {
  try {
    const { rawHtml, optimizations, chosenTitle, chosenDesc } = req.body;
    if (!optimizations) {
      return res.status(400).json({ error: 'Optimizations data is required' });
    }
    const htmlToPatch = rawHtml || `<!DOCTYPE html><html><head></head><body><h1>${optimizations.brandName}</h1></body></html>`;
    const patched = patchHtml(htmlToPatch, optimizations, {
      title: chosenTitle,
      description: chosenDesc
    });
    return res.json({ success: true, patchedHtml: patched });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// API: WordPress - Test Connection
app.post('/api/integrations/wordpress/test', async (req, res) => {
  try {
    const { siteUrl, username, appPassword } = req.body;
    if (!siteUrl || !username || !appPassword) {
      return res.status(400).json({ error: 'Site URL, username, and Application Password are required' });
    }
    const result = await testWordPressConnection(siteUrl, username, appPassword);
    return res.json(result);
  } catch (error) {
    console.error('WordPress Auth Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to connect to WordPress'
    });
  }
});

// API: WordPress - Apply Fixes
app.post('/api/integrations/wordpress/apply', async (req, res) => {
  try {
    const { siteUrl, username, appPassword, postType, itemId, optimizations, chosenTitle, chosenDesc } = req.body;
    if (!siteUrl || !username || !appPassword || !itemId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const result = await applyWordPressFixes({
      siteUrl,
      username,
      appPassword,
      postType: postType || 'pages',
      itemId,
      optimizations,
      chosenTitle,
      chosenDesc
    });
    return res.json(result);
  } catch (error) {
    console.error('WordPress Update Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to update WordPress item'
    });
  }
});

// API: GitHub - Test Connection
app.post('/api/integrations/github/test', async (req, res) => {
  try {
    const { token, repo } = req.body;
    if (!token || !repo) {
      return res.status(400).json({ error: 'GitHub token and repo (owner/repo) are required' });
    }
    const result = await testGitHubConnection(token, repo);
    return res.json(result);
  } catch (error) {
    console.error('GitHub Auth Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to connect to GitHub repository'
    });
  }
});

// API: GitHub - Apply Fixes via Pull Request
app.post('/api/integrations/github/apply', async (req, res) => {
  try {
    const { token, repo, branch, filePath, optimizations, chosenTitle, chosenDesc } = req.body;
    if (!token || !repo || !filePath) {
      return res.status(400).json({ error: 'Token, repo, and target file path are required' });
    }
    const result = await applyGitHubPullRequest({
      token,
      repo,
      branch: branch || 'main',
      filePath,
      optimizations,
      chosenTitle,
      chosenDesc
    });
    return res.json(result);
  } catch (error) {
    console.error('GitHub PR Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to create GitHub Pull Request'
    });
  }
});

// API: Competitor Compare
app.post('/api/compare', async (req, res) => {
  try {
    const { url1, url2 } = req.body;
    if (!url1 || !url2) {
      return res.status(400).json({ error: 'Both url1 and url2 are required' });
    }

    const [siteA, siteB] = await Promise.all([
      analyzeUrl(url1),
      analyzeUrl(url2)
    ]);

    return res.json({
      success: true,
      siteA,
      siteB
    });
  } catch (error) {
    console.error('Compare Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to compare websites'
    });
  }
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 SEO Master Web Application is running!`);
  console.log(`👉 Access URL: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
