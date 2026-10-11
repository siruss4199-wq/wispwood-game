import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,load,item,goal,normalContract,ready} from '../v5/core.mjs';
import {ANCHORS,anchors,completedAnchors,equipment} from '../v5/expedition.mjs';
import {deliveryItems} from '../v5/presentation.mjs';
import {choose} from './v5-policy.mjs';
const ok=(s,a)=>{const r=act(s,a);assert.ok(r.ok,r.message);return r;};
const reject=(s,a)=>{const before=JSON.stringify(s);assert.equal(act(s,a).ok,false);assert.equal(JSON.stringify(s),before);};
const siteIndex=(s,kind)=>s.board.findIndex(x=>x?.type==='site'&&x.kind===kind);
test('breaches are exclusive, consume the dragged equipment, expose different board problems and an early clue',()=>{
 const results=[];
 for(const [id,family] of [['ridge','rig'],['conduit','chart']]){
  const s=fresh();s.stage=1;s.board[7]=item(family,2);s.board[8]=item(family,2);
  const index=s.board.findIndex(x=>x?.type==='route'&&x.id===id),a={type:'breach',index,from:8};
  assert.deepEqual(deliveryItems(s,a).map(x=>x.index),[8]);ok(s,a);
  assert.equal(s.board[8],null);assert.equal(s.board[7].tier,2);assert.equal(s.stage,2);assert.equal(s.discovery,true);
  assert.ok(s.board.some(x=>x?.type==='glyph'));reject(s,{type:'breach',index:s.board.findIndex(x=>x?.type==='route')});
  results.push(s.board);
 }
 assert.notDeepEqual(results[0],results[1]);
});
test('installation spends mergeable equipment; only partner-family T3+ merges operate it and preserve the merged object',()=>{
 for(const kind of Object.keys(ANCHORS)){
  const s=fresh();s.stage=2;const i=siteIndex(s,kind),a=ANCHORS[kind];
  s.board[7]=item(a.equipment,3);s.board[8]=item(a.equipment,3);
  assert.deepEqual(deliveryItems(s,{type:'deploy',index:i,from:8}).map(x=>x.index),[8]);
  ok(s,{type:'deploy',index:i,from:8});assert.equal(s.board[7].tier,3,'kept twin can no longer merge upward');assert.equal(s.board[i].phase,'active');
  reject(s,{type:'deploy',index:i});
  s.board[9]=item(a.drive,0);s.board[10]=item(a.drive,0);ok(s,{type:'merge',from:9,to:10});assert.equal(s.board[i].progress,0);
  s.charges.rig=0;s.charges.chart=0;
  for(let n=0;n<2;n++){s.board[9]=item(a.drive,1);s.board[10]=item(a.drive,1);ok(s,{type:'merge',from:9,to:10});assert.equal(s.board[10].tier,2);assert.equal(s.board[i].progress,n+1);}
  assert.equal(s.board[i].phase,'done');assert.equal(s.stage,2,'one anchor alone is insufficient');
  if(kind==='relay'){assert.equal(s.charges.rig,6);assert.equal(s.charges.chart,6);assert.equal(s.surge,3);}
  if(kind==='winch')assert.equal(s.board.some(x=>x?.type==='rock'),false);
  if(kind==='scope')assert.ok(s.board.some(x=>x?.family==='flux'&&x.tier===2));
 }
});
test('all three anchor pairs can power the vault; the third remains optional',()=>{
 for(const skip of Object.keys(ANCHORS)){
  const s=fresh();s.stage=2;
  for(const kind of Object.keys(ANCHORS).filter(k=>k!==skip)){
   const i=siteIndex(s,kind);s.board[7]=item(ANCHORS[kind].equipment,3);ok(s,{type:'deploy',index:i,from:7});
   for(let n=0;n<2;n++){s.board[7]=item(ANCHORS[kind].drive,1);s.board[8]=item(ANCHORS[kind].drive,1);ok(s,{type:'merge',from:7,to:8});}
  }
  assert.equal(s.stage,3);assert.equal(completedAnchors(s),2);assert.equal(s.board[siteIndex(s,skip)].phase,'idle');
 }
});
test('a rare fragment has mutually exclusive decoding and operating consequences',()=>{
 const base=fresh();base.stage=2;base.board[7]=item('rig',3);ok(base,{type:'deploy',index:20,from:7});base.board[7]={type:'glyph'};base.board[8]=item('chart',2);
 const decode=structuredClone(base),feed=structuredClone(base);ok(decode,{type:'discovery'});ok(feed,{type:'feed',index:20,from:7});
 assert.equal(decode.boost,true);assert.equal(decode.board[20].progress,0);assert.equal(feed.boost,false);assert.equal(feed.board[20].progress,1);assert.equal(feed.board[8].tier,2);
 assert.equal(feed.board.filter(x=>x?.family==='rig'&&x.tier===3).length,1,'imprinting returns the original winch instead of a generic material drop');
 assert.equal(decode.board.some(x=>x?.family==='rig'&&x.tier===3),false,'permanent production enrichment keeps the equipment committed');
 reject(feed,{type:'discovery'});assert.equal(feed.expedition.log.at(-2).decodeAvailable,true);
});
test('imprinting returns equipment once, survives reload, and never loses it on a full board',()=>{
 const s=fresh();s.stage=2;s.board[7]=item('chart',3);ok(s,{type:'deploy',index:23,from:7});
 s.board=s.board.map(x=>x??item('rig',0));s.board[7]={type:'glyph'};ok(s,{type:'feed',index:23,from:7});
 assert.equal(s.board[7].family,'chart');assert.equal(s.board[7].tier,3);assert.equal(s.board[23].progress,1);
 const saved=load(JSON.stringify(s));assert.equal(saved.board[23].reclaimed,true);saved.board[8]={type:'glyph'};ok(saved,{type:'feed',index:23,from:8});
 assert.equal(saved.board.filter(x=>x?.family==='chart'&&x.tier===3).length,1);assert.equal(saved.board[23].phase,'done');reject(saved,{type:'feed',index:23});
});
test('equipment trades change installable anchors, are finite, and return their item even on a full board',()=>{
 const s=fresh();s.stage=2;s.board=s.board.map(x=>x??item('rig',0));s.board[7]=item('rig',3);
 const before=normalContract(s);assert.equal(ready(s,[equipment('winch')]),true);ok(s,{type:'contract'});
 assert.equal(ready(s,[equipment('winch')]),false);assert.equal(ready(s,[equipment('scope')]),true);assert.equal(s.board[7].family,before.exchange.family);
 for(const f of ['chart','flux']){s.board[7]=item(f,3);ok(s,{type:'contract'});}
 assert.equal(s.expedition.trades,3);assert.equal(normalContract(s).exchange,undefined);
});
test('old mission saves retain inventory and stage; in-progress anchors survive reload; apex merging is not locked',()=>{
 for(const stage of [0,1,2,3,4]){
  const s=fresh();s.stage=stage;delete s.expedition;s.mission={surveyed:true};
  s.board=s.board.map(x=>x?.type==='site'?{type:'rock'}:x?.type==='route'?{type:'sealed'}:x);
  const kept=s.board.filter(x=>x?.type==='item');const saved=load(JSON.stringify(s));
  assert.equal(saved.stage,stage);assert.deepEqual(saved.board.filter(x=>x?.type==='item'),kept);assert.equal(anchors(saved).length,3);
  if(stage===1)assert.equal(saved.board.filter(x=>x?.type==='route').length,2);
 }
 const s=fresh();s.stage=2;s.board[7]=item('rig',3);ok(s,{type:'deploy',index:20});assert.deepEqual(load(JSON.stringify(s)),s);
 s.board[7]=item('chart',5);s.board[8]=item('chart',5);ok(s,{type:'merge',from:7,to:8});assert.equal(s.board[8].tier,6);
});
test('discovery regression: policy rebuilds a consumed lens rather than silently abandoning decoding',()=>{
 const s=fresh();s.stage=2;s.discovery=true;s.board[7]={type:'glyph'};s.board=s.board.map(x=>x?.family==='chart'?null:x);
 for(let n=0;n<50&&!s.discoveryDone;n++)ok(s,choose(s,{sideFirst:false,openCaches:true}));
 assert.equal(s.discoveryDone,true,'discoveryDone remains required, even with no surviving survey material');
});
test('four intent-based styles produce different deployments, actual cross-family operations and optional diversions',()=>{
 const runs=[];
 for(const style of ['expedition','contract','exploration','aggressive']){
  const s=fresh(0),session={},timeline=[];let run=0,maxRun=0;
  while(s.stage<4&&s.moves<300){const a=choose(s,{style,session,openCaches:true});const result=ok(s,a);run=a.type==='produce'?run+1:0;maxRun=Math.max(maxRun,run);timeline.push({action:a.type,stage:s.stage,occupied:s.board.filter(Boolean).length,event:result.event});}
  assert.equal(s.stage,4,'no blocker deadlock');assert.ok(maxRun<=3,'no long producer-only sequence');
  const log=s.expedition.log,deployments=log.filter(x=>x.type==='deployment'),operations=log.filter(x=>x.type==='operation');
  assert.equal(deployments.length,2);assert.equal(operations.length,4);
  for(const op of operations.filter(x=>x.via!=='fragment'))assert.equal(op.via,ANCHORS[op.kind].drive);
  assert.ok(new Set(timeline.map(x=>x.stage)).size>=4);assert.ok(s.discovered.length<18,'upper collection remains naturally aspirational');
  assert.ok(Math.min(...timeline.map(x=>x.occupied))>=18,'workspace remains active');
  assert.ok(session.signal&&timeline.some(x=>x.action==='opportunity'));
  if(style!=='exploration')assert.equal(s.discoveryDone,true,'no accidental discovery omission');
  else {assert.equal(log.filter(x=>x.type==='fragment-spent').length,1);assert.ok(log.some(x=>x.type==='brace-clear'));}
  if(style==='contract')assert.equal(log.filter(x=>x.type==='exchange').length,2);
  if(style==='aggressive')assert.ok(log.some(x=>x.type==='kept-for-merge'));
  runs.push({style,actions:s.moves,route:s.expedition.route,deployments:deployments.map(x=>x.kind),operations,diversions:log.filter(x=>['exchange','fragment-spent','brace-clear','decoded','kept-for-merge'].includes(x.type)),maxRun,discovered:s.discovered});
 }
 assert.equal(new Set(runs.map(x=>JSON.stringify([x.route,x.deployments,x.diversions.map(x=>x.type)]))).size,4);
 console.log(JSON.stringify({expeditionStyles:runs}));
});
