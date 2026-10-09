import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {shelfOrders,shelfAction,itemHierarchy,producerVisual,frontierVariant} from '../v4/presentation.mjs';
import {itemArt,producerArt,frontierArt} from '../v4/art.mjs';
import {createInitialState} from '../v4/core/state.mjs';
import {initializePlayableState,nextFrontierIndices,completeOrder} from '../v4/core/engine.mjs';
import {CHAINS,PRODUCERS} from '../v4/core/catalog.mjs';
const start=()=>initializePlayableState(createInitialState());
test('shelf prioritizes focus, ready and timed requests without mutating or losing the fourth',()=>{
 const s=start();s.cells.forEach(c=>c.content=null);
 s.activeOrders=s.activeOrders.map((o,i)=>({...o,requirements:[{chain:'leaf',tier:i,count:1}],bonusUntil:i===2?2000:null,bonusCoins:i===2?20:0}));
 s.cells[18].content={type:'item',chain:'leaf',tier:1};
 const before=structuredClone(s),focused=s.activeOrders[3].id;
 assert.deepEqual(shelfOrders(s,focused,1000).map(o=>o.slot),[1,2,3]);
 assert.equal(shelfOrders(s,focused,3000).length,3);
 assert.deepEqual(s,before);assert.equal(s.activeOrders.length,4);
});
test('first ready request requires confirmation, then ready cards deliver exactly once',()=>{
 const s=start(),o=s.activeOrders[0];o.requirements=[{chain:'leaf',tier:0,count:1}];
 assert.equal(shelfAction(s,o),'confirm');
 const r=completeOrder(s,o.id);assert.equal(r.ok,true);assert.equal(completeOrder(r.state,o.id).ok,false);
 const next=r.state.activeOrders[0];next.requirements=[{chain:'leaf',tier:0,count:1}];
 assert.equal(shelfAction(r.state,next),'deliver');
 next.requirements=[{chain:'magic',tier:9,count:2}];assert.equal(shelfAction(r.state,next),'focus');
});
test('all sixty assets have family material and visual rank with no painted text',()=>{
 const materials=new Set(),assets=new Set();
 for(const [id,chain] of Object.entries(CHAINS))for(const d of chain.items){
  const svg=fs.readFileSync(new URL(`../v4/assets/${d.art}.svg`,import.meta.url),'utf8');
  assert.ok(svg.includes(`data-family="${id}"`));assert.ok(svg.includes(`data-rank="${itemHierarchy(d.tier)}"`));
  assert.doesNotMatch(svg,/<text|<image|https?:\/\/(?!www.w3.org)/);
  materials.add(svg.match(/data-material="([^"]+)"/)[1]);assets.add(svg);
  assert.ok(itemArt(id,d.tier).includes(d.art));
 }
 assert.equal(materials.size,6);assert.equal(assets.size,60);
});
test('every producer upgrade has distinct geometry while retaining independent restoration forms',()=>{
 for(const p of Object.values(PRODUCERS)){
  const seen=new Set();
  for(let level=1;level<=5;level++){
   const s=start();s.producerLevels[p.id]=level;
   const v=producerVisual(s,p.id);const svg=fs.readFileSync(new URL(`../v4/assets/${v.asset}.svg`,import.meta.url),'utf8');seen.add(svg);
   assert.ok(svg.includes(`data-level="${level}"`));assert.ok(producerArt(s,p.id).includes(v.asset));
   s.milestoneIndex=p.unlockAt+8;assert.equal(producerVisual(s,p.id).stage,2);
  }
  assert.equal(seen.size,5);
 }
});
test('frontier art is deterministic, varied and gives only actual next cells a trail marker',()=>{
 const s=start(),next=nextFrontierIndices(s,3),before=structuredClone(s),variants=new Set();
 s.cells.forEach((c,i)=>{if(c.terrain==='locked'){
  variants.add(frontierVariant(i));const art=frontierArt(i,next.includes(i));
  assert.equal(art.includes('frontierTrail'),next.includes(i));
  assert.ok(fs.existsSync(new URL(`../v4/assets/frontier-${frontierVariant(i)}.svg`,import.meta.url)));
 }});
 assert.equal(variants.size,6);assert.deepEqual(s,before);
});
