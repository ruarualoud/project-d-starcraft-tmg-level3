import {
  clone,
  fail,
  freeze,
  hash,
  safe,
  seal,
  verifySeal,
} from "../skill-production/common.mjs";

export const STARCRAFT_TMG_ONLINE_STRATEGY_SKILL_REGISTRY_VERSION =
  "starcraft_tmg_online_strategy_skill_registry_v1";

const SHA256 = /^[a-f0-9]{64}$/u;
const FACTION = /^tactical_cards:[a-z0-9_]+$/u;

function nonEmpty(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) fail("STRATEGY_REGISTRY_FIELD_REQUIRED", { field });
  return normalized;
}

function digest(value, field) {
  const normalized = nonEmpty(value, field).toLowerCase();
  if (!SHA256.test(normalized)) fail("STRATEGY_REGISTRY_HASH_INVALID", { field });
  return normalized;
}

function revision(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("STRATEGY_REGISTRY_REVISION_INVALID", { field });
  }
  return value;
}

function sealAs(value, field) {
  const body = safe(clone(value));
  return freeze({ ...body, [field]: hash(body) });
}

function assertSourceBinding(value) {
  const binding = {
    core: digest(value?.core, "sourceBinding.core"),
    faq: digest(value?.faq, "sourceBinding.faq"),
    rules: digest(value?.rules, "sourceBinding.rules"),
    dataset: digest(value?.dataset, "sourceBinding.dataset"),
  };
  return freeze(binding);
}

function strategyRole(skill) {
  if (skill.skillId === "starcraft-tmg.general-rules-and-strategy") return "general";
  if (FACTION.test(skill.factionRecordKey || "")) return "faction";
  if (skill.direction?.family === "matchup"
    && FACTION.test(skill.direction.ownFaction || "")
    && FACTION.test(skill.direction.opponentFaction || "")) return "matchup";
  fail("STRATEGY_SKILL_ROLE_UNKNOWN", { skillId: skill.skillId });
}

function assertStrategySkill(value, expectedSourceBinding) {
  const skill = verifySeal(clone(value));
  if (skill.schema !== "project_d_game_skill_v1"
    || skill.gameId !== "starcraft-tmg" || skill.skillType !== "strategy"
    || !nonEmpty(skill.skillId, "skillId") || !nonEmpty(skill.version, "version")
    || hash(skill.sourceBinding) !== hash(expectedSourceBinding)
    || skill.canAffectRules !== false || skill.runtimeAccepted !== false
    || skill.trainingTruth !== false) {
    fail("STRATEGY_SKILL_RUNTIME_CANDIDATE_INVALID", { skillId: skill.skillId });
  }
  const role = strategyRole(skill);
  if ((role === "general" && skill.status !== "replay_passed")
    || (role !== "general" && skill.status !== "offline_candidate")) {
    fail("STRATEGY_SKILL_OFFLINE_STATUS_INVALID", { skillId: skill.skillId });
  }
  return freeze({ skill, role });
}

function evidenceRef(value, field) {
  return freeze({
    kind: nonEmpty(value?.kind, `${field}.kind`),
    hash: digest(value?.hash, `${field}.hash`),
  });
}

function routeIds(ownFaction, opponentFaction) {
  if (!FACTION.test(ownFaction) || !FACTION.test(opponentFaction)
    || ownFaction === opponentFaction) {
    fail("STRATEGY_ROUTE_INVALID");
  }
  const ownSlug = ownFaction.slice("tactical_cards:".length);
  const opponentSlug = opponentFaction.slice("tactical_cards:".length);
  return [
    { role: "general", id: "starcraft-tmg.general-rules-and-strategy" },
    { role: "own_faction", id: `starcraft-tmg.faction.${ownSlug}` },
    { role: "opponent_faction", id: `starcraft-tmg.faction.${opponentSlug}` },
    { role: "directed_matchup", id: `starcraft-tmg.matchup.${ownSlug}-to-${opponentSlug}` },
  ];
}

function assertRouteDependencies(rows) {
  const [general, own, opponent, matchup] = rows.map((row) => row.skill);
  if (own.dependencies?.generalSkillHash !== general.hash
    || opponent.dependencies?.generalSkillHash !== general.hash
    || matchup.dependencies?.generalSkillHash !== general.hash
    || matchup.dependencies?.ownFactionSkillHash !== own.hash
    || matchup.dependencies?.opponentFactionSkillHash !== opponent.hash) {
    fail("STRATEGY_ROUTE_DEPENDENCY_MISMATCH", { skillId: matchup.skillId });
  }
}

function promptGuidance(skill, loadRole) {
  const common = {
    skillId: skill.skillId,
    version: skill.version,
    skillHash: skill.hash,
    loadRole,
    preconditions: clone(skill.preconditions || []),
    fullGameStrategyEffectivenessProven:
      skill.fullGameStrategyEffectivenessProven === true,
    rulesAuthority: "external_rules_service",
  };
  if (loadRole === "own_faction" || loadRole === "opponent_faction") {
    return freeze({
      ...common,
      factionRecordKey: skill.factionRecordKey,
      sectionIndex: (skill.knowledge || []).map((row) => ({
        sectionId: row.section?.id,
        axis: row.section?.axis,
        recommendations: (row.draft?.recommendations || []).map((recommendation) => ({
          title: recommendation.title,
        })),
      })),
      fullDetailAvailableBySkillHash: true,
      conditionAndDetailRetrievalRequiredBeforeRecommendation: true,
    });
  }
  return freeze({
    ...common,
    ...(skill.direction ? { direction: clone(skill.direction) } : {}),
    decisionAxes: (skill.procedure || []).map((axis) => ({
      axis: axis.axis,
      title: axis.title,
      when: clone(axis.when || []),
      objective: axis.objective,
      alternatives: (axis.alternatives || []).map((alternative) => ({
        option: alternative.option,
        preferWhen: alternative.preferWhen,
      })),
      reviseIf: clone(axis.reviseIf || []),
      requiredQueries: clone(axis.requiredQueries || []),
    })),
    illegalPatternIndex: (skill.illegalPatterns || []).map((entry) =>
      typeof entry === "string" ? entry : entry?.pattern || entry?.title),
    fullDetailAvailableBySkillHash: true,
    detailRetrievalRequiredBeforeUsingOmittedProcedure: true,
  });
}

export function createStarcraftTmgOnlineStrategySkillSnapshotV1(input = {}) {
  const sourceBinding = assertSourceBinding(input.sourceBinding);
  const roomBinding = {
    roomId: nonEmpty(input.roomId, "roomId"),
    roomBindingHash: digest(input.roomBindingHash, "roomBindingHash"),
    rulesVersion: nonEmpty(input.rulesVersion, "rulesVersion"),
    dataVersion: nonEmpty(input.dataVersion, "dataVersion"),
    sourceSnapshotHash: digest(input.sourceSnapshotHash, "sourceSnapshotHash"),
  };
  if (roomBinding.rulesVersion !== sourceBinding.rules
    || roomBinding.dataVersion !== sourceBinding.dataset
    || roomBinding.sourceSnapshotHash !== hash(sourceBinding)) {
    fail("STRATEGY_SNAPSHOT_ROOM_SOURCE_MISMATCH");
  }
  const ownFaction = nonEmpty(input.ownFaction, "ownFaction");
  const opponentFaction = nonEmpty(input.opponentFaction, "opponentFaction");
  const expectedRoute = routeIds(ownFaction, opponentFaction);
  if (!Array.isArray(input.skillEntries)
    || input.skillEntries.length !== expectedRoute.length) {
    fail("STRATEGY_SNAPSHOT_ROUTE_INCOMPLETE");
  }
  const publicationState = nonEmpty(input.publicationState, "publicationState");
  if (!new Set(["evaluation_candidate", "accepted"]).has(publicationState)) {
    fail("STRATEGY_SNAPSHOT_PUBLICATION_STATE_INVALID");
  }
  const skillEntries = input.skillEntries.map((entry, index) => {
    const expected = expectedRoute[index];
    const normalized = assertStrategySkill(entry?.skillArtifact, sourceBinding);
    if (entry.loadIndex !== index || entry.loadRole !== expected.role
      || normalized.skill.skillId !== expected.id
      || entry.skillHash !== normalized.skill.hash
      || entry.registryStatus !== publicationState) {
      fail("STRATEGY_SNAPSHOT_LOAD_ORDER_INVALID", { index });
    }
    return freeze({
      loadIndex: index,
      loadRole: expected.role,
      registryStatus: publicationState,
      skillHash: normalized.skill.hash,
      skillArtifact: normalized.skill,
      promptGuidance: promptGuidance(normalized.skill, expected.role),
    });
  });
  assertRouteDependencies(skillEntries.map((entry) => ({ skill: entry.skillArtifact })));
  const skillRefs = skillEntries.map((entry) => freeze({
    id: entry.skillArtifact.skillId,
    version: entry.skillArtifact.version,
    hash: entry.skillHash,
    loadIndex: entry.loadIndex,
    loadRole: entry.loadRole,
    registryStatus: entry.registryStatus,
  }));
  return sealAs({
    schemaVersion: `${STARCRAFT_TMG_ONLINE_STRATEGY_SKILL_REGISTRY_VERSION}.snapshot`,
    gameId: "starcraft-tmg",
    ...roomBinding,
    sourceBinding,
    sourceBindingHash: hash(sourceBinding),
    ownFaction,
    opponentFaction,
    publicationState,
    registryRuntimeRevision: revision(input.registryRuntimeRevision,
      "registryRuntimeRevision"),
    skillEntries,
    skillRefs,
    skillSetHash: hash(skillRefs),
    dependencyOrder: expectedRoute.map((entry) => entry.role),
    strategyAuthority: "advisory_only",
    rulesAuthority: "external_rules_service",
    skillsMayOverrideRules: false,
    generatedDuringLiveTurn: false,
    runtimeAccepted: publicationState === "accepted",
    eligibleForTraining: false,
    trainingTruth: false,
  }, "snapshotHash");
}

export function assertStarcraftTmgOnlineStrategySkillSnapshotV1(value,
  binding = {}) {
  const normalized = createStarcraftTmgOnlineStrategySkillSnapshotV1(value);
  if (normalized.snapshotHash !== value?.snapshotHash
    || normalized.roomId !== binding.roomId
    || normalized.roomBindingHash !== binding.roomBindingHash
    || normalized.rulesVersion !== binding.rulesVersion
    || normalized.dataVersion !== binding.dataVersion
    || normalized.sourceSnapshotHash !== binding.sourceSnapshotHash) {
    fail("STRATEGY_SNAPSHOT_BINDING_INVALID");
  }
  return normalized;
}

export function createStarcraftTmgOnlineStrategySkillRegistryV1(input = {}) {
  const sourceBinding = assertSourceBinding(input.sourceBinding);
  const now = typeof input.now === "function" ? input.now : () => new Date().toISOString();
  const candidates = new Map();
  const skillIds = new Map();
  let catalogRevision = 0;
  let runtimeRevision = 0;
  let active = new Map();
  const runtimeHistory = new Map([[0, new Map()]]);

  function assertCatalogCas(expected) {
    if (revision(expected, "expectedCatalogRevision") !== catalogRevision) {
      fail("STRATEGY_REGISTRY_CATALOG_CAS_CONFLICT", {
        expectedCatalogRevision: expected,
        observedCatalogRevision: catalogRevision,
      });
    }
  }

  function assertRuntimeCas(expected) {
    if (revision(expected, "expectedRuntimeRevision") !== runtimeRevision) {
      fail("STRATEGY_REGISTRY_RUNTIME_CAS_CONFLICT", {
        expectedRuntimeRevision: expected,
        observedRuntimeRevision: runtimeRevision,
      });
    }
  }

  function registerCandidates(request = {}) {
    assertCatalogCas(request.expectedCatalogRevision);
    if (!Array.isArray(request.entries) || request.entries.length === 0) {
      fail("STRATEGY_REGISTRY_CANDIDATES_REQUIRED");
    }
    const additions = request.entries.map((entry) => {
      const normalized = assertStrategySkill(entry?.skill, sourceBinding);
      const qualificationRef = evidenceRef(entry?.qualificationRef,
        `qualificationRef:${normalized.skill.skillId}`);
      if (candidates.has(normalized.skill.hash)) {
        fail("STRATEGY_REGISTRY_CANDIDATE_ALREADY_EXISTS", {
          skillId: normalized.skill.skillId,
        });
      }
      return freeze({
        skill: normalized.skill,
        role: normalized.role,
        qualificationRef,
        registeredAt: now(),
      });
    });
    for (const row of additions) {
      candidates.set(row.skill.hash, row);
      skillIds.set(row.skill.skillId, row.skill.hash);
    }
    const previousCatalogRevision = catalogRevision;
    catalogRevision += 1;
    return seal({
      schema: `${STARCRAFT_TMG_ONLINE_STRATEGY_SKILL_REGISTRY_VERSION}.candidate-registration`,
      previousCatalogRevision,
      catalogRevision,
      registeredSkillHashes: additions.map((row) => row.skill.hash),
      activeSkillHashesChanged: false,
      providerCalls: 0,
      trainingTruth: false,
    });
  }

  function routeSnapshot(request, publicationState, selected, selectedRuntimeRevision) {
    const route = routeIds(request.ownFaction, request.opponentFaction);
    const rows = route.map((step) => {
      const skillHash = selected.get(step.id);
      const row = candidates.get(skillHash);
      if (!row) fail("STRATEGY_ROUTE_SKILL_UNAVAILABLE", { skillId: step.id });
      return row;
    });
    assertRouteDependencies(rows);
    return createStarcraftTmgOnlineStrategySkillSnapshotV1({
      roomId: request.roomBinding?.roomId,
      roomBindingHash: request.roomBinding?.roomBindingHash
        || request.roomBinding?.bindingHash
        || request.roomBinding?.matchBindingHash,
      rulesVersion: request.roomBinding?.rulesVersion,
      dataVersion: request.roomBinding?.dataVersion,
      sourceSnapshotHash: request.roomBinding?.sourceSnapshotHash,
      sourceBinding,
      ownFaction: request.ownFaction,
      opponentFaction: request.opponentFaction,
      publicationState,
      registryRuntimeRevision: selectedRuntimeRevision,
      skillEntries: rows.map((row, index) => ({
        loadIndex: index,
        loadRole: route[index].role,
        registryStatus: publicationState,
        skillHash: row.skill.hash,
        skillArtifact: row.skill,
      })),
    });
  }

  function readEvaluationRoute(request = {}) {
    const selected = new Map(skillIds);
    return routeSnapshot(request, "evaluation_candidate", selected, runtimeRevision);
  }

  function readAcceptedRoute(request = {}) {
    const requestedRevision = request.pinnedRuntimeRevision === undefined
      ? runtimeRevision : revision(request.pinnedRuntimeRevision, "pinnedRuntimeRevision");
    const selected = runtimeHistory.get(requestedRevision);
    if (!selected) fail("STRATEGY_REGISTRY_REVISION_NOT_FOUND", {
      runtimeRevision: requestedRevision,
    });
    return routeSnapshot(request, "accepted", selected, requestedRevision);
  }

  function acceptSet(request = {}) {
    assertRuntimeCas(request.expectedRuntimeRevision);
    const evidence = evidenceRef(request.evaluationRef, "evaluationRef");
    if (!Array.isArray(request.skillHashes) || request.skillHashes.length === 0
      || new Set(request.skillHashes).size !== request.skillHashes.length) {
      fail("STRATEGY_REGISTRY_ACCEPT_SET_INVALID");
    }
    const next = new Map(active);
    for (const skillHash of request.skillHashes) {
      const row = candidates.get(digest(skillHash, "skillHash"));
      if (!row) fail("STRATEGY_REGISTRY_CANDIDATE_NOT_FOUND", { skillHash });
      next.set(row.skill.skillId, row.skill.hash);
    }
    for (const row of candidates.values()) {
      if (row.role !== "matchup" || next.get(row.skill.skillId) !== row.skill.hash) continue;
      const dependencies = Object.values(row.skill.dependencies || {});
      if (dependencies.length !== 3
        || dependencies.some((dependencyHash) => ![...next.values()].includes(dependencyHash))) {
        fail("STRATEGY_REGISTRY_ACCEPTED_DEPENDENCY_MISSING", {
          skillId: row.skill.skillId,
        });
      }
    }
    const previousRuntimeRevision = runtimeRevision;
    runtimeRevision += 1;
    active = next;
    runtimeHistory.set(runtimeRevision, new Map(active));
    return seal({
      schema: `${STARCRAFT_TMG_ONLINE_STRATEGY_SKILL_REGISTRY_VERSION}.acceptance`,
      previousRuntimeRevision,
      runtimeRevision,
      acceptedSkillHashes: [...active.values()].sort(),
      evaluationRef: evidence,
      activationPolicy: "explicit_cas_no_silent_replacement",
      acceptedAt: now(),
      trainingTruth: false,
    });
  }

  function rollback(request = {}) {
    assertRuntimeCas(request.expectedRuntimeRevision);
    const targetRuntimeRevision = revision(request.targetRuntimeRevision,
      "targetRuntimeRevision");
    const target = runtimeHistory.get(targetRuntimeRevision);
    if (!target) fail("STRATEGY_REGISTRY_ROLLBACK_TARGET_NOT_FOUND");
    const evidence = evidenceRef(request.rollbackRef, "rollbackRef");
    const previousRuntimeRevision = runtimeRevision;
    runtimeRevision += 1;
    active = new Map(target);
    runtimeHistory.set(runtimeRevision, new Map(active));
    return seal({
      schema: `${STARCRAFT_TMG_ONLINE_STRATEGY_SKILL_REGISTRY_VERSION}.rollback`,
      previousRuntimeRevision,
      targetRuntimeRevision,
      runtimeRevision,
      activeSkillHashes: [...active.values()].sort(),
      rollbackRef: evidence,
      rollbackCreatedNewRevision: true,
      rolledBackAt: now(),
      trainingTruth: false,
    });
  }

  function state() {
    return seal({
      schema: `${STARCRAFT_TMG_ONLINE_STRATEGY_SKILL_REGISTRY_VERSION}.state`,
      gameId: "starcraft-tmg",
      sourceBinding,
      sourceBindingHash: hash(sourceBinding),
      catalogRevision,
      runtimeRevision,
      candidateSkillHashes: [...candidates.keys()].sort(),
      activeSkillHashes: [...active.values()].sort(),
      candidateCount: candidates.size,
      activeCount: active.size,
      automaticPromotion: false,
      silentReplacement: false,
      rulesAuthority: "external_rules_service",
      trainingTruth: false,
    });
  }

  return freeze({
    registerCandidates,
    readEvaluationRoute,
    readAcceptedRoute,
    acceptSet,
    rollback,
    state,
  });
}
