#!/usr/bin/env node

// Reproduces the retained S271 bug: an edited four-unit list was incorrectly
// reported as bound to an older five-unit plan. No model or Room is called.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { ROSTER_PLANNING_WORKSPACE_API_PREFIX as API } from
  "../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = process.argv[2];
const retainedDraftPath = process.argv[3];
assert.ok(sourceRoot && retainedDraftPath,
  "usage: node script.mjs SOURCE_ROOT RETAINED_DRAFT_PATH");
const dataDirectory = await mkdtemp(path.join(os.tmpdir(),
  "project-d-s271-stale-roster-"));

try {
  const retained = JSON.parse(await readFile(retainedDraftPath, "utf8"));
  await mkdir(path.join(dataDirectory, "drafts"));
  await writeFile(path.join(dataDirectory, "drafts",
    `${retained.sessionId}.json`), JSON.stringify(retained));
  const product = await createRosterPlanningProductModuleV1({
    root, fixtureRoot: sourceRoot, dataDirectory,
    deliberationFactory: null,
  });
  const service = product.service;
  const old = service.readSession(retained.sessionId);
  assert.equal(old.status, "planned");
  assert.equal(old.plan.rosterCandidate.units.length, 5);
  assert.equal(old.working.candidateInput.units.length, 4);
  assert.equal(old.planEvidenceStale, true);
  await assert.rejects(service.revisePlan(old.sessionId, {
    reasonText: "rebind four-unit list",
    revisedSectionKeys: ["scoreRoute"],
  }), { code: "ROSTER_WORKSPACE_REPLAN_REQUIRED_AFTER_ROSTER_EDIT" });

  const replan = await product.handle({
    method: "POST",
    pathname: `${API}/sessions/${old.sessionId}/lock-and-replan`,
  });
  assert.equal(replan.status, 201);
  const locked = replan.response.session;
  assert.equal(locked.status, "draft");
  assert.equal(locked.planningMode, "locked_roster_teach_v1");
  assert.equal(locked.sourcePlanHash, old.plan.planHash);
  assert.equal(locked.lockedRoster.unitCount, 4);
  assert.equal(locked.plan, null);
  assert.equal(locked.working.verdictSummary.status, "legal");
  assert.equal(service.readSession(old.sessionId).plan.planHash,
    old.plan.planHash);

  const exported = service.exportSession(locked.sessionId);
  const imported = await service.importSession({
    exportDocument: exported.exportDocument,
  });
  assert.equal(imported.lockedRoster.baselinePlanHash,
    locked.lockedRoster.baselinePlanHash);
  assert.equal(imported.planningMode, "locked_roster_teach_v1");

  const preset = await product.handle({
    method: "POST", pathname: `${API}/sessions/preset`,
    body: {
      setup: old.setup,
      candidateInput: old.working.candidateInput,
    },
  });
  assert.equal(preset.status, 201);
  assert.equal(preset.response.session.lockedRoster.unitCount, 4);
  assert.equal(preset.response.session.sourcePlanHash, null);

  const fresh = await service.createSession(old.setup);
  assert.equal(fresh.planningMode, "agent_teach_v1");
  assert.equal(fresh.lockedRoster, null);
  assert.equal(fresh.plan, null);

  const result = {
    verdict: "PASS",
    oldPlanUnitCount: 5,
    editedUnitCount: 4,
    staleDetected: old.planEvidenceStale,
    proseRevisionRejectedBeforeProvider: true,
    lockedReplanCreated: true,
    presetEntryCreated: true,
    freshAgentTeachDefault: true,
    providerCalls: 0,
  };
  const evidenceDirectory = path.join(root, "build",
    "ticket-27-slice-271-codex-integration");
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(path.join(evidenceDirectory,
    "stale-roster-teach-route-regression.json"),
    `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await rm(dataDirectory, { recursive: true, force: true });
}
