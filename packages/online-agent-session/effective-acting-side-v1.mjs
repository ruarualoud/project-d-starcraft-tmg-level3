export const STARCRAFT_TMG_EFFECTIVE_ACTING_SIDE_VERSION =
  "starcraft_tmg_effective_acting_side_v1";

function sideKey(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

/**
 * Normalize the authoritative turn owner used by the current Rules runtime.
 * Ordinary alternating phases name activeSideKey. Rules-owned windows such as
 * cleanup intentionally clear it and assign the step to firstPlayerSideKey.
 */
export function resolveStarcraftTmgEffectiveActingSideV1(state = {}) {
  const activeSideKey = sideKey(state?.activeSideKey);
  const firstPlayerSideKey = sideKey(state?.firstPlayerSideKey);
  return Object.freeze({
    schemaVersion: STARCRAFT_TMG_EFFECTIVE_ACTING_SIDE_VERSION,
    sideKey: activeSideKey || firstPlayerSideKey,
    source: activeSideKey
      ? "active_side"
      : firstPlayerSideKey ? "first_player_fallback" : "unassigned",
    activeSideKey,
    firstPlayerSideKey,
    rulesAuthority: "room_state",
    trainingTruth: false,
  });
}

