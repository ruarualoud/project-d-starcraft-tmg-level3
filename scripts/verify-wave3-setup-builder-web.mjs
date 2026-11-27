import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root = process.cwd();
const dir = path.join(root,'build/ticket-28-wave3-setup-builder-web');
await mkdir(dir,{recursive:true});
const server = await createStarcraftProductServerV1({root,dataDirectory:path.join(dir,'rooms'),fixtureRoot:root,
  webRoot:path.join(dir,'web'),port:0,liveEnabled:false,autoDrive:false,mapConfiguration:{seedId:'standard-d6-1'}});
const api = '/starcraft-tmg-level3/roster-planning/v1';
const product = '/starcraft-tmg-level3/product/v1';
let browser;
try {
  const catalogue = await fetch(server.origin+product+'/catalogue').then(r=>r.json());
  const chosen = catalogue.setups.find(row=>row.id.includes('artefact_hunt') && row.deployment.includes('MEETING'));
  const other = catalogue.setups.find(row=>row.id==='wave3-skirmish-v1');
  const read = (id,op) => fetch(server.origin+api+'/'+op,{headers:{'x-starcraft-match-setup':id}});
  const unknown = await read('not-a-product-setup','match-setup');
  assert.equal(unknown.status,404);
  const query=await read(other.id,'match-setup');
  assert.equal(query.status,200);
  const skirmish=await query.json();
  assert.equal(skirmish.setup.minerals,other.minerals);
  assert.equal(skirmish.catalogue.units.length,45);
  const legacy=catalogue.presets.find(army=>army.roster.some(unit=>unit.unitId==='goliath'));
  assert(legacy);
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:880}});
  page.setDefaultTimeout(120_000); // A cold Standard board compiles the complete rules map.
  page.on('pageerror',e=>console.error('page error',e.message));
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())console.log('page',new URL(frame.url()).pathname,new URL(frame.url()).search);});
  await page.goto(server.origin+'/match');
  const armyKey='@project-d/starcraft-tmg/product/v1/army-lists';
  await page.getByTestId('product-copy-'+legacy.id).click();
  const getArmies = () => page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'[]'),armyKey);
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)??'[]').length>0,armyKey);
  const old=(await getArmies())[0];
  await page.getByTestId('product-mode-human_vs_human').click();
  await page.getByTestId('product-setup-'+chosen.id).click();
  const [res]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/match-setup')),
    page.getByTestId('product-edit-roster').click()]);
  assert.equal(res.request().headers()['x-starcraft-match-setup'],chosen.id);
  assert.equal(res.status(),200);
  const {setup,catalogue:cards}=await res.json();
  assert.equal(setup.id,chosen.id);
  assert.equal(setup.mission,chosen.mission);
  assert.notEqual(setup.mapBinding.deploymentRecordKey,skirmish.setup.mapBinding.deploymentRecordKey);
  assert.equal(cards.source.officialDatasetHash,chosen.officialDatasetHash);
  const goliath=cards.units.find(x=>x.id==='goliath');
  assert.equal(goliath.smallProfile.cost,180);
  assert.equal(cards.units.find(x=>x.id==='raven').smallProfile.cost,170);
  await page.getByTestId('army-new-Terran').waitFor();
  assert((await page.locator('body').innerText()).includes('U83/C84'));
  await page.screenshot({path:path.join(dir,'builder.png')});
  await page.getByTestId('army-reprice-'+old.id).click();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)??'[]').length===2,armyKey);
  const saved=await getArmies();
  assert.deepEqual(saved.find(a=>a.id===old.id),old);
  const copy=saved.find(a=>a.id!==old.id);
  assert.equal(copy.officialDatasetHash,chosen.officialDatasetHash);
  assert.equal(copy.roster.find(unit=>unit.unitId==='goliath').baseCost,180);
  assert.equal(old.roster.find(unit=>unit.unitId==='goliath').baseCost,190);
  await page.reload();
  await page.getByTestId('army-open-roster-planning-top').waitFor();
  const health=page.waitForResponse(r=>r.url().includes(api+'/') && !r.url().endsWith('/match-setup'));
  await page.getByTestId('army-open-roster-planning-top').click();
  const check=await health;
  assert.equal(check.request().headers()['x-starcraft-match-setup'],chosen.id);
  assert.equal(check.status(),409);
  const reason=await check.json();
  assert.equal(reason.error,'WAVE3_PLANNING_QUALIFIED_STRATEGY_RELEASE_REQUIRED');
  const wrong = await fetch(server.origin+product+'/rooms',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({matchMode:'human_vs_human',army:copy})});
  assert.equal(wrong.status,422);
  assert.equal((await wrong.json()).reason,'PRODUCT_ROSTER_SELECTION_SOURCE_MISMATCH');
  const result={setup:chosen.id,deployment:setup.mapBinding.deploymentRecordKey,mission:setup.mapBinding.missionRecordKey,
    skirmishSetup:other.id,otherDeployment:skirmish.setup.mapBinding.deploymentRecordKey,markers:setup.missionMarkers.length,
    datasetHash:copy.officialDatasetHash,units:cards.units.length,goliath:{original:190,copy:180},raven:170,
    oldArmyPreserved:true,webReload:true,unknownSetupStatus:unknown.status,wrongReleaseStatus:wrong.status,
    plannerQualificationStop:reason.error,externalModelCalls:0};
  await atomicWrite(path.join(dir,'result.public.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally {try{await browser?.close();}finally{await server.close();}}
