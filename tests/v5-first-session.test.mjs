import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,item} from '../v5/core.mjs';
import {useAction,openingPair} from '../v5/interactions.mjs';
import {deliveryItems} from '../v5/presentation.mjs';

test('opening invitation identifies real twins and disappears after a merge',()=>{
 const s=fresh(0),pair=openingPair(s);assert.equal(pair.length,2);
 assert.deepEqual(s.board[pair[0]],s.board[pair[1]]);
 assert.ok(act(s,{type:'merge',from:pair[0],to:pair[1]},0).ok);assert.deepEqual(openingPair(s),[]);
});
test('held tools advertise only currently usable expedition targets',()=>{
 const s=fresh(0);s.board[1]=item('rig',2);
 assert.deepEqual(useAction(s,1,19),{type:'clear',from:1,index:19});
 assert.equal(useAction(s,1,24),null);s.stage=1;assert.equal(useAction(s,1,24).type,'breach');
 s.board[1]=item('rig',3);assert.equal(useAction(s,1,20),null);s.stage=2;assert.equal(useAction(s,1,20).type,'deploy');
 s.board[20].phase='done';assert.equal(useAction(s,1,20),null);
 assert.equal(useAction(s,null,19),null);assert.equal(useAction(s,1,null),null);
});
test('clearing consumes the actual held duplicate and delivery matches it',()=>{
 const s=fresh(0);s.board[1]=item('rig',2);s.board[3]=item('rig',2);
 const action=useAction(s,3,19);assert.equal(deliveryItems(s,action)[0].index,3);
 assert.ok(act(s,action,0).ok);assert.deepEqual(s.board[1],item('rig',2));assert.notEqual(s.board[19]?.type,'rock');
});
test('an invalid supplied clear tool never silently consumes another tool',()=>{
 const s=fresh(0);s.board[1]=item('rig',2);const before=JSON.stringify(s);
 assert.equal(act(s,{type:'clear',from:7,index:19},0).ok,false);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(deliveryItems(s,{type:'clear',from:7,index:19}),[]);
});
test('survey retains both tools without consumption feedback; chosen route spends only one',()=>{
 for(const [route,family,kept] of [[24,'rig','chart'],[27,'chart','rig']]){
  const s=fresh(0);s.landingStep=1;s.board[1]=item('rig',2);s.board[3]=item('chart',2);
  assert.deepEqual(deliveryItems(s,{type:'goal'}),[]);assert.ok(act(s,{type:'goal'},0).ok);
  const from=s.board.findIndex(x=>x?.family===family&&x.tier===2);
  assert.equal(deliveryItems(s,{type:'breach',from,index:route})[0].index,from);
  assert.ok(act(s,useAction(s,from,route),0).ok);assert.ok(s.board.some(x=>x?.family===kept&&x.tier===2));
 }
});
