import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { queryRosterBudgetBranchesV1 } from
  "./roster-budget-branch-query-v1.mjs";
import { searchRosterExactBudgetRepairsV1 } from
  "./roster-exact-budget-repair-search-v1.mjs";
import { describeIterativeRosterCapabilitiesV1, inspectIterativeRosterQueryAdmissionV1 } from
  './iterative-roster-capabilities-v1.mjs';
import { collectRosterTeachScenarioRecordsV1 } from './roster-teach-framework-v1.mjs';
import { createRosterTeachEvidencePortV1 } from './roster-teach-evidence-port-v1.mjs';

// Callers first verify the attachment's candidate/map binding. Extend the same
// Native receipt ledger used by generation, review and structured Plan edits.
export function mergeIterativeSelectionQueryReceiptsV1(receipts = [], evidence) {
  const merged = new Map(receipts.map(r => [r.receiptHash, r]));
  for (const {receipt} of evidence?.queries || []) {
    const existing = merged.get(receipt.receiptHash);
    if (existing && hashStarcraftTmgContract(existing) !== hashStarcraftTmgContract(receipt))
      throw Object.assign(new Error('ROSTER_SELECTION_RECEIPT_IDENTITY_CONFLICT'),
        {code:'ROSTER_SELECTION_RECEIPT_IDENTITY_CONFLICT'});
    if (!existing) merged.set(receipt.receiptHash,structuredClone(receipt));
  }
  return [...merged.values()];
}

function retainedFormalTeachFeedback(state) {
  // Frozen context belongs to this immutable iterative session. A later Plan
  // revision may reuse its facts, but another army/session may not.
  return [...(state.teachFeedbackHistory || []), state.teachFeedback].filter(row =>
    row && row.candidateHash === state.currentCandidate?.candidateHash
    && row.sourceStrategy?.iterativeSessionId === state.sessionId);
}

function retainedTeachScenes(state) {
  const candidateHash = state.currentCandidate?.candidateHash;
  if (!candidateHash) return [];
  const contextHash = hashStarcraftTmgContract(state.frozenContext);
  return [...(state.draftTeachSnapshots || []).filter(snapshot =>
    snapshot.candidateHash === candidateHash
    && hashStarcraftTmgContract(snapshot.context.frozenContext) === contextHash)
    .flatMap(snapshot => collectRosterTeachScenarioRecordsV1(snapshot.state).map(row =>
      ({ ...row, sourceSnapshotId: snapshot.snapshotId }))),
    ...retainedFormalTeachFeedback(state).flatMap(row =>
      collectRosterTeachScenarioRecordsV1(row.teachFramework || {}))]
    .filter(row => row.receipt?.sourceReceipt?.branchStateHash);
}

function retainedSelectionScenes(state) {
  const candidateHash = state.currentCandidate?.candidateHash;
  return (state.observations || []).filter(row => candidateHash
    && row.query?.kind === 'scenario_branch' && row.query.candidateHash === candidateHash
    && row.receipt?.branchStateHash);
}

function nativeSelectionReceipt(row) {
  const saved = verifiedReceipt(row.receipt);
  if (!saved.sourceReceiptHash) return saved;
  // Remove only the selector's known transport envelope. The original Native
  // receipt hash is checked, not replaced or recalculated into a new signature.
  const { receiptHash: _delivery, sourceReceiptHash, capabilityOutcome: _outcome, ...native } = saved;
  return verifiedReceipt({ ...native, receiptHash: sourceReceiptHash });
}

// Carry source-owned evidence across selection -> formal Teach, not merely the
// model's account of it. Reuse the SAME scenario representation consumed by the
// evidence port; no placement solving, query replay or rewritten native receipt.
export function collectIterativeRosterEvidenceV1(state) {
  const alias = hash => `selector-scene-${hash}`;
  const scenes = new Map(retainedTeachScenes(state).map(row =>
    [row.receipt.sourceReceipt.branchStateHash, structuredClone(row)]));
  for (const row of retainedSelectionScenes(state)) {
    const native = nativeSelectionReceipt(row);
    const spec = JSON.parse(row.query.argumentsJson);
    scenes.set(native.branchStateHash, { request: { kind: 'scenario', toolRequest: {
      spec, ...(native.branchKind === 'native_action' ? { argumentsJson: row.query.argumentsJson } : {}),
    } }, receipt: { status: native.resultStatus, sourceReceipt: native } });
  }
  const scenarios = [...scenes].map(([key, row]) => {
    const native = row.receipt.sourceReceipt;
    row.challengeId = alias(key);
    if (native.parentStateHash !== native.sourceStateHash)
      row.request.toolRequest.branchIdRef = alias(native.parentStateHash);
    else delete row.request.toolRequest.branchIdRef;
    return row;
  });
  const queries = new Map();
  for (const row of state.observations || []) {
    if (row.query?.kind !== 'scene_query'
      || row.query.candidateHash !== state.currentCandidate?.candidateHash) continue;
    const receipt = nativeSelectionReceipt(row);
    queries.set(receipt.receiptHash, { query: structuredClone(row.query), receipt });
  }
  for (const feedback of retainedFormalTeachFeedback(state)) {
    for (const saved of feedback.evidence?.toolReceipts || []) {
      // Carry original Native facts, including unknown outcomes. The formal
      // session's map summaries and model interpretations are not Native queries.
      if (!saved.sourceStateHash || !saved.schema?.startsWith('starcraft_tmg_pregame_lab_')) continue;
      const receipt = verifiedReceipt(saved);
      if (!queries.has(receipt.receiptHash)) queries.set(receipt.receiptHash, {
        query: { kind: 'retained_formal_teach_query', queryId: receipt.queryId,
          candidateHash: feedback.candidateHash, teachSessionId: feedback.teachSessionId },
        receipt: structuredClone(receipt),
      });
    }
  }
  const body = { schema: 'starcraft_tmg_roster_selection_evidence_v1',
    candidateHash: state.currentCandidate.candidateHash,
    mapHash: state.frozenContext.mapHash,
    frozenContextHash: hashStarcraftTmgContract(state.frozenContext),
    scenarios, queries: [...queries.values()], trainingTruth: false };
  return { ...body, evidenceHash: hashStarcraftTmgContract(body) };
}

export function projectIterativeRosterEvidenceV1(evidence) {
  if (!evidence) return null;
  return { evidenceHash: evidence.evidenceHash,
    availableScenes: evidence.scenarios.map(row => ({ branchIdRef: row.challengeId,
      branchStateHash: row.receipt.sourceReceipt.branchStateHash,
      sourceStateHash: row.receipt.sourceReceipt.sourceStateHash,
      status: row.receipt.sourceReceipt.resultStatus,
      placements: row.receipt.sourceReceipt.hypotheticalPlacements,
      placementAssessment: row.receipt.sourceReceipt.hypotheticalPlacementAssessment })),
    queries: evidence.queries.map(row => ({ ...structuredClone(row),
      referenceId: `selectionref-${row.receipt.receiptHash}` })),
    scope: 'Saved hypothetical positions and query results, NOT actual arrival, legal movement or guaranteed opponent behavior. Use branchIdRef to query the identical scene; never substitute the off-board source.' };
}

function restoreTeachScene(lab, records, branchStateHash) {
  const byHash = new Map(records.map(row => [row.receipt.sourceReceipt.branchStateHash, row]));
  if (!byHash.has(branchStateHash)) return false;
  // Question labels may be reused in later Teach rounds. Private aliases are
  // keyed by the saved state, not by a model label. All original receipts and
  // action/spec/source guards remain unchanged; no scenario is re-executed.
  const alias = value => `selector-scene-${value}`;
  const native = createRosterTeachEvidencePortV1(lab, { retainedScenarios: [...byHash].map(([key, row]) => {
    const parent = row.receipt.sourceReceipt.parentStateHash;
    const request = structuredClone(row.request);
    if (request.toolRequest.branchIdRef) request.toolRequest.branchIdRef = alias(parent);
    return { ...row, challengeId: alias(key), request };
  }) });
  native.restoreScenarioBranch(alias(branchStateHash));
  return true;
}

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

function verifiedReceipt(receipt) {
  if (!receipt || typeof receipt !== "object"
    || receipt.receiptHash !== hashStarcraftTmgContract(
      Object.fromEntries(Object.entries(receipt).filter(([key]) => (
        key !== "receiptHash"))))) {
    fail("ITERATIVE_ROSTER_TOOL_RECEIPT_INVALID");
  }
  return receipt;
}

function currentCandidate(query, state) {
  const current = state?.currentCandidate;
  if (!current || query.candidateHash !== current.candidateHash) {
    fail("ITERATIVE_ROSTER_TOOL_STALE_CANDIDATE");
  }
  return current;
}

export function createIterativeRosterToolPortV1({ armyBuilderPort,
  mapEvidencePort, createSceneLaboratory } = {}) {
  if (typeof armyBuilderPort?.evaluateRosterCandidate !== "function"
    || typeof armyBuilderPort?.enumerateArmyBuildingChoices !== "function"
    || typeof mapEvidencePort?.summarizeMap !== "function"
    || typeof mapEvidencePort?.evaluateRosterRoute !== "function") {
    fail("ITERATIVE_ROSTER_TOOL_PORT_MISSING");
  }
  const scenes = new Map();
  function selectedScene(query, state) {
    const current = currentCandidate(query, state);
    const key = `${state.sessionId}:${current.candidateHash}`;
    if (!scenes.has(key)) {
      if (typeof createSceneLaboratory !== "function") fail("ITERATIVE_ROSTER_SCENE_TOOLS_UNAVAILABLE");
      const lab = createSceneLaboratory({ candidateInput: current.input,
        setup: structuredClone(state.frozenContext) });
      scenes.set(key, { lab, restoredTeachScenes: new Set() });
    }
    const scene = scenes.get(key);
    const selection = new Map(retainedSelectionScenes(state).map(row => [row.receipt.branchStateHash, row]));
    const restoring = new Set();
    const restore = branchHash => {
      if (scene.restoredTeachScenes.has(branchHash)) return;
      if (restoring.has(branchHash)) fail('ITERATIVE_ROSTER_RETAINED_SCENE_CYCLE');
      const row = selection.get(branchHash);
      if (!row) {
        if (restoreTeachScene(scene.lab, retainedTeachScenes(state), branchHash))
          scene.restoredTeachScenes.add(branchHash);
        return;
      }
      restoring.add(branchHash);
      const native = nativeSelectionReceipt(row);
      const parent = native.parentStateHash;
      const source = scene.lab.labDescriptor().sourceStateHash;
      if (parent !== source) restore(parent);
      const base = parent === source ? { kind: 'source' } : { kind: 'branch', branchStateHash: parent };
      const restored = native.branchKind === 'native_action'
        ? scene.lab.restoreNativeActionBranch({ receipt: native, base })
        : scene.lab.restoreHypotheticalBranch({ receipt: native,
          spec: JSON.parse(row.query.argumentsJson), base });
      if (restored.branchStateHash !== branchHash) fail('ITERATIVE_ROSTER_RETAINED_SCENE_CHANGED');
      scene.restoredTeachScenes.add(branchHash);
      restoring.delete(branchHash);
    };
    if (query.branchStateHash) {
      restore(query.branchStateHash);
    }
    return scene.lab;
  }
  const describeCapabilities = state => {
    const result = describeIterativeRosterCapabilitiesV1(state,
      { sceneAvailable: typeof createSceneLaboratory === 'function' });
    // Versioned at a settled decision boundary, so paid v15 requests keep
    // their original prompt projection during exact reply recovery.
    if (Number(state.modelContextVersion || 0) < 16) return result;
    const unique = new Map(retainedTeachScenes(state).map(row =>
      [row.receipt.sourceReceipt.branchStateHash, row]));
    return { ...result, retainedTeachScenes: [...unique.values()].map(row => ({
      branchStateHash: row.receipt.sourceReceipt.branchStateHash,
      sourceSnapshotId: row.sourceSnapshotId, sourceQueryId: row.challengeId,
      sourceStateHash: row.receipt.sourceReceipt.sourceStateHash,
      originalScenarioStatus: row.receipt.sourceReceipt.resultStatus,
      originalEvidenceStatus: row.receipt.status,
      unresolvedPlacementUnits: (row.receipt.sourceReceipt.hypotheticalPlacementAssessment?.units || [])
        .filter(unit => unit.resultStatus === 'unknown')
        .map(unit => ({ pieceId: unit.pieceId, reason: unit.unknownReason })),
      branchKind: row.receipt.sourceReceipt.branchKind,
    })), retainedSelectionScenes: [...new Map(retainedSelectionScenes(state)
      .map(row => [row.receipt.branchStateHash, row])).values()].map(row => ({
      branchStateHash: row.receipt.branchStateHash, sourceRequestKey: row.requestKey,
      sourceStateHash: row.receipt.sourceStateHash, parentStateHash: row.receipt.parentStateHash,
      originalScenarioStatus: row.receipt.resultStatus, branchKind: row.receipt.branchKind,
      placements: (row.receipt.hypotheticalPlacements || []).map(p => ({
        pieceId: p.pieceId, xInches: p.xInches, yInches: p.yInches })),
      unresolvedPlacementUnits: (row.receipt.hypotheticalPlacementAssessment?.units || [])
        .filter(unit => unit.resultStatus === 'unknown')
        .map(unit => ({ pieceId: unit.pieceId, reason: unit.unknownReason })),
    })), retainedTeachSceneUse: 'retainedTeachScenes and retainedSelectionScenes are both available. Use their exact branchStateHash values with scene_context or scene_query to inspect the SAME saved hypothetical scene. A newly created scene needs its own hash, not an older scene hash. Restoration checks source, army, Rules, parent and positions; it does not replay actions, re-solve formations or prove arrival. An unknown/partial original scenario remains unknown/partial. Empty branchStateHash queries the initial source, whose army starts in reserves.' };
  };
  const execute = async (query, state) => {
      if (["scene_context", "scene_query", "scenario_branch"].includes(query?.kind)) {
        const lab = selectedScene(query, state);
        try {
          const base = query.branchStateHash
            ? { kind: "branch", branchStateHash: query.branchStateHash } : { kind: "source" };
          if (query.kind === "scene_context") {
            const body = { status: "advisory_reference_scene", candidateHash: query.candidateHash,
              queryContext: lab.describeQueryContext({ base, seatKey: state.frozenContext.sideKey }),
              mutationAuthority: false, trainingTruth: false };
            return { ...body, receiptHash: hashStarcraftTmgContract(body) };
          }
          if (query.kind === "scenario_branch") return verifiedReceipt(lab.runScenarioBranch({
            branchId: `roster-hypothesis-${state.sessionId}-${state.revision}`,
            base, spec: JSON.parse(query.argumentsJson) }));
          return verifiedReceipt(await lab.queryScene({ queryId: `roster-scene-${state.sessionId}-${state.revision}`,
            base, seatKey: state.frozenContext.sideKey, queryKind: query.queryKind,
            argumentsJson: query.argumentsJson }));
        } catch (error) {
          // Preserve the source-owned correction contract. Previously the
          // adapter discarded it and gave the Agent an unrepairable unknown.
          if (Number(state.modelContextVersion || 0) >= 11) throw error;
          const body = { status: "unknown", unknownReason: String(error?.message || error).split(":")[0],
            candidateHash: query.candidateHash, queryKind: query.queryKind || null,
            mutationAuthority: false, trainingTruth: false };
          return { ...body, receiptHash: hashStarcraftTmgContract(body) };
        }
      }
      if (query?.kind === "candidate_menu") {
        const receipt = verifiedReceipt(
          armyBuilderPort.enumerateArmyBuildingChoices({
            factionRecordKey: query.factionRecordKey,
            scaleId: query.scaleId,
            mineralBudget: state.mineralBudget,
          }));
        if (receipt.faction.recordKey !== state.frozenContext.factionRecordKey
          || receipt.scale.scaleId !== state.frozenContext.scaleId) {
          fail("ITERATIVE_ROSTER_MENU_CONTEXT_MISMATCH");
        }
        return { status: "eligibility_menu_not_legality",
          receiptHash: receipt.receiptHash,
          faction: receipt.faction, scale: receipt.scale,
          tacticalCandidates: receipt.tacticalCandidates,
          unitCandidates: receipt.unitCandidates,
          bounds: receipt.bounds };
      }
      if (query?.kind === "budget_branches") {
        const current = currentCandidate(query, state);
        const receipt = verifiedReceipt(queryRosterBudgetBranchesV1({
          armyBuilderPort,
          candidateInput: current.input,
          expectedSourceCandidateHash: current.candidateHash,
          startOffset: query.startOffset ?? 0,
          // A paid model query must not synchronously audit dozens of full
          // armies. Four exact branches plus menu-only capacity directions
          // give useful evidence without turning one turn into minutes of
          // speculative Builder work.
          maximumEvaluations: Math.min(query.maximumEvaluations ?? 4, 4),
          maximumMutationDepth: query.maximumMutationDepth ?? 3,
        }));
        return { status: "bounded_rules_branches",
          receiptHash: receipt.receiptHash,
          exactBudgetImpossibilityClaimed: false,
          sourceCandidateHash: receipt.sourceCandidateHash,
          sourceMineralShortfall: receipt.sourceMineralShortfall,
          branches: receipt.branches, nextPage: receipt.nextPage,
          capacityDirections: receipt.capacityDirections,
          capacityDirectionsAreMenuOnly: true,
          truncated: receipt.truncated,
          ...(Number(state.modelContextVersion || 0) >= 11 ? { searchScope: receipt.searchScope } : {}),
          strategyRankingPerformed: false };
      }
      if (query?.kind === "exact_budget_repairs") {
        const current = currentCandidate(query, state);
        const receipt = verifiedReceipt(searchRosterExactBudgetRepairsV1({
          armyBuilderPort,
          sourceCandidateInput: current.input,
          maximumMatches: 4,
          maximumBuilderEvaluations: 12,
          maximumMenuNodes: 250_000,
        }));
        return { status: "builder_certified_exact_budget_options",
          receiptHash: receipt.receiptHash,
          sourceCandidateHash: receipt.sourceCandidateHash,
          sourceMineralSpent: receipt.sourceMineralSpent,
          sourceMineralShortfall: receipt.sourceMineralShortfall,
          matches: receipt.matches,
          menuPathsVisited: receipt.menuPathsVisited,
          builderEvaluations: receipt.builderEvaluations,
          searchTruncated: receipt.searchTruncated,
          ...(Number(state.modelContextVersion || 0) >= 11 ? { searchScope: receipt.searchScope } : {}),
          exactBudgetImpossibilityClaimed: false,
          strategyRankingPerformed: false };
      }
      if (query?.kind === "map_summary") {
        const receipt = verifiedReceipt(mapEvidencePort.summarizeMap({
          queryId: `iterative-map-summary-${state.sessionId}` }));
        if (receipt.mapBinding?.roomFreezeHash
          !== state.frozenContext.mapHash
          || receipt.mapBinding?.officialSourceSnapshotHash
            !== state.frozenContext.sourceHash) {
          fail("ITERATIVE_ROSTER_MAP_BINDING_MISMATCH");
        }
        return { status: receipt.resultStatus === "certified_map_summary"
          ? "certified" : "unknown", receiptHash: receipt.receiptHash,
        mapBinding: receipt.mapBinding, battlefield: receipt.battlefield,
        missionMarkers: receipt.missionMarkers,
        terrain: receipt.terrain,
        unknownReason: receipt.unknownReason };
      }
      if (query?.kind === "map_route") {
        const current = currentCandidate(query, state);
        const receipt = verifiedReceipt(mapEvidencePort.evaluateRosterRoute({
          queryId: `iterative-route-${state.sessionId}-${current.candidateHash}`,
          sideId: current.input.sideKey,
          candidateInput: current.input,
        }));
        const binding = receipt.mapBinding;
        if (receipt.candidateInputHash !== current.candidateHash
          || binding?.roomFreezeHash !== state.frozenContext.mapHash
          || binding?.officialSourceSnapshotHash
            !== state.frozenContext.sourceHash
          || hashStarcraftTmgContract({
            missionRecordKey: binding?.missionRecordKey,
            deploymentRecordKey: binding?.deploymentRecordKey,
          }) !== state.frozenContext.taskHash) {
          fail("ITERATIVE_ROSTER_MAP_BINDING_MISMATCH");
        }
        return { status: receipt.resultStatus
            === "certified_base_clearance_audit" ? "certified" : "unknown",
          receiptHash: receipt.receiptHash,
          candidateHash: current.candidateHash,
          mapBinding: binding, accessByBase: receipt.accessByBase,
          unresolvedUnits: receipt.unresolvedUnits,
          exactMoveOrDeploymentLegality: false,
          unknownReason: receipt.unknownReason };
      }
      fail("ITERATIVE_ROSTER_QUERY_UNSUPPORTED");
  };
  const observed = (query, receipt, capabilityOutcome) => {
    const body = { ...receipt, sourceReceiptHash: receipt.receiptHash || null,
      capabilityOutcome: { ...capabilityOutcome, queryKind: query.kind,
        liveMutationPerformed: false } };
    delete body.receiptHash;
    return { ...body, receiptHash: hashStarcraftTmgContract(body) };
  };
  return Object.freeze({ describeCapabilities,
    query: async (query, state) => {
      if (Number(state.modelContextVersion || 0) < 11) return execute(query, state);
      // exact_budget_repairs is host-owned, not a model-advertised command.
      const admission = query.kind === 'exact_budget_repairs'
        ? (!state.currentCandidate || query.candidateHash !== state.currentCandidate.candidateHash
          ? { category: 'prerequisite_missing', code: 'CURRENT_CANDIDATE_REQUIRED' } : null)
        : inspectIterativeRosterQueryAdmissionV1(query, state, describeCapabilities(state));
      if (admission) return observed(query, { status: 'unknown', unknownReason: admission.code },
        { ...admission, questionAnswered: false });
      try {
        const receipt = await execute(query, state);
        const unknown = receipt.status === 'unknown' || receipt.resultStatus === 'unknown';
        const emptySearch = receipt.searchScope && !(receipt.matches || receipt.branches || []).length;
        return observed(query, receipt, { category: unknown ? 'unresolved_result'
          : emptySearch ? 'bounded_search_no_match' : 'answered',
          questionAnswered: !unknown && !emptySearch,
          code: receipt.unknownReason || (emptySearch ? 'NO_MATCH_WITHIN_REPORTED_SCOPE' : null),
          ...(receipt.searchScope ? { searchScope: receipt.searchScope,
            globalImpossibilityProved: false } : {}) });
      } catch (error) {
        // Authority/binding failures remain fatal, never converted into a
        // usable result. Only source-declared correctable input and parse
        // errors are safe to return for structured repair.
        const inputError = error.queryRepair?.correctable === true || error instanceof SyntaxError;
        if (!inputError) {
          const code = String(error.code || error.message).split(':')[0];
          error.capabilityQuery = structuredClone(query);
          error.capabilityReceipt = observed(query, { status: 'error', unknownReason: code },
            { category: 'execution_failure', code, questionAnswered: false });
          throw error;
        }
        const code = error instanceof SyntaxError ? 'QUERY_ARGUMENTS_JSON_INVALID'
          : String(error.code || error.message).split(':')[0];
        return observed(query, { status: 'unknown', unknownReason: code,
          queryRepair: error.queryRepair ? structuredClone(error.queryRepair) : {
            correctable: true, originalQueryNotAnswered: true,
            sourceContract: 'iterative_roster_query_transport_v1',
            failureTargets: [{ requestPointer: '/argumentsJson',
              correctionInstruction: 'Send valid JSON for the selected native contract, keeping the intended scenario.' }] } },
        { category: 'invalid_arguments', code, questionAnswered: false });
      }
    },
  });
}
