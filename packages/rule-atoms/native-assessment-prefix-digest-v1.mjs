import { createHash } from "node:crypto";

// Computational reuse only: derive the exact array text from every current row.
// No caller can inject a digest/checkpoint. One private owner retains just the
// preceding sequence, and equal row text is required before copying hash work.
export function createNativeAssessmentPrefixDigestV1(algorithm) {
  let prior = null;
  return Object.freeze({
    digest(texts) {
      const text = `[${texts.join(",")}]`;
      let common = 0;
      while (prior && common < texts.length && common < prior.texts.length
        && texts[common] === prior.texts[common]) common++;
      const boundaries = [];
      let characters = 1;
      let nextBoundary = 128;
      for (let index = 0; index < texts.length; index++) {
        characters += (index > 0 ? 1 : 0) + texts[index].length;
        if (index + 1 === nextBoundary || index + 1 === texts.length) {
          boundaries.push({ count: index + 1,
            characters: characters + (index + 1 === texts.length ? 1 : 0) });
          nextBoundary *= 2;
        }
      }
      let reusable = -1;
      for (const [index, checkpoint] of (prior?.checkpoints || []).entries()) {
        const current = boundaries[index];
        // A complete shorter array includes ']' and is not a longer prefix.
        if (!current || checkpoint.count > common
          || checkpoint.count !== current.count
          || checkpoint.characters !== current.characters) break;
        reusable = index;
      }
      const digest = reusable >= 0 ? prior.checkpoints[reusable].digest.copy()
        : createHash(algorithm).update('{"assessments":');
      let offset = reusable >= 0 ? prior.checkpoints[reusable].characters : 0;
      const checkpoints = reusable >= 0
        ? prior.checkpoints.slice(0, reusable + 1) : [];
      for (const boundary of boundaries.slice(reusable + 1)) {
        digest.update(text.slice(offset, boundary.characters));
        checkpoints.push({ ...boundary, digest: digest.copy() });
        offset = boundary.characters;
      }
      digest.update(text.slice(offset));
      prior = { texts: texts.slice(), checkpoints };
      return { digest, text };
    },
  });
}
