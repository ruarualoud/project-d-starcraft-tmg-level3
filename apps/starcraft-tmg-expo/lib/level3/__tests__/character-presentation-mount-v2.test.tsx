import React from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Server-only Ticket 13 sources create a valid fixture; the product component
// itself never imports this Node-bound module.
import { createStarcraftTmgClientCharacterPresentationRuntimeV2 } from
  "../../../../../packages/character-agent/client-character-presentation-runtime-v2.mjs";
import { createStarcraftTmgCharacterAssetGrantAuthorityV1 } from
  "../../../../../packages/character-agent/character-asset-grant-v1.mjs";
import { CharacterPersonaSettingsPanel } from
  "../../../components/character/character-persona-settings-panel";
import { TacticalAdjutantPanel } from
  "../../../components/character/tactical-adjutant-panel";

let context: any;
let projectionSequence = 0;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native-web", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Image: "Image",
  Platform: { OS: "web" },
  StyleSheet: {
    absoluteFillObject: {},
    create: (value: unknown) => value,
  },
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ lang: "zh" }),
}));

vi.mock("@/lib/level3/client-domain-provider", () => ({
  useLevel3ClientDomain: () => context,
}));

vi.mock("@/lib/level3/use-reduced-motion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

function allText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(allText).join(" ");
  if (!value || typeof value !== "object") return "";
  return Object.values(value as Record<string, unknown>).map(allText).join(" ");
}

function developmentProjection() {
  const authority = createStarcraftTmgCharacterAssetGrantAuthorityV1({
    secret: "slice-133-component-test-secret-32-bytes-minimum",
    keyId: "slice-133-test",
    now: () => "2026-09-03T09:30:00.000Z",
    createNonce: () => `slice-133-component-nonce-${projectionSequence += 1}`,
  });
  const runtime = createStarcraftTmgClientCharacterPresentationRuntimeV2({
    releaseChannel: "development_internal",
    issueAssetDelivery: (fields: Record<string, unknown>) => authority.issue({
      ...fields,
      roomId: "component-room",
      seatGrantId: "component-grant",
      seatKey: "player1",
      principalScopeHash: "a".repeat(64),
    }),
  });
  const state = runtime.createInitialState({
    updatedAt: "2026-09-03T09:30:00.000Z",
  });
  return runtime.project(state, {
    principalScopeHash: "a".repeat(64),
    authenticated: true,
  });
}

function publicProjection() {
  const runtime = createStarcraftTmgClientCharacterPresentationRuntimeV2({
    releaseChannel: "public",
  });
  return runtime.project(null, {
    principalScopeHash: "b".repeat(64),
    authenticated: false,
  });
}

beforeEach(() => {
  context = {
    view: {
      characterPresentation: developmentProjection(),
      characterOfflineSnapshot: null,
      characterStatus: { rejectionCode: null },
    },
    connection: {
      online: true,
      visible: true,
      canRequestAuthoritativeIntent: true,
    },
    dispatch: vi.fn(async () => ({ ok: true })),
    refresh: vi.fn(async () => ({ ok: true })),
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Slice 133 tracked Expo character mount", () => {
  it("actually renders the selected dynamic Adjutant panel as one reduced-motion frame", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<TacticalAdjutantPanel />);
    });
    const text = allText(renderer!.toJSON());
    expect(text).toContain("战术通讯");
    expect(text).toContain("Sarah Kerrigan");
    expect(text).toContain("减少动态");
    expect(renderer!.root.findAllByType("Image" as any)).toHaveLength(1);
    await act(async () => renderer!.unmount());
  });

  it("actually renders six named options plus two identity-free locked slots at the default ceiling", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<CharacterPersonaSettingsPanel />);
    });
    const text = allText(renderer!.toJSON());
    expect(text).toContain("战术副官时代");
    expect(renderer!.root.findAll((node) => (
      node.props.accessibilityLabel === "锁定时代；需要显式剧透许可"
    ))).toHaveLength(2);
    expect(text).not.toContain("Ascended xel'naga epilogue");
    expect(text).not.toContain("Coalition ally before ascension");
    expect(renderer!.root.findAll((node) => node.props.accessibilityRole === "radio")).toHaveLength(6);
    await act(async () => renderer!.unmount());
  });

  it("renders the public fallback without a restricted image or selector", async () => {
    context.view.characterPresentation = publicProjection();
    let adjutant: ReactTestRenderer;
    let settings: ReactTestRenderer;
    await act(async () => {
      adjutant = create(<TacticalAdjutantPanel />);
      settings = create(<CharacterPersonaSettingsPanel />);
    });
    const combined = `${allText(adjutant!.toJSON())} ${allText(settings!.toJSON())}`;
    expect(combined).toContain("Project D Tactical Adjutant");
    expect(combined.toLowerCase()).not.toContain("kerrigan");
    expect(adjutant!.root.findAllByType("Image" as any)).toHaveLength(0);
    expect(settings!.root.findAll((node) => node.props.accessibilityRole === "radio")).toHaveLength(0);
    await act(async () => {
      adjutant!.unmount();
      settings!.unmount();
    });
  });

  it("renders a local static neutral portrait for a sealed cold-offline selection", async () => {
    const projection = developmentProjection();
    const selected = projection.selector.options.find((option: any) => (
      option.kind === "persona" && option.selected
    ));
    context.view.characterPresentation = null;
    context.view.characterOfflineSnapshot = {
      releaseChannel: "development_internal",
      selectedPersona: {
        worldbookId: selected.worldbookId,
        title: selected.title,
        personaState: selected.personaState,
        timeline: selected.timeline,
        neutralFrame: selected.thumbnailFrame,
      },
    };
    context.connection.online = false;
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<TacticalAdjutantPanel />);
    });
    expect(renderer!.root.findAllByProps({ testID: "static-neutral-adjutant-portrait" })).toHaveLength(1);
    expect(renderer!.root.findAllByType("Image" as any)).toHaveLength(0);
    expect(allText(renderer!.toJSON())).toContain("离线只读");
    await act(async () => renderer!.unmount());
  });

  it("refreshes a failed later frame once and keeps the recovery latch until that frame loads", async () => {
    vi.useFakeTimers();
    vi.mocked(context.refresh).mockResolvedValue({ ok: true });
    // Override the default reduced-motion mock for this focused animation trace.
    const reducedMotionModule = await import("@/lib/level3/use-reduced-motion");
    vi.spyOn(reducedMotionModule, "useReducedMotion").mockReturnValue(false);
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<TacticalAdjutantPanel />);
    });
    let image = renderer!.root.findByType("Image" as any);
    await act(async () => {
      image.props.onLoad();
      vi.runOnlyPendingTimers();
    });
    image = renderer!.root.findByType("Image" as any);
    const failedLaterFrameUri = image.props.source.uri;
    const failedLaterFramePath = failedLaterFrameUri.split("?")[0];
    await act(async () => image.props.onError());
    expect(context.refresh).toHaveBeenCalledTimes(1);

    context.view.characterPresentation = developmentProjection();
    await act(async () => renderer!.update(<TacticalAdjutantPanel />));
    image = renderer!.root.findByType("Image" as any);
    expect(image.props.source.uri.split("?")[0]).not.toBe(failedLaterFramePath);
    await act(async () => {
      image.props.onLoad();
      vi.runOnlyPendingTimers();
    });
    image = renderer!.root.findByType("Image" as any);
    expect(image.props.source.uri.split("?")[0]).toBe(failedLaterFramePath);
    await act(async () => image.props.onError());
    expect(context.refresh).toHaveBeenCalledTimes(1);
    await act(async () => renderer!.unmount());
  });
});
