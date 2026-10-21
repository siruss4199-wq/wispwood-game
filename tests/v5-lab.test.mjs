import test from 'node:test';import assert from 'node:assert/strict';import {newGame,act,objective,ready,needIndices,direction,load,LAB_SAVE_KEY} from '../v5/lab/engine.mjs';
function solve(route){let s=newGame(),steps=0;const move=a=>{const r=act(s,a);assert.ok(r.ok,JSON.stringify({phase:s.phase,a,message:r.message}));s=r.state;assert.ok(++steps<350,'possible softlock')};
 move({type:'merge',from:14,to:15});
 while(s.phase<6){
  if(s.phase===4){move({type:'choose',route});continue;}
  if(ready(s)){move({type:'claim'});continue;}
  const needs=objective(s).needs,have=needIndices(s),missing=needs.find((n,i)=>have[i]<0)||needs[0];
  let merged=false;for(let tier=missing.tier-1;tier>=0&&!merged;tier--){
   const ix=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===missing.family&&x.tier===tier?[i]:[]);
   if(ix.length>=2){move({type:'merge',from:ix[0],to:ix[1]});merged=true;}
  }
  if(merged)continue;
  if(s.board.every(Boolean)){
   let cleared=false;for(const f of ['rig','chart','flux'])for(let t=0;t<3&&!cleared;t++){
    const ix=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===f&&x.tier===t?[i]:[]);
    if(ix.length>=2){move({type:'merge',from:ix[0],to:ix[1]});cleared=true}
   }
   if(!cleared){const i=s.board.findIndex(x=>x?.type==='item'&&x.family!==missing.family);assert.ok(i>=0);move({type:'recycle',index:i})}
  }else move({type:'produce',family:missing.family});
 }
 return {s,steps};
}
test('first action is an earned real merge; invalid moves do not mutate',()=>{const s=newGame(),raw=JSON.stringify(s);assert.equal(s.board.length,36);assert.deepEqual(direction(s).indices,[14,15]);assert.equal(act(s,{type:'merge',from:0,to:1}).ok,false);assert.equal(JSON.stringify(s),raw);const r=act(s,{type:'merge',from:14,to:15});assert.ok(r.ok);assert.equal(r.state.phase,1);assert.match(r.event.title,/foothold/i);});
test('both routes are fully playable through reducer and persist independently',()=>{for(const route of ['reef','cavern']){const {s,steps}=solve(route);assert.equal(s.phase,6);assert.equal(s.route,route);assert.ok(steps>=25);assert.ok(s.taps.rig&&s.taps.chart&&s.taps.flux);assert.deepEqual(load(JSON.stringify(s)),s)}});
test('lab never reads the V5 save slot',()=>{assert.equal(LAB_SAVE_KEY,'vaultwake-coastal-lab-v1');assert.notEqual(LAB_SAVE_KEY,'vaultwake-v5');assert.deepEqual(load('garbled'),newGame());});
test('locked producers, impossible merges and unsupported routes are rejected',()=>{const s=newGame();assert.equal(act(s,{type:'produce',family:'chart'}).ok,false);assert.equal(act(s,{type:'merge',from:14,to:0}).ok,false);assert.equal(act(s,{type:'choose',route:'reef'}).ok,false);assert.equal(act(s,{type:'produce',family:'rig'}).ok,true);});
