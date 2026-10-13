import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fresh,act,item,goal} from '../v5/core.mjs';
import {objectiveGuide,objectGuide} from '../v5/guidance.mjs';

test('the required objective names real ingredients and does not confuse bonus work with story',()=>{
 const s=fresh(0);
 assert.match(objectiveGuide(s).recipe,/Grip tool/);
 assert.match(objectiveGuide(s).detail,/BONUS task is optional/);
 assert.match(objectiveGuide(s).short,/NEXT/);
 assert.ok(act(s,{type:'merge',from:7,to:8}).ok);
 assert.ok(act(s,{type:'goal'}).ok);
 assert.match(objectiveGuide(s).recipe,/Sight lens/i);
 assert.match(objectiveGuide(s).recipe,/Split spanner/i);
 s.stage=1;assert.match(objectiveGuide(s).recipe,/CHOOSE ONE/);
 s.stage=2;assert.match(objectiveGuide(s).recipe,/USE 2 DEVICES/);
 s.stage=3;assert.match(objectiveGuide(s).recipe,/(Bearing dial|Crawler jack)/i);
});

test('guides distinguish matching parts, producers, hidden equipment and non-merge objects',()=>{
 const s=fresh();
 assert.match(objectGuide(s,7).detail,/matching twin/i);
 assert.match(objectGuide(s,0).short,/PRODUCER/);
 assert.match(objectGuide(s,5).short,/LOCKED/);
 assert.match(objectGuide(s,19).short,/SALTSTONE/);
 assert.match(objectGuide(s,19).detail,/Split Spanner/);
 assert.match(objectGuide(s,24).title,/Ridge breach/);
 assert.match(objectGuide(s,34).title,/CACHE/);
 assert.match(objectGuide(s,25).short,/BURIED/);
 s.board[7]={type:'glyph'};const glyph=objectGuide(s,7);
 assert.match(glyph.title,/ECHO FRAGMENT/);
 assert.match(glyph.detail,/NOT a normal stone/);
 assert.match(glyph.detail,/Sight Lens/);
 assert.match(glyph.detail,/skip/);
 s.board[8]=item('flux',3);s.stage=2;
 assert.match(objectGuide(s,8).detail,/USE|merge/i);
});

test('guidance does not mutate saved board or stages',()=>{
 for(const stage of [0,1,2,3,4]){const s=fresh();s.stage=stage;const before=JSON.stringify(s);objectiveGuide(s);for(let i=0;i<s.board.length;i++)objectGuide(s,i);assert.equal(JSON.stringify(s),before);}
});

test('both launch pages include main story labels and an expandable, accessible guide',()=>{
 for(const entry of ['index.html','crazygames.html']){
  const html=fs.readFileSync(new URL('../v5/'+entry,import.meta.url),'utf8');
  assert.match(html,/id="goalRecipe"/);
  assert.match(html,/id="guideButton"/);
  assert.match(html,/aria-expanded="false"/);
  assert.match(html,/id="guidePanel"[^>]*hidden/);
 }
 const app=fs.readFileSync(new URL('../v5/app.mjs',import.meta.url),'utf8');
 assert.match(app,/data-guide-family/);
 assert.match(app,/objectGuide\(state,selected\)/);
 assert.match(app,/boardRole echo/);
 assert.match(app,/boardRole stone/);
 assert.doesNotMatch(app,/1 LENS LEFT/);
});
