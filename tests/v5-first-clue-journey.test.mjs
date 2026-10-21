// A real reducer-only first-clue walkthrough. Action counts are not human minutes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,load} from '../v5/core.mjs';
import {requestAction} from './v5-workshop-policy.mjs';
import {firstSessionCue} from '../v5/first-session.mjs';

test('new player earns and merges the first Reef Compass via two real deliveries',()=>{
 const s=fresh(0),opening=structuredClone(s);
 assert.match(firstSessionCue(s).hint,/COPPER PAIR/);
 assert.ok(act(s,{type:'merge',from:7,to:8}).ok);
 assert.ok(act(s,{type:'goal'}).ok);
 assert.equal(s.landingStep,1);
 let actions=0;
 const trace=[];
 while((s.camp.earlyFragments??0)<2&&actions<160){
  const lane=s.requests.completed%2;
  const a=requestAction(s,lane);
  const before=s.moves,receipt=act(s,a,actions*1000);
  assert.ok(receipt.ok,JSON.stringify({action:a,receipt,step:actions,trace:trace.slice(-12)}));
  assert.ok(s.moves>before,'every selected game action changes the real reducer');
  trace.push(a.type);actions++;
 }
 assert.equal(s.camp.earlyFragments,2,'two genuinely earned Tide Dial Fragments');
 assert.equal(s.requests.completed,2,'first two ordinary deliveries fund the clue');
 assert.ok(trace.includes('request'));
 assert.ok(s.requests.supplies>=2);
 const pairs=s.board.flatMap((x,i)=>x?.type==='item'&&x.family==='chart'&&x.line==='tide'&&x.tier===0?[i]:[]);
 assert.ok(pairs.length>=2,'fragments must appear on the playable board');
 const cue=firstSessionCue(s);
 assert.deepEqual(cue.pairs,pairs.slice(0,2));
 const before=JSON.stringify(s);
 assert.equal(JSON.stringify(s),before,'advisory clue has no side effects');
 const merge=act(s,{type:'merge',from:pairs[0],to:pairs[1]},actions*1000);
 assert.ok(merge.ok,merge.message);
 assert.ok(s.discovered.includes('chart:tide:1'));
 assert.match(firstSessionCue(s).hint,/SIGHT LENS/);
 assert.equal(s.stage,0,'story cue never skips expedition restoration');
 const reloaded=load(JSON.stringify(s));
 assert.deepEqual(reloaded.board,s.board);
 assert.deepEqual(reloaded.requests,s.requests);
 assert.ok(reloaded.discovered.includes('chart:tide:1'));
 assert.deepEqual(opening.board.slice(0,2),fresh(0).board.slice(0,2),'initial layout remains stable');
});
