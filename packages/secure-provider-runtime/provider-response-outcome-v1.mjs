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
function normalizeLegacyDocument(value) {
  const fenced = normalizeSingleJsonFenceV1(value);
  const text = fenced.text;
  const base = { text, kind: fenced.changed ? "single_json_fence" : "none" };
  if (typeof text !== "string") return base;
  try { JSON.parse(text); return base; } catch {}
  if (!text.trimStart().startsWith("{")) return base;
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
function normalizeSingleUnescapedQuote(text) {
  // A common JSON-mode defect is one unescaped quote inside a string (for
  // example an inch mark written as 6"). Insert no content: try one escape
  // character near the parser's exact failure offset and accept only when a
  // single candidate makes the entire document one valid object. Ambiguous,
  // multi-error and long documents remain failures.
  let parseOffset = null;
  try { JSON.parse(text); return null; }
  catch (error) { parseOffset = Number(/position (\d+)/u.exec(error.message)?.[1] ?? -1); }
  if (!Number.isSafeInteger(parseOffset) || parseOffset < 0 || text.length > 64 * 1024) return null;
  const isEscapedQuote = index => {
    let slashes = 0;
    for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) slashes++;
    return slashes % 2 === 1;
  };
  const candidates = [];
  for (let i = Math.max(1, parseOffset - 96); i <= Math.min(text.length - 2, parseOffset + 16); i++) {
    if (text[i] !== '"' || isEscapedQuote(i)) continue;
    let following = i + 1;
    while (/\s/u.test(text[following] || '') && following < text.length) following++;
    // A real JSON string/key delimiter is followed by structure. Only quotes
    // visibly embedded in scalar text are candidates for escaping.
    if (!text[following] || ',]}:'.includes(text[following])) continue;
    const candidate = text.slice(0, i) + '\\' + text.slice(i);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) candidates.push({ text: candidate, offset: i });
    } catch {}
  }
  if (candidates.length !== 1) return null;
  const candidate = candidates[0];
  return { text: candidate.text, kind: 'single_unescaped_quote_v1', evidence: {
    schemaVersion: 'provider_json_single_escape_recovery_v1', originalTextHash: hash(text),
    normalizedTextHash: hash(candidate.text), insertedEscapeUtf16Offset: candidate.offset,
    parseErrorUtf16Offset: parseOffset,
  } };
}
function recoverSingleMissingObjectCloseBeforeArray(text) {
  const stack = [];
  let quoted = false;
  let escaped = false;
  let insertionOffset = null;
  for (let offset = 0; offset < text.length; offset += 1) {
    const char = text[offset];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === '{' || char === '[') { stack.push(char); continue; }
    if (char !== '}' && char !== ']') continue;
    const expected = char === '}' ? '{' : '[';
    if (stack.at(-1) === expected) { stack.pop(); continue; }
    if (char !== ']' || insertionOffset !== null
      || stack.at(-1) !== '{' || stack.at(-2) !== '[') return null;
    insertionOffset = offset;
    stack.pop();
    stack.pop();
  }
  if (quoted || stack.length || insertionOffset === null) return null;
  const candidate = text.slice(0, insertionOffset) + '}'
    + text.slice(insertionOffset);
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
  } catch { return null; }
  return { text: candidate,
    kind: 'single_missing_object_close_before_array_v1',
    evidence: {
      schemaVersion: 'provider_json_single_delimiter_recovery_v1',
      originalTextHash: hash(text), normalizedTextHash: hash(candidate),
      insertedDelimiter: '}', insertedUtf16Offset: insertionOffset,
    } };
}
// Grammar-only recovery for observed, completed JSON defects. Never infer
// fields or alter visible scalar content. One missing object close may be
// inserted only at a unique array boundary and only when the entire result
// then parses as one complete object.
function recoverSingleUnmatchedClosingDelimiter(text) {
  let offset;
  try { JSON.parse(text); return null; } catch (error) {
    offset = Number(/position (\d+)/u.exec(String(error.message))?.[1] ?? -1);
  }
  if (!Number.isSafeInteger(offset) || offset < 0
    || ![']', '}'].includes(text[offset])) return null;
  const stack = []; let quoted = false, escaped = false;
  for (let index = 0; index < offset; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{' || char === '[') stack.push(char);
    else if (char === '}' || char === ']') {
      if (stack.pop() !== (char === '}' ? '{' : '[')) return null;
    }
  }
  // Only remove a delimiter with no matching container at the parser's
  // exact error boundary. Scalars, keys and every array member stay intact.
  if (quoted || stack.at(-1) === (text[offset] === '}' ? '{' : '[')) {
    return null;
  }
  const candidate = text.slice(0, offset) + text.slice(offset + 1);
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
  } catch { return null; }
  return { text: candidate, kind: 'single_unmatched_closing_delimiter_v1',
    evidence: {
      schemaVersion: 'provider_json_single_delimiter_removal_v1',
      originalTextHash: hash(text), normalizedTextHash: hash(candidate),
      removedDelimiter: text[offset], removedUtf16Offset: offset,
      scalarContentUnchanged: true,
    } };
}
function recoverSingleMissingContainerClose(text) {
  let offset;
  try { JSON.parse(text); return null; } catch(error) {
    offset=Number(/position (\d+)/u.exec(String(error.message))?.[1]??-1);
  }
  if(!Number.isSafeInteger(offset)||offset<0)return null;
  // Local grammar repair only. Search outside strings near the parser's
  // failure, insert ONE container close, and require one distinct parse tree.
  // Nothing is deleted or inferred; schema/Rules validation still follows.
  const start=Math.max(0,offset-160),end=Math.min(text.length,offset+16),candidates=new Map();
  let quoted=false,escaped=false;
  for(let i=0;i<=end;i++){
    if(i>=start&&!quoted&&[',','}',']'].includes(text[i]))for(const delimiter of [']','}']){
      const candidate=text.slice(0,i)+delimiter+text.slice(i);
      try{
        const parsed=JSON.parse(candidate);
        if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))
          candidates.set(JSON.stringify(parsed),{text:candidate,offset:i,delimiter});
      }catch{}
    }
    const char=text[i];
    if(quoted){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')quoted=false;}
    else if(char==='"')quoted=true;
  }
  if(candidates.size!==1)return null;
  const recovered=candidates.values().next().value;
  return {text:recovered.text,kind:'single_missing_container_close_v1',evidence:{
    schemaVersion:'provider_json_single_missing_container_close_v1',originalTextHash:hash(text),
    normalizedTextHash:hash(recovered.text),insertedDelimiter:recovered.delimiter,
    insertedUtf16Offset:recovered.offset,parseErrorUtf16Offset:offset,
    searchStartUtf16Offset:start,searchEndUtf16Offset:end,scalarContentUnchanged:true}};
}
export function normalizeProviderJsonDocumentV1(value) {
  const legacy = normalizeLegacyDocument(value);
  try { JSON.parse(legacy.text); return legacy; } catch {}
  const text = normalizeSingleJsonFenceV1(value).text;
  if (typeof text !== 'string' || !text.trimStart().startsWith('{') || !text.trimEnd().endsWith('}')) return legacy;
  const containerCloseRecovered=recoverSingleMissingContainerClose(text);
  if(containerCloseRecovered)return containerCloseRecovered;
  const missingCloseRecovered = recoverSingleMissingObjectCloseBeforeArray(text);
  if (missingCloseRecovered) return missingCloseRecovered;
  const unmatchedCloseRecovered = recoverSingleUnmatchedClosingDelimiter(text);
  if (unmatchedCloseRecovered) return unmatchedCloseRecovered;
  let trailingOffset = null;
  try { JSON.parse(text); }
  catch (error) {
    trailingOffset = Number(
      /Unexpected non-whitespace character after JSON at position (\d+)/u
        .exec(String(error?.message || ''))?.[1] ?? -1);
  }
  if (Number.isSafeInteger(trailingOffset) && trailingOffset > 0) {
    const prefix = text.slice(0, trailingOffset);
    const suffix = text.slice(trailingOffset).trim();
    try {
      const parsed = JSON.parse(prefix);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        && /^[}\]]+$/.test(suffix)) {
        return { text: prefix, kind: 'redundant_trailing_container_closers_v2',
          evidence: {
            schemaVersion: 'provider_json_trailing_delimiter_recovery_v2',
            originalTextHash: hash(text), normalizedTextHash: hash(prefix),
            removedUtf16Offset: trailingOffset,
            removedClosingDelimiterCount: suffix.length,
          } };
      }
    } catch {}
    // A completed response can close the root immediately before a later
    // top-level sibling, then emit one or more extra object delimiters. Only
    // remove a contiguous delimiter suffix at the parser's exact boundary,
    // and accept it only when one unique removal makes the whole document a
    // single object. Never infer fields or alter scalar content.
    let closeRunStart = trailingOffset;
    while (closeRunStart > 0 && text[closeRunStart - 1] === '}') {
      closeRunStart -= 1;
    }
    let closeRunEnd = trailingOffset;
    while (closeRunEnd < text.length && text[closeRunEnd] === '}') {
      closeRunEnd += 1;
    }
    const recoveries = [];
    const maximumRemoved = Math.min(8, closeRunEnd - closeRunStart);
    for (let removedCount = 1; removedCount <= maximumRemoved;
      removedCount += 1) {
      const removedStart = closeRunEnd - removedCount;
      const candidate = text.slice(0, removedStart) + text.slice(closeRunEnd);
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          recoveries.push({ candidate, removedStart, removedCount });
        }
      } catch {}
    }
    if (recoveries.length === 1) {
      const recovered = recoveries[0];
      return { text: recovered.candidate,
        kind: 'redundant_pre_sibling_object_closers_v1', evidence: {
          schemaVersion: 'provider_json_pre_sibling_delimiter_recovery_v1',
          originalTextHash: hash(text),
          normalizedTextHash: hash(recovered.candidate),
          removedUtf16Offset: recovered.removedStart,
          removedClosingDelimiterCount: recovered.removedCount,
          parseErrorUtf16Offset: trailingOffset,
        } };
    }
  }
  const quoteRecovered = normalizeSingleUnescapedQuote(text);
  if (quoteRecovered) return quoteRecovered;
  const stack = [], removed = []; let quoted = false, escaped = false, previous = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') {
      let next = i + 1;
      while (/\s/.test(text[next] || '') && next < text.length) next++;
      if (c === '}' && stack.length === 1 && stack[0] === '{'
        && text[next] === ',' && removed.length < 8) {
        removed.push(i); continue;
      }
      if (c === '}' && stack.length === 0 && removed.length > 0
        && !text.slice(next).trim() && removed.length < 8) {
        removed.push(i); continue;
      }
      if (c === '}' && stack.at(-1) === '[' && previous === '}') {
        if (![',', ']'].includes(text[next]) || removed.length >= 8) return legacy;
        removed.push(i); continue;
      }
      if (stack.pop() !== (c === '}' ? '{' : '[')) return legacy;
    }
    if (!/\s/.test(c)) previous = c;
  }
  if (quoted || !removed.length || stack.length && !(stack.length === 1 && stack[0] === '{')) return legacy;
  let start = 0; const pieces = [];
  for (const offset of removed) { pieces.push(text.slice(start, offset)); start = offset + 1; }
  const filtered = pieces.join('') + text.slice(start);
  const normalized = normalizeLegacyDocument(filtered).text;
  try {
    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return legacy;
    return { text: normalized, kind: 'redundant_array_object_closers_v1', evidence: {
      schemaVersion: 'provider_json_delimiter_recovery_v1',
      originalTextHash: hash(text), normalizedTextHash: hash(normalized),
      removedUtf16Offsets: removed, appendedOuterObjectClose: normalized !== filtered,
    } };
  } catch { return legacy; }
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
