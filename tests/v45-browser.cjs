// Run after installing Playwright and starting a local server on port 8080.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});fs.mkdirSync('test-artifacts',{recursive:true});
 try{
  for(const width of [360,390,768]){
   const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:width<500});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8080/v4/');await page.waitForFunction(()=>document.querySelectorAll('#board .tile').length===64);
   await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
   assert.equal(await page.locator('img').evaluateAll(xs=>xs.filter(x=>!x.naturalWidth).length),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
   const board=await page.locator('#board').boundingBox();assert.ok(board.width>=Math.min(width-32,470));assert.ok(board.y+board.height<844,'board must fit mobile viewport');
   await page.locator('[data-index="28"]').tap();await page.locator('[data-index="35"]').tap();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).mergeCount),1);
   // Exercise pointer drag and its capture path, then an on-board producer.
   const a=await page.locator('[data-index="19"]').boundingBox(),b=await page.locator('[data-index="29"]').boundingBox();
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();await page.waitForTimeout(350);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).mergeCount),2);
   await page.locator('[data-index="27"]').tap();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).producerTapCounts.ancientTree),1);
   await page.screenshot({path:`test-artifacts/mobile-${width}.png`,fullPage:true});
   await page.locator('[data-open-panel="sources"]').tap();assert.equal(await page.locator('#sources .source').count(),1);
   await page.locator('#sourcesPanel .panelHandle').tap();await page.locator('[data-open-panel="orders"]').tap();assert.equal(await page.locator('#orders .order').count(),4);
   await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).mergeCount),2);
   assert.deepEqual(errors,[]);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
