import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {act,fresh,goal,load,count,item,ready} from '../v5/core.mjs';

const req=(family,tier,count=1)=>({family,tier,count});
const done=(s,action)=>{const r=act(s,action);assert.equal(r.ok,true,r.message);return r;};

test('two-family survey keeps both route ingredients; route becomes an immediate, meaningful choice',()=>{
 const s=fresh(0);
 done(s,{type:'merge',from:7,to:8});
 done(s,{type:'goal'});
 assert.equal(s.landingStep,1);
 s.board[7]=item('rig',2);s.board[8]=item('chart',2);
 assert.equal(ready(s,goal(s).needs),true);
 const before=s.board.map(x=>x?JSON.stringify(x):null);
 done(s,{type:'goal'});
 assert.equal(s.stage,1);
 assert.equal(s.routePrepared,true);
 assert.equal(count(s,req('rig',2)),1);
 assert.equal(count(s,req('chart',2)),1);
 assert.equal(s.board[7].type,'item');
 assert.equal(s.board[8].type,'item');
 assert.equal(before[7],JSON.stringify(s.board[7]));
 assert.equal(before[8],JSON.stringify(s.board[8]));
 assert.equal(load(JSON.stringify(s)).routePrepared,true);
 done(s,{type:'breach',index:24});
 assert.equal(s.stage,2);
 assert.equal(s.expedition.route,'ridge');
 assert.equal(count(s,req('rig',2)),0);
 assert.equal(count(s,req('chart',2)),1,'the other surveyed tool remains useful');
});

test('old route-choice saves are rescued once without resetting inventory or duplicating tools',()=>{
 const old=fresh(0);
 old.stage=1;old.landingStep=2;
 delete old.routePrepared;
 const marker=JSON.stringify(old.board[13]);
 const migrated=load(JSON.stringify(old));
 assert.equal(migrated.stage,1);
 assert.equal(migrated.routePrepared,true);
 assert.ok(count(migrated,req('rig',2))>=1);
 assert.ok(count(migrated,req('chart',2))>=1);
 assert.equal(JSON.stringify(migrated.board[13]),marker);
 const saved=load(JSON.stringify(migrated));
 assert.equal(count(saved,req('rig',2)),count(migrated,req('rig',2)));
 assert.equal(count(saved,req('chart',2)),count(migrated,req('chart',2)));
});

test('UX launch surfaces use one coherent last stylesheet and accessible action guide',()=>{
 for(const file of ['index.html','crazygames.html']){
  const page=fs.readFileSync(new URL('../v5/'+file,import.meta.url),'utf8');
  assert.ok(page.includes('<link rel="stylesheet" href="experience.css">'));
  assert.ok(page.indexOf('mobile.css')<page.indexOf('experience.css'));
  assert.match(page,/id="guidePanel"/);
  assert.match(page,/id="contracts"/);
  assert.match(page,/id="board"/);
 }
 const app=fs.readFileSync(new URL('../v5/app.mjs',import.meta.url),'utf8');
 assert.match(app,/bonusExpanded/);
 assert.match(app,/data-bonus-claim/);
 assert.match(app,/routeChoice/);
 assert.match(app,/teachingPair/);
 assert.match(app,/STEP 1/);
 assert.match(app,/#\('guidePanel'\)\.hidden=false/);
});
