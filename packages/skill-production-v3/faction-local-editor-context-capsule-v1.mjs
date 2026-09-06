import { createFactionSourceDependencyContextV1 } from
  "./faction-source-dependency-context-v1.mjs";
import { createStarcraftTmgContextCapsuleV1 } from
  "../structured-generation/context-capsule-v1.mjs";
import { hash, verifySeal, fail, seal } from "../skill-production/common.mjs";

function issueSourceRefs(issue) {
  const result = [];
  if (issue.sourceRef) result.push(issue.sourceRef);
  for (const finding of issue.findings || []) {
    if (finding.sourceRef) result.push(finding.sourceRef);
    for (const ref of finding.sourceRefs || []) result.push(ref);
  }
  return result;
}

export function isolateFactionLocalEditorIssueV1(input = {}) {
  verifySeal(input.issues);
  if (!Number.isInteger(input.issueOrdinal)
    || !input.issues.issues[input.issueOrdinal]) {
    fail("FACTION_LOCAL_ISSUE_SELECTION_INVALID");
  }
  const { hash: ignoredHash, issues: ignoredIssues,
    openIssues: ignoredOpenIssues, ...body } = input.issues;
  return seal({ ...body,
    issues: [input.issues.issues[input.issueOrdinal]],
    openIssues: 1,
    sourceIssueSetHash: input.issues.hash,
    sourceIssueOrdinal: input.issueOrdinal,
    localIssueSelectionOnly: true,
    trainingTruth: false,
  });
}

export function createFactionLocalEditorContextCapsuleV1(input = {}) {
  verifySeal(input.factionInput);
  verifySeal(input.issues);
  if (input.issues.parentHash !== hash(input.draft)
    || input.section.id !== input.issues.sectionId
    || !Number.isInteger(input.issueOrdinal)
    || !input.issues.issues[input.issueOrdinal]) {
    fail("FACTION_LOCAL_CAPSULE_INPUT_DRIFT");
  }
  const issue = input.issues.issues[input.issueOrdinal];
  const roots = [...new Set([
    ...input.section.requiredSourceRefs,
    ...input.draft.recommendations.flatMap((row) => row.sourceRefs),
    ...issueSourceRefs(issue),
  ])];
  const dependency = createFactionSourceDependencyContextV1({
    input: input.factionInput,
    sourceRefs: roots,
  });
  const nodes = dependency.sources.map((source) => ({
    ref: source.ref,
    kind: source.sourceClass || (source.ref.startsWith("source:")
      ? "official_product" : source.ref.startsWith("faq-v1:")
        ? "official_faq" : "official_core"),
    hash: hash(source),
    content: source,
  }));
  const protectedFields = input.draft.recommendations.flatMap((row, index) =>
    index === issue.index ? [] : [{ path: `recommendations.${index}`,
      hash: hash(row) }]);
  for (const row of input.additionalProtectedFields || []) {
    protectedFields.push(row);
  }
  const sourceIndex = input.factionInput.frozenSources.manifest.sourceHashes;
  return createStarcraftTmgContextCapsuleV1({
    kind: "local_proof_capsule",
    roleRef: input.roleRef,
    outputContractRef: input.outputContractRef,
    immutableBase: {
      game: "StarCraft: The Miniatures Game, not the RTS",
      sourceBinding: input.factionInput.sourceBinding,
      catalogueHash: input.factionInput.catalogueHash,
      overallDependencyHash: input.factionInput.overallDependencyHash,
      overallSkillHash: input.factionInput.overallSkill.hash,
      operationalGuideHash: input.factionInput.operationalGuide.hash,
      baseQualification: "offline_generation_qualified_not_runtime_published",
      sourcePolicy: input.factionInput.frozenSources.prompt.sourcePolicy,
      usagePolicy: input.factionInput.frozenSources.prompt.usagePolicy,
    },
    section: {
      section: input.section,
      parentDraftHash: hash(input.draft),
      completeCurrentDraft: input.draft,
    },
    localIssue: {
      issuesHash: input.issues.hash,
      issueOrdinal: input.issueOrdinal,
      issue,
      targetRecommendation: issue.index === undefined ? null
        : input.draft.recommendations[issue.index],
      hostOwns: ["index", "parentHash", "issueRoute", "replacements",
        "additions", "revision", "acceptanceStatus", "publicationStatus"],
    },
    protectedFields,
    dependencyGraph: {
      roots: dependency.roots,
      nodes,
      edges: dependency.edges,
      dependencyCatalogueComplete: dependency.dependencyCatalogueComplete,
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
    omittedDomains: [
      { id: "sources_outside_declared_dependency_closure",
        reason: `${sourceIndex.length - nodes.length} indexed sources omit full text from this local edit`,
        expansionRoute: "exact_source_ref_request" },
      { id: "heldout_evaluation_answers",
        reason: "answers are intentionally hidden from production roles",
        expansionRoute: "forbidden_for_generation" },
      { id: "strategy_effectiveness_results",
        reason: "local source repair cannot claim arena effectiveness",
        expansionRoute: "post_candidate_matched_replay" },
    ],
    instructions: [
      "Repair only the one sealed local issue using the exact closure sources.",
      "Return exactly one complete recommendation object matching the bound JSON Schema.",
      "Do not output index, parentHash, replacements, additions, revision, acceptance or publication fields.",
      "Preserve conditions, timing, costs, exceptions, alternatives, risk and uncertainty.",
      "Do not invent source IDs or claim strategy effectiveness.",
      "If the supplied closure is insufficient, keep the uncertainty explicit and do not guess; the host will route a typed context-expansion issue.",
    ].join("\n"),
  });
}
