import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,restore,serialize} from '../v2/core/state.mjs';
import {areaProgress,boardStatus,currentProject,currentRequest,deliver,merge,mergeablePair,openEmptyIndices,producerIndices,restoreProject,tapProducer,validateState} from '../v2/core/engine.mjs';

function craftToTier(state,targetTier,maxSteps=1000){
 let s=state;
 for(let step=0;step<maxSteps;step++){
  const found=s.cells.findIndex(c=>c.content?.type==='item'&&c.content.chain==='leaf'&&c.content.tier===targetTier);
  if(found>=0)return {state:s,index:found,steps:step};
  const pair=mergeablePair(s);
  if(pair){const r=merge(s,pair[0],pair[1]);assert.equal(r.ok,true);s=r.state;continue;}
  const producer=producerIndices(s)[0];
  assert.ok(Number.isInteger(producer),'producer must exist when no merge pair exists');
  const r=tapProducer(s,producer);
  assert.equal(r.ok,true,r.reason);
  s=r.state;
 }
 assert.fail('craftToTier exceeded step budget');
}

function finishFirstMerge(state=createInitialState()){
 return merge(state,26,34).state;
}

test('V2 starts visually full with two Seeds and zero meta currency',()=>{
 const s=createInitialState(),st=boardStatus(s);
 assert.equal(st.open,2);assert.equal(st.crates,62);
 assert.deepEqual(mergeablePair(s),[26,34]);
 assert.equal(s.coins,0);assert.equal(s.forestLight,0);
 assert.equal(areaProgress(s),0);
 assert.deepEqual(validateState(s),[]);
});

test('first merge reveals Tree plus enough production space',()=>{
 const s=finishFirstMerge();
 assert.equal(s.cells[33].content.type,'producer');
 assert.equal(openEmptyIndices(s).length,2);
 assert.equal(s.phase,'core');
});

test('Forest Order consumes item and awards Coins, Light and Energy',()=>{
 let s=finishFirstMerge();
 const q=currentRequest(s),c=craftToTier(s,q.tier);
 s=c.state;
 const beforeEnergy=s.energy;
 const d=deliver(s,c.index);
 assert.equal(d.ok,true,d.reason);
 assert.equal(d.state.coins,q.rewardCoins);
 assert.equal(d.state.forestLight,q.rewardLight);
 assert.equal(d.state.energy,Math.min(d.state.maxEnergy,beforeEnergy+q.rewardEnergy));
 assert.equal(d.state.ordersCompleted,1);
 assert.equal(currentRequest(d.state).id,'order-bloom');
});

test('restoration requires matching item plus Coin and Light thresholds',()=>{
 let s=finishFirstMerge();
 let c=craftToTier(s,currentProject(s).tier);s=c.state;
 let r=restoreProject(s,c.index);
 assert.equal(r.ok,false);
 s.coins=40;s.forestLight=3;
 r=restoreProject(s,c.index);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.state.coins,0);
 assert.equal(r.state.cells[c.index].content,null);
 assert.equal(r.state.completedProjectIds[0],'garden');
 assert.equal(areaProgress(r.state),25);
});

test('full Lost Clearing restoration gives a strong 100% story goal',()=>{
 let s=finishFirstMerge();
 while(currentProject(s)){
  const p=currentProject(s);
  while(s.coins<p.coinCost||s.forestLight<p.lightRequired){
   const q=currentRequest(s),c=craftToTier(s,q.tier);s=deliver(c.state,c.index).state;
  }
  const c=craftToTier(s,p.tier);
  const r=restoreProject(c.state,c.index);
  assert.equal(r.ok,true,r.reason);
  s=r.state;
  assert.deepEqual(validateState(s),[]);
 }
 assert.equal(areaProgress(s),100);
 assert.equal(s.completedProjectIds.length,4);
 assert.equal(s.rescued,true);
 assert.equal(s.nextAreaUnlocked,true);
 assert.equal(s.phase,'area_complete');
 assert.ok(s.coins>=0);
});

test('after area completion Forest Orders can continue indefinitely',()=>{
 let s=finishFirstMerge();
 while(currentProject(s)){
  const p=currentProject(s);
  while(s.coins<p.coinCost||s.forestLight<p.lightRequired){
   const q=currentRequest(s),c=craftToTier(s,q.tier);s=deliver(c.state,c.index).state;
  }
  const c=craftToTier(s,p.tier);s=restoreProject(c.state,c.index).state;
 }
 const start=s.ordersCompleted;
 for(let i=0;i<6;i++){
  const q=currentRequest(s),c=craftToTier(s,q.tier);
  s=deliver(c.state,c.index).state;
 }
 assert.equal(s.ordersCompleted,start+6);
 assert.deepEqual(validateState(s),[]);
});

test('save schema 3 round trips and older V2 saves are rejected',()=>{
 const s=createInitialState();
 assert.deepEqual(restore(serialize(s)),s);
 assert.equal(restore(JSON.stringify({...s,schema:2})),null);
 assert.equal(restore('bad'),null);
});
