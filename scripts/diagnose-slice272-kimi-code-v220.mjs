// User-authorized temporary Kimi Code subscription probe; no direct model API.
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [base] = process.argv.slice(2);
if (!base) throw Error('EXPLICIT_BASE_REQUIRED');
const dest = base + '/common-v220-kimi-code-diagnostic.private.json';
await (await fs.open(dest, 'wx', 0o600)).close();
const cwd = base + '/kimi-code-connectivity-v220';
await fs.mkdir(cwd);
const report = { startedAt: new Date().toISOString(), status: 'starting_cli',
  modelAlias: 'kimi-code/k3', provider: 'existing_managed_kimi_code_subscription',
  harness: 'Kimi Code CLI', directApiCall: false, originalWorkspaceUnchanged: true,
  cliInvocations: 1, physicalModelAttempts: 'await_cli_receipt',
  noArmyPlanOrTeachHistory: true, accountingLane: 'temporary_diagnostic_not_A_B',
  costStatus: 'subscription_usage_pending_not_zero_cost', pid: process.pid };
const save = async () => { report.updatedAt = new Date().toISOString();
  await fs.writeFile(dest + '.tmp', JSON.stringify(report, null, 2), { mode: 0o600 });
  await fs.rename(dest + '.tmp', dest); };
const outPath = base + '/common-v220-kimi-code.stdout.private.jsonl';
const errPath = base + '/common-v220-kimi-code.stderr.private.log';
const out = await fs.open(outPath, 'wx', 0o600), err = await fs.open(errPath, 'wx', 0o600);
await save();
const prompt = 'Connectivity probe only. Use no tools and perform no project task. Return exactly this JSON and finish: {"schemaVersion":"kimi_connectivity_probe_v1","ok":true}';
const child = spawn('/Users/rualoud/.kimi-code/bin/kimi', [
  '--model', report.modelAlias,
  '--agent-file', fileURLToPath(new URL('../.kimi-code/agents/project-d-connectivity-probe.md', import.meta.url)),
  '--output-format', 'stream-json', '--prompt', prompt,
], { cwd, stdio: ['ignore', out.fd, err.fd] });
report.childPid = child.pid; report.status = 'cli_running'; await save();
let timedOut = false;
const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, 180000);
const exit = await new Promise(resolve => {
  child.once('error', error => resolve({ error: String(error.code || error.message) }));
  child.once('close', (code, signal) => resolve({ code, signal }));
});
clearTimeout(timer); await out.close(); await err.close();
Object.assign(report, { status: timedOut ? 'cli_timeout_no_restart' : exit.code === 0 ? 'cli_completed_inspect_output' : 'cli_failed_no_restart',
  exit, elapsedMs: Date.now() - Date.parse(report.startedAt), stdoutPath: outPath, stderrPath: errPath,
  finishedAt: new Date().toISOString() });
await save(); console.log(JSON.stringify(report));
