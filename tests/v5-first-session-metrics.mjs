// Scripted first-session timeline: follows the *visible* objective from a fresh
// save and records every objective change. Simulation only — not human playtime.
// usage: node tests/v5-first-session-metrics.mjs [repoRoot] [--trace]
import {pathToFileURL} from 'node:url';import path from 'node:path';
const args=process.argv.slice(2),root=path.resolve(args.find(a=>!a.startsWith('--'))??'.');
const imp=p=>import(pathToFileURL(path.join(root,p)));
const {fresh,act,load,expeditionGoal}=await imp('v5/core.mjs');
const {coastalObjective}=await imp('v5/coastal-journey.mjs');
const {coastalAction}=await imp('tests/v5-coastal-policy.mjs');
const runs=[];
for(const [specialty,route,receiver] of [['rig','ridge','scope'],['chart','ridge','relay'],['flux','conduit','scope']]){
 let s=fresh(1);const timeline=[],counts={produce:{rig:0,chart:0,flux:0},merges:0,orders:0,services:0,rations:0,crates:0,recycles:0};
 let last=null,minEnergy=s.energy,maxOcc=0,minOcc=36,error=null;
 const note=n=>{const g=coastalObjective(s,expeditionGoal(s));const name=g?.name??'(none)';if(name!==last){timeline.push({action:n,objective:name,stage:s.stage,landing:s.landingStep,occupied:s.board.filter(Boolean).length,energy:s.energy,supplies:s.requests.supplies,pulls:{...counts.produce},merges:counts.merges,orders:counts.orders});last=name;}};
 note(0);
 for(let n=1;n<=600&&!s.discovered.includes('chart:tide:4');n++){
  let a;try{a=coastalAction(s,{specialty,route,receiver});}catch(e){error=e.message;break;}
  const r=act(s,a,n+1);if(!r.ok){error=JSON.stringify({a,message:r.message,stage:s.stage});break;}
  if(a.type==='produce')counts.produce[a.id]++;if(a.type==='merge'&&r.event!=='move')counts.merges++;if(a.type==='request')counts.orders++;
  if(a.type==='service')counts.services++;if(a.type==='ration')counts.rations++;if(a.type==='crate')counts.crates++;if(a.type==='recycle')counts.recycles++;
  const occ=s.board.filter(Boolean).length;maxOcc=Math.max(maxOcc,occ);minOcc=Math.min(minOcc,occ);minEnergy=Math.min(minEnergy,s.energy);
  if(n%13===0)s=load(JSON.stringify(s),n+1);
  note(n);
 }
 runs.push({specialty,route,receiver,actions:s.moves,finished:s.discovered.includes('chart:tide:4'),error,counts,minEnergy,occupied:{min:minOcc,max:maxOcc},timeline});
}
if(args.includes('--trace'))console.log(JSON.stringify(runs,null,1));
else for(const r of runs){
 console.log(`\n== ${r.specialty}/${r.route}/${r.receiver}: ${r.actions} actions, finished=${r.finished}${r.error?' ERROR '+r.error:''}`);
 console.log(`   pulls ${JSON.stringify(r.counts.produce)} merges ${r.counts.merges} orders ${r.counts.orders} services ${r.counts.services} crates ${r.counts.crates} recycles ${r.counts.recycles} minEnergy ${r.minEnergy} occupied ${r.occupied.min}-${r.occupied.max}`);
 for(const t of r.timeline)console.log(`   @${String(t.action).padStart(3)} s${t.stage}/${t.landing} occ ${t.occupied} E ${t.energy} ◆${t.supplies} pulls ${t.pulls.rig}/${t.pulls.chart}/${t.pulls.flux} m${t.merges} o${t.orders}  ${t.objective}`);
}
