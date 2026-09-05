import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCurrentOfficialSkillCurriculumV1 } from
  "./current-official-evidence-v1.mjs";

export const STARCRAFT_TMG_PRODUCTION_SKILL_CATALOGUE_VERSION =
  "starcraft_tmg_production_skill_catalogue_v1";

const HASH = /^[a-f0-9]{64}$/u;
const FAMILY_COUNTS = Object.freeze({
  how_to_play: 1,
  mission: 10,
  faction: 6,
  matchup: 36,
});

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

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");
}

function skillRow(body) {
  return envelope({
    schemaVersion: `${STARCRAFT_TMG_PRODUCTION_SKILL_CATALOGUE_VERSION}.skill`,
    gameId: "starcraft-tmg",
    status: "planned_candidate_generation",
    publicationAuthority: false,
    humanReviewRequired: true,
    trainingTruth: false,
    ...body,
  }, "skillPlanHash");
}

function familyTaskRows(curriculum, family) {
  return curriculum.tasks.filter((task) => task.family === family);
}

function singleTaskSkill(family, task, dependencies) {
  const subject = slug(task.subjectId);
  return skillRow({
    skillId: `skill.starcraft-tmg.${family}.${subject}`,
    family,
    label: task.label,
    sourceTaskIds: [task.taskId],
    generationUnitTaskIds: [task.taskId],
    blockedReferenceTaskIds: [],
    dependencies,
    materialization: {
      kind: "single_catalogue_task_with_role_scoped_evidence",
      directOnePromptDumpAllowed: false,
      evidenceSelectionMustRemainHashBound: true,
    },
  });
}

export function createStarcraftTmgProductionSkillCatalogueV1(input = {}) {
  const { curriculum, evidenceCatalogue } = input;
  verifyCurrentOfficialSkillCurriculumV1(curriculum, evidenceCatalogue);
  const howToPlayTasks = familyTaskRows(curriculum, "how_to_play");
  const executableRules = howToPlayTasks.filter((task) => task.generationEligible);
  const displayOnlyRules = howToPlayTasks.filter((task) => !task.generationEligible);
  const rulesSkill = skillRow({
    skillId: "skill.starcraft-tmg.how-to-play",
    family: "how_to_play",
    label: "StarCraft TMG — How to Play",
    sourceTaskIds: howToPlayTasks.map((task) => task.taskId),
    generationUnitTaskIds: executableRules.map((task) => task.taskId),
    blockedReferenceTaskIds: displayOnlyRules.map((task) => task.taskId),
    dependencies: [],
    materialization: {
      kind: "one_skill_hierarchical_rule_atom_index",
      directOnePromptDumpAllowed: false,
      chapterSynthesisRequired: true,
      lazyRuleAtomRetrievalRequired: true,
      displayOnlyAtomsRemainReadableButCannotSeedClaims: true,
    },
  });
  const missionSkills = familyTaskRows(curriculum, "mission")
    .map((task) => singleTaskSkill("mission", task, [rulesSkill.skillId]));
  const factionSkills = familyTaskRows(curriculum, "faction")
    .map((task) => singleTaskSkill("faction", task, [rulesSkill.skillId]));
  const factionSkillByTask = new Map(factionSkills.map((skill) => [
    skill.sourceTaskIds[0], skill.skillId,
  ]));
  const matchupSkills = familyTaskRows(curriculum, "matchup").map((task) => {
    const dependencies = [
      rulesSkill.skillId,
      factionSkillByTask.get(task.ownFactionTaskId),
      factionSkillByTask.get(task.opponentFactionTaskId),
    ].filter((value, index, rows) => value && rows.indexOf(value) === index);
    return singleTaskSkill("matchup", task, dependencies);
  });
  const skills = [rulesSkill, ...missionSkills, ...factionSkills, ...matchupSkills]
    .sort((left, right) => left.skillId.localeCompare(right.skillId));
  const body = {
    schemaVersion: STARCRAFT_TMG_PRODUCTION_SKILL_CATALOGUE_VERSION,
    gameId: "starcraft-tmg",
    evidenceCatalogueHash: evidenceCatalogue.catalogueHash,
    curriculumHash: curriculum.curriculumHash,
    distinction: {
      curriculumTaskMeaning: "atomic_generation_evaluation_or_source_work_unit",
      productionSkillMeaning: "user_and_agent_loadable_versioned_skill_package",
      curriculumTasksAreProductionSkills: false,
    },
    counts: {
      productionSkills: skills.length,
      byFamily: clone(FAMILY_COUNTS),
      curriculumTasks: curriculum.counts.tasks,
      generationWorkUnits: curriculum.counts.generationEligible,
      blockedReferenceWorkUnits: curriculum.counts.blocked,
      ruleAtomsInsideOneHowToPlaySkill: howToPlayTasks.length,
      executableRuleAtoms: executableRules.length,
      displayOnlyRuleAtoms: displayOnlyRules.length,
    },
    generationOrder: ["how_to_play", "mission", "faction", "matchup"],
    generationWaves: [
      ["how_to_play"],
      ["mission", "faction"],
      ["matchup"],
    ],
    dependencyGate: {
      howToPlayMustBeAcceptedBeforeDownstreamGeneration: true,
      acceptedDependencyStatuses: ["replay_passed", "human_reviewed"],
      missionAndFactionRequireHowToPlay: true,
      matchupRequiresHowToPlayAndOwnAndOpponentFactionRoles: true,
      staleOrMissingDependencyFailsClosed: true,
    },
    skills,
    sourceRefreshPerformed: false,
    catalogueComplete: true,
    candidatesGenerated: 0,
    candidatesPromoted: 0,
    productionReady: false,
    trainingTruth: false,
  };
  return envelope(body, "catalogueHash");
}

export function verifyStarcraftTmgProductionSkillCatalogueV1(value, input = {}) {
  const { curriculum, evidenceCatalogue } = input;
  verifyCurrentOfficialSkillCurriculumV1(curriculum, evidenceCatalogue);
  if (!value || value.schemaVersion !== STARCRAFT_TMG_PRODUCTION_SKILL_CATALOGUE_VERSION
    || !HASH.test(String(value.catalogueHash || ""))) {
    throw new TypeError("production Skill catalogue identity is invalid");
  }
  const copy = clone(value);
  const observed = copy.catalogueHash;
  delete copy.catalogueHash;
  if (observed !== hashStarcraftTmgContract(copy)
    || value.evidenceCatalogueHash !== evidenceCatalogue.catalogueHash
    || value.curriculumHash !== curriculum.curriculumHash
    || value.counts?.productionSkills !== 53
    || JSON.stringify(value.counts?.byFamily) !== JSON.stringify(FAMILY_COUNTS)
    || value.counts?.curriculumTasks !== 1215
    || value.counts?.generationWorkUnits !== 1101
    || value.counts?.blockedReferenceWorkUnits !== 114
    || value.counts?.ruleAtomsInsideOneHowToPlaySkill !== 1163
    || value.counts?.executableRuleAtoms !== 1049
    || value.counts?.displayOnlyRuleAtoms !== 114
    || value.distinction?.curriculumTasksAreProductionSkills !== false
    || value.dependencyGate
      ?.howToPlayMustBeAcceptedBeforeDownstreamGeneration !== true
    || value.dependencyGate?.missionAndFactionRequireHowToPlay !== true
    || value.dependencyGate
      ?.matchupRequiresHowToPlayAndOwnAndOpponentFactionRoles !== true
    || value.dependencyGate?.staleOrMissingDependencyFailsClosed !== true
    || JSON.stringify(value.dependencyGate?.acceptedDependencyStatuses)
      !== JSON.stringify(["replay_passed", "human_reviewed"])
    || JSON.stringify(value.generationWaves)
      !== JSON.stringify([
        ["how_to_play"], ["mission", "faction"], ["matchup"],
      ])
    || value.catalogueComplete !== true
    || value.productionReady !== false
    || value.trainingTruth !== false) {
    throw new TypeError("production Skill catalogue contract is invalid");
  }
  const skillIds = new Set(value.skills.map((skill) => skill.skillId));
  if (value.skills.length !== 53 || skillIds.size !== 53) {
    throw new TypeError("production Skill catalogue denominator is invalid");
  }
  const taskIds = new Set(curriculum.tasks.map((task) => task.taskId));
  const workUnits = [];
  for (const skill of value.skills) {
    const row = clone(skill);
    const rowHash = row.skillPlanHash;
    delete row.skillPlanHash;
    if (rowHash !== hashStarcraftTmgContract(row)
      || !skill.sourceTaskIds.every((taskId) => taskIds.has(taskId))
      || !skill.generationUnitTaskIds.every((taskId) => taskIds.has(taskId))
      || !skill.blockedReferenceTaskIds.every((taskId) => taskIds.has(taskId))
      || skill.publicationAuthority !== false
      || skill.trainingTruth !== false) {
      throw new TypeError(`production Skill plan is invalid: ${skill.skillId}`);
    }
    workUnits.push(...skill.generationUnitTaskIds);
  }
  if (workUnits.length !== 1101 || new Set(workUnits).size !== 1101) {
    throw new TypeError("generation work units are not assigned exactly once");
  }
  const rules = value.skills.filter((skill) => skill.family === "how_to_play");
  if (rules.length !== 1
    || rules[0].materialization.kind !== "one_skill_hierarchical_rule_atom_index"
    || rules[0].materialization.directOnePromptDumpAllowed !== false) {
    throw new TypeError("How-to-Play must remain one hierarchical Skill");
  }
  for (const skill of value.skills.filter((row) => row.family !== "how_to_play")) {
    if (!skill.dependencies.includes(rules[0].skillId)) {
      throw new TypeError(`production Skill is missing rules dependency: ${skill.skillId}`);
    }
  }
  return true;
}
