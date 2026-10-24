import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { createScriptedRosterDeliberationPortV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';

const [runDirectory, configFile, formalFile] = process.argv.slice(2);
if (process.argv.includes('--saved-error-reproduction')) {
  const request=JSON.parse(gunzipSync(await fs.readFile(path.join(runDirectory,'call-059.product-request.json.gz'))));
  const source=request.promptNodes.find(node=>node.kind==='frozen-source-and-skill-boundary').sourceContext;
  const outcome=source.foundationToolOutcomes.find(row=>row.needId==='need-threat-exchange');
  const original=source.foundationToolResults.find(row=>row.needId===outcome.needId);
  assert.ok(original.request.toolRequest.spec.placements.length>0);
  assert.notEqual(outcome.status,'answered','Real 058 hypothetical scene was dropped before the 059 consumer');
  process.exit(0);
}
const root = path.resolve(import.meta.dirname, '..');
const cfg = JSON.parse(await fs.readFile(configFile, 'utf8'));
const saved = JSON.parse(await fs.readFile(formalFile, 'utf8'));
const paidReply = JSON.parse(gunzipSync(await fs.readFile(path.join(runDirectory, 'call-058.reply.json.gz'))));
const foundation = structuredClone(paidReply.output);
// Preserve all six real requests, including the nonempty hypothetical scene
// incorrectly sent under threat_exchange and the valid route/math controls.
const original = JSON.stringify(foundation);
const consumerFile=process.argv.find(value=>value.startsWith('--consumer='))?.slice('--consumer='.length);
if(consumerFile){
  const request=JSON.parse(gunzipSync(await fs.readFile(consumerFile)));
  verifyConsumer(request.promptNodes.find(node=>node.kind==='frozen-source-and-skill-boundary').sourceContext);
  process.exit(0);
}
const directory = await fs.mkdtemp(path.join(runDirectory, 'v349-focused-'));
let delivered;
const product = await createRosterPlanningProductModuleV1({root, fixtureRoot:cfg.fixtureRoot,
  dataDirectory:directory, mapConfiguration:JSON.parse(await fs.readFile(cfg.mapConfigurationFile,'utf8')),
  deliberationFactory:{availability:()=>({available:true}), async createForRun(){
    return createScriptedRosterDeliberationPortV1({handler(request){
      if(request.roundKind==='strategy_foundation')return foundation;
      assert.equal(request.roundKind,'teach_challenge');
      delivered=request.promptNodes.find(node=>node.kind==='frozen-source-and-skill-boundary').sourceContext;
      throw Object.assign(Error('V349_STOP_AT_NEXT_CONSUMER'),{code:'V349_STOP_AT_NEXT_CONSUMER'});
    }});
  }}});
const session=await product.service.createPresetSession({setup:saved.setup,
  candidateInput:saved.lockedRoster.lock.candidateInput});
await product.service.startPlanning(session.sessionId);
let current;
while(true){current=await product.service.readSession(session.sessionId);
  if(current.status!=='running')break;await new Promise(resolve=>setTimeout(resolve,50));}
assert.equal(current.failure?.code,'V349_STOP_AT_NEXT_CONSUMER');
verifyConsumer(delivered);
function verifyConsumer(delivered){
const threat=delivered.foundationToolOutcomes.find(row=>row.needId==='need-threat-exchange');
console.log(JSON.stringify({threatStatus:threat?.status,reason:threat?.errorCode,providerCalls:0}));
assert.notEqual(threat.status,'answered','A hypothetical scene must not become a successful query on the off-board source');
assert.ok(['ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS','ROSTER_TEACH_QUERY_KIND_SCENARIO_REQUIRED'].includes(threat.errorCode));
assert.equal(threat.queryRepair.originalQueryNotAnswered,true);
assert.deepEqual(threat.request,foundation.informationNeeds.find(row=>row.needId===threat.needId));
assert.equal(delivered.foundationToolResults.some(row=>row.needId===threat.needId),false);
const successful=delivered.foundationToolOutcomes.filter(row=>row.status==='answered');
assert.equal(successful.filter(row=>row.kind==='map_route').length,2);
assert.equal(successful.filter(row=>row.kind==='math').length,1);
assert.equal(delivered.foundationToolOutcomes.length,foundation.informationNeeds.length);
assert.ok(delivered.foundationToolOutcomes.every(row=>row.evidenceReceipt?.schema==='starcraft_tmg_roster_teach_evidence_receipt_v1'));
assert.equal(JSON.stringify(foundation),original);
console.log(JSON.stringify({passed:true,checks:6,realFoundationQueries:foundation.informationNeeds.length,
  sharedEvidenceContract:true,providerCalls:0,roomActions:0}));
}
