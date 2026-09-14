import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { createStarcraftTmgContextCapsuleV1, verifyStarcraftTmgContextCapsuleV1 } from '../structured-generation/context-capsule-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { FACTION_PARSED_REVIEW_VALUE_BINDING_V2,
  inspectFactionReviewNarrativeCapacityV2 } from './faction-parsed-review-value-v1.mjs';

export const FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1 = seal({
  version: 'faction_review_source_expansion_v1', outputContractHash: contract.contractHash,
  trigger: 'schema_valid_output_cites_known_frozen_source_with_omitted_body',
  selection: 'exact_sourceSlots_not_prose_similarity',
  sourceReadingScopeIsNotRosterPermission: true,
  completeOriginalContextRetained: true, originalOutputRetainedAsUnqualifiedEvidence: true,
  freshWholeBatchReviewRequired: true, expansionsPerReview: 1,
  unknownSlotCanTriggerExpansion: false, sourceRefreshAllowed: false,
  originalReviewAccepted: false, runtimeAccepted: false, trainingTruth: false,
});
const binding = FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1;
const invalid = suffix => fail('FACTION_REVIEW_SOURCE_EXPANSION_' + suffix);

export function inspectFactionReviewSourceExpansionTriggerV1({ triggerOutput,
  narrativeCapacityProof = null }) {
  const strict = validateStarcraftTmgProviderJsonSchemaValueV1(
    contract.providerSchema, triggerOutput);
  if (strict.ok) return { narrativeCapacityProof: null };
  if (!narrativeCapacityProof) invalid('TRIGGER_SCHEMA');
  const supplied = verifySeal(narrativeCapacityProof);
  const expected = inspectFactionReviewNarrativeCapacityV2(triggerOutput);
  if (supplied.bindingHash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V2.hash
    || supplied.hash !== expected.hash || supplied.outputHash !== hash(triggerOutput))
    invalid('TRIGGER_NARRATIVE_CAPACITY_DRIFT');
  return { narrativeCapacityProof: supplied };
}

// Pure preparation: no journal, Provider, Keychain, DSH or acceptance authority.
// The executing/consuming adapter must independently authenticate the paid
// trigger and reconstruct the base role before using this new review context.
export function createFactionReviewSourceExpansionV1({ input, baseCapsule,
  triggerOutput, narrativeCapacityProof = null }) {
  verifySeal(input); verifySeal(input.frozenSources); verifyStarcraftTmgContextCapsuleV1(baseCapsule);
  if (baseCapsule.localIssue.sourceContextExpansion) invalid('ALREADY_EXPANDED');
  if (baseCapsule.localIssue.schemaRepair || baseCapsule.kind !== 'whole_section_review_context'
    || baseCapsule.outputContractRef.hash !== contract.contractHash
    || hash(baseCapsule.immutableBase.sourceBinding) !== hash(input.sourceBinding)
    || baseCapsule.immutableBase.catalogueHash !== input.catalogueHash
    || baseCapsule.immutableBase.overallSkillHash !== input.overallSkill.hash
    || baseCapsule.sourceIndexRef.hash !== hash(input.frozenSources.manifest.sourceHashes)) invalid('BASE_DRIFT');
  inspectFactionReviewSourceExpansionTriggerV1({ triggerOutput,
    narrativeCapacityProof });
  const sources = input.frozenSources.prompt.sources;
  const task = baseCapsule.localIssue.reviewTask, catalogue = task.sourceCatalogue;
  const nodes = baseCapsule.dependencyGraph.nodes;
  const exactSlots = (rows, field, total) => Array.isArray(rows) && rows.length === total
    && new Set(rows.map(r => r[field])).size === total
    && rows.every(r => Number.isInteger(r[field]) && r[field] >= 0 && r[field] < total);
  if (!exactSlots(triggerOutput.verdicts, 'targetSlot', task.targetSlots.length)
    || !exactSlots(triggerOutput.coverage, 'coverageSlot', task.coverageSourceSlots.length)) invalid('TARGET_SET');
  if (!Array.isArray(catalogue) || catalogue.length !== sources.length
    || catalogue.some((r, i) => r.slot !== i || r.ref !== sources[i].ref || r.sourceHash !== hash(sources[i])
      || !['not_in_current_faction_scope', 'relevant_product_node', 'complete_core_faq_node'].includes(r.includedAs))
    || hash(task.includedSourceSlots) !== hash(catalogue.filter(r => r.includedAs !== 'not_in_current_faction_scope').map(r => r.slot)))
    invalid('CATALOGUE_DRIFT');
  for (const row of catalogue.filter(r => r.ref.startsWith('source:'))) {
    const node = nodes.find(n => n.ref === row.ref);
    if (row.includedAs === 'not_in_current_faction_scope' ? Boolean(node)
      : !node || node.hash !== row.sourceHash || hash(node.content) !== row.sourceHash)
      invalid('BODY_DELIVERY_DRIFT');
  }
  const requested = new Set(triggerOutput.verdicts.flatMap(v => v.sourceSlots));
  if ([...requested].some(slot => !catalogue[slot] || catalogue[slot].slot !== slot)) invalid('UNKNOWN_SLOT');
  const expandedSources = catalogue.filter(r => requested.has(r.slot) && r.includedAs === 'not_in_current_faction_scope');
  if (!expandedSources.length) return null;
  if (expandedSources.some(r => !r.ref.startsWith('source:'))) invalid('NON_PRODUCT_GAP');
  const selected = new Set(expandedSources.map(r => r.slot));
  const additions = expandedSources.map(row => ({ ref: row.ref, kind: 'official_product',
    hash: row.sourceHash, content: sources[row.slot] }));
  const newCatalogue = catalogue.map(row => selected.has(row.slot)
    ? { ...row, includedAs: 'expanded_frozen_product_node' } : row);
  const roleId = baseCapsule.roleRef.id + '.source-context-expansion.1';
  const roleRef = { id: roleId, version: 'structured-review-v1', hash: hash(roleId + '.structured-review-v1') };
  const evidence = { bindingHash: binding.hash, baseContextHash: baseCapsule.hash,
    inputHash: input.hash, triggerOutputHash: hash(triggerOutput), triggerOutput,
    expandedSources: expandedSources.map(({ slot, ref, sourceHash }) => ({ slot, ref, sourceHash })),
    priorReviewIsUnqualifiedEvidence: true, originalSourceDeliveryRewritten: false,
    rosterPermissionGranted: false, freshWholeBatchReviewRequired: true };
  let context;
  try {
    context = createStarcraftTmgContextCapsuleV1({
      kind: baseCapsule.kind, roleRef, outputContractRef: baseCapsule.outputContractRef,
      immutableBase: baseCapsule.immutableBase, section: baseCapsule.section,
      localIssue: { ...baseCapsule.localIssue, sourceContextExpansion: evidence,
        reviewTask: { ...task, sourceCatalogue: newCatalogue,
          includedSourceSlots: newCatalogue.filter(r => r.includedAs !== 'not_in_current_faction_scope').map(r => r.slot) } },
      protectedFields: [...baseCapsule.protectedFields,
        { path: 'sourceContextExpansion.trigger', hash: hash(evidence) }],
      dependencyGraph: { ...baseCapsule.dependencyGraph,
        roots: [...baseCapsule.dependencyGraph.roots, ...additions.map(n => n.ref)], nodes: [...nodes, ...additions] },
      sourceIndexRef: baseCapsule.sourceIndexRef, expansionToolRef: baseCapsule.expansionToolRef,
      omittedDomains: baseCapsule.omittedDomains.map(domain => domain.id === 'other-faction-products'
        ? { id: domain.id,
          reason: 'Only the exact listed additional frozen product bodies have been supplied for source review. Other omitted bodies remain unavailable. Reading an opposing-faction product does not permit selecting it in this faction roster.',
          expansionRoute: 'stop_as_uncertain_do_not_guess' } : domain),
      instructions: [baseCapsule.instructions,
        'The prior output cited exact frozen source IDs whose bodies were not delivered. Their complete unchanged bodies are now supplied in the dependency closure.',
        'This is a fresh source review of the same complete draft and every supplied target, not a format-only repair. The prior judgments and reasons remain unqualified evidence; do not erase or ignore their objections.',
        'Evidence reading scope and roster eligibility are different. You may cite the added product to establish why a candidate claim is invalid; this does not make that card or unit legal for this faction. Decide eligibility from the supplied rules, faction and roster facts.',
        'Use only the updated includedSourceSlots. Do not invent source slots, assume an omitted body was read, or claim strategy/runtime acceptance. Keep unresolved source or rule claims uncertain.',
      ].join('\n'),
    });
  } catch (error) {
    if (error.message === 'Context capsule exceeds local proof budget') invalid('CAPACITY');
    throw error;
  }
  return seal({ version: 'faction_review_source_expansion_v1.preparation', bindingHash: binding.hash,
    inputHash: input.hash, baseContextHash: baseCapsule.hash, triggerOutputHash: hash(triggerOutput),
    expandedSources: evidence.expandedSources, context,
    completeOriginalContextRetained: true, originalOutputRetainedAsUnqualifiedEvidence: true,
    originalPaidContextClaimChanged: false, originalReviewAccepted: false,
    rosterPermissionGranted: false, freshWholeBatchReviewRequired: true,
    paidOriginAuthenticated: false, providerCalls: 0, sourceRefreshPerformed: false,
    runtimeAccepted: false, trainingTruth: false });
}

export function verifyFactionReviewSourceExpansionV1({ expansion, ...options }) {
  verifySeal(expansion);
  const expected = createFactionReviewSourceExpansionV1(options);
  if (!expected || expected.hash !== expansion.hash) invalid('PROOF_DRIFT');
  return expansion;
}
