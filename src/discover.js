import { chromium } from 'playwright';
import { read,write,norm,id,validEmail,roleEmail } from './lib.js';
const queries=read('data/search-queries.json');
const prospects=read('data/prospects.json');
const known=new Map(prospects.map(p=>[norm(p.email),p]));
const blocked=/google|bing|facebook|instagram|youtube|shopify\.com|cloudflare|example\./i;
const emailRx=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({userAgent:'Mozilla/5.0 QuvirlResearchBot/2.0'});
const stores=new Set();
for(const q of queries.slice(0,Number(process.env.MAX_QUERIES||3))){
  const url='https://www.google.com/search?q='+encodeURIComponent(q);
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000}).catch(()=>null);
  const links=await page.locator('a').evaluateAll(as=>as.map(a=>a.href).filter(Boolean)).catch(()=>[]);
  for(const href of links){try{const u=new URL(href);if(/^https?:$/.test(u.protocol)&&!blocked.test(u.hostname))stores.add(u.origin)}catch{}}
}
for(const origin of [...stores].slice(0,Number(process.env.MAX_STORES||20))){
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:25000});
  const html=await page.content();
  if(!/cdn\.shopify\.com|Shopify\.theme|myshopify\.com/i.test(html))continue;
  const title=await page.title();
  const innerLinks=await page.locator('a').evaluateAll((as,o)=>as.map(a=>a.href).filter(h=>h&&h.startsWith(o)&&/contact|about|privacy/i.test(h)).slice(0,6),origin);
  let text=await page.locator('body').innerText().catch(()=>"");
  for(const link of [...new Set(innerLinks)]){await page.goto(link,{waitUntil:'domcontentloaded',timeout:20000}).catch(()=>null);text+='\n'+await page.locator('body').innerText().catch(()=>"");}
  for(const email of [...new Set((text.match(emailRx)||[]).map(norm))].filter(e=>validEmail(e)&&roleEmail(e)&&!blocked.test(e))){
   if(!known.has(email))known.set(email,{id:id(email),email,storeName:title||new URL(origin).hostname,storeUrl:origin,source:'public website',discoveredAt:new Date().toISOString(),status:'review_required',eligible:false,legalBasis:''});
  }
 }catch(e){console.error('skip',origin,e.message)}
}
await browser.close();
write('data/prospects.json',[...known.values()]);
console.log(`Stored ${known.size} prospects; new contacts require eligibility review.`);
