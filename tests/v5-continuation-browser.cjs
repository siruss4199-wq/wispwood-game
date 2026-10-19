// TT-1G1: reported save reproduction and earned early treasures via mobile controls.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
(async()=>{
 const dir='test-artifacts/v5/continuation';fs.mkdirSync(dir,{recursive:true});
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
   await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');
   // Fixture reproduces the user's existing save, not a fresh-play pacing claim.
   await page.evaluate(async()=>{
    const {fresh,SAVE_KEY}=await import('/v5/core.mjs');const {syncRequests}=await import('/v5/requests.mjs');
    const s=fresh();s.stage=4;s.landingStep=2;s.routePrepared=true;s.post=2;s.journey.engine=true;s.journey.infusions=1;s.requests.supplies=6;
    delete s.camp.earlyFragments;syncRequests(s);localStorage.setItem(SAVE_KEY,JSON.stringify(s));
   });await page.reload();await page.waitForSelector('#board .tile');
   const legacy=await read();
   for(const width of [360,390,430]){
    await page.setViewportSize({width,height:844});
    assert.equal(await page.locator('#goalTitle').textContent(),'Restore Coastal Workshop');
    assert.match(await page.locator('#goalNeeds').textContent(),/6\/8/);
    assert.equal(await page.locator('#goalButton').isVisible(),true);
    assert.equal(await page.locator('#goalButton').textContent(),'Earn supplies');
    await page.locator('#goalButton').tap();assert.match(await page.locator('#message').textContent(),/Deliver orders/);
    assert.ok((await page.locator('#goalButton').boundingBox()).height>=44);
    assert.equal(await page.locator('#board .tile').count(),36);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   }
   assert.deepEqual(await read(),legacy);await page.reload();
   assert.equal(await page.locator('#goalTitle').textContent(),'Restore Coastal Workshop');
   assert.equal((await read()).discovered.some(k=>k.includes(':tide:')),false);
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${dir}/${engine}-legacy-390.png`,fullPage:true});
   // Fresh save: use actual merge, landing and order controls, no injected stock.
   await page.evaluate(()=>localStorage.removeItem('vaultwake-v5'));await page.reload();
   await page.locator('[data-index="7"]').tap();await page.locator('[data-index="8"]').tap();await page.locator('#goalButton').tap();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5')).landingStep===1);
   for(let n=0;(await read()).camp.earlyFragments<2;n++){
    assert.ok(n<100);const before=await read();
    const a=await page.evaluate(async()=>{const {requestAction}=await import('/tests/v5-workshop-policy.mjs');return requestAction(JSON.parse(localStorage.getItem('vaultwake-v5')),0);});
    if(a.type==='request')await page.locator(`[data-request="${a.id}"]`).tap();
    else if(a.type==='merge'){
     const prior=page.locator('#board .selected.item');if(await prior.count())await prior.tap();
     await page.locator(`[data-index="${a.from}"]`).tap();await page.locator(`[data-index="${a.to}"]`).tap();
    }else if(a.type==='produce'||a.type==='service'){
     await page.locator(`[data-index="${before.board.findIndex(x=>x?.type==='source'&&x.id===a.id)}"]`).tap();
     if(a.type==='service')await page.locator('#selection [data-action="service"]').tap();
    }else throw Error(JSON.stringify(a));
    await page.waitForFunction(m=>JSON.parse(localStorage.getItem('vaultwake-v5')).moves>m,before.moves);
   }
   const s=await read(),pair=s.board.flatMap((x,i)=>x?.line==='tide'&&x.tier===0?[i]:[]);
   assert.equal(pair.length,2);assert.equal(s.stage,0);assert.equal(s.camp.loft,false);
   const prior=page.locator('#board .selected.item');if(await prior.count())await prior.tap();
   await page.locator(`[data-index="${pair[0]}"]`).tap();await page.locator(`[data-index="${pair[1]}"]`).tap();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5')).discovered.includes('chart:tide:1'));
   await page.reload();assert.equal((await read()).camp.earlyFragments,2);
   assert.equal((await read()).board.filter(x=>x?.line==='tide'&&x.tier===1).length,1);
   await page.screenshot({path:`${dir}/${engine}-early-compass-390.png`,fullPage:true});
   assert.deepEqual(errors,[]);await context.close();
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
