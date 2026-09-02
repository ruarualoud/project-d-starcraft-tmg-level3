import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/lib/i18n";
import { useLevel3ClientDomain } from "@/lib/level3/client-domain-provider";

export function CharacterPersonaSettingsPanel() {
  const { lang } = useI18n();
  const { view, connection, dispatch } = useLevel3ClientDomain();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const projection = view.characterPresentation;
  const offlineSnapshot = view.characterOfflineSnapshot;
  const zh = lang === "zh";

  if (!projection) {
    const cachedPersona = offlineSnapshot?.releaseChannel === "development_internal"
      ? offlineSnapshot.selectedPersona
      : null;
    const cachedPublicLabel = offlineSnapshot?.releaseChannel === "public"
      ? offlineSnapshot.fallbackLabel
      : null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{zh ? "战术副官" : "Tactical Adjutant"}</Text>
        <Text style={styles.hint}>
          {cachedPersona
            ? (zh
              ? `离线只读快照已恢复：${cachedPersona.title}（${cachedPersona.timeline.start} → ${cachedPersona.timeline.end}）。重连后才能切换。`
              : `Offline read-only snapshot restored: ${cachedPersona.title} (${cachedPersona.timeline.start} → ${cachedPersona.timeline.end}). Reconnect to switch.`)
            : cachedPublicLabel
              ? (zh
                ? `${cachedPublicLabel}：公开通道离线时保持无资产中性回退。`
                : `${cachedPublicLabel}: the public channel keeps an asset-free neutral fallback offline.`)
            : zh
            ? "进入已验证房间后，Web 与 App 可读取同一席位的副官选择。"
            : "Join a verified room to share the seat's Adjutant selection across Web and App."}
        </Text>
        {view.characterStatus.rejectionCode && (
          <Text selectable style={styles.error}>{view.characterStatus.rejectionCode}</Text>
        )}
      </View>
    );
  }

  if (projection.releaseChannel === "public") {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{zh ? "战术副官" : "Tactical Adjutant"}</Text>
        <Text style={styles.value}>{projection.fallback.label}</Text>
        <Text style={styles.hint}>
          {zh
            ? "公开通道采用无资产中性回退；受限角色名称、时代资料与图片标识不会进入该投影。"
            : "The public channel uses an asset-free neutral fallback; restricted identity, era metadata, and asset identifiers are absent."}
        </Text>
      </View>
    );
  }

  const selector = projection.selector;
  const mutable = connection.canRequestAuthoritativeIntent
    && projection.capabilities.selectPersona
    && pending === null;

  const selectPersona = async (worldbookId: string) => {
    if (!mutable) return;
    setPending(worldbookId);
    setError(null);
    try {
      const result = await dispatch({
        type: "select_character_persona",
        personaWorldbookId: worldbookId,
      });
      if (!result.ok) setError(result.rejection?.code || "CHARACTER_SELECTION_REJECTED");
    } finally {
      setPending(null);
    }
  };

  const setSpoilerAccess = async (enabled: boolean) => {
    if (!mutable) return;
    setPending("spoiler-access");
    setError(null);
    try {
      const result = await dispatch({ type: "set_character_spoiler_access", enabled });
      if (!result.ok) setError(result.rejection?.code || "CHARACTER_SPOILER_ACCESS_REJECTED");
    } finally {
      setPending(null);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{zh ? "战术副官时代" : "Adjutant era"}</Text>
      <Text style={styles.hint}>
        {zh
          ? "这是席位级、服务端 CAS 校验的 CharacterPackage 展示选择；不会切换规则、阵营或 AI 模型。"
          : "This is a seat-scoped, server-CAS CharacterPackage display choice. It does not switch Rules, faction, or AI model."}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {selector.options.map((option) => {
          if (option.kind === "locked") {
            return (
              <View
                accessibilityLabel={zh ? "锁定时代；需要显式剧透许可" : "Locked era; explicit spoiler access required"}
                key={option.optionHash}
                style={[styles.option, styles.optionDisabled]}
              >
                <View style={styles.slot}><Text style={styles.slotText}>{option.slotIndex + 1}</Text></View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{zh ? "锁定时代" : "Locked era"}</Text>
                  <Text style={styles.optionMeta}>{zh ? "未公开身份与时间线" : "Identity and timeline withheld"}</Text>
                </View>
              </View>
            );
          }
          const disabled = !mutable || !option.selectable;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: option.selected, disabled }}
              disabled={disabled}
              key={option.worldbookId}
              onPress={() => selectPersona(option.worldbookId)}
              style={[
                styles.option,
                option.selected && styles.optionSelected,
                disabled && !option.selected && styles.optionDisabled,
              ]}
            >
              <View style={[styles.slot, option.selected && styles.slotSelected]}>
                <Text style={styles.slotText}>{option.slotIndex + 1}</Text>
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionMeta}>{option.timeline.start} → {option.timeline.end}</Text>
              </View>
              <Text style={styles.radioMark}>{option.selected ? "●" : pending === option.worldbookId ? "…" : "○"}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !mutable }}
        disabled={!mutable}
        onPress={() => setSpoilerAccess(!selector.fullCatalogueRevealed)}
        style={[styles.spoilerButton, !mutable && styles.optionDisabled]}
      >
        <Text style={styles.spoilerButtonText}>
          {selector.fullCatalogueRevealed
            ? (zh ? "恢复默认剧透上限（rank 60）" : "Restore default spoiler ceiling (rank 60)")
            : (zh ? "显式显示全部时代（包含重大剧透）" : "Explicitly reveal all eras (major spoilers)")}
        </Text>
      </Pressable>
      {!connection.online && (
        <Text style={styles.offline}>{zh ? "离线快照只读，重连后才能切换。" : "Offline snapshot is read-only until reconnected."}</Text>
      )}
      {error && <Text selectable style={styles.error}>{error}</Text>}
      <Text style={styles.rights}>
        {zh
          ? "开发内测投影：图片仅通过服务端 content hash 路由加载，公开包不内置受限图。"
          : "Internal development projection: images load only through the server content-hash route; public bundles embed no restricted art."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20, backgroundColor: "#0b130d", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#52624a" },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: "#b7ca8e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  value: { color: "#f1f5f9", fontSize: 16, fontWeight: "800", marginBottom: 8 },
  hint: { fontSize: 12, color: "#aeb9a4", lineHeight: 19, marginBottom: 12 },
  options: { gap: 8 },
  option: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#141d16", borderWidth: 1, borderColor: "#354333" },
  optionSelected: { borderColor: "#d2ae59", backgroundColor: "#252719" },
  optionDisabled: { opacity: 0.52 },
  slot: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center", backgroundColor: "#243023" },
  slotSelected: { backgroundColor: "#725d25" },
  slotText: { color: "#e4ebd7", fontSize: 11, fontWeight: "900" },
  optionCopy: { flex: 1, minWidth: 0 },
  optionTitle: { color: "#e8eddf", fontSize: 12, lineHeight: 17, fontWeight: "800" },
  optionMeta: { color: "#8e9c88", fontSize: 10, lineHeight: 15, marginTop: 2 },
  radioMark: { color: "#d2ae59", fontSize: 18 },
  spoilerButton: { minHeight: 44, borderRadius: 8, marginTop: 12, paddingHorizontal: 12, justifyContent: "center", alignItems: "center", backgroundColor: "#33270f", borderWidth: 1, borderColor: "#a98535" },
  spoilerButtonText: { color: "#f1d791", fontSize: 12, fontWeight: "900", textAlign: "center" },
  offline: { color: "#fbbf24", fontSize: 11, lineHeight: 17, marginTop: 10 },
  rights: { color: "#9aa18e", fontSize: 10, lineHeight: 16, marginTop: 10 },
  error: { color: "#fca5a5", fontFamily: "monospace", fontSize: 10, lineHeight: 16, marginTop: 9 },
});
