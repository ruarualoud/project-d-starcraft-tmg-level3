import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_FORMAL_EXPERIMENT_RUN_MANIFEST_VERSION =
  "starcraft_tmg_formal_experiment_run_manifest_v1";

const HASH = /^[a-f0-9]{64}$/u;
const SEVERITIES = new Set(["Critical", "High", "Medium", "Low"]);
const BLOCKING = new Set(["Critical", "High"]);
const TERRAN = "tactical_cards:terran_armed_forces";
const KERRIGAN_SWARM = "tactical_cards:kerrigan_s_swarm";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function digest(value, field) {
  const normalized = String(value || "").toLowerCase();
  if (!HASH.test(normalized)) fail("FORMAL_RUN_HASH_INVALID", field);
  return normalized;
}
function text(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) fail("FORMAL_RUN_FIELD_REQUIRED", field);
  return normalized;
}
function without(value, fields) {
  return Object.fromEntries(Object.entries(value)
    .filter(([field]) => !fields.includes(field)));
}
function sealed(value, field) {
  const body = clone(value);
  return freeze({ ...body, [field]: hashStarcraftTmgContract(body) });
}
function verifySealed(value, field) {
  if (!object(value) || !HASH.test(String(value[field] || ""))) return false;
  return value[field] === hashStarcraftTmgContract(without(value, [field]));
}
function sourceBinding(value) {
  return freeze(Object.fromEntries(["core", "faq", "rules", "dataset"]
    .map((field) => [field, digest(value?.[field], `sourceBinding.${field}`)])));
}
function providerRef(value, preference) {
  const integrityHash = digest(value?.integrity?.hash, "provider.integrity.hash");
  const baseUrl = text(value?.baseUrl, "provider.baseUrl");
  if (baseUrl !== "https://api.deepseek.com") fail("FORMAL_RUN_PROVIDER_URL_INVALID");
  return freeze({
    preference,
    providerId: text(value?.provider, "provider.provider"),
    profileId: text(value?.providerProfileId, "provider.providerProfileId"),
    profileVersion: text(value?.version, "provider.version"),
    profileHash: integrityHash,
    baseUrl,
    model: text(value?.model, "provider.model"),
    thinkingMode: text(value?.thinkingMode, "provider.thinkingMode"),
    reasoningEffort: text(value?.reasoningEffort, "provider.reasoningEffort"),
  });
}
function skillEntry(manifest, role, predicate) {
  const rows = manifest.entries.filter((entry) => entry.role === role && predicate(entry));
  if (rows.length !== 1) fail("FORMAL_RUN_SKILL_ROUTE_INCOMPLETE", role);
  return freeze({
    role,
    skillId: text(rows[0].skillId, "skillId"),
    skillHash: digest(rows[0].skillHash, "skillHash"),
  });
}
function skillRoute(manifest, ownFaction, opponentFaction) {
  return freeze([
    skillEntry(manifest, "general", () => true),
    skillEntry(manifest, "faction", (entry) => entry.factionRecordKey === ownFaction),
    skillEntry(manifest, "faction", (entry) => entry.factionRecordKey === opponentFaction),
    skillEntry(manifest, "matchup", (entry) => entry.ownFaction === ownFaction
      && entry.opponentFaction === opponentFaction),
  ]);
}

export const STARCRAFT_TMG_FORMAL_500_ROSTER_RECIPES_V1 = freeze({
  player1: {
    factionRecordKey: TERRAN,
    tacticalCardRecordKeys: [],
    unitMinerals: 500,
    units: [
      { unitInstanceId: "player1-marine-1", recordKey: "army_units:marine",
        compositionKind: "small", upgradeNames: ["Combat Shield"] },
      { unitInstanceId: "player1-marine-2", recordKey: "army_units:marine",
        compositionKind: "small", upgradeNames: [] },
      { unitInstanceId: "player1-marine-3", recordKey: "army_units:marine",
        compositionKind: "small", upgradeNames: [] },
    ],
  },
  player2: {
    factionRecordKey: KERRIGAN_SWARM,
    tacticalCardRecordKeys: ["tactical_cards:accelerating_creep"],
    unitMinerals: 500,
    units: [
      { unitInstanceId: "player2-kerrigan", recordKey: "army_units:kerrigan",
        compositionKind: "small", upgradeNames: [] },
      { unitInstanceId: "player2-kerrigan-raptor",
        recordKey: "army_units:kerrigan_swarm_raptor__zergling_",
        compositionKind: "small", upgradeNames: [] },
    ],
  },
});

export function createStarcraftTmgFormalExperimentRunManifestV1(input = {}) {
  const binding = sourceBinding(input.sourceBinding);
  const pack = input.strategyPackManifest;
  if (!object(pack) || pack.gameId !== "starcraft-tmg"
    || pack.sourceRefreshPerformed !== false || !Array.isArray(pack.entries)
    || pack.entries.length < 5
    || hashStarcraftTmgContract(sourceBinding(pack.sourceBinding))
      !== hashStarcraftTmgContract(binding)) {
    fail("FORMAL_RUN_STRATEGY_PACK_INVALID");
  }
  const providers = [input.providerProfile, ...(input.fallbackProviderProfiles || [])]
    .filter(Boolean).map((entry, index) => providerRef(entry,
      index === 0 ? "preferred" : "pre_game_fallback"));
  if (!providers.length || new Set(providers.map((entry) => entry.profileHash)).size
    !== providers.length) {
    fail("FORMAL_RUN_PROVIDER_PROFILES_INVALID");
  }
  const manifest = sealed({
    schemaVersion: STARCRAFT_TMG_FORMAL_EXPERIMENT_RUN_MANIFEST_VERSION,
    gameId: "starcraft-tmg",
    ticket: 23,
    experimentScale: {
      engagementScale: "Skirmish",
      mineralsPerSide: 500,
      vespeneCapPerSide: 100,
      battlefieldWidthInches: 36,
      battlefieldHeightInches: 36,
    },
    scenario: {
      missionRecordKey: "faction_cards:mission_hold_position__skirmish_",
      missionName: "Hold Position (Skirmish)",
      deploymentRecordKey: "faction_cards:a7Ax3InF4uueg3gZ308P",
      deploymentName: "CHAR PLAINS",
      terrainRecipeId: "ticket23-skirmish-500-balanced-terrain-v1",
      selectionReason:
        "Skirmish-native mission and map with full scoring lifecycle; the selected roster keeps the first formal game bounded while preserving ranged, melee, hero, multi-model, mission-control and terrain decisions.",
    },
    rosters: clone(STARCRAFT_TMG_FORMAL_500_ROSTER_RECIPES_V1),
    sourceBinding: binding,
    sourcePolicy: {
      frozenForDevelopment: true,
      readOnlyDifferenceCheckBeforeFormalRun: true,
      automaticRefreshAllowed: false,
      silentReplacementAllowed: false,
      repositoryFallbackAllowed: false,
      explicitUserCommandRequiredForRefresh: true,
    },
    strategyPack: {
      manifestHash: digest(pack.hash, "strategyPackManifest.hash"),
      entryCount: pack.entries.length,
      player1Route: skillRoute(pack, TERRAN, KERRIGAN_SWARM),
      player2Route: skillRoute(pack, KERRIGAN_SWARM, TERRAN),
      rulesAuthority: "external_rules_service",
      runtimeAcceptanceRequiredBeforeOpen: true,
    },
    providerProfiles: providers,
    providerPolicy: {
      availabilityEndpoint: "GET https://api.deepseek.com/models",
      availabilityCheckMayGenerate: false,
      fallbackAllowedOnlyBeforeMatchOpen: true,
      selectedModelFrozenAfterMatchOpen: true,
      retryOnUnknownPaidAttempt: false,
    },
    runs: [
      { runId: "ticket23-ha-500-v1", mode: "user_vs_agent",
        humanSeat: "player1", agentSeats: ["player2"],
        budgetLimitCnyMicros: 80_000_000, maxProviderCalls: 1_024,
        seed: "ticket23-ha-500-seed-v1" },
      { runId: "ticket23-aa-500-v1", mode: "agent_vs_agent",
        humanSeat: null, agentSeats: ["player1", "player2"],
        budgetLimitCnyMicros: 160_000_000, maxProviderCalls: 2_048,
        seed: "ticket23-aa-500-seed-v1" },
      { runId: "ticket23-review-500-v1", mode: "postgame_review",
        humanSeat: null, agentSeats: [],
        budgetLimitCnyMicros: 260_000_000, maxProviderCalls: 2_048,
        seed: "paired-checkpoint-rng-per-experiment" },
    ],
    aggregateBudget: {
      limitCnyMicros: 500_000_000,
      notificationStepCnyMicros: 100_000_000,
      historicalLedgerPreserved: true,
      maxCallCounterResetsPerRun: true,
    },
    actionPolicy: {
      everyAgentOwnedChoiceCallsModel: true,
      rulesAndRngConsequencesCallModel: false,
      legalMachineActionsAutoApply: true,
      physicalPlayerComponentChangesCreateTasks: true,
      physicalTasksMayBeDelegatedToAgent: true,
    },
    evidencePolicy: {
      webUiIsExperimentControlSurface: true,
      screenshotEveryAction: true,
      reportSplitByGameAndRound: true,
      diceAndActionDescriptionsRequired: true,
      authorityReceiptsRequired: true,
      publicStructuredDecisionSummariesRequired: true,
      hiddenProviderReasoningRequested: false,
      replayNdjsonRequired: true,
    },
    compatibilityPolicy: {
      semanticVersionsAreCompatibilityAuthority: true,
      hashesAreArtifactIdentityAndDriftDiagnostics: true,
      hashMismatchAloneDoesNotDefineCompatibility: true,
      criticalAndHighOnlyBlock: true,
      reviewCycleLimit: 3,
    },
    formalRunReady: false,
    sourceRefreshPerformed: false,
    paidProviderCalls: 0,
    trainingTruth: false,
  }, "manifestHash");
  return manifest;
}

function finding(code, severity, message, evidence = {}) {
  if (!SEVERITIES.has(severity)) fail("FORMAL_RUN_FINDING_SEVERITY_INVALID");
  return freeze({ code, severity, blocking: BLOCKING.has(severity), message,
    evidence: clone(evidence) });
}

export function evaluateStarcraftTmgFormalExperimentPreflightV1(input = {}) {
  const manifest = input.manifest;
  if (!verifySealed(manifest, "manifestHash")
    || manifest.schemaVersion !== STARCRAFT_TMG_FORMAL_EXPERIMENT_RUN_MANIFEST_VERSION) {
    fail("FORMAL_RUN_MANIFEST_INVALID");
  }
  const evidence = input.evidence || {};
  const findings = [];
  const add = (condition, code, severity, message, details) => {
    if (!condition) findings.push(finding(code, severity, message, details));
  };
  add(evidence.source?.sourceRefreshPerformed === false
      && evidence.source?.repositoryFallbackUsed === false,
  "FORMAL_SOURCE_FREEZE_UNPROVEN", "High",
  "Frozen official data and no-fallback policy are not proven.", evidence.source);
  add(evidence.source?.sourceBindingHash === hashStarcraftTmgContract(
    manifest.sourceBinding), "FORMAL_SOURCE_BINDING_MISMATCH", "High",
  "Runtime source binding does not match the manifest.", evidence.source);
  add(evidence.source?.readOnlyComparisonCompleted === true,
    "FORMAL_SOURCE_COMPARISON_PENDING", "Medium",
    "The read-only latest-source difference report has not been captured.", evidence.source);
  add(evidence.provider?.ok === true && evidence.provider?.available === true
      && evidence.provider?.requestedModel === manifest.providerProfiles[0].model
      && evidence.provider?.paidProviderCalls === 0,
  "FORMAL_PROVIDER_UNAVAILABLE", "High",
  "The preferred model is not proven available through a zero-generation check.",
  evidence.provider);
  add(evidence.skills?.loadedEntryCount === manifest.strategyPack.entryCount
      && evidence.skills?.player1RouteCount === 4
      && evidence.skills?.player2RouteCount === 4,
  "FORMAL_SKILL_ROUTE_INCOMPLETE", "High",
  "The exact 11-Skill pack and both four-Skill runtime routes are not loaded.",
  evidence.skills);
  add(evidence.room?.engagementScale === "Skirmish"
      && evidence.room?.mineralsPerSide === 500
      && evidence.room?.battlefieldWidthInches === 36
      && evidence.room?.battlefieldHeightInches === 36
      && evidence.room?.rosterLegal === true
      && evidence.room?.terrainComplete === true,
  "FORMAL_500_ROOM_INCOMPLETE", "High",
  "The exact legal 500-point Skirmish room, map and terrain are incomplete.", evidence.room);
  add(evidence.rules?.unsupportedActionRouteCount === 0
      && evidence.rules?.legalSpaceComplete === true
      && evidence.rules?.productionRoomEligible === true
      && evidence.rules?.completeLifecycleDryRunPassed === true,
  "FORMAL_ACTION_RUNTIME_INCOMPLETE", "High",
  "Selected-roster actions or the complete mission lifecycle remain non-executable.",
  evidence.rules);
  add(evidence.storage?.roomStoreReady === true
      && evidence.storage?.decisionWalReady === true
      && evidence.storage?.reviewWalReady === true,
  "FORMAL_DURABLE_STORAGE_INCOMPLETE", "High",
  "Room, decision or review durability is not ready.", evidence.storage);
  add(evidence.web?.requiredUserJourneyPassed === true
      && evidence.web?.screenshotCaptureReady === true
      && evidence.web?.floatingAdjutantReady === true,
  "FORMAL_WEB_USER_JOURNEY_INCOMPLETE", "High",
  "The required Web control surface and evidence capture are not accepted.", evidence.web);
  const blockingFindings = findings.filter((entry) => entry.blocking);
  return sealed({
    schemaVersion: "starcraft_tmg_formal_experiment_preflight_v1",
    manifestHash: manifest.manifestHash,
    ready: blockingFindings.length === 0,
    blockingFindingCount: blockingFindings.length,
    trackedFindingCount: findings.length - blockingFindings.length,
    findings,
    onlyCriticalAndHighBlock: true,
    sourceRefreshPerformed: false,
    paidProviderCalls: 0,
    inputUnits: 0,
    outputUnits: 0,
    estimatedCostCnyMicros: 0,
    trainingTruth: false,
  }, "preflightHash");
}
