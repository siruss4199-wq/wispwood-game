// Coast Camp economy guard (Build 41 M2): 8 speeds × 5 seeds through both areas, and the first
// 15 minutes on their own. The thresholds are guards against getting worse than Build 40
// (11fdee6, measured with the same harness), not proof of fun: that needs new players.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../v5/next/game.mjs';
import {nextAction} from './v5-next-policy.mjs';
import {SPEEDS,SEEDS,simulate,summary,quantile} from './v5-next-economy-sim.mjs';

const MIN=60000;
// Build 40 with this harness: mean session minutes and producer taps per speed.
const B40={total:[62.59,71.93,80.6,94,107.73,123.12,138.16,153.07],taps:[308,315,314,314,317,317,315.6,314],orders:40,lowFree:[.67,1,1,1,1,1,1,1]};
const runs=SPEEDS.flatMap(sp=>SEEDS.map(sd=>simulate(game,nextAction,sp,sd)));
const rows=summary(runs);

test('no forced boredom: idle, energy starvation and a free move while energy is low',()=>{
 for(const r of rows){const at=`${r.speed} s/action`;
  assert.ok(r.finished,`${at}: both areas finished`);
  assert.ok(r.idleMax<=5,`${at}: idle ${r.idleMax.toFixed(1)} min`);
  assert.ok(r.longestIdleMax<=3,`${at}: longest idle ${r.longestIdleMax.toFixed(1)} min`);
  assert.ok(r.starveEpisodesMean<=4,`${at}: ${r.starveEpisodesMean} times out of energy`);
  assert.ok(r.starveLongestMax<=3,`${at}: out of energy for ${r.starveLongestMax.toFixed(1)} min`);}
 // The share of low-energy moments with something free to do, where there are enough of them
 // to measure (a handful of low-energy moments makes the share noise).
 for(const r of runs.filter(r=>r.lowStates>=30)){const k=SPEEDS.indexOf(r.speed),share=r.lowFree/r.lowStates;
  assert.ok(share>=B40.lowFree[k]-.05,`${r.speed} s seed ${r.seed}: ${(share*100).toFixed(0)}% of ${r.lowStates} low-energy moments have a free move`);}
});

test('orders and restorations keep coming',()=>{
 for(const r of rows){const at=`${r.speed} s/action`;
  // 5 minutes up to 9 s/action; at 10 s an order's 36 actions take 6 (Build 41: orders now mix two
  // generators, so several are worked on at once; throughput is checked below).
  assert.ok(r.orderMedianMax<=Math.max(5,r.speed*36/60),`${at}: order median ${r.orderMedianMax.toFixed(1)} min`);
  assert.ok(r.orderP90Max<=40,`${at}: order p90 ${r.orderP90Max.toFixed(1)} min`);
  assert.ok(r.restoreGapMedianMax<=3.5,`${at}: median gap between restorations ${r.restoreGapMedianMax.toFixed(1)} min`);
  assert.ok(r.restoreGapMax<=16,`${at}: longest gap between restorations ${r.restoreGapMax.toFixed(1)} min`);}
 for(const r of runs)assert.ok(r.orderAges.length>=B40.orders*.95,`${r.speed} s seed ${r.seed}: ${r.orderAges.length} orders delivered`);
});

test('generators arrive on time and the Lantern Kiln before the worksite ends',()=>{
 for(const r of rows){assert.ok(r.kiteMax<=22,`${r.speed} s: Survey Kite at ${r.kiteMax.toFixed(1)} min`);assert.ok(r.kilnBeforeEnd,`${r.speed} s: Lantern Kiln before the end`);}
});

test('passing is not bought with grinding: session length and taps stay near Build 40',()=>{
 rows.forEach((r,k)=>{
  assert.ok(Math.abs(r.totalMean/B40.total[k]-1)<=.15,`${r.speed} s: ${r.totalMean.toFixed(1)} min vs ${B40.total[k]} in Build 40`);
  assert.ok(r.tapsMean<=B40.taps[k]*1.1,`${r.speed} s: ${r.tapsMean} taps vs ${B40.taps[k]} in Build 40`);});
});

// The first 15 minutes on their own (M8: the first-session journey, as far as a script can tell).
test('first 15 minutes: first merge, order, restoration and discovery come early, and keep coming',()=>{
 for(const sp of SPEEDS)for(const sd of SEEDS){const r=simulate(game,nextAction,sp,sd,{firstOnly:true}),at=`${sp} s seed ${sd}`;
  assert.ok(r.first.merge<=1*MIN,`${at}: first merge ${(r.first.merge/MIN).toFixed(1)} min`);
  assert.ok(r.first.order<=2.5*MIN,`${at}: first order ${(r.first.order/MIN).toFixed(1)} min`);
  assert.ok(r.first.restore<=4.5*MIN,`${at}: first restoration ${(r.first.restore/MIN).toFixed(1)} min`);
  assert.ok(r.first.discovery<=8*MIN,`${at}: first cargo or generator merge ${(r.first.discovery/MIN).toFixed(1)} min`);
  assert.ok(r.first15.orders>=8&&r.first15.restores>=6,`${at}: ${r.first15.orders} orders and ${r.first15.restores} restorations in 15 min`);}
});

test('the report the playtest notes quote',()=>{
 for(const r of rows)console.log(JSON.stringify(Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='number'?+v.toFixed(2):v]))));
 assert.ok(quantile([1,2,3],.5)===2);
});
