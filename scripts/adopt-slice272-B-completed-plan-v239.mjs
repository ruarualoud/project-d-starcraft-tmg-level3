// Recover the complete workspace mutation from already-paid public output.
// No Provider, new Rules action, re-review, or game start. Preserve original
// draft until the ordinary workspace projection accepts the completed result.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterPlanningWorkspaceServiceV1,createRetainedReplayDeliberationPortV1} from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import {createRosterPlanningDraftStoreV1} from '../packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs';
import {createRosterStrategistRuntimeV1} from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const [base]=process.argv.slice(2);assert.ok(base);
const directory=base+'/B/completed-plan-adoption-v239';
await fs.mkdir(directory,{recursive:false,mode:0o700});
const report={startedAt:new Date().toISOString(),pid:process.pid,status:'preparing',
  providerCalls:0,nativeCalls:0,reviewsRerun:0,originalDraftWrites:0,gamesStarted:0,
  purpose:'restore_completed_paid_revision_into_original_workspace',trainingTruth:false,events:[]};
const write=async(name,value)=>fs.writeFile(directory+'/'+name,JSON.stringify(value,null,2),{mode:0o600});
const save=async()=>{report.updatedAt=new Date().toISOString();await write('progress.private.json',report);};
let saved;
try{
  await save();
  const cfg=JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
  const row=cfg.rows.find(r=>r.arm==='B');
  const filename=row.dataDirectory+'/drafts/'+row.sessionId+'.json';
  const originalText=await fs.readFile(filename,'utf8');
  const originalHash=hash(originalText),original=JSON.parse(originalText);
  const checkpoint=JSON.parse(await fs.readFile(base+'/B/structured-plan-tools-v237/workspace-checkpoint.private.json','utf8'));
  const completion=JSON.parse(await fs.readFile(base+'/common-v237-B-structured-tools-progress.private.json','utf8'));
  assert.equal(originalHash,checkpoint.originalDraftHash,'Original draft changed; do not overwrite');
  assert.equal(completion.status,'completed');assert.equal(checkpoint.autoPlanRepair.status,'completed');
  const candidateText=await fs.readFile(base+'/B/kimi-code-revision-shadow-v224/candidate-plan.private.json','utf8');
  const candidate=JSON.parse(candidateText),expected=JSON.parse(checkpoint.planSerialized);
  const production=JSON.parse(await fs.readFile(base+'/common-v224-B-kimi-shadow-progress.private.json','utf8'));
  const qualified=JSON.parse(await fs.readFile(base+'/B/kimi-code-candidate-review-v231/qualified-review.private.json','utf8'));
  const initialPlan=JSON.parse(original.planSerialized);
  assert.equal(initialPlan.planHash,production.sourcePlanHash);
  assert.equal(candidate.planHash,production.candidatePlanHash);
  assert.equal(qualified.planHash,candidate.planHash);
  assert.equal(checkpoint.planReview.planHash,expected.planHash);
  report.fromPlanHash=initialPlan.planHash;report.toPlanHash=expected.planHash;
  report.sourceDraftHash=originalHash;
  await fs.writeFile(directory+'/original-draft.private.json.gz',gzipSync(originalText),{flag:'wx',mode:0o600});

  // Reconstruct the exact accepted parent used in v237. Do not import v234's
  // rejected candidate or relabel Kimi costs as DeepSeek usage.
  const session=structuredClone(original);
  session.planVersionHistory.push(session.planSerialized);session.planSerialized=candidateText;
  session.status='planned';session.failure=null;session.cancelRequested=false;session.pauseRequested=false;
  session.planReviewHistory.push(session.planReview);
  session.planReview={status:'completed',planHash:candidate.planHash,review:qualified,
    reviewContextVersion:qualified.reviewContextVersion,failure:null};
  session.claimRepairHistory ||= [];
  session.claimRepairHistory.push({fromPlanHash:initialPlan.planHash,toPlanHash:candidate.planHash,coverage:production.claimRepairCoverage});
  session.revisionTeachEvidenceHistory ||= [];
  session.revisionTeachEvidenceHistory.push({fromPlanHash:initialPlan.planHash,toPlanHash:candidate.planHash,delivery:production.teachDelivery});
  const state=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
  const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value;};
  const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(state.officialUnitCompositionUpgradeDataBundle)});
  const noNative=()=>{report.nativeCalls++;throw Error('NO_NEW_NATIVE_DURING_COMPLETED_REVISION_ADOPTION');};
  const lab=createPregameSceneLaboratoryV1({sourceState:state,armyBuilderPort:builder,
    rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate:noNative,instantiate:noNative,apply:noNative}});
  const strategyPack={foundational:{entries:Array.from({length:5},()=>({}))},receipt:{hash:'b'.repeat(64)}};
  const strategist=createRosterStrategistRuntimeV1({armyBuilderPort:builder,laboratory:lab,strategyPack,
    selectionUnitRules:session.teachFramework.context.sourceFacts.selectionUnitRules});
  const createService=draft=>createRosterPlanningWorkspaceServiceV1({armyBuilderPort:builder,laboratoryCore:lab,strategyPack,
    fixture:draft.teachFramework.context.fixture,selectionUnitRules:draft.teachFramework.context.sourceFacts.selectionUnitRules,
    draftStore:{loadAll:async()=>({sessions:[draft],quarantined:[]}),save:async value=>{saved=value;}},
    createRunLaboratory:()=>lab,createStrategist:()=>strategist,
    deliberationFactory:{availability:()=>({available:true,kind:'completed_paid_output_only'}),createForRun:async({onEvent})=>
      createRetainedReplayDeliberationPortV1({retainedOutputs:checkpoint.publicOutputs.filter(o=>o.roundKind==='revision'),
        requireContextBoundReplay:true,modelVersion:'deepseek-flash',onEvent:async event=>{
          report.events.push(event);await onEvent(event);await save();
        }})}});
  const service=createService(session);await service.loadPersisted();
  const revision=expected.revisions.at(-1);
  report.status='restoring_paid_mutation';await save();
  await service.revisePlan(row.sessionId,{reasonText:revision.reasonText,triggerIds:revision.triggerIds,
    revisedSectionKeys:revision.revisedSectionKeys,targetedClaimPaths:checkpoint.autoPlanRepair.targetClaimPaths,
    planEditProtocol:'structured_plan_tools_v2'});
  while(saved.status==='running')await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(saved.status,'planned',JSON.stringify(saved.failure));
  assert.equal(JSON.parse(saved.planSerialized).planHash,expected.planHash,'Must recover the actual accepted candidate');
  assert.equal(hash(JSON.parse(saved.planSerialized).rosterCandidate),hash(initialPlan.rosterCandidate));
  assert.equal(hash(JSON.parse(saved.planSerialized).openingDeploymentSchedule),hash(initialPlan.openingDeploymentSchedule));
  assert.equal(report.events.filter(e=>e.type==='round_completed').length,1);
  assert.ok(report.events.every(e=>e.paidProviderCall!==true));

  // Copy the actual completed review and paid ledger, not a fabricated new
  // review/replay charge. Full older session state remains intact.
  saved.planReviewHistory.push(saved.planReview);
  saved.planReview=structuredClone(checkpoint.planReview);
  if(saved.autoPlanRepair){saved.autoPlanRepairHistory ||= [];saved.autoPlanRepairHistory.push(saved.autoPlanRepair);}
  saved.autoPlanRepair=structuredClone(checkpoint.autoPlanRepair);
  saved.reviewReconciliation=structuredClone(checkpoint.reviewReconciliation);
  saved.usage=structuredClone(checkpoint.usage);
  saved.providerDispatches.push(...structuredClone(checkpoint.newProviderDispatches));
  for(const output of checkpoint.publicOutputs){
    if(!saved.publicOutputs.some(o=>o.outputHash===output.outputHash&&o.contextHash===output.contextHash
      &&o.outputContractRef?.id===output.outputContractRef?.id))saved.publicOutputs.push(structuredClone(output));
  }
  const completedView=service.readSession(row.sessionId);
  assert.equal(completedView.plan.planHash,expected.planHash);
  assert.equal(completedView.planEvidenceStale,false);
  assert.equal(completedView.planReview.stale,false);
  assert.equal(completedView.planReviewBlockingHighFindings,false);
  assert.equal(completedView.planReviewRequiredForHandoff,false);
  assert.equal(completedView.claimRepairBacklog.length,0);
  for(const key of ['selectedCandidateInput','working','agentSelectedArrivalSchedule','dispatchRetryAuthorizations',
    'dispatchReconciliations','failedProviderOutputs','teachFramework','teachFrameworkHistory'])
    assert.equal(hash(saved[key]),hash(original[key]),'Preserve original '+key);
  assert.equal(saved.usage.calls-original.usage.calls,2);
  assert.equal(saved.usage.totalUnits-original.usage.totalUnits,488070);
  report.projection={status:completedView.status,planVersion:completedView.plan.planVersion,
    planEvidenceStale:completedView.planEvidenceStale,reviewStale:completedView.planReview.stale,
    blockingHigh:completedView.planReviewBlockingHighFindings,reviewRequired:completedView.planReviewRequiredForHandoff,
    claimRepairBacklog:completedView.claimRepairBacklog.length,planVersionHistoryCount:saved.planVersionHistory.length,
    planEditToolHistoryCount:saved.planEditToolHistory.length};
  report.costs={newChargesThisOperation:0,restoredKnownCalls:2,restoredKnownTokens:488070,
    cumulativeDeepSeekCalls:saved.usage.calls,cumulativeDeepSeekTokens:saved.usage.totalUnits,
    priorUnknownChargesPreserved:true,kimiDiagnosticLaneSeparate:true};
  report.priorReviewArtifacts=['B/kimi-code-revision-shadow-v224','B/kimi-code-candidate-review-v231','B/structured-plan-tools-v237'];
  await write('adoption-receipt.private.json',{...report,receiptKind:'host_completed_candidate_adoption',
    originalPlanHash:initialPlan.planHash,completedPlanHash:expected.planHash,originalDraftHash:originalHash});
  assert.equal(hash(await fs.readFile(filename,'utf8')),originalHash,'Concurrent writer detected');
  const store=createRosterPlanningDraftStoreV1({directory:row.dataDirectory});
  await store.save(saved,{compact:true,includeRecordHash:false});report.originalDraftWrites=1;
  const reloaded=await store.load(row.sessionId);
  const reloadService=createService(reloaded);await reloadService.loadPersisted();
  const reloadView=reloadService.readSession(row.sessionId);
  assert.equal(reloadView.plan.planHash,expected.planHash);
  assert.equal(reloadView.planReviewRequiredForHandoff,false);
  assert.equal(reloadView.usage.totalUnits,saved.usage.totalUnits);
  report.status='adopted';report.reloadVerified=true;
}catch(error){report.status='stopped';report.failure=String(error.stack||error.message);process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify(report));}
