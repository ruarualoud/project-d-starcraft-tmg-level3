import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_CHARACTER_ROOM_PROMPT_PROJECTION_VERSION =
  "starcraft_tmg_character_room_prompt_projection_v1";

const STATE_FIELDS = Object.freeze([
  "schemaVersion", "gameId", "dataVersion", "sourceRefreshPerformed",
  "repositoryFallbackUsed", "rulesTruth", "round", "phase", "stage",
  "activeSideKey", "firstPlayerSideKey", "firstPassSideByPhase",
  "phaseFirstActorByRound", "players", "participantIds", "teamGame",
  "colourByPlayer", "scores", "selectedMission", "selectedDeployment",
  "mission", "armyBuildingEngagementScale", "engagementScale",
  "armyResourceBudgetsBySide", "cardResources", "pieces",
  "activeAbilityUseHistory", "reserveLifecycleHistory", "gameOver",
  "terminal", "winner", "terminalReason", "supplyLossLedger",
  "officialMissionRuntimeState", "lastReserveLifecycleResolution",
  "reserveManifestBySide", "officialRoundSupplyState",
  "pendingCurrentProductRangedSequence", "selectedRosterActivationWindow",
  "unitUpgradeSelectionsBySide", "publicRosterDisclosureBySide",
  "ownTeamArmyRostersBySide", "officialCombatProfileBundle",
  "officialBattlefieldTokenMarkerRulesDataBundle",
]);
const RECENT_LOG_LIMIT = 32;

function clone(value) {
  if (value === undefined) return undefined;
  return structuredClone(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function byteLength(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function pickState(state = {}) {
  const selected = Object.fromEntries(STATE_FIELDS
    .filter((field) => state[field] !== undefined)
    .map((field) => [field, clone(state[field])]));
  selected.board = clone(state.board || null);
  const fullLog = Array.isArray(state.log) ? state.log : [];
  selected.recentPublicLog = clone(fullLog.slice(-RECENT_LOG_LIMIT));
  selected.logWindow = {
    totalEntries: fullLog.length,
    retainedEntries: selected.recentPublicLog.length,
    firstRetainedLogicalSequence:
      selected.recentPublicLog[0]?.logicalSequence ?? null,
    lastRetainedLogicalSequence:
      selected.recentPublicLog.at(-1)?.logicalSequence ?? null,
    olderEntriesAvailableFromRoomJournal: fullLog.length > RECENT_LOG_LIMIT,
  };
  return selected;
}

export function projectStarcraftTmgCharacterRoomPromptV1(projection = {}) {
  if (!projection?.room?.roomId
    || !Number.isSafeInteger(Number(projection.room.stateRevision))
    || typeof projection.room.stateHash !== "string"
    || !projection?.viewer?.seatKey
    || !projection?.matchBinding?.bindingHash
    || !projection?.state) {
    throw new TypeError(
      "character room Prompt projection requires a current Viewer projection");
  }
  const originalBytes = byteLength(projection);
  const body = {
    schemaVersion: STARCRAFT_TMG_CHARACTER_ROOM_PROMPT_PROJECTION_VERSION,
    authority: {
      roomId: projection.room.roomId,
      stateRevision: projection.room.stateRevision,
      stateHash: projection.room.stateHash,
      matchBindingHash: projection.matchBinding.bindingHash,
      seatKey: projection.viewer.seatKey,
      visibilityScope: projection.viewer.visibilityScope,
    },
    room: clone(projection.room),
    viewer: clone(projection.viewer),
    matchBinding: clone(projection.matchBinding),
    control: clone(projection.control || null),
    state: pickState(projection.state),
    projectionPolicy: {
      source: "current_viewer_projection_compacted_by_host",
      exactDynamicStateRetained: true,
      staticCatalogueCopiesOmitted: true,
      rulesDetailsMustBeQueriedOrReportedUnknown: true,
      characterMayOverrideRules: false,
      characterMayMutateRoom: false,
      hiddenInformationAdded: false,
      recentPublicLogLimit: RECENT_LOG_LIMIT,
      originalProjectionBytes: originalBytes,
      sourceRefreshPerformed: false,
      trainingTruth: false,
    },
    trainingTruth: false,
  };
  const compactedBytes = byteLength(body);
  body.projectionPolicy.compactedProjectionBytes = compactedBytes;
  body.projectionPolicy.compressionRatio = Number(
    (compactedBytes / Math.max(1, originalBytes)).toFixed(6));
  body.projectionPolicy.softSizeWarning = compactedBytes > 512 * 1024;
  return freeze({ ...body,
    projectionHash: hashStarcraftTmgContract(body) });
}
