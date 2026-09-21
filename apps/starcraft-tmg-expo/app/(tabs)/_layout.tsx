import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Platform, useWindowDimensions } from "react-native";
import { useI18n } from "@/lib/i18n";

/**
 * Top-level command-network navigation.
 *
 * Presentation-only responsiveness:
 * - native App keeps the bottom tab bar with safe-area padding and labels
 *   below icons (touch-first);
 * - wide Web (>=720dp) keeps the top command bar with beside-icon labels;
 * - narrow Web collapses to a compact icon-only top bar so all five journeys
 *   (Database, Army, Tools, Battle Room, Settings) stay reachable without
 *   label collision.
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useI18n();
  const web = Platform.OS === "web";
  const wideWeb = web && width >= 720;
  const bottomPadding = web ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#38bdf8",
        tabBarInactiveTintColor: "#8aa0b5",
        tabBarPosition: web ? "top" : "bottom",
        tabBarLabelPosition: wideWeb ? "beside-icon" : "below-icon",
        tabBarShowLabel: web ? wideWeb : true,
        headerShown: wideWeb,
        headerTitle: "STARCRAFT TMG  //  COMMAND NETWORK",
        headerTitleAlign: "left",
        headerStyle: {
          height: 54,
          backgroundColor: "#050b11",
          borderBottomColor: "#1d526a",
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: "#dff7ff",
          fontFamily: "monospace",
          fontSize: 15,
          fontWeight: "900",
          letterSpacing: 1.2,
        },
        tabBarStyle: {
          paddingTop: web ? 0 : 8,
          paddingBottom: web ? 0 : bottomPadding,
          height: web ? 58 : tabBarHeight,
          backgroundColor: "#09131d",
          borderTopColor: web ? "#172838" : "#334155",
          borderTopWidth: 1,
          borderBottomColor: web ? "#286078" : "transparent",
          borderBottomWidth: web ? 1 : 0,
        },
        tabBarItemStyle: wideWeb ? {
          maxWidth: 210,
          borderRightColor: "#172d3d",
          borderRightWidth: 1,
        } : undefined,
        tabBarLabelStyle: {
          fontSize: wideWeb ? 12 : 10,
          fontWeight: "800",
          letterSpacing: wideWeb ? 0.5 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabDatabase'),
          tabBarAccessibilityLabel: t('tabDatabase'),
          tabBarIcon: ({ color }) => <MaterialIcons name="menu-book" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="army"
        options={{
          title: t('tabArmy'),
          tabBarAccessibilityLabel: t('tabArmy'),
          tabBarIcon: ({ color }) => <MaterialIcons name="groups" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: t('tabTools'),
          tabBarAccessibilityLabel: t('tabTools'),
          tabBarIcon: ({ color }) => <MaterialIcons name="calculate" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="match"
        options={{
          title: t('tabMatch'),
          tabBarAccessibilityLabel: t('tabMatch'),
          tabBarIcon: ({ color }) => <MaterialIcons name="sports-esports" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabSettings'),
          tabBarAccessibilityLabel: t('tabSettings'),
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
