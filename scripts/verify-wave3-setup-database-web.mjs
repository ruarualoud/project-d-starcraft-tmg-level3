import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const baseline=process.argv.includes('--baseline');
const root=process.cwd(),dir=path.resolve('build/ticket-28-wave3-database-web');
await fs.mkdir(dir,{recursive:true});
const webRoot=baseline?path.resolve('build/ticket-28-wave3-geometry-web/web'):path.join(dir,'web');
const server=await createStarcraftProductServerV1({root,dataDirectory:dir,fixtureRoot:root,webRoot,port:0,liveEnabled:false,
  autoDrive:false,mapConfiguration:{seedId:'standard-d6-1'}});
const setupId='wave3-standard-v1';
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.route('**/*',route=>new URL(route.request().url()).origin===server.origin?route.continue():route.abort());
  page.setDefaultTimeout(90000);
  const label=page.getByText(/Command Center · U\d+\/C\d+\/R\d+/);
  if(process.argv.includes('--army')){
    const response = page.waitForResponse(r => r.url().endsWith('/match-setup'));
    await page.goto(server.origin+'/army?matchSetupId='+setupId);
    const selected = await response;
    assert.equal(selected.status(), 200);
    assert.equal(selected.request().headers()['x-starcraft-match-setup'], setupId);
    await page.getByTestId('army-new-Terran').waitFor();
    assert.match(await page.locator('body').innerText(), /U83\/C84/);
    await atomicWrite(path.join(dir,'army.public.json'), JSON.stringify({setupId,source:'U83/C84',httpStatus:selected.status(),providerCalls:0})+'\n');
  }else if(baseline){
    await page.goto(server.origin+'/?matchSetupId='+setupId);await label.waitFor();
    const shown=await label.innerText();assert.match(shown,/U71\/C69\/R48/);
    await atomicWrite(path.join(dir,'old.public.json'),JSON.stringify({setupId,shown})+'\n');
  }else{
    const catalogue=await fetch(server.origin+'/starcraft-tmg-level3/product/v1/catalogue');
    assert.equal(catalogue.status,200);
    assert((await catalogue.json()).setups.some(s=>s.id===setupId));
    await page.goto(server.origin+'/match');
    await page.getByTestId('product-mode-human_vs_human').click();
    const button=page.getByTestId('product-setup-'+setupId);
    await button.click();
    await page.getByTestId('product-view-database').click();
    await label.waitFor();assert.match(await label.innerText(),/U83\/C84\/R50/);
    const search=page.getByRole('textbox').first();
    await search.fill('Raven');
    const raven=page.getByText(/^(Raven|渡鸦)$/i).first();
    await raven.click();
    assert((await page.locator('body').innerText()).includes('170'));
    await page.screenshot({path:path.join(dir,'raven.png')});
    await page.goto(server.origin+'/?matchSetupId=unknown-offline-release');
    await page.getByText(/PRODUCT_SETUP_NOT_FOUND|PRODUCT_SETUP_UNKNOWN/).first().waitFor();
    assert.equal(await label.count(),0);
    await page.goto(server.origin+'/');await label.waitFor();assert.match(await label.innerText(),/U71\/C69\/R48/);
    await atomicWrite(path.join(dir,'result.public.json'),JSON.stringify({setupId,frozen:'U83/C84/R50',ravenSmallMinerals:170,
      legacy:'U71/C69/R48',unknownReleaseBlocked:true,providerCalls:0},null,2)+'\n');
  }
}finally{await browser?.close();await server.close();}
