// Coast Camp Home and Loading (Build 46p) in a real browser: fresh save → Loading → Home → Play →
// a playable board; an existing save → Continue → the same board, coins and level; the menu's
// Home and back with no second start (timers and listeners are counted); reload from Home and
// from the board; Settings and the book from Home; slow pictures show real progress; a missing
// picture or game file offers Retry and never touches the save; a save that cannot be read is
// kept as it is; Play waits only for board pictures still loading; reduced motion; keyboard;
// CrazyGames reports gameplay only once the player is on the board.
const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');
const BASE='http://127.0.0.1:8080/v5/',KEY='vaultwake-v5-coast';
// Counts every timer and listener the page sets up, to prove Home never starts the game twice.
const COUNT=`window.__n={iv:0,ls:0};{const si=window.setInterval;window.setInterval=function(...a){__n.iv++;return si.apply(this,a);};
 const ae=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(...a){__n.ls++;return ae.apply(this,a);};}`;
const STUB=`window.__cg=[];window.CrazyGames={SDK:{environment:'crazygames',init:async()=>{__cg.push('init')},
 game:{loadingStart(){__cg.push('loadingStart')},loadingStop(){__cg.push('loadingStop')},gameplayStart(){__cg.push('gameplayStart')},gameplayStop(){__cg.push('gameplayStop')},happytime(){__cg.push('happytime')},settings:{muteAudio:false},addSettingsChangeListener(){}},
 ad:{requestAd(t,cb){cb.adError&&cb.adError()}}}};`;
const save=page=>page.evaluate(k=>localStorage.getItem(k),KEY);
const homeUsable=page=>page.waitForSelector('#home:not(.isLoading)',{timeout:20000});
// The first new camp's Play shows the story (Build 46q; tests/v5-next-story-browser.cjs covers it):
// these Home checks skip it.
// Holds the requests matching re until release(); any request, before or after, then goes through
// (a picture can be asked for twice, by its <img> and by the loader). The route stays in place:
// removing it while a request is held could stall an unrelated request (a module), so the page
// never started (seen about 1 run in 12).
async function hold(page,re){let open;const gate=new Promise(r=>open=r);await page.route(re,async r=>{await gate;await r.continue().catch(()=>{});});
 return async()=>{open();};}
async function skipStory(page){await page.waitForFunction(()=>document.querySelector('#home').hidden||!document.querySelector('#story').hidden);
 if(await page.locator('#story:not([hidden])').count())await page.locator('#storySkip').click();}
async function play(page){await page.locator('#homePlay').click();await skipStory(page);await page.waitForSelector('#home',{state:'hidden'});}
async function skipBeats(page){for(let n=0;n<10&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(60);}}
async function drag(page,a,z){const A=await page.locator(`#board [data-index="${a}"]`).boundingBox(),Z=await page.locator(`#board [data-index="${z}"]`).boundingBox();
 await page.mouse.move(A.x+A.width/2,A.y+A.height/2);await page.mouse.down();await page.mouse.move(Z.x+Z.width/2,Z.y+Z.height/2,{steps:8});await page.mouse.up();await page.waitForTimeout(250);}

(async()=>{
 const engines=(process.env.ENGINES||'chromium,webkit').split(',').map(e=>[e,{chromium,webkit}[e]]);
 for(const [engine,type] of engines){
  let browser;try{browser=await type.launch();}catch(e){if(engine!=='chromium'&&/Executable doesn't exist/.test(e.message)){console.log(`${engine}: not installed here, skipped`);continue;}throw e;}
  try{
   const fresh=async(opts={})=>{const context=await browser.newContext({viewport:{width:390,height:844},isMobile:engine==='chromium',hasTouch:true,...opts});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.addInitScript(COUNT);return {context,page,errors};};
   const tag=s=>`${engine}: ${s}`;

   // 1. Fresh save: Loading, then Home with Play; nothing is saved until Play; Play → the board.
   {const {context,page,errors}=await fresh();
    const release=await hold(page,/home\/(logo|home-bg)\.webp/);
    await page.goto(BASE+'play.html',{waitUntil:'commit'});
    await page.waitForFunction(()=>/of 3 pictures/.test(document.querySelector('#homeStatus')?.textContent||''),null,{timeout:20000});
    assert.ok(await page.locator('#home.isLoading').count(),tag('loading first'));
    assert.match(await page.textContent('#homeStatus'),/Loading the camp · 1 of 3 pictures/,tag('real picture count'));
    assert.equal(await page.getAttribute('#homeBar','aria-valuenow'),'33',tag('measured progress'));
    assert.equal(await page.locator('#homePlay').isVisible(),false,tag('no Play while loading'));
    await release();await homeUsable(page);
    assert.equal((await page.textContent('#homePlay')).trim(),'Play');assert.equal(await page.locator('#homeChapter').isVisible(),false,tag('no place for a new camp'));
    assert.equal(await save(page),null,tag('nothing saved before Play'));
    // the board behind Home cannot be reached
    assert.equal(await page.evaluate(()=>document.querySelector('main.game').inert),true,tag('board inert under Home'));
    await play(page);await skipBeats(page);
    assert.ok(await save(page),tag('saved once in the camp'));
    // a playable board: tap the Rover for a part, drag a twin onto a twin
    const rover=await page.evaluate(()=>[...document.querySelectorAll('#board .tile.source')].map(t=>t.dataset.index)[0]);
    const before=JSON.parse(await save(page)).energy;await page.locator(`#board [data-index="${rover}"]`).click();await page.waitForTimeout(250);
    assert.equal(JSON.parse(await save(page)).energy,before-1,tag('generator tap spends energy'));
    await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.board[30]={type:'item',family:'rig',tier:0};s.board[31]={type:'item',family:'rig',tier:0};s.daily={day:9e6,count:1};localStorage.setItem(k,JSON.stringify(s));},KEY);
    await page.reload();await homeUsable(page);assert.equal((await page.textContent('#homePlay')).trim(),'Continue',tag('reload from the board: Continue'));
    await play(page);await skipBeats(page);await drag(page,30,31);
    const s=JSON.parse(await save(page));assert.deepEqual([s.board[30],s.board[31]],[null,{type:'item',family:'rig',tier:1}],tag('drag merge after entering through Home'));
    assert.deepEqual(errors,[]);await context.close();}

   // 2. Existing save → Continue → the same board, coins, energy and level; Home and back from the
   //    menu three times with no second start; reload from Home; Settings and the book from Home.
   {const {context,page,errors}=await fresh();
    await page.goto(BASE+'play.html?new=1');await homeUsable(page);await play(page);await skipBeats(page);
    await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.coins=123;s.energy=17;s.moves=40;s.merges=12;s.level={version:1,level:4,xp:3};s.daily={day:9e6,count:1};s.built={'beach-path':1};s.materials={'beach-path':1};localStorage.setItem(k,JSON.stringify(s));},KEY);
    await page.reload();await homeUsable(page);
    const kept=await save(page);
    assert.equal((await page.textContent('#homePlay')).trim(),'Continue');
    assert.match(await page.textContent('#homeChapter'),/^Landing Beach · 1 of 21 stages built$/,tag('place from the save'));
    assert.equal(await save(page),kept,tag('Home leaves the save as it is'));
    // Settings: the existing menu, without its Home button (already home); closes back to Home
    await page.locator('#homeSettings').click();await page.waitForSelector('#menu[open]');
    assert.equal(await page.locator('#homeButton').isVisible(),false);await page.locator('#menu .close').click();await page.waitForSelector('#menu',{state:'hidden'});
    assert.ok(await page.locator('#home').isVisible(),tag('back on Home after Settings'));
    // the collection book
    await page.locator('#homeBook').click();await page.waitForSelector('#book[open]');await page.locator('#book .close').click();
    await play(page);
    const s=JSON.parse(await save(page));assert.deepEqual([s.coins,s.energy,s.level.level,s.built],[123,17,4,{'beach-path':1}],tag('Continue keeps coins, energy, level, places'));
    const n0=await page.evaluate(()=>({...__n}));
    for(let k=0;k<3;k++){
     await page.locator('#menuButton').click();await page.waitForSelector('#menu[open]');await page.locator('#homeButton').click();
     await page.waitForSelector('#home:not([hidden])');assert.equal((await page.textContent('#homePlay')).trim(),'Continue');
     assert.equal(await page.evaluate(()=>document.querySelector('main.game').inert),true);await play(page);}
    const n1=await page.evaluate(()=>({...__n}));
    assert.equal(n1.iv,n0.iv,tag(`no new timers after three trips Home (${n0.iv} → ${n1.iv})`));
    assert.ok(n1.ls-n0.ls<=6,tag(`no new game listeners after three trips Home (${n0.ls} → ${n1.ls})`));
    const after=JSON.parse(await save(page));assert.deepEqual([after.coins,after.energy,after.board],[s.coins,s.energy,s.board],tag('Home and back changes nothing'));
    // reload while on Home: Continue, same save
    await page.locator('#menuButton').click();await page.locator('#homeButton').click();await page.waitForSelector('#home:not([hidden])');
    const onHome=await save(page);await page.reload();await homeUsable(page);
    assert.equal((await page.textContent('#homePlay')).trim(),'Continue');assert.equal(await save(page),onHome,tag('reload from Home keeps the save'));
    // keyboard: Tab reaches the main button and Enter enters
    await page.locator('#homeSettings').focus();let seen=false;for(let k=0;k<6&&!seen;k++){await page.keyboard.press('Tab');seen=await page.evaluate(()=>document.activeElement?.id==='homePlay');}
    assert.ok(seen,tag('Play/Continue reachable by keyboard'));await page.keyboard.press('Enter');await page.waitForSelector('#home',{state:'hidden'});
    assert.deepEqual(errors,[]);await context.close();}

   // 3. A save that cannot be read is kept as it is: no Play, Retry, and a new camp only on request
   //    (the old one is copied to a backup key first).
   {const {context,page,errors}=await fresh();
    await page.goto(BASE+'play.html?new=1');await homeUsable(page);
    const broken='{"version":4,"board":"this is not a board"}';
    await page.evaluate(([k,v])=>localStorage.setItem(k,v),[KEY,broken]);
    await page.reload();await homeUsable(page);
    assert.equal(await page.locator('#homePlay').isVisible(),false,tag('no Play over a damaged save'));
    assert.match(await page.textContent('#homeNote'),/could not be read/);assert.ok(await page.locator('#homeRetry').isVisible());
    await page.waitForTimeout(1500);assert.equal(await save(page),broken,tag('damaged save left untouched'));
    await page.locator('#homeRetry').click();await homeUsable(page);assert.equal(await save(page),broken,tag('Retry keeps it'));
    await page.locator('#homeNew').click();await page.waitForSelector('#home',{state:'hidden'});
    assert.equal(await page.evaluate(k=>localStorage.getItem(k+'-damaged'),KEY),broken,tag('backup kept'));
    assert.equal(JSON.parse(await save(page)).moves,0,tag('new camp on request'));
    assert.deepEqual(errors,[]);await context.close();}

   // 3b. Recovery copies are never overwritten (Build 47c): an older copy under -damaged and PR
   //     #80's -backup stay as they were; this one goes to the next free key, once.
   {const {context,page,errors}=await fresh();
    await page.goto(BASE+'play.html?new=1');await homeUsable(page);
    const broken='{"version":4,"board":"second broken save"}';
    await page.evaluate(([k,v])=>{localStorage.setItem(k,v);localStorage.setItem(k+'-damaged','an older recovery copy');localStorage.setItem(k+'-backup','a PR #80 recovery copy');},[KEY,broken]);
    await page.reload();await homeUsable(page);await page.locator('#homeNew').click();await page.waitForSelector('#home',{state:'hidden'});
    const keys=await page.evaluate(k=>[k+'-damaged',k+'-backup',k+'-damaged-2',k+'-damaged-3'].map(x=>localStorage.getItem(x)),KEY);
    assert.deepEqual(keys,['an older recovery copy','a PR #80 recovery copy',broken,null],tag('older copies kept, this one beside them'));
    assert.deepEqual(errors,[]);await context.close();}

   // 4. A Home picture that fails: Retry or go on without it. A game file that fails: Retry,
   //    which loads the game; the save is never touched.
   {const {context,page}=await fresh();
    await page.goto(BASE+'play.html?new=1');await homeUsable(page);await play(page);await skipBeats(page);
    // the camp itself (a running game also updates its energy clock, which is not progress)
    const camp=async()=>{const x=JSON.parse(await save(page));return JSON.stringify([x.board,x.coins,x.moves,x.orders,x.level,x.built]);},kept=await camp();
    await page.route(/home\/logo\.webp/,r=>r.abort());await page.reload({waitUntil:'commit'});
    await page.waitForSelector('#homeSkip:not([hidden])',{timeout:20000});
    assert.match(await page.textContent('#homeStatus'),/Some pictures could not be loaded/);assert.ok(await page.locator('#homeRetry').isVisible());
    await page.locator('#homeSkip').click();await homeUsable(page);assert.equal((await page.textContent('#homePlay')).trim(),'Continue');
    await page.unroute(/home\/logo\.webp/);
    await page.route(/next\/home\.mjs/,r=>r.abort());await page.reload({waitUntil:'commit'});
    await page.waitForSelector('#homeRetry:not([hidden])',{timeout:20000});
    assert.match(await page.textContent('#homeStatus'),/A game file could not be loaded/,tag('module failure shown'));
    assert.equal(await page.locator('#homePlay').isVisible(),false);assert.equal(await camp(),kept,tag('failure keeps the save'));
    await page.unroute(/next\/home\.mjs/);await page.locator('#homeRetry').click();await homeUsable(page);
    assert.equal((await page.textContent('#homePlay')).trim(),'Continue');assert.equal(await camp(),kept);
    await context.close();}

   // 5. Play waits only for board pictures still loading, with a real count, then goes in.
   {const {context,page}=await fresh();
    const release=await hold(page,/icons\/gen-rig-pilot\.webp/);
    await page.goto(BASE+'play.html',{waitUntil:'commit'});await homeUsable(page);
    await page.locator('#homePlay').click();
    await page.waitForFunction(()=>/Getting the board ready · \d+ of \d+ pictures/.test(document.querySelector('#homeStatus')?.textContent||''));
    assert.ok(await page.locator('#home').isVisible(),tag('Play waits for the missing board picture'));
    assert.equal(await page.locator('#homePlay').isDisabled(),true);
    await release();await skipStory(page);await page.waitForSelector('#home',{state:'hidden'});
    await context.close();}

   // 6. Reduced motion: no fade and no moving bar.
   {const {context,page}=await fresh({reducedMotion:'reduce'});
    const release=await hold(page,/home\/logo\.webp/);
    await page.goto(BASE+'play.html',{waitUntil:'commit'});await page.waitForSelector('#homeBar');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#homeBar>i')).animationName),'none',tag('bar still'));
    await release();await homeUsable(page);await page.locator('#homePlay').click();await skipStory(page);
    assert.equal(await page.locator('#home.leaving').count(),0);assert.equal(await page.locator('#home').isVisible(),false,tag('no fade with reduced motion'));
    await context.close();}

   // 7. CrazyGames: loading ends when Home is usable; gameplay starts only on the board.
   {const {context,page}=await fresh();
    await page.route('https://sdk.crazygames.com/**',r=>r.fulfill({contentType:'application/javascript',body:STUB}));
    await page.goto(BASE+'coast-crazygames.html');await homeUsable(page);await page.waitForTimeout(1500);
    const calls=await page.evaluate(()=>window.__cg);
    assert.deepEqual(calls,['init','loadingStart','loadingStop'],tag(`no gameplay on Home (${calls})`));
    await play(page);await page.waitForFunction(()=>window.__cg.includes('gameplayStart'));
    await context.close();}

   console.log(`${engine} Coast Camp Home: loading → Home → Play, Continue, Home and back (no second start), reload, settings, book, damaged save kept, failures with Retry, board wait, reduced motion, keyboard, CrazyGames passed`);
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
