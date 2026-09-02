import type { ExpoConfig } from "expo/config";

const bundleId = "app.projectd.starcrafttmg";
const scheme = "projectd-starcraft-tmg";
const production = process.env.NODE_ENV === "production";

function configuredAppLinkOrigin() {
  const raw = process.env.EXPO_PUBLIC_STARCRAFT_TMG_WEB_ORIGIN;
  if (!raw) {
    if (production) {
      throw new Error(
        "EXPO_PUBLIC_STARCRAFT_TMG_WEB_ORIGIN is required for a production App Link build",
      );
    }
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("EXPO_PUBLIC_STARCRAFT_TMG_WEB_ORIGIN must be a valid URL");
  }
  if (parsed.protocol !== "https:"
    || parsed.username
    || parsed.password
    || parsed.port
    || ["localhost", "127.0.0.1", "[::1]", "::1"].includes(parsed.hostname.toLowerCase())
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash) {
    throw new Error(
      "EXPO_PUBLIC_STARCRAFT_TMG_WEB_ORIGIN must be a public HTTPS origin without credentials, port, path, query, or fragment",
    );
  }
  return parsed;
}

const appLinkOrigin = configuredAppLinkOrigin();
const appLinkIntent = appLinkOrigin
  ? {
    action: "VIEW" as const,
    autoVerify: true,
    data: [{
      scheme: "https",
      host: appLinkOrigin.hostname,
      pathPrefix: "/room/",
    }],
    category: ["BROWSABLE" as const, "DEFAULT" as const],
  }
  : null;
const developmentSchemeIntent = !production
  ? {
    action: "VIEW" as const,
    autoVerify: false,
    data: [{
      scheme,
      host: "room",
      pathPrefix: "/",
    }],
    category: ["BROWSABLE" as const, "DEFAULT" as const],
  }
  : null;

const config: ExpoConfig = {
  name: "Project D · 星际争霸 TMG",
  slug: "project-d-starcraft-tmg",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  ...(!production ? { scheme } : {}),
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    ...(appLinkOrigin
      ? { associatedDomains: [`applinks:${appLinkOrigin.hostname}`] }
      : {}),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#0a1628",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: bundleId,
    intentFilters: [appLinkIntent, developmentSchemeIntent].filter(
      (intent): intent is NonNullable<typeof intent> => intent !== null,
    ),
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#0a1628",
        dark: {
          backgroundColor: "#0a1628",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
