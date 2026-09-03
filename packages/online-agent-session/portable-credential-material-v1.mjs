const SENSITIVE_VALUE_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\bsk-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|authorization|credential|secret)\s*[:=]\s*[^\s,;}]{6,}/iu;
const SENSITIVE_KEY_PATTERN = /(?:api.?key|authorization|cookie|credential|secret|access.?token|refresh.?token)/iu;

function containsSensitiveMaterial(value, seen = new Set()) {
  if (typeof value === "string") return SENSITIVE_VALUE_PATTERN.test(value);
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some((entry) => containsSensitiveMaterial(entry, seen));
  }
  return Object.entries(value).some(([key, child]) =>
    SENSITIVE_KEY_PATTERN.test(key) || containsSensitiveMaterial(child, seen));
}

export function containsStarcraftTmgOnlineCredentialMaterialV1(value) {
  return containsSensitiveMaterial(value);
}
