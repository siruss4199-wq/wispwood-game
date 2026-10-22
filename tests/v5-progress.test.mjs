// Goal progress and the energy refill clock.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,load,tick,act,item} from '../v5/core.mjs';
import {needProgress,goalProgress} from '../v5/progress.mjs';
import {settleEnergy,refillTimes,clock,REFILL_EVERY,REFILL_CAP} from '../v5/energy.mjs';

const empty=()=>{const s=fresh(0);s.board=s.board.map(x=>x?.type==='source'?x:null);return s;};

test('goal progress counts partial merges toward the needed part',()=>{
 const s=empty(),need=[{family:'rig',tier:2,count:1}];
 assert.equal(needProgress(s,need),0);
 s.board[3]=item('rig',0);assert.equal(needProgress(s,need),25);
 s.board[4]=item('rig',1);assert.equal(needProgress(s,need),75);
 s.board[3]=null;s.board[4]=item('rig',2);assert.equal(needProgress(s,need),100);
 s.board[9]=item('chart',1);assert.equal(needProgress(s,[...need,{family:'chart',tier:2,count:1}]),75,'two needs share one bar');
 assert.equal(needProgress(s,[]),null);
});

test('a part counts toward only one need, and tide treasures only toward tide needs',()=>{
 const s=empty();s.board[3]=item('rig',1);
 assert.equal(needProgress(s,[{family:'rig',tier:1,count:2}]),50);
 s.board[4]=item('chart',1,'tide');
 assert.equal(needProgress(s,[{family:'chart',tier:1,count:1}]),0);
 assert.equal(needProgress(s,[{family:'chart',tier:1,count:1,line:'tide'}]),100);
});

test('builds show saved supplies; the pier counts finished deliveries',()=>{
 const s=fresh(0);s.requests.supplies=6;
 assert.equal(goalProgress(s,{kind:'camp',cost:8,needs:[]}),75);
 s.requests.supplies=20;assert.equal(goalProgress(s,{kind:'camp',cost:8,needs:[]}),100);
 const pier={kind:'camp',name:'Repair the storm-damaged pier',needs:[{family:'rig',tier:1,count:1}]};
 s.camp.earlyFragments=0;assert.equal(goalProgress(s,pier),50,'part ready, no delivery yet');
 s.camp.earlyFragments=1;assert.equal(goalProgress(s,pier),100);
 assert.equal(goalProgress(s,null),null);
});

test('energy refills one point every two minutes up to 50, never retroactively past the cap',()=>{
 const s=fresh(0);s.energy=10;s.energyAt=0;
 assert.equal(settleEnergy(s,REFILL_EVERY-1),0);
 assert.equal(settleEnergy(s,REFILL_EVERY*3+500),3);assert.equal(s.energy,13);assert.equal(s.energyAt,REFILL_EVERY*3,'partial progress toward the next point is kept');
 assert.deepEqual(refillTimes(s,REFILL_EVERY*3+500),{next:REFILL_EVERY-500,full:REFILL_EVERY-500+(REFILL_CAP-14)*REFILL_EVERY});
 assert.equal(tick(s,REFILL_EVERY*1000),REFILL_CAP-13);assert.equal(s.energy,REFILL_CAP);assert.equal(refillTimes(s,0),null);
 s.energy=80;assert.equal(settleEnergy(s,REFILL_EVERY*2000),0);assert.equal(s.energy,80,'rewards above 50 are kept, refills stop');
});

test('the refill clock reads naturally',()=>{
 assert.deepEqual([1000,105000,600000,47*60000,72*60000,120*60000].map(clock),['0:01','1:45','10m','47m','1h 12m','2h']);
});

test('a full bar rests the clock; spending below 50 starts it from that moment',()=>{
 const s=fresh(0);s.energy=REFILL_CAP;s.energyAt=0;
 assert.equal(tick(s,REFILL_EVERY*30),0);assert.equal(s.energyAt,0,'no save churn while full');
 s.board[30]=null;const r=act(s,{type:'produce',id:'rig'},REFILL_EVERY*30);assert.equal(r.ok,true);
 assert.equal(s.energy,REFILL_CAP-1);assert.equal(s.energyAt,REFILL_EVERY*30);
 assert.equal(tick(s,REFILL_EVERY*31-1),0);assert.equal(tick(s,REFILL_EVERY*31),1);
});

test('saves keep the refill clock; older saves start it at load time',()=>{
 const s=fresh(5);s.energyAt=123;assert.equal(load(JSON.stringify(s),999).energyAt,123);
 delete s.energyAt;assert.equal(load(JSON.stringify(s),999).energyAt,999);
 s.energyAt=5000;assert.equal(load(JSON.stringify(s),999).energyAt,999,'a clock in the future is reset');
});
