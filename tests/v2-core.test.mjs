import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,restore,serialize} from '../v2/core/state.mjs';
import {boardStatus,currentRequest,deliver,merge,mergeablePair,move,openEmptyIndices,producerIndices,requestProgress,tapProducer,validateState} from '../v2/core/engine.mjs';

function craftToTier(state,targetTier,maxSteps=500){
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

test('V2 starts visually full with exactly two matching Seeds',()=>{
 const s=createInitialState(),st=boardStatus(s);
 assert.equal(s.cells.length,64);
 assert.equal(st.open,2);
 assert.equal(st.crates,62);
 assert.deepEqual(mergeablePair(s),[26,34]);
 assert.equal(st.empty,0);
 assert.equal(st.producers,0);
 assert.deepEqual(validateState(s),[]);
});

test('first merge reveals producer and preserves two production spaces',()=>{
 const r=merge(createInitialState(),26,34);
 assert.equal(r.ok,true);
 assert.equal(r.state.cells[34].content.tier,1);
 assert.equal(r.state.cells[33].content.type,'producer');
 assert.equal(r.state.cells[35].content,null);
 assert.equal(openEmptyIndices(r.state).length,2);
 assert.equal(r.state.phase,'core');
});

test('Tree taps twice create two Seeds and merging recovers Energy',()=>{
 let s=merge(createInitialState(),26,34).state;
 const afterFirst=s.energy;
 s=tapProducer(s,33).state;
 s=tapProducer(s,33).state;
 assert.equal(s.energy,afterFirst-2);
 const pair=mergeablePair(s);assert.ok(pair);
 const r=merge(s,pair[0],pair[1]);
 assert.equal(r.state.energy,s.energy+1);
});

test('all three chapter requests can be completed without a dead end',()=>{
 let s=merge(createInitialState(),26,34).state;
 for(let expected=0;expected<3;expected++){
  const q=currentRequest(s);
  assert.ok(q);
  const crafted=craftToTier(s,q.tier);
  s=crafted.state;
  const d=deliver(s,crafted.index);
  assert.equal(d.ok,true,d.reason);
  s=d.state;
  assert.deepEqual(validateState(s),[]);
 }
 assert.equal(s.rescued,true);
 assert.equal(s.completedQuestIds.length,3);
 assert.equal(s.phase,'orders');
});

test('game continues after rescue with rotating Forest Orders',()=>{
 let s=merge(createInitialState(),26,34).state;
 for(let i=0;i<3;i++){const q=currentRequest(s),c=craftToTier(s,q.tier);s=deliver(c.state,c.index).state;}
 assert.equal(s.rescued,true);
 for(let i=0;i<4;i++){
  const q=currentRequest(s),c=craftToTier(s,q.tier);
  const d=deliver(c.state,c.index);
  assert.equal(d.ok,true,d.reason);
  s=d.state;
 }
 assert.equal(s.ordersCompleted,4);
 assert.equal(requestProgress(s).mode,'orders');
 assert.deepEqual(validateState(s),[]);
});

test('liveness invariant holds across 120 automated actions',()=>{
 let s=createInitialState();
 for(let n=0;n<120;n++){
  const q=currentRequest(s);
  const target=s.cells.findIndex(c=>c.content?.type==='item'&&c.content.chain===q.chain&&c.content.tier===q.tier);
  if(target>=0){s=deliver(s,target).state;continue;}
  const pair=mergeablePair(s);
  if(pair){s=merge(s,pair[0],pair[1]).state;continue;}
  const producer=producerIndices(s)[0];
  if(Number.isInteger(producer)&&openEmptyIndices(s).length){s=tapProducer(s,producer).state;continue;}
  if(s.phase==='first_merge'){s=merge(s,26,34).state;continue;}
  assert.fail('automation hit a dead end at action '+n);
 }
 assert.deepEqual(validateState(s),[]);
 assert.ok(s.ordersCompleted>0||s.rescued);
});

test('move is separate from merge',()=>{
 let s=merge(createInitialState(),26,34).state;
 const r=move(s,34,35);
 assert.equal(r.ok,true);
 assert.equal(r.state.cells[35].content.tier,1);
 assert.equal(r.state.cells[34].content,null);
});

test('save shape round trips cleanly and old V2 schema is rejected',()=>{
 const s=createInitialState();
 const copy=restore(serialize(s));
 assert.deepEqual(copy,s);
 const old={...s,schema:1};
 assert.equal(restore(JSON.stringify(old)),null);
 assert.equal(restore('bad'),null);
});
