import {generateRosterMixedBudgetCandidatesV1} from './roster-budget-mixed-candidates-v1.mjs';
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { ARMY_BUILDER_ROSTER_VERDICT_SCHEMA,ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1 } from
  "./army-builder-query-port-v1.mjs";

export const ROSTER_BUDGET_BRANCH_QUERY_V1_SCHEMA =
  "starcraft_tmg_roster_budget_branch_query_v1";
export const ROSTER_BUDGET_CURRENT_GENERATION_POLICY = 'mixed_breadth_first_v4';
export const ROSTER_BUDGET_BRANCH_QUERY_VERSION = '1.1.0';
export const ROSTER_BUDGET_GENERATION_DESCRIPTION_V1 = 'mixed_breadth_first_v4 for new finite searches: combines existing-unit size changes and optional upgrades with new units and their dependent upgrades, within maximumMutationDepth and a bounded 20000-path beam. Menu costs/slots order inspection only; every returned branch is Native-audited. It does not rank strategy or prove impossibility. v1/v2/v3 preserve their old candidate populations; omitted policy retains legacy_depth_first_v1. Start a new policy at offset0; continue only its own nextPage. Use candidateEdits for explicit removals/replacements before this finite fill query. preserveUnitIds freezes specified baseline units; excludedNewUnitRecordKeys prevents replenishing specified unit types. These user/model choices restrict search, not Rules legality or strategy rank.';

export const ROSTER_BUDGET_BRANCH_BOUNDS_SCHEMA_V1=Object.freeze({type:'object',required:[],properties:{
 preserveUnitIds:{type:'array',items:{type:'string',minLength:1}},excludedNewUnitRecordKeys:{type:'array',items:{type:'string',minLength:1}},
 maximumEvaluations:{type:'integer',minimum:1,maximum:256},startOffset:{type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER},
 maximumMutationDepth:{type:'integer',minimum:1,maximum:6},generationPolicy:{type:'string',enum:['legacy_depth_first_v1','breadth_first_v2','breadth_first_v3','mixed_breadth_first_v4']}
}});

// Execution, capability projection and observation reuse share these defaults.
// No parameter or prose purpose adds another mutation family to this search.
export function normalizeRosterBudgetBranchBoundsV1(input={}) {
  const maximumEvaluations=input.maximumEvaluations===undefined?24:Number(input.maximumEvaluations);
  const startOffset=input.startOffset===undefined?0:Number(input.startOffset);
  const maximumMutationDepth=input.maximumMutationDepth===undefined?5:Number(input.maximumMutationDepth);
  const generationPolicy=input.generationPolicy??'legacy_depth_first_v1';
  if(!ROSTER_BUDGET_BRANCH_BOUNDS_SCHEMA_V1.properties.generationPolicy.enum.includes(generationPolicy))
    fail('ROSTER_BUDGET_BRANCH_GENERATION_POLICY_INVALID');
  if(!Number.isSafeInteger(maximumEvaluations)||maximumEvaluations<1||maximumEvaluations>256
    ||!Number.isSafeInteger(startOffset)||startOffset<0
    ||!Number.isSafeInteger(maximumMutationDepth)||maximumMutationDepth<1||maximumMutationDepth>6)
    fail('ROSTER_BUDGET_BRANCH_LIMIT_INVALID');
  const selections={};
  for(const key of ['preserveUnitIds','excludedNewUnitRecordKeys']){
    const values=input[key]??[];if(!Array.isArray(values)||values.some(v=>typeof v!=='string'||!v.trim()))fail('ROSTER_BUDGET_BRANCH_SEARCH_SELECTION_INVALID');
    selections[key]=[...new Set(values)].sort();
  }
  return {maximumEvaluations,startOffset,maximumMutationDepth,generationPolicy,...selections};
}
export function rosterBudgetBranchSearchScopeV1(input={}) {
  const {generationPolicy,...bounds}=normalizeRosterBudgetBranchBoundsV1(input);
  return {kind:'bounded_mutation_page',
    includedOperations:['change_composition','add_upgrade','add_unit'],
    compoundOperations:generationPolicy==='mixed_breadth_first_v4'?'size_changes_and_dependent_additions':'positive_cost_additions_only',
    excludedOperations:['remove_unit','remove_upgrade','replace_tactical_card'],
    cardCapacityDirectionsAreNotCertifiedBranches:true,bounds,
    emptyResultMeaning:'No legal branch in this evaluated page; other pages and complete roster redesign remain possible.'};
}

function fail(code) { throw new Error(code); }
function clone(value) { return structuredClone(value); }
export function projectRosterBudgetBranchBaselineRepairV1({candidateInput,baselineAudit=null}={}){
  return {correctable:true,sourceContract:'native_builder_branch_legal_baseline_v1',
    originalQueryNotAnswered:true,reasonCode:'ROSTER_BUDGET_BRANCH_BASELINE_NOT_RULES_LEGAL',
    candidateInput:clone(candidateInput),baselineAudit:clone(baselineAudit),
    candidateInputContract:clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1),
    instruction:'builder_branches is a neighbourhood query around a Native-LEGAL baseline, not a constructor from an empty/invalid army. The baseline may be a legal partial-budget army; it need not already spend the full 2000. Choose an explicit starting candidate using the exact Builder menu and candidateInputContract, audit it, then query its budget branches. Preserve the current strategic question and existing successful work. Missing candidate identities/upgrades are input addressing, not a Rules illegality verdict. A genuinely illegal baseline remains illegal; this repair does not admit it or choose units/cards/upgrades for you. An older retained error without baselineAudit did not expose its exact audit: do not invent one.'};
}
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
  // Retained unversioned cursors keep their original candidate population.
  // New product discovery opts into breadth-first coverage explicitly.
  const {maximumEvaluations:limit,startOffset,maximumMutationDepth,generationPolicy,preserveUnitIds,excludedNewUnitRecordKeys}=
    normalizeRosterBudgetBranchBoundsV1(input);
  const baseline = port.evaluateRosterCandidate(current);
  if (baseline.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA) {
    const code='ROSTER_BUDGET_BRANCH_BASELINE_NOT_RULES_LEGAL';
    throw Object.assign(Error(code),{code,detail:{baselineAudit:clone(baseline)},
      queryRepair:projectRosterBudgetBranchBaselineRepairV1({candidateInput:current,baselineAudit:baseline})});
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
  if(preserveUnitIds.some(id=>!current.units.some(u=>u.unitInstanceId===id))
    ||excludedNewUnitRecordKeys.some(key=>!menu.unitCandidates.some(u=>u.recordKey===key)))fail('ROSTER_BUDGET_BRANCH_SEARCH_SELECTION_UNKNOWN');
  const unitByKey = new Map(menu.unitCandidates.map((entry) => (
    [entry.recordKey, entry])));
  const tacticalByKey = new Map(menu.tacticalCandidates.map((entry) => (
    [entry.recordKey, entry])));
  // v3 consumes the SAME complete Native audit that admitted the baseline.
  // Profile-ID and name input forms must not become different selections.
  // Old explicit policies retain their population/cursors; no saved page moves.
  const nativeSelections = ['breadth_first_v3','mixed_breadth_first_v4'].includes(generationPolicy)
    ? new Map((baseline.audit?.units ?? []).map(unit => [unit.unitInstanceId, unit])) : null;
  if (nativeSelections && (nativeSelections.size !== current.units.length
    || current.units.some(unit => {
      const selected = nativeSelections.get(unit.unitInstanceId);
      return selected?.recordKey !== unit.recordKey
        || !selected.unitCompositionResult?.compositionProfileId
        || !Array.isArray(selected.selectedUpgrades);
    }))) fail('ROSTER_BUDGET_NATIVE_SELECTION_MISSING');
  const selectedComposition = (unit, menuUnit) => nativeSelections
    ? menuUnit?.compositionOptions.find(option => option.compositionProfileId
      === nativeSelections.get(unit.unitInstanceId).unitCompositionResult.compositionProfileId)
    : menuUnit?.compositionOptions.find(option => option.compositionKind === unit.compositionKind);
  // Menu-derived slot arithmetic changes inspection order only. It never
  // admits or rejects a branch: the complete Rules audit below remains the
  // sole authority, including for branches whose menu projection is unknown.
  const slotTotals = () => {
    const starting = menu.faction.startingArmySlots;
    if (!starting || typeof starting !== "object") return null;
    const available = { ...starting };
    for (const key of current.tacticalCardRecordKeys) {
      const grants = tacticalByKey.get(key)?.armySlotsAdded;
      if (!grants || typeof grants !== "object") return null;
      for (const [kind, count] of Object.entries(grants)) {
        if (!Number.isSafeInteger(count)) return null;
        available[kind] = (available[kind] || 0) + count;
      }
    }
    const used = {};
    for (const unit of current.units) {
      const menuUnit = unitByKey.get(unit.recordKey);
      const option = selectedComposition(unit, menuUnit);
      const kind = menuUnit?.armySlotType;
      const occupied = option?.occupiedArmySlots;
      if (!kind || !Number.isSafeInteger(occupied)) return null;
      used[kind] = (used[kind] || 0) + occupied;
    }
    return { available, used };
  };
  const baselineSlots = slotTotals();
  // Structural capacity is often the real obstacle to spending a large
  // shortfall. Expose menu-derived card changes separately from Rules-legal
  // nearby branches: the Agent can redesign its list, while the complete
  // Builder still judges any subsequent proposal.
  const capacityDirections = [];
  if (baselineSlots) {
    const chosenCards = new Set(current.tacticalCardRecordKeys);
    const fits = (available, unit, option) =>
      (baselineSlots.used[unit.armySlotType] ?? 0) + option.occupiedArmySlots
        <= (available[unit.armySlotType] || 0);
    for (const tactical of menu.tacticalCandidates) {
      if (chosenCards.has(tactical.recordKey)) continue;
      for (const replacedCardRecordKey of [null,
        ...current.tacticalCardRecordKeys]) {
        const replaced = replacedCardRecordKey
          ? tacticalByKey.get(replacedCardRecordKey) : null;
        const available = { ...baselineSlots.available };
        for (const [kind, count] of Object.entries(
          tactical.armySlotsAdded || {})) {
          available[kind] = (available[kind] || 0) + count
            - (replaced?.armySlotsAdded?.[kind] || 0);
        }
        const newlyFittingUnits = menu.unitCandidates.flatMap((unit) =>
          unit.compositionOptions.filter((option) =>
            !fits(baselineSlots.available, unit, option)
              && fits(available, unit, option)).map((option) => ({
            recordKey: unit.recordKey,
            compositionKind: option.compositionKind,
            mineralCost: menuCost(option.mineralCost),
            armySlotType: unit.armySlotType,
            occupiedArmySlots: option.occupiedArmySlots,
          })));
        if (!newlyFittingUnits.length) continue;
        capacityDirections.push({
          change: replacedCardRecordKey ? "replace_tactical_card"
            : "add_tactical_card",
          tacticalCardRecordKey: tactical.recordKey,
          replacedCardRecordKey,
          availableArmySlotsAfterMenuProjection: available,
          newlyFittingUnits,
          legal: "not_rules_audited",
        });
      }
    }
  }
  const slotOverflowAdvisory = (steps) => {
    if (!baselineSlots) return null;
    const { available } = baselineSlots;
    const used = { ...baselineSlots.used };
    for (const step of steps) {
      if (step.mutationKind === "add_upgrade") continue;
      let kind;
      let delta;
      if (step.mutationKind === "add_unit") {
        const unit = unitByKey.get(step.subjectId);
        const option = unit?.compositionOptions.find((entry) => (
          entry.compositionProfileId === step.detailId));
        kind = unit?.armySlotType;
        delta = option?.occupiedArmySlots;
      } else if (step.mutationKind === "change_composition") {
        const selected = current.units.find((entry) => (
          entry.unitInstanceId === step.subjectId));
        const unit = unitByKey.get(selected?.recordKey);
        const before = selected ? selectedComposition(selected, unit) : null;
        const after = unit?.compositionOptions.find((entry) => (
          entry.compositionProfileId === step.detailId));
        kind = unit?.armySlotType;
        delta = Number(after?.occupiedArmySlots)
          - Number(before?.occupiedArmySlots);
      } else return null;
      if (!kind || !Number.isSafeInteger(delta)) return null;
      used[kind] = (used[kind] || 0) + delta;
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
    if(preserveUnitIds.includes(unit.unitInstanceId))continue;
    const menuUnit = unitByKey.get(unit.recordKey);
    if (!menuUnit) continue;
    const presentComposition = selectedComposition(unit, menuUnit);
    for (const option of menuUnit.compositionOptions) {
      if (nativeSelections ? option.compositionProfileId === presentComposition?.compositionProfileId
        : option.compositionKind === unit.compositionKind) continue;
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
    const selectedNames = new Set((nativeSelections
      ? nativeSelections.get(unit.unitInstanceId).selectedUpgrades : unit.upgrades).map((entry) => (
      entry.upgradeName)));
    for (const upgrade of menuUnit.purchasableUpgrades) {
      if (selectedNames.has(upgrade.upgradeName)) continue;
      add("add_upgrade", unit.unitInstanceId,
        upgrade.purchasableUpgradeProfileId,
        upgradeCost(upgrade, nativeSelections ? presentComposition?.compositionKind : unit.compositionKind), (draft) => {
          draft.units.find((entry) => (
            entry.unitInstanceId === unit.unitInstanceId)).upgrades.push({
            upgradeName: upgrade.upgradeName,
          });
        });
    }
  }
  for (const menuUnit of menu.unitCandidates) {
    if(excludedNewUnitRecordKeys.includes(menuUnit.recordKey))continue;
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
  let singleStepCount = candidates.length;
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
  const addCompound = (path, sum) => {
      const steps = path.flatMap((entry) => entry.steps);
      const branchId = `compound:${hashStarcraftTmgContract(
        steps).slice(0, 20)}`;
      candidates.push({ branchId, kind: "compound", subjectId: null,
        detailId: null, expectedDelta: sum, steps,
        transform: (draft) => path.forEach((entry) => entry.transform(draft)) });
      if (candidates.length - singleStepCount >= MAX_COMBINATION_PATHS) {
        combinationGenerationTruncated = true;
      }
  };
  const addCombinations = (from, path, sum) => {
    if (path.length >= 2) addCompound(path, sum);
    if (combinationGenerationTruncated) return;
    if (path.length >= maximumMutationDepth) return;
    for (let index = from; index < additive.length; index += 1) {
      const next = additive[index];
      if (sum + next.expectedDelta > shortfall) continue;
      addCombinations(index + 1, [...path, next], sum + next.expectedDelta);
      if (combinationGenerationTruncated) return;
    }
  };
  if (generationPolicy!=='mixed_breadth_first_v4' && maximumMutationDepth > 1 && shortfall > 0) {
    if (generationPolicy === 'legacy_depth_first_v1') addCombinations(0, [], 0);
    else {
      // Cover every affordable shallow combination before spending the finite
      // population on deeper prefixes. No faction/unit preference or strategy
      // score is added; the same complete Rules audit still admits branches.
      let frontier = [{ from: 0, path: [], sum: 0 }];
      for (let depth = 1; depth <= maximumMutationDepth && !combinationGenerationTruncated; depth += 1) {
        const nextFrontier = [];
        for (const node of frontier) {
          for (let index = node.from; index < additive.length; index += 1) {
            const entry = additive[index], sum = node.sum + entry.expectedDelta;
            if (sum > shortfall) continue;
            const path = [...node.path, entry];
            if (path.length >= 2) addCompound(path, sum);
            if (combinationGenerationTruncated) break;
            if (depth < maximumMutationDepth) nextFrontier.push({ from: index + 1, path, sum });
          }
          if (combinationGenerationTruncated) break;
        }
        frontier = nextFrontier;
      }
    }
  }
  let mixedGenerationScope=null;
  if(generationPolicy==='mixed_breadth_first_v4'){
    const mixed=generateRosterMixedBudgetCandidatesV1({current,menu,nativeSelections,maximumMutationDepth,shortfall,
      slotOverflowAdvisory,menuCost,upgradeCost,maximumPopulation:MAX_COMBINATION_PATHS,preserveUnitIds,excludedNewUnitRecordKeys});
    candidates.splice(0,candidates.length,...mixed.candidates);singleStepCount=mixed.oneStepCount;
    combinationGenerationTruncated=mixed.truncated;mixedGenerationScope=mixed.scope;
  }
  const generationCoverage = { compoundCount: 0, upgradeOnlyCompounds: 0, byDepth: {} };
  for (const candidate of candidates.slice(singleStepCount)) {
    generationCoverage.compoundCount += 1;
    generationCoverage.byDepth[candidate.steps.length] = (generationCoverage.byDepth[candidate.steps.length] || 0) + 1;
    if (candidate.steps.every(step => step.mutationKind === 'add_upgrade')) generationCoverage.upgradeOnlyCompounds += 1;
  }
  // Inspect projected slot-fitting branches before arithmetic-near branches.
  // The saved 1100/2000 draft had 24/24 closest-price paths rejected by
  // Rules; none of those rejections gave the Agent a usable branch. Both
  // menu projections are advisory ordering signals, never a strategy score,
  // legality ruling, or exact-budget feasibility certificate.
  for (const candidate of candidates) {
    candidate.menuSlotOverflowAdvisory = slotOverflowAdvisory(candidate.steps);
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
  const branches = [], rejectedBranches = [], rejectionGroups = new Map();
  let evaluated = 0;
  for (const candidate of candidates.slice(startOffset)) {
    if (evaluated >= limit) break;
    const draft = clone(current);
    candidate.transform(draft);
    const verdict = port.evaluateRosterCandidate(draft);
    evaluated += 1;
    if (verdict.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA) {
      // A rejection is useful source evidence, not an unexplained absence.
      // Keep the exact Builder receipt and mutation; never turn it into a
      // legal branch, a guessed repair, or a global impossibility claim.
      rejectedBranches.push({ branchId: candidate.branchId,
        mutationKind: candidate.kind, steps: candidate.steps,
        candidateHash: hashStarcraftTmgContract(draft), builderVerdict: clone(verdict) });
      const reason = { status: verdict.status ?? 'unknown',
        rejectionKind: verdict.rejectionKind ?? 'unrecognized_builder_outcome',
        rulesErrorCode: verdict.rulesErrorCode ?? null, rulesErrorDetail: verdict.rulesErrorDetail ?? null,
        portErrorCode: verdict.portErrorCode ?? null, portErrorDetail: verdict.portErrorDetail ?? null };
      const key = JSON.stringify(reason), group = rejectionGroups.get(key) ?? { ...reason, count: 0, branchIds: [] };
      group.count += 1; group.branchIds.push(candidate.branchId); rejectionGroups.set(key, group);
      continue;
    }
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
    queryImplementationVersion:ROSTER_BUDGET_BRANCH_QUERY_VERSION,
    portVersion:baseline.portVersion,
    builderBundleHash:baseline.unitCompositionUpgradeDataBundleHash,
    sourceCandidateHash,
    sourceRulesAuditResultHash: baseline.auditResultHash,
    menuReceiptHash: menu.receiptHash,
    mineralBudget: current.mineralBudget,
    sourceMineralSpent: baseline.summary.mineralSpent,
    sourceMineralShortfall: shortfall,
    generationPolicy,
    generationCoverage,
    ...(mixedGenerationScope?{mixedGenerationScope}:{}),
    searchScope:rosterBudgetBranchSearchScopeV1({maximumEvaluations:limit,startOffset,maximumMutationDepth,generationPolicy,preserveUnitIds,excludedNewUnitRecordKeys}),
    branches,
    rejectedBranches,
    rejectionSummary: { total: rejectedBranches.length, byReason: [...rejectionGroups.values()],
      instruction: 'These are exact rejections of this evaluated page. Use their actual constraints to choose a different permitted draft/mutation or a necessary new query; pagination is not mandatory merely because nextPage exists. No strategy ranking, silent repair or proof of global impossibility is supplied.' },
    capacityDirections,
    capacityDirectionsAreMenuOnly: true,
    totalOneStepMutations: singleStepCount,
    totalGeneratedMutationPaths: candidates.length,
    maximumMutationDepth,
    combinationGenerationTruncated,
    startOffset,
    nextOffset: nextOffset < candidates.length ? nextOffset : null,
    nextPage: nextOffset < candidates.length ? {
      startOffset: nextOffset,preserveUnitIds:clone(preserveUnitIds),excludedNewUnitRecordKeys:clone(excludedNewUnitRecordKeys),
      expectedSourceCandidateHash: sourceCandidateHash,
      expectedMenuReceiptHash: menu.receiptHash,
      ...(generationPolicy !== 'legacy_depth_first_v1' ? { generationPolicy, maximumMutationDepth, maximumEvaluations: limit } : {}),
    } : null,
    alternateGenerationQueries: generationPolicy === 'legacy_depth_first_v1' && combinationGenerationTruncated
      ? [{ generationPolicy: ROSTER_BUDGET_CURRENT_GENERATION_POLICY, preserveUnitIds:clone(preserveUnitIds),excludedNewUnitRecordKeys:clone(excludedNewUnitRecordKeys),startOffset: 0, maximumMutationDepth, maximumEvaluations: limit,
        expectedSourceCandidateHash: sourceCandidateHash, expectedMenuReceiptHash: menu.receiptHash,
        meaning: 'A NEW finite population with shallow mutation-family coverage, not continuation of the old cursor, a strategy ranking or exhaustive proof.' }] : [],
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
