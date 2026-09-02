---
status: accepted
---

# Expo and Battle Lab share one Client Domain Module

Expo remains the canonical Web/Android/iOS player shell and Battle Lab remains
the developer, Referee, and Agent-observability surface. Both consume one deep
Client Domain Module whose small intent-and-projection interface hides
transport, cache, revision, reconnect, and receipt mechanics; neither surface
owns Rules or room state. Platform capability Adapters retain storage,
lifecycle, deep-link, sharing, clipboard, haptic, and secure credential-ingress
differences. Capacitor is rejected because Expo already spans the required
player platforms, and adding a third lifecycle would create another migration
and state-ownership seam without product leverage. Historical AsyncStorage,
room URLs, APK behavior, and generated artifacts enter only through labeled
compatibility imports or evidence receipts and never silently become authority.
