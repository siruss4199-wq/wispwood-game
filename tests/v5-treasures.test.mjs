import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,item,load,count} from '../v5/core.mjs';
import {LOFT_COST,tideItem} from '../v5/treasures.mjs';import {syncRequests,requestProgress} from '../v5/requests.mjs';import {benchInputs} from '../v5/workshop.mjs';
const ok=(s,a)=>{const r=act(s,a);assert.ok(r.ok,r.message);return r;};
const reject=(s,a)=>{const before=JSON.stringify(s);assert.equal(act(s,a).ok,false);assert.equal(JSON.stringify(s),before);};
function camp(){const s=fresh();s.landingStep=1;s.workshop.repaired=true;s.camp.pier=true;s.requests.supplies=LOFT_COST;syncRequests(s);return s;}
test('permanent Loft costs exactly earned supplies, preserves pending orders, and cannot be bought twice',()=>{
 const s=camp(),orders=structuredClone(s.requests.orders),board=structuredClone(s.board);ok(s,{type:'buildLoft'});assert.equal(s.requests.supplies,0);assert.deepEqual(s.requests.orders,orders);assert.deepEqual(s.board,board);assert.equal(s.camp.loft,true);reject(s,{type:'buildLoft'});assert.deepEqual(load(JSON.stringify(s)),s);
 const locked=fresh();locked.requests.supplies=40;reject(locked,{type:'buildLoft'});reject(locked,{type:'recoverTide'});
});
test('recovery has predictable output and exact cost; keeps normal rare, surge and enrichment schedules',()=>{
 const s=camp();ok(s,{type:'buildLoft'});s.board=s.board.map(x=>x?.type==='source'?x:null);const taps={...s.taps};s.surge=3;
 for(let n=0;n<4;n++){const before=s.energy,r=ok(s,{type:'recoverTide'});assert.deepEqual(s.board[r.index],tideItem(n===3?1:0));assert.equal(s.energy,before-2);}
 assert.equal(s.charges.chart,3);assert.deepEqual(s.taps,taps);assert.equal(s.surge,3);assert.equal(s.camp.dives,4);assert.deepEqual(load(JSON.stringify(s)),s);
 s.board=s.board.map(x=>x??item('rig',0));reject(s,{type:'recoverTide'});s.board[7]=null;s.energy=1;reject(s,{type:'recoverTide'});s.energy=5;s.charges.chart=0;reject(s,{type:'recoverTide'});
});
test('treasure twins merge into all three collectibles without impersonating normal navigation or expedition equipment',()=>{
 const s=camp();ok(s,{type:'buildLoft'});s.board[7]=tideItem(0);s.board[8]=item('chart',0);reject(s,{type:'merge',from:7,to:8});s.board[8]=tideItem(0);ok(s,{type:'merge',from:7,to:8});assert.deepEqual(s.board[8],tideItem(1));
 s.board[7]=tideItem(1);ok(s,{type:'merge',from:7,to:8});assert.deepEqual(s.board[8],tideItem(2));s.board[7]=tideItem(2);reject(s,{type:'merge',from:7,to:8});assert.equal(count(s,{family:'chart',tier:2}),0);assert.equal(count(s,{family:'chart',line:'tide',tier:2}),2);
 s.board=s.board.map(x=>['source','site'].includes(x?.type)?x:null);s.board[7]=item('rig',1);s.board[8]=tideItem(0);assert.equal(benchInputs(s)[1],-1);assert.deepEqual(load(JSON.stringify(s)).board,s.board);
});
test('new requests never appear before unlock; existing orders stay until delivery; new items and rewards are exact',()=>{
 const s=camp();const pending=structuredClone(s.requests.orders);for(let n=0;n<6;n++){s.requests.orders[1]=null;s.requests.sequences[1]++;syncRequests(s);assert.ok(!s.requests.orders[1].needs.some(r=>r.line));}
 s.requests.orders=pending;s.requests.sequences=[0,0,0];ok(s,{type:'buildLoft'});assert.deepEqual(s.requests.orders,pending);
 const old=s.requests.orders[1];for(const r of old.needs)for(let n=0;n<r.count;n++)s.board[s.board.indexOf(null)]=item(r.family,r.tier);
 ok(s,{type:'request',id:old.id});const o=s.requests.orders[1];assert.equal(o.needs[0].line,'tide');assert.equal(o.needs[0].tier,1);
 s.board[7]=item('chart',1);assert.equal(requestProgress(s,o).ready,false);s.board[8]=tideItem(1);assert.equal(requestProgress(s,o).ready,true);const supplies=s.requests.supplies;ok(s,{type:'request',id:o.id});assert.equal(s.board[8],null);assert.deepEqual(s.board[7],item('chart',1));assert.equal(s.requests.supplies,supplies+o.supplies);reject(s,{type:'request',id:o.id});assert.deepEqual(load(JSON.stringify(s)),s);
});
test('legacy Pier saves with 20–40 supplies preserve progression and can invest without restarting',()=>{
 for(const stage of [0,2,4])for(const supplies of [20,36,40]){const old=camp();old.stage=stage;old.landingStep=stage?2:1;old.routePrepared=stage>0;old.requests.supplies=supplies;old.workshop.precision=true;old.camp={version:1,pier:true,packs:2};const s=load(JSON.stringify(old));assert.equal(s.requests.supplies,supplies);assert.equal(s.stage,stage);assert.deepEqual(s.board,old.board);assert.equal(s.workshop.precision,true);assert.equal(s.camp.loft,false);ok(s,{type:'buildLoft'});assert.equal(s.requests.supplies,supplies-20);assert.deepEqual(load(JSON.stringify(s)),s);}
});
