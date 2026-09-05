// Operational stop, not a semantic evaluator or a promotion gate. Removing this
// hold requires the replacement workflow's evidence; old paid-run flags cannot
// bypass it. Historical runners remain available for offline diagnosis.
export const STARCRAFT_TMG_SKILL_PRODUCTION_REVIEW_HOLD_V1 = Object.freeze({
  status: "paused_for_design_repair",
  code: "OFFLINE_SKILL_PRODUCTION_PAUSED_FOR_REDESIGN",
  ticket: 17,
  slice: 170,
  design: "docs/skill-production-play-evolution-redesign-2026-09-05.md",
  appliesTo: "legacy_slice_170_paid_entrypoints",
  productionReady: false,
  trainingTruth: false,
});

export function assertStarcraftTmgSkillProductionNotHeldV1() {
  const hold = STARCRAFT_TMG_SKILL_PRODUCTION_REVIEW_HOLD_V1;
  throw Object.assign(new Error(hold.code), { code: hold.code });
}
