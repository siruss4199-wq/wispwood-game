import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,item,act,load} from '../v5/core.mjs';
import {orderDirection} from '../v5/order-direction.mjs';

test('ready order gives collection direction without changing real items or delivery rights',()=>{
 const s=fresh(0),o=s.requests.orders[0],before=JSON.stringify(s);
 const d=orderDirection(s,o);assert.equal(d.kind,'collect');assert.deepEqual(d.indices,[]);
 assert.equal(JSON.stringify(s),before);
 assert.ok(act(s,{type:'request',id:o.id}).ok);
 assert.equal(orderDirection(s,s.requests.orders[0])?.orderId,s.requests.orders[0].id,'guidance follows the active replacement order');
 assert.notEqual(s.requests.orders[0].id,o.id);
});
test('recommends a legal merge, not a different treasure line at the same tier',()=>{
 const s=fresh(0);act(s,{type:'merge',from:7,to:8});act(s,{type:'goal'});
 const o={id:'example',needs:[{family:'chart',tier:2,count:1}]};
 s.board[3]=item('chart',1);s.board[4]=item('chart',1);
 s.board[5]=item('chart',1,'tide');
 const before=JSON.stringify(s),d=orderDirection(s,o);
 assert.equal(d.kind,'merge');assert.deepEqual(d.indices,[3,4]);
 assert.equal(JSON.stringify(s),before,'advice leaves the live board unchanged');
});
test('distinguishes a recharge, treasure recovery, and exhausted space',()=>{
 const s=fresh(0);act(s,{type:'merge',from:7,to:8});act(s,{type:'goal'});
 const o={id:'survey',needs:[{family:'chart',tier:2,count:1}]};
 s.board=s.board.map(x=>x?.type==='item'&&x.family==='chart'?null:x);
 const chart=s.board.findIndex(x=>x?.type==='source'&&x.id==='chart');
 let d=orderDirection(s,o);
 assert.equal(d.kind,'produce');assert.deepEqual(d.indices,[chart]);
 s.charges.chart=0;d=orderDirection(s,o);assert.equal(d.kind,'refill');
 s.camp.loft=true;s.charges.chart=7;
 const tide={id:'tide',needs:[{family:'chart',line:'tide',tier:2,count:1}]};
 assert.equal(orderDirection(s,tide).kind,'recover');
 s.board=s.board.map(x=>x??{type:'glyph'});
 const blocked=orderDirection(s,tide);
 assert.ok(['full','make-space'].includes(blocked.kind));
 if(blocked.kind==='make-space')assert.equal(blocked.indices.length,2);
});
test('never highlights a protected expedition ingredient as a disposable merge ingredient',()=>{
 const s=fresh(0);s.stage=1;
 const o={id:'rig',needs:[{family:'rig',tier:3,count:1}]};
 s.board[3]=item('rig',1);s.board[4]=item('rig',1);s.board[5]=item('rig',1);
 // Stage 1 protects one lens and one spanner, not every unrelated Grip Tool.
 const d=orderDirection(s,o);assert.equal(d.kind,'merge');assert.equal(d.indices.length,2);
 assert.equal(d.indices.every(i=>s.board[i].family==='rig'),true);
});

test('the director never sends a player to an unaffordable source action',()=>{
 const s=fresh(0);act(s,{type:'merge',from:7,to:8});act(s,{type:'goal'});
 s.board=s.board.map(x=>x?.type==='item'&&x.family==='chart'?null:x);
 const o={id:'need-chart',needs:[{family:'chart',tier:2,count:1}]};
 s.energy=0;
 assert.equal(orderDirection(s,o).kind,'energy');
 assert.deepEqual(orderDirection(s,o).indices,[]);
 s.energy=5;s.charges.chart=0;
 assert.equal(orderDirection(s,o).kind,'refill');
 s.energy=2;
 assert.equal(orderDirection(s,o).kind,'energy');
});
test('full-board advice never marks a top-tier duplicate as mergeable',()=>{
 const s=fresh(0);s.stage=4;s.camp.loft=true;s.camp.deepSurvey=true;
 s.board=s.board.map((x,i)=>x?.type==='source'?x:item('rig',7));
 const o={id:'late',needs:[{family:'chart',tier:1,count:1}]};
 const d=orderDirection(s,o);
 assert.equal(d.kind,'full','max-tier duplicates cannot be merged to free space');
 assert.deepEqual(d.indices,[]);
});
