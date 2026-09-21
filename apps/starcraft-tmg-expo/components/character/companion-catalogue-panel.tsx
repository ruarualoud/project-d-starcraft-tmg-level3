import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { COMPANION_CATALOGUE_V1 } from "../../../../content/characters/companion-catalogue-v1.mjs";
import { RAYNOR_PORTRAIT_STATE_CONTRACT_V1 } from "../../../../content/characters/raynor-portrait-states-v1.mjs";
import { ARTANIS_PORTRAIT_STATE_CONTRACT_V1 } from "../../../../content/characters/artanis-portrait-states-v1.mjs";
import { NOVA_PORTRAIT_STATE_CONTRACT_V1 } from "../../../../content/characters/nova-portrait-states-v1.mjs";
import { ZAGARA_PORTRAIT_STATE_CONTRACT_V1 } from "../../../../content/characters/zagara-portrait-states-v1.mjs";
import { ZERATUL_PORTRAIT_STATE_CONTRACT_V1 } from "../../../../content/characters/zeratul-portrait-states-v1.mjs";
import {
  companionPortraitAssetSetV1,
  companionPortraitFrameAssetV1,
  resolveCompanionPortraitAssetSourceV1,
  type CompanionPortraitStateId,
} from "@/lib/level3/companion-portrait-assets-v1";
import { useReducedMotion } from "@/lib/level3/use-reduced-motion";

/**
 * Companion catalogue / parity surface — Ticket 26 / Slice 265 SS-4,
 * extended to the six-companion roster with REAL committed portrait
 * keyframes in Slice 266b SS-3.
 *
 * Fully registration/data-driven: it renders COMPANION_CATALOGUE_V1.entries
 * in order and resolves each entry's state contract and committed assets
 * from registries keyed by characterId. Adding a seventh companion is a
 * content + registry append; this control flow never changes.
 *
 * Portrait honesty rules (K3 guardrails §7/§11 and the 2026-09-21/22 visual
 * audits):
 *   - Real committed Image assets render aspect-preserved (contain inside a
 *     square frame; square crops for card avatars), never stretched.
 *   - Kerrigan's damaged_concerned state honestly shares her approved
 *     warning frame and says so; a missing asset renders a labelled
 *     unavailable fallback, never another character's frame.
 *   - The six states are admitted STATIC keyframes; they are never played as
 *     one continuous animation, and reduced motion always shows a single
 *     static frame.
 *
 * Nothing here is gameplay truth, persistence, or a Provider call. Canon
 * facts, Project D role configuration, and admitted generated assets are
 * labelled as three distinct classes.
 */

function slug(characterId: string) {
  return characterId.split(".")[1] || characterId;
}

const PORTRAIT_STATE_ORDER: CompanionPortraitStateId[] = [
  "idle", "speaking", "listening", "alert_combat", "damaged_concerned", "reflective",
];

/**
 * Kerrigan's six-state presentation descriptor. Her backend-sealed contract
 * cannot be bundled (node:crypto transitively); these entries mirror the
 * approved dynamic dialogue portrait phases and are bound to her receipted
 * committed frames via the asset registry. This is a presentation pointer,
 * not a copy of backend truth.
 */
const KERRIGAN_STATE_DESCRIPTOR = {
  states: [
    { stateId: "idle", frameRole: "neutral", phase: "idle", trigger: "no active utterance; default resting state", reducedMotion: "single neutral frame with static scanline overlay; no blink cycle", deterministicFallback: "server-approved neutral frame" },
    { stateId: "speaking", frameRole: "speaking", phase: "speaking", trigger: "companion message is being rendered", reducedMotion: "static speaking frame; no phoneme cycle", deterministicFallback: "server-approved speaking frame" },
    { stateId: "listening", frameRole: "blink", phase: "listening", trigger: "human is composing or a room event is streaming", reducedMotion: "static neutral frame; blink cycle disabled", deterministicFallback: "server-approved blink frame" },
    { stateId: "alert_combat", frameRole: "warning", phase: "waiting_confirmation", trigger: "pending human confirmation or a threat-overlay escalation is visible", reducedMotion: "static warning frame; no double flash", deterministicFallback: "server-approved warning frame" },
    { stateId: "damaged_concerned", frameRole: "warning", phase: "error", trigger: "own-side setback visible in the player-visible projection, or session error state", reducedMotion: "static frame; no sync-loss animation; honestly shares the approved warning frame", deterministicFallback: "shared approved warning frame (labelled)" },
    { stateId: "reflective", frameRole: "reflect", phase: "thinking", trigger: "reflect intent turn in progress", reducedMotion: "static reflect frame; no gaze pulse", deterministicFallback: "server-approved reflect frame" },
  ],
};

const STATE_CONTRACTS: Record<string, { states: any[] }> = {
  "starcraft.sarah_kerrigan": KERRIGAN_STATE_DESCRIPTOR,
  "starcraft.jim_raynor": RAYNOR_PORTRAIT_STATE_CONTRACT_V1,
  "starcraft.artanis": ARTANIS_PORTRAIT_STATE_CONTRACT_V1,
  "starcraft.nova_terra": NOVA_PORTRAIT_STATE_CONTRACT_V1,
  "starcraft.zagara": ZAGARA_PORTRAIT_STATE_CONTRACT_V1,
  "starcraft.zeratul": ZERATUL_PORTRAIT_STATE_CONTRACT_V1,
};

/**
 * Capability honesty surface. The generic companion backend module
 * (`packages/companion-backend-module-v1`, headless-verified in Slice 266)
 * supports the first group; Slice 266c connected the group chat to the
 * PRODUCT through the companion product module, and Slice 266d completed the
 * remaining Tavern-equivalent contracts (worldbook triggers, branches,
 * import/export/restore, audit/replay, author's note, user persona, and the
 * explicit permission surfaces — all real-browser verified). Everything still
 * pending is rendered pending — never presented as supported.
 */
const CAPABILITY_ROWS = [
  { code: "WORLDBOOK_DYNAMIC_TRIGGER_CONTRACT", capability: "worldbook keyword/regex triggers (4 scope tiers, bounded recursion)", capabilityZh: "世界书关键字/正则动态触发(四层级、有界递归)", genericBackend: "supported", productBinding: "connected" },
  { code: "COMPANION_MEMORY_LAYERS_PROJECTION", capability: "layered long-term memory + editable rollback-safe summaries", capabilityZh: "分层长期记忆与可编辑可回滚摘要", genericBackend: "supported", productBinding: "connected" },
  { code: "COMPANION_RELATIONSHIP_STATE_PROJECTION", capability: "observed relationship state", capabilityZh: "观测型关系状态", genericBackend: "supported", productBinding: "connected" },
  { code: "MULTI_COMPANION_SIMULTANEOUS_SESSION", capability: "multi-speaker turn ownership", capabilityZh: "多说话者回合归属", genericBackend: "supported", productBinding: "connected" },
  { code: "COMPANION_SWIPE_BRANCH_CONTRACT", capability: "swipe/reroll/edit-as-branch with lineage", capabilityZh: "重roll/编辑分支(保留谱系)", genericBackend: "supported", productBinding: "connected" },
  { code: "COMPANION_LONG_SESSION_RESUME_CONTRACT", capability: "checkpoint / resume / process-restart resume", capabilityZh: "检查点/恢复/进程重启恢复", genericBackend: "supported", productBinding: "connected" },
  { code: "COMPANION_IMPORT_EXPORT_RESTORE_CONTRACT", capability: "schema-validated integrity-hashed import / export / restore", capabilityZh: "模式校验+完整性哈希的导入/导出/恢复", genericBackend: "supported", productBinding: "connected" },
  { code: "COMPANION_AUDIT_REPLAY_SURFACE", capability: "deterministic audit / replay candidate", capabilityZh: "确定性审计/回放候选", genericBackend: "supported", productBinding: "connected" },
  { code: "COMPANION_EXTERNAL_PROVIDER_PORT", capability: "external Provider ports", capabilityZh: "外部 Provider 端口", genericBackend: "supported", productBinding: "connected" },
  { code: "COMPANION_AUTHORS_NOTE_CONTRACT", capability: "author's-note depth/frequency injection (product-side)", capabilityZh: "作者注释深度/频率注入(产品侧)", genericBackend: "absent", productBinding: "connected" },
  { code: "USER_PERSONA_CONTRACT", capability: "versioned seat-bound user persona (product-side)", capabilityZh: "版本化席位绑定用户人设(产品侧)", genericBackend: "absent", productBinding: "connected" },
  { code: "AGENT_VS_AGENT_COMPANION_POLICY_SURFACE", capability: "explicit human/agent/observer/review permission surfaces (live policy)", capabilityZh: "显式人类/Agent/观察者/复盘权限面(实时策略)", genericBackend: "absent", productBinding: "connected" },
  { code: "COMPANION_PACK_BACKEND_PROMOTION", capability: "backend sealing + hash pins for the five presentation packs", capabilityZh: "五个纯呈现包的后端封存与哈希钉", genericBackend: "absent", productBinding: "pending" },
  { code: "COMPANION_PORTRAIT_CONTINUOUS_ANIMATION", capability: "continuous portrait animation (six static keyframes admitted; loop not proven)", capabilityZh: "连续头像动画(六张静态关键帧已准入;循环未验证)", genericBackend: "absent", productBinding: "pending" },
];

const PARITY_SUMMARY = [
  { status: "supported", zh: "产品内已支持", items: ["六同伴呈现名册(真实准入关键帧,哈希钉选)", "凯瑞甘动态头像合同(后端绑定)", "席位权限姿态", "BYOK 安全 Provider", "同伴群聊:多说话者回合/@提及/持久转写(Slice 266c)", "分层记忆/关系投影(Slice 266c)", "检查点/恢复(Slice 266c)", "注入式外部 Provider 端口(Slice 266c)", "世界书四层级触发+有界递归(Slice 266d)", "用户人设(版本化,席位绑定)(Slice 266d)", "摘要编辑/回滚+情景记忆+关系事件(Slice 266d)", "重roll/编辑分支谱系(Slice 266d)", "作者注释深度/频率注入(Slice 266d)", "导入/导出/恢复(完整性哈希,无凭据)(Slice 266d)", "审计导出/校验/回放候选(Slice 266d)", "四类权限面(实时策略判定)(Slice 266d)", "持久化重启恢复(加密 SQLite/PostgreSQL 端口)(Slice 266d)"], itemsEn: ["six-companion presentation roster (real admitted keyframes, hash-pinned)", "Kerrigan dynamic portrait contract (backend-bound)", "seat permission posture", "secure BYOK Provider", "companion group chat: multi-speaker turns/@mentions/persisted transcript (Slice 266c)", "layered memory/relationship projection (Slice 266c)", "checkpoint/resume (Slice 266c)", "injected external Provider port (Slice 266c)", "four-tier worldbook triggers with bounded recursion (Slice 266d)", "versioned seat-bound user persona (Slice 266d)", "summary edit/rollback + episodic memory + relationship events (Slice 266d)", "swipe/reroll/edit-as-branch lineage (Slice 266d)", "author's note depth/frequency injection (Slice 266d)", "import/export/restore (integrity-hashed, no credentials) (Slice 266d)", "audit export/verify/replay candidate (Slice 266d)", "four live permission surfaces (Slice 266d)", "durable process-restart resume (encrypted SQLite/PostgreSQL port) (Slice 266d)"] },
  { status: "missing", zh: "仍缺失", items: ["五包后端封存(仍为呈现包,产品侧诚实注册)", "连续头像动画(未验证)"], itemsEn: ["backend sealing of the five presentation packs (they stay presentation packs, honestly registered product-side)", "continuous portrait animation (not proven)"] },
];

function provenanceLabel(provenanceClass: string, zh: boolean) {
  if (provenanceClass === "platform_framing") return zh ? "Project D 角色配置" : "Project D role configuration";
  if (provenanceClass === "official_game_rules") return zh ? "官方规则" : "official rules";
  return zh ? "canon 事实(官方一手摘要)" : "canon fact (official primary summary)";
}

function packStatusLabel(entry: any, zh: boolean) {
  if (entry.packStatus === "live_backend_reference") {
    return zh ? "后端参考包 · 默认同伴(凯瑞甘)" : "backend reference pack · default companion (Kerrigan)";
  }
  return zh ? "纯呈现包 · 头像关键帧已准入" : "presentation-only · admitted keyframes committed";
}

export function CompanionCataloguePanel({ zh }: { zh: boolean }) {
  const reducedMotion = useReducedMotion();
  const defaultEntry = COMPANION_CATALOGUE_V1.entries.find((entry: any) => entry.defaultCompanion)
    || COMPANION_CATALOGUE_V1.entries[0];
  const [selectedCharacterId, setSelectedCharacterId] = useState(defaultEntry.characterId);
  const [selectedStateId, setSelectedStateId] = useState<CompanionPortraitStateId>("idle");
  const [speakerId, setSpeakerId] = useState(defaultEntry.characterId);
  const [mentionId, setMentionId] = useState(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const selectedEntry = COMPANION_CATALOGUE_V1.entries.find(
    (entry: any) => entry.characterId === selectedCharacterId,
  );
  const pack = selectedEntry?.pack || null;
  const stateContract = STATE_CONTRACTS[selectedCharacterId] || null;
  const assetSet = companionPortraitAssetSetV1(selectedCharacterId);
  const selectedState = stateContract?.states.find((state: any) => state.stateId === selectedStateId) || null;
  const selectedFrameAsset = companionPortraitFrameAssetV1(selectedCharacterId, selectedStateId);

  function markImageFailed(key: string) {
    setFailedImages((current) => (current.includes(key) ? current : [...current, key]));
  }

  function renderPortraitImage(
    characterId: string,
    stateId: CompanionPortraitStateId,
    size: number,
    testID: string,
    resizeMode: "cover" | "contain",
    borderColor: string,
  ) {
    const imageKey = `${characterId}/${stateId}`;
    const source = failedImages.includes(imageKey)
      ? null
      : resolveCompanionPortraitAssetSourceV1(characterId, stateId);
    const frameAsset = companionPortraitFrameAssetV1(characterId, stateId);
    const entry = COMPANION_CATALOGUE_V1.entries.find((e: any) => e.characterId === characterId);
    if (!source) {
      return (
        <View
          accessibilityLabel={zh ? "头像资产不可用(如实标注)" : "portrait asset unavailable (labelled honestly)"}
          accessibilityRole="image"
          style={[styles.portraitBox, { width: size, height: size, borderColor }]}
          testID={testID}
        >
          <Text style={[styles.stateGlyph, { color: borderColor }]}>◈</Text>
          <Text style={styles.stateFallbackText}>
            {zh ? "头像不可用 · 绝不顶替其他角色" : "portrait unavailable · never substituted"}
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.portraitBox, { width: size, height: size, borderColor }]} testID={testID}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={`${entry?.displayName || characterId} · ${stateId}`}
          onError={() => markImageFailed(imageKey)}
          resizeMode={resizeMode}
          source={source}
          style={styles.portraitImage}
          testID={`${testID}-img`}
        />
        <View pointerEvents="none" style={styles.scanlines} />
        {frameAsset?.availability === "shared_approved_frame" && (
          <View pointerEvents="none" style={styles.sharedBadge}>
            <Text style={styles.sharedBadgeText}>
              {zh ? "共享警戒帧" : "shared frame"}
            </Text>
          </View>
        )}
      </View>
    );
  }

  function renderEntryCard(entry: any) {
    const active = entry.characterId === selectedCharacterId;
    const entrySlug = slug(entry.characterId);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        key={entry.characterId}
        onPress={() => {
          setSelectedCharacterId(entry.characterId);
          setSelectedStateId("idle");
        }}
        style={[styles.entryCard, { borderColor: entry.factionColor }, active && styles.entryCardActive]}
        testID={`companion-catalogue-entry-${entrySlug}`}
      >
        {renderPortraitImage(
          entry.characterId, "idle", 56,
          `companion-card-portrait-${entrySlug}`, "cover", entry.factionColor,
        )}
        <View style={styles.entryCopy}>
          <Text style={styles.entryName}>
            {zh ? entry.displayNameZh : entry.displayName}
            {entry.defaultCompanion ? (zh ? " · 默认" : " · default") : ""}
          </Text>
          <Text style={styles.entryMeta}>
            {entry.factionAlignment.toUpperCase()} · {zh ? entry.roleLabelZh : entry.roleLabel}
            {" · "}{entry.eraCount}{zh ? " 时代" : " eras"}
          </Text>
          <Text style={styles.entryStatus}>{packStatusLabel(entry, zh)}</Text>
        </View>
      </Pressable>
    );
  }

  function renderPackDetail() {
    if (!selectedEntry) return null;
    if (!pack) {
      return (
        <View style={styles.detail} testID="companion-pack-detail">
          <Text style={styles.detailTitle}>{zh ? selectedEntry.displayNameZh : selectedEntry.displayName}</Text>
          <Text style={styles.hint}>
            {zh
              ? "凯瑞甘为既有后端参考包与默认同伴:身份、八时代与世界书真相由服务端投影驱动,见上方「同伴与世界书」与设置页;此处不复制后端数据。"
              : "Kerrigan is the existing backend-bound reference pack and default companion: identity, eight eras and world books are driven by the server projection (see Companion & world book above and Settings); nothing is duplicated here."}
          </Text>
          <Text style={styles.meta}>{selectedEntry.referencePointer?.packageFile}</Text>
          <Text style={styles.meta}>{selectedEntry.referencePointer?.worldbookCatalogFile}</Text>
          <Text style={styles.hint}>
            {zh
              ? "头像使用已批准的动态头像合同帧(收据绑定);damaged_concerned 如实共享警戒帧。"
              : "Her portrait binds the approved dynamic portrait contract frames (receipt-bound); damaged_concerned honestly shares the approved warning frame."}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.detail} testID="companion-pack-detail">
        <Text style={styles.detailTitle}>
          {zh ? pack.identity.displayNameZh : pack.identity.displayName}
          <Text style={styles.detailTitleEn}> · {pack.identity.displayName}</Text>
        </Text>
        <Text style={styles.tagline}>{zh ? pack.identity.taglineZh : pack.identity.tagline}</Text>
        <Text style={styles.meta}>
          characterId: {pack.characterId} · packHash: {pack.packHash.slice(0, 16)}…
        </Text>

        <Text style={styles.fieldLabel}>{zh ? "传记(canon 事实 vs 角色配置)" : "Biography (canon facts vs role configuration)"}</Text>
        <Text style={styles.hint}>{zh ? pack.biography.summaryZh : pack.biography.summary}</Text>
        {pack.biography.facts.map((f: any) => (
          <View key={f.factId} style={styles.factRow}>
            <Text style={styles.factText}>{f.summary}</Text>
            <Text style={[styles.provenance, f.provenanceClass === "platform_framing" && styles.provenancePlatform]}>
              {provenanceLabel(f.provenanceClass, zh)}{f.sourceRefs.length ? ` · ${f.sourceRefs.join(", ")}` : ""}
            </Text>
          </View>
        ))}

        <Text style={styles.fieldLabel}>{zh ? "时代与知识/剧透边界" : "Eras and knowledge/spoiler boundaries"}</Text>
        {pack.eras.map((era: any) => {
          const locked = era.spoilerRank > pack.knowledgeBoundaries.spoilerCeilingDefaultRank;
          return (
            <View key={era.personaState} style={styles.eraRow}>
              <Text style={styles.eraTitle}>
                {era.defaultSelected ? "★ " : ""}{zh ? era.titleZh : era.title}
                {locked ? (zh ? " · 锁定(超默认上限)" : " · locked (above default ceiling)") : ""}
              </Text>
              <Text style={styles.meta}>
                {era.timeline.start} → {era.timeline.end}
                {" · "}knowledge {era.knowledgeRank} / spoiler {era.spoilerRank}
              </Text>
            </View>
          );
        })}
        <Text style={styles.hint}>
          {zh
            ? `默认剧透上限 rank ${pack.knowledgeBoundaries.spoilerCeilingDefaultRank};跨时代合并禁止:${pack.knowledgeBoundaries.crossEraMerge}。`
            : `Default spoiler ceiling rank ${pack.knowledgeBoundaries.spoilerCeilingDefaultRank}; cross-era merge: ${pack.knowledgeBoundaries.crossEraMerge}.`}
        </Text>

        <Text style={styles.fieldLabel}>{zh ? "关系(canon 摘要)" : "Relationships (canon summary)"}</Text>
        {pack.relationships.map((edge: any) => (
          <Text key={`${edge.subject}-${edge.object}`} style={styles.relationRow}>
            {edge.subject} → {edge.object}: <Text style={styles.relationValue}>{edge.relation}</Text>
          </Text>
        ))}

        <Text style={styles.fieldLabel}>{zh ? "世界书条目(always 激活)" : "World-book entries (always-on)"}</Text>
        {pack.worldbookEntries.map((entry: any) => (
          <View key={entry.entryId} style={styles.wbRow}>
            <Text style={styles.eraTitle}>{zh ? entry.titleZh : entry.title}</Text>
            <Text style={styles.factText}>{entry.content}</Text>
            <Text style={[styles.provenance, entry.canonStatus === "platform_framing" && styles.provenancePlatform]}>
              {provenanceLabel(entry.canonStatus, zh)}{entry.sourceRefs.length ? ` · ${entry.sourceRefs.join(", ")}` : ""}
            </Text>
          </View>
        ))}

        <Text style={styles.fieldLabel}>{zh ? "战术身份(Project D 配置)" : "Tactical identity (Project D configuration)"}</Text>
        <Text style={styles.hint}>
          {zh
            ? `TMG 阵营对齐:${pack.tacticalIdentity.tmgAlignment};官方阵营标签状态:${pack.tacticalIdentity.factionTagStatus}。规则权威恒为外部规则服务。`
            : `TMG alignment: ${pack.tacticalIdentity.tmgAlignment}; official faction tag: ${pack.tacticalIdentity.factionTagStatus}. Rules authority is always the external Rules service.`}
        </Text>
        {pack.tacticalIdentity.doctrineHints.map((hint: any) => (
          <Text key={hint} style={styles.meta}>· {hint}</Text>
        ))}

        <Text style={styles.fieldLabel}>{zh ? "视觉资产状态" : "Visual asset status"}</Text>
        <Text style={styles.hint} testID={`companion-pack-assets-${slug(pack.characterId)}`}>
          {zh
            ? `六张静态关键帧已准入并落盘(审计 ${pack.visualAssets.auditRef});每张经 96px 接触表复核。连续动画未验证:六状态绝不作为连续序列播放。后端封存/哈希钉仍待 Codex。`
            : `Six static keyframes are admitted and committed (audit ${pack.visualAssets.auditRef}); each passed a real 96px contact-sheet review. Continuous animation is NOT proven: the six states are never played as one continuous sequence. Backend sealing/hash pins remain Codex-owned.`}
        </Text>
      </View>
    );
  }

  function renderPortraitStates() {
    if (!stateContract || !selectedEntry) {
      return (
        <View style={styles.statesBoard} testID="companion-portrait-states-board">
          <Text style={styles.hint}>
            {zh ? "该条目无呈现状态合同。" : "No presentation state contract for this entry."}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.statesBoard} testID="companion-portrait-states-board">
        <View style={styles.choiceRow}>
          {stateContract.states.map((state: any) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: state.stateId === selectedStateId }}
              key={state.stateId}
              onPress={() => setSelectedStateId(state.stateId)}
              style={[styles.choiceButton, state.stateId === selectedStateId && styles.choiceButtonActive]}
              testID={`companion-portrait-state-${state.stateId}`}
            >
              <Text style={styles.choiceText}>{state.stateId}</Text>
            </Pressable>
          ))}
        </View>
        {selectedState && (
          <View style={styles.statePreview} testID="companion-portrait-state-preview">
            {renderPortraitImage(
              selectedCharacterId, selectedStateId, 128,
              "companion-portrait-preview", "contain", selectedEntry.factionColor,
            )}
            <View style={styles.stateCopy}>
              <Text style={styles.eraTitle}>{selectedState.stateId}</Text>
              <Text style={styles.meta}>
                frameRole: {selectedState.frameRole} · phase: {selectedState.phase}
              </Text>
              <Text style={styles.meta}>
                {zh ? "触发" : "trigger"}: {selectedState.trigger}
              </Text>
              <Text style={styles.meta}>
                {zh ? "减少动态" : "reduced motion"}: {reducedMotion
                  ? (zh ? "已启用 · 单静态帧 · " : "on · single static frame · ")
                  : (zh ? "未启用 · 静态关键帧 · " : "off · static keyframe · ")}
                {selectedState.reducedMotion}
              </Text>
              {selectedFrameAsset && (
                <Text style={styles.meta} testID="companion-portrait-asset-meta">
                  asset: {selectedFrameAsset.assetPath}
                  {"\n"}sha256: {selectedFrameAsset.contentHash.slice(0, 12)}… ·{" "}
                  {selectedFrameAsset.availability === "shared_approved_frame"
                    ? (zh
                      ? `如实共享已批准帧(与 ${selectedFrameAsset.sharedWithStateId} 相同)`
                      : `honestly shares the approved ${selectedFrameAsset.sharedWithStateId} frame`)
                    : (zh ? "准入静态关键帧(审计)" : "admitted static keyframe (audit)")}
                </Text>
              )}
              <Text style={styles.meta}>
                {zh
                  ? "呈现状态:静态关键帧;连续动画未验证,绝不当连续序列播放。"
                  : "presentation: static keyframe; continuous animation not proven, never played as a sequence."}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  function renderMultiCompanionPrototype() {
    return (
      <View style={styles.prototype} testID="companion-multi-speaker-prototype">
        <Text style={styles.prototypeTitle}>
          {zh ? "多同伴同会话 · 呈现原型(实时绑定见「同伴群聊」)" : "Multi-companion conversation · presentation prototype (live binding in Companion group chat)"}
        </Text>
        <View style={styles.choiceRow}>
          {COMPANION_CATALOGUE_V1.entries.map((entry: any, index: number) => {
            const activeSpeaker = speakerId === entry.characterId;
            const mentioned = mentionId === entry.characterId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: activeSpeaker }}
                key={entry.characterId}
                onPress={() => setSpeakerId(entry.characterId)}
                onLongPress={() => setMentionId(mentioned ? null : entry.characterId)}
                style={[styles.choiceButton, { borderColor: entry.factionColor }, activeSpeaker && styles.choiceButtonActive]}
                testID={`companion-speaker-${slug(entry.characterId)}`}
              >
                <Text style={styles.choiceText}>
                  {index + 1}. {zh ? entry.displayNameZh : entry.displayName}
                  {mentioned ? " @" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>
          {zh
            ? "显式说话者身份与回合顺序:点按选择发言者,长按切换 @提及。权限标签:真人席位同伴只读玩家可见状态;对手私有状态永不在此呈现;推测必须标注为推测。"
            : "Explicit speaker identity and turn order: tap to choose the speaker, long-press to toggle an @mention. Permission labels: a human-seat companion reads only player-visible state; opponent-private state never renders here; inference must be labelled inference."}
        </Text>
        <View style={styles.prototypeComposer}>
          <Text style={styles.prototypeComposerText}>
            {zh
              ? "输入框如实禁用:当前发言者 "
              : "Composer honestly disabled: current speaker "}
            {COMPANION_CATALOGUE_V1.entries.find((e: any) => e.characterId === speakerId)?.displayName || "—"}
          </Text>
        </View>
        <View style={styles.gapCard}>
          <Text style={styles.gapCode}>
            MULTI_COMPANION_SIMULTANEOUS_SESSION
            {zh
              ? ":已于 Slice 266c 通过同伴产品模块接通——上方「同伴群聊」是服务端绑定的实时多同伴会话(确定性发言顺序、@提及、持久转写)。本原型保留为非伪造说明器:它不伪造消息、不持久化、不调用 Provider。"
              : ": connected in Slice 266c through the companion product module — Companion group chat above is the live server-bound multi-companion conversation (deterministic speaker order, @mentions, persisted transcript). This prototype stays a non-fabricating explainer: it fabricates no messages, persists nothing, and calls no Provider."}
          </Text>
        </View>
      </View>
    );
  }

  function renderParitySurface() {
    return (
      <View style={styles.parity} testID="companion-parity-gap-surface">
        <Text style={styles.prototypeTitle}>
          {zh ? "SillyTavern 对等 / 能力状态(产品内摘要)" : "SillyTavern parity / capability status (in-product summary)"}
        </Text>
        {PARITY_SUMMARY.map((row) => (
          <Text key={row.status} style={styles.parityRow}>
            {zh ? row.zh : row.status}: {(zh ? row.items : row.itemsEn).join(zh ? "、" : ", ")}
          </Text>
        ))}
        {CAPABILITY_ROWS.map((row) => (
          <Text key={row.code} style={styles.gapLine} testID={`companion-gap-${row.code}`}>
            {row.code} — {zh ? row.capabilityZh : row.capability}
            {" · "}{zh ? "通用模块" : "generic module"}: {row.genericBackend === "supported"
              ? (zh ? "已支持(无头验证)" : "supported (headless-verified)")
              : (zh ? "不存在" : "absent")}
            {" · "}{zh ? "产品绑定" : "product binding"}: {row.productBinding === "connected"
              ? (zh ? "已接通(Slice 266c/266d)" : "connected (Slice 266c/266d)")
              : (zh ? "待 Codex(未接通)" : "pending Codex (not connected)")}
          </Text>
        ))}
        <Text style={styles.hint}>
          {zh
            ? "完整矩阵:docs/ticket-26-slice-265-k3-sillytavern-parity-matrix-and-plan-v1-2026-09-21.md;通用后端模块证据:packages/companion-backend-module-v1(Slice 266 无头验证);产品接通证据:Slice 266c/266d 同伴产品模块(真实浏览器验证)。仍待接通的能力一律如实显示待办,绝不伪装为已支持。"
            : "Full matrix: docs/ticket-26-slice-265-k3-sillytavern-parity-matrix-and-plan-v1-2026-09-21.md; generic backend module evidence: packages/companion-backend-module-v1 (Slice 266 headless verification); product binding evidence: the Slice 266c/266d companion product module (real-browser verified). Everything still unconnected renders pending here and is never presented as supported."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.panel} testID="companion-catalogue-panel">
      <Text style={styles.panelTitle}>
        {zh ? "同伴目录" : "Companion catalogue"}
        <Text style={styles.meta}> · catalogueHash {COMPANION_CATALOGUE_V1.catalogueHash.slice(0, 12)}…</Text>
      </Text>
      <Text style={styles.hint}>
        {zh
          ? `六位同伴:${COMPANION_CATALOGUE_V1.entries.map((e: any) => e.displayName).join(" · ")}。名册为注册驱动——新增第七位同伴只需追加内容条目与注册记录,界面流程不变。`
          : `Six companions: ${COMPANION_CATALOGUE_V1.entries.map((e: any) => e.displayName).join(" · ")}. The roster is registration-driven — a seventh companion is a content + registry append; the UI flow never changes.`}
      </Text>
      <View style={styles.entryList}>{COMPANION_CATALOGUE_V1.entries.map(renderEntryCard)}</View>
      {renderPackDetail()}
      <Text style={styles.fieldLabel}>{zh ? "通讯头像六状态预览(真实准入关键帧)" : "Communication portrait · six-state preview (real admitted keyframes)"}</Text>
      {renderPortraitStates()}
      {renderMultiCompanionPrototype()}
      {renderParitySurface()}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 10 },
  panelTitle: { color: "#f5f2df", fontSize: 13, fontWeight: "900" },
  entryList: { gap: 7 },
  entryCard: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 64, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#0d1410" },
  entryCardActive: { backgroundColor: "#17211a" },
  entryCopy: { flex: 1, minWidth: 0 },
  entryName: { color: "#eef4df", fontSize: 12, fontWeight: "900" },
  entryMeta: { color: "#9da994", fontSize: 10, marginTop: 2 },
  entryStatus: { color: "#d2ae59", fontSize: 9, marginTop: 2 },
  detail: { gap: 7, borderRadius: 9, borderWidth: 1, borderColor: "#354232", backgroundColor: "#0a120c", padding: 10 },
  detailTitle: { color: "#f5f2df", fontSize: 14, fontWeight: "900" },
  detailTitleEn: { color: "#9da994", fontSize: 11, fontWeight: "700" },
  tagline: { color: "#d5e2c5", fontSize: 11, lineHeight: 17 },
  fieldLabel: { color: "#a8bd7d", fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: 4 },
  hint: { color: "#aeb9a4", fontSize: 11, lineHeight: 17 },
  meta: { color: "#92a08c", fontSize: 10, lineHeight: 15, fontFamily: "monospace" },
  factRow: { gap: 2, borderLeftWidth: 2, borderLeftColor: "#4c6147", paddingLeft: 8 },
  factText: { color: "#c4d0ba", fontSize: 11, lineHeight: 16 },
  provenance: { color: "#7f946a", fontSize: 9, fontFamily: "monospace" },
  provenancePlatform: { color: "#d2ae59" },
  eraRow: { gap: 2 },
  eraTitle: { color: "#e2e8f0", fontSize: 11, fontWeight: "800" },
  relationRow: { color: "#aeb9a4", fontSize: 11, lineHeight: 16 },
  relationValue: { color: "#d5e2c5", fontWeight: "800" },
  wbRow: { gap: 3, borderRadius: 7, borderWidth: 1, borderColor: "#354232", padding: 8, backgroundColor: "#0d1410" },
  statesBoard: { gap: 8 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choiceButton: { minHeight: 34, justifyContent: "center", borderRadius: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: "#4c6147", backgroundColor: "#101912" },
  choiceButtonActive: { backgroundColor: "#31301b" },
  choiceText: { color: "#aeb9a4", fontSize: 11, fontWeight: "800" },
  statePreview: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  portraitBox: { maxWidth: "100%", borderWidth: 1, borderRadius: 8, backgroundColor: "#071009", overflow: "hidden", alignItems: "center", justifyContent: "center", position: "relative" },
  portraitImage: { width: "100%", height: "100%" },
  scanlines: { ...StyleSheet.absoluteFillObject, opacity: 0.14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#dcebc9" },
  sharedBadge: { position: "absolute", bottom: 3, right: 3, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: "#282313", borderWidth: 1, borderColor: "#d2ae59" },
  sharedBadgeText: { color: "#f6dda0", fontSize: 8, fontWeight: "900" },
  stateGlyph: { fontSize: 28 },
  stateFallbackText: { color: "#aeb9a4", fontSize: 9, textAlign: "center", lineHeight: 13, paddingHorizontal: 6 },
  stateCopy: { flex: 1, flexBasis: 180, minWidth: 0, gap: 3 },
  prototype: { gap: 8, borderRadius: 10, borderWidth: 1, borderColor: "#2d839d", backgroundColor: "#08202d", padding: 10 },
  prototypeTitle: { color: "#a5f3fc", fontSize: 12, fontWeight: "900" },
  prototypeComposer: { minHeight: 44, justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: "#354232", backgroundColor: "#060b08", paddingHorizontal: 10 },
  prototypeComposerText: { color: "#73806e", fontSize: 11 },
  gapCard: { borderRadius: 8, padding: 9, borderWidth: 1, borderColor: "#66562d", backgroundColor: "#15150d" },
  gapCode: { color: "#d4ceb3", fontSize: 10, lineHeight: 16, fontFamily: "monospace" },
  parity: { gap: 6, borderRadius: 10, borderWidth: 1, borderColor: "#354232", backgroundColor: "#0a120c", padding: 10 },
  parityRow: { color: "#c4d0ba", fontSize: 10, lineHeight: 16 },
  gapLine: { color: "#d4ceb3", fontSize: 9, lineHeight: 15, fontFamily: "monospace" },
});
