// Reproduce the missing finite-action seam using the retained production source.
// No room construction, model request, old action replay or source mutation.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const [base,sourceDirectory,expectedHash]=process.argv.slice(2);
let authority;
for(const name of await fs.readdir(sourceDirectory)){
  if(!name.endsWith('.json.gz'))continue;
  const value=JSON.parse(gunzipSync(await fs.readFile(sourceDirectory+'/'+name)));
  if(hash(value.authority.state)===expectedHash){authority=value.authority;break;}
}
assert(authority,'exact retained source exists');
const original=hash(authority.state);
const cfg=JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
const frozen=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:cfg.fixtureRoot});
const core=createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({dataset:frozen.dataset,state:structuredClone(authority.state)})});
let applications=0,lastEnumerated;
const runtime={...core,enumerate(state,...args){lastEnumerated=state;return core.enumerate(state,...args);},
  apply(...args){applications++;return core.apply(...args);}};
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(structuredClone(authority.state.officialUnitCompositionUpgradeDataBundle))});
const make=()=>createPregameSceneLaboratoryV1({sourceState:authority.state,rulesRuntime:runtime,
  armyBuilderPort:builder,matchBinding:authority.matchBinding});
const lab=make(),side=authority.state.activeSideKey||authority.state.firstPlayerSideKey;
// Factory setup is not a playable phase. Use the existing explicit phase-only
// hypothesis, preserving every reserve/model/terrain/resource, not a fake arrival.
const parentSpec={kind:'hypothetical_geometry',preservePositions:true,phase:'movement',activeSideKey:side,placements:[]};
const parent=lab.runScenarioBranch({branchId:'v418-movement-parent',spec:parentSpec});
const baseRef={kind:'branch',branchStateHash:parent.branchStateHash};
const context=lab.describeQueryContext({base:baseRef,seatKey:side});
const raw=core.enumerate(lastEnumerated,{sideKey:side,includeDisabled:false});
const eligible=raw.candidates.filter(c=>c.isEnabled&&!['move','disengage'].includes(c.actionType));
assert(eligible.length,JSON.stringify({reason:'Native has an enabled finite movement transition',side,
  statePhase:lastEnumerated.phase,stateStage:lastEnumerated.stage,rawKeys:Object.keys(raw),
  candidates:raw.candidates.slice(0,3),diagnostics:raw.unsupportedDiagnostics}));
assert.equal(context.actionSpace.finiteActions.length,eligible.length,
  'Snapshot discovery lost all Native finite candidates at the candidates→finiteActions seam');
const selected=context.actionSpace.finiteActions[0];
const request={branchId:'v418-native-movement-successor',base:baseRef,seatKey:side,spec:{kind:'native_action'},
  argumentsJson:JSON.stringify({actionKey:selected.proposal.actionKey})};
const successor=lab.runScenarioBranch(request);
assert.equal(successor.resultStatus,'ok');
assert.equal(applications,1);
assert.notEqual(successor.branchStateHash,original);
assert.equal(successor.nativeAction.actionType,selected.action.actionType);
assert.equal(successor.nativeFiniteActionKey,selected.proposal.actionKey);
assert.equal(hash(authority.state),original);
const child=lab.describeQueryContext({base:{kind:'branch',branchStateHash:successor.branchStateHash},seatKey:side});
assert.notEqual(child.baseStateHash,original);
const restored=make();
restored.restoreHypotheticalBranch({receipt:parent,spec:parentSpec});
restored.restoreNativeActionBranch({receipt:successor,base:baseRef});
assert.deepEqual(restored.describeQueryContext({base:{kind:'branch',branchStateHash:successor.branchStateHash},seatKey:side}),child);
assert.equal(applications,1,'restore must consume the saved successor, not reapply');
assert.throws(()=>lab.runScenarioBranch({...request,branchId:'v418-bad-key',
  argumentsJson:JSON.stringify({actionKey:'not-from-this-parent'})}),/FINITE_ACTION_NOT_IN_PARENT/);
assert.throws(()=>lab.runScenarioBranch({...request,branchId:'v418-mixed',
  argumentsJson:JSON.stringify({actionKey:selected.proposal.actionKey,domainId:'invented',parameters:{}})}),/ARGUMENTS_INVALID/);
assert.equal(applications,1,'invalid selection must not apply');
console.log(JSON.stringify({passed:true,nativeFiniteActions:eligible.length,selectedAction:selected.action.actionType,
  nativeCloneApplications:applications,restoredWithoutReplay:true,sourceUnchanged:true,providerCalls:0,liveRoomActions:0}));
