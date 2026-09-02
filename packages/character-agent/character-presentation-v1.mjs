import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { assertStarcraftTmgCharacterContract } from "./contracts-v1.mjs";

export const STARCRAFT_TMG_CHARACTER_PRESENTATION_VERSION =
  "starcraft_tmg_character_presentation_v1";

const HASH = /^[a-f0-9]{64}$/u;
const SURFACES = new Set(["web", "app"]);
const ENVIRONMENTS = new Set(["development", "public"]);

const LABELS = Object.freeze({
  "zh-CN": Object.freeze({
    title: "战术副官",
    persona: "角色时代",
    timeline: "时间线",
    knowledge: "知识上限",
    spoiler: "剧透上限",
    context: "当前游戏上下文",
    dynamic: "动态通讯头像",
    static: "静态时代头像",
    fallback: "Project D 原创副官回退",
    rights: "凯瑞甘衍生视觉仅限开发预览，尚未通过公开发布权审核。",
    offline: "当前离线：显示密封快照，角色切换为只读。",
    unavailable: "视觉不可用",
    selected: "已选择",
    blocked: "受知识或剧透上限限制",
  }),
  "en-US": Object.freeze({
    title: "Tactical Adjutant",
    persona: "Character era",
    timeline: "Timeline",
    knowledge: "Knowledge ceiling",
    spoiler: "Spoiler ceiling",
    context: "Active game context",
    dynamic: "Dynamic communications portrait",
    static: "Static era portrait",
    fallback: "Project D original adjutant fallback",
    rights: "Kerrigan-derived visuals are development-only and have not passed public-release rights review.",
    offline: "Offline: rendering a sealed snapshot; persona selection is read-only.",
    unavailable: "Portrait unavailable",
    selected: "Selected",
    blocked: "Blocked by knowledge or spoiler ceiling",
  }),
});

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.includes(key)));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requireHash(value, code) {
  if (!HASH.test(String(value || ""))) fail(code);
  return value;
}

function safeAssetPath(value, code) {
  const normalized = String(value || "").replaceAll("\\", "/");
  if (!normalized.startsWith("assets/characters/")
    || normalized.startsWith("/") || normalized.includes("../")) fail(code);
  return normalized;
}

function resolveLocale(requested, fallbacks = []) {
  const candidates = [requested, ...fallbacks, "en-US"].map((value) => String(value || ""));
  for (const candidate of candidates) {
    if (LABELS[candidate]) return { locale: candidate, fallbackUsed: candidate !== requested };
    if (candidate.toLowerCase().startsWith("zh")) return { locale: "zh-CN", fallbackUsed: candidate !== "zh-CN" };
    if (candidate.toLowerCase().startsWith("en")) return { locale: "en-US", fallbackUsed: candidate !== "en-US" };
  }
  return { locale: "en-US", fallbackUsed: true };
}

function viewport(widthInput) {
  const width = Number(widthInput);
  if (!Number.isFinite(width) || width < 240 || width > 10000) fail("CHARACTER_PRESENTATION_VIEWPORT_INVALID");
  if (width >= 1024) return { className: "desktop", columns: 2, personaControl: "side_rail" };
  if (width >= 640) return { className: "tablet", columns: 1, personaControl: "horizontal_scroll" };
  return { className: "mobile", columns: 1, personaControl: "stacked_list" };
}

function verifySelectorView(view) {
  if (view?.schemaVersion !== "starcraft_tmg_character_persona_selector_v1.view"
    || hashStarcraftTmgContract(without(view, ["viewHash"])) !== view.viewHash
    || view.personaSelectionMode !== "exactly_one"
    || view.personaOptions?.filter((entry) => entry.selected).length !== 1
    || view.rulesAuthority !== "external_rules_service"
    || view.roomMutationAuthority !== false
    || view.trainingTruth !== false) {
    fail("CHARACTER_PRESENTATION_SELECTOR_VIEW_INVALID");
  }
  return view;
}

function verifyStaticPortrait(ref) {
  if (!ref) return null;
  const verified = {
    id: String(ref.id || "").trim(),
    path: safeAssetPath(ref.path, "CHARACTER_PRESENTATION_STATIC_PATH_INVALID"),
    hash: requireHash(ref.hash, "CHARACTER_PRESENTATION_STATIC_HASH_INVALID"),
    receiptHash: requireHash(ref.receiptHash, "CHARACTER_PRESENTATION_STATIC_RECEIPT_INVALID"),
    width: Number(ref.width),
    height: Number(ref.height),
    mimeType: String(ref.mimeType || ""),
  };
  if (!verified.id || !Number.isSafeInteger(verified.width) || verified.width < 1
    || !Number.isSafeInteger(verified.height) || verified.height < 1
    || verified.mimeType !== "image/png") fail("CHARACTER_PRESENTATION_STATIC_METADATA_INVALID");
  return verified;
}

function verifyDynamicPortraitView(selectorView, portraitView) {
  const ref = selectorView.selectedVisual.dialoguePortraitManifestRef;
  if (!ref) {
    if (portraitView) fail("CHARACTER_PRESENTATION_UNBOUND_DYNAMIC_VIEW");
    return null;
  }
  if (!portraitView) return null;
  if (portraitView.ok !== true
    || portraitView.characterId !== selectorView.characterRef.id
    || portraitView.manifestHash !== ref.hash
    || hashStarcraftTmgContract(without(portraitView, ["viewHash"])) !== portraitView.viewHash
    || portraitView.trainingTruth !== false
    || !Array.isArray(portraitView.frameSchedule)
    || portraitView.frameSchedule.length < 1) {
    fail("CHARACTER_PRESENTATION_DYNAMIC_VIEW_INVALID");
  }
  for (const frame of portraitView.frameSchedule) {
    safeAssetPath(frame.outputPath, "CHARACTER_PRESENTATION_DYNAMIC_PATH_INVALID");
    requireHash(frame.contentHash, "CHARACTER_PRESENTATION_DYNAMIC_FRAME_HASH_INVALID");
  }
  return portraitView;
}

function visualForOption(option, environment, characterPublicAllowed) {
  const staticPortrait = verifyStaticPortrait(option.visual?.staticPortraitRef);
  if (!option.available || !staticPortrait || option.visual?.visualStatus !== "available_development") return null;
  if (environment === "public"
    && (characterPublicAllowed !== true || option.visual?.publicReleaseAllowed !== true)) return null;
  return staticPortrait;
}

export function createStarcraftTmgCharacterPresentationViewModelV1(input = {}) {
  const surface = String(input.surface || "");
  if (!SURFACES.has(surface)) fail("CHARACTER_PRESENTATION_SURFACE_INVALID");
  const environment = String(input.environment || "development");
  if (!ENVIRONMENTS.has(environment)) fail("CHARACTER_PRESENTATION_ENVIRONMENT_INVALID");
  const character = assertStarcraftTmgCharacterContract(input.characterPackage, "character-package");
  const selectorView = verifySelectorView(input.selectorView);
  if (character.characterId !== selectorView.characterRef.id
    || character.integrity.hash !== selectorView.characterRef.hash) {
    fail("CHARACTER_PRESENTATION_CHARACTER_SELECTOR_MISMATCH");
  }
  const localeResolution = resolveLocale(input.locale, input.localeFallbacks);
  const labels = LABELS[localeResolution.locale];
  const layout = viewport(input.viewportWidth);
  const selected = selectorView.personaOptions.find((entry) => entry.selected);
  const selectedStatic = verifyStaticPortrait(selectorView.selectedVisual?.staticPortraitRef);
  const dynamicView = verifyDynamicPortraitView(selectorView, input.dialoguePortraitView || null);
  const selectedPublicAllowed = character.rights.publicReleaseAllowed === true
    && selectorView.selectedVisual?.publicReleaseAllowed === true;
  const derivedAllowed = selectorView.selectedVisual?.visualStatus === "available_development"
    && Boolean(selectedStatic)
    && (environment === "development" || selectedPublicAllowed);
  const reducedMotion = input.reducedMotion === true;

  let portrait;
  if (!derivedAllowed) {
    portrait = {
      kind: "first_party_fallback",
      characterId: character.fallbackCharacterId,
      label: labels.fallback,
      asset: null,
      dynamic: false,
      animation: null,
      reason: environment === "public" ? "derived_visual_not_publicly_releasable" : "selected_visual_unavailable",
    };
  } else if (dynamicView) {
    const frameSchedule = reducedMotion
      ? [{
        role: dynamicView.primaryFrame.role,
        durationMs: 0,
        frameId: dynamicView.primaryFrame.frameId,
        outputPath: safeAssetPath(dynamicView.primaryFrame.outputPath, "CHARACTER_PRESENTATION_PRIMARY_PATH_INVALID"),
        contentHash: requireHash(dynamicView.primaryFrame.contentHash, "CHARACTER_PRESENTATION_PRIMARY_HASH_INVALID"),
      }]
      : dynamicView.frameSchedule.map((frame) => ({
        role: frame.role,
        durationMs: frame.durationMs,
        frameId: frame.frameId,
        outputPath: safeAssetPath(frame.outputPath, "CHARACTER_PRESENTATION_DYNAMIC_PATH_INVALID"),
        contentHash: frame.contentHash,
      }));
    portrait = {
      kind: "dynamic",
      characterId: character.characterId,
      label: labels.dynamic,
      asset: selectedStatic,
      dynamic: true,
      animation: {
        mode: dynamicView.mode,
        phase: dynamicView.phase,
        visualCue: dynamicView.visualCue,
        liveRegion: dynamicView.accessibility.liveRegion,
        reducedMotion,
        frameSchedule,
        scheduleHash: hashStarcraftTmgContract(frameSchedule),
        stateHash: dynamicView.stateHash,
        viewHash: dynamicView.viewHash,
        manifestHash: dynamicView.manifestHash,
      },
      reason: null,
    };
  } else {
    portrait = {
      kind: "static",
      characterId: character.characterId,
      label: labels.static,
      asset: selectedStatic,
      dynamic: false,
      animation: null,
      reason: selectorView.selectedVisual?.dialoguePortraitManifestRef
        ? "dynamic_manifest_available_but_runtime_view_not_supplied"
        : "persona_has_static_era_anchor_only",
    };
  }

  const readOnly = selectorView.connectivity === "offline";
  const personaOptions = selectorView.personaOptions.map((option) => ({
    worldbookId: option.worldbookId,
    title: option.title,
    personaState: option.personaState,
    timeline: clone(option.timeline),
    knowledgeRank: option.knowledgeRank,
    spoilerRank: option.spoilerRank,
    selected: option.selected,
    available: option.available,
    disabledReason: option.disabledReason,
    selectEnabled: !readOnly && option.available && !option.selected,
    thumbnail: visualForOption(option, environment, character.rights.publicReleaseAllowed),
  }));
  const content = {
    character: {
      id: character.characterId,
      version: character.version,
      hash: character.integrity.hash,
      displayName: character.displayName,
      productRole: character.productRole,
      productRoleIsCanon: character.productRoleIsCanon,
      description: character.description,
    },
    selector: {
      catalogueHash: selectorView.catalogueHash,
      stateHash: selectorView.stateHash,
      viewHash: selectorView.viewHash,
      revision: selectorView.revision,
      connectivity: selectorView.connectivity,
      readOnly,
      personaSelectionMode: "exactly_one",
      personaOptions,
      selectedPersonaWorldbookId: selected.worldbookId,
      contextOptions: selectorView.contextOptions.map((entry) => ({
        worldbookId: entry.worldbookId,
        title: entry.title,
        selected: entry.selected,
      })),
      spoilerCeilingRank: selectorView.spoilerCeilingRank,
      knowledgeCeilingRank: selectorView.knowledgeCeilingRank,
      fallbackReason: selectorView.fallbackReason,
    },
    portrait,
    rights: {
      environment,
      characterPublicReleaseAllowed: character.rights.publicReleaseAllowed === true,
      derivedVisualPublicReleaseAllowed: selectedPublicAllowed,
      notice: labels.rights,
      publicFallbackCharacterId: character.fallbackCharacterId,
    },
    actions: {
      emitsSelectorIntentOnly: true,
      requiresExpectedRevision: true,
      canApplyRoomAction: false,
      canChangeRules: false,
    },
  };
  const model = {
    schemaVersion: STARCRAFT_TMG_CHARACTER_PRESENTATION_VERSION,
    surface,
    locale: localeResolution.locale,
    localeFallbackUsed: localeResolution.fallbackUsed,
    labels,
    content,
    layout: {
      ...layout,
      viewportWidth: Number(input.viewportWidth),
      minimumTouchTargetCssPx: 44,
      responsiveWithoutHorizontalOverflow: true,
      portraitAspectRatio: 1,
      portraitObjectFit: "cover",
      imageRendering: "auto",
      boardGeometryIsolation: {
        changesWorldToCssScale: false,
        changesViewportFit: false,
        changesBoardPanOrZoom: false,
        changesBaseOrTokenGeometry: false,
        changesRulesCollision: false,
      },
    },
    accessibility: {
      landmark: "region",
      headingLevel: 2,
      portraitHasAccessibleLabel: true,
      personaControlRole: "radiogroup",
      statusLiveRegion: portrait.animation?.liveRegion || "off",
      reducedMotionSupported: true,
      minimumTouchTargetCssPx: 44,
    },
    rulesAuthority: "external_rules_service",
    roomMutationAuthority: false,
    trainingTruth: false,
  };
  model.sharedContentHash = hashStarcraftTmgContract(content);
  model.viewModelHash = hashStarcraftTmgContract(without(model, ["viewModelHash"]));
  return deepFreeze(model);
}

export const STARCRAFT_TMG_CHARACTER_PRESENTATION_CSS_V1 = `
.sc-character{box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr);gap:16px;max-inline-size:100%;overflow:hidden;color:#e8e1cf;background:#080b09;border:1px solid #30382f;padding:16px}
.sc-character *{box-sizing:border-box}.sc-character__hero{display:grid;gap:12px;align-content:start}.sc-character__portrait{position:relative;aspect-ratio:1;overflow:hidden;background:#111712;border:1px solid #53604e}.sc-character__portrait img{display:block;inline-size:100%;block-size:100%;object-fit:cover;image-rendering:auto}.sc-character__portrait::after{content:"";pointer-events:none;position:absolute;inset:0;background:repeating-linear-gradient(180deg,transparent 0 3px,#0002 4px);mix-blend-mode:multiply}.sc-character__fallback{display:grid;place-items:center;block-size:100%;padding:24px;text-align:center;color:#b5bea9}.sc-character__status{min-block-size:1.5em;color:#c6a760}.sc-character__personas{display:grid;grid-template-columns:1fr;gap:8px;margin:0;padding:0;border:0}.sc-character__persona{display:grid;grid-template-columns:48px minmax(0,1fr);align-items:center;gap:10px;inline-size:100%;min-block-size:52px;padding:4px 10px;border:1px solid #3d493b;background:#141a15;color:inherit;text-align:start}.sc-character__persona[aria-checked="true"]{border-color:#c6a760;background:#25271c}.sc-character__persona:disabled{opacity:.5}.sc-character__persona img{inline-size:44px;block-size:44px;object-fit:cover}.sc-character button{min-block-size:44px;touch-action:manipulation}.sc-character__meta{display:grid;grid-template-columns:minmax(7rem,.4fr) minmax(0,1fr);gap:6px 12px}.sc-character__meta dd{margin:0;overflow-wrap:anywhere}.sc-character__rights{color:#aeb6a6}
@media(max-width:639px){.sc-character{padding:12px}.sc-character__meta{grid-template-columns:1fr}.sc-character__personas{grid-template-columns:1fr}}
@media(min-width:640px) and (max-width:1023px){.sc-character__personas{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:1024px){.sc-character{grid-template-columns:minmax(280px,.8fr) minmax(420px,1.2fr)}.sc-character__personas{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){.sc-character__portrait::after{background:repeating-linear-gradient(180deg,transparent 0 4px,#0001 5px)}}
`;

function frameScheduleAttribute(portrait) {
  if (!portrait.animation) return "";
  return escapeHtml(JSON.stringify(portrait.animation.frameSchedule));
}

export function renderStarcraftTmgCharacterPresentationHtmlV1(model) {
  const { content, labels } = model;
  const selected = content.selector.personaOptions.find((entry) => entry.selected);
  const portrait = content.portrait;
  const portraitBody = portrait.asset
    ? `<img src="${escapeHtml(portrait.asset.path)}" alt="${escapeHtml(`${content.character.displayName} · ${selected.title}`)}" data-sc-character-portrait-image>`
    : `<div class="sc-character__fallback" role="img" aria-label="${escapeHtml(portrait.label)}">${escapeHtml(portrait.label)}</div>`;
  const options = content.selector.personaOptions.map((option) => {
    const disabled = option.selectEnabled ? "" : " disabled aria-disabled=\"true\"";
    const thumbnail = option.thumbnail
      ? `<img src="${escapeHtml(option.thumbnail.path)}" alt="" aria-hidden="true">`
      : `<span aria-hidden="true">${String(option.spoilerRank).padStart(2, "0")}</span>`;
    return `<button type="button" class="sc-character__persona" role="radio" aria-checked="${option.selected}" data-persona-worldbook-id="${escapeHtml(option.worldbookId)}" data-expected-revision="${content.selector.revision}"${disabled}>${thumbnail}<span><strong>${escapeHtml(option.title)}</strong><br><small>${escapeHtml(`${option.timeline.start} → ${option.timeline.end}`)}</small></span></button>`;
  }).join("\n");
  return `<section class="sc-character" data-layout="${model.layout.className}" role="region" aria-labelledby="sc-character-title">
  <div class="sc-character__hero">
    <header><p>${escapeHtml(labels.title)}</p><h2 id="sc-character-title">${escapeHtml(content.character.displayName)}</h2><p>${escapeHtml(content.character.description)}</p></header>
    <figure class="sc-character__portrait" data-sc-character-portrait data-dynamic="${portrait.dynamic}" data-frame-schedule="${frameScheduleAttribute(portrait)}" data-schedule-hash="${escapeHtml(portrait.animation?.scheduleHash || "")}">${portraitBody}<figcaption hidden>${escapeHtml(portrait.label)}</figcaption></figure>
    <p class="sc-character__status" role="status" aria-live="${escapeHtml(portrait.animation?.liveRegion || "off")}">${escapeHtml(`${portrait.label} · ${selected.title}`)}</p>
    ${content.selector.readOnly ? `<p role="status">${escapeHtml(labels.offline)}</p>` : ""}
    <p class="sc-character__rights">${escapeHtml(content.rights.notice)}</p>
  </div>
  <div>
    <fieldset class="sc-character__personas" role="radiogroup" aria-label="${escapeHtml(labels.persona)}">${options}</fieldset>
    <dl class="sc-character__meta"><dt>${escapeHtml(labels.timeline)}</dt><dd>${escapeHtml(`${selected.timeline.start} → ${selected.timeline.end}`)}</dd><dt>${escapeHtml(labels.spoiler)}</dt><dd>${content.selector.spoilerCeilingRank}</dd><dt>${escapeHtml(labels.knowledge)}</dt><dd>${content.selector.knowledgeCeilingRank}</dd><dt>${escapeHtml(labels.context)}</dt><dd>${escapeHtml(content.selector.contextOptions.filter((entry) => entry.selected).map((entry) => entry.title).join(", "))}</dd></dl>
  </div>
</section>`;
}

export const STARCRAFT_TMG_CHARACTER_PRESENTATION_WEB_RUNTIME_V1 = `
(()=>{for(const root of document.querySelectorAll('[data-sc-character-portrait][data-dynamic="true"]')){const image=root.querySelector('[data-sc-character-portrait-image]');if(!image)continue;let frames=[];try{frames=JSON.parse(root.dataset.frameSchedule||'[]')}catch{continue}if(!Array.isArray(frames)||frames.length<2||matchMedia('(prefers-reduced-motion: reduce)').matches)continue;let index=0,timer;const tick=()=>{const frame=frames[index%frames.length];image.src=frame.outputPath;index+=1;timer=setTimeout(tick,Math.max(80,Number(frame.durationMs)||80))};const stop=()=>clearTimeout(timer);root.addEventListener('pointerenter',stop);root.addEventListener('pointerleave',tick);root.addEventListener('focusin',stop);root.addEventListener('focusout',tick);tick()}})();
`;

export function renderStarcraftTmgCharacterPresentationNativeTreeV1(model) {
  const selected = model.content.selector.personaOptions.find((entry) => entry.selected);
  const portrait = model.content.portrait;
  return deepFreeze({
    type: model.layout.className === "desktop" ? "CharacterSplitPanel" : "CharacterStack",
    accessibilityRole: "summary",
    accessibilityLabel: `${model.labels.title}: ${model.content.character.displayName}`,
    semanticContentHash: model.sharedContentHash,
    minTouchTarget: 44,
    children: [
      { type: "Heading", level: 2, text: model.content.character.displayName },
      portrait.asset
        ? {
          type: portrait.dynamic ? "AnimatedImage" : "Image",
          sourcePath: portrait.asset.path,
          sourceHash: portrait.asset.hash,
          accessibilityLabel: `${model.content.character.displayName} · ${selected.title}`,
          resizeMode: "cover",
          aspectRatio: 1,
          animation: clone(portrait.animation),
        }
        : { type: "FallbackPortrait", characterId: portrait.characterId, accessibilityLabel: portrait.label, aspectRatio: 1 },
      { type: "Status", liveRegion: portrait.animation?.liveRegion || "off", text: `${portrait.label} · ${selected.title}` },
      {
        type: "RadioGroup",
        accessibilityLabel: model.labels.persona,
        selectionMode: "exactly_one",
        children: model.content.selector.personaOptions.map((option) => ({
          type: "Radio",
          worldbookId: option.worldbookId,
          accessibilityLabel: option.title,
          selected: option.selected,
          enabled: option.selectEnabled,
          disabledReason: option.disabledReason,
          expectedRevision: model.content.selector.revision,
          minTouchTarget: 44,
          thumbnailPath: option.thumbnail?.path || null,
        })),
      },
      { type: "Metadata", label: model.labels.timeline, value: `${selected.timeline.start} → ${selected.timeline.end}` },
      { type: "Metadata", label: model.labels.spoiler, value: String(model.content.selector.spoilerCeilingRank) },
      { type: "Metadata", label: model.labels.knowledge, value: String(model.content.selector.knowledgeCeilingRank) },
      { type: "Notice", text: model.content.rights.notice },
    ],
    boardGeometryIsolation: clone(model.layout.boardGeometryIsolation),
    rulesAuthority: "external_rules_service",
    roomMutationAuthority: false,
    trainingTruth: false,
  });
}
