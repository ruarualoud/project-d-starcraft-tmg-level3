#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1 } from
  "../content/characters/ticket-13-character-package-handoff-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT, "build/ticket-13-closure-v1/report.json");
const T0 = "2026-09-03T02:30:00.000Z";
const PATHS = Object.freeze({
  slice119: "build/character-visual-asset-plan-v1/report.json",
  slice120: "build/character-visual-assets-v2/report.json",
  slice121: "build/kerrigan-dynamic-dialogue-portrait-v1/report.json",
  slice122: "build/character-card-v2-png-v2/report.json",
  slice123: "build/character-persona-selector-v1/report.json",
  slice124: "build/character-presentation-v1/report.json",
  slice125: "build/character-adversarial-evaluation-v1/report.json",
  roleAgent: "build/kerrigan-role-agent-v1/report.json",
  worldbook: "build/character-worldbook-v1/report.json",
  rulesTransition: "build/authoritative-transition-v1/report.json",
  room: "build/authoritative-room-v1/report.json",
  provider: "build/direct-provider-v1/report.json",
});
const BASE_DENOMINATORS = Object.freeze({
  slice119: 10,
  slice120: 11,
  slice121: 11,
  slice122: 12,
  slice123: 13,
  slice124: 12,
  slice125: 10,
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.includes(key)));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function load(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

function verifyReportHash(report) {
  return report.reportHash === hashStarcraftTmgContract(without(report, ["reportHash"]));
}

function safeAdjacentHash(report) {
  return hashStarcraftTmgContract({
    schemaVersion: report.schemaVersion,
    ok: report.ok,
    checks: report.checks.map((entry) => ({ id: entry.id, ok: entry.ok })),
    failures: report.failures,
  });
}

const reports = Object.fromEntries(await Promise.all(Object.entries(PATHS)
  .map(async ([key, relativePath]) => [key, await load(relativePath)])));
const checks = [];
const failures = [];
async function check(id, fn) {
  try {
    await fn();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

await check("all_seven_implementation_slices_pass_fixed_79_assertion_denominator", () => {
  for (const [key, denominator] of Object.entries(BASE_DENOMINATORS)) {
    const report = reports[key];
    assert(report.status === "passed", `${key} status mismatch`);
    assert(report.assertionsPassed === denominator && report.assertionsTotal === denominator,
      `${key} denominator mismatch`);
    assert(report.failures.length === 0 && verifyReportHash(report), `${key} report hash mismatch`);
  }
  assert(Object.values(BASE_DENOMINATORS).reduce((sum, value) => sum + value, 0) === 79,
    "base assertion denominator drift");
});

await check("character_package_worldbook_visual_selector_and_presentation_hashes_cross_bind", () => {
  const frozen = STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.frozenIdentities;
  for (const report of [reports.slice122, reports.slice123, reports.slice124, reports.slice125]) {
    assert(report.characterPackageHash === frozen.characterPackageHash, "CharacterPackage cross-slice drift");
  }
  assert(reports.roleAgent.evidence.characterPackageHash === frozen.characterPackageHash, "role Agent package drift");
  assert(reports.worldbook.evidence.characterPackageHash === frozen.characterPackageHash, "worldbook package drift");
  assert(reports.slice123.catalogueHash === frozen.personaCatalogueHash, "selector catalogue drift");
  assert(reports.slice123.personaVisualBindingHash === frozen.personaVisualBindingHash, "selector visual binding drift");
  assert(reports.slice125.personaVisualBindingHash === frozen.personaVisualBindingHash, "adversarial visual binding drift");
  assert(reports.slice121.manifestHash === frozen.dynamicPortraitManifestHash, "dynamic manifest drift");
  assert(reports.slice124.dynamicManifestHash === frozen.dynamicPortraitManifestHash, "presentation dynamic manifest drift");
  assert(reports.slice124.sharedContentHash === frozen.sharedPresentationContentHash, "presentation content drift");
  assert(reports.slice125.suiteHash === frozen.adversarialSuiteHash, "adversarial suite drift");
});

await check("historical_json_adapter_and_explicit_png_v2_replay_without_silent_upgrade", async () => {
  const source = await readFile(path.join(ROOT, "packages/character-agent/character-card-v2-adapter-v1.mjs"));
  const frozen = STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.frozenIdentities;
  assert(sha256(source) === frozen.historicalJsonAdapterSourceHash, "historical JSON Adapter source drift");
  assert(reports.slice122.standardBindingHash === frozen.pngStandardBindingHash, "PNG standard binding drift");
  assert(reports.slice122.checks.find((entry) => entry.id
    === "legacy_json_v1_is_frozen_while_v2_png_is_explicitly_versioned")?.passed,
  "old/new Adapter replay gate missing");
  assert(reports.slice122.checks.find((entry) => entry.id
    === "json_to_png_to_json_and_png_reembedding_are_byte_exact")?.passed,
  "Project D PNG exact replay gate missing");
});

await check("all_eight_eras_have_static_anchors_and_only_primal_claims_dynamic_capability", () => {
  assert(reports.slice123.currentPersonaCount === 8, "persona denominator drift");
  assert(reports.slice123.currentProducedPersonaVisualCount === 8
    && reports.slice123.currentStaticPersonaVisualCount === 8, "static era visual denominator drift");
  assert(reports.slice123.currentDynamicPersonaVisualCount === 1, "dynamic persona denominator drift");
  assert(reports.slice124.personaCount === 8, "presentation persona denominator drift");
});

await check("chronology_quote_hidden_state_external_prompt_and_demotion_gates_replay", () => {
  assert(reports.slice125.chronologyProbeCount === 8 && reports.slice125.boundaryProbeCount === 7,
    "adversarial probe denominator drift");
  for (const id of [
    "all_eight_eras_activate_only_the_selected_persona_and_context_at_their_exact_ceiling",
    "prompt_policy_forbids_quote_copy_actor_imitation_hidden_state_and_lore_rules_override",
    "external_character_card_system_material_is_hashed_and_quarantined_not_executed",
    "demotion_policy_is_complete_monotonic_and_requires_new_hash_replay",
  ]) assert(reports.slice125.checks.find((entry) => entry.id === id)?.passed, `missing adversarial gate ${id}`);
});

await check("public_and_production_paths_fail_closed_on_unresolved_visual_rights", () => {
  assert(reports.slice120.publicReleaseReady === false && reports.slice121.publicReleaseReady === false,
    "generated visual rights widened");
  assert(reports.slice122.publicReleaseReady === false && reports.slice123.publicReleaseReady === false,
    "card or selector rights widened");
  assert(reports.slice124.productionReady === false && reports.slice125.productionReady === false,
    "presentation or adversarial production claim widened");
  assert(reports.worldbook.evidence.rightsGatePassed === false
    && reports.roleAgent.evidence.rightsGatePassed === false, "session rights gate widened");
});

await check("ticket_reports_and_handoff_contain_no_credential_material", () => {
  const serialized = JSON.stringify({ reports, handoff: STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1 });
  assert(!/Bearer\s+[A-Za-z0-9]/u.test(serialized), "Bearer credential leaked into evidence");
  assert(!/\bsk-[A-Za-z0-9]{8,}|provider-secret-|vault:\/\//u.test(serialized), "credential material leaked into evidence");
  assert(reports.provider.evidence.apiKeyPersisted === false && reports.provider.evidence.internalRetries === 0,
    "Provider credential or retry boundary widened");
});

await check("adjacent_rules_room_provider_role_and_worldbook_gates_pass_without_authority_widening", () => {
  for (const [key, denominator] of [["rulesTransition", 7], ["room", 7], ["provider", 5], ["roleAgent", 9], ["worldbook", 8]]) {
    const report = reports[key];
    assert((report.ok === true) && report.failures.length === 0 && report.checks.length === denominator,
      `${key} adjacent gate mismatch`);
  }
  assert(reports.rulesTransition.evidence.trainingTruth === false, "Rules entered training truth");
  assert(reports.room.evidence.trainingTruth === false && reports.room.evidence.eligibleForTraining === false,
    "room entered training truth");
  assert(reports.provider.evidence.providerEvidence === "injected_fetch_only_not_live_provider"
    && reports.provider.evidence.productionReady === false, "Provider evidence was overclaimed");
  assert(reports.roleAgent.evidence.directProviderEvidence
    === "injected_fake_transport_only_not_real_provider", "role Agent evidence was overclaimed");
});

await check("ticket_14_mount_handoff_is_explicit_and_keeps_board_rules_and_credentials_out", () => {
  const handoff = STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.ticket14MountInterface;
  assert(handoff.owner === "ticket-14-web-app-client" && handoff.consumes.length === 3,
    "Ticket14 consume denominator mismatch");
  assert(handoff.mustProduce.includes("actual_app_shell_mount_and_native_device_evidence"),
    "Ticket14 native evidence missing");
  assert(handoff.cannotOwn.includes("rules_legality") && handoff.cannotOwn.includes("provider_credentials"),
    "Ticket14 authority boundary widened");
  assert(reports.slice124.frameworkMounted === false, "Ticket13 falsely claimed framework mount");
});

await check("ticket_15_online_agent_handoff_requires_byok_live_receipt_visibility_and_confirmation", () => {
  const handoff = STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.ticket15OnlineAgentInterface;
  assert(handoff.owner === "ticket-15-online-agent-session" && handoff.consumes.length === 2,
    "Ticket15 consume denominator mismatch");
  for (const requirement of [
    "explicit_per_session_byok_consent_and_detach",
    "credential_isolation_and_no_persistence_evidence",
    "live_provider_model_and_version_receipt_when_user_authorizes_a_call",
    "viewer_scoped_room_projection_and_human_confirmed_opponent_apply",
  ]) assert(handoff.mustProduce.includes(requirement), `Ticket15 missing ${requirement}`);
  assert(handoff.cannotOwn.includes("skill_generation_or_dsh")
    && handoff.cannotOwn.includes("hidden_opponent_state"), "Ticket15 authority boundary widened");
});

await check("handoff_is_hash_sealed_and_preserves_later_skill_dsh_muzero_boundaries", () => {
  const { handoffHash, ...unsigned } = STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1;
  assert(hashStarcraftTmgContract(unsigned) === handoffHash, "handoff hash mismatch");
  const later = STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.laterTicketBoundaries;
  assert(later.skillGenerationStartsAtTicket === 17 && later.dshMayRunOnlyForSkillGeneration === true,
    "Skill/DSH schedule widened");
  assert(later.largeScaleSkillProductionRequiresFreshUserConfirmation === true
    && later.muzeroAndSelfPlayRemainLaterTickets === true, "later-ticket authorization widened");
});

await check("ticket_closes_without_source_refresh_live_model_skill_dsh_or_training_claim", () => {
  for (const key of Object.keys(BASE_DENOMINATORS)) {
    const report = reports[key];
    assert(report.sourceRefreshPerformed !== true, `${key} refreshed official source`);
    assert(report.skillGenerated === false && report.dshRun === false
      && report.muzeroDataGenerated === false && report.selfPlayRun === false
      && report.trainingPromotion === false, `${key} ran a later-ticket capability`);
  }
  assert(reports.slice125.liveModelEvaluated === false && reports.slice125.providerCalled === false,
    "Slice125 falsely claimed live evaluation");
  assert(STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.releaseState.productionReady === false,
    "handoff falsely claimed production readiness");
});

const baseAssertions = Object.values(BASE_DENOMINATORS).reduce((sum, value) => sum + value, 0);
const baseArtifactHashes = Object.fromEntries(Object.keys(BASE_DENOMINATORS)
  .map((key) => [key, reports[key].reportHash]));
const adjacentEvidenceHashes = Object.fromEntries(["rulesTransition", "room", "provider", "roleAgent", "worldbook"]
  .map((key) => [key, safeAdjacentHash(reports[key])]));
const productionBlocks = [
  "kerrigan_derived_visuals_require_independent_public_release_rights",
  "ticket_14_requires_actual_web_and_app_framework_mount_browser_and_device_evidence",
  "ticket_15_requires_user_authorized_live_provider_byok_smoke_and_receipt",
  "production_room_persistence_and_deployment_security_remain_later_gates",
];
const report = {
  schema: "starcraft_tmg_ticket_13_closure_verification_v1",
  generatedAt: T0,
  ticket: 13,
  slice: 126,
  status: failures.length === 0 ? "complete" : "failed",
  acceptancePassed: checks.filter((entry) => entry.passed).length,
  acceptanceTotal: checks.length,
  acceptance: checks,
  failures,
  sliceStatus: {
    planned: 8,
    complete: failures.length === 0 ? 8 : 7,
    slices: [119, 120, 121, 122, 123, 124, 125, 126],
  },
  evidenceDenominator: {
    baseSliceReports: 7,
    baseSliceAssertions: baseAssertions,
    aggregateReports: 8,
    aggregateAssertions: baseAssertions + checks.length,
    adjacentGateAssertions: 36,
  },
  frozenIdentities: {
    ...STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.frozenIdentities,
    handoffHash: STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.handoffHash,
  },
  baseArtifactHashes,
  adjacentEvidenceHashes,
  eraVisualState: {
    currentPersonas: 8,
    distinctStaticAnchors: 8,
    dynamicPersonas: 1,
    publicReleaseReady: false,
  },
  crossVersionReplay: {
    historicalJsonAdapterSource: "passed_hash_frozen",
    pngV2ExactRoundTrip: "passed",
    selectorPresentationAdversarialHashes: "passed",
  },
  handoff: {
    ticket14: STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.ticket14MountInterface.owner,
    ticket15: STARCRAFT_TMG_TICKET_13_CHARACTER_PACKAGE_HANDOFF_V1.ticket15OnlineAgentInterface.owner,
  },
  productionBlocks,
  productProjectStatusAfterClosure: {
    completedTickets: failures.length === 0 ? 13 : 12,
    totalTickets: 22,
    nextTicket: 14,
  },
  productionReady: false,
  sourceRefreshPerformed: false,
  liveModelEvaluated: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingTruth: false,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["novice_teacher_prompt", "opponent_prompt", "referee_prompt", "sparring_coach_prompt"],
    harnessToolsCalled: [
      "resolve_character_worldbooks",
      "activate_character_worldbook_entries",
      "render_character_presentation",
      "read_board_state",
      "list_legal_actions",
      "preview_action",
    ],
    uiTraceEvidence: [
      "eight_static_era_comparison",
      "shared_web_preview_and_app_native_tree",
      "public_first_party_fallback",
    ],
    agentDecisionEvidence: "deterministic_structural_held_out_no_live_provider",
    memoryTraceEvidence: [],
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: reports.slice125.harness.rollbackOrDemotionRules,
    userVisibleChecks: reports.slice125.harness.userVisibleChecks,
  },
};

report.reportHash = hashStarcraftTmgContract(report);
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
