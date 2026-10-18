import test from 'node:test';import assert from 'node:assert/strict';
import {syncRequests,requestProgress} from '../v5/requests.mjs';
import {fresh,act,load,item} from '../v5/core.mjs';
import {tideItem,DEEP_SURVEY_COST} from '../v5/treasures.mjs';
const ok=(s,a)=>{const r=act(s,a);assert.ok(r.ok,r.message);return r;};
const reject=(s,a)=>{const before=JSON.stringify(s);assert.equal(act(s,a).ok,false);assert.equal(JSON.stringify(s),before);};
function loft(){const s=fresh();s.landingStep=1;s.workshop.repaired=true;s.camp.pier=true;s.camp.loft=true;s.requests.supplies=DEEP_SURVEY_COST;return s;}
function pearl(s){s.board[7]=tideItem(1);s.board[8]=tideItem(1);ok(s,{type:'merge',from:7,to:8});}
test('Deep Survey needs Loft, actual Pearl discovery and supplies; purchase preserves pending orders and inventory',()=>{
 const s=loft();reject(s,{type:'upgradeLoft'});pearl(s);s.requests.supplies--;reject(s,{type:'upgradeLoft'});s.requests.supplies++;
 const board=structuredClone(s.board),orders=structuredClone(s.requests.orders);ok(s,{type:'upgradeLoft'});assert.equal(s.requests.supplies,0);assert.deepEqual(s.board,board);assert.deepEqual(s.requests.orders,orders);reject(s,{type:'upgradeLoft'});assert.deepEqual(load(JSON.stringify(s)),s);
 const noLoft=loft();pearl(noLoft);noLoft.camp.loft=false;reject(noLoft,{type:'upgradeLoft'});
});
test('upgraded recovery guarantees a compass for 3 energy and one charge without advancing normal rare schedules',()=>{
 const s=loft();pearl(s);ok(s,{type:'upgradeLoft'});const taps={...s.taps},energy=s.energy,charge=s.charges.chart;s.surge=3;
 for(let n=0;n<3;n++){const r=ok(s,{type:'recoverTide'});assert.deepEqual(s.board[r.index],tideItem(1));}
 assert.equal(s.energy,energy-9);assert.equal(s.charges.chart,charge-3);assert.equal(s.camp.deepDives,3);assert.equal(s.surge,3);assert.deepEqual(s.taps,taps);
 s.board=s.board.map(x=>x??item('rig',0));reject(s,{type:'recoverTide'});s.board[7]=null;s.energy=2;reject(s,{type:'recoverTide'});s.energy=5;s.charges.chart=0;reject(s,{type:'recoverTide'});
});
test('upper tide merges are gated, distinct from navigation parts and stop at Ocean Crown',()=>{
 const s=loft();pearl(s);s.board[7]=tideItem(2);reject(s,{type:'merge',from:7,to:8});ok(s,{type:'upgradeLoft'});ok(s,{type:'merge',from:7,to:8});assert.deepEqual(s.board[8],tideItem(3));
 s.board[7]=item('chart',3);reject(s,{type:'merge',from:7,to:8});s.board[7]=tideItem(3);ok(s,{type:'merge',from:7,to:8});assert.deepEqual(s.board[8],tideItem(4));s.board[7]=tideItem(4);reject(s,{type:'merge',from:7,to:8});assert.deepEqual(load(JSON.stringify(s)),s);
});
test('TT-1E Loft saves preserve items, banked supplies, requests and seals; merged Pearl qualifies after migration',()=>{
 const old=loft();pearl(old);old.requests.supplies=36;delete old.camp.deepSurvey;delete old.camp.deepDives;const s=load(JSON.stringify(old));assert.equal(s.camp.deepSurvey,false);assert.deepEqual(s.board,old.board);assert.deepEqual(s.requests,old.requests);assert.deepEqual(s.seals,old.seals);ok(s,{type:'upgradeLoft'});assert.equal(s.requests.supplies,18);assert.deepEqual(load(JSON.stringify(s)),s);
});

test('higher requests follow capability and discovery; pending orders survive upgrade and reload',()=>{
 const s=loft();pearl(s);const replace=n=>{s.requests.sequences[2]=n;s.requests.orders[2]=null;syncRequests(s);return s.requests.orders[2];};
 assert.equal(replace(2).needs[0].tier,2);const pending=structuredClone(s.requests.orders);ok(s,{type:'upgradeLoft'});assert.deepEqual(s.requests.orders,pending);
 const sextant=replace(4);assert.equal(sextant.needs[0].line,'tide');assert.equal(sextant.needs[0].tier,3);assert.equal(sextant.needs.length,1);
 s.board[7]=tideItem(2);ok(s,{type:'merge',from:7,to:8});assert.equal(requestProgress(s,sextant).ready,true);ok(s,{type:'request',id:sextant.id});
 const crown=replace(8);assert.equal(crown.needs[0].tier,4);assert.equal(crown.supplies,8);assert.equal(crown.energy,24);assert.deepEqual(load(JSON.stringify(s)).requests,s.requests);
});
