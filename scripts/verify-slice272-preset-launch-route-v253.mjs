// Concrete parity gap: an accepted preset has no client-facing Room route.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterPlanningWorkspaceHttpAdapterV1, ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix } from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
const report = { providerCalls: 0, realRoomLaunches: 0 };
try {
  let forwarded = null;
  const service = { descriptor: () => ({}), startPlanning: async () => ({}) };
  const http = createRosterPlanningWorkspaceHttpAdapterV1({ service,
    launchPresetRoom: async (...args) => { forwarded = args; return { roomId: 'accepted-preset-room', joinUrl: '/room/accepted-preset-room', matchMode: 'agent_vs_agent' }; } });
  const path = `${prefix}/sessions/accepted-preset/launch-room`;
  const result = await http.handle({ method: 'POST', pathname: path, body: { plan: 'browser-forged', recipe: 'browser-forged' } });
  assert.equal(result.status, 201); assert.deepEqual(forwarded, ['accepted-preset']);
  assert.equal(result.response.match.roomId, 'accepted-preset-room');
  const unavailable = await createRosterPlanningWorkspaceHttpAdapterV1({ service }).handle({ method: 'POST', pathname: path });
  assert.equal(unavailable.status, 503); report.status = 'pass';
} catch (e) { report.status = 'fail'; report.failure = { code: e.code, message: e.message }; process.exitCode = 1; }
await fs.writeFile(`${process.argv[2]}/preset-launch-route-v253-${report.status}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
