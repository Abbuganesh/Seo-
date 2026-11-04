# SEO Master 🚀
### Real-Time SEO Auditor, Analyzer & AI Optimizer for Any Website

**SEO Master** is a full-featured web application that audits, analyzes, and actively generates SEO fixes for any website URL you provide.

---

## 🌟 Key Features

### 1. Comprehensive Multi-Category Audit Engine
- **On-Page SEO**: Analyzes `<title>` tag (character & pixel bounds), `<meta name="description">`, `<link rel="canonical">`, `<meta name="robots">`, and full `H1`–`H6` heading hierarchy.
- **Content & Keywords**: Calculates total word count, text-to-code ratio, reading ease (Flesch-Kincaid formula), reading time, and extracts top 1-word, 2-word, and 3-word n-gram keywords with exact frequency & density percentages.
- **Technical & Speed**: Measures exact server response latency (TTFB in ms), HTTP status codes & redirect chains, SSL/HTTPS validation, HSTS security headers, Gzip/Brotli compression detection, and checks availability of `/robots.txt` and `/sitemap.xml`.
- **Accessibility & Mobile**: Mobile viewport verification, image `alt` attribute audits with thumbnail inspection, and missing language attributes.
- **Social & Schema**: OpenGraph tags (`og:title`, `og:image`, `og:description`), Twitter Card tags, and Schema.org JSON-LD structured data syntax parsing.

### 2. Auto-Generated SEO Fixer & Optimizer
- **Title Tag Proposals**: Generates 3 high-converting title variations within the 50–60 character sweet spot (CTR-focused, keyword-focused, and branded).
- **Meta Description Proposals**: 3 compelling snippet descriptions within the 140–160 character limit with strong calls to action.
- **Image Alt Fixes**: Automatically detects images missing `alt` attributes and infers contextual, descriptive alt tags.
- **Ready-to-Paste JSON-LD**: Generates valid WebSite and Organization Schema.org markup.
- **Server Directives**: Pre-configured `robots.txt`, Apache `.htaccess`, and Nginx redirect snippets.

### 3. Interactive Previews & Simulators
- **Google SERP Simulator**: Toggle between Desktop and Mobile Google search result previews.
- **Social Media Share Cards**: Live previews for Facebook, LinkedIn, and Twitter / X.

### 4. Head-to-Head Competitor Comparison
- Enter two website URLs to receive a side-by-side comparison matrix showing advantages in speed, word depth, title optimization, missing alt tags, and schema.

### 5. Export & History
- One-click PDF/Print export.
- LocalStorage history for instant re-audits.

---

## 🚀 How to Run the Website

### Option A: Double-Click
Simply double-click `start.bat` in this folder.

### Option B: Terminal / Command Prompt
```bash
cd C:\Users\proab\.gemini\antigravity\scratch\seo-master
npm start
```

Then open your browser to:
👉 **`http://localhost:3000`**

---

## 🛠 API Endpoints

- `POST /api/analyze`: Body: `{ "url": "https://example.com" }` - Returns complete audit diagnostics & scores.
- `POST /api/optimize`: Body: `{ "auditData": { ... } }` - Returns auto-generated titles, descriptions, schema, and alt tags.
- `POST /api/compare`: Body: `{ "url1": "https://siteA.com", "url2": "https://siteB.com" }` - Returns side-by-side comparison data.
