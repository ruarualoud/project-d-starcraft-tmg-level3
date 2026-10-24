// Concrete product gap: frozen pregame setup has no finite actions/binding;
// changing it directly to movement skips Native first-round supply/resources.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const [base,directory,sourceHash]=process.argv.slice(2);
let authority;
for(const name of await fs.readdir(directory))if(name.endsWith('.json.gz')) {
  const entry=JSON.parse(gunzipSync(await fs.readFile(directory+'/'+name)));
  if(hash(entry.authority.state)===sourceHash){authority=entry.authority;break;}
}
assert(authority);assert.equal(authority.state.phase,'setup');
const cfg=JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
const frozen=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:cfg.fixtureRoot});
const core=createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({
  dataset:frozen.dataset,state:structuredClone(authority.state)})});
let applies=0;const runtime={...core,apply(...a){applies++;return core.apply(...a);}};
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(structuredClone(authority.state.officialUnitCompositionUpgradeDataBundle))});
const make=()=>createPregameSceneLaboratoryV1({sourceState:authority.state,rulesRuntime:runtime,armyBuilderPort:builder});
const lab=make(),side=authority.state.firstPlayerSideKey;
const spec={kind:'hypothetical_geometry',preservePositions:true,phase:'start_of_round',activeSideKey:side,placements:[]};
const ready=lab.runScenarioBranch({branchId:'v449-ready',spec});
const ref=receipt=>({kind:'branch',branchStateHash:receipt.branchStateHash});
const context=lab.describeQueryContext({base:ref(ready),seatKey:side});
const start=context.actionSpace.finiteActions.find(a=>a.action.actionType==='resolve_mission_start_of_round');
assert(start,'Same Native first-round action must be discoverable, not a hand-written movement state');
const began=lab.runScenarioBranch({branchId:'v449-began',base:ref(ready),seatKey:side,
  spec:{kind:'native_action'},argumentsJson:JSON.stringify({actionKey:start.proposal.actionKey})});
const movement=lab.describeQueryContext({base:ref(began),seatKey:side});
assert.equal(movement.phase,'movement');
const first=movement.actionSpace.finiteActions.find(a=>a.action.actionType==='choose_first_actor'
  &&a.action.chosenFirstActorSideKey===side);
assert(first,'Explicit Native first actor choice remains model-owned');
const chosen=lab.runScenarioBranch({branchId:'v449-first',base:ref(began),seatKey:side,
  spec:{kind:'native_action'},argumentsJson:JSON.stringify({actionKey:first.proposal.actionKey})});
const deploy=lab.describeQueryContext({base:ref(chosen),seatKey:side});
const domains=deploy.actionSpace.parameterDomains.filter(d=>d.actionType==='deploy');
assert(domains.length>0,'Legal reserve deployment must now be available');
assert(domains.every(d=>d.constraints.supply.capacity===6));
assert.equal(applies,2);assert.equal(hash(authority.state),sourceHash);
const recovered=make();recovered.restoreHypotheticalBranch({receipt:ready,spec});
recovered.restoreNativeActionBranch({receipt:began,base:ref(ready)});
recovered.restoreNativeActionBranch({receipt:chosen,base:ref(began)});
assert.equal(recovered.describeQueryContext({base:ref(chosen),seatKey:side}).baseStateHash,deploy.baseStateHash);
assert.equal(applies,2,'Recovery must not replay Native initialization');
assert.throws(()=>lab.runScenarioBranch({branchId:'v449-invalid-reinit',base:ref(chosen),spec}),/FIRST_ROUND_SETUP/);
console.log(JSON.stringify({ok:true,nativeInitializations:1,nativeFirstActorChoices:1,
  deployDomains:domains.length,capacity:6,sourceUnchanged:true,restoredWithoutReplay:true,
  providerCalls:0,liveRoomActions:0}));
