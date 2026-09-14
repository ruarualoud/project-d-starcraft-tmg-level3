import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_IDENTITY_RBAC_VERSION =
  "starcraft_tmg_identity_rbac_v1";

const ROLES = new Set([
  "anonymous", "owner", "seat", "worker", "reviewer", "administrator",
]);
const ASSURANCE = new Set([
  "anonymous", "owner_capability", "external_identity", "workload_identity",
  "hardware_admin_mfa",
]);
const PRODUCTION_ASSURANCE = new Set([
  "external_identity", "workload_identity", "hardware_admin_mfa",
]);
const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
const HASH = /^[a-f0-9]{64}$/u;
const SECRET_KEY = /^(?:api.?key|authorization|cookie|credential(?:value|bytes|material)|secret(?:value|bytes|material)|access.?token|refresh.?token|seat.?token|bearer(?:token|value|bytes|material))$/iu;
const SECRET_VALUE = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:sk|jsk)-[A-Za-z0-9_-]{12,}/iu;

const POLICY = Object.freeze({
  "catalogue.read": { roles: ["anonymous", "owner", "seat", "worker", "reviewer", "administrator"], scope: "public" },
  "rules.read": { roles: ["anonymous", "owner", "seat", "worker", "reviewer", "administrator"], scope: "public" },
  "room.create": { roles: ["owner"], scope: "subject" },
  "room.observe": { roles: ["owner", "seat"], scope: "room" },
  "room.play": { roles: ["seat"], scope: "seat" },
  "provider.infer": { roles: ["owner", "seat"], scope: "subject_or_room", providerCredential: true },
  "skill.generate": { roles: ["owner", "worker"], scope: "subject_or_job", providerCredential: true },
  "selfplay.run": { roles: ["owner", "worker"], scope: "subject_or_job", providerCredential: true },
  "replay.private.read": { roles: ["owner", "seat"], scope: "room" },
  "skill.review": { roles: ["reviewer"], scope: "artifact", independent: true },
  "training.approve": { roles: ["reviewer"], scope: "dataset", independent: true,
    allowedClasses: ["training_eligible_run"] },
  "skill.promote": { roles: ["administrator"], scope: "deployment", approval: true,
    allowedClasses: ["production_room"] },
  "release.publish": { roles: ["administrator"], scope: "deployment", approval: true,
    allowedClasses: ["production_room"] },
  "release.rollback": { roles: ["administrator"], scope: "deployment",
    allowedClasses: ["production_room"] },
  "incident.manage": { roles: ["administrator"], scope: "deployment",
    allowedClasses: ["production_room"] },
  "telemetry.admin.read": { roles: ["administrator"], scope: "deployment",
    allowedClasses: ["production_room"] },
  "privacy.subject.delete": { roles: ["owner", "administrator"], scope: "subject" },
  "cross_user.read": { roles: ["administrator"], scope: "deployment",
    allowedClasses: ["production_room"] },
});

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function id(value, field) {
  const result = String(value || "").trim();
  if (!SAFE_ID.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function optionalId(value, field) {
  return value === undefined || value === null ? null : id(value, field);
}

function digest(value, field) {
  const result = String(value || "").toLowerCase();
  if (!HASH.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function assertNoSecrets(value, path = "$", seen = new Set()) {
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) throw new Error(`RBAC_SECRET_MATERIAL_FORBIDDEN:${path}`);
    return;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecrets(entry, `${path}[${index}]`, seen));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw new Error(`RBAC_SECRET_FIELD_FORBIDDEN:${path}.${key}`);
    assertNoSecrets(child, `${path}.${key}`, seen);
  }
}

function normalizedGrants(value) {
  if (!Array.isArray(value)) throw new TypeError("grants must be an array");
  return value.map((grant, index) => {
    if (!object(grant)) throw new TypeError(`grants[${index}] is invalid`);
    const scopeType = id(grant.scopeType, `grants[${index}].scopeType`);
    if (!["subject", "room", "seat", "job", "artifact", "dataset", "deployment"].includes(scopeType)) {
      throw new TypeError(`grants[${index}].scopeType is invalid`);
    }
    return {
      scopeType,
      scopeId: id(grant.scopeId, `grants[${index}].scopeId`),
      roomId: optionalId(grant.roomId, `grants[${index}].roomId`),
      seat: optionalId(grant.seat, `grants[${index}].seat`),
    };
  }).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

export function createStarcraftTmgPrincipalV1(input = {}) {
  assertNoSecrets(input);
  const roles = [...new Set(input.roles || [])].sort();
  if (!roles.length || roles.some((role) => !ROLES.has(role))
    || (roles.includes("anonymous") && roles.length !== 1)) {
    throw new TypeError("principal roles are invalid");
  }
  const assurance = id(input.assurance, "assurance");
  if (!ASSURANCE.has(assurance)
    || (roles.includes("anonymous") !== (assurance === "anonymous"))
    || (roles.includes("administrator") && assurance !== "hardware_admin_mfa")
    || (roles.includes("worker") && !["workload_identity", "external_identity"].includes(assurance))) {
    throw new TypeError("principal assurance is invalid for its roles");
  }
  const body = {
    schemaVersion: `${STARCRAFT_TMG_IDENTITY_RBAC_VERSION}.principal`,
    principalId: id(input.principalId, "principalId"),
    issuerId: id(input.issuerId, "issuerId"),
    assurance,
    roles,
    subjectRefHash: input.subjectRefHash === null || input.subjectRefHash === undefined
      ? null : digest(input.subjectRefHash, "subjectRefHash"),
    grants: normalizedGrants(input.grants || []),
    issuedAt: new Date(input.issuedAt).toISOString(),
    expiresAt: input.expiresAt === null || input.expiresAt === undefined
      ? null : new Date(input.expiresAt).toISOString(),
    rawIdentityRetained: false,
    bearerMaterialRetained: false,
    trainingTruth: false,
  };
  return freeze({ ...body, principalHash: hashStarcraftTmgContract(body) });
}

function verifyPrincipal(value, at) {
  if (!object(value)) throw new TypeError("principal is required");
  const { principalHash, ...body } = clone(value);
  if (hashStarcraftTmgContract(body) !== principalHash) {
    throw new Error("RBAC_PRINCIPAL_TAMPERED");
  }
  if (value.expiresAt && value.expiresAt <= at) return false;
  return true;
}

function hasGrant(principal, resource, scope) {
  if (scope === "public") return true;
  if (scope === "deployment") return principal.grants.some((grant) =>
    grant.scopeType === "deployment" && grant.scopeId === resource.deploymentId);
  if (scope === "subject") return principal.grants.some((grant) =>
    grant.scopeType === "subject" && grant.scopeId === resource.subjectRefHash);
  if (scope === "room") return principal.grants.some((grant) =>
    grant.scopeType === "room" && grant.scopeId === resource.roomId);
  if (scope === "seat") return principal.grants.some((grant) =>
    grant.scopeType === "seat" && grant.roomId === resource.roomId
      && grant.seat === resource.seat);
  if (scope === "artifact") return principal.grants.some((grant) =>
    grant.scopeType === "artifact" && grant.scopeId === resource.artifactHash);
  if (scope === "dataset") return principal.grants.some((grant) =>
    grant.scopeType === "dataset" && grant.scopeId === resource.datasetHash);
  if (scope === "subject_or_room") return hasGrant(principal, resource, "subject")
    || hasGrant(principal, resource, "room") || hasGrant(principal, resource, "seat");
  if (scope === "subject_or_job") return hasGrant(principal, resource, "subject")
    || principal.grants.some((grant) => grant.scopeType === "job"
      && grant.scopeId === resource.jobId);
  return false;
}

function decisionFinding(code, severity, detail) {
  return { code, severity, detail,
    integrationBlocking: severity === "Critical" || severity === "High" };
}

export function authorizeStarcraftTmgActionV1(input = {}) {
  assertNoSecrets(input);
  const action = id(input.action, "action");
  const policy = POLICY[action];
  if (!policy) throw new TypeError(`unknown RBAC action: ${action}`);
  const at = new Date(input.at).toISOString();
  const principal = input.principal;
  const resource = object(input.resource) ? clone(input.resource) : {};
  const environment = input.environmentAssessment;
  const findings = [];
  let principalActive = false;
  try {
    principalActive = verifyPrincipal(principal, at);
  } catch (error) {
    findings.push(decisionFinding("PRINCIPAL_INVALID", "Critical", error.message));
  }
  if (!principalActive && findings.length === 0) {
    findings.push(decisionFinding("PRINCIPAL_EXPIRED", "High", principal.principalId));
  }
  let environmentAuthentic = false;
  if (object(environment)) {
    const { assessmentHash, ...environmentBody } = clone(environment);
    environmentAuthentic = hashStarcraftTmgContract(environmentBody)
      === assessmentHash;
  }
  if (!environmentAuthentic) {
    findings.push(decisionFinding("ENVIRONMENT_ASSESSMENT_INVALID", "Critical",
      action));
  } else if (environment.ready !== true) {
    findings.push(decisionFinding("ENVIRONMENT_NOT_READY", "High", action));
  }
  if (policy.allowedClasses
    && !policy.allowedClasses.includes(environment?.environmentClass)) {
    findings.push(decisionFinding("ACTION_ENVIRONMENT_CLASS_DENIED", "High",
      environment?.environmentClass || "missing"));
  }
  if (environment?.environmentClass === "production_room"
    && !PRODUCTION_ASSURANCE.has(principal?.assurance)) {
    findings.push(decisionFinding("PRODUCTION_IDENTITY_ASSURANCE_REQUIRED", "High",
      principal?.assurance || "missing"));
  }
  if (!policy.roles.some((role) => principal?.roles?.includes(role))) {
    findings.push(decisionFinding("ROLE_DENIED", "High", action));
  }
  if (principalActive && !hasGrant(principal, resource, policy.scope)) {
    findings.push(decisionFinding("RESOURCE_SCOPE_DENIED", "High", policy.scope));
  }
  if (policy.providerCredential && input.sessionProviderCredentialPresent !== true) {
    findings.push(decisionFinding("SESSION_PROVIDER_CREDENTIAL_REQUIRED", "High", action));
  }
  if (policy.independent
    && resource.producerPrincipalId === principal?.principalId) {
    findings.push(decisionFinding("SEPARATION_OF_DUTIES_REQUIRED", "High", action));
  }
  if (policy.approval) {
    const approval = input.independentApproval;
    if (!object(approval) || approval.decision !== "approved"
      || approval.reviewerPrincipalId === principal?.principalId
      || approval.resourceHash !== resource.resourceHash) {
      findings.push(decisionFinding("INDEPENDENT_APPROVAL_REQUIRED", "High", action));
    }
  }
  const blocking = findings.filter((entry) => entry.integrationBlocking);
  const body = {
    schemaVersion: `${STARCRAFT_TMG_IDENTITY_RBAC_VERSION}.decision`,
    action,
    principalHash: principal?.principalHash || null,
    principalId: principal?.principalId || null,
    environmentAssessmentHash: environment?.assessmentHash || null,
    environmentClass: environment?.environmentClass || null,
    resource,
    at,
    findings,
    allowed: blocking.length === 0,
    byokGrantsInferenceOnly: true,
    implicitAdministratorElevation: false,
    crossUserAccessDefault: "deny",
    trainingTruth: false,
  };
  return freeze({ ...body, decisionHash: hashStarcraftTmgContract(body) });
}

export function describeStarcraftTmgRbacPolicyV1() {
  return freeze({
    schemaVersion: `${STARCRAFT_TMG_IDENTITY_RBAC_VERSION}.policy`,
    roles: [...ROLES].sort(),
    actions: clone(POLICY),
    defaultDecision: "deny",
    byokGrantsInferenceOnly: true,
    administratorAssurance: "hardware_admin_mfa",
    trainingTruth: false,
  });
}
