// Vaultwake V5 core (state version 6): one loop. Producers make parts, parts
// merge, merged items restore the coast one task at a time. Deterministic,
// independent of rendering and wall-clock timers.
import {TASKS,PRODUCERS} from './chapter.mjs';
import {container,containerInfo,CONTAINERS} from './containers.mjs';
import {freshOrders,validOrders,syncOrders,orderProgress,reservedItems,heldNeeds,ordersOpen} from './orders.mjs';

export const SAVE_KEY='vaultwake-v5';
export const VERSION=6,MAX_ENERGY=100,MAX_TIER=7,MEAL=15;
export const FAMILIES={
 rig:{name:'Fieldworks',color:'#f27755',source:'rig',names:['Copper offcut','Grip tool','Split spanner','Pocket winch','Crawler jack','Bridge rig','Dune hauler','Expedition crawler']},
 chart:{name:'Wayfinding',color:'#43bfe7',source:'chart',names:['Ink scrap','Route fold','Sight lens','Survey scope','Bearing dial','Star chart','Horizon model','Sky atlas']},
 flux:{name:'Resonance',color:'#ac83fa',source:'flux',names:['Violet shard','Loop cell','Pulse coil','Resonator','Phase lantern','Orbit engine','Vault heart','Aurora beacon']}
};
export const SOURCES=Object.fromEntries(Object.entries(PRODUCERS).map(([id,p])=>[id,{name:p.name,cost:1,family:id}]));
export const item=(family,tier)=>({type:'item',family,tier});
export const source=id=>({type:'source',id});
export const matches=(x,r)=>x?.type==='item'&&x.family===r.family&&x.tier===r.tier;
export const sameKind=(a,b)=>a?.type==='item'&&b?.type==='item'&&a.family===b.family&&a.tier===b.tier;
export const nameOf=x=>!x?'Empty space':x.type==='item'?FAMILIES[x.family].names[x.tier]:x.type==='source'?PRODUCERS[x.id].name:x.type==='crate'?containerInfo(x).name:'Object';
export const count=(s,r)=>s.board.filter(x=>matches(x,r)).length;
export const ready=(s,needs)=>needs.every(r=>count(s,r)>=r.count);
export const currentTask=s=>TASKS[s.task]??null;
const valid=i=>Number.isInteger(i)&&i>=0&&i<36;
const free=s=>s.board.filter(x=>x===null).length;
const put=(s,x)=>{const i=s.board.indexOf(null);if(i>=0)s.board[i]=x;return i;};

function freshProducers(){return {rig:{unlocked:true,level:1,rich:0},chart:{unlocked:false,level:1,rich:0},flux:{unlocked:false,level:1,rich:0}};}

export function fresh(now=Date.now()){
 const board=Array(36).fill(null);
 board[0]=source('rig');
 // Three pairs of offcuts: one merge clears the path, two more brace the pier,
 // then the Rover is needed for the deck.
 for(const i of [14,15,20,21,8,9])board[i]=item('rig',0);
 const s={version:VERSION,board,task:0,choice:null,energy:30,producers:freshProducers(),orders:freshOrders(),
  taps:{rig:0,chart:0,flux:0},moves:0,merges:0,meals:0,discovered:['rig:0'],startedAt:now,lastAt:now};
 syncOrders(s);return s;
}

// Item output of one producer tap: rich pulls give a tier-1 part; an upgraded
// producer gives one every third tap; unless the board is nearly full, a
// second raw part comes with it.
function produce(s,id){
 const p=s.producers[id];
 const rich=p.rich>0||(p.level>1&&(s.taps[id]+1)%3===0);
 if(p.rich>0)p.rich--;
 const out=[item(id,rich?1:0)];
 if(free(s)>6)out.push(item(id,0));
 s.taps[id]++;
 return out.map(x=>put(s,x)).filter(i=>i>=0);
}

function discover(s,x){const key=x.family+':'+x.tier;if(s.discovered.includes(key))return false;s.discovered.push(key);return true;}

function applyReward(s,reward={}){
 const out={revealed:[],unlocked:null};
 if(reward.energy)s.energy=Math.min(MAX_ENERGY,s.energy+reward.energy);
 if(reward.upgrade)s.producers[reward.upgrade].level=2;
 if(reward.rich){const [id,n]=reward.rich;s.producers[id].rich+=n;}
 if(reward.unlock&&!s.producers[reward.unlock].unlocked){
  s.producers[reward.unlock].unlocked=true;
  const home=PRODUCERS[reward.unlock].home,i=s.board[home]===null?home:s.board.indexOf(null);
  if(i>=0){s.board[i]=source(reward.unlock);out.unlocked=i;}
 }
 if(reward.case){const i=put(s,container(reward.case));if(i>=0)out.revealed.push(i);else s.energy=Math.min(MAX_ENERGY,s.energy+5);}
 return out;
}

function consume(s,needs){
 const used=[];
 for(const r of needs)for(let n=0;n<r.count;n++){const i=s.board.findIndex((x,i)=>!used.includes(i)&&matches(x,r));used.push(i);}
 for(const i of used)s.board[i]=null;
 return used;
}

export function taskNeeds(s,choice=s.choice){const t=currentTask(s);if(!t)return [];return t.choices?(t.choices[choice]?.needs??[]):t.needs;}

// Mutating reducer, atomic: a failed command leaves the state untouched.
export function act(s,a,now=Date.now()){
 const fail=message=>({ok:false,message});
 const done=(message,event,index=null,extra={})=>{s.moves++;s.lastAt=now;syncOrders(s);return {ok:true,message,event,index,...extra};};
 if(a.type==='merge'||a.type==='move'){
  if(!valid(a.from)||!valid(a.to)||a.from===a.to)return fail('Choose another space.');
  const x=s.board[a.from],y=s.board[a.to];
  if(x?.type!=='item'&&x?.type!=='crate')return fail('That stays where it is.');
  if(!y){s.board[a.to]=x;s.board[a.from]=null;return done('Moved.','move',a.to);}
  if(!sameKind(x,y))return fail('Merge two identical parts.');
  if(x.tier>=MAX_TIER)return fail('That part is already complete.');
  const made=item(x.family,x.tier+1);s.board[a.to]=made;s.board[a.from]=null;s.merges++;
  const first=discover(s,made);if(first&&made.tier>=2)s.energy=Math.min(MAX_ENERGY,s.energy+2);
  return done(nameOf(made)+(first?' · new discovery':''),'merge',a.to,{made,first});
 }
 if(a.type==='produce'){
  const p=s.producers[a.id];
  if(!p?.unlocked)return fail('Not repaired yet.');
  if(!s.board.some(x=>x?.type==='source'&&x.id===a.id))return fail('Producer missing.');
  if(s.energy<1)return fail('Out of energy. Deliver a crew order or take a field meal.');
  if(!free(s))return fail('Board full. Merge, deliver or recycle a part.');
  s.energy--;const revealed=produce(s,a.id);
  const x=s.board[revealed[0]];discover(s,x);
  return done(nameOf(x)+(revealed.length>1?' + raw part':''),'produce',revealed[0],{reveal:revealed,improved:x.tier>0});
 }
 if(a.type==='open'){
  const box=s.board[a.index];if(!valid(a.index)||box?.type!=='crate')return fail('Choose a supply case.');
  const outputs=containerInfo(box).outputs,revealed=[];
  while(box.left>0){
   const last=box.left===1;if(!last&&!s.board.includes(null))break;
   const x={...outputs[box.left-1]};box.left--;
   const i=last?(s.board[a.index]=x,a.index):put(s,x);revealed.push(i);discover(s,x);
  }
  if(!revealed.length)return fail('Board full. Merge or deliver a part first.');
  return done(containerInfo(box).name+' · '+revealed.length+' parts','container',a.index,{reveal:revealed,kind:box.kind});
 }
 if(a.type==='recycle'){
  const x=s.board[a.index];if(!valid(a.index)||x?.type!=='item')return fail('Choose a part.');
  if(reservedItems(s).has(a.index)&&count(s,x)<=heldNeeds(s).filter(r=>matches(x,r)).reduce((n,r)=>n+r.count,0))return fail('The current task needs this part.');
  const gain=Math.max(1,x.tier);s.board[a.index]=null;s.energy=Math.min(MAX_ENERGY,s.energy+gain);
  return done('Recycled · +'+gain+' energy','recycle',a.index);
 }
 if(a.type==='meal'){
  if(s.energy>=1)return fail('Meals are for an empty energy bar.');
  s.energy=MEAL;s.meals++;return done('Field meal · +'+MEAL+' energy','meal');
 }
 if(a.type==='order'){
  const lane=s.orders.lanes.findIndex(o=>o?.id===a.id);if(lane<0)return fail('That order has changed.');
  const o=s.orders.lanes[lane],p=orderProgress(s,o);
  if(!p.ready)return fail(p.progress.some(r=>r.held)?'The coast task is holding that part. Make a spare.':'Make the requested part first.');
  for(const i of p.indices)s.board[i]=null;
  s.energy=Math.min(MAX_ENERGY,s.energy+o.energy);s.orders.completed++;s.orders.seq[lane]++;s.orders.lanes[lane]=null;
  const reward=o.case?applyReward(s,{case:o.case}):{revealed:[]};
  return done(o.who+' · +'+o.energy+' energy'+(o.case?' · supply case':''),'order',null,{order:o,used:p.indices,reveal:reward.revealed});
 }
 if(a.type==='task'){
  const t=currentTask(s);if(!t)return fail('The chapter is complete.');
  const choice=t.choices?a.choice:null;
  if(t.choices&&!t.choices[choice])return fail('Choose Ridge or Conduit.');
  const needs=t.choices?t.choices[choice].needs:t.needs;
  if(!ready(s,needs))return fail('Make the parts this task needs.');
  const used=consume(s,needs);
  if(choice)s.choice=choice;
  const reward=applyReward(s,t.reward);
  if(choice){const extra=applyReward(s,t.choices[choice].reward);reward.revealed.push(...extra.revealed);}
  s.task++;
  if(t.reward.orders)syncOrders(s);
  return done(t.choices?t.choices[choice].line:t.line,'task',null,{task:t,choice,used,reveal:reward.revealed,unlocked:reward.unlocked});
 }
 return fail('Unknown action.');
}

// ---------- Saves ----------
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
function validBoard(board){
 if(!Array.isArray(board)||board.length!==36)return false;
 return board.every(x=>x===null||x?.type==='item'&&FAMILIES[x.family]&&integer(x.tier,0,MAX_TIER)||x?.type==='source'&&PRODUCERS[x.id]||x?.type==='crate'&&CONTAINERS[x.kind]&&integer(x.left,1,3));
}

export function load(raw,now=Date.now()){
 let s;try{s=JSON.parse(raw);}catch{return fresh(now);}
 if(s?.version===5)s=migrateV5(s,now);
 if(s?.version!==VERSION||!validBoard(s.board)||!integer(s.task,0,TASKS.length)||!integer(s.energy,0,MAX_ENERGY))return fresh(now);
 const p=freshProducers();
 for(const id of Object.keys(p))if(s.producers?.[id]){p[id]={unlocked:id==='rig'||s.producers[id].unlocked===true,level:s.producers[id].level===2?2:1,rich:integer(s.producers[id].rich,0,20)?s.producers[id].rich:0};}
 s.producers=p;
 s.choice=['ridge','conduit'].includes(s.choice)?s.choice:null;
 s.orders=validOrders(s.orders);
 s.orders.lanes=s.orders.lanes.map(o=>o&&s.producers[o.needs[0].family].unlocked?o:null);
 for(const k of ['moves','merges','meals'])if(!integer(s[k],0,1e7))s[k]=0;
 s.taps={rig:integer(s.taps?.rig,0,1e7)?s.taps.rig:0,chart:integer(s.taps?.chart,0,1e7)?s.taps.chart:0,flux:integer(s.taps?.flux,0,1e7)?s.taps.flux:0};
 s.discovered=Array.isArray(s.discovered)?s.discovered.filter(x=>typeof x==='string'&&/^(rig|chart|flux):[0-7]$/.test(x)):[];
 // Every unlocked producer is on the board; never a locked one.
 for(const id of Object.keys(PRODUCERS)){
  const at=s.board.findIndex(x=>x?.type==='source'&&x.id===id);
  if(!s.producers[id].unlocked&&at>=0)s.board[at]=null;
  if(s.producers[id].unlocked&&at<0){const home=PRODUCERS[id].home,i=s.board[home]===null?home:s.board.indexOf(null);if(i>=0)s.board[i]=source(id);else{const r=s.board.findIndex(x=>x?.type==='item');s.board[r]=source(id);}}
 }
 if(!Number.isFinite(s.startedAt))s.startedAt=now;
 if(!Number.isFinite(s.lastAt))s.lastAt=now;
 syncOrders(s);
 return s;
}

// Version 5 → 6: furthest earned progress becomes completed tasks (sequential),
// the crossing choice is kept, items/producers/cases stay, board fixtures leave.
export function migrateV5(old,now=Date.now()){
 const stage=integer(old.stage,0,4)?old.stage:0,landing=old.landingStep??(stage?2:0);
 const sites=(old.board??[]).filter(x=>x?.type==='site');
 const receiver=sites.some(x=>x.kind!=='winch'&&x.phase==='done');
 const done=['path',
  (old.camp?.earlyFragments??0)>=1?'brace':null,
  (old.camp?.earlyFragments??0)>=2||old.camp?.pier?'deck':null,
  old.discovered?.includes('chart:tide:1')?'table':null,
  old.workshop?.repaired?'workshop':null,
  stage>=1?'survey':null,stage>=2?'crossing':null,
  old.seals?.stabilization||stage>=3?'lift':null,receiver||stage>=3?'beacon':null,
  stage>=3?'rings':null,stage>=4?'vault':null,old.camp?.fleetViewed?'signal':null];
 let task=0;
 if(stage>0||landing>=1)for(const [i,id] of done.entries())if(id)task=Math.max(task,i+1);
 const board=Array(36).fill(null);
 (old.board??[]).forEach((x,i)=>{
  if(x?.type==='item'&&FAMILIES[x.family]&&integer(x.tier,0,MAX_TIER))board[i]=item(x.family,x.tier);
  else if(x?.type==='source'&&PRODUCERS[x.id])board[i]=source(x.id);
  else if(x?.type==='crate'&&integer(x.left,1,5))board[i]=container(CONTAINERS[x.kind]?x.kind:'locker',Math.min(3,x.left));
 });
 const producers=freshProducers();
 if(task>=3)producers.chart.unlocked=true;
 if(task>=7)producers.flux.unlocked=true;
 if(task>=5)producers.rig.level=2;
 const choice=old.expedition?.route==='ridge'||old.expedition?.route==='conduit'?old.expedition.route:null;
 if(task>=7)producers[choice==='conduit'?'chart':'rig'].level=2;
 return {version:VERSION,board,task,choice:task>=7?choice??'ridge':null,energy:Math.max(10,Math.min(MAX_ENERGY,integer(old.energy,0,1000)?old.energy:40)),producers,orders:freshOrders(),
  taps:{rig:old.taps?.rig??0,chart:old.taps?.chart??0,flux:old.taps?.flux??0},moves:old.moves??0,merges:old.merges??0,meals:0,
  discovered:(old.discovered??[]).filter(x=>/^(rig|chart|flux):[0-7]$/.test(x)),startedAt:old.startedAt??now,lastAt:now,migratedFrom:5};
}

export {TASKS,reservedItems,heldNeeds,orderProgress,ordersOpen};
