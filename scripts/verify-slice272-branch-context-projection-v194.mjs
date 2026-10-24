// Concrete reproduction: A created a Movement scene but the next model request
// received only an archive field-name list, not its 31 Native action domains.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { projectRosterTeachRolePromptV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base, output] = process.argv.slice(2);
const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'));
const report = { providerCalls: 0, nativeQueryExecutions: 0, sourceDraftWrites: 0 };
try {
  const scene = draft.teachFramework.state.investigation.evidence.find(e =>
    e.challengeId === 'q2-scenario-anchors-and-marker-relationships');
  assert(scene?.branchQueryContext?.actionSpace.parameterDomains.length > 0);
  assert.equal(scene.branchQueryContext.baseStateHash, scene.sourceReceipt.branchStateHash);
  const original = JSON.stringify(scene);
  // Same production projection; include the duplicate to verify that in-prompt
  // interning still resolves to the complete current branch, not an archive.
  const projected = projectRosterTeachRolePromptV1('teach_framework_investigate', [
    { kind: 'questions_and_results', evidence: [scene, scene] },
  ]);
  function resolve(value) {
    if (!value || typeof value !== 'object') return value;
    if (value.kind === 'same_prompt_evidence_reference_v1') {
      const target = value.targetJsonPointer.split('/').slice(1).reduce((node, key) =>
        node[key.replaceAll('~1', '/').replaceAll('~0', '~')], projected);
      return resolve(target);
    }
    return Array.isArray(value) ? value.map(resolve)
      : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v)]));
  }
  for (const entry of projected[0].evidence) {
    const result = resolve(entry);
    assert(result.branchQueryContext, 'Current scenario continuation context was hidden in an archive');
    assert.equal(result.scenarioContinuation.branchIdRef, scene.challengeId);
    assert.equal(result.branchQueryContext.baseStateHash, scene.sourceReceipt.branchStateHash);
    assert.equal(result.branchQueryContext.phase, 'movement');
    assert.deepEqual(result.branchQueryContext.actionSpace, scene.branchQueryContext.actionSpace);
    assert.deepEqual(result.branchQueryContext.cardResources, scene.branchQueryContext.cardResources);
    assert.deepEqual(result.branchQueryContext.availableUnits, scene.branchQueryContext.availableUnits);
  }
  assert.equal(JSON.stringify(scene), original, 'Projection must not mutate the stored receipt');
  report.sceneId = scene.challengeId;
  report.domainCount = scene.branchQueryContext.actionSpace.parameterDomains.length;
  report.projectedChars = JSON.stringify(projected).length;
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
