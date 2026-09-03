import { createStarcraftTmgBattleLabRuntime } from "./battle-lab-runtime-v1.mjs";

const NS = "http://www.w3.org/2000/svg";
const runtime = createStarcraftTmgBattleLabRuntime({
  baseUrl: globalThis.BATTLE_LAB_API_ORIGIN || "",
});
let selectedModelId = null;
let toastTimer = null;

const el = Object.fromEntries([
  "connection", "shared-hash", "room-id", "seat-token", "room-title",
  "state-revision", "model-count", "board", "board-empty", "replay-state",
  "referee-facts", "integrity-alert", "agent-status", "agent-traces",
  "action-count", "actions", "domain", "parameters", "preview", "harness",
  "toast",
].map((name) => [name, document.querySelector(`[data-${name}]`)]));

function text(value, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
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

function glyphForArea(area) {
  if (!area.geometryRenderable || !area.widthMilliInches || !area.depthMilliInches) return null;
  const common = {
    fill: area.kind === "terrain" ? "#33415588" : area.kind === "marker" ? "#fbbf2440" : "#22d3ee40",
    stroke: area.kind === "terrain" ? "#64748b" : area.kind === "marker" ? "#fbbf24" : "#22d3ee",
    "stroke-width": 110,
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
  if (!preview) {
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", `${model.label}; ${model.sideKey}; select for inspection only`);
    node.addEventListener("click", () => {
      selectedModelId = model.id;
      render(runtime.read());
    });
  }
  return node;
}

function renderBoard(scene) {
  const board = el.board;
  board.setAttribute("viewBox", `0 0 ${scene.widthMilliInches} ${scene.heightMilliInches}`);
  const background = svgElement("rect", {
    x: 0, y: 0, width: scene.widthMilliInches, height: scene.heightMilliInches,
    fill: "#07121b", stroke: "#47677a", "stroke-width": 120,
  });
  const world = svgElement("g", {
    transform: `translate(0 ${scene.heightMilliInches}) scale(1 -1)`,
  });
  for (const area of [...scene.terrain, ...scene.markers, ...scene.tokens]) {
    const glyph = glyphForArea(area);
    if (glyph) world.append(glyph);
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
  board.replaceChildren(background, world);
  el["board-empty"].hidden = Boolean(scene.roomId);
  el["model-count"].textContent = `${scene.models.length} models · ${scene.unitAnchors.length} anchors`;
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

function renderAgent(agent) {
  el["agent-status"].textContent = `${agent.status} · ${agent.traces.length}`;
  if (!agent.traces.length) {
    replaceChildren(el["agent-traces"], [htmlElement("article", { className: "trace" }, [
      htmlElement("strong", { textContent: "No server-projected trace" }),
      htmlElement("p", { textContent: "The view contract is mounted. Ticket 15 will connect real room-bound Agent sessions; no client trace injection is accepted." }),
    ])]);
    return;
  }
  replaceChildren(el["agent-traces"], agent.traces.map((trace) => htmlElement("article", { className: "trace" }, [
    htmlElement("strong", { textContent: `${trace.roleMode || trace.mode} · ${trace.promptPack}` }),
    htmlElement("p", { textContent: `tools ${trace.harnessToolsCalled.join(" → ") || "none"}` }),
    htmlElement("p", { textContent: trace.decision
      ? `decision ${trace.decision.actionType} · ${shortHash(trace.decision.legalSpaceHash)} · confirmation ${trace.confirmationRequired ? "required" : "not requested"}`
      : `provider ${trace.providerStatus || "not invoked"} · no decision channel` }),
  ])));
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
  renderBoard(view.battlefield);
  renderFacts(view.referee);
  renderAgent(view.agent);
  renderActions(view);
  renderHarness(view.harness);
}

document.addEventListener("click", async (event) => {
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
    } else if (command === "refresh") await invoke({ type: "refresh" }, "Projection refreshed");
    else if (command === "legal") await invoke({ type: "load_legal_space" }, "LegalSpace loaded");
    else if (command === "replay") await invoke({ type: "read_replay" }, "Replay projection verified");
    else if (command === "revalidate") await invoke({ type: "revalidate_authority" }, "Authority revalidated");
    else if (command === "confirm") {
      const previewId = runtime.read().shared.pendingPreview?.previewId;
      if (previewId) await invoke({ type: "confirm_and_apply_preview", previewId }, "Confirmed action applied and replay checked");
    } else if (command === "preview-parameterized") {
      const domainId = el.domain.value;
      const parameters = JSON.parse(el.parameters.value || "{}");
      await invoke({ type: "preview_parameterized", domainId, parameters }, "Parameterized sealed preview received");
    }
  } catch (error) {
    notify(`Blocked: ${error?.code || error?.message || "operation failed"}`);
  }
});

runtime.subscribe(render);
render(runtime.read());

const initialRoom = new URL(globalThis.location.href).searchParams.get("room");
if (initialRoom) el["room-id"].value = initialRoom;
