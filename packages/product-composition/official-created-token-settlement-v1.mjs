import {inspectOfficialCreatedTokensV1} from '../rule-atoms/official-created-token-disposition-v1.mjs';
import {removeOfficialBattlefieldAssetV1} from './official-battlefield-asset-family-adapter-v1.mjs';

// Run after the native consumers. In particular Bombard owns the pending choice of
// where to place the replacement. Death during payment uses this same boundary.
export function settleOfficialCreatedTokensV1(after) {
  const dead = new Set(after.pieces.filter(p => p.isDestroyed === true && p.currentModels === 0).map(p => p.id));
  if (!dead.size) return [];
  const affected = new Set(after.board.tokens.filter(t => dead.has(t.createdByPieceId)).map(t => t.createdByPieceId));
  const events = [];
  for (const unitId of affected) {
    const {tokens} = inspectOfficialCreatedTokensV1(after,unitId);
    for (const token of tokens) {
      if (token.disposition !== 'remove_on_destruction') continue;
      removeOfficialBattlefieldAssetV1(after,token.tokenId);
      if (after.pendingPsionicTransferEffects?.some(e => e.tokenId === token.tokenId)) {
        after.pendingPsionicTransferEffects = after.pendingPsionicTransferEffects.filter(e => e.tokenId !== token.tokenId);
      }
      events.push({type:'created_token_removed_on_unit_destruction',pieceId:unitId,tokenId:token.tokenId,
        definitionId:token.definitionId,tokenKind:token.tokenKind,trainingTruth:false});
    }
  }
  return events;
}
