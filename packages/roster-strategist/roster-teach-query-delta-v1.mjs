// Transport-only field edits. Native still decides geometry/Rules legality;
// this module never chooses coordinates, fixes a tactic, or executes a query.
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
const clone = value => structuredClone(value);
const fail = (code, detail = '') => { throw Object.assign(Error(`${code}:${detail}`), { code }); };
const escape = key => String(key).replaceAll('~', '~0').replaceAll('/', '~1');

export function supportsRosterTeachQueryDeltaV1(request, failure) {
  // Switching to an explicitly advertised replacement tool is query replanning,
  // not editing the old tool's semantic arguments (which may be empty).
  if (failure?.queryRepair?.replacementCapability) return false;
  const targets = failure?.queryRepair?.failureTargets || [];
  if (failure?.queryRepair?.requiredRequestKind
    && failure.queryRepair.requiredRequestKind !== request?.kind) return false;
  return Boolean(request?.toolRequest && failure?.queryRepair?.correctable === true
    && targets.length && targets.every(target => target.requestPointer?.startsWith('/toolRequest')
      && (target.nativeQueryRepair
        ? target.nativeQueryRepair.mayRepairSameChoice === true
        : boundAdapterFailure(request, target, failure))));
}

// The evidence adapter owns transport/packing errors too. Its exact failed
// request path is sufficient for a field edit; it is not a Native legality
// verdict. Reject stale/missing paths instead of letting another request's
// failure authorize edits. A Native denial above always takes precedence.
function boundAdapterFailure(request, target, failure) {
  if (!target.request || typeof target.request !== 'object') return false;
  let value = request;
  try {
    const path = segments(target.requestPointer);
    if (path[0] !== 'toolRequest') return false;
    for (const part of path) {
      if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) return false;
      value = value[part];
    }
    if (hash(value) === hash(target.request)) return true;
    // Old evidence resolved routing before recording the failure and omitted
    // only branchIdRef. Its full requestHash still binds the exact original.
    // Recover that metadata without altering the receipt or accepting another
    // branch. No semantic argument is normalized or inferred here.
    if (target.requestPointer === '/toolRequest' && Object.hasOwn(value, 'branchIdRef')
      && !Object.hasOwn(target.request, 'branchIdRef') && failure.requestHash === hash(request)) {
      const { branchIdRef: _routing, ...argumentsAtFailure } = value;
      return hash(argumentsAtFailure) === hash(target.request);
    }
    return false;
  } catch { return false; }
}

export function rosterTeachQueryDeltaBaseV1({ request, failure }) {
  if (!supportsRosterTeachQueryDeltaV1(request, failure)) fail('ROSTER_TEACH_QUERY_DELTA_UNAVAILABLE');
  const semanticRequest = clone(request), jsonArgumentPointers = [], argumentDecodeFailures = [];
  function decode(node, path = '') {
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      const pointer = `${path}/${escape(key)}`;
      if (key === 'argumentsJson' && typeof value === 'string') {
        let parsed;
        try { parsed = JSON.parse(value); } catch {
          argumentDecodeFailures.push({ pointer, code: 'ROSTER_TEACH_QUERY_DELTA_ARGUMENT_JSON' });
          continue;
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          argumentDecodeFailures.push({ pointer, code: 'ROSTER_TEACH_QUERY_DELTA_ARGUMENT_OBJECT' });
          continue;
        }
        node[key] = parsed;
        jsonArgumentPointers.push(pointer);
        continue; // Parsed tool payload is not another transport envelope.
      }
      decode(node[key], pointer);
    }
  }
  const allowedEditPrefixes = [...new Set(failure.queryRepair.failureTargets.map(target => target.requestPointer))];
  // Only failed subrequests are editable. Inactive broad-schema placeholders and
  // successful siblings must neither fail preparation nor change serialization.
  for (const prefix of allowedEditPrefixes.filter(p => !allowedEditPrefixes.some(q => q !== p && p.startsWith(q + '/')))) {
    const { parent, key } = parentAt(semanticRequest, prefix);
    decode(parent[key], prefix);
  }
  return { semanticRequest, jsonArgumentPointers, argumentDecodeFailures, allowedEditPrefixes,
    instruction: 'Edit only the indicated failed request fields. Valid argumentsJson is decoded here: address its child fields directly. Fields listed in argumentDecodeFailures remain original strings; replace that entire field with your corrected JSON string, never invent missing values in the Host. Use add for a missing object field, replace for an existing field, remove to delete it. A replace of a missing object leaf is recorded as add with exactly your supplied value; missing parents and array indexes are never invented. Preserve named attacker/target and the original question; a domain for a different target does not repair this query. Unchanged scenario and successful siblings are retained by the Host. These edits do not prove Rules legality.' };
}

function segments(pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/') || /~(?![01])/u.test(pointer)) {
    fail('ROSTER_TEACH_QUERY_DELTA_PATH', String(pointer));
  }
  const parts = pointer.slice(1).split('/').map(p => p.replaceAll('~1', '/').replaceAll('~0', '~'));
  if (parts.some(p => !p || ['__proto__', 'prototype', 'constructor'].includes(p))) {
    fail('ROSTER_TEACH_QUERY_DELTA_PATH', pointer);
  }
  return parts;
}

function parentAt(root, pointer) {
  const parts = segments(pointer), key = parts.pop();
  let parent = root;
  for (const part of parts) {
    if (!parent || typeof parent !== 'object' || !Object.hasOwn(parent, part)) {
      fail('ROSTER_TEACH_QUERY_DELTA_PATH_MISSING', pointer);
    }
    parent = parent[part];
  }
  if (!parent || typeof parent !== 'object') fail('ROSTER_TEACH_QUERY_DELTA_PATH_MISSING', pointer);
  return { parent, key };
}

export function applyRosterTeachQueryDeltaV1({ request, failure, reply, onNormalization }) {
  if (reply?.disposition !== 'retry' || reply.kind !== 'patch'
    || reply.toolRequestJson !== '' || !Array.isArray(reply.edits) || !reply.edits.length) {
    fail('ROSTER_TEACH_QUERY_DELTA_EDITS_REQUIRED');
  }
  const view = rosterTeachQueryDeltaBaseV1({ request, failure });
  const result = view.semanticRequest;
  const originalSemanticHash = hash(result);
  for (const [i, edit] of reply.edits.entries()) {
    segments(edit.path);
    if (!view.allowedEditPrefixes.some(prefix => edit.path.startsWith(prefix + '/')
      || (prefix !== '/toolRequest' && edit.path === prefix && edit.op === 'replace'))) {
      fail('ROSTER_TEACH_QUERY_DELTA_OUTSIDE_FAILURE', edit.path);
    }
    if (!['add', 'replace', 'remove'].includes(edit.op)) fail('ROSTER_TEACH_QUERY_DELTA_OPERATION', String(i));
    let value;
    if (edit.op === 'remove') {
      if (edit.valueJson !== '') fail('ROSTER_TEACH_QUERY_DELTA_REMOVE_VALUE', edit.path);
    } else {
      try { value = JSON.parse(edit.valueJson); } catch { fail('ROSTER_TEACH_QUERY_DELTA_VALUE_JSON', edit.path); }
    }
    const { parent, key } = parentAt(result, edit.path);
    if (Array.isArray(parent)) {
      const index = key === '-' && edit.op === 'add' ? parent.length
        : /^(?:0|[1-9][0-9]*)$/u.test(key) ? Number(key) : NaN;
      if (!Number.isSafeInteger(index) || index < 0
        || index >= parent.length + (edit.op === 'add' ? 1 : 0)) {
        fail('ROSTER_TEACH_QUERY_DELTA_ARRAY_INDEX', edit.path);
      }
      if (edit.op === 'add') parent.splice(index, 0, value);
      else if (edit.op === 'remove') parent.splice(index, 1);
      else parent[index] = value;
    } else {
      if (!Object.hasOwn(parent, key)) {
        if (edit.op === 'remove') fail('ROSTER_TEACH_QUERY_DELTA_PATH_MISSING', edit.path);
        // This is a typed field-edit adapter, not a raw JSON Patch endpoint.
        // The model already supplied the exact key/value. Normalize only this
        // unambiguous object-leaf operation; never synthesize ancestors/values,
        // loosen array semantics, or bypass downstream scope/Native checks.
        if (edit.op === 'replace') onNormalization?.({ version: 1,
          kind: 'missing_object_leaf_replace_as_add', from: 'replace', to: 'add',
          path: edit.path, modelValuePreserved: true, semanticFieldsInvented: false });
      }
      if (edit.op === 'remove') delete parent[key]; else parent[key] = value;
    }
  }
  // JSON replacement may be idempotent. Reject only an unchanged whole patch,
  // not one redundant sub-edit before another effective change. Native still
  // owns whether the materialized parameters form a legal action.
  if (hash(result) === originalSemanticHash) fail('ROSTER_TEACH_QUERY_DELTA_NO_CHANGE', 'whole_request');
  for (const pointer of [...view.jsonArgumentPointers].reverse()) {
    const { parent, key } = parentAt(result, pointer);
    if (!parent[key] || typeof parent[key] !== 'object' || Array.isArray(parent[key])) {
      fail('ROSTER_TEACH_QUERY_DELTA_ARGUMENT_OBJECT', pointer);
    }
    parent[key] = JSON.stringify(parent[key]);
  }
  return result;
}
