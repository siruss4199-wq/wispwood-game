const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');const fs=require('node:fs');
(async()=>{fs.mkdirSync('test-artifacts/v5',{recursive:true});for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){const browser=await type.launch();try{for(const width of [360,390,430]){
 const page=await browser.newPage({viewport:{width,height:664},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');await page.evaluate(async()=>Promise.all([...document.images].map(x=>x.decode())));
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
 // The first meaningful view teaches the merge before introducing optional management.
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await page.locator('#requests').isVisible(),false,'camp orders are introduced after the landing');
 assert.equal(await page.locator('#workshop').isVisible(),false,'workshop action waits until supplies matter');
 assert.match(await page.locator('#hint').textContent(),/Tap the glowing pair/);
 assert.equal(await page.locator('#board .openingPair').count(),2);
 assert.ok(await page.evaluate(()=>!!(document.querySelector('#requests').compareDocumentPosition(document.querySelector('#board'))&Node.DOCUMENT_POSITION_FOLLOWING)),'compact orders are structurally above the board but remain hidden until landing');
 await page.screenshot({path:`test-artifacts/v5/${engine}-fresh-board-first-${width}.png`,fullPage:true});
 const initial=await read();const a=await page.locator('[data-index="7"]').boundingBox(),b=await page.locator('[data-index="8"]').boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();await page.waitForTimeout(310);assert.equal((await read()).merges,1,'drag works in '+engine);
 assert.equal(await page.locator('#requests').isVisible(),false,'first merge stays focused on the main goal');
 assert.match(await page.locator('#hint').textContent(),/CLEAR PATH/);
 // One fresh tool already exists; this real merge supplies the second landing tool.
 await page.locator('#goalButton').tap();assert.equal((await read()).stage,0);assert.equal((await read()).landingStep,1);await page.waitForTimeout(750);
 assert.equal(await page.locator('#requests').isVisible(),true,'camp requests now appear');
 assert.equal(await page.locator('#workshop').isVisible(),true,'workshop is introduced with supplies');
 assert.match(await page.locator('.requestHeading').textContent(),/Next order: Tide Dial Fragment/);
 assert.match(await page.locator('#workshop').getAttribute('aria-label'),/Repair for 8 supplies/);
 assert.match(await page.locator('#hint').textContent(),/Survey Kite/,'first newly unlocked producer is explained');
 const boardBox=await page.locator('#board').boundingBox(),requestBox=await page.locator('#requests').boundingBox();
 assert.ok(requestBox.y+requestBox.height<=boardBox.y,'camp orders are above the board');assert.ok(boardBox.y<500,'mobile order strip keeps the board near the opening view');
 const firstTile=await page.locator('#board .tile').first().boundingBox();
 assert.ok(firstTile.width>=44&&firstTile.height>=44,'merge touch targets unchanged');
 await page.screenshot({path:`test-artifacts/v5/${engine}-orders-after-landing-${width}.png`,fullPage:true});
 const saved=await read();await page.reload();assert.deepEqual((await read()).board,saved.board);assert.equal((await read()).stage,0);assert.equal((await read()).landingStep,1);
 assert.equal(await page.locator('#board').evaluate(el=>getComputedStyle(el).touchAction),'pan-y');assert.equal(await page.locator('.tile.item').first().evaluate(el=>getComputedStyle(el).touchAction),'none');
 await page.locator('[data-index="35"]').scrollIntoViewIfNeeded();let box=await page.locator('[data-index="35"]').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=664,'bottom row reachable with browser controls visible');
 if(engine==='chromium'){
  await page.evaluate(()=>scrollTo(0,0));const fixed=page.locator('.tile.source').first();await fixed.scrollIntoViewIfNeeded();const startScroll=await page.evaluate(()=>scrollY),r=await fixed.boundingBox();const y=Math.min(r.y+r.height/2,620),x=r.x+r.width/2;const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let n=1;n<=8;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-n*22}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);assert.ok(await page.evaluate(()=>scrollY)>startScroll+30,'swiping fixed board objects scrolls the page');await cdp.detach();assert.equal((await read()).moves,saved.moves,'scroll does not produce or merge');
 }
 await page.locator('#soundButton').scrollIntoViewIfNeeded();await page.locator('#soundButton').tap();assert.equal(await page.locator('#soundButton').textContent(),'Sound on');
 await page.setViewportSize({width,height:540});await page.locator('#helpButton').scrollIntoViewIfNeeded();await page.locator('#helpButton').tap();assert.ok(await page.locator('#journal').isVisible());assert.ok((await page.locator('#journal').boundingBox()).height<=540);await page.locator('#journal .close').tap();
 await page.setViewportSize({width,height:664});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-artifacts/v5/${engine}-short-viewport-${width}.png`,fullPage:true});assert.deepEqual(errors,[]);assert.ok((await read()).moves>initial.moves);await page.close();console.log(engine,width,'short viewport / drag / objective / persistence passed');
 }}finally{await browser.close();}}})().catch(e=>{console.error(e);process.exitCode=1;});
