import { type PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

const INITIAL_ROOM_URL_CAPTURE = `(() => {
  if (location.pathname === "/room" || location.pathname.startsWith("/room/")) {
    Object.defineProperty(window, "__PROJECT_D_INITIAL_ROOM_URL__", {
      configurable: true,
      enumerable: false,
      value: location.href,
      writable: true,
    });
  }
})();`;

/**
 * Capture a Web App Link before Expo Router normalizes its path/search/hash.
 * The Provider consumes and deletes this memory-only value before awaiting any
 * transport operation. It is never rendered or persisted.
 */
export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="color-scheme" content="dark" />
        <ScrollViewStyleReset />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: INITIAL_ROOM_URL_CAPTURE }} />
        {children}
      </body>
    </html>
  );
}
