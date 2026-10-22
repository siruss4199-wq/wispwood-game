import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {fresh,act,load,item,goal,normalContract,ready} from '../v5/core.mjs';
import {ANCHORS,anchors,completedAnchors,equipment} from '../v5/expedition.mjs';
import {deliveryItems} from '../v5/presentation.mjs';import {choose} from './v5-policy.mjs';
import {prepareRoute} from './v5-navigation-policy.mjs';
const ok=(s,a)=>{const r=act(s,a);assert.ok(r.ok,r.message);return r;};
const reject=(s,a)=>{const before=JSON.stringify(s);assert.equal(act(s,a).ok,false);assert.equal(JSON.stringify(s),before);};
const siteIndex=(s,kind)=>s.board.findIndex(x=>x?.type==='site'&&x.kind===kind);
test('one item use immediately changes the site and yields another family, with no maintenance',()=>{
 for(const kind of Object.keys(ANCHORS)){
  const s=fresh();s.stage=2;s.charges={rig:0,chart:1,flux:2};s.board[7]=item(ANCHORS[kind].equipment,3);
  const i=siteIndex(s,kind),before=s.board.map(x=>x?structuredClone(x):null),a={type:'deploy',index:i,from:7},crusts=()=>s.board.filter(x=>x?.type==='crust').length,crustsBefore=crusts();
  assert.deepEqual(deliveryItems(s,a).map(x=>x.index),[7]);const result=ok(s,a);
  assert.equal(s.board[i].phase,'done');assert.equal(completedAnchors(s),1);assert.equal(s.stage,2);
  // The relay powers sources (capability); finder and lift reveal parts of another family.
  if(kind!=='relay'){assert.ok(result.reveal.length>0);assert.ok(result.reveal.some(i=>s.board[i]?.family===ANCHORS[kind].drive||s.board[i]?.family==='flux'));}
  if(kind==='winch'){assert.equal(s.board.filter(x=>x?.type==='rock').length,0);assert.equal(result.opened.length,2);}
  // Before the Vault: raw Resonance shards plus three rich pulls, never a finished part or packed case.
  // Lift and finder each crack two salt-crusted parts free (older saves: open two buried cells).
  if(kind!=='relay')assert.equal(result.opened.length+crustsBefore-crusts(),kind==='winch'?4:2);
  if(kind==='scope'){assert.equal(s.board.some(x=>x?.type==='crate'&&x.kind==='relic'),false);assert.equal(s.surge,3);}
  if(kind==='relay'){assert.deepEqual(s.charges,{rig:7,chart:7,flux:7});assert.equal(s.surge,3);}
  assert.notDeepEqual(s.board,before);reject(s,a);reject(s,{type:'feed',index:i});
 }
});
test('device pairs retain unused choice but cannot skip the resonance connection',()=>{
 for(const skip of Object.keys(ANCHORS)){const s=fresh();s.stage=2;
  for(const kind of Object.keys(ANCHORS).filter(k=>k!==skip)){s.board[7]=item(ANCHORS[kind].equipment,3);ok(s,{type:'deploy',index:siteIndex(s,kind),from:7});}
  assert.equal(s.stage,2);assert.equal(s.seals.resonance,false);reject(s,{type:'goal'});assert.equal(completedAnchors(s),2);assert.equal(s.board[siteIndex(s,skip)].phase,'idle');
 }
});
test('use versus merge versus optional delivery consumes the same valuable equipment',()=>{
 const base=fresh();base.stage=2;base.board[7]=item('rig',3);base.board[8]=item('rig',3);
 const used=structuredClone(base),merged=structuredClone(base),delivered=structuredClone(base);
 ok(used,{type:'deploy',index:20,from:7});assert.equal(used.board[8].tier,3);assert.equal(used.expedition.log[0].mergeAvailable,true);
 ok(merged,{type:'merge',from:7,to:8});assert.equal(merged.board[8].tier,4);assert.equal(merged.board[20].phase,'idle');
 ok(delivered,{type:'contract'});assert.ok(delivered.board.some(x=>x?.family==='chart'&&x.tier===3));assert.equal(delivered.board[20].phase,'idle');
});
test('routes remain exclusive, with exact-item collection and different accessible resources',()=>{
 const goals=[];
 for(const [id,family] of [['ridge','rig'],['conduit','chart']]){const s=fresh();s.stage=1;s.routePrepared=true;s.board[3]=item('chart',2);s.board[7]=item(family,2);s.board[8]=item(family,2);prepareRoute(s,id);
  const index=s.board.findIndex(x=>x?.type==='route'&&x.id===id),a={type:'breach',index,from:8};assert.deepEqual(deliveryItems(s,a).map(x=>x.index),[8]);ok(s,a);assert.equal(s.board[8],null);assert.equal(s.stage,2);
  reject(s,{type:'breach',index:s.board.findIndex(x=>x?.type==='route')});assert.equal(s.seals.navigation,true);goals.push(s.board.slice(24,30));
 }assert.notDeepEqual(goals[0],goals[1]);
});
test('stone clearing is a single use; old trail braces still work',()=>{
 for(const tool of [item('rig',2),{type:'brace'}]){const s=fresh();s.board[7]=tool;const r=ok(s,{type:'clear',index:19});assert.equal(r.event,'clear');assert.equal(s.board.some(x=>x?.type==='brace'),false);assert.ok(r.reveal.length>0);}
});
test('legacy installed equipment becomes immediately usable without paying twice or losing inventory',()=>{
 const s=fresh();s.stage=2;s.expedition.version=1;s.board[20]={type:'site',kind:'winch',phase:'active',progress:1,reclaimed:true};
 const kept=s.board.filter(x=>x?.type==='item').map(x=>JSON.stringify(x));const migrated=load(JSON.stringify(s));assert.equal(migrated.expedition.version,2);assert.equal(migrated.board[20].phase,'done');
 for(const x of kept)assert.ok(migrated.board.some(y=>JSON.stringify(y)===x));assert.equal(migrated.board.some(x=>x?.type==='rock'),false);
 const again=load(JSON.stringify(migrated));assert.deepEqual(again,migrated,'migration rewards only once');
});
test('discovery policy rebuilds a missing lens rather than abandoning the optional find',()=>{
 const s=fresh();s.stage=2;s.discovery=true;s.board[7]={type:'glyph'};s.board=s.board.map(x=>x?.family==='chart'?null:x);
 for(let n=0;n<50&&!s.discoveryDone;n++)ok(s,choose(s,{sideFirst:false,openCaches:true}));
 assert.equal(s.discoveryDone,true);
});
test('four play styles complete with actual board consequences, varied choices, density and collection headroom',()=>{
 const paths=[];
 for(const style of ['expedition','contract','exploration','aggressive']){
  const s=fresh(0),session={},timeline=[];let run=0,maxRun=0;
  while(s.stage<4&&s.moves<300){const a=choose(s,{style,session,openCaches:true}),r=ok(s,a);run=a.type==='produce'?run+1:0;maxRun=Math.max(maxRun,run);timeline.push({action:a.type,stage:s.stage,occupied:s.board.filter(Boolean).length,event:r.event});}
  assert.equal(s.stage,4);assert.equal(s.discoveryDone,true);assert.ok(s.discovered.length<18);assert.ok(maxRun<=3);
  assert.equal(s.expedition.log.filter(x=>x.type==='deployment').length,2);assert.equal(s.expedition.log.filter(x=>x.type==='device-used').length,2);assert.equal(s.expedition.log.some(x=>x.type==='operation'||x.type==='fragment-spent'),false);
  assert.ok(Math.min(...timeline.map(x=>x.occupied))>=17);let sparse=0;for(const x of timeline){sparse=x.occupied<18?sparse+1:0;assert.ok(sparse<=2,'no prolonged sparse board');}assert.ok(new Set(timeline.map(x=>x.stage)).size>=4);assert.ok(timeline.some(x=>x.action==='opportunity'));
  if(style==='contract'){assert.equal(s.expedition.trades,1);assert.equal(s.expedition.vaultTrade,true);assert.equal(s.expedition.log.filter(x=>x.type==='vault-diversion').length,1);}else assert.ok(!s.expedition.vaultTrade);if(style==='exploration')assert.ok(s.expedition.log.some(x=>x.type==='brace-clear'));
  paths.push([style,s.moves,s.expedition.route,s.expedition.log.filter(x=>['deployment','exchange','brace-clear','kept-for-merge'].includes(x.type))]);
 }assert.equal(new Set(paths.map(x=>JSON.stringify(x.slice(2)))).size,4);console.log(JSON.stringify({simplifiedSessions:paths}));
});
test('mission belongs to the scene and obsolete expedition verbs are absent from player prompts',()=>{
 for(const file of ['index.html','crazygames.html']){const html=fs.readFileSync(new URL('../v5/'+file,import.meta.url),'utf8');assert.match(html,/mission.css/);assert.ok(html.indexOf('class="objective"')<html.indexOf('</section>\n</section>'));assert.match(html,/Optional reward/);}
 const core=fs.readFileSync(new URL('../v5/core.mjs',import.meta.url),'utf8');assert.doesNotMatch(goal({...fresh(),stage:2}).text,/install|operate|imprint|feed|reclaim/i);assert.ok(!core.includes("if(a.type==='feed')"));
});

test('cell exchange competes for wiring cells, pays once and survives saves',()=>{
 for(const route of ['ridge','conduit']){
  const s=fresh();s.stage=2;s.seals.navigation=true;s.expedition.route=route;s.board[7]=item('rig',3);ok(s,{type:'deploy',index:20,from:7});
  const c=normalContract(s);assert.equal(c.vaultTrade,true);assert.deepEqual(c.needs,[{family:'flux',tier:1,count:2}]);
  reject(s,{type:'contract'});
  s.board[7]=item('flux',1);s.board[8]=item('flux',1);
  const indices=deliveryItems(s,{type:'contract'});assert.deepEqual(indices.map(x=>x.index),[7,8]);
  ok(s,{type:'contract'});assert.equal(s.stage,2);assert.equal(s.expedition.vaultTrade,true);assert.equal(s.expedition.trades,0);assert.equal(s.surge,3);
  assert.ok(s.board.some(x=>x?.family===c.exchange.family&&x.tier===3));assert.equal(s.seals.resonance,false);
  assert.equal(s.expedition.log.at(-1).type,'vault-diversion');const saved=load(JSON.stringify(s));assert.equal(saved.expedition.vaultTrade,true);assert.notEqual(normalContract(saved).vaultTrade,true);
  const legacy=structuredClone(saved);delete legacy.expedition.vaultTrade;assert.equal(load(JSON.stringify(legacy)).stage,2);
 }
});
