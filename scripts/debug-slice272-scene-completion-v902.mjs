// Actual A: successful static option -> original anchor scenario repacks it.
// Restore the immutable Native branches, then exercise explicit phase-only
// completion. No model, search, game action or production state is replayed.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const [directory,output]=process.argv.slice(2),checks=[];
const get=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
try{
  const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
  const failed=(await get('333af617e4e436e728f5d38fb4775ce2ce96ba52d056a9b3516959c27ed60c7c')).value;
  const selected=(await get('f416b1e1705b81ab6060b9b3b15619577789e0cad5549f4b11d7f4de29310c85')).value;
  const sources=directory+'/../../laboratory-sources';let source;
  for(const file of await fs.readdir(sources)){
    if(!file.endsWith('.json.gz'))continue;
    const data=JSON.parse(gunzipSync(await fs.readFile(sources+'/'+file)));
    if(hash(data.authority.state)===selected.receipt.sourceStateHash){source=data.authority.state;break;}
  }
  assert.ok(source,'actual immutable source must be found');const sourceHash=hash(source);
  const branches=new Map();
  for(const entry of state.evidence.filter(e=>e.kind==='tool_receipt'
    &&/^(scenario|formation_scene|Unresolved scenario|Unresolved formation_scene)/.test(e.title))){
    const value=await get(entry.artifactRef),r=value.receipt;
    if(r?.branchStateHash&&r.branchKind==='hypothetical_geometry')branches.set(r.branchStateHash,value);
  }
  branches.set(failed.receipt.branchStateHash,failed);
  branches.set(selected.receipt.branchStateHash,selected);
  const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
  const make=()=>createPregameSceneLaboratoryV1({sourceState:source,
    armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(source.officialUnitCompositionUpgradeDataBundle)}),
    rulesRuntime:{descriptor:{runtimeHash:selected.receipt.rulesRuntimeHash},
      enumerate(){throw Error('NO_ACTION_ENUMERATION');},instantiate(){throw Error('NO_ACTION');},apply(){throw Error('NO_ACTION');}}});
  const restore=(lab,id,seen=new Set())=>{
    if(id===sourceHash||seen.has(id))return;const saved=branches.get(id);
    assert.ok(saved,'saved parent branch required: '+id);
    restore(lab,saved.receipt.parentStateHash,seen);
    const base=saved.receipt.parentStateHash===sourceHash?{kind:'source'}:{kind:'branch',branchStateHash:saved.receipt.parentStateHash};
    if(saved.receipt.formationSelection)lab.restoreFormationSelectionBranch({receipt:saved.receipt,base});
    else lab.restoreHypotheticalBranch({receipt:saved.receipt,spec:saved.request.spec,base});
    seen.add(id);
  };
  const lab=make(),base={kind:'branch',branchStateHash:selected.receipt.branchStateHash};restore(lab,base.branchStateHash);
  const before=lab.captureSceneLayout({base});
  const spec={kind:'hypothetical_geometry',preservePositions:true,reassessAllOnField:true,
    phase:failed.request.spec.phase,activeSideKey:failed.request.spec.activeSideKey,placements:[]};
  const receipt=lab.runScenarioBranch({branchId:'v902-preserved-completion',base,spec});
  assert.equal(receipt.hypotheticalPlacementAssessment?.units.length,4,'phase-only explicit reassessment must return all 4 actual units');
  assert.ok(receipt.hypotheticalPlacementAssessment.units.every(u=>u.resultStatus==='ok'));
  assert.deepEqual(lab.captureSceneLayout({base:{kind:'branch',branchStateHash:receipt.branchStateHash}}).units,before.units);
  assert.equal(receipt.hypotheticalActivation.positionsPreserved,true);
  checks.push('actual_four_unit_positions_preserved_and_checked');
  restore(lab,failed.receipt.branchStateHash);
  const negative=lab.runScenarioBranch({branchId:'v902-preserved-failure',base:{kind:'branch',branchStateHash:failed.receipt.branchStateHash},spec});
  assert.ok(negative.hypotheticalPlacementAssessment.units.some(u=>u.pieceId==='player2-raptor'&&u.resultStatus!=='ok'));
  checks.push('incomplete_original_packing_is_not_promoted');
  const cold=make();restore(cold,base.branchStateHash);
  assert.deepEqual(cold.restoreHypotheticalBranch({receipt,spec,base}),receipt);
  assert.equal(hash(source),sourceHash);checks.push('cold_restore_exact_no_source_mutation');
  const repair=projectRosterWorkflowToolRepairV1(failed);
  assert.equal(repair.repairContractVersion,2);
  assert.equal(repair.inputProblem.kind,'scene_reconstruction_after_selected_geometry');
  assert.equal(repair.sceneCompletion.originalOperation,'scenario');
  assert.equal(repair.sceneCompletion.preservePositions,true);
  assert.equal(repair.sceneCompletion.requiresModelSelectedState,true);
  assert.equal(repair.sceneCompletion.reassessAllOnField,true);
  assert.equal(repair.sceneCompletion.replayAnchorPlacements,false);
  assert.equal(repair.preparationScope.allowsNewScenario,false);
  const probability=projectRosterWorkflowToolRepairV1({...failed,operation:'probability'});
  assert.equal(probability.sceneCompletion,undefined,'a scene is not a replacement combat measurement');
  checks.push('typed_scene_completion_not_combat_or_strategy_approval');
  const report={pass:true,checks,providerCalls:0,nativeActions:0,formationSearches:0,productionWrites:0,
    actualBranch:selected.receipt.branchStateHash,oldFailedBranch:failed.receipt.branchStateHash,
    strategyImprovementProven:false};
  await fs.writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){const report={pass:false,checks,error:error.message,stack:error.stack?.split('\n').slice(0,5)};
  await fs.writeFile(output,JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1;}
