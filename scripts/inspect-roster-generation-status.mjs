// Read-only bounded projection. Never prints prompts, raw replies or credentials.
import fs from 'node:fs/promises';
import { resolve } from 'node:path';
const base = resolve(process.argv[2] || 'build/ticket-23-three-arm-performance-baseline-20261010-v1');
const generation = process.argv[3] || '264';
if (!/^\d+$/.test(generation)) throw Error('Numeric generation required');
const rows = [];
for (const arm of ['A', 'B']) {
  const path = `${base}/${arm}/fresh-generation-v${generation}/progress.private.json`;
  const p = JSON.parse(await fs.readFile(path, 'utf8'));
  let pidExists = false;
  if (Number.isSafeInteger(p.pid) && p.pid > 0) {
    try { process.kill(p.pid, 0); pidExists = true; } catch (e) { if (e.code === 'EPERM') pidExists = true; }
  }
  const done = (p.events || []).filter(e => e.type === 'round_completed' && e.paidProviderCall);
  const byKind = {};
  for (const e of done) {
    const g = byKind[e.roundKind] ||= { calls: 0, latencySeconds: 0 };
    g.calls++; g.latencySeconds += (e.latencyMs || 0) / 1000;
  }
  for (const g of Object.values(byKind)) g.latencySeconds = Math.round(g.latencySeconds);
  rows.push({ arm, generation, status: p.status, pid: p.pid, pidExists,
    processIdentityVerified: false, updatedAt: p.updatedAt, sessionId: p.sessionId,
    requestNumber: p.requestCount, lastRequestKind: p.activeRequest?.roundKind,
    stage: p.journey?.stage, revision: p.journey?.revision,
    mineralSpent: p.journey?.mineralSpent, exactBudget: p.journey?.exactBudget,
    canEnterRoom: p.journey?.canEnterRoom, stoppedReason: p.journey?.stoppedReason,
    failureCodes: [...new Set(String(p.failure || '').match(/\b(?:ROSTER|ITERATIVE|PRESET|PROVIDER)_[A-Z0-9_]+\b/g) || [])],
    usage: p.usage && { calls: p.usage.calls, inputUnits: p.usage.inputUnits,
      outputUnits: p.usage.outputUnits, totalUnits: p.usage.totalUnits }, byKind });
}
console.log(JSON.stringify({ observedAt: new Date().toISOString(), rows,
  note: 'PID existence is not process identity. Read the named failure before any restart. No model calls.' }, null, 2));
