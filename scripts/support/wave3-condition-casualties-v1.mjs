import assert from 'node:assert/strict';
import {resolveOfficialEffectiveCombatProfileV1} from '../../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {applyOfficialSelectedRosterResolvedDamageV1,createOfficialCurrentProductCasualtyDomainV1,resolveOfficialCurrentProductCasualtyDomainV1} from '../../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {deriveOfficialEngagementGraphV2} from '../../packages/rule-atoms/official-engagement-graph-v2.mjs';
import {hashStarcraftTmgContract as hash} from '../../packages/authoritative-engine/referee-crypto-v1.mjs';

export function conditionWave3Casualties(s,unitId,modelCount,additionalDamage=0) {
  const p=s.pieces.find(p=>p.id===unitId), profile=resolveOfficialEffectiveCombatProfileV1(s,p);
  const alive=p.models.filter(m=>!m.isDestroyed);
  const domain=createOfficialCurrentProductCasualtyDomainV1({targetPiece:p,targetProfile:profile,
    incomingDamage:profile.hitPoints*modelCount+(p.firstModelShieldCapacityApplied !== false ? profile.shield : 0)+additionalDamage,
    visibleModelIds:alive.map(m=>m.id),engagementGraph:deriveOfficialEngagementGraphV2(s),
    attackResolutionHash:hash({condition:'engineering_incoming_damage',unitId,modelCount}),rulesRuntimeHash:s.officialMissionRuntimeDescriptor?.runtimeHash??hash(s.officialModelBaseGeometryDataBundle)});
  const selection=domain.legalSelections.find(x=>x.casualtyModelIds.length===modelCount);
  assert(selection,'casualty domain: '+unitId+' '+modelCount);
  applyOfficialSelectedRosterResolvedDamageV1(s,p,profile,resolveOfficialCurrentProductCasualtyDomainV1(domain,selection.selectionHash));
}
