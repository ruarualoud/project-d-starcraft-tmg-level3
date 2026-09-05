import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createIndependentConditionDrillsV1 } from '../packages/skill-evaluation/independent-condition-drills-v1.mjs';
import { createSourceAuditProbesV3 } from '../packages/skill-evaluation/source-audit-probes-v3.mjs';
import { createSupplementalSourceProbesV1 } from '../packages/skill-evaluation/supplemental-source-probes-v1.mjs';
import { createGuideRepairFeedbackV1 } from '../packages/skill-evaluation/guide-local-repair-v1.mjs';
import { verifySeal, fail } from '../packages/skill-production/common.mjs';

export async function loadGuideRepairInputsV1(root, parentRunId, { verifyParent = true } = {}) {
  if (!/^(guided-rules|guide-repair)-[a-f0-9]{20}$/.test(parentRunId)) fail('GUIDE_REPAIR_PARENT_ID_INVALID');
  const base = path.join(root, 'build/ticket-18-production-v3');
  const json = async (run, name) => verifySeal(JSON.parse(await readFile(path.join(base, run, name + '.json'), 'utf8')));
  const parent = await json(parentRunId, 'recipe'), parentReport = await json(parentRunId, 'report');
  const evaluation = await json(parentRunId, 'actual-guided-evaluation');
  const original = parentRunId.startsWith('guided-rules-');
  if (parent.version !== (original ? 'guided_overall_rules_evaluation_v1' : 'guide_local_repair_and_evaluation_v1')
    || parentRunId !== (original ? 'guided-rules-' : 'guide-repair-') + parent.hash.slice(0, 20)
    || parentReport.recipeHash !== parent.hash || parentReport.resultHash !== evaluation.hash
    || parentReport.failure && parentReport.failure.code !== 'GUIDED_RULES_EVALUATION_NOT_PASSED'
    || evaluation.passed || parentReport.passed || (parent.revision ?? 0) >= 3) fail('GUIDE_REPAIR_PARENT_NOT_ELIGIBLE');
  const baseRunId = original ? (await json(parent.parentRunId, 'recipe')).parentRunId : parent.baseRunId;
  if (!/^overall-repair-[a-f0-9]{20}$/.test(baseRunId)) fail('GUIDE_REPAIR_BASE_ID_INVALID');
  const teacher = original ? await json(parent.parentRunId, 'actual-answer-review') : await json(parentRunId, 'actual-guide-repair');
  const candidate = await json(baseRunId, 'overall-rules-candidate');
  const catalogue = await loadFrozenSkillEvidence(root), reader = createEvidenceReader(catalogue), context = createGlobalProductionContext(catalogue);
  const originalDrills = await createProductionDrills(catalogue), legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
  const independentDrills = await createIndependentConditionDrillsV1({ catalogue, originalDrills, legacyDrills });
  const sourceProbes = createSourceAuditProbesV3({ catalogue, reader }), supplemental = createSupplementalSourceProbesV1({ catalogue, reader });
  if (parent.candidateHash !== candidate.hash || parent.contextHash !== context.hash
    || parent.independentManifestHash !== independentDrills.manifest.hash) fail('GUIDE_REPAIR_FROZEN_DEPENDENCY_DRIFT');
  let parentEvidence = null;
  if (verifyParent) {
    const script = original ? 'inspect-ticket-18-guided-rules-evidence-v1.mjs' : 'inspect-ticket-18-guide-local-repair-evidence-v1.mjs';
    const result = await promisify(execFile)(process.execPath, [path.join(root, 'scripts', script), parentRunId],
      { cwd: root, timeout: 240000, maxBuffer: 64 * 1024 });
    parentEvidence = JSON.parse(result.stdout.trim());
    if (!parentEvidence.evidenceVerified || parentEvidence.qualityPassed) fail('GUIDE_REPAIR_PARENT_EVIDENCE_INVALID');
  }
  const feedback = createGuideRepairFeedbackV1({ candidate, teacher, evaluation, catalogue, originalDrills, legacyDrills });
  return { base, baseRunId, parent, parentReport, parentEvidence, candidate, teacher, evaluation, catalogue, context,
    originalDrills, legacyDrills, independentDrills, sourceProbes, supplemental, feedback };
}
