import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../v3/core/state.mjs';
import {completeOrder,explorationCost,fillOrdersInPlace,initializePlayableState,merge,mergeablePair,openEmptyIndices,producerIndices,tapProducer,unlockedProducerIds,validateState} from '../v3/core/engine.mjs';

function start(){return initializePlayableState(createInitialState());}

test('V3 starts with three meaningfully different orders',()=>{
 const s=start();
 assert.equal(s.activeOrders.length,3);
 const quick=s.activeOrders.find(o=>o.slot===0),standard=s.activeOrders.find(o=>o.slot===1),story=s.activeOrders.find(o=>o.slot===2);
 assert.equal(quick.requirements.length,1);
 assert.equal(standard.requirements[0].count,2);
 assert.equal(story.requirements.length,2);
 assert.deepEqual(mergeablePair(s),[26,34]);
 assert.equal(openEmptyIndices(s).length,0);
 assert.equal(unlockedProducerIds(s)[0],'ancientTree');
 assert.deepEqual(validateState(s),[]);
});

test('first merge opens a real working clearing instead of consuming the board',()=>{
 const r=merge(start(),26,34);
 assert.equal(r.ok,true);
 assert.ok(producerIndices(r.state).length>=1);
 assert.equal(openEmptyIndices(r.state).length,5);
 assert.equal(r.state.exploredCrates,0);
});

test('normal merges build exploration points and do not open a crate every time',()=>{
 let s=merge(start(),26,34).state;
 const initialCrates=s.cells.filter(c=>c.terrain==='crate').length;
 for(let cycle=0;cycle<2;cycle++){
  while(!mergeablePair(s)){
   let produced=false;
   for(const i of producerIndices(s)){const r=tapProducer(s,i);if(r.ok){s=r.state;produced=true;break;}}
   assert.equal(produced,true);
  }
  const pair=mergeablePair(s);s=merge(s,pair[0],pair[1]).state;
 }
 assert.equal(s.explorationPoints,2);
 assert.equal(s.exploredCrates,0);
 assert.equal(s.cells.filter(c=>c.terrain==='crate').length,initialCrates);
});

test('exploration opens one crate only after the current merge threshold',()=>{
 let s=merge(start(),26,34).state;
 const cost=explorationCost(s),before=s.cells.filter(c=>c.terrain==='crate').length;
 for(let m=0;m<cost;m++){
  while(!mergeablePair(s)){
   let made=false;
   for(const i of producerIndices(s)){const r=tapProducer(s,i);if(r.ok){s=r.state;made=true;break;}}
   assert.equal(made,true);
  }
  const pair=mergeablePair(s);s=merge(s,pair[0],pair[1]).state;
 }
 assert.equal(s.exploredCrates,1);
 assert.ok(s.cells.filter(c=>c.terrain==='crate').length<before);
});

test('order completion pays currencies and refills the chosen slot',()=>{
 let s=merge(start(),26,34).state;
 const order=s.activeOrders[0],req=order.requirements[0];
 for(let guard=0;guard<1800;guard++){
  const indices=s.cells.flatMap((c,i)=>c.content?.type==='item'&&c.content.chain===req.chain&&c.content.tier===req.tier?[i]:[]);
  if(indices.length>=req.count){
   const before=s.coins,d=completeOrder(s,order.id);
   assert.equal(d.ok,true,d.reason);assert.ok(d.state.coins>before);assert.equal(d.state.activeOrders.length,3);return;
  }
  const pair=mergeablePair(s);
  if(pair){s=merge(s,pair[0],pair[1]).state;continue;}
  let produced=false;
  for(const i of producerIndices(s)){const r=tapProducer(s,i);if(r.ok){s=r.state;produced=true;break;}}
  assert.equal(produced,true,'producer should keep order craft alive');
 }
 assert.fail('quick order was not craftable');
});

test('core state remains valid through 180 automated actions',()=>{
 let s=start();
 for(let n=0;n<180;n++){
  if(s.phase==='first_merge'){s=merge(s,26,34).state;continue;}
  const pair=mergeablePair(s);
  if(pair){s=merge(s,pair[0],pair[1]).state;continue;}
  let acted=false;
  for(const i of producerIndices(s)){const r=tapProducer(s,i);if(r.ok){s=r.state;acted=true;break;}}
  if(!acted)break;
  assert.deepEqual(validateState(s),[]);
 }
 assert.deepEqual(validateState(s),[]);
 assert.ok(s.moves>20);
});
