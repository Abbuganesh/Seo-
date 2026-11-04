const axios = require('axios');
const cheerio = require('cheerio');
const { normalizeUrl, calculateReadability, extractKeywords } = require('./helpers');

/**
 * Perform a full SEO audit of the target URL
 */
async function analyzeUrl(targetUrl) {
  const normalized = normalizeUrl(targetUrl);
  const parsedUrl = new URL(normalized);
  const origin = parsedUrl.origin;

  const startTime = Date.now();
  let response;

  try {
    response = await axios.get(normalized, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Allow 404/403 to be audited
    });
  } catch (error) {
    if (error.response) {
      response = error.response;
    } else {
      throw new Error(`Failed to crawl URL: ${error.message}`);
    }
  }

  const responseTimeMs = Date.now() - startTime;
  const rawHtml = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  const htmlSize = Buffer.byteLength(rawHtml, 'utf8');
  const headers = response.headers || {};
  const statusCode = response.status;
  const finalUrl = response.request?.res?.responseUrl || normalized;
  const isRedirected = finalUrl !== normalized;

  // Asynchronously check robots.txt and sitemap.xml
  const [robotsInfo, sitemapInfo] = await Promise.all([
    checkRobotsTxt(origin),
    checkSitemapXml(origin)
  ]);

  // Parse HTML using Cheerio
  const $ = cheerio.load(rawHtml);

  // 1. Meta & Title Tags
  const title = $('title').first().text().trim();
  const metaDescription = $('meta[name="description" i]').attr('content')?.trim() || '';
  const metaRobots = $('meta[name="robots" i]').attr('content')?.trim() || '';
  const canonicalHref = $('link[rel="canonical" i]').attr('href')?.trim() || '';
  const viewport = $('meta[name="viewport" i]').attr('content')?.trim() || '';
  const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type" i]').attr('content') || '';
  const language = $('html').attr('lang')?.trim() || '';
  const favicon = $('link[rel*="icon" i]').attr('href') || '/favicon.ico';

  // 2. Open Graph & Social Media Tags
  const ogTitle = $('meta[property="og:title" i]').attr('content')?.trim() || '';
  const ogDescription = $('meta[property="og:description" i]').attr('content')?.trim() || '';
  const ogImage = $('meta[property="og:image" i]').attr('content')?.trim() || '';
  const ogUrl = $('meta[property="og:url" i]').attr('content')?.trim() || '';
  const ogType = $('meta[property="og:type" i]').attr('content')?.trim() || '';
  const ogSiteName = $('meta[property="og:site_name" i]').attr('content')?.trim() || '';

  const twitterCard = $('meta[name="twitter:card" i]').attr('content')?.trim() || '';
  const twitterTitle = $('meta[name="twitter:title" i]').attr('content')?.trim() || '';
  const twitterDescription = $('meta[name="twitter:description" i]').attr('content')?.trim() || '';
  const twitterImage = $('meta[name="twitter:image" i]').attr('content')?.trim() || '';

  // 3. Headings Structure (H1 - H6)
  const headings = {
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: []
  };

  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text) {
      headings[tag].push(text);
    }
  });

  // 4. Content & Text Analysis
  // Remove non-content elements for accurate text extraction
  const contentCheerio = cheerio.load(rawHtml);
  contentCheerio('script, style, noscript, svg, nav, footer, header, [aria-hidden="true"]').remove();
  const visibleText = contentCheerio('body').text().replace(/\s+/g, ' ').trim();
  const textLength = visibleText.length;
  const wordMatch = visibleText.match(/\b[A-Za-z0-9'-]+\b/g) || [];
  const wordCount = wordMatch.length;
  const textToHtmlRatio = htmlSize > 0 ? Math.round((textLength / htmlSize) * 1000) / 10 : 0;
  const readability = calculateReadability(visibleText);
  const keywords = extractKeywords(visibleText, wordCount);

  // 5. Images Analysis
  const images = [];
  let imagesWithoutAlt = 0;
  let lazyLoadedImages = 0;

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    const alt = $(el).attr('alt');
    const hasAlt = alt !== undefined && alt !== null;
    const isAltEmpty = hasAlt && alt.trim() === '';
    const loading = $(el).attr('loading') || '';

    if (!hasAlt || isAltEmpty) {
      imagesWithoutAlt++;
    }
    if (loading.toLowerCase() === 'lazy') {
      lazyLoadedImages++;
    }

    if (images.length < 25) {
      images.push({
        src: src.startsWith('//') ? 'https:' + src : (src.startsWith('/') ? origin + src : src),
        alt: hasAlt ? alt : null,
        hasAlt: hasAlt && !isAltEmpty,
        loading
      });
    }
  });

  const totalImages = $('img').length;

  // 6. Links Analysis
  const links = [];
  let internalLinksCount = 0;
  let externalLinksCount = 0;
  let nofollowLinksCount = 0;
  let emptyAnchorLinksCount = 0;

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim() || '';
    const rel = $(el).attr('rel') || '';
    const anchorText = $(el).text().replace(/\s+/g, ' ').trim();
    const isNofollow = rel.includes('nofollow') || rel.includes('ugc');

    if (!anchorText && !$(el).find('img').length) {
      emptyAnchorLinksCount++;
    }
    if (isNofollow) {
      nofollowLinksCount++;
    }

    let isInternal = false;
    try {
      if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?') || href.includes(parsedUrl.hostname)) {
        isInternal = true;
        internalLinksCount++;
      } else if (href.startsWith('http://') || href.startsWith('https://')) {
        externalLinksCount++;
      }
    } catch {
      // ignore invalid hrefs
    }

    if (links.length < 30 && href && !href.startsWith('javascript:')) {
      links.push({
        href,
        text: anchorText || '[Image / Icon Link]',
        isInternal,
        isNofollow
      });
    }
  });

  const totalLinks = $('a[href]').length;

  // 7. Structured Data / Schema.org (JSON-LD)
  const structuredData = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const content = $(el).html();
    try {
      const parsed = JSON.parse(content);
      const types = Array.isArray(parsed) 
        ? parsed.map(p => p['@type']).filter(Boolean)
        : (parsed['@graph'] ? parsed['@graph'].map(p => p['@type']).filter(Boolean) : [parsed['@type']].filter(Boolean));
      structuredData.push({
        valid: true,
        types: types.flat(),
        data: parsed
      });
    } catch (e) {
      structuredData.push({
        valid: false,
        error: e.message,
        snippet: content.substring(0, 150)
      });
    }
  });

  // 8. Technical & Security Headers
  const isHttps = parsedUrl.protocol === 'https:';
  const hasHsts = Boolean(headers['strict-transport-security']);
  const contentEncoding = headers['content-encoding'] || 'none';
  const xRobotsTag = headers['x-robots-tag'] || '';

  // 9. Comprehensive Issue Generation and Category Scoring
  const auditResult = generateIssuesAndScore({
    url: normalized,
    finalUrl,
    isRedirected,
    statusCode,
    responseTimeMs,
    htmlSize,
    title,
    metaDescription,
    metaRobots,
    canonicalHref,
    viewport,
    charset,
    language,
    headings,
    wordCount,
    textToHtmlRatio,
    readability,
    keywords,
    totalImages,
    imagesWithoutAlt,
    lazyLoadedImages,
    totalLinks,
    internalLinksCount,
    externalLinksCount,
    emptyAnchorLinksCount,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    structuredData,
    robotsInfo,
    sitemapInfo,
    isHttps,
    hasHsts,
    contentEncoding,
    xRobotsTag
  });

  return {
    url: normalized,
    finalUrl,
    isRedirected,
    statusCode,
    responseTimeMs,
    htmlSizeKb: Math.round((htmlSize / 1024) * 10) / 10,
    timestamp: new Date().toISOString(),
    scores: auditResult.scores,
    stats: {
      titleLength: title.length,
      descriptionLength: metaDescription.length,
      headingsCount: {
        h1: headings.h1.length,
        h2: headings.h2.length,
        h3: headings.h3.length,
        h4: headings.h4.length,
        h5: headings.h5.length,
        h6: headings.h6.length,
        total: headings.h1.length + headings.h2.length + headings.h3.length + headings.h4.length + headings.h5.length + headings.h6.length
      },
      wordCount,
      textToHtmlRatio,
      readabilityScore: readability.score,
      readingEase: readability.interpretation,
      readingTimeMin: readability.estimatedReadingTimeMinutes,
      totalImages,
      imagesWithoutAlt,
      totalLinks,
      internalLinksCount,
      externalLinksCount,
      emptyAnchorLinksCount,
      structuredDataCount: structuredData.length
    },
    meta: {
      title,
      metaDescription,
      metaRobots,
      canonicalHref,
      viewport,
      charset,
      language,
      favicon: favicon.startsWith('//') ? 'https:' + favicon : (favicon.startsWith('/') ? origin + favicon : favicon),
      og: {
        title: ogTitle,
        description: ogDescription,
        image: ogImage.startsWith('//') ? 'https:' + ogImage : (ogImage.startsWith('/') ? origin + ogImage : ogImage),
        url: ogUrl,
        type: ogType,
        siteName: ogSiteName
      },
      twitter: {
        card: twitterCard,
        title: twitterTitle,
        description: twitterDescription,
        image: twitterImage.startsWith('//') ? 'https:' + twitterImage : (twitterImage.startsWith('/') ? origin + twitterImage : twitterImage)
      }
    },
    headings,
    keywords,
    images: images.slice(0, 15),
    links: links.slice(0, 20),
    structuredData,
    technical: {
      isHttps,
      hasHsts,
      contentEncoding,
      xRobotsTag,
      robotsInfo,
      sitemapInfo
    },
    issues: auditResult.issues
  };
}

/**
 * Checks if robots.txt exists and extracts sitemaps
 */
async function checkRobotsTxt(origin) {
  try {
    const res = await axios.get(`${origin}/robots.txt`, {
      timeout: 5000,
      validateStatus: () => true
    });
    if (res.status === 200 && typeof res.data === 'string') {
      const hasDisallowAll = /Disallow:\s*\/\s*$/m.test(res.data);
      const sitemapMatches = res.data.match(/Sitemap:\s*(https?:\/\/[^\s]+)/gi) || [];
      const sitemaps = sitemapMatches.map(s => s.replace(/Sitemap:\s*/i, '').trim());
      return {
        exists: true,
        statusCode: 200,
        hasDisallowAll,
        sitemaps,
        snippet: res.data.substring(0, 500)
      };
    }
    return { exists: false, statusCode: res.status };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

/**
 * Checks if sitemap.xml exists
 */
async function checkSitemapXml(origin) {
  try {
    const res = await axios.get(`${origin}/sitemap.xml`, {
      timeout: 5000,
      headers: { 'Accept': 'application/xml,text/xml,*/*' },
      validateStatus: () => true
    });
    if (res.status === 200) {
      const isXml = typeof res.data === 'string' && (res.data.includes('<urlset') || res.data.includes('<sitemapindex'));
      return {
        exists: true,
        statusCode: 200,
        isValidXml: isXml
      };
    }
    return { exists: false, statusCode: res.status };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

/**
 * Evaluates all audit criteria, computes individual and overall scores, and returns actionable issues
 */
function generateIssuesAndScore(data) {
  const issues = [];

  // Sub-scores tracking (max 100 each)
  let onPagePoints = 100;
  let contentPoints = 100;
  let technicalPoints = 100;
  let mobilePoints = 100;
  let socialPoints = 100;

  // 1. Title Tag Check
  if (!data.title) {
    onPagePoints -= 35;
    issues.push({
      category: 'On-Page SEO',
      type: 'critical',
      title: 'Missing Page Title Tag',
      current: 'None',
      recommended: '50-60 characters descriptive title with primary keyword',
      description: 'The <title> tag is one of the most critical on-page ranking factors. Search engines use it as the main clickable headline in search results.',
      codeSnippet: `<title>Primary Keyword - Compelling Value Proposition | Brand Name</title>`
    });
  } else if (data.title.length < 30) {
    onPagePoints -= 12;
    issues.push({
      category: 'On-Page SEO',
      type: 'warning',
      title: 'Page Title is Too Short',
      current: `${data.title.length} characters ("${data.title}")`,
      recommended: '50 - 60 characters',
      description: 'Short titles miss out on valuable keyword opportunities and may result in lower click-through rates from search engine results pages (SERPs).',
      codeSnippet: `<title>${data.title} - Free Guide & Top Solutions</title>`
    });
  } else if (data.title.length > 60) {
    onPagePoints -= 10;
    issues.push({
      category: 'On-Page SEO',
      type: 'warning',
      title: 'Page Title is Too Long (Risk of Truncation)',
      current: `${data.title.length} characters ("${data.title.substring(0, 50)}...")`,
      recommended: '50 - 60 characters to prevent SERP truncation',
      description: 'Google typically truncates titles longer than 60 characters or ~600 pixels on desktop and mobile.',
      codeSnippet: `<title>${data.title.substring(0, 57)}...</title>`
    });
  } else {
    issues.push({
      category: 'On-Page SEO',
      type: 'passed',
      title: 'Optimal Title Tag Length',
      current: `${data.title.length} characters`,
      recommended: '50 - 60 characters',
      description: 'Your title tag length is well-optimized for Google search results.'
    });
  }

  // 2. Meta Description Check
  if (!data.metaDescription) {
    onPagePoints -= 25;
    issues.push({
      category: 'On-Page SEO',
      type: 'critical',
      title: 'Missing Meta Description',
      current: 'None',
      recommended: '140-160 characters compelling summary with call-to-action',
      description: 'Without a meta description, search engines auto-generate snippets which often look fragmented and lower click-through rates.',
      codeSnippet: `<meta name="description" content="Discover our complete range of products with fast delivery, verified reviews, and expert support. Get started today!">`
    });
  } else if (data.metaDescription.length < 80) {
    onPagePoints -= 10;
    issues.push({
      category: 'On-Page SEO',
      type: 'warning',
      title: 'Meta Description is Too Short',
      current: `${data.metaDescription.length} characters`,
      recommended: '130 - 160 characters',
      description: 'Short meta descriptions do not fully utilize the SERP snippet real estate to persuade searchers.',
      codeSnippet: `<meta name="description" content="${data.metaDescription} Explore our comprehensive features and start your trial today.">`
    });
  } else if (data.metaDescription.length > 165) {
    onPagePoints -= 8;
    issues.push({
      category: 'On-Page SEO',
      type: 'warning',
      title: 'Meta Description Exceeds Standard Length',
      current: `${data.metaDescription.length} characters`,
      recommended: '140 - 160 characters',
      description: 'Descriptions exceeding 160 characters will likely be cut off with an ellipsis (...) in Google search snippets.'
    });
  } else {
    issues.push({
      category: 'On-Page SEO',
      type: 'passed',
      title: 'Optimal Meta Description Length',
      current: `${data.metaDescription.length} characters`,
      recommended: '140 - 160 characters',
      description: 'Your meta description length is ideal for high click-through rates in Google snippets.'
    });
  }

  // 3. Headings Structure (H1)
  const h1Count = data.headings.h1.length;
  if (h1Count === 0) {
    onPagePoints -= 25;
    issues.push({
      category: 'On-Page SEO',
      type: 'critical',
      title: 'Missing Primary Heading (H1)',
      current: '0 H1 headings',
      recommended: 'Exactly 1 H1 tag per page',
      description: 'The <h1> heading communicates the primary topic of the page to search engine algorithms and screen readers.',
      codeSnippet: `<h1>Your Main Page Title & Primary Value</h1>`
    });
  } else if (h1Count > 1) {
    onPagePoints -= 12;
    issues.push({
      category: 'On-Page SEO',
      type: 'warning',
      title: 'Multiple H1 Tags Detected',
      current: `${h1Count} H1 tags found`,
      recommended: 'Exactly 1 H1 tag per page for clean semantic hierarchy',
      description: 'While HTML5 permits multiple H1s, standard SEO best practices advise having a single, definitive H1 representing the topic, with subheadings as H2/H3.',
      codeSnippet: `<!-- Keep primary title as H1, convert secondary sections to H2: -->\n<h2>Secondary Section</h2>`
    });
  } else {
    issues.push({
      category: 'On-Page SEO',
      type: 'passed',
      title: 'Single H1 Tag Found',
      current: `1 H1: "${data.headings.h1[0].substring(0, 60)}"`,
      recommended: '1 H1 per page',
      description: 'Clean top-level heading structure detected.'
    });
  }

  // Subheadings (H2, H3)
  const totalSubheadings = data.headings.h2.length + data.headings.h3.length;
  if (totalSubheadings === 0 && data.wordCount > 300) {
    onPagePoints -= 10;
    issues.push({
      category: 'On-Page SEO',
      type: 'warning',
      title: 'Lack of Subheadings (H2 / H3)',
      current: '0 H2 or H3 tags',
      recommended: 'Break up content into sections using H2 and H3 tags',
      description: 'Subheadings help crawlers parse distinct topical sections and improve readability for users scanning your content.'
    });
  }

  // 4. Canonical Tag
  if (!data.canonicalHref) {
    onPagePoints -= 10;
    issues.push({
      category: 'On-Page SEO',
      type: 'warning',
      title: 'Missing Canonical Tag',
      current: 'No <link rel="canonical"> found',
      recommended: 'Add a self-referencing canonical URL',
      description: 'Canonical tags prevent duplicate content penalties across protocol (http/https), www vs non-www, and URL query parameters.',
      codeSnippet: `<link rel="canonical" href="${data.url}">`
    });
  } else {
    issues.push({
      category: 'On-Page SEO',
      type: 'passed',
      title: 'Canonical Tag Implemented',
      current: data.canonicalHref,
      recommended: 'Self-referencing canonical URL',
      description: 'Helps search engines identify the master URL version.'
    });
  }

  // 5. Content & Word Count
  if (data.wordCount < 150) {
    contentPoints -= 35;
    issues.push({
      category: 'Content & Keywords',
      type: 'critical',
      title: 'Thin Content Detected (Very Low Word Count)',
      current: `${data.wordCount} words`,
      recommended: 'At least 300-600 words for standard pages, 1000+ for articles',
      description: 'Google\'s quality algorithms frequently penalize "thin content" pages that provide little comprehensive information to users.'
    });
  } else if (data.wordCount < 300) {
    contentPoints -= 15;
    issues.push({
      category: 'Content & Keywords',
      type: 'warning',
      title: 'Low Word Count',
      current: `${data.wordCount} words`,
      recommended: 'Aim for 400+ words to rank for secondary queries',
      description: 'Pages with more in-depth content generally rank higher across a broader spectrum of search queries.'
    });
  } else {
    issues.push({
      category: 'Content & Keywords',
      type: 'passed',
      title: 'Healthy Content Length',
      current: `${data.wordCount} words`,
      recommended: '300+ words',
      description: 'Sufficient content depth for search engines to index.'
    });
  }

  // Text to HTML ratio
  if (data.textToHtmlRatio < 8) {
    contentPoints -= 10;
    issues.push({
      category: 'Content & Keywords',
      type: 'warning',
      title: 'Low Text to HTML Ratio',
      current: `${data.textToHtmlRatio}%`,
      recommended: '15% or higher',
      description: 'A low text-to-code ratio indicates excessive markup, inline styles, or heavy scripts relative to actual readable text.'
    });
  }

  // Keyword in Title & H1 Check
  if (data.keywords.single.length > 0) {
    const topKeyword = data.keywords.single[0].keyword;
    const inTitle = data.title.toLowerCase().includes(topKeyword);
    const inH1 = (data.headings.h1[0] || '').toLowerCase().includes(topKeyword);

    if (inTitle && inH1) {
      issues.push({
        category: 'Content & Keywords',
        type: 'passed',
        title: 'Keyword Consistency',
        current: `Top keyword "${topKeyword}" appears in both Title and H1`,
        recommended: 'Maintain alignment between primary keyword, Title, and H1',
        description: 'Strong topical relevance signal for search engines.'
      });
    } else if (!inTitle) {
      issues.push({
        category: 'Content & Keywords',
        type: 'warning',
        title: 'Top Keyword Missing from Title Tag',
        current: `Top keyword: "${topKeyword}"`,
        recommended: `Incorporate "${topKeyword}" naturally into the Title tag`,
        description: 'Placing the main keyword in the title is one of the highest leverage on-page optimizations.'
      });
    }
  }

  // 6. Images & Alt Tags
  if (data.totalImages > 0 && data.imagesWithoutAlt > 0) {
    const missingPercent = Math.round((data.imagesWithoutAlt / data.totalImages) * 100);
    mobilePoints -= Math.min(25, missingPercent / 2);
    issues.push({
      category: 'Accessibility & Mobile',
      type: missingPercent > 50 ? 'critical' : 'warning',
      title: `Images Missing Alt Text (${data.imagesWithoutAlt} of ${data.totalImages})`,
      current: `${data.imagesWithoutAlt} images without alt attribute`,
      recommended: 'All content images must have descriptive alt attributes',
      description: 'Alt attributes are vital for Google Image Search rankings and provide accessibility for visually impaired users using screen readers.',
      codeSnippet: `<img src="product.jpg" alt="Descriptive text explaining the product image">`
    });
  } else if (data.totalImages > 0) {
    issues.push({
      category: 'Accessibility & Mobile',
      type: 'passed',
      title: 'All Images Have Alt Attributes',
      current: `${data.totalImages} images checked`,
      recommended: '100% alt coverage',
      description: 'Excellent image accessibility and indexing compliance.'
    });
  }

  // 7. Mobile Viewport
  if (!data.viewport) {
    mobilePoints -= 40;
    issues.push({
      category: 'Accessibility & Mobile',
      type: 'critical',
      title: 'Missing Mobile Viewport Meta Tag',
      current: 'No viewport tag detected',
      recommended: 'Include standard mobile responsive viewport tag',
      description: 'Since Google operates on mobile-first indexing, sites without a viewport tag fail mobile-friendly audits.',
      codeSnippet: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
    });
  } else {
    issues.push({
      category: 'Accessibility & Mobile',
      type: 'passed',
      title: 'Mobile Viewport Configured',
      current: data.viewport,
      recommended: 'width=device-width, initial-scale=1.0',
      description: 'Optimized for mobile-first indexing.'
    });
  }

  // Language attribute
  if (!data.language) {
    mobilePoints -= 8;
    issues.push({
      category: 'Accessibility & Mobile',
      type: 'warning',
      title: 'Missing HTML lang Attribute',
      current: '<html> tag lacks lang attribute',
      recommended: '<html lang="en"> (or target locale)',
      description: 'The lang attribute declares the language of the page, helping search engines serve localized results.',
      codeSnippet: `<html lang="en">`
    });
  }

  // 8. Technical & Performance
  // HTTPS
  if (!data.isHttps) {
    technicalPoints -= 35;
    issues.push({
      category: 'Technical & Speed',
      type: 'critical',
      title: 'Not Serving Over HTTPS (Insecure Protocol)',
      current: 'HTTP (Insecure)',
      recommended: 'Upgrade to HTTPS with a valid SSL/TLS certificate',
      description: 'HTTPS is an official Google ranking signal. Browsers mark HTTP sites as insecure, causing bounce rates to spike.'
    });
  } else {
    issues.push({
      category: 'Technical & Speed',
      type: 'passed',
      title: 'Secure HTTPS Protocol',
      current: 'HTTPS active',
      recommended: 'HTTPS enabled',
      description: 'Secure connection established.'
    });
  }

  // Response Time (TTFB)
  if (data.responseTimeMs > 1800) {
    technicalPoints -= 25;
    issues.push({
      category: 'Technical & Speed',
      type: 'critical',
      title: 'Slow Server Response Time (High TTFB)',
      current: `${data.responseTimeMs} ms`,
      recommended: 'Under 600 ms',
      description: 'Slow server response degrades Core Web Vitals and crawl budget efficiency.'
    });
  } else if (data.responseTimeMs > 800) {
    technicalPoints -= 12;
    issues.push({
      category: 'Technical & Speed',
      type: 'warning',
      title: 'Moderate Server Response Time',
      current: `${data.responseTimeMs} ms`,
      recommended: 'Under 500 ms',
      description: 'Consider caching or edge CDN delivery to shave off response latency.'
    });
  } else {
    issues.push({
      category: 'Technical & Speed',
      type: 'passed',
      title: 'Fast Server Response Time',
      current: `${data.responseTimeMs} ms`,
      recommended: 'Under 800 ms',
      description: 'Fast TTFB helps deliver smooth user experiences and crawl performance.'
    });
  }

  // Compression
  if (data.contentEncoding === 'none') {
    technicalPoints -= 12;
    issues.push({
      category: 'Technical & Speed',
      type: 'warning',
      title: 'HTTP Text Compression Not Detected',
      current: 'Content-Encoding: none',
      recommended: 'Enable Gzip or Brotli compression on your web server',
      description: 'Gzip/Brotli compression typically reduces HTML transfer size by 60-80%.'
    });
  }

  // Robots.txt
  if (data.robotsInfo && data.robotsInfo.exists) {
    if (data.robotsInfo.hasDisallowAll) {
      technicalPoints -= 40;
      issues.push({
        category: 'Technical & Speed',
        type: 'critical',
        title: 'Robots.txt Blocks All Crawlers (Disallow: /)',
        current: 'Disallow: / found in robots.txt',
        recommended: 'Allow search engines access to public pages',
        description: 'Your robots.txt file instructs search engine bots not to crawl or index this website.',
        codeSnippet: `User-agent: *\nAllow: /`
      });
    } else {
      issues.push({
        category: 'Technical & Speed',
        type: 'passed',
        title: 'Valid Robots.txt File Found',
        current: 'Available at /robots.txt',
        recommended: 'Robots.txt present and permitting crawl',
        description: 'Search engines can successfully discover crawling rules.'
      });
    }
  } else {
    technicalPoints -= 8;
    issues.push({
      category: 'Technical & Speed',
      type: 'warning',
      title: 'Robots.txt File Not Found',
      current: '404 / Unavailable',
      recommended: 'Create a /robots.txt file specifying crawl guidelines and sitemap location',
      codeSnippet: `User-agent: *\nAllow: /\nSitemap: ${data.url}/sitemap.xml`
    });
  }

  // Sitemap.xml
  if (data.sitemapInfo && data.sitemapInfo.exists) {
    issues.push({
      category: 'Technical & Speed',
      type: 'passed',
      title: 'XML Sitemap Detected',
      current: 'Available at /sitemap.xml',
      recommended: 'Valid XML sitemap available',
      description: 'A sitemap ensures that newly published or deep pages are promptly discovered.'
    });
  } else {
    technicalPoints -= 10;
    issues.push({
      category: 'Technical & Speed',
      type: 'warning',
      title: 'XML Sitemap Missing at Standard Location',
      current: 'Not found at /sitemap.xml',
      recommended: 'Publish an XML sitemap and submit it to Google Search Console',
      description: 'Sitemaps help Google find orphan or deeply nested pages that lack internal links.'
    });
  }

  // 9. Social & Structured Data
  // OpenGraph Image
  if (!data.ogImage) {
    socialPoints -= 25;
    issues.push({
      category: 'Social & Structured Data',
      type: 'warning',
      title: 'Missing OpenGraph Image (og:image)',
      current: 'No og:image tag',
      recommended: '1200 x 630 px branded preview image',
      description: 'Links shared on WhatsApp, LinkedIn, Facebook, and iMessage will look bare without a rich preview thumbnail.',
      codeSnippet: `<meta property="og:image" content="https://example.com/social-share.jpg">`
    });
  } else {
    socialPoints += 5;
    issues.push({
      category: 'Social & Structured Data',
      type: 'passed',
      title: 'OpenGraph Image Configured',
      current: data.ogImage,
      recommended: '1200 x 630 px',
      description: 'Rich preview image is configured for social sharing.'
    });
  }

  // Structured Data (JSON-LD)
  if (!data.structuredData || data.structuredData.length === 0) {
    socialPoints -= 25;
    issues.push({
      category: 'Social & Structured Data',
      type: 'warning',
      title: 'No Structured Data (Schema.org / JSON-LD) Detected',
      current: '0 JSON-LD scripts found',
      recommended: 'Add Schema markup (Organization, WebSite, Article, or FAQPage)',
      description: 'Schema structured data unlocks rich snippets in Google (star ratings, site links search box, breadcrumbs, FAQs).',
      codeSnippet: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "My Website",\n  "url": "${data.url}"\n}\n</script>`
    });
  } else {
    const invalidSchemas = data.structuredData.filter(s => !s.valid);
    if (invalidSchemas.length > 0) {
      socialPoints -= 15;
      issues.push({
        category: 'Social & Structured Data',
        type: 'critical',
        title: 'Structured Data Syntax Error',
        current: `${invalidSchemas.length} invalid JSON-LD blocks`,
        recommended: 'Fix JSON syntax formatting errors',
        description: 'Search engines ignore malformed JSON-LD scripts.'
      });
    } else {
      socialPoints += 10;
      issues.push({
        category: 'Social & Structured Data',
        type: 'passed',
        title: 'Valid Schema.org Structured Data Found',
        current: `${data.structuredData.length} schema blocks: ${data.structuredData.flatMap(s => s.types).join(', ')}`,
        recommended: 'Valid JSON-LD schema',
        description: 'Enables rich Google search enhancements.'
      });
    }
  }

  // Constrain category scores between 0 and 100
  const clamp = (val) => Math.max(0, Math.min(100, Math.round(val)));
  const scores = {
    onPage: clamp(onPagePoints),
    content: clamp(contentPoints),
    technical: clamp(technicalPoints),
    mobile: clamp(mobilePoints),
    social: clamp(socialPoints)
  };

  // Weighted overall health score
  const overall = clamp(
    scores.onPage * 0.30 +
    scores.content * 0.20 +
    scores.technical * 0.25 +
    scores.mobile * 0.15 +
    scores.social * 0.10
  );

  scores.overall = overall;

  return { scores, issues };
}

module.exports = {
  analyzeUrl
};
