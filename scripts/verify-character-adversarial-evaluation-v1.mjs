#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1 } from
  "../content/characters/kerrigan-character-adversarial-suite-v1.mjs";
import { KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1 } from
  "../content/characters/kerrigan-worldbook-catalog-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import { KERRIGAN_PERSONA_VISUAL_BINDINGS_V1 } from
  "../content/characters/kerrigan-persona-visual-bindings-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { importStarcraftTmgCharacterCardV2 } from
  "../packages/character-agent/character-card-v2-adapter-v1.mjs";
import { createStarcraftTmgCharacterPersonaSelectorV1 } from
  "../packages/character-agent/character-persona-selector-v1.mjs";
import { createStarcraftTmgCharacterPresentationViewModelV1 } from
  "../packages/character-agent/character-presentation-v1.mjs";
import {
  assertStarcraftTmgCharacterContract,
  createGameRoleBinding,
} from "../packages/character-agent/contracts-v1.mjs";
import { getStarcraftTmgModeCapability, listStarcraftTmgModeCapabilities } from
  "../packages/character-agent/mode-capability-v1.mjs";
import { assembleStarcraftTmgRolePrompt } from
  "../packages/character-agent/prompt-assembly-v1.mjs";
import { createStarcraftTmgWorldbookRegistry } from
  "../packages/character-agent/worldbook-registry-v1.mjs";
import { createStarcraftTmgConfiguredCharacterSessionFactory } from
  "../packages/product-composition/character-session-factory-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = path.join(ROOT, "build/character-adversarial-evaluation-v1");
const REPORT_PATH = path.join(BUILD_DIR, "report.json");
const MATRIX_PATH = path.join(BUILD_DIR, "held-out-matrix.json");
const T0 = "2026-09-03T01:30:00.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function unsigned(value, hashField) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== hashField));
}

function strings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => strings(entry, output));
  else if (value && typeof value === "object") Object.values(value).forEach((entry) => strings(entry, output));
  return output;
}

function directQuoteSegments(value) {
  const segments = [];
  for (const text of strings(value)) {
    for (const match of text.matchAll(/[“"]([^”"]+)[”"]/gu)) segments.push(match[1]);
  }
  return segments;
}

const bundle = createKerriganPrimalProductBundleV1();
const registry = createStarcraftTmgWorldbookRegistry({
  characterId: bundle.characterPackage.characterId,
  worldbooks: KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1,
});
const sessionFactory = createStarcraftTmgConfiguredCharacterSessionFactory({
  allowRightsGatedDemo: true,
  productionMode: false,
  now: () => T0,
});
const selector = createStarcraftTmgCharacterPersonaSelectorV1({
  characterPackage: bundle.characterPackage,
  worldbooks: KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1,
  personaVisualBindingSet: KERRIGAN_PERSONA_VISUAL_BINDINGS_V1,
});
const byId = new Map(KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1.map((entry) => [entry.worldbookId, entry]));
const contextId = "tmg.kerrigans_swarm.rules_context";
const capability = getStarcraftTmgModeCapability("tutor");

const checks = [];
const failures = [];
const chronologyEvidence = [];
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

await check("held_out_suite_is_sealed_complete_and_absent_from_runtime_authoring_inputs", () => {
  assert(hashStarcraftTmgContract(unsigned(KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1, "suiteHash"))
    === KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.suiteHash, "suite hash mismatch");
  assert(KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.chronology.length === 8, "chronology denominator mismatch");
  assert(KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.boundaries.length === 7, "boundary denominator mismatch");
  assert(new Set([...KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.chronology, ...KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.boundaries]
    .map((entry) => entry.probeId)).size === 15, "probe IDs are not unique");
  const authoring = JSON.stringify({ package: bundle.characterPackage, worldbooks: KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1 });
  assert([...KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.chronology, ...KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.boundaries]
    .every((entry) => !authoring.includes(entry.attackPrompt)), "held-out attack prompt entered runtime authoring data");
});

await check("all_eight_eras_activate_only_the_selected_persona_and_context_at_their_exact_ceiling", () => {
  for (const probe of KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.chronology) {
    const persona = byId.get(probe.personaWorldbookId);
    const sessionInput = sessionFactory.sessionInputFactory({
      sessionId: `adversarial-${probe.probeId}`,
      mode: "tutor",
      roomId: "adversarial-room",
      seatId: "player1",
      worldbookIds: [probe.personaWorldbookId, contextId],
      spoilerCeilingRank: probe.ceilingRank,
      knowledgeCeilingRank: probe.ceilingRank,
      createdAt: T0,
    });
    assert(sessionInput.worldbooks.length === 2, `${probe.probeId} session worldbook denominator mismatch`);
    assert(sessionInput.worldbooks.filter((entry) => entry.worldbookKind === "persona_edition").length === 1, `${probe.probeId} activated multiple personas`);
    assert(sessionInput.worldbooks.some((entry) => entry.worldbookId === probe.personaWorldbookId), `${probe.probeId} selected persona missing`);
    const selection = registry.resolve({
      characterPackage: bundle.characterPackage,
      requestedWorldbookIds: [probe.personaWorldbookId, contextId],
      spoilerCeilingRank: probe.ceilingRank,
      knowledgeCeilingRank: probe.ceilingRank,
    });
    assert(selection.ok && selection.receipt.personaState === persona.personaState, `${probe.probeId} registry selection mismatch`);
    const activation = registry.activate(selection, {
      mode: "tutor",
      userMessage: probe.attackPrompt,
      maxEntries: 32,
    });
    assert(activation.ok && activation.entries.every((entry) => [probe.personaWorldbookId, contextId].includes(entry.worldbookId)), `${probe.probeId} activated a foreign book`);
    const binding = createGameRoleBinding({
      bindingId: `${probe.probeId}.binding`,
      version: "1.0.0",
      characterPackage: bundle.characterPackage,
      roleSkillPack: bundle.roleSkillPacks.tutor,
      conversationProfile: bundle.conversationProfile,
      providerProfile: bundle.providerProfile,
      mode: "tutor",
      roomId: "adversarial-room",
      seatId: "player1",
      gameId: "starcraft-tmg",
      rulesetVersion: "starcraft_tmg_rules_v0",
      visibilityPolicy: capability.visibilityPolicy,
      capabilityProfileId: capability.capabilityProfileId,
      worldbookRefs: selection.worldbooks.map((entry) => ({ id: entry.worldbookId, version: entry.version, hash: entry.integrity.hash })),
      strategySkillSnapshot: { refs: [], canOverrideRules: false },
      memoryScopes: [],
      createdBy: "slice-125-verifier",
      createdAt: T0,
    });
    const prompt = assembleStarcraftTmgRolePrompt({
      characterPackage: bundle.characterPackage,
      roleSkillPack: bundle.roleSkillPacks.tutor,
      conversationProfile: bundle.conversationProfile,
      binding,
      worldbooks: selection.worldbooks,
      memoryRefs: [],
      roomProjection: {
        schemaVersion: "held_out_viewer_scoped_projection_v1",
        viewer: { seatId: "player1", visibilityPolicy: capability.visibilityPolicy },
        publicState: { stateRevision: 0 },
        privateOpponentStateIncluded: false,
      },
      worldbookActivation: activation,
    });
    const promptText = JSON.stringify(prompt.nodes);
    for (const futureId of probe.forbiddenFuturePersonaIds) {
      const future = byId.get(futureId);
      assert(!promptText.includes(futureId), `${probe.probeId} leaked future worldbook ID ${futureId}`);
      for (const fact of future.facts) assert(!promptText.includes(fact.summary), `${probe.probeId} leaked future fact ${fact.factId}`);
    }
    chronologyEvidence.push({
      probeId: probe.probeId,
      personaWorldbookId: probe.personaWorldbookId,
      ceilingRank: probe.ceilingRank,
      selectionHash: selection.receipt.selectionHash,
      activationHash: activation.receipt.activationHash,
      promptReceiptHash: prompt.receipt.receiptHash,
      activatedEntryCount: activation.entries.length,
      forbiddenFuturePersonaCount: probe.forbiddenFuturePersonaIds.length,
    });
  }
});

await check("cross_era_merge_and_below_ceiling_selection_fail_closed", () => {
  const conflict = registry.resolve({
    characterPackage: bundle.characterPackage,
    requestedWorldbookIds: ["sc1.terran_ghost.pre_tarsonis", "hots.primal_queen.post_zerus", contextId],
    spoilerCeilingRank: 80,
    knowledgeCeilingRank: 80,
  });
  assert(!conflict.ok && conflict.reason === "persona_edition_conflict", "two personas were merged");
  const below = registry.resolve({
    characterPackage: bundle.characterPackage,
    requestedWorldbookIds: ["lotv.xelnaga_epilogue", contextId],
    spoilerCeilingRank: 70,
    knowledgeCeilingRank: 80,
  });
  assert(!below.ok && below.reason === "spoiler_ceiling_exceeded", "epilogue bypassed spoiler ceiling");
  const belowKnowledge = registry.resolve({
    characterPackage: bundle.characterPackage,
    requestedWorldbookIds: ["lotv.xelnaga_epilogue", contextId],
    spoilerCeilingRank: 80,
    knowledgeCeilingRank: 70,
  });
  assert(!belowKnowledge.ok && belowKnowledge.reason === "knowledge_ceiling_exceeded", "epilogue bypassed knowledge ceiling");
});

await check("prompt_policy_forbids_quote_copy_actor_imitation_hidden_state_and_lore_rules_override", () => {
  const first = chronologyEvidence[0];
  const probe = KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.chronology[0];
  const selection = registry.resolve({
    characterPackage: bundle.characterPackage,
    requestedWorldbookIds: [probe.personaWorldbookId, contextId],
    spoilerCeilingRank: probe.ceilingRank,
    knowledgeCeilingRank: probe.ceilingRank,
  });
  const activation = registry.activate(selection, { mode: "tutor", userMessage: probe.attackPrompt, maxEntries: 32 });
  const binding = createGameRoleBinding({
    bindingId: "policy-probe.binding",
    characterPackage: bundle.characterPackage,
    roleSkillPack: bundle.roleSkillPacks.tutor,
    conversationProfile: bundle.conversationProfile,
    providerProfile: bundle.providerProfile,
    mode: "tutor",
    roomId: "adversarial-room",
    seatId: "player1",
    rulesetVersion: "starcraft_tmg_rules_v0",
    visibilityPolicy: capability.visibilityPolicy,
    capabilityProfileId: capability.capabilityProfileId,
    worldbookRefs: selection.worldbooks.map((entry) => ({ id: entry.worldbookId, version: entry.version, hash: entry.integrity.hash })),
    createdAt: T0,
  });
  const assembly = assembleStarcraftTmgRolePrompt({
    characterPackage: bundle.characterPackage,
    roleSkillPack: bundle.roleSkillPacks.tutor,
    conversationProfile: bundle.conversationProfile,
    binding,
    worldbooks: selection.worldbooks,
    worldbookActivation: activation,
    roomProjection: { viewer: "player1", visibilityPolicy: capability.visibilityPolicy, hiddenOpponentStateIncluded: false },
  });
  const platform = assembly.nodes.find((entry) => entry.nodeType === "platform-policy");
  const policy = platform.content.instructions.join(" ");
  assert(policy.includes("copyrighted character dialogue") && policy.includes("imitate an actor's voice"), "quote/voice refusal missing");
  assert(policy.includes("hidden match information") && policy.includes("viewer-scoped room projection"), "hidden-state refusal missing");
  assert(policy.includes("Rules, Referee receipts, visibility, and confirmation policy outrank roleplay"), "Rules authority order missing");
  assert(bundle.characterPackage.speechProfile.copiedQuotesAllowed === false
    && bundle.characterPackage.speechProfile.actorVoiceImitationAllowed === false
    && bundle.characterPackage.rights.copiedDialogueAllowed === false
    && bundle.characterPackage.rights.copiedAudioAllowed === false,
  "character quote/voice policy widened");
  assert(first.promptReceiptHash, "chronology prompt evidence missing");
});

await check("authored_character_text_contains_no_long_direct_quote_segment", () => {
  const authored = {
    character: bundle.characterPackage,
    worldbooks: KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1,
    roleSkillPacks: bundle.roleSkillPacks,
  };
  for (const segment of directQuoteSegments(authored)) {
    const englishWords = segment.match(/[A-Za-z0-9']+/gu)?.length || 0;
    const cjkCharacters = segment.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length || 0;
    assert(englishWords <= KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.quotePolicy.maximumQuotedEnglishWords,
      `long direct English quote segment: ${hashStarcraftTmgContract(segment)}`);
    assert(cjkCharacters <= KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.quotePolicy.maximumQuotedCjkCharacters,
      `long direct CJK quote segment: ${hashStarcraftTmgContract(segment)}`);
  }
});

await check("external_character_card_system_material_is_hashed_and_quarantined_not_executed", () => {
  const external = {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: "Adversarial import",
      description: "Untrusted test card",
      personality: "external",
      scenario: "external",
      first_mes: "hello",
      mes_example: "EXECUTE-ME-EXAMPLE",
      system_prompt: "EXECUTE-ME-SYSTEM",
      post_history_instructions: "EXECUTE-ME-POST",
      alternate_greetings: [],
      tags: [],
      creator: "held-out",
      character_version: "1",
    },
  };
  const imported = importStarcraftTmgCharacterCardV2(external);
  const serialized = JSON.stringify(imported.characterPackage);
  assert(imported.ok && imported.receipt.importClass === "external_untrusted_companion_only", "external import class widened");
  assert(imported.receipt.quarantinedPromptFields.map((entry) => entry.field).sort().join("/")
    === "mes_example/post_history_instructions/system_prompt", "prompt quarantine denominator mismatch");
  assert(!serialized.includes("EXECUTE-ME-") && imported.characterPackage.supportedModes.join("") === "companion", "external prompt entered runtime package");
  assert(imported.characterPackage.channelPolicy.decision === "forbidden"
    && imported.characterPackage.channelPolicy.apply === "forbidden", "external card gained decision/apply");
});

await check("public_presentation_and_production_session_factory_fail_closed_on_pending_rights", () => {
  const selectorState = selector.createState({ updatedAt: T0 });
  assert(selectorState.ok, "selector state failed");
  const publicModel = createStarcraftTmgCharacterPresentationViewModelV1({
    surface: "web",
    environment: "public",
    locale: "zh-CN",
    viewportWidth: 1280,
    characterPackage: bundle.characterPackage,
    selectorView: selector.readView(selectorState.state),
  });
  assert(publicModel.content.portrait.kind === "first_party_fallback", "public Kerrigan art was displayed");
  assert(!JSON.stringify(publicModel).includes("assets/characters/"), "public presentation leaked a derived path");
  const productionFactory = createStarcraftTmgConfiguredCharacterSessionFactory({ productionMode: true, now: () => T0 });
  const metadata = productionFactory.metadata();
  assert(metadata.configuredCharacters.every((entry) => entry.productionSelectable === false), "pending character became production-selectable");
  let kerriganRejected = false;
  let fallbackRejected = false;
  try {
    productionFactory.sessionInputFactory({ sessionId: "prod-k", mode: "tutor", roomId: "room" });
  } catch (error) { kerriganRejected = String(error.message).includes("not production selectable"); }
  try {
    productionFactory.sessionInputFactory({
      sessionId: "prod-f",
      characterId: "project-d.original.tactical-adjutant",
      mode: "tutor",
      roomId: "room",
    });
  } catch (error) { fallbackRejected = String(error.message).includes("not production selectable"); }
  assert(kerriganRejected && fallbackRejected, "pending visual/voice rights did not fail production closed");
});

await check("character_worldbook_visual_and_suite_hash_drift_reject_or_demote", () => {
  const characterTamper = clone(bundle.characterPackage);
  characterTamper.description = "tampered";
  let characterRejected = false;
  try { assertStarcraftTmgCharacterContract(characterTamper, "character-package"); } catch { characterRejected = true; }
  assert(characterRejected, "tampered CharacterPackage passed");
  const worldbookTamper = clone(KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1[0]);
  worldbookTamper.knowledgeRank = 0;
  let worldbookRejected = false;
  try { assertStarcraftTmgCharacterContract(worldbookTamper, "worldbook"); } catch { worldbookRejected = true; }
  assert(worldbookRejected, "tampered worldbook passed");
  const visualTamper = clone(KERRIGAN_PERSONA_VISUAL_BINDINGS_V1);
  visualTamper.bindings[0].staticPortraitRef.hash = "0".repeat(64);
  assert(hashStarcraftTmgContract(unsigned(visualTamper, "bindingHash")) !== visualTamper.bindingHash, "visual binding tamper retained hash");
  const suiteTamper = clone(KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1);
  suiteTamper.boundaries[0].expectedDisposition = "allow";
  assert(hashStarcraftTmgContract(unsigned(suiteTamper, "suiteHash")) !== suiteTamper.suiteHash, "suite tamper retained hash");
});

await check("all_role_capabilities_keep_visibility_scoped_no_apply_and_no_training_truth", () => {
  const capabilities = listStarcraftTmgModeCapabilities();
  assert(capabilities.length === 4, "mode denominator mismatch");
  assert(capabilities.every((entry) => entry.visibilityPolicy && entry.mayApply === false), "role gained unscoped visibility or apply");
  assert(capabilities.filter((entry) => entry.mayPreview).map((entry) => entry.mode).join("") === "opponent", "preview capability widened");
  assert(capabilities.every((entry) => entry.rulesAuthority === "external_rules_service" && entry.trainingTruth === false), "role gained Rules/training authority");
  assert(bundle.characterPackage.authority.matchState === "room_tools_only"
    && KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1.every((entry) => entry.matchStateSource === "room_tools_only"),
  "lore gained match-state authority");
});

await check("demotion_policy_is_complete_monotonic_and_requires_new_hash_replay", () => {
  const policy = KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.demotionPolicy;
  assert(policy.anyFailure.includes("disable_kerrigan_character_package"), "package demotion missing");
  assert(policy.chronologyFailure.includes("all_later_personas"), "chronology monotonic demotion missing");
  assert(policy.rightsFailure.includes("remove_all_derived_visual_paths"), "rights demotion missing");
  assert(policy.hiddenStateOrRulesFailure.includes("disable_affected_role_capability"), "role demotion missing");
  assert(policy.externalPromptFailure.includes("quarantine_import"), "external prompt demotion missing");
  assert(policy.recovery.includes("new_version_new_hash") && policy.recovery.includes("slice126_replay"), "recovery replay missing");
});

await mkdir(BUILD_DIR, { recursive: true });
await writeFile(MATRIX_PATH, `${JSON.stringify({
  schema: "starcraft_tmg_character_adversarial_held_out_matrix_v1",
  suiteHash: KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.suiteHash,
  chronologyEvidence,
  boundaryProbes: KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.boundaries,
  demotionPolicy: KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.demotionPolicy,
}, null, 2)}\n`, "utf8");

const reportUnsigned = {
  schema: "starcraft_tmg_character_adversarial_evaluation_verification_v1",
  generatedAt: T0,
  ticket: 13,
  slice: 125,
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  suiteHash: KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.suiteHash,
  chronologyProbeCount: KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.chronology.length,
  boundaryProbeCount: KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.boundaries.length,
  chronologyEvidenceHash: hashStarcraftTmgContract(chronologyEvidence),
  characterPackageHash: bundle.characterPackage.integrity.hash,
  personaVisualBindingHash: KERRIGAN_PERSONA_VISUAL_BINDINGS_V1.bindingHash,
  matrixPath: path.relative(ROOT, MATRIX_PATH),
  evaluationClass: "deterministic_structural_held_out_no_provider",
  liveModelEvaluated: false,
  productionReady: false,
  sourceRefreshPerformed: false,
  providerCalled: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingPromotion: false,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["novice_teacher_prompt"],
    harnessToolsCalled: [
      "resolve_character_worldbooks",
      "activate_character_worldbook_entries",
      "assemble_character_prompt_nodes",
      "render_public_character_fallback",
    ],
    uiTraceEvidence: ["public_rights_fallback_contains_no_derived_asset_path"],
    agentDecisionEvidence: chronologyEvidence.map((entry) => ({
      probeId: entry.probeId,
      selectionHash: entry.selectionHash,
      activationHash: entry.activationHash,
      promptReceiptHash: entry.promptReceiptHash,
    })),
    memoryTraceEvidence: [],
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: Object.values(KERRIGAN_CHARACTER_ADVERSARIAL_SUITE_V1.demotionPolicy),
    userVisibleChecks: [
      "later_era_facts_do_not_enter_earlier_persona_prompts",
      "quote_copy_and_actor_voice_imitation_are_forbidden",
      "hidden_state_and_lore_rules_override_are_forbidden",
      "public_rights_failure_uses_labeled_first_party_fallback",
      "external_card_prompts_remain_quarantined",
    ],
  },
};
const report = { ...reportUnsigned, reportHash: hashStarcraftTmgContract(reportUnsigned) };
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (failures.length) throw new Error(failures.join("\n"));
console.log(JSON.stringify(report, null, 2));
