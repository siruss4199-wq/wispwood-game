import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,load} from '../v5/core.mjs';
import {coastalAction} from './v5-coastal-policy.mjs';
for(const specialty of ['rig','chart','flux'])test('fresh guided coast → fleet with '+specialty+' specialty',()=>{
 let s=fresh(1);const milestones=[],maxCraft={rig:0,chart:0,flux:0};
 for(let n=0;!s.discovered.includes('chart:tide:4')&&n<900;n++){
  const a=coastalAction(s,{specialty,route:specialty==='flux'?'conduit':'ridge',receiver:specialty==='chart'?'relay':'scope'});
  const before={stage:s.stage,workshop:s.workshop.repaired,pier:s.camp.pier,loft:s.camp.loft,deep:s.camp.deepSurvey};
  const r=act(s,a,n+2);assert.ok(r.ok,JSON.stringify({a,message:r.message,stage:s.stage}));
  if(a.type==='merge'&&!s.board[a.to]?.line)maxCraft[s.board[a.to].family]=Math.max(maxCraft[s.board[a.to].family],s.board[a.to].tier);
  if(before.stage!==s.stage||before.workshop!==s.workshop.repaired||before.pier!==s.camp.pier||before.loft!==s.camp.loft||before.deep!==s.camp.deepSurvey)milestones.push({action:s.moves,type:a.type,stage:s.stage});
  if(n%17===0){const saved=JSON.stringify(s);s=load(saved,n+2);assert.equal(JSON.stringify(s),saved);}
 }
 assert.equal(s.stage,4);assert.equal(s.camp.deepSurvey,true);assert.ok(s.discovered.includes('chart:tide:4'));
 assert.equal(s.journey.instrument,specialty);assert.ok(Object.values(maxCraft).every(t=>t>=2));assert.ok(maxCraft[specialty]>=4);
 assert.ok(act(s,{type:'viewFleet'}).ok);assert.equal(load(JSON.stringify(s)).camp.fleetViewed,true);
 console.log('COASTAL_METRICS '+JSON.stringify({specialty,actions:s.moves,merges:s.merges,orders:s.requests.completed,rations:s.rations,maxCraft,milestones}));
});
