import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { ARMY_BUILDER_ROSTER_VERDICT_SCHEMA } from
  "./army-builder-query-port-v1.mjs";

export const ROSTER_BUDGET_BRANCH_QUERY_V1_SCHEMA =
  "starcraft_tmg_roster_budget_branch_query_v1";

function fail(code) { throw new Error(code); }
function clone(value) { return structuredClone(value); }
function menuCost(value) {
  if (value === null || value === undefined || value === "") return null;
  const cost = Number(value);
  return Number.isSafeInteger(cost) && cost >= 0 ? cost : null;
}
function upgradeCost(upgrade, compositionKind) {
  const costs = upgrade.mineralCostByComposition;
  if (Array.isArray(costs)) {
    const row = costs.find((entry) => entry?.compositionKind === compositionKind);
    return menuCost(row?.mineralCost);
  }
  return menuCost(costs?.[compositionKind]);
}
function seal(body) {
  return Object.freeze({ ...body,
    receiptHash: hashStarcraftTmgContract(body) });
}

// This is a Rules-backed neighbourhood query, not a strategy ranker or a
// proof that no exact-budget list exists. Every returned branch is independently
// checked by the same complete-army Builder used for final roster admission.
export function queryRosterBudgetBranchesV1(input = {}) {
  const port = input.armyBuilderPort;
  if (typeof port?.evaluateRosterCandidate !== "function"
    || typeof port?.enumerateArmyBuildingChoices !== "function") {
    fail("ROSTER_BUDGET_BRANCH_BUILDER_REQUIRED");
  }
  const current = clone(input.candidateInput);
  if (!current || !Array.isArray(current.units)
    || !Number.isSafeInteger(current.mineralBudget)) {
    fail("ROSTER_BUDGET_BRANCH_CANDIDATE_INVALID");
  }
  const sourceCandidateHash = hashStarcraftTmgContract(current);
  if (input.expectedSourceCandidateHash !== undefined
    && input.expectedSourceCandidateHash !== sourceCandidateHash) {
    fail("ROSTER_BUDGET_BRANCH_STALE_CANDIDATE");
  }
  // A page is deliberately bounded; the cursor exposes every later mutation.
  // The menu cost orders inspection, but only the full Builder can admit one.
  const limit = input.maximumEvaluations === undefined ? 24
    : Number(input.maximumEvaluations);
  const startOffset = input.startOffset === undefined ? 0
    : Number(input.startOffset);
  const maximumMutationDepth = input.maximumMutationDepth === undefined ? 5
    : Number(input.maximumMutationDepth);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 256
    || !Number.isSafeInteger(startOffset) || startOffset < 0
    || !Number.isSafeInteger(maximumMutationDepth)
    || maximumMutationDepth < 1 || maximumMutationDepth > 6) {
    fail("ROSTER_BUDGET_BRANCH_LIMIT_INVALID");
  }
  const baseline = port.evaluateRosterCandidate(current);
  if (baseline.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA) {
    fail("ROSTER_BUDGET_BRANCH_BASELINE_NOT_RULES_LEGAL");
  }
  const shortfall = current.mineralBudget - baseline.summary.mineralSpent;
  const menu = port.enumerateArmyBuildingChoices({
    factionRecordKey: current.factionRecordKey,
    scaleId: current.scaleId,
    mineralBudget: current.mineralBudget,
  });
  if (input.expectedMenuReceiptHash !== undefined
    && input.expectedMenuReceiptHash !== menu.receiptHash) {
    fail("ROSTER_BUDGET_BRANCH_STALE_MENU");
  }
  const unitByKey = new Map(menu.unitCandidates.map((entry) => (
    [entry.recordKey, entry])));
  const tacticalByKey = new Map(menu.tacticalCandidates.map((entry) => (
    [entry.recordKey, entry])));
  // Menu-derived slot arithmetic changes inspection order only. It never
  // admits or rejects a branch: the complete Rules audit below remains the
  // sole authority, including for branches whose menu projection is unknown.
  const slotOverflowAdvisory = (draft) => {
    const starting = menu.faction.startingArmySlots;
    if (!starting || typeof starting !== "object") return null;
    const available = { ...starting };
    for (const key of draft.tacticalCardRecordKeys) {
      const grants = tacticalByKey.get(key)?.armySlotsAdded;
      if (!grants || typeof grants !== "object") return null;
      for (const [kind, count] of Object.entries(grants)) {
        if (!Number.isSafeInteger(count)) return null;
        available[kind] = (available[kind] || 0) + count;
      }
    }
    const used = {};
    for (const unit of draft.units) {
      const menuUnit = unitByKey.get(unit.recordKey);
      const option = menuUnit?.compositionOptions.find((entry) => (
        entry.compositionKind === unit.compositionKind));
      const kind = menuUnit?.armySlotType;
      const occupied = option?.occupiedArmySlots;
      if (!kind || !Number.isSafeInteger(occupied)) return null;
      used[kind] = (used[kind] || 0) + occupied;
    }
    return Object.entries(used).reduce((sum, [kind, count]) => (
      sum + Math.max(0, count - (available[kind] || 0))), 0);
  };
  const existingIds = new Set(current.units.map((unit) => unit.unitInstanceId));
  const candidates = [];
  const add = (kind, subjectId, detailId, expectedDelta, transform) => {
    const branchId = `${kind}:${subjectId}:${detailId}`;
    candidates.push({ branchId, kind, subjectId, detailId,
      expectedDelta, transform,
      steps: [{ mutationKind: kind, subjectId, detailId }] });
  };
  for (const unit of [...current.units].sort((a, b) => (
    a.unitInstanceId.localeCompare(b.unitInstanceId)))) {
    const menuUnit = unitByKey.get(unit.recordKey);
    if (!menuUnit) continue;
    const presentComposition = menuUnit.compositionOptions.find((option) => (
      option.compositionKind === unit.compositionKind));
    for (const option of menuUnit.compositionOptions) {
      if (option.compositionKind === unit.compositionKind) continue;
      add("change_composition", unit.unitInstanceId,
        option.compositionProfileId,
        menuCost(option.mineralCost) === null
          || menuCost(presentComposition?.mineralCost) === null
          ? null : option.mineralCost - presentComposition.mineralCost,
        (draft) => {
          const selected = draft.units.find((entry) => (
            entry.unitInstanceId === unit.unitInstanceId));
          selected.compositionKind = option.compositionKind;
          delete selected.compositionProfileId;
          delete selected.startingModelIds;
        });
    }
    const selectedNames = new Set(unit.upgrades.map((entry) => (
      entry.upgradeName)));
    for (const upgrade of menuUnit.purchasableUpgrades) {
      if (selectedNames.has(upgrade.upgradeName)) continue;
      add("add_upgrade", unit.unitInstanceId,
        upgrade.purchasableUpgradeProfileId,
        upgradeCost(upgrade, unit.compositionKind), (draft) => {
          draft.units.find((entry) => (
            entry.unitInstanceId === unit.unitInstanceId)).upgrades.push({
            upgradeName: upgrade.upgradeName,
          });
        });
    }
  }
  for (const menuUnit of menu.unitCandidates) {
    for (const option of menuUnit.compositionOptions) {
      const suffix = hashStarcraftTmgContract({ recordKey: menuUnit.recordKey,
        compositionProfileId: option.compositionProfileId }).slice(0, 12);
      let instanceId = `${current.sideKey}-branch-${suffix}`;
      let duplicate = 2;
      while (existingIds.has(instanceId)) {
        instanceId = `${current.sideKey}-branch-${suffix}-${duplicate++}`;
      }
      add("add_unit", menuUnit.recordKey, option.compositionProfileId,
        menuCost(option.mineralCost),
        (draft) => {
          draft.units.push({ unitInstanceId: instanceId,
            recordKey: menuUnit.recordKey,
            compositionKind: option.compositionKind, upgrades: [] });
        });
    }
  }
  const singleStepCount = candidates.length;
  // The arithmetic generator explores only additive, positive-cost menu
  // mutations. Composition replacements and unknown-price operations remain
  // available as single steps and can be queried again after an Agent choice.
  // A bounded combination set is a navigation aid, never an impossibility
  // proof; all surviving paths still need the complete Rules audit below.
  const additive = candidates.filter((entry) => entry.kind !== "change_composition"
    && Number.isSafeInteger(entry.expectedDelta)
    && entry.expectedDelta > 0 && entry.expectedDelta <= shortfall)
    .sort((a, b) => a.branchId.localeCompare(b.branchId));
  const MAX_COMBINATION_PATHS = 20_000;
  let combinationGenerationTruncated = false;
  const addCombinations = (from, path, sum) => {
    if (path.length >= 2) {
      const steps = path.flatMap((entry) => entry.steps);
      const branchId = `compound:${hashStarcraftTmgContract(
        steps).slice(0, 20)}`;
      candidates.push({ branchId, kind: "compound", subjectId: null,
        detailId: null, expectedDelta: sum, steps,
        transform: (draft) => path.forEach((entry) => entry.transform(draft)) });
      if (candidates.length - singleStepCount >= MAX_COMBINATION_PATHS) {
        combinationGenerationTruncated = true;
        return;
      }
    }
    if (path.length >= maximumMutationDepth) return;
    for (let index = from; index < additive.length; index += 1) {
      const next = additive[index];
      if (sum + next.expectedDelta > shortfall) continue;
      addCombinations(index + 1, [...path, next], sum + next.expectedDelta);
      if (combinationGenerationTruncated) return;
    }
  };
  if (maximumMutationDepth > 1 && shortfall > 0) {
    addCombinations(0, [], 0);
  }
  // Inspect projected slot-fitting branches before arithmetic-near branches.
  // The saved 1100/2000 draft had 24/24 closest-price paths rejected by
  // Rules; none of those rejections gave the Agent a usable branch. Both
  // menu projections are advisory ordering signals, never a strategy score,
  // legality ruling, or exact-budget feasibility certificate.
  for (const candidate of candidates) {
    const draft = clone(current);
    candidate.transform(draft);
    candidate.menuSlotOverflowAdvisory = slotOverflowAdvisory(draft);
  }
  candidates.sort((a, b) => {
    const distance = (entry) => entry.expectedDelta === null
      ? Number.POSITIVE_INFINITY : Math.abs(shortfall - entry.expectedDelta);
    const slotOverflow = (entry) => entry.menuSlotOverflowAdvisory === null
      ? Number.POSITIVE_INFINITY : entry.menuSlotOverflowAdvisory;
    return slotOverflow(a) - slotOverflow(b)
      || distance(a) - distance(b)
      || a.steps.length - b.steps.length
      || a.branchId.localeCompare(b.branchId);
  });
  if (startOffset > candidates.length) {
    fail("ROSTER_BUDGET_BRANCH_OFFSET_INVALID");
  }
  const branches = [];
  let evaluated = 0;
  for (const candidate of candidates.slice(startOffset)) {
    if (evaluated >= limit) break;
    const draft = clone(current);
    candidate.transform(draft);
    const verdict = port.evaluateRosterCandidate(draft);
    evaluated += 1;
    if (verdict.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA) continue;
    const mineralSpent = verdict.summary.mineralSpent;
    branches.push({
      branchId: candidate.branchId,
      mutationKind: candidate.kind,
      subjectId: candidate.subjectId,
      detailId: candidate.detailId,
      steps: candidate.steps,
      candidateInput: draft,
      candidateHash: hashStarcraftTmgContract(draft),
      rulesAuditResultHash: verdict.auditResultHash,
      mineralSpent,
      mineralShortfall: current.mineralBudget - mineralSpent,
      exactBudget: mineralSpent === current.mineralBudget,
      menuDerivedMineralDelta: candidate.expectedDelta,
      menuSlotOverflowAdvisory: candidate.menuSlotOverflowAdvisory,
    });
  }
  const nextOffset = startOffset + evaluated;
  return seal({
    schema: ROSTER_BUDGET_BRANCH_QUERY_V1_SCHEMA,
    sourceCandidateHash,
    sourceRulesAuditResultHash: baseline.auditResultHash,
    menuReceiptHash: menu.receiptHash,
    mineralBudget: current.mineralBudget,
    sourceMineralSpent: baseline.summary.mineralSpent,
    sourceMineralShortfall: shortfall,
    branches,
    totalOneStepMutations: singleStepCount,
    totalGeneratedMutationPaths: candidates.length,
    maximumMutationDepth,
    combinationGenerationTruncated,
    startOffset,
    nextOffset: nextOffset < candidates.length ? nextOffset : null,
    nextPage: nextOffset < candidates.length ? {
      startOffset: nextOffset,
      expectedSourceCandidateHash: sourceCandidateHash,
      expectedMenuReceiptHash: menu.receiptHash,
    } : null,
    evaluatedMutationCount: evaluated,
    truncated: nextOffset < candidates.length,
    inspectionOrder: "menu_slot_overflow_then_delta_distance_to_shortfall_then_branch_id",
    menuDeltaIsAdvisory: true,
    menuSlotOverflowIsAdvisory: true,
    exactBudgetImpossibilityClaimed: false,
    strategyRankingPerformed: false,
    providerCalls: 0,
    trainingTruth: false,
  });
}
