import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,ready,STAGES,item,load} from '../v5/core.mjs';
import {firstSessionCue} from '../v5/first-session.mjs';
test('one earned merge provides a clear first-landing path without requiring redundant tools',()=>{
 const s=fresh(0),original=JSON.stringify(s);
 assert.equal(STAGES[0].needs.length,1);assert.equal(STAGES[0].needs[0].count,1);
 assert.equal(ready(s,STAGES[0].needs),true,'existing material means the objective is feasible');
 assert.equal(JSON.stringify(s),original);
 assert.match(firstSessionCue(s).hint,/MERGE THE GLOWING/);
 const merged=act(s,{type:'merge',from:7,to:8},1);assert.equal(merged.ok,true);
 assert.match(firstSessionCue(s).hint,/CLEAR PATH/);
 const before=s.board.filter(x=>x?.type==='item'&&x.family==='rig'&&x.tier===1).length;
 assert.equal(act(s,{type:'goal'},2).ok,true);assert.equal(s.landingStep,1);
 assert.equal(s.board.filter(x=>x?.type==='item'&&x.family==='rig'&&x.tier===1).length,before-1);
 assert.equal(s.stage,0);assert.ok(s.board.some(x=>x?.type==='source'&&x.id==='chart'));
});
test('progressed legacy saves with one remaining tool can continue',()=>{
 const s=fresh(0);s.merges=4;s.board=s.board.map((x,i)=>x?.type==='item'&&x.family==='rig'&&x.tier===1&&i!==13?null:x);
 s.board[8]=item('rig',2);
 const fromSaved=load(JSON.stringify(s));assert.equal(act(fromSaved,{type:'goal'},1).ok,true);assert.equal(fromSaved.landingStep,1);
});
