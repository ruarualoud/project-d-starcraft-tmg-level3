import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  type ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { useI18n } from "@/lib/i18n";
import { useLevel3ClientDomain } from "@/lib/level3/client-domain-provider";
import { CompanionCataloguePanel } from "./companion-catalogue-panel";

// Slice 266f sheet-portal repair (found by the FIRST real run of the focused
// 266f gate: FOCUS_SHEET_NOT_LEFT_ANCHORED). react-native-web 0.21 gives every
// ScrollView base `transform: translateZ(0)` for compositing, so the floating
// dock's ScrollView becomes the containing block for any `position: fixed`
// descendant and the sheet anchored to the shrink-wrapped dock instead of the
// viewport. The dock chrome file is outside this slice's manifest scope, so on
// web the expanded sheet is portaled to document.body, escaping the
// transformed ancestor entirely. The literal require below is evaluated only
// on web and is shaken out of native bundles via the EXPO_OS platform
// constant. Native and mid-widths keep the in-dock layout; every testID is
// unchanged.
function portalSheetToBody(node: React.ReactNode): React.ReactNode {
  if (process.env.EXPO_OS !== "web" || typeof document === "undefined") {
    return node;
  }
  const { createPortal } = require("react-dom") as typeof import("react-dom");
  return createPortal(node, document.body);
}
import { COMPANION_CATALOGUE_V1 } from "../../../../content/characters/companion-catalogue-v1.mjs";
import {
  companionPortraitAnimationTransitionV1,
  resolveCompanionPortraitAnimationStateV1,
} from "../../../../content/characters/companion-portrait-animation-binding-v1.mjs";
import {
  companionPortraitFrameAssetV1,
  resolveCompanionPortraitAssetSourceV1,
  type CompanionPortraitStateId,
} from "@/lib/level3/companion-portrait-assets-v1";
import {
  createStarcraftTmgVisiblePortraitPlayerV2,
  resolveStarcraftTmgCharacterPortraitAssetUriV2,
  type StarcraftTmgVisibleCharacterFrame,
} from "@/lib/level3/character-presentation-mount-runtime.mjs";
import { useReducedMotion } from "@/lib/level3/use-reduced-motion";

const AGENT_MODES = ["tutor", "opponent", "commentator", "companion"] as const;
const MODE_INTENTS = {
  tutor: ["explain", "chat"],
  opponent: ["take_turn", "chat"],
  commentator: ["commentate"],
  companion: ["reflect", "chat"],
} as const;

type FloatingSectionKey =
  | "comms"
  | "chat"
  | "identity"
  | "catalogue"
  | "memory"
  | "session"
  | "provider"
  | "diagnostics";

/**
 * Codex-owned backend contract gaps rendered as honest unavailable states
 * (K3 guardrail §11: never invent a backend contract). Each identifier is
 * listed verbatim in the Slice 264 closure document.
 */
const CONTRACT_GAPS = {
  relationship: "COMPANION_RELATIONSHIP_STATE_PROJECTION",
  memoryLayers: "COMPANION_MEMORY_LAYERS_PROJECTION",
  importExportRestore: "COMPANION_IMPORT_EXPORT_RESTORE_CONTRACT",
  multiSpeaker: "MULTI_COMPANION_SIMULTANEOUS_SESSION",
  agentVsAgentPolicy: "AGENT_VS_AGENT_COMPANION_POLICY_SURFACE",
} as const;

const MAX_TRANSCRIPT_MESSAGES = 64;
const MAX_CHAT_COMPANIONS = 6;

/**
 * Slice 266f: StarCraft blue/cyan communications language. `COMMS` is the
 * only palette non-warning surfaces may use; every amber literal lives in
 * `WARN` and is referenced ONLY by warning surfaces (pending human
 * confirmation, Provider interruption, risk lines, withheld/shared-frame
 * honesty badges, parity gap rows). The 266f gate asserts this source-level
 * invariant and the rendered computed colors.
 */
const COMMS = {
  spaceDeep: "#04101d",
  panel: "#071726",
  panelAlt: "#0a2136",
  section: "#081c2f",
  raised: "#0d2740",
  line: "#164a6e",
  lineSoft: "#123c5a",
  lineStrong: "#1f7ab5",
  action: "#0f3d5f",
  cyan: "#3cc4f2",
  cyanBright: "#86e3ff",
  cyanSoft: "#b9ecff",
  ice: "#ecf7ff",
  text: "#d9edf9",
  textDim: "#93b8cc",
  textFaint: "#6f95aa",
  good: "#35d0a0",
  offline: "#5b7484",
} as const;

const WARN = {
  amber: "#f0b64c",
  amberBright: "#ffd694",
  amberDeep: "#33270f",
  amberLine: "#96721f",
  danger: "#ef8f80",
  dangerDeep: "#3c201c",
  dangerLine: "#8a5049",
} as const;

/** Desktop wide focus mode / mobile full-screen sheet breakpoints (web). */
const FOCUS_WIDE_MIN_WIDTH = 1024;
const MOBILE_SHEET_MAX_WIDTH = 768;

/**
 * Registered companion package id ↔ catalogue character id. The product
 * module registers `starcraft-tmg.companion.<slug>` per catalogue entry; the
 * roster UI keys portraits by `starcraft.<slug>`. Both mappings are pure
 * string derivations from the same slug — no lookup table can drift.
 */
function companionPackageIdFromCharacterId(characterId: string) {
  const slug = characterId.split(".")[1] || characterId;
  return `starcraft-tmg.companion.${slug}`;
}

function characterIdFromCompanionPackageId(packageId: string) {
  const slug = packageId.replace(/^starcraft-tmg\.companion\./u, "");
  return `starcraft.${slug}`;
}

interface CompanionChatCheckpoint {
  checkpointId: string;
  label: string;
  turnSequence?: number;
}

interface CompanionChatActiveBranch {
  branchId: string;
  kind: string;
  candidateEntryId: string | null;
}

interface CompanionChatState {
  bootstrapped: boolean;
  busy: boolean;
  statusResult: any | null;
  catalogueResult: any | null;
  conversation: any | null;
  lastOperation: string | null;
  error: { code: string; message?: string } | null;
  interrupted: {
    reason: string;
    pendingParticipantId?: string;
    retryPolicy?: string;
  } | null;
  checkpoints: CompanionChatCheckpoint[];
  selectedPackageIds: string[];
  mentionPackageIds: string[];
  draft: string;
  // Slice 266d: Tavern-equivalent surfaces (all server results, verbatim).
  persona: any | null;
  worldbook: any | null;
  memoryDetail: any | null;
  branchesResult: any | null;
  activeBranch: CompanionChatActiveBranch | null;
  authorsNote: any | null;
  auditResult: any | null;
  permissionSurfaces: any | null;
  packagePromotions: any | null;
  transferNote: string | null;
  lastExport: any | null;
  personaNameDraft: string;
  personaDescriptionDraft: string;
  worldbookIdDraft: string;
  worldbookKeywordDraft: string;
  worldbookContentDraft: string;
  summaryDraft: string;
  episodicDraft: string;
  authorsNoteDraft: string;
  authorsNoteDepthDraft: string;
  authorsNoteFrequencyDraft: string;
  branchEditDraft: string;
}

function configuredAssetOrigin() {
  const configured = process.env.EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN || "";
  if (configured) return configured;
  if (Platform.OS === "web") return "";
  return null;
}

export function TacticalAdjutantPanel({ onExpandedChange, variant = "inline" }: {
  onExpandedChange?: (expanded: boolean) => void;
  variant?: "inline" | "floating";
}) {
  const { lang } = useI18n();
  const {
    view,
    connection,
    secureProvider,
    companionProduct,
    productRoomKey,
    dispatch,
    dispatchProvider,
    refresh,
  } = useLevel3ClientDomain();
  const routeFocused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const floating = variant === "floating";
  const [expanded, setExpanded] = useState(!floating);
  const [frame, setFrame] = useState<StarcraftTmgVisibleCharacterFrame | null>(null);
  const [assetFailedFor, setAssetFailedFor] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<(typeof AGENT_MODES)[number]>("companion");
  const [selectedIntent, setSelectedIntent] = useState<string>("reflect");
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedProviderHash, setSelectedProviderHash] = useState("");
  const [providerConsent, setProviderConsent] = useState(false);
  const [providerKeyDraft, setProviderKeyDraft] = useState("");
  const [providerSubmitting, setProviderSubmitting] = useState(false);
  // Ephemeral per-mount receipt of a catalogue load the user performed in
  // this window. The backend projection intentionally exposes no
  // `profilesLoaded` flag (derivedStatus() returns "session_required"
  // without a bound agent session even after a successful load), so the UI
  // reflects the completed operation itself — never persisted, never fake
  // state, and superseded whenever the projection reports "ready".
  const [catalogueLoaded, setCatalogueLoaded] = useState(false);
  // Live companion product chat (Ticket 26 / Slice 266c). Ephemeral UI state
  // only: the transcript, checkpoints and binding live server-side; the seat
  // token never enters this component (the Client Domain attaches it inside
  // its own module). Nothing here is persisted by the UI.
  const defaultCompanionPackageId = useMemo(() => {
    const entry = COMPANION_CATALOGUE_V1.entries.find((candidate: any) => candidate.defaultCompanion)
      || COMPANION_CATALOGUE_V1.entries[0];
    return companionPackageIdFromCharacterId(entry.characterId);
  }, []);
  const [chat, setChat] = useState<CompanionChatState>({
    bootstrapped: false,
    busy: false,
    statusResult: null,
    catalogueResult: null,
    conversation: null,
    lastOperation: null,
    error: null,
    interrupted: null,
    checkpoints: [],
    selectedPackageIds: [],
    mentionPackageIds: [],
    draft: "",
    persona: null,
    worldbook: null,
    memoryDetail: null,
    branchesResult: null,
    activeBranch: null,
    authorsNote: null,
    auditResult: null,
    permissionSurfaces: null,
    packagePromotions: null,
    transferNote: null,
    lastExport: null,
    personaNameDraft: "",
    personaDescriptionDraft: "",
    worldbookIdDraft: "",
    worldbookKeywordDraft: "",
    worldbookContentDraft: "",
    summaryDraft: "",
    episodicDraft: "",
    authorsNoteDraft: "",
    authorsNoteDepthDraft: "4",
    authorsNoteFrequencyDraft: "1",
    branchEditDraft: "",
  });
  const [sectionOverrides, setSectionOverrides] = useState<
    Partial<Record<FloatingSectionKey, boolean>>
  >({});
  const playerRef = useRef(createStarcraftTmgVisiblePortraitPlayerV2());
  const assetRecoveryAttempt = useRef<{
    bindingHash: string;
    contentHash: string;
  } | null>(null);
  const projection = view.characterPresentation;
  const offlineSnapshot = view.characterOfflineSnapshot;
  const characterStatus = view.characterStatus;
  const roleAgent = view.roleAgentSession;
  const zh = lang === "zh";
  const active = routeFocused
    && expanded
    && connection.visible
    && connection.online;
  const agentSessionActive = roleAgent?.lifecycleState === "active";
  const productRoom = Boolean(connection.roomId?.startsWith('product-'));
  const [roomProvider, setRoomProvider] = useState<any>(null);
  useEffect(() => {
    if (!productRoom || !active || chat.busy) return;
    let mounted = true;
    void productRoomKey.read().then(result => {
      if (mounted) setRoomProvider(result.ok ? result.provider : null);
    }).catch(() => {if (mounted) setRoomProvider(null);});
    return () => {mounted = false;};
  }, [productRoom, active, chat.busy, productRoomKey]);
  const roomChatUnavailable = productRoom && (!roomProvider?.enabled
    || !roomProvider?.configured || roomProvider?.remainingDispatches === 0);
  const agentBusy = roleAgent?.status === "sending" || submitting;
  const agentReadOnly = roleAgent?.readOnly !== false;
  const selectedProvider = secureProvider?.profiles.find(
    (profile) => profile.profileRef.hash === selectedProviderHash,
  ) || secureProvider?.profiles[0] || null;
  const providerBusy = providerSubmitting || [
    "loading_profiles", "preparing", "attaching", "refreshing", "detaching",
  ].includes(secureProvider?.status || "");
  const providerAttached = secureProvider?.attachment?.state === "attached";
  const viewer = view.roomProjection?.viewer || {};
  const viewerSeatKey = typeof viewer.seatKey === "string" ? viewer.seatKey : null;
  const viewerRoleMode = typeof viewer.roleMode === "string" ? viewer.roleMode : null;
  const humanPlayerSeat = viewerRoleMode === "player";

  // ── Slice 266f: wide desktop focus mode / mobile full-screen sheet ──
  // Web-only presentation geometry. The expanded floating body renders as a
  // viewport-fixed sheet: left-anchored and ≤ 66% of the viewport width on
  // desktop (the battlefield stays materially visible on the right and the
  // compact launcher chip is never covered), full-viewport on mobile. Every
  // testID is unchanged; on web the sheet is portaled to document.body
  // (module-level portalSheetToBody) because the dock ScrollView's RNW
  // compositing transform would otherwise trap position:fixed. Mid widths and
  // native keep the in-dock layout. The sheet receives events only inside its
  // own box; the dock layer keeps its pointerEvents="box-none" discipline.
  const { width: windowWidth } = useWindowDimensions();
  const webSheetCapable = floating && expanded && Platform.OS === "web";
  const wideFocusMode = webSheetCapable && windowWidth >= FOCUS_WIDE_MIN_WIDTH;
  const mobileSheetMode = webSheetCapable && windowWidth < MOBILE_SHEET_MAX_WIDTH;
  const focusSheetWidth = Math.min(
    940,
    Math.max(600, Math.floor(windowWidth * 0.58)),
  );
  // react-native-web honors viewport-fixed positioning; RN's style typing
  // does not list it, so it is applied as a plain object (native never
  // reaches these branches).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fixedSheetPosition = { position: "fixed" } as any;

  const floatingSectionDefaults: Record<FloatingSectionKey, boolean> = {
    comms: true,
    chat: productRoom,
    identity: false,
    catalogue: false,
    memory: false,
    session: !agentSessionActive,
    provider: false,
    diagnostics: false,
  };
  const sectionOpen = (key: FloatingSectionKey) => (
    sectionOverrides[key] ?? floatingSectionDefaults[key]
  );
  const toggleSection = (key: FloatingSectionKey) => {
    setSectionOverrides((current) => ({
      ...current,
      [key]: !(current[key] ?? floatingSectionDefaults[key]),
    }));
  };

  useEffect(() => {
    if (roleAgent?.mode && AGENT_MODES.includes(roleAgent.mode)) {
      setSelectedMode(roleAgent.mode);
    }
  }, [roleAgent?.mode]);

  useEffect(() => {
    if (!selectedProviderHash && secureProvider?.profiles[0]) {
      setSelectedProviderHash(secureProvider.profiles[0].profileRef.hash);
    }
  }, [secureProvider?.profiles, selectedProviderHash]);

  async function runAgentIntent(intent: Parameters<typeof dispatch>[0]) {
    setSubmitting(true);
    try {
      return await dispatch(intent);
    } finally {
      setSubmitting(false);
    }
  }

  async function runProviderIntent(
    intent: Parameters<typeof dispatchProvider>[0],
  ) {
    setProviderSubmitting(true);
    try {
      return await dispatchProvider(intent);
    } finally {
      setProviderSubmitting(false);
    }
  }

  async function prepareProviderAttachment() {
    if (!selectedProvider || !providerConsent || !agentSessionActive) return;
    await runProviderIntent({
      type: "prepare_attachment",
      providerProfileRef: selectedProvider.profileRef,
      consentAccepted: true,
    });
  }

  async function attachProviderSecret() {
    if (!providerKeyDraft || secureProvider?.status !== "awaiting_secret") return;
    const credentialBytes = new TextEncoder().encode(providerKeyDraft);
    setProviderKeyDraft("");
    try {
      await runProviderIntent({ type: "attach_secret", credentialBytes });
    } finally {
      credentialBytes.fill(0);
    }
  }

  function chooseMode(mode: (typeof AGENT_MODES)[number]) {
    setSelectedMode(mode);
    setSelectedIntent(MODE_INTENTS[mode][0]);
  }

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    onExpandedChange?.(next);
  }

  async function sendAgentMessage() {
    const message = draft.trim();
    if (!message || agentBusy || agentReadOnly) return;
    const response = await dispatch({
      type: "send_agent_message",
      intent: selectedIntent as "chat" | "explain" | "take_turn" | "commentate" | "reflect",
      message,
    });
    if (response.ok) setDraft("");
  }

  function patchChat(patch: Partial<CompanionChatState>) {
    setChat((current) => ({ ...current, ...patch }));
  }

  const effectiveChatSelection = chat.selectedPackageIds.length
    ? chat.selectedPackageIds
    : [defaultCompanionPackageId];

  function toggleChatCompanion(packageId: string) {
    if (chat.conversation || chat.busy) return;
    const current = effectiveChatSelection;
    const next = current.includes(packageId)
      ? current.filter((id) => id !== packageId)
      : [...current, packageId].slice(0, MAX_CHAT_COMPANIONS);
    if (!next.length) return; // 1..6 companions: never zero
    patchChat({ selectedPackageIds: next });
  }

  function toggleChatMention(packageId: string) {
    const current = chat.mentionPackageIds;
    patchChat({
      mentionPackageIds: current.includes(packageId)
        ? current.filter((id) => id !== packageId)
        : [...current, packageId],
    });
  }

  async function bootstrapChatSection() {
    if (!companionProduct) return;
    patchChat({ busy: true, error: null, lastOperation: "bootstrap" });
    try {
      const statusResult = await companionProduct.status();
      const catalogueResult = await companionProduct.catalogue();
      const active = await companionProduct.readActive();
      patchChat({
        bootstrapped: true,
        statusResult,
        catalogueResult,
        ...(active?.ok ? { conversation: active } : {}),
        error: statusResult?.ok
          ? null
          : { code: String(statusResult?.reason || "COMPANION_PRODUCT_STATUS_UNAVAILABLE") },
      });
    } finally {
      patchChat({ busy: false });
    }
  }

  async function openChatConversation() {
    if (!companionProduct || chat.busy) return;
    patchChat({ busy: true, error: null, interrupted: null, lastOperation: "open_or_resume" });
    try {
      const result = await companionProduct.openOrResume({
        packageIds: effectiveChatSelection,
      });
      if (result?.ok) {
        patchChat({ conversation: result, mentionPackageIds: [] });
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_OPEN_FAILED") } });
      }
    } finally {
      patchChat({ busy: false });
    }
  }

  async function sendChatMessage() {
    if (!companionProduct || chat.busy) return;
    const conversationId = chat.conversation?.conversationId;
    const content = chat.draft.trim();
    if (!conversationId || !content) return;
    patchChat({ busy: true, error: null, lastOperation: "send" });
    try {
      const result = await companionProduct.send({
        conversationId,
        content,
        mentions: chat.mentionPackageIds,
      });
      if (result?.ok) {
        patchChat({ conversation: result, draft: "", mentionPackageIds: [], interrupted: null });
        return;
      }
      const reason = String(result?.reason || "COMPANION_MESSAGE_FAILED");
      if (result?.acceptedHistoryPreserved
        || result?.retryPolicy === "explicit_continue_only_never_automatic") {
        // Provider turn interrupted: the accepted history is preserved
        // server-side, no reply is fabricated, and ONLY an explicit Continue
        // resumes it — there is no automatic retry anywhere in this path.
        patchChat({
          interrupted: {
            reason,
            pendingParticipantId: result?.pendingParticipantId,
            retryPolicy: result?.retryPolicy,
          },
        });
        const refreshed = await companionProduct.read({ conversationId });
        if (refreshed?.ok) patchChat({ conversation: refreshed });
        return;
      }
      patchChat({ error: { code: reason } });
    } finally {
      patchChat({ busy: false });
    }
  }

  async function continueChatConversation() {
    if (!companionProduct || chat.busy) return;
    const conversationId = chat.conversation?.conversationId;
    if (!conversationId) return;
    patchChat({ busy: true, error: null, lastOperation: "continue" });
    try {
      const result = await companionProduct.continue({ conversationId });
      if (result?.ok) {
        patchChat({ conversation: result, interrupted: null });
        return;
      }
      const reason = String(result?.reason || "COMPANION_CONTINUE_FAILED");
      if (result?.acceptedHistoryPreserved
        || result?.retryPolicy === "explicit_continue_only_never_automatic") {
        patchChat({
          interrupted: {
            reason,
            pendingParticipantId: result?.pendingParticipantId,
            retryPolicy: result?.retryPolicy,
          },
        });
        return;
      }
      patchChat({ error: { code: reason } });
    } finally {
      patchChat({ busy: false });
    }
  }

  async function checkpointChatConversation() {
    if (!companionProduct || chat.busy) return;
    const conversationId = chat.conversation?.conversationId;
    if (!conversationId) return;
    patchChat({ busy: true, error: null, lastOperation: "checkpoint" });
    try {
      const result = await companionProduct.checkpoint({
        conversationId,
        label: `manual-${new Date().toISOString()}`,
      });
      if (result?.ok && result.checkpoint?.checkpointId) {
        patchChat({
          checkpoints: [...chat.checkpoints, {
            checkpointId: result.checkpoint.checkpointId,
            label: result.checkpoint.label,
            turnSequence: result.checkpoint.turnSequence,
          }],
        });
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_CHECKPOINT_FAILED") } });
      }
    } finally {
      patchChat({ busy: false });
    }
  }

  async function resumeChatConversation(checkpointId?: string) {
    if (!companionProduct || chat.busy) return;
    const conversationId = chat.conversation?.conversationId;
    if (!conversationId) return;
    patchChat({ busy: true, error: null, interrupted: null, lastOperation: "resume" });
    try {
      const result = await companionProduct.resume(
        checkpointId ? { conversationId, checkpointId } : { conversationId },
      );
      if (result?.ok) {
        patchChat({ conversation: result });
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_RESUME_FAILED") } });
      }
    } finally {
      patchChat({ busy: false });
    }
  }

  async function closeChatConversation() {
    if (!companionProduct || chat.busy) return;
    const conversationId = chat.conversation?.conversationId;
    if (!conversationId) return;
    patchChat({ busy: true, error: null, lastOperation: "close" });
    try {
      const result = await companionProduct.close({ conversationId });
      if (result?.ok) {
        patchChat({
          conversation: null,
          interrupted: null,
          mentionPackageIds: [],
          checkpoints: [],
        });
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_CLOSE_FAILED") } });
      }
    } finally {
      patchChat({ busy: false });
    }
  }

  // ── Slice 266d: Tavern-equivalent companion operations ──
  // Every action calls the live companion product facade and renders the
  // server result verbatim; a rejection renders its reason, never a fake
  // success. `transferNote` is the single honesty line for import/export.

  function chatConversationId() {
    return chat.conversation?.conversationId || null;
  }

  async function runChatOp(operation: string, fn: () => Promise<any>) {
    if (!companionProduct || chat.busy) return null;
    patchChat({ busy: true, error: null, lastOperation: operation });
    try {
      return await fn();
    } finally {
      patchChat({ busy: false });
    }
  }

  async function refreshPersona() {
    await runChatOp("persona_read", async () => {
      const result = await companionProduct!.readPersona();
      if (result?.ok) patchChat({ persona: result });
      else patchChat({ error: { code: String(result?.reason || "COMPANION_PERSONA_READ_FAILED") } });
    });
  }

  async function savePersona() {
    const displayName = chat.personaNameDraft.trim();
    if (!displayName) return;
    await runChatOp("persona_put", async () => {
      const result = await companionProduct!.putPersona({
        displayName,
        description: chat.personaDescriptionDraft,
      });
      if (result?.ok) {
        patchChat({ persona: result });
        const refreshed = await companionProduct!.readActive();
        if (refreshed?.ok) patchChat({ conversation: refreshed });
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_PERSONA_WRITE_FAILED") } });
      }
    });
  }

  async function rollbackPersona(version: number) {
    await runChatOp("persona_rollback", async () => {
      const result = await companionProduct!.rollbackPersona({ version });
      if (result?.ok) patchChat({ persona: result });
      else patchChat({ error: { code: String(result?.reason || "COMPANION_PERSONA_ROLLBACK_FAILED") } });
    });
  }

  async function refreshWorldbook() {
    const conversationId = chatConversationId();
    if (!conversationId) return;
    await runChatOp("worldbook_read", async () => {
      const result = await companionProduct!.readWorldbook({ conversationId });
      if (result?.ok) patchChat({ worldbook: result });
      else patchChat({ error: { code: String(result?.reason || "COMPANION_WORLDBOOK_READ_FAILED") } });
    });
  }

  async function registerWorldbook() {
    const conversationId = chatConversationId();
    const entryId = chat.worldbookIdDraft.trim();
    const keyword = chat.worldbookKeywordDraft.trim();
    const content = chat.worldbookContentDraft.trim();
    if (!conversationId || !entryId || !keyword || !content) return;
    await runChatOp("worldbook_register", async () => {
      const result = await companionProduct!.registerWorldbookEntry({
        conversationId,
        entry: {
          entryId,
          label: entryId,
          content,
          triggers: [{ kind: "keyword", keywords: [keyword] }],
          priority: 10,
          tokenBudget: 256,
        },
      });
      if (result?.ok) {
        patchChat({
          worldbookIdDraft: "",
          worldbookKeywordDraft: "",
          worldbookContentDraft: "",
        });
        await refreshWorldbook();
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_WORLDBOOK_REGISTER_FAILED") } });
      }
    });
  }

  async function refreshMemory() {
    const conversationId = chatConversationId();
    if (!conversationId) return;
    await runChatOp("memory_read", async () => {
      const result = await companionProduct!.readMemory({ conversationId });
      if (result?.ok) patchChat({ memoryDetail: result });
      else patchChat({ error: { code: String(result?.reason || "COMPANION_MEMORY_READ_FAILED") } });
    });
  }

  async function saveSummary() {
    const conversationId = chatConversationId();
    const content = chat.summaryDraft.trim();
    if (!conversationId || !content) return;
    await runChatOp("memory_summary_write", async () => {
      const result = await companionProduct!.writeSummary({ conversationId, content });
      if (result?.ok) {
        patchChat({ summaryDraft: "" });
        await refreshMemory();
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_SUMMARY_WRITE_FAILED") } });
      }
    });
  }

  async function rollbackSummary(summaryVersion: number) {
    const conversationId = chatConversationId();
    if (!conversationId) return;
    await runChatOp("memory_summary_rollback", async () => {
      const result = await companionProduct!.rollbackSummary({ conversationId, summaryVersion });
      if (result?.ok) await refreshMemory();
      else patchChat({ error: { code: String(result?.reason || "COMPANION_SUMMARY_ROLLBACK_FAILED") } });
    });
  }

  async function addEpisodic() {
    const conversationId = chatConversationId();
    const content = chat.episodicDraft.trim();
    if (!conversationId || !content) return;
    await runChatOp("memory_episodic_add", async () => {
      const result = await companionProduct!.addEpisodicFact({ conversationId, content });
      if (result?.ok) {
        patchChat({ episodicDraft: "" });
        await refreshMemory();
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_EPISODIC_WRITE_FAILED") } });
      }
    });
  }

  async function refreshBranches() {
    const conversationId = chatConversationId();
    if (!conversationId) return;
    await runChatOp("branches_list", async () => {
      const result = await companionProduct!.listBranches({ conversationId });
      if (result?.ok) patchChat({ branchesResult: result });
      else patchChat({ error: { code: String(result?.reason || "COMPANION_BRANCH_LIST_FAILED") } });
    });
  }

  // Swipe the most recent companion reply: open a swipe branch on the last
  // companion turn and immediately reroll once through the real provider
  // path. The candidate is NOT accepted until the human accepts it.
  async function swipeLastReply() {
    const conversationId = chatConversationId();
    const conversation = chat.conversation;
    if (!conversationId || !conversation) return;
    const lastCompanionTurn = [...(conversation.messages || [])].reverse()
      .find((message: any) => message.participantId !== conversation.userParticipantId);
    if (!lastCompanionTurn) return;
    await runChatOp("branch_swipe", async () => {
      const opened: any = await companionProduct!.openBranch({
        conversationId,
        kind: "swipe",
        baseTurnSequence: lastCompanionTurn.turnSequence,
      });
      if (!opened?.ok) {
        patchChat({ error: { code: String(opened?.reason || "COMPANION_BRANCH_OPEN_FAILED") } });
        return;
      }
      const branchId = opened.branch.branchId;
      const rerolled: any = await companionProduct!.rerollBranch({ conversationId, branchId });
      if (!rerolled?.ok) {
        patchChat({
          activeBranch: { branchId, kind: "swipe", candidateEntryId: null },
          error: { code: String(rerolled?.reason || "COMPANION_BRANCH_REROLL_FAILED") },
        });
        return;
      }
      patchChat({
        activeBranch: { branchId, kind: "swipe", candidateEntryId: rerolled.entry.entryId },
        error: null,
      });
      await refreshBranches();
    });
  }

  // Edit-as-branch on the user's own most recent turn.
  async function editLastUserMessage() {
    const conversationId = chatConversationId();
    const conversation = chat.conversation;
    if (!conversationId || !conversation) return;
    const lastUserTurn = [...(conversation.messages || [])].reverse()
      .find((message: any) => message.participantId === conversation.userParticipantId);
    if (!lastUserTurn) return;
    patchChat({ branchEditDraft: String(lastUserTurn.content || "") });
    await runChatOp("branch_edit", async () => {
      const opened: any = await companionProduct!.openBranch({
        conversationId,
        kind: "edit",
        baseTurnSequence: lastUserTurn.turnSequence,
      });
      if (!opened?.ok) {
        patchChat({ error: { code: String(opened?.reason || "COMPANION_BRANCH_OPEN_FAILED") } });
        return;
      }
      patchChat({
        activeBranch: { branchId: opened.branch.branchId, kind: "edit", candidateEntryId: null },
      });
      await refreshBranches();
    });
  }

  async function submitBranchEdit() {
    const conversationId = chatConversationId();
    const content = chat.branchEditDraft.trim();
    const branch = chat.activeBranch;
    if (!conversationId || !branch || branch.kind !== "edit" || !content) return;
    await runChatOp("branch_edit_submit", async () => {
      const result: any = await companionProduct!.submitBranchEdit({
        conversationId,
        branchId: branch.branchId,
        content,
      });
      if (result?.ok) {
        patchChat({
          activeBranch: { ...branch, candidateEntryId: result.entry.entryId },
          error: null,
        });
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_BRANCH_EDIT_FAILED") } });
      }
    });
  }

  async function acceptActiveBranch() {
    const conversationId = chatConversationId();
    const branch = chat.activeBranch;
    if (!conversationId || !branch?.candidateEntryId) return;
    const candidateEntryId: string = branch.candidateEntryId;
    await runChatOp("branch_accept", async () => {
      const result: any = await companionProduct!.acceptBranch({
        conversationId,
        branchId: branch.branchId,
        entryId: candidateEntryId,
      });
      if (result?.ok) {
        patchChat({ conversation: result, activeBranch: null, branchEditDraft: "" });
        await refreshBranches();
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_BRANCH_ACCEPT_FAILED") } });
      }
    });
  }

  async function discardActiveBranch() {
    const conversationId = chatConversationId();
    const branch = chat.activeBranch;
    if (!conversationId || !branch) return;
    await runChatOp("branch_discard", async () => {
      const result = await companionProduct!.discardBranch({
        conversationId,
        branchId: branch.branchId,
      });
      if (result?.ok) {
        patchChat({ activeBranch: null, branchEditDraft: "" });
        await refreshBranches();
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_BRANCH_DISCARD_FAILED") } });
      }
    });
  }

  async function refreshAuthorsNote() {
    const conversationId = chatConversationId();
    if (!conversationId) return;
    await runChatOp("authors_note_read", async () => {
      const result = await companionProduct!.readAuthorsNote({ conversationId });
      if (result?.ok) {
        patchChat({
          authorsNote: result,
          ...(result.note != null ? { authorsNoteDraft: String(result.note) } : {}),
        });
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_AUTHORS_NOTE_READ_FAILED") } });
      }
    });
  }

  async function saveAuthorsNote() {
    const conversationId = chatConversationId();
    if (!conversationId) return;
    const depth = Math.max(0, Math.min(8, Number(chat.authorsNoteDepthDraft) || 0));
    const frequency = Math.max(1, Math.min(16, Number(chat.authorsNoteFrequencyDraft) || 1));
    await runChatOp("authors_note_put", async () => {
      const result = await companionProduct!.putAuthorsNote({
        conversationId,
        note: chat.authorsNoteDraft,
        depth,
        frequency,
      });
      if (result?.ok) patchChat({ authorsNote: result });
      else patchChat({ error: { code: String(result?.reason || "COMPANION_AUTHORS_NOTE_WRITE_FAILED") } });
    });
  }

  async function exportChatConversation() {
    const conversationId = chatConversationId();
    if (!conversationId) return;
    await runChatOp("conversation_export", async () => {
      const result: any = await companionProduct!.exportConversation({ conversationId });
      if (result?.ok) {
        patchChat({
          lastExport: result.export,
          transferNote: `export ok · integrity ${String(result.exportHash).slice(0, 16)}… · credentialsIncluded: false`,
        });
      } else {
        patchChat({ transferNote: `export rejected · ${String(result?.reason || "COMPANION_EXPORT_FAILED")}` });
      }
    });
  }

  async function restoreChatConversation() {
    if (!chat.lastExport) return;
    await runChatOp("conversation_restore", async () => {
      const result = await companionProduct!.restoreConversation({ export: chat.lastExport });
      // Restoring into the live conversation id is honestly rejected
      // (restore never overwrites); the rejection reason is rendered as-is.
      patchChat({
        transferNote: result?.ok
          ? `restore ok · ${result.conversationId}`
          : `restore rejected (never overwrites) · ${String(result?.reason || "COMPANION_RESTORE_FAILED")}`,
      });
    });
  }

  async function exportChatWorldbook() {
    const conversationId = chatConversationId();
    if (!conversationId) return;
    await runChatOp("worldbook_export", async () => {
      const result: any = await companionProduct!.exportWorldbook({ conversationId });
      patchChat({
        transferNote: result?.ok
          ? `worldbook export ok · entries ${result.entryCount} · integrity ${String(result.export?.integrity?.hash || "").slice(0, 12)}…`
          : `worldbook export rejected · ${String(result?.reason || "COMPANION_WORLDBOOK_EXPORT_FAILED")}`,
      });
    });
  }

  async function importChatWorldbook() {
    const conversationId = chatConversationId();
    if (!conversationId) return;
    await runChatOp("worldbook_import", async () => {
      const result: any = await companionProduct!.importWorldbook({
        conversationId,
        entries: [{
          entryId: `ui-import-${Date.now().toString(36)}`,
          label: "UI import",
          content: "Imported from the companion window: the user favors defensive play.",
          triggers: [{ kind: "keyword", keywords: ["defensive"] }],
          priority: 5,
          tokenBudget: 128,
        }],
      });
      if (result?.ok) {
        patchChat({ transferNote: `worldbook import ok · registered ${result.registered?.length ?? 0}` });
        await refreshWorldbook();
      } else {
        patchChat({ transferNote: `worldbook import rejected · ${String(result?.reason || "COMPANION_WORLDBOOK_IMPORT_FAILED")}` });
      }
    });
  }

  async function verifyChatAudit() {
    await runChatOp("audit_verify", async () => {
      const result: any = await companionProduct!.verifyAudit();
      if (result?.ok) patchChat({ auditResult: { kind: "verify", ...result.verify } });
      else patchChat({ error: { code: String(result?.reason || "COMPANION_AUDIT_VERIFY_FAILED") } });
    });
  }

  async function exportChatAudit() {
    await runChatOp("audit_export", async () => {
      const result: any = await companionProduct!.readAuditExport();
      if (result?.ok) {
        patchChat({
          auditResult: {
            kind: "export",
            entryCount: result.export?.entries?.length ?? 0,
            headHash: result.export?.integrity?.hash || null,
          },
        });
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_AUDIT_EXPORT_FAILED") } });
      }
    });
  }

  async function buildChatReplayCandidate() {
    const conversationId = chatConversationId();
    await runChatOp("audit_replay_candidate", async () => {
      const result: any = await companionProduct!.buildReplayCandidate({
        sessionRef: { sessionId: conversationId || "none" },
      });
      if (result?.ok) {
        patchChat({
          auditResult: {
            kind: "replay-candidate",
            candidateId: result.candidate?.candidateId,
            promotion: result.candidate?.promotion?.automatic || "forbidden",
          },
        });
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_REPLAY_CANDIDATE_FAILED") } });
      }
    });
  }

  async function loadPermissionSurfaces() {
    await runChatOp("permission_surfaces", async () => {
      const result = await companionProduct!.readPermissionSurfaces();
      if (result?.ok) patchChat({ permissionSurfaces: result });
      else patchChat({ error: { code: String(result?.reason || "COMPANION_PERMISSION_SURFACES_FAILED") } });
    });
  }

  // ── Slice 266e: package-to-backend promotion (real server contract) ──
  async function loadPackagePromotions() {
    await runChatOp("package_promotions", async () => {
      const result = await companionProduct!.readPackagePromotions();
      if (result?.ok) patchChat({ packagePromotions: result });
      else patchChat({ error: { code: String(result?.reason || "COMPANION_PACKAGE_PROMOTIONS_FAILED") } });
    });
  }

  async function promoteChatPackage(packageId: string) {
    await runChatOp("package_promote", async () => {
      const result = await companionProduct!.promotePackage({ packageId });
      if (result?.ok) {
        const refreshed = await companionProduct!.readPackagePromotions();
        if (refreshed?.ok) patchChat({ packagePromotions: refreshed });
      } else {
        patchChat({ error: { code: String(result?.reason || "COMPANION_PACKAGE_PROMOTE_FAILED") } });
      }
    });
  }

  const chatBootstrapRef = useRef(false);
  const chatSectionVisible = floating && expanded && sectionOpen("chat");
  useEffect(() => {
    if (!chatSectionVisible || !companionProduct || chatBootstrapRef.current) return;
    chatBootstrapRef.current = true;
    void bootstrapChatSection();
  }, [chatSectionVisible, companionProduct]);

  useEffect(() => {
    const player = playerRef.current;
    let stop = () => player.stop();
    if (!projection) {
      player.stop();
      setFrame(null);
      return stop;
    }
    stop = player.start(
      { projection, active, reducedMotion },
      (nextFrame) => setFrame(nextFrame),
    );
    return () => {
      stop();
    };
  }, [active, projection, reducedMotion]);

  useEffect(() => () => playerRef.current.stop(), []);
  useEffect(() => setAssetFailedFor(null), [projection?.projectionHash]);

  const assetUri = useMemo(() => {
    const origin = configuredAssetOrigin();
    if (!projection || !frame?.contentHash || origin === null) return null;
    try {
      return resolveStarcraftTmgCharacterPortraitAssetUriV2(
        projection,
        frame.contentHash,
        { assetOrigin: origin },
      );
    } catch {
      return null;
    }
  }, [frame?.contentHash, projection]);
  const assetFailureKey = frame?.contentHash
    ? `${frame.generationKey}:${frame.contentHash}`
    : null;
  const imageAvailable = Boolean(assetUri && frame && assetFailedFor !== assetFailureKey);
  const publicFallback = projection?.releaseChannel === "public";
  const selectedPersona = projection?.releaseChannel === "development_internal"
    ? projection.selector.options.find((option) => option.kind === "persona" && option.selected)
    : null;
  const cachedPersona = !projection && offlineSnapshot?.releaseChannel === "development_internal"
    ? offlineSnapshot.selectedPersona
    : null;

  const identityTitle = publicFallback
    ? projection.fallback.label
    : projection?.releaseChannel === "development_internal"
      ? projection.character.displayName
      : cachedPersona
        ? (zh ? "已封存的离线副官" : "Sealed offline Adjutant")
        : characterStatus?.rejectionCode
          ? (zh ? "副官 · 投影已扣留" : "Adjutant · projection withheld")
          : (zh ? "凯瑞甘副官 · 待连接" : "Kerrigan Adjutant · awaiting room");

  const chipStatus: { label: string; color: string } = roleAgent?.pendingConfirmation
    ? { label: zh ? "等待确认" : "confirmation pending", color: WARN.amber }
    : secureProvider?.status === "awaiting_secret"
      ? { label: zh ? "等待密钥" : "secret awaited", color: WARN.amber }
      : !connection.online
        ? { label: zh ? "离线" : "offline", color: COMMS.offline }
        : agentSessionActive
          ? { label: zh ? "在线" : "online", color: COMMS.good }
          : { label: zh ? "待命" : "standby", color: COMMS.cyan };

  function renderPortraitAndCopy() {
    return (
      <>
        <View style={styles.portraitFrame}>
          {imageAvailable ? (
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel={
                selectedPersona?.kind === "persona"
                  ? `${projection?.releaseChannel === "development_internal" ? projection.character.displayName : ""}, ${selectedPersona.title}`
                  : (zh ? "原创中性副官占位" : "Original neutral adjutant placeholder")
              }
              onLoad={() => {
                if (frame?.contentHash) {
                  const recovery = assetRecoveryAttempt.current;
                  if (recovery
                    && recovery.bindingHash === frame.generationKey
                    && recovery.contentHash === frame.contentHash) {
                    assetRecoveryAttempt.current = null;
                  }
                  playerRef.current.markLoaded({
                    generationKey: frame.generationKey,
                    contentHash: frame.contentHash,
                  });
                }
              }}
              onError={() => {
                if (frame?.contentHash) {
                  playerRef.current.markFailed({
                    generationKey: frame.generationKey,
                    contentHash: frame.contentHash,
                  });
                  setAssetFailedFor(`${frame.generationKey}:${frame.contentHash}`);
                  const bindingHash = projection?.releaseChannel === "development_internal"
                    ? projection.bindings.bindingHash
                    : null;
                  if (bindingHash
                    && connection.online
                    && connection.visible
                    && (assetRecoveryAttempt.current?.bindingHash !== bindingHash
                      || assetRecoveryAttempt.current?.contentHash !== frame.contentHash)) {
                    assetRecoveryAttempt.current = {
                      bindingHash,
                      contentHash: frame.contentHash,
                    };
                    void refresh().catch(() => {});
                  }
                }
              }}
              resizeMode="cover"
              source={{ uri: assetUri || "" }}
              style={styles.portrait}
            />
          ) : (
            <View style={styles.fallbackPortrait}>
              {cachedPersona ? (
                <StaticNeutralAdjutantPortrait
                  key={cachedPersona.neutralFrame.contentHash}
                  label={zh ? "本地静态中性副官" : "Local static neutral Adjutant"}
                />
              ) : (
                <Text style={styles.fallbackGlyph}>◈</Text>
              )}
              <Text style={styles.fallbackText}>
                {publicFallback
                  ? (zh ? "公开通道使用无资产中性回退" : "Asset-free neutral public fallback")
                  : !projection
                    ? cachedPersona
                      ? (zh ? "离线只读：已恢复封存选择；远程头像暂停" : "Offline read-only: sealed selection restored; remote portrait paused")
                      : characterStatus?.rejectionCode
                        ? (zh ? "角色投影未通过客户端校验，按失败关闭扣留" : "Character projection failed client validation; withheld fail-closed")
                        : (zh ? "进入已验证房间后加载副官" : "Join a verified room to load an adjutant")
                    : (zh ? "头像资源不可用" : "Portrait asset unavailable")}
              </Text>
            </View>
          )}
          <View pointerEvents="none" style={styles.scanlines} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.personaTitle}>
            {selectedPersona?.kind === "persona"
              ? selectedPersona.title
              : cachedPersona
                ? cachedPersona.title
              : (zh ? "Project D 原创副官" : "Project D original Adjutant")}
          </Text>
          {selectedPersona?.kind === "persona" && (
            <Text style={styles.timeline}>
              {selectedPersona.timeline.start} → {selectedPersona.timeline.end}
            </Text>
          )}
          {cachedPersona && (
            <Text style={styles.timeline}>
              {cachedPersona.timeline.start} → {cachedPersona.timeline.end}
            </Text>
          )}
          <View style={styles.statusRow}>
            <StatusChip
              label={projection?.releaseChannel === "development_internal"
                ? `${projection.portrait.phase} · ${frame?.role || "static"}`
                : "static"}
            />
            <StatusChip
              label={reducedMotion
                ? (zh ? "减少动态" : "reduced motion")
                : active && frame?.shouldAnimate
                  ? (zh ? "可见时动态" : "visible animation")
                  : (zh ? "已暂停" : "paused")}
            />
            {!connection.online && <StatusChip label={zh ? "离线只读" : "offline read-only"} />}
          </View>
          <Text style={styles.boundary}>
            {zh
              ? "头像只播放服务端许可帧；Agent 可请求建议或密封 Preview，但规则、确认与对战状态仍归房间服务。"
              : "The portrait uses server-approved frames. The Agent may advise or request a sealed Preview; Rules, confirmation, and match state stay with the room service."}
          </Text>
          {projection?.releaseChannel === "development_internal" && (
            <Text style={styles.rights}>
              {zh
                ? "内部开发预览；衍生视觉尚未获准公开发布。"
                : "Internal development preview; derived visuals are not cleared for public release."}
            </Text>
          )}
        </View>
      </>
    );
  }

  function renderProviderCard() {
    // Slice 266f: explicit BYOK state surface derived ONLY from the real
    // Ticket 16 projection — attached / missing / error / detached (plus the
    // awaiting-secret ingress state); never inferred, never fabricated.
    const attachmentState = secureProvider?.attachment?.state || null;
    const providerStateSurface: { kind: string; tone: "ok" | "warn" | "error" | "plain" } = (() => {
      if (!secureProvider) return { kind: "missing", tone: "plain" };
      if (secureProvider.rejection) return { kind: "error", tone: "error" };
      if (attachmentState === "attached") return { kind: "attached", tone: "ok" };
      if (attachmentState === "detached" || attachmentState === "expired") {
        return { kind: "detached", tone: "plain" };
      }
      if (attachmentState === "attach_failed" || attachmentState === "detach_failed") {
        return { kind: "error", tone: "error" };
      }
      if (secureProvider.status === "awaiting_secret") {
        return { kind: "awaiting_secret", tone: "warn" };
      }
      return { kind: "missing", tone: "plain" };
    })();
    return (
      <View style={styles.providerCard} testID="secure-provider-console">
        <View style={styles.providerHeader}>
          <View style={styles.headerCopy}>
            <Text style={styles.providerTitle}>
              {zh ? "安全 BYOK Provider" : "Secure BYOK Provider"}
            </Text>
            <Text style={styles.providerMeta} testID="secure-provider-status">
              {zh
                ? `状态 ${secureProvider?.status || "未挂载"}`
                : `Status ${secureProvider?.status || "not mounted"}`}
            </Text>
          </View>
          {providerBusy && <ActivityIndicator color={COMMS.cyan} size="small" />}
        </View>

        <View style={styles.providerStateRow}>
          <View
            style={[
              styles.providerStateChip,
              providerStateSurface.tone === "ok" && styles.providerStateChipAttached,
              providerStateSurface.tone === "warn" && styles.providerStateChipWarning,
              providerStateSurface.tone === "error" && styles.providerStateChipError,
            ]}
            testID="secure-provider-state-chip"
          >
            <Text style={styles.providerStateText}>
              state: {providerStateSurface.kind}
              {secureProvider?.rejection ? ` · ${secureProvider.rejection.code}` : ""}
              {providerStateSurface.kind === "missing"
                ? (secureProvider?.status === "session_required"
                  ? (zh ? " · 需先接通副官会话（如实）" : " · agent session required (honest)")
                  : (zh ? " · 未附加（如实）" : " · not attached (honest)"))
                : ""}
              {providerStateSurface.kind === "detached" && secureProvider?.attachment?.detachReason
                ? ` · ${secureProvider.attachment.detachReason}`
                : ""}
            </Text>
          </View>
        </View>

        <Text style={styles.providerDisclosure} testID="secure-provider-secret-hygiene">
          {zh
            ? "所选 Provider 会收到本轮 Prompt 与响应合同。应用会在等待网络前清空密码输入，并在结束时清零可变字节；浏览器与服务端都不写持久存储。隔离 Worker 仅在绑定期间以内存持有密钥；没有自动重试。"
            : "The selected Provider receives the turn Prompt and response contract. The app clears this password field before awaiting the network and zeroes mutable bytes afterward; neither browser nor server writes it to persistent storage. An isolated Worker holds it only in session memory until detach, with no automatic retry."}
        </Text>

        {secureProvider?.profiles.length ? (
          <>
            <Text style={styles.fieldLabel}>
              {zh ? "服务端许可的 Provider / 模型" : "Server-approved Provider / model"}
            </Text>
            <View style={styles.choiceRow}>
              {secureProvider.profiles.map((profile) => (
                <ChoiceButton
                  key={`${profile.profileRef.id}:${profile.profileRef.version}:${profile.profileRef.hash}`}
                  active={selectedProvider?.profileRef.hash === profile.profileRef.hash}
                  disabled={providerBusy || providerAttached}
                  label={`${profile.providerId} · ${profile.model}`}
                  onPress={() => {
                    setSelectedProviderHash(profile.profileRef.hash);
                    setProviderConsent(false);
                  }}
                />
              ))}
            </View>
          </>
        ) : secureProvider?.status === "ready" || catalogueLoaded ? (
          <Text style={styles.providerMeta} testID="secure-provider-empty-catalogue">
            {zh
              ? "Provider 清单已加载（本会话窗口）：服务端许可 0 个 Provider 配置；BYOK 如实不可用，不是被隐藏。加载清单不会调用模型。"
              : "Provider catalogue loaded (this session window): the server approved 0 Provider profiles; BYOK is honestly unavailable, not hidden. Loading the catalogue does not call a model."}
          </Text>
        ) : (
          <>
            <Text style={styles.providerMeta}>
              {secureProvider?.status === "session_required"
                ? (zh
                  ? "BYOK 需要先接通副官会话；Provider 清单尚未载入，加载动作不会调用模型。"
                  : "BYOK needs an open Adjutant session first; the Provider catalogue is not loaded, and loading it does not call a model.")
                : (zh ? "Provider 清单尚未载入；加载动作不会调用模型。" : "Provider catalogue is not loaded; loading it does not call a model.")}
            </Text>
            <ActionButton
              disabled={providerBusy || !secureProvider}
              label={zh ? "加载 Provider 清单" : "Load Provider catalogue"}
              onPress={() => void (async () => {
                const result = await runProviderIntent({ type: "load_profiles" });
                if (result?.ok) setCatalogueLoaded(true);
              })()}
            />
          </>
        )}

        {selectedProvider && (
          <Text style={styles.providerMeta} testID="secure-provider-profile-budget">
            {selectedProvider.providerId} · {selectedProvider.model}
            {" · "}{zh ? "每轮输入上限" : "input max"} {selectedProvider.maxContextUnits}
            {" · "}{zh ? "输出上限" : "output max"} {selectedProvider.maxOutputUnits}
          </Text>
        )}
        {secureProvider?.attachment?.budgetEnvelope && (
          <Text style={styles.providerMeta}>
            {zh ? "会话最大额度（非实时消费）" : "Session maximum envelope (not live spend)"}
            {" "}{secureProvider.attachment.budgetEnvelope.maxTotalUnits}
            {" · "}{zh ? "精确账本在服务端" : "exact ledger stays server-side"}
          </Text>
        )}

        {!providerAttached && secureProvider?.status !== "awaiting_secret" && (
          <>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: providerConsent, disabled: providerBusy }}
              disabled={providerBusy}
              onPress={() => setProviderConsent((accepted) => !accepted)}
              style={styles.consentRow}
              testID="secure-provider-consent"
            >
              <Text style={styles.consentMark}>{providerConsent ? "☑" : "☐"}</Text>
              <Text style={styles.consentText}>
                {zh
                  ? "我同意把本轮 Prompt/响应合同发送给上述 Provider，并接受单次物理尝试。"
                  : "I consent to sending each turn Prompt/response contract to this Provider and accept one physical attempt."}
              </Text>
            </Pressable>
            <ActionButton
              disabled={!agentSessionActive || !selectedProvider
                || !providerConsent || providerBusy || !secureProvider?.capabilities.prepare}
              label={agentSessionActive
                ? (zh ? "准备一次性密钥交接" : "Prepare one-time key ingress")
                : (zh ? "先接通副官会话" : "Open the Adjutant session first")}
              onPress={() => void prepareProviderAttachment()}
            />
          </>
        )}

        {secureProvider?.status === "awaiting_secret" && (
          <>
            <TextInput
              accessibilityLabel={zh ? "Provider API 密钥" : "Provider API key"}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
              editable={!providerBusy}
              maxLength={8192}
              onChangeText={setProviderKeyDraft}
              onSubmitEditing={() => void attachProviderSecret()}
              placeholder={zh ? "仅本次交接；不会保存" : "One ingress only; never persisted"}
              placeholderTextColor={COMMS.textFaint}
              secureTextEntry
              spellCheck={false}
              style={styles.secretInput}
              textContentType="none"
              testID="secure-provider-secret-input"
              value={providerKeyDraft}
            />
            <ActionButton
              disabled={!providerKeyDraft || providerBusy
                || !secureProvider.capabilities.attach}
              label={zh ? "交给隔离 Worker" : "Attach to isolated Worker"}
              onPress={() => void attachProviderSecret()}
            />
          </>
        )}

        {providerAttached && (
          <View style={styles.actionRow}>
            <ActionButton
              disabled={providerBusy}
              label={zh ? "刷新安全状态" : "Refresh safe status"}
              onPress={() => void runProviderIntent({ type: "refresh_attachment" })}
            />
            <ActionButton
              danger
              disabled={providerBusy || !secureProvider?.capabilities.detach}
              label={zh ? "解绑并销毁密钥" : "Detach and destroy key"}
              onPress={() => void runProviderIntent({ type: "detach_attachment" })}
            />
          </View>
        )}

        {secureProvider?.attachment && (
          <Text style={styles.providerMeta}>
            {zh ? "附件状态" : "Attachment"}: {secureProvider.attachment.state}
            {secureProvider.attachment.detachReason
              ? ` · ${secureProvider.attachment.detachReason}` : ""}
          </Text>
        )}
        {secureProvider?.attachment && (
          <View style={styles.providerReceiptCard} testID="secure-provider-redacted-receipt">
            <Text style={styles.providerReceiptTitle}>
              {zh ? "脱敏收据（绝不含密钥材料）" : "Redacted receipt (never any secret material)"}
            </Text>
            <Text style={styles.providerReceiptText}>
              {secureProvider.attachment.provider.providerId}
              {" · "}{secureProvider.attachment.provider.requestedModel}
              {"\n"}profile {secureProvider.attachment.provider.profileRef.hash.slice(0, 12)}…
              {" · "}{zh ? "状态" : "state"} {secureProvider.attachment.state}
              {secureProvider.attachment.attachedAt
                ? ` · attached ${secureProvider.attachment.attachedAt}` : ""}
              {secureProvider.attachment.detachedAt
                ? ` · detached ${secureProvider.attachment.detachedAt}` : ""}
              {"\n"}{zh ? "会话最大额度" : "consent-time envelope"}
              {" "}{secureProvider.attachment.budgetEnvelope.maxTotalUnits}
              {" "}{secureProvider.attachment.budgetEnvelope.currency}
              {" · "}{zh ? "非实时消费，精确账本在服务端" : "not live spend; exact ledger stays server-side"}
              {"\n"}sensitiveMaterialPersisted: false · automaticRetryAllowed: false
              {" · "}{zh ? "原始密钥绝不渲染、落盘或入日志" : "the raw key is never rendered, persisted, or logged"}
            </Text>
          </View>
        )}
        {secureProvider?.rejection && (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {secureProvider.rejection.code}
          </Text>
        )}
      </View>
    );
  }

  function renderSessionEntry() {
    return (
      <>
        <Text style={styles.fieldLabel}>{zh ? "副官模式" : "Adjutant mode"}</Text>
        <View style={styles.choiceRow}>
          {AGENT_MODES.map((mode) => (
            <ChoiceButton
              key={mode}
              active={selectedMode === mode}
              disabled={agentBusy || agentReadOnly}
              label={mode}
              onPress={() => chooseMode(mode)}
            />
          ))}
        </View>
        <Text style={styles.modeNote}>
          {zh
            ? "所有模式只读：tutor 解释、commentator 解说、companion 反思/对话；opponent 只能提交已启用的 LegalSpace 候选，并仍需既定的真人确认策略。"
            : "Every mode is read-only: tutor explains, commentator commentates, companion reflects/chats; opponent may submit only an enabled LegalSpace candidate and still requires the configured human confirmation policy."}
        </Text>
        <ActionButton
          disabled={agentBusy || agentReadOnly || !roleAgent}
          label={zh ? "接通副官" : "Open session"}
          onPress={() => void runAgentIntent({
            type: "open_agent_session",
            mode: selectedMode,
          })}
        />
      </>
    );
  }

  function renderConversation() {
    return (
      <>
        <Text style={styles.fieldLabel}>{zh ? "本轮意图" : "Turn intent"}</Text>
        <View style={styles.choiceRow}>
          {MODE_INTENTS[selectedMode].map((intent) => (
            <ChoiceButton
              key={intent}
              active={selectedIntent === intent}
              disabled={agentBusy || agentReadOnly}
              label={intent}
              onPress={() => setSelectedIntent(intent)}
            />
          ))}
        </View>

        <View style={styles.transcript}>
          {roleAgent.messages.length ? roleAgent.messages.slice(-8).map((message) => (
            <View
              key={message.id}
              style={message.author === "agent"
                ? styles.agentMessage
                : styles.humanMessage}
            >
              <Text style={styles.messageAuthor}>
                {message.author === "agent"
                  ? (zh ? "副官" : "ADJUTANT")
                  : (zh ? "你" : "YOU")}
              </Text>
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          )) : (
            <Text style={styles.emptyTranscript}>
              {zh ? "会话已建立，发送第一个请求。" : "Session ready. Send the first request."}
            </Text>
          )}
        </View>

        {roleAgent.decision && (
          <View style={styles.decisionCard} testID="agent-decision-card">
            <Text style={styles.decisionTitle}>
              {zh ? "建议动作" : "Suggested action"} · {roleAgent.decision.candidateId}
            </Text>
            <Text style={styles.decisionText}>{roleAgent.decision.selectedReason}</Text>
            <Text style={styles.decisionRisk}>
              {zh ? "风险" : "Risk"}: {roleAgent.decision.risk}
            </Text>
            {roleAgent.decision.rejectedAlternatives?.slice(0, 3).map((alternative: Record<string, any>) => (
              <Text key={alternative.candidateId} style={styles.alternativeText}>
                ↳ {alternative.candidateId}: {alternative.reason}
              </Text>
            ))}
          </View>
        )}

        {roleAgent.pendingConfirmation && (
          <View style={styles.confirmCard} testID="agent-human-confirmation">
            <Text style={styles.confirmTitle}>
              {zh ? "等待真人确认" : "Waiting for human confirmation"}
            </Text>
            <Text style={styles.confirmText}>
              {roleAgent.pendingConfirmation.candidateId} · {roleAgent.pendingConfirmation.actionType}
            </Text>
            <ActionButton
              disabled={agentBusy || agentReadOnly}
              label={zh ? "确认并提交房间" : "Confirm and apply"}
              onPress={() => void runAgentIntent({
                type: "confirm_agent_preview",
                previewId: roleAgent.pendingConfirmation?.previewId || "",
              })}
            />
          </View>
        )}

        <TextInput
          accessibilityLabel={zh ? "副官消息" : "Adjutant message"}
          editable={!agentBusy && !agentReadOnly}
          maxLength={8192}
          multiline
          onChangeText={setDraft}
          onSubmitEditing={() => void sendAgentMessage()}
          placeholder={zh ? "询问规则、局势，或让对手提出动作…" : "Ask about rules, position, or request an opponent move…"}
          placeholderTextColor={COMMS.textFaint}
          style={styles.input}
          value={draft}
        />
        <View style={styles.actionRow}>
          <ActionButton
            disabled={!draft.trim() || agentBusy || agentReadOnly}
            label={zh ? "发送" : "Send"}
            onPress={() => void sendAgentMessage()}
          />
          {roleAgent.status === "sending" && (
            <ActionButton
              danger
              disabled={submitting || agentReadOnly}
              label={zh ? "取消生成" : "Cancel turn"}
              onPress={() => void runAgentIntent({ type: "cancel_agent_turn" })}
            />
          )}
          {roleAgent.status === "reconnect_required" && (
            <ActionButton
              disabled={submitting || agentReadOnly}
              label={zh ? "重新连接" : "Reconnect"}
              onPress={() => void runAgentIntent({ type: "reconnect_agent_session" })}
            />
          )}
          <ActionButton
            danger
            disabled={agentBusy || agentReadOnly}
            label={zh ? "结束会话" : "End session"}
            onPress={() => void runAgentIntent({ type: "end_agent_session" })}
          />
        </View>
      </>
    );
  }

  function renderTraceCard() {
    if (!roleAgent?.trace) {
      return (
        <Text style={styles.diagMeta}>
          {zh
            ? "本轮尚无安全 Harness trace；完成一轮对话后此处只显示工具/Skill/记忆哈希引用。"
            : "No safe harness trace yet; after a completed turn only tool/Skill/memory hash references appear here."}
        </Text>
      );
    }
    return (
      <View style={styles.traceCard} testID="agent-harness-trace">
        <Text style={styles.traceTitle}>HARNESS TRACE</Text>
        <Text style={styles.traceText}>
          {roleAgent.trace.promptPack?.id || roleAgent.trace.promptPack?.name || "prompt-pack"}
          {" · "}{roleAgent.trace.toolCalls?.join(" → ") || "no tools"}
        </Text>
        <Text style={styles.traceText}>
          {zh ? "规则 Skill 引用" : "Rule Skill refs"}: {roleAgent.trace.ruleSkillRefs?.length || 0}
          {" · "}{zh ? "记忆引用" : "Memory refs"}: {roleAgent.trace.memoryRefs?.length || 0}
        </Text>
      </View>
    );
  }

  function renderRejection() {
    if (!roleAgent?.rejection) return null;
    return (
      <Text accessibilityRole="alert" style={styles.errorText} testID="agent-session-rejection">
        {roleAgent.rejection.code === "provider_not_configured"
          ? (zh
            ? "尚未附加真实模型 Provider；请在上方同意披露并安全交接 BYOK。"
            : "No live Provider is attached. Accept the disclosure above and attach BYOK securely.")
          : roleAgent.rejection.code}
      </Text>
    );
  }

  function renderIdentitySection() {
    const devProjection = projection?.releaseChannel === "development_internal"
      ? projection
      : null;
    const options = devProjection?.selector.options || [];
    const personaCount = options.filter((option) => option.kind === "persona").length;
    const lockedCount = options.filter((option) => option.kind === "locked").length;
    return (
      <View style={styles.sectionBody} testID="companion-identity-section">
        {devProjection ? (
          <>
            <Text style={styles.sectionValue}>
              {devProjection.character.displayName}
            </Text>
            <Text style={styles.sectionMeta}>
              characterId: {devProjection.character.characterId}
            </Text>
            {selectedPersona?.kind === "persona" && (
              <>
                <Text style={styles.sectionRow}>
                  {zh ? "世界书 / 人格" : "World book / persona"}: {selectedPersona.title}
                </Text>
                <Text style={styles.sectionMeta}>
                  worldbookId: {selectedPersona.worldbookId}
                </Text>
                <Text style={styles.sectionMeta}>
                  {zh ? "人格状态" : "persona state"}: {selectedPersona.personaState}
                  {" · "}{selectedPersona.timeline.start} → {selectedPersona.timeline.end}
                  {" · "}knowledge rank {selectedPersona.knowledgeRank}
                  {" · "}spoiler rank {selectedPersona.spoilerRank}
                </Text>
              </>
            )}
            <Text style={styles.sectionMeta}>
              {zh
                ? `时代目录：${personaCount} 个可选人格 · ${lockedCount} 个锁定槽（剧透上限 rank ${devProjection.selector.spoilerCeilingRank}）· 选择按席位、服务端 CAS 校验。`
                : `Era catalogue: ${personaCount} selectable personas · ${lockedCount} locked slots (spoiler ceiling rank ${devProjection.selector.spoilerCeilingRank}) · selection is seat-scoped and server-CAS verified.`}
            </Text>
            <Text style={styles.sectionHint}>
              {zh
                ? "在「设置 → 战术副官时代」切换时代即切换同伴；切换不更换规则、阵营或模型。"
                : "Switch eras in Settings → Adjutant era to switch companions; switching never changes Rules, faction, or model."}
            </Text>
          </>
        ) : publicFallback ? (
          <Text style={styles.sectionHint}>
            {zh
              ? "公开通道使用无资产中性回退；受限身份、时代与世界书信息不进入该投影。"
              : "The public channel uses an asset-free neutral fallback; restricted identity, era, and world-book data are absent from this projection."}
          </Text>
        ) : cachedPersona ? (
          <Text style={styles.sectionHint}>
            {zh
              ? `离线只读：已恢复封存的同伴选择「${cachedPersona.title}」（${cachedPersona.timeline.start} → ${cachedPersona.timeline.end}）；重连后可切换。`
              : `Offline read-only: sealed companion selection "${cachedPersona.title}" (${cachedPersona.timeline.start} → ${cachedPersona.timeline.end}) restored; reconnect to switch.`}
          </Text>
        ) : (
          <>
            <Text style={styles.sectionHint}>
              {characterStatus?.rejectionCode
                ? (zh
                  ? `服务端角色投影未通过客户端校验（${characterStatus.rejectionCode}）；身份按失败关闭原则扣留，不是缺失，也不会用旧数据顶替。`
                  : `The server-sent character projection failed client validation (${characterStatus.rejectionCode}); identity is withheld fail-closed, not absent, and stale data is never substituted.`)
                : (zh
                  ? "进入已验证房间后加载同伴身份与世界书。"
                  : "Join a verified room to load companion identity and world book.")}
            </Text>
            {characterStatus?.rejectionCode && (
              <Text selectable style={styles.sectionMeta}>
                rejection: {characterStatus.rejectionCode}
              </Text>
            )}
          </>
        )}
        <View style={styles.gapCard}>
          <Text style={styles.gapTitle}>
            {zh ? "多个同伴（Slice 266c 已接通）" : "Multiple companions (connected in Slice 266c)"}
          </Text>
          <Text style={styles.sectionHint}>
            {zh
              ? "多同伴同会话现已由服务端绑定支持：见上方「同伴群聊」——确定性发言顺序、@提及、持久化转写。"
              : "Multi-companion sessions are now server-bound: see Companion group chat above — deterministic speaker order, @mentions, persisted transcript."}
          </Text>
          <Text style={styles.gapCode}>
            {CONTRACT_GAPS.multiSpeaker}
            {zh
              ? "：已通过同伴产品模块接通（Slice 266c，真实浏览器验证）；会话仍按席位校验，任何时刻同一回合只有一位发言者。"
              : ": connected through the companion product module (Slice 266c, real-browser verified); conversations stay seat-scoped and exactly one participant owns any turn."}
          </Text>
        </View>
      </View>
    );
  }

  function renderMemorySection() {
    const messageCount = roleAgent?.messages?.length || 0;
    const memoryRefCount = roleAgent?.trace?.memoryRefs?.length || 0;
    const memoryInfluenced = roleAgent?.decision?.memoryInfluence != null;
    return (
      <View style={styles.sectionBody} testID="companion-memory-section">
        <Text style={styles.sectionRow}>
          {zh ? "上下文状态" : "Context status"}
        </Text>
        <Text style={styles.sectionMeta}>
          {zh
            ? `会话转写 ${messageCount}/${MAX_TRANSCRIPT_MESSAGES} 条 · 仅会话范围，会话结束即失效 · epoch ${roleAgent?.connectionEpoch || "—"}`
            : `Session transcript ${messageCount}/${MAX_TRANSCRIPT_MESSAGES} messages · session-scoped only, void when the session ends · epoch ${roleAgent?.connectionEpoch || "—"}`}
        </Text>
        <Text style={styles.sectionMeta}>
          {roleAgent?.trace
            ? (zh
              ? `最近一次安全 trace：${memoryRefCount} 条记忆哈希引用${memoryInfluenced ? " · 决策声明了记忆影响" : ""}（只显示哈希引用，不显示原始记忆内容）`
              : `Last safe trace: ${memoryRefCount} memory hash refs${memoryInfluenced ? " · the decision declared memory influence" : ""} (hash refs only; raw memory content is never rendered)`)
            : (zh
              ? "尚无安全 trace；完成一轮对话后此处显示记忆哈希引用计数。"
              : "No safe trace yet; memory hash-ref counts appear here after a completed turn.")}
        </Text>
        <Text style={styles.sectionMeta}>
          {cachedPersona || offlineSnapshot?.releaseChannel === "public"
            ? (zh
              ? "长期连续性（当前真实能力）：封存的同伴选择已离线恢复，重连后保持一致。"
              : "Long-term continuity (real today): the sealed companion selection is restored offline and stays consistent on reconnect.")
            : (zh
              ? "长期连续性（当前真实能力）：同伴选择按席位由服务端保存；本设备离线时无本地封存快照。"
              : "Long-term continuity (real today): the companion selection is kept server-side per seat; this device holds no sealed offline snapshot.")}
        </Text>
        <View style={styles.gapCard}>
          <Text style={styles.gapTitle}>{zh ? "关系状态" : "Relationship state"}</Text>
          <Text style={styles.gapCode}>
            {CONTRACT_GAPS.relationship}
            {zh
              ? "：已接通（Slice 266c）——「同伴群聊」中的记忆与关系卡片直接渲染服务端投影；未知仍是第一等状态，绝不填零或编造。"
              : ": connected (Slice 266c) — the memory & relationship card in Companion group chat renders the server projection directly; unknown stays first-class, never zero-filled or invented."}
          </Text>
        </View>
        <View style={styles.gapCard}>
          <Text style={styles.gapTitle}>{zh ? "分层长期记忆" : "Layered long-term memory"}</Text>
          <Text style={styles.gapCode}>
            {CONTRACT_GAPS.memoryLayers}
            {zh
              ? "：已接通（Slice 266c）——CB-2 分层记忆（转写/滚动摘要/关系）经同伴产品模块投影到「同伴群聊」；摘要未写入时如实标注，绝不伪造。"
              : ": connected (Slice 266c) — the CB-2 layered memory (transcript / rolling summary / relationship) is projected into Companion group chat through the companion product module; an unwritten summary is labelled honestly, never fabricated."}
          </Text>
        </View>
        <View style={styles.gapCard}>
          <Text style={styles.gapTitle}>{zh ? "导入 / 导出 / 恢复" : "Import / export / restore"}</Text>
          <Text style={styles.gapCode}>
            {CONTRACT_GAPS.importExportRestore}
            {zh
              ? "：通用后端模块已支持导入/导出（无头验证），但产品房间绑定/持久化适配器归 Codex 且未接通；此处不提供伪造入口。"
              : ": the generic backend module supports import/export (headless-verified), but the product room binding/persistence adapter is Codex-owned and unconnected; no fake entry point is offered."}
          </Text>
        </View>
      </View>
    );
  }

  function renderPermissionPosture() {
    return (
      <View style={styles.postureCard} testID="companion-permission-posture-v1">
        <Text style={styles.postureTitle}>
          {zh ? "席位权限姿态" : "Seat permission posture"}
        </Text>
        <Text style={styles.sectionMeta}>
          {zh
            ? `席位 ${viewerSeatKey || "未知"} · 角色 ${viewerRoleMode || "未知"}`
            : `Seat ${viewerSeatKey || "unknown"} · role ${viewerRoleMode || "unknown"}`}
        </Text>
        {humanPlayerSeat ? (
          <Text style={styles.sectionHint}>
            {zh
              ? "真人席位同伴只读取玩家可见状态与同席公开计划/记忆哈希引用；对手私有状态永不显示，未投影即未知，任何推测都标注为推测而非事实。"
              : "A human-seat companion reads only player-visible state and same-seat public plan/memory hash refs; opponent-private state is never shown, anything unprojected is unknown, and any reading is labelled inference, not fact."}
          </Text>
        ) : (
          <Text style={styles.sectionHint}>
            {zh
              ? "非玩家角色席位：同伴默认观察者/关闭，绝不会自动接通会话。"
              : "Non-player role seat: the companion defaults to observer/off and never auto-opens a session."}
          </Text>
        )}
        <Text style={styles.sectionHint}>
          {zh
            ? "建议保持建议性：同伴只能建议或请求密封 Preview；只有真人确认并应用（modelMayConfirm/modelMayApply: false）。"
            : "Advice stays suggestive: the companion may only advise or request a sealed Preview; only a human confirms and applies (modelMayConfirm/modelMayApply: false)."}
        </Text>
        <Text style={styles.sectionHint}>
          {zh
            ? "Agent 对 Agent 默认观察者/关闭（"
            : "Agent-vs-agent defaults to observer/off ("}
          {CONTRACT_GAPS.agentVsAgentPolicy}
          {zh
            ? "：显式策略面未投影，会话绝不自动打开）。复盘模式独立：赛后复盘在「复盘与 Skill」分面，不在同伴窗口。"
            : ": no explicit policy surface is projected, and sessions never auto-open). Review mode is separate: postgame review lives in the Review & Skill surface, not in the companion window."}
        </Text>
      </View>
    );
  }

  function renderChatProviderStatus() {
    if (productRoom) return <View style={styles.chatStatusCard} testID="companion-chat-provider-status">
      <Text style={styles.chatStatusTitle}>{zh ? '本房副官' : 'Room companion'} · {roomProvider?.model || '…'}</Text>
      <Text style={styles.chatStatusMeta}>{!roomProvider
        ? (zh ? '正在读取本席设置…' : 'Reading your seat settings…')
        : !roomProvider.enabled ? (zh ? '服务尚未开启模型调用。' : 'Model requests are disabled.')
        : !roomProvider.configured ? (zh ? '请在战桌顶部「本房 AI」输入你的 Key。' : 'Enter your key in Room AI above the battlefield.')
        : roomProvider.remainingDispatches === 0 ? (zh ? '本轮试用次数已用完；历史仍保留。' : 'This trial is used up; history is preserved.')
        : Number.isSafeInteger(roomProvider.remainingDispatches)
          ? (zh ? `已连接 · 剩余 ${roomProvider.remainingDispatches} 次请求` : `Connected · ${roomProvider.remainingDispatches} requests left`)
          : (zh ? '已连接' : 'Connected')}</Text>
      <Text style={styles.chatStatusMeta}>{zh ? '普通聊天不带军表和棋盘；问到战局时才读取对应信息。仅在你发送或继续消息时调用，不会自动移动棋子。' : 'Ordinary chat omits the army and board; battle questions load only the requested information. Requests run only when you send or continue; no automatic piece movement.'}</Text>
    </View>;
    const provider = chat.statusResult?.provider;
    const persistence = chat.statusResult?.persistence;
    const unavailable = !provider || provider.state !== "injected_port";
    return (
      <View style={styles.chatStatusCard} testID="companion-chat-provider-status">
        <Text style={styles.chatStatusTitle}>
          {zh ? "Provider 状态" : "Provider status"}
          {": "}
          {!chat.statusResult
            ? (chat.busy
              ? (zh ? "加载中…" : "loading…")
              : (zh ? "不可用 · 状态未载入" : "unavailable · status not loaded"))
            : `${provider?.state || "unknown"}${provider?.reason ? ` · ${provider.reason}` : ""}`}
        </Text>
        <Text style={styles.chatStatusMeta}>
          {!chat.statusResult
            ? (zh
              ? "如实不可用：不伪造 Provider 状态，不隐藏错误。"
              : "Honestly unavailable: provider state is never fabricated and errors are never hidden.")
            : unavailable
              ? (zh
                ? "同伴回复如实不可用：服务端未注入 Provider 端口。绝不伪造模型回复；打开/读取/检查点/关闭仍然可用。"
                : "Companion replies are honestly unavailable: no Provider port is injected server-side. No model reply is ever fabricated; open/read/checkpoint/close still work.")
              : (zh
                ? `注入式 Provider 端口 · 调用 ${provider?.accounting?.calls ?? 0} 次 · 声明网络 ${provider?.declaredNetwork || "unknown"}`
                : `injected Provider port · calls ${provider?.accounting?.calls ?? 0} · declared network ${provider?.declaredNetwork || "unknown"}`)}
        </Text>
        <Text style={styles.chatStatusMeta}>
          {zh
            ? "BYOK：真实密钥交接仍归下方「安全 Provider 设置」；同伴模块本身绝不接触凭据。"
            : "BYOK: live key attachment stays with the secure Provider console below; the companion module itself never sees credentials."}
          {persistence
            ? (zh
              ? ` 持久化：${persistence.durable ? "持久" : "内存（易失，如实声明）"}。`
              : ` persistence: ${persistence.durable ? "durable" : "in-memory (volatile, honestly declared)"}.`)
            : ""}
        </Text>
      </View>
    );
  }

  function renderChatMemorySummary(conversation: any) {
    const memory = conversation?.memorySummary;
    if (!memory) return null;
    const axes = memory.relationshipAxes && typeof memory.relationshipAxes === "object"
      ? Object.entries(memory.relationshipAxes)
      : [];
    return (
      <View style={styles.gapCard} testID="companion-chat-memory-summary">
        <Text style={styles.gapTitle}>
          {zh ? "记忆与关系（服务端投影）" : "Memory & relationship (server projection)"}
        </Text>
        <Text style={styles.gapCode}>
          {zh ? "转写条目" : "transcript entries"}: {memory.transcriptEntries}
          {" · "}{zh ? "最近发言" : "latest speakers"}: {(memory.latestSpeakers || [])
            .map((participantId: string) => chatParticipantLabel(conversation, participantId))
            .join(" → ") || "—"}
        </Text>
        <Text style={styles.gapCode}>
          {zh ? "滚动摘要" : "rolling summary"}: {memory.rollingSummary
            ? `${memory.rollingSummary.summaryVersion} (through ${memory.rollingSummary.coversTranscriptThrough})`
            : memory.rollingSummaryHonesty || "not_written_yet_never_fabricated"}
        </Text>
        <Text style={styles.gapCode}>
          {zh ? "关系轴" : "relationship axes"}: {axes.length
            ? axes.map(([axis, state]: [string, any]) => `${axis}=${state?.status === "known" ? state.value : "unknown"}`).join(" · ")
            : (zh ? "未知（第一等状态，绝不填零）" : "unknown (first-class, never zero-filled)")}
          {" · "}{zh ? "观测事件" : "observed events"}: {memory.relationshipEvents ?? 0}
        </Text>
        <Text style={styles.gapCode}>
          opponentPrivateAccess: false · hiddenChainOfThought: not_collected
        </Text>
      </View>
    );
  }

  /**
   * Slice 266f.3: session continuity surface. Every value below is a REAL
   * server projection (conversation binding, worldbook read, memory read,
   * author's note read); an unloaded or empty layer renders an honest
   * not-loaded / not-written state — never fabricated content. Worldbook
   * entries are classified by origin: sealed package (formal pack content),
   * persona-derived, chat-tier session entries, and product-global entries
   * (a fixture-injected global entry is honestly labelled by its own
   * provenance).
   */
  function worldbookOriginClass(entry: any) {
    const tier = String(entry?.scopeTier || "");
    if (tier === "character") return "sealed_package";
    if (tier === "persona") return "persona_derived";
    if (tier === "chat") return "chat_session";
    const refs: string[] = entry?.provenance?.sourceRefs || [];
    if (refs.some((ref) => String(ref).startsWith("fixture://"))) {
      return "product_global_fixture";
    }
    return "product_global";
  }

  function renderChatContinuityCard(conversation: any) {
    const companions: any[] = conversation?.companions || [];
    const worldbookEntries: any[] = chat.worldbook?.entries || [];
    const originCounts: Record<string, number> = {};
    for (const entry of worldbookEntries) {
      const origin = worldbookOriginClass(entry);
      originCounts[origin] = (originCounts[origin] || 0) + 1;
    }
    const memory = chat.memoryDetail?.layers || null;
    const summaryVersions: any[] = memory?.rollingSummaryVersions || [];
    const episodicFacts: any[] = memory?.episodicFacts || [];
    const relationshipHistory: any[] = memory?.relationshipState?.history || [];
    const note = chat.authorsNote;
    return (
      <View style={styles.gapCard} testID="companion-chat-continuity">
        <Text style={styles.gapTitle}>
          {zh
            ? "会话连续性（真实包/会话内容 · 空层如实标注）"
            : "Session continuity (real package/session content · empty layers labelled honestly)"}
        </Text>
        <View testID="companion-chat-continuity-era">
          {companions.map((companion: any) => (
            <Text key={companion.participantId} style={styles.gapCode}>
              {zh ? "时代" : "era"} · {chatParticipantLabel(conversation, companion.participantId)}
              {": "}{companion.eraId || (zh ? "注册默认（包）" : "registered default (package)")}
            </Text>
          ))}
        </View>
        <Text style={styles.gapCode} testID="companion-chat-continuity-worldbook">
          {chat.worldbook
            ? `${zh ? "世界书来源" : "worldbook origins"}: `
              + `${zh ? "封存包(正式内容)" : "sealed package (formal)"} ${originCounts.sealed_package || 0}`
              + ` · ${zh ? "人设派生" : "persona-derived"} ${originCounts.persona_derived || 0}`
              + ` · ${zh ? "会话注册" : "chat session"} ${originCounts.chat_session || 0}`
              + ` · ${zh ? "产品全局" : "product global"} ${originCounts.product_global || 0}`
              + (originCounts.product_global_fixture
                ? ` · ${zh ? "产品全局(验收夹具注入,如实)" : "product global (acceptance-fixture injected, honest)"} ${originCounts.product_global_fixture}`
                : "")
            : (zh
              ? "世界书：未载入 — 使用「读取世界书」；绝不伪造条目。"
              : "worldbook: not loaded — use Read worldbook; entries are never fabricated.")}
        </Text>
        <Text style={styles.gapCode} testID="companion-chat-continuity-memory">
          {memory
            ? `${zh ? "记忆" : "memory"}: ${zh ? "摘要版本" : "summary versions"} ${summaryVersions.length}`
              + ` · ${zh ? "情景事实" : "episodic facts"} ${episodicFacts.length}`
              + ` · ${zh ? "关系事件" : "relationship events"} ${relationshipHistory.length}`
              + ` · ${zh ? "转写" : "transcript"} ${conversation?.memorySummary?.transcriptEntries ?? 0}`
              + (memory.rollingSummaryHonesty ? ` · ${memory.rollingSummaryHonesty}` : "")
            : (zh
              ? "记忆：未载入 — 使用「读取记忆」；空层保持第一等未知，绝不填零或编造。"
              : "memory: not loaded — use Read memory; empty layers stay first-class unknown, never zero-filled or invented.")}
        </Text>
        <Text style={styles.gapCode} testID="companion-chat-continuity-authors-note">
          {note
            ? (note.configured
              ? `${zh ? "作者注释" : "author's note"}: v${note.version} · ${note.injection}`
              : (zh ? "作者注释：未配置（如实）" : "author's note: not configured (honest)"))
            : (zh ? "作者注释：未载入" : "author's note: not loaded")}
        </Text>
      </View>
    );
  }

  function renderChatPersonaCard() {
    const persona = chat.persona;
    return (
      <View style={styles.gapCard} testID="companion-chat-persona">
        <Text style={styles.gapTitle}>
          {zh ? "用户人设(版本化 · 席位绑定)" : "User persona (versioned · seat-bound)"}
        </Text>
        <Text style={styles.gapCode} testID="companion-chat-persona-status">
          {persona
            ? (persona.configured
              ? `${persona.displayName} · v${persona.currentVersion}/${persona.versionCount} · ${persona.boundSeat || "seat"}`
              : (zh ? "未配置(如实显示)" : "not configured (honest)"))
            : (zh ? "未载入" : "not loaded")}
        </Text>
        <TextInput
          accessibilityLabel={zh ? "人设显示名" : "Persona display name"}
          editable={!chat.busy && !!companionProduct}
          maxLength={64}
          onChangeText={(value) => patchChat({ personaNameDraft: value })}
          placeholder={zh ? "人设显示名…" : "Persona display name…"}
          placeholderTextColor={COMMS.textFaint}
          style={styles.input}
          testID="companion-chat-persona-name-input"
          value={chat.personaNameDraft}
        />
        <TextInput
          accessibilityLabel={zh ? "人设描述" : "Persona description"}
          editable={!chat.busy && !!companionProduct}
          maxLength={2000}
          multiline
          onChangeText={(value) => patchChat({ personaDescriptionDraft: value })}
          placeholder={zh ? "人设描述(注入人设层世界书,附来源)…" : "Persona description (injected as the persona-tier worldbook entry, with provenance)…"}
          placeholderTextColor={COMMS.textFaint}
          style={styles.input}
          testID="companion-chat-persona-description-input"
          value={chat.personaDescriptionDraft}
        />
        <View style={styles.actionRow}>
          <ActionButton
            disabled={chat.busy || !companionProduct || !chat.personaNameDraft.trim()}
            label={zh ? "保存人设(新版本)" : "Save persona (new version)"}
            onPress={() => void savePersona()}
            testID="companion-chat-persona-save"
          />
          <ActionButton
            disabled={chat.busy || !companionProduct}
            label={zh ? "读取人设" : "Read persona"}
            onPress={() => void refreshPersona()}
            testID="companion-chat-persona-refresh"
          />
          <ActionButton
            disabled={chat.busy || !companionProduct || !persona?.configured}
            label={zh ? "回滚到 v1(追加新版本)" : "Rollback to v1 (append-only)"}
            onPress={() => void rollbackPersona(1)}
            testID="companion-chat-persona-rollback"
          />
        </View>
      </View>
    );
  }

  function renderChatWorldbookCard() {
    const worldbook = chat.worldbook;
    const entries: any[] = worldbook?.entries || [];
    return (
      <View style={styles.gapCard} testID="companion-chat-worldbook">
        <Text style={styles.gapTitle}>
          {zh ? "世界书触发(四层级 · 有界递归)" : "Worldbook triggers (four tiers · bounded recursion)"}
        </Text>
        <Text style={styles.gapCode}>
          {worldbook
            ? `${zh ? "条目" : "entries"}: ${worldbook.entryCount} · ${zh ? "递归" : "recursion"}: depth ${worldbook.recursion?.maxDepth} (bounded) · ${zh ? "插入序" : "insertion"}: ${worldbook.insertionOrder || "priority → tier → id"}`
            : (zh ? "未载入" : "not loaded")}
        </Text>
        <View testID="companion-chat-worldbook-list">
          {entries.slice(0, 8).map((entry: any) => (
            <Text key={`${entry.scopeTier}:${entry.entryId}`} style={styles.gapCode}>
              [{entry.scopeTier}] {entry.entryId} · p{entry.priority} · {(entry.triggers || []).join(", ")}
            </Text>
          ))}
        </View>
        <TextInput
          accessibilityLabel={zh ? "世界书条目 id" : "Worldbook entry id"}
          editable={!chat.busy}
          maxLength={64}
          onChangeText={(value) => patchChat({ worldbookIdDraft: value })}
          placeholder={zh ? "新聊天层条目 id…" : "new chat-tier entry id…"}
          placeholderTextColor={COMMS.textFaint}
          style={styles.input}
          testID="companion-chat-worldbook-id-input"
          value={chat.worldbookIdDraft}
        />
        <TextInput
          accessibilityLabel={zh ? "触发关键字" : "Trigger keyword"}
          editable={!chat.busy}
          maxLength={64}
          onChangeText={(value) => patchChat({ worldbookKeywordDraft: value })}
          placeholder={zh ? "触发关键字…" : "trigger keyword…"}
          placeholderTextColor={COMMS.textFaint}
          style={styles.input}
          testID="companion-chat-worldbook-keyword-input"
          value={chat.worldbookKeywordDraft}
        />
        <TextInput
          accessibilityLabel={zh ? "条目内容" : "Entry content"}
          editable={!chat.busy}
          maxLength={2000}
          multiline
          onChangeText={(value) => patchChat({ worldbookContentDraft: value })}
          placeholder={zh ? "条目内容(附来源与收据)…" : "entry content (provenance + receipts attached server-side)…"}
          placeholderTextColor={COMMS.textFaint}
          style={styles.input}
          testID="companion-chat-worldbook-content-input"
          value={chat.worldbookContentDraft}
        />
        <View style={styles.actionRow}>
          <ActionButton
            disabled={chat.busy || !chat.worldbookIdDraft.trim() || !chat.worldbookKeywordDraft.trim() || !chat.worldbookContentDraft.trim()}
            label={zh ? "注册聊天层条目" : "Register chat-tier entry"}
            onPress={() => void registerWorldbook()}
            testID="companion-chat-worldbook-register"
          />
          <ActionButton
            disabled={chat.busy}
            label={zh ? "读取世界书" : "Read worldbook"}
            onPress={() => void refreshWorldbook()}
            testID="companion-chat-worldbook-refresh"
          />
        </View>
      </View>
    );
  }

  function renderChatMemoryCard() {
    const memory = chat.memoryDetail;
    const layers = memory?.layers || {};
    const versions: any[] = layers.rollingSummaryVersions || [];
    return (
      <View style={styles.gapCard} testID="companion-chat-memory">
        <Text style={styles.gapTitle}>
          {zh ? "分层记忆操作(摘要可编辑 · 回滚追加式)" : "Layered memory operations (editable summary · append-only rollback)"}
        </Text>
        <Text style={styles.gapCode} testID="companion-chat-memory-status">
          {memory
            ? `${zh ? "摘要版本" : "summary versions"}: ${versions.length} · ${zh ? "情景事实" : "episodic facts"}: ${(layers.episodicFacts || []).length} · ${zh ? "关系事件" : "relationship events"}: ${layers.relationshipState?.history?.length ?? 0} · ${layers.rollingSummaryHonesty || ""}`
            : (zh ? "未载入" : "not loaded")}
        </Text>
        <TextInput
          accessibilityLabel={zh ? "摘要内容" : "Summary content"}
          editable={!chat.busy}
          maxLength={2000}
          multiline
          onChangeText={(value) => patchChat({ summaryDraft: value })}
          placeholder={zh ? "写入新摘要版本(绝不覆盖旧版本)…" : "write a new summary version (older versions are never overwritten)…"}
          placeholderTextColor={COMMS.textFaint}
          style={styles.input}
          testID="companion-chat-memory-summary-input"
          value={chat.summaryDraft}
        />
        <View style={styles.actionRow}>
          <ActionButton
            disabled={chat.busy || !chat.summaryDraft.trim()}
            label={zh ? "保存摘要" : "Save summary"}
            onPress={() => void saveSummary()}
            testID="companion-chat-memory-summary-save"
          />
          <ActionButton
            disabled={chat.busy || !versions.length}
            label={zh ? "回滚摘要到 v1" : "Rollback summary to v1"}
            onPress={() => void rollbackSummary(1)}
            testID="companion-chat-memory-summary-rollback"
          />
          <ActionButton
            disabled={chat.busy}
            label={zh ? "读取记忆" : "Read memory"}
            onPress={() => void refreshMemory()}
            testID="companion-chat-memory-refresh"
          />
        </View>
        <TextInput
          accessibilityLabel={zh ? "情景事实" : "Episodic fact"}
          editable={!chat.busy}
          maxLength={2000}
          onChangeText={(value) => patchChat({ episodicDraft: value })}
          placeholder={zh ? "记录一条情景事实(附来源)…" : "record an episodic fact (with provenance)…"}
          placeholderTextColor={COMMS.textFaint}
          style={styles.input}
          testID="companion-chat-memory-episodic-input"
          value={chat.episodicDraft}
        />
        <View style={styles.actionRow}>
          <ActionButton
            disabled={chat.busy || !chat.episodicDraft.trim()}
            label={zh ? "添加情景事实" : "Add episodic fact"}
            onPress={() => void addEpisodic()}
            testID="companion-chat-memory-episodic-add"
          />
        </View>
      </View>
    );
  }

  function renderChatBranchesCard() {
    const branch = chat.activeBranch;
    const branches: any[] = chat.branchesResult?.branches || [];
    return (
      <View style={styles.gapCard} testID="companion-chat-branches">
        <Text style={styles.gapTitle}>
          {zh ? "重roll / 编辑分支(接受即追加新回合,绝不改写历史)" : "Swipe / edit branches (accepting appends a NEW turn; history is never rewritten)"}
        </Text>
        <Text style={styles.gapCode} testID="companion-chat-branches-status">
          {branch
            ? `${zh ? "活动分支" : "active branch"}: ${branch.branchId} · ${branch.kind} · ${branch.candidateEntryId ? (zh ? "候选已就绪" : "candidate ready") : (zh ? "无候选" : "no candidate")}`
            : `${zh ? "已记录分支" : "recorded branches"}: ${branches.length}`}
        </Text>
        <View testID="companion-chat-branches-list">
          {branches.slice(0, 6).map((entry: any) => (
            <Text key={entry.branchId} style={styles.gapCode}>
              {entry.branchId} · {entry.kind} · {entry.status} · base turn {entry.baseTurnSequence}
            </Text>
          ))}
        </View>
        <View style={styles.actionRow}>
          <ActionButton
            disabled={chat.busy || !!branch}
            label={zh ? "重roll 最近同伴回复" : "Swipe last companion reply"}
            onPress={() => void swipeLastReply()}
            testID="companion-chat-branch-swipe"
          />
          <ActionButton
            disabled={chat.busy || !!branch}
            label={zh ? "编辑我最近消息(分支)" : "Edit my last message (branch)"}
            onPress={() => void editLastUserMessage()}
            testID="companion-chat-branch-edit"
          />
          <ActionButton
            disabled={chat.busy}
            label={zh ? "读取分支" : "Read branches"}
            onPress={() => void refreshBranches()}
            testID="companion-chat-branch-refresh"
          />
        </View>
        {branch?.kind === "edit" && !branch.candidateEntryId && (
          <>
            <TextInput
              accessibilityLabel={zh ? "编辑后的消息" : "Edited message"}
              editable={!chat.busy}
              maxLength={4096}
              multiline
              onChangeText={(value) => patchChat({ branchEditDraft: value })}
              placeholder={zh ? "编辑后的消息内容…" : "edited message content…"}
              placeholderTextColor={COMMS.textFaint}
              style={styles.input}
              testID="companion-chat-branch-edit-input"
              value={chat.branchEditDraft}
            />
            <View style={styles.actionRow}>
              <ActionButton
                disabled={chat.busy || !chat.branchEditDraft.trim()}
                label={zh ? "提交编辑候选" : "Submit edit candidate"}
                onPress={() => void submitBranchEdit()}
                testID="companion-chat-branch-edit-submit"
              />
            </View>
          </>
        )}
        {branch && (
          <View style={styles.actionRow}>
            <ActionButton
              disabled={chat.busy || !branch.candidateEntryId}
              label={zh ? "接受候选(追加新回合)" : "Accept candidate (append new turn)"}
              onPress={() => void acceptActiveBranch()}
              testID="companion-chat-branch-accept"
            />
            <ActionButton
              danger
              disabled={chat.busy}
              label={zh ? "放弃分支" : "Discard branch"}
              onPress={() => void discardActiveBranch()}
              testID="companion-chat-branch-discard"
            />
          </View>
        )}
      </View>
    );
  }

  function renderChatAuthorsNoteCard() {
    const note = chat.authorsNote;
    return (
      <View style={styles.gapCard} testID="companion-chat-authors-note">
        <Text style={styles.gapTitle}>
          {zh ? "作者注释(深度/频率注入 · 版本化)" : "Author's note (depth/frequency injection · versioned)"}
        </Text>
        <Text style={styles.gapCode} testID="companion-chat-authors-note-status">
          {note
            ? (note.configured
              ? `v${note.version} · ${note.injection}`
              : (zh ? "未配置(如实显示)" : "not configured (honest)"))
            : (zh ? "未载入" : "not loaded")}
        </Text>
        <TextInput
          accessibilityLabel={zh ? "作者注释" : "Author's note"}
          editable={!chat.busy}
          maxLength={2000}
          multiline
          onChangeText={(value) => patchChat({ authorsNoteDraft: value })}
          placeholder={zh ? "作者注释内容(以系统消息注入,位置由深度决定)…" : "author's note content (injected as a system message; position set by depth)…"}
          placeholderTextColor={COMMS.textFaint}
          style={styles.input}
          testID="companion-chat-authors-note-input"
          value={chat.authorsNoteDraft}
        />
        <View style={styles.choiceRow}>
          <TextInput
            accessibilityLabel={zh ? "注入深度" : "Injection depth"}
            editable={!chat.busy}
            keyboardType="number-pad"
            maxLength={1}
            onChangeText={(value) => patchChat({ authorsNoteDepthDraft: value })}
            placeholder="4"
            placeholderTextColor={COMMS.textFaint}
            style={[styles.input, styles.chatSmallInput]}
            testID="companion-chat-authors-note-depth-input"
            value={chat.authorsNoteDepthDraft}
          />
          <TextInput
            accessibilityLabel={zh ? "注入频率" : "Injection frequency"}
            editable={!chat.busy}
            keyboardType="number-pad"
            maxLength={2}
            onChangeText={(value) => patchChat({ authorsNoteFrequencyDraft: value })}
            placeholder="1"
            placeholderTextColor={COMMS.textFaint}
            style={[styles.input, styles.chatSmallInput]}
            testID="companion-chat-authors-note-frequency-input"
            value={chat.authorsNoteFrequencyDraft}
          />
        </View>
        <View style={styles.actionRow}>
          <ActionButton
            disabled={chat.busy}
            label={zh ? "保存作者注释" : "Save author's note"}
            onPress={() => void saveAuthorsNote()}
            testID="companion-chat-authors-note-save"
          />
          <ActionButton
            disabled={chat.busy}
            label={zh ? "读取作者注释" : "Read author's note"}
            onPress={() => void refreshAuthorsNote()}
            testID="companion-chat-authors-note-refresh"
          />
        </View>
      </View>
    );
  }

  function renderChatImportExportCard() {
    return (
      <View style={styles.gapCard} testID="companion-chat-import-export">
        <Text style={styles.gapTitle}>
          {zh ? "导入 / 导出 / 恢复(完整性哈希 · 绝无凭据)" : "Import / export / restore (integrity-hashed · never any credentials)"}
        </Text>
        <View style={styles.actionRow}>
          <ActionButton
            disabled={chat.busy}
            label={zh ? "导出会话" : "Export conversation"}
            onPress={() => void exportChatConversation()}
            testID="companion-chat-export"
          />
          <ActionButton
            disabled={chat.busy || !chat.lastExport}
            label={zh ? "恢复(同席位 · 绝不覆盖)" : "Restore (same seat · never overwrites)"}
            onPress={() => void restoreChatConversation()}
            testID="companion-chat-restore"
          />
          <ActionButton
            disabled={chat.busy}
            label={zh ? "导出世界书" : "Export worldbook"}
            onPress={() => void exportChatWorldbook()}
            testID="companion-chat-worldbook-export"
          />
          <ActionButton
            disabled={chat.busy}
            label={zh ? "导入世界书" : "Import worldbook"}
            onPress={() => void importChatWorldbook()}
            testID="companion-chat-worldbook-import"
          />
        </View>
        <Text style={styles.gapCode} testID="companion-chat-transfer-note">
          {chat.transferNote || (zh ? "尚未执行导入/导出。" : "no import/export run yet.")}
        </Text>
      </View>
    );
  }

  function renderChatAuditCard() {
    const audit = chat.auditResult;
    return (
      <View style={styles.gapCard} testID="companion-chat-audit">
        <Text style={styles.gapTitle}>
          {zh ? "审计 / 回放(哈希链 · 回放候选绝不自动晋升)" : "Audit / replay (hash chain · replay candidates never auto-promote)"}
        </Text>
        <View style={styles.actionRow}>
          <ActionButton
            disabled={chat.busy || !companionProduct}
            label={zh ? "校验审计链" : "Verify audit chain"}
            onPress={() => void verifyChatAudit()}
            testID="companion-chat-audit-verify"
          />
          <ActionButton
            disabled={chat.busy || !companionProduct}
            label={zh ? "导出审计日志" : "Export audit log"}
            onPress={() => void exportChatAudit()}
            testID="companion-chat-audit-export"
          />
          <ActionButton
            disabled={chat.busy || !companionProduct}
            label={zh ? "构建回放候选" : "Build replay candidate"}
            onPress={() => void buildChatReplayCandidate()}
            testID="companion-chat-audit-replay"
          />
        </View>
        <Text style={styles.gapCode} testID="companion-chat-audit-result">
          {audit
            ? `${audit.kind} · ${audit.ok === false ? "FAILED" : "ok"} · entries ${audit.entryCount ?? "—"} · head ${String(audit.headHash || audit.candidateId || "").slice(0, 16)}…${audit.promotion ? ` · automatic promotion: ${audit.promotion}` : ""}`
            : (zh ? "尚未执行审计操作。" : "no audit operation run yet.")}
        </Text>
      </View>
    );
  }

  function renderChatPromotionsCard() {
    const promotions: any[] = chat.packagePromotions?.promotions || [];
    const presentationPacks = COMPANION_CATALOGUE_V1.entries.filter((entry: any) => entry.pack);
    return (
      <View style={styles.gapCard} testID="companion-chat-promotions">
        <Text style={styles.gapTitle}>
          {zh
            ? "后端包晋升(持久封存 + 哈希钉 · 每次产品组成重校验)"
            : "Backend pack promotion (durable seal + hash pins · re-verified every composition)"}
        </Text>
        <View style={styles.actionRow}>
          <ActionButton
            disabled={chat.busy || !companionProduct}
            label={zh ? "读取晋升列表" : "Read promotions"}
            onPress={() => void loadPackagePromotions()}
            testID="companion-chat-promotions-load"
          />
          {presentationPacks.map((entry: any) => {
            const packageId = companionPackageIdFromCharacterId(entry.characterId);
            const slug = entry.characterId.split(".")[1] || entry.characterId;
            return (
              <ActionButton
                key={packageId}
                disabled={chat.busy || !companionProduct}
                label={zh ? `晋升 ${entry.displayNameZh}` : `Promote ${entry.displayName}`}
                onPress={() => void promoteChatPackage(packageId)}
                testID={`companion-chat-promote-${slug}`}
              />
            );
          })}
        </View>
        <View testID="companion-chat-promotions-list">
          {promotions.map((promotion: any) => {
            const slug = String(promotion.packageId).replace(/^starcraft-tmg\.companion\./u, "");
            return (
              <Text key={promotion.packageId} style={styles.gapCode} testID={`companion-chat-promotion-${slug}`}>
                {slug} · pin {String(promotion.pin).slice(0, 12)}… · verified: {String(promotion.pinVerified)} · registered: {String(promotion.registered)} · durable: {String(chat.packagePromotions?.durable === true)}
              </Text>
            );
          })}
        </View>
        <Text style={styles.sectionMeta}>
          {zh
            ? "封存合同与其 sha256 完整性钉一起持久化;每次产品组成重派生每个钉并重新注册相同封存字节——钉不匹配或版本冲突即失败关闭。晋升绝不授予规则/房间/Provider 权限。"
            : "The sealed contract is persisted with its sha256 integrity pin; every product composition re-derives each pin and re-registers the identical sealed bytes — a pin mismatch or version conflict fails closed. Promotion never grants Rules/room/Provider authority."}
        </Text>
      </View>
    );
  }

  function renderChatPermissionsCard() {
    const surfaces: any[] = chat.permissionSurfaces?.surfaces || [];
    return (
      <View style={styles.gapCard} testID="companion-chat-permissions">
        <Text style={styles.gapTitle}>
          {zh ? "权限面(实时策略判定 · 对手私有永远拒绝)" : "Permission surfaces (live policy decisions · opponent-private always denied)"}
        </Text>
        <View style={styles.actionRow}>
          <ActionButton
            disabled={chat.busy || !companionProduct}
            label={zh ? "读取四类权限面" : "Read the four surfaces"}
            onPress={() => void loadPermissionSurfaces()}
            testID="companion-chat-permissions-load"
          />
        </View>
        <View testID="companion-chat-permissions-list">
          {surfaces.map((surface: any) => {
            const opponent = (surface.decisions || [])
              .find((decision: any) => decision.resourceId === "opponent-private-plan");
            return (
              <Text key={surface.surfaceId} style={styles.gapCode} testID={`companion-chat-permission-${surface.surfaceId}`}>
                {surface.surfaceId} · canSpeak: {String(surface.canSpeak)} · opponent-private: {opponent?.ok ? "ALLOWED" : "denied"} · Preview/Confirm/Apply: {String(surface.previewConfirmApplyAuthority)}
              </Text>
            );
          })}
        </View>
      </View>
    );
  }

  function chatParticipantLabel(conversation: any, participantId: string) {
    const participant = (conversation?.participants || []).find(
      (entry: any) => entry.participantId === participantId,
    );
    return participant?.label || participantId;
  }

  function chatCompanionSlug(companion: any) {
    return String(companion?.packageRef?.id || "").replace(/^starcraft-tmg\.companion\./u, "");
  }

  // Slice 266f.10: participant identity binding. Every header chip and every
  // transcript message binds its speaker's avatar (committed idle keyframe
  // for companions; the comms emblem for the human), name and era — derived
  // purely from the server conversation projection (participants /
  // companions[].eraId / speakerOrder), never fabricated. Next-speaker
  // highlighting adds a border + ▶ marker; it never hides other participants.
  function chatParticipantIdentity(conversation: any, participantId: string) {
    const participant = (conversation?.participants || []).find(
      (entry: any) => entry.participantId === participantId,
    );
    const companion = (conversation?.companions || []).find(
      (entry: any) => entry.participantId === participantId,
    );
    const isUser = participantId === conversation?.userParticipantId
      || participant?.kind === "user";
    const characterId = companion
      ? characterIdFromCompanionPackageId(companion.packageRef.id)
      : null;
    return {
      isUser,
      label: participant?.label || participantId,
      characterId,
      eraId: companion?.eraId || null,
      slug: isUser
        ? "player"
        : chatCompanionSlug(companion),
      seatKey: conversation?.seatKey || null,
    };
  }

  function ChatParticipantAvatar({ characterId, size, testID }: {
    characterId: string | null;
    size: number;
    testID: string;
  }) {
    const source = characterId
      ? resolveCompanionPortraitAssetSourceV1(characterId, "idle")
      : null;
    return (
      <View
        accessibilityLabel={characterId
          ? `${characterId} · idle`
          : "human commander emblem"}
        accessibilityRole="image"
        style={[styles.chatAvatarBox, { width: size, height: size }]}
        testID={testID}
      >
        {source ? (
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={source}
            style={styles.chatAvatarImage}
            testID={`${testID}-img`}
          />
        ) : (
          <Text style={styles.chatAvatarGlyph}>◈</Text>
        )}
      </View>
    );
  }

  function renderChatConversation(conversation: any) {
    const messages: any[] = conversation.messages || [];
    const boundCompanions: any[] = conversation.companions || [];
    const lastMessage = messages.length ? messages[messages.length - 1] : null;
    const nextOwner = conversation.nextTurn?.ownerParticipantId || null;
    const replyPending = conversation.status === "active" && messages.length > 0
      && !!nextOwner && nextOwner !== conversation.userParticipantId;
    const speakerCompanion = boundCompanions.find((entry) => entry.participantId === nextOwner)
      || boundCompanions.find((entry) => entry.participantId === lastMessage?.participantId)
      || boundCompanions[0]
      || null;
    const speakerCharacterId = speakerCompanion
      ? characterIdFromCompanionPackageId(speakerCompanion.packageRef.id)
      : null;
    // Slice 266e: the speaker portrait is bound to the deterministic
    // six-state animation state machine over REAL session signals — never
    // fabricated; unknown/absent signals fail closed to idle, and reduced
    // motion renders the single static keyframe.
    const speakerState = resolveCompanionPortraitAnimationStateV1({
      sessionError: chat.error !== null,
      interrupted: chat.interrupted !== null,
      thinking: chat.busy
        && (chat.lastOperation === "send" || chat.lastOperation === "continue"),
      speaking: !!speakerCompanion
        && lastMessage?.participantId === speakerCompanion.participantId,
      composing: chat.draft.trim().length > 0,
    }) as CompanionPortraitStateId;
    const speakerTransition = companionPortraitAnimationTransitionV1(
      speakerState, { reducedMotion },
    );
    const speakerSource = speakerCharacterId
      ? resolveCompanionPortraitAssetSourceV1(speakerCharacterId, speakerState)
      : null;
    const speakerFrameAsset = speakerCharacterId
      ? companionPortraitFrameAssetV1(speakerCharacterId, speakerState)
      : null;
    return (
      <>
        <Text style={styles.sectionMeta} testID="companion-chat-conversation-meta">
          conversation: {conversation.conversationId}
          {" · "}{conversation.status}
          {" · "}{zh ? "回合" : "turn"} {conversation.turnCounter}
          {" · "}{zh ? "席位" : "seat"} {conversation.seatKey}
          {conversation.resumed ? (zh ? " · 已恢复" : " · resumed") : ""}
        </Text>

        <Text style={styles.fieldLabel}>
          {zh ? "确定性发言顺序（下一回合高亮）" : "Deterministic speaker order (next turn highlighted)"}
        </Text>
        <View style={styles.choiceRow} testID="companion-chat-speaker-order">
          {(conversation.speakerOrder || []).map((participantId: string, index: number) => {
            const isNext = nextOwner === participantId;
            const identity = chatParticipantIdentity(conversation, participantId);
            const spokeLast = lastMessage?.participantId === participantId;
            return (
              <View
                key={participantId}
                style={[styles.chatOrderChip, isNext && styles.chatOrderChipNext]}
                testID={`companion-chat-order-${identity.slug}`}
              >
                <ChatParticipantAvatar
                  characterId={identity.characterId}
                  size={22}
                  testID={`companion-chat-order-avatar-${identity.slug}`}
                />
                <View style={styles.chatOrderChipTextBlock}>
                  <Text style={[styles.chatOrderText, isNext && styles.chatOrderTextNext]}>
                    {index + 1}. {identity.label}{isNext ? " ▶" : ""}
                  </Text>
                  <Text style={styles.chatOrderEraText}>
                    {identity.isUser
                      ? (zh ? `你 · 席位 ${identity.seatKey || "player"}` : `you · seat ${identity.seatKey || "player"}`)
                      : (zh ? `时代 ${identity.eraId || "—"}` : `era ${identity.eraId || "—"}`)}
                    {" · "}
                    {isNext
                      ? (zh ? "下一位" : "next")
                      : spokeLast
                        ? (zh ? "刚发言" : "spoke")
                        : (zh ? "待命" : "idle")}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        <Text style={styles.sectionMeta}>
          {zh ? "下一回合" : "next turn"}: {conversation.nextTurn
            ? `${chatParticipantLabel(conversation, conversation.nextTurn.ownerParticipantId)} (${conversation.nextTurn.source})`
            : (zh ? "—（会话未激活）" : "— (session not active)")}
        </Text>

        <View style={styles.chatSpeakerRow}>
          {speakerSource ? (
            <ChatSpeakerPortraitFrame
              accessibilityLabel={`${speakerCompanion?.packageRef?.id || "companion"} · ${speakerState}`}
              reducedMotion={reducedMotion}
              source={speakerSource}
              state={speakerState}
            />
          ) : (
            <View
              accessibilityLabel={zh ? "头像资产不可用（如实标注）" : "portrait asset unavailable (labelled honestly)"}
              accessibilityRole="image"
              style={styles.chatSpeakerPortraitBox}
              testID="companion-chat-speaker-portrait"
            >
              <Text style={styles.fallbackGlyph}>◈</Text>
            </View>
          )}
          <View style={styles.chatSpeakerCopy}>
            <Text style={styles.sectionRow}>
              {zh ? "当前发言者" : "Current speaker"}: {speakerCompanion
                ? chatParticipantLabel(conversation, speakerCompanion.participantId)
                : (zh ? "你" : "You")}
            </Text>
            <Text style={styles.sectionMeta} testID="companion-chat-speaker-portrait-state">
              portrait state: {speakerState}
              {" · "}{speakerTransition.reducedMotionStatic
                ? (zh ? "减少动态 · 单静态帧" : "reduced motion · single static frame")
                : (zh
                  ? `确定性 ${speakerTransition.durationMs}ms 淡入（仅状态切换；无循环帧）`
                  : `deterministic ${speakerTransition.durationMs}ms crossfade (state change only; no frame loop)`)}
            </Text>
            {speakerFrameAsset && (
              <Text style={styles.sectionMeta} testID="companion-chat-speaker-asset-meta">
                asset: {speakerFrameAsset.assetPath}
                {"\n"}sha256: {speakerFrameAsset.contentHash.slice(0, 12)}…
                {" · "}{zh ? "准入静态关键帧" : "admitted static keyframe"}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.transcript} testID="companion-chat-transcript">
          {messages.length ? messages.slice(-16).map((message: any) => {
            const isUser = message.participantId === conversation.userParticipantId;
            const identity = chatParticipantIdentity(conversation, message.participantId);
            return (
              <View
                key={message.turnId}
                style={isUser ? styles.humanMessage : styles.agentMessage}
                testID={`companion-chat-message-${message.turnSequence}`}
              >
                <View
                  style={styles.messageSpeakerRow}
                  testID={`companion-chat-message-speaker-${message.turnSequence}`}
                >
                  <ChatParticipantAvatar
                    characterId={identity.characterId}
                    size={18}
                    testID={`companion-chat-message-avatar-${message.turnSequence}`}
                  />
                  <Text style={styles.messageAuthor}>
                    {identity.label}
                    {message.mentions?.length
                      ? `  ${message.mentions.map((participantId: string) => `@${chatParticipantLabel(conversation, participantId)}`).join(" ")}`
                      : ""}
                  </Text>
                  <Text style={styles.messageEraText}>
                    {identity.isUser
                      ? (zh ? `席位 ${identity.seatKey || "player"}` : `seat ${identity.seatKey || "player"}`)
                      : (zh ? `时代 ${identity.eraId || "—"}` : `era ${identity.eraId || "—"}`)}
                  </Text>
                </View>
                <Text style={styles.messageText}>{message.content}</Text>
              </View>
            );
          }) : (
            <Text style={styles.emptyTranscript}>
              {zh
                ? "会话已接通（持久化转写为空）。发送第一条消息。"
                : "Conversation open (persisted transcript is empty). Send the first message."}
            </Text>
          )}
        </View>

        {(chat.interrupted || replyPending) && (
          <View style={styles.chatInterruptCard} testID="companion-chat-interrupted">
            <Text style={styles.chatInterruptTitle}>
              {roomProvider?.remainingDispatches === 0
                ? (zh ? '本轮试用次数已用完' : 'This trial is used up')
                : (zh ? '消息已保存，等待回复' : 'Message saved, awaiting reply')}
            </Text>
            <Text style={styles.chatInterruptText}>
              {['PRODUCT_COMPANION_TRIAL_LIMIT_REACHED','LIVE_CALL_DENOMINATOR_EXCEEDED','LIVE_PROVIDER_ATTEMPT_ALREADY_CLAIMED'].includes(chat.interrupted?.reason || '')
                ? (zh ? '之前的试用次数已用完。获得新额度后，点击继续即可回复这条消息。' : 'The previous trial was used up. With a new allowance, continue to reply to this saved message.')
                : chat.interrupted?.reason==='LIVE_PROVIDER_REQUEST_TOO_LARGE'
                  ? (zh ? '这次上下文超过聊天大小限制，尚未调用模型，也未消耗请求次数。' : 'This context exceeds the chat size limit. No model request or trial allowance was used.')
                  : chat.interrupted?.reason || (zh ? '点击继续，让同伴回复上一条消息。' : 'Continue to reply to your last message.')}
              {chat.interrupted?.pendingParticipantId
                ? ` · ${zh ? "待发言" : "pending"}: ${chatParticipantLabel(conversation, chat.interrupted.pendingParticipantId)}`
                : ""}
            </Text>
            <Text style={styles.chatInterruptText}>
              {zh
                ? "已接受的历史完整保留；没有伪造任何回复。只有显式「继续」才会恢复该回合——绝不自动重试。"
                : "The accepted history is fully preserved and no reply was fabricated. Only an explicit Continue resumes this turn — there is never an automatic retry."}
            </Text>
            <ActionButton
              disabled={chat.busy || roomChatUnavailable}
              label={zh ? '继续回复上一条消息' : 'Continue replying to the last message'}
              onPress={() => void continueChatConversation()}
              testID="companion-chat-continue"
            />
          </View>
        )}

        <Text style={styles.fieldLabel}>{zh ? "@提及（可选）" : "@mentions (optional)"}</Text>
        <View style={styles.choiceRow}>
          {boundCompanions.map((companion: any) => {
            const packageId = companion.packageRef.id;
            const active = chat.mentionPackageIds.includes(packageId);
            return (
              <ChoiceButton
                key={packageId}
                active={active}
                disabled={chat.busy}
                label={`@${chatParticipantLabel(conversation, companion.participantId)}`}
                onPress={() => toggleChatMention(packageId)}
                testID={`companion-chat-mention-${chatCompanionSlug(companion)}`}
              />
            );
          })}
        </View>

        <TextInput
          accessibilityLabel={zh ? "同伴会话消息" : "Companion conversation message"}
          editable={!chat.busy && !replyPending && conversation.status === "active"}
          maxLength={4096}
          multiline
          onChangeText={(value) => patchChat({ draft: value })}
          placeholder={zh ? "对同伴说话；@提及决定谁先回应…" : "Speak to your companions; an @mention decides who answers first…"}
          placeholderTextColor={COMMS.textFaint}
          style={styles.input}
          testID="companion-chat-input"
          value={chat.draft}
        />
        <View style={styles.actionRow}>
          <ActionButton
            disabled={!chat.draft.trim() || chat.busy || replyPending || conversation.status !== "active" || roomChatUnavailable}
            label={zh ? "发送" : "Send"}
            onPress={() => void sendChatMessage()}
            testID="companion-chat-send"
          />
          <ActionButton
            disabled={chat.busy || conversation.status !== "active"}
            label={zh ? "检查点" : "Checkpoint"}
            onPress={() => void checkpointChatConversation()}
            testID="companion-chat-checkpoint"
          />
          <ActionButton
            danger
            disabled={chat.busy}
            label={zh ? "关闭会话" : "Close conversation"}
            onPress={() => void closeChatConversation()}
            testID="companion-chat-close"
          />
        </View>

        {chat.checkpoints.length > 0 && (
          <>
            <Text style={styles.fieldLabel}>
              {zh ? "本会话窗口记录的检查点" : "Checkpoints recorded in this window"}
            </Text>
            {chat.checkpoints.map((checkpoint) => (
              <View key={checkpoint.checkpointId} style={styles.chatCheckpointRow}>
                <Text style={styles.sectionMeta}>
                  {checkpoint.checkpointId}
                  {checkpoint.turnSequence !== undefined ? ` · turn ${checkpoint.turnSequence}` : ""}
                </Text>
                <ActionButton
                  disabled={chat.busy}
                  label={zh ? "恢复到此检查点" : "Resume to checkpoint"}
                  onPress={() => void resumeChatConversation(checkpoint.checkpointId)}
                  testID={`companion-chat-resume-${checkpoint.checkpointId}`}
                />
              </View>
            ))}
          </>
        )}

        {renderChatMemorySummary(conversation)}
        {renderChatContinuityCard(conversation)}
        {renderChatWorldbookCard()}
        {renderChatMemoryCard()}
        {renderChatBranchesCard()}
        {renderChatAuthorsNoteCard()}
        {renderChatImportExportCard()}
      </>
    );
  }

  function renderChatSection() {
    return (
      <View style={styles.sectionBody} testID="companion-chat-section">
        <Text style={styles.sectionHint}>
          {productRoom ? (zh
            ? '和副官聊战局或角色故事。它只读取你当前席位可见的信息；发送一条消息才会请求回复。'
            : 'Chat about the battle or character stories. Your companion sees only your seat’s visible information and replies when you send a message.') : zh
            ? "同伴群聊（Slice 266c 接通 · Slice 266d 补全 Tavern 对等合同）：服务端绑定的持久会话，按席位校验；人设/世界书/分层记忆/分支/作者注释/导入导出/审计/权限面全部走真实服务端合同。同伴永不持久化席位令牌、永不读取对手私有计划/记忆、永不请求或存储隐藏思维链、绝不伪造模型回复；无 Preview/Confirm/Apply 权限。"
            : "Companion group chat (connected in Slice 266c · Tavern-equivalent contracts completed in Slice 266d): a server-bound persisted conversation, verified per seat; persona, worldbook, layered memory, branches, author's note, import/export, audit and permission surfaces all run through real server contracts. Companions never persist seat tokens, never read opponent-private plans/memory, never request or store hidden chain-of-thought, and never fabricate a model reply; no Preview/Confirm/Apply authority."}
        </Text>
        {!companionProduct && (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {zh
              ? "同伴产品客户端未挂载：如实不可用，不做本地模拟。"
              : "Companion product client is not mounted: honestly unavailable, never simulated locally."}
          </Text>
        )}
        {renderChatProviderStatus()}
        {renderChatPersonaCard()}
        {renderChatAuditCard()}
        {renderChatPermissionsCard()}
        {renderChatPromotionsCard()}
        {chat.conversation ? renderChatConversation(chat.conversation) : (
          <>
            <Text style={styles.fieldLabel}>
              {zh ? "选择 1–6 位已注册同伴" : "Select 1–6 registered companions"}
            </Text>
            <View style={styles.choiceRow} testID="companion-chat-selector">
              {COMPANION_CATALOGUE_V1.entries.map((entry: any) => {
                const packageId = companionPackageIdFromCharacterId(entry.characterId);
                const slug = entry.characterId.split(".")[1] || entry.characterId;
                const active = effectiveChatSelection.includes(packageId);
                return (
                  <ChoiceButton
                    key={entry.characterId}
                    active={active}
                    disabled={chat.busy || !companionProduct}
                    label={zh ? entry.displayNameZh : entry.displayName}
                    onPress={() => toggleChatCompanion(packageId)}
                    testID={`companion-chat-select-${slug}`}
                  />
                );
              })}
            </View>
            <Text style={styles.sectionMeta}>
              {zh
                ? `已选 ${effectiveChatSelection.length}/${MAX_CHAT_COMPANIONS}：发言顺序为确定性选择顺序，之后轮转。`
                : `Selected ${effectiveChatSelection.length}/${MAX_CHAT_COMPANIONS}: speaker order is the deterministic selection order, then rotation.`}
            </Text>
            <ActionButton
              disabled={chat.busy || !companionProduct}
              label={zh ? "打开或恢复会话" : "Open or resume conversation"}
              onPress={() => void openChatConversation()}
              testID="companion-chat-open"
            />
            {chat.bootstrapped && !chat.error && (
              <Text style={styles.sectionHint}>
                {zh
                  ? "本席位当前没有进行中的同伴会话；打开即创建或恢复同阵容的持久会话。"
                  : "No active companion conversation for this seat right now; opening creates or resumes the persisted conversation for the same roster."}
              </Text>
            )}
          </>
        )}
        {chat.error && (
          <Text accessibilityRole="alert" style={styles.errorText} testID="companion-chat-error">
            {chat.error.code}
          </Text>
        )}
      </View>
    );
  }

  function renderFloatingSection(
    key: FloatingSectionKey,
    label: string,
    content: React.ReactNode,
  ) {
    const open = sectionOpen(key);
    return (
      <View key={key} style={styles.section}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => toggleSection(key)}
          style={styles.sectionHeader}
          testID={`companion-section-${key}`}
        >
          <Text style={styles.sectionHeaderText}>{label}</Text>
          <Text style={styles.sectionHeaderToggle}>{open ? "−" : "+"}</Text>
        </Pressable>
        {open ? content : null}
      </View>
    );
  }

  const consoleHeader = (
    <View style={styles.agentConsoleHeader}>
      <View style={styles.headerCopy}>
        <Text style={styles.agentConsoleTitle}>
          {zh ? "在线副官会话" : "Online Adjutant session"}
        </Text>
        <Text style={styles.agentMeta}>
          {zh
            ? `状态 ${roleAgent?.status || "未挂载"} · Provider ${roleAgent?.provider?.state || "未知"}`
            : `Status ${roleAgent?.status || "not mounted"} · Provider ${roleAgent?.provider?.state || "unknown"}`}
        </Text>
      </View>
      {(agentBusy || roleAgent?.status === "connecting") && (
        <ActivityIndicator color={COMMS.cyan} size="small" />
      )}
    </View>
  );

  const sessionChips = (
    <View style={styles.statusRow}>
      <StatusChip label={selectedMode} />
      <StatusChip
        label={roleAgent?.budget
          ? (zh
            ? `余量 ${roleAgent.budget.remainingUnits}/${roleAgent.budget.policy?.maxTotalUnits}`
            : `budget ${roleAgent.budget.remainingUnits}/${roleAgent.budget.policy?.maxTotalUnits}`)
          : (zh ? "预算待同步" : "budget pending")}
      />
      <StatusChip
        label={roleAgent?.connectionEpoch
          ? `epoch ${roleAgent.connectionEpoch}`
          : (zh ? "未连接" : "disconnected")}
      />
    </View>
  );

  // Slice 266f: the floating sections are built once so the same tree can
  // render inside the compact dock, the wide desktop focus sheet (two
  // columns) or the mobile full-screen sheet (single column) without any
  // DOM/testID change.
  const floatingMainSections = [
    !productRoom && renderFloatingSection(
      "comms",
      zh ? "战场通讯" : "Field comms",
      <View style={styles.sectionBody}>
        <View style={styles.commsRow}>
          {renderPortraitAndCopy()}
        </View>
        {agentSessionActive ? renderConversation() : (
          <Text style={styles.sectionHint}>
            {zh
              ? "会话未接通；在下方「会话控制」选择模式并接通后开始对话。"
              : "No session is open; choose a mode under Session controls below to start the conversation."}
          </Text>
        )}
      </View>,
    ),
    renderFloatingSection(
      "chat",
      productRoom ? (zh ? '和副官聊天' : 'Chat with your companion') : (zh ? '同伴群聊（已接通）' : 'Companion group chat (connected)'),
      renderChatSection(),
    ),
  ];
  const floatingSideSections = [
    renderFloatingSection(
      "identity",
      zh ? "同伴与世界书" : "Companion & world book",
      renderIdentitySection(),
    ),
    renderFloatingSection(
      "catalogue",
      zh ? "同伴目录与对等" : "Companion catalogue & parity",
      <View style={styles.sectionBody} testID="companion-catalogue-section">
        <CompanionCataloguePanel zh={zh} />
      </View>,
    ),
    renderFloatingSection(
      "memory",
      zh ? "关系与记忆" : "Relationship & memory",
      renderMemorySection(),
    ),
    !productRoom && renderFloatingSection(
      "session",
      zh ? "会话控制" : "Session controls",
      <View style={styles.sectionBody} testID="companion-session-section">
        {consoleHeader}
        {sessionChips}
        {!agentSessionActive ? renderSessionEntry() : (
          <>
            <Text style={styles.sectionHint}>
              {zh
                ? "对话内容在上方的「战场通讯」；此处管理会话生命周期。"
                : "The conversation lives in Field comms above; manage the session lifecycle here."}
            </Text>
            <View style={styles.actionRow}>
              {roleAgent.status === "reconnect_required" && (
                <ActionButton
                  disabled={submitting || agentReadOnly}
                  label={zh ? "重新连接" : "Reconnect"}
                  onPress={() => void runAgentIntent({ type: "reconnect_agent_session" })}
                />
              )}
              <ActionButton
                danger
                disabled={agentBusy || agentReadOnly}
                label={zh ? "结束会话" : "End session"}
                onPress={() => void runAgentIntent({ type: "end_agent_session" })}
              />
            </View>
          </>
        )}
        {renderPermissionPosture()}
      </View>,
    ),
    !productRoom && renderFloatingSection(
      "provider",
      zh ? "安全 Provider 设置（BYOK）" : "Secure Provider setup (BYOK)",
      <View style={styles.sectionBody}>{renderProviderCard()}</View>,
    ),
    renderFloatingSection(
      "diagnostics",
      zh ? "诊断" : "Diagnostics",
      <View style={styles.sectionBody} testID="companion-diagnostics-section">
        {renderTraceCard()}
        <Text style={styles.diagMeta}>
          sessionRef: {roleAgent?.sessionRef || "—"}
        </Text>
        <Text style={styles.diagMeta}>
          {zh ? "角色投影状态" : "character status"}: {characterStatus?.status || "—"}
          {" · "}{zh ? "拒绝码" : "rejection"}: {characterStatus?.rejectionCode || "none"}
        </Text>
        <Text style={styles.diagMeta}>
          {zh ? "角色投影哈希" : "character projection hash"}: {projection?.projectionHash || "—"}
        </Text>
        <Text style={styles.diagMeta}>
          {zh
            ? "rawPromptExposed: false · rawProviderOutputExposed: false · trainingTruth: false"
            : "rawPromptExposed: false · rawProviderOutputExposed: false · trainingTruth: false"}
        </Text>
      </View>,
    ),
  ];

  const sheetHeader = (
    <View style={styles.sheetHeader}>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>{zh ? "战术通讯" : "TACTICAL COMMS"}</Text>
        <Text numberOfLines={1} style={styles.sheetHeaderTitle}>
          {wideFocusMode
            ? (zh ? "宽幅焦点模式 · 战场保持可见" : "Wide focus mode · battlefield stays visible")
            : (zh ? "全屏会话 · 收起返回战场" : "Full-screen conversation · collapse to return")}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={toggleExpanded}
        style={styles.sheetCloseButton}
        testID={wideFocusMode
          ? "companion-focus-sheet-close"
          : "companion-mobile-sheet-close"}
      >
        <Text style={styles.sheetCloseText}>{zh ? "收起" : "Collapse"}</Text>
      </Pressable>
    </View>
  );

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={zh ? "战术副官" : "Tactical Adjutant"}
      style={[styles.panel, floating && styles.floatingPanel]}
      testID="tactical-adjutant-panel"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={toggleExpanded}
        style={[styles.header, floating && !expanded && styles.headerCollapsedChip]}
      >
        {floating && !expanded && (
          <View style={styles.chipEmblem}>
            <Text style={styles.chipEmblemText}>◈</Text>
          </View>
        )}
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{zh ? "战术通讯" : "TACTICAL COMMS"}</Text>
          <Text numberOfLines={1} style={[
            styles.title,
            floating && !expanded && styles.titleCollapsedChip,
          ]}>
            {identityTitle}
          </Text>
        </View>
        {floating && !expanded && (
          <View
            accessibilityLabel={chipStatus.label}
            style={[styles.chipStatusDot, { backgroundColor: chipStatus.color }]}
          />
        )}
        <Text style={styles.toggle}>{expanded ? "−" : "+"}</Text>
      </Pressable>

      {expanded && (floating ? (
        wideFocusMode || mobileSheetMode ? (
          portalSheetToBody(
            <View
              style={[
                wideFocusMode ? styles.focusSheet : styles.mobileSheet,
                fixedSheetPosition,
                wideFocusMode ? { width: focusSheetWidth } : null,
              ]}
              testID={wideFocusMode ? "companion-focus-sheet" : "companion-mobile-sheet"}
            >
              {sheetHeader}
              {wideFocusMode ? (
                <View style={styles.focusColumnsRow}>
                  <View style={[styles.focusColumn, styles.focusColumnMain]}>
                    {renderRejection()}
                    {floatingMainSections}
                  </View>
                  <View style={styles.focusColumn}>
                    {floatingSideSections}
                  </View>
                </View>
              ) : (
                <View style={styles.mobileSheetColumn}>
                  {renderRejection()}
                  {floatingMainSections}
                  {floatingSideSections}
                </View>
              )}
            </View>,
          )
        ) : (
          <View style={styles.bodyFloating}>
            {renderRejection()}
            {floatingMainSections}
            {floatingSideSections}
          </View>
        )
      ) : (
        <View style={styles.body}>
          {renderPortraitAndCopy()}

          <View style={styles.agentConsole} testID="online-agent-console">
            {consoleHeader}
            {sessionChips}
            {renderProviderCard()}
            {!agentSessionActive ? renderSessionEntry() : renderConversation()}
            {renderTraceCard()}
            {renderRejection()}
          </View>
        </View>
      ))}
    </View>
  );
}

function StaticNeutralAdjutantPortrait({ label }: { label: string }) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="image"
      style={styles.neutralPortrait}
      testID="static-neutral-adjutant-portrait"
    >
      <View style={styles.neutralHalo} />
      <View style={styles.neutralHead} />
      <View style={styles.neutralShoulders} />
      <View style={styles.neutralCore} />
    </View>
  );
}

/**
 * Slice 266e: six-state portrait animation binding (committed keyframes
 * only). On a bound-state change the new committed keyframe fades in with
 * the state's deterministic bounded duration; there is no frame loop and no
 * generated in-between frame. Reduced motion collapses the transition and
 * renders the single static keyframe, exactly as the portrait-state
 * contracts prescribe. The image layer keeps the exact
 * `companion-chat-speaker-portrait-img` structure the pixel gate proves.
 */
function ChatSpeakerPortraitFrame({ accessibilityLabel, reducedMotion, source, state }: {
  accessibilityLabel: string;
  reducedMotion: boolean;
  source: ImageSourcePropType;
  state: CompanionPortraitStateId;
}) {
  const fade = useRef(new Animated.Value(1)).current;
  const previousState = useRef(state);
  useEffect(() => {
    if (previousState.current === state) return;
    previousState.current = state;
    const transition = companionPortraitAnimationTransitionV1(state, { reducedMotion });
    if (transition.reducedMotionStatic || transition.durationMs <= 0) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0.35);
    Animated.timing(fade, {
      toValue: 1,
      duration: transition.durationMs,
      useNativeDriver: true,
    }).start();
  }, [state, reducedMotion, fade]);
  return (
    <View style={styles.chatSpeakerPortraitBox} testID="companion-chat-speaker-portrait">
      <Animated.View style={{ width: "100%", height: "100%", opacity: fade }}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={accessibilityLabel}
          resizeMode="cover"
          source={source}
          style={styles.chatSpeakerPortrait}
          testID="companion-chat-speaker-portrait-img"
        />
      </Animated.View>
      <View pointerEvents="none" style={styles.scanlines} />
    </View>
  );
}

function StatusChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function ChoiceButton({
  active,
  disabled,
  label,
  onPress,
  testID,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onPress(): void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choiceButton, active && styles.choiceButtonActive, disabled && styles.disabled]}
      testID={testID}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({
  danger = false,
  disabled,
  label,
  onPress,
  testID,
}: {
  danger?: boolean;
  disabled: boolean;
  label: string;
  onPress(): void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButton, danger && styles.dangerButton, disabled && styles.disabled]}
      testID={testID}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 14, overflow: "hidden", backgroundColor: COMMS.spaceDeep, borderWidth: 1, borderColor: COMMS.line },
  floatingPanel: { borderColor: COMMS.lineStrong, backgroundColor: COMMS.spaceDeep },
  header: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: COMMS.panelAlt },
  headerCollapsedChip: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  headerCopy: { flex: 1, flexShrink: 1, minWidth: 0 },
  eyebrow: { color: COMMS.cyan, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: COMMS.ice, fontSize: 16, fontWeight: "900", marginTop: 3 },
  titleCollapsedChip: { fontSize: 13, marginTop: 1 },
  toggle: { color: COMMS.cyanBright, fontSize: 24, fontWeight: "700" },
  chipEmblem: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: COMMS.raised, borderWidth: 1, borderColor: COMMS.line },
  chipEmblemText: { color: COMMS.cyan, fontSize: 14 },
  chipStatusDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: "#020617" },
  body: { flexDirection: "row", flexWrap: "wrap", gap: 14, padding: 14 },
  bodyFloating: { gap: 8, padding: 10 },
  // Slice 266f: viewport-fixed sheet geometry (position applied inline as a
  // plain object; web-only branches).
  focusSheet: { left: 16, top: 16, bottom: 18, zIndex: 1100, borderRadius: 14, borderWidth: 1, borderColor: COMMS.lineStrong, backgroundColor: COMMS.panel, overflow: "hidden" },
  mobileSheet: { left: 0, top: 0, right: 0, bottom: 0, zIndex: 1100, backgroundColor: COMMS.panel },
  sheetHeader: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, backgroundColor: COMMS.panelAlt, borderBottomWidth: 1, borderBottomColor: COMMS.lineSoft },
  sheetHeaderTitle: { color: COMMS.cyanBright, fontSize: 12, fontWeight: "900", marginTop: 2 },
  sheetCloseButton: { minHeight: 34, justifyContent: "center", borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: COMMS.lineStrong, backgroundColor: COMMS.action },
  sheetCloseText: { color: COMMS.cyanBright, fontSize: 11, fontWeight: "900" },
  focusColumnsRow: { flex: 1, flexDirection: "row", gap: 10, padding: 10, minHeight: 0 },
  focusColumn: { flex: 1, gap: 8, overflow: "scroll", minWidth: 0 },
  focusColumnMain: { flexGrow: 1.3 },
  mobileSheetColumn: { flex: 1, gap: 8, padding: 10, overflow: "scroll" },
  commsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  section: { borderRadius: 10, borderWidth: 1, borderColor: COMMS.lineSoft, backgroundColor: COMMS.section, overflow: "hidden" },
  sectionHeader: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COMMS.panelAlt },
  sectionHeaderText: { flex: 1, color: COMMS.cyanSoft, fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  sectionHeaderToggle: { color: COMMS.cyanBright, fontSize: 18, fontWeight: "700" },
  sectionBody: { gap: 8, padding: 10 },
  sectionValue: { color: COMMS.ice, fontSize: 14, fontWeight: "900" },
  sectionRow: { color: COMMS.text, fontSize: 12, fontWeight: "800" },
  sectionMeta: { color: COMMS.textDim, fontSize: 10, lineHeight: 15, fontFamily: "monospace" },
  sectionHint: { color: COMMS.textDim, fontSize: 11, lineHeight: 17 },
  gapCard: { gap: 4, borderRadius: 8, padding: 9, borderWidth: 1, borderColor: COMMS.lineSoft, backgroundColor: COMMS.section },
  gapTitle: { color: COMMS.cyanBright, fontSize: 11, fontWeight: "900" },
  gapCode: { color: COMMS.textDim, fontSize: 10, lineHeight: 16, fontFamily: "monospace" },
  postureCard: { gap: 6, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COMMS.lineStrong, backgroundColor: COMMS.panelAlt },
  postureTitle: { color: COMMS.cyanBright, fontSize: 12, fontWeight: "900" },
  diagMeta: { color: COMMS.textDim, fontSize: 10, lineHeight: 15, fontFamily: "monospace" },
  modeNote: { color: COMMS.textDim, fontSize: 10, lineHeight: 16 },
  portraitFrame: { width: 168, height: 168, maxWidth: "100%", position: "relative", overflow: "hidden", backgroundColor: COMMS.spaceDeep, borderWidth: 1, borderColor: COMMS.line },
  portrait: { width: "100%", height: "100%" },
  fallbackPortrait: { flex: 1, padding: 14, justifyContent: "center", alignItems: "center", gap: 8 },
  fallbackGlyph: { color: COMMS.cyan, fontSize: 30 },
  neutralPortrait: { width: 82, height: 82, position: "relative", alignItems: "center", justifyContent: "center" },
  neutralHalo: { position: "absolute", width: 76, height: 76, borderRadius: 38, borderWidth: 1, borderColor: COMMS.cyan, opacity: 0.5 },
  neutralHead: { position: "absolute", top: 15, width: 24, height: 30, borderRadius: 12, backgroundColor: COMMS.cyanSoft },
  neutralShoulders: { position: "absolute", bottom: 13, width: 58, height: 28, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: COMMS.line },
  neutralCore: { position: "absolute", bottom: 23, width: 9, height: 9, borderRadius: 5, backgroundColor: COMMS.cyanBright },
  fallbackText: { color: COMMS.textDim, fontSize: 11, lineHeight: 17, textAlign: "center" },
  scanlines: { ...StyleSheet.absoluteFillObject, opacity: 0.14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COMMS.cyanSoft },
  copy: { flex: 1, flexBasis: 240, minWidth: 0, justifyContent: "center" },
  personaTitle: { color: COMMS.ice, fontSize: 16, lineHeight: 22, fontWeight: "900" },
  timeline: { color: COMMS.textDim, fontSize: 11, lineHeight: 17, marginTop: 5 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 11 },
  chip: { minHeight: 24, justifyContent: "center", paddingHorizontal: 8, borderRadius: 999, backgroundColor: COMMS.raised, borderWidth: 1, borderColor: COMMS.line },
  chipText: { color: COMMS.cyanSoft, fontSize: 10, fontWeight: "800" },
  boundary: { color: COMMS.textDim, fontSize: 11, lineHeight: 18, marginTop: 11 },
  rights: { color: WARN.amber, fontSize: 10, lineHeight: 16, marginTop: 7 },
  agentConsole: { width: "100%", borderTopWidth: 1, borderTopColor: COMMS.lineSoft, paddingTop: 14, gap: 10 },
  agentConsoleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  agentConsoleTitle: { color: COMMS.ice, fontSize: 15, fontWeight: "900" },
  agentMeta: { color: COMMS.textDim, fontSize: 10, marginTop: 3 },
  providerCard: { gap: 9, padding: 11, borderWidth: 1, borderColor: COMMS.lineStrong, borderRadius: 10, backgroundColor: COMMS.panelAlt },
  providerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  providerTitle: { color: COMMS.cyanBright, fontSize: 13, fontWeight: "900" },
  providerMeta: { color: COMMS.textDim, fontSize: 10, lineHeight: 15 },
  providerDisclosure: { color: COMMS.text, fontSize: 11, lineHeight: 17 },
  providerStateRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  providerStateChip: { minHeight: 24, justifyContent: "center", paddingHorizontal: 8, borderRadius: 999, backgroundColor: COMMS.raised, borderWidth: 1, borderColor: COMMS.line },
  providerStateChipAttached: { borderColor: COMMS.good },
  providerStateChipWarning: { borderColor: WARN.amberLine, backgroundColor: WARN.amberDeep },
  providerStateChipError: { borderColor: WARN.dangerLine, backgroundColor: WARN.dangerDeep },
  providerStateText: { color: COMMS.cyanSoft, fontSize: 10, fontWeight: "800" },
  providerReceiptCard: { gap: 4, borderRadius: 8, padding: 9, borderWidth: 1, borderColor: COMMS.lineSoft, backgroundColor: COMMS.section },
  providerReceiptTitle: { color: COMMS.cyanBright, fontSize: 10, fontWeight: "900" },
  providerReceiptText: { color: COMMS.textDim, fontSize: 10, lineHeight: 15, fontFamily: "monospace" },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 9, borderRadius: 8, borderWidth: 1, borderColor: COMMS.lineSoft, backgroundColor: COMMS.section },
  consentMark: { color: COMMS.cyan, fontSize: 16, lineHeight: 18 },
  consentText: { flex: 1, color: COMMS.text, fontSize: 10, lineHeight: 16 },
  secretInput: { minHeight: 44, borderWidth: 1, borderColor: COMMS.lineStrong, borderRadius: 8, padding: 10, color: COMMS.ice, backgroundColor: COMMS.spaceDeep, fontSize: 12 },
  fieldLabel: { color: COMMS.cyan, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: 2 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choiceButton: { minHeight: 34, justifyContent: "center", borderRadius: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: COMMS.line, backgroundColor: COMMS.raised },
  choiceButtonActive: { borderColor: COMMS.cyan, backgroundColor: COMMS.panelAlt },
  choiceText: { color: COMMS.textDim, fontSize: 11, fontWeight: "800" },
  choiceTextActive: { color: COMMS.cyanBright },
  transcript: { minHeight: 96, maxHeight: 320, padding: 10, gap: 8, borderWidth: 1, borderColor: COMMS.lineSoft, borderRadius: 10, backgroundColor: COMMS.spaceDeep, overflow: "scroll" },
  humanMessage: { alignSelf: "flex-end", maxWidth: "88%", padding: 9, borderRadius: 10, backgroundColor: COMMS.raised },
  agentMessage: { alignSelf: "flex-start", maxWidth: "92%", padding: 9, borderRadius: 10, borderWidth: 1, borderColor: COMMS.lineSoft, backgroundColor: COMMS.section },
  messageAuthor: { color: COMMS.cyanBright, fontSize: 9, fontWeight: "900", marginBottom: 4 },
  messageText: { color: COMMS.text, fontSize: 12, lineHeight: 18 },
  emptyTranscript: { color: COMMS.textFaint, fontSize: 11, textAlign: "center", marginVertical: 28 },
  decisionCard: { gap: 5, borderLeftWidth: 3, borderLeftColor: COMMS.cyan, padding: 10, backgroundColor: COMMS.panelAlt },
  decisionTitle: { color: COMMS.ice, fontSize: 12, fontWeight: "900" },
  decisionText: { color: COMMS.text, fontSize: 11, lineHeight: 17 },
  decisionRisk: { color: WARN.amber, fontSize: 11, lineHeight: 17 },
  alternativeText: { color: COMMS.textFaint, fontSize: 10, lineHeight: 15 },
  confirmCard: { gap: 7, borderWidth: 1, borderColor: WARN.amberLine, borderRadius: 10, padding: 11, backgroundColor: WARN.amberDeep },
  confirmTitle: { color: WARN.amberBright, fontSize: 12, fontWeight: "900" },
  confirmText: { color: WARN.amberBright, fontSize: 11 },
  input: { minHeight: 72, maxHeight: 150, borderWidth: 1, borderColor: COMMS.line, borderRadius: 10, padding: 10, color: COMMS.ice, backgroundColor: COMMS.section, textAlignVertical: "top", fontSize: 12, lineHeight: 18 },
  chatSmallInput: { minHeight: 40, maxHeight: 48, width: 64, flexGrow: 0, textAlignVertical: "center" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { minHeight: 38, justifyContent: "center", alignItems: "center", borderRadius: 8, paddingHorizontal: 14, backgroundColor: COMMS.action, borderWidth: 1, borderColor: COMMS.lineStrong },
  dangerButton: { backgroundColor: WARN.dangerDeep, borderColor: WARN.dangerLine },
  actionButtonText: { color: COMMS.ice, fontSize: 11, fontWeight: "900" },
  disabled: { opacity: 0.42 },
  traceCard: { gap: 4, padding: 9, borderRadius: 8, backgroundColor: COMMS.section, borderWidth: 1, borderColor: COMMS.lineSoft },
  chatStatusCard: { gap: 6, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COMMS.lineStrong, backgroundColor: COMMS.panelAlt },
  chatStatusTitle: { color: COMMS.cyanBright, fontSize: 12, fontWeight: "900" },
  chatStatusMeta: { color: COMMS.textDim, fontSize: 10, lineHeight: 15 },
  chatOrderChip: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: COMMS.raised, borderWidth: 1, borderColor: COMMS.line, maxWidth: "100%" },
  chatOrderChipNext: { borderColor: COMMS.cyan, backgroundColor: COMMS.panelAlt },
  chatOrderChipTextBlock: { flexShrink: 1, minWidth: 0 },
  chatOrderText: { color: COMMS.textDim, fontSize: 10, fontWeight: "800" },
  chatOrderTextNext: { color: COMMS.cyanBright },
  chatOrderEraText: { color: COMMS.textFaint, fontSize: 7, fontWeight: "700", lineHeight: 10 },
  chatAvatarBox: { borderWidth: 1, borderRadius: 5, borderColor: COMMS.line, backgroundColor: COMMS.spaceDeep, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chatAvatarImage: { width: "100%", height: "100%" },
  chatAvatarGlyph: { color: COMMS.cyan, fontSize: 11 },
  messageSpeakerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" },
  messageEraText: { color: COMMS.textFaint, fontSize: 8, fontWeight: "700", fontFamily: "monospace" },
  chatSpeakerRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  chatSpeakerPortraitBox: { width: 72, height: 72, maxWidth: "100%", borderWidth: 1, borderRadius: 8, borderColor: COMMS.line, backgroundColor: COMMS.spaceDeep, overflow: "hidden", alignItems: "center", justifyContent: "center", position: "relative" },
  chatSpeakerPortrait: { width: "100%", height: "100%" },
  chatSpeakerCopy: { flex: 1, flexBasis: 180, minWidth: 0, gap: 3 },
  chatInterruptCard: { gap: 7, borderWidth: 1, borderColor: WARN.amberLine, borderRadius: 10, padding: 11, backgroundColor: WARN.amberDeep },
  chatInterruptTitle: { color: WARN.amberBright, fontSize: 12, fontWeight: "900" },
  chatInterruptText: { color: WARN.amberBright, fontSize: 11, lineHeight: 17 },
  chatCheckpointRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: COMMS.lineSoft, borderRadius: 8, padding: 8, backgroundColor: COMMS.section },
  traceTitle: { color: COMMS.cyan, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  traceText: { color: COMMS.textDim, fontSize: 10, lineHeight: 15 },
  errorText: { color: WARN.danger, fontSize: 11, lineHeight: 17 },
});
