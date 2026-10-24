// One bounded product auto-repair cycle, now using executable structured Plan
// edits and the production Flash transport. Original draft/ledger/rooms read-only.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createSerialJsonCheckpointV1 } from './support/serial-json-checkpoint-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterPlanningSecureDeliberationFactoryV1 } from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V3 as profile } from '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { effectiveRosterFinalPlanReviewFindingsV1 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const [base, mode='v234'] = process.argv.slice(2);
assert.ok(base && ['v234','v237'].includes(mode));
const dest = base + `/common-${mode}-B-structured-tools-progress.private.json`;
await (await fs.open(dest,'wx',0o600)).close();
const directory = base + `/B/structured-plan-tools-${mode}`;
await fs.mkdir(directory,{recursive:false,mode:0o700});
const writeCheckpoint = createSerialJsonCheckpointV1(directory+'/workspace-checkpoint.private.json');
const report = { startedAt:new Date().toISOString(),pid:process.pid,status:'preparing',
  model:profile.model,maximumAdditionalCycles:1,maximumLogicalCalls:10,logicalCalls:0,
  accountingLane:`B_structured_plan_tool_revision_${mode}`,noAutomaticTransportRetry:true,
  mode, priorDiagnosticCandidate21NotImported:true,
  originalWrites:0,nativeCalls:0,noGames:true,historyReset:false,events:[] };
let queue=Promise.resolve();
const save=()=>{report.updatedAt=new Date().toISOString();const text=JSON.stringify(report,null,2);
  const next=queue.then(async()=>{await fs.writeFile(dest+'.tmp',text,{mode:0o600});await fs.rename(dest+'.tmp',dest)});
  queue=next.catch(()=>{});return next;};
let secure,saved,filename,originalHash,baselineUsage,baselineDispatchCount;
const contexts=new Set();
try {
  for(const file of ['common-v232-plan-edit-tools-green.private.json','common-v233-schema-preflight-green2.private.json'])
    assert.equal(JSON.parse(await fs.readFile(base+'/'+file,'utf8')).ok,true);
  if(mode==='v237')for(const file of ['common-v236-fact-catalogue-green.private.json','common-v235-checkpoint-green.private.json'])
    assert.equal(JSON.parse(await fs.readFile(base+'/'+file,'utf8')).ok,true);
  const probe=JSON.parse(await fs.readFile(base+'/common-v233-minimal-provider-diagnostic.private.json','utf8'));
  assert.ok(probe.events.some(e=>e.dispatch?.status==='response_received'&&e.dispatch?.costStatus==='known'));
  report.recoveryProbe={serviceResponded:true,localProbeSchemaFailed:true,probeTokens:405,noProbeResend:true};
  const cfg=JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
  const row=cfg.rows.find(r=>r.arm==='B');filename=row.dataDirectory+'/drafts/'+row.sessionId+'.json';
  const original=await fs.readFile(filename,'utf8');originalHash=hash(original);
  const source=JSON.parse(original), originalPlan=JSON.parse(source.planSerialized);
  const candidateText=await fs.readFile(base+'/B/kimi-code-revision-shadow-v224/candidate-plan.private.json','utf8');
  const candidate=JSON.parse(candidateText);
  const produced=JSON.parse(await fs.readFile(base+'/common-v224-B-kimi-shadow-progress.private.json','utf8'));
  const review=JSON.parse(await fs.readFile(base+'/B/kimi-code-candidate-review-v231/qualified-review.private.json','utf8'));
  assert.equal(originalPlan.planHash,produced.sourcePlanHash);assert.equal(candidate.planHash,produced.candidatePlanHash);
  assert.equal(review.planHash,candidate.planHash);
  baselineUsage=structuredClone(source.usage);baselineDispatchCount=source.providerDispatches.length;
  source.planVersionHistory.push(source.planSerialized);source.planSerialized=candidateText;
  source.status='planned';source.failure=null;source.cancelRequested=false;source.pauseRequested=false;
  source.planReviewHistory.push(source.planReview);
  source.planReview={status:'completed',planHash:candidate.planHash,review,reviewContextVersion:review.reviewContextVersion,failure:null};
  source.claimRepairHistory ||= [];
  source.claimRepairHistory.push({fromPlanHash:originalPlan.planHash,toPlanHash:candidate.planHash,coverage:produced.claimRepairCoverage});
  source.revisionTeachEvidenceHistory ||= [];
  source.revisionTeachEvidenceHistory.push({fromPlanHash:originalPlan.planHash,toPlanHash:candidate.planHash,delivery:produced.teachDelivery});
  Object.assign(report,{originalDraftHash:originalHash,sourcePlanHash:originalPlan.planHash,candidatePlanHash:candidate.planHash,
    sourceReviewHash:review.reviewHash,initialHighCount:effectiveRosterFinalPlanReviewFindingsV1({plan:candidate,review}).filter(f=>f.severity==='high').length,
    baselineUsage:{calls:baselineUsage.calls,units:baselineUsage.totalUnits},oldUnknownCharges:'retained'});
  const state=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
  const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
  const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(state.officialUnitCompositionUpgradeDataBundle)});
  const noNative=()=>{report.nativeCalls++;throw Error('NO_NEW_NATIVE_FOR_SAVED_EVIDENCE_REPAIR')};
  const laboratory=createPregameSceneLaboratoryV1({sourceState:state,armyBuilderPort:builder,
    rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate:noNative,instantiate:noNative,apply:noNative}});
  const strategyPack={foundational:{entries:Array.from({length:5},()=>({}))},receipt:{hash:'b'.repeat(64)}};
  const strategist=createRosterStrategistRuntimeV1({armyBuilderPort:builder,laboratory,strategyPack,
    selectionUnitRules:source.teachFramework.context.sourceFacts.selectionUnitRules});
  secure=await createRosterPlanningSecureDeliberationFactoryV1({profile});
  const service=createRosterPlanningWorkspaceServiceV1({armyBuilderPort:builder,laboratoryCore:laboratory,strategyPack,
    fixture:source.teachFramework.context.fixture,selectionUnitRules:source.teachFramework.context.sourceFacts.selectionUnitRules,
    draftStore:{loadAll:async()=>({sessions:[source],quarantined:[]}),save:async value=>{
      saved=value;
      report.autoRepair=structuredClone(value.autoPlanRepair);report.workspaceStatus=value.status;report.failure=value.failure;
      report.currentPlanVersion=JSON.parse(value.planSerialized).planVersion;
      report.newUsage={calls:value.usage.calls-baselineUsage.calls,units:value.usage.totalUnits-baselineUsage.totalUnits};
      await writeCheckpoint({originalDraftHash:originalHash,
        planSerialized:value.planSerialized,autoPlanRepair:value.autoPlanRepair,planReview:value.planReview,
        reviewReconciliation:value.reviewReconciliation,planEditToolHistory:value.planEditToolHistory,
        claimRepairHistory:value.claimRepairHistory,revisionTeachEvidenceHistory:value.revisionTeachEvidenceHistory,
        publicOutputs:value.publicOutputs.filter(o=>contexts.has(o.contextHash)),
        failedProviderOutputs:value.failedProviderOutputs.filter(o=>contexts.has(o.contextHash)),
        newProviderDispatches:value.providerDispatches.slice(baselineDispatchCount),usage:value.usage,
        originalSourceReadOnly:true,trainingTruth:false});
      await save();
    }},createRunLaboratory:()=>laboratory,createStrategist:()=>strategist,
    deliberationFactory:{availability:secure.factory.availability,createForRun:async config=>{
      const port=await secure.factory.createForRun({...config,recoverNetworkDispatch:null,onEvent:async event=>{
        report.events.push(event.type==='round_completed'?{...event,sanitizedOutputRecord:undefined}:event);
        report.status=event.type;await config.onEvent?.(event);await save();
      }});
      return {descriptor:port.descriptor,deliberate:async request=>{
        assert.ok(['revision','final_plan_review','final_review_reconciliation','final_review_reconciliation_consistency'].includes(request.roundKind));
        assert.ok(report.logicalCalls<report.maximumLogicalCalls,'BOUNDED_CYCLE_CALL_LIMIT');
        if(request.roundKind==='revision'){
          const tool=request.promptNodes.find(n=>n.nodeType==='plan-edit-tools')?.content;
          assert.ok(tool);
          if(mode==='v237'){
            assert.equal(tool.protocol,'structured_plan_tools_v2');
            assert.ok(tool.factCatalogue && !tool.facts);
          }
        }
        contexts.add(request.contextHash);report.logicalCalls++;
        report.activeRequest={roundKind:request.roundKind,roundIndex:request.roundIndex,contextHash:request.contextHash,
          inputBytes:Buffer.byteLength(JSON.stringify(request.promptNodes)),sentAt:new Date().toISOString()};
        await fs.writeFile(directory+'/request-'+String(report.logicalCalls).padStart(2,'0')+'.private.json.gz',gzipSync(JSON.stringify(request)),{flag:'wx',mode:0o600});
        await save();return port.deliberate(request);
      }};
    }},
  });
  await service.loadPersisted();
  await service.repairReviewedPlan(source.sessionId,{expectedPlanHash:candidate.planHash,authorizeAdditionalCycle:true});
  while(saved.autoPlanRepair.status==='running')await new Promise(r=>setTimeout(r,1000));
  const result=JSON.parse(saved.planSerialized);
  report.status=saved.autoPlanRepair.status;report.autoRepair=structuredClone(saved.autoPlanRepair);
  report.rosterUnchanged=hash(result.rosterCandidate)===hash(candidate.rosterCandidate);
  report.scheduleUnchanged=hash(result.openingDeploymentSchedule)===hash(candidate.openingDeploymentSchedule);
  report.pendingPromotion=true;report.currentPlanHash=result.planHash;
  report.effectiveFindings=saved.planReview?.planHash===result.planHash
    ? effectiveRosterFinalPlanReviewFindingsV1({plan:result,review:saved.planReview.review}).reduce((a,f)=>{a[f.severity]=(a[f.severity]||0)+1;return a},{}) : null;
  await fs.writeFile(directory+'/candidate-plan.private.json',saved.planSerialized,{flag:'wx',mode:0o600});
}catch(error){report.status='stopped';report.failure=String(error.stack||error.message).slice(0,2000);process.exitCode=1;}
finally{
  await secure?.close();
  if(saved&&baselineUsage)report.newUsage={calls:saved.usage.calls-baselineUsage.calls,units:saved.usage.totalUnits-baselineUsage.totalUnits};
  if(filename&&originalHash)report.originalDraftUnchanged=hash(await fs.readFile(filename,'utf8'))===originalHash;
  report.finishedAt=new Date().toISOString();await save();
}
console.log(JSON.stringify({status:report.status,failure:report.failure,autoRepair:report.autoRepair,usage:report.newUsage}));
