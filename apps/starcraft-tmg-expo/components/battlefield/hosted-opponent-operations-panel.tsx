import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/lib/i18n";

const API_PREFIX = "/starcraft-tmg-level3/bot/api/v1";

function display(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function Button({ disabled = false, label, onPress }: {
  disabled?: boolean;
  label: string;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, disabled && styles.disabled,
        pressed && !disabled && styles.pressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function HostedOpponentOperationsPanel({ roomId }: {
  roomId: string | null;
}) {
  const { lang } = useI18n();
  const zh = lang === "zh";
  const [projection, setProjection] = useState<Record<string, any> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN || "";
  const read = useCallback(async () => {
    if (!roomId) return;
    try {
      const response = await fetch(
        `${baseUrl}${API_PREFIX}/rooms/${encodeURIComponent(roomId)}`,
        { headers: { accept: "application/json" } },
      );
      const body = await response.json();
      if (!response.ok || body?.result?.ok !== true || !body.result.projection) {
        throw new Error(body?.result?.reason || "HOSTED_OPPONENT_READ_FAILED");
      }
      setProjection(body.result.projection);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [baseUrl, roomId]);

  useEffect(() => {
    setProjection(null);
    if (!roomId) return undefined;
    void read();
    const timer = setInterval(() => void read(), 1_500);
    return () => clearInterval(timer);
  }, [read, roomId]);

  const operate = async (taskId: string, operation: "delegate" | "complete" | "dispute") => {
    if (!roomId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `${baseUrl}${API_PREFIX}/rooms/${encodeURIComponent(roomId)}/physical-tasks/${encodeURIComponent(taskId)}/${operation}`,
        {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(operation === "complete"
            ? { completedBy: "human", evidenceRefs: [] }
            : operation === "dispute"
              ? { reason: "Web user requested rules review" }
              : {}),
        },
      );
      const body = await response.json();
      if (!response.ok || body?.result?.ok !== true) {
        throw new Error(body?.result?.reason || "PHYSICAL_TASK_OPERATION_FAILED");
      }
      await read();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  const bot = projection?.bot || projection;
  const physical = projection?.physicalOperation || null;
  const trace = bot?.latestTrace || null;
  const summary = trace?.publicDecisionSummary || null;
  const tasks = useMemo(() => Array.isArray(physical?.tasks)
    ? physical.tasks.filter((task: any) => task.status !== "completed") : [],
  [physical?.tasks]);
  const notifications = Array.isArray(projection?.notifications)
    ? projection.notifications : [];
  const costCny = Number(trace?.matchEstimatedCostCnyMicros || 0) / 1_000_000;

  if (!roomId) return null;
  return (
    <View style={styles.shell} testID="hosted-opponent-operations-panel">
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>AGENT · PHYSICAL SYNC · EVIDENCE</Text>
          <Text style={styles.title}>{zh ? "机器对手运行台" : "Hosted opponent operations"}</Text>
        </View>
        <Button disabled={busy} label={zh ? "刷新" : "Refresh"} onPress={() => void read()} />
      </View>

      {!projection ? (
        <Text style={styles.muted}>{error || (zh ? "正在读取机器席位…" : "Loading hosted seat…")}</Text>
      ) : (
        <>
          <View style={styles.metrics}>
            <Text style={styles.metric}>{zh ? "自动执行" : "Auto apply"}: {projection.automaticLegalMachineAction === true ? "yes" : "no"}</Text>
            <Text style={styles.metric}>{zh ? "逐动作人工批准" : "Per-action approval"}: {projection.perActionHumanApprovalRequired === true ? "yes" : "no"}</Text>
            <Text style={styles.metric}>{zh ? "机器动作" : "Agent actions"}: {display(bot?.actionCount, "0")}</Text>
            <Text style={styles.metric}>Replay: {display(bot?.replayVerifiedCount, "0")}</Text>
            <Text style={styles.metric}>Tokens: {display(trace?.providerTotalUnits, "0")}</Text>
            <Text style={styles.metric}>Cost: ¥{costCny.toFixed(4)}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{zh ? "当前计划与公开决策" : "Current plan and public decision"}</Text>
            <Text style={styles.row}>status: {display(bot?.lifecycle)} / {display(bot?.driveStatus)}</Text>
            <Text style={styles.row}>{zh ? "选择" : "Choice"}: {display(bot?.lastDecision?.candidateId)}</Text>
            <Text style={styles.row}>{zh ? "目的" : "Purpose"}: {display(summary?.purpose || bot?.lastDecision?.selectedReason)}</Text>
            <Text style={styles.row}>{zh ? "计划" : "Plan"}: {display(summary?.plan)}</Text>
            <Text style={styles.row}>{zh ? "对方反制" : "Expected response"}: {display(summary?.predictedOpponentResponses)}</Text>
            <Text style={styles.row}>{zh ? "我方再反制" : "Counter-response"}: {display(summary?.counterResponse)}</Text>
            <Text style={styles.warning}>{zh ? "风险" : "Risk"}: {display(summary?.risk || bot?.lastDecision?.risk)}</Text>
            <Text style={styles.mono}>plan {display(bot?.memory?.turnPlanHash)} · intent {display(bot?.memory?.actionIntentHash)}</Text>
            <Text style={styles.mono}>receipt {display(bot?.lastReceiptHash)} · replay {display(bot?.lastReplayMatchesCurrent)}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{zh ? "实体同步任务" : "Physical operation tasks"}</Text>
            <Text style={styles.row}>sync: {display(physical?.syncStatus)} · active {display(physical?.activeTaskCount, "0")}</Text>
            {tasks.length === 0 && <Text style={styles.muted}>{zh ? "没有待处理实体操作。" : "No pending physical operations."}</Text>}
            {tasks.map((task: any) => (
              <View key={task.taskId} style={styles.task}>
                <Text style={styles.taskTitle}>{task.status} · {task.operations?.length || 0} ops</Text>
                {(task.operations || []).slice(0, 5).map((operation: any) => (
                  <Text key={operation.operationId} style={styles.row}>• {operation.operationKind} · {operation.objectId}</Text>
                ))}
                <View style={styles.actions}>
                  <Button disabled={busy || task.status !== "pending_human"}
                    label={zh ? "委托 Agent" : "Delegate to Agent"}
                    onPress={() => void operate(task.taskId, "delegate")} />
                  <Button disabled={busy || !["pending_human", "delegated_agent"].includes(task.status)}
                    label={zh ? "我已完成" : "I completed it"}
                    onPress={() => void operate(task.taskId, "complete")} />
                  <Button disabled={busy || !["pending_human", "delegated_agent"].includes(task.status)}
                    label={zh ? "规则争议" : "Rules dispute"}
                    onPress={() => void operate(task.taskId, "dispute")} />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{zh ? "通知与截图证据" : "Notifications and screenshot evidence"}</Text>
            {notifications.slice(-5).map((notice: any) => (
              <Text key={notice.notificationId} style={styles.row}>• {notice.kind} · r{display(notice.postStateRevision)}</Text>
            ))}
            {notifications.length === 0 && <Text style={styles.muted}>{zh ? "尚无机器动作通知。" : "No machine-action notices yet."}</Text>}
            <Text style={styles.mono}>{zh
              ? "逐动作截图由验收 Runner 在每个已验签 Apply 后捕获；本面板提供截图中的计划、动作、实体任务、token 与成本上下文。"
              : "The acceptance runner captures every signed Apply. This panel supplies plan, action, physical task, token, and cost context for each frame."}</Text>
          </View>
        </>
      )}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: 16, padding: 16, backgroundColor: "#090d14",
    borderWidth: 1, borderColor: "#713f12", gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { color: "#d2ae59", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  title: { color: "#f8fafc", fontSize: 18, fontWeight: "900", marginTop: 4 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  metric: { color: "#bae6fd", backgroundColor: "#082f49", borderRadius: 12,
    paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: "800" },
  card: { borderRadius: 10, padding: 12, gap: 6, backgroundColor: "#111827",
    borderWidth: 1, borderColor: "#334155" },
  cardTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "900" },
  row: { color: "#cbd5e1", fontSize: 11, lineHeight: 17 },
  muted: { color: "#64748b", fontSize: 11, lineHeight: 17 },
  warning: { color: "#fbbf24", fontSize: 11, lineHeight: 17 },
  mono: { color: "#94a3b8", fontSize: 9, lineHeight: 15, fontFamily: "monospace" },
  task: { marginTop: 5, borderRadius: 8, padding: 9, gap: 5,
    backgroundColor: "#1c1917", borderWidth: 1, borderColor: "#92400e" },
  taskTitle: { color: "#fde68a", fontSize: 11, fontWeight: "900" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  button: { minHeight: 44, minWidth: 88, paddingHorizontal: 10, paddingVertical: 7,
    alignItems: "center", justifyContent: "center", borderRadius: 8,
    borderWidth: 1, borderColor: "#64748b", backgroundColor: "#172554" },
  buttonText: { color: "#f8fafc", fontSize: 10, fontWeight: "900" },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.72 },
  error: { color: "#fca5a5", fontSize: 10, fontFamily: "monospace" },
});
