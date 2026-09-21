import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useI18n } from "@/lib/i18n";
import { useLevel3ClientDomain } from "@/lib/level3/client-domain-provider";
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
  | "identity"
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
  const roleAgent = view.roleAgentSession;
  const zh = lang === "zh";
  const active = routeFocused
    && expanded
    && connection.visible
    && connection.online;
  const agentSessionActive = roleAgent?.lifecycleState === "active";
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

  const floatingSectionDefaults: Record<FloatingSectionKey, boolean> = {
    comms: true,
    identity: false,
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
        : (zh ? "凯瑞甘副官 · 待连接" : "Kerrigan Adjutant · awaiting room");

  const chipStatus: { label: string; color: string } = roleAgent?.pendingConfirmation
    ? { label: zh ? "等待确认" : "confirmation pending", color: "#f59e0b" }
    : secureProvider?.status === "awaiting_secret"
      ? { label: zh ? "等待密钥" : "secret awaited", color: "#f59e0b" }
      : !connection.online
        ? { label: zh ? "离线" : "offline", color: "#64748b" }
        : agentSessionActive
          ? { label: zh ? "在线" : "online", color: "#22c55e" }
          : { label: zh ? "待命" : "standby", color: "#38bdf8" };

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
          {providerBusy && <ActivityIndicator color="#d2ae59" size="small" />}
        </View>

        <Text style={styles.providerDisclosure}>
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
        ) : secureProvider && secureProvider.status !== "idle" ? (
          <Text style={styles.providerMeta} testID="secure-provider-empty-catalogue">
            {zh
              ? "Provider 清单已加载：服务端本会话许可 0 个 Provider 配置；BYOK 如实不可用，不是被隐藏。加载清单不会调用模型。"
              : "Provider catalogue loaded: the server approved 0 Provider profiles for this session; BYOK is honestly unavailable, not hidden. Loading the catalogue does not call a model."}
          </Text>
        ) : (
          <>
            <Text style={styles.providerMeta}>
              {zh ? "Provider 清单尚未载入；加载动作不会调用模型。" : "Provider catalogue is not loaded; loading it does not call a model."}
            </Text>
            <ActionButton
              disabled={providerBusy || !secureProvider}
              label={zh ? "加载 Provider 清单" : "Load Provider catalogue"}
              onPress={() => void runProviderIntent({ type: "load_profiles" })}
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
              placeholderTextColor="#73806e"
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
          placeholderTextColor="#73806e"
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
          <Text style={styles.sectionHint}>
            {zh
              ? "进入已验证房间后加载同伴身份与世界书。"
              : "Join a verified room to load companion identity and world book."}
          </Text>
        )}
        <View style={styles.gapCard}>
          <Text style={styles.gapTitle}>
            {zh ? "多个同伴如实说明" : "Multiple companions, honestly"}
          </Text>
          <Text style={styles.sectionHint}>
            {zh
              ? "不同同伴以人格/世界书选择存在，并按顺序切换发言；同一会话同一时刻只有一位同伴发言。"
              : "Distinct companions exist as persona/world-book selections and speak by switching; exactly one companion speaks per session at a time."}
          </Text>
          <Text style={styles.gapCode}>
            {CONTRACT_GAPS.multiSpeaker}
            {zh
              ? "：当前客户端合同未暴露多同伴同会话同时发言；此处如实不可用，不做本地模拟。"
              : ": simultaneous multi-speaker conversation is not exposed by the current client contract; honestly unavailable here, never simulated locally."}
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
              ? "：当前客户端投影未暴露同伴关系状态；如实显示未知，绝不当零或编造。"
              : ": no companion relationship state is exposed by the current client projection; shown honestly as unknown, never zero or invented."}
          </Text>
        </View>
        <View style={styles.gapCard}>
          <Text style={styles.gapTitle}>{zh ? "分层长期记忆" : "Layered long-term memory"}</Text>
          <Text style={styles.gapCode}>
            {CONTRACT_GAPS.memoryLayers}
            {zh
              ? "：当前客户端只暴露会话转写上限与安全记忆哈希引用；分层长期记忆投影未暴露，不做本地伪持久层。"
              : ": the client exposes only the session transcript bound and safe memory hash refs; layered long-term memory is not projected, and no fake local persistence layer is created."}
          </Text>
        </View>
        <View style={styles.gapCard}>
          <Text style={styles.gapTitle}>{zh ? "导入 / 导出 / 恢复" : "Import / export / restore"}</Text>
          <Text style={styles.gapCode}>
            {CONTRACT_GAPS.importExportRestore}
            {zh
              ? "：同伴卡片、世界书与记忆的导入/导出/恢复合同未暴露给客户端；此处不提供伪造入口。"
              : ": no import/export/restore contract for companion cards, world books, or memory is exposed to the client; no fake entry point is offered."}
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
        <ActivityIndicator color="#d2ae59" size="small" />
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
        <View style={styles.bodyFloating}>
          {renderRejection()}
          {renderFloatingSection(
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
          )}
          {renderFloatingSection(
            "identity",
            zh ? "同伴与世界书" : "Companion & world book",
            renderIdentitySection(),
          )}
          {renderFloatingSection(
            "memory",
            zh ? "关系与记忆" : "Relationship & memory",
            renderMemorySection(),
          )}
          {renderFloatingSection(
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
          )}
          {renderFloatingSection(
            "provider",
            zh ? "安全 Provider 设置（BYOK）" : "Secure Provider setup (BYOK)",
            <View style={styles.sectionBody}>{renderProviderCard()}</View>,
          )}
          {renderFloatingSection(
            "diagnostics",
            zh ? "诊断" : "Diagnostics",
            <View style={styles.sectionBody} testID="companion-diagnostics-section">
              {renderTraceCard()}
              <Text style={styles.diagMeta}>
                sessionRef: {roleAgent?.sessionRef || "—"}
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
          )}
        </View>
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
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choiceButton, active && styles.choiceButtonActive, disabled && styles.disabled]}
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
}: {
  danger?: boolean;
  disabled: boolean;
  label: string;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButton, danger && styles.dangerButton, disabled && styles.disabled]}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 14, overflow: "hidden", backgroundColor: "#080f0b", borderWidth: 1, borderColor: "#52624a" },
  floatingPanel: { borderColor: "#2d839d", backgroundColor: "#060d12" },
  header: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: "#101912" },
  headerCollapsedChip: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  headerCopy: { flex: 1, flexShrink: 1, minWidth: 0 },
  eyebrow: { color: "#a8bd7d", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#eef4df", fontSize: 16, fontWeight: "900", marginTop: 3 },
  titleCollapsedChip: { fontSize: 13, marginTop: 1 },
  toggle: { color: "#d2ae59", fontSize: 24, fontWeight: "700" },
  chipEmblem: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: "#1b291c", borderWidth: 1, borderColor: "#4c6147" },
  chipEmblemText: { color: "#a8bd7d", fontSize: 14 },
  chipStatusDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: "#020617" },
  body: { flexDirection: "row", flexWrap: "wrap", gap: 14, padding: 14 },
  bodyFloating: { gap: 8, padding: 10 },
  commsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  section: { borderRadius: 10, borderWidth: 1, borderColor: "#354232", backgroundColor: "#0a120c", overflow: "hidden" },
  sectionHeader: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#101912" },
  sectionHeaderText: { flex: 1, color: "#d5e2c5", fontSize: 11, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  sectionHeaderToggle: { color: "#d2ae59", fontSize: 18, fontWeight: "700" },
  sectionBody: { gap: 8, padding: 10 },
  sectionValue: { color: "#f5f2df", fontSize: 14, fontWeight: "900" },
  sectionRow: { color: "#e2e8f0", fontSize: 12, fontWeight: "800" },
  sectionMeta: { color: "#9da994", fontSize: 10, lineHeight: 15, fontFamily: "monospace" },
  sectionHint: { color: "#aeb9a4", fontSize: 11, lineHeight: 17 },
  gapCard: { gap: 4, borderRadius: 8, padding: 9, borderWidth: 1, borderColor: "#66562d", backgroundColor: "#15150d" },
  gapTitle: { color: "#f6dda0", fontSize: 11, fontWeight: "900" },
  gapCode: { color: "#d4ceb3", fontSize: 10, lineHeight: 16, fontFamily: "monospace" },
  postureCard: { gap: 6, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#2d839d", backgroundColor: "#08202d" },
  postureTitle: { color: "#a5f3fc", fontSize: 12, fontWeight: "900" },
  diagMeta: { color: "#92a08c", fontSize: 10, lineHeight: 15, fontFamily: "monospace" },
  modeNote: { color: "#9da994", fontSize: 10, lineHeight: 16 },
  portraitFrame: { width: 168, height: 168, maxWidth: "100%", position: "relative", overflow: "hidden", backgroundColor: "#071009", borderWidth: 1, borderColor: "#70805e" },
  portrait: { width: "100%", height: "100%" },
  fallbackPortrait: { flex: 1, padding: 14, justifyContent: "center", alignItems: "center", gap: 8 },
  fallbackGlyph: { color: "#7f946a", fontSize: 30 },
  neutralPortrait: { width: 82, height: 82, position: "relative", alignItems: "center", justifyContent: "center" },
  neutralHalo: { position: "absolute", width: 76, height: 76, borderRadius: 38, borderWidth: 1, borderColor: "#7f946a", opacity: 0.5 },
  neutralHead: { position: "absolute", top: 15, width: 24, height: 30, borderRadius: 12, backgroundColor: "#93a77d" },
  neutralShoulders: { position: "absolute", bottom: 13, width: 58, height: 28, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: "#52624a" },
  neutralCore: { position: "absolute", bottom: 23, width: 9, height: 9, borderRadius: 5, backgroundColor: "#d2ae59" },
  fallbackText: { color: "#aeb9a4", fontSize: 11, lineHeight: 17, textAlign: "center" },
  scanlines: { ...StyleSheet.absoluteFillObject, opacity: 0.14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#dcebc9" },
  copy: { flex: 1, flexBasis: 240, minWidth: 0, justifyContent: "center" },
  personaTitle: { color: "#f5f2df", fontSize: 16, lineHeight: 22, fontWeight: "900" },
  timeline: { color: "#9da994", fontSize: 11, lineHeight: 17, marginTop: 5 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 11 },
  chip: { minHeight: 24, justifyContent: "center", paddingHorizontal: 8, borderRadius: 999, backgroundColor: "#1b291c", borderWidth: 1, borderColor: "#4c6147" },
  chipText: { color: "#c8d7b7", fontSize: 10, fontWeight: "800" },
  boundary: { color: "#aeb9a4", fontSize: 11, lineHeight: 18, marginTop: 11 },
  rights: { color: "#d2ae59", fontSize: 10, lineHeight: 16, marginTop: 7 },
  agentConsole: { width: "100%", borderTopWidth: 1, borderTopColor: "#354232", paddingTop: 14, gap: 10 },
  agentConsoleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  agentConsoleTitle: { color: "#f5f2df", fontSize: 15, fontWeight: "900" },
  agentMeta: { color: "#9da994", fontSize: 10, marginTop: 3 },
  providerCard: { gap: 9, padding: 11, borderWidth: 1, borderColor: "#66562d", borderRadius: 10, backgroundColor: "#15150d" },
  providerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  providerTitle: { color: "#f6dda0", fontSize: 13, fontWeight: "900" },
  providerMeta: { color: "#a8ad98", fontSize: 10, lineHeight: 15 },
  providerDisclosure: { color: "#d4ceb3", fontSize: 11, lineHeight: 17 },
  consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 9, borderRadius: 8, borderWidth: 1, borderColor: "#4f4930", backgroundColor: "#0d110b" },
  consentMark: { color: "#d2ae59", fontSize: 16, lineHeight: 18 },
  consentText: { flex: 1, color: "#c8c5b2", fontSize: 10, lineHeight: 16 },
  secretInput: { minHeight: 44, borderWidth: 1, borderColor: "#806b35", borderRadius: 8, padding: 10, color: "#eef4df", backgroundColor: "#080b07", fontSize: 12 },
  fieldLabel: { color: "#a8bd7d", fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: 2 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choiceButton: { minHeight: 34, justifyContent: "center", borderRadius: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: "#4c6147", backgroundColor: "#101912" },
  choiceButtonActive: { borderColor: "#d2ae59", backgroundColor: "#31301b" },
  choiceText: { color: "#aeb9a4", fontSize: 11, fontWeight: "800" },
  choiceTextActive: { color: "#f6dda0" },
  transcript: { minHeight: 96, maxHeight: 320, padding: 10, gap: 8, borderWidth: 1, borderColor: "#354232", borderRadius: 10, backgroundColor: "#060b08" },
  humanMessage: { alignSelf: "flex-end", maxWidth: "88%", padding: 9, borderRadius: 10, backgroundColor: "#243222" },
  agentMessage: { alignSelf: "flex-start", maxWidth: "92%", padding: 9, borderRadius: 10, borderWidth: 1, borderColor: "#57664d", backgroundColor: "#111912" },
  messageAuthor: { color: "#d2ae59", fontSize: 9, fontWeight: "900", marginBottom: 4 },
  messageText: { color: "#e3ead8", fontSize: 12, lineHeight: 18 },
  emptyTranscript: { color: "#73806e", fontSize: 11, textAlign: "center", marginVertical: 28 },
  decisionCard: { gap: 5, borderLeftWidth: 3, borderLeftColor: "#6f9364", padding: 10, backgroundColor: "#101912" },
  decisionTitle: { color: "#e6efd8", fontSize: 12, fontWeight: "900" },
  decisionText: { color: "#c4d0ba", fontSize: 11, lineHeight: 17 },
  decisionRisk: { color: "#e5bd6a", fontSize: 11, lineHeight: 17 },
  alternativeText: { color: "#8e9c87", fontSize: 10, lineHeight: 15 },
  confirmCard: { gap: 7, borderWidth: 1, borderColor: "#d2ae59", borderRadius: 10, padding: 11, backgroundColor: "#282313" },
  confirmTitle: { color: "#f6dda0", fontSize: 12, fontWeight: "900" },
  confirmText: { color: "#d8ceb0", fontSize: 11 },
  input: { minHeight: 72, maxHeight: 150, borderWidth: 1, borderColor: "#52624a", borderRadius: 10, padding: 10, color: "#eef4df", backgroundColor: "#0b120d", textAlignVertical: "top", fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { minHeight: 38, justifyContent: "center", alignItems: "center", borderRadius: 8, paddingHorizontal: 14, backgroundColor: "#40563b", borderWidth: 1, borderColor: "#70805e" },
  dangerButton: { backgroundColor: "#4b2925", borderColor: "#8a5049" },
  actionButtonText: { color: "#f5f2df", fontSize: 11, fontWeight: "900" },
  disabled: { opacity: 0.42 },
  traceCard: { gap: 4, padding: 9, borderRadius: 8, backgroundColor: "#0d1410", borderWidth: 1, borderColor: "#2d3a2b" },
  traceTitle: { color: "#829b76", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  traceText: { color: "#92a08c", fontSize: 10, lineHeight: 15 },
  errorText: { color: "#ef9a8c", fontSize: 11, lineHeight: 17 },
});
