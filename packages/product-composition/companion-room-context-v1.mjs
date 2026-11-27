import { assertSameOfficialQueryReleaseV2 } from '../source-data/official-release-context-v2.mjs';

// A companion needs the current player-visible battlefield, not every frozen
// catalogue and compilation audit embedded in the Native execution envelope.
// Terrain is dictionary encoded without approximating its footprints.
const clone = value => structuredClone(value);
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value && key in value).map(key => [key, clone(value[key])]));
const boundsKeys = ['minXMilliInches','maxXMilliInches','minYMilliInches','maxYMilliInches'];
function rectangleBounds(footprint) {
  if(footprint?.shape !== 'axis_aligned_rectangle' || Object.keys(footprint).length !== 5
    || !boundsKeys.every(key => Number.isSafeInteger(footprint[key]))) return null;
  return boundsKeys.map(key => footprint[key]);
}
export function encodeCompanionTerrainV1(terrain) {
  const groups = [], byCommon = new Map();
  for (const [index, piece] of (terrain || []).entries()) {
    const { id, terrainId, terrainHash, footprint, originalFootprint, ...common } = piece;
    const key = JSON.stringify(common);
    let group = byCommon.get(key);
    if (!group) { group = { common: clone(common), runs: [], cells: [] }; byCommon.set(key, group); groups.push(group); }
    const bounds=rectangleBounds(footprint), match=typeof id==='string'&&id.match(/^(.*?)([1-9][0-9]*)$/u);
    if(bounds && match && terrainId===id && JSON.stringify(originalFootprint)===JSON.stringify(footprint)
      && Number.isSafeInteger(Number(match[2]))) {
      let run=group.runs.at(-1);
      if(!run || run.startIndex+run.deltas.length+1!==index || run.idPrefix!==match[1]
        || run.firstId+run.deltas.length+1!==Number(match[2])) {
        run={startIndex:index,idPrefix:match[1],firstId:Number(match[2]),firstBounds:bounds,deltas:[]};
        group.runs.push(run);
      } else {
        const previous=run._lastBounds||run.firstBounds;
        run.deltas.push(bounds.map((value,i)=>value-previous[i]));
      }
      // Internal accumulation only; never serialized into model context.
      Object.defineProperty(run,'_lastBounds',{value:bounds,writable:true,configurable:true});
    } else group.cells.push([index, id, terrainId, clone(footprint),
      JSON.stringify(originalFootprint) === JSON.stringify(footprint) ? '=' : clone(originalFootprint)]);
  }
  return { encoding: 'shared_properties_rectangle_delta_runs_v2',
    columns: ['originalIndex', 'id', 'terrainId', 'footprint', 'originalFootprint (= means same as footprint)'],
    runColumns: ['minXMilliInches','maxXMilliInches','minYMilliInches','maxYMilliInches'],
    runDecoding: 'First cell uses firstBounds; each delta is added to previous bounds. Index and numeric id suffix increase by one. id=terrainId=idPrefix+suffix; originalFootprint=footprint. All bounds are exact, not rounded.',
    coordinateUnit: 'milli-inch', count: (terrain || []).length, groups,
    excludedMetadata: ['terrainHash'], geometrySimplified: false };
}
export function decodeCompanionTerrainV1(table) {
  return table.groups.flatMap(group => [...group.cells.map(([index, id, terrainId, footprint, original]) => ({
    index, piece: { ...clone(group.common), id, terrainId, footprint: clone(footprint),
      originalFootprint: clone(original === '=' ? footprint : original) },
  })), ...(group.runs||[]).flatMap(run=>{
    let bounds=[...run.firstBounds];
    return [null,...run.deltas].map((delta,offset)=>{
      if(delta)bounds=bounds.map((value,i)=>value+delta[i]);
      const footprint={shape:'axis_aligned_rectangle',...Object.fromEntries(boundsKeys.map((key,i)=>[key,bounds[i]]))};
      const id=run.idPrefix+(run.firstId+offset);
      return {index:run.startIndex+offset,piece:{...clone(group.common),id,terrainId:id,
        footprint,originalFootprint:clone(footprint)}};
    });
  })]).sort((a, b) => a.index - b.index).map(row => row.piece);
}

export function encodeCompanionModelsV1(models=[]) {
  const groups=[], byCommon=new Map();
  for(const [index,{id,...common}] of models.entries()) {
    const key=JSON.stringify(common);
    let group=byCommon.get(key);
    if(!group){group={common:clone(common),items:[]};groups.push(group);byCommon.set(key,group);}
    group.items.push([index,id]);
  }
  return {encoding:'shared_model_properties_v1',columns:['originalIndex','id'],groups};
}
export function decodeCompanionModelsV1(table) {
  return table.groups.flatMap(group=>group.items.map(([index,id])=>({index,model:{...clone(group.common),id}})))
    .sort((a,b)=>a.index-b.index).map(row=>row.model);
}

const STATE_KEYS=['round','phase','stage','activeSideKey','firstPlayerSideKey','firstPassSideByPhase',
  'phaseFirstActorByRound','players','participantIds','teamGame','mission','selectedMission','selectedDeployment',
  'scores','scoringResolvedThisPhase','supplyDestroyedThisRound','terminal','terminalReason','gameOver','winner',
  'omittedRules','gameClock','engagementScale','cardResources','armyResourceBudgetsBySide',
  'officialMissionMarkerPlacement','officialMissionRuntimeState','officialDeploymentGeometryBinding',
  'officialBattlefieldTokenMarkerRegistry'];
const PIECE_KEYS=['id','name','unitId','sideKey','compositionKind','currentModels','maxModels','currentSupply',
  'damageMarker','statuses','activatedPhases','usedActiveAbilities','usedReactions','isOnField','isDestroyed',
  'isInReserves','destroyedModelIds','selectedUpgradeNames','weaponChoices','assignedUpgradeByModelId',
  'combatEffects','assaultEffects','coherencyStatus','abilities'];
const UNIT_KEYS=['id','unitId','name','sideKey','faction','profileSize','armySlotType','base','currentModels',
  'maxModels','currentSupply','mineralCost','location','damage','hpPerModel','shieldPerModel','totalDurability',
  'remainingDurability','stats','tags','keywords','abilities','inspectionCoverage'];
const WEAPON_KEYS=['name','phase','range','roa','hit','dmg','surge','target','keywords','sourceUpgradeName'];
function compactWorkbench(workbench={}) {
  const result=pick(workbench,['scenario','deployment','scoreboard','coverage','authority']);
  result.units=(workbench.units||[]).map(unit=>({...pick(unit,UNIT_KEYS),
    upgrades:(unit.upgrades||[]).filter(upgrade=>upgrade.selected).map(upgrade=>pick(upgrade,['name','description'])),
    weapons:(unit.weapons||[]).map(weapon=>pick(weapon,WEAPON_KEYS))}));
  result.threat=pick(workbench.threat,['relationships','coverage','coverageReason','dependencies']);
  result.rulesQuickView=pick(workbench.rulesQuickView,['coverage','coverageReason','rulesVersion','binding','actionContexts','unresolvedKeywords','authority']);
  result.tokenMarkerActions=pick(workbench.tokenMarkerActions,['coverage','coverageReason','actions','unsupported','currentLegalSpace','authority']);
  return result;
}
function terrainSummary(table) {
  return {encoding:'terrain_properties_and_envelopes_v1',count:table.count,coordinateUnit:table.coordinateUnit,
    exactFootprintsIncluded:false,envelopesAreNotFootprints:true,
    groups:table.groups.map(group=>({common:group.common,count:group.cells.length+group.runs.reduce((n,run)=>n+run.deltas.length+1,0),
      regions:group.runs.map(run=>{
        let bounds=[...run.firstBounds], envelope=[...bounds];
        for(const delta of run.deltas){bounds=bounds.map((v,i)=>v+delta[i]);envelope=envelope.map((v,i)=>i%2?Math.max(v,bounds[i]):Math.min(v,bounds[i]));}
        return {idPrefix:run.idPrefix,count:run.deltas.length+1,envelope};
      }),unencodedCellIds:group.cells.map(cell=>cell[1])})),
    instruction:'Envelopes describe extents only, never occupied area, collision, movement legality or line of sight. Exact footprints remain in the room service; use Rules Preview for precise questions.'};
}
export function projectCompanionRoomContextV1(roomProjection, workbench, {includeTerrainCells=false}={}) {
  const release = roomProjection.matchBinding?.releaseBinding;
  assertSameOfficialQueryReleaseV2(release, workbench?.releaseBinding);
  if (release && (roomProjection.room.roomId !== workbench.roomId
    || roomProjection.matchBinding.bindingHash !== workbench.matchBindingHash
    || roomProjection.room.stateRevision !== workbench.stateRevision
    || roomProjection.room.stateHash !== workbench.stateHash
    || roomProjection.viewer.seatKey !== workbench.viewerSideKey)) {
    throw Object.assign(Error('COMPANION_ROOM_CONTEXT_STALE'), {code:'COMPANION_ROOM_CONTEXT_STALE'});
  }
  const source = roomProjection.state || {};
  const excluded = Object.keys(source).filter(key => !STATE_KEYS.includes(key) && !['board','pieces'].includes(key));
  const state = pick(source,STATE_KEYS);
  const { terrain, ...board } = source.board || {};
  const terrainTable=encodeCompanionTerrainV1(terrain);
  state.board = { ...pick(board,['widthInches','heightInches','centerMarkers','effectMarkers','scenarioMapId',
    'scenarioMapName','deploymentId','deploymentName','accessPoints','tokens','markers','missionMarkers']),
    ...(includeTerrainCells?{terrainTable}:{terrainSummary:terrainSummary(terrainTable)}) };
  state.pieces=(source.pieces||[]).map(piece=>({...pick(piece,PIECE_KEYS),modelTable:encodeCompanionModelsV1(piece.models)}));
  state.pieceCommon={};
  if(state.pieces.length) for(const key of PIECE_KEYS) {
    if(state.pieces.every(piece=>key in piece&&JSON.stringify(piece[key])===JSON.stringify(state.pieces[0][key]))) {
      state.pieceCommon[key]=state.pieces[0][key];
      state.pieces.forEach(piece=>{delete piece[key];});
    }
  }
  state.publicRosterDisclosureBySide=Object.fromEntries(Object.entries(source.publicRosterDisclosureBySide||{})
    .map(([side,roster])=>[side,{...pick(roster,['playerId','unitEntriesComplete','undisclosedRosterRemainderExists',
      'factionAndTacticalCardsFaceUp','rosterVisibility']),publicCards:(roster.publicCards||[])
      .map(card=>pick(card,['name','cardName','cardId','recordKey','cardKind','faceUp','public','faction','quantity']))}]));
  return { room:pick(roomProjection.room,['roomId','title','surfaceMode','stateRevision','stateHash']), viewer:roomProjection.viewer,
    matchBinding:pick(roomProjection.matchBinding,['bindingHash','gameId','dataVersion','releaseBinding']), state, workbench:compactWorkbench(workbench), visibility: 'player_visible',
    projectionContract: { version: 'companion_current_battlefield_v2',
      excludedStaticCatalogueAndCompilationSections: excluded,
      currentPiecesResourcesMissionPreserved: true, unitProfilesAndWeaponsFromWorkbench:true,
      omittedWorkbenchSections:['per-unit threat duplicate profiles','rule graph catalogue','unitContexts duplicate lineage',
        'probability and score forecasts; ask Rules for a fresh calculation'],
      terrainCount: (terrain || []).length, exactTerrainFootprintsIncluded:includeTerrainCells,
      instruction: 'Use current battlefield and workbench facts. Every piece inherits pieceCommon; its modelTable groups share common properties and originalIndex restores order. Static catalogues, duplicate rosters, compilation history and detailed forecasts are not included. Ordinary chat gets terrain properties/envelopes, not exact occupied geometry. Envelopes must never be treated as footprints or legal paths. Missing rules and precise legality are unknown; only current Rules Preview can establish them.' } };
}

// Intent routing is local and deterministic: ordinary roleplay never carries
// a battlefield packet, and an old battle question does not make it sticky.
export function selectCompanionRoomContextSectionsV1(text='') {
  const sections=[];
  if(!/[?？]|多少|什么|哪|怎么|如何|谁|是否|能否|有没有|吗|帮我|请|给我|告诉|查看|看下|看一下|看看|查询|列出|展示|分析|解释|介绍|聊聊|说说|我的|当前|本场|本局|这局|双方|我方|敌方|对方|\b(what|how|where|which|who|can|could|show|tell|explain|analy[sz]e)\b/iu.test(text))return sections;
  const patterns={
    overview:/战局|局势|战况|棋盘|战桌|战场|场上|回合|轮到|当前阶段|能[看读].*(公开|战局|局面)|\b(battlefield|board|situation|round|turn)\b/iu,
    roster:/军表|编队|阵容|编成|势力|(?:我的|这张|对方的|双方的)表|\b(roster|army|faction)\b/iu,
    units:/单位|兵种|装备|升级|武器|射程|命中|伤害|护甲|血量|生命值|移速|移动力|\b(units?|weapons?|upgrades?|range|damage|armor|stats)\b/iu,
    resources:/资源|矿物|瓦斯|气体|人口|补给|指挥点|剩余.*(?:矿|气)|\b(minerals?|gas|supply|resources?)\b/iu,
    mission:/任务|计分|得分|分数|目标点|胜利条件|\b(mission|scores?|objectives?|victory)\b/iu,
    terrain:/地形|障碍|高地|掩体|视线|射线|坐标|移动.*(?:棋子|单位|模型)|冲锋|部署|(?:单位|模型|坦克|棋子|我方|敌方).{0,12}(?:位置|哪里)|\b(terrain|cover|line of sight|distance|deployment)\b/iu,
    rules:/规则|合法|判定|怎么算|\b(rules?|legal|legality|faq)\b/iu,
  };
  for(const [section,pattern] of Object.entries(patterns))if(pattern.test(text))sections.push(section);
  return sections;
}
const UNIT_ALIASES={siege_tank:['坦克'],goliath:['歌利亚'],marine:['机枪兵','陆战队员'],
  marauder:['掠夺者'],medic:['医疗兵'],hydralisk:['刺蛇'],zergling:['跳虫','小狗'],
  defiler:['蝎子','感染虫'],bile_launcher:['胆汁发射器']};
export function projectCompanionRequestedContextV1(roomProjection, workbench, {sections=[],question=''}={}) {
  const result={room:pick(roomProjection.room,['roomId','stateRevision']),
    viewer:pick(roomProjection.viewer,['seatKey','roleMode']),visibility:'player_visible',
    projectionContract:{version:'companion_requested_context_v1',requestedSections:[...sections],
      battlefieldIncluded:sections.length>0,roomMutationAuthority:false,
      instruction:sections.length
        ? 'Only explicitly requested battlefield sections are included. Other facts are unavailable, not zero. Do not invent them. Rules Preview remains the only authority for exact legality.'
        : 'Ordinary conversation: no battlefield, army, resources, terrain or rules packet was requested or supplied. Use the character and conversation only. Ask which current game information is needed before claiming game facts.'}};
  if(!sections.length)return result;
  const full=projectCompanionRoomContextV1(roomProjection,workbench);
  result.matchBinding=full.matchBinding;result.state={};result.workbench={};
  const addState=keys=>Object.assign(result.state,pick(full.state,keys));
  const addWorkbench=keys=>Object.assign(result.workbench,pick(full.workbench,keys));
  const shortUnit=unit=>pick(unit,['id','name','sideKey','profileSize','currentModels','currentSupply',
    'mineralCost','location','remainingDurability','upgrades']);
  const has=section=>sections.includes(section);
  if(has('overview')){
    addState(['round','phase','stage','activeSideKey','players','scores','terminal','winner','pieces','pieceCommon']);
    addWorkbench(['scenario','deployment','scoreboard']);result.workbench.units=full.workbench.units.map(shortUnit);
  }
  if(has('roster')){
    addState(['publicRosterDisclosureBySide','armyResourceBudgetsBySide']);
    result.workbench.roster=full.workbench.units.map(shortUnit);
  }
  if(has('resources')){
    addState(['players','cardResources','armyResourceBudgetsBySide']);
    result.workbench.supplyByUnit=full.workbench.units.map(unit=>pick(unit,['id','sideKey','currentSupply','location']));
  }
  if(has('mission')){
    addState(['mission','scores','officialMissionRuntimeState','officialMissionMarkerPlacement']);
    addWorkbench(['scenario','scoreboard']);
    result.state.missionMarkers=full.state.board.missionMarkers;
  }
  if(has('terrain')){
    result.state.board=full.state.board;
    addState(['pieces','pieceCommon']);addWorkbench(['deployment']);
  }
  if(has('rules'))addWorkbench(['rulesQuickView']);
  if(has('units')){
    const lower=question.toLowerCase();
    const named=full.workbench.units.filter(unit=>lower.includes(unit.name.toLowerCase())
      || (UNIT_ALIASES[unit.unitId]||[]).some(alias=>question.includes(alias)));
    const units=named.length?named:full.workbench.units;
    result.workbench.units=units;
    const ids=new Set(units.map(unit=>unit.id));
    result.state.pieces=full.state.pieces.filter(piece=>ids.has(piece.id??full.state.pieceCommon.id));
    result.state.pieceCommon=full.state.pieceCommon;
  }
  if(result.state.pieces)result.projectionContract.pieceEncoding=full.projectionContract.instruction;
  return result;
}
