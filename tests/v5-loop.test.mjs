// Version-6 core loop: producers → merges → coast tasks, crew orders, saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fresh,act,load,item,source,count,currentTask,VERSION,MAX_ENERGY,SAVE_KEY} from '../v5/core.mjs';
import {TASKS,sceneFor} from '../v5/chapter.mjs';
import {reservedItems,orderProgress,heldNeeds} from '../v5/orders.mjs';
import {container} from '../v5/containers.mjs';
import {REPLAY_KEY,ACTIVE_KEY,loadSlot,beginReplay,returnOriginal} from '../v5/replay.mjs';
import {nextAction,play} from './v5-core-policy.mjs';

const empty=()=>{const s=fresh(0);s.board=s.board.map(x=>x?.type==='source'?x:null);return s;};
const at=(s,i,x)=>{s.board[i]=x;return s;};
const ok=(s,a)=>{const r=act(s,a,1);assert.equal(r.ok,true,r.message);return r;};
const kinds=s=>s.board.map(x=>x&&(x.type==='item'?x.family+x.tier:x.type==='source'?'S:'+x.id:'C:'+x.kind));
function invariants(s){
 assert.equal(s.board.length,36);
 assert.ok(s.energy>=0&&s.energy<=MAX_ENERGY);
 for(const id of ['rig','chart','flux']){
  const n=s.board.filter(x=>x?.type==='source'&&x.id===id).length;
  assert.equal(n,s.producers[id].unlocked?1:0,id+' producer count');
 }
 for(const x of s.board)if(x?.type==='crate')assert.ok(x.left>=1&&x.left<=3);
 for(const o of s.orders.lanes)if(o){
  assert.ok(s.producers[o.needs[0].family].unlocked,'order for a locked producer');
  assert.ok(!heldNeeds(s).some(r=>r.family===o.needs[0].family&&r.tier===o.needs[0].tier),'order asks for a task part');
 }
}

test('fresh board holds only the Rover and three pairs of offcuts',()=>{
 const s=fresh(0);
 assert.equal(s.version,VERSION);
 assert.ok(s.board.every(x=>x===null||['item','source','crate'].includes(x.type)));
 assert.deepEqual(s.board[0],source('rig'));
 assert.equal(currentTask(s).id,'path');
 assert.equal(s.board.filter(x=>x?.type==='item').length,6);
 assert.deepEqual(s.orders.lanes,[null,null],'orders open after the pier is braced');
 invariants(s);
});

test('merge, move, produce, case and meal rules',()=>{
 const s=empty();at(s,1,item('rig',0));at(s,2,item('rig',0));
 const m=ok(s,{type:'merge',from:1,to:2});
 assert.deepEqual(s.board[2],item('rig',1));assert.equal(s.board[1],null);assert.equal(m.event,'merge');
 assert.equal(act(s,{type:'merge',from:0,to:3},1).ok,false,'producers stay put');
 ok(s,{type:'move',from:2,to:3});assert.deepEqual(s.board[3],item('rig',1));
 at(s,4,item('chart',1));assert.equal(act(s,{type:'merge',from:3,to:4},1).ok,false,'families never mix');
 const e=s.energy,p=ok(s,{type:'produce',id:'rig'});
 assert.equal(s.energy,e-1);assert.equal(p.reveal.length,2,'roomy board: a second raw part');
 assert.equal(act(s,{type:'produce',id:'chart'},1).ok,false,'Survey Kite is locked');
 s.energy=0;assert.equal(act(s,{type:'produce',id:'rig'},1).ok,false);
 ok(s,{type:'meal'});assert.equal(s.energy,15);
 assert.equal(act(s,{type:'meal'},1).ok,false,'meal only at zero');
 at(s,10,container('salvage'));const o=ok(s,{type:'open',index:10});
 assert.equal(o.reveal.length,3);assert.ok(o.reveal.includes(10));
});

test('a full board opens only the last part of a case in place',()=>{
 const s=empty();for(let i=1;i<36;i++)at(s,i,item('flux',i%2?0:1));at(s,35,container('relic',3));
 assert.equal(act(s,{type:'open',index:35},1).ok,false);
 s.board[35]=container('relic',1);ok(s,{type:'open',index:35});assert.deepEqual(s.board[35],item('flux',1));
});

test('tasks consume their parts, reward capability and advance one at a time',()=>{
 const s=fresh(0);
 assert.equal(act(s,{type:'task'},1).ok,false,'the first Grip tool must be merged');
 ok(s,{type:'merge',from:14,to:15});ok(s,{type:'task'});
 assert.equal(currentTask(s).id,'brace');
 assert.equal(count(s,{family:'rig',tier:1}),0,'the task consumed it');
 ok(s,{type:'merge',from:20,to:21});ok(s,{type:'merge',from:8,to:9});ok(s,{type:'task'});
 assert.equal(currentTask(s).id,'deck');
 assert.equal(s.orders.lanes.filter(Boolean).length,2,'the braced pier opens crew orders');
 invariants(s);
 at(s,30,item('rig',2));const r=ok(s,{type:'task'});
 assert.ok(s.producers.chart.unlocked);assert.deepEqual(s.board[5],source('chart'));
 assert.equal(r.reveal.length,1);assert.equal(s.board[r.reveal[0]].kind,'survey');
 assert.match(r.message,/Survey Kite/);
 invariants(s);
});

test('the task holds its parts: orders and recycling take only spares',()=>{
 const s=empty();s.task=TASKS.findIndex(t=>t.id==='workshop');s.producers.chart.unlocked=true;at(s,5,source('chart'));
 s.orders.lanes=[{id:'0:0',lane:'quick',who:'Ivo',why:'',needs:[{family:'chart',tier:1,count:1}],energy:3},null];
 at(s,10,item('chart',1));at(s,11,item('rig',2));
 assert.ok(reservedItems(s).has(10));
 assert.equal(orderProgress(s,s.orders.lanes[0]).ready,false);
 assert.match(act(s,{type:'order',id:'0:0'},1).message,/holding/);
 assert.match(act(s,{type:'recycle',index:10},1).message,/needs this part/);
 at(s,12,item('chart',1));
 assert.equal(orderProgress(s,s.orders.lanes[0]).ready,true);
 const e=s.energy;ok(s,{type:'order',id:'0:0'});
 assert.equal(s.energy,e+3);assert.equal(count(s,{family:'chart',tier:1}),1,'the held copy stays');
 ok(s,{type:'task'});assert.equal(s.producers.rig.level,2);
});

test('the crossing needs a choice; each side upgrades its producer and wakes the Crucible',()=>{
 for(const [choice,part,up] of [['ridge',item('rig',3),'rig'],['conduit',item('chart',3),'chart']]){
  const s=empty();s.task=TASKS.findIndex(t=>t.id==='crossing');s.producers.chart.unlocked=true;at(s,5,source('chart'));
  at(s,12,part);
  assert.equal(act(s,{type:'task'},1).ok,false,'no choice');
  assert.equal(act(s,{type:'task',choice:choice==='ridge'?'conduit':'ridge'},1).ok,false,'other side lacks its part');
  const r=ok(s,{type:'task',choice});
  assert.equal(s.choice,choice);assert.equal(s.producers[up].level,2);
  assert.ok(s.producers.flux.unlocked);assert.deepEqual(s.board[30],source('flux'));
  assert.equal(s.board[12],null);assert.ok(r.reveal.some(i=>s.board[i]?.kind==='relic'));
  invariants(s);
 }
});

test('recycling an undecided crossing part is refused while it is the only copy',()=>{
 const s=empty();s.task=TASKS.findIndex(t=>t.id==='crossing');s.producers.chart.unlocked=true;at(s,5,source('chart'));
 at(s,12,item('chart',3));
 assert.equal(act(s,{type:'recycle',index:12},1).ok,false);
});

test('the scene advances with the chapter',()=>{
 assert.deepEqual([0,3,7,10,11].map(sceneFor),[0,1,2,3,4]);
});

for(const route of ['ridge','conduit'])test(`scripted player finishes the chapter by ${route} with no dead end`,()=>{
 const s=fresh(0),r=play(s,{route});
 assert.equal(r.stuck,false,r.reason);assert.equal(s.task,TASKS.length);
 const vault=r.taskAt.find(t=>t.task==='vault').step,before=r.log.slice(0,vault);
 const merges=before.filter(x=>x==='merge').length,taps=before.filter(x=>x==='produce').length;
 assert.ok(vault>=80&&vault<=200,'actions to the Vault: '+vault);
 assert.ok(merges>=taps,'merging outweighs tapping ('+merges+' merges, '+taps+' taps)');
 assert.ok(r.taskAt.every((t,i)=>!i||t.task==='mast'||t.step-r.taskAt[i-1].step<=50),'no stretch over 50 actions between first-session tasks');
 invariants(s);
});

test('random play keeps invariants, saves round-trip, and never strands the player',()=>{
 for(let seed=1;seed<=12;seed++){
  let x=seed*2654435761%4294967296;const rnd=n=>{x=(x*1664525+1013904223)%4294967296;return x%n;};
  const s=fresh(0);
  for(let step=0;step<900;step++){
   const k=rnd(10),i=rnd(36),j=rnd(36);
   const a=k<4?{type:'merge',from:i,to:j}:k<6?{type:'produce',id:['rig','chart','flux'][rnd(3)]}:k===6?{type:'open',index:i}:k===7?{type:'recycle',index:i}:k===8?{type:'meal'}:nextAction(s)??{type:'meal'};
   const before=JSON.stringify(s),r=act(s,a,step);
   if(!r.ok)assert.equal(JSON.stringify(s),before,'failed actions change nothing');
  }
  invariants(s);
  assert.deepEqual(load(JSON.stringify(s),5),s);
  const r=play(s,{route:seed%2?'ridge':'conduit'});
  assert.equal(r.stuck,false,'seed '+seed+': '+r.reason);
 }
});

test('corrupt or unknown saves start fresh',()=>{
 for(const raw of [null,'','{',JSON.stringify({version:99}),JSON.stringify({version:6,board:[]})])assert.equal(load(raw,7).task,0);
});

// ---------- Version 5 → 6 migration ----------
function v5Save(over={}){
 const board=Array(36).fill(null);
 board[0]={type:'source',id:'rig'};board[5]={type:'source',id:'chart'};board[30]={type:'source',id:'flux'};
 board[20]={type:'site',kind:'winch',phase:'buried'};board[24]={type:'rock'};board[25]={type:'glyph'};
 board[8]={type:'item',family:'rig',tier:1};board[9]={type:'item',family:'chart',tier:2,line:'tide'};
 board[12]={type:'crate',kind:'locker',left:5};
 return {version:5,board,stage:0,landingStep:0,energy:55,moves:3,merges:1,taps:{rig:2,chart:0,flux:0},discovered:['rig:0','rig:1'],startedAt:0,...over};
}

test('a brand-new version 5 save becomes a fresh-progress version 6 save without fixtures',()=>{
 const s=load(JSON.stringify(v5Save()),9);
 assert.equal(s.version,6);assert.equal(s.migratedFrom,5);assert.equal(s.task,0);
 assert.ok(s.board.every(x=>x===null||['item','source','crate'].includes(x.type)));
 assert.equal(s.board[5],null,'locked Survey Kite leaves the board');assert.equal(s.board[30],null);
 assert.deepEqual(s.board[9],item('chart',2),'parts are kept');
 assert.deepEqual(s.board[12],container('locker',3));
 assert.equal(s.energy,55);
 invariants(s);
});

test('version 5 progress maps onto completed coast tasks',()=>{
 const cases=[
  [{landingStep:1},'brace'],
  [{landingStep:2,camp:{earlyFragments:2}},'table'],
  [{landingStep:2,camp:{earlyFragments:2},discovered:['chart:tide:1']},'workshop'],
  [{landingStep:2,camp:{earlyFragments:2},workshop:{repaired:true}},'survey'],
  [{stage:2,landingStep:2,expedition:{route:'conduit'}},'lift'],
  [{stage:3,landingStep:2,expedition:{route:'ridge'}},'vault'],
  [{stage:4,landingStep:2,expedition:{route:'ridge'},camp:{fleetViewed:true}},'mast']
 ];
 for(const [over,expect] of cases){
  const s=load(JSON.stringify(v5Save(over)),9);
  assert.equal(currentTask(s).id,expect,JSON.stringify(over));
  invariants(s);
  const r=play(s,{route:'ridge'});assert.equal(r.stuck,false,expect+': '+r.reason);
 }
 const c=load(JSON.stringify(v5Save({stage:2,landingStep:2,expedition:{route:'conduit'}})),9);
 assert.equal(c.choice,'conduit');assert.equal(c.producers.chart.level,2);assert.ok(c.producers.flux.unlocked);
});

test('stage-2 fixture saves migrate and stay playable',()=>{
 const dir=new URL('./fixtures/stage2/',import.meta.url);
 for(const f of readdirSync(dir)){
  const raw=readFileSync(new URL(f,dir),'utf8'),old=JSON.parse(raw),s=load(raw,9);
  assert.equal(s.version,6,f);assert.equal(s.migratedFrom,5,f);
  assert.equal(s.choice,old.expedition.route,f);
  assert.ok(s.task>=7,f+' is past the crossing');
  invariants(s);
  assert.deepEqual(load(JSON.stringify(s),9),s,f+' round-trips');
  assert.equal(play(s,{route:s.choice}).stuck,false,f);
 }
});

test('save slots keep their keys; replay never overwrites the original',()=>{
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 assert.equal(SAVE_KEY,'vaultwake-v5');assert.equal(REPLAY_KEY,'vaultwake-v5-replay');assert.equal(ACTIVE_KEY,'vaultwake-v5-active-slot');
 const old=JSON.stringify(v5Save({stage:3,landingStep:2,expedition:{route:'ridge'}}));
 storage.setItem(SAVE_KEY,old);
 assert.equal(currentTask(loadSlot(storage,1).state).id,'vault');
 beginReplay(storage,2);
 assert.equal(loadSlot(storage,3).active,true);assert.equal(loadSlot(storage,3).state.task,0);
 assert.equal(storage.getItem(SAVE_KEY),old,'original slot untouched');
 assert.equal(currentTask(returnOriginal(storage,4)).id,'vault');
});

test('following only the on-screen suggestion finishes the chapter',async()=>{
 const {suggest}=await import('../v5/guide.mjs');
 const s=fresh(0);let steps=0;
 for(;steps<600&&currentTask(s);steps++){
  const g=suggest(s);
  const a=g.kind==='task'?{type:'task',choice:g.choice}:g.kind==='merge'?{type:'merge',from:g.cells[0],to:g.cells[1]}:g.kind==='order'?{type:'order',id:g.id}:
   g.kind==='open'?{type:'open',index:g.cells[0]}:g.kind==='produce'?{type:'produce',id:s.board[g.cells[0]].id}:g.kind==='meal'?{type:'meal'}:
   g.kind==='recycle'?{type:'recycle',index:s.board.findIndex((x,i)=>x?.type==='item'&&!reservedItems(s).has(i))}:null;
  assert.ok(a,'suggestion '+g.kind+': '+g.text);
  const r=act(s,a,steps);assert.equal(r.ok,true,g.text+' → '+r.message);
 }
 assert.equal(s.task,TASKS.length);assert.ok(steps<320,'steps '+steps);
});
