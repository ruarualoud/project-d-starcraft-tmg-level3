import assert from 'node:assert/strict';

// One single-model unit. Read the signed edge and board dimensions from the returned redeploy domain.
export function deploymentOptions(domain, unit) {
  const {entrySegments, battlefieldWidthMilliInches: width, battlefieldHeightMilliInches: height} = domain.constraints;
  const models = unit.models.filter(model=>!model.isDestroyed);
  assert.equal(models.length,1);
  const inset = Math.ceil(models[0].baseWidthInches*500) + 250;
  const choices = [];
  for (const segment of entrySegments) {
    const {startCoordinate: start, endCoordinate: end} = segment;
    const horizontal = start.y===end.y;
    assert(horizontal || start.x===end.x);
    for (const fraction of [0.15,0.85,0.25,0.75,0.5]) {
      let x = Math.round((start.x + (end.x-start.x)*fraction)*1000);
      let y = Math.round((start.y + (end.y-start.y)*fraction)*1000);
      const along = horizontal ? x : y;
      if (horizontal) y += y < height/2 ? inset : -inset;
      else x += x < width/2 ? inset : -inset;
      choices.push({deployment:{leadingModelId:models[0].id,entrySegmentId:segment.segmentId,
        entryAlongEdgeMilliInches:along,path:[{xMilliInches:x,yMilliInches:y,elevation:'ground',supportTerrainIds:[]}],placements:[]}});
    }
  }
  return choices;
}
