import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createTicket27RosterRoomProcessHostV1 } from './support/ticket27-roster-room-process-host-v1.mjs';
const root = path.resolve('build/room-launch-mode-v61-fixture');
const dataDirectory = path.join(root, process.argv[2]);
const launchKey = 'a'.repeat(64);
const host = createTicket27RosterRoomProcessHostV1({ root, dataDirectory,
  providerInteractionMode: 'json_channels_v1', autoDriveOnLaunch: false });
await host.launch({ launchKey, iterativeSessionId: 'mode-repro',
  teachSessionId: 'teach-repro', planHash: 'b'.repeat(64),
  matchMode: 'agent_vs_agent', mapConfiguration: { seedId: 'standard-d6-1',
    elementSelections: [], passageSelections: [] } });
const record = JSON.parse(await readFile(path.join(dataDirectory,
  'room-launches', launchKey + '.json'), 'utf8'));
assert.equal(record.entry.providerInteractionMode, 'json_channels_v1');
console.log('ROOM_LAUNCH_MODE_OK: real process host propagated mode; zero Provider/Room');
