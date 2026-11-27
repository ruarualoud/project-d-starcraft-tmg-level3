import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ENTRY_SCHEMA = "ticket23_slice248_standard_2000_aa_live_entry_v1";
const LAUNCH_SCHEMA = "ticket27_roster_room_process_launch_v1";

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

function liveProcess(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function validate(input) {
  if (!/^[0-9a-f]{64}$/u.test(String(input?.launchKey || ""))
    || (['fixed_roster','decision_workflow'].includes(input.planningSource)
      ? input.iterativeSessionId != null
      : !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(String(input?.iterativeSessionId || '')))
    || ![undefined, 'agent_selected', 'fixed_roster', 'decision_workflow'].includes(input.planningSource)
    || (input.planningSource === 'decision_workflow'
      ? !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(String(input.decisionWorkflowId || ''))
        || !Number.isSafeInteger(input.draftRevision) || input.draftRevision < 1
      : !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(String(input?.teachSessionId || '')))
    || !/^[0-9a-f]{64}$/u.test(String(input?.planHash || ""))
    || ![undefined, "deepseek", "kimi_code"].includes(input.player1Provider)
    || input.matchMode !== "agent_vs_agent"
    || typeof input.mapConfiguration?.seedId !== "string"
    || (input.mapConfiguration.elementSelections !== undefined && !Array.isArray(input.mapConfiguration.elementSelections))
    || (input.mapConfiguration.passageSelections !== undefined && !Array.isArray(input.mapConfiguration.passageSelections))) {
    fail("ROSTER_ROOM_LAUNCH_INPUT_INVALID");
  }
}

function publicMatch(record) {
  return Object.freeze({ roomId: record.roomId,
    joinUrl: record.joinUrl, matchMode: "agent_vs_agent",
    trainingTruth: false });
}

// The source of the roster and plan is the persisted Web workspace, not the
// browser request. The Room process independently re-reads and admits both
// before it exposes its actual authoritative Room and two Flash Bot seats.
export function createTicket27RosterRoomProcessHostV1(input = {}) {
  const root = path.resolve(input.root || process.cwd());
  const dataDirectory = path.resolve(input.dataDirectory || "");
  const fixtureRoot = path.resolve(input.fixtureRoot || root);
  const webRoot = path.resolve(input.webRoot
    || path.join(root, "apps/starcraft-tmg-expo/dist"));
  // Server-side experiment configuration, never a browser-authored Plan.
  const opponentSessionId = input.opponentRosterPlanSessionId || null;
  const opponentPlanHash = input.opponentRosterPlanHash || null;
  const opponentDataDirectory = path.resolve(
    input.opponentRosterPlanDataDirectory || dataDirectory);
  const autoDriveOnLaunch = input.autoDriveOnLaunch !== false;
  const providerInteractionMode = input.providerInteractionMode || "native_tools";
  if (!["native_tools", "json_channels_v1"].includes(providerInteractionMode)) {
    fail("ROSTER_ROOM_PROVIDER_INTERACTION_MODE_INVALID");
  }
  if (opponentSessionId && (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(
    opponentSessionId) || !/^[0-9a-f]{64}$/u.test(opponentPlanHash || ""))) {
    fail("ROSTER_ROOM_OPPONENT_PLAN_CONFIGURATION_INVALID");
  }
  const launchesDirectory = path.join(dataDirectory, "room-launches");
  const jobs = new Map();

  async function startRoom(request, prior = null) {
    // A failed startup may have left a partial SQLite Room. Preserve that
    // evidence and retry the same launch key in a fresh, non-overlapping
    // directory; a ready Room always resumes its original identity.
    const attempt = prior?.status === "failed"
      ? Number(prior.attempt || 1) + 1 : Number(prior?.attempt || 1);
    const runId = prior?.status === "ready" ? prior.runId
      : `t27-${request.launchKey.slice(0, 32)}`
        + (attempt > 1 ? `-r${attempt}` : "");
    const roomDirectory = path.join(root,
      "build/ticket-23-slice-248-standard-2000-aa-live-v1", runId);
    const statePath = path.join(launchesDirectory,
      `${request.launchKey}.json`);
    const base = { schemaVersion: LAUNCH_SCHEMA,
      launchKey: request.launchKey, runId, attempt, roomDirectory,
      iterativeSessionId: request.iterativeSessionId,
      planningSource: request.planningSource || 'agent_selected',
      teachSessionId: request.teachSessionId,
      decisionWorkflowId: request.decisionWorkflowId || null,
      draftRevision: request.draftRevision ?? null,
      referenceArmyRecipes: request.referenceArmyRecipes || null,
      player1Provider: request.player1Provider || "deepseek",
      planHash: request.planHash,
      mapConfiguration: request.mapConfiguration,
      opponentRosterPlanSessionId: opponentSessionId,
      opponentRosterPlanHash: opponentPlanHash,
      providerInteractionMode,
      createdAt: prior?.createdAt || new Date().toISOString(),
      trainingTruth: false };
    const args = prior?.status === "ready"
      ? [path.join(root,
        "scripts/serve-ticket-23-slice-248-agent-agent-web-v1.mjs"),
        `--resume-directory=${roomDirectory}`]
      : [path.join(root,
        "scripts/serve-ticket-23-slice-248-agent-agent-web-v1.mjs"),
        `--run-id=${runId}`,
        ...(autoDriveOnLaunch ? ["--auto-drive-on-launch"] : []),
        ...(request.planningSource === 'decision_workflow'
          ? [`--pregame-decision-workflow-id=${request.decisionWorkflowId}`,
            `--pregame-decision-revision=${request.draftRevision}`,
            `--pregame-reference-army-recipes-json=${JSON.stringify(request.referenceArmyRecipes)}`]
          : request.planningSource === 'fixed_roster'
          ? [`--pregame-roster-session-id=${request.teachSessionId}`]
          : [`--pregame-agent-selected-iterative-session-id=${request.iterativeSessionId}`,
            `--pregame-agent-selected-teach-session-id=${request.teachSessionId}`]),
        `--pregame-map-configuration-json=${JSON.stringify(
          request.mapConfiguration)}`,
        ...(opponentSessionId ? [
          `--opponent-pregame-roster-session-id=${opponentSessionId}`,
          `--opponent-roster-plan-data-directory=${opponentDataDirectory}`,
        ] : [])];
    args.push(`--provider-interaction-mode=${providerInteractionMode}`,
      `--player1-provider=${request.player1Provider || "deepseek"}`);
    const child = spawn(process.execPath, args, {
      cwd: root, shell: false,
      env: { ...process.env,
        STARCRAFT_TMG_ROSTER_PLAN_DATA_DIRECTORY: dataDirectory,
        STARCRAFT_TMG_PRODUCT_WEB_ROOT: webRoot,
        TICKET27_S271_FIXTURE_ROOT: fixtureRoot },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await writeFile(statePath, `${JSON.stringify({ ...base,
      status: "starting", pid: child.pid || null })}\n`, {
      encoding: "utf8", mode: 0o600,
    });
    return new Promise((resolve, reject) => {
      let settled = false;
      let buffer = "";
      let stderrTail = "";
      const rejectOnce = async (code) => {
        if (settled) return;
        settled = true;
        await writeFile(statePath, `${JSON.stringify({ ...base,
          status: "failed", pid: child.pid || null, failureCode: code,
          stderrTail: stderrTail.slice(-1000) })}\n`, {
          encoding: "utf8", mode: 0o600,
        }).catch(() => {});
        reject(Object.assign(new Error(code), { code }));
      };
      child.stderr.on("data", (chunk) => {
        stderrTail = `${stderrTail}${chunk.toString("utf8")}`.slice(-2000);
      });
      child.stdout.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        let boundary;
        while ((boundary = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 1);
          let entry;
          try { entry = JSON.parse(line); } catch { continue; }
          if (entry.schemaVersion !== ENTRY_SCHEMA || settled) continue;
          const expectedRoomId = `ticket23-slice248-aa-${runId}`;
          let url;
          try { url = new URL(entry.url); } catch {
            void rejectOnce("ROSTER_ROOM_LAUNCH_ENTRY_INVALID");
            return;
          }
          if (entry.roomId !== expectedRoomId
            || entry.plannedPlanHash !== request.planHash
            || (opponentSessionId
              && entry.opponentPlannedPlanHash !== opponentPlanHash)
            || entry.dataDirectory !== roomDirectory
            || url.hostname !== "127.0.0.1"
            || url.pathname !== `/room/${expectedRoomId}`) {
            void rejectOnce("ROSTER_ROOM_LAUNCH_ENTRY_MISMATCH");
            return;
          }
          settled = true;
          const ready = { ...base, status: "ready", pid: child.pid,
            entry,
            roomId: entry.roomId, joinUrl: entry.url,
            startedAt: new Date().toISOString() };
          void writeFile(statePath, `${JSON.stringify(ready)}\n`, {
            encoding: "utf8", mode: 0o600,
          }).then(() => resolve(publicMatch(ready)), reject);
          return;
        }
      });
      child.once("error", () => {
        void rejectOnce("ROSTER_ROOM_LAUNCH_PROCESS_FAILED");
      });
      child.once("exit", (code) => {
        if (!settled) {
          void rejectOnce(code === 0
            ? "ROSTER_ROOM_LAUNCH_EXITED_BEFORE_READY"
            : "ROSTER_ROOM_LAUNCH_STARTUP_FAILED");
        }
      });
    });
  }

  async function launch(request) {
    validate(request);
    const key = request.launchKey;
    if (jobs.has(key)) return jobs.get(key);
    const job = (async () => {
      await mkdir(launchesDirectory, { recursive: true, mode: 0o700 });
      const statePath = path.join(launchesDirectory, `${key}.json`);
      let prior = null;
      try {
        await writeFile(statePath, "{}\n", {
          flag: "wx", encoding: "utf8", mode: 0o600,
        });
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
        try { prior = JSON.parse(await readFile(statePath, "utf8")); }
        catch { fail("ROSTER_ROOM_LAUNCH_REGISTRY_UNREADABLE"); }
      }
      if (prior) {
        if (prior.launchKey !== key
          || prior.planHash !== request.planHash
          || prior.iterativeSessionId !== request.iterativeSessionId
          || (prior.planningSource || 'agent_selected') !== (request.planningSource || 'agent_selected')
          || prior.teachSessionId !== request.teachSessionId
          || (prior.decisionWorkflowId || null) !== (request.decisionWorkflowId || null)
          || (prior.draftRevision ?? null) !== (request.draftRevision ?? null)
          || JSON.stringify(prior.referenceArmyRecipes || null) !== JSON.stringify(request.referenceArmyRecipes || null)
          || (prior.opponentRosterPlanSessionId || null) !== opponentSessionId
          || (prior.opponentRosterPlanHash || null) !== opponentPlanHash
          || (prior.player1Provider || "deepseek") !== (request.player1Provider || "deepseek")
          || (prior.providerInteractionMode || "native_tools") !== providerInteractionMode
          || JSON.stringify(prior.mapConfiguration)
            !== JSON.stringify(request.mapConfiguration)) {
          fail("ROSTER_ROOM_LAUNCH_REGISTRY_DRIFT");
        }
        if (prior.status === "ready"
          && (prior.roomId !== `ticket23-slice248-aa-${prior.runId}`
            || typeof prior.joinUrl !== "string"
            || !prior.joinUrl)) {
          fail("ROSTER_ROOM_LAUNCH_REGISTRY_UNREADABLE");
        }
        if (prior.status === "ready" && liveProcess(prior.pid)) {
          return publicMatch(prior);
        }
        if (prior.status !== "ready" && prior.status !== "failed") {
          fail("ROSTER_ROOM_LAUNCH_RECOVERY_REQUIRED");
        }
        if (prior.status === "failed" && liveProcess(prior.pid)) {
          fail("ROSTER_ROOM_LAUNCH_RECOVERY_PROCESS_STILL_LIVE");
        }
      }
      return startRoom(request, prior);
    })();
    jobs.set(key, job);
    try { return await job; }
    finally { jobs.delete(key); }
  }

  return Object.freeze({ launch });
}
