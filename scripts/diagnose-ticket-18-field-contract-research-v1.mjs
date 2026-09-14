// Read-only research replay. No Provider, DSH, Keychain or production writes.
// In-memory counterfactuals below are NOT authorized recovery/promotion paths.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6 as contractRef } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { createFactionReviewSchemaRepairContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { materializeFactionSlotReviewV1 } from '../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs';

const args = process.argv.slice(2);
assert(args.length === 0 || args.length === 1 && args[0] === '--require-consumable');
const run = 'faction-v1-5fdab77171f213a6e7c9';
const ids = ['structured-2a9e1746184bbd7392e41f800c4325cd595a4cb79299809a',
  'structured-20d631c3ce82ca5ef16385820507886c67d85d446ab8c9c1'];
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
try {
  const snapshot = () => hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all());
  const before = snapshot();
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n,
    0, 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  const decode = raw => verifySeal(JSON.parse(raw)).value;
  const artifact = id => verifySeal(decode(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(run, id).artifact));
  const candidates = ids.map(id => artifact(id + '.rejected-candidate'));
  const attempts = ids.map(id => db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(run, id));
  const issues = candidates.map(candidate => validate(contract.providerSchema, candidate.providerValue));
  assert.deepEqual(issues[0].issues, [{ path: '$.coverage', code: 'required_field_missing', required: true }]);
  assert.deepEqual(issues[1].issues, [{ path: '$.coverage[0].recommendationSlots_note',
    code: 'additional_property_forbidden', additionalProperties: false }]);
  for (let i = 0; i < candidates.length; i++) {
    assert.equal(candidates[i].invocationHash.slice(0, 48), ids[i].slice('structured-'.length));
    assert.equal(candidates[i].outputContractRef.hash, contractRef.hash);
    assert.equal(candidates[i].validation.valueHash, hash(candidates[i].providerValue));
    assert.deepEqual(candidates[i].validation.issues, issues[i].issues);
    assert.equal(attempts[i].code, 'STRUCTURED_PROVIDER_SCHEMA_INVALID');
    assert.equal(attempts[i].state, 'failed');
  }
  const input = verifySeal(JSON.parse(await readFile('build/ticket-18-faction-production-v1/' + run + '/zerg_swarm-input.json', 'utf8')));
  const draft = artifact('faction.zerg_swarm.unit_roles.2.known-rule-correction').draft;
  const section = createFactionWritingPlanV1(input).sections.find(row => row.id === 'faction.zerg_swarm.unit_roles.2');
  const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(row => row.first === 0);
  const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
  const request = {
    packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding }),
    roleId: candidates[0].roleRef.id + '.source-evidence-v1.3cd990702ff2ba8b4acc',
    workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
      coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } },
  };
  const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
    idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
  const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
  const repair = createFactionReviewSchemaRepairContextCapsuleV1({ capsule: prepared.capsule,
    rejectedCandidate: candidates[0], roleRef: candidates[1].roleRef });
  assert.equal(prepared.capsule.hash, candidates[0].contextManifestRef.hash);
  assert.equal(repair.hash, candidates[1].contextManifestRef.hash);
  assert.equal(hash(candidates[0].providerValue.verdicts), hash(candidates[1].providerValue.verdicts));
  const mapping = { ...prepared.mapping, capsule: prepared.capsule, reviewReasonMaximum: 16384, reviewSourceMaximum: 128 };
  const consumption = value => {
    try { materializeFactionSlotReviewV1({ ...mapping, providerOutput: value }); return { ok: true }; }
    catch (error) { return { ok: false, code: error.code || error.name }; }
  };
  const originalConsumption = candidates.map(candidate => consumption(candidate.providerValue));
  assert(originalConsumption.every(result => !result.ok));

  // Minimal schema-only reproductions, independent of game wording.
  const missingSchema = { type: 'object', additionalProperties: false,
    properties: { coverage: { type: 'array', items: { type: 'boolean' }, minItems: 0, maxItems: 1 } }, required: ['coverage'] };
  assert.equal(validate(missingSchema, {}).ok, false);
  assert.equal(validate(missingSchema, { coverage: [] }).ok, true);
  const extraSchema = { type: 'object', properties: { value: { type: 'boolean' } },
    required: ['value'], additionalProperties: false };
  assert.equal(validate(extraSchema, { value: false, recommendationSlots_note: null }).ok, false);
  assert.equal(validate(extraSchema, { value: false }).ok, true);

  // Change one variable at a time, retain original artifacts/paid failures.
  const emptyCoverage = { ...structuredClone(candidates[0].providerValue), coverage: [] };
  assert.equal(validate(contract.providerSchema, emptyCoverage).ok, true);
  const emptyConsumption = consumption(emptyCoverage);
  assert.equal(emptyConsumption.ok, false, 'Empty coverage must not satisfy two real source obligations');
  const noteRemoved = structuredClone(candidates[1].providerValue);
  assert.equal(noteRemoved.coverage[0].recommendationSlots_note, null);
  delete noteRemoved.coverage[0].recommendationSlots_note;
  assert.equal(validate(contract.providerSchema, noteRemoved).ok, true);
  assert.equal(hash(noteRemoved.verdicts), hash(candidates[0].providerValue.verdicts));
  const noteConsumption = consumption(noteRemoved);
  const maxSources = contract.providerSchema.properties.verdicts.items.properties.sourceSlots.maxItems;
  const staleEightInstruction = repair.instructions.includes('Select at most eight most direct supplied sourceSlots');
  assert.equal(maxSources, 128);
  assert.equal(staleEightInstruction, true);
  assert.equal(snapshot(), before);
  const all = db.prepare('SELECT usage,settled,reserve,state,code FROM attempts').all();
  const ledger = {
    attempts: all.length,
    knownApiTokens: 2864424 + all.reduce((n, row) => n + (row.usage ? decode(row.usage).totalUnits : 0), 0),
    estimatedAndReservedCny: (34013743 + all.reduce((n, row) => n + (row.settled ?? row.reserve), 0)) / 1e6,
    intents: all.filter(row => row.state === 'intent').length,
    actual402: all.filter(row => row.code === 'PROVIDER_PAYMENT_REQUIRED').length,
  };
  console.log(JSON.stringify({ version: 'field_contract_research_diagnostic_v1', run,
    evidence: candidates.map((candidate, i) => ({ attemptId: ids[i], candidateHash: candidate.hash,
      contextHash: candidate.contextManifestRef.hash, issues: issues[i].issues,
      usage: decode(attempts[i].usage), estimatedCny: attempts[i].settled / 1e6,
      consumption: originalConsumption[i] })),
    fullContextsExactlyReconstructed: true,
    originalInputBytes: prepared.capsule.compiledInputBytes, repairInputBytes: repair.compiledInputBytes,
    originalVerdictsPreservedByActualRepair: true,
    nativeInstructionsAlreadyRequireCoverage: true,
    actualCoverageObligations: prepared.capsule.localIssue.reviewTask.coverageSourceSlots,
    promptDrift: { staleEightInstruction, schemaMaxSources: maxSources,
      directCauseOfTheseTwoFailuresProven: false },
    counterfactualOnly: { emptyCoverageSchemaPasses: true, emptyCoverageConsumption: emptyConsumption,
      removeNullNoteSchemaPasses: true, removeNullNoteConsumption: noteConsumption,
      originalCandidatesUnchanged: true, productionRecoveryAuthorizedByThisScript: false },
    contextBlocks: JSON.parse(prepared.capsule.compiledInput).orderedBlocks.map(block => ({
      kind: block.kind, jsonBytes: Buffer.byteLength(JSON.stringify(block)) })),
    originalLedgerUnchanged: true, ledger, providerCalls: 0, dshCalls: 0,
    semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false }));
  if (args.includes('--require-consumable')) assert(originalConsumption.every(result => result.ok),
    'ACTUAL_FIELD_CONTRACT_FAILURE_REPRODUCED');
} finally { db.close(); }
