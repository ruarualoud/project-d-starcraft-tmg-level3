import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {createEmptyArmy} from '../army-calc';
import {useRosterValidation} from '../roster-validation';
import type {ArmyList} from '../types';

let view:ReactTestRenderer;
function Probe({army}:{army:ArmyList}) {
  return React.createElement('output',null,JSON.stringify(useRosterValidation('lineup',army)));
}
const state=()=>JSON.parse(view.root.findByType('output').children.join(''));
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);});
afterEach(()=>{act(()=>view?.unmount());vi.useRealTimers();vi.unstubAllGlobals();});

it('blocks submission until the selected draft passes Native validation',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({ok:true,valid:true}))));
  await act(async()=>{view=create(<Probe army={createEmptyArmy('Zerg','draft')} />);});
  expect(state()).toMatchObject({checking:true,valid:false});
  await act(async()=>{await vi.advanceTimersByTimeAsync(300);});
  expect(state()).toMatchObject({checking:false,valid:true,reason:''});
});

it('ignores a late rejection for a previous draft after the replacement passes',async()=>{
  let rejectOld:(response:Response)=>void=()=>{};
  const first=new Promise<Response>(resolve=>{rejectOld=resolve;});
  vi.stubGlobal('fetch',vi.fn().mockImplementationOnce(()=>first)
    .mockImplementationOnce(async()=>new Response(JSON.stringify({ok:true,valid:true}))));
  const army=createEmptyArmy('Zerg','before');
  await act(async()=>{view=create(<Probe army={army}/>);});
  await act(async()=>{await vi.advanceTimersByTimeAsync(300);});
  await act(async()=>{view.update(<Probe army={{...army,name:'after',tacticalCardIds:['reactive_creep']}}/>);});
  expect(state().valid).toBe(false);
  await act(async()=>{await vi.advanceTimersByTimeAsync(300);});
  expect(state().valid).toBe(true);
  await act(async()=>{rejectOld(new Response(JSON.stringify({ok:false,reason:'old rejection'}),{status:422}));});
  expect(state()).toMatchObject({valid:true,reason:''});
});

it('keeps a rejected draft disabled and exposes its actual Native reason',async()=>{
  const reason='FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID:tactical_cards:zagara_s_swarm:Creep:0';
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({ok:false,reason}),{status:422})));
  await act(async()=>{view=create(<Probe army={createEmptyArmy('Zerg','invalid')}/>);});
  await act(async()=>{await vi.advanceTimersByTimeAsync(300);});
  expect(state()).toMatchObject({checking:false,valid:false,reason});
});
