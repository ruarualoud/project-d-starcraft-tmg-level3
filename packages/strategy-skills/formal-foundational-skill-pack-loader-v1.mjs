import { readFile } from "node:fs/promises";
import path from "node:path";

import { clone, fail, seal, verifySeal } from "../skill-production/common.mjs";

const HASH = /^[a-f0-9]{64}$/u;
const ROLES = new Set(["general", "faction", "matchup"]);

async function json(filename) {
  return verifySeal(JSON.parse(await readFile(filename, "utf8")));
}

function qualified(entry, report) {
  if (entry.role === "general") {
    return report.schema === "ticket18_general_strategy_final_completion_receipt_v2"
      && report.formalGeneralSkillCompleted === true;
  }
  if (entry.role === "faction") {
    return /^faction_final_offline_handoff_v[1-9][0-9]*$/u.test(report.schema || "")
      && report.formalOfflineSkillAccepted === true;
  }
  return report.schema === "ticket18_directed_matchup_finalization_report_v1"
    && report.formalMatchupSkillsCompleted === 2
    && report.decisionCasesPassed === true
    && report.skillHashes?.includes(entry.skillHash);
}

function assertEntry(entry, skill, report, sourceBinding) {
  if (!ROLES.has(entry.role) || !HASH.test(entry.skillHash || "")
    || !HASH.test(entry.qualificationHash || "")
    || entry.skillHash !== skill.hash || entry.qualificationHash !== report.hash
    || entry.skillId !== skill.skillId || skill.schema !== "project_d_game_skill_v1"
    || skill.gameId !== "starcraft-tmg" || skill.skillType !== "strategy"
    || JSON.stringify(skill.sourceBinding) !== JSON.stringify(sourceBinding)
    || skill.canAffectRules !== false || skill.runtimeAccepted !== false
    || skill.trainingTruth !== false || report.runtimeAccepted !== false
    || report.trainingTruth !== false || !qualified(entry, report)) {
    fail("FOUNDATIONAL_STRATEGY_ENTRY_UNQUALIFIED", { skillId: entry.skillId });
  }
  if (entry.role === "general" && skill.status !== "replay_passed") {
    fail("FOUNDATIONAL_GENERAL_STATUS_INVALID");
  }
  if (entry.role !== "general" && skill.status !== "offline_candidate") {
    fail("FOUNDATIONAL_OFFLINE_STATUS_INVALID", { skillId: entry.skillId });
  }
  if (entry.role === "faction" && skill.factionRecordKey !== entry.factionRecordKey) {
    fail("FOUNDATIONAL_FACTION_BINDING_INVALID", { skillId: entry.skillId });
  }
  if (entry.role === "matchup"
    && (skill.direction?.ownFaction !== entry.ownFaction
      || skill.direction?.opponentFaction !== entry.opponentFaction)) {
    fail("FOUNDATIONAL_MATCHUP_DIRECTION_INVALID", { skillId: entry.skillId });
  }
}

export async function loadFormalFoundationalStrategyPackV1({ root, manifest }) {
  verifySeal(manifest);
  if (!path.isAbsolute(root || "")
    || manifest.schema !== "ticket18_foundational_strategy_pack_manifest_v1"
    || manifest.gameId !== "starcraft-tmg" || manifest.entries?.length !== 5
    || manifest.selectionPolicy !== "exact_manifest_only_no_highest_version_autoselection"
    || manifest.sourceRefreshPerformed !== false || manifest.runtimeAccepted !== false
    || manifest.trainingTruth !== false) {
    fail("FOUNDATIONAL_STRATEGY_MANIFEST_INVALID");
  }
  const rows = await Promise.all(manifest.entries.map(async (entry) => {
    const [skill, qualification] = await Promise.all([
      json(path.join(root, entry.skillPath)),
      json(path.join(root, entry.qualificationPath)),
    ]);
    assertEntry(entry, skill, qualification, manifest.sourceBinding);
    return Object.freeze({
      role: entry.role,
      ...(entry.factionRecordKey ? { factionRecordKey: entry.factionRecordKey } : {}),
      ...(entry.ownFaction ? {
        ownFaction: entry.ownFaction,
        opponentFaction: entry.opponentFaction,
      } : {}),
      skill,
      qualificationRef: {
        schema: qualification.schema,
        hash: qualification.hash,
      },
    });
  }));
  const skills = rows.map((row) => row.skill);
  const byHash = new Map(skills.map((skill) => [skill.hash, skill]));
  for (const skill of skills.filter((candidate) => candidate.direction)) {
    const dependencyHashes = Object.values(skill.dependencies || {});
    if (dependencyHashes.length !== 3
      || !dependencyHashes.every((hash) => byHash.has(hash))) {
      fail("FOUNDATIONAL_MATCHUP_DEPENDENCY_INVALID", { skillId: skill.skillId });
    }
  }
  const receipt = seal({
    schema: "formal_foundational_strategy_pack_load_receipt_v1",
    manifestHash: manifest.hash,
    sourceBinding: clone(manifest.sourceBinding),
    skillHashes: skills.map((skill) => skill.hash),
    qualificationHashes: rows.map((row) => row.qualificationRef.hash),
    selectionPolicy: manifest.selectionPolicy,
    producerReplayPerformed: false,
    providerCalls: 0,
    sourceRefreshPerformed: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
  return Object.freeze({ manifest, entries: Object.freeze(rows), receipt });
}
