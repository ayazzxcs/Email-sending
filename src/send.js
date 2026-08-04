import fs from 'node:fs';
import nodemailer from 'nodemailer';
const read=(p,d=[])=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return d}};
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const norm=v=>String(v||'').trim().toLowerCase();
const prospects=read('data/prospects.json');
const log=read('data/send-log.json');
const suppression=new Set(read('data/suppression.json').map(x=>norm(typeof x==='string'?x:x.email)));
const sentEmails=new Set(log.filter(x=>x.status==='sent').map(x=>norm(x.email)));
const sentIds=new Set(log.filter(x=>x.status==='sent').map(x=>String(x.prospectId||'')));
const today=new Date().toISOString().slice(0,10);
const sentToday=log.filter(x=>x.status==='sent'&&String(x.sentAt).startsWith(today)).length;
const limit=Math.min(Number(process.env.DAILY_LIMIT||500),500);
const batch=Math.min(Number(process.env.BATCH_SIZE||25),Math.max(0,limit-sentToday));
if(process.env.EMERGENCY_STOP==='true') process.exit(0);
for(const k of ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS']) if(!process.env[k]) throw new Error(`Missing ${k}`);
const tx=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT),secure:process.env.SMTP_SECURE==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
await tx.verify();
const candidates=prospects.filter(p=>p.status==='new'&&p.eligible===true&&String(p.legalBasis||'').trim()&&!suppression.has(norm(p.email))&&!sentEmails.has(norm(p.email))&&!sentIds.has(String(p.id||''))).slice(0,batch);
const body=name=>`Hi${name?` ${name}`:''}!\n\nWe came across your store and thought you'd be interested in Quvirl.\n\nQuvirl is a free all-in-one platform built for dropshippers. It helps you discover trending products using real market signals, find reliable suppliers, import products to Shopify, and automate fulfillment, all from one dashboard.\n\nInstead of spending hours researching products across multiple tools, Quvirl brings everything together to help you find opportunities faster and manage your store more efficiently.\n\nIf you're looking to save time and stay ahead of trends, we'd love for you to check it out.\n\nhttps://quvirl.com\n\nYou're receiving this business email from Quvirl. Reply “unsubscribe” to opt out.`;
for(const p of candidates){
 const email=norm(p.email), id=String(p.id||'');
 // Final duplicate guard immediately before SMTP.
 if(sentEmails.has(email)||sentIds.has(id)) continue;
 p.status='sending'; write('data/prospects.json',prospects);
 try{
  const info=await tx.sendMail({from:'"Quvirl" <noreply@quvirl.com>',replyTo:process.env.REPLY_TO||'noreply@quvirl.com',to:email,subject:'A free product research platform for your Shopify store',text:body(p.storeName)});
  p.status='sent'; p.lastSentAt=new Date().toISOString();
  log.push({prospectId:id,email,status:'sent',sentAt:p.lastSentAt,messageId:info.messageId});
  sentEmails.add(email); sentIds.add(id);
 }catch(e){p.status='error';p.lastError=e.message;log.push({prospectId:id,email,status:'error',sentAt:new Date().toISOString(),error:e.message});}
 write('data/prospects.json',prospects); write('data/send-log.json',log);
 await new Promise(r=>setTimeout(r,Number(process.env.DELAY_SECONDS||45)*1000));
}
console.log(`Processed ${candidates.length}; already-sent addresses are skipped.`);
