import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inspectStarcraftTmgFormationThreatClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

// Reproduce the actual r81 Queen ability rejection using preserved public
// submissions/receipts and the SAME room's private authority snapshot. No
// Provider, writable store, original-room operation or gameplay replay is used.
const argument = (name) => {
  const value = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  assert(value, `--${name} is required`);
  return value.slice(name.length + 3);
};
const choice = JSON.parse(await readFile(argument("choice-file"), "utf8"));
const room = JSON.parse(await readFile(argument("authority-file"), "utf8"));
const spatialObservation = { units: room.aggregate.envelope.state.pieces.map(
  (piece) => ({ unitId: piece.id, unitName: piece.unitName || piece.name,
    sideRelation: piece.sideKey === "player2" ? "own" : "enemy" })) };
const submissions = Object.values(choice.attempts).filter((attempt) =>
  attempt.localPlannerSemanticReplayVersion && attempt.safeOutput?.plan);
assert.equal(submissions.length, 3, "the three actual rejected submissions");
const inputBefore = JSON.stringify({ choice, spatialObservation });
const findings = [];
for (const attempt of submissions) {
  const raw = attempt.safeOutput;
  const action = choice.actionIndex.find((entry) =>
    entry.id === raw.recommendedCandidateId)?.action;
  assert.equal(action?.actionType, "resolve_unit_lifecycle_ability");
  assert.equal(action?.pieceId, "player2-queen");
  const result = inspectStarcraftTmgFormationThreatClaimsV1({ raw,
    queryReceipts: choice.queryReceipts, spatialObservation,
    plannerSelectedAction: action });
  console.log(JSON.stringify({ round: attempt.round,
    actualAbilityBlocked: result.contradicted,
    blockingCount: result.contradictions.length,
    advisoryCount: result.advisoryFindings.length }));
  assert(result.contradictions.every((finding) =>
    finding.field !== "plan.strategicApproach"),
  "a nonselected Unit's long-plan claim must not block the Queen ability");
  // Round 4 ALSO wrongly evaluates a current alternative candidate. That is
  // outside this long-plan scope repair and must remain blocking. The later
  // already-paid corrections removed it and are eligible for local revalidation.
  if (attempt.round === 4) {
    assert.equal(result.contradicted, true);
    assert(result.contradictions.every((finding) =>
      /^candidateComparisons\[\d+\]\.evaluation$/u.test(finding.field)));
  } else {
    assert.equal(result.contradicted, false);
  }
  assert(result.advisoryFindings.length > 0,
    "retain the original disputed claim as review evidence");
  for (const finding of result.advisoryFindings) {
    assert.equal(finding.severity, "Medium");
    assert.equal(finding.blocksApply, false);
    assert.equal(finding.field, "plan.strategicApproach");
    assert(finding.resolvedTargetUnitIds.length > 0);
    assert(finding.resolvedTargetUnitIds.every((id) => id !== action.pieceId));
    assert(raw.plan.strategicApproach.some((text) =>
      text.includes(finding.text)), "do not rewrite the original claim");
  }
  // The SAME disputed claim remains blocking when its named Unit is selected.
  const disputedUnit = result.advisoryFindings[0].resolvedTargetUnitIds[0];
  const selected = inspectStarcraftTmgFormationThreatClaimsV1({ raw,
    queryReceipts: choice.queryReceipts, spatialObservation,
    plannerSelectedAction: { ...action, pieceId: disputedUnit } });
  assert.equal(selected.contradicted, true);
  // No source action / no unambiguous Unit binding is NOT an advisory shortcut.
  const unbound = inspectStarcraftTmgFormationThreatClaimsV1({ raw,
    queryReceipts: choice.queryReceipts, spatialObservation });
  assert.equal(unbound.contradicted, true);
  findings.push({ round: attempt.round,
    nonselectedAdvisoryCount: result.advisoryFindings.length,
    selectedBlockingCount: selected.contradictions.length,
    unboundBlockingCount: unbound.contradictions.length });
}
assert.equal(JSON.stringify({ choice, spatialObservation }), inputBefore);
console.log(JSON.stringify({ ok: true, cases: findings,
  providerCalls: 0, originalRoomWrites: 0, inputUnchanged: true,
  currentCandidateLegalityCertified: false, trainingTruth: false }));
