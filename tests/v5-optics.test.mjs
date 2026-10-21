// Regression coverage for removing the optics maze, including genuine old saves.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {fresh,act,load,item} from '../v5/core.mjs';
import {circuit,receivers} from '../v5/seals.mjs';import {choose} from './v5-policy.mjs';
const ok=(s,a)=>{const r=act(s,a,s.moves*1000);assert.ok(r.ok,JSON.stringify(a)+': '+r.message);return r;};
const reject=(s,a)=>{const before=JSON.stringify(s);assert.equal(act(s,a).ok,false);assert.equal(JSON.stringify(s),before);};
function prepared(){const s=fresh(0);for(let n=0;n<150&&!circuit(s);n++)ok(s,choose(s,{sideFirst:false,decode:false}));assert.ok(circuit(s));return s;}
test('charged machinery works regardless of item positions, lenses, turn flags or former beam blockers',()=>{
 const s=prepared();s.board=s.board.map(x=>x?.type==='item'?{...x,turn:1}:x);s.board[14]=item('rig',0);s.board[15]=item('rig',0);
 assert.ok(circuit(s));const before=structuredClone(s.board);ok(s,{type:'power',index:receivers(s)[0]});assert.equal(s.stage,3);
 for(let i=0;i<36;i++)if(before[i])assert.deepEqual(s.board[i],before[i]);reject(s,{type:'power'});reject(s,{type:'prime'});
});
test('activation is atomic on a full board; making room preserves and delivers the reward',()=>{
 const s=prepared();s.board=s.board.map(x=>x??item('rig',0));reject(s,{type:'power',index:receivers(s)[0]});
 const pair=s.board.flatMap((x,i)=>x?.family==='rig'&&x.tier===0?[i]:[]);ok(s,{type:'merge',from:pair[0],to:pair[1]});ok(s,{type:'power',index:receivers(s)[0]});assert.equal(s.stage,3);
});
test('two old prepared receivers require an explicit reward choice',()=>{
 const s=prepared(),i=s.board.indexOf(null);s.board[i]=item('chart',3);ok(s,{type:'deploy',index:23,from:i});
 assert.equal(receivers(s).length,2);reject(s,{type:'power'});reject(s,{type:'power',index:20});
 for(const index of receivers(s)){const copy=structuredClone(s);ok(copy,{type:'power',index});assert.equal(copy.seals.link.at(-1),index);}
});
test('real mid-optics saves preserve paid charge, inventory and camp progress, without duplicate rewards',()=>{
 for(const route of ['ridge','conduit'])for(const phase of ['primed','connected','completed']){
  const old=JSON.parse(fs.readFileSync(new URL(`./fixtures/stage2/${route}-${phase}.json`,import.meta.url)));
  old.workshop={version:1,repaired:true,precision:true,presses:3,fittings:2};old.requests.supplies=17;
  const saved=load(JSON.stringify(old));assert.equal(saved.stage,old.stage);assert.equal(saved.energy,old.energy);assert.deepEqual(saved.workshop,old.workshop);assert.deepEqual(saved.requests,old.requests);assert.deepEqual(saved.expedition,old.expedition);
  for(let i=0;i<36;i++)assert.deepEqual(saved.board[i],old.board[i]?.type==='prism'?item('chart',2):old.board[i]);
  assert.equal(saved.seals.optics.primed,old.seals.optics.primed);assert.deepEqual(load(JSON.stringify(saved)),saved);
  reject(saved,{type:'prime'});
  if(phase==='completed'){reject(saved,{type:'power'});assert.ok(saved.seals.resonance);}
  else {ok(saved,{type:'power',index:receivers(saved)[0]});reject(saved,{type:'power'});ok(saved,{type:'goal'});assert.equal(saved.stage,4);}
 }
});
test('uncharged legacy state still spends exactly one real Loop Cell; no free migration reward',()=>{
 const s=prepared();s.seals.optics.primed=false;const i=s.board.indexOf(null);s.board[i]=item('flux',1);const saved=load(JSON.stringify(s)),energy=saved.energy;
 reject(saved,{type:'power',index:receivers(saved)[0]});ok(saved,{type:'prime',from:i,index:20});assert.equal(saved.board[i],null);assert.equal(saved.energy,energy);reject(saved,{type:'prime'});
});
