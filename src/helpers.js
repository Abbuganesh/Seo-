// Helper functions for text processing, readability, and keyword extraction

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
  'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while',
  'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
  'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 'will', 'just', 'get', 'also', 'like', 'one',
  'use', 'new', 'time', 'see', 'way', 'make', 'us', 'our', 'even', 'first', 'well'
]);

/**
 * Normalizes URL and ensures protocol exists
 */
function normalizeUrl(inputUrl) {
  let url = inputUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    return parsed.href;
  } catch (err) {
    throw new Error('Invalid URL format: ' + inputUrl);
  }
}

/**
 * Counts syllables in an English word
 */
function countSyllables(word) {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleanWord) return 0;
  if (cleanWord.length <= 3) return 1;

  let syllables = cleanWord
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g);

  return syllables ? syllables.length : 1;
}

/**
 * Calculates Flesch Reading Ease score
 * 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
 */
function calculateReadability(text) {
  if (!text || text.trim().length === 0) {
    return { score: 0, grade: 'N/A', interpretation: 'No content' };
  }

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.match(/\b[A-Za-z0-9'-]+\b/g) || [];

  if (words.length === 0) {
    return { score: 0, grade: 'N/A', interpretation: 'No words found' };
  }

  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = words.length;

  let syllableCount = 0;
  for (const word of words) {
    syllableCount += countSyllables(word);
  }

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  let score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  score = Math.max(0, Math.min(100, Math.round(score * 10) / 10));

  let grade = '';
  let interpretation = '';

  if (score >= 90) {
    grade = '5th grade';
    interpretation = 'Very Easy to read';
  } else if (score >= 80) {
    grade = '6th grade';
    interpretation = 'Easy to read';
  } else if (score >= 70) {
    grade = '7th grade';
    interpretation = 'Fairly Easy';
  } else if (score >= 60) {
    grade = '8th & 9th grade';
    interpretation = 'Standard (Plain English)';
  } else if (score >= 50) {
    grade = '10th to 12th grade';
    interpretation = 'Fairly Difficult';
  } else if (score >= 30) {
    grade = 'College level';
    interpretation = 'Difficult';
  } else {
    grade = 'College graduate';
    interpretation = 'Very Difficult';
  }

  return {
    score,
    grade,
    interpretation,
    wordCount,
    sentenceCount,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    estimatedReadingTimeMinutes: Math.max(1, Math.ceil(wordCount / 200))
  };
}

/**
 * Extracts top 1-word, 2-word, and 3-word keywords and phrases with density
 */
function extractKeywords(text, totalWords) {
  if (!text || totalWords === 0) return { single: [], bigrams: [], trigrams: [] };

  const rawWords = (text.toLowerCase().match(/[a-z0-9'-]+/g) || [])
    .map(w => w.replace(/^[-']+|[-']+$/g, ''))
    .filter(w => w.length > 2);

  // Single words (filtered by stopwords)
  const singleFreq = {};
  for (const word of rawWords) {
    if (!STOPWORDS.has(word) && !/^\d+$/.test(word)) {
      singleFreq[word] = (singleFreq[word] || 0) + 1;
    }
  }

  const single = Object.entries(singleFreq)
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: Math.round((count / totalWords) * 1000) / 10
    }))
    .filter(item => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Bigrams (2-word phrases)
  const bigramFreq = {};
  for (let i = 0; i < rawWords.length - 1; i++) {
    const w1 = rawWords[i];
    const w2 = rawWords[i + 1];
    // We want at least one non-stopword
    if (!STOPWORDS.has(w1) || !STOPWORDS.has(w2)) {
      const phrase = `${w1} ${w2}`;
      bigramFreq[phrase] = (bigramFreq[phrase] || 0) + 1;
    }
  }

  const bigrams = Object.entries(bigramFreq)
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: Math.round((count / Math.max(1, totalWords - 1)) * 1000) / 10
    }))
    .filter(item => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Trigrams (3-word phrases)
  const trigramFreq = {};
  for (let i = 0; i < rawWords.length - 2; i++) {
    const w1 = rawWords[i];
    const w2 = rawWords[i + 1];
    const w3 = rawWords[i + 2];
    if (!STOPWORDS.has(w1) || !STOPWORDS.has(w2) || !STOPWORDS.has(w3)) {
      const phrase = `${w1} ${w2} ${w3}`;
      trigramFreq[phrase] = (trigramFreq[phrase] || 0) + 1;
    }
  }

  const trigrams = Object.entries(trigramFreq)
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: Math.round((count / Math.max(1, totalWords - 2)) * 1000) / 10
    }))
    .filter(item => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return { single, bigrams, trigrams };
}

module.exports = {
  STOPWORDS,
  normalizeUrl,
  calculateReadability,
  extractKeywords
};
