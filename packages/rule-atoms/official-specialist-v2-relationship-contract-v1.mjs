import { createOfficialSidearmPinpointV2RelationshipExtensionV1 } from
  "./official-sidearm-pinpoint-v2-relationship-contract-v1.mjs";
import {
  OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID,
  OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION,
} from "./official-specialist-loadout-executor-v2.mjs";
import {
  OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID,
  OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_VERSION,
} from "./official-specialist-ranged-batch-executor-v2.mjs";

export const OFFICIAL_SPECIALIST_LOADOUT_V2_RELATIONSHIP_SCOPE_ID =
  "ticket-11-current-specialist-loadout-v2";
export const OFFICIAL_SPECIALIST_RANGED_BATCH_V2_RELATIONSHIP_SCOPE_ID =
  "ticket-11-current-specialist-ranged-batch-v2";

const SOURCE = "state_field:officialGameplayDataBundle";
const PIECES = "state_field:pieces";
const PENDING = "state_field:pendingRangedAttackSequence";
const LOG = "state_field:log";

function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-73" };
}
function edge(scopeId, from, relationship, to, provenance) {
  return { scopeId, from, relationship, to, provenance };
}

function contract(input) {
  const {
    scopeId, executorId, executorVersion, atomIds, label, action, event, adapter, tests,
    reads, writes,
  } = input;
  const executor = `executor:${executorId}@${executorVersion}`;
  const relations = [
    ...reads.map((to) => edge(scopeId, executor, "reads", to,
      `${scopeId}:state_contract`)),
    edge(scopeId, SOURCE, "projects_to", adapter, `${scopeId}:explicit_adapter`),
    edge(scopeId, adapter, "derives", action, `${scopeId}:exact_action`),
    ...reads.map((from) => edge(scopeId, from, "invalidates", action,
      `${scopeId}:stale_action_rejection`)),
    edge(scopeId, executor, "exposes", action, `${scopeId}:action_contract`),
    edge(scopeId, action, "derives", event, `${scopeId}:atomic_apply`),
    ...writes.map((to) => edge(scopeId, event, "writes", to, `${scopeId}:atomic_apply`)),
    edge(scopeId, action, "verified_by", tests.public, `${scopeId}:judge`),
    edge(scopeId, event, "verified_by", tests.authority, `${scopeId}:judge`),
    edge(scopeId, executor, "verified_by", tests.replay, `${scopeId}:judge`),
    edge(scopeId, executor, "verified_by", tests.relationship, `${scopeId}:judge`),
  ];
  const additions = [
    node(adapter, "semantic_projection", `${label} current-to-frozen adapter`),
    node(action, "action_variant", `${label} exact current action`),
    node(event, "state_event", `${label} applied`),
    ...Object.values(tests).map((testId) => node(testId, "judge_test", testId.slice(11))),
  ];
  return {
    executorId,
    atomIds,
    additions,
    relations,
    scope: {
      scopeId,
      executorId,
      requiredNodeIds: [...new Set([
        executor, SOURCE, ...reads, ...writes, adapter, action, event,
        ...Object.values(tests),
      ])],
      requiredEdges: relations,
      requiredPaths: [{
        from: SOURCE,
        to: tests.public,
        relationships: ["projects_to", "derives", "verified_by"],
        maxDepth: 4,
      }],
      forbiddenPaths: [SOURCE].map((to) => ({
        from: event, to, relationships: ["writes"], maxDepth: 2,
      })),
      evidenceTestNodeIds: Object.values(tests),
    },
  };
}

const loadout = contract({
  scopeId: OFFICIAL_SPECIALIST_LOADOUT_V2_RELATIONSHIP_SCOPE_ID,
  executorId: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID,
  executorVersion: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION,
  atomIds: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ATOM_IDS,
  label: "Specialist loadout",
  action: "action_variant:specialistLoadout.exactCurrentV2",
  event: "state_event:specialist_loadout_configured_v2",
  adapter: "semantic_projection:specialistV2.currentToFrozenDataAdapter",
  tests: {
    public: "judge_test:specialist-loadout-v2-current-public-contract-v1",
    authority: "judge_test:specialist-loadout-v2-preview-confirm-apply-v1",
    replay: "judge_test:specialist-loadout-v2-ed25519-replay-hmac-rotation-v1",
    relationship: "judge_test:specialist-loadout-v2-relationship-negative-gap-v1",
  },
  reads: [SOURCE, PIECES],
  writes: [PIECES, LOG],
});

const ranged = contract({
  scopeId: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_RELATIONSHIP_SCOPE_ID,
  executorId: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID,
  executorVersion: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_VERSION,
  atomIds: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ATOM_IDS,
  label: "Specialist ranged batch",
  action: "action_variant:specialistRangedBatch.exactCurrentV2",
  event: "state_event:specialist_ranged_batch_resolved_v2",
  adapter: "semantic_projection:specialistRangedBatchV2.currentToFrozenDataAdapter",
  tests: {
    public: "judge_test:specialist-ranged-batch-v2-current-public-contract-v1",
    authority: "judge_test:specialist-ranged-batch-v2-preview-confirm-apply-v1",
    replay: "judge_test:specialist-ranged-batch-v2-ed25519-replay-hmac-rotation-v1",
    relationship: "judge_test:specialist-ranged-batch-v2-relationship-negative-gap-v1",
  },
  reads: [SOURCE, PIECES, PENDING],
  writes: [PIECES, PENDING, LOG],
});

export function createOfficialSpecialistV2RelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash)
    || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("SPECIALIST_V2_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialSidearmPinpointV2RelationshipExtensionV1({
    catalogueHash, runtimeHash,
  });
  const previousNodeIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  const additions = [...loadout.additions, ...ranged.additions]
    .filter((entry) => !previousNodeIds.has(entry.nodeId));
  const replaced = new Set([
    "authority.specialist-loadout-v1",
    "authority.specialist-ranged-batch-v1",
  ]);
  return {
    nodes: [...previous.nodes, ...additions],
    edges: [...previous.edges, ...loadout.relations, ...ranged.relations],
    executorLineages: [
      ...previous.executorLineages.filter((entry) => !replaced.has(entry.executorId)),
      { executorId: loadout.executorId, ruleAtomIds: [...loadout.atomIds],
        provenance: "runtime_action_lineage:specialist_loadout_v2" },
      { executorId: ranged.executorId, ruleAtomIds: [...ranged.atomIds],
        provenance: "runtime_action_lineage:specialist_ranged_batch_v2" },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds.filter((entry) => !replaced.has(entry)),
      loadout.executorId,
      ranged.executorId,
    ],
    coverageScopes: [
      ...previous.coverageScopes.filter((entry) => !replaced.has(entry.executorId)),
      loadout.scope,
      ranged.scope,
    ],
  };
}
