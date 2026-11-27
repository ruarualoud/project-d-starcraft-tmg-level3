import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';
import { createStarcraftProductServerV1 } from './serve-starcraft-product-v1.mjs';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';

const scale=process.argv[2];
assert(['standard','skirmish'].includes(scale));
const dir='build/ticket-28-wave3-human-lobby-v1';
const source=await read(dir+'/'+scale+'.public.json');
assert(source.terminal && source.coldReplay && source.resultText,'Original room is still completing');
const options={root,fixtureRoot:root,dataDirectory:path.join(root,dir,'rooms-'+scale),webRoot:path.join(root,dir,'web-contract'),
  port:0,mapConfiguration:{seedId:'standard-d6-1'},liveEnabled:false,autoDrive:false};
const server=await createStarcraftProductServerV1(options);
let browser, page, stage='open';
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'zh-CN'});
  await page.route('**/*',route=>new URL(route.request().url()).origin===server.origin||/^(data|blob):/.test(route.request().url())?route.continue():route.abort());
  const url=server.origin+'/starcraft-tmg-level3/product/v1/rooms/'+source.roomId+'/open';
  const res=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert(res.ok,'open returned '+res.status);
  const body=await res.json();
  const match=(body.result??body).match;
  await page.goto(match.joinUrl);
  const outcome=page.getByTestId('product-match-outcome');
  await outcome.waitFor({timeout:150000});
  assert.equal(await outcome.innerText(),source.resultText);
  const file=scale+'-mobile-outcome.png';
  await outcome.scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(root,dir,file)});
  stage='refresh';
  await page.reload();
  const resume=page.getByTestId('product-resume-'+source.roomId);
  await Promise.race([outcome.waitFor({timeout:150000}),resume.waitFor({timeout:150000})]);
  const reloadMode=await outcome.isVisible()?'automatic':'lobby reopen';
  if(reloadMode==='lobby reopen')await resume.click();
  await outcome.waitFor({timeout:150000});
  assert.equal(await outcome.innerText(),source.resultText);
  await outcome.scrollIntoViewIfNeeded();
  const box=await outcome.boundingBox();
  const viewport=await page.evaluate(()=>({width:window.innerWidth, height:window.innerHeight}));
  assert.equal(viewport.width,390,'responsive viewport not applied');
  assert(box && box.x>=-1 && box.x+box.width<=viewport.width+1,'outcome extends past the phone viewport: '+JSON.stringify(box));
  await save(dir+'/'+scale+'-mobile-outcome.public.json',{roomId:source.roomId,revision:source.terminal.revision,terminalHash:source.terminal.stateHash,
    result:await outcome.innerText(),reload:true,reloadMode,viewport,outcomeBounds:box,screenshot:file,client:'Chromium mobile web',paidCalls:0});
} catch(error) {
  const visible=await page?.locator('body').innerText({timeout:3000}).catch(()=>'');
  await save(dir+'/'+scale+'-mobile-stop-'+Date.now()+'.public.json',{stage,error:error.message,
    visible:visible?.replace(/[A-Za-z0-9_-]{23,}/g,'[omitted]').slice(0,1100)});
  throw error;
} finally {await browser?.close();await server.close();}
