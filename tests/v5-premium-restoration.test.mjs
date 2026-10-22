import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareRoute} from './v5-navigation-policy.mjs';
import {fresh,load,goal,ready,item,count,act} from '../v5/core.mjs';

const req=(family,tier)=>({family,tier,count:1});
const perform=(s,a)=>{const r=act(s,a);assert.equal(r.ok,true,r.message);return r;};

test('Survey progression preserves both crafted route tools and spends only chosen route item',()=>{
 const s=fresh(0);
 assert.equal(s.landingStep,0);
 perform(s,{type:'merge',from:7,to:8});
 perform(s,{type:'goal'});
 assert.equal(s.landingStep,1);
 s.board[7]=item('rig',2);s.board[8]=item('chart',2);s.workshop.repaired=true;
 assert.equal(ready(s,goal(s).needs),true);
 perform(s,{type:'goal'});
 assert.equal(s.stage,1);
 assert.equal(s.routePrepared,true);
 assert.equal(count(s,req('rig',2)),1);
 assert.equal(count(s,req('chart',2)),1);
 assert.equal(load(JSON.stringify(s)).stage,1);
 const conduitIndex=s.board.findIndex(x=>x?.type==='route'&&x.id==='conduit');
 prepareRoute(s,'conduit');
 // The covered board is full after the landing rewards; the conduit's relic case needs a space.
 assert.equal(act(s,{type:'breach',index:conduitIndex}).ok,false);perform(s,{type:'merge',from:18,to:2});// free the crusted offcut, cracking the jar beside it
 perform(s,{type:'breach',index:conduitIndex});
 assert.equal(s.stage,2);
 assert.equal(s.expedition.route,'conduit');
 assert.equal(count(s,req('chart',2)),0);
 assert.equal(count(s,req('rig',2)),1);
});

test('Older stage-one saves migrate exactly once without wiping other board contents',()=>{
 const old=fresh();
 old.stage=1;old.landingStep=2;delete old.routePrepared;
 old.board=old.board.map((x)=>x?.type==='item'&&x.tier===2?null:x);
 const saved=JSON.stringify(old.board);
 const restored=load(JSON.stringify(old));
 assert.equal(restored.stage,1);
 assert.equal(restored.routePrepared,true);
 assert.equal(count(restored,req('rig',2)),1);
 assert.equal(count(restored,req('chart',2)),1);
 assert.equal(restored.board.filter(Boolean).length,old.board.filter(Boolean).length+2);
 assert.equal(load(JSON.stringify(restored)).board.filter(Boolean).length,restored.board.filter(Boolean).length);
 assert.notEqual(saved,JSON.stringify(restored.board));
});

test('Visual rollback preserves the original premium V5 shell and forbids helper overlays',()=>{
 for(const file of ['index.html','crazygames.html']){
  const html=fs.readFileSync(new URL('../v5/'+file,import.meta.url),'utf8');
  assert.match(html,/premium\.css/);
  assert.match(html,/mobile\.css/);
  assert.doesNotMatch(html,/experience\.css|guidePanel|guideButton|goalRecipe/);
 }
 const app=fs.readFileSync(new URL('../v5/app.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(app,/action-guide\.mjs|guidance\.mjs|coachRoute|boardRole|bonusExpanded/);
 assert.match(app,/function render\(/);
 assert.match(app,/function clickTile\(/);
 assert.match(app,/pointerdown/);
});
