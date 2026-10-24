// Reproduce the real r22 claim that the control query cannot supply its range.
// One frozen-source read through the product's Native adapter; no model/action.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 as contracts} from '../packages/online-agent-session/spatial-query-contracts-v1.mjs';
import {createStarcraftTmgSnapshotSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {createStarcraftTmgNativeSpatialQueryToolV1} from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import {describePregameWorkflowInputContractsV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {rosterToolCapabilityCatalogueV1,rosterToolContractDirectoryV1} from '../packages/roster-strategist/roster-tool-proof-scope-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const checks=[];
const control=contracts.mission_marker_control;
assert.match(control.proves,/contestRangeMilliInches/,
  'r22 says the tool has no control-range output: its discoverable proof scope must name that existing Native field');
assert.equal(control.resultFields?.contestRangeMilliInches?.unit,'milli-inch');
assert.equal(control.resultFields?.markerRadiusMilliInches?.unit,'milli-inch');
checks.push('missing_range_output_discovery_reproduced_and_exposed_without_hardcoded_rules_value');

const product=describePregameWorkflowInputContractsV1();
assert.deepEqual(product.spatial.queryContracts.mission_marker_control,control);
const descriptor={operations:[{operation:'spatial',scope:'read_only',...product.spatial}]};
const catalogue=rosterToolCapabilityCatalogueV1(descriptor);
const directory=rosterToolContractDirectoryV1(descriptor,{evidenceId:'offline-control-contract',evidenceNumber:1});
assert.match(catalogue.capabilities.find(c=>c.queryKind==='mission_marker_control').proofScope.proves,/contestRangeMilliInches/);
assert.match(directory.operations[0].queries.find(c=>c.queryKind==='mission_marker_control').proves,/contestRangeMilliInches/);
const tool=createStarcraftTmgNativeSpatialQueryToolV1({name:'offline_native',queryKinds:['mission_marker_control']});
assert.ok(tool.function.parameters.properties.argumentsJson.description.includes(JSON.stringify(control)));
checks.push('same_contract_reaches_roster_method_design_directory_and_live_native_tool');

const state=JSON.parse(await fs.readFile(process.argv[2],'utf8')).state;
const before=hash(state);
let actions=0;
const service=createStarcraftTmgSnapshotSceneQueryServiceV1({state,seatKey:'player1',
  sceneScope:{kind:'pregame_reference',sourceStateHash:before,baseStateHash:before},
  rulesRuntime:{enumerate:()=>({candidates:[],parameterDomains:[],searchSuggestions:[]}),
    instantiate:()=>{actions++;throw Error('NO_ACTION_AUTHORIZED');}}});
const reply=await service.query({requestId:'offline-control-output-v972',queryKind:'mission_marker_control',arguments:{}});
assert.equal(reply.status,'exact');
for(const [field,description] of Object.entries(control.resultFields)){
  assert.ok(Object.hasOwn(reply.result,field),`Advertised Native field missing: ${field}`);
  assert.equal(description.type==='array'?Array.isArray(reply.result[field])? 'array':typeof reply.result[field]:typeof reply.result[field],description.type);
}
assert.ok(reply.result.markerResults.length>0);
for(const marker of reply.result.markerResults){
  for(const field of control.resultFields.markerResults.itemFields)assert.ok(Object.hasOwn(marker,field),field);
}
assert.equal(reply.result.awardedVictoryPoints,false);
assert.equal(reply.result.mutationAuthority,false);
assert.equal(reply.result.applyAuthority,false);
assert.equal(actions,0);
assert.equal(hash(state),before);
checks.push('native_query_returns_advertised_fields_no_state_change_no_action_no_vp_award');
console.log(JSON.stringify({ok:true,checks,providerCalls:0,nativeQueries:1,nativeActions:actions,
  control:{contestRangeMilliInches:reply.result.contestRangeMilliInches,markerRadiusMilliInches:reply.result.markerRadiusMilliInches,
    lineOfSightPolicy:reply.result.lineOfSightPolicy,scope:reply.result.scope,markers:reply.result.markerResults.length},
  sourceStateUnchanged:true}));
