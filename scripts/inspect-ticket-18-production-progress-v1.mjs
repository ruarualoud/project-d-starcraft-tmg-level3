import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, verifySeal, seal, fail } from '../packages/skill-production/common.mjs';
import { factionBudgetEpochProgressV1 } from '../packages/skill-production-v3/faction-budget-epoch-v1.mjs';

// Read-only operator view. Historical chapter results are not final Skills and
// are not silently requalified under the current production entrypoint.
const args = process.argv.slice(2);
if (args.length !== 1 || !/^faction-v1-[a-f0-9]{20}$/u.test(args[0])) fail('PROGRESS_RUN_ARGUMENTS');
const requestedRunId = args[0], base = 'build/ticket-18-faction-production-v1/';
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const decode = raw => raw ? verifySeal(JSON.parse(raw)).value : null;
try {
  const attempts = db.prepare('SELECT run,id,state,reserve,settled,usage,code,token_reserve FROM attempts ORDER BY run,id').all();
  const paymentRequired = attempts.filter(a => a.code === 'PROVIDER_PAYMENT_REQUIRED').length;
  const summary = rows => ({ calls: rows.length, knownTokens: rows.reduce((n, a) => n + (decode(a.usage)?.totalUnits || 0), 0),
    reservedOrSettledTokens: rows.reduce((n, a) => n + (decode(a.usage)?.totalUnits ?? (a.state === 'not_sent' ? 0 : a.token_reserve)), 0),
    estimatedOrReservedMicros: rows.reduce((n, a) => n + (a.settled ?? a.reserve), 0),
    unknownUsageCalls: rows.filter(a => !a.usage && a.state !== 'not_sent').length,
    activeAttempts: rows.filter(a => a.state === 'intent').map(({ run, id }) => ({ run, id })) });
  const global = summary(attempts);
  const chain = [], historical = new Map(), recordedInAncestors = new Set();
  let cursor = requestedRunId, nextExpectedHash = null;
  let launchPreparationOnly = false;
  while (cursor) {
    if (!/^faction-v1-[a-f0-9]{20}$/u.test(cursor) || chain.some(r => r.runId === cursor) || chain.length >= 256)
      fail('PROGRESS_ANCESTRY_INVALID');
    let recipe;
    try { recipe = verifySeal(JSON.parse(await readFile(base + cursor + '/recipe.json', 'utf8'))); }
    catch (error) {
      if (error.code !== 'ENOENT' || chain.length || db.prepare('SELECT 1 FROM runs WHERE id=?').get(cursor)) throw error;
      launchPreparationOnly = true; break;
    }
    const actual = db.prepare('SELECT recipe FROM runs WHERE id=?').get(cursor);
    if (cursor !== 'faction-v1-' + recipe.hash.slice(0, 20) || nextExpectedHash && nextExpectedHash !== recipe.hash
      || actual && actual.recipe !== recipe.hash) fail('PROGRESS_RECIPE_DRIFT');
    const results = db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete' AND id LIKE 'faction.%.result'")
      .all(cursor).map(row => ({ id: row.id, value: decode(row.artifact) }));
    for (const row of results) {
      verifySeal(row.value);
      if (!row.value.section?.id || row.id !== row.value.section.id + '.result') fail('PROGRESS_SECTION_DRIFT');
      if (chain.length) recordedInAncestors.add(row.value.section.id);
      if (!historical.has(row.id)) historical.set(row.id, { section: row.value.section.id,
        ownerRunId: cursor, semanticReviewPassed: row.value.semanticReviewPassed === true, resultHash: row.value.hash });
    }
    chain.push({ runId: cursor, recipeHash: recipe.hash });
    const parent = recipe.continuation ? verifySeal(recipe.continuation) : null;
    cursor = parent?.parentRunId || null; nextExpectedHash = parent?.parentRecipeHash || null;
  }
  const chainIds = new Set(chain.map(r => r.runId));
  const currentResults = [...historical.values()].filter(r => r.ownerRunId === requestedRunId);
  const chainSummary = summary(attempts.filter(a => chainIds.has(a.run)));
  const current = summary(attempts.filter(a => a.run === requestedRunId));
  const sections = ['terran_armed_forces', 'zerg_swarm'].map(faction => {
    const list = [...historical.values()].filter(r => r.section.startsWith('faction.' + faction + '.'));
    return { faction, historicalReviewedSections: list.filter(r => r.semanticReviewPassed).length,
      currentRunMaterializedReviewedSections: currentResults.filter(r => r.section.startsWith('faction.' + faction + '.') && r.semanticReviewPassed).length,
      firstRecordedReviewedSectionsThisRun: currentResults.filter(r => r.section.startsWith('faction.' + faction + '.')
        && r.semanticReviewPassed && !recordedInAncestors.has(r.section)).length,
      historicalResults: list, finalSkillAcceptanceInferred: false };
  });
  const cumulativeMicros = 34013743 + global.estimatedOrReservedMicros;
  let epoch = null;
  try { epoch = verifySeal(JSON.parse(await readFile(base + 'budget-epoch-2026-09-09-reset-v1.json', 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const budgetEpoch = factionBudgetEpochProgressV1({ extension: epoch, global: seal({ calls: global.calls,
    knownTokens: global.knownTokens, reservedOrSettledMicros: global.estimatedOrReservedMicros }) });
  console.log(JSON.stringify({ ticket: 18, slice: 174, requestedRunId, launchPreparationOnly, paymentRequired,
    budgetEpoch,
    mustStopAllWork: paymentRequired > 0, current, chain: { runs: chain.length, ...chainSummary }, sections,
    runningSteps: db.prepare("SELECT id,state FROM steps WHERE run=? AND state='running' ORDER BY id").all(requestedRunId),
    cumulativeKnownTokensLowerBound: 2864424 + global.knownTokens,
    cumulativeEstimateOrReserveCny: cumulativeMicros / 1e6, globalAttempts: global.calls,
    globalActiveAttempts: global.activeAttempts, globalUnknownUsageCalls: global.unknownUsageCalls,
    ledgerDigest: hash(attempts), newProviderCalls: 0, databaseReadOnly: true,
    historicalResultIsNotCurrentQualification: true, skillAcceptanceInferred: false, invoice: false, trainingTruth: false }));
  if (paymentRequired) process.exitCode = 2;
} finally { db.close(); }
