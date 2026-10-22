// Coast Camp, the new loop (v5/next/): rules, saves and scripted-player pacing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SAVE_KEY,fresh,act,load,tick,item,jar,nextTask,orderItems,sourceOpen,STAR_VALUE,CAMP,CARGO,cargo,cargoKeys,source,CRATES,nameOf,GENERATOR_ORDER} from '../v5/next/game.mjs';
import {AREAS} from '../v5/next/areas.mjs';
import {kit} from '../v5/kits.mjs';
import {nextAction} from './v5-next-policy.mjs';

const ok=(s,a,now=1)=>{const r=act(s,a,now);assert.equal(r.ok,true,JSON.stringify(a)+' '+r.message);return r;};
function refused(s,a){const before=JSON.stringify(s),r=act(s,a,1);assert.equal(r.ok,false,JSON.stringify(a));assert.equal(JSON.stringify(s),before,'refusal leaves state untouched');return r;}

test('its own save key; the Classic keys are never written',()=>{
 assert.equal(SAVE_KEY,'vaultwake-v5-coast');
 for(const f of ['v5/next/game.mjs','v5/next/app.mjs']){const src=readFileSync(new URL('../'+f,import.meta.url),'utf8');assert.doesNotMatch(src,/setItem\('vaultwake-v5'|vaultwake-v5-replay|vaultwake-v5-active-slot/,f);}
});

test('a new camp: Rivet Rover alone in its camp, sealed cargo everywhere else, three orders',()=>{
 const s=fresh(0);
 assert.deepEqual(s.board.flatMap((x,i)=>x===null?[i]:[]),[1,6,12]);
 assert.deepEqual(CAMP,[0,1,2,6,7,8,12,13,18]);
 assert.deepEqual(s.board.flatMap((x,i)=>x?.type==='source'?[x.id]:[]),['rig'],'one generator to start');
 assert.equal(s.board.filter(x=>x?.type==='cargo').length,40);
 assert.ok(s.board.every((x,i)=>CAMP.includes(i)||x.type==='cargo'));
 assert.deepEqual(s.orders.map(o=>o.needs),[[{family:'rig',tier:1,count:2}],[{family:'rig',tier:2,count:1}],[{family:'rig',tier:1,count:1},{family:'rig',tier:0,count:2}]]);
 assert.equal(s.stars,0);assert.equal(sourceOpen(s,'chart'),false);assert.equal(nextTask(s).id,'beach-path');
});

test('the first merge completes the first order and opens nothing',()=>{
 const s=fresh(0),r=ok(s,{type:'merge',from:7,to:8});
 assert.equal(s.board.filter(x=>x?.type==='cargo').length,40,'merging never opens cargo');assert.equal(r.xp,1);
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
  if(t.id==='beach-path')assert.deepEqual(s.board[r.effects.kit],kit('rig',1));
  if(t.id==='beach-tent')assert.equal(s.energy,Math.min(120,e+10));
  if(t.id==='beach-mast'){assert.equal(s.slots,4);assert.equal(s.orders.length,4);}
  if(t.id==='beach-workshop')assert.equal(s.board[0].level,2);
  if(t.id==='beach-pier')assert.deepEqual(s.board[r.effects.kit],kit('rig',2),'a sea chest for the newest generator (still Rover here)');
  if(t.id==='beach-beacon')assert.equal(s.energy,Math.min(120,e+15));
  assert.equal(s.board.filter(x=>x?.type==='cargo').length,40,'restorations never open cargo');
  if(t.id==='beach-cliff')assert.equal(r.effects.areaDone,'beach');
 }
 assert.equal(nextTask(s),null);refused(s,{type:'restore'});
 assert.deepEqual(costs,[4,6,8,10,13,16,20]);
});

test('orders scale with level, never repeat a live need and pay stars by tier',()=>{
 const s=fresh(0);s.level.level=6;s.board[1]=source('chart');
 for(let n=0;n<60;n++){
  const o=s.orders[n%3];for(const r of o.needs)for(let k=0;k<r.count;k++){const i=s.board.indexOf(null);assert.ok(i>=0);s.board[i]=item(r.family,r.tier);}
  ok(s,{type:'deliver',id:o.id});
  for(const x of s.orders){assert.equal(x.stars,x.needs.reduce((v,r)=>v+r.count*STAR_VALUE[r.tier],0));for(const r of x.needs){assert.ok(['rig','chart'].includes(r.family));assert.ok(r.tier<=4);}}
  s.board=s.board.map(x=>x?.type==='kit'||x?.type==='item'?null:x);s.board[1]??=source('chart');
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

test('levels give a chest with a driftwood crate of a generator you have',()=>{
 const s=fresh(0);s.level.xp=19;const e=s.energy,r=ok(s,{type:'merge',from:7,to:8});
 assert.equal(r.levelUp[0].level,2);assert.equal(r.levelUp[0].family,'rig');assert.equal(s.board.filter(x=>x?.type==='cargo').length,40);
 assert.equal(s.energy,e+10);
});

test('energy refills over time and a low-energy ration helps once an hour',()=>{
 const s=fresh(0);s.energy=0;s.energyAt=0;tick(s,10*60*1000);assert.equal(s.energy,5);
 const t=fresh(0);t.energy=2;ok(t,{type:'ration'},1000);assert.equal(t.energy,10);t.energy=1;refused(t,{type:'ration'});
});

test('saves round-trip; anything malformed starts a new camp',()=>{
 const s=fresh(0);ok(s,{type:'merge',from:7,to:8});s.board[1]=kit('chart',2);s.board[0].level=3;
 const back=load(JSON.stringify(s),5);assert.deepEqual(back.board,s.board);assert.deepEqual(back.orders,s.orders);assert.equal(back.moves,1);
 const bad=[x=>x.version=4,x=>x.board[20]={type:'water'},x=>x.board[20]={type:'cargo'},x=>x.board[20]=cargo({family:'gold',tier:0}),x=>x.board[20]=cargo({family:'rig',tier:1},item('rig',5)),x=>x.board[20]=cargo({family:'rig',tier:1},{type:'kit',family:'zz',size:1,left:3}),x=>x.board[20]=cargo({family:'rig',tier:1},{type:'stars',n:0}),x=>x.board[20]=cargo({family:'rig',tier:1},source('nope')),x=>x.board.pop(),x=>x.board[2]={type:'item',family:'gold',tier:0},x=>x.board[2]={type:'crate',kind:'salvage',left:3},x=>x.stars=-1,x=>x.orders.pop(),x=>x.orders[0].who='zed',x=>x.done.push('nowhere'),x=>x.slots=5,x=>x.taps.rig=-1,x=>x.board[0].level=9];
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

test('crates are named for the coast; merges and feeding work as before',()=>{
 assert.deepEqual(CRATES,['Driftwood crate','Sea chest','Captain\'s trunk']);
 assert.equal(nameOf(kit('rig',1)),'Driftwood crate · Rivet Rover');assert.equal(nameOf(kit('chart',3)),'Captain\'s trunk · Survey Kite');
 const s=fresh(0);s.board[1]=kit('rig',3);s.board[6]=kit('rig',3);assert.match(act(s,{type:'merge',from:1,to:6},1).message,/as big as crates get/);
});

test('cargo opens only with the part it shows, only at the edge of open ground; the part is used up',()=>{
 const s=fresh(0);
 // 14 holds a star pouch and opens with a Grip tool; it touches the camp.
 assert.deepEqual(s.board[14].key,{family:'rig',tier:1});
 refused(s,{type:'merge',from:7,to:14});// a Copper offcut is the wrong part
 refused(s,{type:'move',from:7,to:3});refused(s,{type:'openKit',index:3});refused(s,{type:'recycle',index:3});
 const stars=s.stars,r=ok(s,{type:'merge',from:13,to:14});
 assert.equal(r.event,'unseal');assert.equal(s.board[13],null,'the key is used');assert.equal(s.board[14],null,'a star pouch leaves the space free');assert.equal(s.stars,stars+2);assert.equal(r.xp,2);
 // 4 is buried deeper: it opens only once a crate beside it is open.
 s.board[1]=item('rig',1);assert.match(refused(s,{type:'unseal',from:1,index:4}).message,/deeper/);
 let e=s.energy;const k=ok(s,{type:'unseal',from:1,index:3});assert.equal(k.opened.type,'jar');assert.equal(s.energy,e+5);
 s.board[1]=item('rig',1);e=s.energy;ok(s,{type:'unseal',from:1,index:4});assert.equal(s.energy,e+5);assert.equal(s.board[4],null);
 s.board[1]=item('rig',2);ok(s,{type:'unseal',from:1,index:9});assert.deepEqual(s.board[9],item('rig',1));
 s.board[1]=item('rig',2);ok(s,{type:'unseal',from:1,index:19});assert.deepEqual(s.board[19],kit('rig',1));
 assert.equal(s.board.filter(x=>x?.type==='cargo').length,35);
});

test('one generator, one chain; each new generator comes out of cargo opened with the previous one\'s parts',async()=>{
 const {GENERATOR_CHAINS,CHAINS}=await import('../v5/next/chains.mjs');
 for(const g of Object.keys(GENERATOR_CHAINS)){assert.equal(GENERATOR_CHAINS[g].length,1);assert.equal(CHAINS[GENERATOR_CHAINS[g][0][0]].gen,g);}
 assert.deepEqual(GENERATOR_ORDER,['rig','chart','rope','shell','lamp']);
 const where=Object.entries(CARGO).filter(([,c])=>c[2].type==='source').map(([i,c])=>[c[2].id,c[0]]);
 assert.deepEqual(Object.fromEntries(where),{chart:'rig',rope:'chart',shell:'rope',lamp:'rope'},'each generator opens with an earlier generator\'s part');
 // Every cargo key comes from a generator that is on the board or sealed in cargo.
 for(const [,c] of Object.entries(CARGO))assert.ok(GENERATOR_ORDER.includes(CHAINS[c[0]].gen));
 // Play it through: open the Kite cargo, tap the Kite, its single chain comes out.
 // The Survey Kite is one crate in from the camp: open a crate beside the camp first.
 const s=fresh(0);assert.ok(!cargoKeys(s).some(k=>k.index===10),'the Kite cargo is not at the camp edge');
 s.board[1]=item('rig',2);ok(s,{type:'unseal',from:1,index:9});assert.ok(cargoKeys(s).some(k=>k.index===10),'opening a crate shows the keys of the crates behind it');
 s.board[1]=item('rig',1);const r=ok(s,{type:'unseal',from:1,index:10});
 assert.deepEqual(r.opened,{index:10,type:'source',id:'chart'});assert.equal(sourceOpen(s,'chart'),true);
 for(let n=0;n<8;n++){const p=ok(s,{type:'produce',id:'chart'});assert.equal(s.board[p.index].family,'chart');s.board[p.index]=null;}
 refused(s,{type:'produce',id:'rope'});
});

test('cargo keys grow harder away from the camp and every generator is reachable',()=>{
 const s=fresh(0),keys=cargoKeys(s);
 assert.deepEqual(keys.map(k=>k.index),[3,9,14,19,24],'only the crates touching the camp show their keys');
 assert.ok(keys.every(k=>k.family==='rig'&&k.tier>=1&&k.tier<=2),'next to the camp: Grip tools and Split spanners');
 assert.deepEqual(CARGO[42].slice(0,2),['lamp',4],'the far corner needs a Beacon lens');
 // A scripted player finds every generator during Landing Beach.
 const t=fresh(0);let now=0;const found=[];
 while(!t.done.includes('beach-cliff')&&now<60*60*1000){tick(t,now);const a=nextAction(t);if(!a){now+=30000;continue;}const r=ok(t,a,now);now+=6000;if(r.opened?.type==='source')found.push([r.opened.id,+(now/60000).toFixed(1)]);}
 assert.deepEqual(found.map(f=>f[0]),['chart','rope','shell','lamp']);
 assert.ok(found[0][1]<6,'the Survey Kite within the first minutes');
 assert.ok(t.board.some(x=>x?.type==='cargo'),'some cargo is still sealed when the beach is restored');
 console.log(JSON.stringify({generatorsFoundAt:found,sealedLeft:t.board.filter(x=>x?.type==='cargo').length}));
});

test('build-4 (tide) and build-3 (sand) saves load as sealed cargo, keeping everything',()=>{
 // A build-4 save: water with finds, the Kite and Crucible standing on the board, two places restored.
 const v2=fresh(0);v2.version=2;
 v2.board=v2.board.map((x,i)=>x?.type==='cargo'?{type:'water',...(i%3?{find:{type:'item',family:'rig',tier:1}}:{})}:x);
 v2.board[5]={type:'source',id:'chart'};v2.board[30]={type:'source',id:'flux'};v2.board[9]=item('rig',2);
 v2.done=['beach-path','beach-tent'];v2.moves=33;v2.stars=5;delete v2.taps.rope;delete v2.taps.shell;delete v2.taps.lamp;
 const s=load(JSON.stringify(v2),5);
 assert.equal(s.version,3);assert.equal(s.moves,33,'the camp is kept');assert.equal(s.stars,5);
 assert.ok(!s.board.some(x=>x?.type==='water'));assert.deepEqual(s.board[9],item('rig',2));
 assert.equal(s.board[5].type,'source');assert.equal(s.board[20].type,'cargo');assert.deepEqual(s.board[20].key,{family:CARGO[20][0],tier:CARGO[20][1]});
 for(const g of ['rope','shell','lamp'])assert.equal(s.board.filter(x=>x?.type==='cargo'&&x.find?.type==='source'&&x.find.id===g).length,1,g+' is sealed somewhere');
 // A build-3 save goes through the same step.
 const v1=structuredClone(v2);v1.version=1;v1.board=v1.board.map((x,i)=>x?.type==='water'?(i>=36?{type:'gate',level:3}:{type:'sand',...(x.find?{find:x.find}:{})}):x);
 const t=load(JSON.stringify(v1),5);assert.equal(t.version,3);assert.equal(t.moves,33);assert.ok(!t.board.some(x=>['sand','gate','water'].includes(x?.type)));
});
