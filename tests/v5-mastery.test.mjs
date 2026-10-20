import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,item,expeditionGoal,load} from '../v5/core.mjs';
import {masteryPending,recordCraftMastery} from '../v5/mastery.mjs';
test('fresh player cannot open Vault without self-crafting all three families',()=>{
 const s=fresh(0);s.stage=3;s.landingStep=2;s.seals.navigation=s.seals.stabilization=s.seals.resonance=true;
 assert.deepEqual(masteryPending(s),['rig','chart','flux']);
 assert.match(expeditionGoal(s).name,/three expedition instruments/);
 let snap=JSON.stringify(s);assert.equal(act(s,{type:'goal',kit:'field'}).ok,false);assert.equal(JSON.stringify(s),snap);
 for(const [family,a,b] of [['rig',1,3],['chart',9,10],['flux',15,16]]){
  s.board[a]=item(family,2);s.board[b]=item(family,2);
  const r=act(s,{type:'merge',from:a,to:b});assert.ok(r.ok,r.message);assert.equal(r.craftedMilestone,true);
 }
 assert.deepEqual(masteryPending(s),[]);
 assert.notMatch(expeditionGoal(s).name,/three expedition instruments/);
 assert.deepEqual(load(JSON.stringify(s)).craftMastery,s.craftMastery);
});
test('item grants and Tide Treasures never fake normal producer mastery',()=>{
 const s=fresh(0);
 for(const [i,f]of ['rig','chart','flux'].entries())s.board[i+1]=item(f,3);
 assert.deepEqual(masteryPending(s),['rig','chart','flux']);
 assert.equal(recordCraftMastery(s,item('chart',4,'tide')),false);
 assert.equal(recordCraftMastery(s,item('rig',3)),true);
 assert.equal(recordCraftMastery(s,item('rig',3)),false);
 assert.deepEqual(masteryPending(s),['chart','flux']);
});
test('existing untracked V5 saves keep their previously earned chapter access',()=>{
 const s=fresh(0);delete s.craftMastery;s.stage=3;
 assert.deepEqual(masteryPending(s),[]);assert.deepEqual(masteryPending(load(JSON.stringify(s))),[]);
});
