// Shared by live reply consumption and saved-reply correction reconstruction.
// Only an omitted, inert query list has a default; no strategic field is inferred.
export function projectRosterCatalogueEnvelopeV1({output,enabled}){
  if(!enabled||!output||typeof output!=='object'||Array.isArray(output)
    ||Object.hasOwn(output,'catalogueQueries'))return {output,projection:[]};
  return {output:{...output,catalogueQueries:[]},projection:[{
    to:'/catalogueQueries',value:[],rule:'legacy_experiment_no_catalogue_request_v1'}]};
}
