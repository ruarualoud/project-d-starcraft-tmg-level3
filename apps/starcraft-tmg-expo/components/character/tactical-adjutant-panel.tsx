import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useI18n } from "@/lib/i18n";
import { useLevel3ClientDomain } from "@/lib/level3/client-domain-provider";
import {
  createStarcraftTmgVisiblePortraitPlayerV2,
  resolveStarcraftTmgCharacterPortraitAssetUriV2,
  type StarcraftTmgVisibleCharacterFrame,
} from "@/lib/level3/character-presentation-mount-runtime.mjs";
import { useReducedMotion } from "@/lib/level3/use-reduced-motion";

function configuredAssetOrigin() {
  const configured = process.env.EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN || "";
  if (configured) return configured;
  if (Platform.OS === "web") return "";
  return null;
}

export function TacticalAdjutantPanel() {
  const { lang } = useI18n();
  const { view, connection, refresh } = useLevel3ClientDomain();
  const routeFocused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(true);
  const [frame, setFrame] = useState<StarcraftTmgVisibleCharacterFrame | null>(null);
  const [assetFailedFor, setAssetFailedFor] = useState<string | null>(null);
  const playerRef = useRef(createStarcraftTmgVisiblePortraitPlayerV2());
  const assetRecoveryAttempt = useRef<{
    bindingHash: string;
    contentHash: string;
  } | null>(null);
  const projection = view.characterPresentation;
  const offlineSnapshot = view.characterOfflineSnapshot;
  const zh = lang === "zh";
  const active = routeFocused
    && expanded
    && connection.visible
    && connection.online;

  useEffect(() => {
    const player = playerRef.current;
    let stop = () => player.stop();
    if (!projection) {
      player.stop();
      setFrame(null);
      return stop;
    }
    stop = player.start(
      { projection, active, reducedMotion },
      (nextFrame) => setFrame(nextFrame),
    );
    return () => {
      stop();
    };
  }, [active, projection, reducedMotion]);

  useEffect(() => () => playerRef.current.stop(), []);
  useEffect(() => setAssetFailedFor(null), [projection?.projectionHash]);

  const assetUri = useMemo(() => {
    const origin = configuredAssetOrigin();
    if (!projection || !frame?.contentHash || origin === null) return null;
    try {
      return resolveStarcraftTmgCharacterPortraitAssetUriV2(
        projection,
        frame.contentHash,
        { assetOrigin: origin },
      );
    } catch {
      return null;
    }
  }, [frame?.contentHash, projection]);
  const assetFailureKey = frame?.contentHash
    ? `${frame.generationKey}:${frame.contentHash}`
    : null;
  const imageAvailable = Boolean(assetUri && frame && assetFailedFor !== assetFailureKey);
  const publicFallback = projection?.releaseChannel === "public";
  const selectedPersona = projection?.releaseChannel === "development_internal"
    ? projection.selector.options.find((option) => option.kind === "persona" && option.selected)
    : null;
  const cachedPersona = !projection && offlineSnapshot?.releaseChannel === "development_internal"
    ? offlineSnapshot.selectedPersona
    : null;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={zh ? "战术副官" : "Tactical Adjutant"}
      style={styles.panel}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.header}
      >
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{zh ? "战术通讯" : "TACTICAL COMMS"}</Text>
          <Text style={styles.title}>
            {publicFallback
              ? projection.fallback.label
              : projection?.releaseChannel === "development_internal"
                ? projection.character.displayName
                : cachedPersona
                  ? (zh ? "已封存的离线副官" : "Sealed offline Adjutant")
                : (zh ? "副官尚未接入" : "Adjutant not connected")}
          </Text>
        </View>
        <Text style={styles.toggle}>{expanded ? "−" : "+"}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.portraitFrame}>
            {imageAvailable ? (
              <Image
                accessibilityIgnoresInvertColors
                accessibilityLabel={
                  selectedPersona?.kind === "persona"
                    ? `${projection?.releaseChannel === "development_internal" ? projection.character.displayName : ""}, ${selectedPersona.title}`
                    : (zh ? "原创中性副官占位" : "Original neutral adjutant placeholder")
                }
                onLoad={() => {
                  if (frame?.contentHash) {
                    const recovery = assetRecoveryAttempt.current;
                    if (recovery
                      && recovery.bindingHash === frame.generationKey
                      && recovery.contentHash === frame.contentHash) {
                      assetRecoveryAttempt.current = null;
                    }
                    playerRef.current.markLoaded({
                      generationKey: frame.generationKey,
                      contentHash: frame.contentHash,
                    });
                  }
                }}
                onError={() => {
                  if (frame?.contentHash) {
                    playerRef.current.markFailed({
                      generationKey: frame.generationKey,
                      contentHash: frame.contentHash,
                    });
                    setAssetFailedFor(`${frame.generationKey}:${frame.contentHash}`);
                    const bindingHash = projection?.releaseChannel === "development_internal"
                      ? projection.bindings.bindingHash
                      : null;
                    if (bindingHash
                      && connection.online
                      && connection.visible
                      && (assetRecoveryAttempt.current?.bindingHash !== bindingHash
                        || assetRecoveryAttempt.current?.contentHash !== frame.contentHash)) {
                      assetRecoveryAttempt.current = {
                        bindingHash,
                        contentHash: frame.contentHash,
                      };
                      void refresh().catch(() => {});
                    }
                  }
                }}
                resizeMode="cover"
                source={{ uri: assetUri || "" }}
                style={styles.portrait}
              />
            ) : (
              <View style={styles.fallbackPortrait}>
                {cachedPersona ? (
                  <StaticNeutralAdjutantPortrait
                    key={cachedPersona.neutralFrame.contentHash}
                    label={zh ? "本地静态中性副官" : "Local static neutral Adjutant"}
                  />
                ) : (
                  <Text style={styles.fallbackGlyph}>◈</Text>
                )}
                <Text style={styles.fallbackText}>
                  {publicFallback
                    ? (zh ? "公开通道使用无资产中性回退" : "Asset-free neutral public fallback")
                    : !projection
                      ? cachedPersona
                        ? (zh ? "离线只读：已恢复封存选择；远程头像暂停" : "Offline read-only: sealed selection restored; remote portrait paused")
                        : (zh ? "进入已验证房间后加载副官" : "Join a verified room to load an adjutant")
                      : (zh ? "头像资源不可用" : "Portrait asset unavailable")}
                </Text>
              </View>
            )}
            <View pointerEvents="none" style={styles.scanlines} />
          </View>

          <View style={styles.copy}>
            <Text style={styles.personaTitle}>
              {selectedPersona?.kind === "persona"
                ? selectedPersona.title
                : cachedPersona
                  ? cachedPersona.title
                : (zh ? "Project D 原创副官" : "Project D original Adjutant")}
            </Text>
            {selectedPersona?.kind === "persona" && (
              <Text style={styles.timeline}>
                {selectedPersona.timeline.start} → {selectedPersona.timeline.end}
              </Text>
            )}
            {cachedPersona && (
              <Text style={styles.timeline}>
                {cachedPersona.timeline.start} → {cachedPersona.timeline.end}
              </Text>
            )}
            <View style={styles.statusRow}>
              <StatusChip
                label={projection?.releaseChannel === "development_internal"
                  ? `${projection.portrait.phase} · ${frame?.role || "static"}`
                  : "static"}
              />
              <StatusChip
                label={reducedMotion
                  ? (zh ? "减少动态" : "reduced motion")
                  : active && frame?.shouldAnimate
                    ? (zh ? "可见时动态" : "visible animation")
                    : (zh ? "已暂停" : "paused")}
              />
              {!connection.online && <StatusChip label={zh ? "离线只读" : "offline read-only"} />}
            </View>
            <Text style={styles.boundary}>
              {zh
                ? "当前仅播放服务端许可的 idle 帧；不调用模型、不改变规则或对战动作。"
                : "Only the server-approved idle sequence plays here. No model call, Rules change, or gameplay action occurs."}
            </Text>
            {projection?.releaseChannel === "development_internal" && (
              <Text style={styles.rights}>
                {zh
                  ? "内部开发预览；衍生视觉尚未获准公开发布。"
                  : "Internal development preview; derived visuals are not cleared for public release."}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function StaticNeutralAdjutantPortrait({ label }: { label: string }) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="image"
      style={styles.neutralPortrait}
      testID="static-neutral-adjutant-portrait"
    >
      <View style={styles.neutralHalo} />
      <View style={styles.neutralHead} />
      <View style={styles.neutralShoulders} />
      <View style={styles.neutralCore} />
    </View>
  );
}

function StatusChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 14, overflow: "hidden", backgroundColor: "#080f0b", borderWidth: 1, borderColor: "#52624a" },
  header: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: "#101912" },
  headerCopy: { flex: 1 },
  eyebrow: { color: "#a8bd7d", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#eef4df", fontSize: 16, fontWeight: "900", marginTop: 3 },
  toggle: { color: "#d2ae59", fontSize: 24, fontWeight: "700" },
  body: { flexDirection: "row", flexWrap: "wrap", gap: 14, padding: 14 },
  portraitFrame: { width: 168, height: 168, maxWidth: "100%", position: "relative", overflow: "hidden", backgroundColor: "#071009", borderWidth: 1, borderColor: "#70805e" },
  portrait: { width: "100%", height: "100%" },
  fallbackPortrait: { flex: 1, padding: 14, justifyContent: "center", alignItems: "center", gap: 8 },
  fallbackGlyph: { color: "#7f946a", fontSize: 30 },
  neutralPortrait: { width: 82, height: 82, position: "relative", alignItems: "center", justifyContent: "center" },
  neutralHalo: { position: "absolute", width: 76, height: 76, borderRadius: 38, borderWidth: 1, borderColor: "#7f946a", opacity: 0.5 },
  neutralHead: { position: "absolute", top: 15, width: 24, height: 30, borderRadius: 12, backgroundColor: "#93a77d" },
  neutralShoulders: { position: "absolute", bottom: 13, width: 58, height: 28, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: "#52624a" },
  neutralCore: { position: "absolute", bottom: 23, width: 9, height: 9, borderRadius: 5, backgroundColor: "#d2ae59" },
  fallbackText: { color: "#aeb9a4", fontSize: 11, lineHeight: 17, textAlign: "center" },
  scanlines: { ...StyleSheet.absoluteFillObject, opacity: 0.14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#dcebc9" },
  copy: { flex: 1, flexBasis: 240, minWidth: 0, justifyContent: "center" },
  personaTitle: { color: "#f5f2df", fontSize: 16, lineHeight: 22, fontWeight: "900" },
  timeline: { color: "#9da994", fontSize: 11, lineHeight: 17, marginTop: 5 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 11 },
  chip: { minHeight: 24, justifyContent: "center", paddingHorizontal: 8, borderRadius: 999, backgroundColor: "#1b291c", borderWidth: 1, borderColor: "#4c6147" },
  chipText: { color: "#c8d7b7", fontSize: 10, fontWeight: "800" },
  boundary: { color: "#aeb9a4", fontSize: 11, lineHeight: 18, marginTop: 11 },
  rights: { color: "#d2ae59", fontSize: 10, lineHeight: 16, marginTop: 7 },
});
