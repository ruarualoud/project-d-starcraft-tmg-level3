// Reproduce B's legal-1020 selection receiving a snapshot freeze, missing
// current tool preconditions/search scope, and discarded native query repair.
// No Provider, room, credential store, or old-state writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createRosterPlanningSecureDeliberationFactoryV1 } from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V2 as profile } from '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';
import { createIterativeRosterFlashModelPortV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import { createIterativeRosterToolPortV1 } from '../packages/roster-strategist/iterative-roster-tool-port-v1.mjs';
import { searchRosterExactBudgetRepairsV1 } from '../packages/roster-strategist/roster-exact-budget-repair-search-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';

const base = process.argv[2], dir = base + '/B/fresh-generation-v240';
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const sd = dir + '/workspace/iterative-draft/sessions';
const original = (await read(sd + '/' + (await fs.readdir(sd))[0])).value;
const state = structuredClone(original);
state.modelContextVersion = 11; state.pendingDecision = null; state.iterations = [];
const old = JSON.parse(gunzipSync(await fs.readFile(dir + '/request-008.private.json.gz'))).promptNodes[0].content;
const rd = dir + '/workspace/iterative-draft/replies';
const saved = new Map();
for (const name of await fs.readdir(rd)) {
  const row = await read(rd + '/' + name); saved.set(row.id, row.value);
}
const sample = structuredClone(saved.get(original.iterations.at(-1).requestKey).output);
sample.queries = [{ ...sample.queries[0], kind: 'budget_branches',
  candidateHash: state.currentCandidate.candidateHash, startOffset: 0,
  maximumEvaluations: 4, maximumMutationDepth: 3 }];
sample.question = 'Compare legal alterations to this under-budget army.';
const failures = [], passed = [];
const check = async (name, fn) => { try { await fn(); passed.push(name); }
  catch (e) { failures.push({ name, message: e.message }); } };
const cfg = await read(base + '/common-v79-plan-recovery-config.private.json');
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
const armyBuilderPort = createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) });
const mapEvidencePort = { summarizeMap() {}, evaluateRosterRoute() {} };
const repair = { sourceContract: 'fixture-native-input', correctable: true,
  originalQueryNotAnswered: true, failureTargets: [{ requestPointer: '/toolRequest/spec/phase',
    correctionInstruction: 'Use the native phase enumeration.' }] };
const tools = createIterativeRosterToolPortV1({ armyBuilderPort, mapEvidencePort,
  createSceneLaboratory: () => ({ runScenarioBranch: () => {
    throw Object.assign(new Error('PREGAME_LAB_PHASE_INVALID'), { queryRepair: repair });
  } }) });
const captures = [], replies = new Map();
const secure = await createRosterPlanningSecureDeliberationFactoryV1({ profile,
  readCredential: async () => ({ credentialBytes: Buffer.from('local-fixture-not-a-key') }),
  createWorker: () => ({ attachCredential: async () => ({ ok: true, workerRef: 'fixture' }),
    close: async () => {}, send: async ({ body }) => {
      captures.push(body);
      return { status: 200, payload: { status: 'completed', model: profile.model,
        usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        output: [{ type: 'message', role: 'assistant', status: 'completed',
          content: [{ type: 'output_text', text: JSON.stringify(sample) }] }] } };
    } }) });
try {
  const port = createIterativeRosterFlashModelPortV1({ deliberationFactory: secure.factory,
    replyStore: { loadRetainedReply: async k => replies.get(k), retainReply: async (k, v) => replies.set(k, v) },
    skillGuidance: old.skillGuidance, missionEvidence: old.missionEvidence,
    queryCapabilities: tools.describeCapabilities });
  const decision = await port.decide({ requestKey: 'v246-new-selection', state });
  const body = captures.at(-1), request = JSON.parse(body.input);
  await check('selecting phase does not freeze the army', () => {
    assert.doesNotMatch(body.instructions, /Keep the supplied candidate unchanged/);
    assert.match(body.instructions, /army and Plan together/);
    assert.equal(request.promptNodes[0].content.decisionState.phaseAuthority.army, 'editable');
  });
  await check('current legal candidate enables the actual budget tool', () => {
    const caps = request.responseContract.queryCapabilities;
    assert.equal(caps.queries.budget_branches.availability, 'available');
    assert.equal(caps.queries.budget_branches.candidateHash, state.currentCandidate.candidateHash);
    assert.equal(decision.decision.queries[0].kind, 'budget_branches');
    const empty = tools.describeCapabilities({ ...state, currentCandidate: null });
    assert.equal(empty.queries.budget_branches.availability, 'prerequisite_missing');
    assert(!empty.availableQueryKinds.includes('budget_branches'));
  });
  await check('uninstalled capability is not falsely advertised', async () => {
    const missing = createIterativeRosterToolPortV1({ armyBuilderPort, mapEvidencePort });
    assert.equal(missing.describeCapabilities(state).queries.scene_query.availability, 'unsupported');
    const receipt = await missing.query({ kind: 'scene_context', candidateHash: state.currentCandidate.candidateHash }, state);
    assert.equal(receipt.capabilityOutcome.category, 'unsupported');
    assert.equal(receipt.capabilityOutcome.questionAnswered, false);
  });
  await check('stale candidate uses the same admission condition as advertised', async () => {
    const receipt = await tools.query({ kind: 'budget_branches', candidateHash: 'stale' }, state);
    assert.equal(receipt.capabilityOutcome.category, 'prerequisite_missing');
    assert.equal(receipt.capabilityOutcome.code, 'CURRENT_CANDIDATE_REQUIRED');
  });
  await check('native repair details survive the adapter', async () => {
    const receipt = await tools.query({ kind: 'scenario_branch', candidateHash: state.currentCandidate.candidateHash,
      argumentsJson: '{}' }, state);
    assert.deepEqual(receipt.queryRepair, repair);
    assert.equal(receipt.capabilityOutcome.category, 'invalid_arguments');
    assert.equal(receipt.capabilityOutcome.questionAnswered, false);
  });
  await check('bounded add-only search cannot imply global impossibility', async () => {
    const receipt = searchRosterExactBudgetRepairsV1({ armyBuilderPort,
      sourceCandidateInput: state.currentCandidate.input, maximumMatches: 4,
      maximumBuilderEvaluations: 12, maximumMenuNodes: 250000 });
    assert.equal(receipt.searchScope.existingSelections, 'fixed');
    assert(receipt.searchScope.excludedOperations.includes('replace_tactical_card'));
    assert.equal(receipt.searchScope.bounds.maximumAddedUnits, 6);
    assert.equal(receipt.exactBudgetImpossibilityClaimed, false);
  });
  await check('old paid selection context and instruction remain unchanged', async () => {
    const legacy = { ...state, modelContextVersion: 10 };
    await port.decide({ requestKey: 'v246-legacy-projection', state: legacy });
    const prior = captures.at(-1), projected = JSON.parse(prior.input);
    assert.match(prior.instructions, /Keep the supplied candidate unchanged/);
    assert.equal(projected.promptNodes[0].content.decisionState.phaseAuthority, undefined);
    assert.equal(projected.responseContract.queryCapabilities, undefined);
  });
} finally { await secure.close(); }
const result = { status: failures.length ? 'fail' : 'pass', passed, failures,
  providerCalls: 0, originalRevision: original.revision, originalMineralSpent: original.currentCandidate.mineralSpent };
// Retain the result even if the interactive observer disconnects.
await fs.writeFile(base + `/phase-capabilities-v246-${result.status}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
if (failures.length) process.exitCode = 1;
