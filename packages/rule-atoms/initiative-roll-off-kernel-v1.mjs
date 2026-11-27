// Shared with the actual product lifecycle. This enumerates the rule's finite
// probability space; it neither draws dice nor chooses a strategic outcome.
import {isDeepStrictEqual} from 'node:util';
export function describeInitiativeRollOffChanceV1(){
  return {kind:'fixed_roll_sequence',faces:6,count:4,layout:{initiativePlayer1:2,initiativePlayer2:2}};
}
export function initiativeRollOffOutcomeV1(outcomes){
  if(!Array.isArray(outcomes)||outcomes.length!==4||outcomes.some(v=>!Number.isSafeInteger(v)||v<1||v>6))
    throw Object.assign(Error('CURRENT_PRODUCT_MATCH_INITIATIVE_CHANCE_INVALID'),{code:'CURRENT_PRODUCT_MATCH_INITIATIVE_CHANCE_INVALID'});
  const player1Total=outcomes[0]+outcomes[1],player2Total=outcomes[2]+outcomes[3];
  return {player1Total,player2Total,winnerSideKey:player1Total===player2Total?null:player1Total>player2Total?'player1':'player2'};
}
export function initiativeRollOffDistributionV1(chance){
  if(!isDeepStrictEqual(chance,describeInitiativeRollOffChanceV1()))return null;
  const counts={player1:0,player2:0},representatives={};let ties=0,total=0;
  for(let a=1;a<=chance.faces;a++)for(let b=1;b<=chance.faces;b++)
    for(let c=1;c<=chance.faces;c++)for(let d=1;d<=chance.faces;d++){
      const rolls=[a,b,c,d],{winnerSideKey}=initiativeRollOffOutcomeV1(rolls);total++;
      if(!winnerSideKey){ties++;continue;}
      counts[winnerSideKey]++;representatives[winnerSideKey]??=rolls;
    }
  return {schema:'official_initiative_roll_off_distribution_v1',version:1,
    ruleSource:'current_product_match_next_round_initiative',elementaryOutcomeCount:total,tiedOutcomeCount:ties,
    tiePolicy:'repeat_until_winner',tieProbability:ties/total,randomDraws:0,
    reduction:'sum_geometric_series_of_ties_with_no_gameplay_progress',
    branches:Object.entries(counts).map(([winnerSideKey,count])=>({winnerSideKey,
      singleAttemptOutcomeCount:count,singleAttemptProbability:count/total,
      eventualProbability:count/(total-ties),probabilityFraction:{numerator:count,denominator:total-ties},
      representativeRolls:representatives[winnerSideKey]})),
    representativePurpose:'deterministic_native_execution_of_each_equivalent_winner_case_not_a_sample_or_real_roll'};
}
