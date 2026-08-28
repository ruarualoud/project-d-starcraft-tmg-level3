#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_MARINE_CHARGE_DECLARATION_PARAMETER_KIND,
  OFFICIAL_MARINE_CHARGE_NEW_ATOM_IDS,
  createOfficialMarineChargeRuleSliceV1,
  verifyOfficialMarineChargeRuleSliceV1,
} from "../packages/rule-atoms/official-marine-charge-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialMarineChargeFixtureV1 } from
  "./support/official-marine-charge-fixture-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-marine-multi-enemy-stimpack-casualty-v5-report.json",
  ),
  "utf8",
));

const slice = createOfficialMarineChargeRuleSliceV1({ previousSlice: previousReport.slice });
const audit = verifyOfficialMarineChargeRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(OFFICIAL_MARINE_CHARGE_NEW_ATOM_IDS.length, 17);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 17);
assert.equal(audit.counts.executableRuleAtoms, 438);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 474);

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV1({
  root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const state = fixture.battleState();
const enumeration = runtime.enumerate(state, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: {
    bindingHash: "charge-red-tracer-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
  },
});
const domain = enumeration.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_MARINE_CHARGE_DECLARATION_PARAMETER_KIND
    && entry.pieceId === "p1-charge"
));
assert.ok(domain, JSON.stringify(enumeration.candidates));
assert.equal(domain.constraints.speedInches, 4);
assert.deepEqual(domain.constraints.eligibleTargetUnitIds, ["p2-target-a", "p2-target-b"]);
assert.equal(domain.parameterSchema.targetUnitCount.maximum, null);

const declaration = runtime.instantiate(state, domain, {
  leadingModelId: "p1-charge-model-1",
  targets: [
    { unitId: "p2-target-b", modelId: "p2-target-b-model-1" },
    { unitId: "p2-target-a", modelId: "p2-target-a-model-1" },
  ],
}, {
  matchBinding: {
    bindingHash: "charge-red-tracer-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
  },
});
assert.equal(declaration.action.actionType, "charge");
assert.deepEqual(declaration.action.chance, {
  kind: "fixed_roll_sequence",
  faces: 6,
  count: 1,
  layout: { charge: 1 },
});
assert.equal(declaration.action.chargePlan.speedInches, 4);
assert.equal(declaration.action.chargePlan.lineOfSightRequired, false);
assert.deepEqual(declaration.canonicalParameters.targets, [
  { unitId: "p2-target-a", modelId: "p2-target-a-model-1" },
  { unitId: "p2-target-b", modelId: "p2-target-b-model-1" },
]);

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime: runtime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => "2026-08-26T00:00:00.000Z",
  cryptoOptions: {
    keyId: "ticket-11-marine-charge-referee-v1",
    privateKey,
    publicKey,
    hmacSecret: "ticket-11-marine-charge-seal-v1",
  },
});
const envelope = engine.createEnvelope({
  roomId: "official-marine-charge-preview-room",
  dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
    + `/${fixture.snapshot.dataVersions.cardsVersion}`
    + `/${fixture.snapshot.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: {
      artifactId: "official-command-center-snapshot",
      content: fixture.snapshot,
    },
    dataSnapshot: {
      artifactId: "official-gameplay-data-bundle",
      content: fixture.gameplayDataBundle,
    },
  },
  state,
});
const seatAuthority = engine.issueSeatAuthority({
  grantId: "official-marine-charge-preview-grant",
  roomId: envelope.roomId,
  matchBindingHash: envelope.matchBindingHash,
  seatKey: "player1",
  roleMode: "player",
  principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"],
});
const authoritySpace = engine.legalSpace(envelope, { seatAuthority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_MARINE_CHARGE_DECLARATION_PARAMETER_KIND
    && entry.pieceId === "p1-charge"
));
assert.ok(authorityDomain);
const authorityPreview = engine.preview({
  envelope,
  seatAuthority,
  proposal: {
    kind: "parameterized",
    domainId: authorityDomain.domainId,
    parameters: declaration.canonicalParameters,
  },
});
assert.equal(authorityPreview.ok, true, JSON.stringify(authorityPreview));
assert.equal(
  authorityPreview.preview.core.action.chargePlanHash,
  declaration.action.chargePlanHash,
);
assert.deepEqual(authorityPreview.preview.core.action.chance.layout, { charge: 1 });
assert.deepEqual(authorityPreview.preview.core.chanceTicket.spec.layout, { charge: 1 });

const confirmation = engine.confirmPreview({
  envelope,
  preview: authorityPreview.preview,
  seatAuthority,
});
assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
const controlLease = engine.issueControlLease({
  seatAuthority,
  sessionId: "official-marine-charge-preview-session",
  leaseFence: 1,
  issuedAtRoomRevision: envelope.stateRevision,
});
const declarationApplied = engine.apply({
  envelope,
  expectedStateRevision: envelope.stateRevision,
  preview: authorityPreview.preview,
  confirmation: confirmation.confirmation,
  seatAuthority,
  controlLease,
  idempotencyKey: "official-marine-charge-declare-v1",
});
assert.equal(declarationApplied.ok, true, JSON.stringify(declarationApplied));
assert.equal(declarationApplied.receipt.chanceReveal.reveals.length, 1);
const chargeRoll = declarationApplied.receipt.chanceReveal.reveals[0].outcome;
assert.ok(chargeRoll >= 1 && chargeRoll <= 6);
assert.equal(
  declarationApplied.envelope.state.pendingAction.schema,
  "starcraft_tmg_official_marine_charge_pending_v1",
);
assert.equal(
  declarationApplied.envelope.state.pendingAction.chargeRollDistanceInches,
  4 + chargeRoll,
);
assert.equal(declarationApplied.envelope.state.activeSideKey, "player1");
assert.equal(
  declarationApplied.envelope.state.pieces.find((entry) => entry.id === "p1-charge")
    .activatedPhases.assault,
  false,
);
const pendingSpace = engine.legalSpace(declarationApplied.envelope, { seatAuthority });
assert.equal(pendingSpace.finiteActions.length, 0);
assert.equal(pendingSpace.parameterDomains.length, 1);
assert.equal(
  pendingSpace.parameterDomains[0].parameterKind,
  "official_marine_charge_resolution_v1",
);
assert.equal(
  pendingSpace.parameterDomains[0].constraints.maxDistanceMilliInches,
  (4 + chargeRoll) * 1000,
);
const resolutionParameters = chargeRoll === 1
  ? {
      path: [{ xMilliInches: 10_000, yMilliInches: 10_000 }],
      placements: [{
        modelId: "p1-charge-model-2",
        xMilliInches: 12_000,
        yMilliInches: 8_110,
      }],
    }
  : {
      path: [{ xMilliInches: 10_909, yMilliInches: 10_000 }],
      placements: [{
        modelId: "p1-charge-model-2",
        xMilliInches: 13_091,
        yMilliInches: 10_000,
      }],
    };
const resolution = runtime.instantiate(
  declarationApplied.envelope.state,
  pendingSpace.parameterDomains[0],
  resolutionParameters,
  { matchBinding: declarationApplied.envelope.matchBinding },
);
assert.equal(resolution.action.actionType, "resolve_charge");
assert.equal(resolution.action.chance, null);
assert.equal(
  resolution.action.chargePlan.chargeRollDistanceInches,
  4 + chargeRoll,
);
assert.deepEqual(
  resolution.action.chargePlan.declaredTargetUnitIds,
  ["p2-target-a", "p2-target-b"],
);
assert.equal(resolution.action.chargePlan.allDeclaredTargetsEngaged, true);
assert.equal(resolution.action.chargePlan.undeclaredEnemyUnitsEngaged, 0);

console.log(JSON.stringify({
  schema: "starcraft_tmg_official_marine_charge_rule_slice_verification_v1_red_tracer",
  executableRuleAtoms: audit.counts.executableRuleAtoms,
  newlyExecutableRuleAtoms: audit.counts.newlyExecutableRuleAtoms,
  trainingTruth: false,
}, null, 2));
