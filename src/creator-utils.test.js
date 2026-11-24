import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCandidateUrl,
  isCreatorEmail,
  extractCreatorEmails,
  classifyCreatorProfile,
  cleanCreatorName,
  buildVideoLabSubject,
  buildVideoLabTextEmail,
  buildVideoLabHtmlEmail
} from './creator-utils.js';
import {
  resolveProspectAudience,
  isShopifyHtml,
  extractStoreEmails,
  cleanStoreName,
  buildEcommerceSubject,
  buildEcommerceTextEmail,
  buildEcommerceHtmlEmail
} from './ecommerce-utils.js';

test('normalizeCandidateUrl preserves profile paths on multi-tenant creator platforms', () => {
  assert.equal(normalizeCandidateUrl('https://linktr.ee/alexcreates?utm_source=ig'), 'https://linktr.ee/alexcreates');
  assert.equal(normalizeCandidateUrl('https://beacons.ai/sarahpodcast/'), 'https://beacons.ai/sarahpodcast');
  assert.equal(normalizeCandidateUrl('https://alex.substack.com/about'), 'https://alex.substack.com/about');
  assert.equal(normalizeCandidateUrl('https://linktr.ee/pricing'), null);
  assert.equal(normalizeCandidateUrl('https://linktr.ee/'), null);
  assert.equal(normalizeCandidateUrl('https://www.shopify.com/blog/contact'), null);
  assert.equal(normalizeCandidateUrl('https://www.amazon.com/dp/B001'), null);
});

test('isCreatorEmail accepts individual creator emails and filters system/store/junk emails', () => {
  assert.equal(isCreatorEmail('alex.rivera@gmail.com'), true);
  assert.equal(isCreatorEmail('booking@dailytechpodcast.com'), true);
  assert.equal(isCreatorEmail('collabs@sarahcreates.tv'), true);
  assert.equal(isCreatorEmail('hello@mikestreaming.io'), true);
  assert.equal(isCreatorEmail('press@creatorstudio.co'), true);

  assert.equal(isCreatorEmail('noreply@youtube.com'), false);
  assert.equal(isCreatorEmail('support@mystore.com'), false);
  assert.equal(isCreatorEmail('orders@petshop.com'), false);
  assert.equal(isCreatorEmail('privacy@creator.com'), false);
  assert.equal(isCreatorEmail('admin@agency.com'), false);
  assert.equal(isCreatorEmail('hero@2x.png'), false);
  assert.equal(isCreatorEmail('contact@linktr.ee'), false);
  assert.equal(isCreatorEmail('user@example.com'), false);
});

test('extractCreatorEmails extracts from both text and mailto links without duplicates', () => {
  const html = `
    <a href="mailto:AlexCreates@gmail.com?subject=Brand%20Collab">Email Me</a>
    <a href="mailto:support@linktr.ee">Help</a>
  `;
  const text = 'For podcast sponsorships email booking@showhost.fm or alexcreates@gmail.com.';
  const emails = extractCreatorEmails(text, html);
  assert.deepEqual(emails.sort(), ['alexcreates@gmail.com', 'booking@showhost.fm']);
});

test('classifyCreatorProfile detects podcasters, YouTubers, streamers, influencers, clippers and separates Shopify stores', () => {
  const podcastRes = classifyCreatorProfile({
    url: 'https://dailyfounders.buzzsprout.com',
    title: 'Daily Founders Podcast',
    text: 'New episodes every Tuesday. Listen on Spotify and Apple Podcasts. Guest inquiries: host@dailyfounders.fm'
  });
  assert.equal(podcastRes.isCreator, true);
  assert.equal(podcastRes.creatorType, 'podcaster');

  const ytRes = classifyCreatorProfile({
    url: 'https://linktr.ee/marcustech',
    title: 'Marcus Tech | Linktree',
    text: 'YouTuber reviewing tech gear. Subscribe on YouTube. Business inquiries: marcustech@gmail.com'
  });
  assert.equal(ytRes.isCreator, true);
  assert.equal(ytRes.creatorType, 'youtuber');

  const streamerRes = classifyCreatorProfile({
    url: 'https://beacons.ai/kaigaming',
    title: 'Kai Gaming | Beacons',
    text: 'Twitch partner and Kick streamer. Streaming schedule Mon-Fri. Business: kaigaming@gmail.com'
  });
  assert.equal(streamerRes.isCreator, true);
  assert.equal(streamerRes.creatorType, 'streamer');

  const clipperRes = classifyCreatorProfile({
    url: 'https://viralcutstudio.carrd.co',
    title: 'Viral Cut Studio',
    text: 'Short-form editor and clipper helping creators scale Reels and TikToks. Contact: clips@viralcut.co'
  });
  assert.equal(clipperRes.isCreator, true);
  assert.equal(clipperRes.creatorType, 'clipper');

  const shopifyHtml = '<script src="https://cdn.shopify.com/s/files/theme.js"></script>';
  const shopifyStoreRes = classifyCreatorProfile({
    url: 'https://wishbonespet.com',
    title: 'Wishbones Pet Boutique & Barkery',
    text: 'Shop all collections. Free shipping on orders over $50. Add to cart.',
    html: shopifyHtml
  });
  assert.equal(shopifyStoreRes.isCreator, false);
  assert.equal(isShopifyHtml(shopifyHtml), true);
});

test('cleanCreatorName extracts clean human/brand names and strips platform clutter', () => {
  assert.equal(cleanCreatorName('Alex Rivera | Linktree', 'https://linktr.ee/alexrivera'), 'Alex Rivera');
  assert.equal(cleanCreatorName('Tech Talk Podcast - Buzzsprout', 'https://techtalk.buzzsprout.com'), 'Tech Talk Podcast');
  assert.equal(cleanCreatorName('Sarah Jenkins (@sarahj) | Beacons', 'https://beacons.ai/sarahj'), 'Sarah Jenkins');
  assert.equal(cleanCreatorName('Linktree', 'https://linktr.ee/maya-creates'), 'Maya Creates');
  assert.equal(cleanCreatorName('', 'https://youtube.com/@DevonVlogs'), 'DevonVlogs');
});

test('Creator AI Video Lab drafts reflect current live quvirl.com pricing & features with zero e-commerce copy', () => {
  const subject = buildVideoLabSubject('Alex Rivera', 'podcaster');
  const text = buildVideoLabTextEmail('Alex Rivera', 'podcaster');
  const html = buildVideoLabHtmlEmail('Alex Rivera', subject, 'podcaster');

  assert.match(subject, /Alex Rivera/);
  assert.match(subject, /\$4\.50\/video/);
  assert.match(text, /Quvirl AI Video Lab/);
  assert.match(text, /https:\/\/quvirl\.com\/videolab/);
  assert.match(text, /Viral Impact Gold, Creator Neon, Minimal Clean, Red Alert/);
  assert.match(text, /9:16, 1:1/);
  assert.match(html, /email-video-lab\.png/);
  assert.match(html, /Hey Alex Rivera,/);
  assert.match(html, /\$4\.50 \/ Video/);
  assert.match(html, /NVIDIA Ada Lovelace 48GB/);
  assert.match(html, /01 · UPLOAD VIDEO/);
  assert.match(text, /Upload your podcast video file directly/);

  // Guard against e-commerce leakage, outdated pricing/presets, and removed URL-paste copy
  for (const forbidden of [
    /Shopify/i,
    /Product Radar/i,
    /AliExpress/i,
    /CJdropshipping/i,
    /email-product-radar\.png/i,
    /Pay-On-Ready/i,
    /Free AI Preview/i,
    /Hormozi/i,
    /Paste (any|a|your)/i
  ]) {
    assert.doesNotMatch(text, forbidden);
    assert.doesNotMatch(html, forbidden);
  }
});

test('Preserved Shopify e-commerce helpers extract role emails, clean store names, and build current dual-product drafts', () => {
  assert.equal(resolveProspectAudience({ email: 'info@wishbonespet.com' }), 'ecommerce');
  assert.equal(resolveProspectAudience({ email: 'info@wishbonespet.com', audience: 'ecommerce' }), 'ecommerce');
  assert.equal(resolveProspectAudience({ email: 'alex@gmail.com', audience: 'creator' }), 'creator');

  const emails = extractStoreEmails(
    'Contact us at info@wishbonespet.com or personal@gmail.com',
    '<a href="mailto:support@wishbonespet.com">Support</a>'
  );
  assert.deepEqual(emails.sort(), ['info@wishbonespet.com', 'support@wishbonespet.com']);

  assert.equal(
    cleanStoreName('Shopify Experts Agency | Certified Shopify Plus Partner | Webinopoly', 'https://webinopoly.com'),
    'Webinopoly'
  );

  const subj = buildEcommerceSubject('Wishbones');
  const text = buildEcommerceTextEmail('Wishbones');
  const html = buildEcommerceHtmlEmail('Wishbones', subj);
  assert.match(subj, /Wishbones/);
  assert.match(text, /PRODUCT DEMAND RADAR/);
  assert.match(text, /1,500\+ curated products/);
  assert.match(text, /AI VIDEO LAB/);
  assert.match(text, /\$4\.50 USD per video/);
  assert.match(text, /https:\/\/quvirl\.com\/product-research/);
  assert.match(html, /email-product-radar\.png/);
  assert.match(html, /email-video-lab\.png/);
  assert.match(html, /Hi Wishbones team,/);

  // Guard against outdated pricing/preset copy in e-commerce template too
  for (const outdated of [/Pay-On-Ready/i, /Free AI Preview/i, /Hormozi/i]) {
    assert.doesNotMatch(text, outdated);
    assert.doesNotMatch(html, outdated);
  }
});
