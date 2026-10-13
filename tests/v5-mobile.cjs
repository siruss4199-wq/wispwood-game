const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');const fs=require('node:fs');
(async()=>{fs.mkdirSync('test-artifacts/v5',{recursive:true});for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){const browser=await type.launch();try{for(const width of [360,390,430]){
 const page=await browser.newPage({viewport:{width,height:664},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');await page.evaluate(async()=>Promise.all([...document.images].map(x=>x.decode())));
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 // An action sheet must teach visually, but never enlarge or shift the board.
 const baseBoard=await page.locator('#board').boundingBox();
 await page.locator('#guideButton').tap();
 assert.equal(await page.locator('#guidePanel').isVisible(),true);
 assert.equal(await page.locator('.coachStep:visible').count(),0,'visual recipe collapsed by default');
 assert.ok((await page.locator('#guidePanel').boundingBox()).height<185,'compact actions are not a half-screen modal');
 assert.ok((await page.locator('#board').boundingBox()).y-baseBoard.y<2,'guide is an overlay, not a board push');
 await page.locator('#guidePanel .coachClose').tap();
 await page.locator('[data-index="19"]').tap();
 assert.match(await page.locator('.coachHeadline').textContent(),/CLEAR STONE/);
 assert.equal(await page.locator('.coachStep:visible').count(),0);
 assert.match(await page.locator('.coachSummary').textContent(),/Split Spanner/);
 assert.equal(await page.locator('.coachPrimary').textContent(),'MAKE SPANNER');
 await page.locator('.coachWhy').tap();assert.equal(await page.locator('.coachStep:visible').count(),3);
 assert.match(await page.locator('.coachExplanation').textContent(),/Split Spanner/);
 await page.locator('.coachWhy').tap();assert.equal(await page.locator('.coachStep:visible').count(),0);
 await page.screenshot({path:`test-artifacts/v5/${engine}-stone-guide-${width}.png`});
 await page.locator('.coachPrimary').tap();
 assert.equal(await page.locator('#guidePanel').isVisible(),false);
 assert.equal(await page.locator('#board .coachDestination').count(),1);
 await page.locator('[data-index="25"]').tap();
 assert.match(await page.locator('.coachHeadline').textContent(),/BURIED GROUND/);
 assert.match(await page.locator('.coachSummary').textContent(),/main story/i);
 assert.equal(await page.locator('.coachStep:visible').count(),0);
 await page.locator('#guidePanel .coachClose').tap();
 await page.evaluate(()=>scrollTo(0,0));
 const initial=await read();const a=await page.locator('[data-index="7"]').boundingBox(),b=await page.locator('[data-index="8"]').boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();await page.waitForTimeout(310);assert.equal((await read()).merges,1,'drag works in '+engine);
 // One fresh tool already exists; this real merge supplies the second landing tool.
 await page.locator('#goalButton').tap();assert.equal((await read()).stage,0);assert.equal((await read()).landingStep,1);await page.waitForTimeout(750);
 const saved=await read();await page.reload();assert.deepEqual((await read()).board,saved.board);assert.equal((await read()).stage,0);assert.equal((await read()).landingStep,1);
 assert.equal(await page.locator('#board').evaluate(el=>getComputedStyle(el).touchAction),'pan-y');assert.equal(await page.locator('.tile.item').first().evaluate(el=>getComputedStyle(el).touchAction),'none');
 await page.locator('[data-index="35"]').scrollIntoViewIfNeeded();let box=await page.locator('[data-index="35"]').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=664,'bottom row reachable with browser controls visible');
 if(engine==='chromium'){
  await page.evaluate(()=>scrollTo(0,0));const fixed=page.locator('.tile.rock').first(),r=await fixed.boundingBox();const y=Math.min(r.y+r.height/2,620),x=r.x+r.width/2;const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let n=1;n<=8;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-n*22}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);assert.ok(await page.evaluate(()=>scrollY)>30,'swiping fixed board objects scrolls the page');await cdp.detach();assert.equal((await read()).moves,saved.moves,'scroll does not produce or merge');
 }
 await page.locator('#soundButton').scrollIntoViewIfNeeded();await page.locator('#soundButton').tap();assert.equal(await page.locator('#soundButton').textContent(),'Sound on');
 await page.setViewportSize({width,height:540});await page.locator('#helpButton').scrollIntoViewIfNeeded();await page.locator('#helpButton').tap();assert.ok(await page.locator('#journal').isVisible());assert.ok((await page.locator('#journal').boundingBox()).height<=540);await page.locator('#journal .close').tap();
 await page.setViewportSize({width,height:664});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-artifacts/v5/${engine}-short-viewport-${width}.png`,fullPage:true});
 // Check the actual in-progress breach choice: two options, no half-screen textbook.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5'));s.stage=1;s.landingStep=2;localStorage.setItem('vaultwake-v5',JSON.stringify(s));});
 await page.reload();await page.locator('.tile.sealed').first().tap();
 assert.match(await page.locator('.coachHeadline').textContent(),/CHOOSE A ROUTE/);
 assert.equal(await page.locator('.coachActions button').count(),2);
 assert.match(await page.locator('.coachPrimary').textContent(),/RIDGE/);
 assert.match(await page.locator('.coachSecondary').textContent(),/CONDUIT/);
 assert.ok((await page.locator('#guidePanel').boundingBox()).height<185);
 await page.screenshot({path:`test-artifacts/v5/${engine}-route-choice-${width}.png`});
 await page.locator('.coachPrimary').tap();
 assert.equal(await page.locator('#guidePanel').isVisible(),false);
 assert.equal(await page.locator('#board .coachDestination').count(),1);
 assert.deepEqual(errors,[]);assert.ok((await read()).moves>initial.moves);await page.close();console.log(engine,width,'short viewport / drag / objective / persistence passed');
 }}finally{await browser.close();}}})().catch(e=>{console.error(e);process.exitCode=1;});
