#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
} from "../packages/source-data/official-development-tranche-source-lock-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = path.join(
  ROOT,
  "build/ticket-11-rule-atoms-v1/official-development-tranche-source-lock-report.json",
);
const acceptance = [];
const artifacts = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: ROOT });

assert.equal(artifacts.snapshot.snapshotHash, OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH);
acceptance.push("one_time_official_source_capture_is_content_locked_and_offline_replayable");
assert.equal(artifacts.dataset.datasetHash, OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH);
assert.deepEqual(artifacts.audit.recordCounts, {
  total: 271,
  officialProduct: 83,
  officialRuleProseReviewRequired: 15,
  communityDisplayOnly: 173,
});
acceptance.push("normalized_snapshot_and_dataset_denominators_are_exact");
assert.deepEqual(artifacts.audit.sameVersionDrift, {
  classification: "display_only_additions",
  addedRecordKeys: [
    "faction_cards:jvkHAaXJGa91Sbt751F1",
    "faction_cards:m2Ra5mNs2NCeBpQSgIlu",
  ],
  officialProductChanged: false,
  officialRuleProseChanged: false,
  canAffectRules: false,
});
acceptance.push("same_version_drift_is_explicitly_isolated_to_two_community_display_records");
assert.equal(artifacts.lock.policy.automaticRefreshAllowed, false);
assert.equal(artifacts.lock.policy.networkVerificationDuringSliceDevelopmentAllowed, false);
assert.equal(artifacts.lock.policy.repositoryFallbackAllowed, false);
assert.equal(artifacts.audit.trainingTruth, false);
acceptance.push("development_uses_the_pinned_lock_without_refresh_fallback_or_training_promotion");

const report = {
  schema: "starcraft_tmg_official_development_tranche_source_lock_verification_report_v1",
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  sourceLock: artifacts.audit,
  status: "passed_offline_source_lock_and_display_only_drift_isolation",
  rulesEligible: false,
  productionRoomEligible: false,
  trainingTruth: false,
};
await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
