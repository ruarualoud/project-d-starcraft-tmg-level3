import React from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let clientContext: any;

vi.mock("react-native-web", () => ({
  Platform: { OS: "web" },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  Share: { share: vi.fn() },
  StyleSheet: { create: (value: unknown) => value },
  Text: "Text",
  View: "View",
}));

vi.mock("expo-clipboard", () => ({ setStringAsync: vi.fn() }));
vi.mock("@/components/screen-container", () => ({
  ScreenContainer: ({ children }: { children: React.ReactNode }) => (
    React.createElement("View", null, children)
  ),
}));
vi.mock("@/components/battlefield/authoritative-battle-workspace", () => ({
  AuthoritativeBattleWorkspace: () => React.createElement("View"),
}));
vi.mock("@/components/character/tactical-adjutant-panel", () => ({
  TacticalAdjutantPanel: () => React.createElement("View"),
}));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ lang: "zh" }),
}));
vi.mock("@/lib/level3/client-domain-provider", () => ({
  useLevel3ClientDomain: () => clientContext,
}));

import MatchScreen from "../../../app/(tabs)/match";

function allText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(allText).join(" ");
  if (!value || typeof value !== "object") return "";
  return Object.values(value as Record<string, unknown>).map(allText).join(" ");
}

function buttonByText(renderer: ReactTestRenderer, text: string) {
  const instanceText = (node: any): string => node.children.map((child: any) => (
    typeof child === "string" ? child : instanceText(child)
  )).join(" ");
  return renderer.root.findAll((node) => (
    (node.type as unknown) === "Pressable" && instanceText(node).includes(text)
  ))[0];
}

beforeEach(() => {
  clientContext = {
    view: {
      phase: "ready",
      surface: "expo_web",
      clientRevision: 5,
      viewHash: "a".repeat(64),
      roomProjection: {
        room: { roomRevision: 1, stateRevision: 0, seatRecoveryRevision: 1 },
        viewer: { capabilities: ["read_room"] },
        control: {},
      },
      control: { status: "unclaimed" },
      recovery: {},
      historicalRulesStatus: {
        status: "available",
        artifactHash: "b".repeat(64),
      },
      historicalRulesDisplay: {
        content: "# Frozen room rules\n\nExact MatchBinding display artifact.",
      },
    },
    connection: {
      roomId: "room-134",
      visible: true,
      online: true,
      readOnly: false,
      status: "connected",
      canRequestAuthoritativeIntent: true,
      outcomeUncertain: false,
      rejectionCode: null,
    },
    roomAccess: { status: "public_observer", accessKind: null, ignoredClaims: [], errorCode: null },
    dispatch: vi.fn(async () => ({ ok: true })),
    refresh: vi.fn(async () => ({ ok: true })),
  };
});

describe("Slice 134 room-pinned historical rules display", () => {
  it("shows the exact read-only artifact and dispatches only the explicit read intent", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<MatchScreen />);
    });
    const text = allText(renderer!.toJSON());
    expect(text).toContain("房间冻结规则展示");
    expect(text).toContain("Exact MatchBinding display artifact.");
    expect(text).toContain("silent compatibility false");
    await act(async () => {
      await buttonByText(renderer!, "读取冻结规则").props.onPress();
    });
    expect(clientContext.dispatch).toHaveBeenCalledWith({ type: "read_historical_rules" });
    await act(async () => renderer!.unmount());
  });

  it("renders dependency quarantine without substituting another rules body", async () => {
    clientContext.view.historicalRulesDisplay = null;
    clientContext.view.historicalRulesStatus = {
      status: "quarantined",
      artifactHash: "c".repeat(64),
      rejectionCode: "HISTORICAL_RULES_DISPLAY_MISSING",
    };
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<MatchScreen />);
    });
    const text = allText(renderer!.toJSON());
    expect(text).toMatch(/status:\s+quarantined/u);
    expect(text).not.toContain("Exact MatchBinding display artifact.");
    await act(async () => renderer!.unmount());
  });
});
