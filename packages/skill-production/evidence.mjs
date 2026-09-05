import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from "../../scripts/support/official-development-tranche-source-lock-fixture-v1.mjs";
import { loadCurrentOfficialSkillFixtureV1 } from "../../scripts/support/current-official-skill-fixture-v1.mjs";
import { createOfficialFaqV1SourceLockV1 } from "../source-data/official-faq-v1-source-lock-v1.mjs";
import { sha256, seal, verifySeal, clone, freeze, fail, integer } from "./common.mjs";

// Overlapping reading topics, not a partition of all rule interactions.
export const CHAPTERS = freeze([
  { id: "setup", title: "构筑、任务与部署", topic: /before.*battle|pre.?game|building.*army|army.*building|deployment|mission/i, faq: [17, 20, 25, 26] },
  { id: "round", title: "回合、阶段与行动顺序", topic: /battle.*round|round.*phase|fight.*cycle|sequence.*play|game.*round|game sequence/i, faq: [10, 36, 37, 41] },
  { id: "movement", title: "移动、底座与队形", topic: /measur|movement|coherency|distance/i, faq: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
  { id: "assault", title: "冲锋、接战与近战", topic: /assault|charge|close combat|fight.*cycle/i, faq: [31, 32, 33] },
  { id: "combat", title: "射击、命中与伤害", topic: /attack|combat|weapon|dice|firing/i, faq: [28, 29, 30, 65, 66, 67, 68] },
  { id: "terrain", title: "地形、视线与掩护", topic: /terrain|battlefield|line of sight|elevation/i, faq: [12, 13, 14, 15, 18] },
  { id: "abilities", title: "能力、卡牌与资源", topic: /abilit|cards|resources|keyword/i, faq: [34, 35, 36, 37, 38, 39, 40] },
  { id: "tokens", title: "单位、状态与 Token", topic: /characteristic|model|unit|keyword|terminology|markers and tokens/i, faq: [1, 2, 3, 4, 21, 22, 23, 24, 27, 41, 44] },
  { id: "scoring", title: "任务控制、计分与终局", topic: /scor|victory|mission|game.*end|round/i, faq: [5, 16, 19, 60, 61, 62, 63] },
  { id: "exceptions", title: "例外、优先级与争议", topic: /keyword|fundamental|basic|introduction|quick reference/i, faq: [4, 35, 40, 53, 54, 55, 56, 57, 58, 59, 64] },
]);

export function plainHtml(html) {
  return String(html).replace(/<\s*(?:br|\/p|\/div|\/tr|\/li)\s*\/?\s*>/gi, "\n")
    .replace(/<\/?(?:td|th)\b[^>]*>/gi, " | ").replace(/<[^>]+>/g, "")
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g, (value) => ({
      "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
    })[value]).replace(/&#(x[0-9a-f]+|\d+);/gi, (_, value) => {
      const point = value[0].toLowerCase() === "x" ? parseInt(value.slice(1), 16) : Number(value);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "�";
    }).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}

function faqTextRows(raw, lock) {
  const normalize = (value) => value.replaceAll("\f", " ").replace(/\s+/g, " ").trim();
  const sections = /^(?:Units & Characteristics|Measuring & Movement|The Battlefield|Attack Sequence|Abilities & Tactics Cards|Keywords|Templates & Spillover)$|^Deployment, Entry Edges,/i;
  const rows = []; let current = null; let mode = "question";
  const finish = () => {
    if (!current) return;
    const question = normalize(current.question.join(" "));
    const answer = normalize(current.answer.join(" "));
    const indexed = lock.semanticIndex.entryIndex[rows.length];
    if (!indexed || sha256(question) !== indexed.questionHash || sha256(answer) !== indexed.answerHash) {
      fail("FAQ_TEXT_BINDING_MISMATCH", { entry: rows.length + 1 });
    }
    rows.push({ ...indexed, question, answer }); current = null;
  };
  for (const sourceLine of raw.split(/\r?\n/)) {
    const line = normalize(sourceLine);
    if (!line) continue;
    if (/^A Special Thank You/i.test(line)) { finish(); break; }
    if (sections.test(line)) { finish(); continue; }
    if (line.startsWith("Q:")) { finish(); current = { question: [line.slice(2)], answer: [] }; mode = "question"; }
    else if (current && line.startsWith("A:")) { mode = "answer"; current.answer.push(line.slice(2)); }
    else if (current && !/^(?:BACKTOTABLE OF CONTENTS|© 2026|Manufactured in|of Blizzard|by, and used under|[2-5])$/i.test(line)) current[mode].push(line);
  }
  finish();
  if (rows.length !== 68) fail("FAQ_TEXT_DENOMINATOR_MISMATCH");
  return rows;
}

export async function loadFrozenSkillEvidence(root) {
  const [sources, current] = await Promise.all([
    loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root }),
    loadCurrentOfficialSkillFixtureV1({ root }),
  ]);
  const faqRoot = path.join(root, "build/source-intake/official-rules/faq-v1-2026-09-03");
  const [pdfBytes, rawText, downloadsHtml] = await Promise.all([
    readFile(path.join(faqRoot, "StarCraft-TMG-FAQ_EN.pdf")),
    readFile(path.join(faqRoot, "StarCraft-TMG-FAQ_EN.raw.txt")),
    readFile(path.join(faqRoot, "downloads.html")),
  ]);
  const faqLock = createOfficialFaqV1SourceLockV1({ pdfBytes, rawText, downloadsHtml });
  const rows = [];
  const atoms = current.evidenceCatalogue.ruleEvidence;
  for (const indexed of sources.dataset.recordIndex) {
    if (indexed.recordType !== "rules_section") continue;
    const record = sources.dataset.recordsByKey[indexed.recordKey];
    const visit = (item, pointer, parents) => {
      const title = [...parents, item.title].filter(Boolean).join(" / ");
      const content = (item.content || []).filter((part) => part.type === "text")
        .map((part) => plainHtml(part.value)).filter(Boolean).join("\n\n");
      if (content) {
        const placeholder = /TO BE WRITTEN|VISUAL:|worked example should/i.test(content);
        rows.push(seal({ id: `core.${indexed.documentId}.${pointer.replaceAll("/", ".")}`,
          title, text: content, sourceClass: "official_rule_prose_review_required",
          sourceRecordHash: record.sourceRecordHash, locator: { recordKey: indexed.recordKey, pointer },
          sourceLockHash: sources.lock.lockHash, currentRulesReceiptHash: current.evidenceCatalogue.rulesBinding.receiptHash,
          sourceAuthorityOnly: true, executable: false, quarantined: placeholder,
          chapterIds: CHAPTERS.filter((chapter) => chapter.topic.test(title)).map((chapter) => chapter.id),
          atomIds: [], trainingTruth: false }));
      }
      (item.subItems || []).forEach((child, i) => visit(child, `${pointer}/subItems/${i}`, [title]));
    };
    (record.payload.items || []).forEach((item, i) => visit(item, `items/${i}`, [record.payload.title]));
  }
  for (const entry of faqTextRows(rawText.toString("utf8"), faqLock)) {
    const related = atoms.filter((atom) => atom.content.entryId === entry.entryId && atom.generationEligible);
    if (!related.length) fail("FAQ_CURRENT_ATOM_BINDING_MISSING", { entry: entry.entryId });
    const number = Number(entry.entryId.split(":")[1]);
    rows.push(seal({ id: entry.entryId, title: entry.question, text: entry.answer,
      sourceClass: "official_faq_current_reconciled", sourceRecordHash: entry.answerHash,
      locator: { entryId: entry.entryId, questionHash: entry.questionHash, answerHash: entry.answerHash },
      sourceLockHash: faqLock.lockHash, currentRulesReceiptHash: current.evidenceCatalogue.rulesBinding.receiptHash,
      sourceAuthorityOnly: false, executable: true, quarantined: false,
      chapterIds: CHAPTERS.filter((chapter) => chapter.faq.includes(number)).map((chapter) => chapter.id),
      atomIds: related.map((atom) => atom.atomId), trainingTruth: false }));
  }
  for (const record of current.evidenceCatalogue.sourceEvidence) {
    rows.push(seal({ id: record.evidenceId, title: record.content.name || record.evidenceId,
      text: JSON.stringify(record.content), sourceClass: "official_product_current",
      sourceRecordHash: record.contentHash, locator: record.locator,
      sourceLockHash: sources.lock.lockHash, currentRulesReceiptHash: current.evidenceCatalogue.rulesBinding.receiptHash,
      sourceAuthorityOnly: true, executable: false, quarantined: false,
      chapterIds: ["setup", "abilities", "scoring"], atomIds: [], trainingTruth: false }));
  }
  return seal({ schema: "starcraft_skill_evidence_v1", sourceBinding: {
    core: sources.lock.lockHash, faq: faqLock.lockHash, rules: current.evidenceCatalogue.rulesBinding.receiptHash,
    dataset: sources.dataset.datasetHash,
  }, rows, atomIndex: atoms.map((atom) => ({ id: atom.atomId, hash: atom.contentHash,
    executable: atom.generationEligible, dependencies: atom.content.dependencies?.atomIds || atom.content.baseAtomIds || [] })),
  counts: { atoms: atoms.length, executable: atoms.filter((row) => row.generationEligible).length,
    displayOnly: atoms.filter((row) => !row.generationEligible).length },
  sourceRefreshPerformed: false, trainingTruth: false });
}

export function createEvidenceReader(catalogue) {
  verifySeal(catalogue);
  const rows = new Map(catalogue.rows.map((row) => { verifySeal(row); return [row.id, row]; }));
  if (rows.size !== catalogue.rows.length) fail("EVIDENCE_ID_DUPLICATE");
  const reads = [];
  function query({ chapterId, query = "", offset = 0, limit = 20 } = {}) {
    if (!CHAPTERS.some((chapter) => chapter.id === chapterId)) fail("CHAPTER_UNKNOWN");
    integer(offset, 0, 10000); integer(limit, 1, 40);
    if (typeof query !== "string" || query.length > 120) fail("QUERY_INVALID");
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = catalogue.rows.filter((row) => !row.quarantined && row.chapterIds.includes(chapterId)
      && terms.every((term) => `${row.title} ${row.text}`.toLowerCase().includes(term)));
    return { total: matches.length, nextOffset: offset + limit < matches.length ? offset + limit : null,
      rows: matches.slice(offset, offset + limit).map(({ id, title, hash: h, sourceClass }) => ({ id, title, hash: h, sourceClass })) };
  }
  function read({ refs, maxChars = 18000 } = {}) {
    if (!Array.isArray(refs) || refs.length < 1 || refs.length > 12 || new Set(refs).size !== refs.length) fail("EVIDENCE_REFS_INVALID");
    integer(maxChars, 100, 48000);
    const selected = refs.map((id) => {
      const row = rows.get(id);
      if (!row || row.quarantined) fail("EVIDENCE_UNAVAILABLE", { ref: String(id).slice(0, 120) });
      return clone(row);
    });
    if (JSON.stringify(selected).length > maxChars) fail("EVIDENCE_BUDGET_EXCEEDED");
    const result = seal({ catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding, rows: selected });
    reads.push({ refs: [...refs], receiptHash: result.hash });
    return result;
  }
  function verifyQuote({ ref, quote, evidenceHash }) {
    const row = rows.get(ref);
    if (!row || row.quarantined || row.hash !== evidenceHash) return { passed: false, code: "QUOTE_BINDING_INVALID" };
    if (typeof quote !== "string" || quote.trim().length < 20 || !row.text.includes(quote)) {
      return { passed: false, code: "QUOTE_NOT_EXACT_CONTIGUOUS" };
    }
    return { passed: true, code: "QUOTE_PRESENT_NOT_ENTAILMENT", offset: row.text.indexOf(quote), sourceClass: row.sourceClass };
  }
  return Object.freeze({ query, read, verifyQuote, trace: () => clone(reads),
    binding: freeze(clone(catalogue.sourceBinding)), catalogueHash: catalogue.hash });
}
