// Server/offline-owned source partitions, not client geometry or pixel inference.
// A physical source instance may contain several independently agreed Rules
// parts. Their disjoint exact union must equal the already-reviewed source;
// neither a bounding envelope nor a new physical-piece count replaces it.
const fail = (code, detail = "") => { throw new Error(`${code}${detail ? `:${detail}` : ""}`); };

function rings(components, id) {
  if (!Array.isArray(components) || !components.length) fail("PREMADE_SOURCE_PART_GEOMETRY_REQUIRED", id);
  const all = components.flatMap(component => {
    if (!Array.isArray(component.rings) || !component.rings.length) fail("PREMADE_SOURCE_PART_GEOMETRY_REQUIRED", id);
    return component.rings;
  });
  for (const ring of all) {
    if (!Array.isArray(ring) || ring.length < 4 || ring.some((p, i) => {
      const q = ring[(i + 1) % ring.length];
      return !Array.isArray(p) || p.length !== 2 || !p.every(Number.isSafeInteger)
        || !Array.isArray(q) || p[0] !== q[0] && p[1] !== q[1];
    })) fail("PREMADE_SOURCE_PART_INTEGER_ORTHOGONAL_EDGES_REQUIRED", id);
  }
  return all;
}

function intervals(components, y, id) {
  const result = [];
  for (const component of components) {
    const crossings = [];
    for (const ring of component.rings) for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]; const b = ring[(i + 1) % ring.length];
      if ((a[1] > y) !== (b[1] > y)) crossings.push(a[0]);
    }
    crossings.sort((a, b) => a - b);
    if (crossings.length % 2) fail("PREMADE_SOURCE_PART_SCANLINE_INVALID", id);
    for (let i = 0; i < crossings.length; i += 2) {
      if (crossings[i] < crossings[i + 1]) result.push([crossings[i], crossings[i + 1]]);
    }
  }
  return result;
}

function canonicalUnion(rows, rejectOverlap, id) {
  const merged = [];
  for (const row of rows.sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    const last = merged.at(-1);
    if (last && row[0] < last[1] && rejectOverlap) fail("PREMADE_SOURCE_PARTITION_OVERLAP", id);
    if (last && row[0] <= last[1]) last[1] = Math.max(last[1], row[1]);
    else merged.push([...row]);
  }
  return merged;
}

function verifyPartition(proposal) {
  const parts = proposal.sourceParts;
  if (!Array.isArray(parts) || parts.length < 2) fail("PREMADE_SOURCE_PARTITION_REQUIRED", proposal.instanceId);
  const ids = new Set();
  const allRings = [...rings(proposal.sourcePixelGeometry, proposal.instanceId)];
  for (const part of parts) {
    if (typeof part.partId !== "string" || !part.partId.trim() || part.partId !== part.partId.trim()
      || ids.has(part.partId) || typeof part.partRole !== "string" || !part.partRole.trim()) {
      fail("PREMADE_SOURCE_PART_IDENTITY_INVALID", proposal.instanceId);
    }
    ids.add(part.partId);
    allRings.push(...rings(part.sourcePixelGeometry, `${proposal.instanceId}:${part.partId}`));
  }
  const ys = [...new Set(allRings.flatMap(r => r.map(p => p[1])))].sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i += 1) {
    const y = (ys[i - 1] + ys[i]) / 2;
    const expected = canonicalUnion(intervals(proposal.sourcePixelGeometry, y, proposal.instanceId), false, proposal.instanceId);
    const actual = canonicalUnion(parts.flatMap(part => intervals(part.sourcePixelGeometry, y, part.partId)), true, proposal.instanceId);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) fail("PREMADE_SOURCE_PARTITION_COVERAGE_MISMATCH", proposal.instanceId);
  }
}

export function expandOfficialPremadeSourcePartsV1(geometry) {
  if (!Array.isArray(geometry?.proposals)) fail("PREMADE_SOURCE_PROPOSALS_REQUIRED");
  const expanded = geometry.proposals.flatMap(proposal => {
    if (proposal.sourceParts === undefined) return [structuredClone(proposal)];
    verifyPartition(proposal);
    return proposal.sourceParts.map(part => ({ ...structuredClone(proposal),
      instanceId: `${proposal.instanceId}::${part.partId}`, sourceInstanceId: proposal.instanceId,
      sourcePartId: part.partId, sourcePartRole: part.partRole,
      ...(part.sourceAccessPoints ? { sourceAccessPoints: structuredClone(part.sourceAccessPoints) } : {}),
      sourcePixelGeometry: structuredClone(part.sourcePixelGeometry), sourceParts: undefined,
    }));
  });
  if (new Set(expanded.map(p => p.instanceId)).size !== expanded.length) fail("PREMADE_SOURCE_EXPANDED_ID_DUPLICATE");
  return expanded;
}
