import React from "react";
import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  loadManifest: vi.fn(),
  loadHistory: vi.fn(),
  scan: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("@/lib/level3/client-domain-provider", () => ({
  useLevel3ClientDomain: () => ({
    view: {
      sourceLocalization: {
        projectionHash: "a".repeat(64),
        source: { dataVersions: { unitsVersion: "71" } },
      },
    },
  }),
}));

vi.mock("../../../../../packages/client-domain/device-data-migration-v1.mjs", () => ({
  loadStarcraftTmgDeviceMigrationManifestV1: mocks.loadManifest,
  readStarcraftTmgReadOnlyLegacyHistoryV1: mocks.loadHistory,
  scanLegacyStarcraftTmgDeviceDataV1: mocks.scan,
  confirmLegacyStarcraftTmgDeviceDataMigrationV1: mocks.confirm,
}));

import { DataProvider, useData } from "@/lib/data-context";

let latest: ReturnType<typeof useData> | null = null;

function Probe() {
  latest = useData();
  return React.createElement("View", null, latest.migration.phase);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  latest = null;
  mocks.loadManifest.mockReset().mockResolvedValue(null);
  mocks.loadHistory.mockReset().mockResolvedValue(null);
  mocks.scan.mockReset();
  mocks.confirm.mockReset();
});

describe("Slice 134 device migration operation ordering", () => {
  it("surfaces manifest storage read failures without an unhandled reload rejection", async () => {
    mocks.loadManifest.mockRejectedValueOnce(Object.assign(
      new Error("storage unavailable"),
      { code: "DEVICE_MIGRATION_STORAGE_READ_FAILED" },
    ));

    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <DataProvider>
          <Probe />
        </DataProvider>,
      );
    });

    expect(latest?.migration.phase).toBe("failed");
    expect(latest?.migration.errorCode).toBe("DEVICE_MIGRATION_STORAGE_READ_FAILED");
    expect(latest?.isLoading).toBe(false);

    await act(async () => {
      await latest!.reloadLocal();
    });
    expect(latest?.migration.phase).toBe("not_scanned");
    expect(latest?.migration.errorCode).toBeNull();
    expect(latest?.isLoading).toBe(false);
    await act(async () => renderer!.unmount());
  });

  it("serializes scan and confirmation and rejects stale or duplicate operations", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <DataProvider>
          <Probe />
        </DataProvider>,
      );
    });
    expect(latest?.migration.phase).toBe("not_scanned");

    const scan = {
      scanHash: "b".repeat(64),
      presentCount: 1,
      eligibleCount: 1,
      quarantinedCount: 0,
      entries: [],
    } as any;
    const scanDeferred = deferred<any>();
    mocks.scan.mockReturnValueOnce(scanDeferred.promise);
    let firstScan!: Promise<any>;
    await act(async () => {
      firstScan = latest!.scanLegacyData();
      await Promise.resolve();
    });
    expect(latest?.migration.phase).toBe("scanning");
    expect(await latest!.scanLegacyData()).toBeNull();
    expect(mocks.scan).toHaveBeenCalledTimes(1);
    await act(async () => {
      scanDeferred.resolve(scan);
      await firstScan;
    });
    expect(latest?.migration.phase).toBe("classified");

    let mismatchedConfirmation: any;
    await act(async () => {
      mismatchedConfirmation = await latest!.confirmLegacyMigration("c".repeat(64));
    });
    expect(mismatchedConfirmation).toBeNull();
    expect(latest?.migration.errorCode).toBe("DEVICE_MIGRATION_SCAN_CHANGED");
    expect(mocks.confirm).not.toHaveBeenCalled();

    mocks.scan.mockResolvedValueOnce(scan);
    await act(async () => {
      await latest!.scanLegacyData();
    });
    const manifest = {
      manifestHash: "d".repeat(64),
      counts: {
        armyDraftsQuarantined: 0,
        historyRecordsImportedReadOnly: 0,
      },
    } as any;
    const confirmDeferred = deferred<any>();
    mocks.confirm.mockReturnValueOnce(confirmDeferred.promise);
    let confirmation!: Promise<any>;
    await act(async () => {
      confirmation = latest!.confirmLegacyMigration(scan.scanHash);
      await Promise.resolve();
    });
    expect(latest?.migration.phase).toBe("importing");
    expect(await latest!.scanLegacyData()).toBeNull();
    expect(mocks.scan).toHaveBeenCalledTimes(2);
    await act(async () => {
      confirmDeferred.resolve(manifest);
      await confirmation;
    });
    expect(latest?.migration.phase).toBe("sanitized_imported");
    expect(latest?.migration.manifest?.manifestHash).toBe(manifest.manifestHash);
    await act(async () => renderer!.unmount());
  });
});
