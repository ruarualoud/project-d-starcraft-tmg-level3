import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {hash,verifySeal} from '../packages/skill-production/common.mjs';
import {verifyRosterDecisionSessionReceiptV1} from '../packages/roster-planning-workspace/roster-workflow-acceptance-v1.mjs';
const root=process.cwd(),dir=path.resolve('build/ticket-28-wave3-historical-plan');
const source='build/slice272-product-generation-v645-rXHPkv/workspace/decision-product-journeys/decision-934ec587-0bf9-46f5-ab4e-054ad9b39c12/acceptance.json';
const original=await fs.readFile(source,'utf8'),bundle=JSON.parse(original),plan=bundle.plan;
verifyRosterDecisionSessionReceiptV1(bundle.sessionReceipt);
assert.equal(bundle.sessionReceipt.planHash,plan.planHash);
const server=await createStarcraftProductServerV1({root,dataDirectory:dir,fixtureRoot:root,webRoot:dir,
  port:0,liveEnabled:false,autoDrive:false,mapConfiguration:{seedId:'standard-d6-1'}});
try{
  const ask=async value=>fetch(server.origin+'/starcraft-tmg-level3/roster-planning/v1/historical-plan-impact',{
    method:'POST',headers:{'content-type':'application/json','x-starcraft-match-setup':'wave3-standard-v1'},body:JSON.stringify({plan:value})});
  const response=await ask(plan);
  const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));
  const {impact}=data;verifySeal(impact);
  assert.equal(impact.planHash,plan.planHash);
  const goliath=impact.directChanges.find(change=>change.recordKey==='army_units:goliath');
  const cost=goliath.change.fields.find(f=>f.field==='small.cost');
  assert.deepEqual([cost.before,cost.after],[190,180]);
  assert.deepEqual(goliath.instances,['u_goliath_1']);
  assert.equal(goliath.purposeHashes.length,1);
  assert(impact.reviewSections.resourceBudget.includes(goliath.recordKey));
  assert(impact.layout.some(row=>!row.sameRecord));
  assert.equal(impact.runtimeAccepted,false);assert.equal(impact.canStartMatch,false);
  const corrupted=await ask({...plan,publicSummaryText:'changed without a signed revision'});
  assert.equal(corrupted.status,422);
  const other=structuredClone(plan);
  const rehash=(obj,field)=>{delete obj[field];obj[field]=hash(obj);};
  other.provenance.normalizedDatasetHash='f'.repeat(64);
  rehash(other.provenance,'provenanceHash');rehash(other,'planHash');
  const wrong=await ask(other);assert.equal(wrong.status,409);
  assert.equal(await fs.readFile(source,'utf8'),original);
  await atomicWrite(path.join(dir,'result.public.json'),JSON.stringify({source,sourceReceipt:bundle.sessionReceipt.receiptHash,impact,
    wrongOrigin:wrong.status,invalidPlan:corrupted.status,providerCalls:0},null,2)+'\n');
  console.log(JSON.stringify({plan:impact.planHash,cost,dependencyRecords:impact.referencedRecords,changed:impact.directChanges.length,layout:impact.layout}));
}finally{await server.close();}
