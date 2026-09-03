import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  Polyline,
  Rect,
  Image as SvgImage,
  Text as SvgText,
} from "react-native-svg";

import { useI18n } from "@/lib/i18n";
import { useLevel3ClientDomain } from "@/lib/level3/client-domain-provider";
import {
  projectStarcraftTmgBattlefieldPresentationV1,
  projectStarcraftTmgBattlefieldViewportV1,
  type BattlefieldAreaV1,
  type BattlefieldModelV1,
  type BattlefieldParameterDomainV1,
  type BattlefieldPlacementV1,
  type BattlefieldPointV1,
} from "@/lib/level3/battlefield-presentation-v1";
import {
  STARCRAFT_TMG_BATTLEFIELD_MAP_SOURCE,
  randomStarcraftTmgPresentationMediaEntryV1,
  starcraftTmgBattlefieldUnitMediaAssetsV1,
} from "@/lib/level3/battlefield-media-assets-v1";
import {
  BattleWorkbenchReadPanel,
  type WorkbenchThreatMode,
} from "./battle-workbench-read-panels";

type PendingOperation = "legal" | "workbench" | "preview" | "apply" | "replay" | null;
type DraftMode = "path" | "placements";
type WorkspaceDetailPanel = "unit" | "actions" | "threat" | "status" | "markers" | "referee";

interface StandardMoveDraft {
  domainId: string;
  leadingModelId: string | null;
  path: BattlefieldPointV1[];
  placements: Array<BattlefieldPointV1 & { modelId: string }>;
  mode: DraftMode;
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
  worldX: number;
  worldY: number;
}

const SIDE_COLORS: Record<string, string> = {
  player1: "#38bdf8",
  player2: "#ef4444",
};

function sideColor(sideKey: string) {
  return SIDE_COLORS[sideKey] || "#a78bfa";
}

function actionText(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sceneViewBox(
  width: number,
  height: number,
  zoom: number,
  panX: number,
  panY: number,
): ViewBox {
  const visibleWidth = width / zoom;
  const visibleHeight = height / zoom;
  const centerX = clamp((width / 2) + panX, visibleWidth / 2, width - (visibleWidth / 2));
  const centerY = clamp((height / 2) + panY, visibleHeight / 2, height - (visibleHeight / 2));
  const worldX = centerX - (visibleWidth / 2);
  const worldY = centerY - (visibleHeight / 2);
  return {
    x: worldX,
    // SVG owns one bottom-left-world to top-left-display flip. Its viewBox is
    // therefore expressed in display coordinates while taps use worldX/Y.
    y: height - (worldY + visibleHeight),
    width: visibleWidth,
    height: visibleHeight,
    worldX,
    worldY,
  };
}

function areaGlyph(area: BattlefieldAreaV1) {
  if (!area.geometryRenderable || !area.shape
    || !area.widthMilliInches || !area.depthMilliInches) {
    if (area.kind === "marker") {
      return (
        <G key={`${area.kind}:${area.id}`}>
          <Circle cx={area.xMilliInches} cy={area.yMilliInches} r={300} fill="#fbbf2422" stroke="#fbbf24" strokeWidth={90} strokeDasharray="140 100" />
          <Line x1={area.xMilliInches - 210} y1={area.yMilliInches} x2={area.xMilliInches + 210} y2={area.yMilliInches} stroke="#fbbf24" strokeWidth={70} />
          <Line x1={area.xMilliInches} y1={area.yMilliInches - 210} x2={area.xMilliInches} y2={area.yMilliInches + 210} stroke="#fbbf24" strokeWidth={70} />
        </G>
      );
    }
    return null;
  }
  const common = {
    fill: area.kind === "terrain" ? "#334155" : area.kind === "marker" ? "#fbbf2433" : "#22d3ee33",
    stroke: area.kind === "terrain" ? "#64748b" : area.kind === "marker" ? "#fbbf24" : "#22d3ee",
    strokeWidth: 100,
  };
  if (area.shape === "rectangle") {
    return (
      <Rect
        key={`${area.kind}:${area.id}`}
        id={`battlefield-${area.kind}-${area.id}`}
        x={area.xMilliInches - (area.widthMilliInches / 2)}
        y={area.yMilliInches - (area.depthMilliInches / 2)}
        width={area.widthMilliInches}
        height={area.depthMilliInches}
        transform={`rotate(${area.rotationDegrees} ${area.xMilliInches} ${area.yMilliInches})`}
        {...common}
      />
    );
  }
  return (
    <Ellipse
      key={`${area.kind}:${area.id}`}
      id={`battlefield-${area.kind}-${area.id}`}
      cx={area.xMilliInches}
      cy={area.yMilliInches}
      rx={area.widthMilliInches / 2}
      ry={area.depthMilliInches / 2}
      transform={`rotate(${area.rotationDegrees} ${area.xMilliInches} ${area.yMilliInches})`}
      {...common}
    />
  );
}

function modelGlyph(model: BattlefieldModelV1) {
  const color = sideColor(model.sideKey);
  if (!model.geometryRenderable || !model.baseShape
    || !model.baseWidthMilliInches || !model.baseDepthMilliInches) {
    return (
      <G key={model.id}>
        <Line x1={model.xMilliInches - 350} y1={model.yMilliInches - 350} x2={model.xMilliInches + 350} y2={model.yMilliInches + 350} stroke="#f59e0b" strokeWidth={120} />
        <Line x1={model.xMilliInches + 350} y1={model.yMilliInches - 350} x2={model.xMilliInches - 350} y2={model.yMilliInches + 350} stroke="#f59e0b" strokeWidth={120} />
      </G>
    );
  }
  const common = {
    fill: model.destroyed ? "#450a0a" : `${color}55`,
    stroke: model.selected ? "#ffffff" : color,
    strokeWidth: model.selected ? 190 : 110,
  };
  const media = starcraftTmgBattlefieldUnitMediaAssetsV1(model.unitId);
  const portraitWidth = model.baseWidthMilliInches * 0.84;
  const portraitDepth = model.baseDepthMilliInches * 0.84;
  const portraitClipId = `battlefield-portrait-clip-${model.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const shape = model.baseShape === "rectangle" ? (
    <Rect
      x={model.xMilliInches - (model.baseWidthMilliInches / 2)}
      y={model.yMilliInches - (model.baseDepthMilliInches / 2)}
      width={model.baseWidthMilliInches}
      height={model.baseDepthMilliInches}
      transform={`rotate(${model.baseRotationDegrees} ${model.xMilliInches} ${model.yMilliInches})`}
      {...common}
    />
  ) : (
    <Ellipse
      cx={model.xMilliInches}
      cy={model.yMilliInches}
      rx={model.baseWidthMilliInches / 2}
      ry={model.baseDepthMilliInches / 2}
      transform={`rotate(${model.baseRotationDegrees} ${model.xMilliInches} ${model.yMilliInches})`}
      {...common}
    />
  );
  return (
    <G
      key={model.id}
      id={`${model.withinBoard ? "battlefield-model" : "battlefield-invalid-base-model"}-${model.id}`}
    >
      {shape}
      {media && (
        <>
          <Defs>
            <ClipPath id={portraitClipId}>
              {model.baseShape === "rectangle" ? (
                <Rect
                  x={model.xMilliInches - (portraitWidth / 2)}
                  y={model.yMilliInches - (portraitDepth / 2)}
                  width={portraitWidth}
                  height={portraitDepth}
                  rx={Math.min(portraitWidth, portraitDepth) * 0.08}
                  transform={`rotate(${model.baseRotationDegrees} ${model.xMilliInches} ${model.yMilliInches})`}
                />
              ) : (
                <Ellipse
                  cx={model.xMilliInches}
                  cy={model.yMilliInches}
                  rx={portraitWidth / 2}
                  ry={portraitDepth / 2}
                  transform={`rotate(${model.baseRotationDegrees} ${model.xMilliInches} ${model.yMilliInches})`}
                />
              )}
            </ClipPath>
          </Defs>
          <SvgImage
            id={`battlefield-model-portrait-${model.id}`}
            href={model.selected ? media.activePortrait : media.neutralPortrait}
            x={model.xMilliInches - (portraitWidth / 2)}
            y={model.yMilliInches - (portraitDepth / 2)}
            width={portraitWidth}
            height={portraitDepth}
            preserveAspectRatio="xMidYMid slice"
            opacity={model.destroyed ? 0.35 : 0.92}
            transform={`translate(0 ${2 * model.yMilliInches}) scale(1 -1)`}
            clipPath={`url(#${portraitClipId})`}
          />
        </>
      )}
      <Circle cx={model.xMilliInches} cy={model.yMilliInches} r={90} fill={color} />
    </G>
  );
}

function placementGlyph(
  placement: BattlefieldPlacementV1,
  kind: "draft" | "sealed",
) {
  const color = kind === "sealed" ? "#22d3ee" : "#fbbf24";
  if (!placement.geometryRenderable || !placement.baseShape
    || !placement.baseWidthMilliInches || !placement.baseDepthMilliInches) {
    return (
      <G key={`${kind}:${placement.modelId}`}>
        <Line x1={placement.xMilliInches - 300} y1={placement.yMilliInches - 300} x2={placement.xMilliInches + 300} y2={placement.yMilliInches + 300} stroke={color} strokeWidth={100} />
        <Line x1={placement.xMilliInches + 300} y1={placement.yMilliInches - 300} x2={placement.xMilliInches - 300} y2={placement.yMilliInches + 300} stroke={color} strokeWidth={100} />
      </G>
    );
  }
  const common = {
    fill: kind === "sealed" ? "#22d3ee33" : "#fbbf2433",
    stroke: color,
    strokeWidth: kind === "sealed" ? 170 : 120,
    strokeDasharray: kind === "sealed" ? undefined : "240 140",
  };
  const shape = placement.baseShape === "rectangle" ? (
    <Rect
      x={placement.xMilliInches - (placement.baseWidthMilliInches / 2)}
      y={placement.yMilliInches - (placement.baseDepthMilliInches / 2)}
      width={placement.baseWidthMilliInches}
      height={placement.baseDepthMilliInches}
      transform={`rotate(${placement.baseRotationDegrees} ${placement.xMilliInches} ${placement.yMilliInches})`}
      {...common}
    />
  ) : (
    <Ellipse
      cx={placement.xMilliInches}
      cy={placement.yMilliInches}
      rx={placement.baseWidthMilliInches / 2}
      ry={placement.baseDepthMilliInches / 2}
      transform={`rotate(${placement.baseRotationDegrees} ${placement.xMilliInches} ${placement.yMilliInches})`}
      {...common}
    />
  );
  return <G key={`${kind}:${placement.modelId}`}>{shape}</G>;
}

function Button({
  label,
  onPress,
  disabled = false,
  active = false,
  compact = false,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compactButton,
        active && styles.buttonActive,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function AuthoritativeBattleWorkspace() {
  const { lang } = useI18n();
  const zh = lang === "zh";
  const { width: windowWidth } = useWindowDimensions();
  const { view, connection, dispatch } = useLevel3ClientDomain();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StandardMoveDraft | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [layout, setLayout] = useState({ width: 1, height: 1 });
  const [pending, setPending] = useState<PendingOperation>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dismissedPreviewId, setDismissedPreviewId] = useState<string | null>(null);
  const [coordinateInput, setCoordinateInput] = useState({ xInches: "", yInches: "" });
  const [showThreatReference, setShowThreatReference] = useState(false);
  const [voicesEnabled, setVoicesEnabled] = useState(false);
  const [bgmLoaded, setBgmLoaded] = useState(false);
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [mediaVolume, setMediaVolume] = useState(0.45);
  const [detailPanel, setDetailPanel] = useState<WorkspaceDetailPanel>("unit");
  const [threatMode, setThreatMode] = useState<WorkbenchThreatMode>("stationary_fire");
  const [selectedThreatWeaponId, setSelectedThreatWeaponId] = useState<string | null>(null);
  const lastPlayedCueBatchHash = useRef<string | null>(null);
  const requestedWorkbenchKey = useRef<string | null>(null);
  const voicePlayer = useAudioPlayer(null, { updateInterval: 1000 });
  const bgmPlayer = useAudioPlayer(null, { updateInterval: 1000 });

  const scene = useMemo(() => projectStarcraftTmgBattlefieldPresentationV1({
    roomProjection: view.roomProjection,
    legalSpace: view.legalSpace,
    pendingPreview: view.pendingPreview,
    selectedModelId,
  }), [view.roomProjection, view.legalSpace, view.pendingPreview, selectedModelId]);
  const projection = view.roomProjection || {};
  const viewer = projection.viewer || {};
  const capabilities = new Set<string>(
    Array.isArray(viewer.capabilities) ? viewer.capabilities.map(String) : [],
  );
  const fenced = view.control?.status === "fenced";
  const integrityBlocked = view.integrity?.replayBlocked === true;
  const operational = connection.canRequestAuthoritativeIntent
    && connection.visible
    && connection.online
    && !fenced
    && !integrityBlocked
    && pending === null;
  const canRecoverIntegrity = connection.canRequestAuthoritativeIntent
    && connection.visible
    && connection.online
    && !fenced
    && pending === null;
  const canLoadLegal = operational && capabilities.has("read_legal_space");
  const canPreview = operational && capabilities.has("preview");
  const canApply = operational
    && capabilities.has("confirm")
    && capabilities.has("apply");
  const selectedDomain = scene.parameterDomains.find((entry) => (
    entry.domainId === selectedDomainId
  )) || null;
  const visiblePreview = scene.previewId && scene.previewId !== dismissedPreviewId
    ? view.pendingPreview
    : null;
  const viewBox = sceneViewBox(
    scene.widthMilliInches,
    scene.heightMilliInches,
    zoom,
    pan.x,
    pan.y,
  );
  const boardHeight = windowWidth >= 980
    ? 500
    : clamp((windowWidth - 56) * (scene.heightMilliInches / scene.widthMilliInches), 260, 430);
  const desktop = windowWidth >= 980;
  const pathPoints = draft?.path || [];
  const placementPoints = draft?.placements || [];
  const modelsById = useMemo(
    () => new Map(scene.models.map((model) => [model.id, model])),
    [scene.models],
  );
  const selectedModel = selectedModelId ? modelsById.get(selectedModelId) || null : null;
  const selectedPieceId = selectedModel?.pieceId || selectedModelId;
  const selectedUnitThreat = view.battleWorkbench?.threat?.perUnit?.find((entry: any) => (
    entry.unitId === selectedPieceId
  ));
  const threatRegions: any[] = !showThreatReference ? []
    : threatMode === "friendly_aggregate"
      ? (view.battleWorkbench?.threat?.aggregates?.friendly?.regions || [])
      : threatMode === "enemy_aggregate"
        ? (view.battleWorkbench?.threat?.aggregates?.enemy?.regions || [])
        : threatMode === "charge_engagement"
          ? (selectedUnitThreat?.charge?.regions || [])
          : (selectedUnitThreat?.weapons || [])
            .filter((weapon: any) => !selectedThreatWeaponId || weapon.weaponId === selectedThreatWeaponId)
            .flatMap((weapon: any) => threatMode === "stationary_fire"
              ? weapon.stationaryRegions : weapon.moveThenAttackRegions);

  useEffect(() => {
    const roomId = view.roomProjection?.room?.roomId;
    const stateRevision = view.roomProjection?.room?.stateRevision;
    if (!roomId || !Number.isSafeInteger(stateRevision)
      || !connection.visible || !connection.online || view.phase !== "ready") return;
    const key = `${roomId}:${stateRevision}`;
    if (view.battleWorkbench?.stateRevision === stateRevision
      || requestedWorkbenchKey.current === key) return;
    requestedWorkbenchKey.current = key;
    setPending("workbench");
    void dispatch({ type: "load_battle_workbench" }).then((result: any) => {
      if (!result.ok) {
        requestedWorkbenchKey.current = null;
        setErrorCode(result.rejection?.code || "BATTLE_WORKBENCH_REJECTED");
      }
    }).finally(() => setPending(null));
  }, [connection.online, connection.visible, dispatch, view.battleWorkbench?.stateRevision,
    view.phase, view.roomProjection?.room?.roomId, view.roomProjection?.room?.stateRevision]);

  useEffect(() => {
    bgmPlayer.loop = true;
    bgmPlayer.volume = mediaVolume;
    voicePlayer.volume = Math.min(1, mediaVolume + 0.25);
  }, [bgmPlayer, mediaVolume, voicePlayer]);

  const playUnitVoice = async (
    model: BattlefieldModelV1 | null | undefined,
    intent: "selected" | "confirm" | "damaged" | "destroyed",
    allowWhileEnabling = false,
  ) => {
    if ((!voicesEnabled && !allowWhileEnabling) || !model) return;
    const media = starcraftTmgBattlefieldUnitMediaAssetsV1(model.unitId);
    const sources = media?.voice?.[intent] || [];
    if (!sources.length) return;
    const source = randomStarcraftTmgPresentationMediaEntryV1(sources);
    if (!source) return;
    voicePlayer.pause();
    voicePlayer.replace(source);
    await voicePlayer.seekTo(0);
    voicePlayer.play();
  };

  const selectModel = (model: BattlefieldModelV1) => {
    setSelectedModelId(model.id);
    setSelectedThreatWeaponId(null);
    setDetailPanel("unit");
    void playUnitVoice(model, "selected");
  };

  const cueBatch = view.lastReceipt?.presentationCueBatch;
  useEffect(() => {
    const cueBatchHash = typeof cueBatch?.cueBatchHash === "string"
      ? cueBatch.cueBatchHash
      : null;
    if (!cueBatchHash || cueBatchHash === lastPlayedCueBatchHash.current) return;
    lastPlayedCueBatchHash.current = cueBatchHash;
    if (!voicesEnabled) return;
    const cues = Array.isArray(cueBatch.cues) ? cueBatch.cues : [];
    const cue = [...cues].reverse().find((entry) => (
      entry && ["confirm", "damaged", "destroyed"].includes(entry.voiceIntent)
    ));
    if (!cue) return;
    const pieceId = cue.voiceIntent === "confirm"
      ? cue.actorPieceId
      : cue.targetPieceId;
    const model = scene.models.find((entry) => entry.pieceId === pieceId);
    void playUnitVoice(model, cue.voiceIntent);
  }, [cueBatch, scene.models, voicesEnabled]);

  const toggleVoices = async () => {
    const next = !voicesEnabled;
    if (next) {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
        shouldPlayInBackground: false,
      });
    } else {
      voicePlayer.pause();
    }
    setVoicesEnabled(next);
    if (next) void playUnitVoice(selectedModel, "selected", true);
  };

  const chooseBgm = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
      multiple: false,
      base64: false,
    });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    bgmPlayer.pause();
    bgmPlayer.replace(asset.uri);
    bgmPlayer.loop = true;
    bgmPlayer.volume = mediaVolume;
    setBgmLoaded(true);
    setBgmPlaying(false);
  };

  const toggleBgm = async () => {
    if (!bgmLoaded) return;
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      shouldPlayInBackground: false,
    });
    if (bgmPlaying) bgmPlayer.pause();
    else bgmPlayer.play();
    setBgmPlaying(!bgmPlaying);
  };
  const draftPlacementGeometries: BattlefieldPlacementV1[] = placementPoints.map((point) => {
    const model = modelsById.get(point.modelId);
    return {
      modelId: point.modelId,
      xMilliInches: point.xMilliInches,
      yMilliInches: point.yMilliInches,
      baseShape: model?.baseShape ?? null,
      baseWidthMilliInches: model?.baseWidthMilliInches ?? null,
      baseDepthMilliInches: model?.baseDepthMilliInches ?? null,
      baseRotationDegrees: model?.baseRotationDegrees ?? 0,
      geometryRenderable: model?.geometryRenderable === true,
    };
  });

  useEffect(() => {
    setSelectedDomainId(null);
    setDraft(null);
    setDismissedPreviewId(null);
    setCoordinateInput({ xInches: "", yInches: "" });
  }, [scene.stateRevision]);

  useEffect(() => {
    if (scene.previewId) setDismissedPreviewId(null);
  }, [scene.previewId]);

  const resetView = (clearInteraction = false) => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (clearInteraction) {
      setSelectedModelId(null);
      setSelectedDomainId(null);
      setDraft(null);
    }
  };

  const loadLegal = async () => {
    if (!canLoadLegal) return;
    setPending("legal");
    setErrorCode(null);
    setNotice(null);
    try {
      const result = await dispatch({ type: "load_legal_space" });
      if (!result.ok) setErrorCode(result.rejection?.code || "LEGAL_SPACE_REJECTED");
      else setNotice(zh ? "已加载当前修订的 LegalSpace。" : "LegalSpace loaded for the current revision.");
    } finally {
      setPending(null);
    }
  };

  const previewFinite = async (actionKey: string) => {
    if (!canPreview) return;
    setPending("preview");
    setErrorCode(null);
    setNotice(null);
    try {
      const result = await dispatch({ type: "preview_finite", actionKey });
      if (!result.ok) setErrorCode(result.rejection?.code || "PREVIEW_REJECTED");
      else setNotice(zh ? "权威 Preview 已生成，尚未改变房间状态。" : "Authoritative Preview ready; room state is unchanged.");
    } finally {
      setPending(null);
    }
  };

  const chooseDomain = (domain: BattlefieldParameterDomainV1) => {
    setSelectedDomainId(domain.domainId);
    setSelectedModelId(null);
    setErrorCode(null);
    setDraft({
      domainId: domain.domainId,
      leadingModelId: null,
      path: [],
      placements: [],
      mode: "path",
    });
    setCoordinateInput({ xInches: "", yInches: "" });
  };

  const selectLeadingModel = (modelId: string) => {
    if (!selectedDomain || selectedDomain.support !== "official_standard_move") return;
    const model = modelsById.get(modelId);
    if (model) selectModel(model);
    else setSelectedModelId(modelId);
    setDraft({
      domainId: selectedDomain.domainId,
      leadingModelId: modelId,
      path: [],
      placements: [],
      mode: "path",
    });
    setCoordinateInput({ xInches: "", yInches: "" });
  };

  const activeRemainingModelIds = useMemo(() => {
    if (!selectedDomain || !draft?.leadingModelId) return [];
    return selectedDomain.modelIds.filter((id) => id !== draft.leadingModelId);
  }, [selectedDomain, draft?.leadingModelId]);
  const nextPlacementModelId = activeRemainingModelIds.find((modelId) => (
    !draft?.placements.some((entry) => entry.modelId === modelId)
  )) || null;

  const worldPointForTap = (event: GestureResponderEvent): BattlefieldPointV1 | null => {
    const xPixels = Number(event.nativeEvent.locationX);
    const yPixels = Number(event.nativeEvent.locationY);
    if (!Number.isFinite(xPixels) || !Number.isFinite(yPixels)) return null;
    const viewport = projectStarcraftTmgBattlefieldViewportV1({
      boardWidthMilliInches: viewBox.width,
      boardHeightMilliInches: viewBox.height,
      viewportWidthPixels: layout.width,
      viewportHeightPixels: layout.height,
    });
    const local = viewport.viewportToWorld({ xPixels, yPixels });
    const point = {
      xMilliInches: Math.round(viewBox.worldX + local.xMilliInches),
      yMilliInches: Math.round(viewBox.worldY + local.yMilliInches),
    };
    if (point.xMilliInches < 0 || point.yMilliInches < 0
      || point.xMilliInches > scene.widthMilliInches
      || point.yMilliInches > scene.heightMilliInches) return null;
    return point;
  };

  const selectNearestModel = (point: BattlefieldPointV1) => {
    const pixelsPerWorld = Math.min(
      layout.width / viewBox.width,
      layout.height / viewBox.height,
    );
    const minimumRadius = 22 / pixelsPerWorld;
    const candidates = scene.models.map((model) => {
      const physicalRadius = Math.max(
        model.baseWidthMilliInches || 0,
        model.baseDepthMilliInches || 0,
      ) / 2;
      const distance = Math.hypot(
        model.xMilliInches - point.xMilliInches,
        model.yMilliInches - point.yMilliInches,
      );
      return { model, distance, hitRadius: Math.max(physicalRadius, minimumRadius) };
    }).filter((entry) => entry.distance <= entry.hitRadius)
      .sort((left, right) => left.distance - right.distance);
    if (candidates[0]) selectModel(candidates[0].model);
  };

  const appendDraftPoint = (point: BattlefieldPointV1) => {
    if (!selectedDomain || !draft) {
      selectNearestModel(point);
      return;
    }
    if (selectedDomain.support === "unsupported") return;
    if (selectedDomain.support === "official_standard_move" && !draft.leadingModelId) {
      setErrorCode("LEADING_MODEL_SELECTION_REQUIRED");
      return;
    }
    if (draft.mode === "path") {
      if (selectedDomain.maxPathPoints !== null
        && draft.path.length >= selectedDomain.maxPathPoints) {
        setErrorCode("PATH_POINT_LIMIT_REACHED");
        return;
      }
      setDraft({ ...draft, path: [...draft.path, point] });
      return;
    }
    if (selectedDomain.support === "official_standard_move" && nextPlacementModelId) {
      setDraft({
        ...draft,
        placements: [...draft.placements, { modelId: nextPlacementModelId, ...point }],
      });
    }
  };

  const onBoardPress = (event: GestureResponderEvent) => {
    const point = worldPointForTap(event);
    if (point) appendDraftPoint(point);
  };

  const addCoordinateInput = () => {
    const xInches = Number(coordinateInput.xInches);
    const yInches = Number(coordinateInput.yInches);
    if (!Number.isFinite(xInches) || !Number.isFinite(yInches)) {
      setErrorCode("COORDINATE_INPUT_INVALID");
      return;
    }
    const point = {
      xMilliInches: Math.round(xInches * 1000),
      yMilliInches: Math.round(yInches * 1000),
    };
    if (point.xMilliInches < 0 || point.yMilliInches < 0
      || point.xMilliInches > scene.widthMilliInches
      || point.yMilliInches > scene.heightMilliInches) {
      setErrorCode("COORDINATE_OUTSIDE_BOARD");
      return;
    }
    setErrorCode(null);
    appendDraftPoint(point);
    setCoordinateInput({ xInches: "", yInches: "" });
  };

  const parameterDraftReady = Boolean(selectedDomain && draft
    && draft.domainId === selectedDomain.domainId
    && draft.path.length > 0
    && (selectedDomain.support === "legacy_path_only"
      || (selectedDomain.support === "official_standard_move"
        && draft.leadingModelId
        && draft.placements.length === activeRemainingModelIds.length)));

  const previewParameterized = async () => {
    if (!canPreview || !selectedDomain || !draft || !parameterDraftReady) return;
    const parameters = selectedDomain.support === "legacy_path_only"
      ? { path: draft.path }
      : {
          leadingModelId: draft.leadingModelId,
          path: draft.path,
          placements: draft.placements,
        };
    setPending("preview");
    setErrorCode(null);
    try {
      const result = await dispatch({
        type: "preview_parameterized",
        domainId: selectedDomain.domainId,
        parameters,
      });
      if (!result.ok) setErrorCode(result.rejection?.code || "PREVIEW_REJECTED");
      else setNotice(zh ? "服务器已校验参数并密封 Preview。" : "The server validated the parameters and sealed the Preview.");
    } finally {
      setPending(null);
    }
  };

  const confirmAndApply = async () => {
    if (!canApply || !scene.previewId) return;
    setPending("apply");
    setErrorCode(null);
    try {
      const applied = await dispatch({
        type: "confirm_and_apply_preview",
        previewId: scene.previewId,
      });
      if (!applied.ok) {
        setErrorCode(applied.rejection?.code || "APPLY_REJECTED");
        return;
      }
      setPending("replay");
      const replayed = await dispatch({ type: "read_replay" });
      if (!replayed.ok) {
        setErrorCode(replayed.rejection?.code || "REPLAY_REJECTED");
      } else {
        setNotice(zh ? "动作已应用，重放链与当前状态一致。" : "Action applied; replay chain matches current authority.");
        setDetailPanel("referee");
      }
      setDraft(null);
      setSelectedDomainId(null);
    } finally {
      setPending(null);
    }
  };

  const verifyReplay = async () => {
    if (!operational) return;
    setPending("replay");
    setErrorCode(null);
    try {
      const result = await dispatch({ type: "read_replay" });
      if (!result.ok) {
        setErrorCode(result.rejection?.code || "REPLAY_REJECTED");
      } else {
        setNotice(zh ? "Replay 与当前权威投影一致。" : "Replay matches the current authoritative projection.");
      }
    } finally {
      setPending(null);
    }
  };

  const revalidateAuthority = async () => {
    if (!canRecoverIntegrity) return;
    setPending("replay");
    setErrorCode(null);
    setNotice(null);
    try {
      const revalidated = await dispatch({ type: "revalidate_authority" });
      if (!revalidated.ok) {
        setErrorCode(revalidated.rejection?.code || "REPLAY_REVALIDATION_REJECTED");
        return;
      }
      setNotice(zh
        ? "权威投影已刷新，Replay 重新验证通过，写入已恢复。"
        : "Authority refreshed and Replay revalidated; writes are enabled again.");
    } finally {
      setPending(null);
    }
  };

  const panStepX = scene.widthMilliInches / zoom / 5;
  const panStepY = scene.heightMilliInches / zoom / 5;
  const updateLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setLayout({ width, height });
  };
  const draftPath = selectedDomain?.support === "official_standard_move" && draft?.leadingModelId
    ? [selectedDomain.modelStartPoints[draft.leadingModelId], ...pathPoints].filter(Boolean)
    : selectedDomain?.support === "legacy_path_only" && selectedDomain.start
      ? [selectedDomain.start, ...pathPoints]
      : pathPoints;

  return (
    <View style={styles.shell}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={styles.eyebrow}>LEGALSPACE → PREVIEW → CONFIRM → APPLY → REPLAY</Text>
          <Text style={styles.title}>{zh ? "权威战场" : "Authoritative Battlefield"}</Text>
          <Text style={styles.subtitle}>
            {zh
              ? "所有底座、坐标和动作来自观察者投影；点按只编辑提案，不直接移动棋子。"
              : "Bases, coordinates, and actions come from the viewer projection. Taps edit a proposal and never move state directly."}
          </Text>
        </View>
        <View
          accessibilityLabel={`${zh ? "状态修订" : "State revision"} ${actionText(scene.stateRevision)}`}
          style={styles.revisionPill}
        >
          <Text style={styles.revisionText}>r{actionText(scene.stateRevision)}</Text>
        </View>
      </View>

      {!operational && (
        <View accessibilityRole="alert" style={styles.warning}>
          <Text style={styles.warningTitle}>
            {integrityBlocked
              ? (zh ? "完整性阻断：战场只读" : "Integrity blocked: battlefield is read-only")
              : (zh ? "只读战场" : "Read-only battlefield")}
          </Text>
          <Text style={styles.warningText}>
            {integrityBlocked
              ? (zh
                  ? "Replay 与当前权威投影不一致或无法验证。必须刷新权威投影并重新验证 Replay 后才能继续写入。"
                  : "Replay did not match or could not verify. Refresh authority and revalidate Replay before any further write.")
              : fenced
              ? (zh ? "本设备的控制 fence 已过期。" : "This device has been fenced by newer control.")
              : (zh ? "离线、后台或连接未就绪时禁止提交。" : "Writes are disabled while offline, backgrounded, or not ready.")}
          </Text>
          {integrityBlocked && (
            <Button
              label={pending === "replay"
                ? (zh ? "重新校验中…" : "Revalidating…")
                : (zh ? "刷新权威并重新校验" : "Refresh authority and revalidate")}
              disabled={!canRecoverIntegrity}
              onPress={revalidateAuthority}
            />
          )}
        </View>
      )}

      <View style={[styles.workspace, desktop && styles.workspaceDesktop]}>
        <View style={styles.boardPane}>
          <View style={styles.viewportControls}>
            <Button compact label="−" disabled={zoom <= 1} onPress={() => setZoom((value) => Math.max(1, value - 0.5))} />
            <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
            <Button compact label="+" disabled={zoom >= 6} onPress={() => setZoom((value) => Math.min(6, value + 0.5))} />
            <Button compact label="Fit" onPress={() => resetView(false)} />
            <Button compact label="Reset" onPress={() => resetView(true)} />
            <Button compact label="←" disabled={zoom <= 1} onPress={() => setPan((value) => ({ ...value, x: value.x - panStepX }))} />
            <Button compact label="→" disabled={zoom <= 1} onPress={() => setPan((value) => ({ ...value, x: value.x + panStepX }))} />
            <Button compact label="↑" disabled={zoom <= 1} onPress={() => setPan((value) => ({ ...value, y: value.y + panStepY }))} />
            <Button compact label="↓" disabled={zoom <= 1} onPress={() => setPan((value) => ({ ...value, y: value.y - panStepY }))} />
          </View>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={zh ? "战场；点按选择模型或添加当前参数步骤" : "Battlefield; tap to select a model or add the current parameter step"}
            onLayout={updateLayout}
            onPress={onBoardPress}
            style={[styles.boardFrame, { height: boardHeight }]}
          >
            <Svg
              width="100%"
              height="100%"
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <SvgImage
                id="battlefield-display-map-v1"
                href={STARCRAFT_TMG_BATTLEFIELD_MAP_SOURCE}
                x={0}
                y={0}
                width={scene.widthMilliInches}
                height={scene.heightMilliInches}
                preserveAspectRatio="xMidYMid slice"
                opacity={0.72}
              />
              <G transform={`translate(0 ${scene.heightMilliInches}) scale(1 -1)`}>
                <Rect x={0} y={0} width={scene.widthMilliInches} height={scene.heightMilliInches} fill="#07111f99" stroke="#38bdf8" strokeWidth={140} />
                {Array.from({ length: Math.floor(scene.widthMilliInches / 6000) + 1 }, (_, index) => (
                  <Line key={`grid-x-${index}`} x1={index * 6000} y1={0} x2={index * 6000} y2={scene.heightMilliInches} stroke="#1e3a4f" strokeWidth={50} />
                ))}
                {Array.from({ length: Math.floor(scene.heightMilliInches / 6000) + 1 }, (_, index) => (
                  <Line key={`grid-y-${index}`} x1={0} y1={index * 6000} x2={scene.widthMilliInches} y2={index * 6000} stroke="#1e3a4f" strokeWidth={50} />
                ))}
                {scene.terrain.map(areaGlyph)}
                {scene.markers.map(areaGlyph)}
                {scene.tokens.map(areaGlyph)}
                {threatRegions.map((region, index) => (
                  <Circle
                    key={`threat:${region.mode}:${region.modelId}:${region.weaponId || "none"}:${index}`}
                    id={`battlefield-authoritative-threat-${index}`}
                    cx={region.centerXMilliInches}
                    cy={region.centerYMilliInches}
                    r={region.radiusMilliInches}
                    fill={region.sideKey === "player1" ? "#38bdf80b" : "#ef44440b"}
                    stroke={region.mode === "charge_engagement" ? "#fbbf24" : sideColor(region.sideKey)}
                    strokeWidth={100}
                    strokeDasharray={region.coverage === "exact" ? undefined : "420 260"}
                  />
                ))}
                {showThreatReference && threatRegions.length === 0 && selectedModel?.maxProjectedWeaponRangeMilliInches && (
                  <Circle
                    id="battlefield-threat-reference-v1"
                    cx={selectedModel.xMilliInches}
                    cy={selectedModel.yMilliInches}
                    r={selectedModel.maxProjectedWeaponRangeMilliInches
                      + (Math.max(
                        selectedModel.baseWidthMilliInches || 0,
                        selectedModel.baseDepthMilliInches || 0,
                      ) / 2)}
                    fill="#22d3ee0c"
                    stroke="#67e8f9"
                    strokeWidth={120}
                    strokeDasharray="420 260"
                  />
                )}
                {scene.models.map(modelGlyph)}
                {scene.unitAnchors.map((anchor) => (
                  <G key={anchor.id}>
                    <Circle cx={anchor.xMilliInches} cy={anchor.yMilliInches} r={420} fill="none" stroke="#f59e0b" strokeWidth={100} strokeDasharray="180 120" />
                    <Line x1={anchor.xMilliInches - 300} y1={anchor.yMilliInches} x2={anchor.xMilliInches + 300} y2={anchor.yMilliInches} stroke="#f59e0b" strokeWidth={90} />
                    <Line x1={anchor.xMilliInches} y1={anchor.yMilliInches - 300} x2={anchor.xMilliInches} y2={anchor.yMilliInches + 300} stroke="#f59e0b" strokeWidth={90} />
                  </G>
                ))}
                {draftPath.length > 1 && (
                  <Polyline
                    points={draftPath.map((point) => `${point.xMilliInches},${point.yMilliInches}`).join(" ")}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth={160}
                    strokeDasharray="320 220"
                  />
                )}
                {draftPlacementGeometries.map((placement) => placementGlyph(placement, "draft"))}
                {scene.previewPath.length > 1 && (
                  <Polyline
                    points={scene.previewPath.map((point) => `${point.xMilliInches},${point.yMilliInches}`).join(" ")}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth={220}
                  />
                )}
                {scene.previewPlacements.map((placement) => placementGlyph(placement, "sealed"))}
              </G>
              <SvgText x={600} y={1200} fill="#64748b" fontSize={720}>milli-inch authority view</SvgText>
            </Svg>
          </Pressable>

          <View style={styles.legendRow}>
            <Text style={styles.legendText}>{zh ? "蓝：P1" : "Blue: P1"}</Text>
            <Text style={styles.legendText}>{zh ? "红：P2" : "Red: P2"}</Text>
            <Text style={styles.legendText}>{zh ? "灰虚线：草稿" : "Gray dash: draft"}</Text>
            <Text style={styles.legendText}>{zh ? "青：密封 Preview" : "Cyan: sealed Preview"}</Text>
            <Text style={styles.legendText}>{zh ? "威胁参考默认关闭，仅显示投影中的印刷射程" : "Threat reference defaults off; projected printed range only"}</Text>
          </View>

          <View style={styles.mediaCard}>
            {selectedModel && starcraftTmgBattlefieldUnitMediaAssetsV1(selectedModel.unitId) && (
              <ExpoImage
                source={starcraftTmgBattlefieldUnitMediaAssetsV1(selectedModel.unitId)?.activePortrait}
                contentFit="cover"
                contentPosition="center"
                style={styles.commPortrait}
                accessibilityLabel={`${selectedModel.label} communication portrait`}
              />
            )}
            <View style={styles.mediaCopy}>
              <Text style={styles.panelTitle}>{selectedModel?.label || (zh ? "未选择单位" : "No unit selected")}</Text>
              <Text style={styles.metaText}>
                {zh
                  ? `${voicesEnabled ? "语音开启" : "语音静音"} · ${bgmLoaded ? (bgmPlaying ? "BGM 播放中" : "BGM 已暂停") : "BGM 未载入"}`
                  : `${voicesEnabled ? "Voices enabled" : "Voices muted"} · ${bgmLoaded ? (bgmPlaying ? "BGM playing" : "BGM paused") : "BGM not loaded"}`}
              </Text>
              <Text style={styles.boundaryText}>
                {zh ? "声音只由本地操作或已验签 Apply 事件触发，不进入规则状态或训练数据。" : "Audio is triggered only by local selection or validated Apply events and never enters rules or training state."}
              </Text>
            </View>
            <View style={styles.mediaControls}>
              <Button compact label={voicesEnabled ? (zh ? "关闭语音" : "Mute voice") : (zh ? "开启语音" : "Enable voice")} onPress={toggleVoices} />
              <Button compact label={zh ? "选择 BGM" : "Choose BGM"} onPress={chooseBgm} />
              <Button compact label={bgmPlaying ? (zh ? "暂停 BGM" : "Pause BGM") : (zh ? "播放 BGM" : "Play BGM")} disabled={!bgmLoaded} onPress={toggleBgm} />
              <Button compact label={showThreatReference ? (zh ? "隐藏威胁" : "Hide threat") : (zh ? "显示威胁" : "Show threat")} onPress={() => setShowThreatReference((value) => !value)} />
              <Button compact label="Vol −" disabled={mediaVolume <= 0} onPress={() => setMediaVolume((value) => Math.max(0, value - 0.1))} />
              <Text style={styles.zoomText}>{Math.round(mediaVolume * 100)}%</Text>
              <Button compact label="Vol +" disabled={mediaVolume >= 1} onPress={() => setMediaVolume((value) => Math.min(1, value + 0.1))} />
            </View>
          </View>

          <View style={styles.accessibleList}>
            <Text style={styles.panelTitle}>{zh ? "可访问模型列表（44dp）" : "Accessible model list (44dp)"}</Text>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator>
              <View style={styles.horizontalModelRow}>
              {scene.models.map((model) => (
                <Button
                  key={model.id}
                  compact
                  active={selectedModelId === model.id}
                  label={`${model.label} · ${model.sideKey}`}
                  onPress={() => selectModel(model)}
                />
              ))}
              {scene.unitAnchors.map((anchor) => (
                <Button
                  key={anchor.id}
                  compact
                  active={selectedModelId === anchor.id}
                  label={`${anchor.label} · ${actionText(anchor.currentModels)} models`}
                  onPress={() => setSelectedModelId(anchor.id)}
                />
              ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={[styles.sidePanel, desktop && styles.sidePanelDesktop]}>
          <View accessibilityRole="tablist" style={styles.detailTabs}>
            <Button compact active={detailPanel === "unit"} label={zh ? "单位" : "Unit"} onPress={() => setDetailPanel("unit")} />
            <Button
              compact
              active={detailPanel === "actions"}
              label={zh ? "行动" : "Actions"}
              onPress={() => setDetailPanel("actions")}
            />
            <Button compact active={detailPanel === "threat"} label={zh ? "威胁" : "Threat"} onPress={() => setDetailPanel("threat")} />
            <Button compact active={detailPanel === "status"} label={zh ? "战局" : "Battle status"} onPress={() => setDetailPanel("status")} />
            <Button compact active={detailPanel === "markers"} label={zh ? "标记" : "Markers"} onPress={() => setDetailPanel("markers")} />
            <Button
              compact
              active={detailPanel === "referee"}
              label={zh ? "裁判 / 重放" : "Referee / replay"}
              onPress={() => setDetailPanel("referee")}
            />
          </View>
          {(["unit", "threat", "status", "markers"] as WorkspaceDetailPanel[]).includes(detailPanel) ? (
            <BattleWorkbenchReadPanel
              panel={detailPanel as "unit" | "threat" | "status" | "markers"}
              snapshot={view.battleWorkbench}
              selectedPieceId={selectedPieceId}
              zh={zh}
              threatMode={threatMode}
              selectedThreatWeaponId={selectedThreatWeaponId}
              onThreatMode={(mode) => { setThreatMode(mode); setShowThreatReference(true); }}
              onThreatWeapon={setSelectedThreatWeaponId}
              onOpenActions={() => setDetailPanel("actions")}
              onPreviewFinite={previewFinite}
              canPreview={canPreview && !Boolean(visiblePreview)}
            />
          ) : detailPanel === "actions" ? (
            <>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>{zh ? "权威动作" : "Authoritative actions"}</Text>
            <Button
              compact
              label={pending === "legal" ? (zh ? "加载中…" : "Loading…") : "Load LegalSpace"}
              disabled={!canLoadLegal}
              onPress={loadLegal}
            />
          </View>
          <Text style={styles.metaText}>LegalSpace hash: {actionText(view.legalSpace?.legalSpaceHash)}</Text>

          <ScrollView style={styles.actionScroll} nestedScrollEnabled>
            {scene.finiteActions.map((action) => (
              <View key={action.actionKey} style={styles.actionCard}>
                <Text style={styles.actionTitle}>{action.label}</Text>
                <Text style={styles.metaText}>{action.confirmationClass || "confirmation policy: authority"}</Text>
                <Button
                  label={zh ? "生成 Preview" : "Preview"}
                  disabled={!canPreview || Boolean(visiblePreview)}
                  onPress={() => previewFinite(action.actionKey)}
                />
              </View>
            ))}

            {scene.parameterDomains.map((domain) => (
              <View key={domain.domainId} style={styles.actionCard}>
                <Text style={styles.actionTitle}>{domain.label}</Text>
                <Text style={styles.metaText}>{domain.parameterKind || "legacy_path_only"}</Text>
                {domain.support === "unsupported" ? (
                  <View accessibilityRole="alert" style={styles.unsupportedBox}>
                    <Text style={styles.unsupportedText}>
                      {zh ? "当前参数 registry 不支持；禁止提交。" : "Unsupported by this parameter registry; submission is disabled."}
                    </Text>
                  </View>
                ) : (
                  <Button
                    active={selectedDomainId === domain.domainId}
                    label={zh ? "编辑参数" : "Edit parameters"}
                    disabled={!canPreview || Boolean(visiblePreview)}
                    onPress={() => chooseDomain(domain)}
                  />
                )}
              </View>
            ))}

            {!view.legalSpace && (
              <Text style={styles.emptyText}>
                {zh ? "先从服务器加载当前修订的 LegalSpace。" : "Load the current revision's LegalSpace from the server."}
              </Text>
            )}
          </ScrollView>

          {selectedDomain && draft && (
            <View style={styles.editorCard}>
              <Text style={styles.panelTitle}>{zh ? "参数提案" : "Parameter proposal"}</Text>
              <Text style={styles.metaText}>{selectedDomain.domainId}</Text>
              {selectedDomain.support === "official_standard_move" && (
                <>
                  <Text style={styles.editorLabel}>{zh ? "1. 显式选择 Leading Model" : "1. Explicitly select the leading model"}</Text>
                  <View style={styles.wrapRow}>
                    {selectedDomain.modelIds.map((modelId) => (
                      <Button
                        key={modelId}
                        compact
                        active={draft.leadingModelId === modelId}
                        label={modelId}
                        onPress={() => selectLeadingModel(modelId)}
                      />
                    ))}
                  </View>
                </>
              )}
              <Text style={styles.editorLabel}>
                {selectedDomain.support === "official_standard_move"
                  ? (zh ? "2. 点战场逐个添加路径 waypoint" : "2. Tap the battlefield to append path waypoints")
                  : (zh ? "点战场逐个添加路径 waypoint" : "Tap the battlefield to append path waypoints")}
              </Text>
              <View style={styles.wrapRow}>
                <Button compact active={draft.mode === "path"} label={zh ? "路径模式" : "Path mode"} onPress={() => setDraft({ ...draft, mode: "path" })} />
                <Button compact label={zh ? "撤销路径点" : "Undo waypoint"} disabled={draft.path.length === 0} onPress={() => setDraft({ ...draft, path: draft.path.slice(0, -1) })} />
              </View>
              <Text style={styles.metaText}>waypoints: {draft.path.length}{selectedDomain.maxPathPoints ? ` / ${selectedDomain.maxPathPoints}` : ""}</Text>

              <View style={styles.coordinateEditor}>
                <Text style={styles.editorLabel}>
                  {zh ? "非手势坐标输入（英寸）" : "Non-gesture coordinate input (inches)"}
                </Text>
                <View style={styles.coordinateRow}>
                  <View style={styles.coordinateField}>
                    <Text style={styles.coordinateLabel}>X</Text>
                    <TextInput
                      accessibilityLabel={zh ? "战场 X 坐标，英寸" : "Battlefield X coordinate in inches"}
                      editable={operational}
                      keyboardType="decimal-pad"
                      onChangeText={(value) => setCoordinateInput((current) => ({ ...current, xInches: value }))}
                      placeholder="0–54"
                      placeholderTextColor="#64748b"
                      style={styles.coordinateInput}
                      value={coordinateInput.xInches}
                    />
                  </View>
                  <View style={styles.coordinateField}>
                    <Text style={styles.coordinateLabel}>Y</Text>
                    <TextInput
                      accessibilityLabel={zh ? "战场 Y 坐标，英寸" : "Battlefield Y coordinate in inches"}
                      editable={operational}
                      keyboardType="decimal-pad"
                      onChangeText={(value) => setCoordinateInput((current) => ({ ...current, yInches: value }))}
                      placeholder="0–36"
                      placeholderTextColor="#64748b"
                      style={styles.coordinateInput}
                      value={coordinateInput.yInches}
                    />
                  </View>
                  <Button
                    compact
                    label={draft.mode === "placements"
                      ? (zh ? "放置下一模型" : "Place next model")
                      : (zh ? "添加路径点" : "Add waypoint")}
                    disabled={!operational
                      || coordinateInput.xInches.trim() === ""
                      || coordinateInput.yInches.trim() === ""
                      || (draft.mode === "placements" && !nextPlacementModelId)}
                    onPress={addCoordinateInput}
                  />
                </View>
              </View>

              {selectedDomain.support === "official_standard_move" && (
                <>
                  <Text style={styles.editorLabel}>{zh ? "3. 逐个放置其余模型" : "3. Place each remaining model"}</Text>
                  <View style={styles.wrapRow}>
                    <Button
                      compact
                      active={draft.mode === "placements"}
                      label={zh ? "放置模式" : "Placement mode"}
                      disabled={!draft.leadingModelId || draft.path.length === 0}
                      onPress={() => setDraft({ ...draft, mode: "placements" })}
                    />
                    <Button
                      compact
                      label={zh ? "撤销放置" : "Undo placement"}
                      disabled={draft.placements.length === 0}
                      onPress={() => setDraft({ ...draft, placements: draft.placements.slice(0, -1) })}
                    />
                  </View>
                  <Text style={styles.metaText}>
                    {nextPlacementModelId
                      ? `${zh ? "下一模型" : "Next model"}: ${nextPlacementModelId}`
                      : `${zh ? "放置完成" : "Placements complete"}: ${draft.placements.length}/${activeRemainingModelIds.length}`}
                  </Text>
                </>
              )}
              <Button
                label={pending === "preview" ? (zh ? "校验中…" : "Previewing…") : (zh ? "提交权威 Preview" : "Request authoritative Preview")}
                disabled={!canPreview || !parameterDraftReady || Boolean(visiblePreview)}
                onPress={previewParameterized}
              />
              <Text style={styles.boundaryText}>
                {zh
                  ? "本编辑器不计算距离、碰撞、连贯或合法落点；服务器会拒绝非法参数。"
                  : "This editor does not decide distance, collision, coherency, or legality; the server rejects invalid parameters."}
              </Text>
            </View>
          )}

          {visiblePreview && (
            <View accessibilityLiveRegion="polite" style={styles.previewCard}>
              <Text style={styles.previewTitle}>{zh ? "密封 Preview，等待真人确认" : "Sealed Preview awaiting human confirmation"}</Text>
              <Text style={styles.metaText}>previewId: {actionText(scene.previewId)}</Text>
              <Text style={styles.metaText}>action: {actionText(view.pendingPreview?.core?.action?.actionType)}</Text>
              <Text style={styles.metaText}>events: {Array.isArray(view.pendingPreview?.core?.result?.events) ? view.pendingPreview.core.result.events.length : 0}</Text>
              <Text style={styles.metaText}>chance pending: {view.pendingPreview?.core?.result?.chancePending === true ? "true" : "false"}</Text>
              <View style={styles.wrapRow}>
                <Button
                  label={pending === "apply" ? (zh ? "应用中…" : "Applying…") : (zh ? "确认并应用" : "Confirm and apply")}
                  disabled={!canApply}
                  onPress={confirmAndApply}
                />
                <Button
                  label={zh ? "取消本地界面" : "Dismiss locally"}
                  disabled={pending !== null}
                  onPress={() => {
                    setDismissedPreviewId(scene.previewId);
                    setNotice(zh ? "仅清除本地确认界面；房间状态未改变。" : "Only the local confirmation UI was dismissed; room state did not change.");
                  }}
                />
              </View>
            </View>
          )}
            </>
          ) : (
            <View style={styles.receiptCard}>
              <Text style={styles.panelTitle}>{zh ? "收据与重放" : "Receipt & replay"}</Text>
              <Text style={styles.metaText}>integrity: {integrityBlocked ? "blocked" : view.replay ? "verified" : "not_checked"}</Text>
              <Text style={styles.metaText}>journal: {actionText(view.lastReceipt?.journalHash)}</Text>
              <Text style={styles.metaText}>revision: {actionText(view.lastReceipt?.preStateRevision)} → {actionText(view.lastReceipt?.postStateRevision)}</Text>
              <Text style={styles.metaText}>signature: {actionText(view.lastReceipt?.refereeSignature?.signatureAlgorithm)}</Text>
              <Text style={styles.metaText}>matches current: {actionText(view.replay?.matchesCurrent)}</Text>
              <Text style={styles.metaText}>receipts: {actionText(view.replay?.receiptCount)}</Text>
              <Button
                label={pending === "replay" ? (zh ? "验证中…" : "Verifying…") : (zh ? "再次验证 Replay" : "Verify replay again")}
                disabled={!operational}
                onPress={verifyReplay}
              />
              {integrityBlocked && (
                <Button
                  label={pending === "replay" ? (zh ? "恢复中…" : "Recovering…") : (zh ? "刷新权威并重验" : "Refresh authority and revalidate")}
                  disabled={!canRecoverIntegrity}
                  onPress={revalidateAuthority}
                />
              )}
            </View>
          )}
        </View>
      </View>

      {(notice || errorCode) && (
        <View accessibilityLiveRegion="polite" style={styles.feedback}>
          {notice && <Text style={styles.noticeText}>{notice}</Text>}
          {errorCode && <Text selectable style={styles.errorText}>error: {errorCode}</Text>}
        </View>
      )}

      {scene.diagnostics.length > 0 && (
        <View style={styles.diagnosticsCard}>
          <Text style={styles.diagnosticsTitle}>{zh ? "Fail-closed 渲染诊断" : "Fail-closed rendering diagnostics"}</Text>
          {scene.diagnostics.slice(0, 12).map((entry) => (
            <Text key={entry} style={styles.metaText}>• {entry}</Text>
          ))}
          {scene.diagnostics.length > 12 && <Text style={styles.metaText}>+{scene.diagnostics.length - 12} more</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: 16, padding: 16, backgroundColor: "#07111f", borderWidth: 1, borderColor: "#164e63", gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  titleCopy: { flex: 1 },
  eyebrow: { color: "#22d3ee", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  title: { color: "#f8fafc", fontSize: 20, fontWeight: "900", marginTop: 5 },
  subtitle: { color: "#94a3b8", fontSize: 12, lineHeight: 18, marginTop: 5 },
  revisionPill: { minHeight: 44, minWidth: 56, borderRadius: 22, borderWidth: 1, borderColor: "#22d3ee", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  revisionText: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  warning: { borderRadius: 10, padding: 12, backgroundColor: "#422006", borderWidth: 1, borderColor: "#f59e0b" },
  warningTitle: { color: "#fef3c7", fontWeight: "900", fontSize: 13 },
  warningText: { color: "#fde68a", fontSize: 12, lineHeight: 18, marginTop: 4 },
  workspace: { gap: 14 },
  workspaceDesktop: { flexDirection: "row", alignItems: "flex-start" },
  boardPane: { flex: 1, minWidth: 0, gap: 10 },
  viewportControls: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7 },
  zoomText: { minWidth: 44, color: "#cbd5e1", textAlign: "center", fontSize: 11, fontWeight: "800" },
  boardFrame: { width: "100%", overflow: "hidden", borderRadius: 10, backgroundColor: "#020617", borderWidth: 1, borderColor: "#334155" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendText: { color: "#64748b", fontSize: 10 },
  accessibleList: { borderRadius: 10, padding: 10, backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#1e293b", gap: 8 },
  horizontalModelRow: { flexDirection: "row", gap: 7, paddingBottom: 5 },
  mediaCard: { minHeight: 96, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, borderRadius: 10, padding: 10, backgroundColor: "#08202d", borderWidth: 1, borderColor: "#155e75" },
  commPortrait: { width: 86, height: 72, borderRadius: 8, backgroundColor: "#020617", borderWidth: 1, borderColor: "#67e8f9" },
  mediaCopy: { minWidth: 180, flex: 1, gap: 4 },
  mediaControls: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  sidePanel: { gap: 10 },
  sidePanelDesktop: { width: 360, maxHeight: 760 },
  detailTabs: { flexDirection: "row", flexWrap: "wrap", gap: 7, padding: 7, borderRadius: 10, backgroundColor: "#020617", borderWidth: 1, borderColor: "#1e3a4a" },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  panelTitle: { flex: 1, color: "#e2e8f0", fontSize: 13, fontWeight: "900" },
  actionScroll: { maxHeight: 300 },
  actionCard: { borderRadius: 10, padding: 11, marginBottom: 8, backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155", gap: 7 },
  actionTitle: { color: "#e2e8f0", fontSize: 12, fontWeight: "800" },
  metaText: { color: "#64748b", fontSize: 10, lineHeight: 15, fontFamily: "monospace" },
  emptyText: { color: "#64748b", fontSize: 12, lineHeight: 18, paddingVertical: 14 },
  editorCard: { borderRadius: 10, padding: 12, backgroundColor: "#111827", borderWidth: 1, borderColor: "#475569", gap: 8 },
  editorLabel: { color: "#cbd5e1", fontSize: 11, fontWeight: "800", marginTop: 3 },
  coordinateEditor: { gap: 6, borderRadius: 8, borderWidth: 1, borderColor: "#334155", padding: 8 },
  coordinateRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 7 },
  coordinateField: { minWidth: 92, flexGrow: 1, gap: 3 },
  coordinateLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "800" },
  coordinateInput: { minHeight: 44, borderRadius: 7, borderWidth: 1, borderColor: "#475569", backgroundColor: "#020617", color: "#f8fafc", paddingHorizontal: 10, fontSize: 13 },
  boundaryText: { color: "#94a3b8", fontSize: 10, lineHeight: 16 },
  previewCard: { borderRadius: 10, padding: 12, backgroundColor: "#082f49", borderWidth: 1, borderColor: "#22d3ee", gap: 7 },
  previewTitle: { color: "#cffafe", fontSize: 13, fontWeight: "900" },
  receiptCard: { borderRadius: 10, padding: 12, backgroundColor: "#052e16", borderWidth: 1, borderColor: "#22c55e", gap: 6 },
  unsupportedBox: { borderRadius: 7, padding: 8, backgroundColor: "#451a03", borderWidth: 1, borderColor: "#f59e0b" },
  unsupportedText: { color: "#fde68a", fontSize: 10, lineHeight: 15 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  button: { minHeight: 44, minWidth: 108, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#475569", backgroundColor: "#172554", alignItems: "center", justifyContent: "center" },
  compactButton: { minWidth: 44, paddingHorizontal: 10 },
  buttonActive: { borderColor: "#22d3ee", backgroundColor: "#164e63" },
  buttonDisabled: { opacity: 0.38 },
  buttonPressed: { opacity: 0.72 },
  buttonText: { color: "#f8fafc", fontSize: 11, fontWeight: "900" },
  feedback: { borderRadius: 9, padding: 10, backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155" },
  noticeText: { color: "#a7f3d0", fontSize: 11, lineHeight: 17 },
  errorText: { color: "#fca5a5", fontSize: 10, lineHeight: 16, fontFamily: "monospace" },
  diagnosticsCard: { borderRadius: 9, padding: 10, backgroundColor: "#1c1917", borderWidth: 1, borderColor: "#78716c" },
  diagnosticsTitle: { color: "#fbbf24", fontSize: 11, fontWeight: "900", marginBottom: 5 },
});
