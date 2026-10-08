import test from 'node:test';
import assert from 'node:assert/strict';
import {MILESTONES} from '../v4/core/catalog.mjs';
import {createInitialState} from '../v4/core/state.mjs';
import {bestProducerIndexForChain,completeMilestone,completeOrder,currentMilestone,initializePlayableState,merge,mergeablePair,milestoneReady,openEmptyIndices,orderReady,producerIndices,storeItem,tapProducer,unlockedChains,validateState} from '../v4/core/engine.mjs';

function scoreReq(r){return r.count*Math.pow(2,r.tier);}
function targetOrder(s){
 const ready=s.activeOrders.find(o=>orderReady(s,o));if(ready)return ready;
 return [...s.activeOrders].sort((a,b)=>a.requirements.reduce((n,r)=>n+scoreReq(r),0)-b.requirements.reduce((n,r)=>n+scoreReq(r),0))[0];
}
function missingReq(s,order){
 function count(chain,tier){
  let n=0;
  for(const c of s.cells)if(c.terrain==='open'&&c.content?.type==='item'&&c.content.chain===chain&&c.content.tier===tier)n++;
  for(const x of s.storage)if(x?.type==='item'&&x.chain===chain&&x.tier===tier)n++;
  return n;
 }
 return order.requirements.find(r=>count(r.chain,r.tier)<r.count)??order.requirements[0];
}
function simulate(maxSteps=2400){
 let s=initializePlayableState(createInitialState()),orders=0,milestones=0,merges=0,refills=0;
 for(let step=0;step<maxSteps;step++){
  assert.deepEqual(validateState(s),[],'invalid state at step '+step);
  if(milestoneReady(s,currentMilestone(s))){
   const r=completeMilestone(s);assert.equal(r.ok,true,r.reason);s=r.state;milestones++;continue;
  }
  const ready=s.activeOrders.find(o=>orderReady(s,o));
  if(ready){const r=completeOrder(s,ready.id);assert.equal(r.ok,true,r.reason);s=r.state;orders++;continue;}
  const pair=mergeablePair(s);
  if(pair){const r=merge(s,pair[0],pair[1]);assert.equal(r.ok,true,r.reason);s=r.state;merges++;continue;}
  if(openEmptyIndices(s).length===0){
   const idx=s.cells.findIndex(c=>c.terrain==='open'&&c.content?.type==='item');
   if(idx>=0&&s.storage.includes(null)){const r=storeItem(s,idx);if(r.ok){s=r.state;continue;}}
  }
  const order=targetOrder(s),need=missingReq(s,order);
  let p=bestProducerIndexForChain(s,need.chain);
  if(p<0)p=producerIndices(s)[0]??-1;
  if(p<0)break;
  if(s.energy===0){s.energy=s.maxEnergy;refills++;}
  const r=tapProducer(s,p);
  if(!r.ok)break;
  s=r.state;
 }
 return {s,orders,milestones,merges,refills};
}

test('2,400-decision heuristic simulation stays alive and meaningfully paced',()=>{
 const x=simulate();
 assert.deepEqual(validateState(x.s),[]);
 assert.ok(x.orders>=12,'orders='+x.orders);
 assert.ok(x.merges>=80,'merges='+x.merges);
 assert.ok(x.s.energy>0||x.refills>=1,'simulation must remain energy-playable across sessions');
 assert.ok(x.milestones>=2,'milestones='+x.milestones+' orders='+x.orders+' merges='+x.merges);
 assert.ok(x.milestones<MILESTONES.length,'chapter must not collapse into a tiny session');
 assert.equal(x.s.activeOrders.length,4);
 for(const o of x.s.activeOrders)for(const r of o.requirements)assert.ok(unlockedChains(x.s).includes(r.chain));
});

test('midgame unlocks expand the available chain pool',()=>{
 let s=initializePlayableState(createInitialState());
 assert.deepEqual(unlockedChains(s).sort(),['leaf','wood']);
 s.milestoneIndex=3;s.producerLevels.moonSpring=1;
 assert.ok(unlockedChains(s).includes('water'));assert.ok(unlockedChains(s).includes('crystal'));
 s.milestoneIndex=8;s.producerLevels.wispNest=1;
 assert.equal(unlockedChains(s).length,6);
});
