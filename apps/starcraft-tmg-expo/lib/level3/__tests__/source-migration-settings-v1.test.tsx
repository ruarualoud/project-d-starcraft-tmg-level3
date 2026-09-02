import React from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsScreen from "../../../app/(tabs)/settings";

let dataContext: any;
let clientContext: any;
let languageContext: any;
const { alert } = vi.hoisted(() => ({ alert: vi.fn() }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native-web", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  TextInput: "TextInput",
  Alert: { alert },
  StyleSheet: { create: (value: unknown) => value },
}));

vi.mock("@/components/screen-container", () => ({
  ScreenContainer: ({ children }: { children: React.ReactNode }) => (
    React.createElement("View", null, children)
  ),
}));

vi.mock("@/components/character/character-persona-settings-panel", () => ({
  CharacterPersonaSettingsPanel: () => React.createElement("View"),
}));

vi.mock("@/lib/data-context", () => ({
  useData: () => dataContext,
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => languageContext,
}));

vi.mock("@/lib/level3/client-domain-provider", () => ({
  useLevel3ClientDomain: () => clientContext,
}));

function allText(value: unknown): string {
  if (typeof value === "string") return value;
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

function sourceProjection() {
  return {
    source: {
      sourceSnapshotHash: "8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105",
      officialDatasetHash: "b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067",
      localizationDatasetHash: "299b075b83ccd7f4147ed9f1119ae2b54eed58446ea7385399af4373d4abd42c",
      dataVersions: { unitsVersion: "71", cardsVersion: "69", rulesVersion: "48" },
    },
    coverage: { records: 271, fields: 1440 },
    freshness: {
      completeLatestOfficialRulesCorpus: false,
      officialFaqV1IncludedInFrozenLock: false,
      requiresExplicitSourceRefreshAndReview: true,
    },
    rights: { publicReleaseGatePassed: false },
  };
}

beforeEach(() => {
  alert.mockReset();
  dataContext = {
    dataVersion: 71,
    dataClassification: {
      classification: "official_source_metadata_projection_rights_pending",
    },
    units: [],
    migration: {
      phase: "not_scanned",
      scan: null,
      manifest: null,
      errorCode: null,
    },
    scanLegacyData: vi.fn(async () => null),
    confirmLegacyMigration: vi.fn(async () => null),
  };
  clientContext = {
    view: {
      sourceLocalization: sourceProjection(),
      sourceLocalizationStatus: {
        status: "network_fresh",
        roomBinding: "not_bound",
        legacyFallbackUsed: false,
      },
    },
    dispatch: vi.fn(async () => ({ ok: true })),
  };
  languageContext = {
    lang: "zh",
    setLang: vi.fn(),
    t: (key: string) => key,
    unitTranslations: {},
    setUnitTranslations: vi.fn(),
    resetUnitTranslations: vi.fn(),
  };
});

describe("Slice 134 source and compatibility settings", () => {
  it("renders only provenance metadata and an explicit refresh action", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<SettingsScreen />);
    });
    const text = allText(renderer!.toJSON());
    expect(text).toContain("官方资料接入");
    expect(text).toContain("v71");
    expect(text).toContain("271 / 1440");
    expect(text).toContain("pending / metadata only");
    expect(text).toContain("no — FAQ V1.0 pending refresh/review");
    expect(text).toContain("disabled");
    expect(text).not.toContain("canonical source body");
    await act(async () => {
      buttonByText(renderer!, "刷新来源元数据").props.onPress();
    });
    expect(clientContext.dispatch).toHaveBeenCalledWith({
      type: "refresh_source_localization",
    });
    await act(async () => renderer!.unmount());
  });

  it("does not scan legacy keys until the user presses the scan action", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<SettingsScreen />);
    });
    expect(dataContext.scanLegacyData).not.toHaveBeenCalled();
    await act(async () => {
      await buttonByText(renderer!, "扫描旧数据").props.onPress();
    });
    expect(dataContext.scanLegacyData).toHaveBeenCalledTimes(1);
    await act(async () => renderer!.unmount());
  });

  it("requires a second explicit confirmation before sanitized import", async () => {
    dataContext.migration = {
      phase: "classified",
      scan: {
        scanHash: "a".repeat(64),
        presentCount: 5,
        eligibleCount: 3,
        quarantinedCount: 2,
        entries: [],
      },
      manifest: null,
      errorCode: null,
    };
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<SettingsScreen />);
    });
    await act(async () => {
      buttonByText(renderer!, "确认净化导入").props.onPress();
    });
    expect(dataContext.confirmLegacyMigration).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
    expect(allText(renderer!.toJSON())).toContain("内容寻址的兼容世代");
    await act(async () => {
      await buttonByText(renderer!, "执行净化导入").props.onPress();
    });
    expect(dataContext.confirmLegacyMigration).toHaveBeenCalledTimes(1);
    expect(dataContext.confirmLegacyMigration).toHaveBeenCalledWith("a".repeat(64));
    await act(async () => renderer!.unmount());
  });

  it("keeps migration confirmation disabled when verified source metadata is absent", async () => {
    clientContext.view.sourceLocalization = null;
    dataContext.dataVersion = 0;
    dataContext.migration = {
      phase: "classified",
      scan: {
        scanHash: "b".repeat(64),
        presentCount: 1,
        eligibleCount: 1,
        quarantinedCount: 0,
        entries: [],
      },
      manifest: null,
      errorCode: null,
    };
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<SettingsScreen />);
    });
    const confirm = buttonByText(renderer!, "确认净化导入");
    expect(confirm.props.disabled).toBe(true);
    expect(allText(renderer!.toJSON())).toContain("尚未取得可验证的来源投影");
    expect(allText(renderer!.toJSON())).toContain("未验证");
    await act(async () => renderer!.unmount());
  });

  it("renders sanitized historical matches as identity-free read-only summaries", async () => {
    dataContext.migration = {
      phase: "sanitized_imported",
      scan: null,
      manifest: {
        counts: {
          armyDraftsQuarantined: 1,
          historyRecordsImportedReadOnly: 1,
        },
        manifestHash: "c".repeat(64),
      },
      history: {
        records: [{
          summaryHash: "d".repeat(64),
          occurredAtMs: Date.parse("2026-08-01T00:00:00.000Z"),
          player1TotalScore: 9,
          player2TotalScore: 7,
          roundCount: 3,
          winnerClass: "player1",
        }],
      },
      errorCode: null,
    };
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(<SettingsScreen />);
    });
    const text = allText(renderer!.toJSON());
    expect(text).toMatch(/旧对局只读摘要\s+1/u);
    expect(text).toContain("2026-08-01");
    expect(text).toContain("9 – 7");
    expect(text).toContain("room restore false · replay false · MuZero false");
    expect(text).not.toContain("Alice");
    expect(text).not.toContain("private note");
    await act(async () => renderer!.unmount());
  });
});
