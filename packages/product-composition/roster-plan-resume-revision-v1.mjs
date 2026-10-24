import {createStarcraftTmgPlayerSpatialObservationV1} from
  '../online-agent-session/player-spatial-observation-v1.mjs';
import {projectStarcraftTmgRosterPlanAttachmentV1} from
  '../online-agent-session/hosted-bot-seat-runtime-v1.mjs';

// Same-match advisory memory update, not a Room action. Call before the seat
// driver starts. A successful in-memory append is insufficient: read the actual
// journal adapter before the host records the new active Plan identity.
export async function adoptReviewedPregameResumeRevisionV1({prepared,roomRuntime,
  roomId,seatToken,scope,turnPlanRuntime,spatialRuntime,journal}) {
  await turnPlanRuntime.hydrate({scope});
  const before=turnPlanRuntime.read({scope});
  const read=await roomRuntime.readRoom({roomId,seatToken});
  const legal=await roomRuntime.legalSpace({roomId,seatToken});
  if(!read?.ok||!legal?.ok)throw Error('ROSTER_PLAN_RESUME_REVISION_AUTHORITY_UNAVAILABLE');
  const spatialObservation=createStarcraftTmgPlayerSpatialObservationV1({
    roomProjection:read.projection,legalSpace:legal.legalSpace});
  const spatialActionSpace=await spatialRuntime.actionSpace({roomProjection:read.projection,
    legalSpace:legal.legalSpace,spatialObservation});
  const transition=await turnPlanRuntime.dispatch({scope,roomProjection:read.projection,
    legalSpace:legal.legalSpace,spatialObservation,spatialActionSpace,
    ...projectStarcraftTmgRosterPlanAttachmentV1(prepared)});
  const persisted=await journal.read(before.scope);
  const saved=(persisted?.records||[]).filter(row=>['turn_plan','plan_revision'].includes(row.kind)).at(-1);
  if(persisted?.ok!==true||saved?.payload?.pregamePlanOrigin?.rosterPlanHash!==prepared.plan.planHash
    ||saved.payload.version!==transition.plan.version) {
    throw Error('ROSTER_PLAN_RESUME_REVISION_NOT_DURABLE');
  }
  const after=await roomRuntime.readRoom({roomId,seatToken});
  if(!after?.ok||after.projection.room.stateHash!==read.projection.room.stateHash
    ||after.projection.room.stateRevision!==read.projection.room.stateRevision) {
    throw Error('ROSTER_PLAN_RESUME_REVISION_ROOM_CHANGED');
  }
  return {schemaVersion:'starcraft_tmg_same_room_reviewed_plan_revision_v1',
    roomId,seatKey:scope.seatKey,fromPlanHash:prepared.replacesRosterPlanHash,
    toPlanHash:prepared.plan.planHash,finalReviewHash:prepared.finalReviewHash,
    stateRevision:read.projection.room.stateRevision,stateHash:read.projection.room.stateHash,
    turnPlanId:transition.plan.planId,turnPlanVersion:transition.plan.version,
    transitionHash:transition.transitionHash,journalRecordHash:saved.recordHash,
    journalRecordCount:persisted.records.length,event:transition.result.event,
    reflectionRequired:transition.reflectionRequired,roomActions:0,providerCalls:0,trainingTruth:false};
}
