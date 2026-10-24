// Investigation completion is not strategic acceptance. The model owns each
// factual disposition; this module only owns the state transition to synthesis.
export const ROSTER_TEACH_QUESTION_DISPOSITIONS_V1 = Object.freeze([
  'needs_tool_result','evidence_established','claim_refuted','plan_revision_required',
  'unqueryable_assumption','capability_gap','unresolved_handoff',
]);

// One model-selected query may establish a shared prerequisite for several
// questions. A literal, unique current-batch queryId is a dependency edge, not
// proof of the answer and not a request to execute that query again.
export function rosterTeachQueriedQuestionIdsV1(output) {
  const queries=output.queries||[];
  const queried=new Set(queries.map(row=>row.questionId));
  const counts=new Map();
  for(const query of queries) if(typeof query.queryId==='string'&&query.queryId)
    counts.set(query.queryId,(counts.get(query.queryId)||0)+1);
  for(const row of output.questionProgress||[]) if((row.evidenceQueryIds||[])
    .some(id=>counts.get(id)===1)) queried.add(row.questionId);
  return queried;
}

export function rosterTeachReferencedQueryIdsV1(questionIds, batches) {
  const focus=new Set(questionIds), ids=new Set();
  for(const batch of batches||[]) {
    const output=batch?.output||batch;
    const current=new Set((output?.queries||[]).map(q=>q.queryId));
    for(const row of output?.questionProgress||[]) if(focus.has(row.questionId))
      for(const id of row.evidenceQueryIds||[]) if(current.has(id)) ids.add(id);
  }
  return ids;
}

// Queries and explicit missing predicates own routing. The model's factual
// interpretation remains public evidence for synthesis, not a transport flag.
// Never clear an unresolved predicate or invent a query to reconcile a label.
export function deriveRosterTeachQuestionProgressV1(value) {
  const output=structuredClone(value),corrections=[];
  const queried=rosterTeachQueriedQuestionIdsV1(output);
  const unresolved=new Set((output.unresolved||[]).map(row=>row.questionId));
  for(const row of output.questionProgress||[]) {
    const derived=queried.has(row.questionId)?'needs_tool_result'
      :unresolved.has(row.questionId) && row.disposition!=='needs_tool_result'
        ?'unresolved_handoff':row.disposition;
    if(derived!==row.disposition) {
      corrections.push({questionId:row.questionId,modelDisposition:row.disposition,
        derivedDisposition:derived,source:queried.has(row.questionId)?'queries':'unresolved',
        factsOrStrategyResolved:false});
      row.disposition=derived;
    }
  }
  return {output,corrections};
}

export function projectRosterTeachQuestionProgressV1(questionIds, rounds) {
  const known = new Set(questionIds), latest = new Map();
  for (const round of rounds || []) {
    if (!round.completed) break;
    for (const entry of round.output?.questionProgress || []) {
      if (known.has(entry.questionId)) latest.set(entry.questionId, structuredClone(entry));
    }
  }
  return {pendingQuestionIds:questionIds.filter(id=>!latest.has(id)
    || latest.get(id).disposition==='needs_tool_result'),
    handoffs:[...latest.values()].filter(entry=>entry.disposition!=='needs_tool_result'),
    planAccepted:false, unresolvedEngineeringClaimsAccepted:false};
}

// An output-format repair runs against the SAME evidence, with no intervening
// Native execution. Dropping an open item while repeating its exact conclusion
// and references is not factual resolution. Keep old paid replies immutable.
export function validateRosterTeachProgressRepairRetentionV1(output, previousOutputs=[]) {
  const remaining=new Set((output.unresolved||[]).map(row=>row.questionId));
  const hidden=new Map();
  for(const previous of previousOutputs)for(const issue of previous?.unresolved||[]) {
    if(remaining.has(issue.questionId))continue;
    const old=previous.questionProgress?.find(row=>row.questionId===issue.questionId);
    const next=output.questionProgress?.find(row=>row.questionId===issue.questionId);
    if(old&&next&&['evidence_established','claim_refuted'].includes(next.disposition)
      && next.publicReason===old.publicReason
      && JSON.stringify(next.evidenceQueryIds)===JSON.stringify(old.evidenceQueryIds)) {
      hidden.set(issue.questionId,issue);
    }
  }
  if(hidden.size) {
    const detail={retainedUnresolved:[...hidden.values()],
      instruction:'This correction removed explicit unresolved predicates but retained the exact same factual reasoning and evidence references. No Native operation occurred inside this format-repair call. Restore those open predicates and give an honest unresolved handoff, or request the dependent experiment; do not manufacture completion by deleting the unresolved list. If the old issue was itself mistaken, explicitly explain the changed factual interpretation with the actual supporting evidence rather than repeating the old unknown conclusion. Original evidence and paid replies stay unchanged.'};
    throw Object.assign(Error(`ROSTER_TEACH_UNRESOLVED_DROPPED_WITHOUT_NEW_BASIS:${JSON.stringify(detail)}`),
      {code:'ROSTER_TEACH_UNRESOLVED_DROPPED_WITHOUT_NEW_BASIS',detail});
  }
}

export function validateRosterTeachQuestionProgressV1(output, questionIds) {
  // Already completed legacy batches remain readable, not retroactively failed.
  // New provider contracts require this field before this semantic check.
  if (output.questionProgress === undefined) return;
  const entries=output.questionProgress, known=new Set(questionIds);
  const queried=rosterTeachQueriedQuestionIdsV1(output);
  const missing=Array.isArray(entries)?entries.filter(row=>known.has(row.questionId)
    && row.disposition==='needs_tool_result' && !queried.has(row.questionId)):[];
  if(missing.length) {
    const detail={questions:missing.map(row=>({questionId:row.questionId,
      intendedNextStep:row.publicReason})),
      instruction:'You identified supported dependent work but supplied no executable query for it. Submit the next actual query for the same question using its current branch and Native contract. If an action needs parameters, first request the existing formation/geometry solver with a delivered domain and your own conditional intent; do not handwrite a receipt. A multi-step experiment need not finish in one batch. Do not turn work not yet executed into a terminal handoff merely to satisfy this check. If the intended step is genuinely blocked or unnecessary, explain that changed interpretation using the actual new evidence. Keep all still-missing facts unresolved; the Host neither selects the action nor claims completion.'};
    throw Object.assign(Error(`ROSTER_TEACH_DEPENDENT_QUERY_MISSING:${JSON.stringify(detail)}`),
      {code:'ROSTER_TEACH_DEPENDENT_QUERY_MISSING',detail});
  }
  const invalid=!Array.isArray(entries) || entries.length!==questionIds.length
    || new Set(entries.map(e=>e.questionId)).size!==questionIds.length
    || entries.some(e=>!known.has(e.questionId)
      || !ROSTER_TEACH_QUESTION_DISPOSITIONS_V1.includes(e.disposition)
      || queried.has(e.questionId)!==(e.disposition==='needs_tool_result'));
  if (invalid) throw Object.assign(Error('ROSTER_TEACH_QUESTION_PROGRESS_INVALID: Return one status for each assigned question. needs_tool_result must have a query in this batch; other statuses hand the question to synthesis and must not repeat its queries. This is not final Plan acceptance.'),
    {code:'ROSTER_TEACH_QUESTION_PROGRESS_INVALID'});
  const unresolved=new Map((output.unresolved||[]).map(row=>[row.questionId,row]));
  const contradictions=entries.filter(row=>unresolved.has(row.questionId)
    && ['evidence_established','claim_refuted'].includes(row.disposition));
  if(contradictions.length) {
    const detail={questionIds:contradictions.map(row=>row.questionId),
      unresolved:contradictions.map(row=>unresolved.get(row.questionId)),
      instruction:'These exact questions are also explicitly unresolved in this reply. Evidence that a result is absent is not an established answer to the requested factual predicate. Partial estimates or one rejected path do not close the whole question. Continue with a dependent conditional experiment if supported; private hypothetical actions/positions and Native successor chains do not require committing a Plan choice or predicting the opponent. Otherwise use the honest unresolved handoff (plan_revision_required, unqueryable_assumption or capability_gap), with the exact remaining predicate and reason. Such a handoff is not final Plan acceptance. Preserve actual successful evidence and do not erase a genuine missing predicate merely to pass this consistency check.'};
    throw Object.assign(Error(`ROSTER_TEACH_QUESTION_UNRESOLVED_CONTRADICTION:${JSON.stringify(detail)}`),
      {code:'ROSTER_TEACH_QUESTION_UNRESOLVED_CONTRADICTION',detail});
  }
}
