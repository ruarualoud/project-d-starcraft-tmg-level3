// Read-only preparation of the existing review path; no model call/review rerun.
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { reviewRosterFinalPlanV3 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { withRosterTeachPlanHistoryV1 } from '../packages/roster-strategist/roster-teach-history-view-v1.mjs';
const [base] = process.argv.slice(2);
if (!base) throw Error('EXPLICIT_BASE_REQUIRED');
const dest = base + '/common-v225-B-review-preparation.private.json';
await (await fs.open(dest, 'wx', 0o600)).close();
const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const row = cfg.rows.find(r => r.arm === 'B');
const filename = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
const original = await fs.readFile(filename, 'utf8'), source = JSON.parse(original);
const previous = JSON.parse(source.planSerialized);
const candidate = JSON.parse(await fs.readFile(base + '/B/kimi-code-revision-shadow-v224/candidate-plan.private.json', 'utf8'));
const report = { version: 'candidate_review_preparation_v1', providerCalls: 0,
  nativeCalls: 0, reviewExecuted: false, originalWrites: 0,
  sourcePlanHash: previous.planHash, candidatePlanHash: candidate.planHash,
  requestedScope: 'changed_claims', fullFallbackAllowed: false };
try {
  await reviewRosterFinalPlanV3({ plan: candidate, sessionId: source.sessionId,
    incrementalFrom: { plan: previous, review: source.planReview.review },
    adaptiveReview: true, allowFullReviewOnDependencyChange: false,
    teachState: withRosterTeachPlanHistoryV1(candidate, source.teachFramework?.state || null, source.teachFrameworkHistory),
    armyAudit: source.working?.verdict?.audit || source.lockedRoster?.lock?.verdict?.audit,
    toolReceipts: source.toolReceipts,
    selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules,
    selectionJustificationPolicyVersion: source.agentSelectedStrategySource?.selectionJustificationPolicyVersion || null,
    selectedCandidateInputHash: source.selectedCandidateInput ? hash(source.selectedCandidateInput) : null,
    deliberation: { deliberate: async request => {
      const claims = request.promptNodes.find(n => n.kind === 'frozen-plan-claims');
      const boundary = request.promptNodes.find(n => n.kind === 'review-boundary');
      Object.assign(report, { prepared: true, firstContextHash: request.contextHash,
        firstTargetPaths: claims.sources.map(s => s.path), plannedRootShards: boundary.shardCount,
        firstRequestBytes: Buffer.byteLength(JSON.stringify(request)), outputContractRef: request.responseFormat.outputContractRef });
      await fs.writeFile(base + '/common-v225-B-first-review-request.private.json.gz', gzipSync(JSON.stringify(request)), { flag: 'wx', mode: 0o600 });
      throw Object.assign(Error('REVIEW_REQUEST_PREPARED_NOT_SENT'), { prepared: true });
    } },
  });
} catch (error) {
  if (!error.prepared) { report.prepared = false; report.failure = String(error.message).slice(0, 1000); }
}
report.originalDraftUnchanged = hash(await fs.readFile(filename, 'utf8')) === hash(original);
report.finishedAt = new Date().toISOString();
await fs.writeFile(dest, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
