import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_MULTI_MODEL_CASUALTY_DOMAIN_SCHEMA_V1 =
  "starcraft_tmg_official_multi_model_casualty_domain_v1";
export const OFFICIAL_MULTI_MODEL_CASUALTY_RESOLUTION_SCHEMA_V1 =
  "starcraft_tmg_official_multi_model_casualty_resolution_v1";

export const OFFICIAL_MULTI_MODEL_CASUALTY_SOURCE_BINDING_V1 = Object.freeze({
  dataVersions: Object.freeze({
    cardsVersion: "69",
    rulesVersion: "48",
    unitsVersion: "71",
  }),
  part8DocumentId: "iuUyObNTQ2M8xK4IUqzC",
  part8DocumentHash:
    "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
  part12DocumentId: "gMXfLyHJfnGYKw2rmoPS",
  part12DocumentHash:
    "153cb27295dfa4bfa2069aa1617836d81a2d4a3f15d19568de497ce19fd16868",
});

const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function uniqueSortedStrings(values, code) {
  if (!Array.isArray(values)) fail(code);
  const rows = values.map((value) => String(value || "").trim());
  if (rows.some((value) => !value) || new Set(rows).size !== rows.length) fail(code);
  return rows.sort((left, right) => left.localeCompare(right));
}

function verifyEngagementGraph(graph) {
  if (!object(graph)
    || graph.schema !== "starcraft_tmg_official_engagement_graph_v2"
    || !Array.isArray(graph.modelEdges)
    || !HASH_PATTERN.test(String(graph.graphHash || ""))
    || graph.graphHash !== hashStarcraftTmgContract(without(graph, ["graphHash"]))) {
    fail("MULTI_MODEL_CASUALTY_ENGAGEMENT_GRAPH_INVALID");
  }
  for (const edge of graph.modelEdges) {
    if (!String(edge?.leftModelId || "")
      || !String(edge?.rightModelId || "")
      || !String(edge?.leftUnitId || "")
      || !String(edge?.rightUnitId || "")
      || !Number.isSafeInteger(Number(edge?.horizontalBaseGapMilliInches))
      || Number(edge.horizontalBaseGapMilliInches) < 0) {
      fail("MULTI_MODEL_CASUALTY_ENGAGEMENT_EDGE_INVALID");
    }
  }
  return graph;
}

function targetLedger(piece) {
  if (!object(piece)
    || !String(piece.id || "")
    || !Array.isArray(piece.models)
    || !Array.isArray(piece.destroyedModelIds)
    || !Number.isSafeInteger(Number(piece.maxModels))
    || !Number.isSafeInteger(Number(piece.currentModels))
    || Number(piece.maxModels) < 1
    || Number(piece.currentModels) < 1
    || Number(piece.currentModels) > Number(piece.maxModels)
    || piece.models.length !== Number(piece.maxModels)
    || piece.isOnField !== true
    || piece.isDestroyed === true) {
    fail("MULTI_MODEL_CASUALTY_TARGET_LEDGER_INVALID");
  }
  const rosterModelIds = uniqueSortedStrings(
    piece.models.map((model) => model?.id),
    "MULTI_MODEL_CASUALTY_TARGET_LEDGER_INVALID",
  );
  const activeModelIds = uniqueSortedStrings(piece.models.filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  )).map((model) => model.id), "MULTI_MODEL_CASUALTY_TARGET_LEDGER_INVALID");
  const destroyedModelIds = uniqueSortedStrings(
    piece.destroyedModelIds,
    "MULTI_MODEL_CASUALTY_TARGET_LEDGER_INVALID",
  );
  const derivedDestroyedModelIds = piece.models.filter((model) => (
    model?.isOnField === false && model?.isDestroyed === true
  )).map((model) => model.id).sort((left, right) => left.localeCompare(right));
  if (activeModelIds.length !== Number(piece.currentModels)
    || destroyedModelIds.length !== Number(piece.maxModels) - Number(piece.currentModels)
    || !isDeepStrictEqual(destroyedModelIds, derivedDestroyedModelIds)
    || activeModelIds.some((modelId) => destroyedModelIds.includes(modelId))) {
    fail("MULTI_MODEL_CASUALTY_TARGET_LEDGER_INVALID");
  }
  const body = {
    schema: "starcraft_tmg_official_casualty_target_ledger_v1",
    targetPieceId: piece.id,
    targetSideKey: String(piece.sideKey || ""),
    maxModels: Number(piece.maxModels),
    currentModels: Number(piece.currentModels),
    currentSupply: Number(piece.currentSupply),
    rosterModelIds,
    activeModelIds,
    destroyedModelIds,
  };
  return { ...body, targetLedgerHash: hashStarcraftTmgContract(body) };
}

function targetEdges(graph, targetPieceId, activeModelIds) {
  const active = new Set(activeModelIds);
  return graph.modelEdges.filter((edge) => (
    edge.leftUnitId === targetPieceId && active.has(edge.leftModelId)
      || edge.rightUnitId === targetPieceId && active.has(edge.rightModelId)
  ));
}

function targetModelId(edge, targetPieceId) {
  return edge.leftUnitId === targetPieceId ? edge.leftModelId : edge.rightModelId;
}

function enemyUnitId(edge, targetPieceId) {
  return edge.leftUnitId === targetPieceId ? edge.rightUnitId : edge.leftUnitId;
}

function enemyUnitIds(edges, targetPieceId) {
  return [...new Set(edges.map((edge) => enemyUnitId(edge, targetPieceId)))].sort();
}

function casualtyTier(modelId, edges, targetPieceId) {
  const contacts = edges.filter((edge) => targetModelId(edge, targetPieceId) === modelId);
  if (contacts.length === 0) return 1;
  return contacts.some((edge) => Number(edge.horizontalBaseGapMilliInches) === 0) ? 3 : 2;
}

function legalNextEngagedCasualties(graph, targetPieceId, remainingModelIds) {
  const edges = targetEdges(graph, targetPieceId, remainingModelIds);
  const currentEnemyUnitIds = enemyUnitIds(edges, targetPieceId);
  const rows = remainingModelIds.map((modelId) => {
    const afterIds = remainingModelIds.filter((id) => id !== modelId);
    const afterEnemyUnitIds = enemyUnitIds(
      targetEdges(graph, targetPieceId, afterIds),
      targetPieceId,
    );
    return {
      modelId,
      tier: casualtyTier(modelId, edges, targetPieceId),
      preservesAllEngagements: currentEnemyUnitIds.every((id) => (
        afterEnemyUnitIds.includes(id)
      )),
    };
  });
  const preserving = rows.filter((row) => row.preservesAllEngagements);
  if (preserving.length === 0) {
    return rows.map((row) => row.modelId).sort((left, right) => left.localeCompare(right));
  }
  const minimumTier = Math.min(...preserving.map((row) => row.tier));
  return preserving.filter((row) => row.tier === minimumTier)
    .map((row) => row.modelId)
    .sort((left, right) => left.localeCompare(right));
}

function enumerateSequences(input) {
  if (input.casualtyCount === 0) return [[]];
  const results = [];
  function visit(remainingModelIds, selectedModelIds) {
    if (selectedModelIds.length === input.casualtyCount) {
      results.push(selectedModelIds);
      return;
    }
    const candidates = input.targetEngaged
      ? legalNextEngagedCasualties(
        input.engagementGraph,
        input.targetPieceId,
        remainingModelIds,
      )
      : remainingModelIds.filter((modelId) => input.visibleModelIds.includes(modelId));
    for (const modelId of candidates) {
      visit(
        remainingModelIds.filter((id) => id !== modelId),
        [...selectedModelIds, modelId],
      );
    }
  }
  visit([...input.activeModelIds], []);
  return results.sort((left, right) => left.join(":").localeCompare(right.join(":")));
}

function verifyDomain(domain) {
  if (!object(domain)
    || domain.schema !== OFFICIAL_MULTI_MODEL_CASUALTY_DOMAIN_SCHEMA_V1
    || !HASH_PATTERN.test(String(domain.domainHash || ""))
    || domain.domainHash !== hashStarcraftTmgContract(without(domain, ["domainHash"]))) {
    fail("MULTI_MODEL_CASUALTY_DOMAIN_INVALID");
  }
  return domain;
}

function createDomain(input = {}) {
  const ledger = targetLedger(input.targetPiece);
  const graph = verifyEngagementGraph(input.engagementGraph);
  const hitPoints = Number(input.targetHitPoints);
  const priorDamageMarker = Number(input.priorDamageMarker);
  const incomingDamage = Number(input.incomingDamage);
  if (!Number.isSafeInteger(hitPoints) || hitPoints < 1
    || !Number.isSafeInteger(priorDamageMarker)
    || priorDamageMarker < 0
    || priorDamageMarker >= hitPoints
    || priorDamageMarker !== Number(input.targetPiece.damageMarker || 0)
    || !Number.isSafeInteger(incomingDamage)
    || incomingDamage < 0
    || !HASH_PATTERN.test(String(input.attackResolutionHash || ""))
    || !HASH_PATTERN.test(String(input.rulesRuntimeHash || ""))) {
    fail("MULTI_MODEL_CASUALTY_DAMAGE_INPUT_INVALID");
  }
  const visibleModelIds = uniqueSortedStrings(
    input.visibleModelIds,
    "MULTI_MODEL_CASUALTY_VISIBILITY_INVALID",
  );
  if (visibleModelIds.some((id) => !ledger.activeModelIds.includes(id))) {
    fail("MULTI_MODEL_CASUALTY_VISIBILITY_INVALID");
  }
  const edges = targetEdges(graph, ledger.targetPieceId, ledger.activeModelIds);
  const targetEngaged = edges.length > 0;
  const casualtyCap = targetEngaged
    ? ledger.currentModels
    : visibleModelIds.length;
  const totalDamage = priorDamageMarker + incomingDamage;
  const uncappedCasualtyCount = Math.floor(totalDamage / hitPoints);
  const casualtyCount = Math.min(uncappedCasualtyCount, casualtyCap);
  const damageAfterCasualties = totalDamage - (casualtyCount * hitPoints);
  const targetDestroyed = casualtyCount === ledger.currentModels;
  const visibilityCapExhausted = !targetEngaged
    && casualtyCount === casualtyCap
    && casualtyCap < ledger.currentModels;
  const discardRemainder = targetDestroyed || visibilityCapExhausted;
  const postDamageMarker = discardRemainder ? 0 : damageAfterCasualties;
  const discardedOverflowDamage = discardRemainder ? damageAfterCasualties : 0;
  const sequences = enumerateSequences({
    casualtyCount,
    targetEngaged,
    engagementGraph: graph,
    targetPieceId: ledger.targetPieceId,
    activeModelIds: ledger.activeModelIds,
    visibleModelIds,
  });
  const legalSelections = sequences.map((casualtyModelIds) => {
    const remainingModelIds = ledger.activeModelIds.filter((id) => (
      !casualtyModelIds.includes(id)
    ));
    const body = {
      schema: "starcraft_tmg_official_multi_model_casualty_selection_v1",
      targetPieceId: ledger.targetPieceId,
      casualtyModelIds,
      remainingModelIds,
      remainingEngagedEnemyUnitIds: enemyUnitIds(
        targetEdges(graph, ledger.targetPieceId, remainingModelIds),
        ledger.targetPieceId,
      ),
      postDamageMarker,
      targetDestroyed,
      discardedOverflowDamage,
      trainingTruth: false,
    };
    return { ...body, selectionHash: hashStarcraftTmgContract(body) };
  });
  if (legalSelections.length < 1) fail("MULTI_MODEL_CASUALTY_SELECTION_DOMAIN_EMPTY");
  const body = {
    schema: OFFICIAL_MULTI_MODEL_CASUALTY_DOMAIN_SCHEMA_V1,
    sourceBinding: clone(OFFICIAL_MULTI_MODEL_CASUALTY_SOURCE_BINDING_V1),
    targetLedger: ledger,
    engagementGraphHash: graph.graphHash,
    attackResolutionHash: input.attackResolutionHash,
    rulesRuntimeHash: input.rulesRuntimeHash,
    targetHitPoints: hitPoints,
    priorDamageMarker,
    incomingDamage,
    totalDamage,
    targetEngaged,
    engagedEnemyUnitIds: enemyUnitIds(edges, ledger.targetPieceId),
    visibilityIgnored: targetEngaged,
    visibleModelIds,
    casualtyCap,
    uncappedCasualtyCount,
    casualtyCount,
    postDamageMarker,
    targetDestroyed,
    discardedOverflowDamage,
    legalSelections,
    rulesTruth: targetEngaged
      ? "official_engaged_strict_priority_and_specific_engagement_preservation"
      : "official_unengaged_visible_model_casualty_cap",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, domainHash: hashStarcraftTmgContract(body) });
}

function resolve(input = {}) {
  const domain = verifyDomain(input.domain);
  const selection = domain.legalSelections.find((row) => (
    row.selectionHash === input.selectionHash
  ));
  if (!selection) fail("MULTI_MODEL_CASUALTY_SELECTION_STALE");
  const body = {
    schema: OFFICIAL_MULTI_MODEL_CASUALTY_RESOLUTION_SCHEMA_V1,
    domainHash: domain.domainHash,
    selectionHash: selection.selectionHash,
    targetPieceId: domain.targetLedger.targetPieceId,
    casualtyModelIds: [...selection.casualtyModelIds],
    remainingModelIds: [...selection.remainingModelIds],
    remainingEngagedEnemyUnitIds: [...selection.remainingEngagedEnemyUnitIds],
    postDamageMarker: selection.postDamageMarker,
    targetDestroyed: selection.targetDestroyed,
    discardedOverflowDamage: selection.discardedOverflowDamage,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resolutionHash: hashStarcraftTmgContract(body) });
}

const descriptorBody = {
  schema: "starcraft_tmg_official_multi_model_casualty_resolution_kernel_descriptor_v1",
  kernelId: "official-multi-model-casualty-resolution-kernel-v1",
  kernelVersion: "1.0.0",
  sourceBinding: clone(OFFICIAL_MULTI_MODEL_CASUALTY_SOURCE_BINDING_V1),
  interface: ["createDomain", "resolve"],
  engagedPriorityTiers: [
    "not_within_any_enemy_engagement",
    "within_enemy_engagement_not_base_contact",
    "base_contact_with_enemy_model",
  ],
  specificEnemyEngagementPreservation: true,
  unengagedVisibilityCap: true,
  repositoryFallbackAllowed: false,
  rulesTruth: "official_multi_model_damage_and_casualty_choice_domain",
  trainingTruth: false,
};

export function createOfficialMultiModelCasualtyResolutionKernelV1() {
  return freezeDeep({
    descriptor: {
      ...descriptorBody,
      kernelHash: hashStarcraftTmgContract(descriptorBody),
    },
    createDomain,
    resolve,
  });
}
