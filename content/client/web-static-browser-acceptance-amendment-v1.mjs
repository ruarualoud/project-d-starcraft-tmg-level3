import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_WEB_STATIC_BROWSER_ACCEPTANCE_V1 } from
  "./web-static-browser-acceptance-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_web_static_browser_acceptance_amendment_v1",
  decisionId: "starcraft-tmg.ticket-14.slice-143.slice-136-compatibility-amendment.v1",
  preparedAt: "2026-09-03T21:00:00.000Z",
  previousBindingHash: STARCRAFT_TMG_WEB_STATIC_BROWSER_ACCEPTANCE_V1.bindingHash,
  dependencyLockTransition: {
    fromLockHash: STARCRAFT_TMG_WEB_STATIC_BROWSER_ACCEPTANCE_V1.build.lockHash,
    toLockHash: "6a60cdbb9639a8ba9de3f0660e7151e1fc1c7cd4cf7eb5a0768c69071b919458",
    owner: "ticket_14_slice_142_native_dependency_alignment",
    oldBuildEvidenceRetained: true,
    silentCompatibilityUsed: false,
  },
  battleLabEvolution: {
    detailPanels: [
      "unit", "actions", "threat", "status", "markers", "referee", "agent", "harness",
    ],
    defaultPanel: "unit",
    threatLayer: "rules_projected_regions_with_printed_range_fallback",
    publicBrowserContentModules: [
      "official-faq-f3-movement-battlefield-deployment-binding-v1.mjs",
      "official-faq-f4-ability-tactical-keyword-binding-v1.mjs",
    ],
    broadContentDirectoryExposureAllowed: false,
  },
  authority: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    trainingTruth: false,
  },
};

export const STARCRAFT_TMG_WEB_STATIC_BROWSER_ACCEPTANCE_AMENDMENT_V1 = freeze({
  ...body,
  amendmentHash: hashStarcraftTmgContract(body),
});
