import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { useI18n } from "@/lib/i18n";

/**
 * Ticket 23 / Slice 248 — formal Agent-vs-Agent match control (presentation
 * only). Talks to the local formal-evidence server contract owned by Codex:
 *
 *   GET  /__ticket23/a2a/ui-status -> { ok, job, manifest }
 *   POST /__ticket23/a2a/ui-drive  -> queues exactly one authoritative action
 *
 * Both calls are same-origin with ambient credentials; this component never
 * sees, stores or renders a cookie, token, or raw model content, and never
 * recomputes legality, probability, data wiring, strategy or cost. Normal
 * product servers answer 403/404, in which case the control hides itself
 * silently. Pixels and labels here are never gameplay truth.
 */

const STATUS_PATH = "/__ticket23/a2a/ui-status";
const DRIVE_PATH = "/__ticket23/a2a/ui-drive";
const POLL_MS = 2_500;
const BUSY_JOB_STATUSES = new Set(["queued", "running"]);
const GATE_PASS_STATUSES = new Set(["passed", "pass", "ok"]);

type Availability = "unknown" | "hidden" | "available";

interface A2aSnapshot {
  job: Record<string, any> | null;
  manifest: Record<string, any>;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function formatInt(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return String(Math.trunc(numeric)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatCostCny(micros: unknown): string {
  const numeric = Number(micros);
  if (!Number.isFinite(numeric) || numeric <= 0) return "¥0.000000";
  return `¥${(numeric / 1_000_000).toFixed(6)}`;
}

function shortHash(value: unknown, head = 10): string {
  const text = typeof value === "string" ? value : "";
  return text ? text.slice(0, head) : "—";
}

function shortRef(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > 96 ? `${text.slice(0, 96)}…` : text;
}

function Chip({ color, label, testID }: {
  color: string;
  label: string;
  testID: string;
}) {
  return (
    <View testID={testID} style={[styles.chip, { borderColor: color }]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

export function AgentAgentMatchControl() {
  const { lang } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const zh = lang === "zh";
  const wide = windowWidth >= 768;

  const [availability, setAvailability] = useState<Availability>("unknown");
  const [snapshot, setSnapshot] = useState<A2aSnapshot | null>(null);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [drivePending, setDrivePending] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const driveInFlightRef = useRef(false);
  const hiddenRef = useRef(false);

  const readStatus = useCallback(async () => {
    if (hiddenRef.current) return;
    try {
      const response = await fetch(STATUS_PATH, {
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (response.status === 403 || response.status === 404) {
        // Normal product server: the experimental surface does not exist here.
        // Hide silently — this is not a product error.
        hiddenRef.current = true;
        setAvailability("hidden");
        return;
      }
      if (!response.ok) {
        setReadNote("A2A_STATUS_UNAVAILABLE");
        return;
      }
      const body = await response.json();
      if (body?.ok !== true) {
        setReadNote(typeof body?.reason === "string" ? body.reason : "A2A_STATUS_NOT_OK");
        return;
      }
      setSnapshot({
        job: body.job && typeof body.job === "object" ? body.job : null,
        manifest: asRecord(body.manifest),
      });
      setAvailability("available");
      setReadNote(null);
    } catch {
      setReadNote("A2A_STATUS_UNREACHABLE");
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    void readStatus();
    const timer = setInterval(() => {
      if (hiddenRef.current) {
        clearInterval(timer);
        return;
      }
      void readStatus();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [readStatus]);

  const view = useMemo(() => {
    const manifest = snapshot?.manifest || {};
    const room = asRecord(manifest.room);
    const state = asRecord(manifest.state);
    const usage = asRecord(manifest.usage);
    const audit = manifest.dataWiringAudit && typeof manifest.dataWiringAudit === "object"
      ? asRecord(manifest.dataWiringAudit)
      : null;
    const auditStatus = String(audit?.status || "").toLowerCase();
    const blockingFindings = Number(audit?.blockingFindingCount);
    // Fail closed, like Rules: an absent audit, a non-passed status, or any
    // blocking finding disables execution.
    const gateBlocked = !audit
      || !GATE_PASS_STATUSES.has(auditStatus)
      || !(blockingFindings === 0);
    const job = snapshot?.job || null;
    const jobStatus = String(job?.status || "").toLowerCase();
    const busy = drivePending || BUSY_JOB_STATUSES.has(jobStatus);
    const terminal = state.terminal === true || state.gameOver === true;
    const transitions = Array.isArray(manifest.recentAcceptedTransitions)
      ? manifest.recentAcceptedTransitions
      : [];
    const lastAccepted = transitions.length
      ? asRecord(transitions[transitions.length - 1])
      : null;
    const lastAction = lastAccepted ? asRecord(lastAccepted.action) : null;
    const lastActionLabel = lastAction
      ? String(lastAction.type || lastAction.kind || lastAction.actionType || "action")
      : null;
    return {
      room,
      state,
      usage,
      audit,
      auditStatus,
      blockingFindings,
      gateBlocked,
      job,
      jobStatus,
      busy,
      terminal,
      lastAccepted,
      lastActionLabel,
    };
  }, [snapshot, drivePending]);

  const drive = useCallback(async () => {
    // Exactly one POST per user activation: the in-flight ref plus the
    // disabled-while-busy button make duplicate submission impossible here.
    if (driveInFlightRef.current || view.busy || view.gateBlocked || view.terminal) {
      return;
    }
    driveInFlightRef.current = true;
    setDrivePending(true);
    setDriveError(null);
    try {
      const response = await fetch(DRIVE_PATH, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: "{}",
      });
      if (response.status === 403 || response.status === 404) {
        hiddenRef.current = true;
        setAvailability("hidden");
        return;
      }
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true) {
        setDriveError(
          typeof body?.reason === "string" ? body.reason : "A2A_DRIVE_REJECTED",
        );
      }
    } catch {
      setDriveError("A2A_DRIVE_REQUEST_FAILED");
    } finally {
      driveInFlightRef.current = false;
      setDrivePending(false);
      void readStatus();
    }
  }, [readStatus, view.busy, view.gateBlocked, view.terminal]);

  if (Platform.OS !== "web" || availability !== "available" || !snapshot) {
    return null;
  }

  const gateColor = view.gateBlocked ? "#f59e0b" : "#22d3ee";
  const gateLabel = view.gateBlocked
    ? (zh ? "数据闸: 阻断" : "Data gate: blocked")
    : (zh ? "数据闸: 通过" : "Data gate: passed");
  const runColor = view.terminal ? "#94a3b8"
    : view.jobStatus === "failed" ? "#ef4444"
    : view.busy ? "#38bdf8"
    : "#22c55e";
  const runLabel = view.terminal
    ? (zh ? "对局终局" : "Match terminal")
    : view.jobStatus === "failed"
      ? (zh ? "Agent: 失败" : "Agent: failed")
      : view.jobStatus === "running"
        ? (zh ? "Agent: 思考中…" : "Agent: thinking…")
        : view.jobStatus === "queued"
          ? (zh ? "Agent: 已排队" : "Agent: queued")
          : view.jobStatus === "completed"
            ? (zh ? "Agent: 已应用" : "Agent: applied")
            : (zh ? "Agent: 就绪" : "Agent: ready");
  const sideKey = String(view.state.activeSideKey || "—");
  const contextLabel = zh
    ? `回合 ${view.state.round ?? "—"} · ${view.state.phase ?? "—"} · 行动方 ${sideKey}`
    : `Round ${view.state.round ?? "—"} · ${view.state.phase ?? "—"} · ${sideKey} to act`;
  const driveDisabled = view.busy || view.gateBlocked || view.terminal;
  const driveLabel = drivePending
    ? (zh ? "排队中…" : "Queueing…")
    : view.busy
      ? (zh ? "Agent 思考中…" : "Agent thinking…")
      : (zh ? "推进一个 Agent 动作" : "Drive next Agent action");
  const showFacts = wide || expanded;

  return (
    <View testID="agent-agent-match-control" style={styles.shell}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryChips}>
          <Chip testID="agent-agent-data-gate" color={gateColor} label={gateLabel} />
          <Chip testID="agent-agent-run-state" color={runColor} label={runLabel} />
          <Text style={styles.contextText} numberOfLines={1}>{contextLabel}</Text>
        </View>
        <View style={styles.summaryActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={zh ? "展开或收起 Agent 控制台详情" : "Toggle Agent control details"}
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((current) => !current)}
            style={({ pressed }) => [styles.toggleButton, pressed && styles.pressed]}
          >
            <Text style={styles.toggleText}>
              {expanded ? (zh ? "收起" : "Less") : (zh ? "详情" : "Details")}
            </Text>
          </Pressable>
          <Pressable
            testID="agent-agent-drive-next"
            accessibilityRole="button"
            accessibilityLabel={zh
              ? "为行动方排队一个权威 Agent 动作"
              : "Queue one authoritative Agent action for the active side"}
            accessibilityState={{ disabled: driveDisabled, busy: view.busy }}
            disabled={driveDisabled}
            onPress={() => void drive()}
            style={({ pressed }) => [
              styles.driveButton,
              driveDisabled && styles.driveDisabled,
              pressed && !driveDisabled && styles.pressed,
            ]}
          >
            <Text style={styles.driveText}>{driveLabel}</Text>
          </Pressable>
        </View>
      </View>

      {view.gateBlocked && (
        <View accessibilityRole="alert" style={styles.blockedBanner}>
          <Text style={styles.blockedTitle}>
            {zh ? "数据闸阻断 — 执行已停用" : "Data gate blocked — execution disabled"}
          </Text>
          <Text style={styles.blockedBody}>
            {zh
              ? `数据接线审计未通过(阻断发现 ${Number.isFinite(view.blockingFindings) ? view.blockingFindings : "未知"} 项)。在证据链通过前不能推进 Agent 动作;本面板无法越过该闸。`
              : `The data-wiring audit has not passed (blocking findings: ${Number.isFinite(view.blockingFindings) ? view.blockingFindings : "unknown"}). No Agent action can be driven until the evidence chain passes; this panel cannot override the gate.`}
          </Text>
        </View>
      )}

      {view.jobStatus === "failed" && view.job && (
        <View accessibilityLiveRegion="polite" style={styles.failureCard}>
          <Text style={styles.failureTitle}>
            {zh ? "上一次推进失败(已可重试)" : "Last drive failed (retry available)"}
          </Text>
          <Text selectable style={styles.failureBody}>
            {`code: ${String(view.job.failure?.code || "A2A_DRIVE_FAILED")} · severity: ${String(view.job.failure?.severity || "High")}`}
          </Text>
          <Text style={styles.failureHint}>
            {zh
              ? "房间状态由服务器保持;本面板未推进任何状态。可以在确认后再次推进。"
              : "The server kept room state; this panel advanced nothing. You may deliberately drive again."}
          </Text>
        </View>
      )}

      {view.terminal && (
        <View style={styles.terminalCard}>
          <Text style={styles.terminalText}>
            {zh
              ? "对局已终局 — 不能再排队 Agent 动作。"
              : "The match is terminal — no further Agent actions can be queued."}
          </Text>
        </View>
      )}

      {readNote && (
        <Text style={styles.readNote}>
          {zh ? `状态读取暂不可用(${readNote});显示最后一次成功读取。` : `Status read temporarily unavailable (${readNote}); showing the last good read.`}
        </Text>
      )}
      {driveError && (
        <Text accessibilityRole="alert" style={styles.driveError}>
          {zh ? `推进请求被拒:${driveError}` : `Drive request rejected: ${driveError}`}
        </Text>
      )}

      {showFacts && (
        <View style={styles.factsRow}>
          <Text style={styles.fact}>
            {zh ? "Provider 调用" : "Provider calls"} {formatInt(view.usage.providerCalls)}
          </Text>
          <Text style={styles.fact}>
            {zh ? "总 units" : "Units"} {formatInt(view.usage.totalUnits)}
          </Text>
          <Text style={styles.fact}>
            {zh ? "成本" : "Cost"} {formatCostCny(view.usage.estimatedCostCnyMicros)}
          </Text>
          <Text style={styles.fact} testID="agent-agent-state-revision">
            {zh ? "状态修订" : "State revision"} {String(view.room.stateRevision ?? "—")}
          </Text>
          <Text style={styles.fact} testID="agent-agent-last-action">
            {zh ? "最近接受" : "Last accepted"}: {view.lastActionLabel
              ? `${view.lastActionLabel} → r${String(view.lastAccepted?.postStateRevision ?? "—")}`
              : (zh ? "尚无" : "none yet")}
          </Text>
        </View>
      )}

      {expanded && (
        <View style={styles.detailZone}>
          <Text style={styles.helper}>
            {zh
              ? "按下后为行动方排队恰好一个权威 Agent 动作;服务器可能产生一次付费 Provider 调用。合法性、Apply 与 Replay 全部在服务器侧;上方成本为服务器报告的累计值。本面板不计算、不预测、不覆盖任何规则结果。"
              : "Pressing queues exactly one authoritative Agent action for the active side; the server may make one paid Provider call. Legality, Apply and Replay stay server-side; the cost above is the server-reported running total. This panel computes, predicts and overrides nothing."}
          </Text>
          <Text selectable style={styles.mono}>
            audit: {String(view.audit?.schema || "—")} · status {String(view.audit?.status || "missing")} · blocking {Number.isFinite(view.blockingFindings) ? view.blockingFindings : "—"} · hash {shortHash(view.audit?.hash)}
          </Text>
          <Text selectable style={styles.mono}>
            models: player1={shortRef(asRecord(snapshot.manifest.selectedModels).player1)} player2={shortRef(asRecord(snapshot.manifest.selectedModels).player2)}
          </Text>
          <Text selectable style={styles.mono}>
            skills: player1={shortRef(asRecord(snapshot.manifest.strategySkillRefsBySeat).player1)} player2={shortRef(asRecord(snapshot.manifest.strategySkillRefsBySeat).player2)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 14,
    padding: 12,
    gap: 9,
    backgroundColor: "#0a1420",
    borderWidth: 1,
    borderColor: "#164e63",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  summaryChips: {
    flex: 1,
    flexBasis: 260,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  summaryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    backgroundColor: "#082f49",
  },
  chipDot: { width: 7, height: 7, borderRadius: 999 },
  chipText: { fontSize: 11, fontWeight: "900" },
  contextText: { flexShrink: 1, color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
  toggleButton: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: { color: "#94a3b8", fontSize: 11, fontWeight: "900" },
  driveButton: {
    minHeight: 44,
    minWidth: 150,
    paddingHorizontal: 16,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#38bdf8",
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
  },
  driveDisabled: { opacity: 0.45, borderColor: "#475569", backgroundColor: "#1e293b" },
  driveText: { color: "#f8fafc", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.72 },
  blockedBanner: {
    borderRadius: 10,
    padding: 11,
    backgroundColor: "#422006",
    borderWidth: 1,
    borderColor: "#f59e0b",
    gap: 4,
  },
  blockedTitle: { color: "#fef3c7", fontSize: 12, fontWeight: "900" },
  blockedBody: { color: "#fde68a", fontSize: 11, lineHeight: 17 },
  failureCard: {
    borderRadius: 10,
    padding: 11,
    backgroundColor: "#3f1515",
    borderWidth: 1,
    borderColor: "#ef4444",
    gap: 4,
  },
  failureTitle: { color: "#fecaca", fontSize: 12, fontWeight: "900" },
  failureBody: { color: "#fca5a5", fontSize: 11, fontFamily: "monospace" },
  failureHint: { color: "#fca5a5", fontSize: 11, lineHeight: 17 },
  terminalCard: {
    borderRadius: 10,
    padding: 11,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#475569",
  },
  terminalText: { color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
  readNote: { color: "#94a3b8", fontSize: 10, lineHeight: 15 },
  driveError: { color: "#fca5a5", fontSize: 10, fontFamily: "monospace" },
  factsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  fact: {
    color: "#bae6fd",
    backgroundColor: "#082f49",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "800",
  },
  detailZone: {
    borderRadius: 10,
    padding: 11,
    gap: 6,
    backgroundColor: "#07111f",
    borderWidth: 1,
    borderColor: "#1e3a4a",
  },
  helper: { color: "#cbd5e1", fontSize: 11, lineHeight: 17 },
  mono: { color: "#94a3b8", fontSize: 10, lineHeight: 15, fontFamily: "monospace" },
});
