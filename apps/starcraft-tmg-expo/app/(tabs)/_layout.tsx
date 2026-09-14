import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/lib/i18n";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const web = Platform.OS === "web";
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#38bdf8",
        tabBarInactiveTintColor: "#8aa0b5",
        tabBarPosition: web ? "top" : "bottom",
        tabBarLabelPosition: web ? "beside-icon" : "below-icon",
        headerShown: web,
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
        tabBarItemStyle: web ? {
          maxWidth: 210,
          borderRightColor: "#172d3d",
          borderRightWidth: 1,
        } : undefined,
        tabBarLabelStyle: {
          fontSize: web ? 12 : 10,
          fontWeight: "800",
          letterSpacing: web ? 0.5 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabDatabase'),
          tabBarIcon: ({ color }) => <MaterialIcons name="menu-book" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="army"
        options={{
          title: t('tabArmy'),
          tabBarIcon: ({ color }) => <MaterialIcons name="build" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: t('tabTools'),
          tabBarIcon: ({ color }) => <MaterialIcons name="casino" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="match"
        options={{
          title: t('tabMatch'),
          tabBarIcon: ({ color }) => <MaterialIcons name="sports-esports" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabSettings'),
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
