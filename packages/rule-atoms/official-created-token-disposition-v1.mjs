import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {verifyOfficialBattlefieldTokenV1} from './official-battlefield-token-marker-rules-kernel-v1.mjs';

function bound(rows, field, matches, token) {
  const candidates = (rows ?? []).filter(row => !row.consumed && matches(row));
  if (candidates.length !== 1) throw Error('CREATED_TOKEN_SOURCE_BINDING_REQUIRED:' + token.tokenId);
  const {[field]: signature, ...body} = candidates[0];
  if (signature !== hash(body) || (body.sourcePieceId ?? body.pieceId) !== token.createdByPieceId) {
    throw Error('CREATED_TOKEN_SOURCE_BINDING_INVALID:' + token.tokenId);
  }
  return candidates[0];
}

// A paid phase effect can outlive its caster without acquiring STAY IN PLAY at cleanup.
function disposition(state, token) {
  verifyOfficialBattlefieldTokenV1(token, state.officialBattlefieldTokenMarkerRegistry);
  const row = {tokenId:token.tokenId, tokenKind:token.tokenKind, stayInPlay:token.stayInPlay,
    definitionId:null, sourceFeatureHash:null, disposition:token.stayInPlay ? 'retain_stay_in_play' : 'remove_on_destruction',
    lifecycleWindows:[]};
  let source;
  if (token.tokenKind === 'psionic_storm') {
    source = bound(state.officialPsionicStormCenters,'anchorHash',r => r.id === token.tokenId,token);
    if (source.round !== token.createdRound || ![
      'unit:high_templar/psionic-storm-movement-phase@1',
      'unit:twilight_templar__high_templar_/psionic-gale-movement-phase@1'
    ].includes(source.definitionId)) throw Error('CREATED_TOKEN_STORM_SOURCE_INVALID');
    row.disposition = 'retain_delayed_effect';
    row.lifecycleWindows = ['movement_phase_end','assault_phase_end','round_cleanup'];
  } else if (token.tokenKind === 'corrosive_bile') {
    source = bound(state.pendingCorrosiveBileEffects,'effectHash',r => r.tokenIds.includes(token.tokenId),token);
    if (source.definitionId !== 'unit:ravager/corrosive-bile-movement-phase@1' || !source.survivesSourceDestruction
      || source.round !== token.createdRound) throw Error('CREATED_TOKEN_BILE_SOURCE_INVALID');
    row.disposition = 'retain_delayed_effect';
    row.lifecycleWindows = [source.trigger];
  } else if (token.tokenKind === 'bile_bomb') {
    source = bound(state.officialBombardBindings,'bindingHash',r => r.tokenId === token.tokenId,token);
    if (source.definitionId !== state.officialBombardSourceBundle?.definitionId) throw Error('CREATED_TOKEN_BOMBARD_SOURCE_INVALID');
    row.disposition = 'replace_before_removal';
    row.lifecycleWindows = ['place_contact_creep_tumor'];
  } else if ((state.pendingPsionicTransferEffects ?? []).some(r => !r.consumed && r.tokenId === token.tokenId)) {
    source = bound(state.pendingPsionicTransferEffects,'effectHash',r => r.tokenId === token.tokenId,token);
  } else if ((state.officialBattlefieldAssetBindings ?? []).some(r => !r.consumed && r.assetId === token.tokenId)) {
    source = bound(state.officialBattlefieldAssetBindings,'bindingHash',r => r.assetId === token.tokenId,token);
    if (source.assetHash !== token.tokenHash || source.assetKind !== token.tokenKind) throw Error('CREATED_TOKEN_ASSET_MISMATCH');
  }
  row.definitionId = source?.definitionId ?? source?.sourceDefinitionId ?? null;
  row.sourceFeatureHash = source?.sourceFeatureHash ?? null;
  return row;
}

export function inspectOfficialCreatedTokensV1(state, unitId) {
  if (!state.officialCreatorTokenLifecycle) throw Error('CREATOR_TOKEN_LIFECYCLE_UNAVAILABLE');
  const piece = state.pieces.find(p => p.id === unitId);
  if (!piece) throw Error('CREATOR_UNIT_UNKNOWN');
  const tokens = state.board.tokens.filter(t => !t.isRemoved && t.createdByPieceId === unitId)
    .map(t => disposition(state,t)).sort((a,b) => a.tokenId.localeCompare(b.tokenId));
  return {schema:'native_created_token_dispositions_v1',unitId,condition:'last_model_destroyed',
    sourceDestroyed:piece.isDestroyed === true && piece.currentModels === 0,tokens};
}
