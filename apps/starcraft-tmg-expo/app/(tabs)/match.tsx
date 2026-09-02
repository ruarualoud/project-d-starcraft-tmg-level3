import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";

import { ScreenContainer } from "@/components/screen-container";
import { useI18n } from "@/lib/i18n";
import { useLevel3ClientDomain } from "@/lib/level3/client-domain-provider";
import {
  buildStarcraftTmgRoomAccessUrl,
  type StarcraftTmgRoomAccessKind,
} from "@/lib/level3/room-access-v1.mjs";

const STATUS_COLOR: Record<string, string> = {
  room_required: "#94a3b8",
  connecting: "#38bdf8",
  connected: "#22c55e",
  applying: "#f59e0b",
  recovering: "#f59e0b",
  offline_read_only: "#fbbf24",
  authentication_required: "#ef4444",
  blocked: "#ef4444",
  unavailable: "#ef4444",
};

type AccessAction = "claim_control" | "issue_invite" | "issue_recovery";

interface EphemeralLink {
  kind: StarcraftTmgRoomAccessKind;
  url: string;
}

interface SharingLinkConfiguration {
  available: boolean;
  environment: "development" | "production";
  origin: string;
  trustedOrigins: string[];
  errorCode: string | null;
}

function scalar(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function sharingLinkConfiguration(): SharingLinkConfiguration {
  const environment = process.env.NODE_ENV === "production"
    ? "production"
    : "development";
  const configured = process.env.EXPO_PUBLIC_STARCRAFT_TMG_WEB_ORIGIN || "";
  const origin = environment === "production"
    ? configured
    : (Platform.OS === "web" && globalThis.window?.location?.origin
      ? globalThis.window.location.origin
      : (configured || "projectd-starcraft-tmg:"));
  const trustedOrigins = configured ? [configured] : [];
  try {
    buildStarcraftTmgRoomAccessUrl({
      roomId: "configuration-probe",
      origin,
      trustedOrigins,
      environment,
      access: {
        kind: "invite",
        token: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      },
    });
    return { available: true, environment, origin, trustedOrigins, errorCode: null };
  } catch (error) {
    return {
      available: false,
      environment,
      origin: "",
      trustedOrigins: [],
      errorCode: typeof (error as { code?: unknown })?.code === "string"
        ? String((error as { code: string }).code)
        : "ROOM_LINK_CONFIGURATION_INVALID",
    };
  }
}

export default function MatchScreen() {
  const { lang } = useI18n();
  const { view, connection, roomAccess, dispatch, refresh } =
    useLevel3ClientDomain();
  const [pendingAction, setPendingAction] = useState<AccessAction | "refresh" | null>(null);
  const [ephemeralLink, setEphemeralLink] = useState<EphemeralLink | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const accessContextRef = useRef({ key: "", generation: 0 });
  const zh = lang === "zh";

  const projection = view.roomProjection || {};
  const room = projection.room || {};
  const viewer = projection.viewer || {};
  const projectedControl = projection.control || {};
  const privateControl = view.control || {};
  const linkConfiguration = sharingLinkConfiguration();
  const capabilities = new Set<string>(
    Array.isArray(viewer.capabilities) ? viewer.capabilities.map(String) : [],
  );
  const connectedAndOperational = connection.canRequestAuthoritativeIntent
    && pendingAction === null;
  const canRefresh = Boolean(connection.roomId) && connection.visible
    && pendingAction === null;
  const canClaimControl = capabilities.has("apply");
  const canIssueInvite = capabilities.has("manage_invites")
    && linkConfiguration.available;
  const canIssueRecovery = capabilities.has("create_recovery_ticket")
    && linkConfiguration.available;
  const linkConfigurationBlocked = (
    capabilities.has("manage_invites")
      || capabilities.has("create_recovery_ticket")
  ) && !linkConfiguration.available;
  const otherDeviceControl = projectedControl.visible === true
    && projectedControl.hasActiveLease === true
    && projectedControl.ownedByViewer !== true;
  const thisDeviceFenced = privateControl.status === "fenced";
  const accessContextKey = `${connection.roomId || ""}|${connection.visible ? "visible" : "hidden"}|${connection.status === "authentication_required" ? "unauthenticated" : "authenticated"}`;
  if (accessContextRef.current.key !== accessContextKey) {
    accessContextRef.current = {
      key: accessContextKey,
      generation: accessContextRef.current.generation + 1,
    };
  }

  useEffect(() => {
    setEphemeralLink(null);
  }, [accessContextKey]);

  const statusLabel = useMemo(() => {
    const labels: Record<string, [string, string]> = {
      room_required: ["等待房间", "Room required"],
      connecting: ["正在连接", "Connecting"],
      connected: ["已连接权威房间", "Authoritative room connected"],
      applying: ["正在提交确认动作", "Applying confirmed action"],
      recovering: ["正在恢复权威状态", "Recovering authoritative state"],
      offline_read_only: ["离线只读", "Offline read-only"],
      authentication_required: ["需要重新验证席位", "Seat access required"],
      blocked: ["连接被拒绝", "Connection blocked"],
      unavailable: ["暂时不可用", "Temporarily unavailable"],
    };
    return labels[connection.status]?.[zh ? 0 : 1] || connection.status;
  }, [connection.status, zh]);
  const statusColor = STATUS_COLOR[connection.status] || "#94a3b8";

  const runRefresh = async () => {
    if (!canRefresh) return;
    setPendingAction("refresh");
    setActionError(null);
    try {
      const result = await refresh();
      if (!result.ok) setActionError(result.rejection?.code || "REFRESH_REJECTED");
    } finally {
      setPendingAction(null);
    }
  };

  const claimControl = async () => {
    if (!connectedAndOperational || !canClaimControl) return;
    setPendingAction("claim_control");
    setActionError(null);
    setNotice(null);
    try {
      const result = await dispatch({ type: "claim_control" });
      if (result.ok) {
        setNotice(zh ? "本设备已取得控制权。" : "This device now holds control.");
      } else {
        setActionError(result.rejection?.code || "CONTROL_CLAIM_REJECTED");
      }
    } finally {
      setPendingAction(null);
    }
  };

  const issueAccess = async (kind: StarcraftTmgRoomAccessKind) => {
    const intent: AccessAction = kind === "invite" ? "issue_invite" : "issue_recovery";
    const permitted = kind === "invite" ? canIssueInvite : canIssueRecovery;
    if (!connectedAndOperational || !permitted || !connection.roomId) return;
    setPendingAction(intent);
    setActionError(null);
    setNotice(null);
    setEphemeralLink(null);
    const accessGeneration = accessContextRef.current.generation;
    const issuingRoomId = connection.roomId;
    try {
      const result = await dispatch({ type: intent });
      const credential = result.credential;
      if (!result.ok
        || credential?.ephemeral !== true
        || credential.persistenceAllowed !== false
        || credential.kind !== kind
        || typeof credential.token !== "string") {
        setActionError(result.rejection?.code || "ACCESS_LINK_RESPONSE_INVALID");
        return;
      }
      if (accessContextRef.current.generation !== accessGeneration
        || accessContextRef.current.key !== `${issuingRoomId}|visible|authenticated`) {
        setActionError("ACCESS_LINK_DISCARDED_AFTER_CONTEXT_CHANGE");
        return;
      }
      const url = buildStarcraftTmgRoomAccessUrl({
        roomId: issuingRoomId,
        origin: linkConfiguration.origin,
        trustedOrigins: linkConfiguration.trustedOrigins,
        environment: linkConfiguration.environment,
        access: { kind, token: credential.token },
      });
      setEphemeralLink({ kind, url });
      setNotice(
        zh
          ? "应用不会持久保存此一次性链接；切到后台会清除界面副本。复制或分享后，系统剪贴板或接收方会持有副本。"
          : "The app does not persist this one-shot link and clears its screen copy on background. Copying or sharing gives the system clipboard or recipient a copy.",
      );
    } catch (error) {
      setActionError(
        typeof (error as { code?: unknown })?.code === "string"
          ? String((error as { code: string }).code)
          : "ACCESS_LINK_BUILD_FAILED",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const copyLink = async () => {
    if (!ephemeralLink) return;
    await Clipboard.setStringAsync(ephemeralLink.url);
    setNotice(zh ? "链接已复制。" : "Link copied.");
  };

  const shareLink = async () => {
    if (!ephemeralLink) return;
    await Share.share({
      message: ephemeralLink.url,
      title: ephemeralLink.kind === "invite"
        ? "Project D room invite"
        : "Project D seat recovery",
    });
  };

  const revisions: Array<[string, string]> = [
    [zh ? "房间修订" : "Room revision", scalar(room.roomRevision)],
    [zh ? "状态修订" : "State revision", scalar(room.stateRevision)],
    [zh ? "观察席位修订" : "Viewer grant revision", scalar(viewer.grantRecoveryRevision)],
    [zh ? "控制 Fence" : "Control fence", scalar(projectedControl.currentLeaseFence)],
    [zh ? "恢复账本修订" : "Recovery ledger revision", scalar(room.seatRecoveryRevision)],
  ];

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{zh ? "对战房间" : "Battle Room"}</Text>
          <Text style={styles.headerSub}>Project D Level-3 · Ticket 14 / Slice 131</Text>
        </View>
        <View style={[styles.statusPill, { borderColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {connection.readOnly && connection.roomId && (
          <View accessibilityRole="alert" style={styles.warningCard}>
            <Text style={styles.warningTitle}>
              {zh ? "当前为只读投影" : "Current projection is read-only"}
            </Text>
            <Text style={styles.warningBody}>
              {connection.online
                ? (zh ? "客户端不在可操作前台；不会排队提交。" : "The client is not operational in foreground; no write is queued.")
                : (zh ? "离线缓存仅供查看；恢复在线后会重新验证权威状态。" : "Offline cache is view-only and revalidates against authority on reconnect.")}
            </Text>
          </View>
        )}

        {(otherDeviceControl || thisDeviceFenced) && (
          <View accessibilityRole="alert" style={styles.controlWarning}>
            <Text style={styles.warningTitle}>
              {zh ? "另一设备持有最新控制权" : "Another device has the newest control"}
            </Text>
            <Text style={styles.warningBody}>
              {zh
                ? "本设备仍可读取投影，但旧控制 fence 不能提交动作。取得控制权会由服务器递增 fence。"
                : "This device may keep reading, but an older control fence cannot apply. Claiming control asks the server for the next fence."}
            </Text>
          </View>
        )}

        {linkConfigurationBlocked && (
          <View accessibilityRole="alert" style={styles.controlWarning}>
            <Text style={styles.warningTitle}>
              {zh ? "邀请与恢复链接已关闭" : "Invite and recovery links are disabled"}
            </Text>
            <Text selectable style={styles.warningBody}>
              {zh
                ? `生产访问能力需要已验证的 HTTPS Universal/App Link：${linkConfiguration.errorCode}`
                : `Production bearer access requires a verified HTTPS Universal/App Link: ${linkConfiguration.errorCode}`}
            </Text>
          </View>
        )}

        <View accessibilityRole="summary" accessibilityLiveRegion="polite" style={styles.heroCard}>
          <Text style={styles.eyebrow}>{zh ? "权威房间入口" : "AUTHORITATIVE ROOM ACCESS"}</Text>
          <Text style={styles.heroTitle}>
            {connection.roomId
              ? (zh ? "房间定位与席位能力均已由服务器验证" : "Room locator and seat capability are server-verified")
              : (zh ? "通过受信任邀请或恢复链接进入" : "Enter with a trusted invite or recovery link")}
          </Text>
          <Text style={styles.heroBody}>
            {zh
              ? "URL 只提供房间定位和一次性交换能力；side、role、revision、确认状态和传输地址声明全部被忽略。"
              : "The URL supplies only a room locator and optional one-shot exchange capability. Side, role, revision, confirmation, and transport-origin claims are ignored."}
          </Text>
          <View style={styles.actionRow}>
            {connection.roomId && (
              <ActionButton
                label={pendingAction === "refresh" ? (zh ? "刷新中…" : "Refreshing…") : (zh ? "刷新投影" : "Refresh projection")}
                disabled={!canRefresh}
                onPress={runRefresh}
                kind="secondary"
              />
            )}
            {canClaimControl && (
              <ActionButton
                label={pendingAction === "claim_control"
                  ? (zh ? "申请中…" : "Claiming…")
                  : (otherDeviceControl || thisDeviceFenced
                    ? (zh ? "在本设备取得控制权" : "Take control here")
                    : (zh ? "取得控制权" : "Claim control"))}
                disabled={!connectedAndOperational}
                onPress={claimControl}
                kind="primary"
              />
            )}
            {canIssueInvite && (
              <ActionButton
                label={pendingAction === "issue_invite" ? (zh ? "签发中…" : "Issuing…") : (zh ? "生成邀请" : "Issue invite")}
                disabled={!connectedAndOperational}
                onPress={() => issueAccess("invite")}
                kind="secondary"
              />
            )}
            {canIssueRecovery && (
              <ActionButton
                label={pendingAction === "issue_recovery" ? (zh ? "签发中…" : "Issuing…") : (zh ? "生成恢复链接" : "Issue recovery")}
                disabled={!connectedAndOperational}
                onPress={() => issueAccess("recovery")}
                kind="secondary"
              />
            )}
          </View>
          {!canClaimControl && !canIssueInvite && !canIssueRecovery && connection.roomId && (
            <Text style={styles.viewerHint}>
              {zh ? "当前观察者投影没有控制或链接签发能力。" : "This viewer projection has no control or access-link capability."}
            </Text>
          )}
        </View>

        {ephemeralLink && (
          <View accessibilityRole="alert" style={styles.linkCard}>
            <Text style={styles.linkTitle}>
              {ephemeralLink.kind === "invite"
                ? (zh ? "一次性邀请链接" : "One-shot invite link")
                : (zh ? "一次性席位恢复链接" : "One-shot seat recovery link")}
            </Text>
            <Text selectable numberOfLines={4} style={styles.linkValue}>{ephemeralLink.url}</Text>
            <View style={styles.actionRow}>
              <ActionButton label={zh ? "复制" : "Copy"} onPress={copyLink} kind="primary" />
              <ActionButton label={zh ? "分享" : "Share"} onPress={shareLink} kind="secondary" />
              <ActionButton
                label={zh ? "清除" : "Dismiss"}
                onPress={() => setEphemeralLink(null)}
                kind="danger"
              />
            </View>
          </View>
        )}

        {(notice || actionError) && (
          <View accessibilityLiveRegion="polite" style={styles.noticeCard}>
            {notice && <Text style={styles.noticeText}>{notice}</Text>}
            {actionError && <Text selectable style={styles.errorText}>error: {actionError}</Text>}
          </View>
        )}

        <View style={styles.grid}>
          <InfoCard
            title={zh ? "连接与入口" : "Connection & ingress"}
            rows={[
              [zh ? "连接状态" : "Connection", statusLabel],
              ["Room ID", connection.roomId || "—"],
              [zh ? "入口状态" : "Ingress status", roomAccess.status],
              [zh ? "入口类型" : "Access kind", roomAccess.accessKind || "public"],
              [zh ? "忽略 URL 声明" : "Ignored URL claims", String(roomAccess.ignoredClaims.length)],
              [zh ? "入口错误" : "Ingress error", roomAccess.errorCode || "—"],
            ]}
          />
          <InfoCard title={zh ? "权威修订" : "Authority revisions"} rows={revisions} />
          <InfoCard
            title={zh ? "观察者与控制" : "Viewer & control"}
            rows={[
              [zh ? "席位" : "Seat", scalar(viewer.seatKey)],
              [zh ? "角色模式" : "Role mode", scalar(viewer.roleMode)],
              [zh ? "控制状态" : "Control status", scalar(privateControl.status)],
              [zh ? "活动控制" : "Active lease", projectedControl.hasActiveLease ? (zh ? "是" : "Yes") : (zh ? "否" : "No")],
              [zh ? "本观察者所有" : "Owned by viewer", projectedControl.ownedByViewer ? (zh ? "是" : "Yes") : (zh ? "否" : "No")],
            ]}
          />
          <InfoCard
            title={zh ? "恢复与缓存" : "Recovery & cache"}
            rows={[
              [zh ? "缓存状态" : "Cache status", scalar(view.recovery?.cacheStatus)],
              [zh ? "投影来源" : "Projection source", scalar(view.recovery?.source)],
              [zh ? "只读" : "Read-only", connection.readOnly ? (zh ? "是" : "Yes") : (zh ? "否" : "No")],
              [zh ? "结果不确定" : "Outcome uncertain", connection.outcomeUncertain ? (zh ? "是" : "Yes") : (zh ? "否" : "No")],
              [zh ? "拒绝代码" : "Rejection code", connection.rejectionCode || "—"],
            ]}
          />
        </View>

        <View style={styles.boundaryCard}>
          <Text style={styles.boundaryTitle}>{zh ? "客户端权威边界" : "Client authority boundary"}</Text>
          <BoundaryRow label={zh ? "房间状态" : "Room state"} value={zh ? "服务器权威；本地只缓存观察者投影" : "Server authority; local viewer-projection cache only"} />
          <BoundaryRow label={zh ? "访问能力" : "Access capability"} value={zh ? "仅内存交换；不进入投影、订阅或持久存储" : "In-memory exchange only; absent from projection, subscription, and persistence"} />
          <BoundaryRow label={zh ? "控制权" : "Control"} value={zh ? "服务器 CAS + 单调 fence；其它设备仍可只读" : "Server CAS plus monotonic fence; other devices remain readable"} />
          <BoundaryRow label={zh ? "训练真值" : "Training truth"} value="false" />
        </View>

        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>{zh ? "凭据无关的可观测视图" : "Credential-free observable view"}</Text>
          <Text selectable style={styles.mono}>phase: {view.phase}</Text>
          <Text selectable style={styles.mono}>surface: {view.surface || "—"}</Text>
          <Text selectable style={styles.mono}>clientRevision: {view.clientRevision}</Text>
          <Text selectable style={styles.mono}>viewHash: {view.viewHash}</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ActionButton({
  label,
  disabled = false,
  onPress,
  kind,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
  kind: "primary" | "secondary" | "danger";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        kind === "primary" && styles.primaryButton,
        kind === "secondary" && styles.secondaryButton,
        kind === "danger" && styles.dangerButton,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function InfoCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text selectable style={styles.infoValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function BoundaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.boundaryRow}>
      <Text style={styles.boundaryLabel}>{label}</Text>
      <Text style={styles.boundaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#e5e7eb" },
  headerSub: { marginTop: 3, fontSize: 11, color: "#64748b" },
  statusPill: { maxWidth: "48%", minHeight: 32, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 999 },
  statusPillText: { flexShrink: 1, fontSize: 11, fontWeight: "800" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 6, paddingBottom: 48, gap: 14 },
  warningCard: { borderRadius: 12, padding: 14, backgroundColor: "#422006", borderWidth: 1, borderColor: "#f59e0b" },
  controlWarning: { borderRadius: 12, padding: 14, backgroundColor: "#3f1515", borderWidth: 1, borderColor: "#ef4444" },
  warningTitle: { color: "#fef3c7", fontSize: 13, fontWeight: "900" },
  warningBody: { color: "#fde68a", fontSize: 12, lineHeight: 19, marginTop: 5 },
  heroCard: { borderRadius: 16, padding: 20, backgroundColor: "#0c1e33", borderWidth: 1, borderColor: "#0ea5e9" },
  eyebrow: { color: "#38bdf8", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: { color: "#f8fafc", fontSize: 21, fontWeight: "800", lineHeight: 29, marginTop: 8 },
  heroBody: { color: "#cbd5e1", fontSize: 13, lineHeight: 21, marginTop: 9 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 14 },
  button: { minHeight: 44, minWidth: 108, borderRadius: 9, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  primaryButton: { backgroundColor: "#0284c7", borderColor: "#38bdf8" },
  secondaryButton: { backgroundColor: "#172554", borderColor: "#60a5fa" },
  dangerButton: { backgroundColor: "#450a0a", borderColor: "#ef4444" },
  buttonDisabled: { opacity: 0.42 },
  buttonText: { color: "#f8fafc", fontSize: 12, fontWeight: "900" },
  viewerHint: { color: "#94a3b8", fontSize: 12, lineHeight: 19, marginTop: 14 },
  linkCard: { borderRadius: 12, padding: 16, backgroundColor: "#082f49", borderWidth: 1, borderColor: "#38bdf8" },
  linkTitle: { color: "#e0f2fe", fontSize: 14, fontWeight: "900" },
  linkValue: { color: "#bae6fd", backgroundColor: "#0c4a6e", fontFamily: "monospace", fontSize: 11, lineHeight: 18, padding: 10, borderRadius: 8, marginTop: 10 },
  noticeCard: { borderRadius: 10, padding: 12, backgroundColor: "#111827", borderWidth: 1, borderColor: "#374151" },
  noticeText: { color: "#a7f3d0", fontSize: 12, lineHeight: 18 },
  errorText: { color: "#fca5a5", fontSize: 11, lineHeight: 18, fontFamily: "monospace" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  infoCard: { flexGrow: 1, flexBasis: 280, borderRadius: 12, padding: 16, backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155" },
  cardTitle: { color: "#38bdf8", fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  infoRow: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  infoLabel: { flex: 1, color: "#94a3b8", fontSize: 12 },
  infoValue: { flex: 1, color: "#e2e8f0", fontSize: 12, fontWeight: "700", textAlign: "right" },
  boundaryCard: { borderRadius: 12, padding: 16, backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155" },
  boundaryTitle: { color: "#fbbf24", fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  boundaryRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  boundaryLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "800", marginBottom: 4 },
  boundaryValue: { color: "#e2e8f0", fontSize: 12, lineHeight: 19 },
  debugCard: { borderRadius: 12, padding: 16, backgroundColor: "#020617", borderWidth: 1, borderColor: "#1e293b" },
  debugTitle: { color: "#64748b", fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  mono: { color: "#94a3b8", fontSize: 11, lineHeight: 18, fontFamily: "monospace" },
});
