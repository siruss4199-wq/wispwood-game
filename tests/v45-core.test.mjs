import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CHAINS,PRODUCERS,MAX_TIER,producerStage,producerDrop} from '../v4/core/catalog.mjs';
import {createInitialState,restore,serialize,SCHEMA} from '../v4/core/state.mjs';
import {initializePlayableState,producerPreview,tapProducer,completeOrder,orderReady,merge,validateState} from '../v4/core/engine.mjs';
import {createRequest,requestBonus} from '../v4/core/requests.mjs';
const start=()=>initializePlayableState(createInitialState());

test('all ten-step families have valid, distinct local vector assets and merge to cap',()=>{
 const art=new Set();
 for(const [id,c] of Object.entries(CHAINS)){
  assert.equal(c.items.length,10);
  for(const d of c.items){const svg=fs.readFileSync(new URL('../v4/assets/'+d.art+'.svg',import.meta.url),'utf8');assert.match(svg,/<svg/);art.add(svg);}
  const s=start();s.cells[18].content={type:'item',chain:id,tier:8};s.cells[19].content={type:'item',chain:id,tier:8};
  const r=merge(s,18,19);assert.equal(r.ok,true);assert.equal(r.state.cells[19].content.tier,MAX_TIER);
  r.state.cells[18].content={type:'item',chain:id,tier:MAX_TIER};assert.equal(merge(r.state,18,19).ok,false);
 }
 assert.equal(art.size,60);
});

test('all producer stages and upgrade levels preview exactly what tapping produces, including specials',()=>{
 for(const p of Object.values(PRODUCERS))for(let stage=0;stage<3;stage++)for(let level=1;level<=5;level++){
  let s=start();s.milestoneIndex=p.unlockAt+stage*4;s.producerLevels[p.id]=level;
  s.cells.forEach(c=>{if(c.terrain==='open')c.content=null;});s.cells[27].content={type:'producer',producerId:p.id};
  assert.equal(producerStage(s,p.id),stage);
  assert.ok(fs.existsSync(new URL(`../v4/assets/${p.id}-${stage}.svg`,import.meta.url)));
  let specials=0;
  for(let i=0;i<32;i++){
   const predicted=producerPreview(s,p.id,1)[0];const r=tapProducer(s,27);assert.equal(r.ok,true);
   assert.deepEqual(r.events[0].item,{type:'item',chain:predicted.chain,tier:predicted.tier});
   assert.equal(r.events[0].special,predicted.special);specials+=Number(predicted.special);
   s=r.state;s.cells[r.events[0].index].content=null;
  }
  assert.ok(specials>=2);
 }
});

test('schema 2 migration preserves inventory, resources, progression and tap sequence',()=>{
 const s=start();s.schema=2;s.coins=444;s.producerTapCounts.ancientTree=13;s.storage[0]={type:'item',chain:'leaf',tier:7};
 const n=restore(serialize(s));assert.equal(n.schema,SCHEMA);assert.deepEqual(n.activeOrders.map(o=>o.requirements),s.activeOrders.map(o=>o.requirements));
 for(const key of ['cells','storage','coins','producerLevels','producerTapCounts','completedMilestones'])assert.deepEqual(n[key],s[key]);
 assert.deepEqual(validateState(initializePlayableState(n)),[]);
 assert.equal(restore('{bad'),null);
});

test('repeated requirements cannot spend the same item twice',()=>{
 const s=start(),o={id:'duplicate',requirements:[{chain:'leaf',tier:5,count:1},{chain:'leaf',tier:5,count:1}]};
 s.activeOrders[0]=o;assert.equal(orderReady(s,o),false);assert.equal(completeOrder(s,o.id).ok,false);
});

test('timed bonus expires without removing requests; rewards and replay are exact',()=>{
 for(const now of [1001,901001]){
  const s=start();s.ordersCompleted=7;s.nextOrderSerial=9;
  const o=createRequest(s,2,['leaf','wood'],1000);s.activeOrders[2]=o;
  assert.equal(o.kind,'timed');assert.ok(requestBonus(o,1001)>0);assert.equal(requestBonus(o,901000),0);
  s.cells.forEach(c=>{if(c.terrain==='open')c.content=null;});
  let i=18;for(const r of o.requirements)for(let j=0;j<r.count;j++)s.cells[i++].content={type:'item',chain:r.chain,tier:r.tier};
  const result=completeOrder(s,o.id,now);assert.equal(result.ok,true);
  assert.equal(result.state.coins-s.coins,o.rewardCoins+requestBonus(o,now));
  assert.equal(completeOrder(result.state,o.id,now).ok,false);
 }
});

test('requests use unlocked families, normalized quantities, narratives and increasing commission tiers',()=>{
 for(let completed=0;completed<120;completed++)for(let slot=0;slot<4;slot++){
  const s=start();s.ordersCompleted=completed;const o=createRequest(s,slot,['leaf','wood'],0);
  assert.ok(o.narrative);assert.ok(o.rewardCoins>0);assert.ok(o.rewardEnergy>0);
  assert.equal(new Set(o.requirements.map(r=>r.chain+':'+r.tier)).size,o.requirements.length);
  for(const r of o.requirements){assert.ok(['leaf','wood'].includes(r.chain));assert.ok(r.tier<=MAX_TIER);}
  if(slot===3&&completed>90)assert.ok(o.requirements.some(r=>r.tier===8));
 }
});
