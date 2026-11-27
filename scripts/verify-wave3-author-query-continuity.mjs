// Engineering author inputs travel through the product role executor and the disk-backed workflow.
// An injected missed delivery exercises the public saved-reply handoff without a provider.
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {root,read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {createStarcraftProductRoomHostV1} from './support/starcraft-product-room-host-v1.mjs';
import {createRosterPlanningProductModuleV1,createRosterDecisionDraftScopeV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterDecisionWorkflowStoreV1} from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
import {createRosterPlanProvenanceV1} from '../packages/roster-strategist/roster-plan-contracts-v1.mjs';
import {ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1 as mutationSchema} from '../packages/roster-strategist/roster-workflow-draft-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const resume = process.argv[2];
if(resume && !/^build\/ticket-28-wave3-author-query-[a-zA-Z0-9]+$/.test(resume)) throw Error('invalid checkpoint');
const out = resume ?? path.relative(root,await mkdtemp(path.join(root,'build/ticket-28-wave3-author-query-')));
const directory=path.join(root,out,'workflow');
const store=createRosterDecisionWorkflowStoreV1({directory});
const host=await createStarcraftProductRoomHostV1({root,dataDirectory:path.join(root,out,'host'),liveEnabled:false,offlineWave3MatchVersion:'2.99.0'});
const report=await read(out+'/steps.public.json').catch(error=>{
  if(error.code!=='ENOENT')throw error;
  return {steps:[],paidModelCalls:0,roomMutations:0};
});
async function mark(step,values={}) {report.steps.push({step,...values});await save(out+'/steps.public.json',report);}
const initialId='engineering-first-plan-with-map',editId='engineering-edit-plan',repairId='engineering-correct-source';
const summaries={ [initialId]:'工程输入：读取当前任务，再决定第一处争点。', [editId]:'工程输入：先核对两侧控制资格，再决定第一处争点。',
  [repairId]:'工程输入：依据当前地图重新读取中央目标，再核对双方控制资格。' };
try {
  const configured=host.planningInputsForSetup('wave3-standard-v1');
  const {wave3MatchSetup:setup,referenceArmyRecipes:recipes}=configured;
  const source=(await read(setup.releaseRef)).source;
  const board=await createRosterPlanningProductModuleV1({root,...configured,operation:'board_queries'});
  const {armyBuilderPort:builderPort,laboratory}=board;
  const ports=builderPort.portDescriptor();
  const candidateInput={sideKey:'player1',scaleId:setup.scale,mineralBudget:setup.minerals,
    ...recipes.player1,units:recipes.player1.units.map(({upgradeNames,...row})=>({...row,
      upgrades:upgradeNames.map(upgradeName=>({upgradeName}))}))};
  const audit=builderPort.evaluateRosterCandidate(candidateInput);
  assert.equal(audit.status,'legal',audit.rulesErrorCode??audit.portErrorCode);
  const map=board.mapEvidencePort.summarizeMap({queryId:'author-continuity'});
  const mapTopologyHash=map.mapTopologyHash??hash(map);
  const provenance=createRosterPlanProvenanceV1({sourceLockHash:source.sourceRevisionHash,
    sourceSnapshotHash:source.snapshotHash,normalizedDatasetHash:source.datasetHash,
    officialRulesVersion:source.versions.rulesVersion,officialCardsVersion:source.versions.cardsVersion,
    officialUnitsVersion:source.versions.unitsVersion,...ports,engagementScale:setup.scale,
    missionBinding:{status:'frozen',mapTopologyHash,missionRecordKey:setup.missionRecordKey,deploymentRecordKey:setup.deploymentRecordKey},
    opponentInformationBoundary:'open_roster',skillVersions:[],modelVersion:'offline-engineering'});
  function createDraftContext(draft) {
    return {laboratory,scope:createRosterDecisionDraftScopeV1({candidateInput:draft?.candidateInput??candidateInput,
      planHash:draft?.plan?.planHash??'unplanned',descriptor:laboratory.labDescriptor(),mapTopologyHash})};
  }
  let pending;
  const sessionId='wave3-author-query-engineering';
  function output(request,id,draft) {
    const directoryNode=request.promptNodes.find(n=>n.kind==='available_evidence_directory');
    const citation=request.promptNodes.find(n=>n.kind==='citation_access');
    const fact=directoryNode.entries.find(e=>e.title==='版本绑定的参考地图');
    assert.ok(fact,'map evidence in author directory');
    if(!citation?.directlyReadEvidenceNumbers?.includes(fact.number)
      &&!(request.promptNodes.find(n=>n.kind==='evidence_delivery_handoff')?.deliveredReads?.length)) {
      return {action:'read',publicReason:'读取当前版本的任务地图。',reads:[{evidenceNumber:fact.number,pointer:''}],catalogueQueries:[],decisions:[]};
    }
    const text=summaries[id];
    const plan=Object.fromEntries(Object.keys(mutationSchema.properties.plan.properties).map(k=>[k,null]));
    plan.publicSummaryText=text;
    const mutation={unitsToUpsert:[],unitIdsToRemove:[],tacticalCardRecordKeys:null,rosterBranchSelection:null,
      rosterCandidateSelection:null,plan,retainedSectionReasons:[]};
    const reason='仅验证工程传递：作者按刚读取的地图更新行动顺序。';
    return {action:'finish',publicReason:reason,reads:[],catalogueQueries:[],decisions:[{
      disposition:'revise',publicReason:reason,evidenceNumbers:[fact.number],alternatives:['维持原计划'],
      mutation,strategicChanges:[{intentPath:'/publicSummaryText',beforeIntent:draft.plan?.publicSummaryText??'尚无计划',
        afterIntent:text,decisionConsequence:'争点前先查控制资格。'}],
      nextInvestigation:null,workflowBlocker:null,comparisonDesignRequest:null,comparisonClosureRequest:null,dataQuestions:[]}]};
  }
  async function open(override={}) {
    const state=await store.load(),draft=state?.draftRef?await store.get(state.draftRef):null;
    return createRosterDecisionWorkspaceRunV1({directory,workflowStore:store,sessionId,
      ...createDraftContext(draft),createDraftContext,builderPort,
      loadRetainedOfflineReply:async()=>read(out+'/retained-reply.json'),
      deliberation:{async deliberate(request){
        const a=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
        const state=await store.load(),work=state.work.find(w=>w.id===a.workId);
        assert.equal(a.scope.releaseManifest,board.releaseBinding.manifestHash);
        await save(out+'/latest-request.json',request);
        const value=a.workId===repairId && !work.operationState.calls.length
          ? {action:'read',publicReason:'工程反例：提交没有登记的来源编号。',reads:[{evidenceNumber:999999,pointer:''}],catalogueQueries:[],decisions:[]}
          : output(request,a.workId,await store.get(state.draftRef));
        if(a.workId===editId && !report.steps.some(s=>s.step==='reply-reattached') && !pending){
          pending=work.operationState.pending;
          await save(out+'/retained-reply.json',{kind:'prepared_offline_role_reply_v1',workId:a.workId,
            requestRef:pending.requestRef,contextHash:pending.contextHash,externalDispatch:false,productConsumed:false,output:value});
          throw Object.assign(Error('DISPATCH_OUTCOME_UNKNOWN'),{code:'DISPATCH_OUTCOME_UNKNOWN',dispatchOutcome:'unknown'});
        }
        return {output:value,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
          roundIndex:request.roundIndex,outputHash:hash(value),paidProviderCall:false}};
      }},...override});
  }
  let run=await open();
  if(!(await run.currentDraft())){
    await run.initializeDraft({candidateInput,provenance,mode:'editable'});
    assert.equal((await run.inspect()).scope.releaseManifest,board.releaseBinding.manifestHash);
    await mark('initial-draft',{manifestHash:board.releaseBinding.manifestHash,nativeAudit:audit.auditResultHash});
  }
  if(!(await run.inspect()).evidence.some(e=>e.id==='bound-map')){
    const {map:mapKey,rules,source:boardSource,releaseManifest}=(await run.inspect()).scope;
    await run.publishEvidence({id:'bound-map',title:'版本绑定的参考地图',kind:'tool_receipt',
      bindings:{map:mapKey,rules,source:boardSource,releaseManifest},conditions:['赛前参考棋盘'],value:map});
  }
  for(const id of [initialId,editId,repairId]){
    if(report.steps.some(s=>s.step===id))continue;
    if(!(await run.inspect()).work.some(w=>w.id===id))await run.requestDecision({id,question:'请依据给出的当前地图资料，只修订第一处争点前的行动顺序。',
      inputs:{mapEvidence:{source:'evidence',id:'bound-map',pointer:''}}});
    for(let turn=0;turn<6;turn++){
      const state=await run.inspect(),work=state.work.find(w=>w.id===id);
      if((await run.currentDraft()).plan?.publicSummaryText===summaries[id])break;
      if(work.status==='needs_repair' && work.failure?.code==='DISPATCH_OUTCOME_UNKNOWN'){
        const saved=await read(out+'/retained-reply.json');
        run=await open();
        const cmd={workId:id,expectedRequestRef:saved.requestRef,ownership:{kind:'product_single_writer_lease',held:true},reason:'isolated saved reply recovery'};
        await assert.rejects(()=>run.reattachOfflineRoleReply({...cmd,expectedRequestRef:'0'.repeat(64)}),/RECONCILIATION_INVALID/);
        const result=await run.reattachOfflineRoleReply(cmd);
        assert.equal(result.providerReplay,false);
        await mark('reply-reattached',{requestRef:result.requestRef,replyRef:result.replyRef});
      }else {
        assert(!work.failure,JSON.stringify(work.failure));assert.notEqual(work.status,'evidence_ready','author returned without draft successor');
        const advanced=await run.advance({concurrency:1});
        const latest=advanced.state.work.find(w=>w.id===id);
        if(latest.operationState?.consecutiveCorrections>0){
          const op=latest.operationState;
          assert.equal(id,repairId,JSON.stringify(op.correction?.errors));
          assert.equal(op.calls.length,1,JSON.stringify(op.correction?.errors));
          assert.equal((await run.currentDraft()).revision,2);
          await mark('invalid-source-rejected',{replyRef:op.correction.originalReplyRef,errors:op.correction.errors});
        }
      }
    }
    const draft=await run.currentDraft();
    assert.equal(draft.plan.publicSummaryText,summaries[id]);
    assert.deepEqual(draft.candidateInput,candidateInput);
    await mark(id,{draftRevision:draft.revision,planHash:draft.plan.planHash});
  }
  const state=await run.inspect(),savedHash=state.draftRef;
  await assert.rejects(()=>open({scope:{...state.scope,releaseManifest:'0'.repeat(64)}}),/ROSTER_DECISION_RUN_SCOPE_CHANGED/);
  run=await open();
  assert.equal((await run.inspect()).draftRef,savedHash);
  assert.equal((await run.currentDraft()).plan.provenance.normalizedDatasetHash,source.datasetHash);
  assert(report.steps.some(s=>s.step==='invalid-source-rejected'));
  const edit=(await run.inspect()).work.find(w=>w.id===editId).operationState;
  assert.equal(edit.calls.length,1);assert.equal(edit.revalidations.length,1);
  await mark('cold-author',{savedHash,editSavedReplyConsumedOnce:true});
  await save(out+'/result.public.json',report);
  console.log(out);
} catch(error) {
  await save(out+'/failure-'+Date.now()+'.json',{message:error.message,stack:error.stack});
  console.error(out);throw error;
} finally {await host.close();}
