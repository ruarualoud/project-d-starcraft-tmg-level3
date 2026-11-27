import {projectStarcraftTmgBattlefieldPresentationV1} from '../client-domain/battlefield-presentation-v1.mjs';
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// A geometry/debug view of the SAME player projection as the product. It is not
// an art-map interpretation, collision calculator, or substitute game engine.
export function renderActiveSandboxBoardFrameV1(observation) {
  const scene = projectStarcraftTmgBattlefieldPresentationV1({roomProjection:observation.projection});
  const {widthMilliInches:w,heightMilliInches:h}=scene;
  const shape=(item,model=false)=>{
    if(!item.geometryRenderable) return '';
    const width=model?item.baseWidthMilliInches:item.widthMilliInches;
    const depth=model?item.baseDepthMilliInches:item.depthMilliInches;
    const kind=model?item.baseShape:item.shape;
    const color=model ? (item.sideKey==='player1'?'#46b9ec':'#f47784')
      : item.kind==='terrain' ? (item.elevationSurface?'#607995':'#5b6369') : '#f3cd67';
    const attrs=`data-kind="${model?'model':item.kind}" data-id="${escape(item.id)}" fill="${color}" fill-opacity="${model?'.5':'.5'}" stroke="${color}" stroke-width="${model?90:35}"`;
    const figure=kind==='rectangle' ? `<rect x="${-width/2}" y="${-depth/2}" width="${width}" height="${depth}" ${attrs}/>`
      : `<ellipse cx="0" cy="0" rx="${width/2}" ry="${depth/2}" ${attrs}/>`;
    return `<g transform="translate(${item.xMilliInches} ${h-item.yMilliInches}) rotate(${-Number(model?item.baseRotationDegrees:item.rotationDegrees)})">${figure}<title>${escape(item.label)}</title></g>`;
  };
  const content=[...scene.terrain,...scene.markers,...scene.tokens].map(x=>shape(x)).join('')
    +scene.models.map(x=>shape(x,true)).join('');
  const labels=new Map();for(const m of scene.models)if(!labels.has(m.pieceId))labels.set(m.pieceId,m);
  return {scene,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="760" viewBox="0 0 ${w} ${h+2000}" role="img">
    <rect width="${w}" height="${h+2000}" fill="#081620"/>
    <defs><clipPath id="board"><rect width="${w}" height="${h}"/></clipPath></defs>
    <g clip-path="url(#board)">${content}${[...labels.values()].map(m=>`<text x="${m.xMilliInches}" y="${h-m.yMilliInches-800}" fill="#fff" font-size="440">${escape(m.pieceId)}</text>`).join('')}</g>
    <rect width="${w}" height="${h}" fill="none" stroke="#5dc1cb" stroke-width="90"/>
    <text x="500" y="${h+900}" fill="#b8dbe5" font-size="500">Native projection | ${escape(observation.seat)} | r${observation.stateRevision} | ${scene.models.length} models | ${scene.terrain.length} terrain</text>
    <text x="500" y="${h+1600}" fill="#9cbdca" font-size="400">Blue: player1; Red: player2; Grey: terrain; Gold: mission/token. Shapes from room geometry; no art background.</text>
  </svg>`};
}
