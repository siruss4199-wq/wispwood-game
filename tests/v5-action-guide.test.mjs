import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,item,goal} from '../v5/core.mjs';
import {boardCoach} from '../v5/action-guide.mjs';

test('stone card has visual recipe and executable actions; no fake tile merging',()=>{
 const s=fresh(0),i=19;
 const old=JSON.stringify(s),p=boardCoach(s,i);
 assert.match(p.title,/CLEAR STONE/);
 assert.match(p.detail,/optional/i);
 assert.equal(p.icons.length,3);
 assert.equal(p.primary.kind,'show');
 assert.equal(p.primary.index,0);
 assert.equal(JSON.stringify(s),old,'reading guide never edits save');
 s.board[7]=item('rig',2);
 const ready=boardCoach(s,i);
 assert.equal(ready.primary.kind,'clear');
 const res=act(s,{type:ready.primary.kind,index:ready.primary.index});
 assert.equal(res.ok,true);
 assert.notEqual(s.board[i]?.type,'rock');
});

test('buried ground is a story lock: opening a route or Relic Finder, not stone action',()=>{
 const s=fresh(0),i=25;
 const initial=boardCoach(s,i);
 assert.match(initial.title,/BURIED GROUND/);
 assert.match(initial.detail,/NOT a rock/i);
 assert.equal(initial.primary.kind,'show');
 assert.notEqual(initial.primary.kind,'clear');
 s.stage=2;
 const finder=boardCoach(s,i);
 assert.match(finder.detail,/Relic Finder/);
 assert.match(finder.detail,/two buried spaces/i);
 assert.equal(finder.primary.kind,'show');
 const tool=item('chart',3);
 s.board[7]=tool;
 const use=boardCoach(s,i);
 assert.equal(use.primary.kind,'deploy');
 const before=s.board.filter(x=>x?.type==='sealed').length;
 assert.equal(act(s,{type:'deploy',index:use.primary.index}).ok,true);
 assert.equal(s.board.filter(x=>x?.type==='sealed').length,before-2);
 s.stage=3;
 const remaining=s.board.findIndex(x=>x?.type==='sealed');
 assert.ok(remaining>=0);
 const later=boardCoach(s,remaining);
 assert.match(later.detail,/Tideglass Vault/);
 assert.notEqual(later.primary.kind,'clear');
});

test('echo asks for Sight Lens, decodes only if held and is optional',()=>{
 const s=fresh(0);s.board[7]={type:'glyph'};
 let plan=boardCoach(s,7);
 assert.match(plan.title,/ECHO FRAGMENT/);
 assert.equal(plan.primary.kind,'show');
 assert.match(plan.detail,/Skip it/);
 s.board[8]=item('chart',2);
 plan=boardCoach(s,7);
 assert.equal(plan.primary.kind,'decode');
 assert.equal(act(s,{type:'discovery'}).ok,true);
 assert.equal(s.discoveryDone,true);
});

test('matching twins are highlighted, preserving manual decision',()=>{
 const s=fresh();
 const a=boardCoach(s,7);
 assert.equal(a.primary.kind,'match');
 assert.equal(a.primary.from,7);
 assert.equal(a.primary.index,8);
 assert.equal(a.from,7);assert.equal(a.to,8);
 assert.equal(a.icons.length,3);
});

test('main-story guide changes by stage and uses actual missing producer',()=>{
 const s=fresh();
 assert.match(boardCoach(s).title,/NEXT MOVE/);
 assert.equal(boardCoach(s).primary.index,0);
 assert.equal(act(s,{type:'merge',from:7,to:8}).ok,true);
 assert.equal(act(s,{type:'goal'}).ok,true);
 assert.equal(s.landingStep,1);
 assert.match(boardCoach(s).detail,/MAIN STORY/);
 s.stage=1;
 assert.match(boardCoach(s).title,/CHOOSE ONE BREACH/);
 s.stage=2;
 assert.match(boardCoach(s).title,/ACTIVATE 2 DEVICES/);
 s.stage=3;
 assert.match(boardCoach(s).detail,/MAIN STORY/);
});

test('guide is pure for stage snapshots and all board types',()=>{
 for(const stage of [0,1,2,3,4]){
  const s=fresh();s.stage=stage;const before=JSON.stringify(s);
  boardCoach(s);
  for(let i=0;i<36;i++)boardCoach(s,i);
  assert.equal(JSON.stringify(s),before);
 }
});
