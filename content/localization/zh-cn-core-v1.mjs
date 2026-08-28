import { createStarcraftTmgTranslationGlossary } from "../../packages/localization/translation-sidecar-v1.mjs";

export const STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1 = createStarcraftTmgTranslationGlossary({
  glossaryId: "project-d.starcraft-tmg.zh-cn.core.v1",
  version: "1.0.0",
  sourceLocale: "en",
  targetLocale: "zh-CN",
  provenance: {
    source: "Project D provisional display glossary",
    official: false,
    canonicalGameData: false,
  },
  review: {
    status: "provisional_human_review_required",
    reviewerRequired: true,
  },
  entries: [
    { termId: "unit", sourceTerm: "Unit", targetTerm: "单位" },
    { termId: "movement-phase", sourceTerm: "Movement Phase", targetTerm: "移动阶段" },
    { termId: "supply", sourceTerm: "Supply", targetTerm: "补给" },
    { termId: "minerals", sourceTerm: "Minerals", targetTerm: "晶体矿" },
    { termId: "terran", sourceTerm: "Terran", targetTerm: "人类" },
    { termId: "zerg", sourceTerm: "Zerg", targetTerm: "异虫" },
    { termId: "protoss", sourceTerm: "Protoss", targetTerm: "星灵" },
    { termId: "adept", sourceTerm: "Adept", targetTerm: "使徒" },
  ],
});
