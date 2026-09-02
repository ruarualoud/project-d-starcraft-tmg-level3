import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

import { DataProvider } from "@/lib/data-context";
import { I18nProvider } from "@/lib/i18n";
import { Level3ClientDomainProvider } from "@/lib/level3/client-domain-provider";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  // Ensure minimum padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    if (!initialWindowMetrics) return undefined;
    return {
      ...initialWindowMetrics,
      insets: {
        ...initialWindowMetrics.insets,
        top: Math.max(initialWindowMetrics.insets.top, 16),
        bottom: Math.max(initialWindowMetrics.insets.bottom, 12),
      },
    };
  }, []);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nProvider>
        <Level3ClientDomainProvider>
          <DataProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
          </DataProvider>
        </Level3ClientDomainProvider>
      </I18nProvider>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
