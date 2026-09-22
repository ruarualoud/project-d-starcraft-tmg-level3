export const OFFICIAL_CURRENT_PRODUCT_STRATEGY_ROUTING_VERSION =
  "official_current_product_strategy_routing_v1";

function fail(code, details = {}) {
  throw Object.assign(new Error(code), { code, ...details });
}
function factionRecordKey(state, sideKey) {
  const disclosure = state?.publicRosterDisclosureBySide?.[sideKey];
  const cards = Array.isArray(disclosure?.publicCards)
    ? disclosure.publicCards : [];
  const factions = cards.filter((entry) => entry?.cardKind === "faction"
    && entry?.faceUp === true && entry?.public === true
    && String(entry?.recordKey || "").startsWith("tactical_cards:"));
  if (factions.length !== 1) {
    fail("CURRENT_PRODUCT_PUBLIC_FACTION_CARD_INVALID", {
      sideKey,
      factionCardCount: factions.length,
    });
  }
  const privateFactionCards = (state?.cardResources?.[sideKey] || []).filter(
    (entry) => entry?.cardKind === "faction",
  );
  if (privateFactionCards.length !== 1
    || privateFactionCards[0].officialCardRecordKey !== factions[0].recordKey) {
    fail("CURRENT_PRODUCT_FACTION_PUBLIC_PRIVATE_DRIFT", { sideKey });
  }
  return factions[0].recordKey;
}

function refFor(entry, loadedById) {
  const loaded = loadedById.get(entry.skillId);
  if (!loaded || loaded.skill.hash !== entry.skillHash) {
    fail("CURRENT_PRODUCT_STRATEGY_ENTRY_NOT_LOADED", {
      skillId: entry.skillId,
    });
  }
  return Object.freeze({
    id: loaded.skill.skillId,
    version: loaded.skill.version,
    hash: loaded.skill.hash,
  });
}

export function routeOfficialCurrentProductStrategySkillsV1(input = {}) {
  const { state, seatKey, manifest, loadedEntries } = input;
  const sideKeys = Object.keys(state?.players || {}).sort();
  if (!sideKeys.includes(seatKey) || sideKeys.length !== 2
    || !Array.isArray(manifest?.entries)
    || !Array.isArray(loadedEntries)) {
    fail("CURRENT_PRODUCT_STRATEGY_ROUTING_INPUT_INVALID", { seatKey });
  }
  const opponentSideKey = sideKeys.find((entry) => entry !== seatKey);
  const ownFactionRecordKey = factionRecordKey(state, seatKey);
  const opponentFactionRecordKey = factionRecordKey(state, opponentSideKey);
  const selected = manifest.entries.filter((entry) => entry.role === "general"
    || (entry.role === "faction"
      && entry.factionRecordKey === ownFactionRecordKey)
    || (entry.role === "matchup"
      && entry.ownFaction === ownFactionRecordKey
      && entry.opponentFaction === opponentFactionRecordKey));
  const roleCounts = Object.fromEntries(["general", "faction", "matchup"].map(
    (role) => [role, selected.filter((entry) => entry.role === role).length],
  ));
  if (selected.length !== 3
    || Object.values(roleCounts).some((count) => count !== 1)) {
    fail("CURRENT_PRODUCT_EXACT_STRATEGY_ROUTE_UNAVAILABLE", {
      seatKey,
      ownFactionRecordKey,
      opponentFactionRecordKey,
      roleCounts,
    });
  }
  const loadedById = new Map(loadedEntries.map((entry) => [
    entry.skill.skillId,
    entry,
  ]));
  const skillRefs = selected.map((entry) => refFor(entry, loadedById));
  const skillEntries = selected.map((entry) => loadedById.get(entry.skillId));
  return Object.freeze({
    schema: OFFICIAL_CURRENT_PRODUCT_STRATEGY_ROUTING_VERSION,
    seatKey,
    opponentSideKey,
    ownFactionRecordKey,
    opponentFactionRecordKey,
    skillRefs: Object.freeze(skillRefs),
    skillEntries: Object.freeze(skillEntries),
    publicFactionIdentityValidated: true,
    exactGeneralFactionMatchupRoute: true,
    hardcodedFactionFallbackUsed: false,
    trainingTruth: false,
  });
}
