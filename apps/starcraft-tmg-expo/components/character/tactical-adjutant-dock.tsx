import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

import { TacticalAdjutantPanel } from "./tactical-adjutant-panel";

export function TacticalAdjutantDock() {
  const { height, width } = useWindowDimensions();
  const dockWidth = Math.min(440, Math.max(300, width - 24));
  const bottom = Platform.OS === "web" ? 18 : 82;
  const maxHeight = Math.max(220, height - bottom - 86);

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <View
        pointerEvents="auto"
        style={[styles.dock, { bottom, maxHeight, width: dockWidth }]}
        testID="tactical-adjutant-floating-dock"
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          style={[styles.scroll, { maxHeight }]}
        >
          <TacticalAdjutantPanel variant="floating" />
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
  scroll: {
    flexGrow: 0,
    borderRadius: 14,
  },
  scrollContent: {
    flexGrow: 0,
  },
});
