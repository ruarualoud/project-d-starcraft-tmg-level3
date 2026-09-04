import { readFile } from "node:fs/promises";
import path from "node:path";

import { createOfficialFaqF3ReleaseV1 } from
  "../../packages/rule-atoms/official-faq-f3-movement-battlefield-deployment-release-v1.mjs";
import { createOfficialFaqF4ReleaseV1 } from
  "../../packages/rule-atoms/official-faq-f4-ability-tactical-keyword-release-v1.mjs";
import { createOfficialFaqF5AggregateReleaseV1 } from
  "../../packages/rule-atoms/official-faq-f5-aggregate-release-v1.mjs";
import { createOfficialFaqV1RuleReconciliationV1 } from
  "../../packages/rule-atoms/official-faq-v1-rule-reconciliation-v1.mjs";
import { createOfficialFaqV1SourceLockV1 } from
  "../../packages/source-data/official-faq-v1-source-lock-v1.mjs";
import {
  createCurrentOfficialSkillCurriculumV1,
  createCurrentOfficialSkillEvidenceCatalogueV1,
  createCurrentOfficialSkillQuestionTreeV1,
  createCurrentOfficialSkillStagedInputV1,
} from "../../packages/skill-generation-runtime/current-official-evidence-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./official-development-tranche-source-lock-fixture-v1.mjs";

export async function loadCurrentOfficialSkillFixtureV1(input = {}) {
  const root = path.resolve(input.root);
  const faqSourceDirectory = path.join(
    root,
    "build/source-intake/official-rules/faq-v1-2026-09-03",
  );
  const [sourceArtifacts, pdfBytes, rawText, downloadsHtml, baseReportBytes] =
    await Promise.all([
      loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root }),
      readFile(path.join(faqSourceDirectory, "StarCraft-TMG-FAQ_EN.pdf")),
      readFile(path.join(faqSourceDirectory, "StarCraft-TMG-FAQ_EN.raw.txt")),
      readFile(path.join(faqSourceDirectory, "downloads.html")),
      readFile(path.join(
        root,
        "build/ticket-11-rule-atoms-v1/official-dispute-resolution-rules-rule-slice-v1-report.json",
      )),
    ]);
  const baseReport = JSON.parse(baseReportBytes);
  const sourceLock = createOfficialFaqV1SourceLockV1({
    pdfBytes,
    rawText,
    downloadsHtml,
  });
  const shared = {
    sourceLock,
    baseCatalogue: baseReport.slice.catalogue,
    baseGraph: baseReport.graph,
    baseRuntimeHash: baseReport.runtimeHash,
  };
  const reconciliation = createOfficialFaqV1RuleReconciliationV1({
    sourceLock,
    currentCatalogue: shared.baseCatalogue,
    currentGraph: shared.baseGraph,
    currentRuntimeHash: shared.baseRuntimeHash,
  });
  const releaseInput = { ...shared, reconciliation };
  const f3Release = createOfficialFaqF3ReleaseV1(releaseInput);
  const f4Release = createOfficialFaqF4ReleaseV1({ ...releaseInput, f3Release });
  const f5 = createOfficialFaqF5AggregateReleaseV1({
    ...releaseInput,
    f3Release,
    f4Release,
  });
  const evidenceCatalogue = createCurrentOfficialSkillEvidenceCatalogueV1({
    dataset: sourceArtifacts.dataset,
    baseCatalogue: shared.baseCatalogue,
    currentRulesAggregate: f5.aggregate,
    faqAtoms: [...f3Release.atoms, ...f4Release.atoms, ...f5.f5Release.atoms],
  });
  const curriculum = createCurrentOfficialSkillCurriculumV1({ evidenceCatalogue });
  const questionTree = createCurrentOfficialSkillQuestionTreeV1({
    evidenceCatalogue,
    curriculum,
  });
  return Object.freeze({
    evidenceCatalogue,
    curriculum,
    questionTree,
    stage(taskId) {
      return createCurrentOfficialSkillStagedInputV1({
        evidenceCatalogue,
        curriculum,
        taskId,
      });
    },
  });
}
