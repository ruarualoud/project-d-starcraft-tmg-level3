#!/usr/bin/env node

// The r1 V5 Room actually settled this exact certificate, while the Web
// decision port failed to classify it and spent seven unnecessary paid calls.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { resolveStarcraftTmgDeterministicSingletonActionV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const directory = path.resolve(process.argv[2] || "");
assert(directory !== path.parse(directory).root,
  "pass the exact failed V5 Room directory");
const failure = JSON.parse(readFileSync(path.join(directory,
  "failure.json"), "utf8"));
const action = failure.lastManifest?.recentAcceptedTransitions?.find((entry) =>
  entry.action?.chargeResolutionPlan?.failureProof?.kind
    === "integer_round_leading_path_excluded")?.action;
assert(action, "retained V5 Rules receipt is required");
const plan = action.chargeResolutionPlan;
const domain = { actionType: "resolve_charge",
  parameterSchema: { required: ["outcome", "failureProof"],
    outcome: ["failure"], failureProofKind:
      plan.failureProof.kind },
  constraints: { allIntegerEndpointsExcluded: true,
    certificateHash: plan.failureProof.certificateHash } };
const candidate = { kind: "parameterized", id: plan.domainId,
  action: domain };
const forced = resolveStarcraftTmgDeterministicSingletonActionV1([candidate]);
assert(forced, "Rules-certificate singleton must bypass paid parameter choice");
assert.deepEqual(forced.proposal, { kind: "parameterized",
  domainId: plan.domainId,
  parameters: plan.canonicalParameters });
assert.equal(resolveStarcraftTmgDeterministicSingletonActionV1([{
  ...candidate, action: { ...domain, constraints: {
    ...domain.constraints, allIntegerEndpointsExcluded: false } },
}]), null, "without Rules certificate the Agent must choose");
assert.equal(resolveStarcraftTmgDeterministicSingletonActionV1([candidate,
  candidate]), null, "multiple domains still require a choice");
console.log(JSON.stringify({ ok: true, roomRevision: 1,
  proofKind: plan.failureProof.kind,
  parameterBinding: forced.parameterBinding,
  sourceReceiptDomainId: plan.domainId,
  providerCalls: 0, roomMutations: 0 }));
