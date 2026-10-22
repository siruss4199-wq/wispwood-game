import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,load,act,item,expeditionGoal,ready} from '../v5/core.mjs';
import {syncRequests,requestProgress,reservedItems} from '../v5/requests.mjs';
import {benchInputs} from '../v5/workshop.mjs';
import {requestAction} from './v5-workshop-policy.mjs';
const go=(s,a)=>{const r=act(s,a);assert.ok(r.ok,r.message);return r;};
function fulfill(s,lane){for(let i=0;i<100;i++){const a=requestAction(s,lane);go(s,a);if(a.type==='request')return;}assert.fail('request stuck');}
test('one upgrade: exact supplies, legacy restored migration, no reroll or repeat spend',()=>{
 const s=fresh();s.workshop={version:1,repaired:true,presses:7};s.requests.supplies=12;
 const old=load(JSON.stringify(s));assert.equal(old.workshop.precision,false);assert.equal(old.workshop.presses,7);
 const orders=structuredClone(old.requests.orders),board=structuredClone(old.board);go(old,{type:'upgradeWorkshop'});
 assert.equal(old.requests.supplies,0);assert.equal(old.workshop.precision,true);assert.deepEqual(old.requests.orders,orders);assert.deepEqual(old.board,board);
 const saved=load(JSON.stringify(old));assert.deepEqual(saved.workshop,old.workshop);const before=JSON.stringify(saved);assert.equal(act(saved,{type:'upgradeWorkshop'}).ok,false);assert.equal(JSON.stringify(saved),before);
 for(const restored of [false,true]){const x=fresh();x.workshop.repaired=restored;x.requests.supplies=11;const raw=JSON.stringify(x);assert.equal(act(x,{type:'upgradeWorkshop'}).ok,false);assert.equal(JSON.stringify(x),raw);}
});
test('bench consumes spare cross-family inputs, works full-board and preserves normal output schedule',()=>{
 const s=fresh();s.landingStep=1;s.workshop.repaired=true;s.workshop.precision=true;s.board=s.board.map(x=>x??item('rig',0));
 const [a,b]=benchInputs(s),before=structuredClone(s),result=go(s,{type:'fitSpanner'});
 assert.equal(result.index,a);assert.deepEqual(s.board[a],{...item('rig',2),spare:true});assert.equal(s.board[b],null);
 for(let i=0;i<36;i++)if(i!==a&&i!==b)assert.deepEqual(s.board[i],before.board[i]);
 assert.equal(s.energy,before.energy-1);assert.deepEqual(s.charges,before.charges);assert.deepEqual(s.taps,before.taps);assert.equal(s.workshop.fittings,1);
 go(s,{type:'press'});assert.equal(s.workshop.presses,1);
});
test('protected landing tools, missing ingredients, energy and a locked bench fail atomically; charges never block fitting',()=>{
 for(const kind of ['protected','missing','energy','charge','locked']){
  const s=fresh();s.workshop.repaired=true;s.workshop.precision=kind!=='locked';if(kind!=='protected')s.landingStep=1;
  if(kind==='missing')s.board=s.board.map(x=>x?.family==='chart'?null:x);if(kind==='energy')s.energy=0;if(kind==='charge')s.charges.rig=0;
  if(kind==='charge'){const energy=s.energy;go(s,{type:'fitSpanner'});assert.equal(s.energy,energy-1);assert.equal(s.charges.rig,0);continue;}
  const raw=JSON.stringify(s);assert.equal(act(s,{type:'fitSpanner'}).ok,false,kind);assert.equal(JSON.stringify(s),raw);
 }
});
test('fresh and legacy restored saves earn the upgrade and use fittings in actual replacement requests',()=>{
 for(const resume of [false,true]){
  let s=fresh();go(s,{type:'merge',from:7,to:8});go(s,{type:'goal'});
  for(let n=0;s.requests.supplies<8;n++)fulfill(s,n%2);
  go(s,{type:'restoreWorkshop'});
  if(resume){delete s.workshop.precision;delete s.workshop.fittings;s=load(JSON.stringify(s));}
  for(let n=0;s.requests.supplies<12;n++)fulfill(s,n%3);
  go(s,{type:'upgradeWorkshop'});const count=s.requests.completed;
  // Keep live orders; their normal replacements expose a bench-supported goal.
  for(let n=0;n<8&&s.workshop.fittings===0;n++)fulfill(s,n%3);
  assert.ok(s.workshop.fittings>0);assert.ok(s.requests.completed>count);assert.deepEqual(load(JSON.stringify(s)).workshop,s.workshop);
 }
});
test('a fitted spanner made before the crossing survey is not trapped by the landing reservation',()=>{
 // Regression: reservedItems reserves one rig/chart tier-2 item for the
 // upcoming crossing choice throughout stage<=1, even at stage 0 before the
 // crossing survey (landingStep 1) has crafted anything toward it. With
 // nothing else on the board, a freshly fitted spanner was the only match
 // and got treated as the reserved tool, trapping it: it could never be
 // delivered to a real request. fitSpanner now marks its output `spare`,
 // and reservedItems skips spare items when picking what to protect, so a
 // lone early spanner stays deliverable.
 const s=fresh();s.landingStep=1;s.workshop.repaired=true;s.workshop.precision=true;s.board=s.board.map(x=>x??item('rig',0));
 go(s,{type:'fitSpanner'});
 const spannerIndex=s.board.findIndex(x=>x?.type==='item'&&x.family==='rig'&&x.tier===2);
 assert.ok(spannerIndex>=0);
 assert.equal(s.stage,0);
 assert.equal(reservedItems(s).has(spannerIndex),false,'a lone early spanner must stay deliverable, not reserved for a crossing that has not begun');
 syncRequests(s);
 const lane=s.requests.orders.findIndex(o=>o.needs.some(r=>r.family==='rig'&&r.tier===2));
 assert.ok(lane>=0,'the bench-favoured order should be able to target the fitted spanner');
 assert.equal(requestProgress(s,s.requests.orders[lane]).indices.includes(spannerIndex),true);
 go(s,{type:'request',id:s.requests.orders[lane].id});
 assert.equal(s.board[spannerIndex],null);
});
test('an earned, non-spare crossing tool stays protected from optional requests',()=>{
 // Companion regression: exempting spares must not reopen the original hole
 // it was protecting. A player who merges their own rig/chart tier-2 tools
 // toward "Chart the safe crossing" (no Bench involved) must keep them safe
 // from Requests exactly as before, since that tool is not a spare.
 const s=fresh();
 go(s,{type:'merge',from:7,to:8});// rig0+rig0 -> rig1 @8, spent on the first goal's Grip tool
 go(s,{type:'goal'});// landingStep 0 -> 1; grants a fresh chart0+rig0
 assert.equal(s.stage,0);assert.equal(s.landingStep,1);
 go(s,{type:'merge',from:9,to:10});// chart0+chart0 -> chart1 @10
 go(s,{type:'merge',from:10,to:14});// chart1+chart1 -> chart2 @14
 const p1=go(s,{type:'produce',id:'rig'}),p2=go(s,{type:'produce',id:'rig'});
 go(s,{type:'merge',from:p1.index,to:p2.index});// rig0+rig0 -> rig1
 go(s,{type:'merge',from:p2.index,to:13});// rig1+rig1 -> rig2 @13
 const needs=expeditionGoal(s).needs;
 assert.equal(ready(s,needs),true,'crafted exactly the crossing-survey ingredients');
 assert.deepEqual(s.board[13],item('rig',2));assert.deepEqual(s.board[14],item('chart',2));
 const kept=reservedItems(s);
 assert.ok(kept.has(13),'the earned rig tier-2 crossing tool must stay reserved');
 assert.ok(kept.has(14),'the earned chart tier-2 crossing tool must stay reserved');
 syncRequests(s);
 for(const o of s.requests.orders.filter(Boolean)){
  const p=requestProgress(s,o);
  assert.equal(p.indices.includes(13),false,'a real request must never consume the rig crossing tool');
  assert.equal(p.indices.includes(14),false,'a real request must never consume the chart crossing tool');
 }
 assert.equal(act(s,{type:'goal'}).ok,false,'the crossing gear is fitted in the restored Workshop');
 s.workshop.repaired=true;
 go(s,{type:'goal'});// the crossing survey itself still reads the board directly
 assert.equal(s.stage,1);assert.equal(s.routePrepared,true);
 assert.deepEqual(s.board[13],item('rig',2));assert.deepEqual(s.board[14],item('chart',2));
});
test('the spare marker round-trips through save/load, fresh and legacy',()=>{
 // Fresh save: a fitted spanner's spare marker must survive a reload and
 // stay exempt from the landing reservation afterwards.
 const s=fresh();s.landingStep=1;s.workshop.repaired=true;s.workshop.precision=true;s.board=s.board.map(x=>x??item('rig',0));
 go(s,{type:'fitSpanner'});
 const spannerIndex=s.board.findIndex(x=>x?.type==='item'&&x.family==='rig'&&x.tier===2);
 const reloaded=load(JSON.stringify(s));
 assert.deepEqual(reloaded.board[spannerIndex],s.board[spannerIndex]);
 assert.equal(reloaded.board[spannerIndex].spare,true);
 assert.equal(reservedItems(reloaded).has(spannerIndex),false);
 // Legacy save: a pre-existing rig tier-2 item with no spare marker at all
 // (the only shape older saves ever produced) must still load cleanly and
 // remain protectable, exactly as before this change.
 const legacy=fresh();legacy.landingStep=1;legacy.board[1]=item('rig',2);
 const loadedLegacy=load(JSON.stringify(legacy));
 assert.deepEqual(loadedLegacy.board[1],item('rig',2));
 assert.equal(loadedLegacy.board[1].spare,undefined);
 assert.equal(reservedItems(loadedLegacy).has(1),true);
});
test('new Standard orders favour spanners without duplicating existing main goals or altering live orders',()=>{
 const s=fresh();s.landingStep=1;s.workshop.repaired=true;s.workshop.precision=true;syncRequests(s);
 const other=structuredClone([s.requests.orders[0],s.requests.orders[2]]);s.requests.orders[1]=null;syncRequests(s);
 assert.deepEqual([s.requests.orders[0],s.requests.orders[2]],other);
 for(const o of s.requests.orders)for(const r of o.needs)assert.ok(['rig','chart'].includes(r.family));
 const o=s.requests.orders.find(o=>o.needs.some(r=>r.family==='rig'&&r.tier>=2));assert.ok(o);assert.equal(requestProgress(s,o).ready,false);
});
