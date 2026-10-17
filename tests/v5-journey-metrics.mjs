// Deterministic policy observations, not human playtime or enjoyment measurements.
import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import path from 'node:path';
const root=path.resolve(process.argv[2]??'.');
const {fresh,act,load}=await import(pathToFileURL(path.join(root,'v5/core.mjs')));
const {choose}=await import(pathToFileURL(path.join(root,'tests/v5-policy.mjs')));
const {requestAction}=await import(pathToFileURL(path.join(root,'tests/v5-workshop-policy.mjs')));
const runs=[];
for(const style of ['expedition','exploration','contract','workshop'])for(const route of ['ridge','conduit'])for(const receiver of ['scope','relay']){
 const s=fresh(0),actions=[],milestones=[],discoveries=[],options={style:style==='workshop'?'expedition':style,route,receiver,findStrategy:style==='exploration'?'mixed':'restore',sideFirst:false,openCaches:true,vaultKit:route==='ridge'?'field':'survey'};
 let vault=null,lowest=36,minEnergy=120,boostPulls=0;
 for(let n=0;n<500;n++){
  let a;
  if(s.landingStep>=1&&(s.requests.completed<(style==='workshop'?10:style==='contract'?5:0)||style==='workshop'&&s.workshop.precision&&!s.workshop.fittings)){
   if(style==='workshop'&&!s.workshop.repaired&&s.requests.supplies>=8)a={type:'restoreWorkshop'};
   else if(style==='workshop'&&s.workshop.repaired&&!s.workshop.precision&&s.requests.supplies>=12)a={type:'upgradeWorkshop'};
   else {a=requestAction(s,s.requests.completed%3);if(s.energy<3)a={type:'ration'};}
  }else if(s.journey?.infusions){if(!s.journey.boost)break;a={type:s.charges[s.journey.boost.family]?'produce':'service',id:s.journey.boost.family};if(a.type==='produce')boostPulls++;}
  else if(s.stage===4&&!s.journey)break;
  else a=choose(s,options);
  assert.ok(a);const before=s.discovered.length,r=act(s,a,n*1000);assert.ok(r.ok,JSON.stringify({style,route,receiver,a,message:r.message}));
  actions.push({...a,stage:s.stage,occupied:s.board.filter(Boolean).length,energy:s.energy});lowest=Math.min(lowest,s.board.filter(Boolean).length);minEnergy=Math.min(minEnergy,s.energy);
  if(s.discovered.length>before)discoveries.push({action:n+1,items:s.discovered.slice(before)});
  if(['milestone','deployment','clear','restoration'].includes(r.event))milestones.push({action:n+1,type:a.type,stage:s.stage});
  if(!vault&&s.stage===4)vault={actions:n+1,merges:s.merges,pulls:{...s.taps},discoveries:s.discovered.length};
  if(n%5===0)Object.assign(s,load(JSON.stringify(s)));
 }
 assert.equal(s.stage,4);if(s.journey)assert.equal(s.journey.infusions,1);
 runs.push({style,route,receiver,vault,actions,discoveries,milestones,lowest,minEnergy,requests:s.requests.completed,workshop:s.workshop,enrichedPulls:boostPulls});
}
console.log(JSON.stringify({note:'Scripted choices are observed paths, not an exhaustive shortest-path search or measured human playtime.',runs},null,2));
