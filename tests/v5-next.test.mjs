// Coast Camp, the new loop (v5/next/): rules, saves and scripted-player pacing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SAVE_KEY,fresh,act,load,tick,item,nextTask,orderItems,sourceOpen,STAR_VALUE} from '../v5/next/game.mjs';
import {AREAS} from '../v5/next/areas.mjs';
import {kit} from '../v5/kits.mjs';
import {nextAction} from './v5-next-policy.mjs';

const ok=(s,a,now=1)=>{const r=act(s,a,now);assert.equal(r.ok,true,JSON.stringify(a)+' '+r.message);return r;};
function refused(s,a){const before=JSON.stringify(s),r=act(s,a,1);assert.equal(r.ok,false,JSON.stringify(a));assert.equal(JSON.stringify(s),before,'refusal leaves state untouched');return r;}

test('its own save key; the Classic keys are never written',()=>{
 assert.equal(SAVE_KEY,'vaultwake-v5-coast');
 for(const f of ['v5/next/game.mjs','v5/next/app.mjs']){const src=readFileSync(new URL('../'+f,import.meta.url),'utf8');assert.doesNotMatch(src,/setItem\('vaultwake-v5'|vaultwake-v5-replay|vaultwake-v5-active-slot/,f);}
});

test('a new camp: an open pocket around Rivet Rover, sand with finds, numbered gates, three orders',()=>{
 const s=fresh(0);
 assert.deepEqual(s.board.flatMap((x,i)=>x===null?[i]:[]),[1,6,12]);
 assert.equal(s.board.filter(x=>x?.type==='sand').length,25);assert.equal(s.board.filter(x=>x?.type==='gate').length,13);
 assert.deepEqual(s.orders.map(o=>o.needs),[[{family:'rig',tier:1,count:2}],[{family:'rig',tier:2,count:1}],[{family:'rig',tier:1,count:1},{family:'rig',tier:0,count:2}]]);
 assert.equal(s.stars,0);assert.equal(sourceOpen(s,'chart'),false);assert.equal(nextTask(s).id,'beach-path');
});

test('the first merge digs two finds and completes the first order',()=>{
 const s=fresh(0),r=ok(s,{type:'merge',from:7,to:8});
 assert.deepEqual(r.dug.map(d=>d.index).sort((a,b)=>a-b),[9,14]);assert.equal(r.xp,1);
 assert.ok(orderItems(s,s.orders[0]));
 const d=ok(s,{type:'deliver',id:'o0'});assert.equal(d.stars,2);assert.equal(s.stars,2);assert.equal(s.orders[0].id,'o3');
 refused(s,{type:'deliver',id:'o0'});
});

test('generators cost energy, place near themselves and refuse when locked, empty or full',()=>{
 const s=fresh(0),e=s.energy,r=ok(s,{type:'produce',id:'rig'});
 assert.equal(s.energy,e-1);assert.deepEqual(s.board[r.index],item('rig',0));assert.equal(r.index,1,'the nearest free space');
 refused(s,{type:'produce',id:'chart'});refused(s,{type:'produce',id:'flux'});
 const t=fresh(0);t.energy=0;refused(t,{type:'produce',id:'rig'});
 const u=fresh(0);for(let i=0;i<u.board.length;i++)if(u.board[i]===null)u.board[i]=item('rig',5);refused(u,{type:'produce',id:'rig'});
});

test('restoring spends stars in order and applies each place\'s effect',()=>{
 const s=fresh(0);
 refused(s,{type:'restore',id:'beach-path'});
 s.stars=200;refused(s,{type:'restore',id:'beach-tent'});
 const costs=AREAS[0].tasks.map(t=>t.cost);let spent=0;
 for(const t of AREAS[0].tasks){const e=s.energy,r=ok(s,{type:'restore',id:t.id});spent+=t.cost;assert.equal(s.stars,200-spent);
  if(t.id==='beach-tent')assert.equal(s.energy,Math.min(120,e+10));
  if(t.id==='beach-mast'){assert.equal(sourceOpen(s,'chart'),true);ok(s,{type:'produce',id:'chart'});}
  if(t.id==='beach-workshop'){assert.equal(s.board[0].level,2);assert.equal(r.effects.newChain,'rope');}
  if(t.id==='beach-pier'){assert.equal(s.board[5].level,2);assert.equal(r.effects.newChain,'shell');}
  if(t.id==='beach-beacon'){assert.equal(s.slots,4);assert.equal(s.orders.length,4);}
  if(t.id==='beach-cliff')assert.equal(r.effects.areaDone,'beach');
 }
 assert.equal(nextTask(s),null);refused(s,{type:'restore'});
 assert.deepEqual(costs,[4,6,9,12,16,20,26]);
});

test('orders scale with level, never repeat a live need and pay stars by tier',()=>{
 const s=fresh(0);s.level.level=6;s.done.push('beach-mast');
 for(let n=0;n<60;n++){
  const o=s.orders[n%3];for(const r of o.needs)for(let k=0;k<r.count;k++){const i=s.board.indexOf(null);assert.ok(i>=0);s.board[i]=item(r.family,r.tier);}
  ok(s,{type:'deliver',id:o.id});
  for(const x of s.orders){assert.equal(x.stars,x.needs.reduce((v,r)=>v+r.count*STAR_VALUE[r.tier],0));for(const r of x.needs){assert.ok(['rig','chart'].includes(r.family));assert.ok(r.tier<=4);}}
  s.board=s.board.map(x=>x?.type==='kit'||x?.type==='item'?null:x);
 }
 assert.equal(s.ordersDone,60);
});

test('every third order brings a small box of its kind; boxes and generator levels work here too',()=>{
 const s=fresh(0);s.ordersDone=2;const o=s.orders[1];s.board[1]=item('rig',2);
 const d=ok(s,{type:'deliver',id:o.id});assert.deepEqual(s.board[d.box],kit('rig',1));
 const t=fresh(0);t.board[1]=kit('rig',3);const r=ok(t,{type:'merge',from:1,to:0});assert.equal(r.event,'producerUp');assert.equal(t.board[0].level,2);
 t.board[1]=kit('rig',1);t.board[6]=kit('rig',1);ok(t,{type:'merge',from:1,to:6});assert.deepEqual(t.board[6],kit('rig',2));
 ok(t,{type:'openKit',index:6});
});

test('levels open gates and give a chest with a box of an open family',()=>{
 const s=fresh(0);s.level.xp=19;const e=s.energy,r=ok(s,{type:'merge',from:7,to:8});
 assert.equal(r.levelUp[0].level,2);assert.deepEqual(r.levelUp[0].opened,[36,43]);assert.equal(r.levelUp[0].family,'rig');
 assert.equal(s.energy,e+5);
});

test('energy refills over time and a low-energy ration helps once an hour',()=>{
 const s=fresh(0);s.energy=0;s.energyAt=0;tick(s,10*60*1000);assert.equal(s.energy,5);
 const t=fresh(0);t.energy=2;ok(t,{type:'ration'},1000);assert.equal(t.energy,10);t.energy=1;refused(t,{type:'ration'});
});

test('saves round-trip; anything malformed starts a new camp',()=>{
 const s=fresh(0);ok(s,{type:'merge',from:7,to:8});s.board[1]=kit('chart',2);s.board[0].level=3;
 const back=load(JSON.stringify(s),5);assert.deepEqual(back.board,s.board);assert.deepEqual(back.orders,s.orders);assert.equal(back.moves,1);
 const bad=[x=>x.version=2,x=>x.board.pop(),x=>x.board[2]={type:'item',family:'gold',tier:0},x=>x.board[2]={type:'crate',kind:'salvage',left:3},x=>x.stars=-1,x=>x.orders.pop(),x=>x.orders[0].who='zed',x=>x.done.push('nowhere'),x=>x.slots=5,x=>x.taps.rig=-1,x=>x.board[0].level=9];
 for(const f of bad){const t=structuredClone(s);f(t);assert.equal(load(JSON.stringify(t),5).moves,0,f.toString());}
 assert.equal(load('not json',5).moves,0);
 const classic=readFileSync(new URL('./fixtures/stage2/conduit-completed.json',import.meta.url),'utf8');assert.equal(load(classic,5).moves,0,'a Classic save is not a Coast Camp save');
});

test('a scripted player restores Landing Beach in 15–30 minutes and feels energy by the end',()=>{
 for(const step of [5000,6000]){
  const s=fresh(0);let now=0,firstRestore=null,actions=0,waited=0;const levels=[];
  while(!s.done.includes('beach-cliff')&&now<60*60*1000){
   tick(s,now);const a=nextAction(s);if(!a){now+=30000;waited+=30000;continue;}
   const r=ok(s,a,now);actions++;now+=step;
   if(r.event==='restore'&&firstRestore===null)firstRestore=now;
   for(const u of r.levelUp??[])levels.push(now);
  }
  assert.ok(s.done.includes('beach-cliff'),'area restored');
  assert.ok(firstRestore<3*60*1000,'first restoration within 3 minutes');
  assert.ok(now>=15*60*1000&&now<=30*60*1000,`area 1 took ${(now/60000).toFixed(1)} min`);
  assert.ok(levels.length>=4,'several level-ups');
  assert.ok(s.energy<25,'energy runs low by the end of the area');
  console.log(JSON.stringify({step,minutes:+(now/60000).toFixed(1),firstRestore:+(firstRestore/60000).toFixed(1),actions,levels:levels.length,energy:s.energy,waited}));
 }
});

test('generators make more chains as they level up; orders and boxes follow the open chains',async()=>{
 const {chainsOf,openChains}=await import('../v5/next/game.mjs');const {CHAINS,maxTier,GENERATOR_CHAINS}=await import('../v5/next/chains.mjs');
 const s=fresh(0);assert.deepEqual(chainsOf(s,'rig'),['rig']);
 s.board[0].level=2;assert.deepEqual(chainsOf(s,'rig'),['rig','rope']);s.board[0].level=3;assert.deepEqual(chainsOf(s,'rig'),['rig','rope','lamp']);
 s.done.push('beach-mast');s.board[5].level=2;assert.deepEqual(openChains(s),['rig','rope','lamp','chart','shell']);
 // Pulls cover every open chain over time.
 const made=new Set();for(let n=0;n<60;n++){const r=ok(s,{type:'produce',id:n%2?'rig':'chart'});made.add(s.board[r.index].family);s.board[r.index]=null;s.energy=40;}
 assert.deepEqual([...made].sort(),['chart','lamp','rig','rope','shell']);
 // New chains merge to their own top and no further.
 for(const c of ['rope','lamp','shell']){const t=fresh(0);t.board[1]=item(c,maxTier(c)-1);t.board[6]=item(c,maxTier(c)-1);ok(t,{type:'merge',from:1,to:6});assert.equal(t.board[6].tier,maxTier(c));t.board[1]=item(c,maxTier(c));refused(t,{type:'merge',from:1,to:6});assert.ok(CHAINS[c].names[maxTier(c)]);}
 // Orders use the open chains once the scripted first three are done.
 const u=fresh(0);u.board[0].level=3;u.done.push('beach-mast');u.board[5].level=2;u.level.level=4;const seen=new Set();
 for(let n=0;n<90;n++){const o=u.orders[n%3];for(const r of o.needs){seen.add(r.family);assert.ok(r.tier<maxTier(r.family));for(let k=0;k<r.count;k++)u.board[u.board.indexOf(null)]=item(r.family,r.tier);}ok(u,{type:'deliver',id:o.id});u.board=u.board.map(x=>x?.type==='kit'||x?.type==='item'?null:x);}
 assert.deepEqual([...seen].sort(),['chart','lamp','rig','rope','shell']);
 // Boxes drop parts of their generator's open chains; saves keep new-chain parts.
 const v=fresh(0);v.board[0].level=2;v.board[1]=kit('rig',2);const drops=new Set();for(let k=0;k<5;k++){const r=ok(v,{type:'openKit',index:1});drops.add(v.board[r.index].family);if(r.index!==1)v.board[r.index]=null;}
 assert.ok([...drops].every(c=>['rig','rope'].includes(c)));
 v.board[6]=item('shell',5);assert.deepEqual(load(JSON.stringify(v),5).board[6],item('shell',5));
 const w=structuredClone(v);w.board[6]=item('shell',6);assert.equal(load(JSON.stringify(w),5).moves,0,'beyond a chain top is malformed');
 assert.deepEqual(Object.keys(GENERATOR_CHAINS),['rig','chart','flux']);
 // A box from a new-chain order belongs to that chain's generator (a valid, saveable box).
 const x=fresh(0);x.board[0].level=2;x.ordersDone=2;x.orders[0]={id:'oz',who:'ivo',needs:[{family:'rope',tier:1,count:1}],stars:1};x.board[1]=item('rope',1);
 const d=ok(x,{type:'deliver',id:'oz'});assert.deepEqual(x.board[d.box],kit('rig',1));assert.equal(load(JSON.stringify(x),5).moves,x.moves);
});
