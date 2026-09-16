import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Polyline, Rect } from "react-native-svg";

import { useI18n } from "@/lib/i18n";

const API_PREFIX = "/starcraft-tmg-level3/api/v1";

type EraFilter = "all" | "brood_war" | "starcraft_2";

function cycle<T>(values: readonly T[], current: T): T {
  const index = values.indexOf(current);
  return values[(index + 1) % values.length];
}

function TinyButton({ active = false, label, onPress }: {
  active?: boolean;
  label: string;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tinyButton, active && styles.tinyButtonActive,
        pressed && styles.pressed]}
    >
      <Text style={styles.tinyButtonText}>{label}</Text>
    </Pressable>
  );
}

function topologyPreview(map: any, preview: any) {
  const width = Number(map?.battlefield?.widthInches || 54);
  const height = Number(map?.battlefield?.heightInches || 36);
  const elements = Array.isArray(map?.elements) ? map.elements : [];
  const lanes = Array.isArray(map?.passages) ? map.passages : [];
  const zones = Array.isArray(map?.zones) ? map.zones : [];
  const rulesTerrain = Array.isArray(preview?.rulesTerrain)
    ? preview.rulesTerrain : [];
  return (
    <View style={[styles.topologyFrame, { aspectRatio: width / height }]}
      testID="competitive-map-topology-preview">
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Rect x={0} y={0} width={width} height={height} fill="#071521"
          stroke="#38bdf8" strokeWidth={0.18} />
        {elements.map((element: any) => {
          const footprint = element.artFootprint || {};
          const centre = footprint.centre || {};
          return <Rect key={`art:${element.elementId}`}
            x={Number(centre.xInches || 0) - Number(footprint.widthInches || 0) / 2}
            y={height - Number(centre.yInches || 0) - Number(footprint.heightInches || 0) / 2}
            width={Number(footprint.widthInches || 0)}
            height={Number(footprint.heightInches || 0)}
            fill="#64748b22" stroke="#64748b" strokeWidth={0.1} />;
        })}
        {lanes.map((lane: any) => (
          <Polyline key={`lane:${lane.laneId}`}
            points={(lane.centreline || []).map((point: any) => (
              `${Number(point.xInches || 0)},${height - Number(point.yInches || 0)}`
            )).join(" ")}
            fill="none" stroke="#22d3ee" strokeWidth={0.22} />
        ))}
        {zones.map((zone: any) => (
          <Circle key={`zone:${zone.zoneId}`}
            cx={Number(zone.centre?.xInches || 0)}
            cy={height - Number(zone.centre?.yInches || 0)}
            r={0.55} fill={zone.role === "deployment" ? "#34d399" : "#fbbf24"} />
        ))}
        {rulesTerrain.map((piece: any) => {
          const footprint = piece.footprint || {};
          return <Rect key={`rules:${piece.terrainPieceId}`}
            x={Number(footprint.xMin || 0)}
            y={height - Number(footprint.yMax || 0)}
            width={Number(footprint.xMax || 0) - Number(footprint.xMin || 0)}
            height={Number(footprint.yMax || 0) - Number(footprint.yMin || 0)}
            fill="#f59e0b55" stroke="#fde68a" strokeWidth={0.14} />;
        })}
      </Svg>
    </View>
  );
}

export function CompetitiveMapConfigurator({ boundMapSeedId = null }: {
  boundMapSeedId?: string | null;
}) {
  const { lang } = useI18n();
  const zh = lang === "zh";
  const baseUrl = process.env.EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN || "";
  const [catalogue, setCatalogue] = useState<any>(null);
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [era, setEra] = useState<EraFilter>("all");
  const [elementSelections, setElementSelections] = useState<Record<string, any>>({});
  const [passageSelections, setPassageSelections] = useState<Record<string, any>>({});
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}${API_PREFIX}/map-configurator`, {
        headers: { accept: "application/json" },
      });
      const body = await response.json();
      const next = body?.result?.catalogue;
      if (!response.ok || !next || !Array.isArray(next.maps)) {
        throw new Error(body?.result?.reason || "MAP_CONFIGURATOR_READ_FAILED");
      }
      setCatalogue(next);
      setSelectedSeedId((current) => current || boundMapSeedId
        || next.maps[0]?.seedId || null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, [baseUrl, boundMapSeedId]);

  useEffect(() => { void load(); }, [load]);

  const maps = useMemo(() => (catalogue?.maps || []).filter((map: any) => {
    if (era !== "all" && map.gameEra !== era) return false;
    const search = query.trim().toLowerCase();
    return !search || `${map.displayName} ${map.seedId} ${map.engagementScale}`
      .toLowerCase().includes(search);
  }), [catalogue?.maps, era, query]);
  const selectedMap = (catalogue?.maps || []).find((map: any) => (
    map.seedId === selectedSeedId)) || null;
  const useClassicArtVariant = Boolean(selectedMap?.classicArtVariant
    && selectedMap.classicArtVariant.sourceRestrictedLaneIds.some((laneId: string) => (
      passageSelections[laneId]?.passageMode === "preserve_source_clearance")));
  const selectedArtPath = useClassicArtVariant
    ? selectedMap.classicArtVariant.path : selectedMap?.artAsset?.path;

  useEffect(() => {
    if (!selectedMap) return;
    setPreview(null);
    setElementSelections(Object.fromEntries(selectedMap.elements.map((entry: any) => [
      entry.elementId,
      { elementId: entry.elementId,
        artDisposition: entry.artRetainByDefault ? "retain" : "hide",
        rulesDisposition: "auto", rulesMode: entry.recommendedRulesMode },
    ])));
    setPassageSelections(Object.fromEntries(selectedMap.passages.map((entry: any) => [
      entry.laneId,
      { laneId: entry.laneId, passageMode: entry.defaultPassageMode },
    ])));
  }, [selectedMap?.seedId]);

  const compilePreview = async () => {
    if (!selectedMap || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `${baseUrl}${API_PREFIX}/map-configurator/preview`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ seedId: selectedMap.seedId,
            elementSelections: Object.values(elementSelections),
            passageSelections: Object.values(passageSelections) }),
        });
      const body = await response.json();
      if (!response.ok || !body?.result?.preview) {
        throw new Error(body?.result?.message || body?.result?.reason
          || "MAP_CONFIGURATOR_PREVIEW_REJECTED");
      }
      setPreview(body.result.preview);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  if (!catalogue) {
    return <View style={styles.shell}><Text style={styles.muted}>
      {error || (zh ? "正在读取 SC1 / SC2 地图库…" : "Loading SC1 / SC2 map gallery…")}
    </Text><TinyButton label={zh ? "重试" : "Retry"} onPress={() => void load()} /></View>;
  }

  return (
    <View style={styles.shell} testID="competitive-map-configurator">
      <Text style={styles.eyebrow}>SC1 + SC2 · TWO-LAYER MAP CONFIGURATOR</Text>
      <Text style={styles.title}>{zh ? "经典地图与权威桌面地形" : "Classic maps and authoritative tabletop terrain"}</Text>
      <Text style={styles.copy}>{zh
        ? "地图图像只负责展示；黄色规则地形、任务可达性和完整底盘边界由编译器独立计算。预览不会改变当前房间。"
        : "Map art is display-only. The yellow Rules terrain, task reachability and complete-base boundary are compiled independently. Preview never mutates the current room."}</Text>
      {boundMapSeedId && <Text style={styles.locked} testID="bound-map-lock">
        {zh ? `当前房间已冻结：${boundMapSeedId}；下面的选择只用于新房间预览。`
          : `Current room is frozen to ${boundMapSeedId}; selections below preview a new room only.`}
      </Text>}
      <View style={styles.filters}>
        <TextInput value={query} onChangeText={setQuery}
          placeholder={zh ? "搜索地图 / 规模" : "Search map / scale"}
          placeholderTextColor="#64748b" style={styles.search} />
        {(["all", "brood_war", "starcraft_2"] as const).map((value) => (
          <TinyButton key={value} active={era === value}
            label={value === "all" ? (zh ? "全部" : "All")
              : value === "brood_war" ? "SC1" : "SC2"}
            onPress={() => setEra(value)} />
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mapList}>
        {maps.map((map: any) => (
          <Pressable key={map.seedId} onPress={() => setSelectedSeedId(map.seedId)}
            style={[styles.mapCard, map.seedId === selectedSeedId && styles.mapCardActive]}>
            <Image source={{ uri: `${baseUrl}${map.artAsset.path}` }}
              resizeMode="cover" style={styles.mapThumb} />
            <Text style={styles.mapName}>{map.displayName}</Text>
            <Text style={styles.mapMeta}>{map.gameEra === "brood_war" ? "SC1" : "SC2"} · {map.engagementScale} · {map.battlefield.widthInches}×36in</Text>
            <Text style={map.formalTaskRoomEligible ? styles.ready : styles.previewOnly}>
              {map.formalTaskRoomEligible
                ? (zh ? "任务几何可认证" : "Task geometry certified")
                : (zh ? "仅拓扑预览" : "Topology preview only")}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {selectedMap && <>
        <View style={styles.previewGrid}>
          <View style={styles.previewPane}>
            <Image source={{ uri: `${baseUrl}${selectedArtPath}` }}
              resizeMode="contain"
              style={[styles.mapArt, { aspectRatio:
                selectedMap.battlefield.widthInches / 36 }]} />
            <Text style={styles.layerCaption}>{zh ? "展示层 · 无规则权威" : "ART LAYER · NO RULES AUTHORITY"}</Text>
          </View>
          <View style={styles.previewPane}>
            {topologyPreview(selectedMap, preview)}
            <Text style={styles.layerCaption}>{zh ? "拓扑 + 编译规则层" : "TOPOLOGY + COMPILED RULES LAYER"}</Text>
          </View>
        </View>
        <View style={styles.contract}>
          <Text style={styles.contractText}>{selectedMap.seedId} · {selectedMap.elements.length} elements · {selectedMap.passages.length} passages</Text>
          <Text style={styles.contractText}>{selectedMap.taskGeometryStatus} · {selectedMap.baseProfilesAudited.join(", ")}</Text>
          {useClassicArtVariant && <Text style={styles.contractText}>
            {selectedMap.classicArtVariant.userFacingRestriction}
          </Text>}
          {preview && <Text style={styles.contractText} testID="map-preview-receipt">
            {preview.actualCounts.total} terrain · {preview.compensatingTerrainPieceIds.length} compensation · {preview.roomCertificationEligible ? "room ready" : "preview only"} · {preview.compilationHash}
          </Text>}
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{zh ? "地图元素：美术与规则独立" : "Map elements: art and Rules are independent"}</Text>
          <TinyButton label={busy ? (zh ? "编译中…" : "Compiling…")
            : (zh ? "编译权威预览" : "Compile authoritative preview")}
            onPress={() => void compilePreview()} />
        </View>
        <View style={styles.controlList}>
          {selectedMap.elements.map((entry: any) => {
            const value = elementSelections[entry.elementId];
            if (!value) return null;
            return <View key={entry.elementId} style={styles.controlRow}>
              <View style={styles.controlCopy}>
                <Text style={styles.controlName}>{entry.sourceFeature}</Text>
                <Text style={styles.controlMeta}>{entry.elementId} · {entry.clearanceResolution}</Text>
              </View>
              <TinyButton label={`art: ${value.artDisposition}`}
                onPress={() => setElementSelections((current) => ({ ...current,
                  [entry.elementId]: { ...value,
                    artDisposition: value.artDisposition === "retain" ? "hide" : "retain" } }))} />
              <TinyButton label={`rules: ${value.rulesDisposition}`}
                onPress={() => setElementSelections((current) => ({ ...current,
                  [entry.elementId]: { ...value, rulesDisposition: cycle(
                    ["auto", "enabled", "disabled"], value.rulesDisposition) } }))} />
              <TinyButton label={`mode: ${value.rulesMode}`}
                onPress={() => setElementSelections((current) => ({ ...current,
                  [entry.elementId]: { ...value, rulesMode: cycle(
                    entry.allowedRulesModes, value.rulesMode) } }))} />
            </View>;
          })}
        </View>
        <Text style={styles.sectionTitle}>{zh ? "通道展示模式" : "Passage display modes"}</Text>
        <Text style={styles.copy}>{zh
          ? "窄道选项会列出无法直线通过的底盘；它只改变展示/披露，不会偷偷改变规则几何。"
          : "A narrow option lists bases that cannot transit straight. It changes display/disclosure only and never silently changes Rules geometry."}</Text>
        <View style={styles.controlList}>
          {selectedMap.passages.map((entry: any) => {
            const value = passageSelections[entry.laneId];
            if (!value) return null;
            return <View key={entry.laneId} style={styles.controlRow}>
              <View style={styles.controlCopy}>
                <Text style={styles.controlName}>{entry.laneId}</Text>
                <Text style={styles.controlMeta}>source blocked: {entry.sourceBlockedBaseProfiles.join(", ") || "none"}</Text>
              </View>
              <TinyButton label={value.passageMode}
                onPress={() => setPassageSelections((current) => ({ ...current,
                  [entry.laneId]: { ...value, passageMode: cycle(
                    entry.availablePassageModes, value.passageMode) } }))} />
            </View>;
          })}
        </View>
      </>}
      {error && <Text selectable style={styles.error}>error: {error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: 16, padding: 16, gap: 12, backgroundColor: "#07111f",
    borderWidth: 1, borderColor: "#155e75" },
  eyebrow: { color: "#22d3ee", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#f8fafc", fontSize: 20, fontWeight: "900" },
  copy: { color: "#94a3b8", fontSize: 12, lineHeight: 18 },
  locked: { color: "#fde68a", backgroundColor: "#422006", borderRadius: 8,
    padding: 10, fontSize: 12, lineHeight: 18 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  search: { minWidth: 210, flexGrow: 1, minHeight: 42, borderWidth: 1,
    borderColor: "#334155", borderRadius: 8, paddingHorizontal: 12,
    backgroundColor: "#020617", color: "#f8fafc" },
  tinyButton: { minHeight: 36, justifyContent: "center", borderRadius: 7,
    paddingHorizontal: 10, borderWidth: 1, borderColor: "#475569",
    backgroundColor: "#172554" },
  tinyButtonActive: { borderColor: "#22d3ee", backgroundColor: "#164e63" },
  tinyButtonText: { color: "#e0f2fe", fontSize: 10, fontWeight: "800" },
  pressed: { opacity: 0.75 },
  mapList: { gap: 10, paddingVertical: 4 },
  mapCard: { width: 190, padding: 8, gap: 5, borderRadius: 10,
    backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155" },
  mapCardActive: { borderColor: "#22d3ee", backgroundColor: "#083344" },
  mapThumb: { width: "100%", height: 86, borderRadius: 6, backgroundColor: "#020617" },
  mapName: { color: "#f8fafc", fontSize: 13, fontWeight: "900" },
  mapMeta: { color: "#94a3b8", fontSize: 10 },
  ready: { color: "#86efac", fontSize: 10, fontWeight: "800" },
  previewOnly: { color: "#fcd34d", fontSize: 10, fontWeight: "800" },
  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  previewPane: { flexGrow: 1, flexBasis: 320, gap: 5 },
  mapArt: { width: "100%", maxHeight: 360, borderRadius: 9,
    backgroundColor: "#020617" },
  topologyFrame: { width: "100%", overflow: "hidden", borderRadius: 9,
    backgroundColor: "#020617" },
  layerCaption: { color: "#67e8f9", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  contract: { borderRadius: 9, padding: 10, gap: 4, backgroundColor: "#083344",
    borderWidth: 1, borderColor: "#0e7490" },
  contractText: { color: "#a5f3fc", fontFamily: "monospace", fontSize: 10,
    lineHeight: 15 },
  sectionHeader: { flexDirection: "row", flexWrap: "wrap", gap: 10,
    alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "900" },
  controlList: { gap: 7 },
  controlRow: { flexDirection: "row", flexWrap: "wrap", gap: 7,
    alignItems: "center", padding: 9, borderRadius: 8, backgroundColor: "#0f172a",
    borderWidth: 1, borderColor: "#334155" },
  controlCopy: { flexGrow: 1, flexBasis: 220 },
  controlName: { color: "#e2e8f0", fontSize: 11, fontWeight: "800" },
  controlMeta: { color: "#64748b", fontSize: 9, marginTop: 2 },
  muted: { color: "#94a3b8", fontSize: 12 },
  error: { color: "#fca5a5", fontFamily: "monospace", fontSize: 10 },
});
