import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,item,load} from '../v5/core.mjs';
import {surveyFinds} from '../v5/expedition.mjs';
import {useAction} from '../v5/interactions.mjs';
import {deliveryItems} from '../v5/presentation.mjs';
import {choose} from './v5-policy.mjs';
const prepared=()=>{const s=fresh(0);s.stage=2;s.landingStep=2;s.routePrepared=true;s.expedition.route='conduit';surveyFinds(s);s.board[1]=item('rig',2);s.board[3]=item('flux',2);return s;};
test('one surveyed find has two materially different outcomes and exact costs',()=>{
 const recovered=prepared(),restored=structuredClone(recovered);
 const a=useAction(recovered,1,19),b=useAction(restored,3,19);
 assert.equal(a.type,'clear');assert.equal(b.type,'restore');
 assert.deepEqual(deliveryItems(restored,b).map(x=>x.index),[3]);
 assert.ok(act(recovered,a,0).ok);assert.ok(act(restored,b,0).ok);
 assert.deepEqual(recovered.board[19],item('rig',3));assert.equal(recovered.board[20].phase,'idle');
 assert.deepEqual(recovered.board[3],item('flux',2));assert.deepEqual(restored.board[1],item('rig',2));
 assert.equal(restored.board[20].phase,'done');assert.equal(restored.board[19],null);
 assert.ok(restored.board.filter(x=>x?.family==='chart').length>recovered.board.filter(x=>x?.family==='chart').length);
 assert.equal(restored.board[32].find,'scope','working machinery never silently destroys another surveyed choice');
 assert.equal(recovered.expedition.log.at(-1).choice,'recover');assert.ok(restored.expedition.log.some(x=>x.choice==='restore'));
});
test('recovered gear can be kept for a merge instead of spent on the site',()=>{
 const s=prepared();act(s,{type:'clear',from:1,index:19},0);s.board[4]=item('rig',3);
 assert.ok(act(s,{type:'merge',from:4,to:19},0).ok);assert.equal(s.board[19].tier,4);assert.equal(s.board[20].phase,'idle');
});
test('restoration refuses unknown, locked, complete and wrong-tool targets atomically',()=>{
 for(const mutate of [s=>{s.stage=1},s=>{delete s.board[19].find},s=>{s.board[20].phase='done';s.board[20].progress=2},s=>{s.board[3]=item('rig',2)}]){
  const s=prepared();mutate(s);const before=JSON.stringify(s);
  assert.equal(act(s,{type:'restore',from:3,index:19},0).ok,false);assert.equal(JSON.stringify(s),before);assert.equal(useAction(s,3,19)?.type==='restore',false);
 }
});
test('surveyed finds and resolved choices survive reload without replacing old inventory',()=>{
 const s=prepared();act(s,{type:'restore',from:3,index:19},0);
 const loaded=load(JSON.stringify(s),0);assert.deepEqual(loaded,s);assert.deepEqual(load(JSON.stringify(loaded),0),loaded);
 const legacy=fresh(0);legacy.stage=2;legacy.landingStep=2;legacy.routePrepared=true;legacy.expedition.route='ridge';
 assert.deepEqual(load(JSON.stringify(legacy),0).board,legacy.board);
});
test('recover, restore and mixed expeditions all finish without extra tiers or a deadlock',()=>{
 const paths=[];
 for(const findStrategy of ['recover','restore','mixed']){
  const s=fresh(0),session={},actions=[];let min=27;
  while(s.stage<4&&s.moves<250){const a=choose(s,{findStrategy,style:'exploration',session,openCaches:true});assert.ok(a);const r=act(s,a,0);assert.ok(r.ok,JSON.stringify({a,r}));actions.push(a.type);min=Math.min(min,s.board.filter(Boolean).length);}
  assert.equal(s.stage,4);assert.equal(s.discoveryDone,true);assert.equal(s.expedition.log.filter(x=>x.type==='deployment').length,2);
  const choices=s.expedition.log.filter(x=>x.type==='find-choice').map(x=>x.choice);assert.equal(choices.length,2);
  assert.deepEqual(choices,findStrategy==='mixed'?['recover','restore']:[findStrategy,findStrategy]);
  assert.ok(min>=17);assert.ok(s.discovered.length<18);paths.push(actions.join(','));
  console.log(JSON.stringify({findStrategy,moves:s.moves,merges:s.merges,taps:s.taps,minimumOccupancy:min,choices,discovered:s.discovered.length}));
 }
 assert.equal(new Set(paths).size,3);
});
