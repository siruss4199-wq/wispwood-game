// Chapter 2 integration (docs/V5_CHAPTER2_INTEGRATION_2026-10-28.md), rules and saves.
// Build 47b: Chapter 1's finale, the Vault door (from PR #80): a finished Chapter 1 save, also one
// that already saw the old ending, continues into it with its gold order ready; three rings, the
// inner one with its own materials; turning it completes Chapter 1. Story cards are seen once.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,load,act,item,allDone,upgrades,currentArea,stageOf,blockedStage,bookKeys,BOOK_CHAINS,newestGenerator,makeOrder} from '../v5/next/game.mjs';
import {AREAS,STAGES,TASKS} from '../v5/next/areas.mjs';
const TASK=id=>TASKS[id];

const ok=(s,a,now=1000)=>{const r=act(s,a,now);assert.ok(r.ok,JSON.stringify(a)+' '+r.message);return r;};
const done=a=>Object.fromEntries(a.tasks.map(t=>[t.id,3]));
// A camp as Build 46 left it at the end of Chapter 1: both areas built, sitting at the worksite.
function chapter1Done({seenEnd}={}){
 const s=fresh(0);s.area=1;s.built={...done(AREAS[0]),...done(AREAS[1])};s.materials={...s.built};s.coins=1234;s.moves=900;s.ordersDone=80;
 s.daily={day:9e6,count:1};if(seenEnd!==undefined)s.seenEnd=seenEnd;
 // a Build 46 save has neither field
 delete s.pending;delete s.seen;
 return s;
}

test('a finished Chapter 1 save goes on to the Vault door, with its gold order ready', ()=>{
 for(const seenEnd of [true,false,undefined]){
  const old=chapter1Done({seenEnd}),board=JSON.stringify(old.board),raw=JSON.stringify(old);
  const s=load(raw,5000);
  assert.equal(s.area,2,`seenEnd ${seenEnd}: at the Vault Entrance`);assert.equal(currentArea(s).id,'entrance');
  assert.notEqual(s.seenEnd,true,'the old ending no longer marks the end');
  assert.equal(allDone(s),false);assert.equal(JSON.stringify(s.board),board,'board unchanged');assert.equal(s.coins,1234);assert.equal(s.moves,900);
  assert.deepEqual([s.pending,s.seen],[[],{}]);
  assert.deepEqual(upgrades(s).map(u=>[u.id,u.stage,u.cost]),[['vault-door',1,240]]);
  const gold=s.orders.filter(o=>o?.story);assert.equal(gold.length,1);assert.equal(gold[0].story,'vault-door');
  // loading again changes nothing more
  assert.equal(JSON.stringify(load(JSON.stringify(s),6000).orders),JSON.stringify(s.orders));
 }
});

test('a camp partway through Chapter 1 is untouched', ()=>{
 const old=fresh(0);old.area=1;old.built={...done(AREAS[0]),'ws-camp':2};old.materials={...old.built};old.moves=500;delete old.pending;delete old.seen;
 const s=load(JSON.stringify(old),5000);assert.equal(s.area,1);assert.deepEqual(s.built,old.built);
});

test('the Vault door: three rings, 840 coins, the inner ring wants a Signal lamp and a Bearing dial', ()=>{
 const t=AREAS[2].tasks;assert.deepEqual(t.map(x=>x.id),['vault-door']);
 const st=t[0].stages;assert.deepEqual(st.map(x=>x.cost),[240,280,320]);assert.deepEqual(st[2].gold,[['lamp',3,1],['chart',4,1]]);
 const s=load(JSON.stringify(chapter1Done()),5000);s.coins=5000;
 // each ring needs its gold order's materials first
 assert.match(act(s,{type:'restore',id:'vault-door'},6000).message,/materials/);
 // as a player does: deliver the ring's gold order (its parts laid on the board), then turn it
 const deliverGold=()=>{const o=s.orders.find(x=>x?.story==='vault-door');assert.ok(o,'a gold order for the next ring');
  const free=s.board.reduce((a,x,i)=>x===null||x.type==='cargo'?[...a,i]:a,[]);let k=0;
  for(const r of o.needs)for(let c=0;c<r.count;c++)s.board[free[k++]]=item(r.family,r.tier);
  ok(s,{type:'deliver',id:o.id});return o;};
 deliverGold();ok(s,{type:'restore',id:'vault-door'});
 deliverGold();ok(s,{type:'restore',id:'vault-door'});
 const gold=deliverGold();assert.deepEqual(gold.needs,[{family:'lamp',tier:3,count:1},{family:'chart',tier:4,count:1}],'the inner ring asks exactly its authored materials');
 const r=ok(s,{type:'restore',id:'vault-door'});
 // Build 47d: the open Vault leads into Chapter 2 (the Tide Archive first)
 assert.equal(stageOf(s,'vault-door'),STAGES);assert.ok(r.effects.areaDone);assert.equal(r.effects.nextArea,'vault');assert.equal(s.area,3);
 assert.equal(allDone(s),false,'Chapter 2 lies ahead');
 const gold2=s.orders.filter(o=>o?.story);assert.equal(gold2.length,1);assert.equal(gold2[0].story,'vault-archive','the archive\'s gold order, not a stale door one');
});

test('story cards are seen once, kept in the save, and checked when loaded', ()=>{
 const s=fresh(0);ok(s,{type:'seen',id:'door'});assert.deepEqual(s.seen,{door:true});
 assert.match(act(s,{type:'seen',id:'door'}).message,/Already/);assert.equal(act(s,{type:'seen',id:'Bad Id!'}).ok,false);
 const t=load(JSON.stringify(s),2000);assert.deepEqual(t.seen,{door:true});
 const bad=fresh(0);bad.moves=4;bad.seen={door:'yes'};assert.equal(load(JSON.stringify(bad),2000).moves,0,'a damaged seen list is not trusted');
});

test('the door\'s crate reward on a full board waits (Build 47a still holds)', ()=>{
 const s=load(JSON.stringify(chapter1Done()),5000);s.coins=5000;s.materials['vault-door']=2;s.built['vault-door']=1;
 for(let i=0;i<s.board.length;i++)if(s.board[i]===null)s.board[i]=item('rig',0);
 const r=ok(s,{type:'restore',id:'vault-door'});assert.equal(r.effects.kit,-1);assert.equal(s.pending.length,1);assert.equal(s.pending[0].type,'kit');assert.equal(s.pending[0].size,3);
});

// Build 47d: the Tide Archive, a short bridge inside the Vault: one place, three stages, gold orders
// for the late generators' parts (Lantern Kiln, Shell Trap), and no new chain or level gate.
test('the Tide Archive: three stages for the Lantern Kiln and the Shell Trap, then the Observatory', ()=>{
 const a=AREAS[3];assert.equal(a.id,'vault');assert.equal(a.name,'The Silent Observatory');
 const t=a.tasks[0];assert.equal(t.id,'vault-archive');assert.equal(t.name,'Light the archive');
 assert.deepEqual(t.stages.map(x=>x.cost),[100,120,140]);
 assert.deepEqual(t.stages.map(x=>x.gold),[[['lamp',2,2]],[['shell',3,1],['lamp',3,1]],[['shell',4,1],['lamp',2,1]]]);
 assert.ok(t.stages.every(x=>!x.level&&!x.requires),'no level gate');
 const s=fresh(0);s.area=2;s.built={...done(AREAS[0]),...done(AREAS[1]),'vault-door':3};s.materials={...s.built};s.coins=5000;s.daily={day:9e6,count:1};
 const t2=load(JSON.stringify(s),5000);assert.equal(t2.area,3,'a camp whose door is open (Build 47b) moves into the Vault');
 const deliverGold=()=>{const o=t2.orders.find(x=>x?.story==='vault-archive');assert.ok(o);
  const free=t2.board.reduce((acc,x,i)=>x===null||x.type==='cargo'?[...acc,i]:acc,[]);let k=0;
  for(const r of o.needs)for(let c=0;c<r.count;c++)t2.board[free[k++]]=item(r.family,r.tier);ok(t2,{type:'deliver',id:o.id});return o;};
 for(let st=0;st<3;st++){const o=deliverGold();assert.deepEqual(o.needs.map(r=>[r.family,r.tier,r.count]),t.stages[st].gold);ok(t2,{type:'restore',id:'vault-archive'});}
 // Build 47e: the index read opens the Observatory's hall (in the same area: no new area, no level gate)
 assert.equal(allDone(t2),false,'the Observatory follows');assert.equal(t2.area,3);
 assert.deepEqual(upgrades(t2).map(u=>[u.id,u.stage]),[['obs-hall',1]]);
});

// Build 47e: the Silent Observatory itself, PR #80's five places after the archive.
const OBS=['obs-hall','obs-desk','obs-bench','obs-array','obs-passage'];
// A camp as Build 47d left it: the archive read, the end card seen.
function archiveRead(){
 const s=fresh(0);s.area=3;s.built={...done(AREAS[0]),...done(AREAS[1]),'vault-door':3,'vault-archive':3};s.materials={...s.built};s.coins=20000;s.daily={day:9e6,count:1};s.seenEnd=true;
 return load(JSON.stringify(s),5000);
}

test('a camp that read the archive (Build 47d\'s end) goes on into the Observatory', ()=>{
 const s=archiveRead();assert.notEqual(s.seenEnd,true,'the old end no longer marks the end');assert.equal(allDone(s),false);
 const gold=s.orders.filter(o=>o?.story);assert.equal(gold.length,1);assert.equal(gold[0].story,'obs-hall','the hall\'s gold order is ready');
 assert.equal(JSON.stringify(load(JSON.stringify(s),6000).orders),JSON.stringify(s.orders),'loading again changes nothing more');
});
// As a player does, with coins to spare: the next stage's gold order delivered (its parts laid on
// the board), then the stage bought; parts and rewards the board cannot hold are cleared off first.
function buyNext(s,log){
 const free=()=>s.board.reduce((a,x,i)=>x===null||x.type==='cargo'?[...a,i]:a,[]);
 const u=upgrades(s)[0];if(!u)return null;
 if(!u.materials){const o=s.orders.find(x=>x?.story===u.id);assert.ok(o,`a gold order for ${u.id} ${u.stage}`);
  const f=free();let k=0;for(const r of o.needs)for(let c=0;c<r.count;c++)s.board[f[k++]]=item(r.family,r.tier);ok(s,{type:'deliver',id:o.id});log.gold.push([u.id,u.stage,o.needs.map(r=>r.family+r.tier+'x'+r.count).join('+')]);}
 const r=ok(s,{type:'restore',id:u.id});log.stages.push([u.id,u.stage]);
 for(let i=0;i<s.board.length;i++)if(s.board[i]?.type==='item'&&free().length<6)s.board[i]=null;
 return r;
}

test('the Observatory opens only after the archive index is read; the hall says why it waits', ()=>{
 const s=archiveRead();s.built['vault-archive']=2;s.materials['vault-archive']=2;
 assert.ok(!upgrades(s).some(u=>u.id==='obs-hall'),'not before the index');
 assert.deepEqual(blockedStage(s,'obs-hall'),{stage:1,name:'Light the entrance hall',requires:{'vault-archive':3}});
 assert.match(act(s,{type:'restore',id:'obs-hall'},6000).message,/opens once Read the archive index is done/);
 const t=archiveRead();assert.equal(blockedStage(t,'obs-hall'),null);assert.deepEqual(upgrades(t).map(u=>u.id),['obs-hall']);
});

test('the Observatory: Lens Bench copies, optic gold, cogs, the sea gate waits for the array, then the chapter ends', ()=>{
 const s=archiveRead(),log={gold:[],stages:[]},rewards=[];
 const t=AREAS[3].tasks.slice(1);assert.deepEqual(t.map(x=>x.id),OBS);
 assert.equal(AREAS[3].focus,'optic');assert.equal(AREAS[3].tasks.flatMap(x=>x.stages.map(y=>y.cost)).reduce((a,b)=>a+b),2970);
 // the authored gold orders are the array's and the sea gate's, as in PR #80
 assert.deepEqual(TASK('obs-array').stages.map(x=>x.gold),[[['optic',2,1],['lamp',2,2]],[['optic',3,1],['chart',4,1]],[['optic',4,1],['lamp',3,1]]]);
 assert.deepEqual(TASK('obs-passage').stages[2].requires,{'obs-array':3});
 let guard=0;
 while(!allDone(s)&&guard++<40){
  // the sea gate's last stage waits for the array, whatever else is left
  if(stageOf(s,'obs-passage')===2&&stageOf(s,'obs-array')<3)assert.ok(!upgrades(s).some(u=>u.id==='obs-passage'));
  const r=buyNext(s,log);assert.ok(r,'never stuck: '+JSON.stringify(upgrades(s)));rewards.push([r.task,r.stage,r.effects]);
 }
 assert.equal(allDone(s),true);assert.equal(s.area,3,'the Hidden Harbour is listed, never entered');assert.ok(!s.orders.some(o=>o?.story),'no gold order left');
 assert.equal(log.stages.length,15);
 // the bench gives two Lens Benches (on the board, or waiting), the array a cog and the tunnel a cog
 const benches=[...s.board,...s.pending].filter(x=>x?.type==='source'&&x.id==='optic').length;assert.equal(benches,2,'two Lens Benches');
 assert.equal(newestGenerator(s),'optic','the Lens Bench is the newest generator');
 assert.equal(rewards.filter(([,,e])=>e.cog!==undefined).length,2,'two Brass cogs');
 // after the bench, the Observatory's own gold orders ask for optics
 const after=log.gold.filter(([id])=>id==='obs-array'||id==='obs-passage');assert.ok(after.every(([,,n])=>/optic/.test(n)),JSON.stringify(after));
});

test('with every generator out, about half of the Observatory\'s everyday orders start with optics (its focus)', ()=>{
 const s=archiveRead();for(const id of ['chart','rope','shell','lamp','flux','optic']){const i=s.board.findIndex(x=>x===null||x.type==='cargo');s.board[i]={type:'source',id};}
 let optic=0,any=0;for(let n=0;n<100;n++){s.orderSeq=200+n;const o=makeOrder(s);assert.ok(!o.story);if(o.needs[0].family==='optic')optic++;if(o.needs.some(r=>r.family==='optic'))any++;}
 assert.ok(optic>=35&&optic<=70,`orders starting with optics: ${optic} of 100`);assert.ok(any<90,`orders with optics anywhere: ${any} of 100`);
});

test('the Lens Bench: an older save (no optic taps) loads, and its book page has six parts', ()=>{
 const s=archiveRead();delete s.taps.optic;const raw=JSON.stringify(s);
 const t=load(raw,9000);assert.equal(t.moves,s.moves);assert.equal(t.taps.optic,0);assert.deepEqual(t.built,s.built);
 assert.ok(BOOK_CHAINS.includes('optic'));assert.deepEqual(bookKeys('optic'),['optic0','optic1','optic2','optic3','optic4','optic5']);
 // a bench taps out its first part
 let i=t.board.findIndex(x=>x===null);t.board[i]={type:'source',id:'optic',level:1};t.energy=30;const r=ok(t,{type:'produce',id:'optic'},9500);
 assert.ok(t.board.some(x=>x?.type==='item'&&x.family==='optic'&&x.tier===0),JSON.stringify(r.message??''));
});
