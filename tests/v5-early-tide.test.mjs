import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,load,goal,item} from '../v5/core.mjs';
import {syncRequests} from '../v5/requests.mjs';
import {requestAction} from './v5-workshop-policy.mjs';
const ok=(s,a)=>{const r=act(s,a);assert.ok(r.ok,r.message);return r;};
function earn(s){
 const completed=s.requests.completed;
 for(let n=0;n<80&&s.requests.completed===completed;n++)ok(s,requestAction(s,0));
 assert.equal(s.requests.completed,completed+1);
}
test('two genuinely earned early orders produce a mergeable Compass before the Vault or any camp purchase',()=>{
 let s=fresh();ok(s,{type:'merge',from:7,to:8});ok(s,{type:'goal'});
 earn(s);assert.equal(s.camp.earlyFragments,1);s=load(JSON.stringify(s));earn(s);
 const pair=s.board.flatMap((x,i)=>x?.line==='tide'&&x.tier===0?[i]:[]);
 assert.equal(pair.length,2);assert.equal(s.camp.earlyFragments,2);assert.equal(s.stage,0);
 assert.equal(s.workshop.repaired,false);assert.equal(s.camp.loft,false);
 ok(s,{type:'merge',from:pair[0],to:pair[1]});assert.ok(s.discovered.includes('chart:tide:1'));
 const before=s.board.filter(x=>x?.line==='tide').length;earn(s);
 assert.equal(s.board.filter(x=>x?.line==='tide').length,before);
 assert.equal(load(JSON.stringify(s)).camp.earlyFragments,2);
});
test('legacy Vault open at 6/8 preserves state and earns catch-up fragments only on real deliveries',()=>{
 const old=fresh();old.stage=4;old.landingStep=2;old.routePrepared=true;old.requests.supplies=6;delete old.camp.earlyFragments;syncRequests(old);
 const board=structuredClone(old.board),orders=structuredClone(old.requests.orders);
 const s=load(JSON.stringify(old));assert.deepEqual(s.board,board);assert.deepEqual(s.requests.orders,orders);
 assert.equal(s.requests.supplies,6);assert.equal(s.discovered.some(k=>k.includes(':tide:')),false);
 assert.equal(goal(s).action,'orders');assert.equal(goal(s).cost,8);
 earn(s);assert.equal(s.camp.earlyFragments,1);earn(s);assert.equal(s.camp.earlyFragments,2);
 assert.equal(goal(s).action,'restoreWorkshop');ok(s,{type:goal(s).action});assert.equal(goal(s).action,'orders');
 assert.equal(goal(s).name,'Build Supply Pier');
});
test('full-board delivery uses its freed slot and duplicate delivery grants nothing',()=>{
 const s=fresh();s.landingStep=1;s.board=s.board.map(x=>x??item('rig',0));
 const id=s.requests.orders[0].id;ok(s,{type:'request',id});assert.equal(s.camp.earlyFragments,1);
 assert.equal(s.board.filter(x=>x?.line==='tide').length,1);assert.equal(s.requests.supplies,1);
 const saved=JSON.stringify(s);assert.equal(act(s,{type:'request',id}).ok,false);assert.equal(JSON.stringify(s),saved);
 assert.deepEqual(load(JSON.stringify(s)).board,s.board);
});
