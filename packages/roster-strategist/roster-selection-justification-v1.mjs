import { PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_V1 } from
  "./planned-preset-deepening-output-v1.mjs";
import { createStarcraftTmgOutputContractV1, outputContractRefStarcraftTmgV1 } from
  "../structured-generation/output-contract-registry-v1.mjs";
import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_SELECTION_JUSTIFICATION_POLICY_V1 = "unit_role_comparison_v1";
export const ROSTER_SELECTION_JUSTIFICATION_INSTRUCTION_V1 =
  "For every selected Unit instance, justify its actual mission task, expected "
  + "enemy or scenario, deployment timing, distinct contribution or intentional "
  + "redundancy, and ability use. Name ability, phase, exact partner Unit IDs, "
  + "range/resource/timing conditions and intended effect; explain intentional "
  + "non-use rather than inventing a combo. Compare at least one real eligible "
  + "alternative Unit/composition/upgrade package for each role: its advantage, "
  + "cost and why you decline it. Cite delivered unit-rule, Skill or tool "
  + "reference IDs for factual premises. Explain why the final combination is "
  + "preferred for this map, mission and opponent, what it sacrifices, and "
  + "which observations would invalidate that preference. Do not claim global "
  + "optimality or simulated damage from uncomputed evidence. A risky legal "
  + "strategy can be retained; Teach is not a veto. This roster and arrival "
  + "schedule are frozen ONLY for this evidence snapshot; after Teach the "
  + "selecting Agent may reopen the combination AND rechoose legal first "
  + "arrivals. A Rules-checked schedule is legal, not compulsory forever. "
  + "Snapshot freezing, prior selection and already-spent budget are NOT "
  + "strategic reasons to prefer or decline an alternative. Compare what "
  + "each alternative would actually change, including how saved resources "
  + "could be reallocated, its opportunity cost and the observation that "
  + "would make you switch. Retain the present choice only for a causal "
  + "map/mission/opponent trade-off, not because it is currently selected. "
  + "Write public arguments, not hidden chain of thought.";

const text = () => ({ type: "string", minLength: 1, maxLength: 65_536 });
const list = (items, minItems = 0) => ({ type: "array", minItems, items });
const closed = properties => ({ type: "object", properties,
  required: Object.keys(properties), additionalProperties: false });
const refs = () => list(text(), 1);
export const ROSTER_SELECTION_JUSTIFICATION_SCHEMA_V1 = closed({
  unitDecisions: list(closed({
    unitInstanceId: text(), missionTask: text(), expectedOpposition: text(),
    deploymentAndTiming: text(), distinctContribution: text(),
    abilityApplications: list(closed({
      abilityName: text(), phase: text(), partnerUnitIds: list(text()),
      conditions: text(), intendedEffect: text(), evidenceRefs: refs(),
    })),
    abilityNonUseReason: { type: "string", minLength: 0, maxLength: 65_536 },
    alternatives: list(closed({ recordKey: text(), description: text(),
      advantage: text(), disadvantage: text(), whyNotSelected: text(), evidenceRefs: refs() }), 1),
    evidenceRefs: refs(),
  }), 1),
  finalChoice: closed({ preferenceReason: text(), advantages: list(text(), 1),
    costs: list(text(), 1), failureConditions: list(text(), 1), evidenceRefs: refs() }),
});
const schema = structuredClone(PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_V1.providerSchema);
schema.properties.selectionJustification = ROSTER_SELECTION_JUSTIFICATION_SCHEMA_V1;
schema.required.push("selectionJustification");
schema.description = "Public plan for a temporarily frozen Agent candidate, with "
  + "evidence-grounded Unit roles, ability cooperation and declined alternatives. "
  + "The selecting Agent may reopen the army and arrival schedule after Teach.";
schema.properties.componentPurposes.items.properties.instanceId.description =
  "Copy the exact identity from the current Teach snapshot; do not rename a "
  + "Unit during this round. This is not a permanent list-selection restriction.";
schema.properties.resourceUtilization.properties.nearCapCandidateAvailable.description =
  "Copy the current snapshot's near-cap fact; alternatives in the justification "
  + "are strategic comparisons, not other evaluated candidates in this Teach.";
const ref = name => ({ id: `roster-selection-justification.${name}.v1`, version: "1.0.0",
  hash: hashStarcraftTmgContract(`roster-selection-justification:${name}:v1`) });
export const ROSTER_SELECTION_DEEPENING_OUTPUT_CONTRACT_V1 =
  createStarcraftTmgOutputContractV1({
    id: "ticket27.roster_selection.deepening.v1", version: "1.0.0",
    schemaName: "roster_selection_deepening_v1", providerSchema: schema,
    modelOwnedFields: Object.keys(schema.properties), hostOwnedFields: [],
    mapperRef: ref("public_output"), semanticValidatorRef: ref("evidence_coverage"),
    description: "Selection argument completeness; never a Host strategy ranking.",
  });
export const ROSTER_SELECTION_DEEPENING_OUTPUT_CONTRACT_REF_V1 =
  outputContractRefStarcraftTmgV1(ROSTER_SELECTION_DEEPENING_OUTPUT_CONTRACT_V1);

// Build evidence from the very same frozen dataset as the Rules/Builder. No
// hard-coded Hero descriptions, web refresh, heuristic strategy weights or
// invented ability eligibility. Substantive rule/claim truth is reviewed later.
export function rosterSelectionUnitRulesV1(dataset) {
  return Object.entries(dataset?.recordsByKey || {})
    .filter(([key]) => key.startsWith("army_units:"))
    .map(([recordKey, record]) => ({ referenceId: `unit-rule:${recordKey}`,
      recordKey, sourceRecordHash: record.sourceRecordHash,
      unitType: record.payload.unitType, tags: record.payload.tags,
      compositions: { small: structuredClone(record.payload.small),
        large: structuredClone(record.payload.large) },
      squadProfile: structuredClone(record.payload.squadProfile),
      stats: structuredClone(record.payload.stats),
      abilities: (record.payload.upgrades || []).map(ability => ({
        name: ability.name, phase: ability.phase, activation: ability.activation,
        description: ability.description, linkedTo: ability.linkedTo,
        costS: ability.costS, costL: ability.costL,
      })),
    }));
}

// Supporting official sources include card/faction abilities AND the general
// rules that define their terms (activation, reactions, ON CREEP, etc.). Every
// planning/Teach/revision/review consumer uses this same projection. General
// prose retains its review-required authority; it is not a Native verdict and
// cannot replace an executable legality query or an observed enemy loadout.
export function rosterSelectionSupportRulesV1(dataset) {
  const entries=Object.entries(dataset?.recordsByKey || {});
  const existing=entries
    .flatMap(([recordKey, record]) => {
      if (recordKey.startsWith('tactical_cards:')
        && record.authorityDisposition === 'official_current_product_candidate') {
        return [{referenceId:`support-rule:${recordKey}`,
          recordKey, sourceRecordHash:record.sourceRecordHash,
          rule:structuredClone(record.payload)}];
      }
      if (recordKey.startsWith('rules_sections:')
        && record.authorityDisposition === 'official_rule_prose_review_required') {
        return [{referenceId:`core-rule:${recordKey}`,
          recordKey, sourceRecordHash:record.sourceRecordHash,
          sourceAuthorityDisposition:record.authorityDisposition,
          interpretationVerified:false, rule:structuredClone(record.payload)}];
      }
      return [];
    });
  // Mission/deployment card prose belongs to the same frozen official source.
  // Append it: changing the old support ordering would renumber published
  // titles/handles in already-running products. Community cards stay excluded.
  return [...existing,...entries.flatMap(([recordKey,record])=>
    recordKey.startsWith('faction_cards:')&&record.authorityDisposition==='official_current_product_candidate'
      ?[{referenceId:`support-rule:${recordKey}`,recordKey,sourceRecordHash:record.sourceRecordHash,
        sourceAuthorityDisposition:record.authorityDisposition,interpretationVerified:false,
        rule:structuredClone(record.payload)}]:[])];
}

// Register the sources actually delivered to this comparison, not just the
// Unit/Skill/tool subset. A node name is a scoped citation, not a truth proof.
// Hash-qualified aliases resolve only to an exact hash in that sealed node;
// arbitrary strings sharing a prefix are never admitted. No paid reply or
// initial request body is rewritten for this reference-binding correction.
export function rosterSelectionPromptEvidenceV1(nodes = []) {
  const references = new Map();
  const aliases = new Map();
  const alias = (referenceId, node, sourcePath, value, sourceHash) => {
    const versions = aliases.get(referenceId) || new Map();
    versions.set(hashStarcraftTmgContract(value), { referenceId, node, sourcePath,
      sourceHash: sourceHash || hashStarcraftTmgContract(value) });
    aliases.set(referenceId, versions);
  };
  const invalid = () => { throw Object.assign(
    new Error('ROSTER_SELECTION_PROMPT_EVIDENCE_INVALID'),
    { code: 'ROSTER_SELECTION_PROMPT_EVIDENCE_INVALID' }); };
  const add = (referenceId, node, sourcePath, sourceHash = node.nodeHash) => {
    if (references.has(referenceId)) invalid();
    references.set(referenceId, { referenceId, nodeHash: node.nodeHash,
      authority: node.authority, sourcePath, sourceHash,
      sourceTruthReviewed: false, trainingTruth: false });
  };
  const hash = value => /^[a-f0-9]{64}$/.test(String(value));
  for (const node of nodes) {
    const { nodeHash, ...body } = node;
    if (!node.nodeType || !node.authority || !node.content
      || nodeHash !== hashStarcraftTmgContract(body)) invalid();
    add(node.nodeType, node, 'content');
    if (node.nodeType === 'evaluated-candidates') {
      for (const [index, candidate] of (node.content.candidates || []).entries()) {
        if (!hash(candidate.candidateHash)) invalid();
        add(`${node.nodeType}:candidateHash:${candidate.candidateHash}`, node,
          `content.candidates[${index}]`, candidate.candidateHash);
        if (typeof candidate.candidateId === 'string' && candidate.candidateId)
          alias(`${node.nodeType}:${candidate.candidateId}`, node,
            `content.candidates[${index}]`, candidate, candidate.candidateHash);
      }
    } else if (node.nodeType === 'candidate-map-access') {
      for (const [index, candidate] of (node.content.candidates || []).entries()) {
        if (!hash(candidate.receipt?.receiptHash)) invalid();
        add(`${node.nodeType}:${candidate.receipt.receiptHash}`, node,
          `content.candidates[${index}].receipt`, candidate.receipt.receiptHash);
      }
    } else {
      const sourceHash = node.nodeType === 'mission-marker-scoring-by-actor'
        ? node.content.projection?.receiptHash
        : node.nodeType === 'agent-selected-locked-arrival-schedule'
          ? node.content.schedule?.scheduleHash : null;
      if (hash(sourceHash)) add(`${node.nodeType}:${sourceHash}`, node,
        node.nodeType === 'mission-marker-scoring-by-actor'
          ? 'content.projection' : 'content.schedule', sourceHash);
    }
    // These compiled definitions really occur inside delivered Native failure
    // or query receipts. Resolve exact record IDs, not arbitrary prefixed text.
    // Repeated identical copies are one source; conflicting copies are not an
    // unambiguous alias. Model-authored nodes never register Native authority.
    if (node.nodeType === 'queried-evidence-results'
      && node.authority === 'native_receipts_with_explicit_hypothesis_scope') {
      const visit = (value, sourcePath) => {
        if (!value || typeof value !== 'object') return;
        if (value.schema === 'starcraft_tmg_native_ability_reference_v1'
          && Array.isArray(value.records)) {
          for (const [index, record] of value.records.entries()) {
            if (typeof record.recordKey === 'string' && record.recordKey
              && Array.isArray(record.definitions))
              alias(`nativeAbilityReference:${record.recordKey}`, node,
                `${sourcePath}.records[${index}]`, record);
          }
          return;
        }
        for (const [key, child] of Object.entries(value)) visit(child, `${sourcePath}.${key}`);
      };
      visit(node.content, 'content');
    }
  }
  for (const versions of aliases.values()) if (versions.size === 1) {
    const entry = [...versions.values()][0];
    add(entry.referenceId, entry.node, entry.sourcePath, entry.sourceHash);
  }
  return [...references.values()];
}

// Compare the phase identity, not the source document's English display label.
// This does not conflate Combat/Assault, widen eligibility or change the prose.
const phaseIdentity = value => typeof value === 'string'
  ? value.trim().toLowerCase().replace(/\s+phase$/u, '').replace(/\s+/gu, ' ') : null;

export function validateRosterSelectionJustificationV1({ justification,
  candidate, unitRules = [], supportRules = [], evidenceRefs = [] } = {}) {
  const findings = [];
  const finding = (path, reason, detail = {}) => findings.push({ path, reason, severity: "high", ...detail });
  const units = new Map((candidate?.units || []).map(unit => [unit.unitInstanceId, unit]));
  const records = new Map(unitRules.map(record => [record.recordKey, record]));
  const selectedCards = new Set([candidate?.factionRecordKey, ...(candidate?.tacticalCardRecordKeys || [])]);
  const support = supportRules.filter(record => selectedCards.has(record.recordKey));
  const knownRefs = new Set([...evidenceRefs, ...unitRules.map(x => x.referenceId),
    ...support.map(x => x.referenceId)]);
  const cardIdentity = value => String(value).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const supportAbility = use => {
    const matches = support.flatMap(record => (record.rule.boosts || []).filter(boost => {
      if (use.abilityName === boost.name) return true;
      const prefix = `${boost.name} (`;
      return use.abilityName.startsWith(prefix) && use.abilityName.endsWith(')')
        && cardIdentity(use.abilityName.slice(prefix.length, -1)) === cardIdentity(record.rule.name);
    }).map(boost => ({...boost, referenceId:record.referenceId, recordKey:record.recordKey,
      sourceRecordHash:record.sourceRecordHash,
      phase:/<([^<>]*\bPhase)>/iu.exec(boost.description || '')?.[1]})));
    const cited = matches.filter(ability => use.evidenceRefs?.includes(ability.referenceId));
    return cited.length === 1 ? cited[0] : matches.length === 1 ? matches[0] : null;
  };
  const cite = (refs, path) => {
    if (!Array.isArray(refs) || !refs.length) finding(path, "evidence_required");
    else for (const id of refs) if (!knownRefs.has(id)) finding(path, `unknown_reference:${id}`);
  };
  const requiredText = (value, path) => {
    if (typeof value !== "string" || !value.trim()) finding(path, "public_argument_required");
  };
  if (!justification?.unitDecisions || !justification?.finalChoice) {
    finding("selectionJustification", "unit_roles_and_alternative_comparison_required");
  } else {
    const seen = new Set();
    for (const [index, choice] of justification.unitDecisions.entries()) {
      const path = `selectionJustification.unitDecisions[${index}]`;
      const unit = units.get(choice.unitInstanceId);
      if (!unit || seen.has(choice.unitInstanceId)) finding(path, "unknown_or_duplicate_unit");
      seen.add(choice.unitInstanceId);
      for (const key of ["missionTask", "expectedOpposition", "deploymentAndTiming", "distinctContribution"])
        requiredText(choice[key], `${path}.${key}`);
      cite(choice.evidenceRefs, `${path}.evidenceRefs`);
      const ownRef = records.get(unit?.recordKey)?.referenceId;
      if (ownRef && !choice.evidenceRefs?.includes(ownRef))
        finding(`${path}.evidenceRefs`, "selected_unit_rule_reference_required");
      if (!choice.abilityApplications?.length)
        requiredText(choice.abilityNonUseReason, `${path}.abilityNonUseReason`);
      for (const [i, use] of (choice.abilityApplications || []).entries()) {
        const location = `${path}.abilityApplications[${i}]`;
        const nativeAbility = records.get(unit?.recordKey)?.abilities.find(x => x.name === use.abilityName);
        const cardAbility = nativeAbility ? null : supportAbility(use);
        const ability = nativeAbility || cardAbility;
        if (!ability) finding(location, "ability_not_in_frozen_unit_record");
        else if (ability.phase && (!phaseIdentity(use.phase) || phaseIdentity(use.phase) !== phaseIdentity(ability.phase)))
          finding(location, "phase_disagrees_with_frozen_ability");
        if (cardAbility && !use.evidenceRefs?.includes(cardAbility.referenceId))
          finding(`${location}.evidenceRefs`, 'ability_source_rule_reference_required', {
            expectedReferenceId:cardAbility.referenceId, sourceAbility:structuredClone(cardAbility),
            instruction:'This is an ability from a selected tactical/faction card, not an invented Unit ability. Preserve the intended cooperation and cite its actual source; do not delete it merely because the recipient Unit does not own the card. Target eligibility, payment and effect still require source review.' });
        for (const partner of use.partnerUnitIds || [])
          if (!units.has(partner)) finding(location, `partner_not_in_roster:${partner}`);
        requiredText(use.conditions, `${location}.conditions`);
        requiredText(use.intendedEffect, `${location}.intendedEffect`);
        cite(use.evidenceRefs, `${location}.evidenceRefs`);
        if (nativeAbility && ownRef && !use.evidenceRefs?.includes(ownRef))
          finding(`${location}.evidenceRefs`, "ability_owner_rule_reference_required");
      }
      if (!choice.alternatives?.length) finding(`${path}.alternatives`, "declined_alternative_required");
      for (const [i, alternative] of (choice.alternatives || []).entries()) {
        const location = `${path}.alternatives[${i}]`;
        if (!records.has(alternative.recordKey)) finding(location, "alternative_record_not_delivered");
        for (const key of ["description", "advantage", "disadvantage", "whyNotSelected"])
          requiredText(alternative[key], `${location}.${key}`);
        cite(alternative.evidenceRefs, `${location}.evidenceRefs`);
        const alternativeRef = records.get(alternative.recordKey)?.referenceId;
        if (alternativeRef && !alternative.evidenceRefs?.includes(alternativeRef))
          finding(`${location}.evidenceRefs`, "alternative_rule_reference_required");
      }
    }
    for (const id of units.keys()) if (!seen.has(id)) finding("selectionJustification.unitDecisions", `missing_unit:${id}`);
    const final = justification.finalChoice;
    requiredText(final.preferenceReason, "selectionJustification.finalChoice.preferenceReason");
    for (const key of ["advantages", "costs", "failureConditions"]) {
      if (!final[key]?.length) finding(`selectionJustification.finalChoice.${key}`, "comparison_tradeoff_required");
      else final[key].forEach((value, i) => requiredText(value, `selectionJustification.finalChoice.${key}[${i}]`));
    }
    cite(final.evidenceRefs, "selectionJustification.finalChoice.evidenceRefs");
  }
  if (findings.length) throw Object.assign(new Error("ROSTER_SELECTION_JUSTIFICATION_INCOMPLETE"),
    { code: "ROSTER_SELECTION_JUSTIFICATION_INCOMPLETE", details: { findings } });
  return { policyVersion: ROSTER_SELECTION_JUSTIFICATION_POLICY_V1,
    justification: structuredClone(justification), selectedUnitCount: units.size,
    coverageComplete: true, referencesResolved: true,
    sourceTruthReviewed: false, strategicSuperiorityProven: false,
    hostPreferenceWeightsApplied: false, trainingTruth: false };
}

// Literal model-owned public text, retained inside existing Plan claim paths so
// the normal source reviewer/repairer and live Plan reader see the argument.
export function projectRosterSelectionArgumentsV1(justification, purposes, summary) {
  const decisions = new Map(justification.unitDecisions.map(x => [x.unitInstanceId, x]));
  return {
    componentPurposes: purposes.map(purpose => {
      const decision = purpose.componentKind === "unit" && decisions.get(purpose.instanceId);
      return decision ? { ...purpose, publicPurposeText: purpose.publicPurposeText
        + "\nSelection argument (public model output):\n" + JSON.stringify(decision) } : purpose;
    }),
    publicSummaryText: summary + "\nFinal choice argument (public model output):\n"
      + JSON.stringify(justification.finalChoice),
  };
}

// A text-only source/quality revision updates model-owned arguments in the
// current Plan, not the original paid deepening receipt. Never display that
// old receipt's justification as if it were the current revised argument.
export function projectCurrentRosterSelectionJustificationV1(plan, retained) {
  if (!retained) return null;
  try {
    const unitDecisions = plan.componentPurposes
      .filter(p => p.componentKind === "unit").map(p => {
        const argument = JSON.parse(p.publicPurposeText.split(
          "Selection argument (public model output):\n")[1]);
        if (argument.unitInstanceId !== p.instanceId) throw Error("identity");
        return argument;
      });
    const finalChoice = JSON.parse(plan.publicSummaryText.split(
      "Final choice argument (public model output):\n")[1]);
    if (unitDecisions.length !== retained.selectedUnitCount
      || new Set(unitDecisions.map(x => x.unitInstanceId)).size !== unitDecisions.length
      || !finalChoice || typeof finalChoice.preferenceReason !== "string") {
      throw Error("coverage");
    }
    return { ...structuredClone(retained), justification: { unitDecisions, finalChoice },
      currentPlanHash: plan.planHash, argumentSource: "current_plan_public_text",
      sourceTruthReviewed: false, strategicSuperiorityProven: false };
  } catch {
    return { ...structuredClone(retained), currentPlanHash: null,
      historicalOnly: true, argumentSource: "original_deepening_receipt",
      currentArgumentsMustBeReadFromPlan: true };
  }
}
