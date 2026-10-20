import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,item,act,load} from '../v5/core.mjs';
import {orderDirection} from '../v5/order-direction.mjs';

test('ready order gives collection direction without changing real items or delivery rights',()=>{
 const s=fresh(0),o=s.requests.orders[0],before=JSON.stringify(s);
 const d=orderDirection(s,o);assert.equal(d.kind,'collect');assert.deepEqual(d.indices,[]);
 assert.equal(JSON.stringify(s),before);
 assert.ok(act(s,{type:'request',id:o.id}).ok);
 assert.equal(orderDirection(s,o).kind,'collect'); // caller uses the current order only
 assert.notEqual(s.requests.orders[0].id,o.id);
});
test('recommends a legal merge, not a different treasure line at the same tier',()=>{
 const s=fresh(0);act(s,{type:'merge',from:7,to:8});act(s,{type:'goal'});
 const o={id:'example',needs:[{family:'chart',tier:2,count:1}]};
 s.board[3]=item('chart',1);s.board[4]=item('chart',1);
 s.board[5]=item('chart',1,'tide');
 const d=orderDirection(s,o);
 assert.equal(d.kind,'merge');assert.deepEqual(d.indices,[3,4]);
 assert.equal(JSON.stringify(load(JSON.stringify(s)).board),JSON.stringify(s.board));
});
test('distinguishes a recharge, treasure recovery, and exhausted space',()=>{
 const s=fresh(0);act(s,{type:'merge',from:7,to:8});act(s,{type:'goal'});
 const o={id:'survey',needs:[{family:'chart',tier:2,count:1}]};
 const chart=s.board.findIndex(x=>x?.type==='source'&&x.id==='chart');
 let d=orderDirection(s,o);
 assert.equal(d.kind,'produce');assert.deepEqual(d.indices,[chart]);
 s.charges.chart=0;d=orderDirection(s,o);assert.equal(d.kind,'refill');
 s.camp.loft=true;s.charges.chart=7;
 const tide={id:'tide',needs:[{family:'chart',line:'tide',tier:2,count:1}]};
 assert.equal(orderDirection(s,tide).kind,'recover');
 s.board=s.board.map((x,i)=>x??{type:'glyph'});assert.equal(orderDirection(s,tide).kind,'full');
});
test('never highlights a protected expedition ingredient as a disposable merge ingredient',()=>{
 const s=fresh(0);s.stage=1;
 const o={id:'rig',needs:[{family:'rig',tier:3,count:1}]};
 s.board[3]=item('rig',1);s.board[4]=item('rig',1);s.board[5]=item('rig',1);
 // Stage 1 protects one lens and one spanner, not every unrelated Grip Tool.
 const d=orderDirection(s,o);assert.equal(d.kind,'merge');assert.equal(d.indices.length,2);
 assert.equal(d.indices.every(i=>s.board[i].family==='rig'),true);
});
