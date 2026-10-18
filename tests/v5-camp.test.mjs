import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,load,item} from '../v5/core.mjs';
import {PIER_COST,PACK_COST} from '../v5/camp.mjs';
const ok=(s,a)=>{const r=act(s,a);assert.ok(r.ok,r.message);return r;};
const reject=(s,a)=>{const before=JSON.stringify(s);const r=act(s,a);assert.equal(r.ok,false,JSON.stringify(a));assert.equal(JSON.stringify(s),before,'failed action may not spend supplies or alter inventory');};

test('a real repaired Workshop can turn earned supplies into a visible Supply Pier and first case',()=>{
 const s=fresh(0);s.workshop.repaired=true;s.requests.supplies=PIER_COST;const board=structuredClone(s.board),oldMoves=s.moves;
 const r=ok(s,{type:'buildPier'});assert.equal(r.event,'campBuild');assert.equal(s.camp.pier,true);
 assert.equal(s.camp.packs,1);assert.equal(s.requests.supplies,0);assert.equal(s.moves,oldMoves+1);
 const changed=s.board.flatMap((x,i)=>JSON.stringify(x)!==JSON.stringify(board[i])?[i]:[]);
 assert.equal(changed.length,1,'a Pier reward is one real board case');
 assert.equal(s.board[changed[0]].kind,'salvage');assert.deepEqual(load(JSON.stringify(s)),s);
 reject(s,{type:'buildPier'});
});

test('supply cases are purchased from the existing currency and match unlocked production',()=>{
 const s=fresh();s.board=s.board.map(x=>x?.type==='crate'?null:x);s.workshop.repaired=true;s.requests.supplies=PIER_COST+3*PACK_COST;
 ok(s,{type:'buildPier'});s.landingStep=1;
 for(const [f,kind] of [['rig','salvage'],['chart','survey']]){
  const before=s.requests.supplies,cases=s.board.filter(x=>x?.type==='crate').length;
  const r=ok(s,{type:'packPier',family:f});assert.equal(r.event,'campPack');
  assert.equal(s.requests.supplies,before-PACK_COST);
  assert.equal(s.board[r.index].kind,kind);
  assert.equal(s.board.filter(x=>x?.type==='crate').length,cases+1);
 }
 assert.equal(s.camp.packs,3);
 reject(s,{type:'packPier',family:'rig'}); // no more than 3 unopened cases
 assert.deepEqual(load(JSON.stringify(s)),s);
});

test('locked producers, insufficient supplies and full boards fail atomically',()=>{
 const s=fresh();s.workshop.repaired=true;s.requests.supplies=PIER_COST;
 reject(s,{type:'packPier',family:'rig'});reject(s,{type:'packPier',family:'flux'});
 s.requests.supplies=PIER_COST-1;reject(s,{type:'buildPier'});
 s.requests.supplies=PIER_COST;s.board=s.board.map(x=>x??item('rig',0));reject(s,{type:'buildPier'});
 const t=fresh();t.workshop.repaired=true;t.requests.supplies=PIER_COST+PACK_COST;ok(t,{type:'buildPier'});
 reject(t,{type:'packPier',family:'chart'});
 reject(t,{type:'packPier',family:'flux'});
 t.requests.supplies=PACK_COST-1;reject(t,{type:'packPier',family:'rig'});
 t.requests.supplies=PACK_COST;t.board=t.board.map(x=>x??item('chart',0));reject(t,{type:'packPier',family:'rig'});
});

test('legacy and upgraded saves preserve original progress and have an idempotent Pier migration',()=>{
 for(const stage of [0,2,4]){
  const old=fresh(0);old.stage=stage;if(stage)old.landingStep=2;old.workshop={...old.workshop,repaired:true,precision:true,fittings:3};
  old.requests.supplies=37;delete old.camp;
  const s=load(JSON.stringify(old));
  assert.deepEqual(s.camp,{version:1,pier:false,packs:0,loft:false,dives:0,tideOrders:0});
  assert.equal(s.requests.supplies,37);assert.deepEqual(s.board,old.board);
  assert.deepEqual(s.workshop,old.workshop);assert.deepEqual(load(JSON.stringify(s)),s);
  ok(s,{type:'buildPier'});assert.equal(s.requests.supplies,37-PIER_COST);
  assert.equal(load(JSON.stringify(s)).camp.pier,true);
 }
});
