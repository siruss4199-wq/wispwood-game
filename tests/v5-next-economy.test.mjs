// Coast Camp economy guard (Build 41 M2, rewritten for Build 41h): 8 speeds × 5 seeds through
// both areas, and the first 15 minutes on their own. Not proof of fun: that needs new players.
// Build 41h (user: "story upgrade task bielelt heterhii hurdan ... merge togloh medremj avch
// amjilgui", then choosing a classic free-to-play pace): each stage takes about three minutes of
// play at 5 s/action and energy runs out, so a session is shorter in play than in real time; the
// player comes back for refills or buys the shop's Energy pack with coins. Build 40's guard
// (session length ±15 %, idle ≤ 5 min) no longer applies: waiting for energy is now intended.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../v5/next/game.mjs';
import {nextAction} from './v5-next-policy.mjs';
import {SPEEDS,SEEDS,simulate,summary,quantile} from './v5-next-economy-sim.mjs';
import {primaryAction} from '../v5/next/guide.mjs';

const MIN=60000,HOUR=60*MIN,STAGES=42,until=48*HOUR;
const play=r=>r.total-r.idle;
const runs=SPEEDS.flatMap(sp=>SEEDS.map(sd=>simulate(game,nextAction,sp,sd,{shop:true,until})));
const rows=summary(runs);

test('both areas finish, with or without the shop, within hours of real time',()=>{
 for(const r of runs){const at=`${r.speed} s seed ${r.seed}`;assert.ok(r.finished,`${at}: finished`);assert.ok(r.total<=8*HOUR,`${at}: ${(r.total/HOUR).toFixed(1)} h`);}
 for(const sp of [4,5,10])for(const sd of SEEDS){const w=simulate(game,nextAction,sp,sd,{until});assert.ok(w.finished,`${sp} s seed ${sd}: finished by waiting alone`);assert.ok(w.total<=10*HOUR,`${sp} s seed ${sd}: ${(w.total/HOUR).toFixed(1)} h by waiting alone`);}
});

test('each stage takes a few minutes of play: about 0.7 min per s/action (3.5 at 5 s)',()=>{
 for(const sp of SPEEDS){const R=runs.filter(r=>r.speed===sp),per=R.reduce((a,r)=>a+play(r),0)/R.length/MIN/STAGES;
  assert.ok(per>=sp*.55&&per<=sp*.9,`${sp} s/action: ${per.toFixed(2)} min of play per stage`);}
});

test('energy runs out, and is the reason for waiting, not a stuck board',()=>{
 for(const r of rows){const at=`${r.speed} s/action`;
  assert.ok(r.minEnergy<1,`${at}: energy ran out (lowest ${r.minEnergy})`);
  // While energy is low there is usually something free to do (merge, deliver, open a crate).
  assert.ok(r.lowFreeMin>=.5,`${at}: ${(r.lowFreeMin*100).toFixed(0)}% of low-energy moments have a free move`);}
 // Waiting happens only with energy under 1: the scripted player is never idle with energy in hand.
 for(const r of runs)assert.ok(r.longestIdle<=3*MIN,`${r.speed} s seed ${r.seed}: idle ${(r.longestIdle/MIN).toFixed(1)} min at a time`);
});

test('orders and restorations keep coming',()=>{
 for(const r of rows){const at=`${r.speed} s/action`;
  assert.ok(r.orderMedianMax<=Math.max(5,r.speed*.9),`${at}: order median ${r.orderMedianMax.toFixed(1)} min`);
  assert.ok(r.restoreGapMedianMax<=r.speed*1.4,`${at}: median gap between restorations ${r.restoreGapMedianMax.toFixed(1)} min`);}
 for(const r of runs)assert.ok(r.orderAges.length>=60,`${r.speed} s seed ${r.seed}: ${r.orderAges.length} orders delivered`);
});

// Build 41g: Rover copies from the early stages bring the Survey Kite out; Build 41h's slower
// stages put it at about 2.7 min per s/action of real time (13 min at 5 s).
test('generators arrive on time and the Lantern Kiln before the worksite ends',()=>{
 for(const r of rows){assert.ok(r.kiteMax<=r.speed*3,`${r.speed} s: Survey Kite at ${r.kiteMax.toFixed(1)} min`);assert.ok(r.kilnBeforeEnd,`${r.speed} s: Lantern Kiln before the end`);}
 for(const r of rows)assert.ok(r.tapsMean<=900,`${r.speed} s: ${r.tapsMean} taps`);
});

// The first 15 minutes on their own (M8: the first-session journey, as far as a script can tell).
test('first 15 minutes: first merge, order, restoration and discovery come early; stages are earned',()=>{
 const KINDS=['deliver','upgrade','merge','tap','unseal','space','energy','level','orders'];
 for(const sp of SPEEDS)for(const sd of SEEDS){
  // J5: after every action of the first 15 minutes there is a named next step.
  const onStep=s=>{const g=primaryAction(s);assert.ok(KINDS.includes(g.kind)&&g.label.length>5,`${sp} s seed ${sd}: no next step`);};
  const r=simulate(game,nextAction,sp,sd,{firstOnly:true,onStep,shop:true}),at=`${sp} s seed ${sd}`;
  assert.ok(r.first.merge<=1*MIN,`${at}: first merge ${(r.first.merge/MIN).toFixed(1)} min`);
  assert.ok(r.first.order<=2.5*MIN,`${at}: first order ${(r.first.order/MIN).toFixed(1)} min`);
  // Build 46k (a harder start): bigger first gold orders and less early energy make the first stage
  // a goal (first restoration was ≤ 4.5 min, first discovery ≤ 8, 8+ orders in 15 min)
  assert.ok(r.first.restore<=6*MIN,`${at}: first restoration ${(r.first.restore/MIN).toFixed(1)} min`);
  assert.ok(r.first.discovery<=9.5*MIN,`${at}: first cargo or generator merge ${(r.first.discovery/MIN).toFixed(1)} min`);
  assert.ok(r.first15.orders>=4,`${at}: ${r.first15.orders} orders in 15 min`);
  assert.ok(r.first15.restores>=3&&r.first15.restores<=(sp<=4.5?8:6),`${at}: ${r.first15.restores} restorations in 15 min`);}
});

test('the report the playtest notes quote',()=>{
 for(const r of rows)console.log(JSON.stringify(Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='number'?+v.toFixed(2):v]))));
 assert.ok(quantile([1,2,3],.5)===2);
});
