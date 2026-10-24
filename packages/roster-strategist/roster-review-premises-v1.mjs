// Read-only factual seam. The model interprets prose; Rules-owned values and
// the scope of query receipts are never recomputed by a language-model judge.
import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';
export function rosterReviewPremiseFactsV1({ sourceFacts, arithmetic }) {
  const numbers = [], texts = [];
  function walk(value, path, numericAuthority = true) {
    // A saved calculator response proves the arithmetic it performed, not
    // its model-supplied premises. This also applies to old receipts with no
    // explicit authority flag and to receipts nested inside Teach wrappers.
    if (value?.schema === 'starcraft_tmg_pregame_lab_math_receipt_v1') numericAuthority = false;
    if (Number.isFinite(value)) {
      if (numericAuthority) numbers.push({ factId: path, value });
      texts.push({ sourcePath: path, text: String(value) });
    }
    else if (typeof value === 'boolean') texts.push({ sourcePath: path, text: String(value) });
    else if (typeof value === 'string' && value.trim()) texts.push({ sourcePath: path, text: value });
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`, numericAuthority);
    }
  }
  for (const group of arithmetic.missionMarkerGroups) numbers.push({
    factId: `marker-group:${group.scoringActorId}:${group.affinityPlayerId}:${group.markerNumbers.join(',')}`,
    value: group.totalVp, scoringActorId: group.scoringActorId,
    markerNumbers: group.markerNumbers, perMarkerVp: group.perMarkerVp,
    scope: 'potential_vp_if_controlled_at_scoring_window', provesActualControl: false,
  });
  for (const fact of numbers) texts.push({ sourcePath: fact.factId, text: String(fact.value) });
  // Only source projections, not caller-supplied mathematical assumptions or
  // unverified model prose, enter the scalar catalogue.
  walk(sourceFacts.missionMarkerScoringByActor, 'missionMarkerScoringByActor');
  walk(sourceFacts.missionMarkerScoringArithmetic, 'missionMarkerScoringArithmetic');
  walk(sourceFacts.roundSupplySchedule, 'roundSupplySchedule');
  // These are the same schedule-derived facts already delivered as text, not
  // actual battlefield arrival or a claim that a placement is legal.
  walk(sourceFacts.rosterUnits, 'rosterUnits');
  walk(arithmetic.armySlots, 'armySlots');
  walk(arithmetic.rosterComposition, 'rosterComposition');
  walk(sourceFacts.selectionUnitRules, 'selectionUnitRules');
  const geometryReceipts = (sourceFacts.citedReadOnlyQueryEvidence || []).map(receipt => ({
    receiptHash: receipt.receiptHash, queryKind: receipt.queryKind || receipt.queryId,
    resultStatus: receipt.resultStatus,
    exactMoveOrDeploymentLegality: receipt.exactMoveOrDeploymentLegality === true,
  }));
  walk(sourceFacts.citedReadOnlyQueryEvidence, 'citedReadOnlyQueryEvidence');
  // These are the same source-verified Native results, not model calculations.
  // Being counterevidence rather than an old Plan citation does not remove
  // numerical authority. Keep their exact source paths for factCheck binding.
  walk(sourceFacts.availableReadOnlyQueryResultViews, 'availableReadOnlyQueryResultViews');
  // Exact source quotations can also be primitive flags/numbers. Do not force
  // the model to turn true/false into invented prose or omit valid scope flags.
  for (const [path, value] of Object.entries(sourceFacts)) walk(value, path, false);
  return { numbers, texts, geometryReceipts,
    markerQuantityAuthority: sourceFacts.missionMarkerScoringByActor || null,
    noExactHypotheticalPlacementProof: sourceFacts.noDeploymentPositionOrPathProof === true };
}

// Interpret a typed quantity, not an arbitrary scalar chosen by a reviewer.
// The model extracts actor/control-set/measure from the quoted proposition;
// the host resolves all values from the SAME Rules projection. This evaluates
// conditional scoring only, never control, future kills or observed score.
function markerQuantityFact(quantity, facts) {
  const markers = facts.markerQuantityAuthority?.markers;
  if (!Array.isArray(markers)) return null;
  const values = (actor, ids) => {
    if (!actor || !Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) return null;
    const rows = ids.map(id => markers.find(m => m.number === id)?.vpByScoringActor?.[actor]);
    return rows.every(Number.isFinite) ? rows : null;
  };
  const own = values(quantity.scoringActorId, quantity.markerNumbers);
  if (!own) return null;
  const sum = rows => rows.reduce((a,b) => a+b,0);
  let value;
  if (quantity.kind === 'marker_total' || quantity.kind === 'marker_per_marker') {
    if (quantity.opposingActorId || quantity.opposingMarkerNumbers.length) return null;
    value = quantity.kind === 'marker_total' ? sum(own)
      : own.every(v => v === own[0]) ? own[0] : null;
  } else if (quantity.kind === 'marker_margin' || quantity.kind === 'marker_transfer_swing') {
    if (quantity.opposingActorId === quantity.scoringActorId) return null;
    const other = values(quantity.opposingActorId, quantity.opposingMarkerNumbers);
    if (!other) return null;
    if (quantity.kind === 'marker_margin') {
      if (quantity.markerNumbers.some(n => quantity.opposingMarkerNumbers.includes(n))) return null;
      value = sum(own) - sum(other);
    } else {
      if (quantity.markerNumbers.length !== quantity.opposingMarkerNumbers.length
        || quantity.markerNumbers.some(n => !quantity.opposingMarkerNumbers.includes(n))) return null;
      value = sum(own) + sum(other);
    }
  }
  return Number.isFinite(value) ? {value,quantity,provesActualControl:false,
    scope:'potential_vp_if_controlled_at_scoring_window'} : null;
}

// Compatibility between the raw-query and its audited projection is local,
// exact and receipt-bound. Never search unrelated receipts for a matching word.
export function normalizeRosterReviewEvidenceReferencesV1({ output, facts }) {
  const normalized = structuredClone(output), recoveries = [];
  if (!Array.isArray(normalized?.judgments)) return { output: normalized, recoveries };
  const texts = new Map(facts.texts.map(f => [f.sourcePath, f.text]));
  const numeric = new Map(facts.numbers.map(f => [f.factId,f.value]));
  // One delivered fact has two public handles: its path and the evidence ID.
  // Resolve only exact same-catalogue aliases with the identical numeric value;
  // no nearest-name search, inferred ID or matching number from another source.
  const numericAliases = new Map(facts.texts.filter(f => numeric.has(f.sourcePath)
    && String(numeric.get(f.sourcePath)) === f.text).map(f =>
    [`fact:${hashStarcraftTmgContract(f).slice(0,24)}`,f.sourcePath]));
  for (const judgment of normalized.judgments) {
    if (Array.isArray(judgment.factChecks)) judgment.factChecks = judgment.factChecks.filter(check => {
      if (typeof check.claimValueQuote !== 'string' || /\d/u.test(check.claimValueQuote)) return true;
      recoveries.push({findingIndex:judgment.findingIndex,
        recovery:'non_numeric_extra_check_is_not_a_numeric_claim',claimValueQuote:check.claimValueQuote,
        originalPaidCheckPreserved:true,semanticJudgmentChanged:false});
      return false;
    });
    for (const check of judgment.factChecks || []) {
      // Explicit legacy representation, not a fabricated span or comparison.
      // The strict local contract requires all fields, as does the wire subset.
      if(!Object.hasOwn(check,'literalBinding')) check.literalBinding={start:-1,end:-1};
      if(!Object.hasOwn(check,'comparisonMode')) check.comparisonMode='legacy_auto';
      const resolve = factId => {
        const path = numericAliases.get(factId);
        if (!path) return factId;
        recoveries.push({findingIndex:judgment.findingIndex,from:factId,to:path,
          recovery:'same_catalogue_numeric_evidence_id_to_path',semanticJudgmentChanged:false});
        return path;
      };
      check.factId = resolve(check.factId);
      if (Array.isArray(check.calculation?.factIds)) check.calculation.factIds = check.calculation.factIds.map(resolve);
    }
    for (const check of judgment.factChecks || []) if (!Object.hasOwn(check, 'quantity')) {
      check.quantity = {kind:'retained_scalar',scoringActorId:'',markerNumbers:[],
        opposingActorId:'',opposingMarkerNumbers:[]};
      recoveries.push({findingIndex:judgment.findingIndex,
        recovery:'retained_numeric_contract_read_adapter',semanticJudgmentChanged:false});
    }
    for (const check of judgment.factChecks || []) if (!Object.hasOwn(check, 'calculation')) {
      check.calculation = { operation: 'identity', factIds: [] };
      recoveries.push({ findingIndex: judgment.findingIndex,
        factId: check.factId, recovery: 'v2_direct_fact_to_v3_identity', semanticJudgmentChanged: false });
    }
    if (!Array.isArray(judgment?.sourceEvidence)) continue;
    for (const evidence of judgment.sourceEvidence) {
      if (!evidence || typeof evidence.sourcePath !== 'string' || typeof evidence.sourceQuote !== 'string') continue;
      if (texts.get(evidence.sourcePath)?.includes(evidence.sourceQuote)) continue;
      const match = /^citedReadOnlyQueryEvidence\.(\d+)\.(.+)$/u.exec(evidence.sourcePath);
      if (!match) continue;
      const receiptHash = texts.get(`citedReadOnlyQueryEvidence.${match[1]}.receiptHash`);
      if (!receiptHash) continue;
      const candidates = facts.texts.filter(f => /^citedMathReceipts\.\d+\.receiptHash$/u.test(f.sourcePath)
        && f.text === receiptHash).map(f => `${f.sourcePath.slice(0, -'.receiptHash'.length)}.${match[2]}`)
        .filter(p => texts.has(p) && texts.get(p) === evidence.sourceQuote);
      if (candidates.length !== 1) continue;
      recoveries.push({ findingIndex: judgment.findingIndex, from: evidence.sourcePath,
        to: candidates[0], sourceQuote: evidence.sourceQuote, receiptHash,
        semanticJudgmentChanged: false });
      evidence.sourcePath = candidates[0];
    }
  }
  return { output: normalized, recoveries };
}

export function rosterReviewPremiseIssuesV1({ output, targets, facts }) {
  const numberIndex = new Map(facts.numbers.map(f => [f.factId, f]));
  const textIndex = new Map(facts.texts.map(f => [f.sourcePath, f.text]));
  const issues = [];
  for (const [index, judgment] of output.judgments.entries()) {
    const target = targets.find(t => t.findingIndex === judgment.findingIndex);
    const at = `judgments.${index}`;
    const issue = (code, detail = {}) => issues.push({ code, path: at,
      findingIndex: judgment.findingIndex, ...detail });
    let contradicted = false, checked = 0;
    const boundClaimQuotes = [];
    for (const check of judgment.factChecks) {
      const inTarget = target.claimQuote.includes(check.claimValueQuote);
      const inContext = target.claimText?.includes(check.claimValueQuote);
      // The judgment concerns the quoted allegation, not every assertion in
      // its surrounding paragraph. Keep contextual checks in the saved reply,
      // but do not let their format invalidate (or prove) another proposition.
      // Even a fabricated/other-paragraph extra cannot prove OR veto this
      // allegation. Required in-allegation literals still need full coverage;
      // a missing, false or invented check for those literals still fails.
      if (!inTarget) continue;
      let fact = numberIndex.get(check.factId);
      const typedMarkerQuantity = check.quantity && !['source_value','retained_scalar'].includes(check.quantity.kind);
      if (typedMarkerQuantity) {
        if (!/\b(?:VP|victory\s+points?)\b/iu.test(check.claimValueQuote)) {
          issue('SCORING_QUANTITY_DOMAIN_MISMATCH', { claimValueQuote: check.claimValueQuote,
            publicReason: 'marker_total/per_marker/margin/transfer_swing compute victory points only. This quote states a different quantity (for example control Supply). Use the actual queried numeric source with source_value, or for source-attribution-only analysis use bound sourceEvidence without a VP comparison. Do not change Supply into VP.' });
          continue;
        }
        // Mixing explicit quantity selection with a different subtotal is the
        // captured B failure. There is one authority path, not two operands to
        // choose between depending on which makes the allegation pass.
        fact = check.factId === '' && check.calculation?.operation === 'identity'
          && check.calculation.factIds.length === 0 ? markerQuantityFact(check.quantity, facts) : null;
      } else if (check.calculation && check.calculation.operation !== 'identity') {
        const { operation, factIds } = check.calculation;
        const values = Array.isArray(factIds)
          ? factIds.map(id => numberIndex.get(id)?.value) : [];
        const supported = values.length > 0 && values.every(Number.isFinite)
          && (operation === 'sum' || (operation === 'difference' && values.length === 2));
        fact = supported ? { value: operation === 'sum'
          ? values.reduce((sum, value) => sum + value, 0) : values[0] - values[1],
          derivedFrom: [...factIds], operation } : null;
      }
      const markerOperand = [check.factId, ...(check.calculation?.factIds || [])]
        .some(id => /^(?:marker-group:|missionMarkerScoringByActor\.markers\.)/u.test(id));
      if (facts.markerQuantityAuthority && markerOperand && !typedMarkerQuantity
        && (check.quantity?.kind === 'source_value' || judgment.claimAssessment === 'source_contradicted')) {
        issue('SCORING_QUANTITY_REQUIRED', {factId:check.factId,
          publicReason:'A subtotal is not a claim about another total. Extract the literal actor, controlled marker set and quantity kind; use the typed marker quantity, not a scalar comparison.'});
        continue;
      }
      // The claimed numeric value must occur in the literal allegation, not in
      // a reviewer's invented reason or another component's unrelated text.
      const claimedValue = /^-?\d+(?:\.\d+)?$/u.test(check.claimedValue) ? Number(check.claimedValue) : NaN;
      // Bind the numeric occurrence, not the first token of an English
      // sentence. Prefer an explicit VP amount; player1/marker identities
      // cannot cover another amount merely because its paragraph contains it.
      const vpNumbers = [...check.claimValueQuote.matchAll(/(?<![\w.])(-?\d+(?:\.\d+)?)\s*VP\b/gu)];
      let literals = (vpNumbers.length ? vpNumbers
        : [...check.claimValueQuote.matchAll(/(?<![\w.])(-?\d+(?:\.\d+)?)(?![\w.])/gu)])
        .filter(match => Number(match[1]) === claimedValue);
      if(check.literalBinding && (check.literalBinding.start!==-1 || check.literalBinding.end!==-1)){
        const {start,end}=check.literalBinding;
        const raw=target.claimQuote.slice(start,end);
        if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>target.claimQuote.length
          || check.claimValueQuote!==target.claimQuote || !/^-?\d+(?:\.\d+)?$/u.test(raw)
          || Number(raw)!==claimedValue){issue('CLAIM_LITERAL_SELECTION_NOT_BOUND');continue;}
        const match=[raw,raw];match.index=start;literals=[match];
      }
      if (check.factId.startsWith('marker-group:') && /^\s*-?\d+(?:\.\d+)?\s*$/u.test(check.claimValueQuote)) {
        issue('GROUP_VALUE_QUOTE_AMBIGUOUS', { factId: check.factId,
          claimValueQuote: check.claimValueQuote, availableClaimText: target.claimQuote,
          publicReason: 'A marker ID is not a VP sum. Quote the stated value with its unit/quantity, not a bare number.' });
        continue;
      }
      if (!fact || !(inTarget || inContext)
        || literals.length !== 1) {
        issue('FACT_PREMISE_NOT_BOUND', { factId: check.factId,
          claimValueQuote: check.claimValueQuote, availableFact: fact || null,
          availableClaimText: target.claimText || target.claimQuote });
        continue;
      }
      checked += 1;
      const quoteStart = target.claimQuote.indexOf(check.claimValueQuote);
      if (quoteStart === target.claimQuote.lastIndexOf(check.claimValueQuote)) {
        boundClaimQuotes.push({ start: quoteStart + literals[0].index,
          end: quoteStart + literals[0].index + literals[0][0].length });
      }
      const beforeLiteral=check.claimValueQuote.slice(0,literals[0].index);
      const explicitApproximation=/(?:\b(?:roughly|approximately|about|around)|[约≈~])\s*$/iu.test(beforeLiteral);
      const comparisonMode=check.comparisonMode && check.comparisonMode!=='legacy_auto'
        ? check.comparisonMode : (explicitApproximation?'rounded_to_printed_precision':'exact');
      if(comparisonMode==='rounded_to_printed_precision' && !explicitApproximation){
        issue('APPROXIMATION_NOT_DECLARED',{claimValueQuote:check.claimValueQuote});continue;
      }
      const decimals=(literals[0][1].split('.')[1]||'').length;
      const sourceComparisonValue=comparisonMode==='rounded_to_printed_precision' && decimals<=100
        ? Number(fact.value.toFixed(decimals)) : fact.value;
      contradicted ||= claimedValue !== sourceComparisonValue;
    }
    if (target.category === 'scoring' && judgment.evidenceScope === 'settled_fact'
      && judgment.claimAssessment === 'source_supported') {
      for (const literal of target.claimQuote.matchAll(/\b\d+(?:\.\d+)?\s*VP\b(?:\/round)?/gu)) {
        const covered = boundClaimQuotes.some(range => range.start === literal.index
          && range.end >= literal.index + literal[0].replace(/\/round$/u, '').length);
        if (!covered) issue('SCORING_LITERAL_NOT_CHECKED', { literalQuote: literal[0],
          availableClaimText: target.claimQuote,
          availableQuantityFacts: facts.numbers.filter(f => f.factId.startsWith('marker-group:')),
          publicReason: 'Check this actual VP assertion, not a marker ID, per-marker value or different actor total. A supported label must cover every stated rule-VP value in the allegation.' });
      }
    }
    for (const evidence of judgment.sourceEvidence) {
      if (!textIndex.get(evidence.sourcePath)?.includes(evidence.sourceQuote)) {
        issue('SOURCE_EVIDENCE_NOT_BOUND', { sourcePath: evidence.sourcePath });
      }
    }
    // A conditional CONTROL forecast does not make its underlying printed VP
    // arithmetic conditional. "If I control these, they award 4" is still wrong
    // when Rules say 2. Predictions should not bind a rule-number factCheck.
    // A wrong numeric premise contradicts the claim. The converse is false:
    // correct individual numbers do not prove a compound assertion, aggregate,
    // inference or use in another Rules context. Let the source-scope judgment
    // address those parts instead of forcing it to "supported".
    if (checked && contradicted) {
      const expected = 'source_contradicted';
      if (judgment.claimAssessment !== expected) issue('FACT_ASSESSMENT_CONFLICT', {
        suggestedClaimAssessment: expected, comparisons: judgment.factChecks.map(check => ({
          factId: check.factId, claimedValue: check.claimedValue,
          sourceValue: numberIndex.get(check.factId)?.value ?? null,
        })), publicReason: 'Compare the bound literal value to the Rules-owned value; prose is not arithmetic.' });
    }
    if (judgment.claimAssessment === 'source_contradicted') {
      if (target.category === 'spatial_assumption') {
        // Approximate entry-edge access, UNKNOWN placement and pregame routes
        // cannot disprove coverage from a different, hypothetical position.
        const exact = facts.geometryReceipts.some(receipt =>
          receipt.exactMoveOrDeploymentLegality && receipt.resultStatus !== 'unknown'
          && judgment.sourceEvidence.some(e => e.sourceQuote.includes(receipt.receiptHash)));
        if (judgment.evidenceScope !== 'exact_queried_geometry' || !exact) {
          issue('EXACT_GEOMETRY_PROOF_REQUIRED', { suggestedClaimAssessment: 'conditional_or_uncertain',
            publicReason: 'No exact queried formation/action proves this positional hypothesis impossible.' });
        }
      } else if (!checked && !judgment.sourceEvidence.length) {
        issue('BLOCKING_SOURCE_PREMISE_REQUIRED', {
          publicReason: 'Bind a numeric comparison or literal source evidence; a reviewer opinion alone is not a contradiction.' });
      }
    }
    if (judgment.claimAssessment === 'source_attribution_unsubstantiated'
      && (judgment.evidenceScope !== 'source_attribution' || !judgment.sourceEvidence.length)) {
      issue('SOURCE_ATTRIBUTION_PREMISE_REQUIRED', {
        publicReason: 'Name the literal source evidence that was misattributed; an uncertain forecast alone is not a source claim.' });
    }
  }
  return issues;
}
