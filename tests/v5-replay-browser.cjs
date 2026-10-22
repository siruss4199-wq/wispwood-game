const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
(async()=>{
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  try{for(const width of [360,390,430]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',x=>errors.push(x.message));
   await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');
   await page.evaluate(async()=>{
    const {fresh,SAVE_KEY}=await import('/v5/core.mjs');
    const s=fresh(1);s.stage=4;s.camp.fleetViewed=true;s.discovered.push('chart:tide:4');s.requests.supplies=54;
    localStorage.setItem(SAVE_KEY,JSON.stringify(s));
   });
   await page.reload();const initial=await page.evaluate(()=>localStorage.getItem('vaultwake-v5'));
   assert.doesNotMatch(await page.locator('#goalTitle').textContent(),/fleet left a signal/i,'the signal is not a false finale');
   assert.match(await page.locator('#replayChapter').textContent(),/Replay Chapter 1/);
   await page.locator('#replayChapter').tap();
   assert.equal(await page.locator('#replayConfirm').evaluate(x=>x.open),true);
   await page.locator('#replayCancel').tap();
   assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5')),initial);
   await page.locator('#replayChapter').tap();await page.locator('#replayBegin').tap();
   assert.equal(await page.locator('#replayNotice').isVisible(),true);
   assert.equal(await page.locator('#requests').isVisible(),false);
   assert.equal(await page.locator('#board .openingPair').count(),2);
   assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5')),initial);
   assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5-active-slot')),'replay');
   await page.reload();
   assert.equal(await page.locator('#replayNotice').isVisible(),true);
   assert.equal(await page.locator('#board .openingPair').count(),2);
   const b=await page.locator('#returnSave').boundingBox();
   assert.ok(b.width>=44&&b.height>=44);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('#returnSave').tap();
   assert.equal(await page.locator('#replayNotice').isVisible(),false);
   assert.match(await page.locator('#sceneLabel').textContent(),/answered/i,'the original post-signal save is back');
   assert.equal(await page.locator('#replayChapter').isVisible(),true);
   assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5')),initial);
   assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5-active-slot')),null);
   assert.deepEqual(errors,[]);
   await page.close();console.log(engine,width,'completed → replay → reload → original save restored');
  }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
