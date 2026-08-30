import { createOfficialSpecialistV2RelationshipExtensionV1 } from
  "./official-specialist-v2-relationship-contract-v1.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ID,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_VERSION,
} from "./official-marine-stimpack-active-executor-v3.mjs";
import {
  OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID,
  OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_VERSION,
} from "./official-stimpack-ranged-consumer-executor-v2.mjs";

export const OFFICIAL_STIMPACK_ACTIVE_V3_RELATIONSHIP_SCOPE_ID =
  "ticket-11-current-stimpack-active-v3";
export const OFFICIAL_STIMPACK_RANGED_V2_RELATIONSHIP_SCOPE_ID =
  "ticket-11-current-stimpack-ranged-v2";

const SOURCE = "state_field:officialGameplayDataBundle";
const PHASE = "state_field:phase";
const ACTIVE = "state_field:activeSideKey";
const PIECES = "state_field:pieces";
const STATUSES = "state_field:pieces[].statuses";
const DAMAGE = "state_field:pieces[].damageMarker";
const BOARD = "state_field:board";
const CARDS = "state_field:cardResources";
const HISTORY = "state_field:activeAbilityUseHistory";
const PENDING = "state_field:pendingAction.stimpackRangedPrecisionV2";
const LOG = "state_field:log";

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-74" };
}
function edge(scopeId, from, relationship, to, provenance) {
  return { scopeId, from, relationship, to, provenance };
}
function contract(input) {
  const executor = `executor:${input.executorId}@${input.executorVersion}`;
  const relations = [
    ...input.reads.map((to) => edge(input.scopeId, executor, "reads", to,
      `${input.scopeId}:state_contract`)),
    edge(input.scopeId, SOURCE, "projects_to", input.adapter,
      `${input.scopeId}:explicit_adapter`),
    edge(input.scopeId, input.adapter, "derives", input.action,
      `${input.scopeId}:exact_action`),
    ...input.reads.map((from) => edge(input.scopeId, from, "invalidates", input.action,
      `${input.scopeId}:stale_action_rejection`)),
    edge(input.scopeId, executor, "exposes", input.action, `${input.scopeId}:action`),
    edge(input.scopeId, input.action, "derives", input.event, `${input.scopeId}:apply`),
    ...input.writes.map((to) => edge(input.scopeId, input.event, "writes", to,
      `${input.scopeId}:apply`)),
    edge(input.scopeId, input.action, "verified_by", input.tests.public,
      `${input.scopeId}:judge`),
    edge(input.scopeId, input.event, "verified_by", input.tests.authority,
      `${input.scopeId}:judge`),
    edge(input.scopeId, executor, "verified_by", input.tests.replay,
      `${input.scopeId}:judge`),
    edge(input.scopeId, executor, "verified_by", input.tests.relationship,
      `${input.scopeId}:judge`),
  ];
  const tests = Object.values(input.tests);
  return {
    ...input,
    additions: [
      node(input.adapter, "semantic_projection", `${input.label} current adapter`),
      node(input.action, "action_variant", `${input.label} exact action`),
      node(input.event, "state_event", `${input.label} applied`),
      ...(input.extraNodes || []),
      ...tests.map((testId) => node(testId, "judge_test", testId.slice(11))),
    ],
    relations,
    scope: {
      scopeId: input.scopeId,
      executorId: input.executorId,
      requiredNodeIds: [...new Set([
        executor, SOURCE, ...input.reads, ...input.writes, input.adapter,
        input.action, input.event, ...tests,
      ])],
      requiredEdges: relations,
      requiredPaths: [{ from: SOURCE, to: input.tests.public,
        relationships: ["projects_to", "derives", "verified_by"], maxDepth: 4 }],
      forbiddenPaths: [{ from: input.event, to: SOURCE,
        relationships: ["writes"], maxDepth: 2 }],
      evidenceTestNodeIds: tests,
    },
  };
}

const active = contract({
  scopeId: OFFICIAL_STIMPACK_ACTIVE_V3_RELATIONSHIP_SCOPE_ID,
  executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ID,
  executorVersion: OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_VERSION,
  atomIds: OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ATOM_IDS,
  label: "Stimpack Active",
  adapter: "semantic_projection:stimpackActiveV3.currentToFrozenDataAdapter",
  action: "action_variant:stimpackActive.exactCurrentV3",
  event: "state_event:stimpack_active_applied_v3",
  tests: { public: "judge_test:stimpack-active-v3-current-public-contract-v1",
    authority: "judge_test:stimpack-active-v3-preview-confirm-apply-v1",
    replay: "judge_test:stimpack-active-v3-ed25519-replay-hmac-rotation-v1",
    relationship: "judge_test:stimpack-active-v3-relationship-negative-gap-v1" },
  reads: [SOURCE, PHASE, ACTIVE, PIECES, BOARD, CARDS, HISTORY],
  writes: [PIECES, STATUSES, DAMAGE, CARDS, HISTORY, LOG],
});
const ranged = contract({
  scopeId: OFFICIAL_STIMPACK_RANGED_V2_RELATIONSHIP_SCOPE_ID,
  executorId: OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID,
  executorVersion: OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_VERSION,
  atomIds: OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ATOM_IDS,
  label: "Stimpack ranged",
  adapter: "semantic_projection:stimpackRangedV2.currentToFrozenDataAdapter",
  action: "action_variant:stimpackRanged.exactCurrentV2",
  event: "state_event:stimpack_ranged_resolved_v2",
  tests: { public: "judge_test:stimpack-ranged-v2-current-public-contract-v1",
    authority: "judge_test:stimpack-ranged-v2-preview-confirm-apply-v1",
    replay: "judge_test:stimpack-ranged-v2-ed25519-replay-hmac-rotation-v1",
    relationship: "judge_test:stimpack-ranged-v2-relationship-negative-gap-v1" },
  extraNodes: [node(PENDING, "state_field", "Stimpack ranged Precision pending action")],
  reads: [SOURCE, PHASE, ACTIVE, PIECES, STATUSES, DAMAGE, BOARD, PENDING],
  writes: [PIECES, DAMAGE, PENDING, LOG],
});

export function createOfficialStimpackCurrentV2RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("STIMPACK_CURRENT_V2_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialSpecialistV2RelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const old = new Set([
    "authority.marine-stimpack-active-v1",
    "authority.stimpack-ranged-consumer-v1",
  ]);
  const previousNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const additions = [...active.additions, ...ranged.additions]
    .filter((entry) => !previousNodeIds.has(entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions],
    edges: [...previous.edges, ...active.relations, ...ranged.relations],
    executorLineages: [
      ...previous.executorLineages.filter((entry) => !old.has(entry.executorId)),
      { executorId: active.executorId, ruleAtomIds: [...active.atomIds],
        provenance: "runtime_action_lineage:stimpack_active_v3" },
      { executorId: ranged.executorId, ruleAtomIds: [...ranged.atomIds],
        provenance: "runtime_action_lineage:stimpack_ranged_v2" },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds.filter((entry) => !old.has(entry)),
      active.executorId, ranged.executorId,
    ],
    coverageScopes: [
      ...previous.coverageScopes.filter((entry) => !old.has(entry.executorId)),
      active.scope, ranged.scope,
    ],
  };
}
