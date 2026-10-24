// Actual A baseline lacks only the later actor-relative DERIVED scoring table.
// The same frozen inputs must permit changed-claim review, not a paid full repeat.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { reviewRosterFinalPlanV3 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const config = JSON.parse(await fs.readFile(process.argv[2] + '/common-v77-plan-repair-config.private.json', 'utf8'));
const row = config.rows.find(r => r.arm === 'A');
const d = JSON.parse(await fs.readFile(`${row.dataDirectory}/drafts/${row.sessionId}.json`, 'utf8'));
const plan = JSON.parse(d.planSerialized);
const previous = d.planVersionHistory.map(JSON.parse).find(p => p.planHash === row.expectedPlanHash);
const prior = [d.planReview, ...(d.planReviewHistory || [])].find(r => r?.status === 'completed' && r.planHash === previous.planHash);
const input = { plan, sessionId: d.sessionId, incrementalFrom: { plan: previous, review: prior.review },
  // New paths absent from the legacy review are automatically selected by the
  // coverage upgrade; explicit rechecks name only previously reviewed paths.
  allowFullReviewOnDependencyChange: false,
  relatedRepairClaimPaths: row.targetedClaimPaths.filter(p => prior.review.reviewedClaimPaths.includes(p)),
  toolReceipts: d.toolReceipts, selectionUnitRules: d.teachFramework.context.sourceFacts.selectionUnitRules,
  selectedCandidateInputHash: d.selectedCandidateInput ? hash(d.selectedCandidateInput) : null };
let request = null, caught;
try { await reviewRosterFinalPlanV3({ ...input, deliberation: { descriptor: () => ({ modelVersion: 'no_provider' }),
  deliberate: async value => { request = value; throw Error('CAPTURE_ONLY_NO_PROVIDER'); } } }); }
catch (error) { caught = error; }
assert(request, `actual changed-claim consumer stopped before dispatch: ${caught?.message}`);
assert.equal(caught.message, 'CAPTURE_ONLY_NO_PROVIDER');
const facts = request.promptNodes.find(n => n.kind === 'verified-structured-facts').sourceFacts;
assert.equal(facts.missionMarkerScoringByActor.status, 'source_bound_arithmetic_only');
assert.equal(facts.missionMarkerScoringByActor.markers.find(m => m.number === 2).vpByScoringActor.player2, 1);
// A new authority identity/receipt really changes earlier facts and must NOT be
// excused by the additive-table compatibility path.
const changedReceipts = d.toolReceipts.filter(r => r.receiptHash !== facts.missionMarkerScoringByActor.receiptHash);
await assert.rejects(() => reviewRosterFinalPlanV3({ ...input, toolReceipts: changedReceipts,
  deliberation: { deliberate() { throw Error('must not dispatch changed historical facts'); } } }),
  /ROSTER_INCREMENTAL_REVIEW_DEPENDENCY_CHANGED:prior_facts_changed/);
console.log(JSON.stringify({ status: 'PASS', actualLegacyAIncrementalScopeRecovered: true,
  addedDerivedTableDelivered: true, changedOriginalFactsStillRejected: true, providerCalls: 0 }));
