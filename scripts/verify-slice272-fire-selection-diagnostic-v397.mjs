import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {finishStarcraftTmgFireExchangeWorkV1} from '../packages/online-agent-session/combat-estimation-runtime-v1.mjs';

const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const saved=draft.teachFramework.state.investigation.evidence.find(row=>
  row.challengeId==='teach-kerrigan-goliath-marauder-fire-zone-recovery-2');
const context=saved.queryRepair;
const input={seatKey:'player1',state:{phase:context.phase,pieces:context.availableUnits.map(unit=>
  ({id:unit.unitId,sideKey:unit.sideKey}))},currentLegalSpaceDomains:context.actionSpace.parameterDomains,
  request:{subjectUnitIds:['player2-kerrigan'],targetIds:['goliath-1','marauder-1']}};
const graph={relationshipGraphHash:'retained-empty-selection-reproduction',relations:[],aggregates:{}};
const result=finishStarcraftTmgFireExchangeWorkV1(input,[{graph}]);
assert.equal(saved.unknownReasonCode,'NO_ATTACK_ESTIMATES_IN_SELECTED_SCENE');
assert.equal(result.attackSelection?.subjects[0].ownerSideKey,'player2',
  'actual empty-result actor must disclose its owner, not invite another renamed request');
assert.equal(result.attackSelection.subjects[0].sameSideAsQuerySeat,false);
assert.equal(result.attackSelection.selectedPairCount,0);
assert.equal(result.attackSelection.availableRangedDomainCount,4);
assert.equal(result.attackSelection.emptyReason,'requested_subject_has_no_current_ranged_domain');
assert.deepEqual(result.attackEstimates,[]);
assert.equal(result.alternatives[0].expectedDamageDealt,null);
// A current-domain selection is only a prerequisite, not a successful estimate.
const failed=finishStarcraftTmgFireExchangeWorkV1({...input,request:{
  subjectUnitIds:['goliath-1'],targetIds:['player2-kerrigan']}},[{graph},{failure:{reason:'retained_failure'}}]);
assert.equal(failed.attackSelection.selectedPairCount,2);
assert.equal(failed.attackSelection.emptyReason,'selected_attack_estimation_failed');
assert.equal(failed.attackSelection.subjects[0].sameSideAsQuerySeat,true);
assert.deepEqual(failed.attackEstimates,[]);
assert.equal(failed.attackEstimateFailures.length,1);
const filtered=finishStarcraftTmgFireExchangeWorkV1({...input,request:{
  subjectUnitIds:['goliath-1'],targetIds:['not-current-target']}},[{graph}]);
assert.equal(filtered.attackSelection.emptyReason,'requested_filters_match_no_current_attack_pair');
assert.equal(filtered.attackSelection.selectedPairCount,0);
console.log(JSON.stringify({passed:true,actualFailure:177,nativeExecutions:0,providerCalls:0,
  actualDomainCount:result.attackSelection.availableRangedDomainCount,unchangedUnknownOutcomes:true}));
