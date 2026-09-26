import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { ARMY_BUILDER_ROSTER_VERDICT_SCHEMA,
  verifyArmyBuilderRosterVerdictV1 } from
  "./army-builder-query-port-v1.mjs";

export const ROSTER_EXACT_BUDGET_REPAIR_SEARCH_V1 =
  "starcraft_tmg_roster_exact_budget_repair_search_v1";

const clone = (value) => structuredClone(value);
const integer = (value) => value === null || value === undefined
  || value === "" ? null : Number.isSafeInteger(Number(value))
    ? Number(value) : null;

function packageChoices(menu) {
  const choices = [];
  for (const unit of menu.unitCandidates) {
    for (const composition of unit.compositionOptions) {
      const base = integer(composition.mineralCost);
      if (base === null || !Number.isSafeInteger(
        composition.occupiedArmySlots)) continue;
      const upgrades = unit.purchasableUpgrades.flatMap((upgrade) => {
        const cost = integer(upgrade.mineralCostByComposition
          ?.[composition.compositionKind]);
        return upgrade.specialistAssignmentRequired === true
          || cost === null ? [] : [{ upgradeName: upgrade.upgradeName,
            mineralCost: cost }];
      });
      if (upgrades.length > 12) continue;
      for (let mask = 0; mask < 2 ** upgrades.length; mask += 1) {
        const selected = upgrades.filter((_, index) =>
          (mask & (1 << index)) !== 0);
        choices.push({ recordKey: unit.recordKey,
          compositionKind: composition.compositionKind,
          armySlotType: unit.armySlotType,
          occupiedArmySlots: composition.occupiedArmySlots,
          mineralCost: base + selected.reduce((sum, entry) =>
            sum + entry.mineralCost, 0),
          upgrades: selected.map((entry) => ({
            upgradeName: entry.upgradeName })) });
      }
    }
  }
  return choices.sort((a, b) => b.mineralCost - a.mineralCost
    || a.recordKey.localeCompare(b.recordKey)
    || a.compositionKind.localeCompare(b.compositionKind)
    || a.upgrades.length - b.upgrades.length);
}

function cardAdditions(menu, selectedCards, gasBudget) {
  const cardByKey = new Map(menu.tacticalCandidates.map((entry) =>
    [entry.recordKey, entry]));
  const selectedGas = selectedCards.reduce((sum, key) =>
    sum + (integer(cardByKey.get(key)?.vespeneGasCost) ?? gasBudget + 1), 0);
  const available = menu.tacticalCandidates.filter((entry) =>
    !selectedCards.includes(entry.recordKey));
  const combinations = [[]];
  const visit = (start, chosen, gas) => {
    if (chosen.length >= 3) return;
    for (let index = start; index < available.length; index += 1) {
      const cost = integer(available[index].vespeneGasCost);
      if (cost === null || selectedGas + gas + cost > gasBudget) continue;
      const next = [...chosen, available[index].recordKey];
      combinations.push(next);
      visit(index + 1, next, gas + cost);
    }
  };
  visit(0, [], 0);
  return combinations.sort((a, b) => a.length - b.length
    || a.join("|").localeCompare(b.join("|")));
}

function freeArmySlots(menu, candidate, addedCards) {
  const available = { ...menu.faction.startingArmySlots };
  const cardByKey = new Map(menu.tacticalCandidates.map((entry) =>
    [entry.recordKey, entry]));
  for (const key of [...candidate.tacticalCardRecordKeys, ...addedCards]) {
    const card = cardByKey.get(key);
    if (!card) return null;
    for (const [kind, count] of Object.entries(card.armySlotsAdded || {})) {
      available[kind] = (available[kind] || 0) + count;
    }
  }
  const unitByKey = new Map(menu.unitCandidates.map((entry) =>
    [entry.recordKey, entry]));
  for (const selected of candidate.units) {
    const unit = unitByKey.get(selected.recordKey);
    const composition = unit?.compositionOptions.find((entry) =>
      entry.compositionKind === selected.compositionKind);
    if (!unit?.armySlotType || !Number.isSafeInteger(
      composition?.occupiedArmySlots)) return null;
    available[unit.armySlotType] = (available[unit.armySlotType] || 0)
      - composition.occupiedArmySlots;
  }
  return Object.values(available).some((count) => count < 0)
    ? null : available;
}

// Menu arithmetic prunes candidates only. Each returned roster has also
// passed the complete official Builder, including card-family restrictions,
// upgrade interactions, slot limits, gas, and exact mineral spending.
export function searchRosterExactBudgetRepairsV1(input = {}) {
  const port = input.armyBuilderPort;
  if (typeof port?.evaluateRosterCandidate !== "function"
    || typeof port?.enumerateArmyBuildingChoices !== "function") {
    throw new Error("ROSTER_EXACT_REPAIR_BUILDER_REQUIRED");
  }
  const source = clone(input.sourceCandidateInput);
  if (!source?.units?.length || !Array.isArray(
    source.tacticalCardRecordKeys)) {
    throw new Error("ROSTER_EXACT_REPAIR_SOURCE_INVALID");
  }
  const baseline = port.evaluateRosterCandidate(source);
  if (baseline.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA) {
    throw new Error("ROSTER_EXACT_REPAIR_SOURCE_NOT_LEGAL");
  }
  verifyArmyBuilderRosterVerdictV1(baseline);
  const shortfall = source.mineralBudget - baseline.summary.mineralSpent;
  const menu = port.enumerateArmyBuildingChoices({
    factionRecordKey: source.factionRecordKey,
    scaleId: source.scaleId,
    mineralBudget: source.mineralBudget,
  });
  const ratio = menu.scale.vespeneRatio;
  const gasBudget = Math.floor(source.mineralBudget * ratio.numerator
    / ratio.denominator);
  const cardSets = cardAdditions(menu, source.tacticalCardRecordKeys,
    gasBudget);
  const packages = packageChoices(menu).filter((entry) =>
    entry.mineralCost > 0 && entry.mineralCost <= shortfall);
  const maxMatches = Math.min(Math.max(integer(input.maximumMatches) ?? 3, 1),
    8);
  const maxBuilderEvaluations = Math.min(Math.max(
    integer(input.maximumBuilderEvaluations) ?? 12, 1), 32);
  const maxMenuNodes = Math.min(Math.max(integer(input.maximumMenuNodes)
    ?? 250_000, 1), 2_000_000);
  const maxAddedUnits = Math.min(Math.max(integer(input.maximumAddedUnits)
    ?? 6, 1), 8);
  const matches = [];
  const matchedShapes = new Set();
  let menuNodes = 0;
  let builderEvaluations = 0;
  let exactMenuPaths = 0;
  let truncated = false;
  const existingIds = new Set(source.units.map((entry) =>
    entry.unitInstanceId));

  for (const addedCards of cardSets) {
    if (matches.length >= maxMatches || builderEvaluations
      >= maxBuilderEvaluations || menuNodes >= maxMenuNodes) break;
    const free = freeArmySlots(menu, source, addedCards);
    if (!free) continue;
    const path = [];
    const visit = (start, remaining, slots) => {
      if (matches.length >= maxMatches
        || builderEvaluations >= maxBuilderEvaluations
        || menuNodes >= maxMenuNodes) {
        truncated = true;
        return;
      }
      menuNodes += 1;
      if (remaining === 0) {
        exactMenuPaths += 1;
        const shape = hashStarcraftTmgContract({ addedCards,
          addedUnits: path.map((entry) => ({
            recordKey: entry.recordKey,
            compositionKind: entry.compositionKind })).sort((a, b) =>
            a.recordKey.localeCompare(b.recordKey)
              || a.compositionKind.localeCompare(b.compositionKind)) });
        if (matchedShapes.has(shape)) return;
        const candidate = clone(source);
        candidate.tacticalCardRecordKeys.push(...addedCards);
        for (let index = 0; index < path.length; index += 1) {
          let unitInstanceId = `${source.sideKey}-exact-repair-${index + 1}`;
          while (existingIds.has(unitInstanceId)
            || candidate.units.some((entry) =>
              entry.unitInstanceId === unitInstanceId)) {
            unitInstanceId += "-next";
          }
          const selected = path[index];
          candidate.units.push({ unitInstanceId,
            recordKey: selected.recordKey,
            compositionKind: selected.compositionKind,
            upgrades: clone(selected.upgrades) });
        }
        const verdict = port.evaluateRosterCandidate(candidate);
        builderEvaluations += 1;
        if (verdict.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA) return;
        verifyArmyBuilderRosterVerdictV1(verdict);
        if (verdict.summary.mineralSpent !== source.mineralBudget) return;
        matchedShapes.add(shape);
        matches.push({ candidateInput: candidate,
          candidateHash: verdict.candidateHash,
          mineralSpent: verdict.summary.mineralSpent,
          rulesAuditResultHash: verdict.auditResultHash,
          rulesVerdictHash: verdict.verdictHash,
          addedTacticalCardRecordKeys: addedCards,
          addedUnitPackages: clone(path),
        });
        return;
      }
      if (path.length >= maxAddedUnits) return;
      for (let index = start; index < packages.length; index += 1) {
        const selected = packages[index];
        const kind = selected.armySlotType;
        if (selected.mineralCost > remaining
          || selected.occupiedArmySlots > (slots[kind] || 0)) continue;
        path.push(selected);
        slots[kind] -= selected.occupiedArmySlots;
        visit(index, remaining - selected.mineralCost, slots);
        slots[kind] += selected.occupiedArmySlots;
        path.pop();
        if (matches.length >= maxMatches
          || builderEvaluations >= maxBuilderEvaluations
          || menuNodes >= maxMenuNodes) break;
      }
    };
    visit(0, shortfall, { ...free });
  }
  const body = { schema: ROSTER_EXACT_BUDGET_REPAIR_SEARCH_V1,
    sourceCandidateHash: baseline.candidateHash,
    sourceBuilderVerdictHash: baseline.verdictHash,
    sourceMineralSpent: baseline.summary.mineralSpent,
    mineralBudget: source.mineralBudget,
    sourceMineralShortfall: shortfall,
    menuReceiptHash: menu.receiptHash,
    menuPathsVisited: menuNodes,
    exactMenuPaths, builderEvaluations,
    searchTruncated: truncated || menuNodes >= maxMenuNodes
      || builderEvaluations >= maxBuilderEvaluations,
    exactBudgetImpossibilityClaimed: false,
    strategyRankingPerformed: false,
    matches,
  };
  return Object.freeze({ ...body,
    receiptHash: hashStarcraftTmgContract(body) });
}
