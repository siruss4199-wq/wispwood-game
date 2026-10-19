import {syncRequests} from '../v5/requests.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,goal,expeditionGoal,act,load} from '../v5/core.mjs';
const ok=(s,a)=>{const r=act(s,a);assert.ok(r.ok,r.message);return r;};
test('reported open-vault 6/8 save has an actionable continuing Workshop goal',()=>{
 const s=fresh();s.stage=4;s.post=2;s.journey.engine=true;s.journey.infusions=1;s.requests.supplies=6;syncRequests(s);
 const before=structuredClone(s);assert.equal(goal(s).name,'Restore Coastal Workshop');assert.equal(goal(s).action,'orders');assert.equal(goal(s).supplies,6);assert.equal(goal(s).cost,8);assert.deepEqual(s,before);
 const restored=load(JSON.stringify(s));assert.equal(goal(restored).action,'orders');assert.deepEqual(restored.requests,s.requests);assert.equal(restored.stage,4);
 s.requests.supplies=8;assert.equal(goal(s).action,'restoreWorkshop');ok(s,{type:goal(s).action});assert.equal(goal(s).name,'Build Supply Pier');assert.equal(s.requests.supplies,0);
});
test('camp continuation advances without consuming collectibles or erasing optional vault progress',()=>{
 const s=fresh();s.stage=4;s.workshop.repaired=true;s.requests.supplies=60;
 assert.equal(goal(s).action,'buildPier');ok(s,{type:'buildPier'});assert.equal(goal(s).action,'buildLoft');ok(s,{type:'buildLoft'});assert.equal(goal(s).needs[0].tier,2);
 s.discovered.push('chart:tide:2');assert.equal(goal(s).action,'upgradeLoft');ok(s,{type:'upgradeLoft'});assert.equal(goal(s).needs[0].tier,3);s.discovered.push('chart:tide:3');assert.equal(goal(s).needs[0].tier,4);
 assert.equal(expeditionGoal(s).action,'restoreEngine');s.discovered.push('chart:tide:4');assert.equal(goal(s).action,'restoreEngine');assert.deepEqual(load(JSON.stringify(s)).camp,s.camp);
});
