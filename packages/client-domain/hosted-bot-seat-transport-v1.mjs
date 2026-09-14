export const STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION =
  "starcraft_tmg_hosted_bot_seat_http_v1";
export const STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX =
  "/starcraft-tmg-level3/bot/api/v1";

function safeBaseUrl(value) {
  const baseUrl = String(value || "").replace(/\/+$/u, "");
  if (!baseUrl) return "";
  const parsed = new URL(baseUrl);
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
    throw new TypeError(
      "Hosted Bot Seat transport requires HTTPS except on loopback");
  }
  return baseUrl;
}

function boundedRoomId(value) {
  const roomId = String(value || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(roomId)) {
    throw new TypeError("Hosted Bot Seat roomId is invalid");
  }
  return roomId;
}

export function createHttpStarcraftTmgHostedBotSeatTransportV1(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl is required");
  const baseUrl = safeBaseUrl(options.baseUrl);
  const apiPrefix = String(options.apiPrefix
    || STARCRAFT_TMG_HOSTED_BOT_SEAT_API_PREFIX).replace(/\/+$/u, "");
  const timeoutMs = Math.max(250, Number(options.timeoutMs || 5_000));

  async function read(input = {}) {
    const roomId = boundedRoomId(input.roomId);
    const controller = typeof AbortController === "function"
      ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetchImpl(
        `${baseUrl}${apiPrefix}/rooms/${encodeURIComponent(roomId)}`,
        { method: "GET", headers: { accept: "application/json" },
          ...(controller ? { signal: controller.signal } : {}) },
      );
      if (response.status === 404) {
        return Object.freeze({ ok: true, available: false, projection: null });
      }
      const body = await response.json();
      if (!response.ok
        || body?.schemaVersion !== STARCRAFT_TMG_HOSTED_BOT_SEAT_HTTP_VERSION
        || !body.result || typeof body.result !== "object") {
        throw new Error("HOSTED_BOT_SEAT_RESPONSE_INVALID");
      }
      return Object.freeze({
        ok: body.result.ok !== false,
        available: body.result.ok !== false && Boolean(body.result.projection),
        projection: body.result.projection || null,
        reason: body.result.reason || null,
      });
    } catch (error) {
      return Object.freeze({
        ok: false,
        available: false,
        projection: null,
        reason: error?.name === "AbortError"
          ? "HOSTED_BOT_SEAT_TRANSPORT_TIMEOUT"
          : "HOSTED_BOT_SEAT_TRANSPORT_UNAVAILABLE",
      });
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  return Object.freeze({ read });
}
