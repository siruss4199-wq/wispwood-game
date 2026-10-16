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
test('prepared tools, charge cells and receiver equipment cannot be accidentally delivered',()=>{
 const s=fresh();s.stage=2;s.board[6]=item('chart',3);s.board[7]=item('rig',3);s.board[8]=item('flux',1);syncRequests(s);
 const kept=reservedItems(s);for(const i of [6,7,8])assert.ok(kept.has(i));
 const o={needs:[{family:'chart',tier:3,count:1}]};assert.equal(requestProgress(s,o).ready,false);
 s.board[12]=item('chart',3);assert.deepEqual(requestProgress(s,o).indices,[12]);
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
  for(const r of o.needs)while(requestProgress(s,o).progress.find(p=>p.family===r.family&&p.tier===r.tier).current<r.count){const i=s.board.indexOf(null);assert.ok(i>=0);s.board[i]=item(r.family,r.tier);}
  assert.ok(act(s,{type:'request',id:o.id}).ok);assert.notEqual(s.requests.orders[n%3].id,o.id);last=o;
 }
 assert.equal(s.requests.completed,90);assert.equal(s.requests.supplies,300);
});
test('twelve consecutive requests use actual production, service and merging without injected stock',()=>{
 const s=fresh();act(s,{type:'merge',from:7,to:8});act(s,{type:'goal'});
 for(let n=0;n<12;n++){
  const lane=n%3;let delivered=false;
  for(let step=0;step<100;step++){
   const o=s.requests.orders[lane],p=requestProgress(s,o);
   if(p.ready){assert.ok(act(s,{type:'request',id:o.id}).ok);delivered=true;break;}
   const need=p.progress.find(r=>r.current<r.count),kept=reservedItems(s);let command;
   for(let tier=need.tier-1;tier>=0;tier--){const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===need.family&&x.tier===tier&&!kept.has(i)?[i]:[]);if(pair.length>=2){command={type:'merge',from:pair[0],to:pair[1]};break;}}
   command??={type:s.charges[need.family]?'produce':'service',id:need.family};
   const result=act(s,command);assert.ok(result.ok,result.message);
  }
  assert.ok(delivered,'every lane remains achievable');
 }
 assert.equal(s.requests.completed,12);assert.ok(s.taps.rig>7);assert.ok(s.taps.chart>0);assert.ok(s.merges>10);
 assert.deepEqual(load(JSON.stringify(s)).requests,s.requests);
});
test('delivery reserves the route lens then frees lenses after the route',()=>{
 const s=fresh();s.stage=1;s.board[2]=item('chart',2);s.board[9]=item('chart',2);
 const order={needs:[{family:'chart',tier:2,count:1}]};assert.deepEqual(requestProgress(s,order).indices,[9]);assert.ok(reservedItems(s).has(2));
 s.stage=2;s.seals.navigation=true;s.seals.stabilization=true;s.seals.optics.primed=true;s.board[20].phase='done';s.board[20].progress=2;s.board[14]=item('chart',2);
 assert.equal(reservedItems(s).has(14),false);assert.deepEqual(requestProgress(s,order).indices,[2]);
});

test('three unlocked lanes choose different achievable item goals where families allow it',()=>{
 for(const stage of [0,1,2,4]){
  const s=fresh();s.stage=stage;if(stage===0)s.landingStep=1;
  s.requests.orders=[null,null,null];syncRequests(s);
  const available=new Set(stage<2?['rig','chart']:['rig','chart','flux']);
  const orders=s.requests.orders.filter(Boolean);
  assert.equal(orders.length,3);
  const mains=orders.map(o=>o.needs[0].family+':'+o.needs[0].tier);
  assert.equal(new Set(mains).size,3,'distinct primary items at stage '+stage+': '+mains);
  for(const o of orders)for(const r of o.needs){
   assert.ok(available.has(r.family),'producer unlocked in stage '+stage);
   assert.ok(r.tier<=3,'no high-tier grinding');
  }
 }
});
test('two early Quick deliveries unlock a safe long request even before landing progress',()=>{
 const s=fresh();s.requests.completed=2;s.requests.sequences=[2,0,0];s.requests.orders=[null,null,null];
 assert.doesNotThrow(()=>syncRequests(s));
 assert.equal(s.requests.orders.filter(Boolean).length,3);
 for(const o of s.requests.orders)for(const r of o.needs){
  assert.equal(r.family,'rig','no locked producer before survey unlock');
  assert.ok(r.tier<=1,'avoid early high-tier request');
 }
});
test('live requests survive stage unlocks and save reload without rerolling',()=>{
 const s=fresh();s.stage=2;syncRequests(s);
 const before=structuredClone(s.requests.orders);
 s.stage=4;syncRequests(s);assert.deepEqual(s.requests.orders,before);
 assert.deepEqual(load(JSON.stringify(s)).requests.orders,before);
});
