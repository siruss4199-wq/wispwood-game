import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CHAINS,MILESTONES,PRODUCER_MAX_LEVEL} from '../v4/core/catalog.mjs';
import {COBWEBS,OPEN_START,STARTING_ITEMS,createInitialState} from '../v4/core/state.mjs';
import {completeOrder,currentMilestone,fillOrdersInPlace,frontierName,initializePlayableState,merge,milestoneReady,nextFrontierIndices,producerIndices,producerUpgradeCost,reviveSparseBoard,tapProducer,unlockedChains,upgradeProducer,validateState} from '../v4/core/engine.mjs';

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


test('production UI keeps the merge board primary and supports guided mobile play',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.ok(html.indexOf('id="board"')<html.indexOf('id="orders"'),'board should appear before order list');
 assert.match(html,/id="inspect"/);
 assert.match(html,/role="status"/);
 assert.match(app,/nearestCompatibleTarget/);
 assert.match(app,/aria-label/);
 assert.match(app,/merge-match/);
 assert.match(css,/font-size:12px/);
 assert.match(css,/prefers-reduced-motion/);
});

test('first minute UX visibly guides players into the board loop',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.match(html,/id="questRibbon"/);
 assert.match(html,/class="boardFrame"/);
 assert.match(app,/suggestedIndices/);
 assert.match(app,/tutorialState/);
 assert.match(app,/burst-clear/);
 assert.match(css,/firstMerge/);
 assert.match(css,/mergeBurst/);
 assert.match(css,/sourceBreath/);
});


test('early completed orders visibly expand the board toward the outer edge',()=>{
 const s=start(),n=structuredClone(s);
 n.activeOrders[0].requirements=[];
 const before=n.cells.filter(c=>c.terrain==='locked').length;
 const r=completeOrder(n,n.activeOrders[0].id);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.state.cells.filter(c=>c.terrain==='locked').length,before-2);
 const unlocked=r.events.find(e=>e.type==='cell_unlocked');
 assert.ok(unlocked,'first orders should visibly expand the clearing');
 const row=Math.floor(unlocked.index/8),col=unlocked.index%8;
 assert.ok(row===0||row===7||col===0||col===7,'first expansion should visibly reach an outer edge');
});

test('board UI shows exploration progress and unlock animation',()=>{
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.match(app,/64 explored/);
 assert.match(app,/cell_unlocked/);
 assert.match(css,/unlock-wave/);
 assert.match(css,/unlockWave/);
});


test('clearing vines regrows bonus items so the board does not drain empty',()=>{
 let s=start(),target=COBWEBS[0],idx=target[0];
 s=merge(s,28,35).state;
 const n=structuredClone(s),empty=n.cells.findIndex(c=>c.terrain==='open'&&!c.content);
 n.cells[empty].content={type:'item',chain:target[1],tier:target[2]};
 const before=n.cells.filter(c=>c.terrain==='open'&&c.content?.type==='item').length;
 const r=merge(n,empty,idx);
 assert.equal(r.ok,true,r.reason);
 assert.ok(r.events.filter(e=>e.type==='bonus_spawned').length>=1);
 assert.ok(r.state.cells.filter(c=>c.terrain==='open'&&c.content?.type==='item').length>=before);
});

test('every fifth merge triggers Wisp Rush with Light and a bonus drop',()=>{
 let s=start();
 s.mergeCount=4;
 const r=merge(s,28,35);
 assert.equal(r.ok,true,r.reason);
 assert.ok(r.events.some(e=>e.type==='wisp_burst'));
 assert.equal(r.state.forestLight,s.forestLight+2);
 assert.ok(r.events.some(e=>e.type==='bonus_spawned'&&e.source==='rush'));
});

test('legacy sparse saves are refilled once to a playable board density',()=>{
 let s=start();
 s.densitySeeded=undefined;
 for(const c of s.cells)if(c.terrain==='open'&&c.content?.type==='item')c.content=null;
 const before=s.cells.filter(c=>c.terrain==='open'&&!c.content).length;
 assert.ok(before>10);
 const r=reviveSparseBoard(s,8);
 assert.ok(r.cells.filter(c=>c.terrain==='open'&&!c.content).length<=8);
 assert.equal(r.densitySeeded,true);
});

test('board exposes a visible Wisp Rush loop and pins the first order after the first merge',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 assert.match(html,/WISP RUSH/);
 assert.match(html,/id="rushFill"/);
 assert.match(app,/state\.moves>0&&\(!selectedOrder\|\|!state\.activeOrders\.some/);
 assert.match(app,/wisp_burst/);
});


test('frontier preview points at the same cells that early orders will reveal',()=>{
 const s=start(),preview=nextFrontierIndices(s,3);
 assert.equal(preview.length,3);
 assert.equal(new Set(preview).size,3);
 assert.equal(frontierName(s),'Mossy Verge');
 const n=structuredClone(s);n.activeOrders[0].requirements=[];
 const r=completeOrder(n,n.activeOrders[0].id);
 const unlocked=r.events.filter(e=>e.type==='cell_unlocked').map(e=>e.index);
 assert.equal(unlocked.length,2);
 assert.deepEqual(unlocked,preview.slice(0,2));
});

test('order bonus items appear in newly opened frontier space instead of clustering in the center',()=>{
 const s=start(),n=structuredClone(s);n.activeOrders[0].requirements=[];
 const r=completeOrder(n,n.activeOrders[0].id);
 const unlocked=new Set(r.events.filter(e=>e.type==='cell_unlocked').map(e=>e.index));
 const gifts=r.events.filter(e=>e.type==='bonus_spawned').map(e=>e.index);
 assert.ok(gifts.some(i=>unlocked.has(i)),'at least one reward should visibly appear in the new frontier');
});

test('UI previews the next frontier before it unlocks',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.match(html,/id="frontierName"/);
 assert.match(app,/nextFrontierIndices/);
 assert.match(app,/frontier-next/);
 assert.match(css,/frontierPulse/);
});


test('task UX keeps one active order and restoration close to the board',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 assert.match(html,/class="goalDock"/);
 assert.match(html,/id="goalPrev"/);
 assert.match(html,/id="goalNext"/);
 assert.match(html,/class="worldStrip"/);
 assert.ok(html.indexOf('id="completeOrder"')<html.indexOf('id="board"'));
 assert.ok(html.indexOf('id="completeMilestone"')<html.indexOf('id="board"'));
 assert.match(app,/selectOrderByOffset/);
 assert.match(app,/goalPosition/);
});

test('runtime audio is original synthesized WebAudio with a player mute control',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const audio=fs.readFileSync(new URL('../v4/audio.mjs',import.meta.url),'utf8');
 assert.match(html,/id="soundToggle"/);
 assert.match(app,/audio\.playEvents/);
 assert.match(audio,/AudioContext/);
 assert.match(audio,/Oscillator/);
 assert.match(audio,/wispwood-audio/);
});


test('mobile presentation uses a game HUD, world strip and bottom dock instead of a webpage stack',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.match(html,/class="topbar gameHud"/);
 assert.match(html,/class="worldStrip"/);
 assert.match(html,/class="gameDock"/);
 assert.match(html,/data-open-panel="orders"/);
 assert.match(app,/togglePanel/);
 assert.match(app,/closePanels/);
 assert.match(css,/position:fixed;left:50%;bottom:max/);
 assert.match(css,/gamePanel\.open/);
});


test('first completed request teaches delivery instead of silently consuming items',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.match(html,/id="deliveryCoach"/);
 assert.match(app,/firstDelivery=focusedReady&&state\.ordersCompleted===0/);
 assert.match(app,/deliveryCoach\.hidden=!firstDelivery/);
 assert.match(app,/ready-to-deliver/);
 assert.match(app,/Deliver →/);
 assert.match(css,/deliverPulse/);
 assert.match(css,/deliveryTutorial/);
});

test('after delivery the next request is automatically focused',()=>{
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 assert.match(app,/order_completed'\)\)selectedOrder=\(state\.activeOrders\.find\(o=>orderReady\(state,o\)\)\?\?state\.activeOrders\[0\]\)/);
});


test('board pieces stay visually clean without MERGE TARGET or chain-code labels',()=>{
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.doesNotMatch(app,/CHAIN_MARKS/);
 assert.doesNotMatch(app,/class="chainTag"/);
 assert.match(css,/\.tile\.cobweb:before,/);
 assert.match(css,/\.tile\.suggested:after/);
 assert.match(css,/content:none!important/);
});


test('commercial visual pass adds colorful HUD resources and NPC request portrait',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.match(html,/id="playerLevel"/);
 assert.match(html,/id="requestPortrait"/);
 assert.match(app,/REQUEST_NPCS/);
 assert.match(app,/requestFace/);
 assert.match(css,/levelBadge/);
 assert.match(css,/requestPortrait/);
 assert.match(css,/chain-crystal/);
 assert.match(css,/linear-gradient\(180deg,#70bff1/);
});


test('discovery events carry item and coin data for collection feedback',()=>{
 const s=start();
 const r=merge(s,28,35);
 assert.equal(r.ok,true,r.reason);
 const fresh=r.events.find(e=>e.type==='discovered');
 assert.ok(fresh);
 assert.ok(fresh.item?.chain);
 assert.ok(Number.isInteger(fresh.coins)&&fresh.coins>0);
});

test('commercial meta layer includes NPC request cards, collection book and reward flights',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.match(html,/data-panel="collection"/);
 assert.match(html,/id="collectionGrid"/);
 assert.match(html,/id="collectionBadge"/);
 assert.match(app,/REQUEST_NPCS/);
 assert.match(app,/collectionItems/);
 assert.match(app,/rewardEffects/);
 assert.match(app,/discoveryPop/);
 assert.match(css,/rewardFlight/);
 assert.match(css,/collectionItem/);
 assert.doesNotMatch(html,/id="focusGoal"/);
});


test('every third delivery grants a Forest Parcel with extra board gifts',()=>{
 const s=start(),n=structuredClone(s);
 n.ordersCompleted=2;n.activeOrders[0].requirements=[];
 const r=completeOrder(n,n.activeOrders[0].id);
 assert.equal(r.ok,true,r.reason);
 const parcel=r.events.find(e=>e.type==='forest_parcel');
 assert.ok(parcel);
 assert.equal(parcel.streak,3);
 assert.ok(parcel.energy>0&&parcel.light>0&&parcel.coins>0);
 assert.ok(r.events.some(e=>e.type==='bonus_spawned'&&e.source==='parcel'));
});

test('producer progression has a capped upgrade path and increasing cost',()=>{
 let s=start();s.coins=99999;s.forestLight=99999;
 assert.deepEqual(producerUpgradeCost(s,'ancientTree'),{coins:220,light:12});
 for(let level=1;level<PRODUCER_MAX_LEVEL;level++){const r=upgradeProducer(s,'ancientTree');assert.equal(r.ok,true,r.reason);s=r.state;}
 assert.equal(s.producerLevels.ancientTree,PRODUCER_MAX_LEVEL);
 assert.equal(producerUpgradeCost(s,'ancientTree'),null);
 assert.equal(upgradeProducer(s,'ancientTree').ok,false);
});

test('UI exposes source upgrades, a restoration map and Forest Parcel progress',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.match(html,/data-panel="map"/);
 assert.match(html,/id="restorationMap"/);
 assert.match(html,/id="parcelFill"/);
 assert.match(app,/renderRestorationMap/);
 assert.match(app,/producerUpgradeCost/);
 assert.match(app,/upgradeProducer/);
 assert.match(app,/forest_parcel/);
 assert.match(css,/sourceUpgradeBtn/);
 assert.match(css,/mapZone/);
 assert.match(css,/parcelPop/);
});


test('commercial board layout uses profile HUD activity cards and bottom info bar',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.match(html,/class="playerProfile"/);
 assert.match(html,/class="activityTray"/);
 assert.match(html,/id="activityRequestProgress"/);
 assert.match(html,/class="dockHint"/);
 assert.match(html,/id="hint"/);
 assert.match(app,/activityMilestoneTitle/);
 assert.match(app,/worldNodes/);
 assert.match(css,/grid-template-columns:58px minmax\(0,1fr\) 58px 58px/);
 assert.match(css,/background:linear-gradient\(180deg,#c88145,#ac642f\)/);
 assert.doesNotMatch(app,/class="tag">T\$\{cell\.content\.tier\+1\}/);
});


test('top activity shelf surfaces two real requests plus parcel progress',()=>{
 const html=fs.readFileSync(new URL('../v4/index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.equal((html.match(/data-order-slot=/g)??[]).length,2);
 assert.match(html,/id="activityParcelFill"/);
 assert.match(app,/requestMiniCards/);
 assert.match(app,/requestMiniItems/);
 assert.match(app,/dataset.orderId/);
 assert.match(css,/requestMiniCard.ready/);
 assert.match(css,/parcelMiniTrack/);
});

test('producer taps expose their source index for board feedback',()=>{
 let s=start();
 const first=merge(s,28,35);assert.equal(first.ok,true,first.reason);s=first.state;
 const p=producerIndices(s)[0],r=tapProducer(s,p);assert.equal(r.ok,true,r.reason);
 const produced=r.events.find(e=>e.type==='produced');
 assert.equal(produced.producerIndex,p);
 assert.equal(produced.energySpent,1);
});

test('board producer presentation has ready and tap feedback without text TAP labels',()=>{
 const app=fs.readFileSync(new URL('../v4/app.mjs',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../v4/style.css',import.meta.url),'utf8');
 assert.match(app,/producer-ready/);
 assert.match(app,/producerSpark/);
 assert.match(app,/producer-tap/);
 assert.match(app,/produce-pop/);
 assert.doesNotMatch(app,/tapCue/);
 assert.match(css,/producerReady/);
 assert.match(css,/producerTap/);
 assert.match(css,/producePop/);
});
