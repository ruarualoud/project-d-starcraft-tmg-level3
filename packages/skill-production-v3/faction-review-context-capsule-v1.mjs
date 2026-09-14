import { createFactionSourceDependencyContextV1 } from
  "./faction-source-dependency-context-v1.mjs";
import { createFactionReviewTargetsV1 } from
  "./faction-review-targets-v1.mjs";
import { createStarcraftTmgContextCapsuleV1 } from
  "../structured-generation/context-capsule-v1.mjs";
import { hash, verifySeal, fail } from "../skill-production/common.mjs";

function unique(values) {
  return [...new Set(values)];
}

function sourceClass(ref) {
  return ref.startsWith("source:") ? "official_product"
    : ref.startsWith("faq-v1:") ? "official_faq" : "official_core";
}

export function createFactionReviewContextCapsuleV1(input = {}) {
  const { factionInput, section, draft, reviewIndices,
    coverageRequiredSourceRefs, targets, roleRef, outputContractRef,
    route, includeSharedScenarioSources = false } = input;
  if (typeof includeSharedScenarioSources !== 'boolean') fail('FACTION_REVIEW_SCENARIO_CONTEXT_INVALID');
  [factionInput, targets].forEach(verifySeal);
  if (!["supportive", "adversarial"].includes(route)
    || targets.hash !== createFactionReviewTargetsV1({
      input: factionInput, section, draft, indices: reviewIndices,
    }).hash
    || !Array.isArray(coverageRequiredSourceRefs)
    || coverageRequiredSourceRefs.some((ref) =>
      !section.requiredSourceRefs.includes(ref))) {
    fail("FACTION_STRUCTURED_REVIEW_CONTEXT_INVALID");
  }
  const factionRefs = unique([
    factionInput.factionEvidence.primarySource.ref,
    ...factionInput.factionEvidence.armyPool.map((row) => row.source.ref),
    ...section.requiredSourceRefs,
    ...draft.recommendations.flatMap((row) => row.sourceRefs),
    ...(includeSharedScenarioSources ? factionInput.frozenSources.prompt.sources
      .filter(source => source.ref.startsWith('source:faction_cards:mission_'))
      .map(source => source.ref) : []),
  ]);
  const relevant = createFactionSourceDependencyContextV1({
    input: factionInput,
    sourceRefs: factionRefs,
  });
  const allSources = factionInput.frozenSources.prompt.sources;
  const completeRules = allSources.filter((source) =>
    !source.ref.startsWith("source:"));
  const relevantProducts = relevant.sources.filter((source) =>
    source.ref.startsWith("source:"));
  const rulesNode = {
    ref: "context:complete-core-faq",
    kind: "complete_official_rules_corpus",
    content: { sources: completeRules },
  };
  const nodes = [{ ...rulesNode, hash: hash(rulesNode.content) },
    ...relevantProducts.map((source) => ({
      ref: source.ref,
      kind: sourceClass(source.ref),
      hash: hash(source),
      content: source,
    }))];
  const roots = nodes.map((node) => node.ref);
  const sourceCatalogue = allSources.map((source, slot) => ({
    slot, ref: source.ref, sourceHash: hash(source),
    includedAs: source.ref.startsWith("source:")
      ? relevantProducts.some((row) => row.ref === source.ref)
        ? "relevant_product_node" : "not_in_current_faction_scope"
      : "complete_core_faq_node",
  }));
  const includedSourceSlots = sourceCatalogue
    .filter((row) => row.includedAs !== "not_in_current_faction_scope")
    .map((row) => row.slot);
  const sourceIndex = factionInput.frozenSources.manifest.sourceHashes;
  return createStarcraftTmgContextCapsuleV1({
    kind: "whole_section_review_context",
    roleRef,
    outputContractRef,
    immutableBase: {
      game: "StarCraft: The Miniatures Game, not the RTS",
      sourceBinding: factionInput.sourceBinding,
      catalogueHash: factionInput.catalogueHash,
      overallDependencyHash: factionInput.overallDependencyHash,
      overallSkillHash: factionInput.overallSkill.hash,
      overallSkillBodyOmittedBecauseCompleteOfficialRulesSupplied: true,
      operationalGuide: factionInput.operationalGuide,
      completeCoreFaqIncluded: true,
      completeCurrentFactionProductsIncluded: true,
      ...(includeSharedScenarioSources ? { sharedScenarioSourcesIncluded: true } : {}),
      sourcePolicy: factionInput.frozenSources.prompt.sourcePolicy,
      usagePolicy: factionInput.frozenSources.prompt.usagePolicy,
    },
    section: {
      section,
      parentDraftHash: hash(draft),
      completeCurrentDraft: draft,
    },
    localIssue: {
      reviewTask: {
        route,
        targetContract: targets,
        targetSlots: targets.targets.map((target, slot) => ({
          slot, targetId: target.targetId, title: target.title,
          recommendationHash: target.recommendationHash,
        })),
        coverageSourceSlots: coverageRequiredSourceRefs.map((ref, slot) => ({
          slot, ref,
        })),
        sourceCatalogue,
        includedSourceSlots,
        outputRules: {
          targetSlot: "Return every supplied target slot exactly once.",
          sourceSlots: "Use only includedSourceSlots whose supplied source text supports the judgment.",
          coverageSlot: "Return every coverageSourceSlot exactly once; return [] when none are supplied.",
          focus: "Quote an exact 8-240 character substring from the selected target field, not source prose.",
        },
      },
      hostOwns: ["targetId", "title", "sourceRef", "acceptanceStatus",
        "publicationStatus"],
    },
    protectedFields: [{ path: "completeCurrentDraft", hash: hash(draft) },
      { path: "targetContract", hash: targets.hash }],
    dependencyGraph: {
      roots,
      nodes,
      edges: [],
      dependencyCatalogueComplete: true,
    },
    sourceIndexRef: {
      id: "starcraft-tmg.frozen-source-index",
      version: "v1",
      hash: hash(sourceIndex),
    },
    expansionToolRef: {
      id: "read_frozen_source_by_exact_ref",
      version: "v1",
      hash: hash("read_frozen_source_by_exact_ref-v1"),
    },
    omittedDomains: [{
      id: "other-faction-products",
      reason: "Products outside the current faction are not evidence for this faction-only section; all Core/FAQ and all current-faction products are present.",
      expansionRoute: "stop_as_uncertain_do_not_guess",
    }],
    instructions: [
      `Act as the ${route} independent source reviewer for one complete faction section.`,
      "Rules and supplied frozen source text outrank candidate wording. Structured shape is not semantic acceptance.",
      "Review every supplied target and every field, including timing, cost, exceptions, arithmetic and conditional strategy scope.",
      "Return only the declared schema. Use host slots exactly as supplied; never invent an ID, source, slot or control field.",
      "Every focus quote must be copied exactly from the selected target field. If evidence is insufficient, use uncertain rather than guessing.",
      "Coverage describes only coverageSourceSlots. Do not claim strategy effectiveness, publication, runtime acceptance or training truth.",
    ].join("\n"),
  });
}

export function createFactionReviewSchemaRepairContextCapsuleV1(input = {}) {
  const { capsule, rejectedCandidate, roleRef } = input;
  [capsule, rejectedCandidate].forEach(verifySeal);
  if (capsule.kind !== "whole_section_review_context"
    || rejectedCandidate.outputContractRef.hash
      !== capsule.outputContractRef.hash
    || rejectedCandidate.contextManifestRef.hash !== capsule.hash
    || rejectedCandidate.validation.valueHash
      !== hash(rejectedCandidate.providerValue)
    || !Array.isArray(rejectedCandidate.validation.issues)
    || !rejectedCandidate.validation.issues.length) {
    fail("FACTION_STRUCTURED_REVIEW_SCHEMA_REPAIR_CONTEXT_INVALID");
  }
  return createStarcraftTmgContextCapsuleV1({
    kind: "whole_section_review_context",
    roleRef,
    outputContractRef: capsule.outputContractRef,
    immutableBase: capsule.immutableBase,
    section: capsule.section,
    localIssue: {
      ...capsule.localIssue,
      schemaRepair: {
        rejectedCandidateHash: rejectedCandidate.hash,
        providerValue: rejectedCandidate.providerValue,
        validationIssues: rejectedCandidate.validation.issues,
        allowedChanges: [...new Set(rejectedCandidate.validation.issues
          .map((row) => row.path))],
        policy: "change_only_exact_invalid_paths_preserve_every_other_value",
      },
    },
    protectedFields: [...capsule.protectedFields,
      { path: "schemaRepair.rejectedCandidate",
        hash: rejectedCandidate.hash }],
    dependencyGraph: capsule.dependencyGraph,
    sourceIndexRef: capsule.sourceIndexRef,
    expansionToolRef: capsule.expansionToolRef,
    omittedDomains: capsule.omittedDomains,
    instructions: [
      capsule.instructions,
      "The prior value was valid JSON but failed the listed local schema constraints.",
      `Exact machine constraints: ${JSON.stringify(
        rejectedCandidate.validation.issues)}.`,
      "Return the complete corrected schema object. Change only the exact validationIssues paths; every other value must remain byte-for-byte equivalent after JSON parsing.",
      "For length/cardinality failures, obey the listed actualLength/actualItems and maxLength/maxItems exactly. Delete fields marked additional_property_forbidden. Shorten overlong reason text without changing its verdict or factual meaning. Select at most eight most direct supplied sourceSlots; do not invent or renumber slots.",
      "This is one bounded schema-instance correction, not a new review. If it cannot be done without changing another field, preserve uncertainty and still obey the exact schema.",
    ].join("\n"),
  });
}

export function createFactionReviewHostContractRepairContextCapsuleV1(input = {}) {
  const { capsule, rejectedCandidate, roleRef, repairScope } = input;
  [capsule, rejectedCandidate, repairScope].forEach(verifySeal);
  if (capsule.kind !== 'whole_section_review_context'
    || rejectedCandidate.outputContractRef.hash !== capsule.outputContractRef.hash
    || rejectedCandidate.contextManifestRef.hash !== capsule.hash
    || repairScope.route !== 'full_output'
    || !['incomplete_target_slot_set', 'incomplete_coverage_slot_set'].includes(repairScope.reasonCode)
    || !roleRef?.id || !roleRef?.version || !roleRef?.hash) {
    fail('FACTION_STRUCTURED_REVIEW_HOST_CONTRACT_REPAIR_CONTEXT_INVALID');
  }
  return createStarcraftTmgContextCapsuleV1({
    kind: 'whole_section_review_context', roleRef,
    outputContractRef: capsule.outputContractRef,
    immutableBase: capsule.immutableBase, section: capsule.section,
    localIssue: { ...capsule.localIssue, hostContractRepair: {
      rejectedCandidateHash: rejectedCandidate.hash,
      providerValue: rejectedCandidate.providerValue,
      validationIssues: rejectedCandidate.validation.issues,
      repairScope,
      policy: 'complete_coordinate_sets_before_leaf_field_repair',
    } },
    protectedFields: [...capsule.protectedFields,
      { path: 'hostContractRepair.rejectedCandidate', hash: rejectedCandidate.hash }],
    dependencyGraph: capsule.dependencyGraph,
    sourceIndexRef: capsule.sourceIndexRef,
    expansionToolRef: capsule.expansionToolRef,
    omittedDomains: capsule.omittedDomains,
    instructions: [
      capsule.instructions,
      'The prior complete-object response cannot be repaired by replacing leaf field values because its Host-owned coordinate row set is incomplete, duplicated, or out of range.',
      `Return every targetSlot from 0 through ${repairScope.targetCount - 1} exactly once and every coverageSlot from 0 through ${repairScope.coverageCount - 1} exactly once.`,
      'Return one fresh complete review object from the supplied frozen chapter and sources. Preserve still-supported prior judgments where possible, but do not omit a required coordinate merely to preserve the prior object.',
      'This is a bounded complete-object Host-contract correction. Do not claim semantic acceptance, strategy effectiveness, runtime acceptance, or training truth.',
    ].join('\n'),
  });
}

export function createFactionReviewOutputCapRecoveryContextCapsuleV1(
  input = {}) {
  const { capsule, roleRef, originIssueRef } = input;
  verifySeal(capsule);
  if (capsule.kind !== "whole_section_review_context"
    || !roleRef?.id || !roleRef?.version || !roleRef?.hash
    || originIssueRef?.class !== "output_incomplete"
    || !/^[a-f0-9]{64}$/u.test(originIssueRef?.hash || "")) {
    fail("FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_RECOVERY_CONTEXT_INVALID");
  }
  return createStarcraftTmgContextCapsuleV1({
    kind: "whole_section_review_context",
    roleRef,
    outputContractRef: capsule.outputContractRef,
    immutableBase: capsule.immutableBase,
    section: capsule.section,
    localIssue: {
      ...capsule.localIssue,
      outputCapRecovery: {
        originIssueHash: originIssueRef.hash,
        originClass: originIssueRef.class,
        reason: "max_output_tokens",
        maximumFocusRowsPerTarget: 4,
        maximumReasonCharacters: 600,
        maximumSourceSlotsPerTarget: 4,
        policy:
          "same_semantic_review_once_with_explicit_compact_output_no_partial_continuation",
      },
    },
    protectedFields: [...capsule.protectedFields,
      { path: "outputCapRecovery.originIssueHash",
        hash: originIssueRef.hash }],
    dependencyGraph: capsule.dependencyGraph,
    sourceIndexRef: capsule.sourceIndexRef,
    expansionToolRef: capsule.expansionToolRef,
    omittedDomains: capsule.omittedDomains,
    instructions: [
      capsule.instructions,
      "The prior complete-task response reached the exact provider output ceiling and was rejected without preserving partial prose.",
      "Repeat the same complete semantic review exactly once; this is not permission to omit any supplied targetSlot or coverageSlot.",
      "For each target return at most four decisive focus rows, at most four direct sourceSlots, and one reason no longer than 600 characters.",
      "For each coverage row return one reason no longer than 600 characters. Prefer precise source-bound conclusions over background explanation.",
      "Do not continue, quote, infer from, or claim acceptance of the rejected partial response. Return one complete schema object from scratch.",
    ].join("\n"),
  });
}
