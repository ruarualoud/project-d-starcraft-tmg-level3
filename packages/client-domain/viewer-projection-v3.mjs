// Browser-safe shared projection shape. RoomRuntime produces this shape and
// Client Domain re-projects untrusted responses through the same function;
// any structural difference is a fail-closed schema violation.

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function pick(value, allowed, project = clone) {
  if (!object(value)) return clone(value);
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => allowed.has(key))
    .map(([key, child]) => [key, project(child, key)]));
}

export const STARCRAFT_TMG_VIEWER_PROJECTION_V3_TOP_LEVEL_KEYS = Object.freeze([
  "schemaVersion", "room", "viewer", "control", "matchBinding",
  "authorityVersion", "state", "training",
]);

export const STARCRAFT_TMG_VIEWER_STATE_V3_FIELDS = Object.freeze([
  "schemaVersion", "schema", "gameId", "dataVersion", "dataBundleHash",
  "sourceRefreshPerformed", "repositoryFallbackUsed", "rulesTruth", "round",
  "phase", "stage", "activeSideKey", "firstPlayerSideKey", "firstPassSideByPhase",
  "phaseFirstActorByRound", "players", "participantIds", "colourByPlayer",
  "controllerByDraft", "teamGame", "board", "pieces", "mission", "selectedMission",
  "selectedDeployment", "scores", "scoringResolvedThisPhase", "scoringCleanupProgress",
  "supplyDestroyedThisRound", "supplyLossLedger", "terminal", "terminalReason",
  "gameOver", "winner", "omittedRules", "log", "gameClock",
  "manualAdjudicationUsed", "eligibleForTraining", "trainingTruth",
  "rulesProcedureMode", "pendingAction", "pendingAbility", "pendingAttack",
  "pendingLifeSupportReaction", "pendingProvisionalRuling",
  "pendingRangedAttackSequence", "pendingRestorationReaction", "pendingRulesDispute",
  "provisionalRulings", "rulingVerifications", "rollOffAttempt", "rollOffHistory",
  "rollOffWinnerPlayerId", "submissionsByPlayer", "draftBinding", "deploymentDraft",
  "missionDraft", "faceUpRows", "initialFirstPlayerAssignmentPending",
  "initiativeRollOffHistory", "initialFirstPlayerRollOffHistory", "startOfRoundHistory",
  "determineInitiativeHistory", "cleanupRefreshHistory", "endOfRoundEffectHistory",
  "endGameResolutionHistory", "victoryPointScoringHistory",
  "roundPhaseActivationRulesHistory", "abilityTimingPriorityRulesHistory",
  "armyResourceBudgetRulesHistory", "balancedTerrainRulesHistory",
  "battlefieldTokenMarkerCleanupHistory", "battlefieldTokenMarkerRulesHistory",
  "cardBuildPaymentRulesHistory", "deploymentGeometryHistory", "diceRulesHistory",
  "disputeResolutionRulesHistory", "factionArmyEligibilityRulesHistory",
  "keywordSpecialAbilityRulesHistory", "missionDeploymentDraftHistory",
  "reserveLifecycleHistory", "respawnMorphRulesHistory", "rosterDisclosureRulesHistory",
  "scoringFinalizationRulesHistory", "statusStayInPlayHistory", "summonRulesHistory",
  "supplyPoolRulesHistory", "unitCardSupplyRulesHistory",
  "unitCompositionUpgradeRulesHistory", "unitDestructionLifecycleHistory",
  "lifeSupportReactionHistory", "restorationReactionHistory", "academyReactionUsage",
  "activeAbilityUseHistory", "lifeSupportReactionUsage", "reactionActivationUsage",
  "reactionUsage", "restorationReactionUsage", "lastAbilityTimingPriorityRulesResolution",
  "lastArmyResourceBudgetRulesResolution", "lastAttackPoolEdgeResolution",
  "lastBalancedTerrainRulesResolution", "lastBattlefieldTokenMarkerCleanupResolution",
  "lastBattlefieldTokenMarkerCleanupRound", "lastBattlefieldTokenMarkerRulesResolution",
  "lastCardBuildPaymentRulesResolution", "lastCloseCombatLifecycleResolution",
  "lastDeploymentGeometryResolution", "lastDiceTestModifierResolution",
  "lastDirectMovementDisplacementResolution", "lastDisputeResolutionRulesResolution",
  "lastElevationEffectiveSizeRulesResolution", "lastFactionArmyEligibilityRulesResolution",
  "lastFlyingRulesResolution", "lastGapPlaceGeometryResolution",
  "lastHiddenBurrowedResolution", "lastKeywordSpecialAbilityRulesResolution",
  "lastMissionDeploymentDraftResolution", "lastModelBaseGeometryRulesResolution",
  "lastPlayerControlRelationshipRulesResolution", "lastReserveLifecycleResolution",
  "lastRespawnMorphRulesResolution", "lastRosterDisclosureRulesResolution",
  "lastRoundPhaseActivationRulesResolution", "lastScoringFinalizationRulesResolution",
  "lastSpecialTerrainRulesResolution", "lastStatusStayInPlayResolution",
  "lastSummonRulesResolution", "lastSupplyPoolRulesResolution", "lastTemplateResolution",
  "lastTerrainLosRulesResolution", "lastUnitCardSupplyRulesResolution",
  "lastUnitCompositionUpgradeRulesResolution", "lastUnitDestructionLifecycleResolution",
  "armyBuildingEngagementScale", "engagementScale", "combatPhaseStartEngagementSnapshot",
  "equipmentDisclosureByUnit", "onTableUnitInspectionsBySide",
  "publicRosterDisclosureBySide", "rosterRegistryResolution",
  "rosterVisibilityAgreementsByPlayer", "rosterVisibilityResolution",
  "verifiedTournamentRosterVisibilityOverride", "teamMineralBudgetAgreement",
  "missionDeploymentDraftParticipantIds", "officialMissionDeploymentDraft",
  "officialMissionDeploymentDraftBinding", "officialMissionSetupBinding",
  "officialMissionMarkerPlacement", "officialBattlefieldMarkers",
  "officialBattlefieldTokens", "officialBattlefieldMarkerViewsAtSetup",
  "officialBattlefieldSetup", "officialBalancedTerrainSetupCertificate",
  "officialDeploymentGeometryBinding", "officialRoundSupplyState",
  "officialTerrainHeightTierLedger", "officialBattlefieldTokenMarkerRegistry",
  "officialAbilityTimingPriorityDataBundle", "officialArmyResourceBudgetDataBundle",
  "officialBalancedTerrainRulesDataBundle", "officialBattlefieldTokenMarkerRulesDataBundle",
  "officialCardBuildPaymentDataBundle", "officialCombatProfileBundle",
  "officialDeploymentGeometryDataBundle", "officialDiceTestModifierDataBundle",
  "officialDisputeResolutionRulesDataBundle", "officialFactionArmyEligibilityDataBundle",
  "officialGameplayDataBundle", "officialKeywordSpecialAbilityDataBundle",
  "officialMissionDeploymentDraftDataBundle", "officialModelBaseGeometryDataBundle",
  "officialPlayerControlRelationshipDataBundle", "officialReserveLifecycleDataBundle",
  "officialRosterDisclosureDataBundle", "officialRoundPhaseActivationDataBundle",
  "officialRulePrecedenceRegistry", "officialScoringFinalizationRulesDataBundle",
  "officialSupplyPoolDataBundle", "officialTerrainLosDataBundle",
  "officialUnitCardSupplyDataBundle", "officialUnitCompositionUpgradeDataBundle",
  "officialUnitDestructionLifecycleDataBundle", "finalReserveDestructionLedger",
  "hiddenBurrowedHistory", "armyCardOpenInformationBySide", "cardResources",
  "armyBuildingConfigurationBySide", "armyResourceBudgetsBySide",
  "unitCompositionSelectionsBySide", "unitUpgradeSelectionsBySide",
  "armyCompositionUpgradeAuditsBySide", "ownTeamArmyRostersBySide",
  "equipmentReminderPermitsByActionHash", "privateRosterDisclosureConductIncidents",
]);

export const STARCRAFT_TMG_V3_FROZEN_PUBLIC_WHOLE_TREE_FIELDS = Object.freeze([
  "officialAbilityTimingPriorityDataBundle", "officialArmyResourceBudgetDataBundle",
  "officialBalancedTerrainRulesDataBundle", "officialBattlefieldTokenMarkerRulesDataBundle",
  "officialCardBuildPaymentDataBundle", "officialCombatProfileBundle",
  "officialDeploymentGeometryDataBundle", "officialDiceTestModifierDataBundle",
  "officialDisputeResolutionRulesDataBundle", "officialFactionArmyEligibilityDataBundle",
  "officialGameplayDataBundle", "officialKeywordSpecialAbilityDataBundle",
  "officialMissionDeploymentDraftDataBundle", "officialModelBaseGeometryDataBundle",
  "officialPlayerControlRelationshipDataBundle", "officialReserveLifecycleDataBundle",
  "officialRosterDisclosureDataBundle", "officialRoundPhaseActivationDataBundle",
  "officialRulePrecedenceRegistry", "officialScoringFinalizationRulesDataBundle",
  "officialSupplyPoolDataBundle", "officialTerrainLosDataBundle",
  "officialUnitCardSupplyDataBundle", "officialUnitCompositionUpgradeDataBundle",
  "officialUnitDestructionLifecycleDataBundle",
]);

const STATE_FIELDS = new Set(STARCRAFT_TMG_VIEWER_STATE_V3_FIELDS);
const WHOLE_TREE = new Set(STARCRAFT_TMG_V3_FROZEN_PUBLIC_WHOLE_TREE_FIELDS);
const POINT_KEYS = new Set(["x", "y", "z", "xInches", "yInches", "zInches",
  "xMilliInches", "yMilliInches", "zMilliInches", "rotationDegrees",
  "baseRotationDegrees"]);
const AREA_KEYS = new Set([
  "schemaVersion", "schema", "id", "terrainId", "markerId", "tokenId", "number",
  "name", "label", "kind", "terrainKind", "markerKind", "markerRole", "markerType",
  "tokenKind", "shape", "sideKey", "controlSideKey", "previousControlSideKey",
  "factionIndicatorSideKey", "sourcePieceId", "createdByPieceId", "appliedByPieceId",
  "targetPieceId", "createdRound", "status", "isActivated", "isDestroyed",
  "isRemoved", "removedBy", "expiresAt", "affinity", "affinityColour", "value",
  "vp", "markerVp", "controlledMarkerVp", "widthInches", "depthInches",
  "heightInches", "length", "diameterInches", "diameterMillimeters",
  "widthMilliInches", "heightMilliInches", "depthMilliInches", "diameterMilliInches",
  "baseWidthMilliInches", "baseDepthMilliInches", "baseDiameterMilliInches",
  "baseDiameterInches", "baseDiameterMm", "radius", "radiusInches", "radiusMm",
  "radiusMillimeters", "radiusMilliInches", "minX", "minY", "maxX", "maxY",
  "minXMilliInches", "minYMilliInches", "maxXMilliInches", "maxYMilliInches",
  "xInches", "yInches", "xMilliInches", "yMilliInches", "rotationDegrees", "face",
  "size", "characteristic", "coverType", "elevation", "effectiveSize",
  "blocksLineOfSight", "blocksPlacement", "impassable", "landingAllowed",
  "standableHorizontalSurface", "stayInPlay", "endsWhenSourceDestroyed",
  "physicalPresence", "statusEffectHash", "terrainHash", "markerHash", "tokenHash",
  "rulesTruth", "trainingTruth", "coordinate", "center", "point", "footprint",
  "originalFootprint", "rulesFootprint", "rulesFootprintMilliInches", "baseGeometry",
  "elevationSurface", "vertices", "openings", "accessPoints", "engagementGeometry",
  "missionMarkerControlGeometry", "specialTerrainAgreement", "terrainElevationAgreement",
  "setupAgreement",
]);
const AREA_CHILDREN = new Set(["footprint", "originalFootprint", "rulesFootprint",
  "rulesFootprintMilliInches", "baseGeometry", "elevationSurface",
  "engagementGeometry", "missionMarkerControlGeometry"]);
const BOARD_KEYS = new Set(["schemaVersion", "widthInches", "heightInches",
  "scenarioMapId", "scenarioMapName", "backgroundImageUrl", "deploymentId",
  "deploymentName", "deploymentImageUrl", "mapSourceType", "terrain", "centerMarkers",
  "effectMarkers", "markers", "tokens", "missionMarkers", "accessPoints", "trainingTruth"]);
const BOARD_COLLECTIONS = new Set(["terrain", "centerMarkers", "effectMarkers", "markers",
  "tokens", "missionMarkers", "accessPoints"]);
const PLAYER_KEYS = new Set(["schemaVersion", "id", "playerId", "sideKey", "teamKey",
  "name", "label", "faction", "factionName", "factionTags", "colour", "color",
  "passedPhases", "commandPoints", "minerals", "supply", "score", "status",
  "trainingTruth"]);
const PHASE_KEYS = new Set(["setup", "deployment", "start", "movement", "assault",
  "combat", "end", "cleanup", "end_of_round", "passed", "activated", "value"]);
const GAME_KEYS = new Set([
  ...AREA_KEYS, "modelId", "pieceId", "unitId", "unitInstanceId", "ownerSideKey",
  "controllerSideKey", "armySideKey", "unitName", "factionTag", "unitType", "profileSize",
  "printedSize", "sizeCharacteristic", "baseShape", "baseMm", "baseWidthMm",
  "baseDepthMm", "baseWidthInches", "baseDepthInches", "baseRotationDegrees",
  "measurementBaseKind", "usesFlightStand", "isOnField", "isOnBattlefield",
  "isInReserves", "isSummoned", "currentModels", "maxModels", "currentSupply",
  "supply", "cost", "mineralCost", "damage", "damageMarker", "hitPoints",
  "remainingWounds", "shield", "speed", "evade", "armor", "armour", "hp", "tags",
  "keywords", "derivedKeywords", "description", "activation", "abilityKind", "effectKind",
  "oncePerRound", "linkedTo", "range", "target", "roa", "hit", "dmg", "surge",
  "costS", "costL", "amount", "resourceType", "sourceText", "weaponName",
  "combatWeaponName", "officialPayloadHash", "payloadHash", "profileHash",
  "sourceRecordHash", "sourceUnitProfileHash", "rawTextHash", "recordKey", "rosterId",
  "officialUnitRecordKey", "version", "models", "statuses", "weapons", "abilities",
  "upgrades", "weapon", "resourceCost", "stats", "activatedPhases", "usedActiveAbilities",
  "usedReactions", "destroyedModelIds", "selectedUpgradeNames", "selectedUpgrades",
  "equipment", "specialistLoadout", "weaponChoices", "assaultWeaponNames", "combatTags",
  "combatTag", "combatEngaged", "inCoherency", "coherencyStatus", "flying",
  "leadingModelId", "lastLeadingModelId", "lastMovePlanHash", "lastRunPlanHash",
  "lastDeployPlanHash", "lastDisengagePlanHash", "gainsStationary", "controlTransferred",
  "displacement", "resultHash", "mode", "reason", "details", "compositionKind",
  "armySlotType", "assignedUpgradeByModelId", "selectedUpgradeCount",
  "specialistLoadoutHash", "unitCompositionResult", "commandContract", "assaultEffects",
  "combatEffects", "startOfRoundEffects", "reactionEligibility", "disengageHistory",
  "disengageAssaultRestriction", "baseSource",
]);
const ACTION_KEYS = new Set([
  ...GAME_KEYS, "actionType", "sourcePieceId", "targetId", "domainId", "candidateId",
  "actionKey", "choiceId", "phase", "round", "score", "cardId", "cardName",
  "cardResourceId", "abilityId", "abilityName", "effectKeyword", "to", "from", "path",
  "canonicalPath", "movePlan", "chargePlan", "disengagePlan", "placementSequence",
  "finalModelPositions", "parameters", "result", "events", "action", "chance", "hash",
  "entryHash", "eventsHash", "proposalHash", "pendingHash", "pendingAttackHash",
  "pendingAbilityHash", "pendingReactionHash", "casualtyModelIds",
  "convertedFailedDieIndices", "ruleAtomIds",
]);
const LOG_KEYS = new Set(["schemaVersion", "type", "id", "round", "phase", "sideKey",
  "pieceId", "modelId", "action", "events", "details", "result", "status",
  "occurredAt", "sequence", "entryHash", "trainingTruth"]);
const PENDING_KEYS = new Set([...ACTION_KEYS, "roomId", "gameId", "matchBindingHash",
  "stateRevision", "seatKey", "playerId", "choices", "choice", "options", "eligible",
  "eligiblePieceIds", "eligibleModelIds", "remaining", "remainingPieceIds",
  "remainingModelIds", "remainingBatchProfileKeys", "attackerPieceId", "defenderPieceId",
  "attackerModelId", "defenderModelId", "initiatingSideKey", "respondingSideKey",
  "procedureKind", "resolutionMode", "expiresAtStateRevision", "previousPendingAttackHash",
  "previousPendingAbilityHash", "modifiedResourceCost", "attackPool", "effectQueue",
  "profile", "spec"]);
const GENERIC_KEYS = new Set([...ACTION_KEYS, "gameId", "roomId", "matchId",
  "matchBindingHash", "stateRevision", "revision", "round", "stage", "playerId",
  "teamId", "teamKey", "winner", "terminalReason", "activeSideKey", "firstPlayerSideKey",
  "nextActiveSideKey", "previousActiveSideKey", "complete", "resolved", "resolution",
  "resolutionHash", "before", "after", "beforeScores", "resultingScores", "finalScore",
  "points", "total", "count", "index", "sequence", "occurredAt", "createdAt",
  "updatedAt", "sourceId", "sourceRef", "sourceHash", "sourceSnapshotHash",
  "dataSnapshotHash", "contentHash", "artifactHash", "bundleHash", "certificateHash",
  "ledgerHash", "rulesTruth", "productionReady", "eligibleForTraining", "entries", "items",
  "rows", "history", "choices", "options", "actions", "results", "values", "selected",
  "selectedId", "selectedIds", "selectedOccurrenceId", "occurrenceId", "occurrenceIds",
  "allOccurrenceIds", "remainingOccurrenceIds", "eliminatedOccurrenceIds",
  "discardedOccurrenceIds", "mission", "deployment", "missionId", "deploymentId",
  "missionName", "deploymentName", "format", "startingSupply", "extraSupply",
  "gameLength", "missionParams", "scoringConditions", "additionalConditions", "refId",
  "isManual", "collection", "transition", "privateJournalSequence", "visibility",
  "rosterVisibility", "agreement", "agreements", "permit", "permits", "playerIds",
  "participantIds", "pieceIds", "modelIds"]);
const MISSION_KEYS = new Set(["schemaVersion", "schema", "id", "missionId", "name",
  "missionName", "faction", "type", "format", "startingSupply", "extraSupply",
  "gameLength", "missionParams", "scoringConditions", "additionalConditions", "refId",
  "isManual", "sourceRef", "sourceHash", "rulesTruth", "trainingTruth"]);
const SOURCE_REF_KEYS = new Set(["sourceId", "collection", "id", "recordKey",
  "contentHash", "sourceHash", "url", "version", "trainingTruth"]);
const GAME_CLOCK_KEYS = new Set(["schemaVersion", "round", "phase", "transition",
  "activeSideKey", "firstPlayerSideKey", "trainingTruth"]);

function area(value) {
  return pick(value, AREA_KEYS, (child, key) => {
    if (["coordinate", "center", "point"].includes(key)) return pick(child, POINT_KEYS);
    if (AREA_CHILDREN.has(key)) return area(child);
    if (["vertices", "openings", "accessPoints"].includes(key)) {
      return Array.isArray(child) ? child.map(area) : [];
    }
    return object(child) ? area(child) : clone(child);
  });
}

function game(value, allowed = GAME_KEYS) {
  if (Array.isArray(value)) return value.map((entry) => object(entry) ? game(entry, allowed) : clone(entry));
  if (!object(value)) return clone(value);
  return pick(value, allowed, (child, key) => {
    if (["footprint", "rulesFootprint", "rulesFootprintMilliInches", "baseGeometry"].includes(key)) return area(child);
    if (["coordinate", "center", "point"].includes(key)) return pick(child, POINT_KEYS);
    if (key === "activatedPhases" || key === "passedPhases") return pick(child, PHASE_KEYS);
    return game(child, allowed);
  });
}

function action(value) {
  if (Array.isArray(value)) return value.map(action);
  if (!object(value)) return clone(value);
  return pick(value, ACTION_KEYS, (child, key) => (
    ["to", "from"].includes(key) ? pick(child, POINT_KEYS) : action(child)
  ));
}

function generic(value) {
  if (Array.isArray(value)) return value.map((entry) => object(entry) ? generic(entry) : clone(entry));
  if (!object(value)) return clone(value);
  return pick(value, GENERIC_KEYS, (child) => generic(child));
}

function participants(state) {
  return new Set([...Object.keys(state.players || {}), ...(state.participantIds || [])].map(String));
}

function participantMap(value, state) {
  if (!object(value)) return {};
  const allowed = participants(state);
  return Object.fromEntries(Object.entries(value).filter(([key]) => allowed.has(String(key)))
    .map(([key, child]) => [key, object(child) || Array.isArray(child) ? generic(child) : clone(child)]));
}

function field(fieldName, value, state) {
  if (WHOLE_TREE.has(fieldName)) return clone(value);
  if (fieldName === "board") return pick(value, BOARD_KEYS, (child, key) => (
    BOARD_COLLECTIONS.has(key) ? (Array.isArray(child) ? child.map(area) : []) : clone(child)
  ));
  if (fieldName === "pieces") return Array.isArray(value) ? value.map((piece) => game(piece)) : [];
  if (fieldName === "players") {
    if (!object(value)) return {};
    return Object.fromEntries(Object.entries(value).map(([key, player]) => [key,
      pick(player, PLAYER_KEYS, (child, childKey) => childKey === "passedPhases"
        ? pick(child, PHASE_KEYS) : clone(child))]));
  }
  if (fieldName === "log") return Array.isArray(value) ? value.map((entry) => (
    pick(entry, LOG_KEYS, (child, key) => ["action", "events", "details", "result"].includes(key)
      ? action(child) : clone(child)))) : [];
  if (["pendingAction", "pendingAbility", "pendingAttack", "pendingLifeSupportReaction",
    "pendingProvisionalRuling", "pendingRangedAttackSequence", "pendingRestorationReaction",
    "pendingRulesDispute"].includes(fieldName)) {
    const pending = (child) => Array.isArray(child) ? child.map(pending)
      : object(child) ? pick(child, PENDING_KEYS, pending) : clone(child);
    return pending(value);
  }
  if (["mission", "selectedMission", "selectedDeployment"].includes(fieldName)) {
    return pick(value, MISSION_KEYS, (child, key) => key === "sourceRef"
      ? pick(child, SOURCE_REF_KEYS)
      : ["missionParams", "scoringConditions", "additionalConditions"].includes(key)
        ? generic(child)
        : clone(child));
  }
  if (fieldName === "gameClock") return pick(value, GAME_CLOCK_KEYS);
  if (fieldName === "rosterRegistryResolution") {
    const keys = new Set(["schemaVersion", "rosterVisibility", "teamMembershipByPlayer",
      "registryHash", "resolutionHash", "trainingTruth"]);
    return pick(value, keys, (child, key) => key === "teamMembershipByPlayer"
      ? participantMap(child, state)
      : generic(child));
  }
  if (["scores", "colourByPlayer", "controllerByDraft", "submissionsByPlayer",
    "armyCardOpenInformationBySide", "cardResources", "armyBuildingConfigurationBySide",
    "armyResourceBudgetsBySide", "unitCompositionSelectionsBySide",
    "unitUpgradeSelectionsBySide", "armyCompositionUpgradeAuditsBySide",
    "ownTeamArmyRostersBySide"].includes(fieldName)) return participantMap(value, state);
  if (fieldName === "equipmentReminderPermitsByActionHash") {
    if (!object(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .map(([key, child]) => [key, generic(child)]));
  }
  if (fieldName === "privateRosterDisclosureConductIncidents") {
    return Array.isArray(value) ? value.map(generic) : [];
  }
  if (["officialBattlefieldMarkers", "officialBattlefieldTokens",
    "officialBattlefieldMarkerViewsAtSetup"].includes(fieldName)) {
    return Array.isArray(value) ? value.map(area) : [];
  }
  if (fieldName === "officialMissionMarkerPlacement") {
    const keys = new Set(["schemaVersion", "schema", "missionId", "missionName",
      "missionMarkers", "markerCount", "placementHash", "sourceHash", "trainingTruth"]);
    return pick(value, keys, (child, key) => key === "missionMarkers" && Array.isArray(child)
      ? child.map(area) : clone(child));
  }
  if (fieldName === "firstPassSideByPhase") return pick(value, PHASE_KEYS);
  return generic(value);
}

export function projectStarcraftTmgViewerStateShapeV3(state = {}) {
  const source = object(state) ? state : {};
  return Object.fromEntries(Object.entries(source)
    .filter(([key]) => STATE_FIELDS.has(key))
    .map(([key, value]) => [key, field(key, value, source)]));
}

export function isExactStarcraftTmgViewerStateShapeV3(state) {
  if (!object(state)) return false;
  return JSON.stringify(state) === JSON.stringify(projectStarcraftTmgViewerStateShapeV3(state));
}
