import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { createScriptedRosterDeliberationPortV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';

const [runDirectory, configFile, formalFile] = process.argv.slice(2);
const root = path.resolve(import.meta.dirname, '..');
const cfg = JSON.parse(await fs.readFile(configFile, 'utf8'));
const saved = JSON.parse(await fs.readFile(formalFile, 'utf8'));
const paidReply = JSON.parse(gunzipSync(await fs.readFile(path.join(runDirectory, 'call-302.reply.json.gz'))));
const foundation = structuredClone(paidReply.output);
foundation.informationNeeds = foundation.informationNeeds.filter(need =>
  ['need-marker-schedule','need-kill-probability'].includes(need.needId));
const directory = await fs.mkdtemp(path.join(runDirectory, 'v325-focused-'));
let foundationRequest, delivered;
const product = await createRosterPlanningProductModuleV1({root, fixtureRoot:cfg.fixtureRoot,
  dataDirectory: directory, mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')),
  deliberationFactory:{availability:()=>({available:true}), async createForRun(){
    return createScriptedRosterDeliberationPortV1({handler(request){
      if(request.roundKind==='strategy_foundation'){foundationRequest=request;return foundation;}
      assert.equal(request.roundKind,'teach_challenge');
      delivered=request.promptNodes.find(node=>node.kind==='frozen-source-and-skill-boundary').sourceContext;
      throw Object.assign(new Error('V325_STOP_AT_NEXT_CONSUMER'),{code:'V325_STOP_AT_NEXT_CONSUMER'});
    }});
  }}});
const session=await product.service.createPresetSession({setup:saved.setup,
  candidateInput:saved.lockedRoster.lock.candidateInput});
await product.service.startPlanning(session.sessionId);
let current;
while(true){current=await product.service.readSession(session.sessionId);
  if(current.status!=='running')break;await new Promise(resolve=>setTimeout(resolve,50));}
assert.equal(current.failure?.code,'V325_STOP_AT_NEXT_CONSUMER');
const queryNode=foundationRequest.promptNodes.find(node=>node.nodeType==='pregame-tool-contracts');
const mathRef=delivered.foundationToolReferences.find(ref=>ref.referenceId.startsWith('needref-need-marker-schedule-'));
const observations={queryDescriptorDelivered:!!queryNode,mathReferenceStatus:mathRef?.status,
  fullResultsDelivered:!!delivered.foundationToolResults,typedOutcomesDelivered:!!delivered.foundationToolOutcomes};
console.log(JSON.stringify({observations,directory,providerCalls:0}));
assert.ok(queryNode?.content.queryContext.nativeSpatialQueryTool,'Foundation must know actual query contracts before selecting tools');
assert.equal(mathRef.status,'attached','Complete argumentsJson must reach native mission arithmetic');
const math=delivered.foundationToolResults.find(result=>result.needId==='need-marker-schedule');
assert.equal(math.sourceReceipt.resultStatus,'ok');
assert.ok(math.sourceReceipt.result.rows.length);
const bad=delivered.foundationToolOutcomes.find(result=>result.needId==='need-kill-probability');
assert.equal(bad.status,'failed');
assert.ok(bad.errorCode);
assert.ok(bad.queryRepair?.correctionInstruction);
assert.equal(bad.request.toolRequest.targetUnitId,'');
console.log(JSON.stringify({status:'passed',actualProductConsumer:true,providerCalls:0,roomActions:0,
  retainedFailedRequest:true,nativeCalculationDelivered:true}));
