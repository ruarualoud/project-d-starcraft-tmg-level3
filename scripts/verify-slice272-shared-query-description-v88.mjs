// B14 sent unit arrays to a single-physical-pair measurement; Teach lacked the
// complete argument descriptor that the live Agent already receives.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { createStarcraftTmgNativeSpatialQueryToolV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1 } from '../packages/online-agent-session/spatial-query-contracts-v1.mjs';
const base=process.argv[2];
const d=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json','utf8'));
const bad=d.teachFramework.state.investigation.operations.flatMap(o=>o.request.toolRequest.followUps||[])
  .find(q=>q.queryKind==='base_edge_distance'&&q.subjectUnitIds?.length&&!q.argumentsJson);
assert(bad,'actual tool-shape confusion required');
const state=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const lab=createPregameSceneLaboratoryV1({sourceState:state,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(state.officialUnitCompositionUpgradeDataBundle)}),
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(){return {candidates:[],parameterDomains:[],searchSuggestions:[]};},
    instantiate(){throw Error('no action');},apply(){throw Error('no mutation');}}});
const context=createRosterTeachEvidencePortV1(lab).describeQueryContext();
const expected=createStarcraftTmgNativeSpatialQueryToolV1({name:'pregame_query_scene',queryKinds:STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1});
assert.deepEqual(context.nativeSpatialQueryTool,expected,'Teach must receive the same full descriptor as live play');
const description=context.nativeSpatialQueryTool.function.parameters.properties.argumentsJson.description;
assert(description.includes('source')&&description.includes('modelId')&&description.includes('target'));
assert(description.includes('markerIds')&&description.includes('unitIds')&&description.includes('domainId'));
assert(description.includes('space.inspect_relationships'));
assert(lab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({status:'PASS',sameNativeDescriptor:true,typedSinglePairAndUnitMatrixDistinguished:true,
  providerCalls:0,roomActions:0,modelCorrectionProven:false}));
