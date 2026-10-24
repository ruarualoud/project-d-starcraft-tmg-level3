// Actual Orders receipts exposed payment/event, while inspect.availableUnits
// omitted the Native activatedPhases field needed to measure marker removal.
// Frozen snapshot + controlled flag variants, real laboratory/Native runtime;
// this is observation coverage, not fabricated played history or strategy proof.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {resolveOfficialDevelopmentTrancheFixtureRootV1,loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const frozen=JSON.parse(gunzipSync(await readFile(path.join(root,
  'build/slice272-projection-owner-v565-inlKbk/workspace/laboratory-sources/e53764ac557e7a1a25d8d346db53d9a6c9f97ace76e4eb00a627fbe22599dfba.json.gz')))).authority.state;
const frozenHash=hash(frozen),source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root:await resolveOfficialDevelopmentTrancheFixtureRootV1({root})});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
for(const activated of [true,false]){
  const state=structuredClone(frozen),unit=state.pieces.find(p=>p.id==='u_marine_1');
  unit.activatedPhases={movement:activated,assault:false};
  const runtime=createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:source.dataset,state})});
  const before=hash(state),lab=createPregameSceneLaboratoryV1({laboratoryId:'activation-observation-v683-'+activated,
    sourceState:state,rulesRuntime:runtime,armyBuilderPort:builder});
  const view=lab.describeQueryContext({seatKey:'player1'}),observed=view.availableUnits.find(p=>p.unitId===unit.id);
  assert.deepEqual(observed.activatedPhases,unit.activatedPhases,'inspect must expose the exact Native per-phase activation marker state');
  assert.equal(view.round,state.round);assert.equal(view.phase,state.phase);
  assert.equal(hash(state),before);assert.equal(lab.proveMutationZero().sourceStateHashUnchanged,true);
}
assert.equal(hash(frozen),frozenHash);
console.log(JSON.stringify({status:'passed',actualLaboratoryAndNativeRuntime:true,controlledFlagCases:2,
  perPhaseActivationMarkersDeliveredVerbatim:true,currentRoundDelivered:true,sourceUnchanged:true,
  providerCalls:0,nativeTransitions:0,productionWrites:0,liveRoomMutations:0,
  playedHistoryOrStrategyImprovementProven:false}));
