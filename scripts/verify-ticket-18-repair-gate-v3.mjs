import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { inspectCompletedRepair } from '../packages/skill-production-v3/repair-gate.mjs';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--repair-run' && /^rules-v3-[a-f0-9]{20}$/.test(args[1])));
const runId = args[1] || 'rules-v3-1dc2feb6d351a65c83be', out = path.join(root, 'build/ticket-18-production-v3');
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue), plan = createFirstFivePlan(catalogue);
const recipe = JSON.parse(await readFile(path.join(out, runId, 'recipe.json'), 'utf8'));
const report = JSON.parse(await readFile(path.join(out, runId, 'report.json'), 'utf8'));
const input = { filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), recipe, report, plan, catalogue, context };
if (args.length === 0) {
  assert.throws(() => inspectCompletedRepair(input), { code: 'KNOWN_EXTERNAL_PACKET_ISSUE' });
  console.log(JSON.stringify({ passed: true, check: 'historical_model_consensus_correctly_held_by_external_findings',
    readyForProduction: false, providerCalls: 0 })); process.exit(0);
}
const inspected = inspectCompletedRepair(input);
assert.equal(inspected.packets.length, 5); assert.equal(inspected.manifest.remainingPackets, 32);
assert.equal(inspected.manifest.formalSkillsAccepted, 0); assert.equal(inspected.manifest.actualRoomReplayPerformed, false);
const { hash: reportHash, ...body } = report;
for (const change of [{ failure: { code: 'FAILURE' } }, { processedPackets: 4 }, { semanticallyPassedPackets: 4 },
  { resultHashes: [hash('fabricated'), ...report.resultHashes.slice(1)] }, { contextHash: hash('wrong') }]) {
  assert.throws(() => inspectCompletedRepair({ ...input, report: seal({ ...body, ...change }) }));
}
if (recipe.version === 'v3-external-source-repair') {
  assert.equal(inspected.manifest.externalAudit.passedAfterCases, 14);
  for (const change of [{ externalProbePassed: false }, { afterProbeHash: hash('fabricated') }, { beforeProbeHash: hash('stale') }]) {
    assert.throws(() => inspectCompletedRepair({ ...input, report: seal({ ...body, ...change }) }));
  }
}
const edits = inspected.packets.map(packet => ({ id: packet.packetId, semanticPassed: packet.semanticPassed,
  claims: packet.draft.claims.length, revisions: packet.revisions.map(r => ({ kind: r.kind,
    textReplacements: r.patch.replacements.length, newClaims: r.patch.additions.length,
    addedCitations: (r.patch.citationAdditions || []).reduce((n, c) => n + c.evidence.length, 0) })),
  openIssues: packet.issueJournal.openIssues, finalReviewHashes: packet.rounds.at(-1).reviews.map(r => r.hash) }));
const files = ['packages/skill-production-v3/repair-gate.mjs', 'packages/skill-evaluation/overall-rules-package-v3.mjs',
  'packages/skill-evaluation/source-audit-probes-v3.mjs',
  'scripts/verify-ticket-18-repair-gate-v3.mjs', 'scripts/run-ticket-18-overall-production-v3.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const checks = recipe.version === 'v3-external-source-repair' ? 9 : 6;
const gate = seal({ passed: true, checks, recipeHash: recipe.hash, reportHash: report.hash, codeHashes,
  inspection: inspected.manifest, edits, actualModelProductionArtifacts: true, newProviderCalls: 0,
  conclusion: 'real_saved_failures_repaired_and_source_reviewed_not_a_complete_skill_or_strategy_test', trainingTruth: false });
await writeFile(path.join(out, 'repair-gate-readiness.json'), JSON.stringify(gate, null, 2));
console.log(JSON.stringify({ passed: true, checks, realPackets: 5, edits, externalAudit: inspected.manifest.externalAudit, newProviderCalls: 0, hash: gate.hash }));
