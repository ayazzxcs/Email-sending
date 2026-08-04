import nodemailer from 'nodemailer';
import {read,write,norm} from './lib.js';
const prospects=read('data/prospects.json'),drafts=read('data/drafts.json'),log=read('data/send-log.json');
const suppressed=new Set(read('data/suppression.json').map(x=>norm(typeof x==='string'?x:x.email)));
const sentEmails=new Set(log.filter(x=>x.status==='sent').map(x=>norm(x.email)));
const sentIds=new Set(log.filter(x=>x.status==='sent').map(x=>String(x.prospectId||'')));
const today=new Date().toISOString().slice(0,10);
const sentToday=log.filter(x=>x.status==='sent'&&String(x.sentAt).startsWith(today)).length;
const amount=Math.min(Number(process.env.BATCH_SIZE||25),Math.max(0,Math.min(Number(process.env.DAILY_LIMIT||500),500)-sentToday));
if(process.env.EMERGENCY_STOP==='true'){console.log('Emergency stop enabled');process.exit(0)}
for(const k of ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS'])if(!process.env[k])throw new Error(`Missing ${k}`);
const draftById=new Map(drafts.map(d=>[String(d.prospectId),d]));
const candidates=prospects.filter(p=>p.status==='new'&&p.eligible===true&&String(p.legalBasis||'').trim()&&!suppressed.has(norm(p.email))&&!sentEmails.has(norm(p.email))&&!sentIds.has(String(p.id||''))&&draftById.has(String(p.id))).slice(0,amount);
const tx=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT),secure:process.env.SMTP_SECURE==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});await tx.verify();
for(const p of candidates){const email=norm(p.email),pid=String(p.id||'');if(sentEmails.has(email)||sentIds.has(pid))continue;const d=draftById.get(pid);p.status='sending';write('data/prospects.json',prospects);try{const info=await tx.sendMail({from:'"Quvirl" <noreply@quvirl.com>',replyTo:process.env.REPLY_TO||'noreply@quvirl.com',to:email,subject:d.subject,text:d.text});p.status='sent';p.lastSentAt=new Date().toISOString();log.push({prospectId:pid,email,status:'sent',sentAt:p.lastSentAt,messageId:info.messageId});sentEmails.add(email);sentIds.add(pid)}catch(e){p.status='error';p.lastError=e.message;log.push({prospectId:pid,email,status:'error',sentAt:new Date().toISOString(),error:e.message})}write('data/prospects.json',prospects);write('data/send-log.json',log);await new Promise(r=>setTimeout(r,Number(process.env.DELAY_SECONDS||45)*1000))}
console.log(`Processed ${candidates.length}; duplicates skipped.`);
