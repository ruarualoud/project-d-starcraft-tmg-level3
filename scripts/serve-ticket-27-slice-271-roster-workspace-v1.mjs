#!/usr/bin/env node

// Ticket 27 / Slice 271 — standalone roster-planning workspace server.
// Serves the current Expo Web export plus the isolated roster-planning
// workspace API (additive prefix only). The optional explicit
// --enable-room-launch attaches a real, separate authoritative Room process;
// without it no Room mutation route is mounted. Live deliberation is only
// attached with the explicit CLI --enable-roster-flash flag. The
// Keychain→isolated Worker attachment itself makes zero Provider calls; paid
// requests require a subsequent explicit Generate action in the Web UI.

import { battlefieldSoundtrack } from '../packages/client-domain/battlefield-soundtrack-v1.mjs';
import http from "node:http";
import {compileFrozenWave3SkillRefreshV1} from '../packages/strategy-skills/wave3-frozen-skill-refresh-v1.mjs';
import {createSqliteStarcraftTmgStrategyReleaseStoreV1} from '../packages/strategy-skills/sqlite-strategy-release-store-v1.mjs';
import {verifyOfficialReleaseManifestV2} from '../packages/source-data/official-release-context-v2.mjs';
import {seal} from '../packages/skill-production/common.mjs';
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { ROSTER_PLANNING_WORKSPACE_API_PREFIX } from
  "../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs";
import { createRosterPlanningSecureDeliberationFactoryV1 } from
  "../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";
import { createTicket27RosterRoomProcessHostV1 } from
  "./support/ticket27-roster-room-process-host-v1.mjs";
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V3 } from
  '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DATA_DIRECTORY = path.join(ROOT,
  "build/ticket-27-slice-271-roster-workspace-v1/workspace-data");
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
});
const PRODUCT_WEB_DOCUMENTS = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/army", "army.html"],
  ["/match", "match.html"],
  ["/prepare", "prepare.html"],
  ["/tools", "tools.html"],
  ["/settings", "settings.html"],
  ["/(tabs)", "(tabs)/index.html"],
  ["/(tabs)/army", "(tabs)/army.html"],
  ["/(tabs)/match", "(tabs)/match.html"],
  ["/(tabs)/tools", "(tabs)/tools.html"],
  ["/(tabs)/settings", "(tabs)/settings.html"],
  ["/dev/theme-lab", "dev/theme-lab.html"],
]);

function safeFile(root, relativePath) {
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return null;
  return target;
}

function staticCandidate(webRoot, pathname) {
  if (pathname.startsWith("/assets/client/")) {
    return { root: path.join(ROOT, "assets/client"),
      relativePath: pathname.slice("/assets/client/".length) };
  }
  if (PRODUCT_WEB_DOCUMENTS.has(pathname)) {
    return { root: webRoot, relativePath: PRODUCT_WEB_DOCUMENTS.get(pathname) };
  }
  if (pathname === "/room" || pathname.startsWith("/room/")) {
    return { root: webRoot, relativePath: "room/[roomId].html" };
  }
  return { root: webRoot, relativePath: pathname.replace(/^\/+/, "") };
}

async function serveFile(response, descriptor) {
  if (!descriptor) return false;
  let filename;
  try {
    filename = safeFile(descriptor.root,
      decodeURIComponent(descriptor.relativePath));
  } catch {
    return false;
  }
  if (!filename) return false;
  try {
    const info = await stat(filename);
    if (!info.isFile()) return false;
    const body = await readFile(filename);
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-length": String(body.byteLength),
      "content-type": MIME_TYPES[path.extname(filename)]
        || "application/octet-stream",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    });
    response.end(body);
    return true;
  } catch {
    return false;
  }
}

function sendJson(response, status, body, extraHeaders = {}) {
  const bytes = Buffer.from(JSON.stringify(body), "utf8");
  response.writeHead(status, {
    ...extraHeaders,
    "cache-control": "private, no-store, max-age=0",
    "content-length": String(bytes.byteLength),
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
  response.end(bytes);
}

async function readRequestBody(request,maximumBytes=MAX_BODY_BYTES) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.byteLength;
    if (bytes > maximumBytes) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks);
  let body = {};
  if (rawBody.byteLength) body = JSON.parse(rawBody.toString("utf8"));
  return { rawBody, body, bodyBytes: rawBody.byteLength };
}

export async function createRosterWorkspaceServerV1(input = {}) {
  const webRoot = input.webRoot
    || path.join(ROOT, "apps/starcraft-tmg-expo/dist");
  const dataDirectory = input.dataDirectory || DEFAULT_DATA_DIRECTORY;
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  let module = null, modulePromise = null;
  const scopedModules = new Map();
  const previews = new Map();
  const planningBoards = new Map();

  function planningBoard(setup) {
    const selected = setup.wave3MatchSetup;
    const key = [selected.id, selected.sourceHash, selected.version].join('/');
    if (!planningBoards.has(key)) {
      const pending = createRosterPlanningProductModuleV1({
        ...setup, root: input.root || ROOT, operation: 'board_queries',
      }).catch(error => { planningBoards.delete(key); throw error; });
      planningBoards.set(key, pending);
    }
    return planningBoards.get(key);
  }
  const skillRefreshByRelease = new Map();
  async function preparedSkillRefresh(selected) {
    const root = input.root || ROOT;
    const manifest = verifyOfficialReleaseManifestV2(JSON.parse(await readFile(path.join(root,selected.releaseRef),'utf8')));
    if (manifest.manifestHash !== selected.sourceHash) throw Error('PRODUCT_ROOM_RELEASE_SOURCE_CHANGED');
    if (!skillRefreshByRelease.has(manifest.manifestHash)) {
      skillRefreshByRelease.set(manifest.manifestHash,compileFrozenWave3SkillRefreshV1(root,manifest));
    }
    return skillRefreshByRelease.get(manifest.manifestHash);
  }
  function setupPreview(setup) {
    const selected = setup.wave3MatchSetup;
    const key = [selected.id,selected.sourceHash,selected.version].join('/');
    if (!previews.has(key)) {
      const pending = planningBoard(setup).then(board => {
          const map = board.mapEvidencePort.summarizeMap({queryId:'builder-setup'});
          const deployment = board.mapEvidencePort.deploymentGeometry({queryId:'builder-deployment'});
          if (map.resultStatus !== 'certified_map_summary' || deployment.resultStatus !== 'certified_deployment_geometry') {
            throw Error('PRODUCT_SETUP_GEOMETRY_UNAVAILABLE');
          }
          return {ok:true,catalogue:board.readBuilderCatalogue(),setup:{id:selected.id,mission:selected.mission,
            deployment:selected.deployment,scale:selected.scale,minerals:selected.minerals,mapBinding:map.mapBinding,
            releaseBinding:board.releaseBinding,missionMarkers:map.missionMarkers,deploymentGeometry:deployment.deploymentGeometry}};
        }).catch(error=>{previews.delete(key);throw error;});
      previews.set(key,pending);
    }
    return previews.get(key);
  }
  const openModule = (overrides = {}) => createRosterPlanningProductModuleV1({
    root: input.root || ROOT,
    fixtureRoot: input.fixtureRoot || input.root || ROOT,
    dataDirectory,
    mapConfiguration: input.mapConfiguration || null,
    wave3MatchSetup: input.wave3MatchSetup,
    referenceArmyRecipes: input.referenceArmyRecipes,
    releaseResolver: input.releaseResolver,
    releaseId: input.releaseId,
    deliberationFactory: input.deliberationFactory || null,
    roomLaunchPort: input.roomLaunchPort || null,
    enableIterativeDraft: Boolean(input.deliberationFactory
      && (overrides.mapConfiguration || input.mapConfiguration)),
    ...overrides,
  });
  const getModule = () => modulePromise ||= openModule().then(value => { module = value; return value; });
  function scopedModule(setup) {
    // The same setup ID can be offered on a different frozen release after a restart.
    const key = [setup.wave3MatchSetup.id, setup.wave3MatchSetup.sourceHash, setup.wave3MatchSetup.version].join('.');
    if (!scopedModules.has(key)) {
      const opening = openModule({...setup,dataDirectory:path.join(dataDirectory,'match-setups',key)})
        .catch(error => { scopedModules.delete(key); throw error; });
      scopedModules.set(key,opening);
    }
    return scopedModules.get(key);
  }
  if (!input.lazyWorkspace) await getModule();
  const server = http.createServer(async (request, response) => {
    try {
      const origin = `http://${request.headers.host || "127.0.0.1"}`;
      const url = new URL(request.url || "/", origin);
      if (url.pathname === "/assets/soundtrack/catalog.json") {
        const tracks = await Promise.all(battlefieldSoundtrack.map(async track => {
          const local = await stat(path.join(dataDirectory, "soundtrack", track.id + ".mp3"))
            .then(info => info.isFile() && info.size > 0, () => false);
          return { id: track.id, installed: local };
        }));
        sendJson(response, 200, { tracks });
        return;
      }
      const recording = battlefieldSoundtrack.find(track => track.localPath === url.pathname);
      if (recording && await serveFile(response, {
        root: path.join(dataDirectory, "soundtrack"), relativePath: recording.id + ".mp3",
      })) return;
      const hasBody = ["POST", "PUT", "PATCH"].includes(
        request.method || "GET");
      const standardCardUpload=request.method==='PUT'
        && /^\/starcraft-tmg-level3\/companion\/api\/v1\/conversations\/[A-Za-z0-9._:-]{1,160}\/standard-card(?:\/worldbook)?$/u.test(url.pathname);
      const requestBody = hasBody
        ? await readRequestBody(request,standardCardUpload?36*1024*1024:MAX_BODY_BYTES)
        : { rawBody: Buffer.alloc(0), body: {}, bodyBytes: 0 };
      // Optional composition seam: the same product origin owns room and
      // companion routes. The workspace remains the sole Plan implementation.
      if (input.productHandler) {
        const result = await input.productHandler({ method: request.method,
          pathname: url.pathname, query: url.searchParams,
          headers: request.headers, ...requestBody });
        if (result) {
          if (result.rawBody || result.binary) {
            response.writeHead(result.status, result.headers);
            response.end(result.rawBody || result.body);
          } else sendJson(response, result.status, result.response, result.headers);
          return;
        }
      }
      if (url.pathname.startsWith(ROSTER_PLANNING_WORKSPACE_API_PREFIX)) {
        const setupId = request.headers['x-starcraft-match-setup'];
        let setup;
        if (setupId !== undefined) {
          if (typeof setupId !== 'string' || !setupId || !input.planningInputsForSetup) {
            sendJson(response,422,{ok:false,reason:'PRODUCT_SETUP_UNKNOWN'});
            return;
          }
          setup = input.planningInputsForSetup(setupId);
        }
        if (setup && request.method === 'POST' && url.pathname === ROSTER_PLANNING_WORKSPACE_API_PREFIX + '/skill-refresh-preview') {
          const {impact,preparation} = await preparedSkillRefresh(setup.wave3MatchSetup);
          const preview = seal({schema:'wave3_skill_refresh_preview_v1',releaseHash:preparation.releaseHash,
            impact,runtimeAccepted:false,trainingTruth:false});
          const store = input.strategyReleaseStore || createSqliteStarcraftTmgStrategyReleaseStoreV1({
            filename:path.join(dataDirectory,'skill-refresh.sqlite')});
          try {
            await store.putArtifact({artifactId:'wave3-refresh:'+preview.hash,kind:preview.schema,
              artifact:preview,expectedHash:preview.hash,createdAt:impact.binding.sourceCapturedAt});
            await store.putArtifact({artifactId:'wave3-preparation:'+preparation.hash,kind:preparation.schema,
              artifact:preparation,expectedHash:preparation.hash,createdAt:impact.binding.sourceCapturedAt});
            sendJson(response,200,{ok:true,previewHash:preview.hash,releaseHash:preview.releaseHash,preparation,existingSkills:impact.existingSkills,
              sectionCount:impact.sectionCount,affected:impact.affected,unrepresentedFactions:impact.unrepresentedFactions});
          } finally {if (!input.strategyReleaseStore) await store.close();}
          return;
        }
        if (setup && request.method === 'GET' && url.pathname === ROSTER_PLANNING_WORKSPACE_API_PREFIX + '/skill-refresh-section') {
          const {preparation, sectionInput, factionChoicesForSection, inspectFactionChoice} =
            await preparedSkillRefresh(setup.wave3MatchSetup);
          if (url.searchParams.get('preparation') !== preparation.hash) {
            sendJson(response,409,{ok:false,reason:'SKILL_PREPARATION_BINDING_MISMATCH'}); return;
          }
          const packet=sectionInput(url.searchParams.get('skillId'),url.searchParams.get('section'));
          if (!packet) {sendJson(response,404,{ok:false,reason:'SKILL_SECTION_UNKNOWN'}); return;}
          const faction = url.searchParams.get('faction');
          const recordKey = url.searchParams.get('record');
          if (faction === null && recordKey === null) {
            const lookups = factionChoicesForSection(packet.skillId);
            sendJson(response,200,{ok:true,packet,lookups:{eligibleFactions:lookups, parameters:['faction','record']}});
            return;
          }
          if (!factionChoicesForSection(packet.skillId).includes(faction)) {
            sendJson(response,422,{ok:false,reason:'SKILL_SECTION_FACTION_OUT_OF_SCOPE'}); return;
          }
          const board = await planningBoard(setup);
          const choice = inspectFactionChoice({packet, faction, recordKey, builder:board.armyBuilderPort, setup:setup.wave3MatchSetup});
          if (!choice) {sendJson(response,404,{ok:false,reason:'SKILL_SECTION_CHOICE_INELIGIBLE'}); return;}
          sendJson(response,200,{ok:true,choice}); return;
        }
        if (setup && request.method === 'POST' && url.pathname === ROSTER_PLANNING_WORKSPACE_API_PREFIX + '/historical-plan-impact') {
          const {inspectHistoricalPlan}=await preparedSkillRefresh(setup.wave3MatchSetup);
          try {
            const impact=inspectHistoricalPlan(requestBody.body?.plan,setup.wave3MatchSetup);
            sendJson(response,200,{ok:true,impact});
          } catch(error) {
            if (error.message==='WAVE3_PLAN_REFRESH_ORIGIN_UNSUPPORTED') sendJson(response,409,{ok:false,reason:error.message});
            else if (String(error.code??error.message).startsWith('ROSTER_'))
              sendJson(response,422,{ok:false,reason:'ROSTER_PLAN_INVALID'});
            else throw error;
          }
          return;
        }
        if (setup && request.method === 'GET' && url.pathname === ROSTER_PLANNING_WORKSPACE_API_PREFIX + '/match-setup') {
          sendJson(response,200,await setupPreview(setup));
          return;
        }
        const result = await (await (setup ? scopedModule(setup) : getModule())).handle({
          method: request.method,
          pathname: url.pathname,
          query: url.searchParams,
          headers: request.headers,
          ...requestBody,
        });
        sendJson(response, result.status, result.response);
        return;
      }
      if (await serveFile(response, staticCandidate(webRoot, url.pathname))) {
        return;
      }
      const body = Buffer.from("Not found", "utf8");
      response.writeHead(404, {
        "content-length": String(body.byteLength),
        "content-type": "text/plain; charset=utf-8",
      });
      response.end(body);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const status = reason === 'PRODUCT_SETUP_NOT_FOUND' ? 404
        : reason === "WAVE3_PLANNING_QUALIFIED_STRATEGY_RELEASE_REQUIRED" ? 409
        : reason === "PAYLOAD_TOO_LARGE" ? 413 : 500;
      sendJson(response, status, {ok: false, error: reason});
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(input.port ?? 0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address !== "object") {
    throw new Error("ROSTER_WORKSPACE_LISTEN_FAILED");
  }
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    server,
    module,
    origin,
    armyUrl: `${origin}/army`,
    liveDeliberationAttached: Boolean(input.deliberationFactory),
    liveRoomLaunchAttached: Boolean(input.roomLaunchPort),
    async close() {
      await new Promise((resolve) => server.close(resolve));
      const opened = await Promise.allSettled([modulePromise, ...scopedModules.values()].filter(Boolean));
      await Promise.all(opened.filter(row => row.status === 'fulfilled').map(row => row.value.closeDecisionWorkflows()));
    },
  };
}

async function main() {
  const dataArgument = process.argv.find((entry) => (
    entry.startsWith("--data-directory=")));
  const dataDirectory = dataArgument
    ? path.resolve(dataArgument.slice("--data-directory=".length))
    : DEFAULT_DATA_DIRECTORY;
  const fixtureArgument = process.argv.find((entry) => (
    entry.startsWith("--fixture-root=")));
  const webRootArgument = process.argv.find((entry) => (
    entry.startsWith("--web-root=")));
  const webRoot = webRootArgument
    ? path.resolve(webRootArgument.slice("--web-root=".length))
    : undefined;
  const mapSeedArgument = process.argv.find((entry) => (
    entry.startsWith("--map-seed-id=")));
  const mapConfigurationFileArgument = process.argv.find((entry) => (
    entry.startsWith("--map-configuration-file=")));
  if (mapSeedArgument && mapConfigurationFileArgument) {
    throw new Error("ROSTER_WORKSPACE_MAP_CONFIGURATION_SOURCES_CONFLICT");
  }
  // The reviewed native setup is frozen once, then shared byte-for-byte by
  // the workspace and match host. A seed alone is not its terrain agreement.
  const mapConfiguration = mapConfigurationFileArgument
    ? JSON.parse(await readFile(path.resolve(mapConfigurationFileArgument.slice(
      "--map-configuration-file=".length)), "utf8"))
    : mapSeedArgument ? {
      seedId: mapSeedArgument.slice("--map-seed-id=".length),
      elementSelections: [], passageSelections: [],
    } : null;
  const secureFlashEnabled = process.argv.includes("--enable-roster-flash");
  const roomLaunchEnabled = process.argv.includes("--enable-room-launch");
  const offlineRecovery600s = process.argv.includes('--offline-recovery-600s');
  if (offlineRecovery600s && (roomLaunchEnabled || !secureFlashEnabled)) {
    throw Error('OFFLINE_RECOVERY_REQUIRES_FLASH_WITHOUT_ROOM_LAUNCH');
  }
  const roomInteractionModeArgument = process.argv.find((entry) =>
    entry.startsWith("--room-provider-interaction-mode="));
  const opponentSessionArgument = process.argv.find((entry) =>
    entry.startsWith("--opponent-pregame-roster-session-id="));
  const opponentHashArgument = process.argv.find((entry) =>
    entry.startsWith("--opponent-roster-plan-hash="));
  const opponentDirectoryArgument = process.argv.find((entry) =>
    entry.startsWith("--opponent-roster-plan-data-directory="));
  if (roomLaunchEnabled && !secureFlashEnabled) {
    throw new Error("ROSTER_ROOM_LAUNCH_REQUIRES_LIVE_FLASH");
  }
  const secure = secureFlashEnabled
    ? await createRosterPlanningSecureDeliberationFactoryV1(offlineRecovery600s
      ? { profile: STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V3 } : {}) : null;
  const fixtureRoot = fixtureArgument
    ? path.resolve(fixtureArgument.slice("--fixture-root=".length))
    : ROOT;
  let handle;
  try {
    handle = await createRosterWorkspaceServerV1({
      dataDirectory,
      webRoot,
      fixtureRoot,
      mapConfiguration,
      deliberationFactory: secure?.factory || null,
      roomLaunchPort: roomLaunchEnabled
        ? createTicket27RosterRoomProcessHostV1({ root: ROOT,
          dataDirectory, fixtureRoot, webRoot,
          providerInteractionMode: roomInteractionModeArgument?.slice(
            "--room-provider-interaction-mode=".length) || "native_tools",
          opponentRosterPlanSessionId: opponentSessionArgument?.slice(
            "--opponent-pregame-roster-session-id=".length) || null,
          opponentRosterPlanHash: opponentHashArgument?.slice(
            "--opponent-roster-plan-hash=".length) || null,
          opponentRosterPlanDataDirectory: opponentDirectoryArgument?.slice(
            "--opponent-roster-plan-data-directory=".length) || null,
          autoDriveOnLaunch: !process.argv.includes(
            "--no-auto-drive-on-room-launch"),
        }) : null,
    });
  } catch (error) {
    await secure?.close();
    throw error;
  }
  process.stdout.write(`${JSON.stringify({
    schemaVersion: "ticket27_slice271_roster_workspace_server_entry_v1",
    origin: handle.origin,
    armyUrl: handle.armyUrl,
    apiPrefix: ROSTER_PLANNING_WORKSPACE_API_PREFIX,
    dataDirectory,
    liveDeliberationAttached: handle.liveDeliberationAttached,
    offlineRecovery600s,
    liveRoomLaunchAttached: handle.liveRoomLaunchAttached,
    planningState: handle.liveDeliberationAttached
      ? "available_explicit_generate_only"
      : "unavailable_no_live_deliberation_factory",
    productModule: handle.module.descriptor(),
    trainingTruth: false,
  })}\n`);
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await handle.close();
    await secure?.close();
    process.exit(0);
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

if (process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  });
}
