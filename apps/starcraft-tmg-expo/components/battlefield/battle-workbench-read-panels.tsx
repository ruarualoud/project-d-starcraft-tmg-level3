import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Panel = "unit" | "threat" | "status" | "markers";
export type WorkbenchThreatMode =
  | "stationary_fire" | "move_then_fire" | "charge_engagement"
  | "friendly_aggregate" | "enemy_aggregate";

function value(input: unknown, fallback = "—") {
  return input === null || input === undefined || input === "" ? fallback : String(input);
}

function StatusPill({ status }: { status: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{status}</Text>
    </View>
  );
}

function Placeholder({ title, snapshot, section }: {
  title: string;
  snapshot: Record<string, any> | null;
  section: "threat" | "tokenMarkerActions";
}) {
  const payload = snapshot?.[section];
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <StatusPill status={value(payload?.coverage, "not_loaded")} />
      </View>
      <Text style={styles.copy}>{value(payload?.reason, "Authoritative section unavailable.")}</Text>
      <Text style={styles.boundary}>This panel never estimates or mutates rules on the client.</Text>
    </View>
  );
}

export function BattleWorkbenchReadPanel({
  panel,
  snapshot,
  selectedPieceId,
  zh,
  threatMode = "stationary_fire",
  selectedThreatWeaponId = null,
  onThreatMode,
  onThreatWeapon,
}: {
  panel: Panel;
  snapshot: Record<string, any> | null;
  selectedPieceId: string | null;
  zh: boolean;
  threatMode?: WorkbenchThreatMode;
  selectedThreatWeaponId?: string | null;
  onThreatMode?: (mode: WorkbenchThreatMode) => void;
  onThreatWeapon?: (weaponId: string | null) => void;
}) {
  if (!snapshot) {
    return <Text style={styles.empty}>{zh ? "正在读取当前修订的作战工作台…" : "Loading the current-revision battle workbench…"}</Text>;
  }
  if (panel === "threat") {
    const threat = snapshot.threat;
    if (!threat || threat.coverage === "not_loaded") {
      return <Placeholder title={zh ? "威胁图层" : "Threat layers"} snapshot={snapshot} section="threat" />;
    }
    const selectedUnit = threat.perUnit?.find((entry: any) => (
      entry.unitId === selectedPieceId
      || snapshot.units?.find((unit: any) => unit.id === entry.unitId)
        ?.models?.some((model: any) => model.id === selectedPieceId)
    ));
    const modes: Array<[WorkbenchThreatMode, string]> = [
      ["stationary_fire", zh ? "原地射击" : "Stationary"],
      ["move_then_fire", zh ? "走打" : "Move + fire"],
      ["charge_engagement", zh ? "冲锋" : "Charge"],
      ["friendly_aggregate", zh ? "我方叠加" : "Friendly union"],
      ["enemy_aggregate", zh ? "敌方叠加" : "Enemy union"],
    ];
    return (
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        <View style={styles.card}>
          <View style={styles.titleRow}><Text style={styles.title}>{zh ? "威胁图层" : "Threat layers"}</Text><StatusPill status={threat.coverage} /></View>
          <View style={styles.grid}>{modes.map(([mode, label]) => (
            <Pressable key={mode} onPress={() => onThreatMode?.(mode)} style={[styles.choice, threatMode === mode && styles.choiceActive]}>
              <Text style={styles.choiceText}>{label}</Text>
            </Pressable>
          ))}</View>
          <Text style={styles.boundary}>{threat.coverageReason}</Text>
        </View>
        {selectedUnit && !threatMode.includes("aggregate") && (
          <View style={styles.card}>
            <Text style={styles.subtitle}>{zh ? "武器图层" : "Weapon layer"}</Text>
            <View style={styles.grid}>
              <Pressable onPress={() => onThreatWeapon?.(null)} style={[styles.choice, selectedThreatWeaponId === null && styles.choiceActive]}><Text style={styles.choiceText}>All</Text></Pressable>
              {(selectedUnit.weapons || []).map((weapon: any) => (
                <Pressable key={weapon.weaponId} onPress={() => onThreatWeapon?.(weapon.weaponId)} style={[styles.choice, selectedThreatWeaponId === weapon.weaponId && styles.choiceActive]}>
                  <Text style={styles.choiceText}>{weapon.weaponName}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.meta}>speed {selectedUnit.speed?.printed} → {selectedUnit.speed?.speedInches} in ({selectedUnit.speed?.branch}) · models {selectedUnit.currentModels}</Text>
          </View>
        )}
        <View style={styles.card}>
          <Text style={styles.subtitle}>{zh ? "覆盖依赖" : "Coverage dependencies"}</Text>
          {Object.entries(threat.dependencies || {}).map(([key, entry]) => <Text key={key} style={styles.row}>• {key}: {value(entry)}</Text>)}
        </View>
      </ScrollView>
    );
  }
  if (panel === "markers") {
    return <Placeholder title={zh ? "Token / Marker" : "Token / Marker"} snapshot={snapshot} section="tokenMarkerActions" />;
  }
  if (panel === "unit") {
    const unit = snapshot.units?.find((entry: any) => (
      entry.id === selectedPieceId || entry.models?.some((model: any) => model.id === selectedPieceId)
    )) || null;
    if (!unit) return <Text style={styles.empty}>{zh ? "在战场上选择一个单位查看资料。" : "Select a battlefield unit to inspect it."}</Text>;
    return (
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        <View style={styles.card}>
          <View style={styles.titleRow}><Text style={styles.title}>{unit.name}</Text><StatusPill status={unit.inspectionCoverage} /></View>
          <Text style={styles.meta}>{unit.faction || "unknown faction"} · {unit.location} · {unit.currentModels}/{unit.maxModels} models</Text>
          <View style={styles.grid}>
            <Text style={styles.fact}>HP/model {value(unit.hpPerModel)}</Text>
            <Text style={styles.fact}>Shield/model {value(unit.shieldPerModel)}</Text>
            <Text style={styles.fact}>Damage {value(unit.damage)}</Text>
            <Text style={styles.fact}>Remaining {value(unit.remainingDurability)}</Text>
            <Text style={styles.fact}>Supply {value(unit.currentSupply)}</Text>
            <Text style={styles.fact}>Minerals {value(unit.mineralCost)}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.subtitle}>{zh ? "已装升级" : "Installed upgrades"}</Text>
          {(unit.upgrades || []).filter((entry: any) => entry.selected).map((entry: any) => (
            <Text key={entry.id} style={styles.row}>• {entry.name}{entry.description ? ` — ${entry.description}` : ""}</Text>
          ))}
          {!(unit.upgrades || []).some((entry: any) => entry.selected) && <Text style={styles.muted}>None projected</Text>}
        </View>
        <View style={styles.card}>
          <Text style={styles.subtitle}>{zh ? "武器与能力" : "Weapons & abilities"}</Text>
          {(unit.weapons || []).map((entry: any) => <Text key={entry.id} style={styles.row}>• {entry.name} · range {value(entry.range)} · hit {value(entry.hit)} · dmg {value(entry.dmg)}</Text>)}
          {(unit.abilities || []).map((entry: any, index: number) => <Text key={entry.id || index} style={styles.row}>• {value(entry.name || entry.id || entry.effect)}</Text>)}
        </View>
        <Text style={styles.boundary}>Viewer-scoped authoritative projection · r{value(snapshot.stateRevision)} · client mutation disabled</Text>
      </ScrollView>
    );
  }

  const scenario = snapshot.scenario || {};
  const deployment = snapshot.deployment || {};
  return (
    <ScrollView style={styles.scroll} nestedScrollEnabled>
      <View style={styles.card}>
        <View style={styles.titleRow}><Text style={styles.title}>{zh ? "战局状态" : "Battle status"}</Text><StatusPill status={value(snapshot.coverage?.score?.status, "unknown")} /></View>
        <Text style={styles.meta}>Round {value(scenario.round)} · {value(scenario.phase)} · active {value(scenario.activeSideKey)}</Text>
        {(snapshot.scoreboard || []).map((entry: any) => <Text key={entry.sideKey} style={styles.score}>{entry.playerName}: {entry.score}</Text>)}
      </View>
      <View style={styles.card}>
        <Text style={styles.subtitle}>{zh ? "Scenario" : "Scenario"}</Text>
        <Text style={styles.row}>{value(scenario.mission?.name || scenario.mission?.id, "Mission not projected")}</Text>
        <Text style={styles.row}>{value(scenario.deployment?.name || scenario.deployment?.id, "Deployment not projected")}</Text>
        <Text style={styles.meta}>{scenario.map?.widthInches || "?"} × {scenario.map?.heightInches || "?"} in · {scenario.map?.terrainCount || 0} terrain · {scenario.map?.markerCount || 0} markers</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.subtitle}>{zh ? "部署 / 预备队" : "Deployment / reserves"}</Text>
        <Text style={styles.row}>Battlefield: {(deployment.battlefield || []).join(", ") || "—"}</Text>
        <Text style={styles.row}>Reserve: {(deployment.reserve || []).join(", ") || "—"}</Text>
        <Text style={styles.row}>Undeployed: {(deployment.undeployed || []).join(", ") || "—"}</Text>
        <Text style={styles.row}>Destroyed: {(deployment.destroyed || []).join(", ") || "—"}</Text>
      </View>
      <Text style={styles.boundary}>The end-of-round forecast remains unavailable until its rules-owned Slice 141 query is loaded.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 610 },
  card: { borderRadius: 10, padding: 11, marginBottom: 8, backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155", gap: 7 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { flex: 1, color: "#e2e8f0", fontSize: 13, fontWeight: "900" },
  subtitle: { color: "#cbd5e1", fontSize: 11, fontWeight: "900" },
  meta: { color: "#64748b", fontSize: 10, lineHeight: 15, fontFamily: "monospace" },
  row: { color: "#cbd5e1", fontSize: 11, lineHeight: 17 },
  copy: { color: "#cbd5e1", fontSize: 12, lineHeight: 18 },
  muted: { color: "#64748b", fontSize: 11 },
  empty: { color: "#64748b", fontSize: 12, lineHeight: 18, paddingVertical: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fact: { color: "#cbd5e1", fontSize: 10, minWidth: 96, padding: 6, backgroundColor: "#020617", borderRadius: 6 },
  score: { color: "#67e8f9", fontSize: 15, fontWeight: "900" },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#22d3ee" },
  pillText: { color: "#67e8f9", fontSize: 9, fontWeight: "900" },
  choice: { minHeight: 40, justifyContent: "center", paddingHorizontal: 9, borderRadius: 7, borderWidth: 1, borderColor: "#475569", backgroundColor: "#172554" },
  choiceActive: { borderColor: "#22d3ee", backgroundColor: "#164e63" },
  choiceText: { color: "#f8fafc", fontSize: 10, fontWeight: "800" },
  boundary: { color: "#94a3b8", fontSize: 10, lineHeight: 16 },
});
