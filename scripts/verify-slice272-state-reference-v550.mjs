// Actual23 supplied inspect.baseStateHash for the immutable source as a branch;
// Native rejected its own source identity. Also distinguish the created candidate
// context from the creation operation's parent contextRef:null.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]);
const base=path.join(run,'workspace/decision-workflows/candidate-capability');
const bytes=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(bytes);
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
let authority;
for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;
  const saved=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));
  if(hash(saved.authority.state)===state.scope.source){authority=saved.authority;break;}
}
assert.ok(authority);
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
const lab=createPregameSceneLaboratoryV1({laboratoryId:'state-reference-proof',sourceState:authority.state,
  sourceRoomRef:{roomId:'state-reference-proof',stateRevision:0},matchBinding:authority.matchBinding,armyBuilderPort:builder,
  rulesRuntime:createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:source.dataset,state:structuredClone(authority.state)})})});
const rootContext=lab.describeQueryContext();
// RED from actual23, before importing the new metadata capability.
assert.deepEqual(lab.describeQueryContext({base:{kind:'branch',branchStateHash:rootContext.baseStateHash}}),rootContext);
const {projectRosterWorkflowStateReferenceV1,resolveRosterWorkflowStateReferenceV1}=await import('../packages/roster-strategist/roster-workflow-state-reference-v1.mjs');
const {rosterWorkflowReceiptPointerV1,createRosterDecisionWorkflowV1}=await import('../packages/roster-strategist/roster-decision-workflow-v1.mjs');
const {createRosterWorkflowLaboratoryExecutorV1}=await import('../packages/roster-strategist/roster-workflow-laboratory-v1.mjs');
const rootValue={operation:'inspect',contextRef:null,receipt:rootContext};
const ref=projectRosterWorkflowStateReferenceV1(rootValue);
assert.equal(ref.stateHash,rootContext.baseStateHash);assert.equal(ref.contextRef,null);
const args=resolveRosterWorkflowStateReferenceV1({stateRef:ref},lab.labDescriptor());
assert.deepEqual(args,{contextRef:null,base:{kind:'source'}});
const oldCandidateWork=state.work.find(w=>w.id.endsWith(':ctx')&&w.status==='evidence_ready');
const originalCandidate=await get(oldCandidateWork.resultRef);
const candidate=projectRosterWorkflowStateReferenceV1(originalCandidate.value);
assert.equal(originalCandidate.value.contextRef,null);
assert.equal(candidate.contextRef,originalCandidate.value.receipt.contextRef,'created source, not null parent');
assert.equal(candidate.sourceStateHash,originalCandidate.value.receipt.laboratory.sourceStateHash);
assert.throws(()=>resolveRosterWorkflowStateReferenceV1({stateRef:candidate},lab.labDescriptor()),e=>e.queryRepair?.correctable===true,'wrong source must not silently fall back');
assert.equal(rosterWorkflowReceiptPointerV1('/stateRef'),'/value/stateRef');
// The public reader/binder project the complete reference from immutable old
// metadata; no historical receipt is rewritten to retrofit a field.
const flow=await createRosterDecisionWorkflowV1({store:{load:async()=>state,get,save:async()=>{},put:async()=>{throw Error('no new production artifact');}},execute:async()=>{throw Error('read only');}});
const evidence=state.evidence.find(e=>e.id==='tool:'+oldCandidateWork.id);
const read=await flow.dispatch({type:'read_evidence',consumer:'state-ref-proof',evidenceId:evidence.id,pointer:'/stateRef'});
assert.equal(read.status,'read');assert.deepEqual(read.value,candidate);
const viewRead=await flow.dispatch({type:'read_evidence',consumer:'state-ref-proof',evidenceId:'tool-view:'+oldCandidateWork.id,pointer:'/stateRef'});
assert.equal(viewRead.status,'read');assert.deepEqual(viewRead.value,candidate);
const memory=new Map(),executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,
  store:{load:async()=>({work:[]}),put:async value=>{const key=hash(value);memory.set(key,value);return key;},get:async key=>memory.get(key)}});
const actual=await executor.execute({workId:'state-ref-inspect',inputs:{request:{value:{operation:'inspect',args:{stateRef:ref},bindings:[],guards:[]}}}},
  {operationState:{},checkpointOperation:async()=>{}});
assert.equal(actual.value.status,'completed');assert.deepEqual(actual.value.receipt,rootContext);
assert.deepEqual(actual.value.stateRef,ref);assert.deepEqual(actual.value.request,{base:{kind:'source'}});
assert.deepEqual(await get(oldCandidateWork.resultRef),originalCandidate);
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),bytes);
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
console.log(JSON.stringify({pass:true,nativeRootReferenceRoundTrip:true,createdCandidateIdentity:true,legacyReceiptReadableWithoutRewrite:true,wrongContextRejected:true,providerCalls:0,productionWrites:0}));
