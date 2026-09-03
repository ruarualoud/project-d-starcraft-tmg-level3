import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { AppState, Platform } from "react-native";
import * as Linking from "expo-linking";
import NetInfo from "@react-native-community/netinfo";

import {
  createStarcraftTmgExpoClientRuntime,
  projectStarcraftTmgExpoConnection,
  type StarcraftTmgClientIntent,
  type StarcraftTmgClientResult,
  type StarcraftTmgClientView,
  type StarcraftTmgExpoClientRuntime,
  type StarcraftTmgExpoConnection,
} from "./client-domain-mount-runtime.mjs";
import {
  isStarcraftTmgRoomAccessCandidate,
  normalizeStarcraftTmgTrustedHttpsOrigin,
  parseStarcraftTmgRoomAccessUrl,
  scrubStarcraftTmgSensitiveWebUrl,
  StarcraftTmgRoomAccessError,
  type StarcraftTmgRoomAccessKind,
} from "./room-access-v1.mjs";

interface BindRoomInput {
  roomId: string;
  locale?: string;
}

type RoomAccessIngressStatus =
  | "idle"
  | "capturing"
  | "public_observer"
  | "bound"
  | "rejected";

interface RoomAccessIngressView {
  status: RoomAccessIngressStatus;
  roomId: string | null;
  accessKind: StarcraftTmgRoomAccessKind | null;
  ignoredClaims: ReadonlyArray<{ location: "query" | "fragment"; key: string }>;
  errorCode: string | null;
  duplicateIgnored: boolean;
  credentialPersisted: false;
}

interface RoomAccessIngressResult {
  ok: boolean;
  outcome?: string;
  roomId?: string;
  accessKind?: StarcraftTmgRoomAccessKind | null;
  rejection?: { code: string };
}

interface InitialRoomUrlView {
  checked: boolean;
  errorCode: string | null;
}

interface Level3ClientDomainContextValue {
  view: StarcraftTmgClientView;
  connection: StarcraftTmgExpoConnection;
  roomAccess: RoomAccessIngressView;
  initialRoomUrl: InitialRoomUrlView;
  bindRoom(input: BindRoomInput): Promise<StarcraftTmgClientResult>;
  ingestRoomUrl(url: string): Promise<RoomAccessIngressResult>;
  dispatch(intent: StarcraftTmgClientIntent): Promise<StarcraftTmgClientResult>;
  refresh(): Promise<StarcraftTmgClientResult>;
}

const Level3ClientDomainContext =
  createContext<Level3ClientDomainContextValue | null>(null);

function browserLanguage() {
  if (Platform.OS !== "web") return "en";
  return globalThis.navigator?.language || "en";
}

function roomLinkEnvironment(): "development" | "production" {
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function configuredTrustedRoomLinkOrigin() {
  const configured = process.env.EXPO_PUBLIC_STARCRAFT_TMG_WEB_ORIGIN;
  if (!configured) return null;
  try {
    return normalizeStarcraftTmgTrustedHttpsOrigin(configured);
  } catch {
    return null;
  }
}

function trustedRoomLinkOrigins() {
  const origins = new Set<string>();
  if (roomLinkEnvironment() === "development"
    && Platform.OS === "web"
    && globalThis.window?.location?.origin) {
    origins.add(globalThis.window.location.origin);
  }
  const configured = configuredTrustedRoomLinkOrigin();
  if (configured) origins.add(configured);
  return origins;
}

function scrubCurrentWebLocation(rawUrl: string, preferredPath?: string | null) {
  if (Platform.OS !== "web" || !globalThis.window?.history) return;
  try {
    const incoming = new URL(rawUrl);
    if (incoming.origin !== globalThis.window.location.origin) return;
    const replacement = preferredPath || scrubStarcraftTmgSensitiveWebUrl(rawUrl);
    if (replacement) {
      globalThis.window.history.replaceState(
        globalThis.window.history.state,
        "",
        replacement,
      );
    }
  } catch {
    // A malformed URL cannot be made current by the browser router.
  }
}

const INITIAL_ROOM_ACCESS: RoomAccessIngressView = Object.freeze({
  status: "idle",
  roomId: null,
  accessKind: null,
  ignoredClaims: Object.freeze([]),
  errorCode: null,
  duplicateIgnored: false,
  credentialPersisted: false,
});

function createProductRuntime(): StarcraftTmgExpoClientRuntime {
  const web = Platform.OS === "web";
  // Network authority is unknown until NetInfo reports. Starting offline is
  // fail-closed; its first connected snapshot triggers lifecycle recovery.
  let nativeOnline = false;
  return createStarcraftTmgExpoClientRuntime({
    platform: web ? "web" : "native",
    asyncStorage: AsyncStorage,
    appState: web ? undefined : AppState,
    documentRef: web ? globalThis.document : undefined,
    windowRef: web ? globalThis.window : undefined,
    navigatorRef: web ? globalThis.navigator : undefined,
    readOnline: web ? undefined : () => nativeOnline,
    subscribeOnline: web ? undefined : (listener: () => void) => (
      NetInfo.addEventListener((network) => {
        nativeOnline = network.isConnected !== false
          && network.isInternetReachable !== false;
        listener();
      })
    ),
    fetchImpl: globalThis.fetch,
    baseUrl: process.env.EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN || "",
    enableCharacterPresentation: true,
    enableSourceLocalization: true,
    // Slice 150 proves the Web session. Native cookie/auth persistence and
    // device lifecycle acceptance remain intentionally deferred.
    enableRoleAgentSession: web,
    allowHeadlessFallback: true,
  });
}

export function Level3ClientDomainProvider({ children }: PropsWithChildren) {
  const runtimeRef = useRef<StarcraftTmgExpoClientRuntime | null>(null);
  if (!runtimeRef.current) runtimeRef.current = createProductRuntime();

  const runtime = runtimeRef.current;
  const clientDomain = runtime.clientDomain;
  const [roomAccess, setRoomAccess] =
    useState<RoomAccessIngressView>(INITIAL_ROOM_ACCESS);
  const [initialRoomUrl, setInitialRoomUrl] = useState<InitialRoomUrlView>({
    checked: false,
    errorCode: null,
  });
  const seenUrlFingerprintsRef = useRef(new Set<string>());
  const ingressQueueRef = useRef<Promise<RoomAccessIngressResult>>(
    Promise.resolve({ ok: true, outcome: "room_access_idle" }),
  );
  // RNLinking.web resolves getInitialURL() asynchronously from the *current*
  // location. Expo Router may normalize that location before the promise
  // settles, including moving search text behind an access fragment. Capture
  // the original browser URL synchronously, then clear the ref when consumed.
  const initialWebRoomUrlRef = useRef<string | null | undefined>(undefined);
  if (initialWebRoomUrlRef.current === undefined) {
    if (Platform.OS === "web") {
      const webWindow = globalThis.window as typeof globalThis.window & {
        __PROJECT_D_INITIAL_ROOM_URL__?: unknown;
      };
      const captured = webWindow?.__PROJECT_D_INITIAL_ROOM_URL__;
      try {
        delete webWindow.__PROJECT_D_INITIAL_ROOM_URL__;
      } catch {
        webWindow.__PROJECT_D_INITIAL_ROOM_URL__ = undefined;
      }
      initialWebRoomUrlRef.current = typeof captured === "string"
        ? captured
        : webWindow?.location?.href || null;
    } else {
      initialWebRoomUrlRef.current = null;
    }
  }
  const view = useSyncExternalStore(
    clientDomain.subscribe,
    clientDomain.read,
    clientDomain.read,
  );
  const connection = useMemo(
    () => projectStarcraftTmgExpoConnection(view),
    [view],
  );

  const bindRoom = useCallback(
    async ({ roomId, locale }: BindRoomInput) => {
      setRoomAccess({
        status: "capturing",
        roomId,
        accessKind: null,
        ignoredClaims: [],
        errorCode: null,
        duplicateIgnored: false,
        credentialPersisted: false,
      });
      const result = await clientDomain.bootstrap({
        route: { roomId },
        principal: {},
        surface: runtime.surface,
        locale: locale || browserLanguage(),
      });
      setRoomAccess({
        status: result.ok ? "public_observer" : "rejected",
        roomId,
        accessKind: null,
        ignoredClaims: [],
        errorCode: result.rejection?.code || null,
        duplicateIgnored: false,
        credentialPersisted: false,
      });
      return result;
    },
    [clientDomain, runtime.surface],
  );

  const ingestRoomUrl = useCallback(
    (rawUrl: string): Promise<RoomAccessIngressResult> => {
      const perform = async (): Promise<RoomAccessIngressResult> => {
        let parsed;
        try {
          parsed = parseStarcraftTmgRoomAccessUrl(rawUrl, {
            trustedOrigins: trustedRoomLinkOrigins(),
            environment: roomLinkEnvironment(),
          });
          // The capability is now in process memory. Remove the fragment and
          // all authority-looking query claims before any awaited operation.
          scrubCurrentWebLocation(rawUrl, parsed.scrubbedWebPath);
        } catch (error) {
          scrubCurrentWebLocation(rawUrl);
          const code = error instanceof StarcraftTmgRoomAccessError
            ? error.code
            : "ROOM_URL_INVALID";
          setRoomAccess({
            status: "rejected",
            roomId: null,
            accessKind: null,
            ignoredClaims: [],
            errorCode: code,
            duplicateIgnored: false,
            credentialPersisted: false,
          });
          return { ok: false, rejection: { code } };
        }

        if (seenUrlFingerprintsRef.current.has(parsed.accessFingerprint)) {
          setRoomAccess((current) => ({ ...current, duplicateIgnored: true }));
          return {
            ok: true,
            outcome: "duplicate_room_url_ignored",
            roomId: parsed.locator.roomId,
            accessKind: parsed.access?.kind || null,
          };
        }
        if (seenUrlFingerprintsRef.current.size >= 64) {
          const oldest = seenUrlFingerprintsRef.current.values().next().value;
          if (oldest) seenUrlFingerprintsRef.current.delete(oldest);
        }
        seenUrlFingerprintsRef.current.add(parsed.accessFingerprint);
        const ignoredClaims = parsed.ignoredClaims.map(({ location, key }) => ({
          location,
          key,
        }));
        const currentView = clientDomain.read();
        const currentSeatBound = Boolean(currentView.roomProjection?.viewer?.seatKey);
        if (!parsed.access && currentSeatBound) {
          const sameRoom = currentView.locator?.roomId === parsed.locator.roomId;
          if (sameRoom) {
            setRoomAccess({
              status: "bound",
              roomId: currentView.locator?.roomId || null,
              accessKind: null,
              ignoredClaims,
              errorCode: null,
              duplicateIgnored: false,
              credentialPersisted: false,
            });
            return {
              ok: true,
              outcome: "existing_seat_room_navigation_only",
              roomId: parsed.locator.roomId,
              accessKind: null,
            };
          }
          const errorCode = "PUBLIC_LINK_CANNOT_REPLACE_SEAT_SESSION";
          setRoomAccess({
            status: "rejected",
            roomId: currentView.locator?.roomId || null,
            accessKind: null,
            ignoredClaims,
            errorCode,
            duplicateIgnored: false,
            credentialPersisted: false,
          });
          return { ok: false, rejection: { code: errorCode } };
        }
        setRoomAccess({
          status: "capturing",
          roomId: parsed.locator.roomId,
          accessKind: parsed.access?.kind || null,
          ignoredClaims,
          errorCode: null,
          duplicateIgnored: false,
          credentialPersisted: false,
        });

        const principal: Record<string, never> | {
          access: { kind: StarcraftTmgRoomAccessKind; token: string };
        } = parsed.access
          ? { access: { kind: parsed.access.kind, token: parsed.access.token } }
          : {};
        const result = await clientDomain.bootstrap({
          route: parsed.locator,
          principal,
          surface: runtime.surface,
          locale: browserLanguage(),
        });
        if (!result.ok) {
          // Keep a fingerprint only for in-flight and completed ingestion.
          // A transient failure must not trap a still-unconsumed capability.
          seenUrlFingerprintsRef.current.delete(parsed.accessFingerprint);
        }
        const status = result.ok
          ? (parsed.access ? "bound" : "public_observer")
          : "rejected";
        setRoomAccess({
          status,
          roomId: parsed.locator.roomId,
          accessKind: parsed.access?.kind || null,
          ignoredClaims,
          errorCode: result.rejection?.code || null,
          duplicateIgnored: false,
          credentialPersisted: false,
        });
        return {
          ok: result.ok,
          outcome: result.outcome,
          roomId: parsed.locator.roomId,
          accessKind: parsed.access?.kind || null,
          ...(result.rejection
            ? { rejection: { code: result.rejection.code } }
            : {}),
        };
      };
      const queued = ingressQueueRef.current.then(perform, perform);
      ingressQueueRef.current = queued;
      return queued;
    },
    [clientDomain, runtime.surface],
  );

  useEffect(() => {
    let active = true;
    const acceptIfRoomUrl = (url: string | null) => {
      if (active && url && isStarcraftTmgRoomAccessCandidate(url)) {
        void ingestRoomUrl(url);
      }
    };
    const settleInitialUrl = (url: string | null) => {
      if (!active) return;
      if (url && isStarcraftTmgRoomAccessCandidate(url)) {
        void ingestRoomUrl(url).then((result) => {
          if (!active) return;
          setInitialRoomUrl({
            checked: true,
            errorCode: result.rejection?.code || null,
          });
        }).catch(() => {
          if (!active) return;
          const errorCode = "LINKING_INITIAL_URL_INGEST_FAILED";
          setInitialRoomUrl({ checked: true, errorCode });
          setRoomAccess({
            status: "rejected",
            roomId: null,
            accessKind: null,
            ignoredClaims: [],
            errorCode,
            duplicateIgnored: false,
            credentialPersisted: false,
          });
        });
        return;
      }
      setInitialRoomUrl({ checked: true, errorCode: null });
    };
    const rejectInitialUrl = () => {
      if (!active) return;
      const errorCode = "LINKING_INITIAL_URL_UNAVAILABLE";
      setInitialRoomUrl({ checked: true, errorCode });
      setRoomAccess({
        status: "rejected",
        roomId: null,
        accessKind: null,
        ignoredClaims: [],
        errorCode,
        duplicateIgnored: false,
        credentialPersisted: false,
      });
    };
    if (Platform.OS === "web") {
      const captured = initialWebRoomUrlRef.current;
      initialWebRoomUrlRef.current = null;
      settleInitialUrl(captured || null);
    } else {
      void Linking.getInitialURL().then(settleInitialUrl).catch(rejectInitialUrl);
    }
    const subscription = Linking.addEventListener("url", ({ url }) => {
      acceptIfRoomUrl(url);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [ingestRoomUrl]);
  const dispatch = useCallback(
    (intent: StarcraftTmgClientIntent) => clientDomain.dispatch(intent),
    [clientDomain],
  );
  const refresh = useCallback(
    () => clientDomain.dispatch({ type: "refresh" }),
    [clientDomain],
  );

  const value = useMemo<Level3ClientDomainContextValue>(
    () => ({
      view,
      connection,
      roomAccess,
      initialRoomUrl,
      bindRoom,
      ingestRoomUrl,
      dispatch,
      refresh,
    }),
    [
      view,
      connection,
      roomAccess,
      initialRoomUrl,
      bindRoom,
      ingestRoomUrl,
      dispatch,
      refresh,
    ],
  );

  return (
    <Level3ClientDomainContext.Provider value={value}>
      {children}
    </Level3ClientDomainContext.Provider>
  );
}

export function useLevel3ClientDomain() {
  const context = useContext(Level3ClientDomainContext);
  if (!context) {
    throw new Error(
      "useLevel3ClientDomain must be used inside Level3ClientDomainProvider",
    );
  }
  return context;
}

export type {
  BindRoomInput,
  Level3ClientDomainContextValue,
  RoomAccessIngressResult,
  RoomAccessIngressStatus,
  RoomAccessIngressView,
  InitialRoomUrlView,
  StarcraftTmgClientIntent,
  StarcraftTmgClientView,
  StarcraftTmgExpoConnection,
};
