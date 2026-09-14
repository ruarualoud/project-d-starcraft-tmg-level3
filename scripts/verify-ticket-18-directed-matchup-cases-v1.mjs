import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileDirectedMatchupInitiativeCasesV1 } from './support/directed-matchup-case-corpus-v1.mjs';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpus = await compileDirectedMatchupInitiativeCasesV1(root);
assert.equal(corpus.cases.length, 4); assert.equal(corpus.actualAppliedAndReplayedBranches, 8);
for (const row of corpus.cases) {
  const view = row.prompt.observation, own = row.prompt.seatKey;
  assert.equal(view.players.player1.faction, 'Terran'); assert.equal(view.players.player2.faction, 'Zerg');
  assert.equal(view.pieces.find(p => p.sideKey === 'player2').officialUnitRecordKey, 'army_units:zergling');
  assert.deepEqual(Object.keys(view.cardResources), [own]);
  assert.equal(row.evaluation.preferredCandidateIds.length, 1);
  assert(row.evaluation.outcomes.every(o => o.replayPassed && o.after.pieces[1].officialUnitRecordKey === 'army_units:zergling'));
  assert(!JSON.stringify(row.prompt).includes('preferredCandidateIds'));
}
const files = ['scripts/support/directed-matchup-case-corpus-v1.mjs', 'scripts/verify-ticket-18-directed-matchup-cases-v1.mjs'];
const report = seal({ passed: true, checks: 30, corpusHash: corpus.hash,
  actualRulesCases: 4, appliedAndReplayedBranches: 8, providerCalls: 0, actualMatchupSkillsAccepted: 0,
  coveredAxes: corpus.exercisedAxes, uncoveredAxes: corpus.unexercisedAxes,
  strategyEffectivenessProven: false, sourceRefreshPerformed: false, trainingTruth: false,
  semanticResultHash: hash(corpus.cases.map(c => ({ caseId: c.prompt.caseId,
    preferred: c.evaluation.preferredCandidateIds, outcomes: c.evaluation.outcomes.map(o => ({ candidateId: o.candidateId, vector: o.vector })) }))),
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
const out = path.join(root, 'build/ticket-18-directed-matchup-v1'); await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'case-component-readiness.json'), JSON.stringify(report, null, 2));
// This diagnostic corpus is not the immutable production corpus. Production
// must compile once under a sealed recipe and reuse its exact signed receipts.
await writeFile(path.join(out, 'case-component-fixture.json'), JSON.stringify(corpus, null, 2));
console.log(JSON.stringify(report));
