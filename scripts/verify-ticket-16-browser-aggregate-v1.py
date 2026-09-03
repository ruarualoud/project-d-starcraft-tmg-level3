#!/usr/bin/env python3

from __future__ import annotations

import base64
import hashlib
import importlib.metadata
import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlparse

from playwright.sync_api import Browser, BrowserContext, Page, Response, sync_playwright


ROOT = Path(__file__).resolve().parent.parent
BUILD_ROOT = ROOT / "build" / "ticket-16-slice-161-browser-aggregate-v1"
EVIDENCE_ROOT = BUILD_ROOT / "browser-evidence"
REPORT_PATH = BUILD_ROOT / "browser-report.json"
PLAYWRIGHT_VERSION = "1.59.0"
TIMEOUT_MS = int(os.environ.get("TICKET16_BROWSER_TIMEOUT_MS", "60000"))
FIXED_BROWSER_CHECKS = 16
PROVIDER_PREFIX = "/starcraft-tmg-level3/provider/api/v1/"
EXPECTED_MODES = ("tutor", "opponent", "commentator", "companion")
FORBIDDEN_PROVIDER_RESPONSE_KEYS = {
    "apikey",
    "api_key",
    "authorization",
    "cookie",
    "credential",
    "credentials",
    "providercredential",
    "providercredentials",
    "rawprompt",
    "rawprovideroutput",
    "usagereceipt",
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


def add_agent_cookie(context: BrowserContext, fixture: FixtureServer) -> None:
    auth = fixture.startup["agentAuth"]
    context.add_cookies(
        [
            {
                "name": auth["cookieName"],
                "value": auth["values"]["configured"],
                "url": fixture.origin,
                "httpOnly": True,
                "secure": False,
                "sameSite": "Strict",
            }
        ]
    )


def command(page: Page, name: str):
    return page.locator(f'[data-command="{name}"]')


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


def wait_provider_status(page: Page, status: str) -> None:
    page.wait_for_function(
        """expected =>
          (document.querySelector('[data-provider-status]')?.textContent || '') === expected""",
        arg=status,
        timeout=TIMEOUT_MS,
    )


def wait_provider_state(page: Page, state: str) -> None:
    page.wait_for_function(
        """expected =>
          (document.querySelector('[data-provider-safe-state]')?.textContent || '')
            .includes(`Attachment ${expected}`)""",
        arg=state,
        timeout=TIMEOUT_MS,
    )


def wait_trace(page: Page, fragment: str) -> None:
    page.wait_for_function(
        """expected => (document.querySelector('[data-agent-traces]')?.innerText || '')
          .includes(expected)""",
        arg=fragment,
        timeout=TIMEOUT_MS,
    )


def open_session(page: Page, mode: str) -> None:
    page.locator("[data-agent-mode]").select_option(mode)
    command(page, "agent-open").click()
    wait_agent_status(page, "ready")


def send_turn(page: Page, intent: str, message: str) -> None:
    page.locator("[data-agent-intent]").select_option(intent)
    page.locator("[data-agent-message]").fill(message)
    command(page, "agent-send").click()
    wait_agent_status(page, "ready")


def end_session(page: Page) -> None:
    command(page, "agent-end").click()
    wait_agent_status(page, "ended")


def recursive_keys(value: Any) -> set[str]:
    keys: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            keys.add("".join(character for character in key.lower() if character.isalnum()))
            keys.update(recursive_keys(child))
    elif isinstance(value, list):
        for child in value:
            keys.update(recursive_keys(child))
    return keys


def recursive_values(value: Any, names: set[str]) -> list[str]:
    values: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if key in names and isinstance(child, str):
                values.append(child)
            values.extend(recursive_values(child, names))
    elif isinstance(value, list):
        for child in value:
            values.extend(recursive_values(child, names))
    return values


def secret_variants(secret: str) -> set[str]:
    raw = secret.encode("utf-8")
    encoded = base64.b64encode(raw).decode("ascii")
    unicode_escaped = "".join(f"\\u{ord(character):04x}" for character in secret)
    return {
        secret,
        quote(secret, safe=""),
        quote(quote(secret, safe=""), safe=""),
        encoded,
        encoded.rstrip("="),
        encoded.rstrip("=").replace("+", "-").replace("/", "_"),
        raw.hex(),
        raw.hex().upper(),
        unicode_escaped,
        unicode_escaped.replace("\\", "\\\\"),
    }


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
    provider_exchanges: list[dict[str, Any]] = []
    provider_capture_errors: list[str] = []
    private_locators: set[str] = set()
    fixture = FixtureServer()
    sentinels = fixture.startup["sentinels"]
    secret_values = [
        sentinels["providerSecret"],
        sentinels["providerFailureSecret"],
        fixture.startup["seatToken"],
        *fixture.startup["agentAuth"]["values"].values(),
    ]

    def capture_provider(response: Response) -> None:
        if PROVIDER_PREFIX not in response.url:
            return
        try:
            response_body = response.json()
        except Exception as error:
            provider_capture_errors.append(f"{response.status}:{type(error).__name__}")
            response_body = None
        try:
            request_bytes = response.request.post_data_buffer or b""
        except Exception:
            request_bytes = b""
        if response_body is not None:
            private_locators.update(recursive_values(
                response_body,
                {"attachmentId", "sessionId", "nonce"},
            ))
        provider_exchanges.append(
            {
                "method": response.request.method,
                "status": response.status,
                "path": urlparse(response.url).path,
                "contentType": response.request.headers.get("content-type", ""),
                "requestByteLength": len(request_bytes),
                "containsFailureSentinel": sentinels["providerFailureSecret"].encode()
                in request_bytes,
                "containsValidSentinel": sentinels["providerSecret"].encode()
                in request_bytes,
                "response": response_body,
            }
        )

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
        add_agent_cookie(context, fixture)
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
        page.on("response", capture_provider)
        try:
            page.goto(
                f"{fixture.origin}/apps/starcraft-tmg-battle-lab/",
                wait_until="domcontentloaded",
                timeout=TIMEOUT_MS,
            )
            page.locator("[data-room-id]").fill(fixture.startup["roomId"])
            page.locator("[data-seat-token]").fill(fixture.startup["seatToken"])
            command(page, "bind").click()
            page.wait_for_function(
                "() => document.querySelector('[data-connection]')?.textContent.startsWith('ready ·')",
                timeout=TIMEOUT_MS,
            )
            page.locator('[data-detail-tab="agent"]').click()
            wait_agent_status(page, "not_started")
            require(not provider_exchanges, "IMPLICIT_PROVIDER_REQUEST_AT_STARTUP")
            check_record(
                checks,
                "authenticated_room_mount_makes_no_implicit_provider_request",
                providerRequests=0,
            )

            open_session(page, "companion")
            command(page, "provider-load").click()
            try:
                wait_provider_status(page, "ready")
            except Exception as error:
                diagnostic = page.evaluate(
                    """() => ({
                      status: document.querySelector('[data-provider-status]')?.textContent || '',
                      error: document.querySelector('[data-provider-error]')?.textContent || '',
                      toast: document.querySelector('[data-toast]')?.textContent || '',
                    })"""
                )
                raise AssertionError(
                    "PROVIDER_CATALOGUE_LOAD_FAILED:"
                    f"{json.dumps(diagnostic, ensure_ascii=False)}:"
                    f"provider={provider_exchanges}:browser={browser_errors}"
                ) from error
            require(
                page.locator("[data-provider-profile] option").count() == 1,
                "SERVER_PROFILE_DENOMINATOR_DRIFT",
            )
            profile_text = page.locator("[data-provider-profile] option").inner_text()
            require("deterministic-browser-fixture-model" in profile_text, "MODEL_NOT_SERVER_LISTED")
            check_record(checks, "explicit_catalogue_load_lists_only_the_server_profile")

            page.locator("[data-provider-consent]").check()
            command(page, "provider-prepare").click()
            wait_provider_status(page, "awaiting_secret")
            require(page.locator("[data-provider-secret-row]").is_visible(), "INGRESS_NOT_VISIBLE")
            ingress_dom = body_text(page)
            for locator in private_locators:
                require(locator not in ingress_dom, "PRIVATE_PROVIDER_LOCATOR_IN_DOM")
            check_record(checks, "explicit_consent_prepares_one_time_ingress_without_dom_locator")

            page.locator("[data-provider-secret]").fill(sentinels["providerFailureSecret"])
            command(page, "provider-attach").click()
            wait_provider_status(page, "error")
            require(
                page.locator("[data-provider-error]").inner_text()
                == "credential_worker_attach_failed",
                "WORKER_FAILURE_NOT_CODE_ONLY",
            )
            require(page.locator("[data-provider-secret]").input_value() == "", "FAILED_SECRET_NOT_CLEARED")
            screenshot(page, "01-worker-attach-failure.png", artifacts)
            check_record(checks, "worker_attach_failure_is_code_only_and_clears_the_input")

            failed_ingress = [
                entry
                for entry in provider_exchanges
                if entry["containsFailureSentinel"]
            ]
            require(len(failed_ingress) == 1, "FAILED_SECRET_INGRESS_DENOMINATOR_DRIFT")
            require(failed_ingress[0]["method"] == "PUT", "FAILED_SECRET_NOT_PUT")
            require(
                failed_ingress[0]["contentType"] == "application/octet-stream",
                "FAILED_SECRET_NOT_BINARY",
            )
            require(failed_ingress[0]["status"] == 502, "FAILED_SECRET_STATUS_DRIFT")
            check_record(checks, "failed_secret_uses_one_dedicated_binary_http_ingress")

            command(page, "provider-prepare").click()
            wait_provider_status(page, "awaiting_secret")
            page.locator("[data-provider-secret]").fill(sentinels["providerSecret"])
            command(page, "provider-attach").click()
            try:
                wait_provider_status(page, "attached")
            except Exception as error:
                diagnostic = page.evaluate(
                    """() => ({
                      status: document.querySelector('[data-provider-status]')?.textContent || '',
                      error: document.querySelector('[data-provider-error]')?.textContent || '',
                      state: document.querySelector('[data-provider-safe-state]')?.textContent || '',
                      toast: document.querySelector('[data-toast]')?.textContent || '',
                    })"""
                )
                raise AssertionError(
                    "REAL_CHILD_ATTACH_FAILED:"
                    f"{json.dumps(diagnostic, ensure_ascii=False)}:"
                    f"provider={provider_exchanges}:browser={browser_errors}"
                ) from error
            require(page.locator("[data-provider-secret]").input_value() == "", "VALID_SECRET_NOT_CLEARED")
            wait_provider_state(page, "attached")
            screenshot(page, "02-real-child-attached.png", artifacts)
            check_record(checks, "fresh_ingress_attaches_the_synthetic_key_to_a_real_child_worker")

            attached_dom = body_text(page)
            require("not live spend; exact ledger stays server-side" in attached_dom, "BUDGET_COPY_DRIFT")
            require("credential persisted: no; automatic retry: no" in attached_dom, "DISCLOSURE_COPY_DRIFT")
            for locator in private_locators:
                require(locator not in attached_dom, "PRIVATE_PROVIDER_LOCATOR_IN_ATTACHED_DOM")
            check_record(checks, "attached_dom_shows_safe_budget_and_persistence_disclosure")

            send_turn(page, "reflect", "Companion turn while the secure attachment is active.")
            wait_trace(page, "companion")
            require(wait_provider_status(page, "attached") is None, "ATTACHMENT_CHANGED_ON_ROLE_TURN")
            check_record(checks, "companion_deterministic_turn_completes_while_attachment_is_active")

            command(page, "provider-refresh").click()
            wait_provider_status(page, "attached")
            wait_provider_state(page, "attached")
            check_record(checks, "safe_attachment_refresh_returns_no_secret_or_worker_reference")

            command(page, "provider-detach").click()
            wait_provider_state(page, "detached")
            require("credential persisted: no" in body_text(page), "DETACH_DISCLOSURE_MISSING")
            screenshot(page, "03-worker-detached.png", artifacts)
            check_record(checks, "explicit_detach_projects_destroyed_worker_state")
            end_session(page)

            mode_intents = {
                "tutor": "explain",
                "opponent": "chat",
                "commentator": "commentate",
            }
            for mode, intent in mode_intents.items():
                open_session(page, mode)
                send_turn(page, intent, f"Deterministic Slice 161 {mode} check.")
                wait_trace(page, mode)
                end_session(page)
            check_record(checks, "tutor_opponent_and_commentator_share_the_deterministic_gateway")

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
            wait_trace(page, "failure cancelled")
            end_session(page)
            check_record(checks, "browser_cancel_reaches_the_single_deterministic_gateway_call")

            metrics_response = page.request.get(f"{fixture.origin}/__ticket15/metrics")
            require(metrics_response.ok, "FIXTURE_METRICS_UNAVAILABLE")
            metrics = metrics_response.json()
            lifecycle = metrics["providerLifecycle"]
            require(lifecycle["workerAttachAttempts"] == 2, "WORKER_ATTACH_ATTEMPT_DRIFT")
            require(lifecycle["workerAttachFailures"] == 1, "WORKER_ATTACH_FAILURE_DRIFT")
            require(lifecycle["workerAttachSuccesses"] == 1, "WORKER_ATTACH_SUCCESS_DRIFT")
            require(lifecycle["workerDetachCalls"] == 1, "WORKER_DETACH_DRIFT")
            require(lifecycle["expectedFailureSecretObserved"] is True, "FAILURE_SENTINEL_NOT_OBSERVED")
            require(lifecycle["expectedValidSecretObserved"] is True, "VALID_SENTINEL_NOT_OBSERVED")
            require(lifecycle["unexpectedWorkerExits"] == 0, "UNEXPECTED_WORKER_EXIT")
            for mode in EXPECTED_MODES:
                require(metrics["metrics"]["modes"][mode] >= 1, f"MODE_NOT_OBSERVED:{mode}")
            require(metrics["metrics"]["cancelledGatewayCalls"] == 1, "CANCEL_DENOMINATOR_DRIFT")
            check_record(checks, "worker_and_four_mode_metrics_match_the_fixed_denominator")

            require(not provider_capture_errors, f"PROVIDER_CAPTURE_ERRORS:{provider_capture_errors}")
            require(len(provider_exchanges) == 7, f"PROVIDER_HTTP_DENOMINATOR_DRIFT:{len(provider_exchanges)}")
            valid_ingress = [
                entry for entry in provider_exchanges if entry["containsValidSentinel"]
            ]
            require(len(valid_ingress) == 1, "VALID_SECRET_INGRESS_DENOMINATOR_DRIFT")
            for exchange in provider_exchanges:
                response_body = exchange["response"]
                if response_body is not None:
                    forbidden = recursive_keys(response_body).intersection(
                        FORBIDDEN_PROVIDER_RESPONSE_KEYS
                    )
                    require(not forbidden, f"FORBIDDEN_PROVIDER_RESPONSE_KEYS:{sorted(forbidden)}")
                    serialized = json.dumps(response_body, ensure_ascii=False, sort_keys=True)
                    for secret in (sentinels["providerSecret"], sentinels["providerFailureSecret"]):
                        for variant in secret_variants(secret):
                            require(variant not in serialized, "SECRET_VARIANT_IN_PROVIDER_RESPONSE")
                require("authorization" not in exchange, "AUTHORIZATION_CAPTURED")
            final_dom = body_text(page)
            for value in secret_values:
                require(value not in final_dom, "PRIVATE_VALUE_IN_FINAL_DOM")
            for locator in private_locators:
                require(locator not in final_dom, "PRIVATE_LOCATOR_IN_FINAL_DOM")
            expected_http_errors = [
                entry
                for entry in browser_errors
                if entry.startswith("http:502:") and PROVIDER_PREFIX in entry
            ]
            require(len(expected_http_errors) == 1, "EXPECTED_PROVIDER_502_DRIFT")
            expected_agent_cancel_errors = [
                entry
                for entry in browser_errors
                if entry.startswith("http:400:")
                and "/starcraft-tmg-level3/agent/api/v2/" in entry
                and entry.endswith("/turns")
            ]
            require(len(expected_agent_cancel_errors) == 1, "EXPECTED_AGENT_CANCEL_400_DRIFT")
            expected_console_errors = {
                "console:Failed to load resource: the server responded with a status of 400 (Bad Request)",
                "console:Failed to load resource: the server responded with a status of 502 (Bad Gateway)",
            }
            unexpected_errors = [
                entry
                for entry in browser_errors
                if not (entry.startswith("http:502:") and PROVIDER_PREFIX in entry)
                and entry not in expected_agent_cancel_errors
                and entry not in expected_console_errors
            ]
            require(not unexpected_errors, f"CHROMIUM_ERRORS:{unexpected_errors}")
            check_record(checks, "provider_http_and_dom_privacy_scopes_are_clean")

            for descriptor in artifacts:
                body = (ROOT / descriptor["path"]).read_bytes()
                for value in [*secret_values, *private_locators]:
                    require(value.encode("utf-8") not in body, "PRIVATE_VALUE_IN_BROWSER_ARTIFACT")
            check_record(checks, "three_browser_artifacts_contain_no_secret_or_private_locator")

            require(metrics["liveProviderCalled"] is False, "LIVE_PROVIDER_CALLED")
            require(metrics["apiKeyAccepted"] is False, "REAL_API_KEY_ACCEPTED")
            check_record(
                checks,
                "run_truth_is_real_chromium_real_child_and_zero_external_provider",
                liveProviderCalled=False,
                realCredentialChildUsed=True,
                trainingTruth=False,
            )
        finally:
            context.close()
            browser.close()
            fixture.close()

    require(len(checks) == FIXED_BROWSER_CHECKS, f"BROWSER_CHECK_DENOMINATOR_DRIFT:{len(checks)}")
    require(len(artifacts) == 3, f"BROWSER_ARTIFACT_DENOMINATOR_DRIFT:{len(artifacts)}")
    generated_files = sorted(path for path in EVIDENCE_ROOT.rglob("*") if path.is_file())
    require(len(generated_files) == len(artifacts), "UNINDEXED_BROWSER_ARTIFACT")
    report_core = {
        "schemaVersion": "starcraft_tmg_ticket_16_slice_161_browser_report_v1",
        "generatedAt": "2026-09-04T11:00:00.000Z",
        "ticket": 16,
        "slice": 161,
        "status": "passed",
        "assertionsPassed": len(checks),
        "assertionsTotal": FIXED_BROWSER_CHECKS,
        "checks": checks,
        "artifacts": artifacts,
        "denominator": {
            "realChromiumRuns": 1,
            "providerHttpRequests": len(provider_exchanges),
            "syntheticCredentialIngresses": 2,
            "workerAttachFailures": 1,
            "realCredentialChildAttachments": 1,
            "workerDetaches": 1,
            "roleModes": 4,
            "cancellationPaths": 1,
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
            "providerResponseStatuses": sorted(
                {exchange["status"] for exchange in provider_exchanges}
            ),
            "rawBodiesPersisted": False,
            "privateLocatorsPersisted": False,
            "credentialsPersisted": False,
            "automaticRetries": 0,
        },
        "boundaries": {
            "realRoomAndAgentHttpUsed": True,
            "realSecureProviderHttpUsed": True,
            "realCredentialChildUsed": True,
            "deterministicInjectedRoleGatewayUsed": True,
            "liveProviderCalled": False,
            "realApiKeyAccepted": False,
            "sourceRefreshPerformed": False,
            "nativeDeviceEvidence": "deferred_by_user",
            "skillGenerated": False,
            "dshRun": False,
            "muzeroDataGenerated": False,
            "selfPlayRun": False,
            "trainingTruth": False,
            "productionReady": False,
        },
    }
    serialized_report = json.dumps(report_core, ensure_ascii=False, sort_keys=True)
    for value in [*secret_values, *private_locators]:
        require(value not in serialized_report, "PRIVATE_VALUE_IN_BROWSER_REPORT")
    report = {**report_core, "reportHash": canonical_hash(report_core)}
    REPORT_PATH.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        "Ticket 16 Slice 161 Chromium "
        f"{report['assertionsPassed']}/{report['assertionsTotal']}; "
        f"providerHttp={len(provider_exchanges)}; {report['reportHash']}"
    )


if __name__ == "__main__":
    main()
