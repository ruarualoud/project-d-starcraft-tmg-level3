// Query planning is a fact-finding role. Historical strategic conclusions remain
// retrievable, but must not masquerade as present tool availability or outcomes.
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import {describeStarcraftTmgFireAttackSelectionV1} from '../online-agent-session/combat-estimation-runtime-v1.mjs';
import {rosterTeachReferencedQueryIdsV1} from './roster-teach-question-progress-v1.mjs';

export const ROSTER_TEACH_FACT_PROBE_VERSION = 'roster_teach_fact_probe_v3';

// Material delivery is not evidence selection. Keep every original in the same
// retained-evidence reader, but do not make a factual successor query reread all
// strategic advice and source documents. Current Native results/menus are never
// routed through this library. Rebuilding it from frozen context after recovery
// produces identical addresses; it does not depend on a process-local cache.
function factMaterialReference(value, archive) {
  const reference=hash(value);
  archive.set(reference,value);
  const pointer=keys=>keys.length ? '/'+keys.map(key=>String(key)
    .replaceAll('~','~0').replaceAll('/','~1')).join('/') : '';
  const retrieval=keys=>({kind:'retained_evidence',
    toolRequestJson:JSON.stringify({receiptHash:reference,path:pointer(keys)})});
  const describe=(child,keys,depth)=>{
    const row={path:pointer(keys),type:Array.isArray(child)?'array':child===null?'null':typeof child,
      characters:JSON.stringify(child).length,retrieval:retrieval(keys)};
    if(child && typeof child==='object') {
      row.fields=Object.keys(child);
      const labels=Object.fromEntries(['referenceId','recordKey','queryId','challengeId',
        'unitId','unitType','id','name','title','sourceAuthorityDisposition','interpretationVerified']
        .filter(key=>['string','boolean','number'].includes(typeof child[key]))
        .map(key=>[key,child[key]]));
      if(typeof child.rule?.title==='string')labels.ruleTitle=child.rule.title;
      if(Object.keys(labels).length)row.navigationLabels=labels;
      if(Array.isArray(child))row.length=child.length;
      if(depth>0)row.children=Object.entries(child).map(([key,item])=>describe(item,[...keys,key],depth-1));
    }
    return row;
  };
  return {kind:'roster_fact_material_reference_v1',evidenceObjectHash:reference,
    fullBodyAvailable:true,originalUnchanged:true,retrieval:retrieval([]),
    directory:describe(value,[],1),
    instruction:'This is a navigation directory, not a factual answer or an unavailable capability. '
      +'Read the needed exact path with retained_evidence before relying on its contents. '
      +'Large objects return child paths; follow those paths to the original text/value. '
      +'All source fields and authority labels are retained. No material has been summarized into a strategic verdict.'};
}

function factSourceMaterial(context,archive) {
  const advisory=new Set(['selectionEvidence','sourceReview','skillGuidance','previousInquiry']);
  const delivered=Object.fromEntries(Object.entries(context).map(([key,value])=>{
    if(advisory.has(key)&&value&&typeof value==='object')return [key,factMaterialReference(value,archive)];
    if(key==='sourceFacts'&&value&&typeof value==='object')return [key,Object.fromEntries(
      Object.entries(value).map(([field,body])=>[field,
        body&&typeof body==='object'&&JSON.stringify(body).length>8192
          ?factMaterialReference(body,archive):body]))];
    return [key,value];
  }));
  return {kind:'fact_probe_source_material',delivery:'role_scoped_material_library_v1',context:delivered,
    boundary:'Current question, latest original tool results and legal successor menus remain inline. '
      +'This library contains frozen source material and advisory history, not the current branch state. '
      +'Use exact retained reads for any needed rule, Skill, prior query or selection rationale. '
      +'Original rules, map facts, evidence and strategic arguments remain available; no roster or Plan is changed. '
      +'Only a result with the required scope can establish a predicate; availability of a document is not proof.'};
}

// Add current diagnostic interpretation beside (never inside) the signed old
// evidence. Its complete original branch menu is retained on the failed reply;
// use it only when the source/base identities match. No Native query is rerun.
function retainedFireSelection(receipt, operation) {
  const source=receipt.sourceReceipt;
  const result=source?.queryReceipt?.result;
  const context=receipt.queryRepair;
  if(result?.queryKind!=='fire_zone_exchange' || result.attackEstimates?.length!==0
    || !context?.actionSpace || context.baseStateHash!==source.baseStateHash
    || context.sourceStateHash!==source.sourceStateHash || !operation?.request
    || hash(operation.request)!==receipt.requestHash)return null;
  const tool=operation.request.toolRequest;
  let args;
  try{args=tool.argumentsJson ? JSON.parse(tool.argumentsJson) : tool;}catch{return null;}
  const selection=describeStarcraftTmgFireAttackSelectionV1({seatKey:result.seatKey??source.seatKey,
    state:{phase:context.phase,pieces:(context.availableUnits||[]).map(unit=>({id:unit.unitId,sideKey:unit.sideKey}))},
    currentLegalSpaceDomains:context.actionSpace.parameterDomains||[]},args,
    {estimates:result.attackEstimates,failures:result.attackEstimateFailures||[]});
  return {queryId:receipt.challengeId,originalReceiptHash:receipt.receiptHash,
    baseStateHash:source.baseStateHash,selection,nativeExecutions:0,
    originalReceiptUnchanged:true,scope:'diagnostic_of_the_retained_query_selection_not_new_combat_evidence'};
}

// Historical observations remain visible; historical action menus are not the
// next operation's input. Keep the last completed tool batch intact and make
// every older operational context addressable, rather than repeatedly injecting
// all prior branches' menus/repair catalogs. No question is answered by the Host.
export function organizeRosterTeachFactEvidenceV1({receipts, requests, latestQueryIds, archive}) {
  const current = new Set(latestQueryIds);
  const groups = new Map();
  const historicalContextKeys = new Set(['branchQueryContext','queryContext','queryRepair',
    'actionSpace','actionParameterContracts','nativeSpatialQueryTool','queryContracts','nativeAbilityReference']);
  const currentBatchEvidence = [];
  const querySelectionDiagnostics=[];
  for (const receipt of receipts) {
    const operation = requests.findLast(row=>row.queryId===(receipt.challengeId ?? receipt.queryId));
    const diagnostic=retainedFireSelection(receipt,operation);
    if(diagnostic)querySelectionDiagnostics.push(diagnostic);
    if (current.has(receipt.challengeId ?? receipt.queryId)) {
      currentBatchEvidence.push(receipt); continue;
    }
    const reference = hash(receipt); archive.set(reference, receipt);
    const contexts = [];
    const project = (value, path = '') => {
      if (Array.isArray(value)) return value.map((item,index)=>project(item,path ? `${path}.${index}` : `${index}`));
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(Object.entries(value).flatMap(([key,child])=>{
        const childPath = path ? `${path}.${key}` : key;
        if (historicalContextKeys.has(key)) {
          contexts.push({path:childPath,retrieval:{kind:'retained_evidence',
            toolRequestJson:JSON.stringify({receiptHash:reference,path:childPath})}});
          return [];
        }
        return [[key,project(child,childPath)]];
      }));
    };
    const questionId = receipt.questionId ?? operation?.questionId ?? null;
    if (!groups.has(questionId)) groups.set(questionId,{questionId,executions:[]});
    groups.get(questionId).executions.push({queryId:receipt.challengeId ?? receipt.queryId,
      sourceReceiptHash:receipt.receiptHash,status:receipt.status,request:operation?.request ?? null,
      observedResult:project(receipt),retainedOperationalContexts:contexts,
      fullEvidence:{evidenceObjectHash:reference,fullBodyAvailable:true,
        retrieval:{kind:'retained_evidence',toolRequestJson:JSON.stringify({receiptHash:reference,path:''})}}});
  }
  return {currentBatchEvidence,historyByQuestion:[...groups.values()],querySelectionDiagnostics,
    historicalObservationsAreNotCurrentActionMenus:true,
    instruction:'Current-batch receipts are the immediate tool results. historyByQuestion retains prior actual observations and rejected requests, not conclusions you must repeat. Older branch menus/repair contexts are available at the exact retained paths or by inspect of that branchIdRef. Use the latest canonical rules reference for capability discovery. A prior failure does not erase a later success; different branches are not interchangeable. Read the needed retained evidence instead of rerunning its action or copying an obsolete unanswered claim. The Host has not ranked tactics or answered questions.'};
}

export function isRosterTeachSynthesisReviewPendingV1(state) {
  return ['pending', 'running'].includes(state?.synthesisReview?.status);
}

// Explicit continuation after the evidence-consumer fix, not another query
// loop. Keep the last completed paid answer until its replacement is valid.
export function beginRosterTeachSynthesisReviewV1(state) {
  if (state?.phase !== 'completed' || state.investigation?.completed !== true
    || state.synthesisReview || !state.synthesisRaw || !state.synthesis
    || !state.synthesis.answers.some(answer => answer.disposition === 'unresolved')
    || state.investigation.operations?.some(operation => !operation.completed)
    || state.queryRecovery?.selection?.completed === false
    || state.agenda?.questions.some(question =>
      !state.evidence?.some(receipt => receipt.challengeId === question.questionId))) {
    throw Object.assign(Error('ROSTER_TEACH_SYNTHESIS_REVIEW_UNAVAILABLE'),
      { code: 'ROSTER_TEACH_SYNTHESIS_REVIEW_UNAVAILABLE' });
  }
  state.synthesisReview = { version: 1, status: 'pending',
    reason: 'question_scoped_evidence_and_displayed_numeric_binding',
    explicitCallerRequest: true, baselineCallCount: state.calls?.length || 0,
    maximumProviderCalls: 1, queryExecutionAllowed: false, historyReset: false,
    automaticallyAppliedToPlan: false };
}

// Keep all material (inline or in the resumable synthesis reader),
// and associate actual executions with the question they test; old hypotheses
// and model-authored "unresolved" lists are not current Native observations.
// This changes evidence organization, never a question's strategic answer.
export function projectRosterTeachInvestigationHistoryV1(state) {
  return { rounds: (state.investigation?.rounds || []).map(round => ({
    publicReason: round.output.publicReason, unresolved: round.output.unresolved,
    questionProgress: structuredClone(round.output.questionProgress || []),
  })), operations: state.investigation?.operations || [] };
}

export function reconcileRosterTeachSynthesisNodesV1(nodes) {
  const inquiry = nodes.find(node => node.kind === 'framework_and_questions');
  const results = nodes.find(node => node.kind === 'actual_tool_results');
  if (!Array.isArray(inquiry?.agenda?.questions) || !Array.isArray(results?.evidence)) return nodes;
  const { questions, ...agendaCoverage } = inquiry.agenda;
  const operations = [...(results.investigation?.operations || []),
    ...(results.queryRecovery?.operations || [])];
  const questionIds = new Set(questions.map(question => question.questionId));
  const owners = new Map();
  for (const operation of operations) {
    if (!questionIds.has(operation.questionId)) continue;
    for (const id of [operation.queryId, operation.originalQueryId].filter(Boolean)) {
      if (!owners.has(id)) owners.set(id, new Set());
      owners.get(id).add(operation.questionId);
    }
  }
  const evidenceQuestion = row => {
    // An explicit owner is never silently replaced. Legacy receipts may omit
    // it, but their exact executed query identity can supply an unambiguous
    // association. Names, substring matches and success status cannot.
    if (row.questionId) return row.questionId;
    const matches = new Set();
    for (const id of [row.queryId, row.challengeId].filter(Boolean)) {
      if (questionIds.has(id)) matches.add(id);
      for (const owner of owners.get(id) || []) matches.add(owner);
    }
    return matches.size === 1 ? [...matches][0] : null;
  };
  const { evidence, investigation, queryRecovery, ...otherResults } = results;
  const { rounds = [], operations: _operations, ...otherInvestigation } = investigation || {};
  const { operations: _recoveries, ...otherRecovery } = queryRecovery || {};
  return nodes.flatMap(node => {
    if (node === inquiry) return [{ ...node, kind: 'teach_inquiry_framework', agenda: agendaCoverage }];
    if (node !== results) return [node];
    return [
      { ...otherResults, kind: 'question_evidence_reconciliation', version: 1,
        modelOwnsStrategicDisposition: true, hostAutoAnswersQuestions: false,
        evidenceCount: evidence.length,
        evaluationContract: [
          'Answer the original question under explicitly stated scenario assumptions. Original claims and assumptions are hypotheses to check, not findings that remain true after new evidence arrives.',
          'Separate the factual prerequisites established by actual receipts from the precise predicates still untested or contradicted. Cite the scoped receipt for each observation; a historical failed request does not erase a distinct successful execution.',
          'A successful conditional action proves that action and its observed effects for that parent state only. It does not prove arrival history, future enemy cooperation, all branches, or the whole strategy.',
          'Do not expand a concrete prerequisite into a universal all-situations proof unless the original claim needs that scope. If broader coverage is required, identify that exact claim and why the observed conditional case cannot support it.',
          'Unknown factual legality remains unknown. Strategic uncertainty may instead be an explicit condition or replan trigger when the supporting action is legal; neither the Host nor a generic preference for safety chooses the strategy.',
          'For quantitativeEvidence cite an exact number or canonical probability estimate object in the raw receipt or its delivered typed view; an estimate binds its value on the 0-to-1 scale and retains percent, sample counts and uncertainty. Use qualitativeEvidence for exact string/boolean states. Other objects require an explicit leaf path; no guessed field or numeric coercion. A bound value does not verify your interpretation: preserve that receipt\'s scenario, prior state and other conditions. Another question\'s receipt, a request value or prior model prose is not a substitute.',
        ],
        questions: questions.map(question => ({ questionId: question.questionId,
          originalQuestion: question,
          originalQuestionAuthority: 'model_hypotheses_not_observed_facts',
          evidence: evidence.filter(row => evidenceQuestion(row) === question.questionId),
          executedQueries: operations.filter(row => row.questionId === question.questionId) })),
        unassignedEvidence: evidence.filter(row => !questionIds.has(evidenceQuestion(row))),
        unassignedQueries: operations.filter(row => !questionIds.has(row.questionId)),
        investigationMetadata: otherInvestigation, queryRecoveryMetadata: otherRecovery },
      { kind: 'historical_investigation_claims', authority: 'past_model_claims_not_current_tool_truth',
        rounds, instruction: 'All prior reasoning is retained for traceability. Evaluate its claims against the question-scoped actual receipts above, rather than copying the old unresolved classification.' },
    ];
  });
}

// Explicit product entry for one independent diagnostic trial. It is not an
// automatic escape from exhausted review limits or a reset of the prior Teach.
export function beginRosterTeachFactProbeV1(state, questionIds) {
  const investigation = state?.investigation;
  const pending = new Set((state?.synthesis?.answers || [])
    .filter(answer => answer.disposition === 'unresolved').map(answer => answer.questionId));
  if (state?.phase !== 'completed' || investigation?.completed !== true
    || investigation.factProbeContinuation || !Array.isArray(questionIds)
    || !questionIds.length || new Set(questionIds).size !== questionIds.length
    || questionIds.some(id => !pending.has(id))) {
    throw Object.assign(Error('ROSTER_TEACH_FACT_PROBE_TRIAL_UNAVAILABLE'),
      { code: 'ROSTER_TEACH_FACT_PROBE_TRIAL_UNAVAILABLE' });
  }
  investigation.factProbeContinuation = { version: ROSTER_TEACH_FACT_PROBE_VERSION,
    startRound: investigation.rounds.length, maximumAdditionalBatches: 3,
    questionIds: [...questionIds], explicitTrialRequest: true,
    historyReset: false, automaticallyAnswered: false, automaticallyAppliedToPlan: false };
  investigation.completed = false;
}

// Discoverability, not a second Rules implementation: retain every domain in
// original order and point back to the complete current receipt. No tactic,
// endpoint, action sequence or achievable arrival is selected by this view.
function currentExperimentActionMenus(receipts) {
  const branches=[];
  for (const receipt of receipts) {
    for (const key of ['queryContext','branchQueryContext']) {
      const context=receipt[key];
      if (!context?.actionSpace) continue;
      branches.push({queryId:receipt.challengeId??receipt.queryId,
        sourceStateHash:context.sourceStateHash,baseStateHash:context.baseStateHash,
        phase:context.phase,activeSideKey:context.activeSideKey,
        actionSpaceHash:context.actionSpace.actionSpaceHash,
        fullContextAt:`fact_probe_tool_executions.currentBatchEvidence[queryId].${key}`,
        parameterDomains:(context.actionSpace.parameterDomains||[]).map((d,index)=>({
          domainId:d.domainId,pieceId:d.pieceId,actionType:d.actionType,
          abilityName:d.abilityName??null,
          maxDistanceMilliInches:d.constraints?.maxDistanceMilliInches??null,
          sourcePath:`${key}.actionSpace.parameterDomains.${index}`})),
        finiteActions:(context.actionSpace.finiteActions||[]).map((a,index)=>({
          actionKey:a.proposal?.actionKey??null,actionType:a.action?.actionType??null,
          sourcePath:`${key}.actionSpace.finiteActions.${index}`})),
        summaryIsNotExecutionEvidence:true});
    }
  }
  return {kind:'current_experiment_action_menus',branches,
    instruction:'These menus are already delivered successful reads. Use the full indicated domain/parameters from the original current receipt for dependent operations; do not inspect the same immutable branch again to discover these actions. A distance allowance is for one action, not an entire multi-action journey. Each Native successor has its own legal menu. No selected endpoint or complete arrival is implied.'};
}

export function isolateRosterTeachFactProbeNodesV1(nodes, archive) {
  const byKind = kind => nodes.find(node => node.kind === kind);
  const frozen = byKind('frozen_plan_and_method');
  const assignment = byKind('current_investigation_assignment');
  const questions = byKind('questions_and_results');
  const current = byKind('canonical_current_query_context');
  const catalog = byKind('current_query_capability_guide');
  if (!frozen?.context || !assignment?.pendingQuestionIds?.length
    || !questions?.agenda || !current?.context || !catalog) {
    throw Object.assign(Error('ROSTER_TEACH_FACT_PROBE_INPUT_INCOMPLETE'),
      { code: 'ROSTER_TEACH_FACT_PROBE_INPUT_INCOMPLETE' });
  }
  const focus = new Set(assignment.pendingQuestionIds);
  const referencedQueries=rosterTeachReferencedQueryIdsV1([...focus],
    [...(questions.investigation?.rounds||[]),questions.investigation?.latestCompletedBatch].filter(Boolean));
  function retain(value) {
    const reference = hash(value);
    archive.set(reference, value);
    return { evidenceObjectHash: reference, fullBodyAvailable: true,
      retrieval: { kind: 'retained_evidence',
        toolRequestJson: JSON.stringify({ receiptHash: reference, path: '' }) } };
  }
  const recovered = (byKind('latest_completed_teach_findings')?.recoveredQueries || [])
    .filter(operation => focus.has(operation.questionId)||referencedQueries.has(operation.queryId));
  const repairHashes=new Set(byKind('dependent_query_window')?.recoveryReceiptHashes||[]);
  const activeRepairs=[...new Map(recovered.filter(operation=>repairHashes.has(operation.result?.receiptHash))
    .map(operation=>[operation.result.receiptHash,operation])).values()];
  if(repairHashes.size&&activeRepairs.length!==repairHashes.size)
    throw Object.assign(Error('ROSTER_TEACH_CURRENT_RECOVERY_EVIDENCE_MISSING'),
      {code:'ROSTER_TEACH_CURRENT_RECOVERY_EVIDENCE_MISSING'});
  const receipts = [...(questions.evidence || []), ...(questions.investigation?.evidence || []),
    ...recovered.map(operation => operation.result).filter(Boolean)];
  const requests = [
    ...questions.agenda.questions.map(q => ({ questionId: q.questionId, queryId: q.questionId,
      request: q.evidenceRequest })),
    ...(questions.investigation?.operations || []), ...recovered,
  ].filter(row => focus.has(row.questionId)||referencedQueries.has(row.queryId)).map(row => ({ questionId: row.questionId,
    queryId: row.queryId, ...(row.originalQueryId ? { originalQueryId: row.originalQueryId } : {}),
    request: row.request }));
  // Historical generation queries have their own addressed lane. Preserve ALL
  // remaining material inline or in a mechanically indexed reader, never select
  // rules by keywords or treat old menus/errors as current Native results.
  const { existingEvidence, queryContext, generationQueryOutcomes, ...sourceContext } = frozen.context;
  const organized=organizeRosterTeachFactEvidenceV1({receipts,requests,
    latestQueryIds:activeRepairs.length?activeRepairs.map(operation=>operation.queryId)
      :questions.investigation?.completedRoundCount===0
      ? questions.agenda.questions.map(question=>question.questionId)
      : questions.investigation?.latestCompletedQueryIds||[],archive});
  const previousBatch=questions.investigation?.latestCompletedBatch;
  const selectedQueries=activeRepairs.length?activeRepairs.map(operation=>({
    questionId:operation.questionId,queryId:operation.queryId,kind:operation.request.kind,
    toolRequestJson:JSON.stringify(operation.request.toolRequest),purpose:operation.publicReason}))
    :(previousBatch?.queries||[]).filter(query=>focus.has(query.questionId)||referencedQueries.has(query.queryId));
  const activeExperiment=selectedQueries.length ? {
    kind:'active_experiment_handoff',version:1,
    previousPublicReason:activeRepairs.length?activeRepairs.map(operation=>operation.publicReason).filter(Boolean).join('\n')
      :previousBatch.publicReason,
    selectedQueries:structuredClone(selectedQueries),
    returnedResults:organized.currentBatchEvidence.map(receipt=>({
      kind:'fact_probe_result_reference',
      queryId:receipt.challengeId??receipt.queryId,receiptHash:receipt.receiptHash,
      status:receipt.status,unknownReasonCode:receipt.unknownReasonCode??null,
      resultLocation:'fact_probe_tool_executions.currentBatchEvidence'})),
    workingIntentIsNotObservedFact:true,mustReconcileBeforeHandoff:true,
    instruction:'This is YOUR latest selected experimental step and its purpose, not an old strategic verdict. Continue the unfinished factual experiment using its actual new results. Update the working intention if the results contradict it; intentions never override Native facts. Multiple dependent steps do not require a committed formal Plan. A claim describing a missing proof is a gap to investigate, not a goal satisfied by repeating that proof is still missing. Do not restart from the original repaired query or end solely because later steps have not yet been executed. A real blocking condition must be supported by the delivered state/contract.'
  } : null;
  return [
    { kind: 'fact_probe_assignment', mode: 'fact_probe', version: ROSTER_TEACH_FACT_PROBE_VERSION,
      pendingQuestionIds: [...focus],
       questionProgressContract: {
         required:'Exactly one questionProgress entry for each assigned question.',
         needs_tool_result:'Use only with an actual query in this batch whose result advances a named factual predicate.',
         routingAuthority:'The Host derives needs_tool_result from actual requested queries and unresolved_handoff from explicit unresolved predicates. Your factual interpretation remains advisory; routing never resolves a fact. Keep all genuine missing predicates, even when partial evidence is established.',
         handoff:'evidence_established / claim_refuted / plan_revision_required / unqueryable_assumption / capability_gap end this question\'s investigation and pass its public reason and actual evidenceQueryIds to synthesis. No more queries for that question in this batch. These statuses do NOT accept a Plan or conceal a tool gap.',
         instruction:'A refuted premise should be handed to Plan/roster revision, not endlessly defended with new queries. An opponent\'s unknown future choice can be an explicit conditional hypothesis, not a demand for prediction. A real missing Native capability remains an engineering gap. Synthesis still audits all original questions and Plan promotion still requires acceptance.',
       },
      task: 'Establish or refute the named factual prerequisites by querying the current Native tools. Do not defend, improve, retain or drop a strategy in this role. The strategic reviewer will interpret the resulting evidence separately.',
      conditions: [
        'A question, scenario label, query purpose or prior model conclusion is a claim, not a Native observation. Identify the actual objects and actions from the returned state/receipt.',
        'Tool availability and legal action availability in one scene are different. Read the complete operation catalog; empty source actionSpace or absence in one phase/side is only a scoped observation.',
        'Choose conditional assumptions, phase, active side and participants from the delivered rules; the Host selects none of them. Use the returned branchIdRef for that exact scene. Never substitute a unit placement for an asset-creation action.',
        'Before declaring a capability unavailable, distinguish a missing tool from untested prerequisites, a Native rejection, and unknowable future choices. A hypothetical experiment can test explicit assumptions without predicting the opponent.',
        'Report only actual observed outcomes. A context read does not prove an action, payment, arrival or created object. Inspect the Native successor after an action before making those claims.',
        'Return existing investigation-format queries or a factual unresolved reason. Public reasoning should explain what the next query establishes, not repeat the old strategic answer. Query plans and genuine uncertainty remain model-owned.',
      ], mutationAuthority: false, canAffectRules: false, trainingTruth: false },
    ...(byKind('dependent_query_window') ? [byKind('dependent_query_window')] : []),
    ...(activeExperiment?[activeExperiment]:[]),
    { kind: 'fact_probe_mutation_boundary', rosterEditAuthority: sourceContext.rosterEditAuthority,
      mayEditRosterOrPlanInThisRole: false,
      experimentAuthority:{scope:'private_conditional_native_branch',
        mayChooseConditionalActions:true,mayChooseConditionalPositions:true,
        mayChooseConditionalOpponentActions:true,mayChainNativeSuccessors:true,
        requiresCommittedPlanChoice:false,mayCommitRosterOrPlan:false,
        mayAlterSourceRoom:false,hostChoosesTactic:false},
      instruction: 'Choose the assumptions and operations needed to test this factual question on private branches, including hypothetical opponent actions or multi-action paths. This is experiment design, NOT committing those choices to the Plan or predicting that the opponent will act that way. The strategy role later decides whether to use the results. Native tools validate each step; a hypothetical placement does not prove arrival history. Missing opponent certainty or an uncommitted Plan choice does not itself prevent conditional queries. Never edit the selected roster, Plan or source room in this role.' },
    catalog,
    { kind: 'fact_probe_questions', questions: questions.agenda.questions,
      boundary: 'These are model-authored questions and assumptions to test, not established tool facts or required tactical answers.' },
    factSourceMaterial(sourceContext,archive),
    current,
    currentExperimentActionMenus(organized.currentBatchEvidence),
    { kind: 'fact_probe_tool_executions',
      ...organized,
      receiptCount: receipts.length,
      fullReceipts: retain(receipts),
      boundary: 'Requests identify the tested assumptions. Receipts identify actual results for that scope only; a failure is not a global tool-unavailability finding.' },
    { kind: 'fact_probe_history_access', fullPriorInput: retain(nodes),
      strategicPlan: retain(frozen.plan), learnedTeachMethod: retain(frozen.framework),
      earlierEvidence: retain(existingEvidence || []),
      ...(generationQueryOutcomes ? {generationQueryOutcomes:retain(generationQueryOutcomes)} : {}),
      ...(questions.investigation?.fullHistory ? { earlierInvestigation: questions.investigation.fullHistory } : {}),
      instruction: 'Use retained_evidence when additional strategic or historical context is needed. generationQueryOutcomes are the original generation-stage requests/results, not the current action menu or current investigation outcomes. All prior conclusions and evidence are preserved; old model prose is not current capability truth.' },
    // Current-attempt protocol feedback is not historical strategy. Preserve the
    // existing structured correction/completion lane rather than silently
    // dropping its exact code, detail and already-paid partial reply.
    ...nodes.filter(node => ['repair_completed_public_reply', 'complete_truncated_readonly_query'].includes(node.kind)),
  ];
}
