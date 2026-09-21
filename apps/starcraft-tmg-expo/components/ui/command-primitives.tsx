import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

/**
 * Shared StarCraft command-interface primitives. Presentation-only building
 * blocks reused across Database, Army, Tools, Battle Room and Settings so the
 * surfaces read as one coherent command network. They never hold gameplay
 * truth; all values rendered through them come from existing data sources.
 */

const TOKENS = {
  background: "#020617",
  panel: "#0f172a",
  panelRaised: "#07111f",
  border: "#334155",
  borderAccent: "#164e63",
  cyan: "#38bdf8",
  cyanSoft: "#67e8f9",
  text: "#e5e7eb",
  textBright: "#f8fafc",
  muted: "#64748b",
  mutedLight: "#94a3b8",
  warning: "#f59e0b",
  danger: "#ef4444",
  success: "#22c55e",
};

export const commandTokens = TOKENS;

export function CommandHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export interface PillTabItem<Key extends string> {
  key: Key;
  label: string;
  count?: number;
  disabled?: boolean;
  accentColor?: string;
}

export function PillTabBar<Key extends string>({
  items,
  active,
  onSelect,
  scrollable = false,
  accessibilityLabel,
}: {
  items: PillTabItem<Key>[];
  active: Key;
  onSelect: (key: Key) => void;
  scrollable?: boolean;
  accessibilityLabel?: string;
}) {
  const row = (
    <View style={[styles.pillRow, !scrollable && styles.pillRowFill]}>
      {items.map((item) => {
        const selected = item.key === active;
        const accent = item.accentColor || TOKENS.cyan;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: item.disabled === true }}
            accessibilityLabel={`${item.label}${item.count !== undefined ? ` ${item.count}` : ""}`}
            disabled={item.disabled === true}
            onPress={() => onSelect(item.key)}
            style={({ pressed }) => [
              styles.pill,
              !scrollable && styles.pillFill,
              selected && { borderColor: accent, backgroundColor: "#164e63" },
              item.disabled === true && styles.pillDisabled,
              pressed && !item.disabled && { opacity: 0.72 },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.pillText, selected && { color: TOKENS.cyanSoft }]}
            >
              {item.count !== undefined ? `${item.label} (${item.count})` : item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  if (!scrollable) {
    return (
      <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
        {row}
      </View>
    );
  }
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {row}
      </ScrollView>
    </View>
  );
}

export function PanelCard({
  title,
  right,
  children,
  accentColor,
  style,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.panelCard, style]}>
      {title ? (
        <View style={styles.panelTitleRow}>
          <Text style={[styles.panelTitle, accentColor ? { color: accentColor } : null]}>
            {title}
          </Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function StatusPill({
  label,
  color = TOKENS.cyan,
  textStyle,
}: {
  label: string;
  color?: string;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.statusPill, { borderColor: color }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusPillText, { color }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Progressive-disclosure section: header row with count, chevron and an
 * always-visible summary line so collapsed state stays informative.
 */
export function SectionDisclosure({
  title,
  count,
  summary,
  open,
  onToggle,
  accentColor = TOKENS.cyan,
  children,
}: {
  title: string;
  count?: number;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${count !== undefined ? ` ${count}` : ""}`}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.disclosureHeader,
          { borderLeftColor: accentColor },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={styles.disclosureHeaderCopy}>
          <Text style={[styles.disclosureTitle, { color: accentColor }]}>
            {title}{count !== undefined ? ` (${count})` : ""}
          </Text>
          {!open && summary ? (
            <Text numberOfLines={1} style={styles.disclosureSummary}>{summary}</Text>
          ) : null}
        </View>
        <Text style={styles.disclosureChevron}>{open ? "▲" : "▼"}</Text>
      </Pressable>
      {open ? <View style={styles.disclosureBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: TOKENS.cyan,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: TOKENS.text, marginTop: 2 },
  headerSub: { fontSize: 12, color: TOKENS.muted, marginTop: 2, lineHeight: 17 },
  headerRight: { alignItems: "flex-end", justifyContent: "center" },

  pillRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  pillRowFill: { paddingHorizontal: 12 },
  pill: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.border,
    backgroundColor: TOKENS.panel,
  },
  pillFill: { flex: 1 },
  pillDisabled: { opacity: 0.4 },
  pillText: { fontSize: 12, fontWeight: "800", color: TOKENS.mutedLight },

  panelCard: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: TOKENS.panel,
    borderWidth: 1,
    borderColor: TOKENS.border,
    gap: 8,
  },
  panelTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  panelTitle: {
    flex: 1,
    color: TOKENS.cyan,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  statusPill: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 999 },
  statusPillText: { flexShrink: 1, fontSize: 11, fontWeight: "800" },

  disclosure: { marginBottom: 6 },
  disclosureHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    backgroundColor: TOKENS.panel,
    borderWidth: 1,
    borderColor: TOKENS.border,
  },
  disclosureHeaderCopy: { flex: 1, minWidth: 0 },
  disclosureTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  disclosureSummary: { fontSize: 11, color: TOKENS.muted, marginTop: 2 },
  disclosureChevron: { color: TOKENS.muted, fontSize: 11 },
  disclosureBody: { paddingTop: 8 },
});
