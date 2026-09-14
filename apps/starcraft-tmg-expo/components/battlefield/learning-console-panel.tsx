import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type ConsoleProjection = {
  learning?: {
    episodeCount?: number;
    reflections?: Array<{ runId: string; status: string; candidateCount: number }>;
    publicationCount?: number;
    rollbackCount?: number;
    controls?: Record<string, string>;
    providerCalls?: number;
  };
  freshness?: {
    registryRevision?: number;
    versionCount?: number;
    activeVersions?: Record<string, string>;
    refreshPolicy?: string;
    historicalVersionsPreserved?: boolean;
  };
  freshnessPlan?: {
    affectedSkillIds?: string[];
    reusableUnchangedVersions?: unknown[];
    oldVersionsPreserved?: boolean;
  } | null;
  companion?: {
    authority?: { stateRevision?: number };
    observedFacts?: unknown[];
    intentInferences?: unknown[];
    responseInstruction?: Record<string, boolean>;
  };
  referenceEvidence?: { kind?: string; fullMatches?: boolean; episodeCount?: number };
  modelCalls?: number;
  paidProviderUsed?: boolean;
  sourceRefreshPerformed?: boolean;
};

function value(input: unknown) {
  if (input === null || input === undefined || input === "") return "—";
  return String(input);
}

export function LearningConsolePanel({ roomId, zh }: {
  roomId: string | null;
  zh: boolean;
}) {
  const [projection, setProjection] = useState<ConsoleProjection | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [action, setAction] = useState<"reflection" | "freshness" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!roomId) return;
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/__ticket20/learning", {
        headers: { accept: "application/json" },
      });
      const body = await response.json();
      if (!response.ok || body.ok !== true) throw new Error(body.reason || "LEARNING_CONSOLE_UNAVAILABLE");
      setProjection(body.projection);
      setStatus("ready");
    } catch (cause) {
      setStatus("failed");
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [roomId]);

  useEffect(() => { void load(); }, [load]);

  const run = async (kind: "reflection" | "freshness") => {
    setAction(kind);
    setError(null);
    try {
      const endpoint = kind === "reflection"
        ? "/__ticket20/learning/reflection"
        : "/__ticket20/learning/freshness-preview";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: "{}",
      });
      const body = await response.json();
      if (!response.ok || body.ok !== true) throw new Error(body.reason || "LEARNING_CONSOLE_ACTION_FAILED");
      setProjection(body.projection);
      setStatus("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setAction(null);
    }
  };

  if (!roomId) {
    return <View style={styles.notice}><Text style={styles.muted}>
      {zh ? "进入房间后可查看同局分析与复盘控制面。" : "Join a room to inspect match analysis and learning controls."}
    </Text></View>;
  }

  const reflection = projection?.learning?.reflections?.at(-1);
  const affected = projection?.freshnessPlan?.affectedSkillIds || [];
  return (
    <View style={styles.stack} testID="ticket20-learning-console">
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{zh ? "人工控制的 Harness" : "HUMAN-CONTROLLED HARNESS"}</Text>
        <Text style={styles.title}>{zh ? "复盘、反事实与 Skill 保鲜" : "Review, counterfactuals & Skill freshness"}</Text>
        <Text style={styles.body}>
          {zh
            ? "真实动作只来自 Room / Rules。多局复盘不会自动发布；假设分支不进入真实轨迹；只有独立回归后才能显式升级或回滚。"
            : "Real actions come only from Room / Rules. Multi-match reflection never auto-publishes; hypothetical branches stay outside the real trajectory; upgrades and rollback remain explicit after independent regression."}
        </Text>
        <View style={styles.actions}>
          <Button label={status === "loading" ? (zh ? "刷新中…" : "Refreshing…") : (zh ? "刷新状态" : "Refresh")}
            disabled={status === "loading" || action !== null} onPress={load} />
          <Button label={action === "reflection" ? (zh ? "复盘中…" : "Reflecting…") : (zh ? "合并 4 条已验证轨迹" : "Merge 4 verified episodes")}
            disabled={action !== null || !projection} onPress={() => run("reflection")} />
          <Button label={action === "freshness" ? (zh ? "计算中…" : "Planning…") : (zh ? "规则变化影响预演" : "Preview rules-change impact")}
            disabled={action !== null || !projection} onPress={() => run("freshness")} />
        </View>
        {error && <Text selectable style={styles.error}>error: {error}</Text>}
      </View>

      <View style={styles.grid}>
        <Card title={zh ? "凯瑞甘战术读取" : "Kerrigan tactical reading"} rows={[
          [zh ? "权威状态修订" : "Authority revision", value(projection?.companion?.authority?.stateRevision)],
          [zh ? "公开事实" : "Observed facts", value(projection?.companion?.observedFacts?.length)],
          [zh ? "意图推断" : "Intent inferences", value(projection?.companion?.intentInferences?.length)],
          [zh ? "事实/推断分轨" : "Fact/inference split", projection?.companion?.responseInstruction?.inferredIntentMustBeLabelledAsInference ? (zh ? "强制" : "required") : "—"],
          [zh ? "读取对手私有计划" : "Private opponent plan", zh ? "禁止" : "forbidden"],
        ]} />
        <Card title={zh ? "多局复盘" : "Multi-match reflection"} rows={[
          [zh ? "已验证轨迹" : "Verified episodes", value(projection?.learning?.episodeCount)],
          [zh ? "最近运行" : "Latest run", reflection?.status || (zh ? "未触发" : "not triggered")],
          [zh ? "隔离候选" : "Quarantined candidates", value(reflection?.candidateCount || 0)],
          [zh ? "自动发布" : "Automatic publication", zh ? "禁止" : "forbidden"],
          [zh ? "模型调用" : "Model calls", value(projection?.modelCalls || 0)],
        ]} />
        <Card title={zh ? "增量保鲜" : "Incremental freshness"} rows={[
          [zh ? "版本登记" : "Registered versions", value(projection?.freshness?.versionCount)],
          [zh ? "活动修订" : "Active revision", value(projection?.freshness?.registryRevision)],
          [zh ? "受影响 Skill" : "Affected Skills", affected.length ? String(affected.length) : (zh ? "尚未预演" : "not previewed")],
          [zh ? "复用未变化版本" : "Reusable unchanged", value(projection?.freshnessPlan?.reusableUnchangedVersions?.length)],
          [zh ? "旧版可查看" : "Old versions readable", projection?.freshness?.historicalVersionsPreserved ? (zh ? "是" : "yes") : "—"],
        ]} />
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>{zh ? "当前演示证据边界" : "Current demo evidence boundary"}</Text>
        <Text style={styles.muted}>
          {zh
            ? "控制台中的 4 条复盘输入是规则执行并通过 Replay 的历史合成转移，不是 4 场完整真人对局。当前按钮不联网、不刷新官方数据、不调用付费模型。"
            : "The four review inputs are historical synthetic transitions executed by Rules and verified by Replay, not four complete human matches. These controls do not use network source refresh or a paid model."}
        </Text>
      </View>
    </View>
  );
}

function Button({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void | Promise<void> }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

function Card({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>
    {rows.map(([label, entry]) => <View key={label} style={styles.row}>
      <Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{entry}</Text>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  hero: { padding: 18, gap: 10, borderRadius: 14, borderWidth: 1, borderColor: "#0e7490", backgroundColor: "#071923" },
  eyebrow: { color: "#67e8f9", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#f8fafc", fontSize: 21, fontWeight: "900" },
  body: { color: "#cbd5e1", fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: "#22d3ee", backgroundColor: "#0e3a47" },
  disabled: { opacity: 0.42 },
  buttonText: { color: "#ecfeff", fontSize: 12, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { flexGrow: 1, flexBasis: 260, minWidth: 240, padding: 14, gap: 8, borderRadius: 12, borderWidth: 1, borderColor: "#284b5d", backgroundColor: "#0b1720" },
  cardTitle: { color: "#e2e8f0", fontSize: 15, fontWeight: "900" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderTopColor: "#183443", paddingTop: 7 },
  label: { color: "#94a3b8", fontSize: 12, flexShrink: 1 },
  value: { color: "#cffafe", fontSize: 12, fontWeight: "800", textAlign: "right" },
  notice: { padding: 14, gap: 7, borderRadius: 12, borderWidth: 1, borderColor: "#334155", backgroundColor: "#0f172a" },
  noticeTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  muted: { color: "#94a3b8", fontSize: 12, lineHeight: 18 },
  error: { color: "#fca5a5", fontSize: 12 },
});
