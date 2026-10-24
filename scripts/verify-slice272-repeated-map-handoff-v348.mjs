import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { prepareIterativeRosterTeachHandoffV1 } from '../packages/roster-strategist/iterative-roster-teach-handoff-v1.mjs';
const [directory,stateFile,fixtureRoot] = process.argv.slice(2);
let saved=JSON.parse(await fs.readFile(stateFile,'utf8')).value;
const state=Object.fromEntries(['status','currentCandidate','frozenContext','mineralBudget','arrivalPublicRevision',
  'openingDeploymentSchedule','plan','sessionId','revision','teachFeedbackPolicy','selectionJustificationPolicyVersion']
  .map(k=>[k,saved[k]]));
state.observations=saved.observations.filter(e=>e.query?.kind==='map_route'
  &&e.query.candidateHash===state.currentCandidate.candidateHash&&e.receipt?.receiptHash===state.plan.mapEvidenceHash);
saved=null;
assert.equal(state.observations.length,4,'Actual failing handoff has four reads of one unchanged map result');
const before=JSON.stringify(state);
const request=JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-056.product-request.json.gz`)));
const missionProfile=request.promptNodes[0].content.missionEvidence.scoring.missionScoringProfile;
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:fixtureRoot});
const nativeBuilder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:
  createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
const verdicts=new Map();
const armyBuilderPort={...nativeBuilder,evaluateRosterCandidate(input){
  const key=JSON.stringify(input);
  if(!verdicts.has(key))verdicts.set(key,nativeBuilder.evaluateRosterCandidate(input));
  return structuredClone(verdicts.get(key));
}};
const prepare=s=>prepareIterativeRosterTeachHandoffV1({state:s,armyBuilderPort,missionProfile});
const repeated=prepare(state);
const single=prepare({...state,observations:state.observations.slice(0,1)});
assert.equal(repeated.handoffHash,single.handoffHash,'Read count must not change the authoritative handoff');
const conflict=structuredClone(state);conflict.observations[1].receipt.accessByBase=[];
assert.throws(()=>prepare(conflict),e=>e.code==='ITERATIVE_ROSTER_TEACH_MAP_ROUTE_CONFLICT');
const wrongMap=structuredClone(state);for(const row of wrongMap.observations)row.receipt.mapBinding.roomFreezeHash='different-map';
assert.throws(()=>prepare(wrongMap),e=>e.code==='ITERATIVE_ROSTER_TEACH_MAP_ROUTE_UNBOUND');
assert.equal(JSON.stringify(state),before);
console.log(JSON.stringify({pass:true,checks:3,actualRepeatedReads:4,sameContentSameHandoff:true,
  conflictingBodyAndWrongMapRejected:true,providerCalls:0,roomWrites:0}));
