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
test('restored press makes usable tools with exact costs; normal source and rare schedule stay intact',()=>{
 const s=fresh(),before=JSON.stringify(s);assert.equal(act(s,{type:'press'}).ok,false);assert.equal(JSON.stringify(s),before);
 s.requests.supplies=8;act(s,{type:'restoreWorkshop'});const energy=s.energy,charge=s.charges.rig,taps=s.taps.rig;
 const result=act(s,{type:'press'});assert.ok(result.ok);assert.deepEqual(s.board[result.index],{type:'item',family:'rig',tier:1});assert.equal(s.energy,energy-2);assert.equal(s.charges.rig,charge-1);assert.equal(s.taps.rig,taps);assert.equal(s.workshop.presses,1);
 assert.equal(load(JSON.stringify(s)).workshop.presses,1);assert.ok(act(s,{type:'produce',id:'rig'}).ok);assert.equal(s.taps.rig,taps+1);
});
test('press failure is atomic with a full board, no energy or no charge',()=>{
 for(const reason of ['full','energy','charge']){const s=fresh();s.workshop.repaired=true;if(reason==='full')s.board=s.board.map(x=>x??{type:'item',family:'rig',tier:0});if(reason==='energy')s.energy=1;if(reason==='charge')s.charges.rig=0;const before=JSON.stringify(s);assert.equal(act(s,{type:'press'}).ok,false);assert.equal(JSON.stringify(s),before);}
});
