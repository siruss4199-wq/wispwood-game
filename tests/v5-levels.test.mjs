// Expedition level and level chest.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fresh,act,load,item} from '../v5/core.mjs';
import {xpToNext,validLevel,freshLevel,CHEST_ENERGY} from '../v5/levels.mjs';

test('levels need more XP each time, capped',()=>{
 assert.deepEqual([1,2,3,5,7,20].map(xpToNext),[20,30,40,60,80,80]);
 assert.deepEqual(validLevel({version:1,level:3,xp:12}),{version:1,level:3,xp:12});
 for(const bad of [null,{},{version:1,level:0,xp:0},{version:1,level:2,xp:30},{version:1,level:2,xp:-1},{version:2,level:2,xp:1}])assert.deepEqual(validLevel(bad),freshLevel());
});

test('a fresh game starts at level 1; merges earn XP',()=>{
 const s=fresh(0);assert.deepEqual(s.level,freshLevel());
 const r=act(s,{type:'merge',from:7,to:8},1);
 assert.equal(r.ok,true);assert.equal(r.xp,1);assert.equal(s.level.xp,1);
 const before=JSON.stringify(s);assert.equal(act(s,{type:'merge',from:0,to:1},2).ok,false);assert.equal(JSON.stringify(s),before,'failed actions earn nothing');
});

test('reaching a level opens a chest: energy now and a raw-parts case on the board',()=>{
 const s=fresh(0);s.level.xp=19;const energy=s.energy,crates=s.board.filter(x=>x?.type==='crate').length;
 const r=act(s,{type:'merge',from:7,to:8},1);
 assert.deepEqual(s.level,{version:1,level:2,xp:0});
 assert.equal(r.levelUp.length,1);assert.equal(r.levelUp[0].level,2);assert.equal(r.levelUp[0].kind,'salvage');
 assert.equal(s.energy,energy+CHEST_ENERGY+(s.merges%3===0?1:0));
 assert.equal(s.board.filter(x=>x?.type==='crate').length,crates+1);
 assert.equal(s.board[r.levelUp[0].index].kind,'salvage');
});

test('with two cases already waiting, the chest pays extra energy instead of a third case',async()=>{
 const {container}=await import('../v5/containers.mjs');
 const s=fresh(0);s.level.xp=19;s.board[1]=container('survey');
 assert.equal(s.board.filter(x=>x?.type==='crate').length,2);
 const energy=s.energy,r=act(s,{type:'merge',from:7,to:8},1);
 assert.equal(r.levelUp[0].kind,null);assert.equal(r.levelUp[0].energy,CHEST_ENERGY+5);
 assert.equal(s.board.filter(x=>x?.type==='crate').length,2);
 assert.equal(s.energy,energy+CHEST_ENERGY+5+(s.merges%3===0?1:0));
});

test('crew orders and restorations pay more XP than merges',()=>{
 const s=fresh(0);s.requests.supplies=8;
 const r=act(s,{type:'restoreWorkshop'},1);assert.equal(r.ok,true);assert.equal(r.xp,10);
});

test('older saves without a level load at level 1 and keep everything else',()=>{
 const dir=new URL('./fixtures/stage2/',import.meta.url);
 for(const f of readdirSync(dir)){
  const raw=readFileSync(new URL(f,dir),'utf8'),old=JSON.parse(raw),s=load(raw,9);
  assert.equal(old.level,undefined);assert.deepEqual(s.level,freshLevel(),f);assert.equal(s.stage,old.stage,f);assert.equal(s.energy,old.energy,f);
 }
 const s=fresh(0);s.level={version:1,level:4,xp:7};assert.deepEqual(load(JSON.stringify(s),3).level,{version:1,level:4,xp:7});
});
