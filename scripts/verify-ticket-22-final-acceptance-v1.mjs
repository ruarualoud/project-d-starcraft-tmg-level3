import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "build/ticket-22-final-acceptance-v1");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const relative = (value) => path.relative(root, value).split(path.sep).join("/");
const readJson = async (name) => JSON.parse(await readFile(
  path.join(root, name), "utf8"));

const checks = {};
const accept = (id, condition) => {
  assert.equal(Boolean(condition), true, id);
  checks[id] = true;
};

const requiredDocs = [
  "README.md",
  "CONTEXT.md",
  "docs/implementation-plan-2026-08-24.md",
  "docs/ticket-22-slices-210-214-final-synthesis-acceptance-roadmap-2026-09-14.md",
  "docs/ticket-22-slice-210-requirement-traceability-2026-09-14.md",
  "docs/ticket-22-slice-211-architecture-contract-index-2026-09-14.md",
  "docs/ticket-22-slice-212-verification-risk-debt-matrix-2026-09-14.md",
  "docs/ticket-22-slice-213-handoff-runbook-2026-09-14.md",
  "docs/ticket-22-slices-210-214-final-synthesis-acceptance-closure-2026-09-14.md",
  "docs/adr/0001-authoritative-transition-journal.md",
  "docs/adr/0002-expo-and-battle-lab-share-client-domain-module.md",
  "docs/adr/0003-five-authority-planes-and-version-compatibility.md",
  "docs/adr/0004-agent-skill-learning-and-operations-boundaries.md",
];
const docEvidence = [];
for (const name of requiredDocs) {
  const bytes = await readFile(path.join(root, name));
  accept(`document_exists_and_nonempty:${name}`, bytes.byteLength > 0);
  docEvidence.push({ path: name, bytes: bytes.byteLength, sha256: hash(bytes) });
}

const deliveryText = (await Promise.all(requiredDocs.map((name) =>
  readFile(path.join(root, name), "utf8")))).join("\n");
accept("delivery_docs_contain_no_api_key_shape",
  !/\b(?:j?sk)-[A-Za-z0-9_-]{20,}\b/u.test(deliveryText));
accept("traceability_preserves_bounded_and_external_statuses",
  deliveryText.includes("implemented_bounded")
    && deliveryText.includes("external_gate")
    && deliveryText.includes("arbitrary-roster"));

const reports = {
  ticket11: await readJson("build/ticket-11-closure-v1/report.json"),
  ticket12: await readJson("build/ticket-12-closure-v1/report.json"),
  ticket13: await readJson("build/ticket-13-closure-v1/report.json"),
  ticket14: await readJson("build/ticket-14-closure-v1/report.json"),
  native: await readJson(
    "build/ticket-14-slice-142-native-v1/android-build-receipt.json"),
  ticket15: await readJson("build/ticket-15-closure-v1/report.json"),
  ticket16: await readJson(
    "build/ticket-16-slice-162-live-provider-closure-v1/report.json"),
  ticket18: await readJson(
    "build/ticket-18-final-release-conformance-v1/report.json"),
  terminalMatch: await readJson(
    "build/ticket-18-current-rules-complete-match-v1/report.json"),
  evolution: await readJson(
    "build/ticket-18-real-match-skill-evolution-v1/report.json"),
  ticket19: await readJson(
    "build/ticket-19-slice-201-actual-terminal-trajectory-v1/report.json"),
  ticket20: await readJson(
    "build/ticket-20-agent-agent-complete-match-v1/report.json"),
  ticket21: await readJson(
    "build/ticket-21-slice-209-incident-readiness-v1/report.json"),
};

accept("ticket11_atomic_denominator_closed",
  reports.ticket11.status === "complete"
    && reports.ticket11.rulesMatrix.executableAtoms === 912
    && reports.ticket11.rulesMatrix.actionableAtoms === 912
    && reports.ticket11.rulesMatrix.displayOnlyAtomsRetained === 114);
accept("tickets12_and13_closed",
  reports.ticket12.status === "complete" && reports.ticket13.status === "complete");
accept("ticket14_device_gate_not_waived",
  reports.ticket14.status
    === "web_and_build_development_complete_device_acceptance_deferred"
    && reports.native.deviceEvidence.satisfied === false
    && reports.native.deviceEvidence.realDeviceReceiptPresent === false);
accept("ticket15_online_roles_closed", reports.ticket15.status === "complete");
accept("ticket16_live_provider_path_closed", reports.ticket16.status === "passed");
accept("ticket18_foundational_skill_release_closed",
  reports.ticket18.status === "passed"
    && reports.ticket18.foundationalSkills === 5
    && reports.ticket18.runtimeAcceptedFoundationalSkills === 5
    && reports.ticket18.fullGameStrategyEffectivenessProven === false);
accept("ticket18_current_rules_match_and_evolution_closed",
  reports.terminalMatch.acceptance.currentRulesCompleteMatchHarnessPassed === true
    && reports.terminalMatch.acceptance.terminalMatchCount === 2
    && reports.terminalMatch.acceptance.replayPassedMatchCount === 2
    && reports.terminalMatch.acceptance.legacyCompatibilityUsed === false
    && reports.evolution.status === "passed");
accept("ticket19_terminal_trajectory_closed_without_training_claim",
  reports.ticket19.status === "passed"
    && reports.ticket19.trajectory.stepCount === 80
    && reports.ticket19.limits.learnerTrained === false
    && reports.ticket19.limits.independentTrainingApprovalPresent === false);
accept("ticket20_bounded_agent_match_closed",
  reports.ticket20.ok === true
    && reports.ticket20.acceptance.finiteDenominator === "1/1"
    && reports.ticket20.acceptance.appliedActions === 80
    && reports.ticket20.acceptance.finalReplayMatchesCurrent === true
    && reports.ticket20.limits.strategyStrengthProven === false
    && reports.ticket20.limits.arbitraryArmyBuilderMatchProven === false);

const expectedReadiness = {
  localDemo: true,
  controlledExperiment: true,
  productionWeb: false,
  productionApp: false,
  trainingEligibleRun: false,
};
accept("ticket21_readiness_truth_preserved",
  reports.ticket21.status === "passed"
    && JSON.stringify(reports.ticket21.readiness) === JSON.stringify(expectedReadiness));
const expectedExternalGates = [
  "EXTERNAL_KMS_NOT_CONFIGURED",
  "REAL_POSTGRES_MULTI_INSTANCE_NOT_CONFIGURED",
  "PRODUCTION_PRIVACY_ADAPTER_NOT_CONFIGURED",
  "PRODUCTION_TELEMETRY_SINK_NOT_CONFIGURED",
  "REAL_ROLLBACK_DRILL_MISSING",
  "APP_STORE_RELEASE_NOT_ALLOWED",
  "PHYSICAL_DEVICE_ACCEPTANCE_MISSING",
  "INDEPENDENT_TRAINING_APPROVAL_MISSING",
];
accept("all_eight_external_gates_remain_explicit",
  JSON.stringify(reports.ticket21.unresolvedProductionGateCodes)
    === JSON.stringify(expectedExternalGates));

const apkPath = path.join(root,
  "build/ticket-14-slice-142-native-v1/project-d-starcraft-tmg-internal-preview.apk");
const apkBytes = await readFile(apkPath);
const apkSha256 = hash(apkBytes);
accept("internal_preview_apk_matches_receipt",
  apkSha256 === reports.native.standalonePreviewApk.sha256
    && apkSha256
      === "7d2b2a71b28d1bdd860ec12f50d5818d7a7adb01262d8d1515c043f9036c2fd1"
    && reports.native.standalonePreviewApk.distributionReady === false);
const screenshotPath = path.join(root,
  "build/ticket-20-product-web-user-journey-v1/final.png");
const screenshotInfo = await stat(screenshotPath);
const screenshotBytes = await readFile(screenshotPath);
accept("product_browser_evidence_exists",
  screenshotInfo.isFile() && screenshotInfo.size > 0);

const expectedSkillFiles = [
  "faction-daelaam.json",
  "faction-kerrigan_s_swarm.json",
  "faction-terran_armed_forces.json",
  "faction-zerg_swarm.json",
  "general-rules-and-strategy.json",
  "matchup-daelaam-to-terran_armed_forces.json",
  "matchup-kerrigan_s_swarm-to-terran_armed_forces.json",
  "matchup-terran_armed_forces-to-daelaam.json",
  "matchup-terran_armed_forces-to-kerrigan_s_swarm.json",
  "matchup-terran_armed_forces-to-zerg_swarm.json",
  "matchup-zerg_swarm-to-terran_armed_forces.json",
];
const skillEvidence = [];
for (const name of expectedSkillFiles) {
  const filename = path.join(root,
    "content/strategy-skills/ticket-18-foundational-v1/skills", name);
  const bytes = await readFile(filename);
  const value = JSON.parse(bytes.toString("utf8"));
  accept(`skill_is_strategy_only_and_not_training_truth:${name}`,
    value.gameId === "starcraft-tmg"
      && value.canAffectStrategy === true
      && value.canAffectRules === false
      && value.trainingTruth === false);
  skillEvidence.push({ path: relative(filename), skillId: value.skillId,
    version: value.version, sha256: hash(bytes) });
}

const git = (args) => execFileSync("git", args, {
  cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
}).trim();
const repository = {
  root: git(["rev-parse", "--show-toplevel"]),
  branch: git(["branch", "--show-current"]),
  head: git(["rev-parse", "HEAD"]),
  remote: git(["remote", "get-url", "origin"]),
};
const worktreeLines = git(["status", "--porcelain=v1"])
  .split("\n").filter(Boolean);
repository.worktree = {
  clean: worktreeLines.length === 0,
  entryCount: worktreeLines.length,
  statusCounts: Object.fromEntries([...new Set(worktreeLines.map((line) =>
    line.slice(0, 2)))].sort().map((code) => [code,
    worktreeLines.filter((line) => line.startsWith(code)).length])),
};
accept("nested_repository_identity_is_explicit",
  repository.root === root && repository.branch.length > 0
    && /^[0-9a-f]{40}$/u.test(repository.head)
    && repository.remote.length > 0);
accept("dirty_delivery_is_not_misrepresented_as_head",
  repository.worktree.clean === false && repository.worktree.entryCount > 0);

const listed = execFileSync("git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const sourcePaths = listed.toString("utf8").split("\0").filter(Boolean).sort();
const tree = createHash("sha256");
let sourceBytes = 0;
let missingTrackedFiles = 0;
for (const name of sourcePaths) {
  let bytes;
  try {
    bytes = await readFile(path.join(root, name));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    bytes = Buffer.from("<deleted>", "utf8");
    missingTrackedFiles += 1;
  }
  sourceBytes += bytes.byteLength;
  tree.update(name, "utf8");
  tree.update("\0", "utf8");
  tree.update(hash(bytes), "utf8");
  tree.update("\n", "utf8");
}
const deliveryTree = {
  algorithm: "sha256-path-null-content-hash-newline-v1",
  sha256: tree.digest("hex"),
  fileCount: sourcePaths.length,
  byteCount: sourceBytes,
  missingTrackedFiles,
  ignoredBuildAndDependencyArtifactsExcluded: true,
};
accept("delivery_tree_is_nonempty_and_hash_sealed",
  deliveryTree.fileCount > 0 && deliveryTree.byteCount > 0
    && /^[0-9a-f]{64}$/u.test(deliveryTree.sha256));

const report = {
  schemaVersion: "starcraft_tmg_ticket_22_final_acceptance_report_v1",
  ticket: 22,
  slices: [210, 211, 212, 213, 214],
  status: "passed_with_external_gates",
  generatedAt: new Date().toISOString(),
  acceptance: {
    passed: Object.values(checks).filter(Boolean).length,
    total: Object.keys(checks).length,
    checks,
    blockingTicket22Findings: 0,
  },
  projectProgress: {
    completedTickets: 21,
    totalTickets: 22,
    remaining: ["ticket14.physical_device_acceptance"],
  },
  readiness: expectedReadiness,
  unresolvedExternalGateCodes: expectedExternalGates,
  evidence: {
    documents: docEvidence,
    apk: { path: relative(apkPath), bytes: apkBytes.byteLength,
      sha256: apkSha256, distributionReady: false,
      physicalDeviceAccepted: false },
    browserScreenshot: { path: relative(screenshotPath),
      bytes: screenshotBytes.byteLength, sha256: hash(screenshotBytes) },
    strategySkills: skillEvidence,
  },
  repository,
  deliveryTree,
  historicalProviderLedger: reports.ticket18.tokenAndCostLedger,
  currentRunModelUsage: {
    providerCalls: 0, inputTokens: 0, outputTokens: 0, estimatedCostCny: 0,
  },
  sourceRefreshPerformed: false,
  learnerTrained: false,
  trainingTruth: false,
  claims: {
    localDemoReady: true,
    controlledExperimentReady: true,
    arbitraryRosterCompleteMatchProven: false,
    universalStrategyStrengthProven: false,
    productionWebReady: false,
    productionAppReady: false,
    physicalDeviceAcceptancePassed: false,
    trainingEligibleRunReady: false,
  },
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
