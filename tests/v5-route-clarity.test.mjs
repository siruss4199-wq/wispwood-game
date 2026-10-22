import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,load,item,sourceUnlocked} from '../v5/core.mjs';
import {choose} from './v5-policy.mjs';
import {requestProgress} from '../v5/requests.mjs';
const ok=(s,a)=>{const r=act(s,a,s.moves*1000);assert.ok(r.ok,r.message);};
function prepared(){const s=fresh(0);while(s.stage<1)ok(s,choose(s,{sideFirst:false,decode:false}));return s;}
test('mid-survey saves retain all earned inventory, upgrades and supplies with no placement prerequisite',()=>{
 for(const precision of [false,true])for(const route of ['ridge','conduit']){
  const old=prepared();const lens=old.board.findIndex(x=>x?.family==='chart'&&x.tier===2);
  [old.board[6],old.board[lens]]=[old.board[lens],old.board[6]];
  old.board[12]=item('rig',0);old.board[18]=item('rig',0); // formerly blocked sightline
  old.workshop={version:1,repaired:true,precision,presses:4,fittings:precision?2:0};old.requests.supplies=17;
  const s=load(JSON.stringify(old));assert.deepEqual(s,old);
  ok(s,{type:'breach',index:route==='ridge'?24:27});assert.equal(s.stage,2);assert.ok(sourceUnlocked(s,'flux'));
  assert.deepEqual(s.workshop,old.workshop);assert.deepEqual(s.requests,old.requests);
  assert.deepEqual(s.board[12],old.board[12]);assert.deepEqual(s.board[18],old.board[18]);
  assert.deepEqual(load(JSON.stringify(s)),s);
 }
});
test('missing selected route item fails atomically while the other route remains usable',()=>{
 const s=prepared();s.board=s.board.map(x=>x?.family==='rig'&&x.tier===2?null:x);
 const before=JSON.stringify(s);assert.equal(act(s,{type:'breach',index:24}).ok,false);assert.equal(JSON.stringify(s),before);
 ok(s,{type:'breach',index:27});assert.equal(s.expedition.route,'conduit');
});
test('preparation is earned by merging and cannot be skipped; optional orders protect the two tools',()=>{
 const s=fresh(0),before=JSON.stringify(s);assert.equal(act(s,{type:'breach',index:24}).ok,false);assert.equal(JSON.stringify(s),before);
 const p=prepared();assert.ok(p.merges>=3);assert.ok(p.routePrepared);
 for(const family of ['rig','chart']){const r=requestProgress(p,{needs:[{family,tier:2,count:1}]});assert.equal(r.ready,false);}
});

test('old survey positions no longer reserve extra lenses from optional requests',()=>{
 const s=prepared();s.board=s.board.map(x=>x?.family==='chart'&&x.tier===2?null:x);
 s.board[6]=item('chart',2);s.board[9]=item('chart',2);
 const progress=requestProgress(s,{needs:[{family:'chart',tier:2,count:1}]});
 assert.equal(progress.ready,true);assert.equal(progress.indices.length,1);
 assert.ok([6,9].includes(progress.indices[0]));
});
