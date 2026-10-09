// Run after installing Playwright and starting a local server on port 8080.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});fs.mkdirSync('test-artifacts',{recursive:true});
 try{
  for(const width of [360,390,768]){
   const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:width<500});
   page.setDefaultTimeout(10000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8080/v4/');await page.waitForFunction(()=>document.querySelectorAll('#board .tile').length===64);
   await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
   assert.equal(await page.locator('#requestShelf .shelfRequest:visible').count(),3);
   assert.equal(await page.locator('#questRibbon').isVisible(),false);
   assert.equal(await page.locator('.goalNav').isVisible(),false);
   assert.equal(await page.locator('.frontierArt').count(),36);
   assert.equal(await page.locator('.frontierTrail').count(),3);
   assert.equal(await page.locator('img').evaluateAll(xs=>xs.filter(x=>!x.naturalWidth).length),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
   await page.screenshot({path:`test-artifacts/initial-${width}.png`,fullPage:true});
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
   await page.locator('#sourcesPanel .panelHandle').tap();await page.locator('.gameDock [data-open-panel="orders"]').tap();assert.equal(await page.locator('#orders .order').count(),4);
   await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).mergeCount),2);
   // Onboarding keeps the first delivery explicit rather than silently consuming items.
   await page.locator('#requestShelf .shelfRequest.ready').first().tap();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).ordersCompleted),0);
   await page.locator('#deliveryCoach #completeOrder').tap();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).ordersCompleted),1);
   // A deterministic mature-save fixture checks all families, producers and request types.
   await page.evaluate(async()=>{
    const {createInitialState}=await import('/v4/core/state.mjs');
    const {CHAINS}=await import('/v4/core/catalog.mjs');
    const s=createInitialState();s.cells=Array.from({length:64},()=>({terrain:'open',content:null}));
    let index=0;s.discovered={};for(const id of Object.keys(CHAINS))for(let tier=0;tier<10;tier++){
     s.cells[index++].content={type:'item',chain:id,tier};s.discovered[id+':'+tier]=true;
    }
    ['ancientTree','moonSpring','wispNest'].forEach((id,i)=>{s.cells[60+i].content={type:'producer',producerId:id};s.producerLevels[id]=1+i*2;});
    s.milestoneIndex=8;s.ordersCompleted=12;s.moves=20;s.energy=100;s.coins=2000;s.forestLight=200;
    const req=(id,slot,chain,tier,count,kind='normal')=>({id,slot,npc:slot,kind,title:'Fixture '+id,narrative:'Forest care.',label:'Request',requirements:[{chain,tier,count}],rewardCoins:30,rewardLight:2,rewardEnergy:4,bonusUntil:kind==='timed'?Date.now()+900000:null,bonusCoins:kind==='timed'?15:0});
    s.activeOrders=[req('build',0,'water',9,2),req('ready',1,'wood',0,1),req('timed',2,'magic',2,2,'timed'),req('special',3,'relic',9,1,'special')];
    s.nextOrderSerial=50;localStorage.setItem('wispwood-v4',JSON.stringify(s));
   });
   await page.reload();await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
   assert.equal(await page.locator('img').evaluateAll(xs=>xs.filter(x=>!x.naturalWidth).length),0);
   assert.equal(await page.locator('#requestShelf .shelfRequest:visible').count(),3);
   assert.equal(await page.locator('.shelfBonus:visible').count(),1);
   assert.equal(await page.locator('.shelfRequest[data-kind="special"]').count(),1);
   await page.locator('.shelfRequest[data-order-id="timed"]').tap();
   assert.equal(await page.locator('[data-index="42"]').evaluate(e=>e.classList.contains('wanted')),true);
   const deadline=await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).activeOrders.find(o=>o.id==='timed').bonusUntil);
   await page.screenshot({path:`test-artifacts/families-${width}.png`,fullPage:true});
   await page.locator('.shelfRequest[data-order-id="ready"]').tap();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).ordersCompleted),13);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).activeOrders.some(o=>o.id==='ready')),false);
   await page.reload();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).activeOrders.find(o=>o.id==='timed').bonusUntil),deadline);
   // Real upgrade action changes the source silhouette and persists its new level.
   await page.locator('[data-open-panel="sources"]').tap();
   const sourceBefore=await page.locator('[data-index="60"] .workshopArt').getAttribute('src');
   await page.locator('#sources .sourceUpgradeBtn').first().tap();
   assert.notEqual(await page.locator('[data-index="60"] .workshopArt').getAttribute('src'),sourceBefore);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wispwood-v4')).producerLevels.ancientTree),2);
   assert.deepEqual(errors,[]);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
