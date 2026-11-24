import { read, write } from './lib.js';
import {
  cleanCreatorName,
  buildVideoLabSubject,
  buildVideoLabTextEmail,
  buildVideoLabHtmlEmail
} from './creator-utils.js';
import {
  resolveProspectAudience,
  cleanStoreName,
  buildEcommerceSubject,
  buildEcommerceTextEmail,
  buildEcommerceHtmlEmail
} from './ecommerce-utils.js';

export {
  cleanStoreName,
  cleanCreatorName,
  resolveProspectAudience,
  buildVideoLabSubject,
  buildVideoLabTextEmail,
  buildVideoLabHtmlEmail,
  buildEcommerceSubject,
  buildEcommerceTextEmail,
  buildEcommerceHtmlEmail
};
export const buildTextEmail = buildEcommerceTextEmail;
export const buildHtmlEmail = buildEcommerceHtmlEmail;

const prospects = read('data/prospects.json', []);
const drafts = read('data/drafts.json', []);
const draftByProspectId = new Map(drafts.map(d => [String(d.prospectId), d]));

let updatedCount = 0;
let newCount = 0;
let creatorDrafts = 0;
let ecommerceDrafts = 0;

for (const p of prospects) {
  if (p.status === 'sent') continue;

  const audience = resolveProspectAudience(p);
  let displayName = '';
  let subject = '';
  let text = '';
  let html = '';
  let creatorType = p.creatorType || (audience === 'creator' ? 'creator' : 'ecommerce');

  if (audience === 'creator') {
    const rawName = p.creatorName || p.storeName || '';
    const rawUrl = p.creatorUrl || p.storeUrl || '';
    displayName = cleanCreatorName(rawName, rawUrl, p.email);
    subject = buildVideoLabSubject(displayName, creatorType);
    text = buildVideoLabTextEmail(displayName, creatorType);
    html = buildVideoLabHtmlEmail(displayName, subject, creatorType);
    creatorDrafts++;
  } else {
    displayName = cleanStoreName(p.storeName, p.storeUrl);
    subject = buildEcommerceSubject(displayName);
    text = buildEcommerceTextEmail(displayName);
    html = buildEcommerceHtmlEmail(displayName, subject);
    ecommerceDrafts++;
  }

  const pid = String(p.id);
  if (draftByProspectId.has(pid)) {
    const existing = draftByProspectId.get(pid);
    existing.audience = audience;
    existing.creatorType = creatorType;
    existing.storeName = displayName;
    existing.creatorName = audience === 'creator' ? displayName : undefined;
    existing.subject = subject;
    existing.text = text;
    existing.html = html;
    updatedCount++;
  } else {
    const newDraft = {
      prospectId: pid,
      email: p.email,
      audience,
      creatorType,
      storeName: displayName,
      ...(audience === 'creator' ? { creatorName: displayName } : {}),
      subject,
      text,
      html
    };
    drafts.push(newDraft);
    draftByProspectId.set(pid, newDraft);
    newCount++;
  }
}

write('data/drafts.json', drafts);
console.log(
  `Drafts processed. Updated: ${updatedCount}, New: ${newCount} (Creators: ${creatorDrafts}, E-commerce: ${ecommerceDrafts}), Total: ${drafts.length}`
);
