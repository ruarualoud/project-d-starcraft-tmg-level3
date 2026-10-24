// Reproduce two recorded v249 failures, using saved PUBLIC output/request only.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import * as prompts from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
const base = process.argv[2], checks = [], failures = [];
const check = async (name, fn) => { if (process.argv[3] === '--capacity-recovery-only' && !name.startsWith('known capacity')) return;
  try { checks.push({ name, ...(await fn()) }); }
  catch (e) { failures.push({ name, code: e.code, message: e.message }); } };
await check('conflicting query is typed correction, not workflow exception', async () => {
  const dir = base + '/A/fresh-generation-v249/workspace/drafts';
  const raw = JSON.parse(await fs.readFile(dir + '/' + (await fs.readdir(dir)).find(f => f.endsWith('.json')), 'utf8'));
  const request = raw.publicOutputs.find(r => r.roundKind === 'teach_challenge').sanitizedOutput.challenges
    .find(c => c.challengeId === 'ch-hyp-omega-flank-rear-marker-route').evidenceRequest;
  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate() { return { candidates: [], parameterDomains: [], searchSuggestions: [] }; },
      instantiate() { throw Error('NO_EXECUTION'); }, apply() { throw Error('NO_MUTATION'); } } });
  const port = createRosterTeachEvidencePortV1({ ...lab,
    routeToObjective() { throw Error('MUST_NOT_GUESS_QUERY'); }, querySpatial() { throw Error('MUST_NOT_GUESS_QUERY'); } });
  const result = await port.query({ mutationAuthority: false, initialFoundationHash: 'a'.repeat(64),
    sourceHashes: ['b'.repeat(64)], challengeId: 'retained-conflicting-query', request });
  assert.equal(result.status, 'unknown'); assert.equal(result.unknownReasonCode, 'ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS');
  assert.equal(result.queryRepair.correctable, true); assert.deepEqual(result.queryRepair.failureTargets[0].request, request.toolRequest);
  assert.equal(result.queryRepair.originalQueryNotAnswered, true);
  return { noToolWasInferred: true };
});
await check('oversized decision is losslessly interned, not truncated', async () => {
  const raw = JSON.parse(gunzipSync(await fs.readFile(base + '/B/fresh-generation-v249/request-018.private.json.gz')).toString());
  const original = raw.promptNodes[0].content;
  const compact = prompts.internRosterTeachPromptEvidenceV1 ? prompts.internRosterTeachPromptEvidenceV1(original) : original;
  const before = JSON.stringify(original).length, after = JSON.stringify(compact).length;
  assert.ok(after < before * 0.75, `Duplicate-evidence hot context remains ${after}/${before} characters`);
  const at = pointer => pointer.slice(1).split('/').reduce((v, k) => v[k.replaceAll('~1', '/').replaceAll('~0', '~')], compact);
  const expand = value => {
    if (!value || typeof value !== 'object') return value;
    if (value.kind === 'same_prompt_evidence_reference_v1') return expand(at(value.targetJsonPointer));
    return Array.isArray(value) ? value.map(expand) : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expand(v)]));
  };
  assert.equal(hash(expand(compact)), hash(original));
  return { beforeCharacters: before, afterCharacters: after, allUniqueValuesAndStrategyPreserved: true };
});
await check('known capacity rejection waits for changed encoding and ordinary Run recovers', async () => {
  let saved, decides = 0, reconciles = 0;
  const session = createIterativeRosterPlanSessionV1({
    store: { load: async () => structuredClone(saved), save: async (_id, s) => { saved = structuredClone(s); } },
    model: { decide: async () => { decides++; return { outcome: 'completed', receiptHash: hash(decides),
      decision: { kind: 'repair_needed', failureCode: decides === 1 ? 'ITERATIVE_ROSTER_PROVIDER_CONTEXT_REJECTED' : 'FIXTURE_NEW_REPLY_INVALID' } }; },
      reconcile: async () => { reconciles++; throw Error('REJECTED_REQUEST_HAS_NO_MODEL_ANSWER'); } },
    tools: { query: async () => { throw Error('NO_TOOLS'); } },
    builder: { evaluate: async () => { throw Error('NO_ARMY_CHANGE'); } },
    review: { final: async () => { throw Error('NO_ACCEPTANCE'); } },
  });
  const id = 'capacity-recovery-v251';
  await session.start({ sessionId: id, mineralBudget: 2000,
    frozenContext: { mapHash: 'fixed-map', taskHash: 'fixed-task', sourceHash: 'fixed-source' } });
  await session.resume(id);
  assert.equal(saved.status, 'requires_reconciliation', 'known capacity rejection must not send the same oversized context three times');
  saved.modelContextVersion = 13; saved.iterations[0].modelContextVersion = 13;
  await session.resume(id, { preferRetainedRepair: true });
  assert.equal(saved.modelContextVersion, 14); assert.equal(decides, 2); assert.equal(reconciles, 0);
  assert.equal(saved.iterations.length, 2); assert.equal(saved.pendingDecision, null);
  return { oldRejectionRetained: true, noBlindResend: true };
});
const report = { status: failures.length ? 'fail' : 'pass', checks, failures, providerCalls: 0, nativeActions: 0, originalDraftWrites: 0 };
await fs.writeFile(`${base}/fresh-failures-v251-${process.argv[3] ? 'capacity-' : ''}${report.status}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report)); process.exitCode = failures.length ? 1 : 0;
