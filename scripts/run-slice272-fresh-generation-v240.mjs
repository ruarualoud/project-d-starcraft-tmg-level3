// User-requested fresh A/B production through the ordinary Web API adapter.
// Isolated drafts, same frozen map/data/Skills, real Flash, optional Builder
// reselection through Teach. No old draft import and no Room launch port.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix} from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
import {STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V2 as profile} from '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {needsRosterFinalPlanReconciliationV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import {createIterativeRosterFlashModelPortV1} from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import {createIterativeRosterFileStoreV1} from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
import {rosterPlanExperimentGroupV274,ROSTER_PLAN_EXPERIMENT_MATRIX_V274} from '../content/roster-plan-experiment-matrix-v274.mjs';
const [base,arm='B',mode,...options]=process.argv.slice(2);
const matrixMode=options.includes('--matrix-v274');
assert.ok(base&&(matrixMode?['C','D','E','F']:['A','B']).includes(arm));
assert.ok(options.every(value=>value==='--matrix-v274'||value==='--recover-interrupted'||value==='--recover-unstarted'||/^--generation=\d+$/.test(value)));
const experiment=matrixMode?rosterPlanExperimentGroupV274(arm):null;
const recoveryMode=options.includes('--recover-interrupted')?'--recover-interrupted':null;
const productResume=['--resume-product','--resume-product-v250','--resume-product-v251','--resume-product-v252','--resume-product-v255','--resume-product-v259'].includes(mode);
const preflightResume=options.includes('--recover-unstarted');
if(preflightResume)assert.ok(productResume,'Unstarted recovery requires the normal product resume entry');
const requestedFreshVersion=Number(/^--fresh-v(\d+)$/.exec(mode||'')?.[1]||0);
const generationOption=options.find(value=>value.startsWith('--generation='));
if(generationOption)assert.ok(productResume,'Generation selector is only for a product resume');
const freshVersion=generationOption?Number(generationOption.split('=')[1]):requestedFreshVersion||(productResume?249:240);
assert.ok(freshVersion===240||freshVersion>=249);
const reviewOnly=mode==='--resume-review-v248';
const resume=productResume||['--resume-v241','--resume-v243','--resume-v248','--resume-review-v248'].includes(mode);assert.ok(!mode||resume||requestedFreshVersion>=249);
const recoveryVersion=mode==='--resume-product'?`continuation-${new Date().toISOString().replace(/[^0-9]/g,'')}`:mode==='--resume-product-v259'?259:mode==='--resume-product-v255'?255:mode==='--resume-product-v252'?252:mode==='--resume-product-v251'?251:productResume?250:mode==='--resume-v248'||reviewOnly?248:mode==='--resume-v243'?243:241;
if(recoveryVersion===248)assert.equal(arm,reviewOnly?'A':'B','A resumes missing review only; B resumes its existing iterative journey');
const experimentBase=matrixMode?path.join(base,ROSTER_PLAN_EXPERIMENT_MATRIX_V274):base;
const directory=experimentBase+`/${arm}/fresh-generation-v${freshVersion}`;
if(matrixMode&&!resume)await fs.mkdir(path.dirname(directory),{recursive:true,mode:0o700});
if(!resume)await fs.mkdir(directory,{recursive:false,mode:0o700});
const report=resume?JSON.parse(await fs.readFile(directory+'/progress.private.json','utf8')):{version:freshVersion,arm,startedAt:new Date().toISOString(),pid:process.pid,
  status:'initializing_product',model:profile.model,timeoutMs:profile.timeoutMs,
  originalDraftWrites:0,gamesStarted:0,newGeneration:true,trainingTruth:false,
  usage:{calls:0,inputUnits:0,outputUnits:0,totalUnits:0},dispatches:[],events:[]};
if(preflightResume){
  assert.equal(report.status,'stopped');assert.ok(!report.sessionId);
  assert.equal(report.requestCount||0,0);assert.equal(report.usage.calls,0);
  assert.equal(report.dispatches.length,0,'Never replay an ambiguous or already-sent initialization');
}
if(freshVersion>=249&&!matrixMode){
  const previousPath=base+`/${arm}/fresh-generation-v${freshVersion===249?240:249}/progress.private.json`;
  const previous=JSON.parse(await fs.readFile(previousPath,'utf8'));
  report.previousProduction={path:previousPath,status:previous.status,sessionId:previous.sessionId,
    usage:previous.cumulativeReportedUsage||previous.usage,finishedAt:previous.finishedAt,unknownFeesRemainInOriginalLedger:true};
  report.acceptanceScope='fresh_same_product_generation_no_old_decisions_or_Teach_imported';
}
if(resume){
  if(report.status!=='stopped'){
    assert.ok(productResume||[243,248,250,251,252,255,259].includes(recoveryVersion));
    try{process.kill(report.pid,0);throw Error('ORIGINAL_OBSERVER_STILL_RUNNING');}
    catch(error){assert.equal(error.code,'ESRCH');}
  }
  await fs.writeFile(directory+`/before-v${recoveryVersion}-resume.private.json.gz`,gzipSync(JSON.stringify(report)),{flag:'wx',mode:0o600});
  report.recoveries ||= [];report.recoveries.push({version:recoveryVersion,at:new Date().toISOString(),previousFailure:report.failure||'observer_stopped_after_confirmed_no_progress',previousPid:report.pid});
  report.pid=process.pid;report.status='restoring_same_session';delete report.failure;delete report.finishedAt;delete report.operatorPauseRequested;
}
let queue=Promise.resolve(),secure,product,sessionId,originalFile,originalHash;
const persist=()=>{if(report.previousProduction)report.cumulativeReportedUsage=Object.fromEntries(
  Object.keys(report.usage).map(key=>[key,Number(report.previousProduction.usage[key]||0)+Number(report.usage[key]||0)]));
  const payload=JSON.stringify(report,null,2);const next=queue.then(async()=>{
  await fs.writeFile(directory+'/progress.private.json.tmp',payload,{mode:0o600});
  await fs.rename(directory+'/progress.private.json.tmp',directory+'/progress.private.json');
});queue=next.catch(()=>{});return next;};
const write=async(name,value)=>fs.writeFile(directory+'/'+name,JSON.stringify(value,null,2),{mode:0o600});
const emit=async event=>{
  // Public decision text already lives in the normal workspace reply store.
  // This observer saves timing/usage/dispatch metadata only, never thought.
  const safe={...event,sanitizedOutputRecord:undefined,failedOutputRecord:undefined};
  if(event.type==='provider_dispatch'){
    const index=report.dispatches.findIndex(d=>d.requestId===event.dispatch.requestId);
    if(index<0)report.dispatches.push(event.dispatch);else report.dispatches[index]=event.dispatch;
  }else report.events.push(safe);
  if(['round_completed','round_failed'].includes(event.type)&&event.paidProviderCall===true&&event.usage){
    report.usage.calls++;for(const key of ['inputUnits','outputUnits','totalUnits'])report.usage[key]+=Number(event.usage[key]||0);
  }
  report.lastEvent={type:event.type,roundKind:event.roundKind,roundIndex:event.roundIndex,at:event.at||new Date().toISOString()};
  report.updatedAt=new Date().toISOString();await persist();
};
try{
  await persist();
  const cfg=JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
  const old=cfg.rows.find(row=>row.arm===(matrixMode?'B':arm));originalFile=old.dataDirectory+'/drafts/'+old.sessionId+'.json';
  const originalText=await fs.readFile(originalFile,'utf8');originalHash=hash(originalText);
  const original=JSON.parse(originalText);
  const mapConfigurationFile=experiment?.mapRole==='accepted_alternate_topology_required'
    ?path.join(experimentBase,'E-map-configuration.json'):cfg.mapConfigurationFile;
  const mapConfiguration=JSON.parse(await fs.readFile(mapConfigurationFile,'utf8'));
  if(experiment){
    report.experiment=experiment;
    report.mapConfigurationFile=mapConfigurationFile;
    report.acceptanceScope='fresh_same_product_generation_isolated_roster_plan_matrix_v274';
  }
  secure=await createRosterPlanningSecureDeliberationFactoryV1({profile});
  const factory={availability:secure.factory.availability,createForRun:async config=>{
    const port=await secure.factory.createForRun({...config,onEvent:async event=>{
      await config.onEvent?.(event);await emit(event);
    }});
    return {descriptor:port.descriptor,deliberate:async request=>{
      const number=(report.requestCount||0)+1;report.requestCount=number;
      report.activeRequest={number,roundKind:request.roundKind,roundIndex:request.roundIndex,
        contextHash:request.contextHash,inputBytes:Buffer.byteLength(JSON.stringify(request.promptNodes)),at:new Date().toISOString()};
      await fs.writeFile(directory+`/request-${String(number).padStart(3,'0')}.private.json.gz`,
        gzipSync(JSON.stringify(request)),{flag:'wx',mode:0o600});
      await persist();return port.deliberate(request);
    }};
  }};
  product=await createRosterPlanningProductModuleV1({root:path.resolve('.'),fixtureRoot:cfg.fixtureRoot,
    dataDirectory:directory+'/workspace',mapConfiguration,enableIterativeDraft:arm!=='A',deliberationFactory:factory,
    ...(experiment?{referenceArmyRecipes:experiment.referenceArmyRecipes}:{})});
  report.productDescriptor=product.descriptor();report.mission=product.officialMissionScoringProfile();
  if(experiment){
    const reference=report.productDescriptor.planningReferenceArmies;
    assert.equal(reference.player1.factionRecordKey,experiment.factionRecordKey);
    assert.equal(reference.player2.factionRecordKey,experiment.opponentFactionRecordKey);
    assert.equal(reference.player1.mineralSpent,2000);assert.equal(reference.player2.mineralSpent,2000);
  }
  report.mapSummary=product.mapEvidencePort.summarizeMap({queryId:'fresh-production-map-binding-v240'});
  assert.equal(report.mapSummary.mapBinding.missionRecordKey,original.setup.missionBinding.missionRecordKey);
  assert.equal(report.mapSummary.mapBinding.deploymentRecordKey,original.setup.missionBinding.deploymentRecordKey);
  assert.equal(report.mapSummary.resultStatus,'certified_map_summary');
  report.status=resume&&!preflightResume?'resuming_existing_session':'creating_new_session';await persist();
  const setup={factionRecordKey:experiment?.factionRecordKey||original.setup.factionRecordKey,
    opponentFactionRecordKey:experiment?.opponentFactionRecordKey||original.setup.opponentFactionRecordKey,
    engagementScale:'Standard',mineralBudget:2000,teachFeedbackPolicy:'skill_teach_roster_coevolution_v1'};
  if(arm==='A'){
    if(resume&&!preflightResume){sessionId=report.sessionId;assert.ok(sessionId);}
    else {
    const created=await product.handle({method:'POST',pathname:prefix+'/sessions/preset',
      body:{setup:original.setup,candidateInput:original.lockedRoster.lock.candidateInput}});
    await write('create.private.json',created);assert.equal(created.status,201,JSON.stringify(created.response));
    sessionId=created.response.session.sessionId;report.sessionId=sessionId;
    }
    if(freshVersion>=249){
      // The same single Run endpoint as Web/App owns every strategic stage.
      // This observer may only poll/pause/account/export; no scripted repairs.
      const interrupted=recoveryMode==='--recover-interrupted'
        ? product.service.readSession(sessionId).providerDispatches?.findLast(d=>['ambiguous','reserved','sent','sending'].includes(d.status)) : null;
      if(recoveryMode)assert.ok(resume&&interrupted,'Controlled recovery requires an existing interrupted dispatch');
      const started=await product.handle({method:'POST',pathname:prefix+`/sessions/${sessionId}/run`,
        body:interrupted?{resumeAfterNetworkInterrupt:true,expectedRequestId:interrupted.requestId}:{}});
      assert.equal(started.status,202,JSON.stringify(started.response));
      let view;
      while(true){
        view=product.service.readSession(sessionId);
        report.workspace={status:view.status,planVersion:view.plan?.planVersion,
          activeRound:view.progress.activeRoundKind,presetJourney:view.presetJourney,
          reviewStatus:view.planReview?.status,reviewHigh:view.planReviewBlockingHighFindings,
          teach:view.teachFramework,failure:view.failure};
        report.status=view.presetJourney.status;report.updatedAt=new Date().toISOString();await persist();
        if(view.presetJourney.status!=='running')break;
        if(await fs.stat(directory+'/pause-requested').then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;})){
          await product.handle({method:'POST',pathname:prefix+`/sessions/${sessionId}/pause`});
        }
        await new Promise(resolve=>setTimeout(resolve,5000));
      }
      await write('final-workspace-view.private.json',view);
      if(view.plan)await write('candidate-plan.private.json',view.plan);
      await fs.writeFile(directory+(resume?`/experience-v${recoveryVersion}.private.json.gz`:'/experience.private.json.gz'),gzipSync(JSON.stringify(product.service.readPlanningExperience(sessionId))),{flag:'wx',mode:0o600});
      if(view.presetJourney.status==='paused') {
        report.status='paused';report.operatorPauseRequested=true;delete report.failure;
      } else assert.equal(view.presetJourney.status,'completed',JSON.stringify(view.presetJourney));
    }else{
    const post=async(operation,body={})=>{
      report.status=operation;await persist();
      const result=await product.handle({method:'POST',pathname:prefix+`/sessions/${sessionId}/${operation}`,body});
      report.operations ||= [];report.operations.push({operation,status:result.status,at:new Date().toISOString(),reason:result.response.reason});
      assert.ok(result.status>=200&&result.status<300,JSON.stringify(result.response));return result;
    };
    const waitFor=async(kind)=>{
      while(true){
        const view=product.service.readSession(sessionId);
        report.workspace={status:view.status,planVersion:view.plan?.planVersion,activeRound:view.progress.activeRoundKind,
          reviewStatus:view.planReview?.status,reviewHigh:view.planReviewBlockingHighFindings,
          teach:view.teachFramework,autoRepair:view.autoPlanRepair, failure:view.failure};
        report.updatedAt=new Date().toISOString();await persist();
        const status=kind==='planning'?view.status:kind==='repair'?view.autoPlanRepair?.status:kind==='review'?view.planReview?.status:view.teachFramework?.status;
        if(status==='running'){await new Promise(resolve=>setTimeout(resolve,5000));continue;}
        assert.equal(status,kind==='planning'?'planned':'completed',JSON.stringify(report.workspace));return view;
      }
    };
    let view;
    if(reviewOnly){view=product.service.readSession(sessionId);assert.equal(view.status,'planned');}
    else {await post('generate',resume?{resume:true}:{});view=await waitFor('planning');}
    if(!reviewOnly&&!view.plan.openingDeploymentSchedule){
      await post('revise',{reasonText:'Create the Rules-audited opening arrival schedule for this unchanged fixed roster and align its public deployment plan with the model-selected arrival windows.',
        revisedSectionKeys:['deploymentConcept','publicSummaryText'],triggerIds:[]});
      view=await waitFor('planning');
    }
    const reviewedPlanHash=view.plan.planHash;
    await post('review');view=await waitFor('review');
    if(reviewOnly){
      assert.equal(view.plan.planHash,reviewedPlanHash,'Missing-review recovery must not regenerate or revise Plan3');
      report.status='source_review_completed_pending_qualification';
      report.reviewOnly=true;report.reviewedPlanHash=reviewedPlanHash;
      await write('review-v248-workspace-view.private.json',view);
    }else{
    if(needsRosterFinalPlanReconciliationV1(view.planReview.review)){
      report.status='qualifying_source_review';await persist();
      view=await product.service.reconcileReviewFindings(sessionId);
    }
    if(view.planReviewBlockingHighFindings||view.claimRepairBacklog.length){
      await post('repair-reviewed',{expectedPlanHash:view.plan.planHash});view=await waitFor('repair');
    }
    assert.equal(view.planReviewBlockingHighFindings,false);
    assert.equal(view.planReviewRequiredForHandoff,false);
    await post('teach-framework',{expectedPlanHash:view.plan.planHash});view=await waitFor('teach');
    report.unresolvedQuestionIds=[...new Set((view.teachFramework.coverage||[]).flatMap(row=>row.unresolvedQuestionIds||[]))];
    // Completion of evidence collection is not automatic acceptance/application
    // of its strategy suggestions. Preserve the actual output for the next
    // ordinary structured Plan revision; never fabricate a clean Teach.
    report.status=report.unresolvedQuestionIds.length?'teach_unresolved':'teach_completed_pending_application';
    await write('final-workspace-view.private.json',view);
    await write('candidate-plan.private.json',view.plan);
    await fs.writeFile(directory+'/experience.private.json.gz',gzipSync(JSON.stringify(product.service.readPlanningExperience(sessionId))),{flag:'wx',mode:0o600});
    }
    }
  }else{
  if(resume&&!preflightResume){
    sessionId=report.sessionId;assert.ok(sessionId);
    const state=await product.iterativeDraft.read(sessionId);
    if(productResume){
      assert.equal(state.pendingDecision,null,'Product Run may not replace unresolved dispatch recovery with experiment-only repair');
    }else if(state.pendingDecision){
      const replyStore=createIterativeRosterFileStoreV1({directory:directory+'/workspace/iterative-draft'});
      const retained=await replyStore.loadRetainedReply(state.pendingDecision.requestKey);
      if(!retained){
      const saved=JSON.parse(gunzipSync(await fs.readFile(directory+`/request-${String(report.requestCount).padStart(3,'0')}.private.json.gz`)));
      const context=saved.promptNodes[0].content;
      const dispatch=report.dispatches.findLast(d=>d.contextHash===saved.contextHash);
      const port=createIterativeRosterFlashModelPortV1({deliberationFactory:factory,replyStore,
        skillGuidance:context.skillGuidance,missionEvidence:context.missionEvidence});
      await port.retainRejectedRequest({requestKey:state.pendingDecision.requestKey,state,dispatch});
      }
      const settled=await product.iterativeDraft.resume(sessionId);
      assert.equal(settled.pendingDecision,null);assert.equal(settled.revision,state.revision+1);
      report.recoveries.at(-1).settledRetainedRevision=settled.revision;
      report.recoveries.at(-1).newProviderCallsToSettle=0;
    }
  }else{
  const created=await product.handle({method:'POST',pathname:prefix+'/iterative/sessions',body:{setup}});
  await write('create.private.json',created);assert.equal(created.status,201,JSON.stringify(created.response));
  sessionId=created.response.journey.sessionId;report.sessionId=sessionId;
  }
  const started=await product.handle({method:'POST',pathname:prefix+`/iterative/sessions/${sessionId}/run`,body:{}});
  await write(resume?`resume-v${recoveryVersion}.private.json`:'run.private.json',started);assert.equal(started.status,202,JSON.stringify(started.response));
  report.status='running';await persist();
  console.log(JSON.stringify({status:report.status,pid:process.pid,sessionId,directory}));
  while(true){
    if(await fs.stat(directory+'/pause-requested').then(()=>true).catch(error=>{if(error.code==='ENOENT')return false;throw error;})){
      await product.iterativeJourney.pause(sessionId);
      report.operatorPauseRequested=true;
    }
    const view=await product.iterativeJourney.read(sessionId);
    report.journey=view;report.updatedAt=new Date().toISOString();await persist();
    if(!view.running){
      report.status=view.stage==='source_review_completed_clean'?'completed'
        :view.iterativeStatus==='paused'&&!view.stoppedReason?'paused':'stopped';
      if(report.status==='stopped')report.failure=view.stoppedReason||view.stage;
      break;
    }
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  const experience=await product.iterativeJourney.exportExperience(sessionId);
  await fs.writeFile(directory+(resume?`/experience-v${recoveryVersion}.private.json.gz`:'/experience.private.json.gz'),gzipSync(JSON.stringify(experience)),{flag:'wx',mode:0o600});
  if(report.journey.teachSessionId){
    const view=product.service.readSession(report.journey.teachSessionId);
    await write('final-workspace-view.private.json',view);
    if(view.plan)await write('candidate-plan.private.json',view.plan);
  }
  }
}catch(error){report.status='stopped';report.failure=String(error.stack||error.message);process.exitCode=1;}
finally{
  await secure?.close();
  if(originalFile&&originalHash)report.originalDraftUnchanged=hash(await fs.readFile(originalFile,'utf8'))===originalHash;
  report.finishedAt=new Date().toISOString();await persist();
  console.log(JSON.stringify({status:report.status,failure:report.failure,usage:report.usage,sessionId}));
  // Product read-only spatial pools may retain idle handles. No job remains
  // at this terminal point and every workspace/observer write has completed.
   setImmediate(()=>process.exit(['completed','paused','teach_completed_pending_application','source_review_completed_pending_qualification'].includes(report.status)?0:1));
}
