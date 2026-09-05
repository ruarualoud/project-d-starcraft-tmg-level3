import { seal, verifySeal, hash, exact, fail } from "../skill-production/common.mjs";

export async function evaluateFrozenChapter({ artifact, drills, store, model }) {
  verifySeal(artifact);
  if (!["dsh", "direct"].includes(artifact.arm) || !artifact.candidateOnly || artifact.published) fail("EVALUATION_ARTIFACT_INVALID");
  const cases = drills.list(artifact.chapterId);
  const input = { candidateHash: artifact.hash, cases, manifestHash: drills.manifest.hash };
  const id = artifact.arm + "." + artifact.chapterId + ".semantic-drill";
  const lease = store.acquire(id, input);
  if (lease.cached) return lease.artifact;
  const task = "Answer each question using only this frozen candidate Skill, not remembered video-game rules. " +
    "These questions each concern only the explicitly named rule, not complete action legality. " +
    "Return action finish with content {predictions:[{id,values:{question_key:boolean_or_number}}]}. " +
    "Cover every case and every question key exactly once. No tools, commentary, invented receipts or test claims.\n" +
    JSON.stringify({ skill: artifact.draft, cases });
  let prior = null, errorCode = null;
  try {
    for (let repair = 0; repair <= 1; repair += 1) {
      const response = await model({ stageId: id + ".answer-" + repair, call: 1, maxOutput: 1536,
        observed: { system: "Independent rules comprehension evaluator. No generation or reviewer history is available.",
          tools: [], messages: [{ role: "user", content: task + (repair
            ? "\nRepair JSON schema only. Do not change answers to chase a score; expected answers were not provided. " + JSON.stringify({ prior, errorCode }) : "") }] } });
      try {
        if (response.command.action !== "finish") fail("EVALUATION_TOOLS_FORBIDDEN");
        prior = response.command.content; exact(prior, ["predictions"]);
        if (!Array.isArray(prior.predictions) || prior.predictions.length !== cases.length) fail("EVALUATION_DENOMINATOR_INVALID");
        const ids = new Set(cases.map((c) => c.id));
        const predictions = prior.predictions.map((row) => {
          if (!ids.delete(row.id)) fail("EVALUATION_CASE_INVALID");
          return drills.judge(artifact.chapterId, row);
        });
        const result = seal({ arm: artifact.arm, chapterId: artifact.chapterId,
          candidateHash: artifact.hash, candidateDraftHash: hash(artifact.draft), inputHash: hash(input),
          predictions, correct: predictions.filter((p) => p.passed).length, cases: cases.length,
          schemaRepairs: repair, freshContext: id, expectedAnswersExposed: false, toolsUsed: false,
          originalMetricOverwritten: false, supplementaryPostHoc: true, dshBenefitProven: false, trainingTruth: false });
        return store.finish(lease, result);
      } catch (error) { errorCode = error.code || "EVALUATION_SCHEMA_INVALID"; if (repair || errorCode === "EVALUATION_TOOLS_FORBIDDEN") throw error; }
    }
  } catch (error) { store.release(lease); throw error; }
}
