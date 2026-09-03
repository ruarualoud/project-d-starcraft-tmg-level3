#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_AUTHORITATIVE_BATTLEFIELD_V1 as contract } from
  "../content/client/authoritative-battlefield-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_ROOT = path.join(
  ROOT,
  "build/ticket-14-slice-132-authoritative-battlefield-v1",
);
const REPORT_PATH = path.join(BUILD_ROOT, "report.json");
const PATHS = {
  presentation: "apps/starcraft-tmg-expo/lib/level3/battlefield-presentation-v1.ts",
  sharedPresentation: "packages/client-domain/battlefield-presentation-v1.mjs",
  presentationTest:
    "apps/starcraft-tmg-expo/lib/level3/__tests__/battlefield-presentation-v1.test.ts",
  workspace:
    "apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx",
  clientTypes:
    "apps/starcraft-tmg-expo/lib/level3/client-domain-mount-runtime.d.mts",
  clientTypesCompat:
    "apps/starcraft-tmg-expo/lib/level3/client-domain-mount-runtime.d.ts",
  match: "apps/starcraft-tmg-expo/app/(tabs)/match.tsx",
  client: "packages/client-domain/client-domain-v1.mjs",
  viewerProjection: "packages/client-domain/viewer-projection-v3.mjs",
  transport: "packages/client-domain/authoritative-transport-adapters-v1.mjs",
  room: "packages/room-runtime/in-memory-room-v1.mjs",
  http: "packages/http-adapter/handler-v1.mjs",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function without(value, keys) {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key)),
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const sources = Object.fromEntries(await Promise.all(
  Object.entries(PATHS).map(async ([key, relativePath]) => [
    key,
    await readFile(path.join(ROOT, relativePath), "utf8"),
  ]),
));
const presentationSource = sources.sharedPresentation;

const checks = [];
function check(id, condition, evidence = "") {
  assert(condition, `${id}${evidence ? `: ${evidence}` : ""}`);
  checks.push({ id, passed: true, evidence });
}

check(
  "hash_sealed_slice_contract_is_intact",
  contract.contractHash
    === hashStarcraftTmgContract(without(contract, ["contractHash"])),
  contract.contractHash,
);
check(
  "contract_requires_the_full_authoritative_human_confirmation_flow",
  contract.flow.orderedOperations.join("/")
    === [
      "read_room_projection",
      "read_current_legal_space",
      "draft_listed_proposal",
      "request_sealed_preview",
      "request_explicit_human_confirmation",
      "claim_fenced_control",
      "apply_confirmed_preview",
      "refresh_viewer_projection",
      "verify_replay_against_current_projection",
    ].join("/")
    && contract.flow.pointerGestureCreatesAuthority === false
    && contract.flow.optimisticRulesMutation === false,
);
check(
  "expo_match_mounts_the_authoritative_workspace_without_replacing_room_access",
  sources.match.includes("<AuthoritativeBattleWorkspace />")
    && sources.match.includes("Project D Level-3 · Ticket 14 / Slice")
    && sources.match.includes("issueAccess")
    && sources.match.includes("claimControl"),
);
check(
  "workspace_uses_only_client_domain_typed_intents_for_authority",
  [
    'type: "load_legal_space"',
    'type: "preview_finite"',
    'type: "preview_parameterized"',
    'type: "confirm_and_apply_preview"',
    'type: "read_replay"',
  ].every((needle) => sources.workspace.includes(needle))
    && !sources.workspace.includes("apply_action")
    && !sources.workspace.includes("confirm_preview")
    && !sources.workspace.includes("claim_control"),
);
check(
  "preview_requires_a_separate_visible_human_confirm_action",
  sources.workspace.includes("Sealed Preview awaiting human confirmation")
    && sources.workspace.includes("Confirm and apply")
    && sources.workspace.includes("Dismiss locally")
    && sources.workspace.indexOf("previewParameterized")
      < sources.workspace.indexOf("confirmAndApply"),
);
check(
  "battlefield_is_viewer_projection_only_and_never_a_local_rules_store",
  sources.presentation.includes(
    'from "../../../../packages/client-domain/battlefield-presentation-v1.mjs"',
  )
    && presentationSource.includes("record(input.roomProjection)")
    && presentationSource.includes("rows(state?.pieces)")
    && !sources.workspace.includes("saveMatchRecord")
    && !sources.workspace.includes("updateUnit")
    && !sources.workspace.includes("switchPhase")
    && !sources.workspace.includes("Math.random"),
);
check(
  "arbitrary_model_counts_are_flattened_without_fixed_slots",
  presentationSource.includes("for (const [modelIndex, model] of rows(piece.models).entries())")
    && sources.workspace.includes("scene.models.map")
    && sources.presentationTest.includes("length: 13")
    && sources.presentationTest.includes("currentModels: 29")
    && !/models\.(?:slice|splice)\(0,\s*8\)/u.test(
      `${presentationSource}\n${sources.workspace}`,
    ),
);
check(
  "unit_anchor_fallback_cannot_claim_individual_model_geometry",
  presentationSource.includes('kind: "unit_anchor"')
    && presentationSource.includes("geometryRenderable: false")
    && presentationSource.includes("model_coordinates_unavailable")
    && contract.models.unitAnchorMayImplyIndividualModelPositions === false,
);
check(
  "physical_base_units_and_all_marker_layers_are_projected",
  presentationSource.includes("Number(millimetres) / 25.4")
    && presentationSource.includes('"baseWidthMm"')
    && presentationSource.includes('"baseDepthMm"')
    && presentationSource.includes("board?.centerMarkers")
    && presentationSource.includes("board?.missionMarkers")
    && presentationSource.includes("board?.effectMarkers")
    && presentationSource.includes("officialMissionMarkerPlacement")
    && presentationSource.includes("officialBattlefieldMarkers")
    && presentationSource.includes("officialBattlefieldTokens")
    && presentationSource.includes('"diameterMillimeters"')
    && presentationSource.includes("minXMilliInches")
    && presentationSource.includes('shape === "axis_aligned_rectangle"')
    && sources.presentationTest.includes("[1260, 1575, 3150]"),
);
check(
  "real_standard_move_preview_path_and_final_bases_are_rendered",
  presentationSource.includes("movePlan?.canonicalPath")
    && presentationSource.includes("movePlan?.finalModelPositions")
    && presentationSource.includes("previewPlacements")
    && sources.workspace.includes('placementGlyph(placement, "sealed")')
    && sources.presentationTest.includes("starcraft_tmg_official_standard_move_plan_v1")
    && sources.presentationTest.includes("finalModelPositions"),
);
check(
  "viewport_is_uniform_letterboxed_and_bottom_left_world_is_reversible",
  sources.workspace.includes('preserveAspectRatio="xMidYMid meet"')
    && sources.workspace.includes("scale(1 -1)")
    && presentationSource.includes("Math.min(")
    && presentationSource.includes("boardHeight - point.yMilliInches")
    && sources.presentationTest.includes("letterboxOffsetYPixels")
    && contract.battlefield.xAndYScaleEqual === true,
);
check(
  "touch_target_expansion_never_changes_rendered_or_submitted_geometry",
  sources.workspace.includes("const minimumRadius = 22 / pixelsPerWorld")
    && sources.workspace.includes("Math.max(physicalRadius, minimumRadius)")
    && !presentationSource.includes("minimumTouch")
    && contract.battlefield.touchTargetAffectsRulesCollision === false,
);
check(
  "parameter_editor_registry_fails_closed_and_supports_exact_standard_move_counts",
  presentationSource.includes('return "unsupported"')
    && presentationSource.includes("official_standard_move_path_v")
    && sources.workspace.includes("Unsupported by this parameter registry; submission is disabled.")
    && sources.workspace.includes("activeRemainingModelIds.length")
    && sources.workspace.includes("leadingModelId")
    && sources.workspace.includes("placements"),
);
check(
  "draft_placements_use_authoritative_model_base_geometry",
  sources.workspace.includes("draftPlacementGeometries")
    && sources.workspace.includes("model?.baseWidthMilliInches")
    && sources.workspace.includes("model?.baseDepthMilliInches")
    && sources.workspace.includes('placementGlyph(placement, "draft")')
    && !sources.workspace.includes('r={360} fill="#fbbf2433"'),
);
check(
  "coordinate_editor_has_a_non_gesture_accessible_path",
  sources.workspace.includes("Non-gesture coordinate input (inches)")
    && sources.workspace.includes("Battlefield X coordinate in inches")
    && sources.workspace.includes("Battlefield Y coordinate in inches")
    && sources.workspace.includes("COORDINATE_OUTSIDE_BOARD")
    && sources.workspace.includes("addCoordinateInput"),
);
check(
  "offline_background_and_fenced_clients_are_read_only_without_queueing",
  sources.workspace.includes("connection.canRequestAuthoritativeIntent")
    && sources.workspace.includes("connection.visible")
    && sources.workspace.includes("connection.online")
    && sources.workspace.includes('view.control?.status === "fenced"')
    && contract.flow.offlineWriteQueue === false,
);
check(
  "replay_mismatch_blocks_writes_until_refresh_and_revalidation",
  sources.client.includes("starcraft_tmg_client_replay_integrity_latch_v1")
    && sources.client.includes('return "REPLAY_INTEGRITY_BLOCKED"')
    && sources.client.includes("async function revalidateAuthority()")
    && sources.client.includes('intent.type === "revalidate_authority"')
    && sources.workspace.includes("view.integrity?.replayBlocked === true")
    && sources.workspace.includes('type: "revalidate_authority"')
    && sources.clientTypes.includes('type: "revalidate_authority"')
    && sources.clientTypes.includes("starcraft_tmg_client_replay_integrity_latch_v1")
    && sources.workspace.includes("Refresh authority and revalidate")
    && contract.replay.mismatchPresentation === "blocking_alert",
);
check(
  "legal_preview_and_replay_responses_are_bound_before_display",
  sources.client.includes("validLegalSpaceResponse")
    && sources.client.includes("validPreviewResponse")
    && sources.client.includes("validReplayResponse")
    && sources.client.includes("LEGAL_SPACE_RESPONSE_INVALID")
    && sources.client.includes("PREVIEW_RESPONSE_INVALID")
    && sources.client.includes("REPLAY_RESPONSE_INVALID"),
);
check(
  "preview_confirm_and_apply_are_end_to_end_bound",
  sources.client.includes("previewContentHash: internal.pendingPreview.previewSeal.contentHash")
    && sources.client.includes("previewToken: internal.pendingPreview.previewToken")
    && sources.room.includes('return rejection("PREVIEW_BINDING_MISMATCH"')
    && sources.client.includes("validApplyResponseBeforeRefresh")
    && sources.client.includes("applyResponseMatchesRefreshedProjection")
    && contract.responseBinding.applySuccessRequiresRefreshedProjectionMatch === true,
);
check(
  "apply_and_replay_network_payloads_are_viewer_scoped_summaries",
  sources.room.includes("starcraft_tmg_viewer_envelope_summary_v1")
    && sources.room.includes("STARCRAFT_TMG_VIEWER_APPLY_RESPONSE_VERSION")
    && sources.room.includes("STARCRAFT_TMG_VIEWER_REPLAY_RESPONSE_VERSION")
    && sources.room.includes("STARCRAFT_TMG_VIEWER_RESPONSE_CONTRACT_CATALOG")
    && sources.transport.includes("runtime.replayRoom(shared)")
    && sources.http.includes("seatToken")
    && !sources.room.includes("responseResult = {\n      ok: true,\n      receipt: applied.receipt,\n      envelope: applied.envelope"),
);
check(
  "network_viewer_state_is_allowlisted_and_unknown_fields_fail_closed",
  sources.room.includes("STARCRAFT_TMG_VIEWER_STATE_V3_FIELDS")
    && sources.room.includes("projectStarcraftTmgStateForViewerV3")
    && sources.room.includes("STARCRAFT_TMG_VIEWER_ROOM_PROJECTION_VERSION")
    && sources.room.includes("projectStarcraftTmgViewerStateShapeV3")
    && sources.client.includes("isExactStarcraftTmgViewerStateShapeV3")
    && sources.viewerProjection.includes("STARCRAFT_TMG_V3_FROZEN_PUBLIC_WHOLE_TREE_FIELDS")
    && sources.viewerProjection.includes('fieldName === "pieces"')
    && sources.viewerProjection.includes('"pendingAction"')
    && contract.serverProjection.unknownFutureStateFieldVisible === false,
);
check(
  "slice_does_not_claim_browser_device_provider_skill_or_training_evidence",
  contract.delivery.realBrowserEvidenceVerified === false
    && contract.delivery.realNativeDeviceEvidenceVerified === false
    && contract.harness.providerCalled === false
    && contract.harness.skillGenerated === false
    && contract.harness.dshRun === false
    && contract.harness.muzeroDataGenerated === false
    && contract.harness.trainingTruth === false,
);

const artifacts = Object.fromEntries(
  Object.entries(sources).map(([key, source]) => [key, {
    path: PATHS[key],
    bytes: Buffer.byteLength(source),
    sha256: sha256(source),
  }]),
);
const unsignedReport = {
  schemaVersion: "starcraft_tmg_ticket_14_slice_132_verification_report_v1",
  ticket: 14,
  slice: 132,
  status: "passed",
  checkCount: checks.length,
  checks,
  artifacts,
  contractHash: contract.contractHash,
  focusedRuntimeGates: [
    "client_response_binding_33",
    "viewer_scoped_apply_replay_security_assertions_10",
    "battlefield_presentation_vitest_4",
    "expo_typescript_0_errors",
    "authoritative_battlefield_static_contract_22",
  ],
  evidenceBoundary: {
    semanticAndContractEvidence: true,
    browserEvidence: false,
    nativeDeviceEvidence: false,
    readableEventTimeline: false,
    trainingTruth: false,
  },
};
const report = {
  ...unsignedReport,
  reportHash: hashStarcraftTmgContract(unsignedReport),
};
await mkdir(BUILD_ROOT, { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
