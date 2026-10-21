import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,load} from '../v5/core.mjs';
import {fleetEarned,fleetPending} from '../v5/fleet.mjs';
test('fleet receipt is earned, atomic, resource-neutral and reload-safe',()=>{
 const s=fresh(1),before=structuredClone(s);
 assert.equal(act(s,{type:'viewFleet'}).ok,false);assert.deepEqual(s,before);
 s.camp.pier=s.camp.loft=s.camp.deepSurvey=true;
 s.board[7]={type:'item',family:'chart',line:'tide',tier:3};
 s.board[8]={type:'item',family:'chart',line:'tide',tier:3};
 assert.equal(act(s,{type:'merge',from:7,to:8},2).ok,true);
 assert.ok(fleetEarned(s));assert.ok(fleetPending(load(JSON.stringify(s))));
 const earned=structuredClone(s);
 assert.equal(act(s,{type:'viewFleet'}).ok,true);
 assert.deepEqual(s,{...earned,camp:{...earned.camp,fleetViewed:true}});
 assert.equal(fleetPending(load(JSON.stringify(s))),false);
 assert.equal(act(s,{type:'viewFleet'}).ok,true);
 assert.deepEqual(s,{...earned,camp:{...earned.camp,fleetViewed:true}});
});
test('legacy discovery survives delivery; loading grants no rewards or automatic viewing',()=>{
 const s=fresh(1);s.discovered.push('chart:tide:4');
 const migrated=load(JSON.stringify(s));
 assert.deepEqual(migrated,s);assert.ok(fleetPending(migrated));
 assert.ok(!migrated.board.some(x=>x?.line==='tide'));
});
