// Shared review/repair manifest. Only model-owned public prose is mutable;
// roster identities, Rules schedules, numeric targets and provenance are not.
import { createOpponentArchetypeHypothesisV1, createRosterCounterResponseV1,
  createRosterInvalidationTriggerV1 } from "./roster-plan-contracts-v1.mjs";
export const ROSTER_PUBLIC_CLAIM_PATHS_V1 = Object.freeze([
  "scoreRoute.routeText",
  "scoreRoute.fallbackRouteText",
  "publicSummaryText",
  "deploymentConcept.deploymentConceptText",
  "deploymentConcept.reinforcementPolicyText",
  "deploymentConcept.threatTradeText",
  "deploymentConcept.objectiveControlText",
]);

const structuredSections = Object.freeze([
  { section: "opponentHypotheses", id: "hypothesisId", hash: "hypothesisHash",
    fields: ["archetypeLabel", "hypothesisText", "falsificationText"],
    lists: ["expectedCounterTexts"], create: createOpponentArchetypeHypothesisV1 },
  { section: "counterResponses", id: "responseId", hash: "responseHash",
    fields: ["triggerText", "responseText"], lists: [], create: createRosterCounterResponseV1 },
  { section: "invalidationTriggers", id: "triggerId", hash: "triggerHash",
    fields: ["triggerText", "revisionRequiredText"], lists: [],
    create: createRosterInvalidationTriggerV1 },
]);

// IDs are matched as whole strings; never interpret a model path as arbitrary
// property access. List members are prose, while identities/links stay immutable.
function structuredClaims(plan) {
  return structuredSections.flatMap(spec => (plan?.[spec.section] || []).flatMap(
    (entry, index) => {
      const prefix = `${spec.section}.${entry[spec.id]}`;
      return [...spec.fields.map(field => ({ path: `${prefix}.${field}`,
        section: spec.section, index, field, text: entry[field] })),
      ...spec.lists.flatMap(field => (entry[field] || []).map((text, textIndex) => ({
        path: `${prefix}.${field}.${textIndex}`, section: spec.section,
        index, field, textIndex, text,
      })))];
    }));
}

export function rosterPublicClaimTextEntriesV1(plan, { includeStructured = true } = {}) {
  return [...ROSTER_PUBLIC_CLAIM_PATHS_V1.map((path) => [path,
    path.split(".").reduce((value, key) => value?.[key], plan)]),
  ...(includeStructured ? structuredClaims(plan).map(({ path, text }) => [path, text]) : [])];
}

// A corrected hypothesis must remain consistent with its explicitly linked
// responses. This grants prose-edit scope, not a verdict that related prose is
// wrong. No text similarity, tactical ranking, roster or numeric mutation.
export function rosterRelatedRepairClaimPathsV1(plan, seedPaths = []) {
  const paths = new Set(seedPaths);
  const nodes = new Map();
  for (const [section, idField, linkField, target] of [
    ['opponentHypotheses', 'hypothesisId', 'ownCounterResponseIds', 'counterResponses'],
    ['counterResponses', 'responseId', 'linkedHypothesisIds', 'opponentHypotheses'],
  ]) for (const entry of plan?.[section] || []) {
    const key = `${section}.${entry[idField]}`;
    if (nodes.has(key)) throw new Error('ROSTER_PUBLIC_CLAIM_IDENTITY_AMBIGUOUS');
    nodes.set(key, { neighbors: new Set((entry[linkField] || []).map(id => `${target}.${id}`)),
      paths: structuredClaims({ [section]: [entry] }).filter(c => c.field !== 'archetypeLabel'
        && typeof c.text === 'string').map(c => c.path) });
  }
  for (const [key, node] of nodes) for (const neighbor of node.neighbors) {
    nodes.get(neighbor)?.neighbors.add(key);
  }
  const pending = [...nodes].filter(([, node]) => node.paths.some(path => paths.has(path)))
    .map(([key]) => key);
  const visited = new Set();
  for (let i = 0; i < pending.length; i += 1) {
    const key = pending[i];
    if (visited.has(key) || !nodes.has(key)) continue;
    visited.add(key);
    const node = nodes.get(key);
    for (const path of node.paths) paths.add(path);
    for (const neighbor of node.neighbors) if (!visited.has(neighbor)) pending.push(neighbor);
  }
  return [...paths];
}

// Exact public catalogue references only. A referenced hypothesis includes its
// supporting prose; identity, Rules numerics and schedule fields are excluded.
export function rosterReferencedRepairClaimPathsV1(plan, findings) {
  const entries = rosterPublicClaimTextEntriesV1(plan);
  const paths = new Set();
  for (const finding of findings) {
    const explanation = [finding.publicReason, finding.correctionQuestion].filter(Boolean).join("\n");
    // A referenced path may be a CORRECT counterexample (actual A-v3 case).
    // Scope propagation requires literal shared prose, not a mere path mention.
    const fragments = [finding.claimQuote,
      ...[...explanation.matchAll(/(?:^|[\s(])'([^']+)'(?=$|[\s).,;:])/gu)].map(m => m[1]),
      ...[...explanation.matchAll(/["“]([^"”]+)["”]/gu)].map(m => m[1])]
      .filter(s => typeof s === "string").map(s => s.trim().replace(/[.,;:!?]+$/u, ""))
      .filter(s => s.split(/\s+/u).length >= 5);
    const referenced = entries.filter(([path, text]) => explanation.includes(path)
      && fragments.some(fragment => text?.includes(fragment)));
    for (const [path, text] of referenced) {
      paths.add(path);
      const matched = fragments.filter(fragment => text.includes(fragment));
      // Supporting sentences elsewhere in this same object can repeat the
      // implicated literal even if the judge only named its main paragraph.
      const prefix = /^(opponentHypotheses|counterResponses|invalidationTriggers)\./u.test(path)
        ? path.split(".").slice(0, 2).join(".") + "." : null;
      if (prefix) for (const [sibling, prose] of entries) {
        if (sibling.startsWith(prefix) && (sibling.startsWith(prefix + "expectedCounterTexts.")
          || matched.some(fragment => prose?.includes(fragment)))) paths.add(sibling);
      }
    }
  }
  return [...paths];
}

export function rosterPublicClaimSectionV1(plan, path) {
  if (ROSTER_PUBLIC_CLAIM_PATHS_V1.includes(path)) return path.split(".")[0];
  const matches = structuredClaims(plan).filter(claim => claim.path === path);
  return matches.length === 1 ? matches[0].section : null;
}

export function rosterPublicClaimReplacementSectionsV1(plan, replacements) {
  const claims = structuredClaims(plan);
  const sections = {};
  for (const [path, text] of replacements) {
    const matches = claims.filter(claim => claim.path === path);
    if (!matches.length) continue; // Global/component fields use their existing adapters.
    if (matches.length !== 1) throw new Error("ROSTER_PUBLIC_CLAIM_IDENTITY_AMBIGUOUS");
    const { section, index, field, textIndex } = matches[0];
    sections[section] ||= structuredClone(plan[section]);
    if (textIndex === undefined) sections[section][index][field] = text;
    else sections[section][index][field][textIndex] = text;
  }
  for (const spec of structuredSections) {
    if (sections[spec.section]) sections[spec.section] = sections[spec.section].map(spec.create);
  }
  return sections;
}

// Shared with incremental review: only public prose and its derived local hash
// are excluded from the non-prose dependency comparison, never links/numerics.
export function omitRosterStructuredPublicClaimsV1(body) {
  for (const spec of structuredSections) for (const entry of body[spec.section] || []) {
    for (const field of [...spec.fields, ...spec.lists, spec.hash]) delete entry[field];
  }
  return body;
}
