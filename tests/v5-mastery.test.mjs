import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,item,expeditionGoal,load} from '../v5/core.mjs';
import {masteryPending,recordCraftMastery} from '../v5/mastery.mjs';
test('fresh player cannot open Vault without self-crafting all three families',()=>{
 const s=fresh(0);s.stage=3;s.landingStep=2;s.seals.navigation=s.seals.stabilization=s.seals.resonance=true;
 assert.deepEqual(masteryPending(s),['rig','chart','flux']);
 assert.match(expeditionGoal(s).name,/three expedition instruments/);
 let snap=JSON.stringify(s);assert.equal(act(s,{type:'goal',kit:'field'}).ok,false);assert.equal(JSON.stringify(s),snap);
 for(const [family,a,b] of [['rig',1,3],['chart',9,10],['flux',15,16]]){
  s.board[a]=item(family,3);s.board[b]=item(family,3);
  const r=act(s,{type:'merge',from:a,to:b});assert.ok(r.ok,r.message);assert.equal(r.craftedMilestone,true);
 }
 assert.deepEqual(masteryPending(s),[]);
 assert.doesNotMatch(expeditionGoal(s).name,/three expedition instruments/);
 assert.deepEqual(load(JSON.stringify(s)).craftMastery,s.craftMastery);
});
test('item grants and Tide Treasures never fake normal producer mastery',()=>{
 const s=fresh(0);
 for(const [i,f]of ['rig','chart','flux'].entries())s.board[i+1]=item(f,4);
 assert.deepEqual(masteryPending(s),['rig','chart','flux']);
 assert.equal(recordCraftMastery(s,item('chart',4,'tide')),false);
 assert.equal(recordCraftMastery(s,item('rig',4)),true);
 assert.equal(recordCraftMastery(s,item('rig',4)),false);
 assert.deepEqual(masteryPending(s),['chart','flux']);
});
test('existing untracked V5 saves keep their previously earned chapter access',()=>{
 const s=fresh(0);delete s.craftMastery;s.stage=3;
 assert.deepEqual(masteryPending(s),[]);assert.deepEqual(masteryPending(load(JSON.stringify(s))),[]);
});

test('crafting direction highlights the real highest merge pair and never mutates progress',async()=>{
 const {masteryDirection}=await import('../v5/mastery.mjs');
 const s=fresh(0);s.stage=3;s.board[3]=item('rig',3);s.board[4]=item('rig',3);
 const before=JSON.stringify(s),step=masteryDirection(s);
 assert.equal(step.kind,'merge');assert.deepEqual(step.indices,[3,4]);assert.equal(step.need.tier,4);
 assert.equal(JSON.stringify(s),before);
 assert.ok(act(s,{type:'merge',from:3,to:4}).ok);
 assert.equal(masteryDirection(s).family,'chart','the next unfinished chain becomes the priority');
});
test('crafting direction respects actual charges, energy and full-board constraints',async()=>{
 const {masteryDirection}=await import('../v5/mastery.mjs');
 const s=fresh(0);s.stage=3;
 s.board=s.board.map(x=>x?.type==='item'&&x.family==='rig'?null:x);
 assert.equal(masteryDirection(s).kind,'produce');
 s.charges.rig=0;assert.equal(masteryDirection(s).kind,'refill');
 s.energy=0;assert.equal(masteryDirection(s).kind,'energy');
 s.board=s.board.map(x=>x??{type:'glyph'});
 assert.equal(['make-space','full'].includes(masteryDirection(s).kind),true);
});
