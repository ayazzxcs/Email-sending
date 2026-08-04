import { chromium } from 'playwright';
import { read, write, norm, id, validEmail, roleEmail } from './lib.js';

const queries = read('data/search-queries.json', ['shopify store contact']);
const prospects = read('data/prospects.json', []);
const known = new Map(prospects.map(p => [norm(p.email), p]));
const searxngUrl = process.env.SEARXNG_URL || 'http://127.0.0.1:8080';
const blockedHost = /google\.|bing\.|facebook\.|instagram\.|youtube\.|shopify\.com$|cloudflare\.|example\./i;
const emailRx = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
const stores = new Set();

for (const query of queries.slice(0, Number(process.env.MAX_QUERIES || 3))) {
  const endpoint = `${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=all&safesearch=0`;
  const response = await fetch(endpoint, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`SearXNG returned ${response.status}`);
  const payload = await response.json();
  for (const result of payload.results || []) {
    try {
      const url = new URL(result.url);
      if (/^https?:$/.test(url.protocol) && !blockedHost.test(url.hostname)) stores.add(url.origin);
    } catch {}
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ userAgent: 'Mozilla/5.0 QuvirlResearchBot/2.1' });

for (const origin of [...stores].slice(0, Number(process.env.MAX_STORES || 20))) {
  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 25000 });
    const html = await page.content();
    if (!/cdn\.shopify\.com|Shopify\.theme|myshopify\.com/i.test(html)) continue;

    const title = await page.title();
    const links = await page.locator('a').evaluateAll((elements, base) =>
      elements.map(a => a.href).filter(href => href && href.startsWith(base) && /contact|about|privacy/i.test(href)).slice(0, 6), origin);

    let text = await page.locator('body').innerText().catch(() => '');
    for (const link of [...new Set(links)]) {
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
      text += '\n' + await page.locator('body').innerText().catch(() => '');
    }

    const emails = [...new Set((text.match(emailRx) || []).map(norm))]
      .filter(email => validEmail(email) && roleEmail(email) && !blockedHost.test(email));

    for (const email of emails) {
      if (!known.has(email)) {
        known.set(email, {
          id: id(email), email, storeName: title || new URL(origin).hostname,
          storeUrl: origin, source: 'public website via SearXNG',
          discoveredAt: new Date().toISOString(), status: 'review_required',
          eligible: false, legalBasis: ''
        });
      }
    }
  } catch (error) {
    console.error('Skipped store:', origin, error.message);
  }
}

await browser.close();
write('data/prospects.json', [...known.values()]);
console.log(`SearXNG produced ${stores.size} candidate domains; stored ${known.size} prospects.`);
