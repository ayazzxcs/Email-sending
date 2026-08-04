import { read,write } from './lib.js';
const prospects=read('data/prospects.json');
const drafts=read('data/drafts.json');
const existing=new Set(drafts.map(d=>d.prospectId));
for(const p of prospects){
 if(existing.has(p.id))continue;
 const greeting=p.storeName?`Hi ${p.storeName} team!`:'Hi!';
 drafts.push({prospectId:p.id,email:p.email,subject:'A free product research platform for your Shopify store',text:`${greeting}\n\nWe came across your store and thought you'd be interested in Quvirl.\n\nQuvirl is a free all-in-one platform built for dropshippers. It helps you discover trending products using real market signals, find reliable suppliers, import products to Shopify, and automate fulfillment, all from one dashboard.\n\nInstead of spending hours researching products across multiple tools, Quvirl brings everything together to help you find opportunities faster and manage your store more efficiently.\n\nIf you're looking to save time and stay ahead of trends, we'd love for you to check it out.\n\nhttps://quvirl.com\n\nYou're receiving this business email from Quvirl. Reply “unsubscribe” to opt out.`});
}
write('data/drafts.json',drafts);console.log(`Drafts: ${drafts.length}`);
