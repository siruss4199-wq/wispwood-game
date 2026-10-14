import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,item,load,goal} from '../v5/core.mjs';
import {circuit,allSeals,beam,optics} from '../v5/seals.mjs';
import {choose} from './v5-policy.mjs';
import {layouts,arrange} from './v5-optics-policy.mjs';
const ok=(s,a)=>{const r=act(s,a,1000+s.moves*1000);assert.ok(r.ok,JSON.stringify(a)+': '+r.message);return r;};
const reject=(s,a)=>{const before=JSON.stringify(s);assert.equal(act(s,a).ok,false);assert.equal(JSON.stringify(s),before);};
function prepared(receiver='scope'){
 const s=fresh();while(s.stage<2)ok(s,choose(s,{sideFirst:false}));
 s.board[7]=item('rig',3);ok(s,{type:'deploy',index:20,from:7});
 s.board[7]=item(receiver==='scope'?'chart':'flux',3);ok(s,{type:'deploy',index:receiver==='scope'?23:31,from:7});return s;
}
test('all incomplete seal combinations block the vault, even with high-tier stock',()=>{
 for(let mask=0;mask<7;mask++){
  const s=fresh();s.stage=3;['navigation','stabilization','resonance'].forEach((k,n)=>s.seals[k]=!!(mask&(1<<n)));
  for(let i=6;i<18;i++)s.board[i]=item(['rig','chart','flux'][i%3],5);
  reject(s,{type:'goal'});reject(s,{type:'power'});assert.equal(goal(s).action,'inspect');
 }
});
test('route item alone cannot replace the two-family survey',()=>{
 const s=fresh();s.stage=1;s.board[7]=item('rig',2);reject(s,{type:'breach',index:24});assert.equal(s.seals.navigation,false);
});
test('two receivers cannot replace the lift; diagonal or wrong-tier cells cannot connect',()=>{
 const s=fresh();s.stage=2;s.seals.navigation=true;
 s.board[7]=item('chart',3);ok(s,{type:'deploy',index:23,from:7});s.board[7]=item('flux',3);ok(s,{type:'deploy',index:31,from:7});
 s.board[21]=item('flux',1);s.board[22]=item('flux',1);reject(s,{type:'power'});
 s.board[7]=item('rig',3);ok(s,{type:'deploy',index:20,from:7});s.board[22]=null;s.board[16]=item('flux',1);reject(s,{type:'power'});
 s.board[22]=item('flux',2);reject(s,{type:'power'});
});
function solve(s,options={}){
 if(!optics(s).primed){const i=s.board.indexOf(null);s.board[i]=item('flux',1);ok(s,{type:'prime',from:i});}
 const plan=layouts(s,options)[0];assert.ok(plan,'at least one geometric solution');
 for(let n=0;n<60&&!circuit(s);n++)ok(s,arrange(s,plan));
 assert.deepEqual(circuit(s),plan.path);return plan;
}
test('receivers require two reflected turns and grant different, single-use rewards',()=>{
 for(const receiver of ['scope','relay']){
  const s=prepared(receiver);solve(s,{receiver});const path=circuit(s),before=structuredClone(s.board);s.surge=0;s.charges={rig:0,chart:0,flux:0};
  reject(s,{type:'power',index:0});ok(s,{type:'power',index:path.at(-1)});
  assert.ok(allSeals(s));assert.equal(s.stage,3);assert.equal(s.board.some(x=>x?.type==='prism'),false);
  assert.deepEqual(s.seals.link,path);
  for(let i=0;i<36;i++)if(before[i]&&before[i].type!=='prism')assert.deepEqual(s.board[i],before[i],'kept stock is never consumed by the beam');
  if(receiver==='relay'){assert.equal(s.surge,3);assert.deepEqual(s.charges,{rig:7,chart:7,flux:7});}
  else{assert.equal(s.surge,0);assert.deepEqual(s.charges,{rig:0,chart:0,flux:0});assert.ok(s.board.some(x=>x?.type==='crate'&&x.kind==='relic'&&x.left===5));}
  reject(s,{type:'power'});ok(s,{type:'goal'});assert.equal(s.stage,4);
 }
});
test('a wrong turn breaks the beam and can be reversed without energy or lost gear',()=>{
 const s=prepared();solve(s);const before=structuredClone(s),i=beam(s).prisms[0];
 ok(s,{type:'turn',index:i});assert.equal(circuit(s),null);reject(s,{type:'power'});
 ok(s,{type:'turn',index:i});assert.ok(circuit(s));assert.deepEqual(s.board,before.board);assert.equal(s.energy,before.energy);
});
test('legacy saves retain board, energy and earned progress; migration is idempotent',()=>{
 for(const stage of [0,1,2,3,4]){
  const old=fresh();delete old.seals;old.stage=stage;old.landingStep=stage?2:0;old.routePrepared=stage>0;if(stage>=2)old.expedition.route='conduit';
  if(stage>=3)for(const i of [20,23]){old.board[i].phase='done';old.board[i].progress=2;}
  const saved=load(JSON.stringify(old));assert.equal(saved.stage,stage);assert.deepEqual(saved.board,old.board);assert.equal(saved.energy,old.energy);
  assert.equal(saved.seals.navigation,stage>=2);assert.equal(saved.seals.resonance,stage>=3);assert.deepEqual(load(JSON.stringify(saved)),saved);
  if(stage===3){ok(saved,{type:'goal'});assert.equal(saved.stage,4);}
 }
});
test('reload preserves partial optics and old completed saves need no puzzle replay',()=>{
 const s=prepared();const i=s.board.indexOf(null);s.board[i]=item('flux',1);ok(s,{type:'prime',from:i});ok(s,{type:'turn',index:s.board.findIndex(x=>x?.type==='prism')});
 const copy=load(JSON.stringify(s));assert.deepEqual(copy,s);reject(copy,{type:'power'});
 solve(copy);ok(copy,{type:'power'});assert.deepEqual(load(JSON.stringify(copy)),copy);
});
test('full inventory and depleted sources remain recoverable without deleting a device',()=>{
 const s=prepared();s.board=s.board.map(x=>x??item('rig',0));s.energy=0;s.charges={rig:0,chart:0,flux:0};
 for(let n=0;n<150&&s.stage<4;n++)ok(s,choose(s,{sideFirst:false,openCaches:true}));
 assert.equal(s.stage,4);assert.equal(s.board.filter(x=>x?.type==='source').length,3);assert.equal(s.board.filter(x=>x?.type==='site').length,3);
});
test('both routes and Recover/Restore/mixed styles finish through real actions',()=>{
 const results=[];
 for(const style of ['expedition','contract','exploration','aggressive'])for(const findStrategy of ['recover','restore','mixed']){
  const s=fresh(0),session={},actions=[],occupied=[];
  while(s.stage<4&&s.moves<300){const a=choose(s,{style,findStrategy,session,openCaches:true});ok(s,a);actions.push(a.type);occupied.push(s.board.filter(Boolean).length);if(s.moves%7===0)Object.assign(s,load(JSON.stringify(s)));}
  assert.equal(s.stage,4);assert.ok(allSeals(s));assert.ok(s.discoveryDone);
  const seals=s.expedition.log.filter(x=>x.type==='seal');assert.deepEqual(seals.map(x=>x.seal),['navigation','stabilization','resonance']);assert.equal(new Set(seals.map(x=>x.method)).size,3);
  assert.ok(actions.includes('power'));assert.ok(actions.includes('restore')||actions.includes('clear'));assert.ok(s.discovered.length<18);
  results.push({style,findStrategy,route:s.expedition.route,actions:actions.length,merges:s.merges,taps:Object.values(s.taps).reduce((a,b)=>a+b,0),minOccupied:Math.min(...occupied),receiver:seals.at(-1).receiver,discovered:s.discovered.length});
 }
 assert.equal(new Set(results.map(x=>x.route)).size,2);console.log(JSON.stringify({threeSealSessions:results}));
});
