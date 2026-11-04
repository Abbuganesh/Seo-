// SEO Master Frontend Application Logic

let currentAuditData = null;
let currentOptimizations = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Setup event listeners
  setupNavigation();
  setupAuditForm();
  setupCompareForm();
  setupTabs();
  setupSERPSwitch();
  setupCopyButtons();
  setupExport();
  setupAutoFixIntegrations();
  loadHistory();
});

// Setup Mode & Navigation
function setupNavigation() {
  const singleBtn = document.getElementById('modeSingleBtn');
  const compareBtn = document.getElementById('modeCompareBtn');
  const singleForm = document.getElementById('singleFormContainer');
  const compareForm = document.getElementById('compareFormContainer');
  const resultsSec = document.getElementById('resultsSection');
  const compareSec = document.getElementById('compareResultsSection');

  singleBtn.addEventListener('click', () => {
    singleBtn.className = 'px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium transition-all flex items-center gap-1.5 shadow-sm';
    compareBtn.className = 'px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1.5';
    singleForm.classList.remove('hidden');
    compareForm.classList.add('hidden');
    compareSec.classList.add('hidden');
    if (currentAuditData) {
      resultsSec.classList.remove('hidden');
    }
  });

  compareBtn.addEventListener('click', () => {
    compareBtn.className = 'px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold transition-all flex items-center gap-1.5 shadow-sm';
    singleBtn.className = 'px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1.5';
    compareForm.classList.remove('hidden');
    singleForm.classList.add('hidden');
    resultsSec.classList.add('hidden');
  });

  // Sample quick links
  document.querySelectorAll('.sample-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = btn.getAttribute('data-url');
      document.getElementById('targetUrlInput').value = url;
      document.getElementById('auditForm').dispatchEvent(new Event('submit'));
    });
  });

  // Re-audit button
  document.getElementById('reAuditBtn')?.addEventListener('click', () => {
    if (currentAuditData?.url) {
      document.getElementById('targetUrlInput').value = currentAuditData.url;
      document.getElementById('auditForm').dispatchEvent(new Event('submit'));
    }
  });

  // Dark Mode Toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  themeToggleBtn?.addEventListener('click', () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  });
}

// Setup Single Audit Form
function setupAuditForm() {
  const form = document.getElementById('auditForm');
  const input = document.getElementById('targetUrlInput');
  const loading = document.getElementById('loadingState');
  const loadingStep = document.getElementById('loadingStep');
  const errorState = document.getElementById('errorState');
  const errorMsg = document.getElementById('errorMessage');
  const results = document.getElementById('resultsSection');
  const exportBtn = document.getElementById('exportReportBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = input.value.trim();
    if (!url) return;

    errorState.classList.add('hidden');
    results.classList.add('hidden');
    loading.classList.remove('hidden');
    exportBtn.classList.add('hidden');

    // Simulate animated step indicators
    const steps = [
      'Fetching website HTML & HTTP headers...',
      'Validating robots.txt & XML sitemaps...',
      'Auditing on-page tags, headings & OpenGraph...',
      'Computing keyword density & readability ease...',
      'Running 40+ SEO diagnostics...'
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      loadingStep.textContent = steps[stepIdx];
    }, 1200);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      clearInterval(interval);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete SEO audit');
      }

      currentAuditData = data.data;
      currentOptimizations = data.optimizations;

      renderAuditResults(data.data, data.optimizations);
      saveToHistory(data.data);

      loading.classList.add('hidden');
      results.classList.remove('hidden');
      exportBtn.classList.remove('hidden');

      // Scroll to results smoothly
      results.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      clearInterval(interval);
      loading.classList.add('hidden');
      errorState.classList.remove('hidden');
      errorMsg.textContent = err.message || 'An unknown network error occurred';
    }
  });
}

// Setup Compare Form
function setupCompareForm() {
  const form = document.getElementById('compareForm');
  const u1 = document.getElementById('compareUrl1');
  const u2 = document.getElementById('compareUrl2');
  const loading = document.getElementById('loadingState');
  const loadingStep = document.getElementById('loadingStep');
  const errorState = document.getElementById('errorState');
  const errorMsg = document.getElementById('errorMessage');
  const compareSec = document.getElementById('compareResultsSection');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url1 = u1.value.trim();
    const url2 = u2.value.trim();
    if (!url1 || !url2) return;

    errorState.classList.add('hidden');
    compareSec.classList.add('hidden');
    loading.classList.remove('hidden');
    loadingStep.textContent = `Auditing ${url1} & ${url2} simultaneously...`;

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url1, url2 })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Comparison failed');
      }

      renderCompareResults(data.siteA, data.siteB);
      loading.classList.add('hidden');
      compareSec.classList.remove('hidden');
      compareSec.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      loading.classList.add('hidden');
      errorState.classList.remove('hidden');
      errorMsg.textContent = err.message;
    }
  });
}

// Render Audit Results
function renderAuditResults(data, opts) {
  // 1. Top Banner
  const parsedUrl = new URL(data.url);
  document.getElementById('siteUrlTitle').textContent = parsedUrl.hostname;
  document.getElementById('siteFavicon').src = data.meta.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%233b82f6"/></svg>';
  document.getElementById('siteFavicon').onerror = function() {
    this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233b82f6"><circle cx="12" cy="12" r="10"/></svg>';
  };

  const statusBadge = document.getElementById('siteStatusBadge');
  statusBadge.textContent = `HTTP ${data.statusCode}`;
  statusBadge.className = data.statusCode === 200 
    ? 'text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20';

  const httpsBadge = document.getElementById('siteHttpsBadge');
  httpsBadge.textContent = data.technical.isHttps ? 'HTTPS Secure' : 'HTTP Insecure';
  httpsBadge.className = data.technical.isHttps
    ? 'text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20';

  document.getElementById('siteMetaSummary').textContent = `${data.stats.wordCount} words • ${data.stats.totalImages} images • ${data.stats.totalLinks} links • ${data.stats.structuredDataCount} schema scripts`;
  document.getElementById('siteLatency').textContent = `${data.responseTimeMs} ms`;
  document.getElementById('siteSize').textContent = `${data.htmlSizeKb} KB`;

  // 2. Scores & Gauge
  const overall = data.scores.overall;
  document.getElementById('overallScoreNumber').textContent = overall;

  const circle = document.getElementById('scoreProgressCircle');
  // stroke-dasharray = 264 (2 * pi * 42 = ~263.89)
  const offset = 264 - (264 * overall) / 100;
  circle.style.strokeDashoffset = offset;

  const gradeBadge = document.getElementById('scoreGradeBadge');
  if (overall >= 80) {
    circle.setAttribute('class', 'text-emerald-500 transition-all duration-1000 ease-out');
    gradeBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    gradeBadge.textContent = 'Excellent SEO Health';
  } else if (overall >= 60) {
    circle.setAttribute('class', 'text-amber-500 transition-all duration-1000 ease-out');
    gradeBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20';
    gradeBadge.textContent = 'Moderate SEO Health - Needs Work';
  } else {
    circle.setAttribute('class', 'text-rose-500 transition-all duration-1000 ease-out');
    gradeBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20';
    gradeBadge.textContent = 'Critical SEO Issues Detected';
  }

  // Issue Counts
  const critical = data.issues.filter(i => i.type === 'critical').length;
  const warnings = data.issues.filter(i => i.type === 'warning').length;
  const passed = data.issues.filter(i => i.type === 'passed').length;

  document.getElementById('criticalCount').textContent = critical;
  document.getElementById('warningCount').textContent = warnings;
  document.getElementById('passedCount').textContent = passed;

  // 3. Category Sub-scores
  renderCategoryScore('catOnPageScore', 'catOnPageBar', data.scores.onPage);
  renderCategoryScore('catContentScore', 'catContentBar', data.scores.content);
  renderCategoryScore('catTechScore', 'catTechBar', data.scores.technical);
  renderCategoryScore('catMobileScore', 'catMobileBar', data.scores.mobile);
  renderCategoryScore('catSocialScore', 'catSocialBar', data.scores.social);

  // 4. Render Issues Checklist
  renderIssuesList(data.issues);

  // 5. Render Auto-Fix Integrations
  renderAutoFixTab(opts);

  // 6. Render AI Optimizer
  renderOptimizerTab(opts);

  // 6. Render SERP and Social Previews
  renderSERPAndSocial(data);

  // 7. Render On-Page Tags & Headings
  renderOnPage(data);

  // 8. Render Content & Keywords
  renderContentKeywords(data);

  // 9. Render Images & Links
  renderImagesAndLinks(data);

  // 10. Render Technical & Schema
  renderTechAndSchema(data);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderCategoryScore(scoreId, barId, score) {
  document.getElementById(scoreId).textContent = `${score}%`;
  document.getElementById(barId).style.width = `${score}%`;
}

// Render Issues Checklist with Filter
function renderIssuesList(issues) {
  const container = document.getElementById('issuesList');
  const countLabel = document.getElementById('issuesShowingCount');
  
  function display(filtered) {
    container.innerHTML = '';
    countLabel.textContent = `Showing ${filtered.length} of ${issues.length} diagnostics`;

    if (filtered.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs italic">No issues match this filter.</div>`;
      return;
    }

    filtered.forEach((issue, idx) => {
      const card = document.createElement('div');
      card.className = 'p-4 rounded-2xl bg-slate-900/70 border border-slate-800 transition hover:border-slate-700 text-xs space-y-2';

      let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      let icon = 'check-circle-2';
      if (issue.type === 'critical') {
        badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        icon = 'x-circle';
      } else if (issue.type === 'warning') {
        badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        icon = 'alert-triangle';
      }

      card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="p-1 rounded-lg ${badgeColor} border shrink-0 mt-0.5">
              <i data-lucide="${icon}" class="w-4 h-4"></i>
            </span>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h5 class="font-bold text-slate-100 text-sm">${issue.title}</h5>
                <span class="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${badgeColor} border">${issue.type}</span>
                <span class="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-full bg-slate-800">${issue.category}</span>
              </div>
              <p class="text-slate-400 mt-1">${issue.description}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
          <div>
            <span class="text-slate-500 font-semibold block">Current State:</span>
            <span class="text-slate-300 font-mono">${escapeHtml(issue.current || 'N/A')}</span>
          </div>
          <div>
            <span class="text-slate-500 font-semibold block">Recommended Best Practice:</span>
            <span class="text-slate-300">${escapeHtml(issue.recommended || 'Follow standard SEO guidelines')}</span>
          </div>
        </div>

        ${issue.codeSnippet ? `
          <div class="mt-2 pt-2 border-t border-slate-800/80">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <i data-lucide="terminal" class="w-3 h-3"></i> Quick Fix Code
              </span>
              <button class="copy-btn text-[10px] text-slate-400 hover:text-white flex items-center gap-1" data-code="${escapeHtml(issue.codeSnippet)}">
                <i data-lucide="copy" class="w-3 h-3"></i> Copy
              </button>
            </div>
            <pre class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto"><code>${escapeHtml(issue.codeSnippet)}</code></pre>
          </div>
        ` : ''}
      `;

      container.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
    setupCopyButtons();
  }

  // Filter Buttons
  document.querySelectorAll('.issue-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.issue-filter-btn').forEach(b => {
        b.className = 'issue-filter-btn px-3 py-1.5 rounded-lg text-slate-400 hover:text-white';
      });
      btn.className = 'issue-filter-btn px-3 py-1.5 rounded-lg bg-slate-800 text-white font-medium';
      const filter = btn.getAttribute('data-filter');
      if (filter === 'all') display(issues);
      else display(issues.filter(i => i.type === filter));
    });
  });

  display(issues);
}

// Render Auto-Fix Tab Selectors
function renderAutoFixTab(opts) {
  if (!opts) return;

  const titleSelect = document.getElementById('autoFixTitleSelect');
  const descSelect = document.getElementById('autoFixDescSelect');

  titleSelect.innerHTML = '';
  opts.titleOptions.forEach((opt, idx) => {
    const el = document.createElement('option');
    el.value = opt.title;
    el.textContent = `[${opt.type}] ${opt.title} (${opt.characterCount} chars)`;
    titleSelect.appendChild(el);
  });

  descSelect.innerHTML = '';
  opts.descOptions.forEach((opt, idx) => {
    const el = document.createElement('option');
    el.value = opt.description;
    el.textContent = `[${opt.type}] ${opt.description.substring(0, 75)}... (${opt.characterCount} chars)`;
    descSelect.appendChild(el);
  });

  // Pre-fill site URL in WordPress input if empty
  const wpUrlInput = document.getElementById('wpSiteUrlInput');
  if (wpUrlInput && !wpUrlInput.value && currentAuditData?.url) {
    try {
      const p = new URL(currentAuditData.url);
      wpUrlInput.value = p.origin;
    } catch {}
  }
}

// Render AI Optimizer Tab
function renderOptimizerTab(opts) {
  if (!opts) return;

  // 1. Titles
  const titleList = document.getElementById('optimizerTitleList');
  titleList.innerHTML = '';
  opts.titleOptions.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs';
    item.innerHTML = `
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">${opt.type}</span>
          <span class="text-slate-500 text-[11px] font-mono">${opt.characterCount} chars</span>
        </div>
        <p class="text-white font-semibold text-sm">&lt;title&gt;${escapeHtml(opt.title)}&lt;/title&gt;</p>
        <p class="text-[11px] text-slate-400 mt-1">${opt.explanation}</p>
      </div>
      <button class="copy-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 shrink-0" data-code="<title>${escapeHtml(opt.title)}</title>">
        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy Tag
      </button>
    `;
    titleList.appendChild(item);
  });

  // 2. Meta Descriptions
  const descList = document.getElementById('optimizerDescList');
  descList.innerHTML = '';
  opts.descOptions.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs';
    item.innerHTML = `
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">${opt.type}</span>
          <span class="text-slate-500 text-[11px] font-mono">${opt.characterCount} chars</span>
        </div>
        <p class="text-slate-200">${escapeHtml(opt.description)}</p>
        <p class="text-[11px] text-slate-400 mt-1">${opt.explanation}</p>
      </div>
      <button class="copy-btn px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 shrink-0" data-code='<meta name="description" content="${escapeHtml(opt.description)}">'>
        <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy Tag
      </button>
    `;
    descList.appendChild(item);
  });

  // 3. Alt Tags
  const altList = document.getElementById('optimizerAltList');
  altList.innerHTML = '';
  if (opts.imageAltFixes.length === 0) {
    altList.innerHTML = `<p class="text-xs text-emerald-400 py-2 flex items-center gap-2"><i data-lucide="check" class="w-4 h-4"></i> Great news! All scanned images already have alt attributes.</p>`;
  } else {
    opts.imageAltFixes.slice(0, 8).forEach(fix => {
      const item = document.createElement('div');
      item.className = 'p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 text-xs';
      item.innerHTML = `
        <div class="truncate flex-1">
          <span class="text-slate-500 font-mono text-[11px] block truncate">${escapeHtml(fix.src)}</span>
          <span class="text-emerald-400 font-medium">Suggested Alt: "${escapeHtml(fix.suggestedAlt)}"</span>
        </div>
        <button class="copy-btn px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] hover:text-white shrink-0" data-code='${escapeHtml(fix.codeSnippet)}'>
          Copy HTML
        </button>
      `;
      altList.appendChild(item);
    });
  }

  // 4. Schema Code
  document.getElementById('schemaCodeWebsite').textContent = opts.schemaSnippets.website;
  document.getElementById('robotsCode').textContent = opts.recommendedRobotsTxt;
}

// Render SERP and Social Share Previews
function renderSERPAndSocial(data) {
  const parsed = new URL(data.url);

  // SERP
  document.getElementById('serpFavicon').src = data.meta.favicon;
  document.getElementById('serpSiteName').textContent = data.meta.og.siteName || parsed.hostname;
  document.getElementById('serpBreadcrumb').textContent = `${data.url.replace(/\/$/, '')} > ...`;
  document.getElementById('serpTitle').textContent = data.meta.title || parsed.hostname;
  document.getElementById('serpSnippet').textContent = data.meta.metaDescription || 'No meta description detected. Search engines will automatically construct an ad-hoc excerpt from visible text on this page.';

  // Social Previews
  // OpenGraph Facebook
  const ogImg = document.getElementById('ogPreviewImage');
  const ogPlaceholder = document.getElementById('ogPlaceholderImage');
  if (data.meta.og.image) {
    ogImg.src = data.meta.og.image;
    ogImg.classList.remove('hidden');
    ogPlaceholder.classList.add('hidden');
  } else {
    ogImg.classList.add('hidden');
    ogPlaceholder.classList.remove('hidden');
  }
  document.getElementById('ogDomain').textContent = parsed.hostname;
  document.getElementById('ogTitleText').textContent = data.meta.og.title || data.meta.title || parsed.hostname;
  document.getElementById('ogDescText').textContent = data.meta.og.description || data.meta.metaDescription || 'No description provided';

  // Twitter
  const twImg = document.getElementById('twPreviewImage');
  const twPlaceholder = document.getElementById('twPlaceholderImage');
  const twImageSrc = data.meta.twitter.image || data.meta.og.image;
  if (twImageSrc) {
    twImg.src = twImageSrc;
    twImg.classList.remove('hidden');
    twPlaceholder.classList.add('hidden');
  } else {
    twImg.classList.add('hidden');
    twPlaceholder.classList.remove('hidden');
  }
  document.getElementById('twDomain').textContent = parsed.hostname;
  document.getElementById('twTitleText').textContent = data.meta.twitter.title || data.meta.og.title || data.meta.title || parsed.hostname;
  document.getElementById('twDescText').textContent = data.meta.twitter.description || data.meta.og.description || data.meta.metaDescription || 'No description provided';
}

// Render On-Page Tags & Headings
function renderOnPage(data) {
  // Title
  document.getElementById('titleTagContent').textContent = data.meta.title || '[Missing Title Tag]';
  const titleBadge = document.getElementById('titleTagLengthBadge');
  const titleLen = data.meta.title.length;
  titleBadge.textContent = `${titleLen} characters`;
  titleBadge.className = (titleLen >= 50 && titleLen <= 60)
    ? 'px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20';

  // Description
  document.getElementById('descTagContent').textContent = data.meta.metaDescription || '[Missing Meta Description]';
  const descBadge = document.getElementById('descTagLengthBadge');
  const descLen = data.meta.metaDescription.length;
  descBadge.textContent = `${descLen} characters`;
  descBadge.className = (descLen >= 130 && descLen <= 160)
    ? 'px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20';

  // Canonical
  document.getElementById('canonicalContent').textContent = data.meta.canonicalHref || '[Missing Canonical Link]';
  const canBadge = document.getElementById('canonicalBadge');
  canBadge.textContent = data.meta.canonicalHref ? 'Configured' : 'Missing';
  canBadge.className = data.meta.canonicalHref
    ? 'px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400'
    : 'px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400';

  // Robots
  document.getElementById('robotsMetaContent').textContent = data.meta.metaRobots || 'None (Default: index, follow)';
  const robBadge = document.getElementById('robotsMetaBadge');
  const isNoIndex = data.meta.metaRobots.toLowerCase().includes('noindex');
  robBadge.textContent = isNoIndex ? 'NoIndex (Blocked)' : 'Indexable';
  robBadge.className = isNoIndex
    ? 'px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400'
    : 'px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400';

  // Headings Outline
  const headingCounts = data.stats.headingsCount;
  document.getElementById('headingsSummaryCounts').innerHTML = `
    <span class="px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-bold">H1: ${headingCounts.h1}</span>
    <span class="px-2 py-0.5 rounded bg-slate-800 text-teal-400">H2: ${headingCounts.h2}</span>
    <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300">H3: ${headingCounts.h3}</span>
    <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Total: ${headingCounts.total}</span>
  `;

  const hList = document.getElementById('headingsList');
  hList.innerHTML = '';

  const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  let count = 0;
  tags.forEach(tag => {
    (data.headings[tag] || []).forEach(text => {
      count++;
      if (count > 40) return; // limit view
      const div = document.createElement('div');
      const indentClass = tag === 'h1' ? 'pl-2 border-l-2 border-emerald-500' : (tag === 'h2' ? 'pl-4 border-l-2 border-teal-500' : 'pl-6 border-l-2 border-slate-700');
      div.className = `p-2 bg-slate-950/60 rounded ${indentClass} flex items-start gap-2`;
      div.innerHTML = `
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${tag.toUpperCase()}</span>
        <span class="text-slate-200">${escapeHtml(text)}</span>
      `;
      hList.appendChild(div);
    });
  });

  if (count === 0) {
    hList.innerHTML = `<p class="text-xs text-slate-500 italic p-3">No headings (H1-H6) found in HTML.</p>`;
  }
}

// Render Content & Keywords
function renderContentKeywords(data) {
  document.getElementById('statWordCount').textContent = data.stats.wordCount.toLocaleString();
  document.getElementById('statWordStatus').textContent = data.stats.wordCount >= 300 ? 'Sufficient content depth' : 'Thin content warning';

  document.getElementById('statReadingTime').textContent = `${data.stats.readingTimeMin} min`;
  document.getElementById('statReadabilityScore').textContent = data.stats.readabilityScore;
  document.getElementById('statReadabilityGrade').textContent = data.stats.readingEase;
  document.getElementById('statTextRatio').textContent = `${data.stats.textToHtmlRatio}%`;

  // Single Keywords
  const singleTable = document.getElementById('singleKeywordsTable');
  singleTable.innerHTML = '';
  if (data.keywords.single.length === 0) {
    singleTable.innerHTML = `<p class="text-xs text-slate-500 italic">No significant keywords extracted.</p>`;
  } else {
    data.keywords.single.forEach(kw => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/60';
      row.innerHTML = `
        <span class="font-medium text-slate-200">${escapeHtml(kw.keyword)}</span>
        <div class="flex items-center gap-3 font-mono text-slate-400 text-[11px]">
          <span>${kw.count}x</span>
          <span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">${kw.density}%</span>
        </div>
      `;
      singleTable.appendChild(row);
    });
  }

  // Bigrams (2 words)
  const bigramTable = document.getElementById('bigramsTable');
  bigramTable.innerHTML = '';
  if (data.keywords.bigrams.length === 0) {
    bigramTable.innerHTML = `<p class="text-xs text-slate-500 italic">No recurring multi-word phrases extracted.</p>`;
  } else {
    data.keywords.bigrams.forEach(kw => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800/60';
      row.innerHTML = `
        <span class="font-medium text-slate-200">${escapeHtml(kw.keyword)}</span>
        <div class="flex items-center gap-3 font-mono text-slate-400 text-[11px]">
          <span>${kw.count}x</span>
          <span class="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 font-bold">${kw.density}%</span>
        </div>
      `;
      bigramTable.appendChild(row);
    });
  }
}

// Render Images & Links
function renderImagesAndLinks(data) {
  // Images
  const missingBadge = document.getElementById('imagesSummaryBadge');
  const missing = data.stats.imagesWithoutAlt;
  missingBadge.textContent = missing === 0 ? 'All Alt Tags Present' : `${missing} Missing Alt Tags`;
  missingBadge.className = missing === 0
    ? 'text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20';

  const imgList = document.getElementById('imagesAuditList');
  imgList.innerHTML = '';
  if (data.images.length === 0) {
    imgList.innerHTML = `<p class="text-xs text-slate-500 italic p-3">No images found on this page.</p>`;
  } else {
    data.images.forEach(img => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 gap-3';
      row.innerHTML = `
        <div class="flex items-center gap-3 truncate">
          <div class="w-10 h-10 rounded bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
            <img src="${img.src}" class="w-full h-full object-cover" onerror="this.style.display='none'">
          </div>
          <div class="truncate">
            <span class="text-slate-300 font-mono block truncate">${escapeHtml(img.src)}</span>
            <span class="text-[11px] ${img.hasAlt ? 'text-emerald-400' : 'text-rose-400 font-semibold'}">
              ${img.hasAlt ? `alt="${escapeHtml(img.alt)}"` : '❌ Missing alt attribute'}
            </span>
          </div>
        </div>
        <span class="text-[10px] text-slate-500 font-mono shrink-0">${img.loading ? `loading="${img.loading}"` : ''}</span>
      `;
      imgList.appendChild(row);
    });
  }

  // Links
  document.getElementById('linksSummaryCounts').innerHTML = `
    <span class="px-2 py-0.5 rounded bg-slate-800 text-blue-400">Internal: ${data.stats.internalLinksCount}</span>
    <span class="px-2 py-0.5 rounded bg-slate-800 text-teal-400">External: ${data.stats.externalLinksCount}</span>
  `;

  const linkList = document.getElementById('linksAuditList');
  linkList.innerHTML = '';
  data.links.forEach(l => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800/80 gap-2';
    row.innerHTML = `
      <div class="truncate flex-1">
        <span class="text-slate-200 font-medium block truncate">${escapeHtml(l.text)}</span>
        <span class="text-[11px] text-slate-500 font-mono block truncate">${escapeHtml(l.href)}</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="text-[10px] px-2 py-0.5 rounded ${l.isInternal ? 'bg-emerald-500/10 text-emerald-400' : 'bg-teal-500/10 text-teal-400'}">
          ${l.isInternal ? 'Internal' : 'External'}
        </span>
        ${l.isNofollow ? '<span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">nofollow</span>' : ''}
      </div>
    `;
    linkList.appendChild(row);
  });
}

// Render Technical & Schema
function renderTechAndSchema(data) {
  // HTTPS
  const httpsEl = document.getElementById('techHttpsStatus');
  httpsEl.textContent = data.technical.isHttps ? 'Valid HTTPS' : 'Insecure HTTP';
  httpsEl.className = data.technical.isHttps ? 'text-emerald-400' : 'text-rose-400';

  // HSTS
  const hstsEl = document.getElementById('techHstsStatus');
  hstsEl.textContent = data.technical.hasHsts ? 'Enabled' : 'Not Present';
  hstsEl.className = data.technical.hasHsts ? 'text-emerald-400' : 'text-slate-400';

  // Compression
  const compEl = document.getElementById('techCompressionStatus');
  compEl.textContent = data.technical.contentEncoding;
  compEl.className = data.technical.contentEncoding !== 'none' ? 'text-emerald-400' : 'text-amber-400';

  // Robots
  const robEl = document.getElementById('techRobotsStatus');
  robEl.textContent = data.technical.robotsInfo?.exists ? 'Available (/robots.txt)' : 'Missing (404)';
  robEl.className = data.technical.robotsInfo?.exists ? 'text-emerald-400' : 'text-amber-400';

  // Sitemap
  const smEl = document.getElementById('techSitemapStatus');
  smEl.textContent = data.technical.sitemapInfo?.exists ? 'Detected (/sitemap.xml)' : 'Not Found at root';
  smEl.className = data.technical.sitemapInfo?.exists ? 'text-emerald-400' : 'text-amber-400';

  // Schema List
  const schemaList = document.getElementById('detectedSchemaList');
  schemaList.innerHTML = '';
  if (data.structuredData.length === 0) {
    schemaList.innerHTML = `<p class="text-slate-500 italic p-3 bg-slate-950 rounded-xl">No JSON-LD schema blocks detected. Use the "AI SEO Optimizer" tab to generate one.</p>`;
  } else {
    data.structuredData.forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = 'p-3 bg-slate-950 rounded-xl border border-slate-800/80';
      card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold text-teal-400">Type: ${s.types ? s.types.join(', ') : 'Custom Schema'}</span>
          <span class="text-[10px] px-2 py-0.5 rounded ${s.valid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} font-semibold">
            ${s.valid ? 'Valid JSON' : 'Syntax Error'}
          </span>
        </div>
        <pre class="text-[10px] text-slate-300 font-mono overflow-x-auto max-h-36 p-2 bg-slate-900 rounded"><code>${escapeHtml(JSON.stringify(s.data, null, 2))}</code></pre>
      `;
      schemaList.appendChild(card);
    });
  }
}

// Render Competitor Compare Matrix
function renderCompareResults(siteA, siteB) {
  const hostA = new URL(siteA.url).hostname;
  const hostB = new URL(siteB.url).hostname;

  document.getElementById('compareCol1Header').textContent = hostA;
  document.getElementById('compareCol2Header').textContent = hostB;

  const rows = [
    {
      metric: 'Overall Health Score',
      valA: `${siteA.scores.overall}/100`,
      valB: `${siteB.scores.overall}/100`,
      advantage: siteA.scores.overall > siteB.scores.overall ? hostA : (siteB.scores.overall > siteA.scores.overall ? hostB : 'Tie')
    },
    {
      metric: 'Server Response (TTFB)',
      valA: `${siteA.responseTimeMs} ms`,
      valB: `${siteB.responseTimeMs} ms`,
      advantage: siteA.responseTimeMs < siteB.responseTimeMs ? hostA : hostB
    },
    {
      metric: 'Word Count & Depth',
      valA: `${siteA.stats.wordCount} words`,
      valB: `${siteB.stats.wordCount} words`,
      advantage: siteA.stats.wordCount > siteB.stats.wordCount ? hostA : hostB
    },
    {
      metric: 'Title Tag Optimization',
      valA: `${siteA.stats.titleLength} chars`,
      valB: `${siteB.stats.titleLength} chars`,
      advantage: (siteA.stats.titleLength >= 50 && siteA.stats.titleLength <= 60) ? hostA : hostB
    },
    {
      metric: 'Images Missing Alt',
      valA: `${siteA.stats.imagesWithoutAlt} of ${siteA.stats.totalImages}`,
      valB: `${siteB.stats.imagesWithoutAlt} of ${siteB.stats.totalImages}`,
      advantage: siteA.stats.imagesWithoutAlt < siteB.stats.imagesWithoutAlt ? hostA : hostB
    },
    {
      metric: 'HTTPS Protocol',
      valA: siteA.technical.isHttps ? 'Yes (Secure)' : 'No',
      valB: siteB.technical.isHttps ? 'Yes (Secure)' : 'No',
      advantage: (siteA.technical.isHttps && !siteB.technical.isHttps) ? hostA : ((siteB.technical.isHttps && !siteA.technical.isHttps) ? hostB : 'Tie')
    },
    {
      metric: 'Structured Data Schema',
      valA: `${siteA.stats.structuredDataCount} blocks`,
      valB: `${siteB.stats.structuredDataCount} blocks`,
      advantage: siteA.stats.structuredDataCount > siteB.stats.structuredDataCount ? hostA : (siteB.stats.structuredDataCount > siteA.stats.structuredDataCount ? hostB : 'Tie')
    }
  ];

  const tbody = document.getElementById('compareTableBody');
  tbody.innerHTML = '';

  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-900/40 transition';
    tr.innerHTML = `
      <td class="py-3 px-4 font-medium text-white">${r.metric}</td>
      <td class="py-3 px-4 font-mono">${r.valA}</td>
      <td class="py-3 px-4 font-mono">${r.valB}</td>
      <td class="py-3 px-4 text-center">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${r.advantage === hostA ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : (r.advantage === hostB ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-slate-800 text-slate-400')}">
          ${r.advantage}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Setup Interactive Tabs
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active-tab'));
      panes.forEach(p => p.classList.add('hidden'));

      tab.classList.add('active-tab');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId)?.classList.remove('hidden');
    });
  });
}

// Setup SERP Device Switch
function setupSERPSwitch() {
  const deskBtn = document.getElementById('serpDesktopBtn');
  const mobBtn = document.getElementById('serpMobileBtn');
  const container = document.getElementById('serpContainer');

  deskBtn.addEventListener('click', () => {
    deskBtn.className = 'px-2.5 py-1 rounded-lg bg-blue-600 text-white font-medium';
    mobBtn.className = 'px-2.5 py-1 rounded-lg text-slate-400 hover:text-white';
    container.style.maxWidth = '42rem';
  });

  mobBtn.addEventListener('click', () => {
    mobBtn.className = 'px-2.5 py-1 rounded-lg bg-blue-600 text-white font-medium';
    deskBtn.className = 'px-2.5 py-1 rounded-lg text-slate-400 hover:text-white';
    container.style.maxWidth = '24rem';
  });
}

// Setup Copy Buttons
function setupCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.onclick = () => {
      let textToCopy = btn.getAttribute('data-code');
      if (!textToCopy) {
        const targetId = btn.getAttribute('data-copy-target');
        if (targetId) {
          textToCopy = document.getElementById(targetId)?.innerText;
        }
      }
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy);
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i> Copied!`;
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          if (window.lucide) window.lucide.createIcons();
        }, 1800);
      }
    };
  });
}

// Setup Export / Print
function setupExport() {
  document.getElementById('exportReportBtn')?.addEventListener('click', () => {
    window.print();
  });
}

// History Handling
function saveToHistory(data) {
  try {
    const list = JSON.parse(localStorage.getItem('seo_audit_history') || '[]');
    const existing = list.findIndex(item => item.url === data.url);
    if (existing !== -1) list.splice(existing, 1);
    list.unshift({
      url: data.url,
      score: data.scores.overall,
      date: new Date().toLocaleDateString()
    });
    localStorage.setItem('seo_audit_history', JSON.stringify(list.slice(0, 8)));
    loadHistory();
  } catch (e) {
    // ignore quota errs
  }
}

function loadHistory() {
  const container = document.getElementById('historyList');
  const clearBtn = document.getElementById('clearHistoryBtn');
  if (!container) return;

  const list = JSON.parse(localStorage.getItem('seo_audit_history') || '[]');
  if (list.length === 0) {
    container.innerHTML = `<span class="text-xs text-slate-600 italic">No recent audits yet.</span>`;
    return;
  }

  container.innerHTML = '';
  list.forEach(item => {
    const parsed = new URL(item.url);
    const badge = document.createElement('button');
    badge.className = 'px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition flex items-center gap-2';
    badge.innerHTML = `
      <span class="w-2 h-2 rounded-full ${item.score >= 80 ? 'bg-emerald-400' : (item.score >= 60 ? 'bg-amber-400' : 'bg-rose-400')}"></span>
      <span class="font-medium">${parsed.hostname}</span>
      <span class="font-mono text-slate-500 font-bold">${item.score}</span>
    `;
    badge.addEventListener('click', () => {
      document.getElementById('targetUrlInput').value = item.url;
      document.getElementById('auditForm').dispatchEvent(new Event('submit'));
    });
    container.appendChild(badge);
  });

  clearBtn.onclick = () => {
    localStorage.removeItem('seo_audit_history');
    loadHistory();
  };
}

// Setup Auto-Fix Integrations (GitHub, WordPress, HTML Downloads)
function setupAutoFixIntegrations() {
  // 1. GitHub Pull Request Deploy
  const ghBtn = document.getElementById('ghDeployBtn');
  const ghStatus = document.getElementById('ghStatusMsg');

  ghBtn?.addEventListener('click', async () => {
    const token = document.getElementById('ghTokenInput').value.trim();
    const repo = document.getElementById('ghRepoInput').value.trim();
    const branch = document.getElementById('ghBranchInput').value.trim() || 'main';
    const filePath = document.getElementById('ghFileInput').value.trim() || 'index.html';
    const chosenTitle = document.getElementById('autoFixTitleSelect').value;
    const chosenDesc = document.getElementById('autoFixDescSelect').value;

    if (!token || !repo) {
      alert('Please enter your GitHub Personal Access Token and Repository (owner/repo).');
      return;
    }

    if (!currentOptimizations) {
      alert('Please run an audit on a website first.');
      return;
    }

    ghBtn.disabled = true;
    ghBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin text-emerald-400"></i> Creating Pull Request...`;
    ghStatus.classList.remove('hidden');
    ghStatus.className = 'text-[11px] mt-2 text-slate-400 p-2 rounded bg-slate-950 border border-slate-800';
    ghStatus.textContent = 'Contacting GitHub API, creating branch, and committing changes...';

    try {
      const res = await fetch('/api/integrations/github/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          repo,
          branch,
          filePath,
          optimizations: currentOptimizations,
          chosenTitle,
          chosenDesc
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create GitHub Pull Request');
      }

      ghStatus.className = 'text-[11px] mt-2 text-emerald-400 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30';
      ghStatus.innerHTML = `
        <div class="font-bold mb-1 flex items-center gap-1.5"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Pull Request #${data.prNumber} Created!</div>
        <a href="${data.pullRequestUrl}" target="_blank" class="underline text-blue-400 hover:text-blue-300 font-semibold block truncate">
          ${data.pullRequestUrl} &rarr;
        </a>
      `;
    } catch (err) {
      ghStatus.className = 'text-[11px] mt-2 text-rose-400 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30';
      ghStatus.textContent = `Error: ${err.message}`;
    } finally {
      ghBtn.disabled = false;
      ghBtn.innerHTML = `<i data-lucide="git-pull-request" class="w-4 h-4 text-emerald-400"></i> Open GitHub Pull Request`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // 2. WordPress Push
  const wpBtn = document.getElementById('wpDeployBtn');
  const wpStatus = document.getElementById('wpStatusMsg');

  wpBtn?.addEventListener('click', async () => {
    const siteUrl = document.getElementById('wpSiteUrlInput').value.trim();
    const username = document.getElementById('wpUsernameInput').value.trim();
    const appPassword = document.getElementById('wpPasswordInput').value.trim();
    const postType = document.getElementById('wpTypeSelect').value;
    const itemId = document.getElementById('wpItemIdInput').value.trim();
    const chosenTitle = document.getElementById('autoFixTitleSelect').value;
    const chosenDesc = document.getElementById('autoFixDescSelect').value;

    if (!siteUrl || !username || !appPassword || !itemId) {
      alert('Please fill in WordPress URL, username, application password, and Page/Post ID.');
      return;
    }

    if (!currentOptimizations) {
      alert('Please run an audit on a website first.');
      return;
    }

    wpBtn.disabled = true;
    wpBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin text-blue-400"></i> Updating WordPress...`;
    wpStatus.classList.remove('hidden');
    wpStatus.className = 'text-[11px] mt-2 text-slate-400 p-2 rounded bg-slate-950 border border-slate-800';
    wpStatus.textContent = 'Connecting to WordPress REST API...';

    try {
      const res = await fetch('/api/integrations/wordpress/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl,
          username,
          appPassword,
          postType,
          itemId,
          optimizations: currentOptimizations,
          chosenTitle,
          chosenDesc
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update WordPress item');
      }

      wpStatus.className = 'text-[11px] mt-2 text-emerald-400 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30';
      wpStatus.innerHTML = `
        <div class="font-bold mb-1 flex items-center gap-1.5"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Updated: "${escapeHtml(data.title)}"!</div>
        <a href="${data.link}" target="_blank" class="underline text-blue-400 hover:text-blue-300 font-semibold block truncate">
          View Live on WordPress &rarr;
        </a>
      `;
    } catch (err) {
      wpStatus.className = 'text-[11px] mt-2 text-rose-400 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30';
      wpStatus.textContent = `Error: ${err.message}`;
    } finally {
      wpBtn.disabled = false;
      wpBtn.innerHTML = `<i data-lucide="upload-cloud" class="w-4 h-4"></i> Push Fixes to WordPress`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // 3. Download Patched HTML
  document.getElementById('downloadHtmlBtn')?.addEventListener('click', async () => {
    if (!currentOptimizations) {
      alert('Please run an audit first.');
      return;
    }

    const chosenTitle = document.getElementById('autoFixTitleSelect').value;
    const chosenDesc = document.getElementById('autoFixDescSelect').value;

    try {
      const res = await fetch('/api/patch-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optimizations: currentOptimizations,
          chosenTitle,
          chosenDesc
        })
      });

      const data = await res.json();
      const blob = new Blob([data.patchedHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'index.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download: ' + e.message);
    }
  });

  // 4. Download robots.txt
  document.getElementById('downloadRobotsBtn')?.addEventListener('click', () => {
    if (!currentOptimizations?.recommendedRobotsTxt) {
      alert('Please run an audit first.');
      return;
    }
    const blob = new Blob([currentOptimizations.recommendedRobotsTxt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robots.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // 5. Hamburger Pull-Down Menu Controls
  const fixMenuBtn = document.getElementById('fixMenuBtn');
  const fixDropdownMenu = document.getElementById('fixDropdownMenu');
  const fixMenuChevron = document.getElementById('fixMenuChevron');
  const fixDropdownContainer = document.getElementById('fixDropdownContainer');

  function closeFixMenu() {
    if (fixDropdownMenu && !fixDropdownMenu.classList.contains('hidden')) {
      fixDropdownMenu.classList.add('hidden');
      fixMenuChevron?.classList.remove('rotate-180');
    }
  }

  fixMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = fixDropdownMenu.classList.contains('hidden');
    if (isHidden) {
      fixDropdownMenu.classList.remove('hidden');
      fixMenuChevron?.classList.add('rotate-180');
    } else {
      closeFixMenu();
    }
  });

  document.addEventListener('click', (e) => {
    if (fixDropdownContainer && !fixDropdownContainer.contains(e.target)) {
      closeFixMenu();
    }
  });

  async function triggerDownloadBundle(btnElement) {
    if (!currentOptimizations || !currentAuditData) {
      alert('Please run an audit on a website first.');
      return;
    }

    const originalContent = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin text-slate-950"></i> Packaging .zip...`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const chosenTitle = document.getElementById('autoFixTitleSelect')?.value || currentOptimizations.titleOptions[0]?.title;
      const chosenDesc = document.getElementById('autoFixDescSelect')?.value || currentOptimizations.descOptions[0]?.description;

      const res = await fetch('/api/patch-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optimizations: currentOptimizations,
          chosenTitle,
          chosenDesc
        })
      });

      const data = await res.json();
      const patchedHtml = data.patchedHtml;

      if (window.JSZip) {
        const zip = new JSZip();
        zip.file('index.html', patchedHtml);
        zip.file('robots.txt', currentOptimizations.recommendedRobotsTxt);
        
        let schemaClean = currentOptimizations.schemaSnippets.website.replace(/<\/?script[^>]*>/g, '').trim();
        zip.file('schema.json', schemaClean);
        zip.file('SEO-REPORT.txt', generateTextReport(currentAuditData, currentOptimizations));

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const host = new URL(currentAuditData.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
        a.download = `seo-fixed-bundle-${host}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([patchedHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'index.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Failed to package zip bundle: ' + err.message);
    } finally {
      btnElement.disabled = false;
      btnElement.innerHTML = originalContent;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // Pull-down Menu: Download Fixed Code (.zip)
  const menuBundleBtn = document.getElementById('menuDownloadBundleBtn');
  menuBundleBtn?.addEventListener('click', async () => {
    closeFixMenu();
    await triggerDownloadBundle(menuBundleBtn);
  });

  // Pull-down Menu: Download Fixed HTML
  document.getElementById('menuDownloadHtmlBtn')?.addEventListener('click', () => {
    closeFixMenu();
    document.getElementById('downloadHtmlBtn')?.click();
  });

  // Pull-down Menu: Download robots.txt
  document.getElementById('menuDownloadRobotsBtn')?.addEventListener('click', () => {
    closeFixMenu();
    document.getElementById('downloadRobotsBtn')?.click();
  });

  // Pull-down Menu: Switch to GitHub PR in Auto-Apply Tab
  document.getElementById('menuGithubBtn')?.addEventListener('click', () => {
    closeFixMenu();
    const autoFixTabBtn = document.querySelector('[data-tab="tab-autofix"]');
    if (autoFixTabBtn) {
      autoFixTabBtn.click();
      setTimeout(() => {
        const ghInput = document.getElementById('ghTokenInput');
        ghInput?.focus();
        ghInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  });

  // Pull-down Menu: Switch to WordPress in Auto-Apply Tab
  document.getElementById('menuWordpressBtn')?.addEventListener('click', () => {
    closeFixMenu();
    const autoFixTabBtn = document.querySelector('[data-tab="tab-autofix"]');
    if (autoFixTabBtn) {
      autoFixTabBtn.click();
      setTimeout(() => {
        const wpInput = document.getElementById('wpSiteUrlInput');
        wpInput?.focus();
        wpInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  });
}

function generateTextReport(data, opts) {
  return `=====================================================
SEO MASTER AUDIT & OPTIMIZATION REPORT
Target URL: ${data.url}
Overall Health Score: ${data.scores.overall}/100
Timestamp: ${new Date().toLocaleString()}
=====================================================

1. CATEGORY HEALTH SCORES:
- On-Page SEO: ${data.scores.onPage}/100
- Content & Keywords: ${data.scores.content}/100
- Technical & Speed: ${data.scores.technical}/100
- Mobile & Usability: ${data.scores.mobile}/100
- Social & Schema: ${data.scores.social}/100

2. DETECTED ISSUES FIXED IN THIS BUNDLE:
${data.issues.filter(i => i.type !== 'passed').map(i => `[${i.type.toUpperCase()}] ${i.title}
  - Current: ${i.current}
  - Recommendation: ${i.recommended}`).join('\n\n')}

3. APPLIED FIXES IN BUNDLED FILES:
- index.html: Injected Title, Meta Description, Viewport, Canonical, and Schema.org JSON-LD
- Image Alt Tags: Found ${data.stats.imagesWithoutAlt} images missing alt; patched with descriptive labels
- robots.txt: Standard crawler whitelist with sitemap link
- schema.json: Structured data ready for Google Rich Snippets

Report generated by SEO Master
=====================================================`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
