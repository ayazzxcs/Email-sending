import { read, write, norm } from './lib.js';
if (process.env.APPROVE_BATCH !== 'true') {
  console.log('APPROVE_BATCH is not true; no contacts approved.');
  process.exit(0);
}
const prospects = read('data/prospects.json', []);
const queue = read('data/approval-queue.json', []);
const suppression = new Set(read('data/suppression.json', []).map(x => norm(typeof x === 'string' ? x : x.email)));
const sent = new Set(read('data/send-log.json', []).filter(x => x.status === 'sent').map(x => norm(x.email)));
const approvedIds = new Set(queue.map(x => String(x.id || '')));
let count = 0;
for (const p of prospects) {
  if (!approvedIds.has(String(p.id || ''))) continue;
  if (suppression.has(norm(p.email)) || sent.has(norm(p.email))) continue;
  p.status = 'new';
  p.eligible = true;
  p.legalBasis = 'Batch reviewed and approved by repository owner';
  p.approvedAt = new Date().toISOString();
  count++;
}
write('data/prospects.json', prospects);
write('data/approval-queue.json', []);
console.log(`Approved ${count} contacts from the reviewed queue.`);
