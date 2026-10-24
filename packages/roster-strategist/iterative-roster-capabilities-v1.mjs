// One source for the selecting Agent's advertised prerequisites and admission.
// This is not another Rules engine: native tools/Builder still own verdicts.
export function iterativeRosterPhaseAuthorityV1() {
  return { kind: 'roster_plan_selection_v1', army: 'editable', plan: 'editable',
    liveRoom: 'read_only', rulesAuthority: 'official_army_builder_only',
    partialCandidateAllowed: true, finalExactBudgetRequired: true };
}

// Evidence-driven phase boundary, not a task-wide call/iteration allowance.
// After answering the current draft critique once, more prose-only revisions
// cannot keep selection open forever. finish may itself contain a better Plan;
// it submits to arrival/full Teach/source review, and never approves the Plan.
export function projectIterativeRosterDraftHandoffV1(state) {
  if (Number(state.modelContextVersion || 0) < 12 || state.planAlignment
    || state.teachFeedback?.disposition === 'pending'
    || state.currentCandidate?.mineralSpent !== state.mineralBudget
    || !state.plan?.mapEvidenceHash) return null;
  const previous = state.draftTeachSnapshots?.findLast(row => row.status === 'completed'
    && row.candidateHash === state.currentCandidate.candidateHash);
  if (!previous) return null;
  const evidenceRevision = Math.max(previous.createdAtRevision,
    ...state.iterations.filter(row => row.decisionKind === 'query' && row.toolReceiptHashes?.length)
      .map(row => row.revision));
  const revision = state.iterations.findLast(row => row.decisionKind === 'revise_plan'
    && row.revision > evidenceRevision);
  if (!revision) return null;
  return { kind: 'submit_or_investigate', evidenceRevision,
    acceptedPlanRevision: revision.revision, availableDecisionKinds: ['query', 'propose', 'finish'],
    finalAcceptance: false, outstandingIssuesPreserved: true,
    instruction: 'You have already revised this exact-budget provisional Plan after the current draft critique. Do not paraphrase the same Plan again without new evidence. Choose query for a specific remaining factual question, propose to change the army with the Plan, or finish to submit your complete current/revised Plan to Rules-audited arrival and final Teach/source review. finish is NOT approval or room entry and may include all remaining Plan improvements. Unknown factual claims are not accepted by this handoff. A new evidence query reopens Plan-only editing; formal review can reopen army and Plan. Strategic choices and risk remain yours.' };
}

const definitions = {
  candidate_menu: { scope: 'Eligibility and printed costs; not complete army legality.' },
  map_summary: { scope: 'Frozen map facts, not a movement or scoring verdict.' },
  budget_branches: { candidate: true,
    scope: 'Bounded Builder-checked alterations plus unverified card capacity directions. An empty page is not global infeasibility.' },
  map_route: { candidate: true,
    scope: 'Without argumentsJson/branchStateHash: whole-army route audit by official base profile across map targets. With explicit argumentsJson or branchStateHash: forwarded unchanged to scene_query map.route_access for the requested unit/base/target/scene. These are base-clearance witnesses, not exact movement, arrival timing or marker control. Never treat an aggregate audit as a specific unit-position query.' },
  scene_context: { candidate: true, scene: true,
    scope: 'Read actual instance IDs and native action/query contracts for this reference scene.' },
  scene_query: { candidate: true, scene: true,
    scope: 'Use the named native query contract; legality, probability and marker qualification answer different questions.' },
  scenario_branch: { candidate: true, scene: true,
    scope: 'Create an explicitly hypothetical branch; never mutate a live room.' },
  teach_evidence: { teach: true, scope: 'Retrieve retained Teach evidence, not a new simulation.' },
};

export function describeIterativeRosterCapabilitiesV1(state, { sceneAvailable = false } = {}) {
  const queries = Object.fromEntries(Object.entries(definitions).map(([kind, spec]) => {
    const availability = spec.scene && !sceneAvailable ? 'unsupported'
      : spec.candidate && !state.currentCandidate || spec.teach && !state.teachFeedback
        && !(Number(state.modelContextVersion || 0) >= 12 && state.draftTeachFeedback)
        ? 'prerequisite_missing' : 'available';
    return [kind, { availability, scope: spec.scope,
      ...(spec.candidate ? { candidateHash: state.currentCandidate?.candidateHash || null,
        prerequisite: 'A CURRENT Builder-legal candidate is required; exact budget is NOT required.' } : {}),
      ...(spec.scene && !sceneAvailable ? { reason: 'SCENE_LABORATORY_NOT_INSTALLED' } : {}),
      ...(spec.teach ? { prerequisite: 'Retained Teach feedback must exist.' } : {}) }];
  }));
  return { schemaVersion: 'iterative_roster_capabilities_v1', queries,
    availableQueryKinds: Object.keys(queries).filter(kind => queries[kind].availability === 'available'),
    candidateHash: state.currentCandidate?.candidateHash || null,
    missingCapabilityPolicy: 'Record the exact question, query, reason and native repair. Do not replace unknown with invented evidence.' };
}

export function inspectIterativeRosterQueryAdmissionV1(query, state, capabilities) {
  const spec = capabilities.queries[query.kind];
  if (!spec) return { category: 'unsupported', code: 'QUERY_KIND_NOT_INSTALLED' };
  if (spec.availability !== 'available') return { category: spec.availability,
    code: spec.reason || (query.kind === 'teach_evidence' ? 'TEACH_EVIDENCE_REQUIRED' : 'CURRENT_CANDIDATE_REQUIRED') };
  if (definitions[query.kind].candidate && query.candidateHash !== spec.candidateHash) {
    return { category: 'prerequisite_missing', code: 'CURRENT_CANDIDATE_REQUIRED' };
  }
  if (query.kind === 'candidate_menu' && (query.factionRecordKey !== state.frozenContext.factionRecordKey
    || query.scaleId !== state.frozenContext.scaleId)) {
    return { category: 'invalid_arguments', code: 'MENU_CONTEXT_MISMATCH' };
  }
  return null;
}

// Derive a small monitor from the durable query journal, rather than another
// mutable counter/database that could disagree after recovery.
export function projectIterativeRosterCapabilityMonitorV1(observations = []) {
  const entries = observations.flatMap(row => {
    const direct = row.receipt?.capabilityOutcome ? [{ requestKey: row.requestKey,
      query: row.receipt.originalQuery || row.query,
      receiptHash: row.receipt.receiptHash, ...row.receipt.capabilityOutcome }] : [];
    return [...direct, ...(row.receipt?.diagnostics?.ignoredQueries || [])
      .filter(entry => entry.capabilityOutcome).map(entry => ({ requestKey: row.requestKey,
        query: entry.query, receiptHash: row.receipt.receiptHash, ...entry.capabilityOutcome }))];
  });
  const latestByQuery = new Map();
  for (const entry of entries) latestByQuery.set(JSON.stringify(entry.query), entry);
  return { recordedQueries: entries.length,
    outstanding: [...latestByQuery.values()].filter(entry => entry.questionAnswered === false),
    legacyUnclassifiedUnknowns: observations.filter(row => !row.receipt?.capabilityOutcome
      && (row.receipt?.status === 'unknown' || row.receipt?.resultStatus === 'unknown'))
      .map(row => ({ query: row.query, receiptHash: row.receipt.receiptHash,
        reason: row.receipt.unknownReason || null, classification: 'not_yet_diagnosed' })) };
}
