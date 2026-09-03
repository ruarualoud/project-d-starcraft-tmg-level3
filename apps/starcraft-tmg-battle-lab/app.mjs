import { createStarcraftTmgBattleLabRuntime } from "./battle-lab-runtime-v1.mjs";
import {
  resolveStarcraftTmgBattlefieldUnitMediaV1,
  starcraftTmgBattlefieldMapMediaV1,
} from "../../packages/client-domain/battlefield-media-catalog-v1.mjs";

const NS = "http://www.w3.org/2000/svg";
const runtime = createStarcraftTmgBattleLabRuntime({
  baseUrl: globalThis.BATTLE_LAB_API_ORIGIN || "",
  enableRoleAgentSession: true,
});
const AGENT_MODE_INTENTS = Object.freeze({
  tutor: Object.freeze(["explain", "chat"]),
  opponent: Object.freeze(["take_turn", "chat"]),
  commentator: Object.freeze(["commentate"]),
  companion: Object.freeze(["reflect", "chat"]),
});
let selectedModelId = null;
let toastTimer = null;
let showThreatReference = false;
let activeThreatMode = "stationary_fire";
let selectedThreatWeaponId = "";
let voicesEnabled = false;
let lastPlayedCueBatchHash = null;
let bgmObjectUrl = null;
const voiceAudio = new Audio();
const bgmAudio = new Audio();
bgmAudio.loop = true;
bgmAudio.volume = 0.45;
voiceAudio.volume = 0.7;
const mapMedia = starcraftTmgBattlefieldMapMediaV1();
let activeDetailPanel = "unit";

const el = Object.fromEntries([
  "connection", "shared-hash", "room-id", "seat-token", "room-title",
  "state-revision", "model-count", "board", "board-empty", "replay-state",
  "referee-facts", "integrity-alert", "agent-status", "agent-traces",
  "action-count", "actions", "domain", "parameters", "preview", "harness",
  "toast",
  "threat-toggle", "selected-portrait", "selected-unit", "media-status",
  "bgm-file", "volume",
  "unit-coverage", "threat-coverage", "status-coverage", "marker-coverage",
  "workbench-unit", "workbench-threat", "workbench-status", "workbench-markers",
  "threat-mode", "threat-weapon",
  "agent-mode", "agent-intent", "agent-message", "agent-confirmation",
  "agent-identity",
].map((name) => [name, document.querySelector(`[data-${name}]`)]));

voiceAudio.addEventListener("playing", () => {
  el["media-status"].dataset.voicePlayback = "playing";
});
voiceAudio.addEventListener("error", () => {
  el["media-status"].dataset.voicePlayback = "error";
});
bgmAudio.addEventListener("playing", () => {
  el["media-status"].dataset.bgmPlayback = "playing";
});
bgmAudio.addEventListener("pause", () => {
  el["media-status"].dataset.bgmPlayback = bgmAudio.src ? "paused" : "unloaded";
});

function unitMedia(unitId) {
  return resolveStarcraftTmgBattlefieldUnitMediaV1(unitId, {
    releaseChannel: "public_user_authorized",
  });
}

function randomEntry(values) {
  return values?.length ? values[Math.floor(Math.random() * values.length)] : null;
}

function modelForPiece(scene, pieceId) {
  return scene.models.find((model) => model.pieceId === pieceId) || null;
}

async function playUnitVoice(model, intent = "selected") {
  if (!voicesEnabled || !model) return;
  const media = unitMedia(model.unitId);
  const source = randomEntry(media?.voice?.[intent]);
  if (!source) return;
  voiceAudio.pause();
  voiceAudio.src = source;
  voiceAudio.currentTime = 0;
  try {
    await voiceAudio.play();
  } catch {
    el["media-status"].textContent = "Browser blocked audio; press Enable voices again.";
  }
}

function playValidatedReceiptCues(view) {
  const batch = view.shared.lastReceipt?.presentationCueBatch;
  if (!voicesEnabled || !batch?.cueBatchHash
    || batch.cueBatchHash === lastPlayedCueBatchHash) return;
  lastPlayedCueBatchHash = batch.cueBatchHash;
  const cue = [...(batch.cues || [])].reverse().find((entry) => (
    ["confirm", "damaged", "destroyed"].includes(entry.voiceIntent)
  ));
  if (!cue) return;
  const pieceId = cue.voiceIntent === "confirm" ? cue.actorPieceId : cue.targetPieceId;
  void playUnitVoice(modelForPiece(view.battlefield, pieceId), cue.voiceIntent);
}

function text(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function shortHash(value) {
  const hash = text(value, "");
  return hash ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : "—";
}

function replaceChildren(node, children) {
  node.replaceChildren(...children.filter(Boolean));
}

function htmlElement(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "className") node.className = value;
    else if (name === "textContent") node.textContent = value;
    else if (name.startsWith("data-")) node.setAttribute(name, value);
    else node[name] = value;
  }
  for (const child of children) node.append(child);
  return node;
}

function svgElement(tag, attributes = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function notify(message) {
  el.toast.textContent = message;
  el.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("visible"), 2400);
}

function setDetailPanel(panelName) {
  const requested = document.querySelector(`[data-detail-panel="${panelName}"]`)
    ? panelName
    : "referee";
  activeDetailPanel = requested;
  for (const panel of document.querySelectorAll("[data-detail-panel]")) {
    panel.hidden = panel.dataset.detailPanel !== requested;
  }
  for (const tab of document.querySelectorAll("[data-detail-tab]")) {
    const selected = tab.dataset.detailTab === requested;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  }
  document.querySelector(".right-rail").dataset.activePanel = requested;
}

function glyphForArea(area) {
  if (!area.geometryRenderable || !area.widthMilliInches || !area.depthMilliInches) return null;
  const common = {
    fill: area.kind === "terrain" ? "#33415588" : area.kind === "marker" ? "#fbbf2440" : "#22d3ee40",
    stroke: area.kind === "terrain" ? "#64748b" : area.kind === "marker" ? "#fbbf24" : "#22d3ee",
    "stroke-width": 110,
    "data-area-kind": area.kind,
    "data-area-id": area.id,
  };
  if (area.shape === "rectangle") {
    return svgElement("rect", {
      x: area.xMilliInches - (area.widthMilliInches / 2),
      y: area.yMilliInches - (area.depthMilliInches / 2),
      width: area.widthMilliInches,
      height: area.depthMilliInches,
      transform: `rotate(${area.rotationDegrees} ${area.xMilliInches} ${area.yMilliInches})`,
      ...common,
    });
  }
  return svgElement("ellipse", {
    cx: area.xMilliInches,
    cy: area.yMilliInches,
    rx: area.widthMilliInches / 2,
    ry: area.depthMilliInches / 2,
    transform: `rotate(${area.rotationDegrees} ${area.xMilliInches} ${area.yMilliInches})`,
    ...common,
  });
}

function glyphForModel(model, preview = false) {
  const selected = selectedModelId === model.id;
  const color = preview ? "#fbbf24" : model.sideKey === "player1" ? "#38bdf8" : "#fb7185";
  const width = model.baseWidthMilliInches || 700;
  const depth = model.baseDepthMilliInches || width;
  const node = model.baseShape === "rectangle"
    ? svgElement("rect", {
      x: model.xMilliInches - (width / 2), y: model.yMilliInches - (depth / 2),
      width, height: depth,
      transform: `rotate(${model.baseRotationDegrees || 0} ${model.xMilliInches} ${model.yMilliInches})`,
    })
    : svgElement("ellipse", {
      cx: model.xMilliInches, cy: model.yMilliInches, rx: width / 2, ry: depth / 2,
      transform: `rotate(${model.baseRotationDegrees || 0} ${model.xMilliInches} ${model.yMilliInches})`,
    });
  node.setAttribute("fill", preview ? "#fbbf2433" : `${color}55`);
  node.setAttribute("stroke", selected ? "#ffffff" : color);
  node.setAttribute("stroke-width", selected ? "190" : "115");
  if (preview) node.setAttribute("stroke-dasharray", "260 150");
  const group = svgElement("g", {
    "data-model-id": model.id,
    "data-base-edge-valid": String(model.withinBoard !== false),
    "data-base-min-x": model.baseBounds?.minXMilliInches ?? "",
    "data-base-max-x": model.baseBounds?.maxXMilliInches ?? "",
    "data-base-min-y": model.baseBounds?.minYMilliInches ?? "",
    "data-base-max-y": model.baseBounds?.maxYMilliInches ?? "",
  });
  group.append(node);
  if (!preview) {
    const media = unitMedia(model.unitId);
    if (media) {
      const portraitWidth = width * 0.84;
      const portraitDepth = depth * 0.84;
      const clipId = `model-portrait-clip-${String(model.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      const definitions = svgElement("defs");
      const clipPath = svgElement("clipPath", {
        id: clipId,
        clipPathUnits: "userSpaceOnUse",
      });
      const clipShape = model.baseShape === "rectangle"
        ? svgElement("rect", {
          x: model.xMilliInches - (portraitWidth / 2),
          y: model.yMilliInches - (portraitDepth / 2),
          width: portraitWidth,
          height: portraitDepth,
          rx: Math.min(portraitWidth, portraitDepth) * 0.08,
          transform: `rotate(${model.baseRotationDegrees || 0} ${model.xMilliInches} ${model.yMilliInches})`,
        })
        : svgElement("ellipse", {
          cx: model.xMilliInches,
          cy: model.yMilliInches,
          rx: portraitWidth / 2,
          ry: portraitDepth / 2,
          transform: `rotate(${model.baseRotationDegrees || 0} ${model.xMilliInches} ${model.yMilliInches})`,
        });
      clipPath.append(clipShape);
      definitions.append(clipPath);
      const image = svgElement("image", {
        href: media.neutralPortraitPath,
        x: model.xMilliInches - (portraitWidth / 2),
        y: model.yMilliInches - (portraitDepth / 2),
        width: portraitWidth,
        height: portraitDepth,
        preserveAspectRatio: "xMidYMid slice",
        opacity: model.destroyed ? 0.35 : 0.92,
        transform: `translate(0 ${2 * model.yMilliInches}) scale(1 -1)`,
        "clip-path": `url(#${clipId})`,
        "data-portrait-fit": "shape-clipped-cover",
        "pointer-events": "none",
      });
      group.append(definitions);
      group.append(image);
    }
    group.append(svgElement("circle", {
      cx: model.xMilliInches,
      cy: model.yMilliInches,
      r: 90,
      fill: color,
      "pointer-events": "none",
    }));
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", `${model.label}; ${model.sideKey}; select for inspection only`);
    node.addEventListener("click", () => {
      selectedModelId = model.id;
      render(runtime.read());
      void playUnitVoice(model, "selected");
    });
  }
  return group;
}

function renderBoard(view) {
  const scene = view.battlefield;
  const board = el.board;
  board.setAttribute("viewBox", `0 0 ${scene.widthMilliInches} ${scene.heightMilliInches}`);
  const background = svgElement("rect", {
    x: 0, y: 0, width: scene.widthMilliInches, height: scene.heightMilliInches,
    fill: "#07121b", stroke: "#47677a", "stroke-width": 120,
  });
  const map = svgElement("image", {
    href: mapMedia.path,
    x: 0,
    y: 0,
    width: scene.widthMilliInches,
    height: scene.heightMilliInches,
    preserveAspectRatio: "xMidYMid slice",
    opacity: 0.72,
    "data-display-only-map": "true",
  });
  const world = svgElement("g", {
    transform: `translate(0 ${scene.heightMilliInches}) scale(1 -1)`,
  });
  for (const area of [...scene.terrain, ...scene.markers, ...scene.tokens]) {
    const glyph = glyphForArea(area);
    if (glyph) world.append(glyph);
  }
  const selected = scene.models.find((model) => model.id === selectedModelId);
  const selectedUnit = view.workbench?.threat?.perUnit?.find((entry) => entry.unitId === selected?.pieceId);
  const threatRegions = !showThreatReference ? []
    : activeThreatMode === "friendly_aggregate"
      ? (view.workbench?.threat?.aggregates?.friendly?.regions || [])
      : activeThreatMode === "enemy_aggregate"
        ? (view.workbench?.threat?.aggregates?.enemy?.regions || [])
        : activeThreatMode === "charge_engagement"
          ? (selectedUnit?.charge?.regions || [])
          : (selectedUnit?.weapons || [])
            .filter((weapon) => !selectedThreatWeaponId || weapon.weaponId === selectedThreatWeaponId)
            .flatMap((weapon) => activeThreatMode === "stationary_fire"
              ? weapon.stationaryRegions : weapon.moveThenAttackRegions);
  for (const [index, region] of threatRegions.entries()) {
    world.append(svgElement("circle", {
      cx: region.centerXMilliInches,
      cy: region.centerYMilliInches,
      r: region.radiusMilliInches,
      fill: region.sideKey === "player1" ? "#38bdf80b" : "#ef44440b",
      stroke: region.mode === "charge_engagement" ? "#fbbf24"
        : region.sideKey === "player1" ? "#38bdf8" : "#ef4444",
      "stroke-width": 100,
      "stroke-dasharray": region.coverage === "exact" ? "" : "420 260",
      "data-authoritative-threat-layer": `${activeThreatMode}:${index}`,
    }));
  }
  if (showThreatReference && threatRegions.length === 0 && selected?.maxProjectedWeaponRangeMilliInches) {
    world.append(svgElement("circle", {
      cx: selected.xMilliInches,
      cy: selected.yMilliInches,
      r: selected.maxProjectedWeaponRangeMilliInches
        + (Math.max(selected.baseWidthMilliInches || 0, selected.baseDepthMilliInches || 0) / 2),
      fill: "#22d3ee0c",
      stroke: "#67e8f9",
      "stroke-width": 120,
      "stroke-dasharray": "420 260",
      "data-threat-reference": "printed-range-only",
    }));
  }
  if (scene.previewPath.length > 1) {
    world.append(svgElement("polyline", {
      points: scene.previewPath.map((point) => `${point.xMilliInches},${point.yMilliInches}`).join(" "),
      fill: "none", stroke: "#fbbf24", "stroke-width": 160, "stroke-dasharray": "320 180",
    }));
  }
  for (const model of scene.models) world.append(glyphForModel(model));
  for (const placement of scene.previewPlacements) {
    world.append(glyphForModel({ ...placement, id: `preview:${placement.modelId}`, label: placement.modelId }, true));
  }
  board.replaceChildren(background, map, world);
  el["board-empty"].hidden = Boolean(scene.roomId);
  el["model-count"].textContent = `${scene.models.length} models · ${scene.unitAnchors.length} anchors`;
  const selectedMedia = unitMedia(selected?.unitId);
  el["selected-portrait"].hidden = !selectedMedia;
  if (selectedMedia) el["selected-portrait"].src = selectedMedia.activePortraitPath;
  el["selected-unit"].textContent = selected ? `${selected.label} · ${selected.sideKey}` : "No unit selected";
  el["media-status"].textContent = `${voicesEnabled ? "Voices enabled" : "Voice muted"} · ${bgmAudio.src ? (bgmAudio.paused ? "BGM paused" : "BGM playing") : "BGM not loaded"}`;
}

function renderFacts(referee) {
  const rows = [
    ["Match binding", shortHash(referee.matchBindingHash)],
    ["State hash", shortHash(referee.stateHash)],
    ["Journal", shortHash(referee.journalHeadHash)],
    ["Referee key", text(referee.refereeKeyId)],
    ["Public key", shortHash(referee.refereePublicKeyFingerprint)],
    ["Runtime", text(referee.rulesRuntimeBinding?.runtimeId)],
    ["Catalogue", shortHash(referee.rulesRuntimeBinding?.catalogueHash)],
    ["Last receipt", shortHash(referee.lastReceipt?.referenceHash)],
  ];
  replaceChildren(el["referee-facts"], rows.flatMap(([label, value]) => [
    htmlElement("dt", { textContent: label }),
    htmlElement("dd", { textContent: value }),
  ]));
  el["replay-state"].textContent = referee.replayBlocked
    ? "blocked"
    : referee.replayAvailable ? "verified view" : "not checked";
  el["integrity-alert"].hidden = !referee.replayBlocked;
  el["integrity-alert"].textContent = referee.replayBlocked
    ? `Authoritative actions blocked: ${text(referee.replayBlockReason, "replay mismatch")}`
    : "";
}

function renderAgent(agent, controls) {
  el["agent-status"].textContent = `${agent.status} · ${agent.traces.length}`;
  const sessionActive = controls?.lifecycleState === "active";
  // Before a session is active, the select is a user-owned draft. Async room
  // and trace refreshes must not reset it to the last server-projected mode.
  const mode = sessionActive
    ? controls?.mode || "companion"
    : el["agent-mode"].value || controls?.mode || "companion";
  if (sessionActive && AGENT_MODE_INTENTS[mode]) el["agent-mode"].value = mode;
  const selectedIntent = el["agent-intent"].value;
  replaceChildren(el["agent-intent"], (AGENT_MODE_INTENTS[mode] || []).map((intent) => (
    htmlElement("option", { value: intent, textContent: intent })
  )));
  if ((AGENT_MODE_INTENTS[mode] || []).includes(selectedIntent)) {
    el["agent-intent"].value = selectedIntent;
  }
  const busy = controls?.status === "sending"
    || controls?.currentTurn?.state === "waiting_provider";
  const readOnly = controls?.readOnly !== false;
  document.querySelector('[data-command="agent-open"]').disabled =
    !controls || sessionActive || busy || readOnly;
  document.querySelector('[data-command="agent-send"]').disabled =
    !sessionActive || busy || readOnly;
  document.querySelector('[data-command="agent-cancel"]').disabled =
    !sessionActive || !busy || readOnly;
  document.querySelector('[data-command="agent-reconnect"]').disabled =
    !controls?.requiresExplicitReconnect || readOnly;
  document.querySelector('[data-command="agent-end"]').disabled =
    !sessionActive || busy || readOnly;
  el["agent-mode"].disabled = sessionActive || busy || readOnly;
  el["agent-intent"].disabled = !sessionActive || busy || readOnly;
  el["agent-message"].disabled = !sessionActive || busy || readOnly;
  const pending = controls?.pendingConfirmation;
  replaceChildren(el["agent-confirmation"], pending ? [
    htmlElement("strong", { textContent: "Waiting for explicit human confirmation" }),
    htmlElement("p", { textContent: `${pending.candidateId} · ${pending.actionType}` }),
  ] : [
    htmlElement("strong", { textContent: "No Agent Preview awaiting a human" }),
    htmlElement("p", { textContent: "The model cannot Confirm or Apply." }),
  ]);
  document.querySelector('[data-command="agent-confirm"]').disabled =
    !pending || busy || readOnly;
  const identity = agent.identity;
  el["agent-identity"].textContent = identity
    ? `session ${shortHash(identity.sessionRef)} · binding ${shortHash(identity.sessionBindingHash)} · source ${shortHash(identity.sourceAgentProjectionHash)} · epoch ${text(identity.connectionEpoch)}. Raw prompt/output, Provider receipts, credentials and session IDs are excluded.`
    : "Session identity not established. Raw prompt/output, Provider receipts, credentials and session IDs are excluded from this trace lane.";
  if (!agent.traces.length) {
    replaceChildren(el["agent-traces"], [htmlElement("article", { className: "trace" }, [
      htmlElement("strong", { textContent: "No server-projected trace" }),
      htmlElement("p", { textContent: "The live trace contract is waiting for a verified room-bound Agent projection; no client trace injection is accepted." }),
    ])]);
    return;
  }
  replaceChildren(el["agent-traces"], agent.traces.map((trace) => htmlElement("article", { className: "trace" }, [
    htmlElement("strong", { textContent: `${trace.kind || "trace"} · ${trace.state || trace.roleMode || trace.mode}` }),
    htmlElement("p", { textContent: `${trace.roleMode || trace.mode} · ${trace.promptPack} · provider ${trace.providerStatus || "not invoked"}` }),
    htmlElement("p", { textContent: `tools ${trace.harnessToolsCalled.join(" → ") || "none"}` }),
    htmlElement("p", { textContent: trace.failureCode
      ? `failure ${trace.failureCode}`
      : trace.decision
        ? `decision ${trace.decision.actionType} · receipt ${shortHash(trace.decision.decisionReceiptHash || trace.decision.legalSpaceHash)} · confirmation ${trace.confirmationRequired ? "required" : "not requested"}`
        : "no decision channel" }),
  ])));
}

function workbenchCard(title, lines = []) {
  return htmlElement("article", { className: "trace" }, [
    htmlElement("strong", { textContent: title }),
    ...lines.map((line) => htmlElement("p", { textContent: line })),
  ]);
}

function probabilityCards(workbench, unitId) {
  const names = new Map((workbench?.units || []).map((unit) => [unit.id, unit.name]));
  const rows = (workbench?.probability?.rows || []).filter((entry) => entry.attackerUnitId === unitId);
  return rows.slice(0, 16).map((entry) => workbenchCard(
    `${entry.weaponName} → ${names.get(entry.targetUnitId) || entry.targetUnitId}`,
    [
      `E[dmg] ${Number(entry.result.expectedDamage || 0).toFixed(2)} · P(dmg) ${(100 * Number(entry.result.probabilityAtLeastOneDamage || 0)).toFixed(1)}%`,
      `casualty ${entry.result.casualtyProbability === null ? "conditional" : `${(100 * entry.result.casualtyProbability).toFixed(1)}%`} · ${entry.coverage}`,
      `ChanceTicket ${entry.result.chanceTicket.totalDice}D6 · math ${entry.result.mathematicalCoverage} · no roll`,
    ],
  ));
}

function markerActionCards(workbench, canDispatch) {
  const palette = workbench?.tokenMarkerActions;
  const cards = (palette?.actions || []).map((entry) => {
    const button = htmlElement("button", {
      textContent: entry.entryKind === "finite" ? "Authoritative Preview" : "Open Actions",
    });
    button.disabled = entry.enabledForProposal !== true
      || (entry.entryKind === "finite" && !canDispatch);
    button.addEventListener("click", () => {
      if (entry.entryKind === "finite") {
        invoke({ type: "preview_finite", actionKey: entry.actionKey },
          "Sealed Token/Marker preview received");
      } else {
        setDetailPanel("actions");
      }
    });
    return htmlElement("article", { className: "action" }, [
      htmlElement("strong", { textContent: `${entry.verb} · ${entry.type}` }),
      htmlElement("p", { textContent: `${entry.label} · ${entry.bindingStatus}` }),
      htmlElement("p", { textContent: `controller ${text(entry.controller)} · duration ${text(entry.duration)} · stack ${text(entry.stackPolicy)}` }),
      htmlElement("p", { textContent: `trigger ${text(entry.trigger)} · cleanup ${text(entry.cleanupTiming)}` }),
      button,
    ]);
  });
  const unsupported = (palette?.unsupported || []).map((entry) => workbenchCard(
    `${entry.actionType || entry.entryId} · fail-closed`,
    [`Missing ${(entry.missingFields || []).join(", ") || "rules metadata"}`],
  ));
  return [...cards, ...unsupported];
}

function scoreForecastCard(workbench, canDispatch) {
  const forecast = workbench?.scoreForecast;
  if (!forecast) return workbenchCard("If the round ended now", ["Forecast not loaded."]);
  const lines = (forecast.currentScores || []).map((entry) => (
    `${entry.sideKey}: ${entry.score} → ${text(forecast.projectedScores?.[entry.sideKey], "?")}`));
  lines.push(...(forecast.branches || []).slice(0, 2)
    .map((branch) => `${branch.classification}: ${branch.label}`));
  if (forecast.unresolved?.length) lines.push(`Unresolved: ${forecast.unresolved.join(", ")}`);
  lines.push("Read-only server query; score writes require Preview → Confirm → Apply → Receipt/Replay.");
  const action = forecast.scoreWriteEntry;
  const button = htmlElement("button", {
    textContent: action?.entryKind === "finite" ? "Preview scoring action" : "Open Actions",
  });
  button.disabled = !action || (action.entryKind === "finite"
    ? action.enabledForProposal !== true || !canDispatch : false);
  button.addEventListener("click", () => {
    if (action.entryKind === "finite") {
      invoke({ type: "preview_finite", actionKey: action.actionKey },
        "Sealed scoring preview received");
    } else setDetailPanel("actions");
  });
  return htmlElement("article", { className: "trace" }, [
    htmlElement("strong", { textContent: `If the round ended now · ${forecast.forecastMode} / ${forecast.coverage}` }),
    ...lines.map((line) => htmlElement("p", { textContent: line })),
    button,
  ]);
}

function rulesQuickViewCard(workbench, unit) {
  const quick = workbench?.rulesQuickView;
  if (!quick) return workbenchCard("Contextual rules", ["Rules quick view not loaded."]);
  const context = (quick.unitContexts || []).find((entry) => entry.pieceId === unit?.id);
  const refs = context?.actionRefs || quick.actionContexts || [];
  const display = quick.rulesIdentity?.rulesDisplayRef;
  return workbenchCard(`Contextual rules · ${quick.coverage}`, [
    `${context?.name || "Current position"} · ${refs.length} legal action links`,
    ...refs.slice(0, 4).map((entry) => `${entry.actionType || entry.entryId} · ${(entry.ruleAtomIds || []).length} atoms`),
    ...((context?.keywords || []).slice(0, 5).map((entry) => `${entry.name}: ${entry.coverage}`)),
    display ? `Room-pinned ${display.artifactId} · ${shortHash(display.artifactHash)}`
      : "Room-pinned rules artifact unavailable",
    `${quick.coverageReason} · no compatibility fallback`,
  ]);
}

function renderWorkbench(view) {
  const workbench = view.workbench;
  const selectedModel = view.battlefield.models.find((model) => model.id === selectedModelId);
  const unit = workbench?.units?.find((entry) => (
    entry.id === selectedModel?.pieceId
      || entry.models?.some((model) => model.id === selectedModelId)
  ));
  el["unit-coverage"].textContent = workbench?.coverage?.unit?.status || "not loaded";
  el["threat-coverage"].textContent = workbench?.threat?.coverage || "not loaded";
  el["status-coverage"].textContent = workbench?.coverage?.score?.status || "not loaded";
  el["marker-coverage"].textContent = workbench?.tokenMarkerActions?.coverage || "not loaded";
  el["threat-mode"].value = activeThreatMode;
  const weapons = unit ? (workbench?.threat?.perUnit?.find((entry) => entry.unitId === unit.id)?.weapons || []) : [];
  const weaponOptions = [htmlElement("option", { value: "", textContent: "All weapons" }), ...weapons.map((weapon) => (
    htmlElement("option", { value: weapon.weaponId, textContent: weapon.weaponName })
  ))];
  replaceChildren(el["threat-weapon"], weaponOptions);
  if (weapons.some((weapon) => weapon.weaponId === selectedThreatWeaponId)) el["threat-weapon"].value = selectedThreatWeaponId;
  else selectedThreatWeaponId = "";
  replaceChildren(el["workbench-unit"], unit ? [
    workbenchCard(unit.name, [
      `${unit.faction || "unknown faction"} · ${unit.location} · ${unit.currentModels}/${unit.maxModels} models`,
      `HP/model ${text(unit.hpPerModel)} · shield/model ${text(unit.shieldPerModel)} · damage ${unit.damage} · remaining ${text(unit.remainingDurability)}`,
      `weapons ${(unit.weapons || []).map((entry) => `${entry.name} R${text(entry.range)}`).join(", ") || "not projected"}`,
      `upgrades ${(unit.upgrades || []).filter((entry) => entry.selected).map((entry) => entry.name).join(", ") || "none projected"}`,
    ]),
    workbenchCard("Current-rules matchup probability", [
      `${workbench?.probability?.coverage || "not loaded"} · ${(workbench?.probability?.rows || []).length} matrix rows`,
      "Finite D6 distributions only; unresolved effects stay partial and no chance is rolled.",
    ]),
    ...probabilityCards(workbench, unit.id),
    rulesQuickViewCard(workbench, unit),
  ] : [workbenchCard("No unit selected", ["Select a visible model to inspect its viewer-scoped live characteristics."])]);
  const scenario = workbench?.scenario;
  replaceChildren(el["workbench-status"], workbench ? [
    workbenchCard("Current score", (workbench.scoreboard || []).map((entry) => `${entry.playerName}: ${entry.score}`)),
    scoreForecastCard(workbench, view.connection.canDispatchAuthoritativeIntent),
    workbenchCard("Scenario", [
      `${text(scenario?.mission?.name || scenario?.mission?.id, "Mission not projected")} · round ${text(scenario?.round)} · ${text(scenario?.phase)}`,
      `Deployment ${text(scenario?.deployment?.name || scenario?.deployment?.id, "not projected")}`,
      `Battlefield ${(workbench.deployment?.battlefield || []).join(", ") || "—"}`,
      `Reserve ${(workbench.deployment?.reserve || []).join(", ") || "—"}`,
      `Undeployed ${(workbench.deployment?.undeployed || []).join(", ") || "—"}`,
    ]),
    rulesQuickViewCard(workbench, unit),
  ] : [workbenchCard("Workbench not loaded", ["Bind a room to load the current authoritative revision."])]);
  replaceChildren(el["workbench-threat"], [workbenchCard("Threat layers", [
    workbench?.threat?.reason || "Authoritative threat query not loaded.",
    "The printed-range reference is presentation-only and is never labelled move-and-fire or charge threat.",
  ])]);
  const palette = workbench?.tokenMarkerActions;
  const denominator = palette?.ruleGraphIndex;
  replaceChildren(el["workbench-markers"], [
    workbenchCard("Current FAQ Token / Marker contract", [
      palette?.coverageReason || "LegalSpace-classified action palette not loaded.",
      `binding ${denominator?.binding?.status || "not loaded"}`,
      `${denominator?.faqTokenMarkerEntryCount || 0} FAQ entries / ${denominator?.faqTokenMarkerAtomCount || 0} FAQ atoms`,
      `${denominator?.directlyNamedTokenMarkerAtomCount || 0} base named atoms / ${denominator?.genericTokenMarkerPrimitiveAtomCount || 0} base primitives (overlap; not action count)`,
      `${palette?.currentLegalSpace?.classifiedCount || 0} classified / ${palette?.currentLegalSpace?.enabledForProposalCount || 0} enabled / ${palette?.currentLegalSpace?.unclassifiedCount || 0} fail-closed`,
      "No client-side token, marker, damage, shield, casualty, status, deployment or score mutation is permitted.",
    ]),
    workbenchCard("Authoritative battle sheet", Object.values(workbench?.writeSheet?.fields || {})
      .map((entry) => `${entry.field}: ${entry.currentLegalActionCount} current actions`)),
    ...markerActionCards(workbench, view.connection.canDispatchAuthoritativeIntent),
  ]);
}

async function invoke(intent, label) {
  const result = await runtime.dispatch(intent);
  notify(result.ok ? label : `Blocked: ${result.rejection?.code || "request rejected"}`);
  return result;
}

function renderActions(view) {
  const scene = view.battlefield;
  el["action-count"].textContent = `${scene.finiteActions.length} finite · ${scene.parameterDomains.length} domains`;
  replaceChildren(el.actions, scene.finiteActions.map((action) => {
    const button = htmlElement("button", { textContent: "Preview" });
    button.disabled = !view.connection.canDispatchAuthoritativeIntent;
    button.addEventListener("click", () => invoke({ type: "preview_finite", actionKey: action.actionKey }, "Sealed preview received"));
    return htmlElement("article", { className: "action" }, [
      htmlElement("strong", { textContent: action.label }),
      htmlElement("p", { textContent: `${action.confirmationClass || "confirmation policy from server"} · key ${shortHash(action.actionKey)}` }),
      button,
    ]);
  }));
  const previousDomain = el.domain.value;
  const options = scene.parameterDomains.map((domain) => htmlElement("option", {
    value: domain.domainId,
    textContent: `${domain.actionType} · ${domain.support}`,
  }));
  replaceChildren(el.domain, options);
  if (scene.parameterDomains.some((domain) => domain.domainId === previousDomain)) el.domain.value = previousDomain;
  const preview = view.shared.pendingPreview;
  el.preview.classList.toggle("is-ready", Boolean(preview));
  replaceChildren(el.preview, preview ? [
    htmlElement("strong", { textContent: "Sealed Preview awaiting human confirmation" }),
    htmlElement("p", { textContent: `preview ${text(preview.previewId)} · content ${shortHash(preview.previewSeal?.contentHash)} · proposal ${shortHash(preview.core?.proposalHash)}` }),
  ] : [
    htmlElement("strong", { textContent: "No sealed preview" }),
    htmlElement("p", { textContent: "Selection and parameter drafts are local. Only a server-returned sealed preview may reach confirmation." }),
  ]);
  const confirm = document.querySelector('[data-command="confirm"]');
  confirm.disabled = !preview || !view.connection.canDispatchAuthoritativeIntent;
}

function renderHarness(harness) {
  const rows = [
    ["Loop", harness.harnessLoopUsed ? "agentic harness active" : "inactive"],
    ["Prompt routes", harness.promptPackRoutes.join(", ") || "none"],
    ["Tools observed", harness.harnessToolsCalled.join(", ") || "none"],
    ["Memory", harness.memoryTraceEvidence],
    ["Training candidates", String(harness.trainingTraceCandidates.length)],
    ["UI evidence", harness.uiTraceEvidence],
  ];
  replaceChildren(el.harness, rows.map(([label, value]) => htmlElement("div", {}, [
    htmlElement("span", { textContent: label }),
    htmlElement("strong", { textContent: value }),
  ])));
}

function render(view) {
  el.connection.textContent = `${view.connection.phase}${view.connection.online ? " · online" : " · offline"}`;
  el["shared-hash"].textContent = `shared view ${shortHash(view.shared.sharedViewHash)}`;
  el["room-title"].textContent = view.shared.roomProjection?.room?.title || "No room bound";
  el["state-revision"].textContent = `state ${text(view.referee.stateRevision)}`;
  renderBoard(view);
  renderFacts(view.referee);
  renderAgent(view.agent, view.agentControls);
  renderActions(view);
  renderWorkbench(view);
  renderHarness(view.harness);
  playValidatedReceiptCues(view);
}

el["threat-toggle"].addEventListener("change", () => {
  showThreatReference = el["threat-toggle"].checked;
  render(runtime.read());
});

el["threat-mode"].addEventListener("change", () => {
  activeThreatMode = el["threat-mode"].value;
  showThreatReference = true;
  el["threat-toggle"].checked = true;
  render(runtime.read());
});

el["threat-weapon"].addEventListener("change", () => {
  selectedThreatWeaponId = el["threat-weapon"].value;
  showThreatReference = true;
  el["threat-toggle"].checked = true;
  render(runtime.read());
});

el["agent-mode"].addEventListener("change", () => {
  const mode = el["agent-mode"].value;
  replaceChildren(el["agent-intent"], (AGENT_MODE_INTENTS[mode] || []).map((intent) => (
    htmlElement("option", { value: intent, textContent: intent })
  )));
});

el["bgm-file"].addEventListener("change", () => {
  const file = el["bgm-file"].files?.[0];
  if (!file) return;
  if (bgmObjectUrl) URL.revokeObjectURL(bgmObjectUrl);
  bgmObjectUrl = URL.createObjectURL(file);
  bgmAudio.src = bgmObjectUrl;
  document.querySelector('[data-command="bgm-toggle"]').disabled = false;
  render(runtime.read());
});

el.volume.addEventListener("input", () => {
  const volume = Number(el.volume.value);
  bgmAudio.volume = volume;
  voiceAudio.volume = Math.min(1, volume + 0.25);
});

document.addEventListener("click", async (event) => {
  const detailTab = event.target.closest("[data-detail-tab]")?.dataset.detailTab;
  if (detailTab) {
    setDetailPanel(detailTab);
    return;
  }
  const command = event.target.closest("[data-command]")?.dataset.command;
  if (!command) return;
  try {
    if (command === "bind") {
      const roomId = el["room-id"].value.trim();
      const seatToken = el["seat-token"].value;
      el["seat-token"].value = "";
      const result = await runtime.bootstrap({
        route: { roomId },
        principal: seatToken ? { seatToken } : {},
        locale: navigator.language || "en",
      });
      notify(result.ok ? "Authoritative room projection bound" : `Blocked: ${result.rejection?.code || "bind failed"}`);
      if (result.ok) await invoke({ type: "load_battle_workbench" }, "Battle workbench loaded");
    } else if (command === "refresh") {
      const result = await invoke({ type: "refresh" }, "Projection refreshed");
      if (result.ok) await invoke({ type: "load_battle_workbench" }, "Battle workbench refreshed");
    }
    else if (command === "legal") {
      const result = await invoke({ type: "load_legal_space" }, "LegalSpace loaded");
      if (result.ok) setDetailPanel("actions");
    }
    else if (command === "replay") {
      const result = await invoke({ type: "read_replay" }, "Replay projection verified");
      if (result.ok) setDetailPanel("referee");
    } else if (command === "revalidate") {
      const result = await invoke({ type: "revalidate_authority" }, "Authority revalidated");
      if (result.ok) setDetailPanel("referee");
    }
    else if (command === "confirm") {
      const previewId = runtime.read().shared.pendingPreview?.previewId;
      if (previewId) {
        const result = await invoke({ type: "confirm_and_apply_preview", previewId }, "Confirmed action applied and replay checked");
        if (result.ok) setDetailPanel("referee");
      }
    } else if (command === "preview-parameterized") {
      const domainId = el.domain.value;
      const parameters = JSON.parse(el.parameters.value || "{}");
      await invoke({ type: "preview_parameterized", domainId, parameters }, "Parameterized sealed preview received");
    } else if (command === "voice-toggle") {
      voicesEnabled = !voicesEnabled;
      event.target.textContent = voicesEnabled ? "Mute voices" : "Enable voices";
      render(runtime.read());
      const selected = runtime.read().battlefield.models.find((model) => model.id === selectedModelId);
      if (voicesEnabled) await playUnitVoice(selected, "selected");
    } else if (command === "bgm-toggle") {
      if (!bgmAudio.src) return;
      if (bgmAudio.paused) {
        await bgmAudio.play();
        event.target.textContent = "Pause BGM";
      } else {
        bgmAudio.pause();
        event.target.textContent = "Play BGM";
      }
      render(runtime.read());
    } else if (command === "agent-open") {
      await invoke({
        type: "open_agent_session",
        mode: el["agent-mode"].value,
      }, "Online Adjutant session opened");
    } else if (command === "agent-send") {
      const message = el["agent-message"].value.trim();
      if (!message) return;
      const result = await invoke({
        type: "send_agent_message",
        intent: el["agent-intent"].value,
        message,
      }, "Agent turn completed; safe trace refreshed");
      if (result.ok) el["agent-message"].value = "";
    } else if (command === "agent-cancel") {
      await invoke({ type: "cancel_agent_turn" }, "Agent turn cancelled");
    } else if (command === "agent-reconnect") {
      await invoke({ type: "reconnect_agent_session" }, "Agent session reconnected");
    } else if (command === "agent-end") {
      await invoke({ type: "end_agent_session" }, "Agent session ended");
    } else if (command === "agent-confirm") {
      const previewId = runtime.read().agentControls?.pendingConfirmation?.previewId;
      if (previewId) {
        await invoke({ type: "confirm_agent_preview", previewId },
          "Human confirmed Agent Preview; room receipt refreshed");
      }
    }
  } catch (error) {
    notify(`Blocked: ${error?.code || error?.message || "operation failed"}`);
  }
});

runtime.subscribe(render);
setDetailPanel(activeDetailPanel);
render(runtime.read());

const initialRoom = new URL(globalThis.location.href).searchParams.get("room");
if (initialRoom) el["room-id"].value = initialRoom;
