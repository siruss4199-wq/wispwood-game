import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState} from '../v3/core/state.mjs';
import {completeOrder,currentRestoration,fillOrdersInPlace,initializePlayableState,merge,mergeablePair,openEmptyIndices,producerIndices,restoreNode,tapProducer,unlockedProducerIds,validateState} from '../v3/core/engine.mjs';

function start(){return initializePlayableState(createInitialState());}
test('V3 starts with 3 active orders and a full-looking two-Seed board',()=>{
 const s=start();
 assert.equal(s.activeOrders.length,3);
 assert.deepEqual(mergeablePair(s),[26,34]);
 assert.equal(openEmptyIndices(s).length,0);
 assert.equal(unlockedProducerIds(s)[0],'ancientTree');
 assert.deepEqual(validateState(s),[]);
});

test('first merge reveals producer and creates safe production capacity',()=>{
 const s=start(),r=merge(s,26,34);
 assert.equal(r.ok,true);
 assert.ok(producerIndices(r.state).length>=1);
 assert.ok(openEmptyIndices(r.state).length>=2);
});

test('order completion pays currencies and immediately refills three slots',()=>{
 let s=merge(start(),26,34).state;
 const order=s.activeOrders[0],req=order.requirements[0];
 // deterministic helper implemented inline without dynamic imports
 for(let guard=0;guard<1200;guard++){
  const index=s.cells.findIndex(c=>c.content?.type==='item'&&c.content.chain===req.chain&&c.content.tier===req.tier);
  if(index>=0){const before=s.coins;const d=completeOrder(s,order.id);assert.equal(d.ok,true,d.reason);assert.ok(d.state.coins>before);assert.equal(d.state.activeOrders.length,3);return;}
  const pair=mergeablePair(s);
  if(pair){s=merge(s,pair[0],pair[1]).state;continue;}
  let produced=false;
  for(const i of producerIndices(s)){const r=tapProducer(s,i);if(r.ok){s=r.state;produced=true;break;}}
  assert.equal(produced,true,'producer should keep order craft alive');
 }
 assert.fail('order was not craftable');
});

test('restoration milestones unlock more producer chains',()=>{
 let s=merge(start(),26,34).state;
 s.coins=9999;s.forestLight=9999;
 for(let nodeCount=0;nodeCount<6;nodeCount++){
  const node=currentRestoration(s);
  for(let guard=0;guard<2000;guard++){
   const index=s.cells.findIndex(c=>c.content?.type==='item'&&c.content.chain===node.chain&&c.content.tier===node.tier);
   if(index>=0){const r=restoreNode(s,index);assert.equal(r.ok,true,r.reason);s=r.state;break;}
   const pair=mergeablePair(s);
   if(pair){s=merge(s,pair[0],pair[1]).state;continue;}
   let produced=false;
   for(const i of producerIndices(s)){const r=tapProducer(s,i);if(r.ok){s=r.state;produced=true;break;}}
   assert.equal(produced,true,'restoration craft should stay live');
  }
 }
 assert.ok(unlockedProducerIds(s).includes('moonSpring'));
 assert.ok(unlockedProducerIds(s).includes('wispNest'));
 assert.deepEqual(validateState(s),[]);
});
