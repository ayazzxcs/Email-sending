import fs from 'node:fs';
import crypto from 'node:crypto';
export const read=(p,d=[])=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return d}};
export const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
export const norm=v=>String(v||'').trim().toLowerCase();
export const id=v=>crypto.createHash('sha256').update(String(v)).digest('hex').slice(0,20);
export const validEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const roleEmail=e=>/^(info|hello|contact|support|sales|team|business|partnerships|marketing)@/i.test(e);
