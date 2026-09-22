/**
 * Companion Provider output-budget and truncation classification contract
 * (Ticket 26 / Slice 266f).
 *
 * Context: the first real BYOK companion call returned HTTP 200 with 118,911
 * input units and exactly 64 output units; the 64-unit budget (the Ticket 16
 * profile outputBudget cap) cut the sealed channel JSON mid-string
 * (finish_reason "length"), and the reply could not be rendered. The egress
 * transport already surfaces that condition as
 * `providerTurn: { kind: "invalid_json", issue: "output_truncated", content }`;
 * this module gives the product a GENERAL, versioned contract on top of it:
 *
 *   1. `resolveCompanionProviderOutputBudgetV1` — a versioned output budget
 *      derived from the response contract itself (the serialized sealed
 *      channel envelope plus a bounded reply-text floor), never from any
 *      character/companion identity. `companion_output_budget_v2` supersedes
 *      the historical flat 64-unit budget that truncated the envelope.
 *   2. `classifyCompanionProviderOutputV1` — typed classification of the
 *      transport output: channel_text / output_budget_truncated /
 *      response_json_invalid / provider_tool_turn / contract_missing_channel /
 *      empty_output, with truncation diagnostics (budget units, observed
 *      output units, recovery attempt outcome).
 *   3. `recoverCompanionChannelTextFromTruncatedEnvelopeV1` — a strictly
 *      structural, escape-aware recovery: when the output budget cut only the
 *      envelope closers but the channel `text` string is fully terminated, the
 *      exact string literal is parsed out with JSON semantics. A mid-string
 *      cut is NEVER recovered; nothing is ever fabricated or guessed.
 *
 * This module performs no network I/O, handles no credentials and never
 * overrides Rules/Authority; it only classifies and bounds Provider output.
 */

export const COMPANION_PROVIDER_OUTPUT_CONTRACT_VERSION =
  "starcraft_tmg_companion_provider_output_contract_v1";
export const COMPANION_PROVIDER_OUTPUT_BUDGET_V2 = "companion_output_budget_v2";
export const COMPANION_PROVIDER_OUTPUT_CLASSIFICATIONS = Object.freeze([
  "channel_text",
  "output_budget_truncated",
  "response_json_invalid",
  "provider_tool_turn",
  "contract_missing_channel",
  "empty_output",
]);

// Budget derivation constants (budget v2). ASCII envelope bytes estimate at
// ~4 bytes per output unit; each channel contributes a structure margin for
// its key nesting; the reply-text floor carries the bounded Chinese reply the
// product contract asks for; the ceiling keeps the budget bounded.
const BYTES_PER_OUTPUT_UNIT_ESTIMATE = 4;
const PER_CHANNEL_STRUCTURE_MARGIN_UNITS = 16;
const DEFAULT_TEXT_FLOOR_UNITS = 448;
const DEFAULT_CEILING_UNITS = 1_024;
const MIN_BUDGET_UNITS = 64;
const CHANNEL_PATTERN = /^[a-z][a-z0-9_]{1,63}$/u;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function normalizeAllowedChannels(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw new TypeError("allowedChannels must be an array of 1..8 channels");
  }
  const channels = value.map((channel) => String(channel));
  if (new Set(channels).size !== channels.length
    || channels.some((channel) => !CHANNEL_PATTERN.test(channel))) {
    throw new TypeError("allowedChannels are invalid");
  }
  return channels;
}

function positiveInteger(value, field, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1 || normalized > maximum) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

/**
 * The sealed envelope the response contract requires, serialized with empty
 * text values, measured in estimated output units. This is the minimum any
 * budget must exceed BEFORE any reply text can fit.
 */
export function companionChannelEnvelopeUnitsV1(allowedChannelsInput) {
  const channels = normalizeAllowedChannels(allowedChannelsInput);
  const emptyEnvelope = JSON.stringify({
    channels: Object.fromEntries(channels.map((channel) => [channel, { text: "" }])),
  });
  const envelopeBytes = Buffer.byteLength(emptyEnvelope, "utf8");
  return freeze({
    envelopeBytes,
    envelopeUnits: Math.ceil(envelopeBytes / BYTES_PER_OUTPUT_UNIT_ESTIMATE)
      + channels.length * PER_CHANNEL_STRUCTURE_MARGIN_UNITS,
  });
}

/**
 * Resolve the versioned output budget for one response contract.
 * `companion_output_budget_v2` = sealed-envelope units + reply-text floor,
 * clamped to [64, ceiling]. The historical v1 budget was the flat Ticket 16
 * profile cap of 64 units, which truncated the sealed channel JSON; v2
 * records that supersession explicitly.
 */
export function resolveCompanionProviderOutputBudgetV1(options = {}) {
  if (!object(options)) throw new TypeError("budget options must be an object");
  const channels = normalizeAllowedChannels(options.allowedChannels);
  const textFloorUnits = positiveInteger(
    options.textFloorUnits ?? DEFAULT_TEXT_FLOOR_UNITS,
    "textFloorUnits", DEFAULT_CEILING_UNITS);
  const ceilingUnits = positiveInteger(
    options.ceilingUnits ?? DEFAULT_CEILING_UNITS, "ceilingUnits", 100_000);
  const { envelopeBytes, envelopeUnits } = companionChannelEnvelopeUnitsV1(channels);
  const requested = envelopeUnits + textFloorUnits;
  const maxOutputUnits = Math.max(MIN_BUDGET_UNITS, Math.min(ceilingUnits, requested));
  return freeze({
    schemaVersion: `${COMPANION_PROVIDER_OUTPUT_CONTRACT_VERSION}.budget`,
    budgetVersion: COMPANION_PROVIDER_OUTPUT_BUDGET_V2,
    allowedChannels: channels,
    envelopeBytes,
    envelopeUnits,
    textFloorUnits,
    ceilingUnits,
    requestedUnits: requested,
    maxOutputUnits,
    supersedes: freeze({
      budgetVersion: "companion_output_budget_v1",
      maxOutputUnits: 64,
      defect: "flat 64-unit budget truncated the sealed channel JSON (finish_reason length) on the first live BYOK companion call",
    }),
    characterSpecific: false,
    trainingTruth: false,
  });
}

/**
 * Escape-aware scan for one fully terminated JSON string literal starting at
 * `openQuoteIndex` (which must be `"`). Returns the raw literal (including
 * both quotes) or null when the string is cut before its closing quote.
 */
function terminatedStringLiteralAt(content, openQuoteIndex) {
  if (content[openQuoteIndex] !== "\"") return null;
  for (let index = openQuoteIndex + 1; index < content.length; index += 1) {
    const char = content[index];
    if (char === "\\") {
      index += 1; // skip the escaped unit; a trailing lone backslash ends the scan
      continue;
    }
    if (char === "\"") return content.slice(openQuoteIndex, index + 1);
  }
  return null;
}

/**
 * Structural recovery of a channel `text` value from a budget-truncated
 * sealed envelope. General: keyed only by the channel names of the response
 * contract. Returns null unless the value is a complete, terminated JSON
 * string literal (the envelope closers may be missing). Never fabricates.
 */
export function recoverCompanionChannelTextFromTruncatedEnvelopeV1(content, options = {}) {
  const channels = normalizeAllowedChannels(options.allowedChannels);
  const text = String(content || "");
  if (!text) return null;
  for (const channel of channels) {
    const channelNeedle = `"${channel}"`;
    const channelIndex = text.indexOf(channelNeedle);
    if (channelIndex < 0) continue;
    const textKeyIndex = text.indexOf("\"text\"", channelIndex + channelNeedle.length);
    if (textKeyIndex < 0) continue;
    const colonIndex = text.indexOf(":", textKeyIndex + 6);
    if (colonIndex < 0) continue;
    let cursor = colonIndex + 1;
    while (cursor < text.length && /\s/u.test(text[cursor])) cursor += 1;
    const literal = terminatedStringLiteralAt(text, cursor);
    if (literal === null) continue;
    try {
      const parsed = JSON.parse(literal);
      if (typeof parsed === "string" && parsed.trim()) {
        return freeze({
          channel,
          text: parsed,
          terminatedStringLiteral: true,
          envelopeComplete: false,
        });
      }
    } catch {
      // Not valid JSON string content: no recovery.
    }
  }
  return null;
}

/**
 * Typed classification of one transport output value against the response
 * contract. Pure: no I/O, no Provider-specific branching beyond the generic
 * providerTurn protocol the egress transport already emits.
 */
export function classifyCompanionProviderOutputV1(output, options = {}) {
  if (!object(options)) throw new TypeError("classification options must be an object");
  const channels = normalizeAllowedChannels(options.allowedChannels);
  const budgetUnits = options.budgetUnits === undefined
    ? null
    : positiveInteger(options.budgetUnits, "budgetUnits", 100_000);
  const base = {
    schemaVersion: `${COMPANION_PROVIDER_OUTPUT_CONTRACT_VERSION}.classification`,
    budgetVersion: COMPANION_PROVIDER_OUTPUT_BUDGET_V2,
    budgetUnits,
    characterSpecific: false,
    trainingTruth: false,
  };
  if (!object(output)) {
    return freeze({ ...base, kind: "empty_output" });
  }
  const providerTurn = object(output.providerTurn) ? output.providerTurn : null;
  if (providerTurn) {
    const issue = String(providerTurn.issue || "");
    const turnKind = String(providerTurn.kind || "");
    if (turnKind === "invalid_json" && issue === "output_truncated") {
      const content = typeof providerTurn.content === "string"
        ? providerTurn.content : "";
      const recovered = content
        ? recoverCompanionChannelTextFromTruncatedEnvelopeV1(content, {
          allowedChannels: channels,
        })
        : null;
      const truncation = freeze({
        issue: "output_truncated",
        contentBytes: Buffer.byteLength(content, "utf8"),
        recoveryAttempted: true,
        recovered: recovered !== null,
        recoveryRule: "terminated_channel_string_literal_only",
      });
      if (recovered) {
        return freeze({
          ...base,
          kind: "channel_text",
          channel: recovered.channel,
          text: recovered.text,
          recoveredFromTruncatedEnvelope: true,
          truncation,
        });
      }
      return freeze({
        ...base,
        kind: "output_budget_truncated",
        truncation,
      });
    }
    if (turnKind === "invalid_json") {
      return freeze({
        ...base,
        kind: "response_json_invalid",
        issue: issue || "response_json_invalid",
      });
    }
    return freeze({
      ...base,
      kind: "provider_tool_turn",
      turnKind: turnKind || "unknown",
    });
  }
  const channelsOutput = object(output.channels) ? output.channels : null;
  if (channelsOutput) {
    for (const channel of channels) {
      const value = channelsOutput[channel];
      if (object(value) && typeof value.text === "string" && value.text.trim()) {
        return freeze({
          ...base,
          kind: "channel_text",
          channel,
          text: value.text,
          recoveredFromTruncatedEnvelope: false,
        });
      }
    }
  }
  return freeze({ ...base, kind: "contract_missing_channel" });
}

export const COMPANION_PROVIDER_OUTPUT_CONTRACT_DESCRIPTOR = freeze({
  schemaVersion: `${COMPANION_PROVIDER_OUTPUT_CONTRACT_VERSION}.descriptor`,
  budgetVersion: COMPANION_PROVIDER_OUTPUT_BUDGET_V2,
  classifications: COMPANION_PROVIDER_OUTPUT_CLASSIFICATIONS,
  recoveryRule: "terminated_channel_string_literal_only",
  zeroAutomaticRetry: true,
  characterSpecific: false,
  trainingTruth: false,
});
