import { Platform, useWindowDimensions } from "react-native";

export type LayoutSizeClass = "phone" | "tablet" | "desktop";

export interface ResponsiveLayout {
  /** Raw window width in dp. */
  width: number;
  /** Raw window height in dp. */
  height: number;
  /** True when running on the Web platform. */
  isWeb: boolean;
  /** Width-based size class: <600 phone, <980 tablet, otherwise desktop. */
  sizeClass: LayoutSizeClass;
  /** Phone-class layout: bottom/tab-first navigation, single-column panels. */
  isPhone: boolean;
  /** Desktop-class layout: side-by-side panes and top navigation are allowed. */
  isDesktop: boolean;
  /** Wide-enough Web viewport for beside-icon top tab labels. */
  isWideWeb: boolean;
  /** Readable single-column content width for database/settings-style pages. */
  contentMaxWidth: number;
}

/**
 * Shared responsive breakpoints for the StarCraft command interface.
 * Presentation-only: breakpoints never gate gameplay capability, only layout.
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const sizeClass: LayoutSizeClass = width < 600 ? "phone" : width < 980 ? "tablet" : "desktop";
  return {
    width,
    height,
    isWeb,
    sizeClass,
    isPhone: sizeClass === "phone",
    isDesktop: sizeClass === "desktop",
    isWideWeb: isWeb && width >= 720,
    contentMaxWidth: sizeClass === "desktop" ? 860 : width,
  };
}
