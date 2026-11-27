import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {compareRosterBuilderAuditNumericFactsV1,projectRosterBuilderAuditNumericFactsV1} from './roster-builder-candidate-facts-v1.mjs';

// Exact saved proposal, not permission to reuse its historical audit as current.
// Discovery and selection share this projection; Native rechecks on every edit.
export function rosterAuditedCandidateSourceV1(value){
  if(value?.operation==='builder_audit'
    &&value.receipt?.schema==='starcraft_tmg_army_builder_roster_verdict_v1'
    &&value.receipt.status==='legal'&&value.request?.candidateInput)
    return {candidateInput:value.request.candidateInput,candidatePointer:'/request/candidateInput',
      historicalAudit:value.receipt};
  if(value?.operation==='candidate_context'&&value.receipt?.resultStatus==='ok'
    &&value.receipt.audit?.schema==='starcraft_tmg_army_builder_roster_verdict_v1'
    &&value.receipt.audit.status==='legal'&&value.receipt.candidateInput)
    return {candidateInput:value.receipt.candidateInput,candidatePointer:'/receipt/candidateInput',
      historicalAudit:value.receipt.audit};
  return null;
}

async function projectCurrentRosterDelta({assignment,state,alternative,findAvailable,matchesScope,readArtifact}){
  if(!state.draftRef||!Number.isSafeInteger(state.draftRevision)||state.scope.plan!==assignment.scope.plan)return null;
  const id=`draft:r${state.draftRevision}:builder`;
  const entry=state.evidence.find(row=>row.id===id),visible=findAvailable(id);
  if(!entry?.artifactRef||visible?.artifactRef!==entry.artifactRef||!matchesScope(entry.bindings))return null;
  const draft=await readArtifact(state.draftRef);
  if(draft?.revision!==state.draftRevision||draft.plan?.planHash!==assignment.scope.plan
    ||draft.builderVerdictRef!==entry.artifactRef||!draft.candidateInput
    ||hash(draft.candidateInput)!==assignment.scope.army)return null;
  const verdict=await readArtifact(entry.artifactRef);
  const {verdictHash,...unsigned}=verdict??{};
  if(verdict?.candidateHash!==assignment.scope.army||!verdictHash||hash(unsigned)!==verdictHash)return null;
  const current=projectRosterBuilderAuditNumericFactsV1({value:verdict,
    evidence:{...visible,id,artifactRef:entry.artifactRef,number:visible.number??assignment.evidenceDirectory.indexOf(visible)+1}});
  return compareRosterBuilderAuditNumericFactsV1(current,alternative);
}

// Deliver the exact private replacement audit behind a measured comparison.
// The current Builder still re-audits if the strategic owner selects this roster.
export async function projectRosterComparisonCandidateAuditsV1({assignment,state,readArtifact}){
  const inputs=assignment.inputs;
  const adjudication=inputs?.comparisonAdjudication?.value;
  if(!(assignment.role==='roster_workflow_strategy_decision'&&inputs?.investigationFrontier
    ||adjudication&&['roster_workflow_strategy_decision','roster_workflow_final_review'].includes(assignment.role)))return assignment;
  const value=await findComparisonCandidateAudit({assignment,state,readArtifact,
    purposeId:inputs.comparisonPurpose?.evidenceId??inputs.comparisonPurpose?.id,
    comparisonIds:adjudication?.comparisons?.map(row=>row.evidenceId.replace(/^tool-view:/u,'tool:'))});
  return value?{...assignment,inputs:{...inputs,comparisonCandidateAudit:{source:'literal',value}}}:assignment;
}

async function findComparisonCandidateAudit({assignment,state,readArtifact,purposeId,comparisonIds}){
  const scopeKeys=['army','rules','map','source'];
  const matchesScope=bindings=>scopeKeys.every(key=>typeof assignment.scope?.[key]==='string'
    &&bindings?.[key]===assignment.scope[key]&&state.scope?.[key]===assignment.scope[key]);
  const findAvailable=id=>assignment.evidenceDirectory.find(entry=>entry.id===id
    &&entry.validity==='current'&&entry.availability!=='unavailable');
  const purpose=state.evidence.find(entry=>entry.id===purposeId);
  if(!purpose?.artifactRef||!matchesScope(purpose.bindings)||!findAvailable(purposeId))return null;

  const scopedWork=state.work.filter(work=>work.role==='roster_workflow_tool'&&work.status==='evidence_ready'
    &&work.resultRef&&matchesScope(work.bindings)
    &&work.inputs?.request?.value?.comparisonBinding?.purposeSource?.artifactRef===purpose.artifactRef);
  const measured=scopedWork.findLast(work=>work.inputs.request.value.operation==='compare_observations'
    &&(!comparisonIds||comparisonIds.includes('tool:'+work.id)));
  if(!measured)return null;
  const measureSource=state.evidence.find(entry=>entry.id==='tool:'+measured.id);
  if(!measureSource||!matchesScope(measureSource.bindings)||!findAvailable(measureSource.id))return null;
  const result=(await readArtifact(measured.resultRef)).value;
  const rawMeasurement=await readArtifact(measureSource.artifactRef);
  if(result?.operation!=='compare_observations'||result.status!=='completed'||result.receipt?.resultStatus!=='ok'
    ||hash(result.receipt)!==hash(rawMeasurement.receipt))return null;
  const contextRef=result.participantConfigurationCheck?.arms?.alternative?.contextRef;
  const scene=result.comparisonSceneEntries?.find(entry=>entry.arm==='alternative'&&entry.contextRef===contextRef);
  if(!contextRef||!scene?.sourceStateHash||result.participantConfigurationCheck.status!=='matched')return null;

  const candidates=new Map();
  for(const work of scopedWork.filter(row=>row.inputs.request.value.operation==='candidate_context')){
    const id='tool:'+work.id,visible=findAvailable(id);
    const entry=state.evidence.find(row=>row.id===id);
    if(!visible||!entry?.artifactRef||!matchesScope(entry.bindings))continue;
    const raw=await readArtifact(entry.artifactRef),receipt=raw.receipt;
    if(raw.operation!=='candidate_context'||raw.status!=='completed'||receipt?.contextRef!==contextRef
      ||receipt.parentSourceStateHash!==assignment.scope.source
      ||receipt.laboratory?.sourceStateHash!==scene.sourceStateHash)continue;
    const audit=rosterAuditedCandidateSourceV1(raw);
    if(!audit||hash(audit.candidateInput)!==receipt.candidateInputHash
      ||receipt.candidateInputHash!==audit.historicalAudit.candidateHash)continue;
    const {verdictHash,...unsigned}=audit.historicalAudit;
    if(typeof verdictHash!=='string'||verdictHash!==hash(unsigned))continue;
    const index=assignment.evidenceDirectory.indexOf(visible);
    const facts=projectRosterBuilderAuditNumericFactsV1({value:raw,evidence:{...visible,
      id,artifactRef:entry.artifactRef,number:visible.number??index+1}});
    if(!facts)continue;
    candidates.set(verdictHash,{facts,source:facts.source,verdictHash,verdict:facts.sourceVerdict,
      summary:facts.summary,summaryPointer:facts.summaryPointer,budget:facts.budget,
      candidatePointer:audit.candidatePointer});
  }
  if(candidates.size!==1)return null;
  const [{facts,...alternative}]=candidates.values();
  const rosterDelta=await projectCurrentRosterDelta({assignment,state,alternative:facts,findAvailable,matchesScope,readArtifact});
  return {version:1,comparisonEvidenceId:measureSource.id,alternativeContextRef:contextRef,
    alternative,...(rosterDelta?{rosterDelta}:{}),strategyApproved:false,fullOriginalReadGranted:false,
    instruction:'Native Builder already audited this exact replacement under these frozen bindings. Its verdict and costs are scoped roster facts. When rosterDelta is present, its sign is alternative minus current. Models and Supply are separate quantities; objective control also requires applicable battlefield evidence. Read the exact candidate pointer before selecting a replacement. Current Builder rechecks any actual roster edit. This evidence does not choose a roster, approve the experiment, or prove strategy performance.'};
}

// A closure's singular alternative can only have facts when its actual
// measured comparison identifies one exact, current replacement audit.
export async function projectRosterComparisonClosureCandidateFactsV1({state,request,comparisons,readArtifact}){
  const comparisonIds=[...new Set(comparisons.filter(row=>row.sourceCurrent&&row.meaningStatus==='observed')
    .map(row=>row.evidenceId.replace(/^tool-view:/u,'tool:')))];
  if(comparisonIds.length!==1)return [];
  const evidenceDirectory=state.evidence.map((entry,index)=>({...entry,number:index+1,
    validity:Object.entries(entry.bindings??{}).every(([key,value])=>state.scope[key]===value)?'current':'historical'}));
  const audit=await findComparisonCandidateAudit({assignment:{scope:state.scope,evidenceDirectory},state,readArtifact,
    purposeId:'role:'+request.purposeWorkId,comparisonIds});
  if(!audit)return [];
  const candidate=audit.alternative,subject='exact alternative army in this comparison';
  const source={evidenceId:candidate.source.evidenceId,evidenceNumber:candidate.source.evidenceNumber,
    artifactRef:candidate.source.artifactRef};
  const slot=(field,value,unit,pointer)=>({factId:'comparison.alternative.'+field,value,unit,subject,
    source:{...source,pointer}});
  return [slot('auditStatus',candidate.verdict,'builder audit status',candidate.source.auditPointer+'/status'),
    ...Object.entries({startingModelCount:'models',startingSupply:'supply',mineralSpent:'minerals',vespeneSpent:'vespene'})
      .filter(([key])=>Number.isFinite(candidate.summary[key]))
      .map(([key,unit])=>slot(key,candidate.summary[key],unit,candidate.summaryPointer+'/'+key))];
}
