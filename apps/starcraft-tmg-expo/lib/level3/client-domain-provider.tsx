import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import { AppState, Platform } from "react-native";

import {
  createStarcraftTmgExpoClientRuntime,
  projectStarcraftTmgExpoConnection,
  type StarcraftTmgClientIntent,
  type StarcraftTmgClientResult,
  type StarcraftTmgClientView,
  type StarcraftTmgExpoClientRuntime,
  type StarcraftTmgExpoConnection,
} from "./client-domain-mount-runtime.mjs";

interface BindRoomInput {
  roomId: string;
  seatToken?: string;
  locale?: string;
}

interface Level3ClientDomainContextValue {
  view: StarcraftTmgClientView;
  connection: StarcraftTmgExpoConnection;
  bindRoom(input: BindRoomInput): Promise<StarcraftTmgClientResult>;
  dispatch(intent: StarcraftTmgClientIntent): Promise<StarcraftTmgClientResult>;
  refresh(): Promise<StarcraftTmgClientResult>;
}

const Level3ClientDomainContext =
  createContext<Level3ClientDomainContextValue | null>(null);

function browserLanguage() {
  if (Platform.OS !== "web") return "en";
  return globalThis.navigator?.language || "en";
}

function createProductRuntime(): StarcraftTmgExpoClientRuntime {
  const web = Platform.OS === "web";
  return createStarcraftTmgExpoClientRuntime({
    platform: web ? "web" : "native",
    asyncStorage: AsyncStorage,
    appState: web ? undefined : AppState,
    documentRef: web ? globalThis.document : undefined,
    windowRef: web ? globalThis.window : undefined,
    navigatorRef: web ? globalThis.navigator : undefined,
    // Native network transport failures are recovered by the Client Domain;
    // AppState resume triggers an authoritative revalidation. A future native
    // network signal may be injected here without changing the domain API.
    readOnline: () => true,
    fetchImpl: globalThis.fetch,
    baseUrl: process.env.EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN || "",
    allowHeadlessFallback: true,
  });
}

export function Level3ClientDomainProvider({ children }: PropsWithChildren) {
  const runtimeRef = useRef<StarcraftTmgExpoClientRuntime | null>(null);
  if (!runtimeRef.current) runtimeRef.current = createProductRuntime();

  const runtime = runtimeRef.current;
  const clientDomain = runtime.clientDomain;
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
    ({ roomId, seatToken, locale }: BindRoomInput) =>
      clientDomain.bootstrap({
        route: { roomId },
        principal: seatToken ? { seatToken } : {},
        surface: runtime.surface,
        locale: locale || browserLanguage(),
      }),
    [clientDomain, runtime.surface],
  );
  const dispatch = useCallback(
    (intent: StarcraftTmgClientIntent) => clientDomain.dispatch(intent),
    [clientDomain],
  );
  const refresh = useCallback(
    () => clientDomain.dispatch({ type: "refresh" }),
    [clientDomain],
  );

  const value = useMemo<Level3ClientDomainContextValue>(
    () => ({ view, connection, bindRoom, dispatch, refresh }),
    [view, connection, bindRoom, dispatch, refresh],
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
  StarcraftTmgClientIntent,
  StarcraftTmgClientView,
  StarcraftTmgExpoConnection,
};
