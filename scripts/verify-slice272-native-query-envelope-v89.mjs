// Concrete A6 failure: explicit outer unit/marker filters were ignored and a
// broader native marker query returned advisory success. Never infer a scene.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createRosterTeachEvidencePortV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const base=process.argv[2];
const d=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json','utf8'));
const captured=d.teachFramework.state.investigation.operations.findLast(o=>o.request.kind==='spatial'
  &&o.request.toolRequest.queryKind==='mission_marker_control'&&o.request.toolRequest.subjectUnitIds?.length&&!o.request.toolRequest.argumentsJson);
assert(captured,'Actual ignored-filter request required');
const state=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const lab=createPregameSceneLaboratoryV1({sourceState:state,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(state.officialUnitCompositionUpgradeDataBundle)}),
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(){return {candidates:[],parameterDomains:[],searchSuggestions:[]};},
    instantiate(){throw Error('No action allowed');},apply(){throw Error('No mutation allowed');}}});
const port=createRosterTeachEvidencePortV1(lab);
const scope={mutationAuthority:false,initialFoundationHash:'b'.repeat(64),sourceHashes:['c'.repeat(64)]};
const request=structuredClone(captured.request);
const before=JSON.stringify(request);
const bad=await port.query({...scope,challengeId:'captured-filter-loss',request});
assert.equal(bad.unknownReasonCode,'SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND','Outer filters must not silently become a broader successful query');
assert.equal(bad.status,'unknown');
assert.equal(bad.queryRepair?.correctable,true);
assert(bad.queryRepair?.unboundArgumentFields.includes('subjectUnitIds'));
assert(bad.queryRepair?.unboundArgumentFields.includes('targetIds'));
assert.equal(JSON.stringify(request),before);
// Explicit native {} keeps its documented all-visible scope. A conflicting
// outer filter is never silently ignored even when an inner container exists.
const explicit=await port.query({...scope,challengeId:'native-empty-explicit',request:{kind:'spatial',toolRequest:{queryKind:'mission_marker_control',argumentsJson:'{}'}}});
assert.notEqual(explicit.unknownReasonCode,'SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND');
const conflicting=await port.query({...scope,challengeId:'conflicting-outer-filter',request:{kind:'spatial',toolRequest:{...request.toolRequest,argumentsJson:'{}'}}});
assert.equal(conflicting.unknownReasonCode,'SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND');
assert(lab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({status:'PASS',capturedOuterFiltersNotIgnored:true,correctionDelivered:true,
  explicitNativeEmptyScopeRetained:true,sourceUnchanged:true,providerCalls:0,roomActions:0,modelCorrectionProven:false}));
