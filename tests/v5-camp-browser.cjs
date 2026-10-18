// Real mobile controls: earn camp currency, repair, build the Pier, buy a targeted pack.
// No direct inventory/currency injection in fresh gameplay.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
(async()=>{
 const dir='test-artifacts/v5/camp-pier';fs.mkdirSync(dir,{recursive:true});
 for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await browserType.launch();
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
   const page=await context.newPage();page.setDefaultTimeout(9000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
   const shot=async name=>{await page.evaluate(async()=>Promise.all([...document.images].map(x=>x.decode().catch(()=>{}))));await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${dir}/${engine}-${name}-390.png`,fullPage:true});};
   await page.locator('#board [data-index="7"]').tap();await page.locator('#board [data-index="8"]').tap();await page.locator('#goalButton').tap();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5')).landingStep===1);
   let actions=0,deliveries=0;
   const requestStep=async lane=>{
    const before=await read();
    const action=await page.evaluate(async lane=>{
     const {requestAction}=await import('/tests/v5-workshop-policy.mjs');
     return requestAction(JSON.parse(localStorage.getItem('vaultwake-v5')),lane);
    },lane);
    if(action.type==='request'){
     await page.locator(`#requests [data-request="${action.id}"]`).tap();deliveries++;
    }else if(action.type==='merge'){
     const from=page.locator(`#board [data-index="${action.from}"]`),to=page.locator(`#board [data-index="${action.to}"]`);
     if(await from.getAttribute('aria-pressed')!=='true'){
      const prior=page.locator('#board .selected.item,#board .selected.glyph,#board .selected.brace');
      if(await prior.count())await prior.tap();
      await from.tap();
     }
     await to.tap();
    }else if(action.type==='produce'||action.type==='service'){
     const source=before.board.findIndex(x=>x?.type==='source'&&x.id===action.id);
     await page.locator(`#board [data-index="${source}"]`).tap();
     if(action.type==='service')await page.locator('#selection [data-action="service"]').tap();
    }else if(action.type==='recoverTide'){await page.locator('#campPierWorld').tap();await page.locator('#selection [data-action="recoverTide"]').tap();}else if(action.type==='ration'){await page.locator('#rationButton').tap();}
    else throw Error('Unexpected camp-order policy '+JSON.stringify(action));
    try{await page.waitForFunction(n=>JSON.parse(localStorage.getItem('vaultwake-v5')).moves>n,before.moves,{timeout:4000});}
    catch(error){
     const after=await read();
     throw Error(JSON.stringify({engine,actions,deliveries,action,before:{moves:before.moves,energy:before.energy,supplies:before.requests.supplies,board:before.board,orders:before.requests.orders},after:{moves:after.moves,energy:after.energy,supplies:after.requests.supplies},message:await page.locator('#message').textContent()},null,2));
    }
    actions++;assert.ok(actions<400,'camp Pier must be reachable via ordinary orders');
   };
   // Build the required Workshop from genuinely earned orders first.
   while(!(await read()).workshop.repaired){
    const state=await read();
    if(state.requests.supplies>=8){await page.locator('#workshop').tap();break;}
    await requestStep(deliveries%2);
   }
   assert.equal((await read()).workshop.repaired,true);
   for(let guard=0;(await read()).requests.supplies<12;guard++){
    assert.ok(guard<125,'12 supplies should not require grinding');
    await requestStep(deliveries%3);
   }
   assert.ok(await page.locator('[data-camp-action="buildPier"]').isVisible());
   const before=await read();await shot('01-ready-to-build');
   await page.locator('[data-camp-action="buildPier"]').tap();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5')).camp.pier);
   let state=await read();assert.equal(state.requests.supplies,before.requests.supplies-12);
   assert.equal(state.camp.packs,1);assert.ok(await page.locator('#campPierWorld').isVisible());
   assert.ok(state.board.filter(x=>x?.type==='crate').length>before.board.filter(x=>x?.type==='crate').length);
   await shot('02-pier-built');
   for(let guard=0;(await read()).requests.supplies<8;guard++){
    assert.ok(guard<115,'targeted supplies should be purchasable with normal requests');
    await requestStep(deliveries%3);
   }
   // A restock follows the unmet requirement of the selected camp order.
   const old=await read();
   let candidate=old.requests.orders.find(o=>o&&!o.needs.some(r=>r.family==='flux'&&old.stage<2));
   for(const order of old.requests.orders){
    const ready=await page.evaluate(async id=>{const {requestProgress}=await import('/v5/requests.mjs');const s=JSON.parse(localStorage.getItem('vaultwake-v5'));return requestProgress(s,s.requests.orders.find(o=>o.id===id)).ready;},order.id);
    if(!ready){candidate=order;break;}
   }
   if(candidate){const card=page.locator(`[data-request="${candidate.id}"]`);await card.tap();}
   for(let guard=0;(await read()).board.filter(x=>x?.type==='crate').length>=3;guard++){
    assert.ok(guard<4,'opening existing cases should free the restock slot');
    await page.locator('#board .tile.crate').first().tap();
   }
   state=await read();const family=await page.locator('[data-camp-action="packPier"]').getAttribute('data-family');
   assert.ok(['rig','chart','flux'].includes(family));
   assert.equal((await page.locator('#requests').boundingBox()).y<(await page.locator('#board').boundingBox()).y,true);
   await shot('03-targeted-order-case');
   await page.locator('[data-camp-action="packPier"]').tap();
   const packed=await read();assert.equal(packed.requests.supplies,state.requests.supplies-8);
   assert.equal(packed.camp.packs,state.camp.packs+1);
   const kind={rig:'salvage',chart:'survey',flux:'relic'}[family];
   assert.ok(packed.board.some((x,i)=>x?.type==='crate'&&x.kind===kind&&JSON.stringify(x)!==JSON.stringify(state.board[i])),'new targeted case appears on board');
   await shot('04-case-delivered');
   const requestBox=await page.locator('#requests').boundingBox(),boardBox=await page.locator('#board').boundingBox();
   assert.ok(requestBox.y+requestBox.height<=boardBox.y,'orders remain above full-sized merge board');
   const tile=await page.locator('#board .tile.item').first().boundingBox();assert.ok(tile.width>=44&&tile.height>=44);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.reload();assert.deepEqual(await read(),packed);assert.ok(await page.locator('#campPierWorld').isVisible());
   const preLoftActions=actions;let low=36,high=0;
   while((await read()).requests.supplies<20){await requestStep(deliveries%3);const n=(await read()).board.filter(Boolean).length;low=Math.min(low,n);high=Math.max(high,n);}
   const ready=await read();await page.locator('#campPierWorld').tap();await shot('05-loft-upgrade-ready');
   await page.locator('#selection [data-action="buildLoft"]').tap();
   let upgraded=await read();assert.equal(upgraded.camp.loft,true);assert.equal(upgraded.requests.supplies,ready.requests.supplies-20);assert.deepEqual(upgraded.requests.orders,ready.requests.orders);
   await shot('06-loft-built');
   // Finish the existing Standard order: replacements, never pending orders, introduce treasure.
   const oldId=upgraded.requests.orders[1].id;
   while((await read()).requests.orders[1].id===oldId)await requestStep(1);
   assert.equal((await read()).requests.orders[1].needs[0].line,'tide');
   await page.locator(`#requests [data-request="${(await read()).requests.orders[1].id}"]`).tap();await shot('07-treasure-order');
   const treasureId=(await read()).requests.orders[1].id;
   while((await read()).requests.orders[1].id===treasureId)await requestStep(1);
   assert.ok((await read()).camp.dives>=2);await shot('08-treasure-delivered');
   // Discover the top collectible using real production and merges, including a pointer drag.
   let dragged=false;
   for(let guard=0;!(await read()).board.some(x=>x?.line==='tide'&&x.tier===2);guard++){
    assert.ok(guard<25);const current=await read();let pair;
    for(const tier of [1,0]){const ids=current.board.flatMap((x,i)=>x?.line==='tide'&&x.tier===tier?[i]:[]);if(ids.length>=2){pair=ids.slice(0,2);break;}}
    if(pair){
     const a=page.locator(`#board [data-index="${pair[0]}"]`),b=page.locator(`#board [data-index="${pair[1]}"]`);
     if(!dragged){await a.scrollIntoViewIfNeeded();const x=await a.boundingBox(),y=await b.boundingBox();await page.mouse.move(x.x+x.width/2,x.y+x.height/2);await page.mouse.down();await page.mouse.move(y.x+y.width/2,y.y+y.height/2,{steps:10});await page.mouse.up();dragged=true;}
     else{const prior=page.locator('#board .selected.item');if(await prior.count())await prior.tap();await a.tap();await b.tap();}
    }else if(!current.charges.chart){const index=current.board.findIndex(x=>x?.type==='source'&&x.id==='chart');await page.locator(`#board [data-index="${index}"]`).tap();await page.locator('#selection [data-action="service"]').tap();}
    else{await page.locator('#campPierWorld').tap();await page.locator('#selection [data-action="recoverTide"]').tap();}
   }
   await shot('09-pearl-astrolabe');const finished=await read();await page.reload();assert.deepEqual(await read(),finished);
   for(const width of [360,430]){await page.setViewportSize({width,height:844});await page.locator('#campPierWorld').tap();assert.ok(await page.locator('#selection [data-action="recoverTide"]').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const cell=await page.locator('#board .tile').first().boundingBox();assert.ok(cell.width>=44);await shot(`10-loft-${width}`);}
   fs.writeFileSync(`${dir}/${engine}-loft-trace.json`,JSON.stringify({actionsToLoft:ready.moves,requestActions:actions,extraRequestActions:actions-preLoftActions,deliveries,merges:finished.merges,dives:finished.camp.dives,discovered:finished.discovered.filter(x=>x.includes('tide')),occupiedBefore:ready.board.filter(Boolean).length,occupiedAfter:finished.board.filter(Boolean).length,occupancyWhileEarning:[low,high],remainingEnergy:finished.energy,remainingSupplies:finished.requests.supplies},null,2));
   assert.deepEqual(errors,[]);fs.writeFileSync(`${dir}/${engine}-trace.json`,JSON.stringify({actions,deliveries,workshop:packed.workshop,camp:packed.camp,remainingSupplies:packed.requests.supplies,selectedFamily:family},null,2));
   await context.close();console.log(engine,'real orders → Workshop → Pier → targeted case → reload passed');
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
