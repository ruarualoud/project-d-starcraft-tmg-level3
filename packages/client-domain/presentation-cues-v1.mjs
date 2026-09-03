import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";

const ATTACK_EVENT_PATTERN = /(^|_)(attack|ranged|close_combat)(_|$)/u;
const MOVEMENT_EVENT_PATTERN = /(^|_)(move|moved|charge|deploy|disengage|run)(_|$)/u;
const ABILITY_EVENT_PATTERN = /(^|_)(ability|stimpack|heal|restoration|flare)(_|$)/u;
const DESTRUCTION_EVENT_PATTERN = /(^|_)(destroyed|destruction|casualty|removed)(_|$)/u;

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function boundedText(value, maximum = 160) {
  const candidate = typeof value === "string" ? value.trim() : "";
  return candidate && candidate.length <= maximum ? candidate : null;
}

function safePositiveNumber(value) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function firstId(source, keys) {
  for (const key of keys) {
    const value = boundedText(source?.[key]);
    if (value) return value;
  }
  return null;
}

function damageAmount(event) {
  const damagePool = object(event.damagePool);
  const direct = [
    event.totalDamageApplied,
    event.totalDamage,
    event.incomingDamage,
    event.totalDamageAfterReduction,
    damagePool?.totalDamage,
    damagePool?.incomingDamage,
  ].reduce((highest, value) => Math.max(highest, safePositiveNumber(value)), 0);
  if (direct > 0) return direct;
  return Array.isArray(event.targetResults)
    ? event.targetResults.reduce((total, result) => (
      total + safePositiveNumber(object(result)?.damageApplied)
    ), 0)
    : 0;
}

function hasCasualty(event) {
  return event.targetDestroyed === true
    || event.destroyed === true
    || (Array.isArray(event.casualtyModelIds) && event.casualtyModelIds.length > 0);
}

function cueCore(kind, voiceIntent, event, sourceEventIndex, receipt) {
  const eventType = boundedText(event.type) || "unknown_event";
  return {
    kind,
    voiceIntent,
    sourceEventIndex,
    sourceEventType: eventType,
    actorPieceId: firstId(event, ["pieceId", "attackerPieceId", "sourcePieceId"]),
    targetPieceId: firstId(event, ["targetId", "targetPieceId", "defenderPieceId"]),
    actorModelId: firstId(event, ["attackerModelId", "modelId", "sourceModelId"]),
    targetModelId: firstId(event, ["targetModelId", "defenderModelId"]),
    receiptJournalHash: boundedText(receipt.journalHash, 128),
    sourceEventsHash: boundedText(receipt.eventsHash, 128),
    authority: "validated_apply_receipt",
    trainingTruth: false,
  };
}

function appendCue(cues, kind, voiceIntent, event, index, receipt) {
  const core = cueCore(kind, voiceIntent, event, index, receipt);
  cues.push(Object.freeze({
    schemaVersion: "starcraft_tmg_presentation_cue_v1",
    cueId: `presentation-cue-${hashStarcraftTmgClientContract(core)}`,
    ...core,
  }));
}

export function projectStarcraftTmgValidatedReceiptCuesV1(receipt) {
  const source = object(receipt);
  const events = Array.isArray(source?.events) ? source.events.map(object).filter(Boolean) : [];
  const cues = [];
  for (const [index, event] of events.entries()) {
    const eventType = boundedText(event.type)?.toLowerCase() || "";
    const attack = ATTACK_EVENT_PATTERN.test(eventType)
      && !eventType.includes("stage")
      && !eventType.includes("opened")
      && !eventType.includes("pending");
    const moved = MOVEMENT_EVENT_PATTERN.test(eventType);
    const ability = ABILITY_EVENT_PATTERN.test(eventType);
    const destroyed = hasCasualty(event) || DESTRUCTION_EVENT_PATTERN.test(eventType);
    const damage = damageAmount(event);

    if (attack) appendCue(cues, "attack_confirmed", "confirm", event, index, source);
    else if (moved || ability) appendCue(cues, "operation_confirmed", "confirm", event, index, source);

    if (destroyed) appendCue(cues, "model_destroyed", "destroyed", event, index, source);
    else if (damage > 0) appendCue(cues, "target_damaged", "damaged", event, index, source);
  }

  const core = {
    schemaVersion: "starcraft_tmg_presentation_cue_batch_v1",
    receiptJournalHash: boundedText(source?.journalHash, 128),
    sourceEventsHash: boundedText(source?.eventsHash, 128),
    cues,
    authoritativeEffect: false,
    eligibleForTraining: false,
    trainingTruth: false,
  };
  return Object.freeze({
    ...core,
    cueBatchHash: hashStarcraftTmgClientContract(core),
  });
}

