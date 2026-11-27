// Finite candidate generation only. Native still checks paths, all model bases,
// engagement, coherency and the complete nearer-endpoint certificate.
export function chargeCriticalEndpointCandidatesV1(moving,targets,blockers){
  if(moving.shape!=='round')return [];
  const points=new Map(),r=moving.radiusMilliInches;
  const add=(x,y)=>{for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    const p={xMilliInches:Math.round(x)+dx,yMilliInches:Math.round(y)+dy};points.set(p.xMilliInches+':'+p.yMilliInches,p);
  }};
  for(const target of targets){
    if(target.footprint.shape!=='round')continue;
    const t=target.footprint,reach=r+t.radiusMilliInches+1001;
    const circles=blockers.filter(b=>b.footprint.shape==='round').map(b=>({x:b.footprint.center.xMilliInches,y:b.footprint.center.yMilliInches,r:r+b.footprint.radiusMilliInches-1})).filter(c=>Math.hypot(c.x-t.center.xMilliInches,c.y-t.center.yMilliInches)<=c.r+reach);
    for(let i=0;i<circles.length;i++){
      const a=circles[i],dx=t.center.xMilliInches-a.x,dy=t.center.yMilliInches-a.y,d=Math.hypot(dx,dy);
      if(d>0)add(a.x+dx*a.r/d,a.y+dy*a.r/d);
      for(let j=i+1;j<circles.length;j++){
        const b=circles[j],vx=b.x-a.x,vy=b.y-a.y,len=Math.hypot(vx,vy);
        if(!len||len>a.r+b.r||len<Math.abs(a.r-b.r))continue;
        const along=(a.r*a.r-b.r*b.r+len*len)/(2*len),height=Math.sqrt(Math.max(0,a.r*a.r-along*along)),mx=a.x+along*vx/len,my=a.y+along*vy/len;
        add(mx-height*vy/len,my+height*vx/len);add(mx+height*vy/len,my-height*vx/len);
      }
    }
  }
  const gap=p=>Math.min(...targets.filter(t=>t.footprint.shape==='round').map(t=>Math.hypot(p.xMilliInches-t.footprint.center.xMilliInches,p.yMilliInches-t.footprint.center.yMilliInches)-r-t.footprint.radiusMilliInches));
  return [...points.values()].filter(p=>gap(p)>=-1&&gap(p)<=1000&&!blockers.some(b=>b.footprint.shape==='round'&&Math.hypot(p.xMilliInches-b.footprint.center.xMilliInches,p.yMilliInches-b.footprint.center.yMilliInches)<r+b.footprint.radiusMilliInches-1)).sort((a,b)=>gap(a)-gap(b)||a.xMilliInches-b.xMilliInches||a.yMilliInches-b.yMilliInches);
}
