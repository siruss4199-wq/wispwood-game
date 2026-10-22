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

test('reaching a level opens a chest: energy now and a small generator box on the board',()=>{
 const s=fresh(0);s.level.xp=19;const energy=s.energy;
 const r=act(s,{type:'merge',from:7,to:8},1);
 assert.deepEqual(s.level,{version:1,level:2,xp:0});
 assert.equal(r.levelUp.length,1);assert.equal(r.levelUp[0].level,2);assert.equal(r.levelUp[0].family,'rig');
 assert.equal(s.energy,energy+CHEST_ENERGY+(s.merges%3===0?1:0));
 assert.deepEqual(s.board[r.levelUp[0].index],{type:'kit',family:'rig',size:1,left:3});
 // Boxes cycle Rover → Kite → Crucible with each level.
 const t=fresh(0);t.level={version:1,level:3,xp:39};const r2=act(t,{type:'merge',from:7,to:8},1);assert.equal(r2.levelUp[0].family,'flux');
});

test('with no free space, the chest pays extra energy instead of a box',()=>{
 // Past level 8 no gates are left to open, so a full board has no room for the box.
 const s=fresh(0);s.level={version:1,level:9,xp:79};s.requests.supplies=8;s.energy=20;
 for(let i=0;i<s.board.length;i++)if(s.board[i]===null||s.board[i].type==='gate')s.board[i]=item('flux',3);
 const r=act(s,{type:'restoreWorkshop'},1);assert.equal(r.ok,true,r.message);
 assert.equal(r.levelUp[0].family,null);assert.equal(r.levelUp[0].index,-1);assert.equal(r.levelUp[0].energy,CHEST_ENERGY+5);
 assert.equal(s.board.filter(x=>x?.type==='kit').length,0);
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

test('step 4b: older saves with spent charges load with full charges and producers need no service',()=>{
 const s=fresh(0);s.charges={rig:0,chart:3,flux:7};const back=load(JSON.stringify(s),2);
 assert.deepEqual(back.charges,{rig:7,chart:7,flux:7});
 const before=JSON.stringify(back),r=act(back,{type:'service',id:'rig'},3);
 assert.equal(r.ok,false);assert.match(r.message,/no longer need service/);assert.equal(JSON.stringify(back),before);
 const e=back.energy;assert.equal(act(back,{type:'produce',id:'rig'},4).ok,true);assert.equal(back.energy,e-1);assert.equal(back.charges.rig,7);
});
