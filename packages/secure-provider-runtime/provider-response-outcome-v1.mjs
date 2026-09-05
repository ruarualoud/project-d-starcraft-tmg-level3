import { hashStarcraftTmgContract as hash } from "../authoritative-engine/referee-crypto-v1.mjs";

const KEYS = ["requestId", "profileHash", "requestedModel", "reportedModel", "finishReason",
  "usage", "usageKnown", "receivedAt", "contentFormat", "syntaxIssue", "contentBytes", "structure", "parseErrorOffset", "hash"];
const fence = String.fromCharCode(96).repeat(3);
const wrappedJson = new RegExp("^\\s*" + fence + "(?:json)?\\s*\\n?([\\s\\S]*?)\\s*" + fence + "\\s*$", "i");
export function normalizeSingleJsonFenceV1(text) {
  if (typeof text !== "string") return { text, changed: false };
  const match = wrappedJson.exec(text);
  return { text: match ? match[1] : text, changed: !!match };
}
// The observed model defect is a missing final OUTER object delimiter.
// Never repair inner commas, strings, numbers, keys or missing array members.
// The entire original document is preserved as a byte-for-byte prefix.
export function normalizeProviderJsonDocumentV1(value) {
  const fenced = normalizeSingleJsonFenceV1(value);
  const text = fenced.text;
  const base = { text, kind: fenced.changed ? "single_json_fence" : "none" };
  if (typeof text !== "string") return base;
  try { JSON.parse(text); return base; } catch {}
  if (!text.trimStart().startsWith("{") || !text.trimEnd().endsWith("}")) return base;
  const stack = []; let quoted = false, escaped = false;
  for (const char of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{" || char === "[") stack.push(char);
    else if (char === "}" || char === "]") {
      if (stack.pop() !== (char === "}" ? "{" : "[")) return base;
    }
  }
  if (quoted || stack.length !== 1 || stack[0] !== "{") return base;
  try {
    JSON.parse(text + "}");
    return { text: text + "}", kind: fenced.changed ? "single_json_fence_and_outer_object_close" : "outer_object_close" };
  } catch { return base; }
}
function jsonStructure(text) {
  let quoted = false, escaped = false, result = "";
  for (const char of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') { quoted = false; result += '"'; }
    } else if (char === '"') { quoted = true; result += char; }
    else if ('{}[],:'.includes(char)) result += char;
    else if (!/\s/.test(char) && !result.endsWith("_")) result += "_";
  }
  return result.slice(0, 4096);
}
export function captureProviderResponseOutcomeV1(payload, request, binding, now) {
  const raw = payload?.usage;
  const input = raw?.prompt_tokens ?? raw?.input_tokens;
  const output = raw?.completion_tokens ?? raw?.output_tokens;
  const known = [input, output].every((n) => Number.isSafeInteger(n) && n >= 0);
  const hit = raw?.prompt_cache_hit_tokens, miss = raw?.prompt_cache_miss_tokens;
  const cache = [hit, miss].every((n) => Number.isSafeInteger(n) && n >= 0) && hit + miss === input;
  const finish = payload?.choices?.[0]?.finish_reason;
  const content = payload?.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : "";
  const contentFormat = !text ? "empty_or_structured" : wrappedJson.test(text) ? "single_json_fence"
    : text.trimStart().startsWith("{") ? "object_prefix" : "other";
  let syntaxIssue = "none", parseErrorOffset = null;
  try { if (text) JSON.parse(normalizeSingleJsonFenceV1(text).text); }
  catch (error) {
    parseErrorOffset = Number(/position (\d+)/.exec(error.message)?.[1] ?? -1);
    if (parseErrorOffset < 0) parseErrorOffset = null;
    syntaxIssue = /property name|double-quoted/i.test(error.message) ? "property_quotes"
      : /after property value|after array element/i.test(error.message) ? "separator"
        : /end of JSON|unterminated/i.test(error.message) ? "incomplete"
          : "invalid_json";
  }
  const body = { requestId: request.requestId, profileHash: binding.providerProfileRef.hash,
    requestedModel: binding.model,
    reportedModel: /^[A-Za-z0-9._:/-]{1,240}$/.test(payload?.model || "") ? payload.model : null,
    finishReason: ["stop", "length", "tool_calls", "content_filter"].includes(finish) ? finish : "unknown",
    usageKnown: known, usage: known ? { inputUnits: input, outputUnits: output, totalUnits: input + output,
      ...(cache ? { inputCacheHitUnits: hit, inputCacheMissUnits: miss } : {}) } : null,
    receivedAt: new Date(now()).toISOString(), contentFormat, syntaxIssue, contentBytes: Buffer.byteLength(text),
    structure: syntaxIssue === "none" ? "" : jsonStructure(text), parseErrorOffset };
  return Object.freeze({ ...body, hash: hash(body) });
}
export function assertProviderResponseOutcomeV1(value) {
  const invalid = () => { throw new TypeError("Provider response outcome invalid"); };
  if (!value || Object.keys(value).length !== KEYS.length || Object.keys(value).some((key) => !KEYS.includes(key))) invalid();
  const { hash: identity, ...body } = value;
  if (identity !== hash(body) || !/^[A-Za-z0-9._:-]{8,200}$/.test(value.requestId)
    || !/^[a-f0-9]{64}$/.test(value.profileHash)
    || !/^[A-Za-z0-9._:/-]{1,240}$/.test(value.requestedModel)
    || value.reportedModel !== null && !/^[A-Za-z0-9._:/-]{1,240}$/.test(value.reportedModel)
    || !["stop", "length", "tool_calls", "content_filter", "unknown"].includes(value.finishReason)
    || !Number.isFinite(Date.parse(value.receivedAt)) || typeof value.usageKnown !== "boolean"
    || !["empty_or_structured", "single_json_fence", "object_prefix", "other"].includes(value.contentFormat)
    || !["none", "property_quotes", "separator", "incomplete", "invalid_json"].includes(value.syntaxIssue)
    || !Number.isSafeInteger(value.contentBytes) || value.contentBytes < 0 || value.contentBytes > 16 * 1024 * 1024
    || typeof value.structure !== "string" || value.structure.length > 4096
    || [...value.structure].some((c) => !'{}[],:_"'.includes(c))
    || value.parseErrorOffset !== null && (!Number.isSafeInteger(value.parseErrorOffset) || value.parseErrorOffset < 0 || value.parseErrorOffset > value.contentBytes)) invalid();
  const u = value.usage;
  if (!value.usageKnown) { if (u !== null) invalid(); }
  else if (!u || Object.keys(u).some((key) => !["inputUnits", "outputUnits", "totalUnits", "inputCacheHitUnits", "inputCacheMissUnits"].includes(key))
    || ![u.inputUnits, u.outputUnits, u.totalUnits].every((n) => Number.isSafeInteger(n) && n >= 0)
    || u.totalUnits !== u.inputUnits + u.outputUnits
    || (u.inputCacheHitUnits !== undefined || u.inputCacheMissUnits !== undefined)
      && (![u.inputCacheHitUnits, u.inputCacheMissUnits].every((n) => Number.isSafeInteger(n) && n >= 0)
        || u.inputCacheHitUnits + u.inputCacheMissUnits !== u.inputUnits)) invalid();
  return true;
}
