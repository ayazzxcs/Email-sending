import { norm, validEmail } from './lib.js';

/**
 * Multi-tenant creator platforms where the URL path identifies the individual creator.
 * Never collapse these to url.origin (which would just hit linktr.ee or beacons.ai homepage).
 */
export const MULTI_TENANT_CREATOR_HOSTS = new Set([
  'linktr.ee',
  'beacons.ai',
  'stan.store',
  'bio.site',
  'carrd.co',
  'taplink.cc',
  'hoo.be',
  'campsite.bio',
  'solo.to',
  'bento.me',
  'allmylinks.com',
  'milkshake.app',
  'lnk.bio',
  'linkin.bio',
  'koji.to',
  'direct.me',
  'about.me',
  'kit.co',
  'patreon.com',
  'ko-fi.com',
  'buymeacoffee.com',
  'substack.com',
  'medium.com',
  'podbean.com',
  'buzzsprout.com',
  'transistor.fm',
  'captivate.fm',
  'spreaker.com',
  'podcasters.spotify.com',
  'anchor.fm',
  'rss.com',
  'simplecast.com',
  'libsyn.com',
  'fireside.fm',
  'acast.com',
  'megaphone.fm',
  'pod.link'
]);

/**
 * Login-walled or bot-protected social platforms where SearXNG indexed snippets
 * often expose public business inquiry emails even when headless browsing is blocked.
 */
export const SOCIAL_CREATOR_HOSTS = new Set([
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'instagram.com',
  'twitch.tv',
  'kick.com',
  'x.com',
  'twitter.com',
  'threads.net',
  'podcasts.apple.com',
  'open.spotify.com',
  'rumble.com',
  'vimeo.com'
]);

/**
 * Infrastructure, search engine, news aggregator, and pure e-commerce domains to ignore.
 */
export const BLOCKED_HOST_RX =
  /(^|\.)(google\.|bing\.|duckduckgo\.|yahoo\.com$|baidu\.|yandex\.|cloudflare\.|example\.|localhost|w3\.org$|schema\.org$|wikipedia\.org$|wikimedia\.org$|amazon\.|ebay\.|etsy\.|walmart\.|aliexpress\.|shopify\.com$|myshopify\.com$|wordpress\.org$|wixpress\.com$|sentry\.io$|gravatar\.com$|fontawesome\.|jsdelivr\.|cdnjs\.|googleapis\.com$|gstatic\.com$|facebook\.com$|linkedin\.com$|pinterest\.com$|reddit\.com$|quora\.com$|github\.com$|stackoverflow\.com$|nytimes\.com$|forbes\.com$|bbc\.co\.uk$|cnn\.com$|theguardian\.com$|techcrunch\.com$|businessinsider\.com$|wikipedia\.org$)/i;

const JUNK_LOCAL_PART_RX =
  /^(no-?reply|donotreply|do-not-reply|noreply|mailer-daemon|postmaster|webmaster|hostmaster|abuse|spam|security|privacy|gdpr|dpo|legal|dmca|copyright|compliance|billing|invoice|invoices|accounting|finance|payroll|hr|careers|jobs|recruiting|support|help|helpdesk|service|customerservice|customer-service|orders|returns|shipping|fulfillment|sales|admin|administrator|root|sysadmin|devops|it|tech|feedback|newsletter|unsubscribe|subscribe|notifications|alerts|bounce|daemon|test|example|user|name|email|yourname|youremail|someone|placeholder|filler)$/i;

const JUNK_EMAIL_DOMAIN_RX =
  /(^|\.)(example\.(com|org|net)|test\.com|domain\.com|email\.com|yoursite\.com|yourdomain\.com|website\.com|sentry\.io|wixpress\.com|wix\.com|squarespace\.com|shopify\.com|myshopify\.com|linktr\.ee|beacons\.ai|stan\.store|carrd\.co|bio\.site|substack\.com|patreon\.com|youtube\.com|google\.com|tiktok\.com|instagram\.com|twitch\.tv|spotify\.com|apple\.com|cloudflare\.com|amazonaws\.com|googleusercontent\.com|github\.com|wordpress\.com|wordpress\.org|mailchimp\.com|sendgrid\.net|hubspot\.com|intercom\.io|zendesk\.com|freshdesk\.com|gravatar\.com)$/i;

const ASSET_EXTENSION_RX = /\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|ttf|eot|mp4|mp3|pdf|zip)$/i;

const EMAIL_RX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi;
const MAILTO_RX = /mailto:([^"'?#\s<>]+)/gi;

/**
 * Strips leading www. and returns lowercase hostname.
 */
export function cleanHost(hostname) {
  return String(hostname || '').toLowerCase().replace(/^www\./, '');
}

/**
 * Returns true if hostname belongs to a multi-tenant creator platform.
 */
export function isMultiTenantCreatorHost(hostname) {
  const host = cleanHost(hostname);
  if (MULTI_TENANT_CREATOR_HOSTS.has(host)) return true;
  for (const base of MULTI_TENANT_CREATOR_HOSTS) {
    if (host.endsWith('.' + base)) return true;
  }
  return false;
}

/**
 * Returns true if hostname belongs to a major social/creator platform.
 */
export function isSocialCreatorHost(hostname) {
  const host = cleanHost(hostname);
  if (SOCIAL_CREATOR_HOSTS.has(host)) return true;
  for (const base of SOCIAL_CREATOR_HOSTS) {
    if (host.endsWith('.' + base)) return true;
  }
  return false;
}

/**
 * Normalizes a candidate URL discovered from SearXNG.
 * - Preserves profile paths on multi-tenant creator platforms (e.g., linktr.ee/alexcreates)
 * - Keeps meaningful path on standalone sites while stripping tracking query params & fragments
 * - Returns null for blocked or non-HTTP(S) URLs
 */
export function normalizeCandidateUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!/^https?:$/.test(u.protocol)) return null;
    const host = cleanHost(u.hostname);
    if (!host || BLOCKED_HOST_RX.test(host)) return null;

    // Strip query parameters and fragments
    const cleanPath = u.pathname.replace(/\/+$/, '');

    // Multi-tenant creator hubs need a non-empty path (unless hosted on a creator subdomain like alex.substack.com)
    if (MULTI_TENANT_CREATOR_HOSTS.has(host)) {
      if (!cleanPath || cleanPath === '') return null;
      // Ignore generic platform marketing/help pages
      if (/^\/(s|blog|help|pricing|about|terms|privacy|login|register|signup|discover|marketplace|features|enterprise)(\/|$)/i.test(cleanPath)) {
        return null;
      }
      return `${u.origin}${cleanPath}`;
    }

    // Subdomains of multi-tenant hubs (e.g., mypodcast.substack.com, alex.carrd.co, show.buzzsprout.com)
    if (isMultiTenantCreatorHost(host)) {
      return `${u.origin}${cleanPath || ''}`;
    }

    // Social platforms are handled via snippet extraction rather than full Playwright crawl
    if (isSocialCreatorHost(host)) {
      return `${u.origin}${cleanPath || ''}`;
    }

    // Standalone personal / creator / podcast website: preserve specific landing path if shallow
    if (cleanPath && cleanPath.split('/').length <= 3 && !/\.(xml|rss|json|pdf|jpg|png)$/i.test(cleanPath)) {
      return `${u.origin}${cleanPath}`;
    }
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * Validates whether an email is a legitimate individual creator / influencer / podcaster
 * inquiry email (accepting both personal providers like Gmail/iCloud/Outlook and custom
 * creator domains, while filtering out noreply, support, e-commerce store ops, and junk).
 */
export function isCreatorEmail(rawEmail) {
  const email = norm(rawEmail).replace(/^mailto:/, '').replace(/[.,;:!?)\]>]+$/, '');
  if (!validEmail(email)) return false;
  if (email.length > 120) return false;
  if (ASSET_EXTENSION_RX.test(email)) return false;

  const [local, domain] = email.split('@');
  if (!local || !domain) return false;
  if (local.length < 2 || local.length > 64) return false;
  if (JUNK_LOCAL_PART_RX.test(local)) return false;
  if (/^(noreply|no-reply|donotreply|support|help|billing|orders|shipping|returns|legal|privacy|abuse|admin|sales|webmaster|postmaster)[+._-]/i.test(local)) {
    return false;
  }
  if (/^[0-9a-f]{16,}$/i.test(local)) return false; // hash/tracking addresses
  if (JUNK_EMAIL_DOMAIN_RX.test(domain)) return false;
  if (BLOCKED_HOST_RX.test(domain)) return false;

  return true;
}

/**
 * Extracts and deduplicates valid creator inquiry emails from both visible text and HTML mailto: links.
 */
export function extractCreatorEmails(text = '', html = '') {
  const found = new Set();

  // 1. Extract from mailto: links in HTML
  if (html) {
    let match;
    MAILTO_RX.lastIndex = 0;
    while ((match = MAILTO_RX.exec(html)) !== null) {
      let decoded = match[1];
      try {
        decoded = decodeURIComponent(decoded);
      } catch {}
      for (const candidate of decoded.split(/[,;]/)) {
        const cleaned = norm(candidate);
        if (isCreatorEmail(cleaned)) found.add(cleaned);
      }
    }
  }

  // 2. Extract from visible text
  if (text) {
    const matches = text.match(EMAIL_RX) || [];
    for (const raw of matches) {
      const cleaned = norm(raw);
      if (isCreatorEmail(cleaned)) found.add(cleaned);
    }
  }

  return [...found];
}

/**
 * Classifies whether a page/snippet represents an individual content creator, influencer,
 * podcaster, YouTuber, streamer, or short-form clipper (and rejects pure e-commerce stores).
 */
export function classifyCreatorProfile({ url = '', title = '', text = '', html = '' } = {}) {
  const combined = `${title}\n${text}`.slice(0, 25000);
  const lower = combined.toLowerCase();
  const htmlLower = String(html || '').slice(0, 60000).toLowerCase();

  let host = '';
  try {
    host = cleanHost(new URL(url).hostname);
  } catch {}

  // Reject pure e-commerce / Shopify storefronts unless strong creator/podcast signals dominate
  const isShopifyStore =
    /cdn\.shopify\.com|shopify\.theme|myshopify\.com|shopify-section/i.test(htmlLower) &&
    !/podcast|youtube\.com\/(@|channel|c\/)|tiktok\.com\/@|twitch\.tv\/|media kit|brand deals|sponsorship/i.test(combined);

  const isPureEcommerce =
    /\b(add to cart|free shipping on orders|shop all collections|checkout|woocommerce|drop ?shipping|wholesale inquiries)\b/i.test(lower) &&
    !/\b(podcast|youtuber|youtube channel|twitch|streamer|content creator|influencer|ugc creator|tiktok creator|media kit|video editor|clipper)\b/i.test(lower);

  if (isShopifyStore || isPureEcommerce) {
    return { isCreator: false, creatorType: 'none', score: 0, reasons: ['ecommerce_store_rejected'] };
  }

  const reasons = [];
  let score = 0;

  const typeScores = {
    podcaster: 0,
    youtuber: 0,
    streamer: 0,
    influencer: 0,
    clipper: 0,
    creator: 0
  };

  // Host-based signals
  if (isMultiTenantCreatorHost(host)) {
    score += 3;
    typeScores.creator += 2;
    reasons.push(`creator_hub:${host}`);
    if (/podbean|buzzsprout|transistor|captivate|spreaker|anchor|libsyn|simplecast|fireside|acast|megaphone|pod\.link|rss\.com/.test(host)) {
      typeScores.podcaster += 5;
      score += 3;
      reasons.push('podcast_host');
    }
  }

  if (isSocialCreatorHost(host)) {
    score += 3;
    reasons.push(`social_host:${host}`);
    if (/youtube\.com|youtu\.be/.test(host)) typeScores.youtuber += 5;
    if (/twitch\.tv|kick\.com/.test(host)) typeScores.streamer += 5;
    if (/tiktok\.com|instagram\.com|threads\.net/.test(host)) typeScores.influencer += 5;
    if (/podcasts\.apple\.com|open\.spotify\.com/.test(host)) typeScores.podcaster += 5;
  }

  // Content signals
  const signalRules = [
    { rx: /\b(podcast|podcaster|podcast host|new episodes?|listen on spotify|apple podcasts|guest inquiries|episode \d+|rss feed)\b/i, pts: 3, type: 'podcaster', tag: 'podcast_signal' },
    { rx: /\b(youtuber|youtube channel|subscribe on youtube|youtube\.com\/@|youtube\.com\/channel|youtube\.com\/c\/|vlogger|vlog|long-form videos?)\b/i, pts: 3, type: 'youtuber', tag: 'youtube_signal' },
    { rx: /\b(twitch|kick streamer|live ?streamer|streaming schedule|twitch\.tv\/|kick\.com\/|vtuber|vods?)\b/i, pts: 3, type: 'streamer', tag: 'streamer_signal' },
    { rx: /\b(influencer|tiktok creator|tiktok\.com\/@|instagram\.com\/|ugc creator|brand deals?|brand partnerships?|brand collaborations?|pr inquiries|media kit|rate card)\b/i, pts: 3, type: 'influencer', tag: 'influencer_signal' },
    { rx: /\b(clipper|short-form editor|shorts editor|reels editor|tiktok editor|video editor|clipping agency|viral clips?|retention editing)\b/i, pts: 3, type: 'clipper', tag: 'clipper_signal' },
    { rx: /\b(content creator|digital creator|video creator|filmmaker|storyteller|speaker|creator|subscribers|followers|work with me|business inquiries|for collabs?|sponsorship inquiries|booking inquiries)\b/i, pts: 2, type: 'creator', tag: 'creator_general' }
  ];

  for (const rule of signalRules) {
    if (rule.rx.test(combined) || (htmlLower && rule.rx.test(htmlLower))) {
      score += rule.pts;
      typeScores[rule.type] += rule.pts;
      reasons.push(rule.tag);
    }
  }

  // Pick dominant creator type
  let creatorType = 'creator';
  let bestTypeScore = 0;
  for (const [type, val] of Object.entries(typeScores)) {
    if (type !== 'creator' && val > bestTypeScore) {
      bestTypeScore = val;
      creatorType = type;
    }
  }

  // Require at least 3 points (e.g., creator platform + signal, or strong explicit creator/podcast/YouTube match)
  const isCreator = score >= 3;
  return { isCreator, creatorType: isCreator ? creatorType : 'none', score, reasons };
}

/**
 * Extracts a clean, natural creator / podcast / channel name from scraped page titles, URLs, or email.
 */
export function cleanCreatorName(rawTitle, url = '', email = '') {
  let handleFromUrl = '';
  let domainRoot = '';

  try {
    if (url) {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      const host = cleanHost(u.hostname);
      const segments = u.pathname.split('/').filter(Boolean);

      if (MULTI_TENANT_CREATOR_HOSTS.has(host) || SOCIAL_CREATOR_HOSTS.has(host)) {
        const firstSeg = segments[0] || '';
        if (firstSeg && !/^(channel|c|user|show|shows|podcast|podcasts|in|p|watch)$/i.test(firstSeg)) {
          handleFromUrl = firstSeg.replace(/^@/, '');
        } else if (segments[1]) {
          handleFromUrl = segments[1].replace(/^@/, '');
        }
      } else {
        domainRoot = host.split('.')[0];
      }
    }
  } catch {}

  const formatSlug = slug => {
    if (!slug) return '';
    const spaced = slug.replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!spaced) return '';
    return spaced
      .split(' ')
      .map(w => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
      .join(' ');
  };

  if (rawTitle && typeof rawTitle === 'string') {
    let s = rawTitle.trim().replace(/[®™©]/g, '');

    // Strip common platform suffixes
    s = s
      .replace(/\s*[|\-–—·•:]\s*(linktree|beacons|beacons\.ai|stan store|stan|carrd|bio\.site|substack|patreon|youtube|tiktok|instagram|twitch|kick|spotify|apple podcasts|podbean|buzzsprout|official website|official site|media kit|work with me|contact me|contact|about me|about|home|links?)\b.*$/i, '')
      .replace(/^(contact|about|work with me|media kit|home)\s*[|\-–—·•:]\s*/i, '')
      .replace(/\s*\(@[^)]+\)\s*/g, ' ')
      .trim();

    // If still has separators, choose the cleanest non-fluff part
    const parts = s.split(/\s+[|·•–—:]\s+|\s+-\s+/).map(p => p.trim()).filter(Boolean);
    let best = parts[0] || s;
    if (parts.length > 1) {
      const nonFluff = parts.filter(
        p => !/^(home|about|contact|links|blog|podcast episodes|media kit|influencer|content creator|youtuber|official)$/i.test(p)
      );
      if (nonFluff.length > 0) {
        best = nonFluff[0];
      }
    }

    best = best
      .replace(/\.(com|net|org|co|io|tv|fm|me|ai)$/i, '')
      .replace(/^@/, '')
      .trim();

    if (best.length >= 2 && best.length <= 36 && !/^(page not found|404|just a moment|access denied|log in|sign in|linktree|beacons)$/i.test(best)) {
      return best;
    }
  }

  if (handleFromUrl) {
    const formatted = formatSlug(handleFromUrl);
    if (formatted.length >= 2 && formatted.length <= 32) return formatted;
  }

  if (domainRoot && !/^(www|linktr|beacons|stan|carrd|substack|patreon|youtube|tiktok|instagram|twitch|spotify|apple|podbean|buzzsprout)$/i.test(domainRoot)) {
    const formatted = formatSlug(domainRoot);
    if (formatted.length >= 2 && formatted.length <= 32) return formatted;
  }

  // Last safe fallback from non-generic email local part
  if (email && email.includes('@')) {
    const local = email.split('@')[0];
    if (!/^(info|hello|contact|collab|collabs|booking|bookings|business|inquiries|inquiry|press|media|mgmt|management|team|sponsor|sponsorships|podcast|pr|hi|hey)$/i.test(local)) {
      const formatted = formatSlug(local.replace(/\d+$/, ''));
      if (formatted.length >= 2 && formatted.length <= 24) return formatted;
    }
  }

  return '';
}

function getAudienceCopy(creatorType = 'creator') {
  switch (creatorType) {
    case 'podcaster':
      return {
        badge: 'Built for Podcasters & Video Shows',
        headline: 'Turn every podcast episode into viral Shorts — without a $49/mo sub',
        introLead: 'turn full podcast episodes and guest interviews into high-retention 9:16 clips for TikTok, Instagram Reels, and YouTube Shorts in minutes',
        step1: 'Paste your YouTube episode link or upload raw video',
        bullet1Title: 'AI Hook & Viral Moment Finder',
        bullet1Desc: 'Automatically spots the sharpest quotes, debates, and stories from 1–3 hour episodes.',
        bullet2Title: 'Multi-Speaker Active 9:16 Framing',
        bullet2Desc: 'Automatically tracks and centers whoever is speaking in split or wide podcast shots.',
        reason: 'you host or produce podcast & video content'
      };
    case 'youtuber':
      return {
        badge: 'Built for YouTubers & Video Creators',
        headline: 'Turn your YouTube videos into viral Shorts — pay $4.50 only when ready',
        introLead: 'repurpose your long-form YouTube uploads into punchy 9:16 Shorts, Reels, and TikToks automatically without spending hours re-editing',
        step1: 'Paste any YouTube video URL or upload directly',
        bullet1Title: 'Automated Retention Hook Detection',
        bullet1Desc: 'AI scans your long-form videos and pulls out the highest-retention segments automatically.',
        bullet2Title: 'Smart 9:16 Vertical Re-Framing',
        bullet2Desc: 'Keeps you centered in vertical frame with smooth active speaker & subject tracking.',
        reason: 'you publish video content on YouTube and digital platforms'
      };
    case 'streamer':
      return {
        badge: 'Built for Streamers & VOD Clippers',
        headline: 'Turn your streams & VODs into viral vertical clips — no $49/mo sub',
        introLead: 'turn long Twitch, Kick, and YouTube livestreams into ready-to-post TikToks, Reels, and YouTube Shorts automatically',
        step1: 'Drop in your VOD link or upload stream highlights',
        bullet1Title: 'Instant Highlight & Hook Detection',
        bullet1Desc: 'AI detects high-energy moments, reactions, and viral hooks from long streams in minutes.',
        bullet2Title: 'Smart Vertical 9:16 Framing',
        bullet2Desc: 'Cleanly reframes gameplay and facecam/speaker into vertical Shorts ready for TikTok & Reels.',
        reason: 'you create live streams and video content'
      };
    case 'clipper':
      return {
        badge: 'Built for Clippers & Short-Form Editors',
        headline: 'Cut viral 9:16 shorts 10x faster — $4.50 Pay-On-Ready, zero subscription',
        introLead: 'accelerate your short-form clipping pipeline with automated hook detection, active speaker 9:16 reframing, and word-sync kinetic captions',
        step1: 'Paste a YouTube/podcast link or upload source footage',
        bullet1Title: 'AI Viral Moment Extraction',
        bullet1Desc: 'Skip scrubbing through 2-hour podcasts—AI surfaces high-retention hooks with score rankings.',
        bullet2Title: 'Auto 9:16 Speaker Tracking',
        bullet2Desc: 'Instant vertical reframing that locks onto active speakers without manual keyframing.',
        reason: 'you work in short-form video editing and content clipping'
      };
    case 'influencer':
      return {
        badge: 'Built for Creators & Influencers',
        headline: 'Multiply your TikToks, Reels & Shorts — without $49/mo editing tools',
        introLead: 'turn long videos, vlogs, and talking-head shoots into viral 9:16 clips with kinetic captions in minutes—without another monthly subscription',
        step1: 'Paste a YouTube link or upload any raw video',
        bullet1Title: 'AI Hook & Viral Clip Finder',
        bullet1Desc: 'Automatically isolates your strongest hooks and shareable moments for Reels, TikTok & Shorts.',
        bullet2Title: 'Smart 9:16 Active Framing',
        bullet2Desc: 'Automatically reframes horizontal footage into clean 9:16 vertical keeping you centered.',
        reason: 'you create content for social media and digital audiences'
      };
    default:
      return {
        badge: 'Built for Creators · Podcasters · Influencers',
        headline: 'Turn long videos into viral 9:16 Shorts — without a $49/mo subscription',
        introLead: 'turn long videos, podcasts, and YouTube uploads into viral 9:16 Shorts, Reels, and TikToks automatically without costly monthly tool lock-ins',
        step1: 'Paste a YouTube/podcast link or upload any video',
        bullet1Title: 'AI Viral Hook Detection',
        bullet1Desc: 'AI scans your footage and pulls out the highest-retention hooks and moments automatically.',
        bullet2Title: 'Smart 9:16 Active Speaker Framing',
        bullet2Desc: 'Automatically centers the active speaker in crisp 9:16 vertical format.',
        reason: 'you create video, podcast, or digital creator content'
      };
  }
}

/**
 * Generates an AI Video Lab subject line tailored to the creator type.
 */
export function buildVideoLabSubject(creatorName, creatorType = 'creator') {
  const cleanName = String(creatorName || '').trim();
  if (creatorType === 'podcaster') {
    return cleanName
      ? `Turn ${cleanName} episodes into viral Shorts ($4.50, no monthly sub)`
      : 'Turn podcast episodes into viral 9:16 Shorts ($4.50 Pay-On-Ready)';
  }
  if (creatorType === 'streamer') {
    return cleanName
      ? `Turn ${cleanName} streams into viral TikToks & Shorts ($4.50, no sub)`
      : 'Turn streams & VODs into viral 9:16 Shorts ($4.50 Pay-On-Ready)';
  }
  if (creatorType === 'clipper') {
    return cleanName
      ? `${cleanName} — AI Shorts studio at $4.50 Pay-On-Ready (no $49/mo sub)`
      : 'AI viral Shorts studio — $4.50 Pay-On-Ready (no $49/mo sub)';
  }
  return cleanName
    ? `${cleanName} — turn long videos into viral Shorts ($4.50, no monthly sub)`
    : 'Turn your videos into viral 9:16 Shorts — Free AI preview ($4.50 unlock)';
}

/**
 * Generates a personal, creator-focused plain-text email strictly for Quvirl AI Video Lab.
 */
export function buildVideoLabTextEmail(creatorName, creatorType = 'creator') {
  const cleanName = String(creatorName || '').trim();
  const greeting = cleanName ? `Hey ${cleanName},` : 'Hey there,';
  const copy = getAudienceCopy(creatorType);

  return `${greeting}

I came across your content and wanted to share Quvirl AI Video Lab — a fast AI studio we built to help creators, podcasters, YouTubers, and influencers ${copy.introLead}.

Unlike typical AI clipping tools that lock you into $29–$49/month subscriptions before you even see the result, Quvirl AI Video Lab is 100% free to process and preview.

WHAT YOU GET IN QUVIRL AI VIDEO LAB:
• ${copy.bullet1Title}: ${copy.bullet1Desc}
• ${copy.bullet2Title}: ${copy.bullet2Desc}
• Kinetic Word-Sync Captions: Auto-generated animated captions in viral creator styles (Hormozi, Dev, and more).
• 1080p 60fps Clean Exports: Zero watermarks, ready to post straight to TikTok, Instagram Reels, and YouTube Shorts.

HOW IT WORKS (UNDER 2 MINUTES):
1. ${copy.step1}.
2. Let AI cut your viral clips and preview them completely free.
3. Pay just $4.50 Pay-On-Ready per video ONLY if you love the clips and want to unlock full 1080p 60fps watermark-free exports. No $49/month subscription.

Try AI Video Lab with a free preview here:
https://quvirl.com/videolab

Best,
The Quvirl Team
https://quvirl.com/videolab

---
You received this email because ${copy.reason} and your inquiry email is listed publicly.
Reply "unsubscribe" anytime and we will remove you immediately.`;
}

/**
 * Generates a responsive dark-themed HTML email strictly focused on Quvirl AI Video Lab
 * using Quvirl brand colors: Black (#000000, #0a0a0a), White (#ffffff), Blue (#58a6ff), Green (#22c55e).
 */
export function buildVideoLabHtmlEmail(creatorName, subject, creatorType = 'creator') {
  const cleanName = String(creatorName || '').trim();
  const greeting = cleanName ? `Hey ${cleanName},` : 'Hey there,';
  const copy = getAudienceCopy(creatorType);

  const escapeHtml = str =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const safeSubject = escapeHtml(subject);
  const safeGreeting = escapeHtml(greeting);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeSubject}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-p-20 { padding: 20px !important; }
      .mobile-p-16 { padding: 16px !important; }
      .hero-title { font-size: 24px !important; line-height: 31px !important; }
      .section-title { font-size: 19px !important; line-height: 25px !important; }
      .stack-col { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
      .btn-block { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; color: #ffffff;">
<div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
  Free AI processing &amp; preview. Turn long videos into viral 9:16 Shorts with kinetic captions. Pay $4.50 only when ready — no $49/mo sub.
</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000; padding: 24px 12px;">
  <tr>
    <td align="center">
      <!-- Container 600px -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; overflow: hidden;">

        <!-- Header -->
        <tr>
          <td class="mobile-p-20" style="padding: 22px 28px; background-color: #070707; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="left" valign="middle">
                  <a href="https://quvirl.com/videolab" target="_blank" style="text-decoration: none; display: inline-block;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle">
                          <img src="https://quvirl.com/logo.png" alt="Quvirl" width="32" height="32" style="display: block; width: 32px; height: 32px; border-radius: 8px; border: 0;" />
                        </td>
                        <td valign="middle" style="padding-left: 10px; font-size: 21px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.3px;">
                          <span style="color: #ffffff;">Qu</span><span style="color: #58a6ff;">virl</span>
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>
                <td align="right" valign="middle">
                  <span style="display: inline-block; padding: 5px 12px; background-color: rgba(88, 166, 255, 0.12); border: 1px solid rgba(88, 166, 255, 0.35); border-radius: 6px; font-size: 11px; font-weight: 700; color: #58a6ff; letter-spacing: 0.6px; text-transform: uppercase;">
                    AI Video Lab
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero Section -->
        <tr>
          <td class="mobile-p-20" style="padding: 28px 28px 18px 28px;">
            <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #58a6ff;">
              ${safeGreeting}
            </p>
            <h1 class="hero-title" style="margin: 0 0 14px 0; font-size: 27px; line-height: 34px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
              ${escapeHtml(copy.headline)}
            </h1>
            <p style="margin: 0 0 22px 0; font-size: 15px; line-height: 24px; color: #cbd5e1;">
              We came across your content and wanted to share <strong style="color: #ffffff;">Quvirl AI Video Lab</strong> — built to help you ${escapeHtml(copy.introLead)}. Preview your AI-generated clips completely free and pay only when you're ready to export.
            </p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="border-radius: 8px; background-color: #22c55e;">
                  <a href="https://quvirl.com/videolab" target="_blank" class="btn-block" style="display: inline-block; padding: 13px 26px; font-size: 14px; font-weight: 800; color: #000000; text-decoration: none; border-radius: 8px; letter-spacing: 0.2px;">
                    Try AI Video Lab (Free Preview) →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Showcase Card -->
        <tr>
          <td class="mobile-p-16" style="padding: 10px 24px 16px 24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0e0e0e; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                  <a href="https://quvirl.com/videolab" target="_blank" style="text-decoration: none; display: block;">
                    <img src="https://quvirl.com/assets/email-video-lab.png" alt="Quvirl AI Video Lab — Turn Videos Into Viral Shorts" width="552" style="display: block; width: 100%; max-width: 552px; height: auto; border: 0;" />
                  </a>
                </td>
              </tr>
              <tr>
                <td class="mobile-p-16" style="padding: 22px 24px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 10px;">
                    <tr>
                      <td align="left" valign="middle">
                        <span style="display: inline-block; padding: 3px 10px; background-color: rgba(88, 166, 255, 0.12); border: 1px solid rgba(88, 166, 255, 0.3); border-radius: 6px; font-size: 11px; font-weight: 700; color: #58a6ff; text-transform: uppercase; letter-spacing: 0.5px;">
                          ${escapeHtml(copy.badge)}
                        </span>
                      </td>
                      <td align="right" valign="middle" style="padding-left: 10px; white-space: nowrap;">
                        <span style="font-size: 12px; font-weight: 700; color: #22c55e; white-space: nowrap;">
                          Free AI Preview
                        </span>
                      </td>
                    </tr>
                  </table>

                  <h2 class="section-title" style="margin: 0 0 14px 0; font-size: 20px; line-height: 26px; font-weight: 700; color: #ffffff;">
                    Everything you need to scale short-form clips
                  </h2>

                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding: 6px 0; vertical-align: top; width: 22px; color: #58a6ff; font-size: 15px; font-weight: 800;">✓</td>
                      <td style="padding: 6px 0 6px 8px; font-size: 14px; line-height: 21px; color: #cbd5e1;">
                        <strong style="color: #ffffff;">${escapeHtml(copy.bullet1Title)}:</strong> ${escapeHtml(copy.bullet1Desc)}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; vertical-align: top; width: 22px; color: #22c55e; font-size: 15px; font-weight: 800;">✓</td>
                      <td style="padding: 6px 0 6px 8px; font-size: 14px; line-height: 21px; color: #cbd5e1;">
                        <strong style="color: #ffffff;">${escapeHtml(copy.bullet2Title)}:</strong> ${escapeHtml(copy.bullet2Desc)}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; vertical-align: top; width: 22px; color: #58a6ff; font-size: 15px; font-weight: 800;">✓</td>
                      <td style="padding: 6px 0 6px 8px; font-size: 14px; line-height: 21px; color: #cbd5e1;">
                        <strong style="color: #ffffff;">Kinetic Word-Sync Captions:</strong> Animated subtitles in top viral creator presets (Hormozi, Dev &amp; more).
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; vertical-align: top; width: 22px; color: #22c55e; font-size: 15px; font-weight: 800;">✓</td>
                      <td style="padding: 6px 0 6px 8px; font-size: 14px; line-height: 21px; color: #cbd5e1;">
                        <strong style="color: #ffffff;">Clean 1080p 60fps Exports:</strong> Zero watermarks, formatted for TikTok, Instagram Reels &amp; YouTube Shorts.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- 3-Step Workflow + Fair Pricing Strip -->
        <tr>
          <td class="mobile-p-16" style="padding: 4px 24px 16px 24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0e0e0e; border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 12px;">
              <tr>
                <td class="mobile-p-16" style="padding: 20px 22px;">
                  <p style="margin: 0 0 14px 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px;">
                    How it works in under 2 minutes
                  </p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td class="stack-col" width="33%" valign="top" style="padding-right: 10px;">
                        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #58a6ff;">01 · DROP LINK</p>
                        <p style="margin: 0; font-size: 13px; line-height: 19px; color: #cbd5e1;">${escapeHtml(copy.step1)}.</p>
                      </td>
                      <td class="stack-col" width="33%" valign="top" style="padding-right: 10px;">
                        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #22c55e;">02 · PREVIEW FREE</p>
                        <p style="margin: 0; font-size: 13px; line-height: 19px; color: #cbd5e1;">Review AI-picked clips, reframing &amp; captions free.</p>
                      </td>
                      <td class="stack-col" width="34%" valign="top">
                        <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #ffffff;">03 · PAY ON READY</p>
                        <p style="margin: 0; font-size: 13px; line-height: 19px; color: #cbd5e1;">Unlock 1080p 60fps for $4.50 — zero monthly sub.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Bottom CTA Box -->
        <tr>
          <td class="mobile-p-16" style="padding: 4px 24px 26px 24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0e0e0e; border: 1px solid rgba(88, 166, 255, 0.28); border-radius: 14px; text-align: center;">
              <tr>
                <td class="mobile-p-20" style="padding: 28px 24px;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #22c55e; text-transform: uppercase; letter-spacing: 0.7px;">
                    No $49/month subscription lock-in
                  </p>
                  <h3 style="margin: 0 0 10px 0; font-size: 22px; line-height: 28px; font-weight: 800; color: #ffffff;">
                    Preview your first viral clips free
                  </h3>
                  <p style="margin: 0 auto 20px auto; font-size: 14px; line-height: 22px; color: #94a3b8; max-width: 440px;">
                    Upload any video or paste a YouTube link right now. Pay just <strong style="color: #ffffff;">$4.50 Pay-On-Ready</strong> only if you love the export.
                  </p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                    <tr>
                      <td align="center" style="border-radius: 10px; background-color: #58a6ff;">
                        <a href="https://quvirl.com/videolab" target="_blank" class="btn-block" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 800; color: #000000; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px;">
                          Launch AI Video Lab Free →
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 14px 0 0 0; font-size: 12px; color: #64748b;">
                    Free AI Processing &amp; Preview &bull; $4.50 Pay-On-Ready &bull; 1080p 60fps &bull; Zero Watermark
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="mobile-p-20" style="padding: 22px 28px 26px 28px; border-top: 1px solid rgba(255, 255, 255, 0.08); background-color: #050505; text-align: center;">
            <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 18px; color: #64748b;">
              You received this email because ${escapeHtml(copy.reason)} and your public inquiry address is listed online.
              If this isn't relevant to you, reply <strong style="color: #ffffff;">“unsubscribe”</strong> and we will remove you immediately.
            </p>
            <p style="margin: 0 0 14px 0; font-size: 12px; color: #58a6ff;">
              <a href="https://quvirl.com/videolab" style="color: #58a6ff; text-decoration: underline;">AI Video Lab</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="https://quvirl.com" style="color: #58a6ff; text-decoration: underline;">quvirl.com</a>
            </p>
            <p style="margin: 0; font-size: 11px; color: #475569;">
              © ${new Date().getFullYear()} Quvirl. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
