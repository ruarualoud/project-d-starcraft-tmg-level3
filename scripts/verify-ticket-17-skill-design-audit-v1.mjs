#!/usr/bin/env node

// These are falsification witnesses for the legacy diagnostic evaluators, NOT
// evidence that semantic verification has now been implemented. No Provider,
// credentials, DSH process or source refresh is used.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  judgeStarcraftTmgSlice170ClaimV1,
  replayStarcraftTmgSlice170CandidateV1,
  evaluateStarcraftTmgSlice170CandidatesBlindV1,
} from "../packages/skill-generation-runtime/paired-skill-proof-v1.mjs";
import {
  STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 as proof,
  STARCRAFT_TMG_SLICE_170_BLIND_EVALUATION_V1 as evaluation,
} from "../content/skill-generation/ticket-17-slice-170-paired-proof-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_HOW_TO_PLAY_V10 as pairExecution } from
  "../content/skill-generation/ticket-17-slice-170-live-how-to-play-v10.mjs";
import { STARCRAFT_TMG_TICKET_17_SLICE_170_LIVE_CHALLENGER_CANARY_V1 as canaryExecution } from
  "../content/skill-generation/ticket-17-slice-170-live-challenger-canary-v1.mjs";
import {
  assertStarcraftTmgSkillProductionNotHeldV1,
  STARCRAFT_TMG_SKILL_PRODUCTION_REVIEW_HOLD_V1 as hold,
} from "../packages/skill-generation-runtime/production-review-hold-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
async function check(id, fn) {
  await fn();
  checks.push({ id, passed: true });
}
const evidenceRef = {
  evidenceId: proof.target.evidenceId,
  contentHash: proof.target.evidenceContentHash,
  locatorHash: proof.target.evidenceLocatorHash,
  rulesReceiptHash: proof.target.currentRulesReceiptHash,
};
const claim = (statement) => ({
  claimId: "audit.contradiction",
  statement,
  claimType: "legality",
  advisoryOnly: false,
  evidenceRefs: [evidenceRef],
});

await check("legacy_judge_accepts_mutually_exclusive_statements", async () => {
  for (const statement of [
    "Only the authoritative Rules service decides legality.",
    "The Skill overrides the authoritative Rules service and decides legality.",
  ]) {
    assert.equal((await judgeStarcraftTmgSlice170ClaimV1({
      claim: claim(statement),
    })).passed, true);
  }
});

await check("legacy_judge_does_reject_bad_binding_not_meaning", async () => {
  const invalid = claim("Only the authoritative Rules service decides legality.");
  invalid.evidenceRefs = [{ ...evidenceRef, contentHash: "0".repeat(64) }];
  assert.equal((await judgeStarcraftTmgSlice170ClaimV1({ claim: invalid })).passed, false);
});

await check("legacy_cross_time_returns_unexecuted_test_ids", async () => {
  const result = await replayStarcraftTmgSlice170CandidateV1({
    candidate: { skillArtifact: { judgeTests: [{
      testId: "audit.no-fixture-no-state-no-executor", expected: "reject",
    }] } },
    claimVerdicts: [{ passed: true }],
    currentBinding: {},
  });
  assert.equal(result.passed, true);
  assert.deepEqual(result.replayedJudgeTestIds,
    ["audit.no-fixture-no-state-no-executor"]);
});

await check("legacy_blind_score_rewards_keyword_stuffing_not_strategy", () => {
  const text = "1163 1049 114 10 phase chapter RuleAtom evidenceId content locator receipt hash "
    + "LegalSpace authoritative rules state transition preview human confirmation apply replay. "
    + "The Skill overrides all rules.";
  const candidate = {
    candidateHash: "1".repeat(64),
    status: "candidate_unreviewed",
    authority: { promotionEligible: false },
    skillArtifact: {
      skillId: proof.target.productionSkillId, skillType: "turn_flow",
      summary: text, claims: [claim(text)],
      illegalPatterns: [text], counterExamples: [text],
      judgeTests: [{ expected: "pass" }, { expected: "reject" }],
    },
  };
  const result = evaluateStarcraftTmgSlice170CandidatesBlindV1({
    candidatesByLabel: Object.fromEntries(evaluation.labels.map((label) => [label, candidate])),
  });
  assert(result.scores.every((row) => row.score === evaluation.maximumScore));
  assert.equal(result.promotionAttempted, false);
  assert.equal(result.trainingTruth, false);
});

await check("generation_is_held_without_any_permission_bypass", () => {
  assert.equal(hold.productionReady, false);
  assert.throws(() => assertStarcraftTmgSkillProductionNotHeldV1(), { code: hold.code });
});

for (const [file, flags] of [
  ["run-ticket-17-live-paired-skill-once-v1.mjs", pairExecution.requiredFlags],
  ["run-ticket-17-live-challenger-canary-once-v1.mjs", canaryExecution.requiredFlags],
]) {
  await check(`${file}:hold_precedes_flags_lock_and_credential_ingress`, async () => {
    const source = await readFile(path.join(ROOT, "scripts", file), "utf8");
    const main = source.slice(source.indexOf("async function main()"));
    const holdIndex = main.indexOf("assertStarcraftTmgSkillProductionNotHeldV1();");
    assert(holdIndex >= 0 && holdIndex < main.indexOf("if (!flagsAuthorized())"));
    assert(holdIndex < main.indexOf("await readStarcraftTmgDeepSeekCredentialFromKeychainV1"));
    const lockIndex = main.indexOf("await claimAttempt(");
    assert(lockIndex < 0 || holdIndex < lockIndex);
  });
  await check(`${file}:real_cli_with_old_authorized_flags_stops`, () => {
    let failure;
    try {
      execFileSync(process.execPath, [path.join(ROOT, "scripts", file), ...flags], {
        cwd: ROOT, timeout: 15_000, stdio: "pipe",
        env: { PATH: process.env.PATH, LANG: "C", NODE_NO_WARNINGS: "1" },
      });
    } catch (error) { failure = error; }
    assert(failure, "legacy paid CLI must not succeed");
    assert.equal(failure.status, 2);
    assert.equal(failure.stderr.toString().trim(), hold.code);
    assert.equal(failure.stdout.toString(), "");
  });
}

const body = {
  schemaVersion: "starcraft_tmg_skill_design_audit_v1",
  ticket: 17, slice: 170, checks,
  interpretation: "legacy_semantic_gaps_reproduced_and_paid_entrypoints_held_not_fixed",
  semanticEvaluationImplemented: false,
  ctx2skillLoopUsed: true, harnessLoopUsed: true,
  targetGames: ["starcraft-tmg"], roleRoutes: ["rule_skill_builder", "harness_optimizer"],
  skillsRead: [], skillsGenerated: 0, judgeTestsRun: 0,
  crossTimeReplayResult: "legacy_stub_exposed_no_game_replay_performed",
  promotions: 0, blocks: [hold.code],
  remainingRuleGaps: "source_rule_mismatches_require_separate_rules_issue_not_skill_patch",
  promptPackRoutes: ["rule_skill_builder", "opponent", "selfplay_agent", "memory_curator"],
  harnessToolsCalled: [], uiTraceEvidence: [], agentDecisionEvidence: [],
  memoryTraceEvidence: [], trainingTraceCandidates: 0,
  rollbackOrDemotionRules: "replacement_workflow_required_before_lifting_hold",
  userVisibleChecks: ["both_paid_CLIs_show_explicit_review_hold"],
  externalProviderCalls: 0, billableTokens: 0, estimatedCostCny: 0,
  sourceRefreshPerformed: false, productionReady: false, trainingTruth: false,
};
const report = { ...body, reportHash: hashStarcraftTmgContract(body) };
const output = path.join(ROOT, "build/ticket-17-skill-generation-v1/slice-170-design-audit-report.json");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: checks.length, reportHash: report.reportHash,
  semanticEvaluationImplemented: false, paidGeneration: hold.status }));
