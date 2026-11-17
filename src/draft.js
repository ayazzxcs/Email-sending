import { read, write } from './lib.js';

/**
 * Extracts a clean, professional brand name from scraped store titles and URLs.
 * Eliminates SEO fluff like "Shopify Partner & eCommerce Growth Agency Australia | Tyack eCommerce".
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
  } catch (e) {}

  const domainCapitalized = domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : '';

  if (!raw || typeof raw !== 'string') return domainCapitalized || '';

  let s = raw.trim().replace(/[®™©]/g, '');

  // Split by common separators: |, ·, -, —, –, :, •
  const parts = s.split(/[\s]+[|·•–—:][\s]+|[\s]*[|·•–—:][\s]*/).map(p => p.trim()).filter(Boolean);

  let best = '';
  if (parts.length > 1) {
    if (domClean) {
      // Find part that shares root brand letters with domain
      const match = parts.find(p => {
        const pc = p.toLowerCase().replace(/[^a-z0-9]/g, '');
        return pc.includes(domClean) || domClean.includes(pc.slice(0, 6)) || pc.includes(domClean.slice(0, 6));
      });
      if (match) best = match;
    }

    if (!best) {
      // Filter out pure SEO fluff
      const cleanParts = parts.filter(p => !/(certified\s+)?shopify(\s+plus)?(\s+partner|\s+agency|\s+experts)?|ecommerce|e-commerce|official\s+site|home\s+page/i.test(p));
      if (cleanParts.length > 0) {
        best = cleanParts.sort((a, b) => a.length - b.length)[0];
      } else {
        best = parts[0];
      }
    }
  } else {
    best = s;
  }

  // Strip trailing domain extensions (.com, .net, etc.) and generic marketing suffixes
  best = best.replace(/\.(com|net|org|co|io|store|shop)$/i, '').trim();
  best = best.replace(/\b(USA\s+Official\s+Store|Official\s+Store|Online\s+Store|Official\s+Website|Official\s+Site|Online\s+Shop|Official\s+Shop)\b/gi, '').trim();

  // If still very long (> 28 chars), fallback to domain name
  if ((best.length > 28 || best.length < 2) && domainCapitalized) {
    best = domainCapitalized;
  }

  return best || domainCapitalized || '';
}

/**
 * Generates high-converting plain-text email with clear pricing and audience targeting
 * (creators, influencers, podcasters, clippers, and e-commerce brands).
 */
export function buildTextEmail(brandName) {
  const greeting = brandName ? `Hi ${brandName} team,` : 'Hi there,';
  const brandRef = brandName || 'your team';

  return `${greeting}

We came across ${brandRef} and wanted to share two high-impact platforms we built at Quvirl for e-commerce brands, content creators, podcasters, and clippers to scale traffic and sales.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PRODUCT RADAR & 1-CLICK SOURCING (100% FREE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stop guessing what products will sell. Quvirl scans real-time search signals and Google Trends to uncover winning items before niches get saturated.

• Free Market Intelligence: Live Google Trends demand signals & breakout velocity scores.
• Direct Supplier Matching: Compare AliExpress & CJdropshipping catalog items with verified margins.
• 1-Click Shopify Push: Sync product titles, variants, and imagery straight to your store.
• Pricing: 100% Free • Unlimited research • No credit card required.

👉 Explore Product Radar Free: https://quvirl.com/product-research

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. AI VIDEO LAB & VIRAL SHORTS STUDIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Built specifically for content creators, influencers, clippers, podcasters, and e-commerce brands looking to dominate short-form video on TikTok, Instagram Reels, and YouTube Shorts.

• Video-to-Shorts Engine: Paste YouTube/podcast links or upload videos. AI auto-detects high-retention hooks and viral moments.
• Active Speaker & Product Tracking: Automatically reframes to 9:16 vertical and keeps speakers centered in frame.
• Kinetic Captions: Auto-generate animated word-by-word captions in top creator styles (Hormozi, Dev).
• Pricing: Free AI Processing & Preview. No $49/month subscription lock-in. Pay just $4.50 Pay-On-Ready per video to unlock full 1080p 60fps exports with zero watermarks.

👉 Try AI Video Lab (Free Preview): https://quvirl.com/videolab

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

/**
 * Generates modern, mobile-responsive HTML email strictly using Quvirl branding:
 * Black (#000000, #0a0a0a), White (#ffffff), Quvirl Blue (#58a6ff), and Quvirl Green (#22c55e).
 * Accurately states pricing and targets creators, podcasters, clippers, influencers, and brands.
 */
export function buildHtmlEmail(brandName, subject) {
  const greeting = brandName ? `Hi ${brandName} team,` : 'Hi there,';
  const brandRef = brandName || 'your team';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
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
              ${greeting}
            </p>
            <h1 class="hero-title" style="margin: 0 0 14px 0; font-size: 26px; line-height: 34px; font-weight: 800; color: #ffffff; letter-spacing: -0.4px;">
              Two high-impact tools built for ${brandRef}
            </h1>
            <p style="margin: 0; font-size: 15px; line-height: 24px; color: #cbd5e1;">
              We came across ${brandRef} and wanted to share two powerful solutions built at <strong style="color: #ffffff;">Quvirl</strong>: a <strong>100% free Product Radar</strong> for e-commerce discovery, and our <strong>AI Video Lab</strong> that helps creators, podcasters, clippers, and brands turn long videos into viral shorts without costly monthly software lock-ins.
            </p>
          </td>
        </tr>

        <!-- Feature 1: Product Radar (100% Free) -->
        <tr>
          <td class="mobile-p-15" style="padding: 12px 24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0e0e0e; border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 12px; overflow: hidden;">
              <!-- Image Banner (Black + White + Green + Blue) -->
              <tr>
                <td style="padding: 0;">
                  <a href="https://quvirl.com/product-research" target="_blank" style="text-decoration: none; display: block;">
                    <img src="https://quvirl.com/assets/email-product-radar.png" alt="Quvirl Product Radar & 1-Click Shopify Sourcing" width="552" class="responsive-img" style="display: block; width: 100%; max-width: 552px; height: auto; border: 0;" />
                  </a>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td class="mobile-p-15" style="padding: 22px 24px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 8px;">
                          <tr>
                            <td align="left">
                              <span style="display: inline-block; padding: 3px 10px; background-color: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 6px; font-size: 11px; font-weight: 700; color: #22c55e; text-transform: uppercase; letter-spacing: 0.5px;">
                                Feature 01 · Product Research
                              </span>
                            </td>
                            <td align="right">
                              <span style="font-size: 12px; font-weight: 700; color: #22c55e;">
                                100% Free
                              </span>
                            </td>
                          </tr>
                        </table>
                        
                        <h2 class="section-title" style="margin: 0 0 10px 0; font-size: 20px; line-height: 26px; font-weight: 700; color: #ffffff;">
                          Product Radar & 1-Click Sourcing
                        </h2>
                        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                          Stop guessing what will sell. Quvirl scans real search demand signals and Google Trends curves so you can spot breakout products early with zero tool fees.
                        </p>
                        
                        <!-- Bullet Points -->
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #22c55e; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">Google Trends & Search Velocity:</strong> Live market demand validation.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #58a6ff; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">AliExpress & CJdropshipping Matching:</strong> Instant margin comparison.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #22c55e; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">1-Click Shopify Import:</strong> Push winning items with titles, photos & variants.
                            </td>
                          </tr>
                        </table>

                        <!-- Quvirl Green Button -->
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

        <!-- Feature 2: AI Video Lab (Targeted at Creators, Podcasters, Clippers + $4.50 Pay-On-Ready) -->
        <tr>
          <td class="mobile-p-15" style="padding: 12px 24px 20px 24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0e0e0e; border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 12px; overflow: hidden;">
              <!-- Image Banner (Black + White + Blue + Green) -->
              <tr>
                <td style="padding: 0;">
                  <a href="https://quvirl.com/videolab" target="_blank" style="text-decoration: none; display: block;">
                    <img src="https://quvirl.com/assets/email-video-lab.png" alt="Quvirl AI Video Lab - Turn Videos Into Viral Shorts" width="552" class="responsive-img" style="display: block; width: 100%; max-width: 552px; height: auto; border: 0;" />
                  </a>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td class="mobile-p-15" style="padding: 22px 24px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 8px;">
                          <tr>
                            <td align="left">
                              <span style="display: inline-block; padding: 3px 10px; background-color: rgba(88, 166, 255, 0.12); border: 1px solid rgba(88, 166, 255, 0.35); border-radius: 6px; font-size: 11px; font-weight: 700; color: #58a6ff; text-transform: uppercase; letter-spacing: 0.5px;">
                                Feature 02 · Creators · Podcasters · Clippers
                              </span>
                            </td>
                            <td align="right">
                              <span style="font-size: 12px; font-weight: 700; color: #58a6ff; background-color: rgba(88, 166, 255, 0.1); border: 1px solid rgba(88, 166, 255, 0.25); border-radius: 6px; padding: 2px 8px;">
                                $4.50 Pay-On-Ready
                              </span>
                            </td>
                          </tr>
                        </table>

                        <h2 class="section-title" style="margin: 0 0 10px 0; font-size: 20px; line-height: 26px; font-weight: 700; color: #ffffff;">
                          AI Video Lab & Viral Shorts Studio
                        </h2>
                        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                          Built for <strong style="color: #ffffff;">content creators, influencers, clippers, podcasters</strong>, and e-commerce brands looking to convert long videos into viral 9:16 vertical clips for TikTok, Instagram Reels, and YouTube Shorts.
                        </p>
                        
                        <!-- Bullet Points -->
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #58a6ff; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">Automated Hook & Segment Detection:</strong> AI extracts the most compelling moments from podcasts, streams, and YouTube videos.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #22c55e; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">Smart 9:16 Re-Framing:</strong> Automatically centers the active speaker and product in vertical frame.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #ffffff; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">Kinetic Word-Sync Captions:</strong> Animated subtitles in viral creator styles (Hormozi, Dev).
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #58a6ff; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #58a6ff;">Fair Pay-On-Ready Pricing:</strong> Free AI preview. No $49/month subscriptions. Pay only $4.50 to unlock 1080p 60fps exports with zero watermarks.
                            </td>
                          </tr>
                        </table>

                        <!-- Quvirl Blue Button -->
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="border-radius: 8px; background-color: #58a6ff;">
                              <a href="https://quvirl.com/videolab" target="_blank" class="btn-block" style="display: inline-block; padding: 11px 22px; font-size: 13px; font-weight: 800; color: #000000; text-decoration: none; border-radius: 8px;">
                                Try AI Video Lab (Free Preview) →
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
                    Ready to scale your content & store?
                  </h3>
                  <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #94a3b8; max-width: 450px; margin-left: auto; margin-right: auto;">
                    Research winning products completely free, or upload any video to preview AI-generated viral shorts in under 2 minutes.
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
                    Free Product Research &bull; Free Video Preview &bull; Pay-On-Ready ($4.50 to unlock) &bull; No $49/mo sub
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
              You received this business email because <strong style="color: #cbd5e1;">${brandRef}</strong> is active in e-commerce, content, and digital media.
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
              © ${new Date().getFullYear()} Quvirl Technologies. All rights reserved.
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

// Generate drafts for prospects
const prospects = read('data/prospects.json');
const drafts = read('data/drafts.json');
const draftByProspectId = new Map(drafts.map(d => [d.prospectId, d]));

let updatedCount = 0;
let newCount = 0;

for (const p of prospects) {
  const brandName = cleanStoreName(p.storeName, p.storeUrl);
  const subject = brandName 
    ? `Winning products + $4.50 viral AI shorts studio for ${brandName}` 
    : 'Free product radar + $4.50 viral AI shorts studio';

  const text = buildTextEmail(brandName);
  const html = buildHtmlEmail(brandName, subject);

  if (draftByProspectId.has(p.id)) {
    const existing = draftByProspectId.get(p.id);
    existing.storeName = brandName;
    existing.subject = subject;
    existing.text = text;
    existing.html = html;
    updatedCount++;
  } else {
    const newDraft = {
      prospectId: p.id,
      email: p.email,
      storeName: brandName,
      subject,
      text,
      html
    };
    drafts.push(newDraft);
    draftByProspectId.set(p.id, newDraft);
    newCount++;
  }
}

write('data/drafts.json', drafts);
console.log(`Drafts processed. Updated: ${updatedCount}, New: ${newCount}, Total: ${drafts.length}`);
