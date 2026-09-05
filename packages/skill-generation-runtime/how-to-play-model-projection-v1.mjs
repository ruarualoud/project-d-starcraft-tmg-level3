import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgSkillGenerationCredentialFree,
} from "../skill-generation/contracts-v1.mjs";
import {
  verifyCurrentOfficialSkillStagedInputV1,
} from "./current-official-evidence-v1.mjs";

export const STARCRAFT_TMG_HOW_TO_PLAY_MODEL_PROJECTION_VERSION =
  "starcraft_tmg_how_to_play_model_projection_v1";

const HASH = /^[a-f0-9]{64}$/u;
const EXPECTED_SKILL_ID = "skill.starcraft-tmg.how-to-play";
const EXPECTED_TASK_ID = "how_to_play:production:complete-rules";

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

function assertFullInput(value) {
  verifyCurrentOfficialSkillStagedInputV1(value);
  const evidence = value.evidence?.[0];
  const content = evidence?.content;
  if (value.task?.taskId !== EXPECTED_TASK_ID
    || value.task?.subjectId !== EXPECTED_SKILL_ID
    || value.evidence?.length !== 1
    || evidence?.kind !== "current_rule_index"
    || content?.skillId !== EXPECTED_SKILL_ID
    || !Array.isArray(content?.chapters)
    || content.chapters.length !== content.counts?.chapters
    || content.chapters.some((chapter) => !Array.isArray(chapter.entries)
      || !HASH.test(String(chapter.chapterHash || "")))) {
    throw new TypeError("How-to-Play full staged input is invalid");
  }
  return { evidence, content };
}

function chapterProjection(chapter) {
  const entryCommitmentRows = chapter.entries.map((entry) => ({
    evidenceId: entry.evidenceId,
    atomId: entry.atomId,
    contentHash: entry.contentHash,
    locatorHash: entry.locatorHash,
    rulesReceiptHash: entry.rulesReceiptHash,
    generationEligible: entry.generationEligible,
  }));
  return freeze({
    chapterId: chapter.chapterId,
    totalRuleAtoms: chapter.totalRuleAtoms,
    executableRuleAtoms: chapter.executableRuleAtoms,
    displayOnlyRuleAtoms: chapter.displayOnlyRuleAtoms,
    fullChapterHash: chapter.chapterHash,
    entryCommitmentHash: hashStarcraftTmgContract(entryCommitmentRows),
    fullEntriesAvailableOnlyByHostRetrieval: true,
  });
}

export function createStarcraftTmgHowToPlayModelProjectionV1(stagedInput) {
  const { evidence, content } = assertFullInput(stagedInput);
  const projectionBody = {
    schemaVersion: STARCRAFT_TMG_HOW_TO_PLAY_MODEL_PROJECTION_VERSION,
    gameId: stagedInput.gameId,
    task: clone(stagedInput.task),
    currentBinding: clone(stagedInput.bindings),
    hostEvidenceCommitment: {
      fullStagedInputHash: stagedInput.stagedInputHash,
      evidenceId: evidence.evidenceId,
      fullEvidenceContentHash: evidence.contentHash,
      fullEvidenceLocatorHash: evidence.locator.locatorHash,
      fullRuleEvidenceSetHash: evidence.locator.fullRuleEvidenceSetHash,
      currentRulesReceiptHash: evidence.rulesReceipt.receiptHash,
    },
    evidence: [{
      evidenceId: evidence.evidenceId,
      kind: "current_rule_index_model_projection",
      ruleLayer: evidence.ruleLayer,
      disposition: evidence.disposition,
      generationEligible: evidence.generationEligible,
      skillId: content.skillId,
      counts: clone(content.counts),
      retrievalContract: clone(content.retrievalContract),
      chapters: content.chapters.map(chapterProjection),
      fullRuleEntriesIncludedInModelPrompt: false,
      fullRuleEntriesRetrievalOwner: "trusted_host_by_evidence_id_only",
      rulesAuthority: "authoritative_rules_service_only",
      trainingTruth: false,
    }],
    projectionPolicy: {
      purpose: "route_to_exact_host_retrieval_without_repeating_full_index",
      modelMayInferMissingRuleText: false,
      modelMayTreatChapterSummaryAsRuleTruth: false,
      modelMayRequestFullAtomByEvidenceId: true,
      hostMustVerifyContentLocatorAndRulesReceiptHashes: true,
      sourceRefreshPerformed: false,
    },
    candidateAuthority: "unreviewed_only",
    trainingTruth: false,
  };
  const projection = envelope(projectionBody, "projectionHash");
  assertStarcraftTmgSkillGenerationCredentialFree(
    projection,
    "How-to-Play model projection",
  );
  return projection;
}

export function verifyStarcraftTmgHowToPlayModelProjectionV1(
  value,
  stagedInput,
) {
  if (!object(value) || !HASH.test(String(value.projectionHash || ""))) {
    throw new TypeError("How-to-Play model projection identity is invalid");
  }
  const expected = createStarcraftTmgHowToPlayModelProjectionV1(stagedInput);
  if (hashStarcraftTmgContract(value) !== hashStarcraftTmgContract(expected)
    || value.projectionHash !== expected.projectionHash
    || value.hostEvidenceCommitment.fullStagedInputHash
      !== stagedInput.stagedInputHash
    || value.evidence[0].chapters.length !== 10
    || value.evidence[0].counts.totalRuleAtoms !== 1_163
    || value.evidence[0].counts.executableRuleAtoms !== 1_049
    || value.evidence[0].counts.displayOnlyRuleAtoms !== 114
    || value.evidence[0].fullRuleEntriesIncludedInModelPrompt !== false
    || value.evidence[0].chapters.some((chapter) => (
      !HASH.test(chapter.fullChapterHash)
        || !HASH.test(chapter.entryCommitmentHash)
        || Object.hasOwn(chapter, "entries")
    ))) {
    throw new TypeError("How-to-Play model projection drifted");
  }
  assertStarcraftTmgSkillGenerationCredentialFree(
    value,
    "How-to-Play model projection",
  );
  return true;
}
