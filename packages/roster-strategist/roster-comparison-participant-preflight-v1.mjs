// Identity/selection facts are deterministic. Model preflight owns the prose
// and experimental usefulness, but cannot override the frozen participants.
import {isDeepStrictEqual} from 'node:util';
import {assessRosterComparisonValueReviewV1} from './roster-comparison-value-review-v1.mjs';
import {createHash} from 'node:crypto';
import {checkRosterParticipantConfigurationV1,normalizeRosterParticipantSelectionV1} from './roster-participant-configuration-v1.mjs';
import {rosterComparisonPurposeFromProposalV1,assessRosterComparisonDecisionPreflightV1} from './roster-comparison-purpose-v1.mjs';
import {rosterComparisonDecisionTestErrorsV1} from './roster-comparison-decision-test-v1.mjs';
import {rosterComparisonCapabilityCatalogueV1} from './roster-comparison-execution-question-v1.mjs';
import {createRosterWorkflowOwnershipIndexV1} from './roster-workflow-ownership-v1.mjs';
import {createRosterWorkflowGraphV1,currentRosterComparisonPurposeV1} from './roster-workflow-graph-v1.mjs';
import {resolveArmyBuilderPurchasableUpgradeV1,ARMY_BUILDER_CHOICE_ENUMERATION_RECEIPT_SCHEMA} from './army-builder-query-port-v1.mjs';
const copy=structuredClone;
export async function assessRosterComparisonParticipantPreflightV1({state,work,readArtifact}){
  if(!work?.resultRef||work.status!=='evidence_ready')return null;
  const purpose=rosterComparisonPurposeFromProposalV1(await readArtifact(work.resultRef));
  if(!purpose)return null;
  return assessRosterComparisonDesignSubmissionV1({state,work,purpose,readArtifact,requireDecisionTest:false});
}

// Run the SAME source check before accepting a model design, not only after
// publishing it as evidence_ready. No candidate, scene or strategic choice is
// created here; source/selection errors belong to the current design author.
export async function assessRosterComparisonDesignSubmissionV1({state,work,purpose,readArtifact,requireDecisionTest=true}){
  const base={version:3,purposeWorkId:work.id,purposeResultRef:work.resultRef,
    alternativeLegalityChecked:false,prosePremisesChecked:false,nativeExecuted:false,planApproved:false};
  const catalogue=rosterComparisonCapabilityCatalogueV1(work);
  const nativeInterventions=catalogue?.nativeInterventions;
  if(nativeInterventions&&(nativeInterventions.sourceStateHash!==state.scope.source
    ||nativeInterventions.rulesRuntimeHash!==state.scope.rules))
    return {...base,status:'source_required',arms:[],reason:'comparison_intervention_source_mismatch'};
  const decisionErrors=requireDecisionTest?rosterComparisonDecisionTestErrorsV1(purpose,{
    catalogue,requireCapabilities:true}):[];
  if(decisionErrors.length)return {...base,status:'decision_contract_invalid',decisionErrors,arms:[]};
  if(Object.entries(work.bindings??{}).some(([key,value])=>state.scope[key]!==value))
    return {...base,status:'stale_source',arms:[]};
  const input=work.inputs?.frozenParticipantSource;
  const entry=input?.source==='evidence'&&input.pointer===''
    ?state.evidence.find(e=>e.id===input.id):null;
  if(!entry?.artifactRef||Object.entries(entry.bindings??{}).some(([key,value])=>state.scope[key]!==value))
    return {...base,status:'source_required',arms:[]};
  const source=await readArtifact(entry.artifactRef);
  if(source?.schema!=='roster_participant_source_v2'||!Array.isArray(source.units))
    return {...base,status:'source_required',arms:[]};
  const own=source.units.filter(row=>row.sourceKind==='selected_draft');
  const unknownOpponent=source.opponentKnowledge?.actualRosterKnown===false;
  const enemy=source.units.filter(row=>unknownOpponent?row.sideKey!==own[0]?.sideKey:row.sourceKind==='frozen_reference_recipe');
  if(!own.length||!enemy.length)return {...base,status:'source_required',arms:[]};
  const menuEntry=state.evidence.find(e=>e.id==='product:builder-menu'&&e.kind==='tool_receipt');
  const menu=menuEntry?.artifactRef?await readArtifact(menuEntry.artifactRef):null;
  if(!menu||menu.schema!==ARMY_BUILDER_CHOICE_ENUMERATION_RECEIPT_SCHEMA
    ||menu.bounds?.truncated!==false||!Array.isArray(menu.unitCandidates)
    ||Object.entries(menuEntry.bindings??{}).some(([key,value])=>state.scope[key]!==value))
    return {...base,status:'source_required',arms:[]};
  const opponentMenuEntry=unknownOpponent?state.evidence.find(e=>e.id==='product:opponent-public-menu'&&e.kind==='tool_receipt'):null;
  const opponentMenu=opponentMenuEntry?.artifactRef?await readArtifact(opponentMenuEntry.artifactRef):null;
  if(unknownOpponent&&(!opponentMenu||opponentMenu.schema!==ARMY_BUILDER_CHOICE_ENUMERATION_RECEIPT_SCHEMA
    ||opponentMenu.faction.recordKey!==source.opponentKnowledge.knownFactionRecordKey||opponentMenu.bounds?.truncated!==false))
    return {...base,status:'source_required',arms:[],reason:'public_opponent_catalogue_required'};
  const enemyRecords=new Set(opponentMenu?.unitCandidates.map(u=>u.recordKey)??[]);
  const ownIds=new Set(own.map(u=>u.selection.unitInstanceId));
  const upgradeProfiles=[...menu.unitCandidates,...(opponentMenu?.unitCandidates??[])].flatMap(unit=>unit.purchasableUpgrades.map(p=>({...p,recordKey:unit.recordKey})));
  // The own-faction purchase menu is not the opponent's identity catalogue.
  // Preserve the separately bound frozen source instead of overriding its
  // enemy aliases with an own-only list. Conflicting sources cannot choose one.
  if(source.upgradeIdentitySource?.schema==='native_builder_upgrade_identity_v1'){
    for(const profile of source.upgradeIdentitySource.profiles??[]){
      const same=upgradeProfiles.filter(p=>p.recordKey===profile.recordKey
        &&p.purchasableUpgradeProfileId===profile.purchasableUpgradeProfileId);
      if(same.some(p=>p.upgradeName!==profile.upgradeName))
        return {...base,status:'source_required',arms:[],reason:'comparison_upgrade_identity_source_conflict'};
      if(!same.length)upgradeProfiles.push(copy(profile));
    }
  }
  const enemyIds=new Set(enemy.map(row=>row.selection.unitInstanceId));
  const arms=[];
  for(const arm of ['current','alternative']){
    const wanted=purpose?.participantConfigurationsByArm?.[arm];
    if(!Array.isArray(wanted)){arms.push({arm,status:'mismatch',error:{code:'ROSTER_EXPERIMENT_PURPOSE_PARTICIPANTS_REQUIRED',detail:null}});continue;}
    const intervention=purpose.decisionTest?.executionQuestion?.intervention;
    const actors=intervention?.kind==='native_ability_use'?[intervention.actorUnitId]:intervention?.actorUnitIds??[];
    const present=new Set(wanted.map(unit=>unit.unitInstanceId));
    // A configuration comparison may replace one actor with another. The
    // declared actors are its union, not a requirement to keep the removed
    // actor in both counterfactuals. Never infer or insert missing selections.
    const configurationChange=intervention?.kind==='participant_configuration';
    const acrossArms=new Set(['current','alternative'].flatMap(key=>
      purpose.participantConfigurationsByArm?.[key]?.map(unit=>unit.unitInstanceId)??[]));
    const missingActors=actors.filter(id=>!(configurationChange?acrossArms:present).has(id));
    if(missingActors.length||configurationChange&&!actors.some(id=>present.has(id))){
      arms.push({arm,status:'mismatch',error:{code:'ROSTER_COMPARISON_INTERVENTION_PARTICIPANT_MISSING',
        detail:{actors,missingActors,arm,participants:[...present],
          requirement:configurationChange?'Every declared actor must occur in the two-arm union; each arm must contain an explicitly selected actor.':'Every declared actor must occur in each arm.'}}});continue;
    }
    if([5,6].includes(purpose.decisionTest?.version)){
      const subjects=purpose.decisionTest.comparisonRule.subjectsByArm[arm];
      // Native scoring subjects are seat/round; intervention actors above still require real units.
      const unitSubjects=[subjects.attackerUnitId,subjects.targetUnitId].filter(id=>typeof id==='string');
      if(unitSubjects.some(id=>!present.has(id))){
        arms.push({arm,status:'mismatch',error:{code:'ROSTER_COMPARISON_MEASUREMENT_PARTICIPANT_MISSING',detail:{subjects}}});continue;
      }
    }
    // The alternative's explicitly proposed own selection is not required to
    // equal the current army; Native Builder must later establish its legality.
    // It never changes, aliases or resizes the frozen opposing selections.
    const hypotheticalEnemy=unknownOpponent?wanted.filter(unit=>!ownIds.has(unit.unitInstanceId)&&enemyRecords.has(unit.recordKey)):[];
    const armEnemy=unknownOpponent?hypotheticalEnemy.map(selection=>({sideKey:enemy[0].sideKey,sourceKind:'declared_hypothesis_pending_native',selection:normalizeRosterParticipantSelectionV1(selection)})):enemy;
    const armEnemyIds=unknownOpponent?new Set(hypotheticalEnemy.map(u=>u.unitInstanceId)):enemyIds;
    const selectedOwn=arm==='current'?own.map(row=>row.selection):wanted.filter(unit=>!armEnemyIds.has(unit.unitInstanceId))
      .map(unit=>normalizeRosterParticipantSelectionV1(unit));
    const participantSource=arm==='current'&&!unknownOpponent?source:{...source,units:[...armEnemy,
      ...selectedOwn.map(selection=>({sideKey:own[0].sideKey,sourceKind:'selected_draft',selection}))]};
    try{
      const check=checkRosterParticipantConfigurationV1({operation:'scenario',
        scope:{participantUnitIds:wanted.map(unit=>unit.unitInstanceId),participantConfigurations:wanted},
        candidateInput:{units:selectedOwn},participantSource,upgradeProfiles});
      for(const unit of selectedOwn)for(const upgrade of unit.upgrades??[]){
        const profile=resolveArmyBuilderPurchasableUpgradeV1(upgradeProfiles,unit.recordKey,upgrade);
        if(!profile||profile.recordKey!==unit.recordKey)throw Object.assign(Error('ROSTER_COMPARISON_UPGRADE_ADDRESS_UNRESOLVED'),{
          comparisonAddressError:{code:'ROSTER_COMPARISON_UPGRADE_ADDRESS_UNRESOLVED',detail:{unitInstanceId:unit.unitInstanceId,upgrade}}});
      }
      arms.push({arm,status:'matched',check,upgradeAddressingChecked:true,
        ...(unknownOpponent?{opponentIsHypothesis:true,opponentLegalityChecked:false,
          remainingRequirement:'Create this explicitly chosen hypothetical opponent with candidate_context.opponentCandidateInput; Native must audit and subsequent measurements must match that actual scenario. This does not identify the real opponent.'}:{})});
    }catch(error){
      if(error.candidateFaultCode||error.comparisonAddressError){
        arms.push({arm,status:'mismatch',error:error.comparisonAddressError??{
          code:error.candidateFaultCode,detail:copy(error.candidateFaultDetail??null)},
          sourceEvidenceId:menuEntry.id,sourceRef:menuEntry.artifactRef,
          instruction:'The frozen Native Builder purchase catalogue cannot address this proposed upgrade. An innate ability is not a purchase. Return to the design author: read the unit ability source and explicitly revise the intervention, or choose a real purchasable selection. Do not rename an ability to force a pass, alter the roster, or send this impossible premise into method retries.'});continue;
      }
      if(!error.queryRepair||error.dispatchOutcome!=='not_dispatched')throw error;
      arms.push({arm,status:'mismatch',error:{code:error.code,detail:copy(error.detail??null)}});
    }
  }
  return {...base,sourceEvidenceId:entry.id,sourceRef:entry.artifactRef,
    purchaseCatalogueRef:menuEntry.artifactRef,upgradeAddressingChecked:true,
    status:arms.every(arm=>arm.status==='matched')?'matched':'mismatch',arms,
    ...(unknownOpponent?{opponentKnowledge:copy(source.opponentKnowledge),hypotheticalEnemyNativeAuditRequired:true}:{}),
    instruction:'These are deterministic participant-selection checks, not an experiment result or a strategy choice. Current must be the actual adopted selection; alternative own choices still require Native Builder. A known opponent stays frozen; unknown opponents are explicit conditional hypotheses with PUBLIC addressing only at this stage, not observed roster facts. Create the chosen scenario and pass Native before any measurements. On mismatch the DESIGN AUTHOR must explicitly revise the proposed experiment and all inconsistent prose, or state the unavailable required scenario. Never silently substitute actual for intended, relabel old measurements, or infer speed/model counts from a selection name. Independent semantic preflight still checks those premises.'};
}

// A concrete gate deployment can revalidate the SAME completed paid response.
// This is eligibility only. The regular role executor still resolves its
// original request, checks schema/reads/semantics, and publishes any outcome.
export async function projectRosterComparisonParticipantRevalidationV1({state,work,readArtifact}){
  const operation=work?.operationState,errors=operation?.correction?.errors??[];
  if(work?.status!=='needs_repair'||work.role!=='roster_workflow_local_teach'
    ||!work.strategyComparisonDesignCycleId||work.failure?.dispatchOutcome!=='completed_invalid'
    ||operation?.pending||!errors.length||!errors.every(e=>e.code==='comparison_design_participants_invalid'
      &&e.diagnostic?.version===2&&e.diagnostic.status==='mismatch'))return null;
  const originalReplyRef=operation.correction.originalReplyRef;
  if(!originalReplyRef||!operation.calls?.some(c=>c.replyRef===originalReplyRef))return null;
  const reply=await readArtifact(originalReplyRef),output=reply?.output;
  if(output?.action!=='finish'||output.comparisonDesignReturn||output.proposals?.length!==1)return null;
  const purpose=output.proposals[0].comparisonPurpose;if(!purpose)return null;
  // Exact saved participant values only. Policy references are resolved later
  // against the original request by the existing full executor, not invented.
  const diagnostic=await assessRosterComparisonDesignSubmissionV1({state,work,purpose,readArtifact,requireDecisionTest:false});
  if(diagnostic.status!=='matched'||errors.some(e=>e.diagnostic.sourceRef!==diagnostic.sourceRef
    ||e.diagnostic.purchaseCatalogueRef!==diagnostic.purchaseCatalogueRef))return null;
  const repairKind='comparison_participant_arm_scope';
  return {workId:work.id,originalReplyRef,repairKind,
    revalidationKey:createHash('sha256').update(JSON.stringify({originalReplyRef,repairKind,version:3})).digest('hex'),
    participantDiagnostic:diagnostic,providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
}

// Recheck an already admitted frozen experiment in its recorded admission
// context. Plan-only edits retire planning jobs, not the immutable experiment.
// This local view never revives persisted work or grants current-Plan approval.
export async function rosterFrozenComparisonAdmissionContextV1({state,goal,purpose,readArtifact}){
  if(!goal||!purpose)return null;
  const facts=s=>Object.fromEntries(Object.entries(s??{}).filter(([k])=>k!=='plan'));
  const approval=purpose.inputs?.decisionValueApproval?.value;
  const review=state.work.find(w=>w.id===approval?.reviewId);
  const context=review?.inputs?.decisionValueContext?.value;
  if(goal.experimentScopePolicy!=='frozen_comparison_v1'||goal.comparisonClosureRef
    ||goal.supersededByGoalId||purpose.supersededByGoalId||purpose.comparisonAuthorizationSuperseded
    ||!['evidence_ready','superseded'].includes(purpose.status)
    ||!['evidence_ready','superseded'].includes(review?.status)
    ||!isDeepStrictEqual(goal.bindings,facts(state.scope))
    ||!isDeepStrictEqual(facts(purpose.bindings),facts(state.scope))
    ||!isDeepStrictEqual(facts(review.bindings),facts(state.scope))
    ||goal.inputs?.comparisonDecisionContract?.value?.designResultRef!==purpose.resultRef
    ||approval?.version!==2||approval.mayDesign!==true||!review.resultRef
    ||review.resultRef!==approval.reviewResultRef||context?.key!==approval.contextKey
    ||!isDeepStrictEqual(context.source,approval.source)||!isDeepStrictEqual(context.proposal,approval.proposal)
    ||purpose.inputs?.approvedDecisionReview?.source!=='evidence'
    ||purpose.inputs.approvedDecisionReview.id!=='role:'+review.id)return null;
  const purposeSource=state.evidence.find(e=>e.id===goal.inputs?.comparisonPurpose?.id);
  const reviewSource=state.evidence.find(e=>e.id==='role:'+review.id);
  if(!purposeSource?.artifactRef||!reviewSource?.artifactRef)return null;
  const [purposeValue,reviewValue,publishedPurpose,publishedReview]=await Promise.all([
    readArtifact(purpose.resultRef),readArtifact(review.resultRef),
    readArtifact(purposeSource.artifactRef),readArtifact(reviewSource.artifactRef)]);
  if(!isDeepStrictEqual(purposeValue.value,publishedPurpose)||!isDeepStrictEqual(reviewValue.value,publishedReview))return null;
  const commit=state.events.find(e=>e.type==='draft_committed'&&e.draftRef
    &&isDeepStrictEqual(e.scope,review.bindings));
  if(!commit)return null;
  const draft=await readArtifact(commit.draftRef);
  if(!isDeepStrictEqual(draft.plan,context.currentPlan))return null;
  const work=state.work.map(w=>w.id===purpose.id||w.id===review.id?{...w,status:'evidence_ready'}:w);
  return {state:{...state,scope:review.bindings,draftRef:commit.draftRef,work},
    purpose:work.find(w=>w.id===purpose.id)};
}

// The original admission authorizes this immutable design; it is not a live
// dependency on every later Plan sentence. Repair only the old producer's
// incorrectly unqualified reference, using the same frozen-admission proof as
// Native scheduling. Never revive a replaced design or approve a current Plan.
export async function projectRosterFrozenDesignReferenceRepairsV1({state,readArtifact}){
  const repairs=[];
  for(const purpose of state.work){
    const input=purpose.inputs?.approvedDecisionReview;
    if(!purpose.strategyComparisonDesignCycleId||!purpose.resultRef||purpose.operationState?.pending
      ||!['evidence_ready','superseded'].includes(purpose.status)
      ||input?.source!=='evidence'||input.scopeUsage==='historical_reference'
      ||currentRosterComparisonPurposeV1(state,purpose.strategyComparisonDesignCycleId)?.id!==purpose.id)continue;
    const goal=state.work.find(w=>w.experimentGoalId===w.id
      &&w.inputs?.comparisonPurpose?.id==='role:'+purpose.id);
    if(!goal)continue;
    const admitted=await rosterFrozenComparisonAdmissionContextV1({state,goal,purpose,readArtifact});
    if(!admitted)continue;
    const after={...input,scopeUsage:'historical_reference'};
    const projected={...purpose,status:'evidence_ready',inputs:{...purpose.inputs,approvedDecisionReview:after}};
    // If another input or fact changed, this one correction cannot establish
    // freshness. Keep that failure visible rather than globally ignoring Plan.
    if(!createRosterWorkflowGraphV1({...state,work:state.work.map(w=>w.id===purpose.id?projected:w)}).isFresh(purpose.id))continue;
    repairs.push({version:1,workId:purpose.id,priorStatus:purpose.status,
      inputName:'approvedDecisionReview',before:copy(input),after,
      purposeResultRef:purpose.resultRef,admissionReviewResultRef:purpose.inputs.decisionValueApproval.value.reviewResultRef,
      admissionPlanHash:admitted.state.scope.plan,goalId:goal.id,
      historyReset:false,providerReplayed:false,nativeReplayed:false,currentPlanApproved:false});
  }
  return repairs;
}

// Also guard already-queued studies on cold resume, not only newly-created
// goals. Leave their calls/results/history intact and allow unrelated work.
export async function blockedRosterComparisonWorkIdsV1({state,readArtifact}){
  const owner=createRosterWorkflowOwnershipIndexV1(state),blockedGoals=new Set(),checks=new Map(),blockedDesigns=new Set();
  // A queued design can predate a factual gate repair. Re-evaluate its exact
  // source without rewriting the old approval or invoking the model first.
  for(const work of state.work){
    const source=work.inputs?.redesignContract?.value?.source;
    if(!work.strategyComparisonDesignCycleId||work.resultRef||!source||!['ready','needs_model_choice'].includes(work.status))continue;
    const draft=await readArtifact(state.draftRef);
    if((await assessRosterComparisonValueReviewV1({state,draft,source,readArtifact})).status!=='accepted')blockedDesigns.add(work.id);
  }
  for(const goal of state.work){
    if(goal.experimentGoalId!==goal.id||goal.status==='superseded'||goal.supersededByGoalId)continue;
    const reference=goal.inputs?.comparisonPurpose;
    if(reference?.source!=='evidence'||!reference.id?.startsWith('role:'))continue;
    const purpose=state.work.find(w=>'role:'+w.id===reference.id);
    if(!purpose?.strategyComparisonDesignCycleId)continue;
    const frozen=await rosterFrozenComparisonAdmissionContextV1({state,goal,purpose,readArtifact});
    const checkState=frozen?.state??state,checkPurpose=frozen?.purpose??purpose;
    const checkKey=goal.id;
    if(!checks.has(checkKey))checks.set(checkKey,await assessRosterComparisonParticipantPreflightV1({state:checkState,work:checkPurpose,readArtifact}));
    if(checks.get(checkKey)?.status!=='matched')blockedGoals.add(goal.id);
    // New contract-bound studies cannot bypass preflight through cold resume.
    // Historical raw runs are not silently rewritten or retroactively approved.
    if(goal.inputs.comparisonDecisionContract){
      const input=goal.inputs.designPreflight;
      const preflight=input?.source==='evidence'&&state.work.find(w=>'role:'+w.id===input.id);
      const decision=await assessRosterComparisonDecisionPreflightV1({state:checkState,work:checkPurpose,preflight,readArtifact});
      if(decision.status!=='accepted'||!isDeepStrictEqual(goal.inputs.comparisonDecisionContract.value,decision.contract))
        blockedGoals.add(goal.id);
    }
  }
  return state.work.filter(work=>blockedDesigns.has(work.id)||blockedGoals.has(work.id)||blockedGoals.has(owner(work.id)?.goalId)).map(work=>work.id);
}
