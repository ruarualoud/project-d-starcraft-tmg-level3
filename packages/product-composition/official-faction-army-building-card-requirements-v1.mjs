export const OFFICIAL_FACTION_ARMY_BUILDING_CARD_REQUIREMENTS_VERSION =
  "official_faction_army_building_card_requirements_v1";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function currentTacticalRecords(dataset) {
  return (dataset.recordIndex || []).filter((entry) =>
    entry.recordType === "tactical_card"
      && entry.authorityDisposition === "official_current_product_candidate")
    .map((entry) => dataset.recordsByKey?.[entry.recordKey])
    .filter((entry) => object(entry) && object(entry.payload));
}

function compiledGroups(dataset, factionRecordKey) {
  const faction = dataset.recordsByKey?.[factionRecordKey];
  if (!object(faction?.payload) || faction.payload.isFactionCard !== true) {
    fail("FACTION_REQUIRED_TACTICAL_GROUP_FACTION_INVALID", factionRecordKey);
  }
  const groups = [];
  for (const ability of faction.payload.boosts || []) {
    const match = String(ability?.description || "").match(
      /select exactly one ([A-Za-z][A-Za-z -]*?) Card\b/iu,
    );
    if (!match) continue;
    const groupName = match[1].trim();
    const namePattern = new RegExp(`\\b${groupName.replace(
      /[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "iu");
    const candidateRecordKeys = currentTacticalRecords(dataset)
      .filter((record) => record.payload.isFactionCard !== true
        && namePattern.test(String(record.payload.name || "")))
      .map((record) => record.recordKey).sort();
    if (candidateRecordKeys.length === 0) {
      fail("FACTION_REQUIRED_TACTICAL_GROUP_CANDIDATES_MISSING", groupName);
    }
    groups.push(Object.freeze({
      groupName,
      requiredCount: 1,
      sourceAbilityName: String(ability.name || ""),
      sourceText: String(ability.description || ""),
      candidateRecordKeys: Object.freeze(candidateRecordKeys),
    }));
  }
  return groups;
}

export function validateOfficialFactionRequiredTacticalCardGroupsV1(input = {}) {
  const dataset = input.dataset;
  const factionRecordKey = String(input.factionRecordKey || "");
  const selected = (input.selectedTacticalCardRecordKeys || [])
    .map((entry) => String(entry));
  if (!object(dataset) || !object(dataset.recordsByKey)
    || !Array.isArray(dataset.recordIndex) || !factionRecordKey
    || !Array.isArray(input.selectedTacticalCardRecordKeys)) {
    fail("FACTION_REQUIRED_TACTICAL_GROUP_INPUT_INVALID");
  }
  const groups = compiledGroups(dataset, factionRecordKey).map((group) => {
    const selectedRecordKeys = selected.filter((recordKey) =>
      group.candidateRecordKeys.includes(recordKey));
    if (selectedRecordKeys.length !== group.requiredCount) {
      fail("FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID",
        `${factionRecordKey}:${group.groupName}:${selectedRecordKeys.length}`);
    }
    return Object.freeze({
      ...group,
      selectedRecordKeys: Object.freeze(selectedRecordKeys),
      selectedCount: selectedRecordKeys.length,
    });
  });
  return Object.freeze({
    schema: OFFICIAL_FACTION_ARMY_BUILDING_CARD_REQUIREMENTS_VERSION,
    factionRecordKey,
    groups: Object.freeze(groups),
    sourceDerivedWithoutFactionOrCardKeyBranching: true,
    rulesAuthority: true,
    trainingTruth: false,
  });
}
