// Chapter 2 integration (docs/V5_CHAPTER2_INTEGRATION_2026-10-28.md), rules and saves.
// Build 47b: Chapter 1's finale, the Vault door (from PR #80): a finished Chapter 1 save, also one
// that already saw the old ending, continues into it with its gold order ready; three rings, the
// inner one with its own materials; turning it completes Chapter 1. Story cards are seen once.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,load,act,item,allDone,upgrades,currentArea,stageOf} from '../v5/next/game.mjs';
import {AREAS,STAGES} from '../v5/next/areas.mjs';

const ok=(s,a,now=1000)=>{const r=act(s,a,now);assert.ok(r.ok,JSON.stringify(a)+' '+r.message);return r;};
const done=a=>Object.fromEntries(a.tasks.map(t=>[t.id,3]));
// A camp as Build 46 left it at the end of Chapter 1: both areas built, sitting at the worksite.
function chapter1Done({seenEnd}={}){
 const s=fresh(0);s.area=1;s.built={...done(AREAS[0]),...done(AREAS[1])};s.materials={...s.built};s.coins=1234;s.moves=900;s.ordersDone=80;
 s.daily={day:9e6,count:1};if(seenEnd!==undefined)s.seenEnd=seenEnd;
 // a Build 46 save has neither field
 delete s.pending;delete s.seen;
 return s;
}

test('a finished Chapter 1 save goes on to the Vault door, with its gold order ready', ()=>{
 for(const seenEnd of [true,false,undefined]){
  const old=chapter1Done({seenEnd}),board=JSON.stringify(old.board),raw=JSON.stringify(old);
  const s=load(raw,5000);
  assert.equal(s.area,2,`seenEnd ${seenEnd}: at the Vault Entrance`);assert.equal(currentArea(s).id,'entrance');
  assert.notEqual(s.seenEnd,true,'the old ending no longer marks the end');
  assert.equal(allDone(s),false);assert.equal(JSON.stringify(s.board),board,'board unchanged');assert.equal(s.coins,1234);assert.equal(s.moves,900);
  assert.deepEqual([s.pending,s.seen],[[],{}]);
  assert.deepEqual(upgrades(s).map(u=>[u.id,u.stage,u.cost]),[['vault-door',1,240]]);
  const gold=s.orders.filter(o=>o?.story);assert.equal(gold.length,1);assert.equal(gold[0].story,'vault-door');
  // loading again changes nothing more
  assert.equal(JSON.stringify(load(JSON.stringify(s),6000).orders),JSON.stringify(s.orders));
 }
});

test('a camp partway through Chapter 1 is untouched', ()=>{
 const old=fresh(0);old.area=1;old.built={...done(AREAS[0]),'ws-camp':2};old.materials={...old.built};old.moves=500;delete old.pending;delete old.seen;
 const s=load(JSON.stringify(old),5000);assert.equal(s.area,1);assert.deepEqual(s.built,old.built);
});

test('the Vault door: three rings, 840 coins, the inner ring wants a Signal lamp and a Bearing dial', ()=>{
 const t=AREAS[2].tasks;assert.deepEqual(t.map(x=>x.id),['vault-door']);
 const st=t[0].stages;assert.deepEqual(st.map(x=>x.cost),[240,280,320]);assert.deepEqual(st[2].gold,[['lamp',3,1],['chart',4,1]]);
 const s=load(JSON.stringify(chapter1Done()),5000);s.coins=5000;
 // each ring needs its gold order's materials first
 assert.match(act(s,{type:'restore',id:'vault-door'},6000).message,/materials/);
 // as a player does: deliver the ring's gold order (its parts laid on the board), then turn it
 const deliverGold=()=>{const o=s.orders.find(x=>x?.story==='vault-door');assert.ok(o,'a gold order for the next ring');
  const free=s.board.reduce((a,x,i)=>x===null||x.type==='cargo'?[...a,i]:a,[]);let k=0;
  for(const r of o.needs)for(let c=0;c<r.count;c++)s.board[free[k++]]=item(r.family,r.tier);
  ok(s,{type:'deliver',id:o.id});return o;};
 deliverGold();ok(s,{type:'restore',id:'vault-door'});
 deliverGold();ok(s,{type:'restore',id:'vault-door'});
 const gold=deliverGold();assert.deepEqual(gold.needs,[{family:'lamp',tier:3,count:1},{family:'chart',tier:4,count:1}],'the inner ring asks exactly its authored materials');
 const r=ok(s,{type:'restore',id:'vault-door'});
 assert.equal(stageOf(s,'vault-door'),STAGES);assert.ok(r.effects.areaDone);assert.equal(r.effects.nextArea,undefined,'nothing after the door is playable yet');
 assert.equal(allDone(s),true,'Chapter 1 complete');assert.ok(!s.orders.some(o=>o?.story),'no stale gold order left');
 ok(s,{type:'seenEnd'});assert.equal(s.seenEnd,true);
});

test('story cards are seen once, kept in the save, and checked when loaded', ()=>{
 const s=fresh(0);ok(s,{type:'seen',id:'door'});assert.deepEqual(s.seen,{door:true});
 assert.match(act(s,{type:'seen',id:'door'}).message,/Already/);assert.equal(act(s,{type:'seen',id:'Bad Id!'}).ok,false);
 const t=load(JSON.stringify(s),2000);assert.deepEqual(t.seen,{door:true});
 const bad=fresh(0);bad.moves=4;bad.seen={door:'yes'};assert.equal(load(JSON.stringify(bad),2000).moves,0,'a damaged seen list is not trusted');
});

test('the door\'s crate reward on a full board waits (Build 47a still holds)', ()=>{
 const s=load(JSON.stringify(chapter1Done()),5000);s.coins=5000;s.materials['vault-door']=2;s.built['vault-door']=1;
 for(let i=0;i<s.board.length;i++)if(s.board[i]===null)s.board[i]=item('rig',0);
 const r=ok(s,{type:'restore',id:'vault-door'});assert.equal(r.effects.kit,-1);assert.equal(s.pending.length,1);assert.equal(s.pending[0].type,'kit');assert.equal(s.pending[0].size,3);
});
