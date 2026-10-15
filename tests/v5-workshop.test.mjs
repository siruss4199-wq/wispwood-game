import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,load,act} from '../v5/core.mjs';
import {WORKSHOP_COST} from '../v5/workshop.mjs';
test('workshop repair spends earned supplies exactly once without touching expedition stock',()=>{
 const s=fresh(),before=JSON.stringify(s);assert.equal(act(s,{type:'restoreWorkshop'}).ok,false);assert.equal(JSON.stringify(s),before);
 s.requests.supplies=WORKSHOP_COST+3;const board=structuredClone(s.board),energy=s.energy;
 assert.ok(act(s,{type:'restoreWorkshop'}).ok);assert.equal(s.requests.supplies,3);assert.equal(s.workshop.repaired,true);assert.deepEqual(s.board,board);assert.equal(s.energy,energy);
 const restored=load(JSON.stringify(s));assert.equal(restored.workshop.repaired,true);assert.equal(act(restored,{type:'restoreWorkshop'}).ok,false);assert.equal(restored.requests.supplies,3);
});
test('old completed saves gain a damaged workshop without losing earned resources or seals',()=>{
 const s=fresh();s.stage=4;s.requests.supplies=17;delete s.workshop;const board=structuredClone(s.board);
 const migrated=load(JSON.stringify(s));assert.equal(migrated.stage,4);assert.deepEqual(migrated.board,board);assert.equal(migrated.requests.supplies,17);assert.equal(migrated.workshop.repaired,false);
 assert.ok(act(migrated,{type:'restoreWorkshop'}).ok);assert.equal(migrated.requests.supplies,9);
});
