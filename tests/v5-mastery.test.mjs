import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,item,expeditionGoal,load} from '../v5/core.mjs';
import {masteryPending,recordCraftMastery,masteryDirection} from '../v5/mastery.mjs';
const readyState=()=>{const s=fresh(0);s.stage=3;s.landingStep=2;s.routePrepared=true;s.seals.navigation=s.seals.stabilization=s.seals.resonance=true;return s;};
for(const family of ['rig','chart','flux'])test(family+' specialty is a crafted, consumed choice with a real producer reward',()=>{
 const s=readyState();const before=JSON.stringify(s);
 assert.equal(act(s,{type:'prepareInstrument',family}).ok,false);assert.equal(JSON.stringify(s),before);
 s.board[1]=item(family,3);s.board[3]=item(family,3);
 assert.equal(act(s,{type:'merge',from:1,to:3}).ok,true);
 assert.equal(masteryDirection(s,family).kind,'install');
 const count=s.board.filter(x=>x?.family===family&&x.tier===4).length;
 assert.equal(act(s,{type:'prepareInstrument',family}).ok,true);
 assert.equal(s.board.filter(x=>x?.family===family&&x.tier===4).length,count-1);
 assert.equal(s.journey.instrument,family);assert.deepEqual(s.journey.boost,{family,left:3});
 assert.deepEqual(masteryPending(s),[]);assert.doesNotMatch(expeditionGoal(s).name,/specialty/);
 const restored=load(JSON.stringify(s));assert.deepEqual(restored.journey,s.journey);
 const used=JSON.stringify(s);assert.equal(act(s,{type:'prepareInstrument',family}).ok,false);assert.equal(JSON.stringify(s),used);
});
test('a premade instrument cannot bypass real crafting; Tide items never count',()=>{
 const s=readyState();s.board[1]=item('rig',4);
 assert.equal(act(s,{type:'prepareInstrument',family:'rig'}).ok,false);
 assert.equal(recordCraftMastery(s,item('chart',4,'tide')),false);
 assert.equal(act(s,{type:'goal'}).ok,false);
});
test('old completed mastery and untracked saves retain earned Vault access',()=>{
 const s=readyState();s.craftMastery={rig:true,chart:true,flux:true};
 assert.deepEqual(masteryPending(load(JSON.stringify(s))),[]);
 delete s.craftMastery;assert.deepEqual(masteryPending(load(JSON.stringify(s))),[]);
});
test('a chosen specialty guides its own real pair without changing the save',()=>{
 const s=readyState();s.board[3]=item('chart',3);s.board[4]=item('chart',3);
 const before=JSON.stringify(s);const step=masteryDirection(s,'chart');
 assert.equal(step.kind,'merge');assert.deepEqual(step.indices,[3,4]);assert.equal(JSON.stringify(s),before);
});
