// Reproduces the real Raynor Teach reply passing without ability cooperation
// or alternative-choice evidence. This is not a general roster test suite.
import assert from "node:assert/strict";
import { readFile, mkdtemp } from "node:fs/promises";
import { PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_V1 } from
  "../packages/roster-strategist/planned-preset-deepening-output-v1.mjs";
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from
  "../packages/structured-generation/output-contract-registry-v1.mjs";

const option = key => process.argv.find(x => x.startsWith(`--${key}=`))
  ?.slice(key.length + 3);
const foundationOnly = option("scope") === "foundation";
const integrationOnly = option("scope") === "integration" || foundationOnly;
const captured = JSON.parse(await readFile(option("capture"), "utf8"));
let module;
try { module = await import(
  "../packages/roster-strategist/roster-selection-justification-v1.mjs"); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
const contract = module?.ROSTER_SELECTION_DEEPENING_OUTPUT_CONTRACT_V1
  || PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_V1;
if (!integrationOnly) {
assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(
  contract.providerSchema, captured.output).ok, false,
"actual vague Hero reply must not satisfy evidence-grounded selection Teach");
assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(
  PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_V1.providerSchema,
  captured.output).ok, true, "historical paid contract is not rewritten");
}

const candidate = captured.candidate;
const unitIds = candidate.units.map(x => x.unitInstanceId);
const rules = captured.unitRules;
const refs = rules.map(x => x.referenceId);
const justification = {
  unitDecisions: candidate.units.map(unit => ({
    unitInstanceId: unit.unitInstanceId,
    missionTask: `Local fixture: hold the named route with ${unit.unitInstanceId}`,
    expectedOpposition: "Conditional enemy marker contest, not a predicted casualty count",
    deploymentAndTiming: "Re-query legal placement after arrival; no pre-arrival action",
    distinctContribution: "Role redundancy is intentional, not a claim of unique superiority",
    abilityApplications: [],
    abilityNonUseReason: "Local fixture compares baseline role rather than every ability",
    alternatives: [{ recordKey: candidate.units[0].recordKey,
      description: "A different composition or upgrade package of this known record",
      advantage: "Potential earlier coverage", disadvantage: "Different resource and route cost",
      whyNotSelected: "Conditional preference for the retained route, not global dominance",
      evidenceRefs: [rules.find(x => x.recordKey === candidate.units[0].recordKey).referenceId] }],
    evidenceRefs: [rules.find(x => x.recordKey === unit.recordKey).referenceId],
  })),
  finalChoice: {
    preferenceReason: "Local fixture retains this route relative to the stated alternatives",
    advantages: ["Redundant mission bodies"], costs: ["Delayed reserves and support exposure"],
    failureConditions: ["Opponent or map invalidates the assumed contest"],
    evidenceRefs: refs,
  },
};
const hero = justification.unitDecisions.find(x =>
  candidate.units.find(u => u.unitInstanceId === x.unitInstanceId)?.recordKey
    === "army_units:jim_raynor");
const marineId = candidate.units.find(x => x.recordKey === "army_units:marine").unitInstanceId;
hero.abilityNonUseReason = "Other weapon/ability uses remain conditional, not excluded by a lock";
hero.abilityApplications = [{ abilityName: "Orders", phase: "Movement Phase",
  partnerUnitIds: [marineId], conditions: "Within 8 inches, enough CP and a legal activation window",
  intendedEffect: "Spend 1 CP for the selected biological Unit's first weapon Critical Hit (2)",
  evidenceRefs: hero.evidenceRefs }];
if (!integrationOnly) {
assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema,
  { ...captured.output, selectionJustification: justification }).ok, true);
const validated = module.validateRosterSelectionJustificationV1({ justification,
  candidate, unitRules: rules, evidenceRefs: refs });
assert.deepEqual(validated.justification, justification);
assert.equal(validated.strategicSuperiorityProven, false);
assert.equal(validated.hostPreferenceWeightsApplied, false);
assert.equal(validated.sourceTruthReviewed, false);
}
const projection = module.projectRosterSelectionArgumentsV1(justification,
  captured.output.componentPurposes, captured.output.publicSummaryText);
if (!integrationOnly) {
assert.match(projection.componentPurposes.find(x => x.instanceId === hero.unitInstanceId)
  .publicPurposeText, /Orders/);
assert.match(projection.publicSummaryText, /final|Final/);
const { normalizeRosterStrategistReplyForRequestV1 } = await import(
  "../packages/roster-strategist/roster-strategist-runtime-v1.mjs");
const normalized = normalizeRosterStrategistReplyForRequestV1({
  output: { ...captured.output, selectionJustification: justification },
  request: { roundKind: "preset_plan_deepening",
    responseFormat: { schema: contract.providerSchema } },
});
assert.deepEqual(normalized.output.selectionJustification, justification);
for (const mutate of [
  x => { x.unitDecisions.pop(); },
  x => { x.unitDecisions[0].alternatives = []; },
  x => { x.unitDecisions[0].evidenceRefs = ["invented-source"]; },
  x => { x.unitDecisions.find(d => d.unitInstanceId === hero.unitInstanceId)
    .abilityApplications[0].partnerUnitIds = ["missing-unit"]; },
  x => { x.unitDecisions.find(d => d.unitInstanceId === hero.unitInstanceId)
    .abilityApplications[0].abilityName = "Invented aura"; },
]) {
  const bad = structuredClone(justification); mutate(bad);
  assert.throws(() => module.validateRosterSelectionJustificationV1({
    justification: bad, candidate, unitRules: rules, evidenceRefs: refs }),
  error => error.code === "ROSTER_SELECTION_JUSTIFICATION_INCOMPLETE"
    && error.details.findings.length > 0);
}
assert.deepEqual(unitIds, candidate.units.map(x => x.unitInstanceId));
}
// The normal reviewer must see real capability definitions as well as the
// argument; a resolved citation is not proof of the claimed ability effect.
if (!foundationOnly) {
const { buildRosterFinalPlanVerifiedFactsV1, reviewRosterFinalPlanV2,
  ROSTER_FINAL_PLAN_REVIEW_SCHEMA_V2 } = await import(
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs");
const { hashStarcraftTmgContract } = await import(
  "../packages/authoritative-engine/referee-crypto-v1.mjs");
const { createRosterComponentPurposeV1 } = await import(
  "../packages/roster-strategist/roster-plan-contracts-v1.mjs");
const publicPlan = structuredClone(captured.plan);
publicPlan.componentPurposes = projection.componentPurposes.map(createRosterComponentPurposeV1);
publicPlan.publicSummaryText = projection.publicSummaryText;
delete publicPlan.planHash;
publicPlan.planHash = hashStarcraftTmgContract(publicPlan);
if (!integrationOnly) {
const oldFacts = buildRosterFinalPlanVerifiedFactsV1({ plan: captured.plan });
assert.deepEqual(buildRosterFinalPlanVerifiedFactsV1({ plan: captured.plan,
  selectionUnitRules: rules }), oldFacts, "old review facts remain byte-equivalent");
assert.throws(() => buildRosterFinalPlanVerifiedFactsV1({ plan: publicPlan }),
  error => error.code === "ROSTER_SELECTION_RULE_FACTS_MISSING");
}
let reviewRequest;
await reviewRosterFinalPlanV2({ plan: publicPlan, sessionId: "local-argument-review",
  selectionUnitRules: rules, deliberation: { deliberate: async request => {
    reviewRequest = request;
    return { output: { schemaVersion: ROSTER_FINAL_PLAN_REVIEW_SCHEMA_V2,
      roundKind: "final_plan_review", findings: [],
      publicSummary: "Local request capture only, not a real strategic review" } };
  } } });
const facts = reviewRequest.promptNodes.find(x =>
  x.kind === "verified-structured-facts").sourceFacts;
assert.ok(facts.selectionUnitRules.find(x => x.recordKey === "army_units:jim_raynor")
  .abilities.some(x => x.name === "Orders"));
assert.deepEqual(facts.selectionRosterUnits, candidate.units);
assert.equal(facts.selectionArgumentsAreModelClaimsNotVerifiedFacts, true);
assert.match(reviewRequest.userMessage, /eligible recipient tags/);
assert.match(reviewRequest.userMessage, /not just the catalogue/);
}
// Cross the actual Product -> Handoff -> Workspace -> Foundation seam. Capture
// without dispatching a real model or replaying old passed gates.
const { createRosterPlanningProductModuleV1 } = await import(
  "../packages/product-composition/roster-planning-product-module-v1.mjs");
const { createIterativeRosterFileStoreV1 } = await import(
  "../packages/roster-strategist/iterative-roster-file-store-v1.mjs");
const root = import.meta.dirname.replace(/\/scripts$/, "");
const directory = await mkdtemp(`${root}/build/selection-justification-bug-`);
const store = createIterativeRosterFileStoreV1({ directory: `${directory}/iterative-draft` });
const state = structuredClone(captured.state);
state.modelContextVersion = 7;
state.selectionJustificationPolicyVersion = module.ROSTER_SELECTION_JUSTIFICATION_POLICY_V1;
await store.save(state.sessionId, state);
console.log(JSON.stringify({ stage: "product_initializing", directory }));
let foundationRequest;
const product = await createRosterPlanningProductModuleV1({ root,
  fixtureRoot: option("fixture"), dataDirectory: directory,
  mapConfiguration: captured.mapConfiguration, enableIterativeDraft: true,
  deliberationFactory: { createForRun: async () => ({
    descriptor: () => ({ kind: "local_capture_only", modelVersion: "no-provider",
      promptVersion: "selection_justification_repro" }),
    deliberate: async request => {
      foundationRequest = request;
      console.log(JSON.stringify({ stage: "foundation_captured", roundKind: request.roundKind }));
      throw Object.assign(new Error("LOCAL_CAPTURE_ONLY"), { code: "LOCAL_CAPTURE_ONLY" });
    },
  }) },
});
console.log(JSON.stringify({ stage: "product_initialized" }));
const handoff = await product.iterativeDraft.prepareTeachHandoff(state.sessionId);
const teach = await product.service.createAgentSelectedTeachSession({
  setup: captured.setup, handoff });
assert.equal(teach.agentSelectedStrategySource.selectionJustificationPolicyVersion,
  module.ROSTER_SELECTION_JUSTIFICATION_POLICY_V1);
await product.service.startPlanning(teach.sessionId);
const deadline = Date.now() + 30_000;
while (product.service.readSession(teach.sessionId).status === "running"
  && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
assert.ok(foundationRequest, "new requirements must reach the actual Foundation");
const requirementNode = foundationRequest.promptNodes.find(x =>
  x.nodeType === "selection-argument-requirements");
assert.ok(requirementNode);
assert.match(requirementNode.content.instruction, /alternative/);
assert.match(requirementNode.content.instruction, /schedule.*frozen ONLY/);
const rule = requirementNode.content.unitRules.find(x => x.recordKey === "army_units:jim_raynor");
assert.ok(rule.abilities.some(x => x.name === "Orders" && /Within 8/.test(x.description)));
await assert.rejects(product.iterativeDraft.attachTeachFeedback(state.sessionId,
  { ...teach, status: "planned", plan: captured.plan }),
  error => error.code === "ROSTER_SELECTION_JUSTIFICATION_INCOMPLETE");
console.log(JSON.stringify({ status: "passed", concreteBug: "vague_hero_selection_accepted",
  validationScope: integrationOnly ? "remaining_integration_only" : "full_focused_bug",
  foundationOnly,
  selectedUnits: unitIds.length, historicalReplyUnchanged: true,
  actualFoundationRequirements: true, oldVagueTeachNotAcceptedByNewPolicy: true,
  finalReviewerGetsFrozenCapabilitiesAndPurchasedUpgrades: foundationOnly ? "previously_asserted_not_repeated" : true,
  evidenceTextNotPruned: true, outputDirectory: directory,
  sourceTruthReviewed: false, strategicSuperiorityProven: false,
  realProviderCalls: 0, roomWrites: 0 }));
