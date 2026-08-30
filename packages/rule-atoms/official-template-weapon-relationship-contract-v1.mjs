import { createOfficialAssaultRunRelationshipExtensionV1 } from
  "./official-assault-run-relationship-contract-v1.mjs";
import {
  OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ATOM_IDS,
  OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID,
  OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_VERSION,
} from "./official-template-weapon-executor-v1.mjs";

export const OFFICIAL_TEMPLATE_WEAPON_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-78-template-weapon-spillover";

const ID = Object.freeze({
  source: "state_field:officialDevelopmentTrancheSourceLockAudit",
  gameplay: "state_field:officialGameplayDataBundle",
  mode: "state_field:rulesProcedureMode",
  pieces: "state_field:pieces",
  models: "state_field:pieces[].models[].position",
  terrain: "state_field:board.terrain",
  pending: "state_field:pendingAction.templateWeapon",
  result: "state_field:lastTemplateResolution",
  log: "state_field:log",
  declare: "action_variant:templateWeaponV1.declarePrimaryAndGeometry",
  resolve: "action_variant:templateWeaponV1.resolveHitPools",
  alignment: "derived_fact:templateWeaponV1.alignment",
  coverage: "derived_fact:templateWeaponV1.coverage",
  batches: "derived_fact:templateWeaponV1.mainAndSpilloverBatches",
  quarantine: "derived_fact:templateWeaponV1.currentCarrierAndAssetQuarantine",
  event: "state_event:template_weapon_hit_pools_resolved",
  sourceTest: "judge_test:template-weapon-v1-source-lock",
  geometryTest: "judge_test:template-weapon-v1-bt-ft-geometry",
  spilloverTest: "judge_test:template-weapon-v1-spillover-batches",
  authorityTest: "judge_test:template-weapon-v1-authority-replay",
  graphTest: "judge_test:template-weapon-v1-relationship-negative-gap",
});
function fail(code) { throw new Error(code); }
function node(nodeId, kind, label) {
  return { nodeId, kind, label, provenance: "ticket-11-slice-78" };
}
function edge(from, relationship, to, provenance) {
  return { scopeId: OFFICIAL_TEMPLATE_WEAPON_RELATIONSHIP_SCOPE_ID,
    from, relationship, to, provenance };
}

export function createOfficialTemplateWeaponRelationshipExtensionV1(input = {}) {
  const catalogueHash = String(input.catalogueHash || "");
  const runtimeHash = String(input.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(catalogueHash) || !/^[a-f0-9]{64}$/u.test(runtimeHash)) {
    fail("TEMPLATE_WEAPON_RELATIONSHIP_RELEASE_INVALID");
  }
  const previous = createOfficialAssaultRunRelationshipExtensionV1({ catalogueHash, runtimeHash });
  const executor = `executor:${OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID}`
    + `@${OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_VERSION}`;
  const reads = [ID.source, ID.gameplay, ID.mode, ID.pieces, ID.models, ID.terrain, ID.pending];
  const edges = [
    ...reads.map((target) => edge(executor, "reads", target, "template:state_contract")),
    edge(ID.declare, "derives", ID.alignment, "template:bt_ft_alignment"),
    edge(ID.alignment, "derives", ID.coverage, "template:base_elevation_terrain_tag"),
    edge(ID.coverage, "derives", ID.batches, "template:main_and_spillover"),
    edge(ID.batches, "derives", ID.pending, "template:pending"),
    edge(executor, "exposes", ID.resolve, "template:legal_space"),
    edge(ID.pending, "derives", ID.resolve, "template:resolution_ready"),
    edge(ID.resolve, "derives", ID.event, "template:hit_rolls"),
    edge(ID.event, "writes", ID.result, "template:armour_pools"),
    edge(ID.event, "writes", ID.pending, "template:pending_clear"),
    edge(ID.event, "writes", ID.log, "template:log"),
    edge(ID.source, "derives", ID.quarantine, "template:carrier_audit"),
    edge(ID.quarantine, "invalidates", ID.declare, "template:no_current_carrier"),
    edge(ID.source, "verified_by", ID.sourceTest, "template:source_judge"),
    edge(ID.alignment, "verified_by", ID.geometryTest, "template:geometry_judge"),
    edge(ID.batches, "verified_by", ID.spilloverTest, "template:batch_judge"),
    edge(executor, "verified_by", ID.authorityTest, "template:authority"),
    edge(executor, "verified_by", ID.graphTest, "template:relationship"),
    ...reads.map((source) => edge(source, "invalidates", ID.resolve, "template:stale")),
  ];
  const additions = [
    node(ID.mode, "state_field", "Explicit rules-procedure conformance mode"),
    node(ID.terrain, "state_field", "Size-2+ blocking terrain"),
    node(ID.pending, "state_field", "Template resolution pending"),
    node(ID.result, "state_field", "Last template hit-pool resolution"),
    node(ID.declare, "action_variant", "Declare primary template target and geometry"),
    node(ID.resolve, "action_variant", "Resolve template hit pools"),
    node(ID.alignment, "derived_value", "BT/FT authoritative alignment"),
    node(ID.coverage, "derived_value", "Covered eligible same-elevation models"),
    node(ID.batches, "derived_value", "Main and per-unit spillover batches"),
    node(ID.quarantine, "derived_value", "Missing current carrier and geometry asset quarantine"),
    node(ID.event, "state_event", "Template hit pools resolved"),
    node(ID.sourceTest, "judge_test", "Template source-lock Judge"),
    node(ID.geometryTest, "judge_test", "Template geometry Judge"),
    node(ID.spilloverTest, "judge_test", "Template spillover Judge"),
    node(ID.authorityTest, "judge_test", "Template Authority replay Judge"),
    node(ID.graphTest, "judge_test", "Template relationship negative-gap Judge"),
  ];
  const previousIds = new Set(previous.nodes.map((entry) => entry.nodeId));
  return {
    nodes: [...previous.nodes, ...additions.filter((entry) => !previousIds.has(entry.nodeId))],
    edges: [...previous.edges, ...edges],
    executorLineages: [...previous.executorLineages, {
      executorId: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID,
      ruleAtomIds: [...OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ATOM_IDS],
      provenance: "runtime_action_lineage:template_weapon_v1",
    }],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds, OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID,
    ],
    coverageScopes: [...previous.coverageScopes, {
      scopeId: OFFICIAL_TEMPLATE_WEAPON_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID,
      requiredNodeIds: [...new Set([executor, ...reads, ID.result, ID.log, ID.declare,
        ID.resolve, ID.alignment, ID.coverage, ID.batches, ID.quarantine, ID.event,
        ID.sourceTest, ID.geometryTest, ID.spilloverTest, ID.authorityTest, ID.graphTest])],
      requiredEdges: edges,
      requiredPaths: [{ from: ID.declare, to: ID.result,
        relationships: ["derives", "writes"],
        maxDepth: 7 }],
      forbiddenPaths: [{ from: ID.quarantine, to: ID.result,
        relationships: ["derives", "writes"], maxDepth: 2 }],
      evidenceTestNodeIds: [ID.sourceTest, ID.geometryTest, ID.spilloverTest,
        ID.authorityTest, ID.graphTest],
    }],
  };
}
