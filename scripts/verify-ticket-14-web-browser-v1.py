#!/usr/bin/env python3

from __future__ import annotations

import hashlib
import importlib.metadata
import json
import os
import re
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright


ROOT = Path(__file__).resolve().parent.parent
BUILD_ROOT = ROOT / "build" / "ticket-14-slice-136-web-static-v1"
EVIDENCE_ROOT = BUILD_ROOT / "browser-evidence"
REPORT_PATH = BUILD_ROOT / "browser-acceptance-report.json"
PLAYWRIGHT_VERSION = "1.59.0"
CONNECT_TIMEOUT_MS = int(os.environ.get("TICKET14_BROWSER_CONNECT_TIMEOUT_MS", "120000"))
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 1000},
    "tablet": {"width": 1024, "height": 1366},
    "mobile": {"width": 390, "height": 844},
}
THREAT_LAYER_SELECTOR = "[data-authoritative-threat-layer], [data-threat-reference]"
BATTLE_LAB_DETAIL_PANELS = (
    "unit", "actions", "threat", "status", "markers", "referee", "agent", "harness",
)


def require(condition: bool, code: str) -> None:
    if not condition:
        raise AssertionError(code)


def sha256_file(filename: Path) -> str:
    digest = hashlib.sha256()
    with filename.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def artifact(filename: Path) -> dict[str, Any]:
    return {
        "path": str(filename.relative_to(ROOT)),
        "byteLength": filename.stat().st_size,
        "sha256": sha256_file(filename),
    }


def canonical_hash(value: Any) -> str:
    body = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def installed_chromium_executable() -> Path:
    cache_root = Path.home() / "Library" / "Caches" / "ms-playwright"
    candidates = sorted(
        cache_root.glob(
            "chromium_headless_shell-*/chrome-headless-shell-mac-*/chrome-headless-shell"
        ),
        reverse=True,
    )
    require(bool(candidates), "PINNED_CHROMIUM_EXECUTABLE_MISSING")
    return candidates[0]


class FixtureServer:
    def __init__(self, production: bool = False) -> None:
        command = ["node", str(ROOT / "scripts/serve-ticket-14-web-acceptance-v1.mjs")]
        if production:
            command.append("--production")
        self.process = subprocess.Popen(
            command,
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        require(self.process.stdout is not None, "FIXTURE_STDOUT_UNAVAILABLE")
        startup_line = self.process.stdout.readline()
        if not startup_line:
            stderr = self.process.stderr.read() if self.process.stderr else ""
            raise RuntimeError(f"FIXTURE_START_FAILED:{stderr[-1000:]}")
        self.startup = json.loads(startup_line)
        self.origin = self.startup["origin"]

    def close(self) -> None:
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.communicate(timeout=5)
        require(self.process.returncode in (0, -15), f"FIXTURE_EXIT_INVALID:{self.process.returncode}")


def attach_error_capture(page: Page) -> list[str]:
    errors: list[str] = []

    def console(message: Any) -> None:
        if message.type == "error":
            errors.append(f"console:{message.text}")

    page.on("console", console)
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))
    return errors


def static_dev_hmr_errors(errors: list[str]) -> list[str]:
    allowed = (
        "WebSocket connection to '",
        "/hot' failed: Error during WebSocket handshake: Unexpected response code: 404",
        "/message' failed: Error during WebSocket handshake: Unexpected response code: 404",
    )
    return [
        error for error in errors
        if not (
            allowed[0] in error
            and (allowed[1] in error or allowed[2] in error)
        )
    ]


def wait_connected(page: Page) -> None:
    try:
        page.get_by_text(
            re.compile(r"^(Authoritative room connected|已连接权威房间)$")
        ).first.wait_for(
            state="visible", timeout=CONNECT_TIMEOUT_MS
        )
    except Exception as error:
        diagnostic = page.evaluate(
            """() => ({
              title: document.title,
              pathname: location.pathname,
              bodyText: (document.body?.innerText || '').slice(0, 2400),
              scriptCount: document.scripts.length,
              rootBytes: document.querySelector('#root')?.innerHTML.length || 0,
              online: navigator.onLine,
              initialUrlShape: globalThis.__ticket14InitialUrlShape || null,
            })"""
        )
        diagnostic["bodyText"] = re.sub(
            r"[A-Za-z0-9_-]{43}", "[REDACTED_CAPABILITY]", diagnostic["bodyText"]
        )
        raise AssertionError(
            f"AUTHORITATIVE_CONNECTION_TIMEOUT:{json.dumps(diagnostic, ensure_ascii=False)}"
        ) from error


def open_authoritative_actions(page: Page) -> None:
    page.get_by_role(
        "button", name=re.compile(r"^(Actions|行动)$"), exact=True
    ).click()
    page.get_by_role(
        "button", name="Load LegalSpace", exact=True
    ).wait_for(state="visible", timeout=30_000)


def body_text(page: Page) -> str:
    return page.locator("body").inner_text(timeout=30_000)


def revision_from_body(page: Page) -> int:
    revision = page.locator(
        '[aria-label^="State revision "], [aria-label^="状态修订 "]'
    ).first
    label = revision.get_attribute("aria-label") or ""
    match = re.search(r"(?:State revision|状态修订)\s+(\d+)", label)
    require(match is not None, "STATE_REVISION_NOT_RENDERED")
    return int(match.group(1))


def scrub_metrics(page: Page, token: str) -> dict[str, Any]:
    page.wait_for_function(
        """() => location.hash === ''
          && !new URL(location.href).searchParams.has('side')
          && !new URL(location.href).searchParams.has('role')""",
        timeout=30_000,
    )
    parsed = urlparse(page.url)
    stores = page.evaluate(
        """() => ({
          local: Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)]),
          session: Object.keys(sessionStorage).map((key) => [key, sessionStorage.getItem(key)]),
          bootstrapCaptureDeleted: typeof globalThis.__PROJECT_D_INITIAL_ROOM_URL__ === 'undefined',
        })"""
    )
    serialized = json.dumps(stores, ensure_ascii=False, sort_keys=True)
    require(token not in page.url, "RECOVERY_TOKEN_RETAINED_IN_URL")
    require(token not in serialized, "RECOVERY_TOKEN_PERSISTED_IN_WEB_STORAGE")
    require(token not in body_text(page), "RECOVERY_TOKEN_RENDERED_IN_DOCUMENT")
    require(stores["bootstrapCaptureDeleted"], "INITIAL_ROOM_URL_CAPTURE_NOT_DELETED")
    require(parsed.fragment == "", "ROOM_FRAGMENT_NOT_SCRUBBED")
    require("side" not in parse_qs(parsed.query), "SIDE_CLAIM_NOT_SCRUBBED")
    require("role" not in parse_qs(parsed.query), "ROLE_CLAIM_NOT_SCRUBBED")
    return {
        "fragmentScrubbedBeforeEvidence": True,
        "authorityClaimsScrubbed": ["side", "role"],
        "credentialPersisted": False,
        "bootstrapCaptureDeleted": True,
        "localStorageEntryCount": len(stores["local"]),
        "sessionStorageEntryCount": len(stores["session"]),
    }


def viewport_metrics(page: Page) -> dict[str, Any]:
    surface = page.locator(
        '[aria-label^="Battlefield;"], [aria-label^="战场；"]'
    ).first
    surface.wait_for(state="visible", timeout=30_000)
    board = surface.locator("svg").first
    board.wait_for(state="visible", timeout=30_000)
    metrics = board.evaluate(
        """(node) => {
          const rect = node.getBoundingClientRect();
          const matrix = node.getScreenCTM();
          return {
            viewBox: node.getAttribute('viewBox'),
            preserveAspectRatio: node.getAttribute('preserveAspectRatio'),
            widthPixels: rect.width,
            heightPixels: rect.height,
            scaleX: matrix ? Math.hypot(matrix.a, matrix.b) : null,
            scaleY: matrix ? Math.hypot(matrix.c, matrix.d) : null,
            renderedBaseShapeCount: node.querySelectorAll('ellipse,rect').length - 1,
            modelTokenCount: node.querySelectorAll('g[id^="battlefield-model-"]').length,
            invalidBaseEdgeCount: node.querySelectorAll('[id^="battlefield-invalid-base-model-"]').length,
            modelPortraitCount: node.querySelectorAll('g[id^="battlefield-model-"] > image').length,
            displayMapCount: node.querySelectorAll('#battlefield-display-map-v1').length,
            terrainCount: node.querySelectorAll('[id^="battlefield-terrain-"]').length,
            threatReferenceCount: node.querySelectorAll('#battlefield-threat-reference-v1').length,
            pageScrollWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
          };
        }"""
    )
    require(metrics["viewBox"] == "0 0 54000 36000", "BATTLEFIELD_PHYSICAL_VIEWBOX_DRIFT")
    require(metrics["preserveAspectRatio"] == "xMidYMid meet", "BATTLEFIELD_ASPECT_POLICY_DRIFT")
    require(metrics["widthPixels"] <= metrics["viewportWidth"] + 1, "BATTLEFIELD_VIEWPORT_OVERFLOW")
    require(metrics["pageScrollWidth"] <= metrics["viewportWidth"] + 1, "PAGE_HORIZONTAL_OVERFLOW")
    require(metrics["scaleX"] is not None and metrics["scaleY"] is not None, "BATTLEFIELD_SCALE_UNAVAILABLE")
    scale_delta = abs(metrics["scaleX"] - metrics["scaleY"])
    require(scale_delta <= 0.000001, "BATTLEFIELD_NON_UNIFORM_SCALE")
    require(metrics["renderedBaseShapeCount"] >= 30, "BATTLEFIELD_MODEL_BASE_DENOMINATOR_MISSING")
    require(metrics["modelTokenCount"] >= 30, "BATTLEFIELD_MODEL_TOKEN_DENOMINATOR_MISSING")
    require(metrics["invalidBaseEdgeCount"] == 0, "BATTLEFIELD_BASE_EDGE_OUTSIDE_BOARD")
    require(metrics["modelPortraitCount"] == metrics["modelTokenCount"], "BATTLEFIELD_MODEL_PORTRAIT_DENOMINATOR_MISMATCH")
    require(metrics["displayMapCount"] == 1, "BATTLEFIELD_DISPLAY_MAP_MISSING")
    require(metrics["terrainCount"] == 7, "BATTLEFIELD_AUTHORITY_TERRAIN_MISSING")
    require(metrics["threatReferenceCount"] == 0, "BATTLEFIELD_THREAT_REFERENCE_NOT_DEFAULT_OFF")
    load_button = page.get_by_role("button", name="Load LegalSpace", exact=True)
    target = load_button.bounding_box()
    require(target is not None, "LEGALSPACE_CONTROL_NOT_MEASURABLE")
    require(target["height"] >= 43.5 and target["width"] >= 43.5, "TOUCH_TARGET_BELOW_44PX")
    return {
        **metrics,
        "scaleDelta": scale_delta,
        "physicalScaleUniform": True,
        "criticalTouchTarget": {
            "widthPixels": target["width"],
            "heightPixels": target["height"],
        },
    }


def save_video(page: Page, destination: Path) -> dict[str, Any]:
    require(page.video is not None, "VIDEO_CAPTURE_UNAVAILABLE")
    generated = Path(page.video.path())
    generated.replace(destination)
    return artifact(destination)


def run_production_observer(browser: Browser, checks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    fixture = FixtureServer(production=True)
    context = browser.new_context(
        viewport=VIEWPORTS["desktop"],
        locale="en-US",
        color_scheme="dark",
        reduced_motion="reduce",
    )
    page = context.new_page()
    errors = attach_error_capture(page)
    trace_path = EVIDENCE_ROOT / "production-public-observer-trace.zip"
    screenshot_path = EVIDENCE_ROOT / "production-public-observer.png"
    artifacts: list[dict[str, Any]] = []
    try:
        context.tracing.start(screenshots=True, snapshots=True, sources=False)
        room_id = fixture.startup["roomIds"]["productionObserver"]
        page.goto(
            f"{fixture.origin}/room/{room_id}?side=player2&role=opponent",
            wait_until="domcontentloaded",
            timeout=120_000,
        )
        wait_connected(page)
        page.wait_for_timeout(500)
        page.get_by_role("button", name=re.compile(r"^(Room & rules|房间与规则)$")).click()
        text = body_text(page)
        require(
            "Ingress status\npublic_observer" in text or "入口状态\npublic_observer" in text,
            "PRODUCTION_PUBLIC_OBSERVER_NOT_BOUND",
        )
        require(
            "Ignored URL claims\n2" in text or "忽略 URL 声明\n2" in text,
            "PRODUCTION_AUTHORITY_CLAIMS_NOT_AUDITED",
        )
        require("Seat\n—" in text or "席位\n—" in text, "PUBLIC_OBSERVER_GAINED_SEAT")
        page.get_by_role("button", name=re.compile(r"^(Battlefield|战桌)$")).click()
        open_authoritative_actions(page)
        require(page.get_by_role("button", name="Load LegalSpace", exact=True).is_disabled(), "PUBLIC_OBSERVER_MUTATION_ENABLED")
        require(urlparse(page.url).fragment == "", "PRODUCTION_FRAGMENT_NOT_EMPTY")
        require(not errors, f"PRODUCTION_BROWSER_ERRORS:{errors}")
        page.locator('[aria-label^="Battlefield;"], [aria-label^="战场；"]').first.scroll_into_view_if_needed()
        page.screenshot(path=screenshot_path, full_page=True)
        context.tracing.stop(path=trace_path)
        artifacts.extend([artifact(screenshot_path), artifact(trace_path)])
        checks.append({
            "id": "production_public_observer_deep_link",
            "passed": True,
            "authorityClaimsIgnored": 2,
            "mutationsEnabled": False,
            "consoleOrPageErrors": 0,
        })
    finally:
        context.close()
        fixture.close()
    return artifacts


def run_expo_viewport(
    browser: Browser,
    fixture: FixtureServer,
    viewport_name: str,
    checks: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], str]:
    viewport = VIEWPORTS[viewport_name]
    video_dir = EVIDENCE_ROOT / f"video-{viewport_name}"
    video_dir.mkdir(parents=True, exist_ok=True)
    context = browser.new_context(
        viewport=viewport,
        locale="en-US",
        color_scheme="dark",
        reduced_motion="reduce",
        record_video_dir=video_dir,
        record_video_size=viewport,
    )
    context.add_init_script(
        """(() => {
          const raw = location.hash.startsWith('#') ? location.hash.slice(1) : '';
          const separator = raw.indexOf('=');
          const key = separator >= 0 ? raw.slice(0, separator) : raw;
          const value = separator >= 0 ? raw.slice(separator + 1) : '';
          globalThis.__ticket14InitialUrlShape = {
            hashPresent: Boolean(raw),
            key,
            valueLength: value.length,
            valueUrlSafe: /^[A-Za-z0-9_-]+$/.test(value),
          };
        })();"""
    )
    page = context.new_page()
    errors = attach_error_capture(page)
    room_id = fixture.startup["roomIds"][viewport_name]
    token = fixture.startup["credentials"][room_id]["recoveryToken"]
    screenshot_path = EVIDENCE_ROOT / f"expo-{viewport_name}.png"
    video_path = EVIDENCE_ROOT / f"expo-{viewport_name}.webm"
    artifacts: list[dict[str, Any]] = []
    scrubbed: dict[str, Any] = {}
    metrics: dict[str, Any] = {}
    try:
        page.goto(
            f"{fixture.origin}/room/{room_id}?side=player2&role=opponent#recovery={token}",
            wait_until="domcontentloaded",
            timeout=120_000,
        )
        wait_connected(page)
        scrubbed = scrub_metrics(page, token)
        open_authoritative_actions(page)
        metrics = viewport_metrics(page)
        page.get_by_role("button", name=re.compile(r"^(Adjutant|副官)$")).click()
        require(page.get_by_label(re.compile(r"^(Tactical Adjutant|战术副官)$")).is_visible(),
                "EXPO_ADJUTANT_SURFACE_UNREACHABLE")
        page.get_by_role("button", name=re.compile(r"^(Room & rules|房间与规则)$")).click()
        text = body_text(page)
        require(
            "Role mode\nplayer" in text or "角色模式\nplayer" in text,
            "RECOVERED_ROLE_NOT_SERVER_BOUND",
        )
        require("Seat\nplayer1" in text or "席位\nplayer1" in text, "RECOVERED_SIDE_NOT_SERVER_BOUND")
        require(
            "Ignored URL claims\n2" in text or "忽略 URL 声明\n2" in text,
            "RECOVERED_AUTHORITY_CLAIMS_NOT_AUDITED",
        )
        page.get_by_role("button", name=re.compile(r"^(Battlefield|战桌)$")).click()
        page.locator(
            '[aria-label^="Battlefield;"], [aria-label^="战场；"]'
        ).first.wait_for(state="visible", timeout=30_000)
        open_authoritative_actions(page)

        if viewport_name == "desktop":
            load = page.get_by_role("button", name="Load LegalSpace", exact=True)
            load.focus()
            page.keyboard.press("Enter")
            page.get_by_text(
                re.compile(r"^(LegalSpace loaded for the current revision\.|已加载当前修订的 LegalSpace。)$")
            ).wait_for(
                state="visible", timeout=60_000
            )
            page.get_by_role(
                "button", name=re.compile(r"^(Preview|生成 Preview)$")
            ).first.click()
            page.get_by_text(
                re.compile(r"^(Sealed Preview awaiting human confirmation|密封 Preview，等待真人确认)$")
            ).wait_for(
                state="visible", timeout=60_000
            )
            before_revision = revision_from_body(page)
            page.get_by_role(
                "button", name=re.compile(r"^(Confirm and apply|确认并应用)$")
            ).click()
            page.get_by_text(
                re.compile(r"^(Action applied; replay chain matches current authority\.|动作已应用，重放链与当前状态一致。)$")
            ).wait_for(
                state="visible", timeout=90_000
            )
            after_revision = revision_from_body(page)
            require(after_revision == before_revision + 1, "APPLY_DID_NOT_ADVANCE_STATE_ONCE")
            receipt_text = body_text(page)
            require(
                "Receipt & replay" in receipt_text or "收据与重放" in receipt_text,
                "RECEIPT_NOT_RENDERED",
            )
            require("matches current: true" in receipt_text, "REPLAY_DID_NOT_MATCH_CURRENT")
            page.get_by_role(
                "button", name=re.compile(r"^(Actions|行动)$")
            ).click()
            load = page.get_by_role("button", name="Load LegalSpace", exact=True)

            context.set_offline(True)
            page.evaluate("window.dispatchEvent(new Event('offline'))")
            page.get_by_text(re.compile(r"^(Offline read-only|离线只读)$")).first.wait_for(
                state="visible", timeout=30_000
            )
            require(load.is_disabled(), "OFFLINE_LEGALSPACE_CONTROL_ENABLED")
            offline_revision = revision_from_body(page)
            context.set_offline(False)
            page.evaluate("window.dispatchEvent(new Event('online'))")
            wait_connected(page)
            page.wait_for_timeout(500)
            require(revision_from_body(page) == offline_revision, "OFFLINE_RECONNECT_QUEUED_MUTATION")
            checks.append({
                "id": "expo_authoritative_keyboard_apply_replay_offline_reconnect",
                "passed": True,
                "keyboardActivation": "Enter",
                "stateRevisionBefore": before_revision,
                "stateRevisionAfter": after_revision,
                "offlineWriteQueued": False,
                "reconnectedToAuthority": True,
            })

        unexpected_errors = static_dev_hmr_errors(errors)
        require(
            not unexpected_errors,
            f"EXPO_{viewport_name.upper()}_BROWSER_ERRORS:{unexpected_errors}",
        )
        page.locator(
            '[aria-label^="Battlefield;"], [aria-label^="战场；"]'
        ).first.scroll_into_view_if_needed()
        page.screenshot(path=screenshot_path, full_page=True)
        artifacts.append(artifact(screenshot_path))
        checks.append({
            "id": f"expo_{viewport_name}_responsive_accessibility",
            "passed": True,
            "viewport": viewport,
            "roomAccess": scrubbed,
            "battlefield": metrics,
            "verifiedSurfaces": ["battlefield", "adjutant", "room_and_rules"],
            "consoleOrPageErrors": len(errors),
            "expectedStaticDevHmrErrors": len(errors),
            "unexpectedConsoleOrPageErrors": 0,
        })
    finally:
        page.close()
        save_video(page, video_path)
        context.close()
    artifacts.append(artifact(video_path))
    return artifacts, token


def battle_lab_metrics(page: Page) -> dict[str, Any]:
    return page.locator("[data-board]").evaluate(
        """(node) => {
          const rect = node.getBoundingClientRect();
          const matrix = node.getScreenCTM();
          const buttons = [...document.querySelectorAll('button')].map((button) => {
            const bounds = button.getBoundingClientRect();
            return { width: bounds.width, height: bounds.height, disabled: button.disabled };
          }).filter((entry) => entry.width > 0 && entry.height > 0);
          const models = [...node.querySelectorAll('[data-model-id]')].map((model) => ({
            id: model.getAttribute('data-model-id'),
            minX: Number(model.getAttribute('data-base-min-x')),
            maxX: Number(model.getAttribute('data-base-max-x')),
            minY: Number(model.getAttribute('data-base-min-y')),
            maxY: Number(model.getAttribute('data-base-max-y')),
          })).filter((model) => [model.minX, model.maxX, model.minY, model.maxY].every(Number.isFinite));
          const overlappingBasePairs = [];
          for (let index = 0; index < models.length; index += 1) {
            for (let otherIndex = index + 1; otherIndex < models.length; otherIndex += 1) {
              const left = models[index];
              const right = models[otherIndex];
              if (left.minX < right.maxX && left.maxX > right.minX
                && left.minY < right.maxY && left.maxY > right.minY) {
                overlappingBasePairs.push(`${left.id}:${right.id}`);
              }
            }
          }
          const visibleDetailPanels = [...document.querySelectorAll('[data-detail-panel]')]
            .filter((panel) => !panel.hidden && getComputedStyle(panel).display !== 'none');
          return {
            viewBox: node.getAttribute('viewBox'),
            preserveAspectRatio: node.getAttribute('preserveAspectRatio'),
            widthPixels: rect.width,
            viewportWidth: window.innerWidth,
            pageScrollWidth: document.documentElement.scrollWidth,
            scaleX: matrix ? Math.hypot(matrix.a, matrix.b) : null,
            scaleY: matrix ? Math.hypot(matrix.c, matrix.d) : null,
            minimumButtonHeight: Math.min(...buttons.map((entry) => entry.height)),
            minimumButtonWidth: Math.min(...buttons.map((entry) => entry.width)),
            modelBaseCount: node.querySelectorAll('[data-model-id]').length,
            invalidBaseEdgeCount: node.querySelectorAll('[data-base-edge-valid="false"]').length,
            baseBoundsCount: models.length,
            overlappingBasePairs,
            displayMapCount: node.querySelectorAll('[data-display-only-map="true"]').length,
            terrainCount: node.querySelectorAll('[data-area-kind="terrain"]').length,
            unitPortraitCount: node.querySelectorAll('[data-model-id] image').length,
            shapeClippedCoverPortraitCount: node.querySelectorAll('[data-portrait-fit="shape-clipped-cover"]').length,
            portraitClipPathCount: node.querySelectorAll('clipPath[id^="model-portrait-clip-"]').length,
            threatReferenceCount: node.querySelectorAll('[data-threat-reference]').length,
            authoritativeThreatLayerCount: node.querySelectorAll('[data-authoritative-threat-layer]').length,
            detailTabCount: document.querySelectorAll('[data-detail-tab]').length,
            detailTabNames: [...document.querySelectorAll('[data-detail-tab]')]
              .map((tab) => tab.dataset.detailTab).sort(),
            visibleDetailPanelCount: visibleDetailPanels.length,
            activeDetailPanel: document.querySelector('.right-rail')?.dataset.activePanel || null,
            pageScrollHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight,
            overflowingElements: [...document.body.querySelectorAll('*')]
              .map((element) => {
                const bounds = element.getBoundingClientRect();
                return {
                  tag: element.tagName,
                  className: String(element.className || '').slice(0, 100),
                  left: bounds.left,
                  right: bounds.right,
                  width: bounds.width,
                  text: ['INPUT', 'TEXTAREA'].includes(element.tagName)
                    ? '[FORM_CONTROL]'
                    : String(element.textContent || '').trim().slice(0, 80),
                };
              })
              .filter((entry) => entry.left < -1 || entry.right > window.innerWidth + 1)
              .slice(0, 12),
          };
        }"""
    )


def bind_battle_lab(
    page: Page,
    fixture: FixtureServer,
    errors: list[str],
) -> str:
    room_id = fixture.startup["roomIds"]["battleLab"]
    seat_token = fixture.startup["credentials"][room_id]["seatToken"]
    page.get_by_label("Room ID").fill(room_id)
    page.get_by_label("Seat token · memory only").fill(seat_token)
    page.get_by_role("button", name="Bind room", exact=True).click()
    try:
        page.locator("[data-room-title]").filter(has_text=room_id).wait_for(
            state="visible", timeout=60_000
        )
    except Exception as error:
        diagnostic = {
            "title": page.locator("[data-room-title]").inner_text(timeout=5_000),
            "toast": page.locator("[data-toast]").inner_text(timeout=5_000),
            "connection": page.locator("[data-connection]").inner_text(timeout=5_000),
            "errors": errors,
        }
        raise AssertionError(
            f"BATTLE_LAB_BIND_TIMEOUT:{json.dumps(diagnostic, ensure_ascii=False)}"
        ) from error
    require(page.get_by_label("Seat token · memory only").input_value() == "", "BATTLE_LAB_TOKEN_INPUT_NOT_CLEARED")
    require(seat_token not in body_text(page), "BATTLE_LAB_TOKEN_RENDERED")
    return seat_token


def run_battle_lab(
    browser: Browser,
    fixture: FixtureServer,
    checks: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[str]]:
    artifacts: list[dict[str, Any]] = []
    observed_tokens: list[str] = []
    for viewport_name in ("desktop", "mobile"):
        threat_opt_in_proven = False
        context = browser.new_context(
            viewport=VIEWPORTS[viewport_name],
            locale="en-US",
            color_scheme="dark",
            reduced_motion="reduce",
        )
        page = context.new_page()
        errors = attach_error_capture(page)
        screenshot_path = EVIDENCE_ROOT / f"battle-lab-{viewport_name}.png"
        try:
            page.goto(
                f"{fixture.origin}/apps/starcraft-tmg-battle-lab/",
                wait_until="domcontentloaded",
                timeout=60_000,
            )
            token = bind_battle_lab(page, fixture, errors)
            observed_tokens.append(token)
            require(page.locator('[data-detail-panel]:visible').count() == 1,
                    "BATTLE_LAB_DETAIL_PANELS_STACKED")
            for panel_name in BATTLE_LAB_DETAIL_PANELS:
                page.locator(f'[data-detail-tab="{panel_name}"]').click()
                require(page.locator(f'[data-detail-panel="{panel_name}"]').is_visible(),
                        f"BATTLE_LAB_DETAIL_PANEL_UNREACHABLE:{panel_name}")
            if viewport_name == "desktop":
                board = page.locator("[data-board]")
                require(page.locator("[data-threat-toggle]").is_checked() is False,
                        "THREAT_REFERENCE_MUST_DEFAULT_OFF")
                require(board.locator(THREAT_LAYER_SELECTOR).count() == 0,
                        "THREAT_LAYER_RENDERED_BY_DEFAULT")
                first_model = board.locator("[data-model-id] [role=button]").first
                first_model.click()
                selected_portrait = page.locator("[data-selected-portrait]")
                selected_portrait.wait_for(state="visible", timeout=30_000)
                require(selected_portrait.evaluate(
                    "(image) => image.complete && image.naturalWidth > 0"
                ), "DYNAMIC_UNIT_PORTRAIT_DID_NOT_LOAD")
                page.locator("[data-threat-toggle]").check()
                require(board.locator("[data-authoritative-threat-layer]").count() >= 1,
                        "SELECTED_AUTHORITATIVE_THREAT_LAYER_NOT_RENDERED")
                threat_opt_in_proven = True
                page.get_by_role("button", name="Enable voices", exact=True).click()
                first_model.click()
                page.wait_for_function(
                    "document.querySelector('[data-media-status]')?.dataset.voicePlayback === 'playing'",
                    timeout=30_000,
                )
                bgm_fixture = ROOT / "assets/client/battlefield/voice/development-internal/marine/TerranMarineWhat00SC1.ogg"
                page.locator("[data-bgm-file]").set_input_files(bgm_fixture)
                page.get_by_role("button", name="Play BGM", exact=True).click()
                page.wait_for_function(
                    "document.querySelector('[data-media-status]')?.dataset.bgmPlayback === 'playing'",
                    timeout=30_000,
                )
                page.get_by_role("button", name="Load LegalSpace", exact=True).click()
                page.locator("[data-actions] .action").first.wait_for(state="visible", timeout=60_000)
                page.locator("[data-actions] .action button", has_text="Preview").first.click()
                page.get_by_text("Sealed Preview awaiting human confirmation", exact=True).wait_for(
                    state="visible", timeout=60_000
                )
                page.get_by_role(
                    "button", name="Confirm and apply current sealed preview", exact=True
                ).click()
                page.get_by_text("Confirmed action applied and replay checked", exact=True).wait_for(
                    state="visible", timeout=90_000
                )
                page.get_by_role("button", name="Verify replay", exact=True).click()
                page.get_by_text("Replay projection verified", exact=True).wait_for(
                    state="visible", timeout=60_000
                )
                require("state 1" in body_text(page), "BATTLE_LAB_STATE_REVISION_NOT_ADVANCED")
                require("verified view" in body_text(page), "BATTLE_LAB_REPLAY_NOT_RENDERED")
                page.locator('[data-detail-tab="agent"]').click()
                require("not_mounted_ticket_15" in body_text(page), "BATTLE_LAB_AGENT_BOUNDARY_DRIFT")
                page.locator('[data-detail-tab="referee"]').click()
                page.locator("[data-threat-toggle]").uncheck()
                require(board.locator(THREAT_LAYER_SELECTOR).count() == 0,
                        "THREAT_LAYER_DID_NOT_RETURN_TO_HIDDEN")
            metrics = battle_lab_metrics(page)
            require(metrics["viewBox"] == "0 0 54000 36000", "BATTLE_LAB_VIEWBOX_DRIFT")
            require(metrics["preserveAspectRatio"] == "xMidYMid meet", "BATTLE_LAB_ASPECT_POLICY_DRIFT")
            require(
                metrics["pageScrollWidth"] <= metrics["viewportWidth"] + 1,
                f"BATTLE_LAB_HORIZONTAL_OVERFLOW:{json.dumps(metrics['overflowingElements'], ensure_ascii=False)}",
            )
            require(abs(metrics["scaleX"] - metrics["scaleY"]) <= 0.000001, "BATTLE_LAB_NON_UNIFORM_SCALE")
            require(metrics["modelBaseCount"] >= 30, "BATTLE_LAB_MODEL_BASES_MISSING")
            require(metrics["invalidBaseEdgeCount"] == 0, "BATTLE_LAB_BASE_EDGE_OUTSIDE_BOARD")
            require(metrics["baseBoundsCount"] == metrics["modelBaseCount"],
                    "BATTLE_LAB_BASE_BOUNDS_DENOMINATOR_MISMATCH")
            require(not metrics["overlappingBasePairs"],
                    f"BATTLE_LAB_MODEL_BASES_OVERLAP:{metrics['overlappingBasePairs']}")
            require(metrics["displayMapCount"] == 1, "BATTLE_LAB_DISPLAY_MAP_MISSING")
            require(metrics["terrainCount"] == 7, "BATTLE_LAB_AUTHORITY_TERRAIN_MISSING")
            require(metrics["unitPortraitCount"] == metrics["modelBaseCount"],
                    "BATTLE_LAB_MODEL_PORTRAIT_DENOMINATOR_MISMATCH")
            require(metrics["shapeClippedCoverPortraitCount"] == metrics["modelBaseCount"],
                    "BATTLE_LAB_PORTRAIT_FIT_POLICY_DRIFT")
            require(metrics["portraitClipPathCount"] == metrics["modelBaseCount"],
                    "BATTLE_LAB_PORTRAIT_CLIP_DENOMINATOR_MISMATCH")
            require(metrics["threatReferenceCount"] == 0,
                    "BATTLE_LAB_THREAT_REFERENCE_NOT_HIDDEN_AT_REST")
            require(metrics["authoritativeThreatLayerCount"] == 0,
                    "BATTLE_LAB_AUTHORITATIVE_THREAT_NOT_HIDDEN_AT_REST")
            require(metrics["detailTabCount"] == len(BATTLE_LAB_DETAIL_PANELS),
                    "BATTLE_LAB_DETAIL_TAB_DENOMINATOR_DRIFT")
            require(metrics["detailTabNames"] == sorted(BATTLE_LAB_DETAIL_PANELS),
                    f"BATTLE_LAB_DETAIL_TAB_IDENTITY_DRIFT:{metrics['detailTabNames']}")
            require(metrics["visibleDetailPanelCount"] == 1, "BATTLE_LAB_DETAIL_PANELS_STACKED")
            require(metrics["minimumButtonHeight"] >= 43.5, "BATTLE_LAB_TOUCH_TARGET_HEIGHT_BELOW_44PX")
            require(metrics["minimumButtonWidth"] >= 43.5, "BATTLE_LAB_TOUCH_TARGET_WIDTH_BELOW_44PX")
            require(not errors, f"BATTLE_LAB_{viewport_name.upper()}_BROWSER_ERRORS:{errors}")
            page.wait_for_timeout(2_600)
            page.screenshot(path=screenshot_path, full_page=False)
            artifacts.append(artifact(screenshot_path))
            checks.append({
                "id": f"battle_lab_{viewport_name}_shared_domain_mount",
                "passed": True,
                "viewport": VIEWPORTS[viewport_name],
                "battlefield": metrics,
                "credentialInputCleared": True,
                "consoleOrPageErrors": 0,
                "agentRuntimeMounted": False,
                "mediaPlayback": {
                    "voice": page.locator("[data-media-status]").get_attribute("data-voice-playback"),
                    "bgm": page.locator("[data-media-status]").get_attribute("data-bgm-playback"),
                    "threatOptInRendered": threat_opt_in_proven,
                },
            })
        finally:
            context.close()
    return artifacts, observed_tokens


def secret_scan(tokens: list[str], artifacts: list[dict[str, Any]]) -> None:
    for descriptor in artifacts:
        body = (ROOT / descriptor["path"]).read_bytes()
        for token in tokens:
            require(token.encode("utf-8") not in body, f"CAPABILITY_LEAKED_TO_ARTIFACT:{descriptor['path']}")


def main() -> None:
    observed_playwright = importlib.metadata.version("playwright")
    require(observed_playwright == PLAYWRIGHT_VERSION, f"PLAYWRIGHT_VERSION_DRIFT:{observed_playwright}")
    require((BUILD_ROOT / "production-build-receipt.json").is_file(), "PRODUCTION_BUILD_RECEIPT_MISSING")
    require((BUILD_ROOT / "acceptance-build-receipt.json").is_file(), "ACCEPTANCE_BUILD_RECEIPT_MISSING")
    if EVIDENCE_ROOT.exists():
        shutil.rmtree(EVIDENCE_ROOT)
    EVIDENCE_ROOT.mkdir(parents=True)
    checks: list[dict[str, Any]] = []
    artifacts: list[dict[str, Any]] = []
    secret_tokens: list[str] = []
    started = time.monotonic()

    with sync_playwright() as playwright:
        chromium_executable = installed_chromium_executable()
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=str(chromium_executable),
        )
        chromium_version = browser.version
        if os.environ.get("TICKET14_BROWSER_SKIP_PRODUCTION") != "1":
            artifacts.extend(run_production_observer(browser, checks))
        fixture = FixtureServer(production=False)
        try:
            if os.environ.get("TICKET14_BROWSER_ONLY_BATTLE_LAB") != "1":
                for viewport_name in VIEWPORTS:
                    viewport_artifacts, token = run_expo_viewport(
                        browser, fixture, viewport_name, checks
                    )
                    artifacts.extend(viewport_artifacts)
                    secret_tokens.append(token)
            battle_artifacts, battle_tokens = run_battle_lab(browser, fixture, checks)
            artifacts.extend(battle_artifacts)
            secret_tokens.extend(battle_tokens)
        finally:
            fixture.close()
            browser.close()

    generated_files = sorted(path for path in EVIDENCE_ROOT.rglob("*") if path.is_file())
    require(len(generated_files) == len(artifacts), "UNINDEXED_BROWSER_EVIDENCE_ARTIFACT")
    secret_scan(secret_tokens, artifacts)
    report_core = {
        "schemaVersion": "starcraft_tmg_ticket_14_slice_136_web_browser_acceptance_v1",
        "ticket": 14,
        "slice": 136,
        "denominator": {
            "productionPublicObserver": 1,
            "authenticatedExpoViewports": 3,
            "battleLabViewports": 2,
            "authoritativeApplyReplayFlows": 2,
            "offlineReconnectFlows": 1,
            "credentialLeakScans": len(artifacts),
        },
        "checks": checks,
        "artifacts": artifacts,
        "environment": {
            "playwright": observed_playwright,
            "chromium": chromium_version,
            "chromiumExecutableSha256": sha256_file(chromium_executable),
            "headless": True,
            "locale": "en-US",
            "reducedMotion": "reduce",
        },
        "security": {
            "fixtureBindAddress": "127.0.0.1",
            "roomCapabilitiesPersistedInReport": False,
            "authenticatedTraceCaptured": False,
            "artifactCapabilityScanPassed": True,
        },
        "boundaries": {
            "mockTransportUsed": False,
            "authoritativeRoomRuntimeUsed": True,
            "httpAdapterUsed": True,
            "providerInvoked": False,
            "skillGenerated": False,
            "dshInvoked": False,
            "muZeroTrainingTruth": False,
            "productionReady": False,
        },
        "elapsedSeconds": round(time.monotonic() - started, 3),
        "passed": all(check["passed"] for check in checks),
    }
    report_hash_scope = {
        "schemaVersion": report_core["schemaVersion"],
        "denominator": report_core["denominator"],
        "checkOutcomes": [
            {"id": check["id"], "passed": check["passed"]} for check in checks
        ],
        "artifacts": artifacts,
        "environment": report_core["environment"],
        "security": report_core["security"],
        "boundaries": report_core["boundaries"],
        "passed": report_core["passed"],
    }
    report = {
        **report_core,
        "reportHashScope": report_hash_scope,
        "reportHash": canonical_hash(report_hash_scope),
    }
    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(
        f"Ticket 14 Slice 136 browser acceptance: {len(checks)}/{len(checks)} checks; "
        f"{len(artifacts)} secret-scanned artifacts; report {report['reportHash']}"
    )


if __name__ == "__main__":
    main()
