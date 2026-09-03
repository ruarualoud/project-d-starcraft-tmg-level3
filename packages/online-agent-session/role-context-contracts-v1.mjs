import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { getStarcraftTmgModeCapability } from
  "../character-agent/mode-capability-v1.mjs";
import { containsStarcraftTmgOnlineCredentialMaterialV1 } from
  "./portable-credential-material-v1.mjs";

export const STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_CONTRACT_VERSION =
  "starcraft_tmg_online_role_context_contract_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const ACCEPTED_SKILL_STATUSES = new Set(["replay_passed", "human_reviewed"]);
const ACCEPTED_MEMORY_STATUSES = new Set(["accepted", "curated"]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field, maximum = 512) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  if (normalized.length > maximum) throw new TypeError(`${field} exceeds ${maximum} characters`);
  return normalized;
}

function hash(value, field) {
  const normalized = requiredString(value, field, 64).toLowerCase();
  if (!HASH_PATTERN.test(normalized)) throw new TypeError(`${field} must be a sha256 hash`);
  return normalized;
}

function seal(value, hashField) {
  const unsigned = clone(value);
  if (containsStarcraftTmgOnlineCredentialMaterialV1(unsigned)) {
    throw new TypeError("online role context contains credential material");
  }
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function normalizeSkillArtifact(value, binding) {
  if (!object(value)) throw new TypeError("skillArtifact must be an object");
  const artifact = clone(value);
  if (artifact.schema !== "project_d_game_skill_v1") {
    throw new TypeError("skillArtifact schema mismatch");
  }
  if (artifact.gameId !== "starcraft-tmg" || artifact.gameId !== binding.gameId) {
    throw new TypeError("cross-game Skill is forbidden");
  }
  if (artifact.rulesVersion !== binding.rulesVersion) {
    throw new TypeError("cross-rules-version Skill is forbidden");
  }
  const status = requiredString(artifact.status, "skillArtifact.status", 40);
  if (!ACCEPTED_SKILL_STATUSES.has(status)) {
    throw new TypeError("unpromoted Skill is forbidden at online runtime");
  }
  requiredString(artifact.skillId, "skillArtifact.skillId", 240);
  requiredString(artifact.version, "skillArtifact.version", 120);
  requiredString(artifact.skillType, "skillArtifact.skillType", 80);
  if (!Array.isArray(artifact.sourceRefs) || artifact.sourceRefs.length === 0) {
    throw new TypeError("runtime Skill requires sourceRefs");
  }
  if (!Array.isArray(artifact.appRuleEndpoints)
    || artifact.appRuleEndpoints.length === 0) {
    throw new TypeError("runtime Skill requires appRuleEndpoints");
  }
  if (artifact.canAffectRules === true || artifact.trainingTruth === true) {
    throw new TypeError("online Skill cannot become Rules or training truth");
  }
  return deepFreeze(artifact);
}

export function createStarcraftTmgOnlineRuleSkillSnapshotV1(input = {}) {
  const binding = {
    gameId: requiredString(input.gameId || "starcraft-tmg", "gameId", 80),
    roomId: requiredString(input.roomId, "roomId", 240),
    roomBindingHash: hash(input.roomBindingHash, "roomBindingHash"),
    rulesVersion: requiredString(input.rulesVersion, "rulesVersion", 160),
    dataVersion: requiredString(input.dataVersion, "dataVersion", 160),
    sourceSnapshotHash: hash(input.sourceSnapshotHash, "sourceSnapshotHash"),
  };
  if (binding.gameId !== "starcraft-tmg") throw new TypeError("cross-game Skill snapshot is forbidden");
  if (!Array.isArray(input.skillEntries) || input.skillEntries.length > 64) {
    throw new TypeError("skillEntries must contain at most 64 Skills");
  }
  const skillEntries = input.skillEntries.map((entry) => {
    const skillArtifact = normalizeSkillArtifact(entry?.skillArtifact, binding);
    const skillHash = hashStarcraftTmgContract(skillArtifact);
    if (entry.skillHash !== undefined && hash(entry.skillHash, "skillHash") !== skillHash) {
      throw new TypeError("runtime Skill hash mismatch");
    }
    return deepFreeze({ skillHash, skillArtifact });
  });
  const refs = skillEntries.map(({ skillHash, skillArtifact }) => ({
    id: skillArtifact.skillId,
    version: skillArtifact.version,
    hash: skillHash,
    skillType: skillArtifact.skillType,
    status: skillArtifact.status,
    trustTier: skillArtifact.trustTier || "unspecified",
  }));
  refs.sort((left, right) => left.id.localeCompare(right.id)
    || left.version.localeCompare(right.version));
  return seal({
    schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_CONTRACT_VERSION}.rule-skill-snapshot`,
    ...binding,
    skillEntries,
    skillRefs: refs,
    skillSetHash: hashStarcraftTmgContract(refs),
    rulesAuthority: "external_rules_service",
    skillsMayOverrideRules: false,
    generatedDuringLiveTurn: false,
    trainingTruth: false,
  }, "snapshotHash");
}

export function assertStarcraftTmgOnlineRuleSkillSnapshotV1(value, binding) {
  if (!object(value)) throw new TypeError("rule Skill snapshot is required");
  const normalized = createStarcraftTmgOnlineRuleSkillSnapshotV1(value);
  if (normalized.snapshotHash !== value.snapshotHash) {
    throw new TypeError("rule Skill snapshot integrity mismatch");
  }
  if (normalized.roomId !== binding.roomId
    || normalized.roomBindingHash !== binding.roomBindingHash
    || normalized.rulesVersion !== binding.rulesVersion
    || normalized.dataVersion !== binding.dataVersion
    || normalized.sourceSnapshotHash !== binding.sourceSnapshotHash) {
    throw new TypeError("rule Skill snapshot room binding mismatch");
  }
  return normalized;
}

function normalizeMemoryEntry(entry, binding, allowedNamespaces) {
  if (!object(entry)) throw new TypeError("memory entry must be an object");
  const namespace = requiredString(entry.namespace, "memory.namespace", 100);
  if (!allowedNamespaces.has(namespace)) {
    throw new TypeError(`memory namespace ${namespace} is forbidden for ${binding.mode}`);
  }
  const status = requiredString(entry.status, "memory.status", 40);
  if (!ACCEPTED_MEMORY_STATUSES.has(status)) {
    throw new TypeError("unaccepted memory is forbidden at online runtime");
  }
  if (entry.advisoryOnly !== true || entry.canAffectRules === true
    || entry.trainingTruth === true) {
    throw new TypeError("memory must remain advisory and non-Rules");
  }
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_CONTRACT_VERSION}.memory-entry`,
    gameId: binding.gameId,
    roomId: binding.roomId,
    principalScopeHash: binding.principalScopeHash,
    mode: binding.mode,
    namespace,
    refId: requiredString(entry.refId, "memory.refId", 240),
    version: requiredString(entry.version, "memory.version", 120),
    content: clone(entry.content),
    status,
    advisoryOnly: true,
    mayInfluenceDecision: binding.mode === "opponent"
      && namespace === "strategy_memory",
    canAffectRules: false,
    trainingTruth: false,
  };
  const normalized = seal(unsigned, "entryHash");
  if (entry.entryHash !== undefined
    && hash(entry.entryHash, "memory.entryHash") !== normalized.entryHash) {
    throw new TypeError("memory entry integrity mismatch");
  }
  return normalized;
}

export function createStarcraftTmgOnlineMemorySnapshotV1(input = {}) {
  const mode = requiredString(input.mode, "mode", 40).toLowerCase();
  const capability = getStarcraftTmgModeCapability(mode);
  const binding = {
    gameId: requiredString(input.gameId || "starcraft-tmg", "gameId", 80),
    roomId: requiredString(input.roomId, "roomId", 240),
    principalScopeHash: hash(input.principalScopeHash, "principalScopeHash"),
    sessionBindingHash: hash(input.sessionBindingHash, "sessionBindingHash"),
    mode,
  };
  if (binding.gameId !== "starcraft-tmg") throw new TypeError("cross-game memory is forbidden");
  if (!Array.isArray(input.entries) || input.entries.length > 64) {
    throw new TypeError("memory entries must contain at most 64 items");
  }
  const allowedNamespaces = new Set(capability.memoryNamespaces);
  const entries = input.entries.map((entry) =>
    normalizeMemoryEntry(entry, binding, allowedNamespaces));
  const refs = entries.map((entry) => ({
    namespace: entry.namespace,
    refId: entry.refId,
    version: entry.version,
    hash: entry.entryHash,
  }));
  return seal({
    schemaVersion: `${STARCRAFT_TMG_ONLINE_ROLE_CONTEXT_CONTRACT_VERSION}.memory-snapshot`,
    ...binding,
    allowedNamespaces: [...capability.memoryNamespaces],
    entries,
    refs,
    memorySetHash: hashStarcraftTmgContract(refs),
    writesPerformed: 0,
    promotionAttempted: false,
    rulesAuthority: "external_rules_service",
    trainingTruth: false,
  }, "snapshotHash");
}

export function assertStarcraftTmgOnlineMemorySnapshotV1(value, binding) {
  if (!object(value)) throw new TypeError("memory snapshot is required");
  const normalized = createStarcraftTmgOnlineMemorySnapshotV1(value);
  if (normalized.snapshotHash !== value.snapshotHash) {
    throw new TypeError("memory snapshot integrity mismatch");
  }
  if (normalized.roomId !== binding.roomId
    || normalized.principalScopeHash !== binding.principalScopeHash
    || normalized.sessionBindingHash !== binding.sessionBindingHash
    || normalized.mode !== binding.mode) {
    throw new TypeError("memory snapshot session scope mismatch");
  }
  return normalized;
}

export function containsStarcraftTmgOnlineContextCredentialMaterialV1(value) {
  return containsStarcraftTmgOnlineCredentialMaterialV1(value);
}
