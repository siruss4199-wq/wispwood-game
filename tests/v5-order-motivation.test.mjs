// TT-1I: request motivation and progression fairness. These are deterministic
// rule assertions, not estimates of retention or human enjoyment.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,load,act} from '../v5/core.mjs';
import {syncRequests,requestProgress} from '../v5/requests.mjs';
import {requestBrief} from '../v5/story.mjs';

test('order reasons identify the real camp upgrade without changing state',()=>{
 const s=fresh(1),o=s.requests.orders[0],before=JSON.stringify(s);
 const brief=requestBrief(o,s);
 assert.match(brief.reason,/Coastal Workshop/);
 assert.match(brief.reason,/0 → 1\/8 supplies/);
 assert.equal(JSON.stringify(s),before,'display cues must never mutate a save');
 const r=act(s,{type:'request',id:o.id});
 assert.ok(r.ok);assert.equal(s.requests.supplies,1);
 assert.match(requestBrief(s.requests.orders[0],s).reason,/1 → 2\/8 supplies/);
 assert.deepEqual(load(JSON.stringify(s)).requests,s.requests);
});

test('request variants rotate across available producers without invalidating pending lanes',()=>{
 const s=fresh(2);s.stage=2;syncRequests(s);
 const fixed=structuredClone(s.requests.orders.slice(1));
 const primary=[];
 for(let n=0;n<18;n++){
  const order=s.requests.orders[0];primary.push(order.needs[0].family+':'+order.needs[0].tier);
  s.requests.sequences[0]++;s.requests.orders[0]=null;syncRequests(s);
  assert.deepEqual(s.requests.orders.slice(1),fixed,'live side orders never reroll');
 }
 assert.ok(new Set(primary).size>=3,'a player must see several distinct orders');
 assert.ok(primary.some(x=>x.startsWith('chart:')||x.startsWith('flux:')),'quick lane reaches other unlocked producers');
});

test('treasure orders wait until first high-tier discovery, then stay bounded',()=>{
 const s=fresh(3);s.stage=4;s.camp.pier=s.camp.loft=s.camp.deepSurvey=true;
 const long=()=>{s.requests.orders[2]=null;s.camp.tideOrders=0;syncRequests(s);return s.requests.orders[2].needs[0];};
 let need=long();assert.equal(need.line,'tide');assert.equal(need.tier,2);
 s.discovered.push('chart:tide:3');need=long();assert.ok(need.tier<=3);
 s.discovered.push('chart:tide:4');need=long();assert.ok(need.tier<=4);
 assert.ok(s.requests.orders[2].supplies<=8);
});

test('ready orders still deliver original supplies and energy with no bonus items',()=>{
 const s=fresh(4),order=s.requests.orders[0],beforeCount=s.board.filter(Boolean).length;
 assert.equal(requestProgress(s,order).ready,true);
 assert.ok(act(s,{type:'request',id:order.id}).ok);
 assert.equal(s.requests.completed,1);assert.equal(s.requests.supplies,1);
 assert.equal(s.energy,37);
 assert.equal(s.board.filter(Boolean).length,beforeCount-1);
});
