// Screenshot observation only: never drive, apply, roll dice or retry a Provider.
const PAGE_CAPTURE_TIMEOUT_MS = 120_000;
const PAGE_CAPTURE_MAX_ATTEMPTS = 3;

export async function captureOwnedLivePageV1({ page, path,
  timeoutMs = PAGE_CAPTURE_TIMEOUT_MS }) {
  for (let attempt = 1; attempt <= PAGE_CAPTURE_MAX_ATTEMPTS; attempt += 1) {
    try {
      await page.screenshot({ path, fullPage: true, animations: "disabled",
        timeout: Math.max(timeoutMs, PAGE_CAPTURE_TIMEOUT_MS) });
      return { path, captureMode: "full_page", attempts: attempt,
        warning: attempt > 1 ? { code: "PAGE_CAPTURE_TIMEOUT_RECOVERED",
          timeoutAttempts: attempt - 1, actionReexecuted: false } : null };
    } catch (error) {
      // Keep the same page and allocated evidence path. The caller holds its
      // revision barrier until this completes; retry only passive observation.
      if (error?.name !== "TimeoutError" || page.isClosed()
        || attempt === PAGE_CAPTURE_MAX_ATTEMPTS) throw error;
    }
  }
}

export async function captureOwnedLiveElementV1({ page, locator, path,
  timeoutMs = 30_000 }) {
  const target = locator.first();
  await target.waitFor({ state: "visible", timeout: timeoutMs });
  try {
    await target.scrollIntoViewIfNeeded({ timeout: timeoutMs });
    await target.screenshot({ path, timeout: timeoutMs });
    return { path, captureMode: "element", warning: null };
  } catch (error) {
    if (error?.name !== "TimeoutError" || page.isClosed()
      || !await target.isVisible()) throw error;
    // A continuously animated element can fail Playwright's stability wait
    // while the accepted Rules revision is already durable. Preserve a real
    // full-page observation instead of driving that action again. Do not claim
    // that this fallback is a tightly cropped, complete-board image.
    const fallback = await captureOwnedLivePageV1({ page, path, timeoutMs });
    return { path, captureMode: "full_page_fallback",
      warning: { code: "ELEMENT_STABILITY_TIMEOUT", errorName: "TimeoutError",
        actionReexecuted: false,
        ...(fallback.warning ? { pageCaptureRecovery: fallback.warning } : {}) } };
  }
}
