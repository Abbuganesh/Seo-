/**
 * SEO Optimization Engine
 * Generates fixes, improved meta tags, schema markup, and robots.txt
 */

function generateOptimizations(auditData) {
  const { url, meta, stats, headings, keywords, technical } = auditData;
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.replace(/^www\./, '');
  const brandName = hostname.split('.')[0].toUpperCase();

  // Primary topic identification
  const topSingleKeywords = keywords.single.slice(0, 3).map(k => k.keyword);
  const topBigrams = keywords.bigrams.slice(0, 2).map(k => k.keyword);

  const primaryKeyword = topBigrams[0] || topSingleKeywords[0] || (meta.title ? meta.title.split(' ')[0] : 'Solutions');
  const secondaryKeyword = topSingleKeywords[1] || 'Guide';

  const capitalizedPrimary = capitalize(primaryKeyword);
  const capitalizedSecondary = capitalize(secondaryKeyword);

  // 1. Generate 3 Optimized Title Tag Options (50-60 chars target)
  const titleOptions = [
    {
      type: 'High CTR & Value Driven',
      title: `${capitalizedPrimary} & ${capitalizedSecondary} | Official ${brandName}`,
      characterCount: `${capitalizedPrimary} & ${capitalizedSecondary} | Official ${brandName}`.length,
      explanation: 'Front-loads primary keyword, includes secondary topic, and finishes with trusted brand anchor.'
    },
    {
      type: 'Search Intent & Action Focus',
      title: `Best ${capitalizedPrimary} Solutions (2026 Guide) - ${brandName}`,
      characterCount: `Best ${capitalizedPrimary} Solutions (2026 Guide) - ${brandName}`.length,
      explanation: 'Leverages high-intent modifier "Best" and freshness indicator "(2026 Guide)" to boost clicks.'
    },
    {
      type: 'Direct Problem Solver',
      title: `Fast, Reliable ${capitalizedPrimary} | Start Today at ${brandName}`,
      characterCount: `Fast, Reliable ${capitalizedPrimary} | Start Today at ${brandName}`.length,
      explanation: 'Appeals to speed and trust with an immediate action-oriented call to action.'
    }
  ];

  // Adjust lengths if needed to stay within 50-60 range
  titleOptions.forEach(opt => {
    if (opt.title.length > 60) {
      opt.title = opt.title.substring(0, 57) + '...';
      opt.characterCount = opt.title.length;
    }
  });

  // 2. Generate 3 Optimized Meta Description Options (140-160 chars target)
  const descOptions = [
    {
      type: 'Comprehensive & Actionable',
      description: `Explore the premier ${primaryKeyword} platform by ${brandName}. Access expert tools, verified insights, and seamless support. Get started for free today!`,
      explanation: 'Balanced structure containing primary keyword, clear value propositions, and an unambiguous call-to-action.'
    },
    {
      type: 'Benefits & Features Focus',
      description: `Upgrade your ${primaryKeyword} workflow with ${brandName}. Fast, reliable, and built for modern teams. Discover features, read reviews, and try it now.`,
      explanation: 'Focuses on pain point relief and team efficiency, ideal for SaaS or service businesses.'
    },
    {
      type: 'Social Proof & Authority',
      description: `Trusted by thousands: find top-rated ${primaryKeyword} and ${secondaryKeyword} at ${brandName}. Compare options, save time, and launch your project with ease.`,
      explanation: 'Uses psychological social proof ("Trusted by thousands") to maximize organic CTR.'
    }
  ];

  descOptions.forEach(opt => {
    opt.characterCount = opt.description.length;
  });

  // 3. Generate Image Alt Tag Fixes
  const imageAltFixes = (auditData.images || [])
    .filter(img => !img.hasAlt)
    .map(img => {
      let inferred = 'Illustration';
      try {
        const filename = img.src.split('/').pop().split('?')[0].replace(/[-_.]+/g, ' ');
        if (filename && filename.length > 2 && !/^\d+$/.test(filename)) {
          inferred = capitalize(filename.replace(/\.(png|jpe?g|webp|svg|gif)$/i, ''));
        }
      } catch {
        inferred = `${capitalizedPrimary} visual element`;
      }
      return {
        src: img.src,
        suggestedAlt: `${inferred} - ${brandName} ${capitalizedPrimary}`,
        codeSnippet: `<img src="${img.src}" alt="${inferred} - ${brandName} ${capitalizedPrimary}">`
      };
    });

  // 4. Generate JSON-LD Schema Markup
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': brandName,
    'url': url,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${parsedUrl.origin}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': brandName,
    'url': parsedUrl.origin,
    'logo': meta.og.image || `${parsedUrl.origin}/logo.png`,
    'sameAs': [
      `https://twitter.com/${brandName.toLowerCase()}`,
      `https://www.linkedin.com/company/${brandName.toLowerCase()}`
    ]
  };

  const schemaSnippets = {
    website: `<script type="application/ld+json">\n${JSON.stringify(websiteSchema, null, 2)}\n</script>`,
    organization: `<script type="application/ld+json">\n${JSON.stringify(organizationSchema, null, 2)}\n</script>`
  };

  // 5. Generate Recommended Robots.txt
  const recommendedRobotsTxt = `# Optimized robots.txt for ${hostname}
User-agent: *
Allow: /

# Prevent crawl budget waste on internal search & admin
Disallow: /admin/
Disallow: /api/
Disallow: /*?*search=
Disallow: /*?*sort=

# Sitemap Declaration
Sitemap: ${parsedUrl.origin}/sitemap.xml
`;

  // 6. Generate Server Rewrite Rules (Redirect HTTP to HTTPS & Non-WWW to WWW or vice versa)
  const htaccessSnippet = `# Apache .htaccess: Force HTTPS and canonical hostname
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
`;

  const nginxSnippet = `# Nginx: Force HTTPS redirect
server {
    listen 80;
    server_name ${hostname} www.${hostname};
    return 301 https://$host$request_uri;
}
`;

  return {
    targetUrl: url,
    primaryKeyword: capitalizedPrimary,
    brandName,
    titleOptions,
    descOptions,
    imageAltFixes,
    schemaSnippets,
    recommendedRobotsTxt,
    serverRedirects: {
      htaccess: htaccessSnippet,
      nginx: nginxSnippet
    }
  };
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  generateOptimizations
};
