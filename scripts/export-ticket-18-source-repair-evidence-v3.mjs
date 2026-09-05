import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { inspectCompletedRepair } from '../packages/skill-production-v3/repair-gate.mjs';
import { seal, verifySeal, safe } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-production-v3'), run = 'rules-v3-bec9cf9b355232b92d8c';
const read = async (runId, name) => verifySeal(JSON.parse(await readFile(path.join(base, runId, name + '.json'), 'utf8')));
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue), plan = createFirstFivePlan(catalogue);
const recipe = await read(run, 'recipe'), report = await read(run, 'report');
const gate = inspectCompletedRepair({ filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'),
  recipe, report, catalogue, context, plan });
const runs = await Promise.all(['rules-v3-45543327938bde810be5', 'rules-v3-6854c9dc1f754556dafd', run].map(async id => {
  const r = await read(id, 'report'); return { runId: id, reportHash: r.hash, failure: r.failure,
    calls: r.ledger.calls, knownTokens: r.ledger.knownTokens, estimatedCostMicros: r.ledger.reservedOrSettledMicros };
}));
const patches = await Promise.all([2, 3, 5].map(n => read(run, 'rules-reading-00' + n + '.external-repair')));
const result = seal(safe({ schema: 'starcraft_external_source_repair_public_evidence_v3', runId: run,
  catalogueHash: catalogue.hash, contextHash: context.hash, reportHash: report.hash, inspection: gate.manifest,
  before: await read(run, 'before-probes'), after: await read(run, 'after-probes'),
  actualRepairs: patches, packetHashes: gate.packets.map(p => ({ id: p.packetId, hash: p.hash, claims: p.draft.claims.length })),
  runs, totalCalls: runs.reduce((n, r) => n + r.calls, 0), totalKnownTokens: runs.reduce((n, r) => n + r.knownTokens, 0),
  totalEstimateCny: runs.reduce((n, r) => n + r.estimatedCostMicros, 0) / 1e6,
  cumulativeKnownTokensLowerBound: report.cumulativeKnownTokensLowerBound, cumulativeEstimateOrReserveCny: report.cumulativeEstimateOrReserveCny,
  formalSkillsAccepted: 0, actualRoomReplayPerformed: false, strategyEffectivenessProven: false, trainingTruth: false }));
const out = path.join(root, 'docs/evidence/ticket-18-slice-173'); await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'external-source-repair-v3.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ exported: true, hash: result.hash, before: result.before.correct, after: result.after.correct,
  total: result.after.total, calls: result.totalCalls, tokens: result.totalKnownTokens, estimatedCny: result.totalEstimateCny }));
