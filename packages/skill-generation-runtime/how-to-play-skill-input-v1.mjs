import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCurrentOfficialSkillStagedInputV1 } from
  "./current-official-evidence-v1.mjs";
import { verifyStarcraftTmgProductionSkillCatalogueV1 } from
  "./production-skill-catalogue-v1.mjs";

export const STARCRAFT_TMG_HOW_TO_PLAY_SKILL_INPUT_VERSION =
  "starcraft_tmg_how_to_play_skill_input_v1";

const HASH = /^[a-f0-9]{64}$/u;
const CHAPTERS = Object.freeze([
  ["mission_scoring_victory", /mission|scor|victory|objective|control|game.?end/iu],
  ["setup_army_building", /army|roster|faction|slot|upgrade|composition|draft|pre.?game/iu],
  ["movement_deployment", /movement|\bmove\b|run|deploy|placement|\bplace\b|disengage|respawn|summon|coherency|displacement/iu],
  ["assault_charge", /assault|charge|impact/iu],
  ["combat_damage", /combat|attack|weapon|\bhit\b|damage|armou?r|evade|surge|\brange\b/iu],
  ["terrain_los_engagement", /terrain|line.?of.?sight|\blos\b|elevation|cover|conceal|engag|ground|flying|hidden|burrowed/iu],
  ["abilities_cards_resources", /abilit|reaction|passive|active|resource|card|mineral|vespene|biomass|psionic/iu],
  ["units_status_tokens", /unit|model|token|marker|status|casualt|supply|structure/iu],
  ["round_phase_priority", /round|initiative|priority|phase|activation|\bhold\b|\bpass\b|cleanup/iu],
  ["exceptions_and_disputes", /.*/u],
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function envelope(body, field) {
  return freeze({ ...body, [field]: hashStarcraftTmgContract(body) });
}

function searchable(row) {
  return JSON.stringify({
    atomId: row.atomId,
    title: row.content?.title,
    primitive: row.content?.primitive,
    behaviorKey: row.content?.behaviorKey,
    timingPhase: row.content?.timing?.phase,
    timingWindow: row.content?.timing?.window,
    actionType: row.content?.legalSpace?.actionType,
    executorId: row.content?.effect?.executorId,
  });
}

function chapterId(row) {
  const value = searchable(row);
  return CHAPTERS.find(([, pattern]) => pattern.test(value))[0];
}

function indexEntry(row) {
  return freeze({
    evidenceId: row.evidenceId,
    atomId: row.atomId,
    label: String(row.content?.title || row.content?.primitive || row.atomId),
    disposition: row.disposition,
    generationEligible: row.generationEligible,
    ruleLayer: row.ruleLayer,
    contentHash: row.contentHash,
    locatorHash: row.locator.locatorHash,
    rulesReceiptHash: row.rulesReceipt.receiptHash,
    timingPhase: row.content?.timing?.phase || null,
    actionType: row.content?.legalSpace?.actionType || null,
    executorId: row.content?.effect?.executorId
      || row.content?.execution?.kernel || null,
  });
}

export function createStarcraftTmgHowToPlaySkillStagedInputV1(input = {}) {
  const { evidenceCatalogue, curriculum, productionCatalogue } = input;
  verifyStarcraftTmgProductionSkillCatalogueV1(productionCatalogue, {
    evidenceCatalogue,
    curriculum,
  });
  const rulesSkill = productionCatalogue.skills.find((skill) => (
    skill.skillId === "skill.starcraft-tmg.how-to-play"
  ));
  if (!rulesSkill) throw new TypeError("How-to-Play production Skill is missing");
  const grouped = new Map(CHAPTERS.map(([id]) => [id, []]));
  for (const row of evidenceCatalogue.ruleEvidence) {
    grouped.get(chapterId(row)).push(indexEntry(row));
  }
  const chapters = CHAPTERS.map(([id]) => {
    const entries = grouped.get(id)
      .sort((left, right) => left.atomId.localeCompare(right.atomId));
    return envelope({
      chapterId: id,
      totalRuleAtoms: entries.length,
      executableRuleAtoms: entries.filter((row) => row.generationEligible).length,
      displayOnlyRuleAtoms: entries.filter((row) => !row.generationEligible).length,
      entries,
    }, "chapterHash");
  });
  const indexContent = {
    schemaVersion: `${STARCRAFT_TMG_HOW_TO_PLAY_SKILL_INPUT_VERSION}.index`,
    skillId: rulesSkill.skillId,
    productionCatalogueHash: productionCatalogue.catalogueHash,
    currentRulesReceiptHash: evidenceCatalogue.rulesBinding.receiptHash,
    counts: {
      chapters: chapters.length,
      totalRuleAtoms: evidenceCatalogue.counts.ruleEvidence,
      executableRuleAtoms: evidenceCatalogue.counts.generationEligibleRules,
      displayOnlyRuleAtoms: evidenceCatalogue.counts.ruleByDisposition.display_only,
    },
    retrievalContract: {
      selectChapterBeforeRuleAtoms: true,
      retrieveFullCurrentAtomByEvidenceId: true,
      callAuthoritativeRulesForLegalSpaceAndTransitions: true,
      displayOnlyAtomsMayExplainHistoryButCannotSeedCurrentClaims: true,
      indexSummaryIsNotRulesAuthority: true,
    },
    chapters,
  };
  const fullRuleEvidenceSetHash = hashStarcraftTmgContract(
    evidenceCatalogue.ruleEvidence.map((row) => ({
      evidenceId: row.evidenceId,
      contentHash: row.contentHash,
      locatorHash: row.locator.locatorHash,
      rulesReceiptHash: row.rulesReceipt.receiptHash,
    })),
  );
  const locator = envelope({
    kind: "current_rules_hierarchical_index",
    evidenceCatalogueHash: evidenceCatalogue.catalogueHash,
    curriculumHash: curriculum.curriculumHash,
    productionCatalogueHash: productionCatalogue.catalogueHash,
    fullRuleEvidenceSetHash,
  }, "locatorHash");
  const evidence = freeze({
    evidenceId: "rule-index:starcraft-tmg.current-complete",
    kind: "current_rule_index",
    ruleLayer: "current_faq_composite_hierarchical_index",
    disposition: "executable_index",
    generationEligible: true,
    locator,
    content: freeze(indexContent),
    contentHash: hashStarcraftTmgContract(indexContent),
    rulesReceipt: clone(evidenceCatalogue.rulesBinding),
    trainingTruth: false,
  });
  const taskBody = {
    taskId: "how_to_play:production:complete-rules",
    family: "how_to_play",
    subjectId: rulesSkill.skillId,
    label: rulesSkill.label,
    questionTemplate:
      "Build one operational How-to-Play Skill that routes every decision to the current chapter index, retrieves exact RuleAtoms on demand, and delegates legality/state transitions to the authoritative Rules service.",
    roleSequence: [
      "tutor", "student", "challenger", "reasoner", "fact_judge",
      "proposer", "generator", "cross_time_gate",
    ],
  };
  const task = freeze({ ...taskBody, taskHash: hashStarcraftTmgContract(taskBody) });
  const stagedBody = {
    schemaVersion: "starcraft_tmg_current_official_skill_staged_input_v1",
    gameId: "starcraft-tmg",
    task,
    bindings: {
      evidenceCatalogueHash: evidenceCatalogue.catalogueHash,
      curriculumHash: curriculum.curriculumHash,
      productionCatalogueHash: productionCatalogue.catalogueHash,
      source: clone(evidenceCatalogue.sourceBinding),
      rules: clone(evidenceCatalogue.rulesBinding),
    },
    evidence: [evidence],
    capabilities: {
      readStagedEvidence: true,
      emitCandidateSkillMaximum: 1,
      network: false,
      sourceRegistry: false,
      mutableRulesRuntime: false,
      room: false,
      onlineAgent: false,
      memoryWrite: false,
      skillPublish: false,
      trainingWrite: false,
    },
    sourceRefreshPerformed: false,
    candidateAuthority: "unreviewed_only",
    productionReady: false,
    trainingTruth: false,
  };
  return envelope(stagedBody, "stagedInputHash");
}

export function verifyStarcraftTmgHowToPlaySkillStagedInputV1(value, input = {}) {
  verifyCurrentOfficialSkillStagedInputV1(value);
  const { evidenceCatalogue, curriculum, productionCatalogue } = input;
  verifyStarcraftTmgProductionSkillCatalogueV1(productionCatalogue, {
    evidenceCatalogue,
    curriculum,
  });
  const index = value.evidence?.[0];
  if (value.task?.taskId !== "how_to_play:production:complete-rules"
    || value.task?.subjectId !== "skill.starcraft-tmg.how-to-play"
    || value.bindings?.productionCatalogueHash !== productionCatalogue.catalogueHash
    || value.evidence?.length !== 1
    || index?.kind !== "current_rule_index"
    || index?.rulesReceipt?.receiptHash !== evidenceCatalogue.rulesBinding.receiptHash
    || index?.content?.counts?.chapters !== CHAPTERS.length
    || index?.content?.counts?.totalRuleAtoms !== 1163
    || index?.content?.counts?.executableRuleAtoms !== 1049
    || index?.content?.counts?.displayOnlyRuleAtoms !== 114
    || !HASH.test(String(index?.contentHash || ""))) {
    throw new TypeError("How-to-Play staged input identity is invalid");
  }
  const entries = index.content.chapters.flatMap((chapter) => chapter.entries);
  if (entries.length !== 1163
    || new Set(entries.map((row) => row.evidenceId)).size !== 1163
    || index.content.chapters.some((chapter) => chapter.entries.length === 0)) {
    throw new TypeError("How-to-Play chapter denominator is invalid");
  }
  const sourceById = new Map(evidenceCatalogue.ruleEvidence.map((row) => [
    row.evidenceId,
    row,
  ]));
  for (const entry of entries) {
    const source = sourceById.get(entry.evidenceId);
    if (!source || entry.atomId !== source.atomId
      || entry.contentHash !== source.contentHash
      || entry.locatorHash !== source.locator.locatorHash
      || entry.rulesReceiptHash !== source.rulesReceipt.receiptHash
      || entry.generationEligible !== source.generationEligible) {
      throw new TypeError(`How-to-Play index entry drifted: ${entry.evidenceId}`);
    }
  }
  return true;
}
