import path from 'node:path';
import { mkdir, mkdtemp, link, symlink, realpath } from 'node:fs/promises';
import { inspectDisposableRuntimeTreeV1 } from '../skill-generation-runtime/disposable-os-runner-v1.mjs';
import { hash, seal, fail } from './common.mjs';

// A derived execution artifact, never a replacement for the full pinned npm
// artifact. Only source maps and TypeScript declarations are omitted. JS,
// runtime TS, native libraries, package metadata, assets and symlinks remain.
export function projectRuntimeManifest(original) {
  const omitted = original.entries.filter(e => e.type === 'file' && /(?:\.map|\.d\.(?:ts|mts|cts))$/.test(e.path));
  const omittedPaths = new Set(omitted.map(e => e.path));
  const entries = original.entries.filter(e => !omittedPaths.has(e.path));
  // Keep any referenced target, even if it otherwise looks like a declaration.
  for (const e of entries.filter(e => e.type === 'symlink')) {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(e.path), e.target));
    if (omittedPaths.has(target)) fail('PROJECTION_REFERENCED_OMITTED_FILE');
  }
  return { manifest: { ...original, entries, entryCount: entries.length,
    totalBytes: entries.reduce((n, e) => n + (e.sizeBytes || 0), 0) }, omitted };
}

async function limited(values, operation) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(64, values.length) }, async () => {
    while (next < values.length) { const item = values[next++]; await operation(item); }
  }));
}
export async function prepareExecutionProjection(repositoryRoot, pinned) {
  const full = await inspectDisposableRuntimeTreeV1({ repositoryRoot, sourceRoot: pinned.runtimeRoot });
  if (full.manifestHash !== pinned.receipt.runtimeTreeHash) fail('PINNED_RUNTIME_CONTENT_DRIFT');
  const { manifest, omitted } = projectRuntimeManifest(full.manifest);
  const manifestHash = hash(manifest);
  // Per-process immutable generation: no cache manifest is trusted without
  // inspecting file contents. No overwrite, recursive deletion, or mutation of
  // the original vendor artifact. These cache generations are ignored assets.
  const stagingParent = path.join(repositoryRoot, 'vendor/dsh-execution-projections-v1');
  await mkdir(stagingParent, { recursive: true, mode: 0o700 });
  const sourceRoot = await realpath(await mkdtemp(path.join(stagingParent, manifestHash.slice(0, 12) + '-')));
  await limited(manifest.entries.filter(e => e.type === 'directory'), e => mkdir(path.join(sourceRoot, e.path), { recursive: true, mode: 0o755 }));
  await limited(manifest.entries.filter(e => e.type !== 'directory'), e => e.type === 'file'
    ? link(path.join(pinned.runtimeRoot, e.path), path.join(sourceRoot, e.path))
    : symlink(e.target, path.join(sourceRoot, e.path)));
  const inspected = await inspectDisposableRuntimeTreeV1({ repositoryRoot, sourceRoot });
  if (inspected.manifestHash !== manifestHash) fail('EXECUTION_PROJECTION_CONTENT_DRIFT');
  return { sourceRoot, manifestHash, receipt: seal({ version: 'dsh-execution-projection-v1',
    parentRuntimeTreeHash: full.manifestHash, executionRuntimeTreeHash: manifestHash,
    parentEntries: full.manifest.entryCount, executionEntries: manifest.entryCount,
    parentBytes: full.manifest.totalBytes, executionBytes: manifest.totalBytes,
    omittedFiles: omitted.length, omittedEntriesHash: hash(omitted),
    omissionPolicy: 'source_maps_and_typescript_declarations_only', codeModified: false,
    osIsolationUnchanged: true, trainingTruth: false }) };
}
