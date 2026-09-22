import { hashStarcraftTmgClientContract } from
  "../../packages/client-domain/portable-contract-hash-v1.mjs";
import { COMPANION_PORTRAIT_ASSET_REGISTRY_V1 } from
  "./companion-portrait-asset-registry-v1.mjs";

/**
 * Companion portrait six-state animation binding (server-safe) — Ticket 26 /
 * Slice 266e SS-3.
 *
 * Closes the last portrait honesty gap (`COMPANION_PORTRAIT_CONTINUOUS_ANIMATION`)
 * WITHOUT generating or admitting any new asset: the six semantic presentation
 * states stay the committed audit/receipt-pinned STATIC keyframes from
 * `companion-portrait-asset-registry-v1.mjs`; what this module adds is the
 * deterministic ANIMATION BINDING between them —
 *
 *   1. a pure state machine mapping live companion-session signals to exactly
 *      one of the six states (fixed priority, fail-closed to `idle`); and
 *   2. per-state deterministic transition descriptors (a bounded opacity
 *      crossfade between committed keyframes) with the reduced-motion static
 *      fallback the portrait-state contracts prescribe.
 *
 * No frame loop, blink cycle or generated in-between frame is pretended: the
 * only motion is the state-change crossfade, and reduced motion renders the
 * single static frame. The binding is data-driven over the portrait asset
 * registry: a seventh companion with a complete six-state registry entry is
 * bound automatically; incomplete coverage fails closed to `idle` rather than
 * inventing a frame. Pixels never become gameplay truth; nothing here grants
 * Rules, room, Provider or memory authority.
 */

export const COMPANION_PORTRAIT_ANIMATION_STATE_IDS = Object.freeze([
  "idle",
  "speaking",
  "listening",
  "alert_combat",
  "damaged_concerned",
  "reflective",
]);

const STATE_ID_SET = new Set(COMPANION_PORTRAIT_ANIMATION_STATE_IDS);

/**
 * Deterministic transition descriptors. `durationMs` is the bounded fade-in
 * duration applied when the bound state CHANGES (the outgoing frame dips and
 * the incoming committed keyframe fades in); there is no per-state loop.
 * Reduced motion always wins: duration collapses to 0 and the single static
 * keyframe renders, matching each portrait-state contract's reducedMotion
 * clause verbatim.
 */
const TRANSITION_DESCRIPTORS = Object.freeze({
  idle: Object.freeze({
    durationMs: 240,
    curve: "deterministic_linear_crossfade",
    motion: "single fade-in on state entry; resting frame, no loop",
    reducedMotion: "single static neutral frame",
  }),
  speaking: Object.freeze({
    durationMs: 180,
    curve: "deterministic_linear_crossfade",
    motion: "quick fade-in when the companion utterance is accepted; no phoneme cycle",
    reducedMotion: "static speaking frame",
  }),
  listening: Object.freeze({
    durationMs: 220,
    curve: "deterministic_linear_crossfade",
    motion: "gentle fade-in while the human composes; no blink cycle",
    reducedMotion: "static neutral frame",
  }),
  alert_combat: Object.freeze({
    durationMs: 120,
    curve: "deterministic_linear_crossfade",
    motion: "fast fade-in on pending-confirmation/interruption; no double flash",
    reducedMotion: "static warning frame",
  }),
  damaged_concerned: Object.freeze({
    durationMs: 160,
    curve: "deterministic_linear_crossfade",
    motion: "single fade-in on session error; no sync-loss animation; Kerrigan honestly shares the approved warning frame",
    reducedMotion: "static frame (shared approved warning frame for Kerrigan, labelled)",
  }),
  reflective: Object.freeze({
    durationMs: 260,
    curve: "deterministic_linear_crossfade",
    motion: "slow fade-in while an explicit continue/send drain is in progress; no gaze pulse",
    reducedMotion: "static reflect frame",
  }),
});

/**
 * Fixed signal priority. The first strictly-true signal wins; anything
 * unrecognized or absent falls through to `idle`. Signals are plain booleans
 * derived from live session state by the caller — this function is pure,
 * deterministic and total.
 *
 *   sessionError  → damaged_concerned  (session error state visible)
 *   interrupted   → alert_combat       (provider turn interrupted; explicit
 *                                       human confirmation pending)
 *   thinking      → reflective         (explicit continue/send drain running)
 *   speaking      → speaking           (the bound companion's utterance was
 *                                       just accepted)
 *   composing     → listening          (the human is composing)
 *   (none)        → idle
 */
export const COMPANION_PORTRAIT_ANIMATION_SIGNAL_PRIORITY = Object.freeze([
  "sessionError",
  "interrupted",
  "thinking",
  "speaking",
  "composing",
]);

const SIGNAL_TO_STATE = Object.freeze({
  sessionError: "damaged_concerned",
  interrupted: "alert_combat",
  thinking: "reflective",
  speaking: "speaking",
  composing: "listening",
});

export function resolveCompanionPortraitAnimationStateV1(signals = {}) {
  const source = signals && typeof signals === "object" ? signals : {};
  for (const signal of COMPANION_PORTRAIT_ANIMATION_SIGNAL_PRIORITY) {
    if (source[signal] === true) return SIGNAL_TO_STATE[signal];
  }
  return "idle";
}

/**
 * Deterministic transition descriptor for one state. Unknown state ids fail
 * closed to the `idle` descriptor (never an invented animation). With
 * `reducedMotion: true` the duration collapses to 0 and
 * `reducedMotionStatic: true` tells the renderer to show the single static
 * keyframe with no transition at all.
 */
export function companionPortraitAnimationTransitionV1(stateId, options = {}) {
  const resolved = STATE_ID_SET.has(stateId) ? stateId : "idle";
  const descriptor = TRANSITION_DESCRIPTORS[resolved];
  const reducedMotion = options?.reducedMotion === true;
  return Object.freeze({
    stateId: resolved,
    requestedStateId: STATE_ID_SET.has(stateId) ? resolved : String(stateId ?? ""),
    failClosedToIdle: !STATE_ID_SET.has(stateId),
    durationMs: reducedMotion ? 0 : descriptor.durationMs,
    curve: descriptor.curve,
    motion: descriptor.motion,
    reducedMotionStatic: reducedMotion,
    reducedMotion: descriptor.reducedMotion,
  });
}

/**
 * The six bound state ids for one registered companion, derived from the
 * portrait asset registry (data-driven: a seventh companion with a complete
 * registry entry binds automatically). Returns null when the character has no
 * registry entry or incomplete six-state coverage — the caller must fail
 * closed to `idle`, never substitute another character's frame.
 */
export function companionPortraitAnimationStatesV1(characterId) {
  const entry = COMPANION_PORTRAIT_ASSET_REGISTRY_V1.entries
    .find((candidate) => candidate.characterId === characterId);
  if (!entry) return null;
  const stateIds = entry.states.map((state) => state.stateId);
  const complete = COMPANION_PORTRAIT_ANIMATION_STATE_IDS
    .every((stateId) => stateIds.includes(stateId));
  return complete ? Object.freeze([...stateIds]) : null;
}

const unsigned = {
  schemaVersion: "starcraft_tmg_companion_portrait_animation_binding_v1",
  bindingId: "starcraft-tmg.companion-portrait-animation-binding.v1",
  version: "1.0.0",
  presentationOnly: true,
  registryRef: COMPANION_PORTRAIT_ASSET_REGISTRY_V1.registryId,
  registryHash: COMPANION_PORTRAIT_ASSET_REGISTRY_V1.registryHash,
  stateIds: [...COMPANION_PORTRAIT_ANIMATION_STATE_IDS],
  signalPriority: [...COMPANION_PORTRAIT_ANIMATION_SIGNAL_PRIORITY],
  signalToState: { ...SIGNAL_TO_STATE },
  fallbackStateId: "idle",
  transitions: Object.fromEntries(COMPANION_PORTRAIT_ANIMATION_STATE_IDS
    .map((stateId) => [stateId, {
      durationMs: TRANSITION_DESCRIPTORS[stateId].durationMs,
      curve: TRANSITION_DESCRIPTORS[stateId].curve,
      motion: TRANSITION_DESCRIPTORS[stateId].motion,
      reducedMotion: TRANSITION_DESCRIPTORS[stateId].reducedMotion,
    }])),
  entries: COMPANION_PORTRAIT_ASSET_REGISTRY_V1.entries.map((entry) => ({
    characterId: entry.characterId,
    packageId: entry.packageId,
    boundStateIds: entry.states.map((state) => state.stateId),
    complete: companionPortraitAnimationStatesV1(entry.characterId) !== null,
  })),
  honestyNotes: [
    "Only committed audit/receipt-pinned static keyframes are bound; this module admits no new asset and generates no frame.",
    "The only motion is a bounded deterministic crossfade on state change; no continuous frame loop, blink cycle or in-between frame is pretended.",
    "Reduced motion collapses every transition to the single static keyframe, exactly as the portrait-state contracts prescribe.",
    "Kerrigan's damaged_concerned honestly shares the approved warning frame (registry shared_approved_frame), including inside this binding.",
    "Unknown state ids and incomplete registry coverage fail closed to idle; no frame is ever substituted across characters.",
    "No binding grants Rules, room, Provider or memory authority; pixels never become gameplay truth.",
  ],
  authority: {
    canOverrideRules: false,
    canMutateRoom: false,
    canCreateTrainingTruth: false,
  },
};

export const COMPANION_PORTRAIT_ANIMATION_BINDING_V1 = Object.freeze({
  ...unsigned,
  bindingHash: hashStarcraftTmgClientContract(unsigned),
});
