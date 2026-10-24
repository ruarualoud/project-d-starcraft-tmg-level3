// Concrete reporting bug: generated Host formation queries are absent from
// model query_requests; comparing those two empty arrays claimed equality.
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { compareRetainedFormationPerformanceInputsV1 } from
  './support/retained-formation-performance-input-v1.mjs';

const [oldPath, newPath, outputRoot] = process.argv.slice(2);
const oldDecision = JSON.parse(await readFile(oldPath, 'utf8'));
const newDecision = JSON.parse(await readFile(newPath, 'utf8'));
function wrongRequestList(decision) {
  return Object.values(decision.attempts).flatMap(attempt =>
    attempt.safeOutput?.query_requests?.requests || [])
    .filter(request => request.queryKind === 'space.solve_formation');
}
const expectedSame = isDeepStrictEqual(
  oldDecision.plannerResult.formationSearchRequest,
  newDecision.plannerResult.formationSearchRequest);
const wrongOld = wrongRequestList(oldDecision);
const wrongNew = wrongRequestList(newDecision);
const corrected = compareRetainedFormationPerformanceInputsV1(oldDecision, newDecision);
const reportedSame = corrected.sameRequest;
const result = { oldModelFormationRequestCount: wrongOld.length,
  newModelFormationRequestCount: wrongNew.length, expectedSame, reportedSame,
  legacyEmptyArrayComparison: isDeepStrictEqual(wrongOld, wrongNew),
  corrected, providerCalls: 0, roomWrites: 0 };
await writeFile(path.join(outputRoot, 'corrected-query-comparison.private.json'),
  JSON.stringify(result, null, 2), { mode: 0o600 });
console.log(JSON.stringify(result));
assert.equal(reportedSame, expectedSame,
  'EMPTY_MODEL_QUERY_ARRAYS_MUST_NOT_ESTABLISH_SAME_HOST_FORMATION_REQUEST');
assert.equal(corrected.reason, 'REQUEST_ARGUMENTS_DIFFER');
assert.equal(corrected.nonEmptyHostInputsPresent, true);
assert.equal(compareRetainedFormationPerformanceInputsV1({}, {}).sameRequest, null);
