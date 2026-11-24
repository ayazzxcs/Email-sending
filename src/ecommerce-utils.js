import { norm, validEmail, roleEmail } from './lib.js';

const STORE_BLOCKED_HOST_RX =
  /google\.|bing\.|facebook\.|instagram\.|youtube\.|shopify\.com$|cloudflare\.|example\./i;
const EMAIL_RX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi;
const MAILTO_RX = /mailto:([^"'?#\s<>]+)/gi;

/**
 * Resolves whether a prospect belongs to the creator audience or the e-commerce store audience.
 * Legacy prospects without an explicit `audience` field default to `'ecommerce'`.
 */
export function resolveProspectAudience(prospect) {
  return prospect?.audience === 'creator' ? 'creator' : 'ecommerce';
}

/**
 * Returns true if the HTML matches a Shopify storefront (original e-commerce target).
 */
export function isShopifyHtml(html = '') {
  return /cdn\.shopify\.com|Shopify\.theme|myshopify\.com|shopify-section/i.test(String(html || ''));
}

/**
 * Extracts valid role-based business emails (info@, hello@, contact@, support@, sales@, etc.)
 * from Shopify store text and mailto: links while blocking infrastructure/example domains.
 */
export function extractStoreEmails(text = '', html = '') {
  const found = new Set();

  if (html) {
    let match;
    MAILTO_RX.lastIndex = 0;
    while ((match = MAILTO_RX.exec(html)) !== null) {
      let decoded = match[1];
      try {
        decoded = decodeURIComponent(decoded);
      } catch {}
      for (const candidate of decoded.split(/[,;]/)) {
        const email = norm(candidate);
        if (validEmail(email) && roleEmail(email) && !STORE_BLOCKED_HOST_RX.test(email)) {
          found.add(email);
        }
      }
    }
  }

  if (text) {
    for (const raw of text.match(EMAIL_RX) || []) {
      const email = norm(raw);
      if (validEmail(email) && roleEmail(email) && !STORE_BLOCKED_HOST_RX.test(email)) {
        found.add(email);
      }
    }
  }

  return [...found];
}

/**
 * Extracts a clean, professional brand name from scraped Shopify store titles and URLs.
 */
export function cleanStoreName(raw, url) {
  let domain = '';
  let domClean = '';
  try {
    if (url) {
      const u = new URL(url.startsWith('http') ? url : 'https://' + url);
      domain = u.hostname.replace(/^www\./i, '').split('.')[0];
      domClean = domain.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
  } catch {}

  const domainCapitalized = domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : '';

  if (!raw || typeof raw !== 'string') return domainCapitalized || '';

  const s = raw.trim().replace(/[®™©]/g, '');
  const parts = s.split(/[\s]+[|·•–—:][\s]+|[\s]*[|·•–—:][\s]*/).map(p => p.trim()).filter(Boolean);

  let best = '';
  if (parts.length > 1) {
    if (domClean) {
      const match = parts.find(p => {
        const pc = p.toLowerCase().replace(/[^a-z0-9]/g, '');
        return pc.includes(domClean) || domClean.includes(pc.slice(0, 6)) || pc.includes(domClean.slice(0, 6));
      });
      if (match) best = match;
    }

    if (!best) {
      const cleanParts = parts.filter(
        p => !/(certified\s+)?shopify(\s+plus)?(\s+partner|\s+agency|\s+experts)?|ecommerce|e-commerce|official\s+site|home\s+page/i.test(p)
      );
      if (cleanParts.length > 0) {
        best = cleanParts.sort((a, b) => a.length - b.length)[0];
      } else {
        best = parts[0];
      }
    }
  } else {
    best = s;
  }

  best = best.replace(/\.(com|net|org|co|io|store|shop)$/i, '').trim();
  best = best
    .replace(/\b(USA\s+Official\s+Store|Official\s+Store|Online\s+Store|Official\s+Website|Official\s+Site|Online\s+Shop|Official\s+Shop)\b/gi, '')
    .trim();

  if ((best.length > 28 || best.length < 2) && domainCapitalized) {
    best = domainCapitalized;
  }

  return best || domainCapitalized || '';
}

export function buildEcommerceSubject(brandName) {
  return brandName
    ? `Free Product Radar + $4.50/video AI shorts studio for ${brandName}`
    : 'Free Product Radar (1,500+ products) + $4.50/video AI Video Lab';
}

export function buildEcommerceTextEmail(brandName) {
  const greeting = brandName ? `Hi ${brandName} team,` : 'Hi there,';
  const brandRef = brandName || 'your team';

  return `${greeting}

We came across ${brandRef} and wanted to share two platforms we built at Quvirl for e-commerce brands, content creators, podcasters, and clippers to spot breakout demand and scale viral short-form video.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PRODUCT DEMAND RADAR & 1-CLICK SOURCING ($0 — FREE FOREVER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stop guessing what products will sell. Quvirl tracks 1,500+ curated products using Google Trends velocity, Amazon sales & BSR signals, and live supplier economics.

• Google Trends & Amazon Validation: Early breakout demand signals backed by real purchase intent.
• Live CJdropshipping & AliExpress Economics: Factory pricing, shipping costs & 50–75% target net margins.
• 1-Click Shopify Export: Push winning products straight to your store with supplier routing.
• Pricing: $0 Free Forever • No credit card required • Instant access.

👉 Explore Product Radar Free: https://quvirl.com/product-research

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. AI VIDEO LAB & VIRAL SHORTS STUDIO ($4.50 / VIDEO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Powered by NVIDIA Ada Lovelace 48GB cloud GPUs. Turn long videos, product demos, podcasts, or streams (up to 3 hours & 1 GB) into 3–8 viral shorts in 9:16 vertical, 1:1 square, or 16:9 widescreen.

• AI Hook & Virality Scoring (0–100): Faster-Whisper CUDA, Nex-N2.5-Pro VLM & Qwen 27B isolate high-retention hooks.
• Smart Auto-Reframe: Active face & speaker tracking for TikTok, Instagram Reels & YouTube Shorts.
• Kinetic Word-Sync Captions: Word-by-word highlights, auto-emojis & viral presets (Viral Impact Gold, Creator Neon, Minimal Clean, Red Alert).
• Pricing: Transparent $4.50 USD per video. Zero $39–$50/month subscriptions. Full studio editor & unlimited 1080p 60fps exports with zero watermarks.

👉 Launch AI Video Lab ($4.50/video): https://quvirl.com/videolab

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCALE YOUR CONTENT & STORE WITH QUVIRL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Get started immediately:
https://quvirl.com

Best regards,
The Quvirl Team
https://quvirl.com

---
You are receiving this business email from Quvirl because ${brandRef} is active in digital business and e-commerce.
Reply "unsubscribe" to opt out immediately.`;
}

export function buildEcommerceHtmlEmail(brandName, subject) {
  const greeting = brandName ? `Hi ${brandName} team,` : 'Hi there,';
  const brandRef = brandName || 'your team';

  const escapeHtml = str =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const safeSubject = escapeHtml(subject);
  const safeGreeting = escapeHtml(greeting);
  const safeBrandRef = escapeHtml(brandRef);

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
      .mobile-p-15 { padding: 15px !important; }
      .hero-title { font-size: 24px !important; line-height: 32px !important; }
      .section-title { font-size: 19px !important; line-height: 26px !important; }
      .btn-block { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; color: #ffffff;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000; padding: 24px 12px;">
  <tr>
    <td align="center">
      <!-- Container 600px -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; overflow: hidden;">

        <!-- Header / Logo -->
        <tr>
          <td class="mobile-p-20" style="padding: 24px 28px 20px 28px; background-color: #070707; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="left" valign="middle">
                  <a href="https://quvirl.com" target="_blank" style="text-decoration: none; display: inline-block;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle">
                          <img src="https://quvirl.com/logo.png" alt="Quvirl" width="34" height="34" style="display: block; width: 34px; height: 34px; border-radius: 8px; border: 0;" />
                        </td>
                        <td valign="middle" style="padding-left: 10px; font-size: 22px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                          <span style="color: #ffffff;">Qu</span><span style="color: #58a6ff;">virl</span>
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>
                <td align="right" valign="middle">
                  <span style="display: inline-block; padding: 5px 12px; background-color: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #22c55e; letter-spacing: 0.5px; text-transform: uppercase;">
                    Growth Studio
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero Intro -->
        <tr>
          <td class="mobile-p-20" style="padding: 28px 28px 18px 28px;">
            <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #58a6ff;">
              ${safeGreeting}
            </p>
            <h1 class="hero-title" style="margin: 0 0 14px 0; font-size: 26px; line-height: 34px; font-weight: 800; color: #ffffff; letter-spacing: -0.4px;">
              Two high-impact tools built for ${safeBrandRef}
            </h1>
            <p style="margin: 0; font-size: 15px; line-height: 24px; color: #cbd5e1;">
              We came across ${safeBrandRef} and wanted to share two platforms built at <strong style="color: #ffffff;">Quvirl</strong>: a <strong>$0 Free-Forever Product Demand Radar</strong> tracking 1,500+ products across Google Trends &amp; Amazon, and our <strong>$4.50/video AI Video Lab</strong> for viral 9:16, 1:1 &amp; 16:9 shorts with zero monthly subscriptions.
            </p>
          </td>
        </tr>

        <!-- Feature 1: Product Radar ($0 Free Forever) -->
        <tr>
          <td class="mobile-p-15" style="padding: 12px 24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0e0e0e; border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 0;">
                  <a href="https://quvirl.com/product-research" target="_blank" style="text-decoration: none; display: block;">
                    <img src="https://quvirl.com/assets/email-product-radar.png" alt="Quvirl Product Radar &amp; 1-Click Shopify Sourcing" width="552" class="responsive-img" style="display: block; width: 100%; max-width: 552px; height: auto; border: 0;" />
                  </a>
                </td>
              </tr>
              <tr>
                <td class="mobile-p-15" style="padding: 22px 24px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 8px;">
                          <tr>
                            <td align="left">
                              <span style="display: inline-block; padding: 3px 10px; background-color: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 6px; font-size: 11px; font-weight: 700; color: #22c55e; text-transform: uppercase; letter-spacing: 0.5px;">
                                Feature 01 · Product Demand Radar
                              </span>
                            </td>
                            <td align="right" style="white-space: nowrap; padding-left: 8px;">
                              <span style="font-size: 12px; font-weight: 700; color: #22c55e;">
                                $0 Free Forever
                              </span>
                            </td>
                          </tr>
                        </table>

                        <h2 class="section-title" style="margin: 0 0 10px 0; font-size: 20px; line-height: 26px; font-weight: 700; color: #ffffff;">
                          Product Demand Radar &amp; 1-Click Sourcing
                        </h2>
                        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                          Track 1,500+ curated winning products backed by Google Trends velocity, Amazon purchase intent &amp; BSR signals, and live supplier economics—completely free.
                        </p>

                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #22c55e; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">Google Trends &amp; Amazon BSR Signals:</strong> Live breakout velocity and real buyer validation.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #58a6ff; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">CJdropshipping &amp; AliExpress Economics:</strong> Live factory pricing with 50–75% target net margins.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #22c55e; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">1-Click Shopify Export:</strong> Push winning products straight to your store with supplier routing.
                            </td>
                          </tr>
                        </table>

                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="border-radius: 8px; background-color: #22c55e;">
                              <a href="https://quvirl.com/product-research" target="_blank" class="btn-block" style="display: inline-block; padding: 11px 22px; font-size: 13px; font-weight: 800; color: #000000; text-decoration: none; border-radius: 8px;">
                                Explore Product Radar Free →
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Feature 2: AI Video Lab ($4.50/video) -->
        <tr>
          <td class="mobile-p-15" style="padding: 12px 24px 20px 24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0e0e0e; border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 0;">
                  <a href="https://quvirl.com/videolab" target="_blank" style="text-decoration: none; display: block;">
                    <img src="https://quvirl.com/assets/email-video-lab.png" alt="Quvirl AI Video Lab - Turn Videos Into Viral Shorts" width="552" class="responsive-img" style="display: block; width: 100%; max-width: 552px; height: auto; border: 0;" />
                  </a>
                </td>
              </tr>
              <tr>
                <td class="mobile-p-15" style="padding: 22px 24px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 8px;">
                          <tr>
                            <td align="left">
                              <span style="display: inline-block; padding: 3px 10px; background-color: rgba(88, 166, 255, 0.12); border: 1px solid rgba(88, 166, 255, 0.35); border-radius: 6px; font-size: 11px; font-weight: 700; color: #58a6ff; text-transform: uppercase; letter-spacing: 0.5px;">
                                Feature 02 · NVIDIA 48GB GPU Studio
                              </span>
                            </td>
                            <td align="right" style="white-space: nowrap; padding-left: 8px;">
                              <span style="font-size: 12px; font-weight: 700; color: #58a6ff; background-color: rgba(88, 166, 255, 0.1); border: 1px solid rgba(88, 166, 255, 0.25); border-radius: 6px; padding: 2px 8px;">
                                $4.50 / Video
                              </span>
                            </td>
                          </tr>
                        </table>

                        <h2 class="section-title" style="margin: 0 0 10px 0; font-size: 20px; line-height: 26px; font-weight: 700; color: #ffffff;">
                          AI Video Lab &amp; Viral Shorts Studio
                        </h2>
                        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                          Turn product videos, reviews, podcasts, or streams (up to 3 hours &amp; 1 GB) into <strong style="color: #ffffff;">3–8 viral clips</strong> in 9:16 vertical, 1:1 square, or 16:9 widescreen for TikTok, Instagram Reels &amp; YouTube Shorts.
                        </p>

                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #58a6ff; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">AI Hook &amp; Virality Scoring (0–100):</strong> Faster-Whisper CUDA, Nex-N2.5-Pro VLM &amp; Qwen 27B isolate high-retention hooks.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #22c55e; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">Smart Auto-Reframe (9:16, 1:1 &amp; 16:9):</strong> Active face &amp; speaker tracking keeps subjects centered cleanly.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #ffffff; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">Kinetic Word-Sync Captions:</strong> Presets including Viral Impact Gold, Creator Neon, Minimal Clean &amp; Red Alert.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #58a6ff; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #58a6ff;">Transparent Pay-Per-Video ($4.50/video):</strong> Zero $39–$50/month subscriptions. Full studio editor &amp; unlimited 1080p 60fps watermark-free exports.
                            </td>
                          </tr>
                        </table>

                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="border-radius: 8px; background-color: #58a6ff;">
                              <a href="https://quvirl.com/videolab" target="_blank" class="btn-block" style="display: inline-block; padding: 11px 22px; font-size: 13px; font-weight: 800; color: #000000; text-decoration: none; border-radius: 8px;">
                                Launch AI Video Lab ($4.50/video) →
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Master Bottom CTA Box -->
        <tr>
          <td class="mobile-p-20" style="padding: 8px 24px 28px 24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0e0e0e; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; text-align: center;">
              <tr>
                <td class="mobile-p-20" style="padding: 30px 24px;">
                  <h3 style="margin: 0 0 10px 0; font-size: 22px; line-height: 28px; font-weight: 800; color: #ffffff;">
                    Ready to scale your content &amp; store?
                  </h3>
                  <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #94a3b8; max-width: 450px; margin-left: auto; margin-right: auto;">
                    Research 1,500+ winning products completely free on Product Radar, or unlock AI Video Lab on demand at $4.50/video with zero monthly subscriptions.
                  </p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                    <tr>
                      <td align="center" style="border-radius: 10px; background-color: #22c55e;">
                        <a href="https://quvirl.com" target="_blank" class="btn-block" style="display: inline-block; padding: 15px 34px; font-size: 15px; font-weight: 800; color: #000000; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                          Get Started Free on Quvirl →
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b;">
                    Product Radar ($0 Free Forever) &bull; AI Video Lab ($4.50/video) &bull; Zero Subscriptions &bull; Zero Watermarks
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="mobile-p-20" style="padding: 24px 28px 28px 28px; border-top: 1px solid rgba(255, 255, 255, 0.08); background-color: #050505; text-align: center;">
            <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 18px; color: #64748b;">
              You received this business email because <strong style="color: #cbd5e1;">${safeBrandRef}</strong> is active in e-commerce, content, and digital media.
              If this isn't relevant to you, simply reply <strong style="color: #ffffff;">“unsubscribe”</strong> or opt out below.
            </p>
            <p style="margin: 0 0 16px 0; font-size: 12px; color: #58a6ff;">
              <a href="https://quvirl.com/product-research" style="color: #58a6ff; text-decoration: underline;">Product Radar</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="https://quvirl.com/videolab" style="color: #58a6ff; text-decoration: underline;">AI Video Lab</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="https://quvirl.com" style="color: #58a6ff; text-decoration: underline;">quvirl.com</a>
            </p>
            <p style="margin: 0; font-size: 11px; color: #334155;">
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
