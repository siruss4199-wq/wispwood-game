import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,item,load,sourceUnlocked} from '../v5/core.mjs';
import {syncRequests,requestProgress,reservedItems} from '../v5/requests.mjs';
test('opening introduces three lanes gradually and only unlocked families',()=>{
 const s=fresh();assert.equal(s.requests.orders.filter(Boolean).length,1);
 assert.ok(act(s,{type:'merge',from:7,to:8}).ok);assert.equal(s.requests.orders.filter(Boolean).length,2);
 s.landingStep=1;syncRequests(s);assert.equal(s.requests.orders.filter(Boolean).length,3);
 for(const o of s.requests.orders)for(const r of o.needs)assert.ok(sourceUnlocked(s,r.family));
});
test('delivery consumes exact unprotected copies, replaces once, survives reload',()=>{
 const s=fresh(),o=s.requests.orders[0],before=s.board.filter(x=>x?.type==='item'&&x.family==='rig'&&x.tier===0).length;
 assert.ok(act(s,{type:'request',id:o.id}).ok);assert.equal(s.requests.supplies,1);assert.equal(s.energy,37);
 assert.equal(s.board.filter(x=>x?.type==='item'&&x.family==='rig'&&x.tier===0).length,before-1);
 const next=load(JSON.stringify(s));assert.deepEqual(next.requests,s.requests);
 assert.equal(act(next,{type:'request',id:o.id}).ok,false);assert.equal(next.requests.supplies,1);
 assert.notDeepEqual(next.requests.orders[0].needs,o.needs);
});
test('prepared tools, live lens and receiver equipment cannot be accidentally delivered',()=>{
 const s=fresh();s.stage=2;s.board[6]=item('chart',2);s.board[7]=item('rig',3);s.board[8]=item('flux',1);syncRequests(s);
 const kept=reservedItems(s);for(const i of [6,7,8])assert.ok(kept.has(i));
 const o={needs:[{family:'chart',tier:2,count:1}]};assert.equal(requestProgress(s,o).ready,false);
 s.board[12]=item('chart',2);assert.deepEqual(requestProgress(s,o).indices,[12]);
});
test('full board delivery and capped energy still award persistent supplies',()=>{
 const s=fresh();s.board=s.board.map(x=>x??item('rig',0));s.energy=120;
 assert.ok(act(s,{type:'request',id:s.requests.orders[0].id}).ok);assert.equal(s.energy,120);assert.equal(s.requests.supplies,1);assert.ok(s.board.includes(null));
});
test('legacy completed saves keep board and progression; malformed requests repair locally',()=>{
 const s=fresh();s.stage=4;delete s.requests;const board=structuredClone(s.board);
 const migrated=load(JSON.stringify(s));assert.equal(migrated.stage,4);assert.deepEqual(migrated.board,board);assert.equal(migrated.requests.supplies,0);
 migrated.requests.orders[0].needs=[{family:'alien',tier:999,count:1}];assert.equal(load(JSON.stringify(migrated)).stage,4);
});
test('replacement variety stays within unlocked producers across 90 deliveries',()=>{
 const s=fresh();s.stage=2;syncRequests(s);let last=null;
 for(let n=0;n<90;n++){
  const o=s.requests.orders[n%3];for(const r of o.needs){assert.ok(sourceUnlocked(s,r.family));assert.ok(r.tier<=3);}
  // Supply only spare requested inventory; reserved equipment stays intact.
  for(const r of o.needs)while(!requestProgress(s,o).progress.find(p=>p.family===r.family&&p.tier===r.tier)?.current){const i=s.board.indexOf(null);assert.ok(i>=0);s.board[i]=item(r.family,r.tier);}
  assert.ok(act(s,{type:'request',id:o.id}).ok);assert.notEqual(s.requests.orders[n%3].id,o.id);last=o;
 }
 assert.equal(s.requests.completed,90);assert.equal(s.requests.supplies,300);
});
