import { useState } from "react";
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

import { TacticalAdjutantPanel } from "./tactical-adjutant-panel";

/**
 * Floating companion window chrome. The collapsed state shrink-wraps a
 * compact right-aligned chip so it can never span the narrow viewport or
 * intercept battlefield controls (Ticket 25/262 narrow defect; K3
 * guardrail §9). The expanded state is a viewport-bounded window. One
 * ScrollView instance wraps both states so toggling never remounts the
 * panel or loses draft state.
 */
export function TacticalAdjutantDock() {
  const { height, width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const dockWidth = Math.min(440, Math.max(300, width - 24));
  const collapsedMaxWidth = Math.min(280, Math.max(180, width - 32));
  const bottom = Platform.OS === "web" ? 18 : 82;
  const maxHeight = Math.max(220, height - bottom - 86);

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <View
        pointerEvents="auto"
        style={[
          styles.dock,
          { bottom },
          expanded
            ? { width: dockWidth, maxWidth: dockWidth, maxHeight }
            : [styles.dockCollapsed, { maxWidth: collapsedMaxWidth }],
        ]}
        testID="tactical-adjutant-floating-dock"
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={expanded}
          showsVerticalScrollIndicator={expanded}
          style={[styles.scroll, expanded && { maxHeight }]}
        >
          <TacticalAdjutantPanel onExpandedChange={setExpanded} variant="floating" />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 30,
  },
  dock: {
    position: "absolute",
    right: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  dockCollapsed: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  scroll: {
    flexGrow: 0,
    borderRadius: 14,
  },
  scrollContent: {
    flexGrow: 0,
  },
});
