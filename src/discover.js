import { chromium } from 'playwright';
import { read, write, norm, id } from './lib.js';
import {
  normalizeCandidateUrl,
  isMultiTenantCreatorHost,
  isSocialCreatorHost,
  extractCreatorEmails,
  classifyCreatorProfile,
  cleanCreatorName
} from './creator-utils.js';
import {
  isShopifyHtml,
  extractStoreEmails
} from './ecommerce-utils.js';

const queries = read('data/search-queries.json', [
  'shopify store contact',
  '"business inquiries" "youtube" "@gmail.com"'
]);
const prospects = read('data/prospects.json', []);
const known = new Map(prospects.map(p => [norm(p.email), p]));

const searxngUrl = process.env.SEARXNG_URL || 'http://127.0.0.1:8080';
const maxQueries = Number(process.env.MAX_QUERIES || 40);
const searchPages = Number(process.env.SEARCH_PAGES || 5);
const maxTargets = Number(process.env.MAX_PROFILES || process.env.MAX_STORES || 120);

const crawlTargets = new Map(); // normalizedUrl -> { url, title, snippet }
let addedCreatorSnippets = 0;
let addedCreatorPages = 0;
let addedShopifyStores = 0;

function registerCreatorProspect({ email, title, url, creatorType, source }) {
  const normalized = norm(email);
  if (!normalized || known.has(normalized)) return false;

  const creatorName = cleanCreatorName(title, url, normalized) || new URL(url).hostname;
  known.set(normalized, {
    id: id(normalized),
    email: normalized,
    creatorName,
    creatorUrl: url,
    creatorType: creatorType || 'creator',
    audience: 'creator',
    storeName: creatorName,
    storeUrl: url,
    source,
    discoveredAt: new Date().toISOString(),
    status: 'review_required',
    eligible: false,
    legalBasis: ''
  });
  return true;
}

function registerStoreProspect({ email, title, origin, source }) {
  const normalized = norm(email);
  if (!normalized || known.has(normalized)) return false;

  const storeName = title || new URL(origin).hostname;
  known.set(normalized, {
    id: id(normalized),
    email: normalized,
    storeName,
    storeUrl: origin,
    audience: 'ecommerce',
    source,
    discoveredAt: new Date().toISOString(),
    status: 'review_required',
    eligible: false,
    legalBasis: ''
  });
  return true;
}

for (const query of queries.slice(0, maxQueries)) {
  let emptyPagesInRow = 0;

  for (let pageNo = 1; pageNo <= searchPages; pageNo++) {
    const endpoint = `${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=all&safesearch=0&pageno=${pageNo}`;
    try {
      const response = await fetch(endpoint, { headers: { accept: 'application/json' } });
      if (!response.ok) {
        console.error(`SearXNG ${response.status} for page ${pageNo}: ${query}`);
        emptyPagesInRow++;
        if (emptyPagesInRow >= 2) break;
        continue;
      }

      const payload = await response.json();
      const results = Array.isArray(payload.results) ? payload.results : [];
      if (results.length === 0) {
        emptyPagesInRow++;
        if (emptyPagesInRow >= 2) break;
        continue;
      }

      let foundOnPage = 0;
      for (const result of results) {
        const normalizedUrl = normalizeCandidateUrl(result.url);
        if (!normalizedUrl) continue;

        const title = String(result.title || '').trim();
        const snippet = String(result.content || '').trim();
        let hostname = '';
        try {
          hostname = new URL(normalizedUrl).hostname;
        } catch {
          continue;
        }

        // 1. Extract verified creator emails directly from SearXNG snippets (great for YouTube/TikTok/IG/Twitch/Podcasts)
        const snippetEmails = extractCreatorEmails(`${title}\n${snippet}`, '');
        if (snippetEmails.length > 0) {
          const check = classifyCreatorProfile({ url: normalizedUrl, title, text: snippet });
          if (check.isCreator) {
            for (const email of snippetEmails) {
              if (registerCreatorProspect({
                email,
                title,
                url: normalizedUrl,
                creatorType: check.creatorType,
                source: 'public creator snippet via SearXNG'
              })) {
                addedCreatorSnippets++;
                foundOnPage++;
              }
            }
          }
        }

        // 2. Queue both creator websites/hubs and potential Shopify store sites for Playwright crawl
        if (!isSocialCreatorHost(hostname) && !crawlTargets.has(normalizedUrl)) {
          crawlTargets.set(normalizedUrl, { url: normalizedUrl, title, snippet });
          foundOnPage++;
        }
      }

      if (foundOnPage === 0) {
        emptyPagesInRow++;
        if (emptyPagesInRow >= 2) break;
      } else {
        emptyPagesInRow = 0;
      }
    } catch (error) {
      console.error(`Search failed for page ${pageNo}: ${query}`, error.message);
      emptyPagesInRow++;
      if (emptyPagesInRow >= 2) break;
    }
  }
}

console.log(`SearXNG creator snippet leads: ${addedCreatorSnippets}; candidate URLs to crawl: ${crawlTargets.size}`);

if (addedCreatorSnippets > 0) {
  write('data/prospects.json', [...known.values()]);
}

const targetsToVisit = [...crawlTargets.values()].slice(0, maxTargets);
if (targetsToVisit.length > 0) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 QuvirlResearchBot/3.0'
  });
  const page = await context.newPage();

  let visited = 0;
  for (const target of targetsToVisit) {
    visited++;
    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 18000 });
      const html = await page.content();
      const title = (await page.title().catch(() => '')) || target.title;
      let text = await page.locator('body').innerText().catch(() => '');
      let combinedHtml = html;

      const parsedUrl = new URL(target.url);
      const origin = parsedUrl.origin;
      const isMultiTenant = isMultiTenantCreatorHost(parsedUrl.hostname);
      const isShopify = isShopifyHtml(html);

      // Follow relevant subpages on standalone domains (both creator contact/collab pages and Shopify contact/support pages)
      if (!isMultiTenant) {
        const subLinks = await page
          .locator('a[href]')
          .evaluateAll((elements, base) =>
            elements
              .map(a => a.href)
              .filter(href =>
                href &&
                href.startsWith(base) &&
                /contact|about|privacy|support|work-with-me|collab|sponsor|media-?kit|booking|press|podcast|inquir/i.test(href) &&
                !/\.(pdf|jpg|jpeg|png|mp4|mp3|zip)$/i.test(href)
              )
              .slice(0, 6),
            origin
          )
          .catch(() => []);

        for (const subLink of [...new Set(subLinks)]) {
          if (subLink === target.url) continue;
          await page.goto(subLink, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => null);
          text += '\n' + (await page.locator('body').innerText().catch(() => ''));
          combinedHtml += '\n' + (await page.content().catch(() => ''));
        }
      }

      // Check Creator audience first
      const creatorCheck = classifyCreatorProfile({
        url: target.url,
        title,
        text: `${target.snippet}\n${text}`,
        html: combinedHtml
      });

      if (creatorCheck.isCreator) {
        const emails = extractCreatorEmails(text, combinedHtml).slice(0, 3);
        for (const email of emails) {
          if (registerCreatorProspect({
            email,
            title,
            url: target.url,
            creatorType: creatorCheck.creatorType,
            source: 'public creator page via SearXNG'
          })) {
            addedCreatorPages++;
          }
        }
      } else if (isShopify) {
        // Preserved original Shopify e-commerce store target
        const storeEmails = extractStoreEmails(text, combinedHtml);
        for (const email of storeEmails) {
          if (registerStoreProspect({
            email,
            title,
            origin,
            source: 'public website via SearXNG'
          })) {
            addedShopifyStores++;
          }
        }
      }

      if (visited % 25 === 0) {
        write('data/prospects.json', [...known.values()]);
      }
    } catch (error) {
      console.error('Skipped URL:', target.url, error.message);
    }
  }

  await browser.close();
}

write('data/prospects.json', [...known.values()]);
console.log(
  `Discovery complete. Checked ${targetsToVisit.length} URLs; added ${addedCreatorSnippets} creator snippets + ${addedCreatorPages} creator pages + ${addedShopifyStores} Shopify stores; total stored prospects: ${known.size}.`
);
