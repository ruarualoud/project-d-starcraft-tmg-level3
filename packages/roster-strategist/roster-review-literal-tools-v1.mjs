// Select an original literal; do not ask a model to copy its amount or invent a
// quotation. Interpretation and source selection remain model-owned.
export const ROSTER_REVIEW_LITERAL_TOOLS_V1 = 'review_literal_selection_v1';
export function compileRosterReviewLiteralToolsV1({targets,numericCheckSchema}) {
  const index=new Map();
  const rows=targets.map(target=>({findingIndex:target.findingIndex,claimQuote:target.claimQuote,
    literals:[...target.claimQuote.matchAll(/(?<![\w.])(-?\d+(?:\.\d+)?)(?![\w.])/gu)].map((match,i)=>{
      const row={claimLiteralId:`q${target.findingIndex}:n${i}`,text:match[1],
        start:match.index,end:match.index+match[1].length};
      index.set(row.claimLiteralId,{...row,findingIndex:target.findingIndex,claimQuote:target.claimQuote});
      return row;
    })}));
  const modes=['exact','rounded_to_printed_precision'];
  const properties={
    claimLiteralId:{type:'string',minLength:1,maxLength:65536},
    factId:structuredClone(numericCheckSchema.properties.factId),
    calculation:structuredClone(numericCheckSchema.properties.calculation),
    comparisonMode:{type:'string',enum:modes,minLength:Math.min(...modes.map(s=>s.length)),
      maxLength:Math.max(...modes.map(s=>s.length))},
    quantity:structuredClone(numericCheckSchema.properties.quantity),
  };
  return {
    schema:{type:'object',properties,required:Object.keys(properties),additionalProperties:false},
    node:{kind:'numeric-claim-literal-tools',version:ROSTER_REVIEW_LITERAL_TOOLS_V1,
      instructions:'For each numeric comparison choose claimLiteralId from this exact finding and a source factId (or arithmetic operands). Do NOT type a corrected claim value or rewrite its quotation: the host binds the selected original literal. IDs may contain digits that are not quantities; select the actual amount being compared. The source value is NOT the claimed amount. Text-only Rules evidence needs no numeric check. Choose rounded_to_printed_precision only for an explicitly approximate claim; exact is the default. A matched number does not prove the surrounding inference. All semantic judgments remain yours.',
      targets:rows},
    decodeOutput(wire){
      const output=structuredClone(wire);
      for(const judgment of Array.isArray(output?.judgments)?output.judgments:[]){
        if(!Array.isArray(judgment.factChecks))continue;
        judgment.factChecks=judgment.factChecks.map(check=>{
          const literal=index.get(check.claimLiteralId);
          const {claimLiteralId,comparisonMode,...rest}=check;
          if(!literal||literal.findingIndex!==judgment.findingIndex) return {...rest,
            claimedValue:'NaN',claimValueQuote:String(claimLiteralId||'missing_literal')};
          return {...rest,claimedValue:String(Number(literal.text)),claimValueQuote:literal.claimQuote,
            literalBinding:{start:literal.start,end:literal.end},comparisonMode};
        });
      }
      return output;
    },
  };
}
