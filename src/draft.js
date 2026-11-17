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
      const match = parts.find(p => {
        const pc = p.toLowerCase().replace(/[^a-z0-9]/g, '');
        return pc.includes(domClean) || domClean.includes(pc.slice(0, 6)) || pc.includes(domClean.slice(0, 6));
      });
      if (match) best = match;
    }

    if (!best) {
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
 * Generates high-converting plain-text email with colorful structure and dual service coverage.
 */
export function buildTextEmail(brandName) {
  const greeting = brandName ? `Hi ${brandName} team,` : 'Hi there,';
  const brandRef = brandName || 'your team';

  return `${greeting}

FIND WINNING PRODUCTS. TURN VIDEOS INTO VIRAL SHORTS WITH AI.

Quvirl is your all-in-one e-commerce growth platform: discover breakout winning products with Google Trends and real marketplace demand, then instantly turn product links, podcasts, streams, and raw footage into viral TikToks, Reels, and YouTube Shorts with cloud AI.

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

👉 Launch Video Lab (Free Preview): https://quvirl.com/videolab

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET STARTED FREE ON QUVIRL
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
 * Generates mobile-responsive HTML email using the exact colorful style from the user reference:
 * - Headline: "Find winning products." (White) / "Turn videos into" (Blue #5aa3ff) / "viral shorts with AI." (Mint #38e1a6)
 * - Platform tag: [PLATFORM] Product Radar & AI Video Studio
 * - Buttons Stack:
 *     1. Radiant gradient green "Get started free →"
 *     2. Dark glass "Launch Video Lab 🎬"
 *     3. Dark glass "Product Radar 📈"
 * - Dual showcase cards with 100% accurate pricing and creator/podcaster targeting.
 * - Footer: Quvirl only.
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
      .hero-title { font-size: 27px !important; line-height: 1.18 !important; }
      .section-title { font-size: 19px !important; line-height: 25px !important; }
      .btn-block { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; color: #ffffff;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #000000; padding: 24px 12px;">
  <tr>
    <td align="center">
      <!-- Container 600px with subtle tech border -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #05070c; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 18px; overflow: hidden; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.7);">
        
        <!-- Top Nav / Header -->
        <tr>
          <td class="mobile-p-20" style="padding: 24px 28px 20px 28px; background-color: #020408; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="left" valign="middle">
                  <a href="https://quvirl.com" target="_blank" style="text-decoration: none; display: inline-block;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle">
                          <img src="https://quvirl.com/logo.png" alt="Quvirl" width="36" height="36" style="display: block; width: 36px; height: 36px; border-radius: 9px; border: 0;" />
                        </td>
                        <td valign="middle" style="padding-left: 10px; font-size: 24px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                          <span style="color: #ffffff;">Qu</span><span style="color: #5aa3ff;">virl</span>
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>
                <td align="right" valign="middle">
                  <a href="https://quvirl.com" target="_blank" style="display: inline-block; padding: 7px 16px; background: linear-gradient(135deg, #24c568 0%, #1bbb8d 100%); color: #000000; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 9999px; box-shadow: 0 4px 14px rgba(36, 197, 104, 0.35);">
                    Get started free
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero Section with exact Colorful Style from user reference -->
        <tr>
          <td class="mobile-p-20" style="padding: 28px 28px 16px 28px;">
            
            <!-- Platform Pill -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
              <tr>
                <td style="background-color: rgba(10, 20, 35, 0.7); border: 1px solid rgba(90, 163, 255, 0.3); border-radius: 9999px; padding: 4px 14px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background-color: rgba(90, 163, 255, 0.18); border-radius: 6px; padding: 2px 7px; font-size: 10px; font-weight: 800; color: #5aa3ff; letter-spacing: 0.5px; text-transform: uppercase;">
                        PLATFORM
                      </td>
                      <td style="padding-left: 8px; font-size: 12px; font-weight: 600; color: #cbd5e1;">
                        Product Radar &amp; AI Video Studio
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Exact 3-Color Headline from Screenshot -->
            <h1 class="hero-title" style="margin: 0 0 16px 0; font-size: 33px; line-height: 1.18; font-weight: 900; letter-spacing: -0.8px;">
              <span style="color: #ffffff;">Find winning products.</span><br />
              <span style="color: #5aa3ff;">Turn videos into</span><br />
              <span style="color: #38e1a6;">viral shorts with AI.</span>
            </h1>

            <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #5aa3ff;">
              ${greeting}
            </p>

            <!-- Exact Copy from Screenshot -->
            <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #cbd5e1;">
              Quvirl is your all-in-one e-commerce growth platform: discover breakout winning products with Google Trends and real marketplace demand, then instantly turn product links, podcasts, streams, and raw footage into viral TikToks, Reels, and YouTube Shorts with cloud AI.
            </p>

            <!-- Exact Button Stack from Screenshot -->
            <!-- 1. Primary Radiant Gradient Button -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
              <tr>
                <td align="center" style="border-radius: 12px; background: linear-gradient(90deg, #24c568 0%, #1ebf79 50%, #1bbb8d 100%); box-shadow: 0 8px 24px rgba(36, 197, 104, 0.35);">
                  <a href="https://quvirl.com" target="_blank" class="btn-block" style="display: block; width: 100%; padding: 15px 24px; font-size: 16px; font-weight: 800; color: #000000; text-decoration: none; border-radius: 12px; text-align: center; box-sizing: border-box;">
                    Get started free &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <!-- 2. Launch Video Lab Button -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
              <tr>
                <td align="center" style="border-radius: 12px; background-color: #0b0f19; border: 1px solid rgba(255, 255, 255, 0.16);">
                  <a href="https://quvirl.com/videolab" target="_blank" class="btn-block" style="display: block; width: 100%; padding: 14px 24px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; text-align: center; box-sizing: border-box;">
                    Launch Video Lab &#x1F3AC;
                  </a>
                </td>
              </tr>
            </table>

            <!-- 3. Product Radar Button -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
              <tr>
                <td align="center" style="border-radius: 12px; background-color: #0b0f19; border: 1px solid rgba(255, 255, 255, 0.16);">
                  <a href="https://quvirl.com/product-research" target="_blank" class="btn-block" style="display: block; width: 100%; padding: 14px 24px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; text-align: center; box-sizing: border-box;">
                    Product Radar &#x1F4C8;
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Feature 1: Product Radar (100% Free) -->
        <tr>
          <td class="mobile-p-15" style="padding: 12px 24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #090c14; border: 1px solid rgba(56, 225, 166, 0.2); border-radius: 14px; overflow: hidden;">
              <!-- Image Banner in colorful style -->
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
                              <span style="display: inline-block; padding: 3px 10px; background-color: rgba(56, 225, 166, 0.12); border: 1px solid rgba(56, 225, 166, 0.35); border-radius: 6px; font-size: 11px; font-weight: 700; color: #38e1a6; text-transform: uppercase; letter-spacing: 0.5px;">
                                Feature 01 · Product Research
                              </span>
                            </td>
                            <td align="right">
                              <span style="font-size: 12px; font-weight: 800; color: #38e1a6;">
                                100% Free
                              </span>
                            </td>
                          </tr>
                        </table>
                        
                        <h2 class="section-title" style="margin: 0 0 10px 0; font-size: 21px; line-height: 27px; font-weight: 800; color: #ffffff;">
                          Product Radar & 1-Click Sourcing
                        </h2>
                        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                          Stop guessing what will sell. Quvirl scans real search demand signals and Google Trends curves so you can spot breakout products early with zero tool fees.
                        </p>
                        
                        <!-- Bullet Points -->
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #38e1a6; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">Google Trends & Search Velocity:</strong> Live market demand validation.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #5aa3ff; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">AliExpress & CJdropshipping Matching:</strong> Instant margin comparison.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #38e1a6; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">1-Click Shopify Import:</strong> Push winning items with titles, photos & variants.
                            </td>
                          </tr>
                        </table>

                        <!-- Gradient Button -->
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="border-radius: 8px; background: linear-gradient(90deg, #24c568 0%, #1bbb8d 100%);">
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
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #090c14; border: 1px solid rgba(90, 163, 255, 0.25); border-radius: 14px; overflow: hidden;">
              <!-- Image Banner in colorful style -->
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
                              <span style="display: inline-block; padding: 3px 10px; background-color: rgba(90, 163, 255, 0.12); border: 1px solid rgba(90, 163, 255, 0.35); border-radius: 6px; font-size: 11px; font-weight: 700; color: #5aa3ff; text-transform: uppercase; letter-spacing: 0.5px;">
                                Feature 02 · Creators · Podcasters · Clippers
                              </span>
                            </td>
                            <td align="right">
                              <span style="font-size: 12px; font-weight: 800; color: #5aa3ff; background-color: rgba(90, 163, 255, 0.1); border: 1px solid rgba(90, 163, 255, 0.3); border-radius: 6px; padding: 2px 8px;">
                                $4.50 Pay-On-Ready
                              </span>
                            </td>
                          </tr>
                        </table>

                        <h2 class="section-title" style="margin: 0 0 10px 0; font-size: 21px; line-height: 27px; font-weight: 800; color: #ffffff;">
                          AI Video Lab & Viral Shorts Studio
                        </h2>
                        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                          Built for <strong style="color: #ffffff;">content creators, influencers, clippers, podcasters</strong>, and e-commerce brands looking to convert long videos into viral 9:16 vertical clips for TikTok, Instagram Reels, and YouTube Shorts.
                        </p>
                        
                        <!-- Bullet Points -->
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #5aa3ff; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #ffffff;">Automated Hook & Segment Detection:</strong> AI extracts the most compelling moments from podcasts, streams, and YouTube videos.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #38e1a6; font-size: 16px; font-weight: bold;">✓</td>
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
                            <td style="padding: 5px 0; vertical-align: top; width: 20px; color: #5aa3ff; font-size: 16px; font-weight: bold;">✓</td>
                            <td style="padding: 5px 0 5px 8px; font-size: 14px; line-height: 20px; color: #cbd5e1;">
                              <strong style="color: #5aa3ff;">Fair Pay-On-Ready Pricing:</strong> Free AI preview. No $49/month subscriptions. Pay only $4.50 to unlock 1080p 60fps exports with zero watermarks.
                            </td>
                          </tr>
                        </table>

                        <!-- Blue Button -->
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="border-radius: 8px; background-color: #5aa3ff;">
                              <a href="https://quvirl.com/videolab" target="_blank" class="btn-block" style="display: inline-block; padding: 11px 22px; font-size: 13px; font-weight: 800; color: #000000; text-decoration: none; border-radius: 8px;">
                                Launch Video Lab (Free Preview) →
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
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #090c14; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; text-align: center;">
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
                      <td align="center" style="border-radius: 12px; background: linear-gradient(90deg, #24c568 0%, #1ebf79 50%, #1bbb8d 100%); box-shadow: 0 8px 24px rgba(36, 197, 104, 0.35);">
                        <a href="https://quvirl.com" target="_blank" class="btn-block" style="display: inline-block; padding: 15px 34px; font-size: 15px; font-weight: 800; color: #000000; text-decoration: none; border-radius: 12px; letter-spacing: 0.3px;">
                          Get started free &rarr;
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
          <td class="mobile-p-20" style="padding: 24px 28px 28px 28px; border-top: 1px solid rgba(255, 255, 255, 0.08); background-color: #020408; text-align: center;">
            <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 18px; color: #64748b;">
              You received this business email because <strong style="color: #cbd5e1;">${brandRef}</strong> is active in e-commerce, content, and digital media.
              If this isn't relevant to you, simply reply <strong style="color: #ffffff;">“unsubscribe”</strong> or opt out below.
            </p>
            <p style="margin: 0 0 16px 0; font-size: 12px; color: #5aa3ff;">
              <a href="https://quvirl.com/product-research" style="color: #5aa3ff; text-decoration: underline;">Product Radar</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="https://quvirl.com/videolab" style="color: #5aa3ff; text-decoration: underline;">AI Video Lab</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="https://quvirl.com" style="color: #5aa3ff; text-decoration: underline;">quvirl.com</a>
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
    : 'Find winning products. Turn videos into viral shorts with AI.';

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
