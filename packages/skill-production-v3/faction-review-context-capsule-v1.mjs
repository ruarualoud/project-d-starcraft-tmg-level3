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
    route } = input;
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
        allowedChanges: rejectedCandidate.validation.issues.map((row) =>
          row.path),
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
      "Return the complete corrected schema object. Change only the exact validationIssues paths; every other value must remain byte-for-byte equivalent after JSON parsing.",
      "Shorten overlong reason text without changing its verdict or factual meaning. Select at most eight most direct supplied sourceSlots; do not invent or renumber slots.",
      "This is one bounded schema-instance correction, not a new review. If it cannot be done without changing another field, preserve uncertainty and still obey the exact schema.",
    ].join("\n"),
  });
}
