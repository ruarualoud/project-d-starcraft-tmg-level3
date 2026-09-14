import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {hash,seal,verifySeal,sha256} from '../packages/skill-production/common.mjs';
import {openProductionStore} from '../packages/skill-production/store.mjs';
import {createFactionAccountedModelV1} from '../packages/skill-production-v3/faction-command-envelope-v1.mjs';
import {FACTION_EXECUTION_MODEL_BINDING_V1 as binding,FACTION_EXECUTION_MODEL_FILES_V1 as files,
  factionExecutionProfileV1,factionProfileRefV1,verifyFactionExecutionModelMigrationV1} from '../packages/skill-production-v3/faction-execution-model-v1.mjs';

const qualify=process.argv[2]==='--qualify';
assert.equal(process.argv.length,qualify?3:2);
const base='build/ticket-18-faction-production-v1/';
const json=async file=>verifySeal(JSON.parse(await readFile(file,'utf8')));
const reseal=({hash:ignored,...body},patch)=>seal({...body,...patch});
let checks=0;
for(const mode of ['legacy','beta','wrong_model']) {
  const selected=mode==='legacy'?null:binding;
  const profile=factionExecutionProfileV1({binding:mode==='wrong_model'?null:selected});
  const store=openProductionStore(':memory:',{runId:'model-bridge-'+mode,recipeHash:hash(mode),maxCalls:2,maxCostMicros:1000000,maxTokens:100000});
  let sends=0;
  try {
    const model=createFactionAccountedModelV1({store,executionModelBinding:selected,wireSyntaxRetryAllowed:false,complete:async()=>{
      sends++;
      const output={channels:{skill:{action:'finish',content:{synthetic:'bounded bridge test'}}}};
      const body={schemaVersion:'starcraft_tmg_provider_egress_transport_v1.success',providerProfileRef:factionProfileRefV1(profile),
        requestedModel:profile.model,reportedModel:profile.model,status:200,physicalAttempts:1,automaticRetries:0,
        startedAt:'2026-09-09T01:00:00.000Z',usage:{inputUnits:100,outputUnits:10,totalUnits:110},
        responseFingerprint:sha256(JSON.stringify(output)),trainingTruth:false};
      return {output,usageReceipt:{...body,receiptHash:hash(body)}};
    }});
    const request={stageId:'model-transition.test',call:1,observed:{system:'synthetic',messages:[{role:'user',content:'Return synthetic finish.'}],tools:[]}};
    if(mode==='wrong_model') {
      await assert.rejects(model(request),{code:'FACTION_EXECUTION_MODEL_RECEIPT_MISMATCH'});checks++;
      await assert.rejects(model(request),{code:'FACTION_EXECUTION_MODEL_RECEIPT_MISMATCH'});checks++;
    } else {
      assert.equal((await model(request)).command.content.synthetic,'bounded bridge test');checks++;
      await model(request);
      if(mode==='beta') {assert.equal(store.summary().reservedOrSettledMicros,390);checks++;}
    }
    assert.equal(sends,1);checks++;
    assert.equal(store.summary().calls,1);checks++;
    assert.equal(store.summary().attempts[0].state,'received');checks++;
  } finally {store.close();}
}

const main=await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs','utf8');
for(const expression of [/args\.at\(-1\) === '--model-v41-beta'/,
  /executionModelBinding:FACTION_EXECUTION_MODEL_BINDING_V1/,
  /executionPolicyReadiness, executionModelReadiness/,
  /const profile = liveProfiles\.base, capacityProfile = liveProfiles\.capacity/,
  /const structuredEgressBinding = factionExecutionEgressV1\(profile\)/,
  /executionModelBinding:recipe\.executionModelBinding \|\| null/,
  /if \(quarantinesForInput\(input\)\.length && !isMixedLane\(input\)\) throw/]) {assert.match(main,expression);checks++;}
// The separately authenticated mixed-review path is an explicit single-use
// authorization. A model switch alone still cannot release another quarantine.
// Scope this assertion honestly: static egress wiring plus the two real bridge
// component paths, not a successful full production command.
assert.equal((main.match(/beforeNewProviderSend\(\);/g)||[]).length,7);checks++;
const codeHashes=await Promise.all(files.map(async file=>({file,hash:sha256(await readFile(file))})));
if(qualify) {
  const component=await json(base+'execution-model-dsh-component-v1.json');
  assert.equal(component.passed,true);assert.equal(component.actualDshSessions,2);
  assert.equal(component.dshInjectionUsed,false);assert.equal(component.bindingHash,binding.hash);
  assert.equal(component.testedCodeHashes?.length,6);
  for(const row of component.testedCodeHashes) assert.equal(sha256(await readFile(row.file)),row.hash);
  const readiness=seal({version:'faction_execution_model_readiness_v1',passed:true,bindingHash:binding.hash,
    componentReportHash:component.hash,checks,codeHashes,providerCalls:0,actualDshSessions:2,
    independentConsumerPassed:true,legacyArtifactBytePreserved:true,legacyBridgeVerified:true,
    entryWiring:'static_plus_runtime_components_full_formal_preflight_still_required',
    formalProductionAccepted:false,semanticAcceptanceInherited:false,trainingTruth:false});
  const parent=await json(base+'faction-v1-27ef94cd6f32462ec36a/recipe.json');
  const next=reseal(parent,{executionModelBinding:binding,executionModelReadinessHash:readiness.hash,
    codeHashes:[...parent.codeHashes.filter(r=>!files.includes(r.file)),...codeHashes]});
  assert.equal(verifyFactionExecutionModelMigrationV1({parent,next,readiness}).bindingHash,binding.hash);
  for(const patch of [{modelHash:hash('changed')},{sourceBinding:{}},{limits:{...next.limits,maxCalls:2000}},
    {inputHashes:[]},{nativeOutputCapacityBinding:{}},{executionModelBinding:null}])
    assert.throws(()=>verifyFactionExecutionModelMigrationV1({parent,next:reseal(next,patch),readiness}));
  assert.throws(()=>verifyFactionExecutionModelMigrationV1({parent:next,next:parent,readiness:null}));
  await writeFile(base+'execution-model-readiness-v1.json',JSON.stringify(readiness,null,2)+'\n');
  console.log(JSON.stringify(readiness));
} else console.log(JSON.stringify({passed:true,checks,providerCalls:0,legacyBridgeVerified:true,
  staticEntryWiringVerified:true,formalPreflightPassed:false}));
