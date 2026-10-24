// Concrete A regression: the Native engine explains why charge is disabled,
// but the model-facing snapshot discarded that reason. Restore saved geometry;
// do not replay a solver, a model request, or an executed game action.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {enumerateOfficialSelectedRosterMeleeActionsV1} from '../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs';
import {createStarcraftTmgSnapshotSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {createStarcraftTmgSpatialActionQueryRuntimeV1} from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import {projectRosterWorkflowReceiptViewV1} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
import {projectRosterWorkflowReadContextV1} from '../packages/roster-strategist/roster-workflow-read-context-v1.mjs';
const [directory,output,mode]=process.argv.slice(2),checks=[];
const remainingOnly=mode==='--remaining';
const get=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
try{
  const workflow=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
  const observed=await get('313ec8a3dee474df30f420ad12253be57df1c3cfb2ed58253de53aa6a155cadd');
  const targetHash=observed.receipt.baseStateHash,branches=new Map();
  for(const entry of workflow.evidence.filter(e=>e.kind==='tool_receipt'
    &&/^(scenario|formation_scene|Unresolved scenario|Unresolved formation_scene)/.test(e.title))){
    const v=await get(entry.artifactRef);
    if(v.receipt?.branchStateHash&&v.receipt.branchKind==='hypothetical_geometry'
      &&v.receipt.branchStateHash!==v.receipt.parentStateHash)branches.set(v.receipt.branchStateHash,v);
  }
  const target=branches.get(targetHash);assert.ok(target,'actual inspected scene must have a retained branch');
  let source;const sources=directory+'/../../laboratory-sources';
  for(const file of await fs.readdir(sources)){
    if(!file.endsWith('.json.gz'))continue;
    const candidate=JSON.parse(gunzipSync(await fs.readFile(sources+'/'+file))).authority.state;
    if(hash(candidate)===target.receipt.sourceStateHash){source=candidate;break;}
  }
  assert.ok(source,'actual frozen source required');const sourceHash=hash(source);
  const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
  let enumerations=0;
  const rulesRuntime={descriptor:{runtimeHash:target.receipt.rulesRuntimeHash},
    enumerate(state,options){enumerations++;return enumerateOfficialSelectedRosterMeleeActionsV1(state,options);},
    instantiate(){throw Error('NO_ACTION');},apply(){throw Error('NO_ACTION');}};
  const lab=createPregameSceneLaboratoryV1({sourceState:source,rulesRuntime,
    armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(source.officialUnitCompositionUpgradeDataBundle)})});
  const restore=(id,seen=new Set())=>{
    if(id===sourceHash||seen.has(id))return;
    const saved=branches.get(id);assert.ok(saved,'saved parent required: '+id);
    restore(saved.receipt.parentStateHash,seen);
    const base=saved.receipt.parentStateHash===sourceHash?{kind:'source'}:{kind:'branch',branchStateHash:saved.receipt.parentStateHash};
    if(saved.receipt.formationSelection)lab.restoreFormationSelectionBranch({receipt:saved.receipt,base});
    else lab.restoreHypotheticalBranch({receipt:saved.receipt,base,spec:saved.request.spec});
    seen.add(id);
  };
  restore(targetHash);
  const snapshot=lab.captureComparisonSnapshot({base:{kind:'branch',branchStateHash:targetHash}}).state;
  assert.equal(hash(snapshot),targetHash);
  const native=rulesRuntime.enumerate(snapshot,{sideKey:'player2',includeDisabled:true});
  const blocked=native.candidates.find(c=>c.pieceId==='player2-raptor'&&c.actionType==='charge');
  const scope={kind:'hypothetical_branch',sourceStateHash:sourceHash,baseStateHash:targetHash};
  const service=createStarcraftTmgSnapshotSceneQueryServiceV1({state:snapshot,seatKey:'player2',rulesRuntime,sceneScope:scope});
  const menu=service.actionSpace();
  if(!remainingOnly){
  assert.equal(blocked?.disabledReason,'SELECTED_MELEE_CHARGE_REQUIRES_UNENGAGED');
  checks.push('actual_native_reason_is_already_engaged_not_missing_capability');
  assert.ok(menu.actionAvailability,'model-facing inspect must preserve Native disabled-action diagnosis');
  assert.deepEqual(menu.actionAvailability.disabledActions.find(c=>c.pieceId==='player2-raptor'&&c.actionType==='charge'),blocked);
  assert.equal(menu.actionAvailability.reasonsCompleteForAllAbsentActions,false);
  assert.equal(menu.actionAvailability.disabledActionsAreExecutable,false);
  assert.equal(menu.finiteActions.some(c=>c.proposal?.actionType==='charge'),false);
  assert.equal(menu.parameterDomains.some(c=>c.pieceId==='player2-raptor'&&c.actionType==='charge'),false);
  const route=menu.actionCapabilityReference.routes.find(r=>r.pieceId==='player2-raptor'&&r.actionType==='fight');
  assert.equal(route.phase,'combat');
  checks.push('snapshot_preserves_diagnostics_without_granting_actions_or_global_absence');
  const live=createStarcraftTmgSpatialActionQueryRuntimeV1({seatKey:'player2'});
  const bindingHash=hash({});
  const input={roomProjection:{room:{roomId:'v909-readonly-probe',stateRevision:0,stateHash:targetHash},
    matchBinding:{bindingHash},viewer:{seatKey:'player2',visibilityScope:'frozen_reference_scene'},state:snapshot},
    legalSpace:{...native,finiteActions:[],roomId:'v909-readonly-probe',stateRevision:0,stateHash:targetHash,
      matchBindingHash:bindingHash,legalSpaceHash:hash(native)}};
  const liveMenu=live.actionSpace(input);
  assert.deepEqual(liveMenu.actionAvailability,menu.actionAvailability);
  const noDiagnostics=live.actionSpace({...input,legalSpace:{...input.legalSpace,candidates:[],legalSpaceHash:hash([])}});
  assert.deepEqual(noDiagnostics.actionAvailability.disabledActions,[]);
  assert.equal(noDiagnostics.actionAvailability.reasonsCompleteForAllAbsentActions,false);
  checks.push('same_live_projection_and_no_invented_reason_when_native_diagnostic_absent');
  }else{
    const previous=JSON.parse(await fs.readFile(new URL('../build/slice272-action-availability-v909-green.json',import.meta.url),'utf8'));
    assert.equal(previous.checks.length,3,'only the three already-passed gates may be skipped');
  }
  // Use the actual explicit phase-hypothesis constructor, including its Native
  // first-actor context, rather than hand-editing just state.phase.
  const combatReceipt=lab.runScenarioBranch({branchId:'v909-explicit-combat-context',
    base:{kind:'branch',branchStateHash:targetHash},spec:{kind:'hypothetical_geometry',preservePositions:true,
      phase:'combat',activeSideKey:'player2',placements:[]}});
  const combatMenu=lab.describeQueryContext({base:{kind:'branch',branchStateHash:combatReceipt.branchStateHash},seatKey:'player2'}).actionSpace;
  assert.ok(combatMenu.parameterDomains.some(d=>d.pieceId==='player2-raptor'&&d.actionType==='fight'));
  assert.ok(!combatMenu.actionAvailability.disabledActions.some(d=>d.pieceId==='player2-raptor'&&d.actionType==='fight'));
  checks.push('explicit_combat_phase_has_native_raptor_fight_domain_no_false_capability_gap');
  const before=enumerations;service.actionSpace();assert.equal(enumerations,before,'menu reads must not enumerate twice');
  const context=lab.describeQueryContext({base:{kind:'branch',branchStateHash:targetHash},seatKey:'player2'});
  assert.deepEqual(context.actionSpace.actionAvailability,menu.actionAvailability);
  const view=projectRosterWorkflowReceiptViewV1({evidenceId:'v909-probe',value:{...observed,receipt:context}});
  const nav=view.actionUnavailableDirectory.find(r=>r.pieceId==='player2-raptor'&&r.actionType==='charge');
  assert.equal(nav.disabledReason,blocked.disabledReason);
  assert.equal(view.actionUnavailableDirectoryIsBodyRead,false);
  // Explicit transport fault injection: a large diagnostic body must still
  // expose exact identities, not silently disappear from a bounded read.
  const padded=[{...blocked,details:{...blocked.details,transportTestPadding:'x'.repeat(20000)}}];
  const read=await projectRosterWorkflowReadContextV1({collected:[{status:'read',evidenceId:'v909-probe',evidenceNumber:1,
    pointer:'/receipt/actionSpace/actionAvailability/disabledActions',value:padded}],
    operation:{calls:[],deliveredReads:[]},directory:[],store:{get(){throw Error('NO_STORE_READ_EXPECTED');}}});
  const diagnosticDirectory=read.sourceReadNavigation[0].nativeActionDirectory;
  assert.equal(diagnosticDirectory.kind,'disabled');
  assert.equal(diagnosticDirectory.units[0].actions[0].disabledReason,blocked.disabledReason);
  assert.equal(diagnosticDirectory.directoryIsBodyRead,false);
  checks.push('receipt_view_and_large_body_read_navigation_keep_exact_diagnostic');
  assert.equal(hash(source),sourceHash);assert.equal(hash(snapshot),targetHash);
  checks.push('pregame_inspect_wiring_same_state_cached_read_no_mutation');
  const report={pass:true,checks,remainingOnly,previousPassedGatesNotRerun:remainingOnly?3:0,targetHash,nativeReason:blocked.disabledReason,providerCalls:0,nativeActions:0,
    formationSearches:0,productionWrites:0,combinedChargeSurvivalProbabilityProven:false};
  await fs.writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){const report={pass:false,checks,error:error.message,stack:error.stack?.split('\n').slice(0,5)};
  await fs.writeFile(output,JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1;}
