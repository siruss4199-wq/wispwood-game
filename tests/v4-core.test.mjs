import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAINS,MILESTONES} from '../v4/core/catalog.mjs';
import {COBWEBS,OPEN_START,STARTING_ITEMS,createInitialState} from '../v4/core/state.mjs';
import {currentMilestone,fillOrdersInPlace,initializePlayableState,merge,milestoneReady,producerIndices,tapProducer,unlockedChains,validateState} from '../v4/core/engine.mjs';

const start=()=>initializePlayableState(createInitialState());

test('V4 starts as an item-rich permanent workspace',()=>{
 const s=start();
 assert.equal(Object.keys(CHAINS).length,6);
 assert.equal(Object.values(CHAINS).every(c=>c.items.length===8),true);
 assert.equal(s.activeOrders.length,4);
 assert.equal(COBWEBS.length,12);
 assert.equal(s.cells.filter(c=>c.terrain==='open').length,16);
 assert.equal(STARTING_ITEMS.length,15);
 assert.equal(s.cells.filter(c=>c.terrain==='open'&&!c.content).length,0,'starting workspace should be visually full');
 assert.deepEqual(validateState(s),[]);
});

test('every merge item has a distinct visual icon across all six chains',()=>{
 const icons=Object.values(CHAINS).flatMap(c=>c.items.map(i=>i.emoji));
 assert.equal(icons.length,48);
 assert.equal(new Set(icons).size,48,'duplicate item emoji found');
});

test('full starting workspace immediately offers several meaningful merge choices',()=>{
 const s=start();
 const counts=new Map();
 for(const c of s.cells){
  if(c.terrain!=='open'||c.content?.type!=='item')continue;
  const k=c.content.chain+':'+c.content.tier;counts.set(k,(counts.get(k)??0)+1);
 }
 const pairs=[...counts.values()].filter(v=>v>=2).length;
 assert.ok(pairs>=4,'pairs='+pairs);
});

test('Ancient Tree deterministically produces two chains',()=>{
 let s=start();
 const first=merge(s,28,35);assert.equal(first.ok,true,first.reason);s=first.state;
 const p=producerIndices(s)[0],seen=new Set();
 for(let i=0;i<s.cells.length;i++){
  if(i===p)continue;
  if(s.cells[i].terrain==='open')s.cells[i].content=null;
 }
 for(let i=0;i<8;i++){const r=tapProducer(s,p);assert.equal(r.ok,true,r.reason);s=r.state;seen.add(r.events[0].item.chain);}
 assert.deepEqual([...seen].sort(),['leaf','wood']);
});

test('generated orders never request locked chains',()=>{
 let s=start();
 for(let i=0;i<40;i++){
  for(const o of s.activeOrders)for(const r of o.requirements)assert.ok(unlockedChains(s).includes(r.chain));
  const o=s.activeOrders[0];
  s.activeOrders=s.activeOrders.filter(x=>x.id!==o.id);fillOrdersInPlace(s);
 }
 assert.deepEqual(validateState(s),[]);
});

test('cobweb targets require the exact crafted item',()=>{
 let s=start(),target=COBWEBS[0],idx=target[0];
 const bad=s.cells.findIndex(c=>c.terrain==='open'&&c.content?.type==='item');
 assert.equal(merge(s,bad,idx).ok,false);
 s=merge(s,28,35).state;
 const n=structuredClone(s),empty=n.cells.findIndex(c=>c.terrain==='open'&&!c.content);
 assert.ok(empty>=0,'opening merge should create working space');
 n.cells[empty].content={type:'item',chain:target[1],tier:target[2]};
 const r=merge(n,empty,idx);assert.equal(r.ok,true,r.reason);assert.equal(r.state.cells[idx].terrain,'open');
});

test('chapter has 18 escalating milestones and does not start ready',()=>{
 const s=start();
 assert.equal(MILESTONES.length,18);
 assert.equal(milestoneReady(s,currentMilestone(s)),false);
 assert.ok(MILESTONES.at(-1).coinCost>MILESTONES[0].coinCost*20);
 assert.ok(MILESTONES.at(-1).requirements.some(r=>r[1]>=6));
});
