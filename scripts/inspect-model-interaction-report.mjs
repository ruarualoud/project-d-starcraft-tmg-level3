// Bounded, offline browser inspection of the exported report; no product calls.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const W=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(W,'docs/model-interactions-e9981-2026-10-22');
const { chromium }=createRequire(path.join(W,'package.json'))('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[], network=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
const findings=[];
try{
  await page.goto(pathToFileURL(path.join(out,'index.html')).href,{timeout:60000});
  await page.waitForFunction(()=>window.reportReady===true,{},{timeout:30000});
  const counts=await page.evaluate(()=>window.reportCounts);
  if(counts.requests!==1031||counts.events!==9981)throw new Error('Incomplete browser dataset');
  findings.push({check:'all_request_and_event_counts',pass:true,...counts});
  for(const [width,height]of [[1440,900],[1600,1000],[1920,1080],[2048,1320],[390,844]]){
    await page.setViewportSize({width,height});
    const m=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    findings.push({check:'report_horizontal_containment',...m,pass:m.scrollWidth<=width});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:path.join(out,'report-overview.png'),fullPage:true});
  for(const n of [1,516,1031]){
    await page.evaluate(n=>choose(n),n);
    await page.locator('[data-tab="prompt"]').click();
    const check=await page.evaluate(n=>{
      const d=cache.get(n);const texts=[...document.querySelectorAll('#tab-content pre')].map(x=>x.textContent);
      return {n,pass:texts[0]===d.providerInstructions&&texts[1]===d.encodedProviderInput,promptCharacters:d.encodedProviderInput.length,correctionNodes:d.correctionNodes.length};
    },n);
    findings.push({check:'full_prompt_display',...check});
  }
  await page.locator('[data-tab="correction"]').click();
  if(!(await page.locator('#tab-content').innerText()).includes('necessary_fact_has_no_new_material_evidence'))throw new Error('Final correction absent');
  findings.push({check:'final_correction_visible',pass:true});
  await page.locator('#detail').screenshot({path:path.join(out,'report-final-correction.png')});
  await page.locator('[data-page="drafts"]').click();
  const drafts=await page.locator('#draft-list details').count();
  findings.push({check:'five_saved_drafts_visible',pass:drafts===5,count:drafts});
  await page.locator('[data-page="audit"]').click();
  const missing=await page.locator('[data-missing]').count();
  findings.push({check:'unpaired_attempts_visible',pass:missing===7,count:missing});
  findings.push({check:'no_external_network',pass:network.length===0});
  findings.push({check:'no_browser_errors',pass:errors.length===0,errors});
}catch(e){findings.push({check:'inspection_completed',pass:false,error:e.message});}
finally{await browser.close();}
const bytes=await fs.readFile(path.join(out,'index.html'));
const receipt={schema:'model_interactions_report_browser_v1',artifactSha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,status:findings.every(x=>x.pass)?'pass':'fail',findings,visualReview:'pending'};
await fs.writeFile(path.join(out,'report-browser-check.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
if(receipt.status!=='pass')process.exitCode=1;
