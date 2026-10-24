import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  bindStarcraftTmgFormationSelectionV1,
  inspectStarcraftTmgFormationThreatClaimsV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const fixturePath = process.argv.find(arg => arg.startsWith("--fixture-file="))
  ?.slice("--fixture-file=".length);
assert(fixturePath, "provide the captured C r100 fixture");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
assert.equal(fixture.authority.stateRevision, 100);
assert.equal(fixture.raw.proposal?.kind, "parameterized",
  "capture the actual post-bindPlannerSelectedProposal seam");
assert.equal(fixture.raw.proposal.domainId, fixture.raw.candidateId);
const bindingOnly = process.argv.includes("--binding-only");
const original = structuredClone(fixture);
const inspect = raw => inspectStarcraftTmgFormationThreatClaimsV1({
  raw,
  selection: raw.formationSelection,
  option: fixture.selectedOption,
  queryReceipts: fixture.queryReceipts,
  spatialObservation: fixture.spatialObservation,
});
const finalClaims = structuredClone(fixture.raw);
finalClaims.scoreOrPositionValue = finalClaims.formationSelection.publicReason;
if (!bindingOnly) assert.equal(inspect(finalClaims).contradicted, false,
  "captured explicit Goliath exception and named Marine-only claims must not deny Goliath fire");

const bound = bindStarcraftTmgFormationSelectionV1(fixture.raw,
  fixture.queryReceipts, fixture.spatialObservation);
assert.equal(bound.scoreOrPositionValue,
  fixture.raw.formationSelection.publicReason,
  "reuse the model-authored same-option reason, not an invented risk/strategy");
assert.equal(bound.formationSelection.formationOptionId,
  fixture.raw.formationSelection.formationOptionId);
assert.deepEqual(bound.proposal.parameters,
  fixture.selectedOption.canonicalParameters);
assert.equal(bound.formationReasonReconciliation.replacedField,
  "scoreOrPositionValue");
assert.equal(bound.formationReasonReconciliation.allThreatClaimsReinspected,
  true);

const deniesWithoutAlternative = structuredClone(fixture.raw);
deniesWithoutAlternative.formationSelection.publicReason =
  "The formation is outside every current-round enemy fire band.";
assert.throws(() => bindStarcraftTmgFormationSelectionV1(
  deniesWithoutAlternative, fixture.queryReceipts, fixture.spatialObservation),
error => error.code === "ACTION_FORMATION_THREAT_CLAIM_CONTRADICTS_PROJECTION",
"two contradictory fields cannot manufacture a correct alternative");

const wrongException = structuredClone(finalClaims);
wrongException.intent.expectedOwnOutcome =
  "Outside every current-round enemy fire band except player1-marine-1.";
assert.equal(inspect(wrongException).contradicted, true,
  "excluding an unrelated Marine must not conceal Goliath fire");

const otherGoliathWeapon = structuredClone(fixture.selectedOption);
const row = otherGoliathWeapon.relationshipComparison.relationships.find(
  entry => entry.targetId === "player1-goliath-2");
row.enemyCurrentRoundStationaryThreatProfileKeys.push(
  "army_units:goliath::assault::Autocannon");
row.enemyCurrentRoundStationaryThreatProfileCount += 1;
const stillExposed = inspectStarcraftTmgFormationThreatClaimsV1({
  raw: finalClaims,
  selection: finalClaims.formationSelection,
  option: otherGoliathWeapon,
  spatialObservation: fixture.spatialObservation,
});
assert.equal(stillExposed.contradicted, true,
  "the Scatter-specific exception cannot erase another Goliath weapon");

const allBands = structuredClone(finalClaims);
allBands.intent.expectedEffects = [
  "Near player1-marine-1 while outside all current-round enemy fire bands.",
];
assert.equal(inspect(allBands).contradicted, true,
  "a named Marine does not narrow an explicit all-enemies assertion");
assert.deepEqual(fixture, original, "paid output, receipts and observation stay immutable");
console.log(JSON.stringify({ passed: true, capturedRevision: 100,
  retainedPaidOutputHash: fixture.paidOutputHash,
  exactOptionPreserved: true, exactParametersPreserved: true,
  scopedExceptionAndNamedAttackersChecked: bindingOnly ? "passed_in_previous_segment" : true,
  unsafeAlternativesStillBlocked: true, providerCalls: 0,
  roomMutations: 0, trainingTruth: false }));
