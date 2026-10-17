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
     await page.locator(`#board [data-index="${action.from}"]`).tap();
     await page.locator(`#board [data-index="${action.to}"]`).tap();
    }else if(action.type==='produce'||action.type==='service'){
     const source=before.board.findIndex(x=>x?.type==='source'&&x.id===action.id);
     await page.locator(`#board [data-index="${source}"]`).tap();
     if(action.type==='service')await page.locator('#selection [data-action="service"]').tap();
    }else if(action.type==='ration'){await page.locator('#rationButton').tap();}
    else throw Error('Unexpected camp-order policy '+JSON.stringify(action));
    try{await page.waitForFunction(n=>JSON.parse(localStorage.getItem('vaultwake-v5')).moves>n,before.moves,{timeout:4000});}
    catch(error){
     const after=await read();
     throw Error(JSON.stringify({engine,actions,deliveries,action,before:{moves:before.moves,energy:before.energy,supplies:before.requests.supplies,board:before.board,orders:before.requests.orders},after:{moves:after.moves,energy:after.energy,supplies:after.requests.supplies},message:await page.locator('#message').textContent()},null,2));
    }
    actions++;assert.ok(actions<225,'camp Pier must be reachable via ordinary orders');
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
   assert.deepEqual(errors,[]);fs.writeFileSync(`${dir}/${engine}-trace.json`,JSON.stringify({actions,deliveries,workshop:packed.workshop,camp:packed.camp,remainingSupplies:packed.requests.supplies,selectedFamily:family},null,2));
   await context.close();console.log(engine,'real orders → Workshop → Pier → targeted case → reload passed');
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
