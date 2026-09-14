import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { createStarcraftTmgCompanionTacticalAnalysisV1 } from
  "../../packages/online-agent-session/companion-tactical-analysis-v1.mjs";
import { createStarcraftTmgPlayerSpatialObservationV1 } from
  "../../packages/online-agent-session/player-spatial-observation-v1.mjs";
import { hash } from "../../packages/skill-production/common.mjs";
import { createStarcraftTmgHumanAgentLearningConsoleV1 } from
  "../../packages/strategy-skills/human-agent-learning-console-v1.mjs";
import { createStarcraftTmgIncrementalSkillFreshnessRuntimeV1 } from
  "../../packages/strategy-skills/incremental-skill-freshness-runtime-v1.mjs";
import {
  createInMemoryStarcraftTmgSkillOptStoreV1,
  createStarcraftTmgPostgameSkillOptWorkflowV1,
} from "../../packages/strategy-skills/postgame-skillopt-workflow-v1.mjs";

async function json(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}

async function referenceEpisodes(root) {
  const directory = path.join(root, "build/ticket-18-postgame-skillopt-v1/episodes");
  const filenames = (await readdir(directory)).filter((name) => name.endsWith(".json"));
  return Promise.all(filenames.sort().map((name) => json(path.join(directory, name))));
}

function freshnessArtifacts(fixture) {
  const sourceId = "source:official-rules";
  const sourceVersion = fixture.sourceBinding.rules;
  const factId = "fact:official-rules-contract";
  const claimId = "claim:general-gameplay-strategy";
  const sectionId = "section:runtime-strategy-guidance";
  const artifacts = [{ artifactId: sourceId, kind: "source", version: sourceVersion,
    dependencies: [], activate: true, rulesAuthority: true }];
  artifacts.push({ artifactId: factId, kind: "fact", version: "1",
    dependencies: [{ artifactId: sourceId, version: sourceVersion }], activate: true,
    rulesAuthority: true });
  artifacts.push({ artifactId: claimId, kind: "claim", version: "1",
    dependencies: [{ artifactId: factId, version: "1" }], activate: true });
  artifacts.push({ artifactId: sectionId, kind: "section", version: "1",
    dependencies: [{ artifactId: claimId, version: "1" }], activate: true });
  for (const skill of fixture.strategySkills) {
    artifacts.push({ artifactId: skill.skillId, kind: "skill", version: skill.version,
      dependencies: [{ artifactId: sectionId, version: "1" }], activate: true,
      contentRef: { hash: skill.hash } });
    artifacts.push({ artifactId: `regression:${skill.skillId}`, kind: "regression",
      version: "1", dependencies: [{ artifactId: skill.skillId,
        version: skill.version }], activate: true });
  }
  return artifacts;
}

export async function createTicket20LearningConsoleFixtureV1(input = {}) {
  const { root, fixture } = input;
  const episodes = await referenceEpisodes(root);
  const reflection = await json(path.join(root,
    "build/ticket-18-postgame-skillopt-v1/reflection.json"));
  const targetSkills = fixture.strategySkills.filter((skill) =>
    skill.skillId.includes(".matchup.terran_armed_forces-to-zerg_swarm")
    || skill.skillId.includes(".matchup.zerg_swarm-to-terran_armed_forces"));
  const skillOptWorkflow = createStarcraftTmgPostgameSkillOptWorkflowV1({
    store: createInMemoryStarcraftTmgSkillOptStoreV1(),
    reflectionProvider: { async reflect() { return reflection; } },
  });
  const consoleRuntime = createStarcraftTmgHumanAgentLearningConsoleV1({
    skillOptWorkflow,
    turnPlanRuntime: fixture.turnPlanRuntime,
  });
  consoleRuntime.addEpisodes({ episodes,
    importSource: "ticket18_replay_verified_reference_episodes" });
  const freshness = createStarcraftTmgIncrementalSkillFreshnessRuntimeV1({
    artifacts: freshnessArtifacts(fixture),
  });
  const candidateRulesVersion = `${fixture.sourceBinding.rules}.preview-next`;
  freshness.register({
    artifactId: "source:official-rules",
    kind: "source",
    version: candidateRulesVersion,
    dependencies: [],
    rulesAuthority: false,
    status: "hypothetical_not_fetched",
  });
  const companion = createStarcraftTmgCompanionTacticalAnalysisV1({
    roomId: fixture.roomId,
    matchBindingHash: fixture.createdRoom.matchBinding.bindingHash,
    seatKey: "player1",
  });
  let freshnessPlan = null;

  async function observeCompanion() {
    const room = await fixture.roomRuntime.readRoom({
      roomId: fixture.roomId,
      seatToken: fixture.createdRoom.credentials.human.seatToken,
      includeJournal: true,
    });
    if (!room.ok) throw new Error(room.reason || "LEARNING_ROOM_READ_FAILED");
    const events = {
      roomId: fixture.roomId,
      matchBindingHash: fixture.createdRoom.matchBinding.bindingHash,
      events: room.projection.publicJournal || [],
      eventsHash: hash(room.projection.publicJournal || []),
    };
    const spatialObservation = createStarcraftTmgPlayerSpatialObservationV1({
      roomProjection: room.projection,
    });
    const memory = await fixture.continuity.observe({
      scope: { gameId: "starcraft-tmg", roomId: fixture.roomId,
        matchBindingHash: fixture.createdRoom.matchBinding.bindingHash,
        seatKey: "player1" },
      roomProjection: room.projection,
      publicEvents: events,
      spatialObservation,
      strategySkillSetHash: hash(fixture.strategySkillRefs),
    });
    return companion.observe({ roomProjection: room.projection,
      publicEvents: events, spatialObservation,
      matchMemory: memory.matchMemory });
  }

  async function read() {
    return {
      schemaVersion: "ticket20_learning_console_web_projection_v1",
      learning: consoleRuntime.read(),
      freshness: freshness.read(),
      freshnessPlan,
      companion: await observeCompanion(),
      referenceEvidence: {
        kind: "rules_executed_synthetic_transitions",
        fullMatches: false,
        episodeCount: episodes.length,
      },
      modelCalls: 0,
      paidProviderUsed: false,
      sourceRefreshPerformed: false,
      trainingTruth: false,
    };
  }

  async function triggerReflection() {
    return consoleRuntime.triggerReflection({
      runId: "ticket20-console-reference-reflection-v1",
      episodeIds: episodes.map((episode) => episode.episodeId),
      targetSkills,
      confirmedByHuman: true,
    });
  }

  function previewFreshness() {
    if (!freshnessPlan) {
      freshnessPlan = freshness.planRefresh({
        planId: "ticket20-console-hypothetical-rules-change-v1",
        confirmedByHuman: true,
        changes: [{ artifactId: "source:official-rules",
          fromVersion: fixture.sourceBinding.rules,
          toVersion: candidateRulesVersion }],
      });
    }
    return freshnessPlan;
  }

  return Object.freeze({ read, triggerReflection, previewFreshness,
    consoleRuntime, freshness, companion });
}
