import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createRosterTeachEvidencePortV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const op=draft.teachFramework.state.queryRecovery.operations.find(row=>row.originalQueryId==='teach-native-move-marine1-toward-marker2');
assert.equal(op.result.unknownReasonCode,'ROSTER_TEACH_SCENARIO_FOLLOWUP_KIND_UNSUPPORTED');
const source=JSON.parse(await fs.readFile(process.argv[3],'utf8')).state;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const lab=createPregameSceneLaboratoryV1({sourceState:source,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(source.officialUnitCompositionUpgradeDataBundle)}),
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(){return {candidates:[],parameterDomains:[],searchSuggestions:[]};},
    instantiate(){throw Error('NO_ACTION_EXECUTION_IN_DISPATCH_TEST');},apply(){throw Error('NO_ACTION_EXECUTION_IN_DISPATCH_TEST');}}});
const port=createRosterTeachEvidencePortV1(lab);
const request={kind:'scenario',toolRequest:{spec:{kind:'hypothetical_geometry',preservePositions:true,phase:'movement',activeSideKey:'player1'},
  followUps:structuredClone(op.request.toolRequest.followUps)}};
const original=structuredClone(request);
const result=await port.query({mutationAuthority:false,initialFoundationHash:'b'.repeat(64),sourceHashes:['c'.repeat(64)],
  challengeId:'actual-inspect-followup',request});
assert.equal(result.followUpReceipts[0].status,'advisory');
const observed=result.followUpReceipts[0].receipt;
assert.equal(observed.baseStateHash,result.sourceReceipt.branchStateHash);
assert.equal(observed.contextOnlyNotStrategyProof,true);
assert.deepEqual(observed.queryContext,lab.describeQueryContext({base:{kind:'branch',branchStateHash:observed.baseStateHash}}));
assert.deepEqual(request,original);
assert.equal(lab.proveMutationZero().sourceStateHashUnchanged,true);
console.log(JSON.stringify({passed:true,actualFailure:190,inspectionBoundToNewBranch:true,roomActions:0,providerCalls:0}));
