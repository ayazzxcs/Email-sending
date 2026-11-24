import { read, write, norm } from './lib.js';
import { resolveProspectAudience } from './ecommerce-utils.js';

const targetAudience = String(process.env.TARGET_AUDIENCE || 'all').toLowerCase(); // 'all' | 'creator' | 'ecommerce'
const prospects = read('data/prospects.json', []);
const suppression = new Set(read('data/suppression.json', []).map(x => norm(typeof x === 'string' ? x : x.email)));
const sent = new Set(read('data/send-log.json', []).filter(x => x.status === 'sent').map(x => norm(x.email)));

const queue = prospects
  .filter(p => {
    if (p.status !== 'review_required') return false;
    if (suppression.has(norm(p.email)) || sent.has(norm(p.email))) return false;
    const audience = resolveProspectAudience(p);
    if (targetAudience !== 'all' && audience !== targetAudience) return false;
    return true;
  })
  .map(p => {
    const audience = resolveProspectAudience(p);
    return {
      id: p.id,
      email: p.email,
      audience,
      ...(audience === 'creator'
        ? {
            creatorName: p.creatorName || p.storeName || '',
            creatorUrl: p.creatorUrl || p.storeUrl || '',
            creatorType: p.creatorType || 'creator'
          }
        : {}),
      storeName: p.storeName || p.creatorName || '',
      storeUrl: p.storeUrl || p.creatorUrl || '',
      source: p.source,
      discoveredAt: p.discoveredAt
    };
  });

write('data/approval-queue.json', queue);
const creatorCount = queue.filter(x => x.audience === 'creator').length;
const ecommerceCount = queue.filter(x => x.audience === 'ecommerce').length;
console.log(`Approval queue contains ${queue.length} contacts (Creators: ${creatorCount}, E-commerce: ${ecommerceCount}).`);
