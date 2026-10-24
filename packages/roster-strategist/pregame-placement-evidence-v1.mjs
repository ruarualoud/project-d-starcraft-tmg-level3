// Evidence scope, not another geometry evaluator. Native owns every check.
// This projection also explains retained receipts without changing their hashes.
const HASH = /^[a-f0-9]{64}$/u;
export function projectPregameStaticPlacementUnitV1(unit) {
  const passed = unit.resultStatus === 'ok'
    && HASH.test(unit.nativeGeometryResultHash || '')
    && unit.coherencyStatus?.status === 'in_coherency';
  return { pieceId: unit.pieceId,
    nativeStaticGeometryStatus: passed ? 'passed' : 'not_proven',
    nativeGeometryResultHash: unit.nativeGeometryResultHash || null,
    coherencyStatus: unit.coherencyStatus?.status || 'unknown',
    unknownReason: unit.unknownReason || null,
    proofScope: passed ? (unit.geometryProofKind === 'conditional_snapshot'
      ? 'native_2d_snapshot_base_fit_non_overlap_and_coherency_not_action_admission'
      : 'native_2d_footprint_fit_overlap_separation_and_coherency_at_supplied_positions') : null,
    excludes: ['arrival_history', 'movement_path', 'phase_and_action_resources',
      'full_3d_surface_legality', 'objective_control', 'awarded_vp', 'strategic_optimality'] };
}

export function collectPregameGeometryEvidenceV1(value) {
  const rows = new Map();
  const seen = new Set();
  function visit(node) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (node.schema === 'starcraft_tmg_pregame_lab_scenario_branch_receipt_v1'
      && HASH.test(node.receiptHash || '') && HASH.test(node.branchStateHash || '')
      && Array.isArray(node.hypotheticalPlacementAssessment?.units)) {
      rows.set(node.receiptHash, { sourceReceiptHash: node.receiptHash,
        sourceStateHash: node.sourceStateHash, branchStateHash: node.branchStateHash,
        conditionalScene: true, provenArrivalHistory: false,
        provenFutureOpponentChoice: false,
        units: node.hypotheticalPlacementAssessment.units.map(projectPregameStaticPlacementUnitV1),
        legacyPlacementLegalityProvenMeans: 'complete_action_or_arrival_not_proven;does_not_negate_reported_native_static_checks',
        wholeQuestionAnswered: false, trainingTruth: false });
    }
    for (const child of Object.values(node)) visit(child);
  }
  visit(value);
  return [...rows.values()];
}
