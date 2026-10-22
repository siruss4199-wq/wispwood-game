import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,load,item} from '../v5/core.mjs';
import {coastalObjective} from '../v5/coastal-journey.mjs';
import {expeditionGoal} from '../v5/core.mjs';
import {choose} from './v5-policy.mjs';
import {coastalAction} from './v5-coastal-policy.mjs';
const ok=(s,a)=>{const r=act(s,a,1);assert.ok(r.ok,JSON.stringify(a)+': '+r.message);return r;};
const rejectAtomic=(s,a)=>{const raw=JSON.stringify(s);assert.equal(act(s,a,1).ok,false);assert.equal(JSON.stringify(s),raw);};

test('the crossing survey waits for the order-funded Workshop, atomically',()=>{
 const s=fresh(1);ok(s,{type:'merge',from:7,to:8});ok(s,{type:'goal'});
 s.board[1]=item('rig',2);s.board[3]=item('chart',2);
 rejectAtomic(s,{type:'goal'});
 assert.equal(coastalObjective(s,expeditionGoal(s)).kind,'camp','the visible objective is camp work, not a goal button that fails');
 s.requests.supplies=8;ok(s,{type:'restoreWorkshop'});
 assert.equal(coastalObjective(s,expeditionGoal(s)).name,'Chart the safe crossing');
 ok(s,{type:'goal'});assert.equal(s.stage,1);
});

test('the vault expedition waits for the Supply Pier; a legacy pre-vault save keeps everything and can fund it',()=>{
 const old=fresh(1);old.stage=3;old.landingStep=2;old.routePrepared=true;old.craftMastery={rig:true,chart:true,flux:true};
 old.seals.navigation=old.seals.stabilization=old.seals.resonance=true;old.board[7]=item('rig',2);old.board[8]=item('chart',1);
 const s=load(JSON.stringify(old),1);assert.deepEqual(s.board,old.board);
 rejectAtomic(s,{type:'goal',kit:'field'});
 const g=coastalObjective(s,expeditionGoal(s));assert.equal(g.phase,'STAGE THE VAULT EXPEDITION');assert.equal(g.name,'Restore Coastal Workshop');
 s.requests.supplies=20;ok(s,{type:'restoreWorkshop'});
 assert.equal(coastalObjective(s,expeditionGoal(s)).name,'Build Supply Pier');
 ok(s,{type:'buildPier'});ok(s,{type:'goal',kit:'field'});assert.equal(s.stage,4);
});

test('story-first and objective-following players deliver real orders before the vault, without deadlock',()=>{
 for(const style of ['expedition','exploration']){
  const s=fresh(0),session={};let ordersAtCrossing=null;
  while(s.stage<4&&s.moves<300){const a=choose(s,{style,session,openCaches:true});ok(s,a);if(s.stage===1&&ordersAtCrossing===null)ordersAtCrossing=s.requests.completed;}
  assert.equal(s.stage,4);assert.ok(ordersAtCrossing>=1,'workshop funded by orders before the crossing');assert.ok(s.requests.completed>=4,style+' delivered '+s.requests.completed);
  assert.ok(s.camp.pier&&s.workshop.repaired);
 }
 let s=fresh(1);
 for(let n=1;s.stage<4&&n<300;n++){ok(s,coastalAction(s));if(n%11===0)s=load(JSON.stringify(s),1);}
 assert.equal(s.stage,4);assert.ok(s.camp.pier);
});
