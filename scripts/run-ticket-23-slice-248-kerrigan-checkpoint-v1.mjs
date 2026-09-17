#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1 } from
  "../content/characters/kerrigan-dynamic-dialogue-portrait-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import { STARCRAFT_TMG_TICKET_23_LIVE_ADJUTANT_FLASH_PROVIDER_PROFILE_V1 } from
  "../content/provider/ticket-23-live-provider-profiles-v1.mjs";
import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgCharacterSessionRuntime } from
  "../packages/character-agent/session-runtime-v1.mjs";
import { createStarcraftTmgOpenAiCompatibleProviderTransport } from
  "../packages/character-agent/openai-compatible-provider-v1.mjs";
import { createConversationProfile } from
  "../packages/character-agent/contracts-v1.mjs";
import { createStarcraftTmgConfiguredCharacterSessionFactory } from
  "../packages/product-composition/character-session-factory-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from
  "../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUN_ARGUMENT = process.argv.find((entry) =>
  entry.startsWith("--run-directory="));
const INSPECT_ONLY = process.argv.includes("--inspect-only");
const ROLEPLAY_TEST = process.argv.includes("--roleplay-test");
if (!RUN_ARGUMENT) throw new Error("SLICE248_KERRIGAN_RUN_DIRECTORY_REQUIRED");
const runDirectory = path.resolve(
  RUN_ARGUMENT.slice("--run-directory=".length));
const liveRoot = path.join(ROOT,
  "build/ticket-23-slice-248-standard-2000-aa-live-v1");
if (runDirectory !== liveRoot
  && !runDirectory.startsWith(`${liveRoot}${path.sep}`)) {
  throw new Error("SLICE248_KERRIGAN_RUN_DIRECTORY_OUTSIDE_LIVE_ROOT");
}

const privateState = JSON.parse(await readFile(path.join(
  runDirectory, "runner-private.json"), "utf8"));
const roomId = String(privateState.roomId || "");
if (!roomId || !privateState.resumeCredentials?.human?.seatToken) {
  throw new Error("SLICE248_KERRIGAN_RESUME_CREDENTIALS_UNAVAILABLE");
}
const runId = path.basename(runDirectory);
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${runId}`,
  trustLevel: "development_persistent",
});
const roomStore = createSqliteStarcraftTmgRoomStore({
  filename: path.join(runDirectory, "room.sqlite"),
  privatePayloadCodec: codec,
});
const refereeCrypto = createStarcraftTmgRefereeCrypto({
  privateKey: privateState.refereePrivateKeyPem,
  publicKey: privateState.refereePublicKeyPem,
  hmacSecret: privateState.refereeHmacSecret,
  keyId: `ticket23-slice248-referee-${runId}`,
  trustLevel: "development_persistent",
});

let fixture = null;
let characterRuntime = null;
let credentialBytes = null;
let sessionId = null;
const providerResponseDiagnostics = [];
try {
  fixture = await createTicket20AgentAgentDemoFixtureV1({
    root: ROOT,
    roomId,
    roomProfile: "standard_2000_live",
    mapConfiguration: {
      seedId: "sc1_lost_temple_v1",
      elementSelections: [],
      passageSelections: [],
    },
    maxAppliedActions: 180,
    enableSpatialPreexecution: true,
    attachBot: false,
    autoDrive: false,
    issueHumanRecovery: false,
    roomStore,
    refereeCrypto,
    resumeRoom: true,
    resumeCredentials: privateState.resumeCredentials,
    title: "Ticket 23 · Standard 2000 · Kerrigan checkpoint",
    surfaceMode: "agent_agent_live_evidence",
  });
  const before = await fixture.roomRuntime.readRoom({
    roomId,
    seatToken: privateState.resumeCredentials.human.seatToken,
    includeJournal: false,
  });
  if (before?.ok !== true || Number(before.projection?.room?.stateRevision) !== 46) {
    throw Object.assign(new Error("SLICE248_KERRIGAN_REVISION_46_REQUIRED"), {
      observedRevision: before?.projection?.room?.stateRevision ?? null,
    });
  }
  if (INSPECT_ONLY) {
    const bytes = (value) => Buffer.byteLength(JSON.stringify(value), "utf8");
    const projection = before.projection;
    process.stdout.write(`${JSON.stringify({
      ok: true,
      stateRevision: projection.room.stateRevision,
      projectionBytes: bytes(projection),
      topLevelBytes: Object.fromEntries(Object.entries(projection)
        .map(([key, value]) => [key, bytes(value)])
        .sort((left, right) => right[1] - left[1])),
      stateBytes: Object.fromEntries(Object.entries(projection.state || {})
        .map(([key, value]) => [key, bytes(value)])
        .sort((left, right) => right[1] - left[1])),
      boardBytes: Object.fromEntries(Object.entries(
        projection.state?.board || {})
        .map(([key, value]) => [key, bytes(value)])
        .sort((left, right) => right[1] - left[1])),
    }, null, 2)}\n`);
    process.exitCode = 0;
  } else {

  const baseBundle = createKerriganPrimalProductBundleV1();
  const liveConversationProfile = createConversationProfile({
    ...baseBundle.conversationProfile,
    providerProfileRef:
      STARCRAFT_TMG_TICKET_23_LIVE_ADJUTANT_FLASH_PROVIDER_PROFILE_V1.providerProfileId,
  });
  const liveBundle = Object.freeze({
    ...baseBundle,
    conversationProfile: liveConversationProfile,
    providerProfile:
      STARCRAFT_TMG_TICKET_23_LIVE_ADJUTANT_FLASH_PROVIDER_PROFILE_V1,
  });
  const providerTransport = createStarcraftTmgOpenAiCompatibleProviderTransport({
    maxRequestBytes: 16 * 1024 * 1024,
    maxResponseBytes: 1024 * 1024,
    observeResponseOutcome(outcome) {
      providerResponseDiagnostics.push(structuredClone(outcome));
    },
  });
  characterRuntime = createStarcraftTmgCharacterSessionRuntime({
    roomRuntime: fixture.roomRuntime,
    providerTransport,
    dialoguePortraitManifest: KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1,
    dialoguePortraitEnvironment: "development",
  });
  const factory = createStarcraftTmgConfiguredCharacterSessionFactory({
    allowRightsGatedDemo: true,
    productionMode: false,
    kerriganBundle: liveBundle,
    resolveSeatCredential: () =>
      privateState.resumeCredentials.human.seatToken,
  });
  sessionId = `ticket23-slice248-kerrigan-r46-${Date.now()}`;
  const created = await characterRuntime.createSession(
    await factory.sessionInputFactory({
      sessionId,
      roomId,
      seatId: "player1",
      mode: "companion",
      createdBy: "ticket23-slice248-checkpoint",
    }));
  if (created?.ok !== true) throw new Error(
    `${created?.reason || "SLICE248_KERRIGAN_SESSION_CREATE_FAILED"}: ${
      created?.message || "no details"}`);

  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  credentialBytes = ingress.credentialBytes;
  const bound = characterRuntime.bindByok({
    sessionId,
    apiKey: credentialBytes.toString("utf8"),
  });
  if (bound?.ok !== true) throw new Error(
    bound?.reason || "SLICE248_KERRIGAN_CREDENTIAL_BIND_FAILED");

  const questions = ROLEPLAY_TEST ? [
    [
      "先把战术报告的写法放下。作为当前已选时代的凯瑞甘副官，直接回应我：",
      "我刚才让 Swarmling 过早激活，眼看它被火力压住，却还想用‘至少守住了位置’安慰自己。",
      "你怎么看我的这个借口？用两到三段，保持你自己的身份、态度和节奏；可以尖锐，但不要羞辱我。",
      "不要照抄游戏台词，不要虚构关系历史、规则、概率或隐藏信息，也不要选择或提交动作。",
    ].join("\n"),
    [
      "延续你刚才对我的态度和称呼。现在我反驳：如果不抢先占住 marker 4，Terran 也许早就控制中线了。",
      "先用一句话复述你刚才真正要求我学会的原则，再回应这个反驳；最后给我一个下次激活前会追问自己的问题。",
      "这轮只测试角色连续性，不增加新的规则结论，也不选择或提交动作。",
    ].join("\n"),
  ] : [[
    "当前权威对局停在 state revision 46。请作为我的战术副官，只根据玩家可见房间投影回答：",
    "1. 为什么 Swarmling 此刻不能立即反击，此前激活顺序暴露了什么风险？",
    "2. Zerg 继续守 marker 4 与撤离或分散，各自的收益和风险是什么？",
    "3. 明确指出哪些结论因为 attack_probability 与 fire_zone_exchange 尚不可用而只能定性判断。",
    "4. 预测 Terran 下一次最可能的动作、行动单位和目标；如果预测落空，下一次计划应如何校准。",
    "不要虚构规则、概率、未公开信息或不存在的工具结果，也不要选择、预览或提交动作。",
  ].join("\n")];
  const roomProjectionBytes = Buffer.byteLength(
    JSON.stringify(before.projection), "utf8");
  const turnResults = [];
  for (const question of questions) {
    const diagnosticIndex = providerResponseDiagnostics.length;
    const invoked = await characterRuntime.invoke({
      sessionId,
      intent: "reflect",
      userMessage: question,
    });
    turnResults.push({
      question,
      invoked,
      providerResponseDiagnostic:
        providerResponseDiagnostics[diagnosticIndex] || null,
    });
    if (invoked?.ok !== true) break;
  }
  const after = await fixture.roomRuntime.readRoom({
    roomId,
    seatToken: privateState.resumeCredentials.human.seatToken,
    includeJournal: false,
  });
  const artifact = {
    schema: ROLEPLAY_TEST
      ? "ticket23_slice248_kerrigan_revision46_roleplay_test_v1"
      : "ticket23_slice248_kerrigan_revision46_checkpoint_v1",
    ok: turnResults.length === questions.length
      && turnResults.every((turn) => turn.invoked?.ok === true),
    roomId,
    preStateRevision: before.projection.room.stateRevision,
    postStateRevision: after?.projection?.room?.stateRevision ?? null,
    roomMutationObserved: Number(after?.projection?.room?.stateRevision) !== 46,
    mode: "companion",
    intent: "reflect",
    question: questions[0],
    questions,
    roomProjectionBytes,
    result: {
      turns: turnResults.map(({ question, invoked,
        providerResponseDiagnostic }) => invoked?.ok === true ? {
        ok: true,
        question,
        output: invoked.output,
        promptAssemblyReceipt: invoked.promptAssemblyReceipt,
        trace: invoked.trace,
        portraitState: invoked.portraitState,
        portraitView: invoked.portraitView,
        providerReceipt: invoked.trace?.providerReceipt || null,
        providerResponseDiagnostic,
      } : {
        ok: false,
        question,
        reason: invoked?.reason || "unknown",
        message: invoked?.message || null,
        providerFailure: invoked?.providerFailure || null,
        traceId: invoked?.traceId || null,
        portraitState: invoked?.portraitState || null,
        portraitView: invoked?.portraitView || null,
        providerResponseDiagnostic,
      }),
    },
    keychainReceipt: ingress.receipt,
    apiKeyPersisted: false,
    hiddenChainOfThoughtStored: false,
    maySelectAction: false,
    mayPreview: false,
    mayApply: false,
    sourceRefreshPerformed: false,
    trainingTruth: false,
    completedAt: new Date().toISOString(),
  };
  const outputDirectory = path.join(runDirectory, "kerrigan-checkpoint-r46");
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  const outputFilename = ROLEPLAY_TEST
    ? "roleplay-test-result.json" : "result.json";
  await writeFile(path.join(outputDirectory, outputFilename),
    `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({
    ok: artifact.ok,
    output: path.relative(ROOT, path.join(outputDirectory, outputFilename)),
    preStateRevision: artifact.preStateRevision,
    postStateRevision: artifact.postStateRevision,
    roomMutationObserved: artifact.roomMutationObserved,
    providerReceipts: artifact.result.turns.map((turn) =>
      turn.providerReceipt || null),
    failure: artifact.ok ? null : artifact.result,
  }, null, 2)}\n`);
  }
} finally {
  credentialBytes?.fill(0);
  if (sessionId && characterRuntime) {
    characterRuntime.unbindByok({ sessionId });
    characterRuntime.destroySession({ sessionId });
  }
  await fixture?.player1Runtime?.close?.().catch(() => {});
  await fixture?.botRuntime?.close?.().catch(() => {});
  roomStore.close();
}
