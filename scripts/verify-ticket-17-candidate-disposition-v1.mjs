#!/usr/bin/env node
import assert from "node:assert/strict";
import { seal, hash } from "../packages/skill-production/common.mjs";
import { candidateDisposition } from "../packages/skill-evaluation/candidate-disposition.mjs";
import { evaluateOfficialFaqF3RuleV1 } from "../packages/rule-atoms/official-faq-f3-movement-battlefield-deployment-kernel-v1.mjs";
for (const [gapWidth, legal] of [[2.99, false], [3, true], [3.01, true]]) {
  assert.equal(evaluateOfficialFaqF3RuleV1("faq-v1:06", { modelSize: 4, gapWidth, gapBoundaryKinds: ["model", "terrain"] }).legal, legal);
}
const candidate = seal({ semanticPassed: true, heldoutPassed: true, scope: { allRulesCovered: true } });
const supplemental = seal({ candidateHash: candidate.hash, correct: 36, cases: 36 });
const finding = seal({ candidateHash: candidate.hash, code: "KNOWN_FALSE_CLAIM", evidenceHash: hash("fixture-evidence") });
const result = candidateDisposition({ candidate, supplemental, findings: [finding] });
assert(result.reasons.includes("KNOWN_REVIEWER_MISS")); assert.equal(result.automaticQualityAccepted, false);
assert.equal(result.published, false); assert.equal(result.trainingTruth, false);
assert.throws(() => candidateDisposition({ candidate, supplemental: seal({ candidateHash: hash("other") }) }), /DRIFT/);
assert.throws(() => candidateDisposition({ candidate, supplemental, findings: [{ ...finding, code: "changed" }] }), /HASH_MISMATCH/);
console.log(JSON.stringify({ passed: true, checks: 9, paidCalls: 0, ruleBoundaryCases: 3, trainingTruth: false }));
