// Regression for the actual C r81 Queen search: the Rules permit contact,
// while a nonnegative-gap prefilter rejects every contact-ring candidate.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialUnitLifecycleFamilyAdapterV1 } from
  "../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs";
import { getOfficialBattlefieldAssetComponentFootprintV1 } from
  "../packages/source-data/official-battlefield-asset-component-profile-v1.mjs";
import { searchStarcraftTmgLegalAssetPlacementOptionsV1 } from
  "../packages/online-agent-session/legal-asset-placement-search-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const [capturePath, reportPath] = process.argv.slice(2);
assert.ok(capturePath && reportPath, "frozen capture and report paths required");
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const envelope = capture.aggregate.envelope;
assert.equal(envelope.stateRevision, 81, "exact failed C boundary required");
assert.equal(envelope.stateHash, hash(envelope.state));
const state = envelope.state;
const initialHash = hash(capture.initialEnvelope);
const completeHash = hash(capture);
const adapter = createOfficialUnitLifecycleFamilyAdapterV1(
  state.officialUnitLifecycleFamilySourceBundle);
const domain = adapter.legalSpace(state, { sideKey: "player2" })
  .parameterDomains.find(entry => entry.effectKind === "spawn_creep_tumor"
    && entry.pieceId === "player2-queen");
assert.ok(domain, "original Queen ability remains available");
const payments = domain.parameterSchema.paymentCardInstanceIds.enum[0];
const queen = state.pieces.find(piece => piece.id === domain.pieceId);
const model = queen.models[0];
const physical = getOfficialBattlefieldAssetComponentFootprintV1(
  state.officialBattlefieldAssetComponentProfile, "creep_tumor");
const radius = (Math.max(model.baseWidthInches, model.baseDepthInches) / 2
  + physical.baseDiameterMm / 25.4 / 2) * 1000;
const witnesses = [];
const witnessFailures = {};
function instantiate(authorityState, authorityDomain, parameters) {
  const preview = adapter.preview(authorityState,
    { domain: authorityDomain, parameters });
  return { canonicalParameters:
    preview.action.unitLifecyclePlan.canonicalParameters,
  action: preview.action };
}
for (let index = 0; index < 16; index += 1) {
  const angle = Math.PI * 2 * index / 16;
  const coordinate = {
    xMilliInches: Math.round(model.xInches * 1000 + Math.cos(angle) * radius),
    yMilliInches: Math.round(model.yInches * 1000 + Math.sin(angle) * radius),
  };
  try {
    const value = instantiate(state, domain, {
      activeUnitId: queen.id, paymentCardInstanceIds: payments, coordinate,
    });
    witnesses.push({ coordinate, actionHash: hash(value.action) });
  } catch (error) {
    const code = String(error.message).split(":")[0];
    witnessFailures[code] = Number(witnessFailures[code] || 0) + 1;
  }
}
assert.ok(witnesses.length > 0,
  "independent unchanged Rules must prove that this is not a full battlefield");
assert.throws(() => instantiate(state, domain, {
  activeUnitId: queen.id, paymentCardInstanceIds: payments,
  coordinate: { xMilliInches: Math.round(model.xInches * 1000),
    yMilliInches: Math.round(model.yInches * 1000) },
}), /UNIT_LIFECYCLE_PARENT_BASE_CONTACT_REQUIRED/u,
"contact repair may not legalize placing a tumor inside its parent");
const started = performance.now();
const result = searchStarcraftTmgLegalAssetPlacementOptionsV1({
  state, domain, request: { maximumOptions: 8, preferredAnchor: {
    xMilliInches: 44385, yMilliInches: 14980,
  } }, instantiate,
});
for (const option of result.placementOptions) {
  const exact = instantiate(state, domain, option.canonicalParameters);
  assert.equal(hash(exact.action), option.actionHash);
  assert.equal(option.exactRulesInstantiationPassed, true);
}
let productRuntimeProof = null;
if (result.optionCount > 0) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const sourceRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({ root });
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: sourceRoot });
  const runtime = createOfficialCurrentProductMatchRuntimeV1({
    dataset: source.dataset, state: structuredClone(capture.initialEnvelope.state),
  });
  assert.equal(runtime.descriptor.runtimeHash,
    envelope.matchBinding.rulesRuntimeBinding.runtimeHash,
    "same frozen C runtime, no replacement authority");
  const productDomain = runtime.enumerate(state, { sideKey: "player2",
    includeDisabled: true, matchBinding: envelope.matchBinding,
  }).parameterDomains.find(entry => entry.sourceDomain?.domainId === domain.domainId);
  assert.ok(productDomain, "same parent-contact source domain in full Rules");
  assert.equal(productDomain.domainId,
    "sc-domain-bc78f8c50e3a42cac474e08648f1652d8e958694590c15f27b8c044da176de48");
  const option = result.placementOptions[0];
  const exact = runtime.instantiate(state, productDomain, option.canonicalParameters,
    { matchBinding: envelope.matchBinding });
  assert.deepEqual(exact.canonicalParameters, option.canonicalParameters);
  assert.equal(hash(exact.action.sourceAction), option.actionHash);
  productRuntimeProof = { runtimeHash: runtime.descriptor.runtimeHash,
    domainId: productDomain.domainId, sourceDomainHash: productDomain.sourceDomainHash,
    exactWrappedActionHash: hash(exact.action), canonicalParametersEqual: true };
}
assert.equal(hash(capture), completeHash, "complete private capture unchanged");
assert.equal(hash(capture.initialEnvelope), initialHash);
const report = {
  schema: "ticket23_slice248_parent_contact_prefilter_bug_v1",
  stateRevision: 81, stateHash: envelope.stateHash,
  independentExactWitnessCount: witnesses.length, witnessFailures, witnesses,
  optionCount: result.optionCount,
  attemptedCandidateCount: result.attemptedCandidateCount,
  prefilteredCandidateCount: result.prefilteredCandidateCount,
  instantiatedCandidateCount: result.instantiatedCandidateCount,
  failureCounts: result.failureCounts,
  productRuntimeProof,
  result, elapsedMs: Math.round(performance.now() - started),
  completeCaptureUnchanged: true, providerCalls: 0, originalRoomWrites: 0,
  trainingTruth: false,
};
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify({ ...report, witnesses: undefined, result: undefined }));
assert.ok(result.optionCount > 0,
  "Rules-valid parent-contact witnesses must survive the Host prefilter");
