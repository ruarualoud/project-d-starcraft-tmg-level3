import assert from 'node:assert/strict';
import path from 'node:path';
import {chromium} from 'playwright';
import {atomicWrite} from './lib/development-context.mjs';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';
import {createSqliteStarcraftTmgStrategyReleaseStoreV1} from '../packages/strategy-skills/sqlite-strategy-release-store-v1.mjs';

const root=process.cwd(),dir=path.join(root,'build/ticket-28-wave3-refresh-web');
const server=await createStarcraftProductServerV1({root,fixtureRoot:root,dataDirectory:dir,webRoot:path.join(dir,'web'),
  liveEnabled:false,port:0,mapConfiguration:{seedId:'standard-d6-1'}});
let browser,accepted;
try {
  browser=await chromium.launch({executablePath:process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.setDefaultTimeout(120000);
  await page.goto(server.origin+'/army?matchSetupId=wave3-skirmish-v1');
  const [reply]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/skill-refresh-preview')),
    page.getByTestId('army-skill-refresh-preview').click()]);
  assert.equal(reply.status(),200);
  accepted=await reply.json();
  assert.equal(accepted.sectionCount,64);
  assert.equal(accepted.affected,58);
  assert((await page.getByTestId('army-skill-refresh-result').innerText()).includes('58'));
  await page.screenshot({path:path.join(dir,'refresh.png')});
} finally {try{await browser?.close();}finally{await server.close();}}
const store=createSqliteStarcraftTmgStrategyReleaseStoreV1({filename:path.join(dir,'skill-refresh.sqlite')});
try {
  const record=await store.getArtifact('wave3-refresh:'+accepted.previewHash);
  assert.equal(record.artifact.releaseHash,accepted.releaseHash);
  assert.equal(record.artifact.runtimeAccepted,false);
  assert.equal(record.artifact.impact.sections.length,64);
  await atomicWrite(path.join(dir,'result.public.json'),JSON.stringify({...accepted,coldVerified:true,
    generatedSkills:0,productionPublications:0,externalModelCalls:0},null,2)+'\n');
  console.log(JSON.stringify(accepted));
} finally {await store.close();}
