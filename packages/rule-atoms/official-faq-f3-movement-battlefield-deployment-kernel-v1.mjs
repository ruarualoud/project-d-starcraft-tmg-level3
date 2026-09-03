const ENTRY_IDS = Object.freeze(Array.from({ length: 23 }, (_, index) => (
  `faq-v1:${String(index + 5).padStart(2, "0")}`
)));
const EPSILON = 1e-6;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shape(value, keys, code) {
  if (!object(value)) fail(code);
  const allowed = new Set(keys);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) fail(`${code}_UNKNOWN_FIELD`, unknown[0]);
  return value;
}

function bool(value, code) {
  if (typeof value !== "boolean") fail(code);
  return value;
}

function text(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}

function number(value, code, { min = 0 } = {}) {
  if (!Number.isFinite(value) || value < min) fail(code);
  return value;
}

function enumeration(value, allowed, code) {
  if (!allowed.includes(value)) fail(code);
  return value;
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function decision(entryId, legal, values = {}, reasonCodes = []) {
  return freeze({
    schema: "starcraft_tmg_official_faq_f3_rule_decision_v1",
    entryId,
    legal,
    values,
    reasonCodes,
    rulesAuthority: true,
    trainingTruth: false,
  });
}

const handlers = Object.freeze({
  "faq-v1:05": (raw) => {
    const input = shape(raw, ["lastMovementCheckPassed", "casualtiesSinceMovement"],
      "FAQ_F3_05_INPUT_INVALID");
    const lastMovementCheckPassed = bool(input.lastMovementCheckPassed,
      "FAQ_F3_05_LAST_MOVEMENT_CHECK_REQUIRED");
    number(input.casualtiesSinceMovement, "FAQ_F3_05_CASUALTY_COUNT_INVALID");
    return decision("faq-v1:05", true, {
      missionCoherent: lastMovementCheckPassed,
      recomputedAfterCasualties: false,
    });
  },
  "faq-v1:06": (raw) => {
    const input = shape(raw, ["gapBoundaryKinds", "gapWidth", "modelSize"],
      "FAQ_F3_06_INPUT_INVALID");
    if (!Array.isArray(input.gapBoundaryKinds) || input.gapBoundaryKinds.length !== 2) {
      fail("FAQ_F3_06_TWO_GAP_BOUNDARIES_REQUIRED");
    }
    const gapBoundaryKinds = input.gapBoundaryKinds.map((kind) => enumeration(
      kind, ["model", "terrain", "high_ground_edge"], "FAQ_F3_06_BOUNDARY_INVALID"));
    const gapWidth = number(input.gapWidth, "FAQ_F3_06_GAP_WIDTH_INVALID");
    const modelSize = number(input.modelSize, "FAQ_F3_06_MODEL_SIZE_INVALID", { min: 1 });
    const requiredWidth = modelSize <= 2 ? 1 : 3;
    return decision("faq-v1:06", gapWidth + EPSILON >= requiredWidth, {
      gapBoundaryKinds, gapWidth, requiredWidth, appliesToModelBoundaries: true,
    }, gapWidth + EPSILON >= requiredWidth ? [] : ["GAP_CLEARANCE_INSUFFICIENT"]);
  },
  "faq-v1:07": (raw) => {
    const input = shape(raw, ["linkCrossesEnemy", "enemyCurrentlyEngaged",
      "landingOpen", "landingCoherent"], "FAQ_F3_07_INPUT_INVALID");
    const crosses = bool(input.linkCrossesEnemy, "FAQ_F3_07_CROSSING_REQUIRED");
    const engaged = bool(input.enemyCurrentlyEngaged, "FAQ_F3_07_ENGAGEMENT_REQUIRED");
    const landingOpen = bool(input.landingOpen, "FAQ_F3_07_OPEN_REQUIRED");
    const landingCoherent = bool(input.landingCoherent, "FAQ_F3_07_COHERENCY_REQUIRED");
    const legal = (!crosses || engaged) && landingOpen && landingCoherent;
    return decision("faq-v1:07", legal, {
      engagedEnemyLinkPassAllowed: crosses && engaged,
      landingOpen,
      landingCoherent,
    }, legal ? [] : [crosses && !engaged ? "ENEMY_LINK_NOT_CURRENTLY_ENGAGED"
      : "LANDING_PLACEMENT_ILLEGAL"]);
  },
  "faq-v1:08": (raw) => {
    const input = shape(raw, ["leadingModelCouldTraverse"], "FAQ_F3_08_INPUT_INVALID");
    const allowed = bool(input.leadingModelCouldTraverse,
      "FAQ_F3_08_LEADER_TRAVERSAL_REQUIRED");
    return decision("faq-v1:08", allowed, { coherencyLinkMayTraverse: allowed },
      allowed ? [] : ["LEADING_MODEL_CANNOT_TRAVERSE"]);
  },
  "faq-v1:09": (raw) => {
    const input = shape(raw, ["usesAccessPoint", "landingCoherent"],
      "FAQ_F3_09_INPUT_INVALID");
    const usesAccessPoint = bool(input.usesAccessPoint, "FAQ_F3_09_ACCESS_POINT_REQUIRED");
    const landingCoherent = bool(input.landingCoherent, "FAQ_F3_09_COHERENCY_REQUIRED");
    const legal = usesAccessPoint && landingCoherent;
    return decision("faq-v1:09", legal, { separateMoveRequired: false },
      legal ? [] : [usesAccessPoint ? "LANDING_OUT_OF_COHERENCY" : "ACCESS_POINT_REQUIRED"]);
  },
  "faq-v1:10": (raw) => {
    const input = shape(raw, ["actionType", "positionChanged"], "FAQ_F3_10_INPUT_INVALID");
    const actionType = enumeration(input.actionType, ["move", "run"],
      "FAQ_F3_10_ACTION_TYPE_INVALID");
    const positionChanged = bool(input.positionChanged, "FAQ_F3_10_POSITION_CHANGE_REQUIRED");
    return decision("faq-v1:10", positionChanged, {
      actionType,
      effectiveActionType: positionChanged ? actionType : "hold",
      suggestedActionType: positionChanged ? null : "hold",
    }, positionChanged ? [] : ["MOVE_OR_RUN_MUST_CHANGE_POSITION"]);
  },
  "faq-v1:11": (raw) => {
    const input = shape(raw, ["direction", "attemptedDistance", "maxLegalDistance"],
      "FAQ_F3_11_INPUT_INVALID");
    const direction = enumeration(input.direction, ["towards", "away"],
      "FAQ_F3_11_DIRECTION_INVALID");
    const attemptedDistance = number(input.attemptedDistance,
      "FAQ_F3_11_ATTEMPTED_DISTANCE_INVALID");
    const maxLegalDistance = number(input.maxLegalDistance,
      "FAQ_F3_11_MAX_DISTANCE_INVALID");
    const legal = Math.abs(attemptedDistance - maxLegalDistance) <= EPSILON;
    return decision("faq-v1:11", legal, { direction, attemptedDistance, maxLegalDistance },
      legal ? [] : ["DIRECT_MOVE_MUST_USE_MAXIMUM_POSSIBLE_DISTANCE"]);
  },
  "faq-v1:12": (raw) => {
    const input = shape(raw, ["baseCenterOnHighGround", "baseOverhang",
      "minimumNecessaryOverhang"], "FAQ_F3_12_INPUT_INVALID");
    const center = bool(input.baseCenterOnHighGround, "FAQ_F3_12_CENTER_REQUIRED");
    const overhang = number(input.baseOverhang, "FAQ_F3_12_OVERHANG_INVALID");
    const minimum = number(input.minimumNecessaryOverhang,
      "FAQ_F3_12_MINIMUM_OVERHANG_INVALID");
    const legal = center && Math.abs(overhang - minimum) <= EPSILON;
    return decision("faq-v1:12", legal, { centerSupported: center,
      baseOverhang: overhang, maximumAllowedOverhang: minimum },
    legal ? [] : [center ? "WOBBLY_OVERHANG_NOT_MINIMUM_NECESSARY"
      : "WOBBLY_BASE_CENTER_NOT_ON_HIGH_GROUND"]);
  },
  "faq-v1:13": (raw) => handlers["faq-v1:06"]({
    gapBoundaryKinds: ["high_ground_edge", "model"],
    gapWidth: shape(raw, ["gapWidth", "modelSize"], "FAQ_F3_13_INPUT_INVALID").gapWidth,
    modelSize: raw.modelSize,
  }).legal
    ? decision("faq-v1:13", true, {
      highGroundEdgeIsImpassable: true,
      requiredWidth: raw.modelSize <= 2 ? 1 : 3,
    })
    : decision("faq-v1:13", false, {
      highGroundEdgeIsImpassable: true,
      requiredWidth: raw.modelSize <= 2 ? 1 : 3,
    }, ["HIGH_GROUND_EDGE_GAP_CLEARANCE_INSUFFICIENT"]),
  "faq-v1:14": (raw) => {
    const input = shape(raw, ["unitElevationType", "highGroundsConnected"],
      "FAQ_F3_14_INPUT_INVALID");
    enumeration(input.unitElevationType, ["ground"], "FAQ_F3_14_GROUND_UNIT_REQUIRED");
    const connected = bool(input.highGroundsConnected, "FAQ_F3_14_CONNECTION_REQUIRED");
    return decision("faq-v1:14", connected, { directGroundRouteAllowed: connected },
      connected ? [] : ["GROUND_HIGH_GROUNDS_NOT_CONNECTED"]);
  },
  "faq-v1:15": (raw) => {
    const input = shape(raw, ["traceCrossesTerrainId", "proximityTerrainId",
      "distanceToAnyPart"], "FAQ_F3_15_INPUT_INVALID");
    const traceId = text(input.traceCrossesTerrainId, "FAQ_F3_15_TRACE_TERRAIN_REQUIRED");
    const proximityId = text(input.proximityTerrainId, "FAQ_F3_15_PROXIMITY_TERRAIN_REQUIRED");
    const distance = number(input.distanceToAnyPart, "FAQ_F3_15_DISTANCE_INVALID");
    const directCover = traceId === proximityId && distance <= 1 + EPSILON;
    return decision("faq-v1:15", true, { directCover, sameTerrain: traceId === proximityId,
      distanceToAnyPart: distance });
  },
  "faq-v1:16": (raw) => {
    const input = shape(raw, ["markerOnBattlefield", "markerFace", "normalControlEligible"],
      "FAQ_F3_16_INPUT_INVALID");
    const onBattlefield = bool(input.markerOnBattlefield, "FAQ_F3_16_MARKER_STATE_REQUIRED");
    const face = enumeration(input.markerFace, ["activated", "deactivated"],
      "FAQ_F3_16_MARKER_FACE_INVALID");
    const eligible = bool(input.normalControlEligible, "FAQ_F3_16_CONTROL_ELIGIBILITY_REQUIRED");
    return decision("faq-v1:16", true, { controlled: onBattlefield && eligible,
      markerFaceIgnoredForControl: face === "deactivated" });
  },
  "faq-v1:17": (raw) => {
    const input = shape(raw, ["candidateCardInstanceId", "candidateCardName",
      "blockedCardInstanceIds", "blockedCardNames"], "FAQ_F3_17_INPUT_INVALID");
    const candidateId = text(input.candidateCardInstanceId, "FAQ_F3_17_CARD_INSTANCE_REQUIRED");
    text(input.candidateCardName, "FAQ_F3_17_CARD_NAME_REQUIRED");
    if (!Array.isArray(input.blockedCardInstanceIds) || !Array.isArray(input.blockedCardNames)) {
      fail("FAQ_F3_17_BLOCK_LISTS_REQUIRED");
    }
    const available = !input.blockedCardInstanceIds.includes(candidateId);
    return decision("faq-v1:17", available, { physicalInstanceBlocked: !available,
      cardNameBlockIgnored: true }, available ? [] : ["PHYSICAL_CARD_INSTANCE_BLOCKED"]);
  },
  "faq-v1:18": (raw) => {
    const input = shape(raw, ["layoutComponentIds"], "FAQ_F3_18_INPUT_INVALID");
    if (!Array.isArray(input.layoutComponentIds) || input.layoutComponentIds.length < 2
      || new Set(input.layoutComponentIds.map((id) => text(id,
        "FAQ_F3_18_COMPONENT_ID_INVALID"))).size !== input.layoutComponentIds.length) {
      fail("FAQ_F3_18_INDEPENDENT_COMPONENTS_REQUIRED");
    }
    return decision("faq-v1:18", true, { independentTerrainPieceCount:
      input.layoutComponentIds.length });
  },
  "faq-v1:19": (raw) => {
    const input = shape(raw, ["missionId", "unitStatuses", "markerControlled",
      "claimRequirementsMet"], "FAQ_F3_19_INPUT_INVALID");
    if (text(input.missionId, "FAQ_F3_19_MISSION_REQUIRED") !== "artefact_hunt") {
      fail("FAQ_F3_19_ARTEFACT_HUNT_REQUIRED");
    }
    if (!Array.isArray(input.unitStatuses)
      || input.unitStatuses.some((status) => !["flying", "burrowed"].includes(status))) {
      fail("FAQ_F3_19_STATUS_INVALID");
    }
    const markerControlled = bool(input.markerControlled, "FAQ_F3_19_CONTROL_STATE_REQUIRED");
    const requirements = bool(input.claimRequirementsMet, "FAQ_F3_19_CLAIM_STATE_REQUIRED");
    return decision("faq-v1:19", markerControlled && requirements, {
      claimAllowedDespiteControlRestriction: markerControlled && requirements,
    }, markerControlled && requirements ? [] : ["ARTEFACT_CLAIM_REQUIREMENTS_NOT_MET"]);
  },
  "faq-v1:20": (raw) => {
    const input = shape(raw, ["entryEdgeTouchesHighGround", "placementLegal",
      "unitCoherent"], "FAQ_F3_20_INPUT_INVALID");
    const touches = bool(input.entryEdgeTouchesHighGround, "FAQ_F3_20_EDGE_CONTACT_REQUIRED");
    const placement = bool(input.placementLegal, "FAQ_F3_20_PLACEMENT_REQUIRED");
    const coherent = bool(input.unitCoherent, "FAQ_F3_20_COHERENCY_REQUIRED");
    const legal = touches && placement && coherent;
    return decision("faq-v1:20", legal, { directHighGroundDeployment: legal },
      legal ? [] : [!touches ? "ENTRY_EDGE_DOES_NOT_TOUCH_HIGH_GROUND"
        : "HIGH_GROUND_DEPLOYMENT_PLACEMENT_ILLEGAL"]);
  },
  "faq-v1:21": (raw) => {
    const input = shape(raw, ["sourceType", "sourceOwnerId", "actingPlayerId"],
      "FAQ_F3_21_INPUT_INVALID");
    const sourceType = enumeration(input.sourceType, ["primary_entry_edge", "omega_worm",
      "pylon", "forward_deployment", "transport"], "FAQ_F3_21_SOURCE_TYPE_INVALID");
    const owner = text(input.sourceOwnerId, "FAQ_F3_21_OWNER_REQUIRED");
    const actor = text(input.actingPlayerId, "FAQ_F3_21_ACTOR_REQUIRED");
    const isEntryEdge = ["primary_entry_edge", "omega_worm", "pylon"].includes(sourceType);
    const friendly = isEntryEdge && owner === actor;
    const special = ["omega_worm", "pylon"].includes(sourceType);
    return decision("faq-v1:21", friendly, { isEntryEdge, friendly,
      enemyDenialImmune: friendly && special, temporaryDeployExceptionOnly: !isEntryEdge },
    friendly ? [] : [isEntryEdge ? "ENTRY_EDGE_NOT_FRIENDLY" : "SOURCE_IS_NOT_ENTRY_EDGE"]);
  },
  "faq-v1:22": (raw) => {
    const input = shape(raw, ["entrySourceType", "deploymentSucceeded"],
      "FAQ_F3_22_INPUT_INVALID");
    enumeration(input.entrySourceType, ["pylon"], "FAQ_F3_22_PYLON_REQUIRED");
    const deployed = bool(input.deploymentSucceeded, "FAQ_F3_22_DEPLOYMENT_STATE_REQUIRED");
    return decision("faq-v1:22", deployed, { activationConsumed: deployed,
      activationMarkerPlaced: deployed, followupActionAllowed: false,
      followupActiveAbilityAllowed: false }, deployed ? [] : ["PYLON_DEPLOYMENT_NOT_COMPLETED"]);
  },
  "faq-v1:23": (raw) => {
    const input = shape(raw, ["sourceType"], "FAQ_F3_23_INPUT_INVALID");
    const sourceType = enumeration(input.sourceType, ["primary_entry_edge", "omega_network",
      "omega_worm", "pylon"], "FAQ_F3_23_SOURCE_TYPE_INVALID");
    return decision("faq-v1:23", true, { generatesZoneOfInfluence:
      sourceType === "primary_entry_edge", setupOnly: true });
  },
  "faq-v1:24": (raw) => {
    const input = shape(raw, ["leadingModelBaseContact", "unitCoherent",
      "allModelsOutsideEnemyEngagement"], "FAQ_F3_24_INPUT_INVALID");
    const contact = bool(input.leadingModelBaseContact, "FAQ_F3_24_CONTACT_REQUIRED");
    const coherent = bool(input.unitCoherent, "FAQ_F3_24_COHERENCY_REQUIRED");
    const separated = bool(input.allModelsOutsideEnemyEngagement,
      "FAQ_F3_24_ENGAGEMENT_STATE_REQUIRED");
    const legal = contact && coherent && separated;
    return decision("faq-v1:24", legal, { deploymentCompleted: legal,
      abilityWasted: !legal }, legal ? [] : [!contact
      ? "MARKER_DEPLOY_LEADING_CONTACT_ILLEGAL" : "MARKER_DEPLOY_UNIT_PLACEMENT_ILLEGAL"]);
  },
  "faq-v1:25": (raw) => {
    const input = shape(raw, ["unitLocation", "permission"], "FAQ_F3_25_INPUT_INVALID");
    enumeration(input.unitLocation, ["reserves"], "FAQ_F3_25_RESERVES_REQUIRED");
    const permission = enumeration(input.permission,
      ["none", "works_in_reserves", "deploys_unit"], "FAQ_F3_25_PERMISSION_INVALID");
    const legal = permission !== "none";
    return decision("faq-v1:25", legal, { abilityFunctions: legal,
      explicitException: legal }, legal ? [] : ["ABILITY_INACTIVE_IN_RESERVES"]);
  },
  "faq-v1:26": (raw) => {
    const input = shape(raw, ["actionType", "actionSource"], "FAQ_F3_26_INPUT_INVALID");
    const actionType = text(input.actionType, "FAQ_F3_26_ACTION_TYPE_REQUIRED");
    text(input.actionSource, "FAQ_F3_26_ACTION_SOURCE_REQUIRED");
    return decision("faq-v1:26", true, { nominatedToDeploy: actionType === "deploy" });
  },
  "faq-v1:27": (raw) => {
    const input = shape(raw, ["unitLocation", "printedSpeed"], "FAQ_F3_27_INPUT_INVALID");
    enumeration(input.unitLocation, ["reserves"], "FAQ_F3_27_RESERVES_REQUIRED");
    const printedSpeed = number(input.printedSpeed, "FAQ_F3_27_SPEED_INVALID");
    return decision("faq-v1:27", true, { deploymentSpeed: printedSpeed,
      onCreepBeforeEntry: false, creepSpeedBonusApplied: false });
  },
});

export const OFFICIAL_FAQ_F3_BEHAVIOR_KEYS_V1 = Object.freeze(
  Object.fromEntries(ENTRY_IDS.map((entryId) => [
    entryId.replace("faq-v1:", "faq_f3_"), entryId,
  ])),
);

export function evaluateOfficialFaqF3RuleV1(entryId, input = {}) {
  if (!ENTRY_IDS.includes(entryId) || !handlers[entryId]) {
    fail("FAQ_F3_ENTRY_NOT_EXECUTABLE", String(entryId));
  }
  return handlers[entryId](input);
}
