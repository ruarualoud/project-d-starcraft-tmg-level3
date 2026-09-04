import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "../online-agent-session/portable-credential-material-v1.mjs";

export const DISPOSABLE_OS_ISOLATION_ATTESTATION_SCHEMA =
  "starcraft_tmg_disposable_os_isolation_attestation_v1";
export const DISPOSABLE_OS_JOB_RECEIPT_SCHEMA =
  "starcraft_tmg_disposable_os_job_receipt_v1";
export const DISPOSABLE_OS_RUNNER_VERSION =
  "starcraft_tmg_disposable_os_runner_v1";

const BACKEND = "macos_sandbox_exec_behaviorally_attested_v1";
const SANDBOX_EXECUTABLE = "/usr/bin/sandbox-exec";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u;
const MAX_ENTRY_BYTES = 4 * 1024 * 1024;
const MAX_STAGED_INPUT_BYTES = 16 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 60_000;
const DETACHED_KEY_PATTERN = /\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}/iu;

const PROTECTED_RELATIVE_PATHS = Object.freeze([
  {
    capability: "rules_runtime",
    relativePath: "packages/authoritative-engine/transition-v1.mjs",
  },
  {
    capability: "room_runtime",
    relativePath: "packages/room-runtime/in-memory-room-v1.mjs",
  },
  {
    capability: "skill_registry",
    relativePath: "packages/skill-generation-runtime/current-official-evidence-v1.mjs",
  },
]);

const PRIVATE_READ_DENY_ROOTS = Object.freeze([
  "/Users",
  "/Volumes",
  "/Network",
  "/Applications",
  "/private/etc",
  "/Library/Application Support",
  "/Library/Preferences",
  "/Library/Keychains",
  "/Library/Logs",
  "/usr/local/etc",
  "/usr/local/var",
  "/opt",
]);

const PROFILE_TEMPLATE = Object.freeze({
  version: 1,
  defaultDecision: "deny",
  runtimeReadPolicy:
    "system_runtime_reads_only_after_explicit_private_data_configuration_and_repository_denies",
  deniedPrivateReadRoots: [...PRIVATE_READ_DENY_ROOTS],
  deniedTemporaryReadDataRoots: ["/private/var", "/private/tmp"],
  deniedRepositoryRoot: "${REPOSITORY_ROOT}",
  deniedOuterSentinels: ["${HOST_DATA_PATH}", "${OUTSIDE_WRITE_PATH}"],
  stagedReadRoot: "${JOB_ROOT}",
  writableRoots: ["${OUTPUT_ROOT}", "${TMP_ROOT}"],
  executable: "${NODE_EXECUTABLE}",
  network: "deny_all_direct_network_no_broker_mounted",
  process: "deny_fork_and_allow_only_initial_exact_node_exec",
  sysctl: "read_only_for_node_startup",
});

export const DISPOSABLE_OS_PROFILE_TEMPLATE_HASH =
  hashStarcraftTmgContract(PROFILE_TEMPLATE);

const PROBE_WORKER_SOURCE = String.raw`import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import net from "node:net";

const [requestPath, responsePath] = process.argv.slice(2);
const request = JSON.parse(await readFile(requestPath, "utf8"));
const deniedCodes = new Set(["EPERM", "EACCES"]);

async function readAttempt(target) {
  try {
    await readFile(target);
    return { denied: false, code: "ALLOWED" };
  } catch (error) {
    return { denied: deniedCodes.has(error?.code), code: String(error?.code || "UNKNOWN") };
  }
}

async function writeAttempt(target) {
  try {
    await writeFile(target, "escape", "utf8");
    return { denied: false, code: "ALLOWED" };
  } catch (error) {
    return { denied: deniedCodes.has(error?.code), code: String(error?.code || "UNKNOWN") };
  }
}

async function spawnAttempt() {
  return await new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      const child = spawn("/bin/sh", ["-c", "exit 0"], { stdio: "ignore" });
      child.once("error", (error) => finish({
        denied: deniedCodes.has(error?.code),
        code: String(error?.code || "UNKNOWN"),
      }));
      child.once("exit", () => finish({ denied: false, code: "ALLOWED" }));
    } catch (error) {
      finish({
        denied: deniedCodes.has(error?.code),
        code: String(error?.code || "UNKNOWN"),
      });
    }
  });
}

async function networkAttempt(host, port) {
  return await new Promise((resolve) => {
    let settled = false;
    const socket = new net.Socket();
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(1500, () => finish({ denied: false, code: "TIMEOUT" }));
    socket.once("error", (error) => finish({
      denied: deniedCodes.has(error?.code),
      code: String(error?.code || "UNKNOWN"),
    }));
    socket.connect({ host, port }, () => finish({ denied: false, code: "ALLOWED" }));
  });
}

const stagedBytes = await readFile(request.stagedInputPath);
const stagedInputHash = createHash("sha256").update(stagedBytes).digest("hex");
const protectedReads = [];
for (const target of request.protectedReadTargets) {
  protectedReads.push({
    capability: target.capability,
    ...await readAttempt(target.path),
  });
}

const response = {
  schemaVersion: "starcraft_tmg_disposable_os_probe_result_v1",
  stagedInputReadable: true,
  stagedInputHash,
  hostDataRead: await readAttempt(request.hostDataPath),
  protectedReads,
  outsideWrite: await writeAttempt(request.outsideWritePath),
  unapprovedProcess: await spawnAttempt(),
  directNetwork: await networkAttempt(request.loopback.host, request.loopback.port),
  environmentKeys: Object.keys(process.env).sort(),
};
await writeFile(responsePath, JSON.stringify(response), "utf8");
`;

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function exactKeys(value, required, optional, code) {
  if (!object(value)) fail(code);
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !Object.hasOwn(value, key))
    || Object.keys(value).some((key) => !allowed.has(key))) fail(code);
}

function integer(value, code, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail(code);
  return value;
}

function safeId(value, code) {
  const result = String(value || "");
  if (!ID_PATTERN.test(result)) fail(code);
  return result;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(target) {
  const digest = createHash("sha256");
  const bytes = await readFile(target);
  digest.update(bytes);
  return digest.digest("hex");
}

function assertAbsoluteSafePath(value, code) {
  if (typeof value !== "string" || !path.isAbsolute(value)
    || /["\\\r\n\0]/u.test(value)) fail(code);
  return value;
}

function sbplLiteral(value) {
  return JSON.stringify(assertAbsoluteSafePath(value, "ISOLATION_PROFILE_PATH_INVALID"));
}

function profileFor({
  jobRoot,
  outputRoot,
  tmpRoot,
  nodeExecutable,
  repositoryRoot,
  hostDataPath,
  outsideWritePath,
}) {
  const lines = [
    "(version 1)",
    "(deny default)",
    "(allow file-read*)",
    ...PRIVATE_READ_DENY_ROOTS.map((root) =>
      `(deny file-read* (subpath ${sbplLiteral(root)}))`),
    `(deny file-read-data (subpath ${sbplLiteral("/private/var")}))`,
    `(deny file-read-data (subpath ${sbplLiteral("/private/tmp")}))`,
    `(deny file-read* (subpath ${sbplLiteral(repositoryRoot)}))`,
    `(deny file-read* (literal ${sbplLiteral(hostDataPath)}))`,
    `(deny file-read* (literal ${sbplLiteral(outsideWritePath)}))`,
    `(allow file-read-data (subpath ${sbplLiteral(jobRoot)}))`,
    `(allow file-write* (subpath ${sbplLiteral(outputRoot)}))`,
    `(allow file-write* (subpath ${sbplLiteral(tmpRoot)}))`,
    `(allow file-write-data (literal ${sbplLiteral("/dev/null")}))`,
    `(allow process-exec (literal ${sbplLiteral(nodeExecutable)}))`,
    "(allow sysctl-read)",
    "(deny network*)",
  ];
  return `${lines.join("\n")}\n`;
}

function zeroExternalUsage() {
  return freeze({
    providerCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    totalTokens: 0,
    estimatedUsd: "0.00000000",
    estimatedCny: "0.00",
  });
}

function assertZeroExternalUsage(value, code) {
  exactKeys(value, [
    "providerCalls", "inputTokens", "outputTokens", "cacheHitTokens",
    "cacheMissTokens", "totalTokens", "estimatedUsd", "estimatedCny",
  ], [], code);
  if (value.providerCalls !== 0 || value.inputTokens !== 0
    || value.outputTokens !== 0 || value.cacheHitTokens !== 0
    || value.cacheMissTokens !== 0 || value.totalTokens !== 0
    || value.estimatedUsd !== "0.00000000" || value.estimatedCny !== "0.00") {
    fail(code);
  }
}

function assertNoAuthority(value, code) {
  exactKeys(value, [
    "canAffectRules", "canOperateRoom", "canReadSkillRegistry",
    "canPublishSkill", "canWriteMemory", "canCreateTrainingTruth",
  ], [], code);
  if (Object.values(value).some((entry) => entry !== false)) fail(code);
}

async function assertSecureExecutable(target, code) {
  const canonical = await realpath(target).catch(() => fail(code));
  if (canonical !== target) fail(code, "symlink_or_alias");
  const metadata = await stat(canonical).catch(() => fail(code));
  if (!metadata.isFile() || metadata.uid !== 0 || (metadata.mode & 0o022) !== 0) {
    fail(code, "ownership_or_mode");
  }
  await access(canonical).catch(() => fail(code, "not_accessible"));
  return freeze({
    path: canonical,
    sha256: await sha256File(canonical),
    sizeBytes: metadata.size,
    uid: metadata.uid,
    mode: metadata.mode & 0o777,
  });
}

export function selectDisposableIsolationBackendV1(input) {
  exactKeys(input, ["platform", "sandboxExecQualified", "containerQualified"], [],
    "ISOLATION_BACKEND_SELECTION_INVALID");
  if (input.containerQualified === true) {
    fail("ISOLATION_CONTAINER_BACKEND_NOT_IMPLEMENTED");
  }
  if (input.platform === "darwin" && input.sandboxExecQualified === true) {
    return BACKEND;
  }
  fail("ISOLATION_BACKEND_UNAVAILABLE");
}

async function listenLoopback() {
  const server = createServer();
  let connections = 0;
  server.on("connection", (socket) => {
    connections += 1;
    socket.destroy();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!object(address)) fail("ISOLATION_LOOPBACK_LISTENER_FAILED");
  return {
    server,
    host: "127.0.0.1",
    port: address.port,
    connections: () => connections,
  };
}

async function closeServer(server) {
  await new Promise((resolve, reject) => server.close((error) => (
    error ? reject(error) : resolve()
  )));
}

async function waitForChild(child, timeoutMs) {
  return await new Promise((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, timedOut });
    });
  });
}

async function assertRemoved(target) {
  try {
    await access(target);
    fail("ISOLATION_DISPOSAL_FAILED");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function parseSafeOutput(bytes) {
  if (bytes.byteLength < 2 || bytes.byteLength > MAX_OUTPUT_BYTES) {
    fail("ISOLATION_OUTPUT_SIZE_INVALID");
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("ISOLATION_OUTPUT_JSON_INVALID");
  }
  if (!object(value) || containsCredentialMaterial(value)) {
    fail("ISOLATION_OUTPUT_UNSAFE");
  }
  return value;
}

function containsCredentialMaterial(value) {
  let serialized;
  try {
    serialized = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return true;
  }
  return containsStarcraftTmgOnlineCredentialMaterialV1(value)
    || DETACHED_KEY_PATTERN.test(serialized);
}

async function executeOnce({
  jobId,
  entrySource,
  stagedInput,
  timeoutMs,
  nodeExecutable,
  repositoryRoot,
  protectedReadTargets = [],
}) {
  const entryBytes = Buffer.from(entrySource, "utf8");
  const stagedBytes = Buffer.from(`${JSON.stringify(stagedInput)}\n`, "utf8");
  if (entryBytes.byteLength < 1 || entryBytes.byteLength > MAX_ENTRY_BYTES) {
    fail("ISOLATION_ENTRY_SIZE_INVALID");
  }
  if (stagedBytes.byteLength < 3 || stagedBytes.byteLength > MAX_STAGED_INPUT_BYTES) {
    fail("ISOLATION_STAGED_INPUT_SIZE_INVALID");
  }

  const outerRoot = await mkdtemp(path.join(os.tmpdir(), "starcraft-tmg-dsh-job-"));
  const jobRoot = path.join(outerRoot, "job");
  const runtimeRoot = path.join(jobRoot, "runtime");
  const inputRoot = path.join(jobRoot, "input");
  const outputRoot = path.join(jobRoot, "output");
  const tmpRoot = path.join(jobRoot, "tmp");
  const entryPath = path.join(runtimeRoot, "worker.mjs");
  const requestPath = path.join(inputRoot, "request.json");
  const responsePath = path.join(outputRoot, "response.json");
  const profilePath = path.join(outerRoot, "sandbox.sb");
  const hostDataPath = path.join(outerRoot, "host-data.bin");
  const outsideWritePath = path.join(outerRoot, "escape.bin");
  let primaryError;
  let execution;
  let parsedOutput;
  let profileHash;
  const startedAt = Date.now();

  try {
    await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
    await mkdir(inputRoot, { recursive: true, mode: 0o700 });
    await mkdir(outputRoot, { recursive: true, mode: 0o700 });
    await mkdir(tmpRoot, { recursive: true, mode: 0o700 });
    await writeFile(entryPath, entryBytes, { mode: 0o400 });
    await writeFile(hostDataPath, randomUUID(), { mode: 0o600 });

    const stagedInputPath = path.join(inputRoot, "staged-input.json");
    await writeFile(stagedInputPath, stagedBytes, { mode: 0o400 });
    const request = protectedReadTargets.length > 0
      ? {
          ...stagedInput,
          stagedInputPath,
          hostDataPath,
          outsideWritePath,
          protectedReadTargets,
        }
      : stagedInput;
    const requestBytes = Buffer.from(`${JSON.stringify(request)}\n`, "utf8");
    if (requestBytes.byteLength > MAX_STAGED_INPUT_BYTES) {
      fail("ISOLATION_REQUEST_SIZE_INVALID");
    }
    await writeFile(requestPath, requestBytes, { mode: 0o400 });
    await chmod(runtimeRoot, 0o500);
    await chmod(inputRoot, 0o500);

    const canonicalOuterRoot = await realpath(outerRoot);
    const canonicalJobRoot = await realpath(jobRoot);
    const canonicalOutputRoot = await realpath(outputRoot);
    const canonicalTmpRoot = await realpath(tmpRoot);
    const profile = profileFor({
      jobRoot: canonicalJobRoot,
      outputRoot: canonicalOutputRoot,
      tmpRoot: canonicalTmpRoot,
      nodeExecutable,
      repositoryRoot,
      hostDataPath: path.join(canonicalOuterRoot, "host-data.bin"),
      outsideWritePath: path.join(canonicalOuterRoot, "escape.bin"),
    });
    profileHash = sha256(profile);
    await writeFile(profilePath, profile, { mode: 0o400 });

    const child = spawn(SANDBOX_EXECUTABLE, [
      "-f",
      profilePath,
      nodeExecutable,
      entryPath,
      requestPath,
      responsePath,
    ], {
      cwd: jobRoot,
      detached: true,
      env: {
        LANG: "C",
        NODE_NO_WARNINGS: "1",
        TMPDIR: tmpRoot,
      },
      shell: false,
      stdio: "ignore",
    });
    execution = await waitForChild(child, timeoutMs);
    if (execution.timedOut) fail("ISOLATION_WORKER_TIMEOUT");
    if (execution.code !== 0 || execution.signal !== null) {
      fail("ISOLATION_WORKER_EXIT_INVALID",
        `${String(execution.code)}:${String(execution.signal)}`);
    }
    const outputBytes = await readFile(responsePath)
      .catch(() => fail("ISOLATION_OUTPUT_MISSING"));
    parsedOutput = parseSafeOutput(outputBytes);
  } catch (error) {
    primaryError = error;
  }

  let cleanupVerified = false;
  try {
    await chmod(path.join(outerRoot, "job", "runtime"), 0o700).catch(() => {});
    await chmod(path.join(outerRoot, "job", "input"), 0o700).catch(() => {});
    await rm(outerRoot, { recursive: true, force: false });
    await assertRemoved(outerRoot);
    cleanupVerified = true;
  } catch (cleanupError) {
    if (!primaryError) primaryError = cleanupError;
  }
  if (primaryError) {
    primaryError.cleanupVerified = cleanupVerified;
    throw primaryError;
  }
  return freeze({
    jobId,
    output: parsedOutput,
    outputHash: hashStarcraftTmgContract(parsedOutput),
    entryHash: sha256(entryBytes),
    stagedInputHash: sha256(stagedBytes),
    profileHash,
    exitCode: execution.code,
    signal: execution.signal,
    timedOut: execution.timedOut,
    elapsedMs: Date.now() - startedAt,
    cleanupVerified,
  });
}

export function verifyDisposableOsIsolationAttestationV1(value) {
  exactKeys(value, [
    "schemaVersion", "runnerVersion", "backend", "attestedAt",
    "backendBinding", "profileTemplateHash", "behavioralProof",
    "capabilities", "externalUsage", "authority", "attestationHash",
  ], [], "ISOLATION_ATTESTATION_SHAPE_INVALID");
  if (value.schemaVersion !== DISPOSABLE_OS_ISOLATION_ATTESTATION_SCHEMA
    || value.runnerVersion !== DISPOSABLE_OS_RUNNER_VERSION
    || value.backend !== BACKEND
    || value.profileTemplateHash !== DISPOSABLE_OS_PROFILE_TEMPLATE_HASH
    || !HASH_PATTERN.test(value.attestationHash)) {
    fail("ISOLATION_ATTESTATION_IDENTITY_INVALID");
  }
  const { attestationHash, ...body } = value;
  if (attestationHash !== hashStarcraftTmgContract(body)) {
    fail("ISOLATION_ATTESTATION_HASH_INVALID");
  }
  exactKeys(value.backendBinding, [
    "host", "sandboxExecutableHash", "nodeExecutableHash",
    "repositoryRootHash",
  ], [], "ISOLATION_BACKEND_BINDING_INVALID");
  if (typeof value.backendBinding.host !== "string"
    || !HASH_PATTERN.test(value.backendBinding.sandboxExecutableHash)
    || !HASH_PATTERN.test(value.backendBinding.nodeExecutableHash)
    || !HASH_PATTERN.test(value.backendBinding.repositoryRootHash)
    || !Number.isFinite(Date.parse(value.attestedAt))) {
    fail("ISOLATION_BACKEND_BINDING_INVALID");
  }
  const proof = value.behavioralProof;
  exactKeys(proof, [
    "stagedInputReadable", "stagedInputHashMatched", "hostDataReadDenied",
    "protectedReadsDenied", "protectedReadsTotal", "outsideWriteDenied",
    "unapprovedProcessDenied", "directNetworkDenied",
    "loopbackConnectionsAccepted", "environmentAllowlistPassed",
    "cleanupVerified", "denialCodes",
  ], [], "ISOLATION_BEHAVIORAL_PROOF_INVALID");
  exactKeys(proof.denialCodes, [
    "hostDataRead", "outsideWrite", "unapprovedProcess", "directNetwork",
  ], [], "ISOLATION_BEHAVIORAL_PROOF_INVALID");
  if (proof.stagedInputReadable !== true
    || proof.stagedInputHashMatched !== true || proof.hostDataReadDenied !== true
    || proof.outsideWriteDenied !== true || proof.unapprovedProcessDenied !== true
    || proof.directNetworkDenied !== true || proof.loopbackConnectionsAccepted !== 0
    || proof.protectedReadsDenied !== PROTECTED_RELATIVE_PATHS.length
    || proof.protectedReadsTotal !== PROTECTED_RELATIVE_PATHS.length
    || proof.cleanupVerified !== true || proof.environmentAllowlistPassed !== true) {
    fail("ISOLATION_BEHAVIORAL_PROOF_INVALID");
  }
  if (Object.values(proof.denialCodes)
    .some((code) => !["EPERM", "EACCES"].includes(code))) {
    fail("ISOLATION_BEHAVIORAL_PROOF_INVALID");
  }
  exactKeys(value.capabilities, [
    "providerBrokerMounted", "roomMounted", "rulesMounted",
    "skillRegistryMounted", "directNetworkAllowed",
    "unapprovedProcessAllowed",
  ], [], "ISOLATION_CAPABILITY_FIREWALL_INVALID");
  if (value.capabilities.providerBrokerMounted !== false
    || value.capabilities.roomMounted !== false
    || value.capabilities.rulesMounted !== false
    || value.capabilities.skillRegistryMounted !== false
    || value.capabilities.directNetworkAllowed !== false
    || value.capabilities.unapprovedProcessAllowed !== false) {
    fail("ISOLATION_CAPABILITY_FIREWALL_INVALID");
  }
  assertZeroExternalUsage(value.externalUsage, "ISOLATION_USAGE_INVALID");
  assertNoAuthority(value.authority, "ISOLATION_AUTHORITY_INVALID");
  return value;
}

export function verifyDisposableOsJobReceiptV1(value, attestation) {
  verifyDisposableOsIsolationAttestationV1(attestation);
  exactKeys(value, [
    "schemaVersion", "runnerVersion", "jobId", "backend",
    "attestationHash", "profileTemplateHash", "profileHash", "entryHash",
    "stagedInputHash", "outputHash", "execution", "capabilities",
    "externalUsage", "authority", "receiptHash",
  ], [], "ISOLATION_JOB_RECEIPT_SHAPE_INVALID");
  const { receiptHash, ...body } = value;
  if (value.schemaVersion !== DISPOSABLE_OS_JOB_RECEIPT_SCHEMA
    || value.runnerVersion !== DISPOSABLE_OS_RUNNER_VERSION
    || value.backend !== BACKEND
    || value.attestationHash !== attestation.attestationHash
    || value.profileTemplateHash !== DISPOSABLE_OS_PROFILE_TEMPLATE_HASH
    || !HASH_PATTERN.test(value.profileHash) || !HASH_PATTERN.test(value.entryHash)
    || !HASH_PATTERN.test(value.stagedInputHash) || !HASH_PATTERN.test(value.outputHash)
    || receiptHash !== hashStarcraftTmgContract(body)) {
    fail("ISOLATION_JOB_RECEIPT_IDENTITY_INVALID");
  }
  exactKeys(value.execution, [
    "exitCode", "signal", "timedOut", "elapsedMs", "cleanupVerified",
  ], [], "ISOLATION_JOB_EXECUTION_INVALID");
  if (value.execution.exitCode !== 0
    || value.execution.signal !== null || value.execution.timedOut !== false
    || value.execution.cleanupVerified !== true
    || !Number.isSafeInteger(value.execution.elapsedMs)
    || value.execution.elapsedMs < 0) {
    fail("ISOLATION_JOB_EXECUTION_INVALID");
  }
  exactKeys(value.capabilities, [
    "providerBrokerMounted", "directNetworkAllowed", "repositoryMounted",
    "writableRoots",
  ], [], "ISOLATION_JOB_CAPABILITIES_INVALID");
  if (value.capabilities.providerBrokerMounted !== false
    || value.capabilities.directNetworkAllowed !== false
    || value.capabilities.repositoryMounted !== false
    || JSON.stringify(value.capabilities.writableRoots)
      !== JSON.stringify(["ephemeral_output", "ephemeral_tmp"])) {
    fail("ISOLATION_JOB_CAPABILITIES_INVALID");
  }
  assertZeroExternalUsage(value.externalUsage, "ISOLATION_JOB_USAGE_INVALID");
  assertNoAuthority(value.authority, "ISOLATION_JOB_AUTHORITY_INVALID");
  return value;
}

export function createDisposableOsSkillRunnerV1({ repositoryRoot }) {
  const requestedRoot = assertAbsoluteSafePath(repositoryRoot,
    "ISOLATION_REPOSITORY_ROOT_INVALID");
  let attestation;
  let backendBinding;

  async function qualify() {
    if (backendBinding) return backendBinding;
    if (process.platform !== "darwin") fail("ISOLATION_BACKEND_UNAVAILABLE");
    const canonicalRoot = await realpath(requestedRoot)
      .catch(() => fail("ISOLATION_REPOSITORY_ROOT_INVALID"));
    if (canonicalRoot !== requestedRoot) fail("ISOLATION_REPOSITORY_ROOT_INVALID");
    const sandbox = await assertSecureExecutable(
      SANDBOX_EXECUTABLE, "ISOLATION_SANDBOX_EXEC_INVALID");
    const node = await assertSecureExecutable(
      process.execPath, "ISOLATION_NODE_EXEC_INVALID");
    const protectedTargets = [];
    for (const entry of PROTECTED_RELATIVE_PATHS) {
      const target = path.join(canonicalRoot, entry.relativePath);
      const canonicalTarget = await realpath(target)
        .catch(() => fail("ISOLATION_PROTECTED_TARGET_MISSING", entry.capability));
      if (!canonicalTarget.startsWith(`${canonicalRoot}${path.sep}`)) {
        fail("ISOLATION_PROTECTED_TARGET_INVALID", entry.capability);
      }
      protectedTargets.push({ capability: entry.capability, path: canonicalTarget });
    }
    selectDisposableIsolationBackendV1({
      platform: process.platform,
      sandboxExecQualified: true,
      containerQualified: false,
    });
    backendBinding = freeze({
      backend: BACKEND,
      host: `${process.platform}_${process.arch}`,
      sandbox,
      node,
      repositoryRootHash: sha256(canonicalRoot),
      protectedCapabilities: protectedTargets.map((entry) => entry.capability),
      protectedTargets,
    });
    return backendBinding;
  }

  async function attest() {
    if (attestation) return attestation;
    const binding = await qualify();
    const listener = await listenLoopback();
    let execution;
    try {
      const marker = { marker: "staged_only_attestation_v1" };
      const markerBytes = Buffer.from(`${JSON.stringify(marker)}\n`, "utf8");
      execution = await executeOnce({
        jobId: "isolation-attestation-v1",
        entrySource: PROBE_WORKER_SOURCE,
        stagedInput: {
          schemaVersion: "starcraft_tmg_disposable_os_probe_request_v1",
          expectedStagedSha256: sha256(markerBytes),
          loopback: { host: listener.host, port: listener.port },
        },
        timeoutMs: DEFAULT_TIMEOUT_MS,
        nodeExecutable: binding.node.path,
        repositoryRoot: requestedRoot,
        protectedReadTargets: binding.protectedTargets,
      });
    } finally {
      await closeServer(listener.server);
    }
    const output = execution.output;
    const expectedKeys = ["LANG", "NODE_NO_WARNINGS", "TMPDIR"].sort();
    const allProtectedDenied = Array.isArray(output.protectedReads)
      && output.protectedReads.length === PROTECTED_RELATIVE_PATHS.length
      && output.protectedReads.every((entry) => entry.denied === true);
    const stagedInputHashMatched = output.stagedInputHash
      === execution.stagedInputHash;
    const behavior = {
      stagedInputReadable: output.stagedInputReadable === true,
      stagedInputHashMatched,
      hostDataReadDenied: output.hostDataRead?.denied === true,
      protectedReadsDenied: allProtectedDenied ? output.protectedReads.length : 0,
      protectedReadsTotal: PROTECTED_RELATIVE_PATHS.length,
      outsideWriteDenied: output.outsideWrite?.denied === true,
      unapprovedProcessDenied: output.unapprovedProcess?.denied === true,
      directNetworkDenied: output.directNetwork?.denied === true,
      loopbackConnectionsAccepted: listener.connections(),
      environmentAllowlistPassed: Array.isArray(output.environmentKeys)
        && JSON.stringify(output.environmentKeys) === JSON.stringify(expectedKeys),
      cleanupVerified: execution.cleanupVerified,
      denialCodes: {
        hostDataRead: output.hostDataRead?.code || "MISSING",
        outsideWrite: output.outsideWrite?.code || "MISSING",
        unapprovedProcess: output.unapprovedProcess?.code || "MISSING",
        directNetwork: output.directNetwork?.code || "MISSING",
      },
    };
    const attestationBody = {
      schemaVersion: DISPOSABLE_OS_ISOLATION_ATTESTATION_SCHEMA,
      runnerVersion: DISPOSABLE_OS_RUNNER_VERSION,
      backend: BACKEND,
      attestedAt: new Date().toISOString(),
      backendBinding: {
        host: binding.host,
        sandboxExecutableHash: binding.sandbox.sha256,
        nodeExecutableHash: binding.node.sha256,
        repositoryRootHash: binding.repositoryRootHash,
      },
      profileTemplateHash: DISPOSABLE_OS_PROFILE_TEMPLATE_HASH,
      behavioralProof: behavior,
      capabilities: {
        providerBrokerMounted: false,
        roomMounted: false,
        rulesMounted: false,
        skillRegistryMounted: false,
        directNetworkAllowed: false,
        unapprovedProcessAllowed: false,
      },
      externalUsage: zeroExternalUsage(),
      authority: {
        canAffectRules: false,
        canOperateRoom: false,
        canReadSkillRegistry: false,
        canPublishSkill: false,
        canWriteMemory: false,
        canCreateTrainingTruth: false,
      },
    };
    attestation = freeze({
      ...attestationBody,
      attestationHash: hashStarcraftTmgContract(attestationBody),
    });
    verifyDisposableOsIsolationAttestationV1(attestation);
    return attestation;
  }

  async function run(input) {
    exactKeys(input, [
      "jobId", "attestationHash", "entrySource", "stagedInput",
    ], ["timeoutMs"], "ISOLATION_JOB_REQUEST_INVALID");
    if (!attestation) fail("ISOLATION_ATTESTATION_REQUIRED");
    verifyDisposableOsIsolationAttestationV1(attestation);
    if (input.attestationHash !== attestation.attestationHash) {
      fail("ISOLATION_ATTESTATION_MISMATCH");
    }
    const binding = await qualify();
    const jobId = safeId(input.jobId, "ISOLATION_JOB_ID_INVALID");
    const timeoutMs = integer(input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      "ISOLATION_TIMEOUT_INVALID", 50, MAX_TIMEOUT_MS);
    if (typeof input.entrySource !== "string" || !object(input.stagedInput)
      || containsCredentialMaterial(input.entrySource)
      || containsCredentialMaterial(input.stagedInput)) {
      fail("ISOLATION_JOB_PAYLOAD_INVALID");
    }
    const execution = await executeOnce({
      jobId,
      entrySource: input.entrySource,
      stagedInput: input.stagedInput,
      timeoutMs,
      nodeExecutable: binding.node.path,
      repositoryRoot: requestedRoot,
    });
    const receiptBody = {
      schemaVersion: DISPOSABLE_OS_JOB_RECEIPT_SCHEMA,
      runnerVersion: DISPOSABLE_OS_RUNNER_VERSION,
      jobId,
      backend: BACKEND,
      attestationHash: attestation.attestationHash,
      profileTemplateHash: DISPOSABLE_OS_PROFILE_TEMPLATE_HASH,
      profileHash: execution.profileHash,
      entryHash: execution.entryHash,
      stagedInputHash: execution.stagedInputHash,
      outputHash: execution.outputHash,
      execution: {
        exitCode: execution.exitCode,
        signal: execution.signal,
        timedOut: execution.timedOut,
        elapsedMs: execution.elapsedMs,
        cleanupVerified: execution.cleanupVerified,
      },
      capabilities: {
        providerBrokerMounted: false,
        directNetworkAllowed: false,
        repositoryMounted: false,
        writableRoots: ["ephemeral_output", "ephemeral_tmp"],
      },
      externalUsage: zeroExternalUsage(),
      authority: {
        canAffectRules: false,
        canOperateRoom: false,
        canReadSkillRegistry: false,
        canPublishSkill: false,
        canWriteMemory: false,
        canCreateTrainingTruth: false,
      },
    };
    const receipt = freeze({
      ...receiptBody,
      receiptHash: hashStarcraftTmgContract(receiptBody),
    });
    verifyDisposableOsJobReceiptV1(receipt, attestation);
    return freeze({ output: execution.output, receipt });
  }

  return freeze({ attest, run });
}
