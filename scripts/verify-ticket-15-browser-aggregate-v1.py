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
from urllib.parse import urlparse

from playwright.sync_api import Browser, BrowserContext, Page, Response, sync_playwright


ROOT = Path(__file__).resolve().parent.parent
BUILD_ROOT = ROOT / "build" / "ticket-15-slice-152-browser-aggregate-v1"
EVIDENCE_ROOT = BUILD_ROOT / "browser-evidence"
REPORT_PATH = BUILD_ROOT / "browser-report.json"
PLAYWRIGHT_VERSION = "1.59.0"
TIMEOUT_MS = int(os.environ.get("TICKET15_BROWSER_TIMEOUT_MS", "60000"))
FIXED_BROWSER_CHECKS = 11
EXPECTED_MODES = ("tutor", "opponent", "commentator", "companion")
FORBIDDEN_AGENT_HTTP_KEYS = {
    "apikey",
    "api_key",
    "authorization",
    "credential",
    "credentials",
    "providercredential",
    "providercredentials",
    "rawprompt",
    "promptartifact",
    "promptassembly",
    "usagereceipt",
    "providerusagereceipt",
}


def require(condition: bool, code: str) -> None:
    if not condition:
        raise AssertionError(code)


def canonical_hash(value: Any) -> str:
    body = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


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
    def __init__(self) -> None:
        self.process = subprocess.Popen(
            ["node", str(ROOT / "scripts/serve-ticket-15-browser-acceptance-v1.mjs")],
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
            raise RuntimeError(f"FIXTURE_START_FAILED:{stderr[-2000:]}")
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
        require(
            self.process.returncode in (0, -15),
            f"FIXTURE_EXIT_INVALID:{self.process.returncode}",
        )


def add_agent_cookie(context: BrowserContext, fixture: FixtureServer, scenario: str) -> None:
    auth = fixture.startup["agentAuth"]
    context.add_cookies(
        [
            {
                "name": auth["cookieName"],
                "value": auth["values"][scenario],
                "url": fixture.origin,
                "httpOnly": True,
                "secure": False,
                "sameSite": "Strict",
            }
        ]
    )


def body_text(page: Page) -> str:
    return page.locator("body").inner_text(timeout=TIMEOUT_MS)


def wait_agent_status(page: Page, status: str) -> None:
    page.wait_for_function(
        """expected => {
          const text = document.querySelector('[data-agent-status]')?.textContent || '';
          return text.startsWith(`${expected} ·`);
        }""",
        arg=status,
        timeout=TIMEOUT_MS,
    )


def wait_trace(page: Page, fragment: str) -> None:
    page.wait_for_function(
        """expected => (document.querySelector('[data-agent-traces]')?.innerText || '')
          .includes(expected)""",
        arg=fragment,
        timeout=TIMEOUT_MS,
    )


def command(page: Page, name: str):
    return page.locator(f'[data-command="{name}"]')


def open_session(page: Page, mode: str) -> None:
    page.locator("[data-agent-mode]").select_option(mode)
    command(page, "agent-open").click()
    wait_agent_status(page, "ready")
    require(command(page, "agent-send").is_enabled(), f"{mode.upper()}_SEND_DISABLED")


def send_turn(page: Page, intent: str, message: str, terminal_status: str = "ready") -> None:
    available = page.locator("[data-agent-intent] option").evaluate_all(
        "options => options.map(option => option.value)"
    )
    require(intent in available, f"AGENT_INTENT_OPTION_MISSING:{intent}:{available}")
    page.locator("[data-agent-intent]").select_option(intent)
    page.locator("[data-agent-message]").fill(message)
    command(page, "agent-send").click()
    wait_agent_status(page, terminal_status)


def end_session(page: Page) -> None:
    if not command(page, "agent-end").is_visible():
        page.locator('[data-detail-tab="agent"]').click()
    command(page, "agent-end").click()
    wait_agent_status(page, "ended")


def set_document_visibility(page: Page, state: str) -> None:
    page.evaluate(
        """state => {
          Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => state,
          });
          document.dispatchEvent(new Event('visibilitychange'));
        }""",
        state,
    )


def recursive_keys(value: Any) -> set[str]:
    keys: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            keys.add(re.sub(r"[^a-z0-9]", "", key.lower()))
            keys.update(recursive_keys(child))
    elif isinstance(value, list):
        for child in value:
            keys.update(recursive_keys(child))
    return keys


def recursive_values(value: Any, key_name: str) -> list[str]:
    values: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if key == key_name and isinstance(child, str):
                values.append(child)
            values.extend(recursive_values(child, key_name))
    elif isinstance(value, list):
        for child in value:
            values.extend(recursive_values(child, key_name))
    return values


def attach_network_capture(page: Page) -> tuple[list[dict[str, Any]], list[str]]:
    exchanges: list[dict[str, Any]] = []
    capture_errors: list[str] = []

    def capture(response: Response) -> None:
        if "/starcraft-tmg-level3/agent/api/v2/" not in response.url:
            return
        try:
            request_body = response.request.post_data_json
        except Exception:
            request_body = None
        try:
            response_body = response.json()
        except Exception as error:
            capture_errors.append(f"{response.status}:{type(error).__name__}")
            response_body = None
        exchanges.append(
            {
                "method": response.request.method,
                "status": response.status,
                "request": request_body,
                "response": response_body,
            }
        )

    page.on("response", capture)
    return exchanges, capture_errors


def check_record(checks: list[dict[str, Any]], check_id: str, **evidence: Any) -> None:
    checks.append({"id": check_id, "passed": True, **evidence})


def screenshot(page: Page, name: str, artifacts: list[dict[str, Any]]) -> None:
    filename = EVIDENCE_ROOT / name
    page.screenshot(path=filename, full_page=False)
    artifacts.append(artifact(filename))


def main() -> None:
    observed_playwright = importlib.metadata.version("playwright")
    require(
        observed_playwright == PLAYWRIGHT_VERSION,
        f"PLAYWRIGHT_VERSION_DRIFT:{observed_playwright}",
    )
    if EVIDENCE_ROOT.exists():
        shutil.rmtree(EVIDENCE_ROOT)
    EVIDENCE_ROOT.mkdir(parents=True)
    checks: list[dict[str, Any]] = []
    artifacts: list[dict[str, Any]] = []
    browser_errors: list[str] = []
    session_ids: set[str] = set()
    started = time.monotonic()
    fixture = FixtureServer()

    with sync_playwright() as playwright:
        executable = installed_chromium_executable()
        browser: Browser = playwright.chromium.launch(
            headless=True,
            executable_path=str(executable),
        )
        chromium_version = browser.version
        context = browser.new_context(
            viewport={"width": 1440, "height": 1000},
            locale="en-US",
            reduced_motion="reduce",
        )
        add_agent_cookie(context, fixture, "configured")
        page = context.new_page()
        page.on(
            "console",
            lambda message: browser_errors.append(f"console:{message.text}")
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: browser_errors.append(f"page:{error}"))
        page.on(
            "response",
            lambda response: browser_errors.append(
                f"http:{response.status}:{urlparse(response.url).path}"
            )
            if response.status >= 400
            else None,
        )
        exchanges, capture_errors = attach_network_capture(page)
        try:
            page.goto(
                f"{fixture.origin}/apps/starcraft-tmg-battle-lab/",
                wait_until="domcontentloaded",
                timeout=TIMEOUT_MS,
            )
            page.locator("[data-room-id]").fill(fixture.startup["roomId"])
            page.locator("[data-seat-token]").fill(fixture.startup["seatToken"])
            command(page, "bind").click()
            try:
                page.wait_for_function(
                    "() => document.querySelector('[data-connection]')?.textContent.startsWith('ready ·')",
                    timeout=TIMEOUT_MS,
                )
            except Exception as error:
                diagnostic = page.evaluate(
                    """() => ({
                      connection: document.querySelector('[data-connection]')?.textContent || '',
                      toast: document.querySelector('[data-toast]')?.textContent || '',
                      body: (document.body?.innerText || '').slice(0, 2400),
                    })"""
                )
                diagnostic["body"] = diagnostic["body"].replace(
                    fixture.startup["seatToken"], "[REDACTED_SEAT_TOKEN]"
                )
                raise AssertionError(
                    f"BROWSER_BIND_FAILED:{json.dumps(diagnostic, ensure_ascii=False)}:"
                    f"errors={browser_errors}"
                ) from error
            wait_agent_status(page, "not_started")
            require(page.locator("[data-seat-token]").input_value() == "", "SEAT_TOKEN_NOT_CLEARED")
            page.locator('[data-detail-tab="agent"]').click()
            page.locator("[data-agent-mode]").wait_for(state="visible", timeout=TIMEOUT_MS)
            require(command(page, "agent-open").is_enabled(), "AGENT_OPEN_NOT_ENABLED")
            check_record(
                checks,
                "authenticated_browser_mount_uses_room_and_agent_http",
                roomHttp=True,
                authenticatedAgentHttp=True,
                clientDomainInterface=["bootstrap", "read", "dispatch", "subscribe"],
            )

            open_session(page, "tutor")
            send_turn(
                page,
                "explain",
                fixture.startup["sentinels"]["userConversation"],
            )
            wait_trace(page, "tutor")
            wait_trace(page, "read_rules_skills")
            require(
                fixture.startup["sentinels"]["rawProviderOutput"] not in body_text(page),
                "TUTOR_PROVIDER_OUTPUT_ENTERED_TRACE_DOM",
            )
            screenshot(page, "01-tutor-safe-trace.png", artifacts)
            check_record(checks, "tutor_mode_completes_with_rule_skill_evidence")
            end_session(page)

            open_session(page, "commentator")
            send_turn(page, "commentate", "Commentate the current public position.")
            wait_trace(page, "commentator")
            wait_trace(page, "read_public_events")
            check_record(checks, "commentator_mode_uses_public_event_context")
            end_session(page)

            open_session(page, "companion")
            send_turn(page, "reflect", "Reflect on the current viewer-scoped position.")
            wait_trace(page, "companion")
            check_record(checks, "companion_mode_completes_without_room_mutation")
            end_session(page)

            open_session(page, "tutor")
            send_turn(page, "explain", "provider failure")
            wait_trace(page, "failure provider_failed")
            check_record(checks, "configured_gateway_failure_is_code_only_and_recoverable")
            page.locator("[data-agent-message]").fill("")
            end_session(page)

            open_session(page, "tutor")
            page.locator("[data-agent-intent]").select_option("explain")
            page.locator("[data-agent-message]").fill("slow cancel")
            command(page, "agent-send").click()
            page.wait_for_function(
                "() => !document.querySelector('[data-command=\"agent-cancel\"]')?.disabled",
                timeout=TIMEOUT_MS,
            )
            wait_trace(page, "waiting_provider")
            command(page, "agent-cancel").click()
            wait_agent_status(page, "ready")
            page.wait_for_function(
                """() => (document.querySelector('[data-agent-traces]')?.innerText || '')
                  .includes('failure cancelled')""",
                timeout=TIMEOUT_MS,
            )
            check_record(checks, "in_flight_browser_turn_is_cancelled_through_abort_signal")
            page.locator("[data-agent-message]").fill("")
            end_session(page)

            open_session(page, "companion")
            set_document_visibility(page, "hidden")
            wait_agent_status(page, "background_read_only")
            require(command(page, "agent-send").is_disabled(), "BACKGROUND_AGENT_WRITE_ENABLED")
            set_document_visibility(page, "visible")
            wait_agent_status(page, "reconnect_required")
            require(command(page, "agent-reconnect").is_enabled(), "EXPLICIT_RECONNECT_NOT_ENABLED")
            command(page, "agent-reconnect").click()
            wait_agent_status(page, "ready")
            require("epoch 2" in page.locator("[data-agent-identity]").inner_text(), "RECONNECT_EPOCH_NOT_ADVANCED")
            screenshot(page, "02-background-explicit-reconnect.png", artifacts)
            check_record(checks, "background_return_requires_and_completes_explicit_reconnect")
            end_session(page)

            add_agent_cookie(context, fixture, "noProvider")
            open_session(page, "tutor")
            send_turn(page, "explain", "Explain without a configured Provider.")
            wait_trace(page, "failure provider_not_configured")
            require("provider provider_not_configured" in body_text(page), "NO_PROVIDER_STATE_NOT_VISIBLE")
            page.locator("[data-agent-message]").fill("")
            screenshot(page, "03-provider-not-configured.png", artifacts)
            check_record(checks, "provider_not_configured_is_honest_and_browser_visible")
            end_session(page)

            add_agent_cookie(context, fixture, "lowBudget")
            open_session(page, "tutor")
            send_turn(page, "explain", "Exercise the fixed low input budget.")
            wait_trace(page, "failure provider_input_budget_exceeded")
            check_record(checks, "provider_input_budget_is_enforced_before_gateway_call")
            page.locator("[data-agent-message]").fill("")
            end_session(page)

            add_agent_cookie(context, fixture, "configured")
            open_session(page, "opponent")
            page.locator("[data-agent-intent]").select_option("take_turn")
            page.locator("[data-agent-message]").fill("Choose one current legal action.")
            command(page, "agent-send").click()
            wait_agent_status(page, "waiting_confirmation")
            wait_trace(page, "decision")
            wait_trace(page, "confirmation")
            require(command(page, "agent-confirm").is_enabled(), "HUMAN_AGENT_CONFIRM_DISABLED")
            before_revision_text = page.locator("[data-state-revision]").inner_text()
            before_match = re.search(r"(\d+)$", before_revision_text)
            require(before_match is not None, "PRE_CONFIRM_REVISION_MISSING")
            before_revision = int(before_match.group(1))
            screenshot(page, "04-opponent-preview-awaiting-human.png", artifacts)
            command(page, "agent-confirm").click()
            page.wait_for_function(
                """before => {
                  const text = document.querySelector('[data-state-revision]')?.textContent || '';
                  const match = text.match(/(\\d+)$/);
                  return match && Number(match[1]) === before + 1;
                }""",
                arg=before_revision,
                timeout=TIMEOUT_MS,
            )
            wait_agent_status(page, "ready")
            require(command(page, "agent-confirm").is_disabled(), "CONFIRMED_PREVIEW_REMAINED_ACTIONABLE")
            command(page, "replay").click()
            page.wait_for_function(
                "() => (document.querySelector('[data-replay-state]')?.textContent || '') === 'verified view'",
                timeout=TIMEOUT_MS,
            )
            require("verified view" in body_text(page), "REPLAY_NOT_VERIFIED_AFTER_AGENT_CONFIRM")
            check_record(
                checks,
                "opponent_preview_needs_external_human_confirm_then_receipt_replay",
                revisionDelta=1,
                modelMayConfirm=False,
                modelMayApply=False,
            )
            end_session(page)

            metrics_response = page.request.get(f"{fixture.origin}/__ticket15/metrics")
            require(metrics_response.ok, "FIXTURE_METRICS_UNAVAILABLE")
            metrics = metrics_response.json()
            require(metrics["deterministicGateway"] is True, "DETERMINISTIC_GATEWAY_NOT_USED")
            require(metrics["liveProviderCalled"] is False, "LIVE_PROVIDER_CALLED")
            require(metrics["apiKeyAccepted"] is False, "API_KEY_ACCEPTED")
            require(metrics["metrics"]["gatewayCalls"]["noProvider"] == 0, "NO_PROVIDER_CALLED_GATEWAY")
            require(metrics["metrics"]["gatewayCalls"]["lowBudget"] == 0, "LOW_BUDGET_CALLED_GATEWAY")
            require(metrics["metrics"]["cancelledGatewayCalls"] == 1, "ABORT_SIGNAL_DENOMINATOR_DRIFT")
            require(metrics["roomRevision"] == before_revision + 1, "OPPONENT_CONFIRM_NOT_ONLY_ROOM_WRITE")
            for mode in EXPECTED_MODES:
                require(metrics["metrics"]["modes"][mode] >= 1, f"MODE_NOT_OBSERVED:{mode}")

            require(not capture_errors, f"AGENT_HTTP_CAPTURE_ERRORS:{capture_errors}")
            for exchange in exchanges:
                response = exchange["response"]
                request = exchange["request"]
                session_ids.update(recursive_values(response, "sessionId"))
                keys = recursive_keys(response)
                require(
                    not keys.intersection(FORBIDDEN_AGENT_HTTP_KEYS),
                    f"AGENT_HTTP_FORBIDDEN_KEYS:{sorted(keys.intersection(FORBIDDEN_AGENT_HTTP_KEYS))}",
                )
                serialized = json.dumps(
                    {"request": request, "response": response},
                    ensure_ascii=False,
                    sort_keys=True,
                )
                require(fixture.startup["seatToken"] not in serialized, "SEAT_TOKEN_IN_AGENT_HTTP")
                for value in fixture.startup["agentAuth"]["values"].values():
                    require(value not in serialized, "AUTH_COOKIE_IN_AGENT_HTTP_BODY")

            final_dom = body_text(page)
            require(fixture.startup["seatToken"] not in final_dom, "SEAT_TOKEN_IN_TRACE_DOM")
            for value in fixture.startup["agentAuth"]["values"].values():
                require(value not in final_dom, "AUTH_COOKIE_IN_TRACE_DOM")
            for session_id in session_ids:
                require(session_id not in final_dom, "RAW_SESSION_ID_IN_TRACE_DOM")
            require(
                fixture.startup["sentinels"]["rawProviderOutput"] not in final_dom,
                "RAW_PROVIDER_OUTPUT_IN_TRACE_DOM",
            )
            require(
                fixture.startup["sentinels"]["userConversation"] not in final_dom,
                "CONVERSATION_TEXT_IN_TRACE_DOM",
            )
            expected_failure_statuses = sorted(
                int(entry.split(":", 2)[1])
                for entry in browser_errors
                if entry.startswith("http:")
                and "/starcraft-tmg-level3/agent/api/v2/" in entry
            )
            require(
                expected_failure_statuses == [400, 429, 502, 503],
                f"AGENT_FAILURE_HTTP_DENOMINATOR_DRIFT:{expected_failure_statuses}",
            )
            generic_fetch_errors = [
                entry
                for entry in browser_errors
                if entry == "console:Failed to load resource: the server responded with a status of 400 (Bad Request)"
                or entry == "console:Failed to load resource: the server responded with a status of 429 (Too Many Requests)"
                or entry == "console:Failed to load resource: the server responded with a status of 502 (Bad Gateway)"
                or entry == "console:Failed to load resource: the server responded with a status of 503 (Service Unavailable)"
            ]
            unexpected_browser_errors = [
                entry
                for entry in browser_errors
                if not entry.startswith("http:") and entry not in generic_fetch_errors
            ]
            require(len(generic_fetch_errors) == 4, "EXPECTED_FETCH_ERROR_DENOMINATOR_DRIFT")
            require(
                not unexpected_browser_errors,
                f"CHROMIUM_ERRORS:{unexpected_browser_errors}",
            )
            check_record(
                checks,
                "trace_http_and_artifact_privacy_scopes_are_enforced",
                agentHttpExchangeCount=len(exchanges),
                rawSessionIdsRendered=0,
                credentialValuesRendered=0,
                providerReceiptKeysObserved=0,
            )
        finally:
            context.close()
            browser.close()
            fixture.close()

    require(len(checks) == FIXED_BROWSER_CHECKS, f"BROWSER_CHECK_DENOMINATOR_DRIFT:{len(checks)}")
    require(len(artifacts) == 4, f"BROWSER_ARTIFACT_DENOMINATOR_DRIFT:{len(artifacts)}")
    generated_files = sorted(path for path in EVIDENCE_ROOT.rglob("*") if path.is_file())
    require(len(generated_files) == len(artifacts), "UNINDEXED_BROWSER_EVIDENCE_ARTIFACT")

    secret_values = [
        fixture.startup["seatToken"],
        *fixture.startup["agentAuth"]["values"].values(),
        *session_ids,
        fixture.startup["sentinels"]["rawProviderOutput"],
        fixture.startup["sentinels"]["userConversation"],
    ]
    for descriptor in artifacts:
        body = (ROOT / descriptor["path"]).read_bytes()
        for secret in secret_values:
            require(secret.encode("utf-8") not in body, f"PRIVATE_VALUE_IN_ARTIFACT:{descriptor['path']}")

    report_core = {
        "schemaVersion": "starcraft_tmg_ticket_15_slice_152_browser_report_v1",
        "generatedAt": "2026-09-04T12:30:00.000Z",
        "ticket": 15,
        "slice": 152,
        "status": "passed",
        "assertionsPassed": len(checks),
        "assertionsTotal": FIXED_BROWSER_CHECKS,
        "checks": checks,
        "artifacts": artifacts,
        "denominator": {
            "realChromiumRuns": 1,
            "roleModes": 4,
            "providerFailurePaths": 3,
            "cancellationPaths": 1,
            "backgroundReconnectPaths": 1,
            "opponentHumanConfirmationPaths": 1,
            "privacyScopes": 3,
            "browserChecks": FIXED_BROWSER_CHECKS,
            "evidenceArtifacts": len(artifacts),
        },
        "environment": {
            "playwright": observed_playwright,
            "chromium": chromium_version,
            "chromiumExecutableSha256": sha256_file(executable),
            "headless": True,
            "locale": "en-US",
            "reducedMotion": "reduce",
        },
        "network": {
            "agentHttpExchangeCount": len(exchanges),
            "responseStatuses": sorted({exchange["status"] for exchange in exchanges}),
            "rawBodiesPersisted": False,
            "sessionLocatorsPersisted": False,
            "credentialsPersisted": False,
        },
        "boundaries": {
            "authoritativeRoomRuntimeUsed": True,
            "roomHttpAdapterUsed": True,
            "authenticatedAgentHttpUsed": True,
            "realRoleTurnRuntimeUsed": True,
            "deterministicInjectedGatewayUsed": True,
            "liveProviderCalled": False,
            "apiKeyAccepted": False,
            "sourceRefreshPerformed": False,
            "nativeDeviceEvidence": "deferred_by_user",
            "skillGenerated": False,
            "dshRun": False,
            "muzeroDataGenerated": False,
            "selfPlayRun": False,
            "trainingTruth": False,
            "productionReady": False,
        },
        "elapsedSeconds": round(time.monotonic() - started, 3),
    }
    serialized_report = json.dumps(report_core, ensure_ascii=False, sort_keys=True)
    for private_value in secret_values:
        require(private_value not in serialized_report, "PRIVATE_VALUE_IN_BROWSER_REPORT")
    report = {**report_core, "reportHash": canonical_hash(report_core)}
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        "Ticket 15 Slice 152 Chromium "
        f"{report['assertionsPassed']}/{report['assertionsTotal']}; {report['reportHash']}"
    )


if __name__ == "__main__":
    main()
