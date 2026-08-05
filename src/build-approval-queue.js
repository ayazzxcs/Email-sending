import { read, write, norm } from './lib.js';
const prospects = read('data/prospects.json', []);
const suppression = new Set(read('data/suppression.json', []).map(x => norm(typeof x === 'string' ? x : x.email)));
const sent = new Set(read('data/send-log.json', []).filter(x => x.status === 'sent').map(x => norm(x.email)));
const queue = prospects
  .filter(p => p.status === 'review_required' && !suppression.has(norm(p.email)) && !sent.has(norm(p.email)))
  .map(p => ({
    id: p.id,
    email: p.email,
    storeName: p.storeName,
    storeUrl: p.storeUrl,
    source: p.source,
    discoveredAt: p.discoveredAt
  }));
write('data/approval-queue.json', queue);
console.log(`Approval queue contains ${queue.length} contacts.`);
