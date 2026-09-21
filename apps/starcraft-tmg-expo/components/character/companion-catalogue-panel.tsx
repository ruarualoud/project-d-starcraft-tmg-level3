import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COMPANION_CATALOGUE_V1 } from "../../../../content/characters/companion-catalogue-v1.mjs";
import { RAYNOR_PORTRAIT_STATE_CONTRACT_V1 } from "../../../../content/characters/raynor-portrait-states-v1.mjs";
import { ARTANIS_PORTRAIT_STATE_CONTRACT_V1 } from "../../../../content/characters/artanis-portrait-states-v1.mjs";
import { useReducedMotion } from "@/lib/level3/use-reduced-motion";

/**
 * Companion catalogue / parity surface — Ticket 26 / Slice 265 SS-4.
 *
 * Renders the presentation-only catalogue (Kerrigan reference + Raynor and
 * Artanis packs), each pack's identity / world-book / era / relationship
 * views, the six-state portrait preview board (deterministic fallback while
 * Codex generation is pending), the honest multi-companion conversation
 * prototype (visibly blocked by MULTI_COMPANION_SIMULTANEOUS_SESSION), and
 * the in-product SillyTavern parity / gap summary.
 *
 * Nothing here is gameplay truth, persistence, or a Provider call. Canon
 * facts, Project D role configuration, and pending generated assets are
 * labelled as three distinct classes.
 */

const STATE_CONTRACTS: Record<string, any> = {
  "starcraft.jim_raynor": RAYNOR_PORTRAIT_STATE_CONTRACT_V1,
  "starcraft.artanis": ARTANIS_PORTRAIT_STATE_CONTRACT_V1,
};

const GAPS = [
  { code: "MULTI_COMPANION_SIMULTANEOUS_SESSION", zh: "同会话多同伴同时发言合同未暴露", en: "no simultaneous multi-speaker session contract" },
  { code: "COMPANION_RELATIONSHIP_STATE_PROJECTION", zh: "同伴关系状态投影未暴露", en: "no relationship-state projection" },
  { code: "COMPANION_MEMORY_LAYERS_PROJECTION", zh: "分层长期记忆投影未暴露", en: "no layered long-term memory projection" },
  { code: "COMPANION_IMPORT_EXPORT_RESTORE_CONTRACT", zh: "导入/导出/恢复合同未暴露", en: "no import/export/restore contract" },
  { code: "COMPANION_LONG_SESSION_RESUME_CONTRACT", zh: "长会话恢复合同未暴露", en: "no long-session resume contract" },
  { code: "COMPANION_SUMMARY_PROJECTION", zh: "对话摘要投影未暴露", en: "no summary projection" },
  { code: "COMPANION_SWIPE_BRANCH_CONTRACT", zh: "重roll/分支合同未暴露", en: "no swipe/branch contract" },
  { code: "COMPANION_AUTHORS_NOTE_CONTRACT", zh: "作者注释注入合同未暴露", en: "no author's-note contract" },
  { code: "WORLDBOOK_DYNAMIC_TRIGGER_CONTRACT", zh: "世界书关键字动态触发合同未暴露", en: "no keyword-triggered world-book injection contract" },
  { code: "USER_PERSONA_CONTRACT", zh: "用户人设合同未暴露", en: "no user-persona contract" },
  { code: "AGENT_VS_AGENT_COMPANION_POLICY_SURFACE", zh: "Agent 对 Agent 同伴策略面未投影", en: "no agent-vs-agent companion policy surface" },
  { code: "COMPANION_PACK_BACKEND_PROMOTION", zh: "新包后端封存与哈希钉待 Codex", en: "new packs await backend sealing and hash pins" },
  { code: "COMPANION_PACK_ASSET_GENERATION", zh: "新包头像帧待 Codex 图像工具生成", en: "new pack portrait frames await Codex image generation" },
];

const PARITY_SUMMARY = [
  { status: "supported", zh: "支持", items: ["动态头像合同(Kerrigan 已有资产)", "席位权限姿态", "BYOK 安全 Provider"] },
  { status: "partial", zh: "部分", items: ["角色卡/时代世界书", "Prompt 组装(安全收窄)", "连接配置(BYOK)", "快捷意图"] },
  { status: "missing", zh: "缺失", items: ["群聊多同伴", "向量/摘要记忆", "Swipe/分支", "导入导出恢复", "用户人设", "作者注释"] },
];

function provenanceLabel(provenanceClass: string, zh: boolean) {
  if (provenanceClass === "platform_framing") return zh ? "Project D 角色配置" : "Project D role configuration";
  if (provenanceClass === "official_game_rules") return zh ? "官方规则" : "official rules";
  return zh ? "canon 事实(官方一手摘要)" : "canon fact (official primary summary)";
}

export function CompanionCataloguePanel({ zh }: { zh: boolean }) {
  const reducedMotion = useReducedMotion();
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    COMPANION_CATALOGUE_V1.entries[1].characterId,
  );
  const [selectedStateId, setSelectedStateId] = useState("idle");
  const [speakerId, setSpeakerId] = useState(COMPANION_CATALOGUE_V1.entries[1].characterId);
  const [mentionId, setMentionId] = useState(null);
  const selectedEntry = COMPANION_CATALOGUE_V1.entries.find(
    (entry: any) => entry.characterId === selectedCharacterId,
  );
  const pack = selectedEntry?.pack || null;
  const stateContract = STATE_CONTRACTS[selectedCharacterId] || null;
  const selectedState = stateContract?.states.find((state: any) => state.stateId === selectedStateId) || null;

  function renderEntryCard(entry: any) {
    const active = entry.characterId === selectedCharacterId;
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
        testID={`companion-catalogue-entry-${entry.factionAlignment}`}
      >
        <View style={[styles.entryEmblem, { borderColor: entry.factionColor }]}>
          <Text style={[styles.entryEmblemText, { color: entry.factionColor }]}>◆</Text>
        </View>
        <View style={styles.entryCopy}>
          <Text style={styles.entryName}>
            {zh ? entry.displayNameZh : entry.displayName}
          </Text>
          <Text style={styles.entryMeta}>
            {entry.factionAlignment.toUpperCase()} · {zh ? entry.roleLabelZh : entry.roleLabel}
            {" · "}{entry.eraCount}{zh ? " 时代" : " eras"}
          </Text>
          <Text style={styles.entryStatus}>
            {entry.packStatus === "live_backend_reference"
              ? (zh ? "后端参考包(凯瑞甘)" : "backend reference pack (Kerrigan)")
              : (zh ? "纯呈现包 · 头像待生成" : "presentation-only · portraits pending")}
          </Text>
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
              ? "凯瑞甘为既有后端参考包:身份、时代与世界书真相由服务端投影驱动,见上方「同伴与世界书」与设置页;此处不复制后端数据。"
              : "Kerrigan is the existing backend-bound reference pack: identity, eras and world books are driven by the server projection (see Companion & world book above and Settings); nothing is duplicated here."}
          </Text>
          <Text style={styles.meta}>{selectedEntry.referencePointer?.packageFile}</Text>
          <Text style={styles.meta}>{selectedEntry.referencePointer?.worldbookCatalogFile}</Text>
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
        <Text style={styles.hint} testID={`companion-pack-assets-${pack.identity.factionAlignment}`}>
          {zh
            ? "12 帧待 Codex 图像工具生成(简报 docs/ticket-26-slice-265-k3-portrait-generation-briefs-v1-2026-09-21.md);在此之前呈现确定性中性回退,绝不伪造资产。"
            : "12 frames pending Codex image generation (brief docs/ticket-26-slice-265-k3-portrait-generation-briefs-v1-2026-09-21.md); until then a deterministic neutral fallback renders — assets are never fabricated."}
        </Text>
      </View>
    );
  }

  function renderPortraitStates() {
    if (!stateContract) {
      return (
        <View style={styles.statesBoard} testID="companion-portrait-states-board">
          <Text style={styles.hint}>
            {zh
              ? "凯瑞甘的动态头像由服务端许可帧实时驱动,见「战场通讯」区;此处不复制。"
              : "Kerrigan's dynamic portrait is driven live by server-approved frames in Field comms; not duplicated here."}
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
        {selectedState && selectedEntry && (
          <View style={styles.statePreview} testID="companion-portrait-state-preview">
            <View style={[styles.stateFrame, { borderColor: selectedEntry.factionColor }]}>
              <Text style={[styles.stateGlyph, { color: selectedEntry.factionColor }]}>◈</Text>
              <Text style={styles.stateFallbackText}>
                {zh ? "确定性回退:帧待生成" : "deterministic fallback: frame pending"}
              </Text>
            </View>
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
                  ? (zh ? "已启用 · " : "on · ")
                  : (zh ? "未启用 · " : "off · ")}
                {selectedState.reducedMotion}
              </Text>
              <Text style={styles.meta}>
                {zh ? "回退" : "fallback"}: {selectedState.deterministicFallback}
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
          {zh ? "多同伴同会话 · 呈现原型(未接通后端)" : "Multi-companion conversation · presentation prototype (no backend)"}
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
                testID={`companion-speaker-${entry.factionAlignment}`}
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
              ? ":服务端多说话者合同未暴露;本原型不伪造消息、不持久化、不调用 Provider。会话内同一时刻仍只有一位同伴真正发言。"
              : ": the server multi-speaker contract is absent; this prototype fabricates no messages, persists nothing, and calls no Provider. Exactly one companion truly speaks per session today."}
          </Text>
        </View>
      </View>
    );
  }

  function renderParitySurface() {
    return (
      <View style={styles.parity} testID="companion-parity-gap-surface">
        <Text style={styles.prototypeTitle}>
          {zh ? "SillyTavern 对等 / 缺口(产品内摘要)" : "SillyTavern parity / gaps (in-product summary)"}
        </Text>
        {PARITY_SUMMARY.map((row) => (
          <Text key={row.status} style={styles.parityRow}>
            {zh ? row.zh : row.status}: {row.items.join(zh ? "、" : ", ")}
          </Text>
        ))}
        {GAPS.map((gap) => (
          <Text key={gap.code} style={styles.gapLine} testID={`companion-gap-${gap.code}`}>
            {gap.code} — {zh ? gap.zh : gap.en}
          </Text>
        ))}
        <Text style={styles.hint}>
          {zh
            ? "完整矩阵:docs/ticket-26-slice-265-k3-sillytavern-parity-matrix-and-plan-v1-2026-09-21.md。缺失能力如实不可用,绝不在本地伪装完成。"
            : "Full matrix: docs/ticket-26-slice-265-k3-sillytavern-parity-matrix-and-plan-v1-2026-09-21.md. Missing capabilities are honestly unavailable and never faked locally."}
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
      <View style={styles.entryList}>{COMPANION_CATALOGUE_V1.entries.map(renderEntryCard)}</View>
      {renderPackDetail()}
      <Text style={styles.fieldLabel}>{zh ? "通讯头像六状态预览" : "Communication portrait · six-state preview"}</Text>
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
  entryCard: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#0d1410" },
  entryCardActive: { backgroundColor: "#17211a" },
  entryEmblem: { width: 30, height: 30, borderRadius: 7, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0f0b" },
  entryEmblemText: { fontSize: 14 },
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
  stateFrame: { width: 120, height: 120, maxWidth: "100%", borderWidth: 1, borderRadius: 8, backgroundColor: "#071009", alignItems: "center", justifyContent: "center", gap: 6, padding: 8 },
  stateGlyph: { fontSize: 28 },
  stateFallbackText: { color: "#aeb9a4", fontSize: 9, textAlign: "center", lineHeight: 13 },
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
