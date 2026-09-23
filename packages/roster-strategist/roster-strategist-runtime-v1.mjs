import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA,
  ARMY_BUILDER_ROSTER_VERDICT_SCHEMA,
  verifyOfficialArmyBuilderQueryPortDescriptorV1,
} from "./army-builder-query-port-v1.mjs";
import {
  verifyPregameSceneLaboratoryDescriptorV1,
} from "./pregame-scene-laboratory-v1.mjs";
import {
  normalizeRosterStrategistPublicOutputV1,
  ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1,
  ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_VERSION,
} from "./public-output-normalization-v1.mjs";
import {
  NARRATIVE_DISPLAY_TARGETS,
  NARRATIVE_TRANSPORT_CEILING,
  ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1,
  rosterStrategistRoundOutputContractRefV1,
  rosterStrategistRoundOutputContractV1,
  verifyRosterStrategistOutputContractSetV1,
} from "./roster-strategist-output-schemas-v1.mjs";
import {
  createOpponentArchetypeHypothesisV1,
  createRosterCandidateComparisonV1,
  createRosterCandidateV1,
  createRosterComponentPurposeV1,
  createRosterCounterResponseV1,
  createRosterDeploymentConceptV1,
  createRosterInvalidationTriggerV1,
  createRosterLossResourceBudgetV1,
  createRosterPlanProvenanceV1,
  createRosterPlanRevisionEventV1,
  createRosterPlanV1,
  createRosterScoreRouteV1,
  createRosterToolReceiptReferenceV1,
  verifyRosterPlanRoundTripV1,
} from "./roster-plan-contracts-v1.mjs";
import { runRosterTeachCycleV1 } from "./roster-teach-cycle-v1.mjs";

export const ROSTER_STRATEGIST_RUNTIME_MODULE =
  "packages/roster-strategist/roster-strategist-runtime-v1.mjs";
export const ROSTER_STRATEGIST_RUNTIME_VERSION = "1.3.1";
export const ROSTER_STRATEGIST_DELIBERATION_SCHEMA =
  "starcraft_tmg_roster_strategist_deliberation_v1";
export const ROSTER_STRATEGIST_DESCRIPTOR_SCHEMA =
  "starcraft_tmg_roster_strategist_descriptor_v1";
export const ROSTER_STRATEGIST_SKILL_ROUTE_RECEIPT_SCHEMA =
  "starcraft_tmg_roster_strategist_skill_route_receipt_v1";
export const ROSTER_STRATEGIST_ROUND_RECEIPT_SCHEMA =
  "starcraft_tmg_roster_strategist_round_receipt_v1";
export const ROSTER_STRATEGIST_INFORMATION_NEED_SCHEMA =
  "starcraft_tmg_roster_strategist_information_need_v1";
export const ROSTER_STRATEGIST_SESSION_RECEIPT_SCHEMA =
  "starcraft_tmg_roster_strategist_session_receipt_v1";
export const ROSTER_STRATEGIST_PROMPT_PACK_V1 =
  "ticket27.roster_strategist.multi_round.v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ROUND_KINDS = new Set([
  "strategy_foundation", "candidate_proposals", "comparison_selection",
  "revision",
]);
const NEED_KINDS = new Set([
  "probability", "spatial", "math", "threat_exchange", "scenario",
]);
const ROUTE_KINDS = new Set([
  "mission_marker_control", "attrition", "hybrid", "unknown",
]);
const CONFIDENCE_LEVELS = new Set(["unknown", "low", "medium", "high"]);
const SCHEDULE_STATUSES = new Set(["declared", "unknown"]);
const COMPONENT_KINDS = new Set([
  "faction_card", "tactical_card", "unit", "composition", "upgrade",
]);
const SCORING_ROLES = new Set([
  "primary_scorer", "support", "counter", "flex", "unknown",
]);
const TRIGGER_OBSERVATION_KINDS = new Set([
  "vp_deficit", "opponent_composition", "battlefield_event", "loss_budget",
  "unknown",
]);
const MAX_TEXT_LENGTH = 2_000;
const MAX_LIST = 32;
const MAX_PROPOSAL_ROUNDS = 3;
const MAX_SKILL_PROJECTION_BYTES = 24 * 1024;
const FORBIDDEN_OUTPUT_KEYS = new Set([
  "hidden", "chainofthought", "cot", "scratchpad", "reasoning",
  "reasoningtrace", "internalmonologue", "privatereasoning", "thinking",
  "internalnotes",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  if (text.length > MAX_TEXT_LENGTH) fail(code, "text_too_long");
  return text;
}
function hash64(value, code) {
  const text = String(value || "");
  if (!HASH_PATTERN.test(text)) fail(code);
  return text;
}
function hashedReceipt(body, hashField = "receiptHash") {
  return freezeDeep({ ...body, [hashField]: hashStarcraftTmgContract(body) });
}
function exactKeys(value, expected, code) {
  const observed = Object.keys(value || {}).sort();
  const wanted = [...expected].sort();
  if (observed.length !== wanted.length
    || observed.some((key, index) => key !== wanted[index])) {
    fail(code, observed.join(","));
  }
}
function textList(value, code, { allowEmpty = true, max = MAX_LIST } = {}) {
  if (!Array.isArray(value) || value.length > max) fail(code);
  if (!allowEmpty && value.length === 0) fail(code);
  return value.map((entry) => nonEmpty(entry, code));
}

function rejectForbiddenKeys(value, path = "output") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectForbiddenKeys(entry, `${path}[${index}]`));
    return;
  }
  if (!object(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[-_]/gu, "");
    if (FORBIDDEN_OUTPUT_KEYS.has(normalized)) {
      fail("ROSTER_STRATEGIST_HIDDEN_COT_REJECTED", `${path}.${key}`);
    }
    rejectForbiddenKeys(child, `${path}.${key}`);
  }
}

function sealNode(nodeType, authority, content) {
  const body = { nodeType, authority, content };
  return freezeDeep({ ...body, nodeHash: hashStarcraftTmgContract(body) });
}

// ------------------------------------------------------------ skill route

function skillGuidanceProjection(skill) {
  const projection = {
    skillId: skill.skillId,
    version: skill.version,
    skillHash: skill.hash,
    status: skill.status,
    canAffectRules: skill.canAffectRules === true,
    guidance: [],
  };
  const procedures = Array.isArray(skill.procedure) ? skill.procedure : [];
  for (const entry of procedures) {
    if (typeof entry === "string") {
      projection.guidance.push({ kind: "procedure_note", text: entry });
      continue;
    }
    if (!object(entry)) continue;
    projection.guidance.push({
      kind: "procedure",
      axis: entry.axis ?? null,
      title: entry.title ?? null,
      when: clone(entry.when || []),
      objective: entry.objective ?? null,
      steps: clone(entry.steps || []),
      alternatives: clone(entry.alternatives || []),
      opponentBranches: clone(entry.opponentBranches || []),
      risk: entry.risk ?? null,
      reviseIf: entry.reviseIf ?? null,
      requiredQueries: clone(entry.requiredQueries || []),
    });
  }
  const knowledge = Array.isArray(skill.knowledge) ? skill.knowledge : [];
  for (const section of knowledge) {
    const recommendations = section?.draft?.recommendations || [];
    projection.guidance.push({
      kind: "knowledge_section",
      sectionId: section?.section?.id ?? null,
      axis: section?.section?.axis ?? null,
      recommendations: recommendations.map((recommendation) => ({
        title: recommendation?.title ?? null,
        when: clone(recommendation?.when || []),
      })),
    });
  }
  let bytes = Buffer.byteLength(JSON.stringify(projection), "utf8");
  while (bytes > MAX_SKILL_PROJECTION_BYTES && projection.guidance.length > 1) {
    projection.guidance.pop();
    projection.truncated = true;
    bytes = Buffer.byteLength(JSON.stringify(projection), "utf8");
  }
  return freezeDeep(projection);
}

// ------------------------------------------------------- deliberation port

export function createScriptedRosterDeliberationPortV1(input = {}) {
  if (typeof input.handler !== "function") {
    fail("ROSTER_STRATEGIST_MOCK_HANDLER_REQUIRED");
  }
  const modelVersion = nonEmpty(input.modelVersion || "scripted-mock-v1",
    "ROSTER_STRATEGIST_MOCK_INVALID");
  const promptVersion = nonEmpty(input.promptVersion || "scripted-mock-prompt-v1",
    "ROSTER_STRATEGIST_MOCK_INVALID");
  const calls = [];
  return freezeDeep({
    descriptor: () => freezeDeep({
      kind: "scripted_mock_deterministic",
      modelVersion,
      promptVersion,
      paidProviderCalls: 0,
      realProviderCalls: 0,
      trainingTruth: false,
    }),
    calls: () => calls.map((entry) => clone(entry)),
    async deliberate(request) {
      const output = await input.handler(clone(request));
      if (!object(output)) fail("ROSTER_STRATEGIST_MOCK_OUTPUT_INVALID");
      const receiptBody = {
        providerKind: "scripted_mock_deterministic",
        modelVersion,
        promptVersion,
        roundKind: request.roundKind,
        contextHash: hash64(request.contextHash, "ROSTER_STRATEGIST_MOCK_INVALID"),
        outputHash: hashStarcraftTmgContract(output),
        usage: null,
        usageStatus: "unknown_not_applicable_for_mock",
        latencyMs: null,
        paidProviderCall: false,
        trainingTruth: false,
      };
      const receipt = freezeDeep({ ...receiptBody,
        receiptHash: hashStarcraftTmgContract(receiptBody) });
      calls.push(receipt);
      return freezeDeep({ output: clone(output), receipt });
    },
  });
}

// ------------------------------------------------------------- runtime

export function createRosterStrategistRuntimeV1(input = {}) {
  const armyBuilderPort = input.armyBuilderPort;
  if (typeof armyBuilderPort?.evaluateRosterCandidate !== "function"
    || typeof armyBuilderPort?.enumerateArmyBuildingChoices !== "function"
    || typeof armyBuilderPort?.portDescriptor !== "function") {
    fail("ROSTER_STRATEGIST_BUILDER_PORT_INVALID");
  }
  const portDescriptor = armyBuilderPort.portDescriptor();
  verifyOfficialArmyBuilderQueryPortDescriptorV1(portDescriptor);
  const laboratory = input.laboratory;
  if (typeof laboratory?.labDescriptor !== "function"
    || typeof laboratory?.queryProbability !== "function"
    || typeof laboratory?.querySpatial !== "function"
    || typeof laboratory?.queryMath !== "function"
    || typeof laboratory?.queryThreatExchange !== "function"
    || typeof laboratory?.runScenarioBranch !== "function"
    || typeof laboratory?.missionScoringAuthority !== "function") {
    fail("ROSTER_STRATEGIST_LABORATORY_INVALID");
  }
  const labDescriptor = laboratory.labDescriptor();
  verifyPregameSceneLaboratoryDescriptorV1(labDescriptor);
  const pack = input.strategyPack;
  const entries = pack?.foundational?.entries;
  if (!Array.isArray(entries) || entries.length < 5
    || !HASH_PATTERN.test(String(pack?.receipt?.hash || ""))) {
    fail("ROSTER_STRATEGIST_STRATEGY_PACK_INVALID");
  }
  verifyRosterStrategistOutputContractSetV1(
    ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1);

  const descriptorBody = {
    schema: ROSTER_STRATEGIST_DESCRIPTOR_SCHEMA,
    version: ROSTER_STRATEGIST_RUNTIME_VERSION,
    promptPack: ROSTER_STRATEGIST_PROMPT_PACK_V1,
    portDescriptorHash: portDescriptor.descriptorHash,
    laboratoryDescriptorHash: labDescriptor.descriptorHash,
    strategyPackManifestHash: pack.manifest?.hash ?? null,
    strategyPackReceiptHash: pack.receipt.hash,
    strategySources: ["general_skill", "faction_skill", "directed_matchup_skill",
      "agent_deliberation"],
    hostPreferenceWeights: false,
    promptPreferenceWeights: false,
    runtimeRanksOrScoresCandidates: false,
    rulesRemainSoleLegalityAuthority: true,
    strategistMayNotWaiveRepairOrReinterpretRulesRejections: true,
    hiddenChainOfThoughtRequested: false,
    hiddenChainOfThoughtPersisted: false,
    unknownStaysUnknown: true,
    // Schedule-grounding contract (sub-slice 269.13, closing the round-9
    // list-quality gap of an unknown victory-point schedule): the
    // authoritative mission task/scoring data frozen in the source Room
    // state is sealed into the foundation-round request; when it is
    // derivable the public schedule must be declared and mission-grounded,
    // otherwise the schedule stays unknown and the missing authority is
    // identified publicly. The runtime never fabricates scoring data.
    missionScoringAuthority: {
      sealedIntoFoundationRound: true,
      declaredGroundedScheduleRequiredWhenDerivable: true,
      unknownPreservedAndMissingAuthorityIdentifiedOtherwise: true,
      runtimeNeverFabricatesScoringData: true,
    },
    // Budget-utilization contract (sub-slice 269.14, closing the round-9
    // list-quality gap of 940/2000 minerals spent): unspent budget is lost,
    // so budget residue is an explicit strategic opportunity cost. The
    // near-cap threshold is derived from the Rules-owned menu (cheapest
    // positive purchasable increment), never hard-coded per faction and
    // never forced to exact budget equality; when an evaluated Rules-legal
    // candidate is near-cap the selection must be near-cap or carry an
    // explicit public justification tied to a legal retained-resource use.
    budgetUtilizationContract: {
      nearCapThresholdDerivation:
        "cheapest_positive_purchasable_increment_in_rules_owned_menu",
      unspentResourceDisposition: "lost",
      unspentBudgetIsAnExplicitOpportunityCost: true,
      nearCapSelectionOrDeclaredJustificationRequired: true,
      exactBudgetEqualityNeverForced: true,
      runtimeNeverRanksCandidates: true,
    },
    // Narrative-capacity policy (sub-slice 269.17, closing the saved live
    // round-10 window-bound blocker): free public narrative is bounded only
    // by the transport-level overall safety ceiling; exceeding a display
    // target is a soft public warning recorded in the round receipt, never
    // a rejection, and the full public text is preserved. Identifier, enum,
    // identity and legality bounds are unchanged.
    narrativeCapacityPolicy: {
      narrativeTransportCeiling: NARRATIVE_TRANSPORT_CEILING,
      displayTargets: clone(NARRATIVE_DISPLAY_TARGETS),
      exceedingDisplayTargetIsSoftWarningOnly: true,
      fullPublicNarrativeTextPreserved: true,
      identifierEnumLegalityIdentityBoundsUnchanged: true,
      transportCeilingIsOverallSafetyBoundNotPerFieldContentLimit: true,
    },
    publicOutputNormalization: {
      aliasRegistrySchema:
        ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1.schema,
      aliasRegistryVersion: ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_VERSION,
      aliasRegistryHash:
        ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1.registryHash,
      renamesOnlyAdmittedAliases: true,
      unwrapsOnlyAdmittedTransportEnvelopes: true,
      stampsOnlyAbsentRequestOwnedConstants: true,
      neverInventsStrategyContent: true,
      neverFillsMissingSemanticContent: true,
      neverWeakensLegality: true,
      neverSpecialCasesOneCandidateOrProvider: true,
      fullSchemaAndRulesValidationRunsAfterNormalization: true,
    },
    // Generation-side structured output contract (sub-slice 269.7): every
    // deliberation round request carries the round's strict Provider JSON
    // schema, so the contracted public field set is enforced at generation
    // time. The schemas bind field names, types, bounds and enums only —
    // never roster content or strategy. The normalization boundary and the
    // full schema/Rules validation still run on every decoded output.
    structuredGenerationOutput: {
      contractSetSchema:
        ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.schema,
      contractSetVersion: ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.version,
      contractSetHash:
        ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contractSetHash,
      contracts: clone(ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contracts),
      generationSideFieldSetEnforcement: true,
      schemaFieldSetsMatchRuntimeValidators: true,
      placeholderFieldsNeverReachRulesOrToolReceipts: true,
      normalizationBoundaryStillRunsAfterDecoding: true,
      fullSchemaAndRulesValidationStillRunsAfterDecoding: true,
      neverInventsStrategyContent: true,
      neverWeakensLegality: true,
    },
    trainingTruth: false,
  };
  const descriptor = freezeDeep({ ...descriptorBody,
    descriptorHash: hashStarcraftTmgContract(descriptorBody) });

  function selectSkillRoute(routeInput = {}) {
    const ownFaction = nonEmpty(routeInput.ownFactionRecordKey,
      "ROSTER_STRATEGIST_SKILL_ROUTE_INVALID");
    const opponentFaction = nonEmpty(routeInput.opponentFactionRecordKey,
      "ROSTER_STRATEGIST_SKILL_ROUTE_INVALID");
    const general = entries.find((entry) => entry.role === "general");
    const faction = entries.find((entry) => entry.role === "faction"
      && entry.factionRecordKey === ownFaction);
    const matchup = entries.find((entry) => entry.role === "matchup"
      && entry.ownFaction === ownFaction
      && entry.opponentFaction === opponentFaction);
    if (!general || !faction || !matchup) {
      fail("ROSTER_STRATEGIST_SKILL_ROUTE_UNAVAILABLE", JSON.stringify({
        general: Boolean(general), faction: Boolean(faction),
        matchup: Boolean(matchup), ownFaction, opponentFaction }));
    }
    const skillRefs = [
      { role: "general", entry: general },
      { role: "faction", entry: faction },
      { role: "matchup", entry: matchup },
    ].map(({ role, entry }) => freezeDeep({
      role,
      skillId: entry.skill.skillId,
      version: entry.skill.version,
      skillHash: entry.skill.hash,
      qualificationHash: entry.qualificationRef.hash,
      runtimeAccepted: entry.skill.runtimeAccepted === true,
      canAffectRules: entry.skill.canAffectRules === true,
    }));
    return freezeDeep({
      receipt: hashedReceipt({
        schema: ROSTER_STRATEGIST_SKILL_ROUTE_RECEIPT_SCHEMA,
        ownFactionRecordKey: ownFaction,
        opponentFactionRecordKey: opponentFaction,
        skillRefs,
        strategyPackManifestHash: pack.manifest?.hash ?? null,
        strategyPackReceiptHash: pack.receipt.hash,
        selectionPolicy: "exact_manifest_role_and_direction_only",
        skillsAdvisoryOnlyCannotAffectRules: true,
        providerCalls: 0,
        trainingTruth: false,
      }),
      skillRefs,
      projections: freezeDeep({
        general: skillGuidanceProjection(general.skill),
        faction: skillGuidanceProjection(faction.skill),
        matchup: skillGuidanceProjection(matchup.skill),
      }),
    });
  }

  function menuProjection(enumeration) {
    return freezeDeep({
      faction: {
        recordKey: enumeration.faction.recordKey,
        factionName: enumeration.faction.factionName,
        raceTag: enumeration.faction.raceTag,
        startingArmySlots: clone(enumeration.faction.startingArmySlots),
      },
      scale: clone(enumeration.scale),
      mineralBudget: enumeration.mineralBudget,
      vespeneLimitForBudget: clone(enumeration.vespeneLimitForBudget),
      tacticalCards: enumeration.tacticalCandidates.map((entry) => ({
        recordKey: entry.recordKey, cardName: entry.cardName,
        vespeneGasCost: entry.vespeneGasCost,
        armySlotsAdded: clone(entry.armySlotsAdded),
      })),
      units: enumeration.unitCandidates.map((entry) => ({
        recordKey: entry.recordKey, unitName: entry.unitName,
        armySlotType: entry.armySlotType,
        compositionOptions: entry.compositionOptions.map((option) => ({
          compositionKind: option.compositionKind,
          startingModels: option.startingModels,
          startingSupply: option.startingSupply,
          occupiedArmySlots: clone(option.occupiedArmySlots),
          mineralCost: option.mineralCost,
        })),
        purchasableUpgrades: entry.purchasableUpgrades.map((upgrade) => ({
          upgradeName: upgrade.upgradeName,
          applicationKind: upgrade.applicationKind,
          specialistAssignmentRequired: upgrade.specialistAssignmentRequired,
          mineralCostByComposition: clone(upgrade.mineralCostByComposition),
        })),
      })),
      legalityNote: enumeration.legalityNote,
    });
  }

  // Menu-derived near-cap threshold (sub-slice 269.14, closing the round-9
  // list-quality gap of 940/2000 minerals spent): the cheapest positive
  // purchasable mineral increment anywhere in the Rules-owned menu. The
  // derivation is general — it reads the menu, is never hard-coded per
  // faction and never forces exact budget equality. A candidate whose
  // unspent minerals fall below this increment cannot purchase even the
  // cheapest remaining item, so its residue is near-cap.
  function nearCapThresholdMineralsFromMenu(menuValue) {
    const costs = [];
    const push = (value) => {
      const numeric = Number(value);
      if (Number.isSafeInteger(numeric) && numeric > 0) costs.push(numeric);
    };
    for (const unit of menuValue.units || []) {
      for (const option of unit.compositionOptions || []) {
        push(option.mineralCost);
      }
      for (const upgrade of unit.purchasableUpgrades || []) {
        const byComposition = upgrade.mineralCostByComposition;
        if (Array.isArray(byComposition)) {
          for (const entry of byComposition) push(entry?.mineralCost ?? entry);
        } else if (object(byComposition)) {
          for (const value of Object.values(byComposition)) push(value);
        }
      }
    }
    // With no positive purchasable increment only an exact-budget roster is
    // near-cap; a real menu always yields its cheapest composition/upgrade.
    return costs.length ? Math.min(...costs) : 1;
  }

  // ---------------------------------------------------- output validation

  // General narrative-capacity policy (sub-slice 269.17, mirroring the
  // strict output contract set v1.4.0): free public narrative is bounded
  // only by the transport-level overall safety ceiling; exceeding a role's
  // display target records a soft public warning in the round receipt,
  // never a rejection, and the full public text is preserved. Identifiers,
  // enums, identities and every legality check keep their exact existing
  // rules — nonEmpty/textList are unchanged for them.
  let activeNarrativeWarnings = null;
  function narrative(value, code,
    { path = "narrative", role = "publicProse" } = {}) {
    const text = String(value || "").trim();
    if (!text) fail(code);
    if (text.length > NARRATIVE_TRANSPORT_CEILING) {
      fail(code, "narrative_transport_ceiling_exceeded");
    }
    const displayTarget = NARRATIVE_DISPLAY_TARGETS[role];
    if (activeNarrativeWarnings && text.length > displayTarget) {
      activeNarrativeWarnings.push(freezeDeep({
        path, role, displayTarget, observedLength: text.length,
        severity: "soft_display_target_exceeded", fullTextPreserved: true,
      }));
    }
    return text;
  }
  function narrativeList(value, code,
    { allowEmpty = true, max = MAX_LIST, path = "narrative",
      role = "publicProse" } = {}) {
    if (!Array.isArray(value) || value.length > max) fail(code);
    if (!allowEmpty && value.length === 0) fail(code);
    return value.map((entry, index) => narrative(entry, code,
      { path: `${path}[${index}]`, role }));
  }

  function validateEnvelope(output, roundKind) {
    if (!object(output)) fail("ROSTER_STRATEGIST_OUTPUT_INVALID", roundKind);
    rejectForbiddenKeys(output);
    if (output.schemaVersion !== ROSTER_STRATEGIST_DELIBERATION_SCHEMA
      || output.roundKind !== roundKind) {
      fail("ROSTER_STRATEGIST_OUTPUT_INVALID",
        `${roundKind}:envelope:keys=${Object.keys(output).join(",").slice(0, 200)}`
          + `:schemaVersion=${String(output.schemaVersion).slice(0, 80)}`
          + `:roundKind=${String(output.roundKind).slice(0, 80)}`);
    }
  }

  function validateScoreRoute(value, code) {
    if (!object(value)) fail(code);
    exactKeys(value, ["routeKind", "routeText", "scheduleStatus",
      "targetVpSchedule", "fallbackRouteText"], code);
    if (!ROUTE_KINDS.has(value.routeKind)) fail(code, "routeKind");
    if (!SCHEDULE_STATUSES.has(value.scheduleStatus)) fail(code, "scheduleStatus");
    return {
      routeKind: value.routeKind,
      routeText: narrative(value.routeText, code,
        { path: "scoreRoute.routeText" }),
      scheduleStatus: value.scheduleStatus,
      targetVpSchedule: (value.targetVpSchedule || []).map((entry, index) => ({
        window: narrative(entry?.window, code, {
          path: `scoreRoute.targetVpSchedule[${index}].window`,
          role: "scheduleWindowLabel" }),
        plannedCumulativeVp: Number(entry?.plannedCumulativeVp),
      })),
      fallbackRouteText: narrative(value.fallbackRouteText, code,
        { path: "scoreRoute.fallbackRouteText" }),
    };
  }

  function validateFoundation(output, { missionAuthorityDerivable } = {}) {
    validateEnvelope(output, "strategy_foundation");
    exactKeys(output, ["schemaVersion", "roundKind", "scoreRoute",
      "scoreRouteAuthority", "opponentHypotheses", "counterResponses",
      "invalidationTriggers", "informationNeeds"],
      "ROSTER_STRATEGIST_FOUNDATION_INVALID");
    const code = "ROSTER_STRATEGIST_FOUNDATION_INVALID";
    const scoreRoute = validateScoreRoute(output.scoreRoute, code);
    // Schedule-grounding contract (sub-slice 269.13): a mission-grounded
    // VP schedule is built from the authoritative task/scoring data when
    // that authority is derivable; otherwise unknown is preserved and the
    // missing authority is identified. Never fabricated either way.
    const grounding = output.scoreRouteAuthority;
    if (!object(grounding)) fail(code, "scoreRouteAuthority");
    exactKeys(grounding, ["status", "authorityText"], code);
    if (!["mission_grounded", "unknown_missing_authority"].includes(
      grounding.status)) {
      fail(code, "scoreRouteAuthority:status");
    }
    const groundingResult = {
      status: grounding.status,
      authorityText: narrative(grounding.authorityText, code,
        { path: "scoreRouteAuthority.authorityText" }),
    };
    if (missionAuthorityDerivable === true
      && (scoreRoute.scheduleStatus !== "declared"
        || grounding.status !== "mission_grounded")) {
      fail(code, "schedule_grounding:"
        + "derivable_authority_requires_declared_mission_grounded_schedule");
    }
    if (missionAuthorityDerivable === false
      && (scoreRoute.scheduleStatus !== "unknown"
        || grounding.status !== "unknown_missing_authority")) {
      fail(code, "schedule_grounding:"
        + "missing_authority_preserves_unknown_and_identifies_"
        + "missing_authority");
    }
    const hypotheses = (output.opponentHypotheses || []).map((entry) => {
      exactKeys(entry, ["hypothesisId", "archetypeLabel", "hypothesisText",
        "confidence", "expectedCounterTexts", "ownCounterResponseIds",
        "falsificationText"], code);
      if (!CONFIDENCE_LEVELS.has(entry.confidence)) fail(code, "confidence");
      return {
        hypothesisId: nonEmpty(entry.hypothesisId, code),
        archetypeLabel: nonEmpty(entry.archetypeLabel, code),
        hypothesisText: narrative(entry.hypothesisText, code,
          { path: "opponentHypotheses.hypothesisText" }),
        confidence: entry.confidence,
        expectedCounterTexts: narrativeList(entry.expectedCounterTexts || [],
          code, { path: "opponentHypotheses.expectedCounterTexts" }),
        ownCounterResponseIds: textList(entry.ownCounterResponseIds || [], code),
        falsificationText: narrative(entry.falsificationText, code,
          { path: "opponentHypotheses.falsificationText" }),
      };
    });
    if (hypotheses.length < 1 || hypotheses.length > 8) fail(code, "hypotheses");
    const responses = (output.counterResponses || []).map((entry) => {
      exactKeys(entry, ["responseId", "triggerText", "responseText",
        "linkedHypothesisIds"], code);
      return {
        responseId: nonEmpty(entry.responseId, code),
        triggerText: narrative(entry.triggerText, code,
          { path: "counterResponses.triggerText" }),
        responseText: narrative(entry.responseText, code,
          { path: "counterResponses.responseText" }),
        linkedHypothesisIds: textList(entry.linkedHypothesisIds || [], code),
      };
    });
    const triggers = (output.invalidationTriggers || []).map((entry) => {
      exactKeys(entry, ["triggerId", "observationKind", "triggerText",
        "revisionRequiredText"], code);
      if (!TRIGGER_OBSERVATION_KINDS.has(entry.observationKind)) {
        fail(code, "observationKind");
      }
      return {
        triggerId: nonEmpty(entry.triggerId, code),
        observationKind: entry.observationKind,
        triggerText: narrative(entry.triggerText, code,
          { path: "invalidationTriggers.triggerText" }),
        revisionRequiredText: narrative(entry.revisionRequiredText, code,
          { path: "invalidationTriggers.revisionRequiredText" }),
      };
    });
    if (triggers.length < 1) fail(code, "invalidationTriggers_required");
    const needs = (output.informationNeeds || []).map((entry) => {
      exactKeys(entry, ["needId", "kind", "questionText", "toolRequest"], code);
      if (!NEED_KINDS.has(entry.kind)) fail(code, `need_kind:${entry.kind}`);
      return {
        needId: nonEmpty(entry.needId, code),
        kind: entry.kind,
        questionText: narrative(entry.questionText, code,
          { path: "informationNeeds.questionText" }),
        toolRequest: clone(entry.toolRequest),
      };
    });
    if (needs.length < 1) fail(code, "information_needs_required");
    if (needs.length > 8) fail(code, "information_needs_bound");
    if (new Set(needs.map((entry) => entry.needId)).size !== needs.length) {
      fail(code, "information_need_ids_unique");
    }
    return {
      scoreRoute,
      scoreRouteAuthority: groundingResult,
      opponentHypotheses: hypotheses,
      counterResponses: responses,
      invalidationTriggers: triggers,
      informationNeeds: needs,
    };
  }

  function validateProposals(output, menu) {
    validateEnvelope(output, "candidate_proposals");
    exactKeys(output, ["schemaVersion", "roundKind", "proposals"],
      "ROSTER_STRATEGIST_PROPOSALS_INVALID");
    const code = "ROSTER_STRATEGIST_PROPOSALS_INVALID";
    const proposals = output.proposals;
    if (!Array.isArray(proposals) || proposals.length < 2 || proposals.length > 4) {
      fail(code, "proposal_count_2_to_4_required");
    }
    const unitMenu = new Map(menu.units.map((entry) => [entry.recordKey, entry]));
    const tacticalMenu = new Set(menu.tacticalCards.map((entry) => entry.recordKey));
    const seen = new Set();
    return proposals.map((proposal) => {
      exactKeys(proposal, ["candidateId", "tacticalCardRecordKeys", "units",
        "rationaleText"], code);
      const candidateId = nonEmpty(proposal.candidateId, code);
      if (seen.has(candidateId)) fail(code, `duplicate:${candidateId}`);
      seen.add(candidateId);
      const tacticalCardRecordKeys = textList(
        proposal.tacticalCardRecordKeys || [], code, { max: 8 });
      for (const key of tacticalCardRecordKeys) {
        if (!tacticalMenu.has(key)) fail(code, `tactical_not_in_menu:${key}`);
      }
      const units = proposal.units;
      if (!Array.isArray(units) || units.length < 1 || units.length > 24) {
        fail(code, "units_bound");
      }
      const unitIds = new Set();
      const mappedUnits = units.map((unit, index) => {
        exactKeys(unit, ["recordKey", "compositionKind", "upgrades"], code);
        const recordKey = nonEmpty(unit.recordKey, code);
        const menuEntry = unitMenu.get(recordKey);
        if (!menuEntry) fail(code, `unit_not_in_menu:${recordKey}`);
        if (!menuEntry.compositionOptions.some((option) => (
          option.compositionKind === unit.compositionKind))) {
          fail(code, `composition_not_in_menu:${recordKey}:${unit.compositionKind}`);
        }
        const upgradeMenu = new Set(menuEntry.purchasableUpgrades.map(
          (upgrade) => upgrade.upgradeName));
        const upgrades = (unit.upgrades || []).map((upgrade) => {
          exactKeys(upgrade, ["upgradeName"], code);
          const upgradeName = nonEmpty(upgrade.upgradeName, code);
          if (!upgradeMenu.has(upgradeName)) {
            fail(code, `upgrade_not_in_menu:${recordKey}:${upgradeName}`);
          }
          return { upgradeName };
        });
        const unitInstanceId = `agent-unit-${index + 1}`;
        if (unitIds.has(unitInstanceId)) fail(code, "unit_instance_unique");
        unitIds.add(unitInstanceId);
        return {
          unitInstanceId,
          recordKey,
          compositionKind: unit.compositionKind,
          upgrades,
        };
      });
      return {
        candidateId,
        tacticalCardRecordKeys,
        units: mappedUnits,
        rationaleText: narrative(proposal.rationaleText, code,
          { path: `proposals.${candidateId}.rationaleText` }),
      };
    });
  }

  function validateComparison(output, evaluated, budgetContract) {
    validateEnvelope(output, "comparison_selection");
    exactKeys(output, ["schemaVersion", "roundKind", "comparison",
      "componentPurposes", "deploymentConcept", "resourceUtilization",
      "lossResourceBudget", "publicSummaryText"],
      "ROSTER_STRATEGIST_COMPARISON_INVALID");
    const code = "ROSTER_STRATEGIST_COMPARISON_INVALID";
    const comparison = output.comparison;
    if (!object(comparison)) fail(code);
    exactKeys(comparison, ["basisTexts", "tradeoffTexts", "selectedCandidateId"],
      code);
    const selectedCandidateId = nonEmpty(comparison.selectedCandidateId, code);
    const selected = evaluated.find((entry) => (
      entry.proposal.candidateId === selectedCandidateId));
    if (!selected) fail("ROSTER_STRATEGIST_SELECTION_UNKNOWN", selectedCandidateId);
    if (selected.candidate.legalityStatus !== "legal") {
      fail("ROSTER_STRATEGIST_SELECTION_NOT_RULES_LEGAL", selectedCandidateId);
    }
    // Budget-utilization contract (sub-slice 269.14): unspent budget is
    // lost, so the near-cap facts are recomputed from the Rules verdicts
    // and the menu-derived threshold; the model's echoes must match those
    // computed values exactly, and declining an available near-cap
    // candidate requires a declared public justification tied to a legal
    // retained-resource use. The runtime computes but never ranks.
    const { nearCapThresholdMinerals, mineralBudget } = budgetContract;
    const utilizationFacts = new Map(evaluated
      .filter((entry) => entry.candidate.legalityStatus === "legal")
      .map((entry) => {
        const mineralUnspent = mineralBudget
          - entry.verdictOrRejection.summary.mineralSpent;
        return [entry.proposal.candidateId, {
          mineralUnspent,
          nearCap: mineralUnspent < nearCapThresholdMinerals,
        }];
      }));
    const computedNearCapAvailable = [...utilizationFacts.values()].some(
      (fact) => fact.nearCap);
    const computedSelectedNearCap =
      utilizationFacts.get(selectedCandidateId)?.nearCap === true;
    const utilization = output.resourceUtilization;
    if (!object(utilization)) fail(code, "resourceUtilization");
    exactKeys(utilization, ["nearCapCandidateAvailable",
      "selectedCandidateNearCap", "unspentBudgetAcknowledgedLost",
      "retainedResourceJustificationStatus",
      "retainedResourceJustificationText"], code);
    if (utilization.nearCapCandidateAvailable !== computedNearCapAvailable) {
      fail(code, "resourceUtilization:near_cap_availability_echo_mismatch");
    }
    if (utilization.selectedCandidateNearCap !== computedSelectedNearCap) {
      fail(code, "resourceUtilization:selected_near_cap_echo_mismatch");
    }
    if (utilization.unspentBudgetAcknowledgedLost !== true) {
      fail(code, "resourceUtilization:unspent_budget_lost_not_acknowledged");
    }
    if (!["declared", "not_applicable"].includes(
      utilization.retainedResourceJustificationStatus)) {
      fail(code, "resourceUtilization:justification_status");
    }
    const justificationRaw = String(
      utilization.retainedResourceJustificationText ?? "").trim();
    const justificationText = justificationRaw
      ? narrative(justificationRaw, code,
        { path: "resourceUtilization.retainedResourceJustificationText" })
      : "";
    if (utilization.retainedResourceJustificationStatus === "declared"
      && !justificationText) {
      fail(code, "resourceUtilization:justification_text_required");
    }
    if (utilization.retainedResourceJustificationStatus === "not_applicable"
      && justificationText) {
      fail(code, "resourceUtilization:justification_text_must_be_empty");
    }
    if (computedNearCapAvailable && !computedSelectedNearCap
      && utilization.retainedResourceJustificationStatus !== "declared") {
      fail(code,
        "resourceUtilization:justification_required_when_near_cap_available");
    }
    const purposes = (output.componentPurposes || []).map((entry) => {
      exactKeys(entry, ["componentKind", "recordKey", "instanceId",
        "publicPurposeText", "scoringRole"], code);
      if (!COMPONENT_KINDS.has(entry.componentKind)) fail(code, "componentKind");
      if (!SCORING_ROLES.has(entry.scoringRole)) fail(code, "scoringRole");
      return {
        componentKind: entry.componentKind,
        recordKey: nonEmpty(entry.recordKey, code),
        instanceId: nonEmpty(entry.instanceId, code),
        publicPurposeText: narrative(entry.publicPurposeText, code,
          { path: `componentPurposes.${entry.instanceId}.publicPurposeText` }),
        scoringRole: entry.scoringRole,
      };
    });
    if (purposes.length < 1) fail(code, "component_purposes_required");
    validatePurposeBindings(purposes, selected, code);
    const deployment = output.deploymentConcept;
    if (!object(deployment)) fail(code, "deploymentConcept");
    exactKeys(deployment, ["deploymentConceptText", "activationOrderStatus",
      "activationOrder", "reinforcementPolicyText", "threatTradeText",
      "objectiveControlText"], code);
    const activationOrder = (deployment.activationOrder || []).map((entry) => {
      exactKeys(entry, ["ordinal", "unitInstanceId", "phase"], code);
      return {
        ordinal: Number(entry?.ordinal),
        unitInstanceId: nonEmpty(entry?.unitInstanceId, code),
        phase: nonEmpty(entry?.phase, code),
      };
    });
    const selectedUnitIds = new Set(selected.proposal.units.map(
      (unit) => unit.unitInstanceId));
    for (const entry of activationOrder) {
      if (!selectedUnitIds.has(entry.unitInstanceId)) {
        fail(code, `activation_order_unit_not_selected:${entry.unitInstanceId}`);
      }
    }
    let lossBudget = null;
    if (output.lossResourceBudget !== null && output.lossResourceBudget !== undefined) {
      const budget = output.lossResourceBudget;
      exactKeys(budget, ["lossBudgetStatus", "plannedLossBudget"], code);
      if (!["declared", "unknown"].includes(budget.lossBudgetStatus)) {
        fail(code, "lossBudgetStatus");
      }
      lossBudget = {
        lossBudgetStatus: budget.lossBudgetStatus,
        plannedLossBudget: (budget.plannedLossBudget || []).map((entry, i) => ({
          resourceKind: nonEmpty(entry?.resourceKind, code),
          window: narrative(entry?.window, code, {
            path: `lossResourceBudget.plannedLossBudget[${i}].window`,
            role: "scheduleWindowLabel" }),
          plannedMaximumLoss: Number(entry?.plannedMaximumLoss),
        })),
      };
    }
    return {
      comparison: {
        basisTexts: narrativeList(comparison.basisTexts, code,
          { allowEmpty: false, path: "comparison.basisTexts" }),
        tradeoffTexts: narrativeList(comparison.tradeoffTexts || [], code,
          { path: "comparison.tradeoffTexts" }),
        selectedCandidateId,
      },
      componentPurposes: purposes,
      deploymentConcept: {
        deploymentConceptText: narrative(deployment.deploymentConceptText,
          code, { path: "deploymentConcept.deploymentConceptText" }),
        activationOrderStatus: deployment.activationOrderStatus === "declared"
          ? "declared" : "unknown",
        activationOrder,
        reinforcementPolicyText: narrative(deployment.reinforcementPolicyText,
          code, { path: "deploymentConcept.reinforcementPolicyText" }),
        threatTradeText: narrative(deployment.threatTradeText, code,
          { path: "deploymentConcept.threatTradeText" }),
        objectiveControlText: narrative(deployment.objectiveControlText, code,
          { path: "deploymentConcept.objectiveControlText" }),
      },
      lossResourceBudget: lossBudget,
      resourceUtilization: {
        nearCapCandidateAvailable: computedNearCapAvailable,
        selectedCandidateNearCap: computedSelectedNearCap,
        unspentBudgetAcknowledgedLost: true,
        retainedResourceJustificationStatus:
          utilization.retainedResourceJustificationStatus,
        retainedResourceJustificationText: justificationText,
        nearCapThresholdMinerals,
      },
      publicSummaryText: narrative(output.publicSummaryText, code,
        { path: "publicSummaryText" }),
    };
  }

  function validatePurposeBindings(purposes, selected, code) {
    const proposal = selected.proposal;
    const unitsById = new Map(proposal.units.map((unit) => [
      unit.unitInstanceId, unit]));
    for (const purpose of purposes) {
      if (purpose.componentKind === "faction_card") {
        if (purpose.instanceId !== `${proposal.sideKeySafe}-faction`) {
          fail(code, `faction_card_instance:${purpose.instanceId}`);
        }
        continue;
      }
      if (purpose.componentKind === "tactical_card") {
        const index = proposal.tacticalCardRecordKeys.indexOf(purpose.recordKey);
        if (index < 0
          || purpose.instanceId !== `${proposal.sideKeySafe}-tactical-${index + 1}`) {
          fail(code, `tactical_card_binding:${purpose.instanceId}`);
        }
        continue;
      }
      if (purpose.componentKind === "unit") {
        const unit = unitsById.get(purpose.instanceId);
        if (!unit || unit.recordKey !== purpose.recordKey) {
          fail(code, `unit_binding:${purpose.instanceId}`);
        }
        continue;
      }
      if (purpose.componentKind === "composition") {
        const match = /^(.+)-composition$/u.exec(purpose.instanceId);
        const unit = match && unitsById.get(match[1]);
        if (!unit || unit.recordKey !== purpose.recordKey) {
          fail(code, `composition_binding:${purpose.instanceId}`);
        }
        continue;
      }
      if (purpose.componentKind === "upgrade") {
        const match = /^(.+)-upgrade-(\d+)$/u.exec(purpose.instanceId);
        const unit = match && unitsById.get(match[1]);
        const upgradeIndex = match ? Number(match[2]) - 1 : -1;
        if (!unit || unit.recordKey !== purpose.recordKey
          || upgradeIndex < 0 || upgradeIndex >= unit.upgrades.length) {
          fail(code, `upgrade_binding:${purpose.instanceId}`);
        }
      }
    }
  }

  // -------------------------------------------------- information needs

  // Kind-driven canonicalization of the wire toolRequest. The strict
  // generation schema is a closed superset over every laboratory query
  // family, so fields a declared need kind does not consume arrive as
  // schema-mandated placeholders ("" / 0 / [] / false). This projection
  // keeps exactly the fields the declared kind consumes and drops the
  // placeholders, so placeholder values never reach Rules or tool receipts
  // and a canonical (already minimal) request passes through byte
  // identically. It never invents or alters strategy content; malformed
  // remnant values are left for the laboratory to reject typed, which the
  // caller records as a failed need (unknown stays unknown).
  function canonicalToolRequest(need) {
    const raw = object(need.toolRequest) ? need.toolRequest : {};
    const textOrNull = (value) => {
      const normalized = String(value ?? "").trim();
      return normalized || null;
    };
    const idList = (value) => (Array.isArray(value)
      ? value.map(textOrNull).filter(Boolean).slice(0, MAX_LIST) : []);
    const positiveBudget = (value) => {
      const numeric = Number(value);
      return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
    };
    const integerOrZero = (value) => {
      const numeric = Number(value);
      return Number.isSafeInteger(numeric) ? numeric : 0;
    };
    const scheduleEntries = (value, vpField) => (Array.isArray(value)
      ? value.slice(0, MAX_LIST).map((entry) => ({
        window: textOrNull(entry?.window) || "",
        [vpField]: integerOrZero(entry?.[vpField]),
      })).filter((entry) => entry.window)
      : []);
    const request = {};
    const branchIdRef = textOrNull(raw.branchIdRef);
    if (branchIdRef) request.branchIdRef = branchIdRef;
    const putText = (key) => {
      const valueText = textOrNull(raw[key]);
      if (valueText) request[key] = valueText;
    };
    const putIdList = (key) => {
      const list = idList(raw[key]);
      if (list.length) request[key] = list;
    };
    const putBudget = () => {
      const sample = positiveBudget(raw.sampleBudget);
      if (sample) request.sampleBudget = sample;
    };
    if (need.kind === "probability") {
      putText("attackerUnitId");
      putText("targetUnitId");
      putBudget();
    } else if (need.kind === "spatial") {
      putText("seatKey");
      putText("intent");
      putIdList("subjectUnitIds");
      putIdList("targetIds");
    } else if (need.kind === "threat_exchange") {
      putText("seatKey");
      putBudget();
      putIdList("subjectUnitIds");
      putIdList("targetIds");
    } else if (need.kind === "math") {
      const mathKind = textOrNull(raw.mathKind);
      if (mathKind) request.mathKind = mathKind;
      const inputs = object(raw.inputs) ? raw.inputs : {};
      if (mathKind === "budget_fit") {
        request.inputs = {
          mineralBudget: integerOrZero(inputs.mineralBudget),
          mineralSpent: integerOrZero(inputs.mineralSpent),
          vespeneSpent: integerOrZero(inputs.vespeneSpent),
          vespeneLimitNumerator: integerOrZero(inputs.vespeneLimitNumerator),
          vespeneLimitDenominator:
            integerOrZero(inputs.vespeneLimitDenominator),
        };
      } else if (mathKind === "vp_schedule_delta") {
        request.inputs = {
          planned: scheduleEntries(inputs.planned, "plannedCumulativeVp"),
          projected: scheduleEntries(inputs.projected, "cumulativeVp"),
        };
      } else if (mathKind === "integer_sum") {
        request.inputs = {
          values: (Array.isArray(inputs.values) ? inputs.values : [])
            .slice(0, 128).map((value) => integerOrZero(value)),
        };
      } else {
        request.inputs = {};
      }
    } else if (need.kind === "scenario") {
      const rawSpec = object(raw.spec) ? raw.spec : {};
      const spec = {};
      const specKind = textOrNull(rawSpec.kind);
      if (specKind) spec.kind = specKind;
      const steps = Number(rawSpec.lifecycleSteps);
      if (Number.isSafeInteger(steps) && steps > 0) {
        spec.lifecycleSteps = steps;
      }
      const phase = textOrNull(rawSpec.phase);
      if (phase) {
        spec.phase = phase;
        const activeSideKey = textOrNull(rawSpec.activeSideKey);
        if (activeSideKey) spec.activeSideKey = activeSideKey;
      }
      if (rawSpec.isolateToPlacedPieces === true) {
        spec.isolateToPlacedPieces = true;
      }
      if (rawSpec.clearTerrain === true) spec.clearTerrain = true;
      const placements = (Array.isArray(rawSpec.placements)
        ? rawSpec.placements : []).slice(0, 4).map((placement) => ({
        pieceId: textOrNull(placement?.pieceId) || "",
        xInches: Number(placement?.xInches),
        yInches: Number(placement?.yInches),
      }));
      if (placements.length) spec.placements = placements;
      request.spec = spec;
      const followUps = (Array.isArray(raw.followUps) ? raw.followUps : [])
        .slice(0, 4).map((followUp) => {
          const canonical = {};
          const followKind = textOrNull(followUp?.kind);
          if (followKind) canonical.kind = followKind;
          for (const key of ["attackerUnitId", "targetUnitId", "seatKey",
            "intent"]) {
            const valueText = textOrNull(followUp?.[key]);
            if (valueText) canonical[key] = valueText;
          }
          const sample = positiveBudget(followUp?.sampleBudget);
          if (sample) canonical.sampleBudget = sample;
          for (const key of ["subjectUnitIds", "targetIds"]) {
            const list = idList(followUp?.[key]);
            if (list.length) canonical[key] = list;
          }
          return canonical;
        }).filter((followUp) => followUp.kind);
      if (followUps.length) request.followUps = followUps;
    }
    return request;
  }

  function executeInformationNeed(need, branchByNeedId, toolReceipts, traceEntry) {
    const referenceBase = {
      toolId: labDescriptor.laboratoryId,
      querySummaryText: need.questionText,
    };
    const pushReceipt = (receiptKind, receipt, summary) => {
      const reference = createRosterToolReceiptReferenceV1({
        referenceId: `needref-${need.needId}-${toolReceipts.length + 1}`,
        receiptKind,
        status: "attached",
        receiptHash: receipt.receiptHash,
        ...referenceBase,
        querySummaryText: summary || need.questionText,
      });
      toolReceipts.push(reference);
      return reference;
    };
    const failNeed = (errorCode) => {
      const reference = createRosterToolReceiptReferenceV1({
        referenceId: `needref-${need.needId}-${toolReceipts.length + 1}`,
        receiptKind: need.kind === "math" ? "math"
          : need.kind === "probability" ? "probability"
          : need.kind === "spatial" ? "spatial" : "simulation",
        status: "unknown",
        ...referenceBase,
      });
      toolReceipts.push(reference);
      traceEntry.informationNeedOutcomes.push(freezeDeep({
        needId: need.needId, kind: need.kind, status: "failed",
        errorCode, receiptReferenceIds: [reference.referenceId],
      }));
    };
    const request = canonicalToolRequest(need);
    const base = request.branchIdRef
      ? (() => {
        const branchHash = branchByNeedId.get(String(request.branchIdRef));
        if (!branchHash) return null;
        return { kind: "branch", branchStateHash: branchHash };
      })()
      : { kind: "source" };
    if (request.branchIdRef && !base) {
      failNeed("ROSTER_STRATEGIST_NEED_BRANCH_REF_UNKNOWN");
      return;
    }
    try {
      if (need.kind === "probability") {
        const receipt = laboratory.queryProbability({
          queryId: `need-${need.needId}`, base,
          attackerUnitId: request.attackerUnitId,
          targetUnitId: request.targetUnitId,
          sampleBudget: request.sampleBudget,
        });
        const reference = pushReceipt("probability", receipt);
        traceEntry.informationNeedOutcomes.push(freezeDeep({
          needId: need.needId, kind: need.kind,
          status: receipt.resultStatus === "ok" ? "answered" : "unknown",
          resultStatus: receipt.resultStatus,
          receiptReferenceIds: [reference.referenceId],
        }));
      } else if (need.kind === "spatial") {
        const receipt = laboratory.querySpatial({
          queryId: `need-${need.needId}`, base,
          seatKey: request.seatKey, intent: request.intent,
          subjectUnitIds: request.subjectUnitIds, targetIds: request.targetIds,
        });
        const reference = pushReceipt("spatial", receipt);
        traceEntry.informationNeedOutcomes.push(freezeDeep({
          needId: need.needId, kind: need.kind,
          status: receipt.resultStatus === "ok" ? "answered" : "unknown",
          resultStatus: receipt.resultStatus,
          receiptReferenceIds: [reference.referenceId],
        }));
      } else if (need.kind === "threat_exchange") {
        const receipt = laboratory.queryThreatExchange({
          queryId: `need-${need.needId}`, base,
          seatKey: request.seatKey, sampleBudget: request.sampleBudget,
          subjectUnitIds: request.subjectUnitIds, targetIds: request.targetIds,
        });
        const reference = pushReceipt("simulation", receipt);
        traceEntry.informationNeedOutcomes.push(freezeDeep({
          needId: need.needId, kind: need.kind,
          status: receipt.resultStatus === "ok" ? "answered" : "unknown",
          resultStatus: receipt.resultStatus,
          receiptReferenceIds: [reference.referenceId],
        }));
      } else if (need.kind === "math") {
        const receipt = laboratory.queryMath({
          queryId: `need-${need.needId}`, base,
          mathKind: request.mathKind, inputs: request.inputs,
        });
        const reference = pushReceipt("math", receipt);
        traceEntry.informationNeedOutcomes.push(freezeDeep({
          needId: need.needId, kind: need.kind,
          status: "answered", resultStatus: receipt.resultStatus,
          receiptReferenceIds: [reference.referenceId],
        }));
      } else if (need.kind === "scenario") {
        const receipt = laboratory.runScenarioBranch({
          branchId: `need-${need.needId}`, base,
          spec: request.spec,
        });
        branchByNeedId.set(need.needId, receipt.branchStateHash);
        const referenceIds = [pushReceipt("simulation", receipt,
          `${need.questionText} (scenario branch)`).referenceId];
        const followUps = Array.isArray(request.followUps)
          ? request.followUps.slice(0, 4) : [];
        for (const [index, followUp] of followUps.entries()) {
          const followKind = String(followUp?.kind || "");
          if (!["probability", "spatial", "threat_exchange"].includes(followKind)) {
            continue;
          }
          const followBase = { kind: "branch", branchStateHash: receipt.branchStateHash };
          const followReceipt = followKind === "probability"
            ? laboratory.queryProbability({
              queryId: `need-${need.needId}-follow-${index + 1}`, base: followBase,
              attackerUnitId: followUp.attackerUnitId,
              targetUnitId: followUp.targetUnitId,
              sampleBudget: followUp.sampleBudget })
            : followKind === "spatial"
              ? laboratory.querySpatial({
                queryId: `need-${need.needId}-follow-${index + 1}`, base: followBase,
                seatKey: followUp.seatKey, intent: followUp.intent,
                subjectUnitIds: followUp.subjectUnitIds,
                targetIds: followUp.targetIds })
              : laboratory.queryThreatExchange({
                queryId: `need-${need.needId}-follow-${index + 1}`, base: followBase,
                seatKey: followUp.seatKey, sampleBudget: followUp.sampleBudget,
                subjectUnitIds: followUp.subjectUnitIds,
                targetIds: followUp.targetIds });
          referenceIds.push(pushReceipt(
            followKind === "probability" ? "probability"
              : followKind === "spatial" ? "spatial" : "simulation",
            followReceipt,
            `${need.questionText} (branch ${followKind} follow-up)`).referenceId);
        }
        traceEntry.informationNeedOutcomes.push(freezeDeep({
          needId: need.needId, kind: need.kind, status: "answered",
          resultStatus: receipt.resultStatus,
          branchStateHash: receipt.branchStateHash,
          receiptReferenceIds: referenceIds,
        }));
      }
    } catch (error) {
      failNeed(String(error?.message || error).split(":")[0]
        .slice(0, 120) || "ROSTER_STRATEGIST_NEED_EXECUTION_FAILED");
    }
  }

  // --------------------------------------------------------- deliberation

  async function deliberateRound(deliberation, roundRequest, trace) {
    if (typeof deliberation?.deliberate !== "function"
      || typeof deliberation?.descriptor !== "function") {
      fail("ROSTER_STRATEGIST_DELIBERATION_PORT_INVALID");
    }
    const response = await deliberation.deliberate(freezeDeep(clone(roundRequest)));
    if (!object(response) || !object(response.output)) {
      fail("ROSTER_STRATEGIST_DELIBERATION_RESPONSE_INVALID");
    }
    rejectForbiddenKeys(response.output);
    trace.deliberationReceipts.push(clone(response.receipt || null));
    // Typed public-output normalization boundary: unwraps admitted transport
    // envelopes, stamps absent request-owned constants and renames admitted
    // field aliases only. It never invents or fills semantic content; the
    // strict schema/Rules validation below always runs on the normalized
    // output and fails closed on anything the boundary did not admit.
    const normalization = normalizeRosterStrategistPublicOutputV1({
      output: response.output,
      request: {
        roundKind: roundRequest.roundKind,
        schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
        contractSchema: roundRequest.responseFormat?.schema,
      },
    });
    return freezeDeep({
      output: normalization.output,
      normalizationReceipt: clone(normalization.receipt),
    });
  }

  function buildRoundRequest({ sessionId, roundIndex, roundKind, nodes,
    userMessage, contextSeed }) {
    const contextHash = hashStarcraftTmgContract(contextSeed);
    const outputContract = rosterStrategistRoundOutputContractV1(roundKind);
    return {
      sessionId,
      roundIndex,
      roundKind,
      promptPack: ROSTER_STRATEGIST_PROMPT_PACK_V1,
      promptNodes: nodes,
      userMessage,
      responseContract: {
        allowedChannels: ["roster_strategy"],
        decisionCandidateSource:
          "agent_deliberation_over_skills_and_rules_legal_choices_only",
      },
      // Strict generation-side contract: deliberation ports capable of
      // Provider JSON-schema output must request exactly this schema, so
      // the contracted public field set is structurally unavoidable. The
      // schema binds field names/types/bounds/enums only; normalization and
      // full schema/Rules validation still run on the decoded output.
      responseFormat: {
        kind: "provider_strict_json_schema",
        schemaName: outputContract.schemaName,
        outputContractRef:
          rosterStrategistRoundOutputContractRefV1(roundKind),
        schema: clone(outputContract.providerSchema),
      },
      maxOutputUnits: 8_192,
      contextHash,
    };
  }

  function roundReceipt(traceEntry) {
    return hashedReceipt({
      schema: ROSTER_STRATEGIST_ROUND_RECEIPT_SCHEMA,
      ...without(traceEntry, ["informationNeedOutcomes"]),
      informationNeedOutcomes: traceEntry.informationNeedOutcomes || [],
      hiddenChainOfThoughtRequested: false,
      hostPreferenceWeightsApplied: false,
      trainingTruth: false,
    });
  }

  // ------------------------------------------------------------ planRoster

  async function planRoster(sessionInput = {}, options = {}) {
    const code = "ROSTER_STRATEGIST_SESSION_INVALID";
    const sessionId = nonEmpty(sessionInput.sessionId, code);
    const sideKey = nonEmpty(sessionInput.sideKey, code);
    const factionRecordKey = nonEmpty(sessionInput.factionRecordKey, code);
    const opponentFactionRecordKey = nonEmpty(
      sessionInput.opponentFactionRecordKey, code);
    const engagementScale = nonEmpty(sessionInput.engagementScale || "Standard",
      code);
    const mineralBudget = Number(sessionInput.mineralBudget ?? 2_000);
    if (!Number.isSafeInteger(mineralBudget) || mineralBudget < 1) {
      fail(code, "mineralBudget");
    }
    const boundary = nonEmpty(sessionInput.opponentInformationBoundary, code);
    const deliberation = options.deliberation;
    const deliberationDescriptor = deliberation?.descriptor?.();
    if (!object(deliberationDescriptor)
      || !deliberationDescriptor.modelVersion
      || !deliberationDescriptor.promptVersion) {
      fail("ROSTER_STRATEGIST_DELIBERATION_PORT_INVALID");
    }
    const maxProposalRounds = Math.max(1, Math.min(MAX_PROPOSAL_ROUNDS,
      Number(options.maxProposalRounds || 2)));

    const route = selectSkillRoute({
      ownFactionRecordKey: factionRecordKey,
      opponentFactionRecordKey,
    });
    const enumeration = armyBuilderPort.enumerateArmyBuildingChoices({
      factionRecordKey, scaleId: engagementScale, mineralBudget });
    const menu = menuProjection(enumeration);
    // Authoritative mission task/scoring data (sub-slice 269.13), sealed
    // into the foundation-round request below: when derivable, the public
    // VP schedule must be declared and mission-grounded; when missing,
    // unknown is preserved and the missing authority is identified. The
    // runtime never fabricates scoring data.
    const missionAuthority = laboratory.missionScoringAuthority();
    const missionAuthorityDerivable =
      missionAuthority.resultStatus === "derivable";
    // Menu-derived near-cap threshold (sub-slice 269.14): unspent budget is
    // lost, so budget residue is an explicit strategic opportunity cost.
    const nearCapThresholdMinerals = nearCapThresholdMineralsFromMenu(menu);

    const provenance = createRosterPlanProvenanceV1({
      sourceLockHash: sessionInput.versionPins?.sourceLockHash,
      sourceSnapshotHash: sessionInput.versionPins?.sourceSnapshotHash,
      normalizedDatasetHash: sessionInput.versionPins?.normalizedDatasetHash,
      officialRulesVersion: sessionInput.versionPins?.officialRulesVersion,
      officialUnitsVersion: sessionInput.versionPins?.officialUnitsVersion,
      officialCardsVersion: sessionInput.versionPins?.officialCardsVersion,
      unitCompositionUpgradeDataBundleHash:
        portDescriptor.unitCompositionUpgradeDataBundleHash,
      armyResourceBudgetDataBundleHash:
        portDescriptor.armyResourceBudgetDataBundleHash,
      factionArmyEligibilityDataBundleHash:
        portDescriptor.factionArmyEligibilityDataBundleHash,
      engagementScale,
      missionBinding: {
        status: "frozen",
        missionRecordKey: sessionInput.missionBinding?.missionRecordKey,
        deploymentRecordKey: sessionInput.missionBinding?.deploymentRecordKey,
        mapTopologyHash: sessionInput.missionBinding?.mapTopologyHash,
      },
      opponentInformationBoundary: boundary,
      skillVersions: route.skillRefs.map((ref) => ({
        skillId: ref.skillId, version: ref.version,
        promoted: ref.runtimeAccepted,
      })),
      modelVersion: deliberationDescriptor.modelVersion,
      promptVersion: deliberationDescriptor.promptVersion,
    });

    const planId = nonEmpty(sessionInput.planId
      || `roster-plan-${sessionId}`, code);
    const trace = [];
    const toolReceipts = [];
    const branchByNeedId = new Map();
    const deliberationReceipts = [];
    const traceSink = { deliberationReceipts };

    // ------------------------------------------------ round 1: foundation
    const foundationNodes = [
      sealNode("frozen-context", "rules_and_source_frozen", {
        engagementScale, mineralBudget, sideKey, factionRecordKey,
        opponentFactionRecordKey, opponentInformationBoundary: boundary,
        missionBinding: clone(provenance.missionBinding),
        provenanceHash: provenance.provenanceHash,
        sourceStateHash: labDescriptor.sourceStateHash,
      }),
      sealNode("skill-guidance", "strategy_skills_advisory", {
        routeReceiptHash: route.receipt.receiptHash,
        skillsAdvisoryOnlyCannotAffectRules: true,
        projections: route.projections,
      }),
      sealNode("legal-choice-menu-summary", "rules_owned_army_builder_port", {
        enumerationReceiptHash: enumeration.receiptHash,
        denominators: clone(enumeration.denominators),
        vespeneLimitForBudget: clone(enumeration.vespeneLimitForBudget),
      }),
      // Sub-slice 269.13: the authoritative mission task/scoring data
      // frozen in the source Room state is sealed into the foundation
      // round, so a mission-grounded VP schedule is derivable from the
      // request itself; a missing authority is sealed as unknown with the
      // missing authority named.
      sealNode("mission-scoring-authority",
        "rules_owned_mission_scoring_authority", {
          resultStatus: missionAuthority.resultStatus,
          unknownReason: missionAuthority.unknownReason ?? null,
          missionScoringProfile: clone(missionAuthority.missionScoringProfile),
          markerAffinity: clone(missionAuthority.markerAffinity),
          scheduleDerivationNote: missionAuthority.scheduleDerivationNote,
          authorityReceiptHash: missionAuthority.receiptHash,
          runtimeNeverFabricatesScoringData: true,
        }),
      sealNode("response-schema", "platform", {
        schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
        roundKind: "strategy_foundation",
        fields: ["scoreRoute", "scoreRouteAuthority", "opponentHypotheses",
          "counterResponses", "invalidationTriggers", "informationNeeds"],
        informationNeedKinds: [...NEED_KINDS],
        publicFieldsOnly: true,
        envelopeAtTopLevelNoChannelsWrapper: true,
        hiddenChainOfThoughtForbidden: true,
        outputSchemaName:
          rosterStrategistRoundOutputContractV1("strategy_foundation")
            .schemaName,
        strictProviderJsonSchemaEnforced: true,
      }),
    ];
    const foundationTrace = {
      roundIndex: 1, roundKind: "strategy_foundation",
      outputContractRef:
        rosterStrategistRoundOutputContractRefV1("strategy_foundation"),
      promptNodeHashes: foundationNodes.map((node) => node.nodeHash),
      informationNeedOutcomes: [],
    };
    const foundationDeliberation = await deliberateRound(deliberation,
      buildRoundRequest({
        sessionId, roundIndex: 1, roundKind: "strategy_foundation",
        nodes: foundationNodes,
        userMessage: "Choose the public score route, opponent hypotheses, "
          + "counter-responses, invalidation triggers and typed information "
          + "needs for this roster planning session. Strategy must come from "
          + "the supplied Skills and your own deliberation. Public fields "
          + "only; never emit hidden chain-of-thought.",
        contextSeed: { sessionId, roundKind: "strategy_foundation",
          provenanceHash: provenance.provenanceHash,
          enumerationReceiptHash: enumeration.receiptHash,
          skillRouteReceiptHash: route.receipt.receiptHash },
      }), traceSink);
    const foundationOutput = foundationDeliberation.output;
    foundationTrace.outputNormalizationReceipt =
      foundationDeliberation.normalizationReceipt;
    foundationTrace.contextHash = hashStarcraftTmgContract({
      sessionId, roundKind: "strategy_foundation",
      provenanceHash: provenance.provenanceHash,
      enumerationReceiptHash: enumeration.receiptHash,
      skillRouteReceiptHash: route.receipt.receiptHash });
    const foundationWarnings = [];
    activeNarrativeWarnings = foundationWarnings;
    let foundation;
    try {
      foundation = validateFoundation(foundationOutput,
        { missionAuthorityDerivable });
    } finally {
      activeNarrativeWarnings = null;
    }
    foundationTrace.narrativeDisplayWarnings = foundationWarnings;
    foundationTrace.outputHash = hashStarcraftTmgContract(foundationOutput);
    for (const need of foundation.informationNeeds) {
      executeInformationNeed(need, branchByNeedId, toolReceipts, foundationTrace);
    }
    trace.push(roundReceipt(foundationTrace));

    // Optional Teach lane: the small plan is challenged and revised before
    // any model/composition/upgrade proposal. Existing three-round callers
    // keep their frozen behavior until they explicitly provide the two roles
    // and a read-only evidence port.
    let teachCycle = null;
    if (options.teachPorts) {
      teachCycle = await runRosterTeachCycleV1({
        ...options.teachPorts,
        initialFoundation: foundation,
        sourceHashes: [provenance.provenanceHash,
          route.receipt.receiptHash, enumeration.receiptHash,
          missionAuthority.receiptHash,
          ...route.skillRefs.map((ref) => ref.skillHash)],
        sourceContext: {
          engagementScale, mineralBudget,
          missionScoringAuthority: clone(missionAuthority),
          skillGuidance: clone(route.projections),
          legalChoiceDenominators: clone(enumeration.denominators),
          opponentInformationBoundary: boundary,
        },
      });
      const revised = validateFoundation({
        schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
        roundKind: "strategy_foundation",
        ...clone(teachCycle.revisedFoundation),
      }, { missionAuthorityDerivable });
      const initialNeeds = new Map(foundation.informationNeeds.map((need) =>
        [need.needId, need]));
      const teachTrace = {
        roundIndex: 2, roundKind: "teach_challenge_revision",
        teachCycleHash: teachCycle.cycleHash,
        initialFoundationHash: teachCycle.initialFoundationHash,
        revisedFoundationHash: teachCycle.revisedFoundationHash,
        challengeCount: teachCycle.challenges.length,
        challengePromptRoute: teachCycle.challengePromptRoute,
        revisionPromptRoute: teachCycle.revisionPromptRoute,
        promptNodeHashes: [], informationNeedOutcomes: [],
      };
      for (const need of revised.informationNeeds) {
        const prior = initialNeeds.get(need.needId);
        if (prior && hashStarcraftTmgContract(prior)
          !== hashStarcraftTmgContract(need)) {
          fail("ROSTER_TEACH_INFORMATION_NEED_ID_REUSED", need.needId);
        }
        if (!prior) executeInformationNeed(need, branchByNeedId,
          toolReceipts, teachTrace);
      }
      foundation = revised;
      trace.push(roundReceipt(teachTrace));
    }

    const scoreRoute = createRosterScoreRouteV1(foundation.scoreRoute);
    const opponentHypotheses = foundation.opponentHypotheses.map((entry) => (
      createOpponentArchetypeHypothesisV1(entry)));
    const counterResponses = foundation.counterResponses.map((entry) => (
      createRosterCounterResponseV1(entry)));
    const invalidationTriggers = foundation.invalidationTriggers.map((entry) => (
      createRosterInvalidationTriggerV1(entry)));

    // ------------------------------------------- round 2+: proposals
    const evaluated = [];
    const rejections = [];
    let legalProposals = [];
    let proposalRound = 0;
    const proposalFeedback = [];
    while (legalProposals.length === 0 && proposalRound < maxProposalRounds) {
      proposalRound += 1;
      const roundIndex = 1 + Number(Boolean(teachCycle)) + proposalRound;
      const proposalNodes = [
        sealNode("frozen-context", "rules_and_source_frozen", {
          engagementScale, mineralBudget, provenanceHash: provenance.provenanceHash,
          scoreRouteHash: scoreRoute.scoreRouteHash,
        }),
        sealNode("legal-choice-menu", "rules_owned_army_builder_port", {
          enumerationReceiptHash: enumeration.receiptHash, menu }),
        sealNode("strategy-foundation", "agent_deliberation_public", {
          scoreRoute: foundation.scoreRoute,
          opponentHypotheses: foundation.opponentHypotheses.map((entry) => ({
            hypothesisId: entry.hypothesisId,
            archetypeLabel: entry.archetypeLabel,
            hypothesisText: entry.hypothesisText,
          })),
          toolEvidence: toolReceipts.map((receipt) => ({
            referenceId: receipt.referenceId, receiptKind: receipt.receiptKind,
            status: receipt.status, receiptHash: receipt.receiptHash })),
        }),
        sealNode("proposal-feedback", "rules_owned_army_builder_port", {
          priorRejections: clone(proposalFeedback),
        }),
        sealNode("response-schema", "platform", {
          schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
          roundKind: "candidate_proposals",
          fields: ["proposals"],
          proposalShape: { candidateId: "string", tacticalCardRecordKeys: [],
            units: [{ recordKey: "from menu", compositionKind: "from menu",
              upgrades: [{ upgradeName: "from menu" }] }],
            rationaleText: "public" },
          proposalCount: "2_to_4",
          rulesRemainSoleLegalityAuthority: true,
          publicFieldsOnly: true,
          envelopeAtTopLevelNoChannelsWrapper: true,
          outputSchemaName:
            rosterStrategistRoundOutputContractV1("candidate_proposals")
              .schemaName,
          strictProviderJsonSchemaEnforced: true,
        }),
      ];
      const proposalTrace = {
        roundIndex, roundKind: "candidate_proposals",
        outputContractRef:
          rosterStrategistRoundOutputContractRefV1("candidate_proposals"),
        promptNodeHashes: proposalNodes.map((node) => node.nodeHash),
        informationNeedOutcomes: [],
      };
      const proposalDeliberation = await deliberateRound(deliberation,
        buildRoundRequest({
          sessionId, roundIndex, roundKind: "candidate_proposals",
          nodes: proposalNodes,
          userMessage: "Propose 2 to 4 distinct roster candidates using only "
            + "recordKeys, compositionKinds and upgradeNames from the "
            + "Rules-owned legal choice menu. The Rules port remains the sole "
            + "legality authority; rejections are returned typed and are never "
            + "silently repaired. Public fields only.",
          contextSeed: { sessionId, roundKind: "candidate_proposals",
            proposalRound, provenanceHash: provenance.provenanceHash,
            enumerationReceiptHash: enumeration.receiptHash },
        }), traceSink);
      const proposalOutput = proposalDeliberation.output;
      proposalTrace.outputNormalizationReceipt =
        proposalDeliberation.normalizationReceipt;
      proposalTrace.contextHash = hashStarcraftTmgContract({
        sessionId, roundKind: "candidate_proposals", proposalRound,
        provenanceHash: provenance.provenanceHash,
        enumerationReceiptHash: enumeration.receiptHash });
      const proposalWarnings = [];
      activeNarrativeWarnings = proposalWarnings;
      let proposals;
      try {
        proposals = validateProposals(proposalOutput, menu);
      } finally {
        activeNarrativeWarnings = null;
      }
      proposalTrace.narrativeDisplayWarnings = proposalWarnings;
      proposalTrace.outputHash = hashStarcraftTmgContract(proposalOutput);
      proposalFeedback.length = 0;
      for (const proposal of proposals) {
        const candidateInput = {
          sideKey, scaleId: engagementScale, mineralBudget, factionRecordKey,
          tacticalCardRecordKeys: proposal.tacticalCardRecordKeys,
          units: proposal.units.map((unit) => ({
            unitInstanceId: unit.unitInstanceId,
            recordKey: unit.recordKey,
            compositionKind: unit.compositionKind,
            upgrades: unit.upgrades,
          })),
        };
        const verdict = armyBuilderPort.evaluateRosterCandidate(
          clone(candidateInput));
        const legal = verdict.schema === ARMY_BUILDER_ROSTER_VERDICT_SCHEMA;
        if (!legal && verdict.schema !== ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA) {
          fail("ROSTER_STRATEGIST_PORT_RESPONSE_UNKNOWN");
        }
        const candidate = createRosterCandidateV1({
          candidateId: proposal.candidateId, sideKey, factionRecordKey,
          scaleId: engagementScale, mineralBudget,
          tacticalCardRecordKeys: proposal.tacticalCardRecordKeys,
          units: proposal.units.map((unit) => ({
            unitInstanceId: unit.unitInstanceId,
            recordKey: unit.recordKey,
            compositionKind: unit.compositionKind,
            upgradeSelections: unit.upgrades.map((upgrade) => ({
              upgradeName: upgrade.upgradeName })),
          })),
          legalityStatus: legal ? "legal" : "illegal",
          legalityReceipt: legal
            ? { auditResultHash: verdict.auditResultHash }
            : {
              rejectionReceiptHash: verdict.receiptHash,
              rulesErrorCode: verdict.rulesErrorCode
                || verdict.portErrorCode || "UNKNOWN",
              rejectionKind: verdict.rejectionKind,
            },
        });
        const row = freezeDeep({
          proposal: freezeDeep({ ...clone(proposal), sideKeySafe: sideKey }),
          candidateInput: freezeDeep(candidateInput),
          candidate,
          verdictOrRejection: verdict,
          proposalOrder: evaluated.length,
        });
        evaluated.push(row);
        if (legal) {
          legalProposals.push(row);
        } else {
          rejections.push(verdict);
          proposalFeedback.push({
            candidateId: proposal.candidateId,
            rulesErrorCode: verdict.rulesErrorCode || null,
            portErrorCode: verdict.portErrorCode || null,
            rejectionKind: verdict.rejectionKind,
            silentRepairAttempted: false,
          });
        }
      }
      proposalTrace.evaluatedCandidateHashes = evaluated.map((entry) => (
        entry.candidate.candidateHash));
      proposalTrace.legalCandidateCount = legalProposals.length;
      trace.push(roundReceipt(proposalTrace));
    }
    if (legalProposals.length === 0) {
      fail("ROSTER_STRATEGIST_NO_LEGAL_CANDIDATE",
        JSON.stringify(proposalFeedback));
    }

    // ---------------------------------------- final round: comparison
    const comparisonRoundIndex = 2 + Number(Boolean(teachCycle))
      + proposalRound;
    const comparisonNodes = [
      sealNode("frozen-context", "rules_and_source_frozen", {
        provenanceHash: provenance.provenanceHash,
        scoreRouteHash: scoreRoute.scoreRouteHash,
      }),
      sealNode("evaluated-candidates", "rules_owned_army_builder_port", {
        candidates: evaluated.map((entry) => ({
          candidateId: entry.proposal.candidateId,
          candidateHash: entry.candidate.candidateHash,
          legalityStatus: entry.candidate.legalityStatus,
          rationaleText: entry.proposal.rationaleText,
          mineralSpent: entry.candidate.legalityStatus === "legal"
            ? entry.verdictOrRejection.summary.mineralSpent : null,
          vespeneSpent: entry.candidate.legalityStatus === "legal"
            ? entry.verdictOrRejection.summary.vespeneSpent : null,
          startingSupply: entry.candidate.legalityStatus === "legal"
            ? entry.verdictOrRejection.summary.startingSupply : null,
          // Budget-utilization context (sub-slice 269.14): per-candidate
          // unspent budget and near-cap flag derived from the Rules verdict
          // and the menu-derived threshold below — never from the model.
          mineralUnspent: entry.candidate.legalityStatus === "legal"
            ? mineralBudget - entry.verdictOrRejection.summary.mineralSpent
            : null,
          nearCap: entry.candidate.legalityStatus === "legal"
            ? (mineralBudget - entry.verdictOrRejection.summary.mineralSpent)
              < nearCapThresholdMinerals
            : null,
          rulesErrorCode: entry.candidate.legalityStatus === "illegal"
            ? entry.candidate.legalityReceipt.rulesErrorCode : null,
          // Deterministic component identities (sub-slice 269.11, closing
          // the saved live round-8 blocker unit_binding:agent-unit-1): the
          // strict comparison binding rule requires these exact identities,
          // so the sealed context must publish them; they are derived
          // positionally from the candidate content, never invented, and
          // match the formats documented by the strict comparison schema.
          factionCardInstanceId: `${sideKey}-faction`,
          tacticalCards: entry.proposal.tacticalCardRecordKeys.map(
            (recordKey, tacticalIndex) => ({
              instanceId: `${sideKey}-tactical-${tacticalIndex + 1}`,
              recordKey })),
          units: entry.proposal.units.map((unit) => ({
            unitInstanceId: unit.unitInstanceId,
            recordKey: unit.recordKey,
            compositionKind: unit.compositionKind,
            compositionInstanceId: `${unit.unitInstanceId}-composition`,
            upgrades: unit.upgrades.map((upgrade, upgradeIndex) => ({
              upgradeName: upgrade.upgradeName,
              instanceId:
                `${unit.unitInstanceId}-upgrade-${upgradeIndex + 1}`,
            })),
          })),
        })),
        // Budget-utilization contract (sub-slice 269.14): unspent minerals
        // are lost (no carryover, no later spend), so budget residue is an
        // explicit strategic opportunity cost, never headroom. The
        // threshold is derived from the Rules-owned menu (cheapest positive
        // purchasable increment), never hard-coded per faction and never
        // forced to exact budget equality.
        budgetGuidance: {
          nearCapThresholdMinerals,
          nearCapThresholdDerivation:
            "cheapest_positive_purchasable_increment_in_rules_owned_menu",
          unspentResourceDisposition: "lost",
          unspentBudgetIsAnExplicitOpportunityCost: true,
          selectionRule: "when any evaluated Rules-legal candidate is "
            + "near-cap (mineralUnspent below the sealed threshold), select "
            + "a near-cap candidate or declare an explicit public "
            + "justification tied to a named legal retained-resource use in "
            + "resourceUtilization; exact budget equality is never forced",
          exactBudgetEqualityNeverForced: true,
          runtimeNeverRanksCandidates: true,
        },
        laboratoryNeverRanks: true,
        hostPreferenceWeights: false,
      }),
      sealNode("strategy-foundation", "agent_deliberation_public", {
        scoreRoute: foundation.scoreRoute,
        opponentHypotheses: foundation.opponentHypotheses,
        counterResponses: foundation.counterResponses,
        invalidationTriggers: foundation.invalidationTriggers,
      }),
      sealNode("response-schema", "platform", {
        schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
        roundKind: "comparison_selection",
        fields: ["comparison", "componentPurposes", "deploymentConcept",
          "resourceUtilization", "lossResourceBudget", "publicSummaryText"],
        selectedCandidateMustBeRulesLegal: true,
        publicFieldsOnly: true,
        envelopeAtTopLevelNoChannelsWrapper: true,
        outputSchemaName:
          rosterStrategistRoundOutputContractV1("comparison_selection")
            .schemaName,
        strictProviderJsonSchemaEnforced: true,
      }),
    ];
    const comparisonTrace = {
      roundIndex: comparisonRoundIndex, roundKind: "comparison_selection",
      outputContractRef:
        rosterStrategistRoundOutputContractRefV1("comparison_selection"),
      promptNodeHashes: comparisonNodes.map((node) => node.nodeHash),
      informationNeedOutcomes: [],
    };
    const comparisonDeliberation = await deliberateRound(deliberation,
      buildRoundRequest({
        sessionId, roundIndex: comparisonRoundIndex,
        roundKind: "comparison_selection",
        nodes: comparisonNodes,
        userMessage: "Compare the evaluated candidates on the public evidence "
          + "(score route, hypotheses, tool receipts, Rules verdicts), select "
          + "exactly one Rules-legal candidate, and declare public component "
          + "purposes, deployment concept, loss budget and a public summary. "
          + "Public fields only; never emit hidden chain-of-thought.",
        contextSeed: { sessionId, roundKind: "comparison_selection",
          provenanceHash: provenance.provenanceHash,
          candidateHashes: evaluated.map((entry) => entry.candidate.candidateHash) },
      }), traceSink);
    const comparisonOutput = comparisonDeliberation.output;
    comparisonTrace.outputNormalizationReceipt =
      comparisonDeliberation.normalizationReceipt;
    comparisonTrace.contextHash = hashStarcraftTmgContract({
      sessionId, roundKind: "comparison_selection",
      provenanceHash: provenance.provenanceHash,
      candidateHashes: evaluated.map((entry) => entry.candidate.candidateHash) });
    const comparisonWarnings = [];
    activeNarrativeWarnings = comparisonWarnings;
    let comparisonSelection;
    try {
      comparisonSelection = validateComparison(comparisonOutput,
        evaluated, { nearCapThresholdMinerals, mineralBudget });
    } finally {
      activeNarrativeWarnings = null;
    }
    comparisonTrace.narrativeDisplayWarnings = comparisonWarnings;
    comparisonTrace.outputHash = hashStarcraftTmgContract(comparisonOutput);
    const selected = evaluated.find((entry) => (
      entry.proposal.candidateId
        === comparisonSelection.comparison.selectedCandidateId));

    const comparison = createRosterCandidateComparisonV1({
      comparisonId: `${sessionId}-comparison-1`,
      candidateHashes: evaluated.map((entry) => entry.candidate.candidateHash),
      basisTexts: comparisonSelection.comparison.basisTexts,
      tradeoffTexts: comparisonSelection.comparison.tradeoffTexts,
      selectionStatus: "selected",
      selectedCandidateHash: selected.candidate.candidateHash,
      receiptReferenceIds: toolReceipts.map((receipt) => receipt.referenceId),
    });
    comparisonTrace.comparisonHash = comparison.comparisonHash;
    trace.push(roundReceipt(comparisonTrace));

    // Final legality is re-proven through the Rules-owned port at plan time.
    const finalVerdict = armyBuilderPort.evaluateRosterCandidate(
      clone(selected.candidateInput));
    if (finalVerdict.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA
      || finalVerdict.auditResultHash
        !== selected.candidate.legalityReceipt.auditResultHash) {
      fail("ROSTER_STRATEGIST_FINAL_LEGALITY_DRIFT");
    }

    const componentPurposes = comparisonSelection.componentPurposes.map((entry) => (
      createRosterComponentPurposeV1(entry)));
    const deploymentConcept = createRosterDeploymentConceptV1(
      comparisonSelection.deploymentConcept);
    const lossResourceBudget = comparisonSelection.lossResourceBudget
      ? createRosterLossResourceBudgetV1({
        lossBudgetStatus: comparisonSelection.lossResourceBudget.lossBudgetStatus,
        plannedLossBudget:
          comparisonSelection.lossResourceBudget.plannedLossBudget,
        mineralSpendIntent: {
          status: "declared",
          mineralBudget,
          plannedMineralSpend: finalVerdict.summary.mineralSpent,
        },
      })
      : createRosterLossResourceBudgetV1({
        lossBudgetStatus: "unknown",
        mineralSpendIntent: {
          status: "declared",
          mineralBudget,
          plannedMineralSpend: finalVerdict.summary.mineralSpent,
        },
      });

    const plan = createRosterPlanV1({
      planId, planVersion: 1, planStatus: "active", sideKey,
      provenance,
      rosterCandidate: selected.candidate,
      scoreRoute,
      lossResourceBudget,
      componentPurposes,
      deploymentConcept,
      opponentHypotheses,
      counterResponses,
      invalidationTriggers,
      revisions: [],
      comparisons: [comparison],
      toolReceiptReferences: toolReceipts,
      publicSummaryText: comparisonSelection.publicSummaryText,
    });
    verifyRosterPlanRoundTripV1(plan);

    const sessionReceipt = hashedReceipt({
      schema: ROSTER_STRATEGIST_SESSION_RECEIPT_SCHEMA,
      sessionId,
      planId: plan.planId,
      planHash: plan.planHash,
      planStatus: plan.planStatus,
      rosterCandidateHash: selected.candidate.candidateHash,
      finalAuditResultHash: finalVerdict.auditResultHash,
      finalVerdictHash: finalVerdict.verdictHash,
      mineralSpent: finalVerdict.summary.mineralSpent,
      vespeneSpent: finalVerdict.summary.vespeneSpent,
      provenanceHash: provenance.provenanceHash,
      enumerationReceiptHash: enumeration.receiptHash,
      skillRouteReceiptHash: route.receipt.receiptHash,
      comparisonHash: comparison.comparisonHash,
      ...(teachCycle ? { teachCycleHash: teachCycle.cycleHash } : {}),
      roundReceiptHashes: trace.map((entry) => entry.receiptHash),
      toolReceiptReferenceHashes: toolReceipts.map((entry) => entry.referenceHash),
      rejectionReceiptHashes: rejections.map((entry) => entry.receiptHash),
      deliberationCallCount: deliberationReceipts.length,
      deliberationReceiptHashes: deliberationReceipts.map((entry) => (
        entry?.receiptHash ?? null)),
      deliberationKind: deliberationDescriptor.kind,
      modelVersion: deliberationDescriptor.modelVersion,
      promptVersion: deliberationDescriptor.promptVersion,
      outputNormalizationAliasRegistryVersion:
        ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_VERSION,
      outputNormalizationReceiptHashes: trace.map((entry) => (
        entry.outputNormalizationReceipt?.receiptHash ?? null)),
      outputContractSetHash:
        ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contractSetHash,
      structuredGenerationEnforced: true,
      // Schedule-grounding and budget-utilization outcomes (sub-slices
      // 269.13/269.14), bound publicly in the session receipt.
      missionScoringAuthorityStatus: missionAuthority.resultStatus,
      missionScoringAuthorityReceiptHash: missionAuthority.receiptHash,
      scoreRouteAuthorityStatus: foundation.scoreRouteAuthority.status,
      nearCapThresholdMinerals,
      nearCapLegalCandidateAvailable:
        comparisonSelection.resourceUtilization.nearCapCandidateAvailable,
      selectedCandidateNearCap:
        comparisonSelection.resourceUtilization.selectedCandidateNearCap,
      retainedResourceJustificationStatus:
        comparisonSelection.resourceUtilization
          .retainedResourceJustificationStatus,
      narrativeCapacityPolicy:
        "display_target_soft_warning_full_text_preserved_v1",
      narrativeDisplayWarningCount: trace.reduce((sum, entry) => (
        sum + (entry.narrativeDisplayWarnings?.length || 0)), 0),
      selectedByAgentDeliberation: true,
      hostPreferenceWeights: false,
      hiddenChainOfThoughtRequested: false,
      hiddenChainOfThoughtPersisted: false,
      rulesRemainSoleLegalityAuthority: true,
      unknownStaysUnknown: true,
      trainingTruth: false,
    });

    return freezeDeep({
      plan,
      finalVerdict,
      provenance,
      enumerationReceipt: enumeration,
      skillRoute: route,
      candidates: evaluated.map((entry) => entry.candidate),
      candidateInputs: evaluated.map((entry) => clone(entry.candidateInput)),
      rejections,
      comparison,
      toolReceiptReferences: toolReceipts,
      planningTrace: trace,
      ...(teachCycle ? { teachCycle } : {}),
      deliberationReceipts: deliberationReceipts.map((entry) => clone(entry)),
      sessionReceipt,
    });
  }

  // -------------------------------------------------------- revise plan

  async function reviseRosterPlan(request = {}, options = {}) {
    const plan = request.plan;
    if (!object(plan) || !HASH_PATTERN.test(String(plan?.planHash || ""))) {
      fail("ROSTER_STRATEGIST_REVISION_PLAN_INVALID");
    }
    const deliberation = options.deliberation;
    if (typeof deliberation?.deliberate !== "function") {
      fail("ROSTER_STRATEGIST_DELIBERATION_PORT_INVALID");
    }
    const code = "ROSTER_STRATEGIST_REVISION_INVALID";
    const reasonText = nonEmpty(request.reasonText, code);
    const triggerIds = textList(request.triggerIds || [], code);
    const revisedSectionKeys = textList(request.revisedSectionKeys || [], code,
      { allowEmpty: false });
    const nodes = [
      sealNode("current-plan", "agent_deliberation_public", {
        planHash: plan.planHash, planVersion: plan.planVersion,
        planStatus: plan.planStatus, scoreRoute: clone(plan.scoreRoute),
        deploymentConcept: clone(plan.deploymentConcept),
        publicSummaryText: plan.publicSummaryText }),
      sealNode("revision-request", "agent_deliberation_public", {
        reasonText, triggerIds, revisedSectionKeys }),
      sealNode("response-schema", "platform", {
        schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
        roundKind: "revision",
        fields: ["publicSummaryText", "revisedScoreRoute",
          "revisedDeploymentConcept"],
        publicFieldsOnly: true,
        envelopeAtTopLevelNoChannelsWrapper: true,
        outputSchemaName:
          rosterStrategistRoundOutputContractV1("revision").schemaName,
        strictProviderJsonSchemaEnforced: true }),
    ];
    const sink = { deliberationReceipts: [] };
    const revisionDeliberation = await deliberateRound(deliberation,
      buildRoundRequest({
        sessionId: `${plan.planId}-revision-${plan.planVersion + 1}`,
        roundIndex: plan.planVersion + 1, roundKind: "revision", nodes,
        userMessage: "Publish the revised public plan sections for the declared "
          + "revision triggers. Public fields only.",
        contextSeed: { planHash: plan.planHash, roundKind: "revision",
          revisedSectionKeys },
      }), sink);
    const output = revisionDeliberation.output;
    const revisionWarnings = [];
    activeNarrativeWarnings = revisionWarnings;
    let revised;
    try {
      validateEnvelope(output, "revision");
      exactKeys(output, ["schemaVersion", "roundKind", "publicSummaryText",
        "revisedScoreRoute", "revisedDeploymentConcept"], code);
      const revision = createRosterPlanRevisionEventV1({
        revisionId: `${plan.planId}-revision-${plan.planVersion + 1}`,
        planId: plan.planId,
        fromPlanVersion: plan.planVersion,
        toPlanVersion: plan.planVersion + 1,
        previousPlanHash: plan.planHash,
        reasonText,
        triggerIds,
        revisedSectionKeys,
      });
      revised = createRosterPlanV1({
        planId: plan.planId,
        planVersion: plan.planVersion + 1,
        planStatus: "revised",
        sideKey: plan.sideKey,
        provenance: plan.provenance,
        rosterCandidate: plan.rosterCandidate,
        scoreRoute: revisedSectionKeys.includes("scoreRoute")
          && object(output.revisedScoreRoute)
          ? createRosterScoreRouteV1(validateScoreRoute(output.revisedScoreRoute, code))
          : plan.scoreRoute,
        lossResourceBudget: plan.lossResourceBudget,
        componentPurposes: plan.componentPurposes,
        deploymentConcept: revisedSectionKeys.includes("deploymentConcept")
          && object(output.revisedDeploymentConcept)
          ? createRosterDeploymentConceptV1({
            deploymentConceptText: narrative(
              output.revisedDeploymentConcept.deploymentConceptText, code,
              { path: "revisedDeploymentConcept.deploymentConceptText" }),
            activationOrderStatus:
              output.revisedDeploymentConcept.activationOrderStatus === "declared"
                ? "declared" : "unknown",
            activationOrder: (output.revisedDeploymentConcept.activationOrder || [])
              .map((entry) => ({
                ordinal: Number(entry?.ordinal),
                unitInstanceId: nonEmpty(entry?.unitInstanceId, code),
                phase: nonEmpty(entry?.phase, code) })),
            reinforcementPolicyText: narrative(
              output.revisedDeploymentConcept.reinforcementPolicyText, code,
              { path: "revisedDeploymentConcept.reinforcementPolicyText" }),
            threatTradeText: narrative(
              output.revisedDeploymentConcept.threatTradeText, code,
              { path: "revisedDeploymentConcept.threatTradeText" }),
            objectiveControlText: narrative(
              output.revisedDeploymentConcept.objectiveControlText, code,
              { path: "revisedDeploymentConcept.objectiveControlText" }) })
          : plan.deploymentConcept,
        opponentHypotheses: plan.opponentHypotheses,
        counterResponses: plan.counterResponses,
        invalidationTriggers: plan.invalidationTriggers,
        revisions: [...(plan.revisions || []), revision],
        comparisons: plan.comparisons,
        toolReceiptReferences: plan.toolReceiptReferences,
        publicSummaryText: narrative(output.publicSummaryText, code,
          { path: "publicSummaryText" }),
      });
      verifyRosterPlanRoundTripV1(revised);
    } finally {
      activeNarrativeWarnings = null;
    }
    return freezeDeep({
      plan: revised,
      revisionEvent: revised.revisions[revised.revisions.length - 1],
      narrativeDisplayWarnings: revisionWarnings,
      outputNormalizationReceipt:
        clone(revisionDeliberation.normalizationReceipt),
      deliberationReceipts: sink.deliberationReceipts.map((entry) => clone(entry)),
    });
  }

  return freezeDeep({
    runtimeDescriptor: () => descriptor,
    selectSkillRoute,
    planRoster,
    reviseRosterPlan,
  });
}

export function verifyRosterStrategistDescriptorV1(value) {
  if (!object(value) || value.schema !== ROSTER_STRATEGIST_DESCRIPTOR_SCHEMA
    || value.descriptorHash !== hashStarcraftTmgContract(
      without(value, ["descriptorHash"]))
    || value.hostPreferenceWeights !== false
    || value.promptPreferenceWeights !== false
    || value.runtimeRanksOrScoresCandidates !== false
    || value.rulesRemainSoleLegalityAuthority !== true
    || value.hiddenChainOfThoughtRequested !== false
    || value.hiddenChainOfThoughtPersisted !== false
    || value.unknownStaysUnknown !== true
    || value.trainingTruth !== false) {
    fail("ROSTER_STRATEGIST_DESCRIPTOR_INVALID");
  }
  return true;
}

export function verifyRosterStrategistSessionReceiptV1(value) {
  if (!object(value) || value.schema !== ROSTER_STRATEGIST_SESSION_RECEIPT_SCHEMA
    || value.receiptHash !== hashStarcraftTmgContract(
      without(value, ["receiptHash"]))
    || value.selectedByAgentDeliberation !== true
    || value.hostPreferenceWeights !== false
    || value.hiddenChainOfThoughtRequested !== false
    || value.hiddenChainOfThoughtPersisted !== false
    || value.rulesRemainSoleLegalityAuthority !== true
    || value.unknownStaysUnknown !== true
    || value.trainingTruth !== false
    || !HASH_PATTERN.test(String(value.planHash || ""))
    || !HASH_PATTERN.test(String(value.finalAuditResultHash || ""))) {
    fail("ROSTER_STRATEGIST_SESSION_RECEIPT_INVALID");
  }
  return true;
}
