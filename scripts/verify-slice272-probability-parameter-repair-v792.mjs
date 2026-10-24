// Actual e5533: an explicit melee query used count instead of dice. The
// probability adapter skipped the parameter gate used by action queries.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1} from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import {inspectStarcraftTmgActionParametersV1} from '../packages/online-agent-session/action-parameter-contract-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const bad=await get('c5c64f785761de157114722eeaf09f5dc7051b152419b1da63b1ea4c67e9f8cd');
const menu=await get('167411825b8d76dff110761deca21594695702991d508d78eb33eadf615994c9');
const domain=menu.receipt.actionSpace.parameterDomains.find(d=>d.domainId===bad.request.domainId);
const authority=bad.receipt.queryReceipt.authority;
// This is an input-boundary test, not a second probability experiment. A bad
// contract must be returned before any Native state computation is needed.
let stateReads=0,instantiateCalls=0;
const envelope={matchBindingHash:authority.matchBindingHash,stateHash:authority.stateHash,
  get state(){stateReads++;return {};}};
const adapter=createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
  roomStore:{loadRoom:async()=>({stateRevision:authority.stateRevision,envelope})},
  rulesRuntime:{instantiate(){instantiateCalls++;throw Error('UNEXPECTED_NATIVE_CALL');}},seatKey:authority.seatKey,
});
const parameters=structuredClone(bad.request.parameters);
// targetUnitId is a probability endpoint, not an extra Native fight field.
const query={authority,arguments:{domainId:domain.domainId,currentLegalSpaceDomain:domain,
  parameters:{...parameters,targetUnitId:bad.request.targetUnitId}}};
const receipt=await adapter.query({...query,queryKind:'attack_probability'});
assert.equal(receipt.safeFailureClass,'parameter_contract_invalid',
  'actual malformed allocation must not be called an implementation failure');
assert.equal(receipt.reason,'RULES_QUERY_PARAMETER_CONTRACT_INVALID');
assert.equal(receipt.failureStage,'validate_current_domain_parameters');
assert.equal(receipt.mayRepairSameChoice,true);
assert.equal(stateReads,0);assert.equal(instantiateCalls,0);
assert.deepEqual(receipt.repairContext.fieldIssues,
  inspectStarcraftTmgActionParametersV1(domain,parameters).fieldIssues);
assert.ok(receipt.repairContext.fieldIssues.some(i=>i.fieldPath.includes('dice')));
assert.ok(receipt.repairContext.fieldIssues.some(i=>i.fieldPath.includes('count')));
assert.ok(!receipt.repairContext.fieldIssues.some(i=>i.fieldPath==='targetUnitId'));
const action=await adapter.query({authority,queryKind:'action_specific_threat',arguments:{
  domainId:domain.domainId,currentLegalSpaceDomain:domain,parameters}});
assert.deepEqual(receipt.repairContext.fieldIssues,action.repairContext.fieldIssues);
assert.deepEqual(receipt.repairContext.parameterContract,action.repairContext.parameterContract);
assert.deepEqual(parameters,bad.request.parameters,'no automatic input rewriting');
const good=await get('af438dfa73dcab66cd9f9a268fd19fdd6a117cfae36159f0c38da92002ed9357');
const goodValue=good.value??good;
const valid=await adapter.query({authority,queryKind:'attack_probability',arguments:{
  domainId:domain.domainId,currentLegalSpaceDomain:domain,
  parameters:goodValue.receipt.estimate.canonicalParameters}});
assert.notEqual(valid.reason,'RULES_QUERY_PARAMETER_CONTRACT_INVALID',
  'actual successful melee parameters including probability target metadata pass the input gate');
assert.ok(stateReads>0,'valid parameters reach computation; empty fixture is not a Native scene proof');
console.log(JSON.stringify({pass:true,stateReads,instantiateCalls,providerCalls:0,
  actualProbabilityExperiments:0,productionWrites:0,actualFailureArtifact:'c5c64f78'}));
