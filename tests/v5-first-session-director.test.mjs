import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,item} from '../v5/core.mjs';
import {firstSessionCue} from '../v5/first-session.mjs';
test('first actions lead from a real merge to the landing, without creating quest state',()=>{
 const s=fresh(0),old=JSON.stringify(s);
 assert.match(firstSessionCue(s).hint,/COPPER PAIR/);assert.equal(JSON.stringify(s),old);
 assert.ok(act(s,{type:'merge',from:7,to:8}).ok);assert.match(firstSessionCue(s).hint,/CLEAR PATH/);
 assert.ok(act(s,{type:'goal'}).ok);assert.equal(s.landingStep,1);
 assert.match(firstSessionCue(s).hint,/CAMP ORDER/);
});
test('earned fragments invite an attainable pair merge then return to expedition gear',()=>{
 const s=fresh(0);act(s,{type:'merge',from:7,to:8});act(s,{type:'goal'});
 s.camp.earlyFragments=1;assert.match(firstSessionCue(s).hint,/ONE MORE ORDER/);
 s.camp.earlyFragments=2;
 s.board[3]=item('chart',0,'tide');s.board[4]=item('chart',0,'tide');
 const before=JSON.stringify(s),cue=firstSessionCue(s);
 assert.deepEqual(cue.pairs,[3,4]);assert.equal(JSON.stringify(s),before);
 assert.ok(act(s,{type:'merge',from:3,to:4}).ok);
 assert.ok(s.discovered.includes('chart:tide:1'));
 assert.match(firstSessionCue(s).hint,/SIGHT LENS/);
});
test('crossing cue does not change saves or impose a new stage gate',()=>{
 const s=fresh(0);s.stage=1;const before=JSON.stringify(s);
 assert.match(firstSessionCue(s).hint,/CHOOSE ONE CROSSING/);
 assert.equal(JSON.stringify(s),before);
 s.stage=2;assert.equal(firstSessionCue(s),null);
});
