import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
import { prepareDshLoop, runDirectLoop } from '../packages/skill-production/loops.mjs';
import { FACTION_EXECUTION_MODEL_BINDING_V1 as binding, factionExecutionProfileV1, factionExecutionEgressV1,
  factionProfileRefV1, assertFactionExecutionModelNewSendV1,
  verifyFactionExecutionModelReceiptV1, factionProviderModelIdentityMatchesV1,
  FACTION_PROVIDER_MODEL_IDENTITY_BINDING_V1 as modelIdentityBinding }
  from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { FACTION_NATIVE_OUTPUT_CAPACITY_BINDING_V2 as capacity,
  assertFactionNativeOutputProfileV2 } from '../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';
import { createFactionNativeProductionRuntimeV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as oldCapacity } from '../content/skill-generation/offline-provider-profile-v2.mjs';
import { FACTION_NATIVE_PRODUCTION_BINDING_V1 as nativeBinding,
  FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 as contracts, FACTION_NATIVE_PRODUCTION_PROBE_SAMPLES_V1 as samples } from
  '../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';

const realDsh = process.argv[2] === '--dsh';
if (process.argv.length !== (realDsh ? 3 : 2)) throw new Error('ARGUMENTS_INVALID');
const base = 'build/ticket-18-faction-production-v1/';
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const testedFiles=['packages/skill-production-v3/faction-execution-model-v1.mjs',
  'packages/skill-production-v3/faction-native-output-capacity-v2.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs','packages/skill-production/loops.mjs',
  'scripts/verify-ticket-18-faction-execution-model-v1.mjs'];
const testedCodeHashes=await Promise.all(testedFiles.map(async file=>({file,hash:sha256(await readFile(file))})));
const input = await json(base + 'zerg_swarm-input.json');
const diagnosis = await json(base + 'native-output-capacity-diagnosis.json');
const request = diagnosis.request;
const originalRecipe = await json(base + diagnosis.originRunId + '/recipe.json');
const oldEgress = factionExecutionEgressV1(oldCapacity);
const newProfile = factionExecutionProfileV1({binding, legacyProfileRef:capacity.profileRef});
const newEgress = factionExecutionEgressV1(newProfile);
let checks = 0;
const eq = (a,b) => {assert.deepEqual(a,b);checks++;};
const reject = (fn, code) => {assert.throws(fn, {code});checks++;};
const reseal = ({hash:ignored,...body}, patch) => seal({...body,...patch});
eq(modelIdentityBinding.rawReportedModelPreserved, true);
eq(factionProviderModelIdentityMatchesV1({ requestedModel: oldCapacity.model,
  reportedModel: 'deepseek-flash' }, oldCapacity.model), true);
eq(factionProviderModelIdentityMatchesV1({ requestedModel: oldCapacity.model,
  reportedModel: 'unregistered-model' }, oldCapacity.model), false);
eq(factionProviderModelIdentityMatchesV1({ requestedModel: newProfile?.model,
  reportedModel: 'deepseek-flash' }, newProfile?.model), false);
reject(() => assertFactionNativeOutputProfileV2({binding:capacity,egressBinding:newEgress}), 'FACTION_NATIVE_OUTPUT_CAPACITY_PROFILE_MISMATCH');
assertFactionNativeOutputProfileV2({binding:capacity,egressBinding:oldEgress});checks++;
assertFactionNativeOutputProfileV2({binding:capacity,egressBinding:newEgress,executionModelBinding:binding});checks++;
for (const patch of [{model:'wrong'}, {maxOutputUnits:4096}, {endpoint:{...newEgress.endpoint,hostname:'example.com'}}])
  reject(() => assertFactionNativeOutputProfileV2({binding:capacity,egressBinding:{...newEgress,...patch},executionModelBinding:binding}), 'FACTION_EXECUTION_MODEL_EGRESS_MISMATCH');
reject(() => factionExecutionProfileV1({binding:reseal(binding,{model:'wrong'}),legacyProfileRef:capacity.profileRef}), 'FACTION_EXECUTION_MODEL_BINDING_INVALID');
assertFactionExecutionModelNewSendV1(binding,'2026-09-09T15:59:59.999Z');checks++;
try {assertFactionExecutionModelNewSendV1(binding,binding.localStop);assert.fail('expiry accepted');}
catch(error) {eq(error.code,'DEEPSEEK_V41_BETA_LOCAL_WINDOW_CLOSED');eq(error.safeReceipt.requestDefinitelyNotSent,true);}

// The fast mode injects DSH execution only. Native workflow, structured runtime,
// full actual request/context, SQLite leases/attempts and independent consumer
// all run their real code. --dsh replaces that injection with the pinned OS DSH.
const fakeBinding = seal({testOnly:true,kind:'explicit_injected_dsh'});
const dsh = realDsh ? await prepareDshLoop(process.cwd(), {sessionPolicy:'phased-v1'}) : {
  binding:fakeBinding, run: async args => {
    const {hash:ignored,...value} = await runDirectLoop(args);
    return seal({...value,runtimeBinding:fakeBinding,sandboxReceipt:{testOnly:true},directNetworkUsed:false});
  },
};
const policy = {maxOutputUnits:4096,attemptEstimateMicros:800000,attemptTokenReserve:500000,
  allowDefinitelyNotSentRetry:false,allowOneCapacityRetry:false,idempotentRetrySupported:false,encryptedRawQuarantineAvailable:false};
const allArtifacts = new Map(), allResponses = new Map(), allCapabilities = new Map();
let legacyRecord;
const startedAt = new Date().toISOString();
const historicalStartedAt = '2026-09-09T03:00:00.000Z';
for (const mode of ['legacy','stable_fallback','inherited_legacy']) {
  const migration = null;
  const profile = oldCapacity;
  const egressBinding = factionExecutionEgressV1(profile);
  const baseProfile = factionExecutionProfileV1({binding:migration});
  const baseEgress = factionExecutionEgressV1(baseProfile);
  const ownerRecipe = reseal(originalRecipe,{nativeProductionBinding:nativeBinding, nativeOutputCapacityBinding:capacity,
    nativeOutputCapacityFrozenRoleIds:[],dshBindingHash:dsh.binding.hash,
    ...(migration ? {executionModelBinding:migration} : {})});
  const capability = createStarcraftTmgProviderCapabilityReceiptV1({providerProfileRef:factionProfileRefV1(profile),
    endpointPath:'/responses',endpointDialect:'deepseek_responses_v1',model:profile.model,
    capability:'responses_json_schema',schemaSubsetVersion:contracts.notes.schemaSubsetVersion,
    outputContractRef:nativeBinding.contracts.notes,probeInputHash:hash('INJECTED PROBE'),probeOutputHash:hash('INJECTED NOTES'),
    probeResult:'accepted_schema_valid',usage:{inputUnits:10,outputUnits:10,totalUnits:20},usageKnown:true,
    physicalAttempts:1,probedAt:startedAt,expiresAt:new Date(Date.parse(startedAt)+3600000).toISOString()});
  allCapabilities.set(capability.receiptHash, capability);
  const store = openProductionStore(':memory:', {runId:'model-migration-'+mode,recipeHash:ownerRecipe.hash,maxCalls:2,maxCostMicros:4000000,maxTokens:1000000});
  const records=[];let capturedInput;
  const journal = {...store,
    acquire(id,value,...rest) {if(id===request.packet.id+'.'+request.roleId) capturedInput=value;return store.acquire(id,value,...rest);},
    finish(lease,value) {const saved=store.finish(lease,value);allArtifacts.set(saved.hash,saved);
      records.push({id:lease.id,inputHash:lease.inputHash,artifact:saved});return saved;},
    settle(id,value) {const result=store.settle(id,value);if(value.response?.usageReceipt)
      allResponses.set(value.response.usageReceipt.receiptHash,{response:value.response,originRunId:'faction-v1-'+ownerRecipe.hash.slice(0,20),originRecipe:ownerRecipe});return result;},
  };
  const continued = mode==='inherited_legacy' ? withCheckpointContinuation(journal, {steps:[legacyRecord],manifest:seal({
    parentRunId:'model-migration-legacy',parentRecipeHash:originalRecipe.hash,
    reusable:[{id:legacyRecord.id,inputHash:legacyRecord.inputHash,artifactHash:hash(legacyRecord.artifact)}]})}) : journal;
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({steps:mode==='inherited_legacy'?[]:[{kind:'success',output:samples.notes}]});
  const sent=[];
  const adapter=createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({send:async args=>{
    sent.push(args);const result=structuredClone(await fault.send(args));
    const {receiptHash:ignored,...body}=result.transportReceipt;
    result.transportReceipt={...body,startedAt,receiptHash:hash({...body,startedAt})};return result;
  }});
  try {
    const runtime=createFactionNativeProductionRuntimeV1({input,runtime:{role:()=>assert.fail('fallback')},store:continued,dsh,
      providerAdapter:adapter,egressBinding:baseEgress,capabilities:{},executionPolicy:policy,priceUsage:usage=>usage.totalUnits,
      executionModelBinding:migration,
      outputCapacity:{binding:capacity,frozenRoleIds:[],providerAdapter:adapter,egressBinding,capabilities:{notes:capability}}});
    const value=await runtime.role(request);
    eq((await runtime.role(request)).hash,value.hash);
    eq(sent.length,mode==='inherited_legacy'?0:1);
    if(mode==='inherited_legacy') {eq(value,legacyRecord.artifact);eq(store.summary().calls,0);}
    else {
      eq(sent[0].body.model,profile.model);eq(sent[0].body.max_output_tokens,8192);
      eq(JSON.parse(sent[0].body.input).workspace,request.workspace);
      eq(JSON.parse(sent[0].body.input).fullFrozenSources,input.frozenSources.prompt);
      eq(value.executionModelBindingHash,migration?.hash);
    }
    const args={value,request,input,roleInput:capturedInput,recipe:ownerRecipe,
      resolveArtifact:h=>allArtifacts.get(h),resolveResponse:h=>allResponses.get(h),resolveCapabilityReceipt:h=>allCapabilities.get(h)};
    eq(verifyFactionStructuredRoleReplayV1(args).providerReceiptHashes.length,1);
    if(mode==='legacy') legacyRecord=records.find(row=>row.id===request.packet.id+'.'+request.roleId);
    if(mode==='stable_fallback') {
      eq(hash(capturedInput),legacyRecord.inputHash);
    }
  } finally {store.close();}
}
const historicalCapability = createStarcraftTmgProviderCapabilityReceiptV1({providerProfileRef:factionProfileRefV1(newProfile),
  endpointPath:'/responses',endpointDialect:'deepseek_responses_v1',model:newProfile.model,
  capability:'responses_json_schema',schemaSubsetVersion:contracts.notes.schemaSubsetVersion,
  outputContractRef:nativeBinding.contracts.notes,probeInputHash:hash('HISTORICAL BETA PROBE'),
  probeOutputHash:hash('HISTORICAL BETA RESULT'),probeResult:'accepted_schema_valid',
  usage:{inputUnits:10,outputUnits:10,totalUnits:20},usageKnown:true,physicalAttempts:1,
  probedAt:historicalStartedAt,expiresAt:'2026-09-09T04:00:00.000Z'});
const historicalOwner = reseal(originalRecipe,{executionModelBinding:binding});
const historicalReceiptBody = {providerProfileRef:factionProfileRefV1(newProfile),requestedModel:newProfile.model,
  reportedModel:newProfile.model,status:200,startedAt:historicalStartedAt,capabilityReceiptHash:historicalCapability.receiptHash,
  outputContractRef:nativeBinding.contracts.notes};
const historicalReceipt = {...historicalReceiptBody,receiptHash:hash(historicalReceiptBody)};
eq(factionProfileRefV1(verifyFactionExecutionModelReceiptV1({receipt:historicalReceipt,ownerRecipe:historicalOwner,
  capability:historicalCapability,legacyProfileRef:capacity.profileRef})),factionProfileRefV1(newProfile));
reject(()=>verifyFactionExecutionModelReceiptV1({receipt:{...historicalReceipt,reportedModel:'wrong'},ownerRecipe:historicalOwner,
  capability:historicalCapability,legacyProfileRef:capacity.profileRef}),'FACTION_EXECUTION_MODEL_RECEIPT_MISMATCH');
for(const row of testedCodeHashes) eq(sha256(await readFile(row.file)),row.hash);
const report=seal({version:'faction_execution_model_component_report_v1',passed:true,checks,bindingHash:binding.hash,testedCodeHashes,
  actualRequestInputHash:input.hash,providerCalls:0,syntheticModelResponses:2,actualDshSessions:realDsh?2:0,
  dshInjectionUsed:!realDsh,legacyArtifactBytePreserved:true,stableFallbackWireVerified:true,
  historicalBetaWireModelVerified:true,currentBetaSendRejectedAfterLocalStop:true,independentConsumerPassed:true,
  fullSourceContextPreserved:true,formalProductionWired:false,skillAcceptance:false,trainingTruth:false});
await mkdir(base,{recursive:true});
await writeFile(base+(realDsh?'execution-model-dsh-component-v1.json':'execution-model-component-v1.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
