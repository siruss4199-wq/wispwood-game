import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,load} from '../v5/core.mjs';
import {firstPier} from '../v5/first-pier.mjs';
import {coastalObjective} from '../v5/coastal-journey.mjs';
import {requestAction} from './v5-workshop-policy.mjs';
const landing=()=>{const s=fresh(0);assert.ok(act(s,{type:'merge',from:7,to:8}).ok);assert.ok(act(s,{type:'goal'}).ok);return s};
const deliver=(s,lane)=>{for(let n=0;n<120;n++){const a=requestAction(s,lane),r=act(s,a,n*1000);assert.ok(r.ok,JSON.stringify({a,reason:r.message}));if(a.type==='request')return r;}throw Error('Order not fulfilled');};
test('real deliveries progressively repair the pier without an extra save field or arbitrary timer',()=>{
 const s=landing(),before=JSON.stringify(s);
 assert.equal(firstPier(s).level,0);assert.deepEqual(firstPier(s).visibleLanes,[0]);
 assert.match(coastalObjective(s,{needs:[]}).name,/Repair the storm-damaged pier/);
 assert.equal(JSON.stringify(s),before);
 assert.equal(deliver(s,0).tideFragment,true);
 assert.equal(firstPier(s).level,1);assert.deepEqual(firstPier(s).visibleLanes,[0,1]);
 assert.equal(coastalObjective(s,{needs:[]}).orderId,s.requests.orders[1].id);
 assert.equal(deliver(s,1).tideFragment,true);
 assert.equal(firstPier(s).level,2);assert.deepEqual(firstPier(s).visibleLanes,[0,1,2]);
 assert.equal(s.camp.earlyFragments,2);assert.equal(s.stage,0);
 assert.deepEqual(firstPier(load(JSON.stringify(s))),firstPier(s));
 assert.equal('firstPier' in s,false);
});
test('original chapter progression and existing developed camp stay outside first pier tutorial',()=>{
 const s=landing();s.stage=1;assert.equal(firstPier(s),null);
 s.stage=0;s.landingStep=0;assert.equal(firstPier(s),null);
 s.landingStep=1;s.camp.pier=true;assert.equal(firstPier(s),null);
});
