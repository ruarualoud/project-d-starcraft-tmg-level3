import { useEffect } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useLevel3ClientDomain } from "@/lib/level3/client-domain-provider";

/**
 * The root provider consumes and scrubs the complete Linking URL. This route
 * compares only the bounded path locator against the Provider's parsed room.
 * It never reads or interprets query/fragment authority claims.
 */
export default function RoomIngressRoute() {
  const { roomAccess, initialRoomUrl } = useLevel3ClientDomain();
  const params = useLocalSearchParams<{ roomId?: string | string[] }>();
  const routeRoomId = typeof params.roomId === "string" ? params.roomId : null;
  const routeRoomIdValid = Boolean(
    routeRoomId
      && routeRoomId.length <= 128
      && /^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(routeRoomId),
  );
  const settledForRoute = routeRoomIdValid
    && roomAccess.roomId === routeRoomId
    && ["bound", "public_observer"].includes(roomAccess.status);
  const ingressUnavailable = roomAccess.status === "rejected" && roomAccess.roomId === null;

  let routeErrorCode: string | null = null;
  if (!routeRoomIdValid) {
    routeErrorCode = Array.isArray(params.roomId)
      ? "ROOM_ROUTE_ID_AMBIGUOUS"
      : "ROOM_ROUTE_ID_INVALID";
  } else if (initialRoomUrl.errorCode) {
    routeErrorCode = initialRoomUrl.errorCode;
  } else if (roomAccess.status === "rejected") {
    routeErrorCode = roomAccess.errorCode || "ROOM_INGRESS_REJECTED";
  } else if (roomAccess.roomId && roomAccess.roomId !== routeRoomId) {
    routeErrorCode = "ROOM_ROUTE_ID_MISMATCH";
  } else if (initialRoomUrl.checked && roomAccess.status === "idle") {
    routeErrorCode = "ROOM_ROUTE_WITHOUT_INGESTED_URL";
  }

  useEffect(() => {
    if (settledForRoute || ingressUnavailable) {
      router.replace("/(tabs)/match");
    }
  }, [ingressUnavailable, settledForRoute]);

  return (
    <ScreenContainer containerClassName="bg-background">
      <View
        accessibilityLiveRegion="polite"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}
      >
        <Text style={{ color: routeErrorCode ? "#fca5a5" : "#e2e8f0", fontSize: 18, fontWeight: "800" }}>
          {routeErrorCode ? "房间链接已拒绝" : "正在安全连接权威房间"}
        </Text>
        <Text style={{ color: "#94a3b8", fontSize: 13, marginTop: 8, textAlign: "center" }}>
          {routeErrorCode
            ? "The route did not match a successfully ingested authoritative room locator."
            : "Securing room access, then opening the Battle Room…"}
        </Text>
        {routeErrorCode && (
          <Text selectable style={{ color: "#f87171", fontFamily: "monospace", fontSize: 12, marginTop: 12 }}>
            {routeErrorCode}
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
}
