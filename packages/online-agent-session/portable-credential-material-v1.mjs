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

function bytes(value) {
  if (!(value instanceof Uint8Array) || value.byteLength < 8) return null;
  return value;
}

function base64(value) {
  let binary = "";
  for (let offset = 0; offset < value.byteLength; offset += 0x8000) {
    binary += String.fromCharCode(...value.subarray(offset, offset + 0x8000));
  }
  if (typeof globalThis.btoa === "function") return globalThis.btoa(binary);
  return globalThis.Buffer?.from(value)?.toString("base64") || "";
}

function utf8(value) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    return "";
  }
}

function echoVariants(value) {
  const source = bytes(value);
  if (!source) return [];
  const variants = new Set();
  const encoded = base64(source);
  const text = utf8(source);
  const hex = [...source]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (encoded) {
    variants.add(encoded);
    variants.add(encoded.replace(/=+$/u, ""));
    variants.add(encoded.replace(/\+/gu, "-").replace(/\//gu, "_")
      .replace(/=+$/u, ""));
  }
  variants.add(hex);
  variants.add(hex.toUpperCase());
  if (text) {
    variants.add(text);
    variants.add(encodeURIComponent(text));
    variants.add(encodeURIComponent(encodeURIComponent(text)));
    variants.add(JSON.stringify(text).slice(1, -1));
    const unicodeEscaped = [...text].map((character) => {
      const code = character.codePointAt(0);
      return code <= 0xffff
        ? `\\u${code.toString(16).padStart(4, "0")}`
        : character;
    }).join("");
    variants.add(unicodeEscaped);
    variants.add(unicodeEscaped.replace(/\\/gu, "\\\\"));
  }
  return [...variants].filter((entry) => entry.length >= 8);
}

export function containsStarcraftTmgKnownCredentialEchoV1(value, secretBytes) {
  const serialized = typeof value === "string"
    ? value : JSON.stringify(value);
  if (typeof serialized !== "string") return false;
  return echoVariants(secretBytes).some((variant) => serialized.includes(variant));
}
