import { assertStarcraftTmgClientCharacterProjectionV2 } from
  "../../../../packages/client-domain/character-presentation-projection-v2.mjs";

export const STARCRAFT_TMG_CHARACTER_PRESENTATION_MOUNT_VERSION =
  "starcraft_tmg_character_presentation_mount_v2";

const HASH = /^[a-f0-9]{64}$/u;

function safeAssetOrigin(value) {
  const normalized = String(value || "").replace(/\/+$/u, "");
  if (!normalized) return "";
  const parsed = new URL(normalized);
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
    parsed.hostname.toLowerCase(),
  );
  if (parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
    || (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:"))) {
    throw Object.assign(new Error("character asset origin is not trusted"), {
      code: "CHARACTER_ASSET_ORIGIN_INVALID",
    });
  }
  return parsed.origin;
}

function validatedDevelopmentProjection(value) {
  const scopeHash = String(value?.principalScopeHash || "");
  return assertStarcraftTmgClientCharacterProjectionV2(value, scopeHash);
}

export function resolveStarcraftTmgCharacterPortraitAssetUriV2(
  projectionInput,
  contentHashInput,
  options = {},
) {
  const projection = validatedDevelopmentProjection(projectionInput);
  if (projection.releaseChannel !== "development_internal"
    || projection.rights.assetDeliveryAllowed !== true) return null;
  const contentHash = String(contentHashInput || "").toLowerCase();
  if (!HASH.test(contentHash)
    || !projection.portrait.frameRegistry.some((frame) => frame.contentHash === contentHash)) {
    return null;
  }
  const origin = safeAssetOrigin(options.assetOrigin);
  const path = projection.portrait.assetDelivery.routeTemplate.replace(
    "{contentHash}",
    contentHash,
  );
  const queryParameter = projection.portrait.assetDelivery.queryParameter;
  const grantToken = projection.portrait.assetDelivery.grantToken;
  return `${origin}${path}?${queryParameter}=${encodeURIComponent(grantToken)}`;
}

function projectValidatedCharacterFrame(projection, input = {}) {
  if (projection.releaseChannel === "public") {
    return Object.freeze({
      schemaVersion: `${STARCRAFT_TMG_CHARACTER_PRESENTATION_MOUNT_VERSION}.frame`,
      kind: "fallback",
      label: projection.fallback.label,
      contentHash: null,
      role: null,
      durationMs: 0,
      frameIndex: 0,
      frameCount: 0,
      shouldAnimate: false,
      generationKey: projection.projectionHash,
      trainingTruth: false,
    });
  }
  const active = input.active === true;
  const reducedMotion = input.reducedMotion === true;
  const schedule = projection.portrait.frameSchedule;
  const requestedIndex = Number.isSafeInteger(input.frameIndex)
    ? Math.max(0, input.frameIndex)
    : 0;
  const frameIndex = reducedMotion || !active ? 0 : requestedIndex % schedule.length;
  const scheduled = schedule[frameIndex];
  return Object.freeze({
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_PRESENTATION_MOUNT_VERSION}.frame`,
    kind: "derived_development",
    label: projection.character.displayName,
    contentHash: scheduled.contentHash,
    role: scheduled.role,
    durationMs: reducedMotion || !active ? 0 : scheduled.durationMs,
    frameIndex,
    frameCount: schedule.length,
    shouldAnimate: active && !reducedMotion && schedule.length > 1,
    generationKey: projection.bindings.bindingHash,
    trainingTruth: false,
  });
}

export function projectStarcraftTmgVisibleCharacterFrameV2(input = {}) {
  return projectValidatedCharacterFrame(
    validatedDevelopmentProjection(input.projection),
    input,
  );
}

export function createStarcraftTmgVisiblePortraitPlayerV2(options = {}) {
  const setTimer = options.setTimeoutImpl || globalThis.setTimeout;
  const clearTimer = options.clearTimeoutImpl || globalThis.clearTimeout;
  if (typeof setTimer !== "function" || typeof clearTimer !== "function") {
    throw new TypeError("portrait player requires timer implementations");
  }
  let generation = 0;
  let timer = null;
  let mounted = false;
  let timerCount = 0;
  let current = null;
  let validatedProjection = null;
  let failed = false;
  let acknowledgeLoaded = null;
  let acknowledgeFailed = null;

  function cancelTimer() {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
      timerCount = 0;
    }
  }

  function stop() {
    generation += 1;
    mounted = false;
    cancelTimer();
    current = null;
    validatedProjection = null;
    failed = false;
    acknowledgeLoaded = null;
    acknowledgeFailed = null;
  }

  function start(input, listener) {
    if (typeof listener !== "function") throw new TypeError("portrait listener is required");
    stop();
    mounted = true;
    validatedProjection = validatedDevelopmentProjection(input.projection);
    const ownedGeneration = generation;
    let frameIndex = 0;

    const emit = () => {
      if (!mounted || ownedGeneration !== generation) return;
      current = projectValidatedCharacterFrame(validatedProjection, {
        active: input.active,
        reducedMotion: input.reducedMotion,
        frameIndex,
      });
      listener(current);
      cancelTimer();
    };

    acknowledgeLoaded = (loaded = {}) => {
      if (!mounted || ownedGeneration !== generation || failed || !current
        || loaded.generationKey !== current.generationKey
        || loaded.contentHash !== current.contentHash) return false;
      cancelTimer();
      if (!current.shouldAnimate) return true;
      timerCount = 1;
      timer = setTimer(() => {
        if (!mounted || ownedGeneration !== generation) return;
        timer = null;
        timerCount = 0;
        frameIndex = (frameIndex + 1) % current.frameCount;
        emit();
      }, current.durationMs);
      return true;
    };

    acknowledgeFailed = (failedFrame = {}) => {
      if (!mounted || ownedGeneration !== generation || !current
        || failedFrame.generationKey !== current.generationKey
        || failedFrame.contentHash !== current.contentHash) return false;
      failed = true;
      cancelTimer();
      return true;
    };
    emit();
    return stop;
  }

  function markLoaded(input = {}) {
    return acknowledgeLoaded ? acknowledgeLoaded(input) : false;
  }

  function markFailed(input = {}) {
    return acknowledgeFailed ? acknowledgeFailed(input) : false;
  }

  function read() {
    return Object.freeze({
      schemaVersion: `${STARCRAFT_TMG_CHARACTER_PRESENTATION_MOUNT_VERSION}.player`,
      mounted,
      timerCount,
      generation,
      frame: current,
      failed,
      trainingTruth: false,
    });
  }

  return Object.freeze({ start, stop, markLoaded, markFailed, read });
}
