#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  RULE_ATOM_CATALOGUE_SCHEMA,
  createRuleAtomCatalogue,
  resolveExecutableRuleAtoms,
  verifyRuleAtomCatalogue,
} from "../packages/rule-atoms/rule-atom-catalogue-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);

function clone(value) {
  return structuredClone(value);
}

function sourceClause({ clauseId, locator, textHash = SHA_B }) {
  return {
    clauseId,
    sourceSnapshotId: "official-rulebook-en-v1",
    sourceContentHash: SHA_A,
    locator,
    textHash,
    language: "en",
    authority: "official_primary",
  };
}

function evidence(prefix) {
  return {
    positiveFixtureIds: [`${prefix}:positive`],
    negativeFixtureIds: [`${prefix}:negative`],
    interactionFixtureIds: [`${prefix}:interaction`],
    lifecycleFixtureIds: [`${prefix}:lifecycle`],
    replayFixtureIds: [`${prefix}:replay`],
    sourceDriftFixtureIds: [`${prefix}:source-drift`],
  };
}

function executableAtom() {
  return {
    atomId: "movement.path.within-speed",
    atomVersion: "1.0.0",
    clauseIds: ["rulebook:movement:path"],
    disposition: "executable",
    title: "Move along a legal path within Speed",
    owner: { authority: "rules", actor: "active_seat" },
    timing: { phase: "movement", window: "unit_activation", priority: 100 },
    preconditions: [
      {
        predicateId: "unit.can_move",
        inputSchema: "starcraft_tmg_state_envelope_v2",
        failureCode: "unit_cannot_move",
      },
    ],
    legalSpace: {
      kind: "parameter_domain",
      actionType: "move-path",
      parameterSchema: "starcraft_tmg_move_path_parameters_v1",
    },
    effect: {
      executorId: "authority.move-path",
      transitionSchema: "starcraft_tmg_transition_receipt_v2",
    },
    chance: { kind: "none" },
    rejectionCodes: ["unit_cannot_move", "path_exceeds_speed", "path_blocked"],
    dependencies: {
      rulesVersion: "starcraft-tmg-rules-v1",
      sourceSnapshotIds: ["official-rulebook-en-v1"],
      atomIds: [],
    },
    evidence: evidence("movement.path.within-speed"),
  };
}

function baseInput() {
  return {
    gameId: "starcraft-tmg",
    catalogueVersion: "1.0.0",
    rulesVersion: "starcraft-tmg-rules-v1",
    sourceSnapshots: [
      {
        sourceSnapshotId: "official-rulebook-en-v1",
        authority: "official_primary",
        immutableLocator: "https://archon-studio.com/files/manuals/sc/StarCraft-TMG_EN.pdf",
        contentHash: SHA_A,
        mediaType: "application/pdf",
        language: "en",
        capturedAt: "2026-08-24T00:00:00.000Z",
      },
    ],
    sourceClauses: [
      sourceClause({ clauseId: "rulebook:movement:path", locator: { page: 18, section: "Movement" } }),
      sourceClause({ clauseId: "rulebook:reaction:timing", locator: { page: 14, section: "Reactions" } }),
      sourceClause({ clauseId: "rulebook:terrain:vector-gap", locator: { page: 26, section: "Terrain" } }),
      sourceClause({ clauseId: "rulebook:legacy:obsolete", locator: { page: 2, section: "Version notice" } }),
    ],
    atoms: [
      executableAtom(),
      {
        atomId: "reaction.timing.display",
        atomVersion: "1.0.0",
        clauseIds: ["rulebook:reaction:timing"],
        disposition: "display_only",
        title: "Reaction timing retained for historical display",
        reasonCode: "executor_not_implemented",
      },
      {
        atomId: "terrain.vector.review",
        atomVersion: "1.0.0",
        clauseIds: ["rulebook:terrain:vector-gap"],
        disposition: "review_required",
        title: "Terrain vector requires primary-source geometry review",
        reasonCode: "source_geometry_unresolved",
      },
      {
        atomId: "legacy.obsolete.quarantine",
        atomVersion: "1.0.0",
        clauseIds: ["rulebook:legacy:obsolete"],
        disposition: "quarantined",
        title: "Obsolete historical clause",
        reasonCode: "superseded_source_version",
      },
    ],
    executorManifest: [
      {
        executorId: "authority.move-path",
        executorVersion: "2.0.0",
        actionTypes: ["move-path"],
        transitionSchema: "starcraft_tmg_transition_receipt_v2",
      },
    ],
  };
}

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const catalogue = createRuleAtomCatalogue(baseInput());
const verification = verifyRuleAtomCatalogue(catalogue);

check("schema_and_content_identity", () => {
  assert.equal(catalogue.schema, RULE_ATOM_CATALOGUE_SCHEMA);
  assert.match(catalogue.catalogueHash, /^[a-f0-9]{64}$/);
  assert.equal(verification.catalogueHash, catalogue.catalogueHash);
});

check("zero_unclassified_source_clauses", () => {
  assert.equal(verification.counts.sourceClauses, 4);
  assert.equal(verification.counts.unclassifiedClauses, 0);
  assert.deepEqual(verification.unclassifiedClauseIds, []);
});

check("all_four_dispositions_are_stable", () => {
  assert.deepEqual(verification.counts.byDisposition, {
    executable: 1,
    display_only: 1,
    review_required: 1,
    quarantined: 1,
  });
});

check("executable_atom_has_complete_typed_contract", () => {
  assert.equal(verification.executableContractGaps.length, 0);
  assert.equal(verification.evidenceGaps.length, 0);
});

check("non_executable_atoms_cannot_expose_authority", () => {
  const tampered = baseInput();
  tampered.atoms[1].legalSpace = { kind: "finite", actionType: "react" };
  assert.throws(() => createRuleAtomCatalogue(tampered), /non_executable_authority_forbidden/);
});

check("unknown_or_duplicate_clause_mapping_fails_closed", () => {
  const unknown = baseInput();
  unknown.atoms[1].clauseIds = ["rulebook:missing"];
  assert.throws(() => createRuleAtomCatalogue(unknown), /unknown_source_clause/);
  const duplicate = baseInput();
  duplicate.atoms[1].clauseIds = ["rulebook:movement:path"];
  assert.throws(() => createRuleAtomCatalogue(duplicate), /source_clause_mapped_more_than_once/);
});

check("official_clause_requires_hash_and_page_section_locator", () => {
  const noHash = baseInput();
  noHash.sourceClauses[0].textHash = "";
  assert.throws(() => createRuleAtomCatalogue(noHash), /invalid_clause_text_hash/);
  const noPage = baseInput();
  noPage.sourceClauses[0].locator = { section: "Movement" };
  assert.throws(() => createRuleAtomCatalogue(noPage), /official_clause_locator_incomplete/);
});

check("executor_manifest_must_match_atom_effect", () => {
  const missing = baseInput();
  missing.executorManifest = [];
  assert.throws(() => createRuleAtomCatalogue(missing), /executor_not_registered/);
  const mismatch = baseInput();
  mismatch.executorManifest[0].transitionSchema = "wrong";
  assert.throws(() => createRuleAtomCatalogue(mismatch), /executor_transition_schema_mismatch/);
});

check("atom_dependency_graph_is_acyclic", () => {
  const cycle = baseInput();
  cycle.atoms[0].dependencies.atomIds = ["movement.path.within-speed"];
  assert.throws(() => createRuleAtomCatalogue(cycle), /rule_atom_dependency_cycle/);
});

check("source_drift_quarantines_execution_without_silent_compatibility", () => {
  assert.throws(
    () => resolveExecutableRuleAtoms(catalogue, {
      rulesVersion: "starcraft-tmg-rules-v1",
      sourceSnapshotHashes: { "official-rulebook-en-v1": SHA_C },
      executorVersions: { "authority.move-path": "2.0.0" },
    }),
    /source_snapshot_hash_mismatch/,
  );
});

check("rules_or_executor_drift_quarantines_execution", () => {
  assert.throws(
    () => resolveExecutableRuleAtoms(catalogue, {
      rulesVersion: "latest",
      sourceSnapshotHashes: { "official-rulebook-en-v1": SHA_A },
      executorVersions: { "authority.move-path": "2.0.0" },
    }),
    /rules_version_mismatch/,
  );
  assert.throws(
    () => resolveExecutableRuleAtoms(catalogue, {
      rulesVersion: "starcraft-tmg-rules-v1",
      sourceSnapshotHashes: { "official-rulebook-en-v1": SHA_A },
      executorVersions: { "authority.move-path": "latest" },
    }),
    /executor_version_mismatch/,
  );
});

check("exact_frozen_dependencies_resolve_only_executable_atoms", () => {
  const resolved = resolveExecutableRuleAtoms(catalogue, {
    rulesVersion: "starcraft-tmg-rules-v1",
    sourceSnapshotHashes: { "official-rulebook-en-v1": SHA_A },
    executorVersions: { "authority.move-path": "2.0.0" },
  });
  assert.deepEqual(resolved.atomIds, ["movement.path.within-speed"]);
  assert.equal(resolved.trainingTruth, false);
});

check("historical_non_executable_rules_remain_displayable", () => {
  assert.deepEqual(
    catalogue.atoms.filter((atom) => atom.disposition !== "executable").map((atom) => atom.title),
    [
      "Obsolete historical clause",
      "Reaction timing retained for historical display",
      "Terrain vector requires primary-source geometry review",
    ],
  );
});

check("ctx2skill_round_receipt_is_complete_and_non_promoting", () => {
  assert.deepEqual(verification.ctx2skill, {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: 6,
    crossTimeReplayResult: "contract_fixture_passed",
    promotions: [],
    blocks: ["official_source_denominator_not_bound"],
    remainingRuleGaps: 3,
  });
});

check("catalogue_order_and_hash_are_input_order_independent", () => {
  const reordered = baseInput();
  reordered.atoms.reverse();
  reordered.sourceClauses.reverse();
  reordered.executorManifest.reverse();
  reordered.sourceSnapshots.reverse();
  assert.equal(createRuleAtomCatalogue(reordered).catalogueHash, catalogue.catalogueHash);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_rule_atom_contract_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  catalogueHash: catalogue.catalogueHash,
  verification,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "contract-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) process.exitCode = 1;
