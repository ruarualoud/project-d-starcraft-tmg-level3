import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { reviewRosterFinalPlanV3 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { rosterSelectionUnitRulesV1 } from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 }
  from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const arg = key => process.argv.find(s => s.startsWith(`--${key}=`))?.slice(key.length + 3);
const raw = JSON.parse(await readFile(arg('input'), 'utf8'));
const plan = JSON.parse(raw.planSerialized);
const previous = raw.planVersionHistory.map(p => JSON.parse(p)).findLast(p => p.planVersion === 6);
const review = raw.planReviewHistory.findLast(r => r.planHash === previous.planHash && r.status === 'completed').review;
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: arg('fixture') });
let paths, report;
try {
  await assert.rejects(reviewRosterFinalPlanV3({ plan, sessionId: raw.sessionId,
    incrementalFrom: { plan: previous, review }, allowFullReviewOnDependencyChange: true,
    toolReceipts: raw.toolReceipts, selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput),
    selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
    selectionJustificationPolicyVersion: raw.agentSelectedStrategySource?.selectionJustificationPolicyVersion,
    armyAudit: raw.working?.verdict?.audit || raw.lockedRoster?.lock?.verdict?.audit,
    deliberation: { deliberate: async request => {
      paths = request.promptNodes.find(n => n.kind === 'frozen-plan-claims').sources.map(s => s.path);
      throw new Error('CAPTURED_SCOPE_NO_PROVIDER_CALL');
    } } }), /CAPTURED_SCOPE_NO_PROVIDER_CALL/);
  assert.deepEqual(paths.sort(), [
    'scoreRoute.fallbackRouteText',
    'opponentHypotheses.h1-kerrigan-melee-on-2-4.hypothesisText',
    'opponentHypotheses.h1-kerrigan-melee-on-2-4.expectedCounterTexts.0',
  ].sort(), 'derived inner sourcePlanHash must not turn three changed claims into a full review');
  report = { ok: true, targetClaimPaths: paths, providerCalls: 0, roomWrites: 0 };
  console.log('INCREMENTAL_LINEAGE_OK');
} catch (e) { report = { ok: false, failure: e.message, observedPaths: paths, providerCalls: 0 }; throw e; }
finally { await writeFile(arg('report'), JSON.stringify(report, null, 2), { mode: 0o600 }); }
