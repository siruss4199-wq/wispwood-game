import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,item,expeditionGoal} from '../v5/core.mjs';
import {coastalObjective} from '../v5/coastal-journey.mjs';
const objective=s=>coastalObjective(s,expeditionGoal(s));
test('one opening objective connects deliveries, the compass and working camp',()=>{
 const s=fresh(1);s.landingStep=1;
 assert.equal(objective(s).action,'orders');
 s.camp.earlyFragments=2;s.board[1]=item('chart',0,'tide');s.board[3]=item('chart',0,'tide');
 assert.equal(objective(s).action,'treasure');
 s.discovered.push('chart:tide:1');
 assert.equal(objective(s).name,'Restore Coastal Workshop');
 s.workshop.repaired=true;
 assert.equal(objective(s).name,'Chart the safe crossing');
});
test('a ready breakthrough is never hidden behind optional deliveries',()=>{
 const s=fresh(1);s.landingStep=1;s.board[1]=item('rig',2);s.board[3]=item('chart',2);
 // The crossing is fitted in the restored Workshop, so it is not yet a ready breakthrough.
 assert.notEqual(objective(s).name,'Chart the safe crossing');
 s.workshop.repaired=true;
 assert.equal(objective(s).name,'Chart the safe crossing');
});
test('the Pearl connects the Vault engine to deep exploration without mutating saves',()=>{
 const s=fresh(1);s.stage=4;s.camp.loft=true;s.discovered.push('chart:tide:2');
 const before=JSON.stringify(s);assert.equal(objective(s).action,'restoreEngine');
 assert.equal(JSON.stringify(s),before);
 s.camp.deepSurvey=true;assert.notEqual(objective(s).action,'restoreEngine','existing deep exploration remains available');
});
