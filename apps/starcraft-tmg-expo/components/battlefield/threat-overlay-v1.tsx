import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Circle, G } from "react-native-svg";

/**
 * Presentation-only battlefield threat overlay (Ticket 25 / Slice 262).
 *
 * Every circle, radius and coverage value rendered here comes verbatim from
 * the client-domain battle-workbench threat projection
 * (`battle-workbench-threat-v1`, composed by `battle-workbench-v1`). This
 * module never measures pixels, never derives ranges, and never decides
 * legality: overlap weights are a display-only count of how many *projected*
 * regions intersect, used solely to brighten coincident fill. Unknown stays
 * unknown and is never drawn as zero.
 */

export type ThreatOverlayMode =
  | "stationary_fire"
  | "move_then_fire"
  | "charge_engagement"
  | "friendly_aggregate"
  | "enemy_aggregate";

export interface ThreatOverlayRegionV1 {
  geometryType?: string;
  unitId?: string;
  modelId?: string;
  sideKey?: string;
  mode?: string;
  weaponId?: string | null;
  centerXMilliInches?: number;
  centerYMilliInches?: number;
  radiusMilliInches?: number;
  coverage?: string;
}

const SIDE_STROKE: Record<string, string> = {
  player1: "#38bdf8",
  player2: "#ef4444",
};

const CHARGE_STROKE = "#fbbf24";

export function threatOverlaySideColor(sideKey: unknown): string {
  return SIDE_STROKE[String(sideKey || "")] || "#a78bfa";
}

export function threatOverlayModeLabel(
  mode: ThreatOverlayMode | string,
  zh: boolean,
): string {
  const labels: Record<string, [string, string]> = {
    stationary_fire: ["原地射击", "Stationary fire"],
    move_then_fire: ["走打", "Move + fire"],
    charge_engagement: ["冲锋", "Charge"],
    friendly_aggregate: ["我方叠加", "Friendly union"],
    enemy_aggregate: ["敌方叠加", "Enemy union"],
  };
  const entry = labels[String(mode)];
  return entry ? entry[zh ? 0 : 1] : String(mode);
}

export function threatOverlayPrecisionLabel(
  coverage: unknown,
  zh: boolean,
): string {
  const value = String(coverage || "unknown");
  if (value === "exact") return zh ? "精确" : "exact";
  if (value === "partial") return zh ? "咨询性" : "advisory";
  return zh ? "未知" : "unknown";
}

function precisionDash(coverage: unknown): string | undefined {
  const value = String(coverage || "");
  if (value === "exact") return undefined;
  if (value === "unknown") return "120 140";
  return "420 260";
}

function regionIntersects(
  left: ThreatOverlayRegionV1,
  right: ThreatOverlayRegionV1,
): boolean {
  const lx = Number(left.centerXMilliInches);
  const ly = Number(left.centerYMilliInches);
  const lr = Number(left.radiusMilliInches);
  const rx = Number(right.centerXMilliInches);
  const ry = Number(right.centerYMilliInches);
  const rr = Number(right.radiusMilliInches);
  if (![lx, ly, lr, rx, ry, rr].every(Number.isFinite)) return false;
  return Math.hypot(lx - rx, ly - ry) <= lr + rr;
}

/**
 * Display-only overlap weight: how many other projected regions intersect each
 * region. Used only to scale fill/stroke opacity so coincident threat reads as
 * more intense. It is not a probability, not a rules value, and never feeds
 * gameplay truth.
 */
export function projectThreatOverlapWeightsV1(
  regions: ReadonlyArray<ThreatOverlayRegionV1>,
): number[] {
  return regions.map((region, index) => {
    let weight = 0;
    for (let other = 0; other < regions.length; other += 1) {
      if (other !== index && regionIntersects(region, regions[other])) {
        weight += 1;
      }
    }
    return weight;
  });
}

export function ThreatOverlayLayer({ regions, idPrefix = "battlefield-authoritative-threat" }: {
  regions: ReadonlyArray<ThreatOverlayRegionV1>;
  idPrefix?: string;
}) {
  const weights = projectThreatOverlapWeightsV1(regions);
  return (
    <G pointerEvents="none">
      {regions.map((region, index) => {
        const cx = Number(region.centerXMilliInches);
        const cy = Number(region.centerYMilliInches);
        const radius = Number(region.radiusMilliInches);
        if (![cx, cy, radius].every(Number.isFinite) || radius <= 0) return null;
        const weight = weights[index] || 0;
        const fillOpacity = Math.min(0.32, 0.05 + weight * 0.045);
        const strokeOpacity = Math.min(1, 0.55 + Math.min(0.45, weight * 0.08));
        const stroke = region.mode === "charge_engagement"
          ? CHARGE_STROKE
          : threatOverlaySideColor(region.sideKey);
        return (
          <Circle
            key={`threat:${region.mode}:${region.modelId}:${region.weaponId || "none"}:${index}`}
            id={`${idPrefix}-${index}`}
            cx={cx}
            cy={cy}
            r={radius}
            fill={stroke}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeOpacity={strokeOpacity}
            strokeWidth={region.mode === "stationary_fire" ? 90 : 110}
            strokeDasharray={precisionDash(region.coverage)}
            pointerEvents="none"
          />
        );
      })}
    </G>
  );
}

export function ThreatOverlayLegend({
  zh,
  mode,
  regionCount,
  emptyState,
  viewerSideKey,
}: {
  zh: boolean;
  mode: ThreatOverlayMode;
  regionCount: number;
  emptyState: string | null;
  viewerSideKey: string | null;
}) {
  const sideRelation = (sideKey: string) => {
    if (!viewerSideKey) return "";
    if (viewerSideKey === sideKey) return zh ? "我方" : "friendly";
    return zh ? "敌方" : "enemy";
  };
  const p1Relation = sideRelation("player1");
  const p2Relation = sideRelation("player2");
  return (
    <View style={styles.legendCard} accessibilityLiveRegion="polite">
      <Text style={styles.legendTitle}>
        {zh ? "威胁图层" : "Threat layer"}: {threatOverlayModeLabel(mode, zh)}
        {" · "}
        {zh ? `${regionCount} 个投影区域` : `${regionCount} projected regions`}
      </Text>
      <View style={styles.legendRow}>
        <Text style={styles.legendItem}>
          <Text style={[styles.swatch, { color: SIDE_STROKE.player1 }]}>●</Text>
          {` P1${p1Relation ? ` ${p1Relation}` : ""}`}
        </Text>
        <Text style={styles.legendItem}>
          <Text style={[styles.swatch, { color: SIDE_STROKE.player2 }]}>●</Text>
          {` P2${p2Relation ? ` ${p2Relation}` : ""}`}
        </Text>
        <Text style={styles.legendItem}>
          <Text style={[styles.swatch, { color: CHARGE_STROKE }]}>●</Text>
          {zh ? " 冲锋包络" : " charge envelope"}
        </Text>
      </View>
      <View style={styles.legendRow}>
        <Text style={styles.legendItem}>{zh ? "实线=精确" : "solid = exact"}</Text>
        <Text style={styles.legendItem}>{zh ? "虚线=咨询性界" : "dashed = advisory bound"}</Text>
        <Text style={styles.legendItem}>{zh ? "点线=未知" : "dotted = unknown"}</Text>
      </View>
      <Text style={styles.legendNote}>
        {zh
          ? "填充越亮 = 越多投影来源重叠（仅为显示计数）。当前投影只发布咨询性界；精确合法性仍以权威 Preview 为准。"
          : "Brighter fill = more projected sources overlap (display count only). The current projection publishes advisory bounds only; exact legality remains authoritative Preview."}
      </Text>
      {emptyState ? (
        <Text style={styles.legendEmpty} accessibilityRole="alert">
          {emptyState}
        </Text>
      ) : null}
      <Text style={styles.legendBoundary}>
        {zh
          ? "威胁图层只读，不掷骰、不测量像素、不证明动作合法或可应用。"
          : "Threat layers are read-only: no dice, no pixel measurement, and no proof that an action is legal or applied."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legendCard: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#07111f",
    borderWidth: 1,
    borderColor: "#164e63",
    gap: 6,
  },
  legendTitle: { color: "#e0f2fe", fontSize: 11, fontWeight: "900" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { color: "#cbd5e1", fontSize: 10, fontWeight: "700" },
  swatch: { fontSize: 10 },
  legendNote: { color: "#94a3b8", fontSize: 10, lineHeight: 15 },
  legendEmpty: { color: "#fbbf24", fontSize: 10, lineHeight: 15, fontWeight: "800" },
  legendBoundary: { color: "#64748b", fontSize: 10, lineHeight: 15 },
});
