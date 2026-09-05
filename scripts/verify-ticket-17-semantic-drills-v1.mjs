#!/usr/bin/env node
import strictAssert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFrozenSkillEvidence, CHAPTERS } from "../packages/skill-production/evidence.mjs";
import { createMechanicsVerifier } from "../packages/skill-production/mechanics.mjs";
import { createSemanticDrills } from "../packages/skill-evaluation/semantic-drills.mjs";
import { seal, sha256, hash } from "../packages/skill-production/common.mjs";
import { evaluateFrozenChapter } from "../packages/skill-evaluation/evaluate-chapter.mjs";
import { openProductionStore } from "../packages/skill-production/store.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let assertionCount = 0;
const assert = new Proxy(strictAssert, {
  apply(target, receiver, args) { assertionCount += 1; return Reflect.apply(target, receiver, args); },
  get(target, key) {
    const value = Reflect.get(target, key);
    return typeof value === "function" ? (...args) => { assertionCount += 1; return Reflect.apply(value, target, args); } : value;
  },
});
const catalogue = await loadFrozenSkillEvidence(root), verifier = await createMechanicsVerifier(catalogue);
const drills = createSemanticDrills(verifier), checks = [];
for (const chapter of CHAPTERS) {
  const fixtures = verifier.list(chapter.id, "heldout", { includeExpected: true });
  const q = drills.manifest.questions[chapter.id];
  for (const fixture of fixtures) {
    const values = Object.fromEntries(q.map((row) => [row.key, row.invert ? !fixture.expected[row.field] : fixture.expected[row.field]]));
    assert(drills.judge(chapter.id, { id: fixture.id, values }).passed);
    const first = Object.keys(values)[0], invalid = { ...values,
      [first]: typeof values[first] === "boolean" ? !values[first] : values[first] + 1 };
    assert(!drills.judge(chapter.id, { id: fixture.id, values: invalid }).passed);
    checks.push(fixture.id);
  }
}
assert.equal(checks.length, 36);
assert(!JSON.stringify(drills.list("setup")).includes("cardNameBlockIgnored"));
assert.throws(() => drills.judge("setup", { id: "heldout.setup.1", values: { cardNameBlockIgnored: true } }));
assert.throws(() => drills.judge("setup", { id: "heldout.movement.1", values: { card_survives_removal_rule: true } }));
const out = path.join(root, "build/ticket-17-production-redesign-v1");
await mkdir(out, { recursive: true });
const temp = await mkdtemp(path.join(out, "evaluation-tests-"));
const artifact = seal({ arm: "direct", chapterId: "setup", candidateOnly: true, published: false,
  draft: { rules: ["Injected evaluation fixture, not a production skill"] } });
const answers = verifier.list("setup", "heldout", { includeExpected: true })
  .map((f) => ({ id: f.id, values: { card_survives_removal_rule: f.expected.legal } }));
const store = openProductionStore(path.join(temp, "test.sqlite"), { runId: "evaluation-test", recipeHash: hash("fixture") });
let calls = 0;
const model = async ({ observed }) => {
  calls += 1;
  assert.equal(observed.tools.length, 0);
  assert(!JSON.stringify(observed).includes('"expected"'));
  return { command: { action: "finish", content: calls === 1 ? { predictions: [] }
    : { predictions: answers.map((p, i) => i ? p : { ...p, values: { card_survives_removal_rule: !p.values.card_survives_removal_rule } }) } } };
};
const result = await evaluateFrozenChapter({ artifact, drills, store, model });
assert.equal(calls, 2); assert.equal(result.correct, 3); assert.equal(result.schemaRepairs, 1);
assert.equal((await evaluateFrozenChapter({ artifact, drills, store, model })).hash, result.hash);
assert.equal(calls, 2); // A wrong answer is retained, not regenerated until it is right.
await assert.rejects(evaluateFrozenChapter({ artifact: { ...artifact, draft: {} }, drills, store, model }), /HASH_MISMATCH/);
const { hash: artifactHash, ...artifactBody } = artifact;
await assert.rejects(evaluateFrozenChapter({ artifact: seal({ ...artifactBody, arm: "dsh" }), drills, store,
  model: async () => ({ command: { action: "read", args: { refs: ["faq-v1:17"] } } }) }), /EVALUATION_TOOLS_FORBIDDEN/);
store.close();
const files = ["packages/skill-evaluation/semantic-drills.mjs", "packages/skill-evaluation/evaluate-chapter.mjs",
  "scripts/verify-ticket-17-semantic-drills-v1.mjs", "scripts/run-ticket-17-semantic-drills-v1.mjs"];
const codeHashes = await Promise.all(files.map(async (file) => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: assertionCount, cases: checks, catalogueHash: catalogue.hash,
  manifest: drills.manifest, codeHashes, actualKernelCasesExecuted: 72,
  paidCalls: 0, originalMetricOverwritten: false, trainingTruth: false });
try {
  const previousText = await readFile(path.join(out, "semantic-drills-readiness.json"), "utf8");
  const previous = JSON.parse(previousText);
  await writeFile(path.join(out, "semantic-drills-readiness-" + previous.hash + ".json"), previousText, { flag: "wx" });
} catch (error) { if (!["ENOENT", "EEXIST"].includes(error.code)) throw error; }
await writeFile(path.join(out, "semantic-drills-readiness.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: assertionCount, hash: report.hash }));
