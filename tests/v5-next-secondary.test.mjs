// Coast Camp secondary chains, pilot (2026-10-29; docs/V5_SECONDARY_PILOT_2026-10-29.md): the Rivet
// Rover's Mechanisms and the Survey Kite's Expedition records. Saves from before the pilot, both
// chains' merges, the bonus drop and its bad-luck limit across a reload, a full board, order demand
// and pricing, the book, and no duplicated rewards.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,act,load,item,source,nameOf,priceOf,orderPrice,COIN_VALUE,BOOK_CHAINS,bookKeys,bookReady,pageReady,SECONDARY_RULES,SECONDARY_ORDERS,SECONDARY_OF,isSecondary,secondaryOn,secondaryPaused,secondaryHeld,secondaryTier,secondaryNeed,allDone,ROVER,MAX_ENERGY} from '../v5/next/game.mjs';
import {CHAINS,maxTier} from '../v5/next/chains.mjs';
import {artFit} from '../v5/next/art-fit.mjs';
import {primaryAction} from '../v5/next/guide.mjs';
import {nextAction} from './v5-next-policy.mjs';

const ok=(s,a,now=1000)=>{const r=act(s,a,now);assert.equal(r.ok,true,JSON.stringify(a)+' '+r.message);return r;};
const fixture=n=>readFileSync(new URL(`./fixtures/coast/${n}.json`,import.meta.url),'utf8');
// A camp past the first lessons: the Rover's secondary is open (four orders delivered).
const opened=()=>{const s=fresh(0);s.ordersDone=SECONDARY_RULES.rig.orders;return s;};
const cells=s=>s.board.flatMap((x,i)=>x===null?[i]:[]);
const tapRover=(s,now)=>ok(s,{type:'produce',id:'rig',index:ROVER},now);
const secondaries=s=>[...s.board,...s.pending,...s.shed].filter(x=>x?.type==='item'&&isSecondary(x.family)).length;

test('two secondary chains, registered apart from the primary ones and the rest still prepared only',()=>{
 assert.deepEqual(CHAINS.mech,{gen:'rig',secondary:true,names:['Bolt','Gear','Gear assembly','Hand-crank mechanism']});
 assert.deepEqual(CHAINS.notes,{gen:'chart',secondary:true,names:['Note fragment','Expedition note','Travel notebook','Captain\'s logbook']});
 assert.deepEqual(SECONDARY_OF,{rig:'mech',chart:'notes'},'the Rover and the Kite only: the Winch, Shell Trap and Kiln sets stay unregistered');
 for(const f of ['mech','notes']){assert.doesNotMatch(f,/\d/,'no digits in a family id (book keys are family + tier)');assert.equal(maxTier(f),3);}
 // no name is shared with another part, and the primary chains are untouched
 const names=Object.values(CHAINS).flatMap(c=>c.names);assert.equal(new Set(names).size,names.length,'every part name is its own');
 assert.equal(CHAINS.rig.names[0],'Copper offcut');assert.equal(CHAINS.chart.names[0],'Ink scrap');
 // each part has painted, measured board art
 for(const f of ['mech','notes'])for(let t=0;t<4;t++)assert.ok(artFit(`${f}-${t}`),`${f}-${t} is measured`);
 assert.deepEqual(BOOK_CHAINS.slice(-2),['mech','notes']);
});

test('saves from before the pilot load without a reset and keep everything',()=>{
 for(const name of ['coast-ch1-pre-secondary','coast-ch2-pre-secondary']){
  const raw=fixture(name),old=JSON.parse(raw);assert.equal(old.secSince,undefined,'made by the engine before the pilot (cc63b84)');
  const s=load(raw,old.lastAt+1000);
  for(const k of ['board','coins','built','found','orders','ordersDone','moves','area','taps','book','shed','materials'])assert.deepEqual(s[k],old[k],`${name}: ${k} kept`);
  assert.deepEqual(s.secSince,{rig:0,chart:0},'the bad-luck counters start at 0');
  // and it plays on: the next everyday orders and taps work
  const r=act(s,{type:'produce',id:'rig'},old.lastAt+2000);assert.ok(r.ok||/full|energy/i.test(r.message),r.message);
 }
 // A damaged counter only restarts that count; it never resets the camp.
 const s=fresh(0);s.moves=40;s.secSince={rig:-3,chart:'x',flux:4};const back=load(JSON.stringify(s),5);
 assert.equal(back.moves,40);assert.deepEqual(back.secSince,{rig:0,chart:0});
});

test('both chains merge up to their top part, which merges no further',()=>{
 for(const f of ['mech','notes']){
  const s=fresh(0);s.board[15]=item(f,0);s.board[20]=item(f,0);
  for(let t=0;t<3;t++){s.board[15]=item(f,t);s.board[20]=item(f,t);const r=ok(s,{type:'merge',from:15,to:20});assert.deepEqual(s.board[20],item(f,t+1));assert.ok(r.found?.includes(f+(t+1))||s.found.includes(f+(t+1)));}
  s.board[15]=item(f,3);s.board[20]=item(f,3);const r=act(s,{type:'merge',from:15,to:20},1000);assert.equal(r.ok,false);assert.match(r.message,/top of its chain/);
  // secondary parts never merge with primary ones of the same tier
  s.board[15]=item(f,1);s.board[20]=item(CHAINS[f].gen,1);assert.equal(act(s,{type:'merge',from:15,to:20},1000).ok,false);
 }
});

test('the bonus drop: the tap\'s own part and, sometimes, a secondary as well, for one energy',()=>{
 const s=opened();assert.equal(secondaryOn(s,'rig'),true);assert.equal(secondaryOn(s,'chart'),false,'the Kite is not out');
 let now=1000,first=-1;
 for(let n=1;n<=SECONDARY_RULES.rig.first;n++){const e=s.energy,r=tapRover(s,now+=1000);assert.equal(s.energy,e-1,'one energy a tap, drop or not');
  assert.equal(s.board[r.index].family,'rig','the tap always makes its own part');
  if(r.secondary){first=n;assert.deepEqual(s.board[r.secondary.index],item('mech',0));assert.match(r.message,/and a Bolt/);break;}
  // tidy so the board never fills in this test
  s.board[r.index]=null;}
 assert.ok(first>=1&&first<=SECONDARY_RULES.rig.first,`the first Bolt within ${SECONDARY_RULES.rig.first} taps (${first})`);
 assert.ok(s.found.includes('mech0'));assert.equal(s.secSince.rig,0);
 // no secondary before the first lessons are over
 const early=fresh(0);for(let n=0;n<10;n++){const r=tapRover(early,1000+n);assert.equal(r.secondary,undefined);early.board[r.index]=null;}
 assert.equal(early.secSince.rig,0);
});

test('bad-luck limit: never more than `pity` taps without a drop, and the count survives a reload',()=>{
 const R=SECONDARY_RULES.rig,save={...R};
 try{
  R.chance=0;// only the limit can drop: the worst luck there is
  const s=opened();s.found.push('mech0');let now=1000;const gaps=[];let since=0;
  for(let n=0;n<60;n++){s.energy=MAX_ENERGY;const r=tapRover(s,now+=1000);s.board[r.index]=null;since++;
   if(r.secondary){gaps.push(since);since=0;if(r.secondary.index>=0)s.board[r.secondary.index]=null;}
   // reload in the middle of a dry run: the counter comes back as it was
   if(n===20){const before=s.secSince.rig,back=load(JSON.stringify(s),now);assert.equal(back.secSince.rig,before);Object.assign(s,back);}}
  assert.ok(gaps.length>=4);assert.ok(gaps.every(g=>g===R.pity),`a drop exactly every ${R.pity} taps at worst: ${gaps}`);
 }finally{Object.assign(R,save);}
 // The roll is the tap's own number: reloading cannot re-roll a tap.
 const a=opened(),b=opened();a.found.push('mech0');b.found.push('mech0');let now=1000;
 const runA=[],runB=[];
 for(let n=0;n<40;n++){a.energy=50;const r=tapRover(a,now+=1000);a.board[r.index]=null;if(r.secondary?.index>=0)a.board[r.secondary.index]=null;runA.push(!!r.secondary);}
 for(let n=0;n<40;n++){b.energy=50;const r=tapRover(b,now+=1000);b.board[r.index]=null;if(r.secondary?.index>=0)b.board[r.secondary.index]=null;runB.push(!!r.secondary);if(n%7===3)Object.assign(b,load(JSON.stringify(b),now));}
 assert.deepEqual(runB,runA,'the same taps drop with or without reloads');
});

test('a full board: no tap, no energy, no counter; a drop with no space waits and lands once',()=>{
 const s=opened();s.found.push('mech0');s.secSince.rig=SECONDARY_RULES.rig.pity-1;// the next tap with room drops
 for(const i of cells(s))s.board[i]=item('rope',0);
 const before=JSON.stringify(s),r=act(s,{type:'produce',id:'rig',index:ROVER},1000);
 assert.equal(r.ok,false);assert.match(r.message,/board is full/);assert.equal(JSON.stringify(s),before,'nothing spent, rolled or counted');
 // one space: the tap's part takes it, the Bolt waits with the rewards
 s.board[15]=null;const e=s.energy,t=tapRover(s,2000);
 assert.equal(s.energy,e-1);assert.deepEqual(s.board[15],item('rig',t.index===15?s.board[15].tier:0));assert.equal(t.secondary.index,-1);
 assert.deepEqual(s.pending,[item('mech',0)]);assert.equal(secondaries(s),1);
 // it survives a reload and lands once, after the next action that frees a space
 const back=load(JSON.stringify(s),3000);assert.deepEqual(back.pending,[item('mech',0)]);
 back.board[27]=item('rope',0);back.board[28]=item('rope',0);
 const m=ok(back,{type:'merge',from:27,to:28},4000);assert.equal(m.arrived?.length,1);assert.deepEqual(back.board[m.arrived[0].index],item('mech',0));
 assert.deepEqual(back.pending,[]);assert.equal(secondaries(back),1,'one Bolt: not lost, not doubled');
});

test('extras pause while three lie unused on the board, and never while an order wants one',()=>{
 const s=opened();s.found.push('mech0');s.board[15]=item('mech',0);s.board[20]=item('mech',1);s.board[22]=item('mech',2);
 s.orders=s.orders.map(o=>({...o,needs:o.needs.filter(r=>!isSecondary(r.family))}));
 assert.equal(secondaryPaused(s,'rig'),true);const since=s.secSince.rig;
 const r=tapRover(s,1000);assert.equal(r.secondary,undefined);assert.equal(s.secSince.rig,since,'paused: nothing rolled or counted');
 s.board[22]=item('mech',3);assert.equal(secondaryPaused(s,'rig'),false,'the chain\'s top is a keepsake and does not count');
 s.board[22]=item('mech',2);s.orders[0]={...s.orders[0],needs:[{family:'mech',tier:2,count:1}]};assert.equal(secondaryPaused(s,'rig'),false,'an order waits for one');
});

test('recycling a secondary part gives no energy (a bonus drop never pays energy)',()=>{
 const s=fresh(0);s.energy=10;s.board[15]=item('mech',0);s.board[20]=item('rig',0);
 const a=ok(s,{type:'recycle',index:15});assert.equal(a.energy,0);assert.equal(s.energy,10);assert.doesNotMatch(a.message,/energy/);
 const b=ok(s,{type:'recycle',index:20});assert.equal(b.energy,1);assert.equal(s.energy,11);
});

test('model A (replace) for the measurements: a secondary instead of the tap\'s part, for the same energy',()=>{
 const R=SECONDARY_RULES.rig,save={...R};
 try{R.model='replace';const s=opened();let now=1000,got=null;
  for(let n=0;n<R.first&&!got;n++){const e=s.energy,r=tapRover(s,now+=1000);assert.equal(s.energy,e-1);if(r.secondary){got=r;assert.deepEqual(s.board[r.index],item('mech',0),'the tap made the Bolt instead');}else s.board[r.index]=null;}
  assert.ok(got);
  R.model='off';const t=opened();for(let n=0;n<30;n++){const r=tapRover(t,1000+n);assert.equal(r.secondary,undefined);t.board[r.index]=null;}
 }finally{Object.assign(R,save);}
});

test('pricing: a secondary part pays as a rarer part, never like a common one of its tier',()=>{
 for(let t=0;t<=2;t++){
  const sec=priceOf([{family:'mech',tier:t,count:1}]),prim=priceOf([{family:'rig',tier:t,count:1}]);
  assert.equal(sec,COIN_VALUE[t+SECONDARY_ORDERS.rarity]);assert.ok(sec>prim,`tier ${t}: ${sec} against ${prim}`);}
 assert.ok(priceOf([{family:'notes',tier:1,count:1}])>priceOf([{family:'chart',tier:1,count:1}]));
 // a generator's level lifts its own parts' pay, not its secondary's
 const s=fresh(0);s.board[ROVER]={...source('rig'),level:3};
 assert.equal(orderPrice(s,[{family:'mech',tier:2,count:1}],'quick'),priceOf([{family:'mech',tier:2,count:1}]));
});

test('demand: secondary orders come after the lessons, one at a time, never gold, asking what the drops can make',()=>{
 // a long scripted run, checking every order as it appears
 const s=fresh(0);let now=0,seen=new Set(),firstSec=null,mixed=0,alone=0,offered=0,delivered=0;
 const secIds=new Set();
 while(!allDone(s)&&now<14*3600e3){
  for(const o of s.orders){if(!o||seen.has(o.id))continue;seen.add(o.id);const sec=o.needs.filter(r=>isSecondary(r.family));
   if(o.story){assert.equal(sec.length,0,'a gold order never asks a secondary part');continue;}
   if(!sec.length)continue;offered++;secIds.add(o.id);firstSec??=s.ordersDone;
   assert.equal(sec.length,1);assert.equal(sec[0].count,1);
   assert.ok(sec[0].tier<=SECONDARY_ORDERS.top,'never the chain\'s top part');
   const gen=CHAINS[sec[0].family].gen;assert.ok(secondaryOn(s,gen),`${sec[0].family} asked only once its generator drops it`);
   // only what the parts already held make: never a drop the player does not have
   assert.ok(2**sec[0].tier<=secondaryHeld(s,sec[0].family),`${JSON.stringify(sec[0])} with ${secondaryHeld(s,sec[0].family)} drops held`);
   assert.equal(s.orders.filter(x=>x?.needs.some(r=>isSecondary(r.family))).length,1,'one secondary order on the board at a time');
   assert.ok(s.orders.some(x=>x&&!x.needs.some(r=>isSecondary(r.family))),'at least one order asks no rare drop');
   if(o.needs.length>1)mixed++;else alone++;
   assert.equal(o.coins,orderPrice(s,o.needs,o.role),'priced by the rules');}
  s.energy=Math.max(s.energy,5);// keep the run moving: this test is about demand, not pacing
  const a=nextAction(s);if(!a){now+=10000;continue;}
  const before=a.type==='deliver'?s.orders.find(o=>o.id===a.id):null;
  ok(s,a,now);now+=5000;if(before&&secIds.has(before.id))delivered++;
 }
 assert.ok(allDone(s),'Chapters 1-2 finish');
 assert.ok(firstSec>=SECONDARY_RULES.rig.orders,`the first secondary order after the lessons (${firstSec} orders delivered)`);
 assert.ok(offered>=6,`secondary orders are asked (${offered})`);assert.ok(mixed>=2&&alone>=1,`mixed (${mixed}) and single (${alone}) secondary orders`);
 assert.ok(delivered>=offered*.6,`most are delivered (${delivered} of ${offered})`);
 for(const k of ['mech0','mech1','notes0'])assert.ok(s.found.includes(k),`${k} found`);
});

test('tier ramp: a Bolt first, bigger parts as the camp grows and the player collects, never more than is held',()=>{
 const s=opened();assert.equal(secondaryTier(s,'mech'),-1,'nothing held: no secondary order');assert.equal(secondaryNeed(s,2,2),null);
 s.board[15]=item('mech',1);assert.equal(secondaryTier(s,'mech'),0,'nothing built yet: a Bolt, even with a Gear on the board');
 s.built={'beach-path':1};assert.equal(secondaryTier(s,'mech'),1,'from the first stage: a Gear (two Bolts held)');
 s.built={'beach-path':3};assert.equal(secondaryTier(s,'mech'),1,'from the third stage, two drops held: still a Gear (a Gear assembly is four)');
 s.board[20]=item('mech',0);assert.equal(secondaryTier(s,'mech'),1,'three drops held: a Gear');
 s.board[22]=item('mech',0);assert.equal(secondaryTier(s,'mech'),2,'four drops held: a Gear assembly');
 s.shed[0]=item('mech',2);s.board[15]=s.board[20]=s.board[22]=null;assert.equal(secondaryTier(s,'mech'),2,'parts in the shed count');
 s.shed[0]=item('mech',3);assert.equal(secondaryTier(s,'mech'),-1,'the top part is a keepsake: it is not held for orders');
});

test('the book: secondary finds stay found after delivery and pay their coins once; their pages pay no cog',()=>{
 const s=fresh(0);s.board[15]=item('mech',0);ok(s,{type:'move',from:15,to:20});assert.ok(s.found.includes('mech0'));
 s.orders[0]={...s.orders[0],needs:[{family:'mech',tier:0,count:1}],role:'quick',story:undefined};delete s.orders[0].story;
 ok(s,{type:'deliver',id:s.orders[0].id});assert.equal(s.board.filter(x=>x?.family==='mech').length,0);assert.ok(s.found.includes('mech0'),'still found after delivery');
 assert.ok(bookReady(s).includes('mech0'));const c=s.coins;ok(s,{type:'book',key:'mech0'});assert.ok(s.coins>c);assert.equal(act(s,{type:'book',key:'mech0'},1000).ok,false,'once');
 s.found.push('mech1','mech2','mech3');for(const k of ['mech1','mech2','mech3'])ok(s,{type:'book',key:k});
 // a generator level stays with the generators' own pages (a secondary page brought the Shell Trap early)
 assert.equal(pageReady(s,'mech'),false);const r=act(s,{type:'bookPage',family:'mech'},1000);assert.equal(r.ok,false);
 assert.equal(bookReady(s).filter(k=>k.startsWith('mech')).length,0,'every Mechanism ticked off');
 assert.deepEqual(bookKeys('notes'),['notes0','notes1','notes2','notes3']);
 const back=load(JSON.stringify(s),5000);assert.deepEqual(back.book,s.book);assert.deepEqual(back.found,s.found);
});

test('a delivered secondary order pays once, and the hint names the drop as the rare extra it is',()=>{
 const s=opened();s.board[15]=item('mech',0);s.orders[1]={id:'oX',who:'ivo',needs:[{family:'mech',tier:0,count:1}],coins:priceOf([{family:'mech',tier:0,count:1}]),role:'quick',born:0};
 const c=s.coins,n=s.ordersDone,r=ok(s,{type:'deliver',id:'oX'});assert.equal(s.coins,c+r.coins);assert.equal(s.ordersDone,n+1);
 assert.equal(act(s,{type:'deliver',id:'oX'},1000).ok,false,'the order is gone');
 const t=opened();t.orders=[{id:'oY',who:'ivo',needs:[{family:'mech',tier:0,count:1}],coins:10,role:'quick',born:0}];
 const p=primaryAction(t,'oY');assert.equal(p.kind,'tap');assert.match(p.label,/Rivet Rover: a Bolt comes now and then/);
 assert.match(nameOf(item('notes',3)),/Captain's logbook/);
});
