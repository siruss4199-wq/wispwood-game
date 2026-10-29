// Coast Camp saves in a real browser (secondary-chain pilot, round 2, 2026-10-29; v5/next/saves.mjs):
// - a save made by a newer build is said to be one, is never written over, and a new camp is only
//   started on purpose, keeping it aside;
// - a damaged save is said to be damaged and kept the same way;
// - the round trip through an older build: the pilot camp kept aside (as an older build keeps a save it
//   cannot read when a new camp is started there) is restored from the menu's Kept camps, and the camp
//   it replaces is kept too;
// - ?new=1 and the menu's "Start the Coast Camp again" keep the camp they replace.
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {chromium,webkit}=require('playwright');
const BASE='http://127.0.0.1:8080/v5/',KEY='vaultwake-v5-coast';
const PILOT=fs.readFileSync(path.join(__dirname,'fixtures/coast/coast-pilot-extras.json'),'utf8').trim();
const OTHER=(()=>{const s=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/coast/coast-ch1-pre-secondary.json'),'utf8'));return JSON.stringify(s);})();
const NEWER=(()=>{const s=JSON.parse(PILOT);s.board[14]={type:'item',family:'sail',tier:0};return JSON.stringify(s);})();
// The page settles a camp's energy when it opens it and saves it, so a kept or restored camp is the
// same camp (moves, board, finds), not always the same text.
const sameCamp=(a,b)=>{try{const x=JSON.parse(a),y=JSON.parse(b);return x.moves===y.moves&&JSON.stringify(x.board)===JSON.stringify(y.board)&&JSON.stringify(x.found)===JSON.stringify(y.found);}catch{return false;}};
const all=page=>page.evaluate(()=>Object.fromEntries(Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).map(k=>[k,localStorage.getItem(k)])));
const homeUsable=page=>page.waitForSelector('#home:not(.isLoading)',{timeout:20000});
async function skipStory(page){await page.waitForFunction(()=>document.querySelector('#home').hidden||!document.querySelector('#story').hidden);
 if(await page.locator('#story:not([hidden])').count())await page.locator('#storySkip').click();}

(async()=>{
 const engines=(process.env.ENGINES||'chromium,webkit').split(',').map(e=>[e,{chromium,webkit}[e]]);
 for(const [engine,type] of engines){
  let browser;try{browser=await type.launch();}catch(e){if(engine!=='chromium'&&/Executable doesn't exist/.test(e.message)){console.log(`${engine}: not installed here, skipped`);continue;}throw e;}
  try{
   const open=async(seed,url='play.html')=>{const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(BASE+'play.html');await page.evaluate(seed=>{localStorage.clear();for(const [k,v] of Object.entries(seed))localStorage.setItem(k,v);},seed);
    if(url!=='play.html')await page.goto(BASE+url);else await page.reload();await homeUsable(page);return {context,page,errors};};

   // 1. A save from a newer build: said so, kept exactly, no Play; a new camp only on purpose, keeping it.
   {const {context,page,errors}=await open({[KEY]:NEWER});
    assert.match(await page.locator('#homeNote').textContent(),/newer version of Vaultwake/);
    assert.equal(await page.locator('#homePlay').isVisible(),false,'no Play over a save it cannot open');
    assert.equal(await page.locator('#homeNew').isVisible(),true);assert.equal(await page.locator('#homeKept').isVisible(),false,'nothing kept to restore yet');
    await page.waitForTimeout(1500);await page.reload();await homeUsable(page);assert.equal((await all(page))[KEY],NEWER,'left exactly as it is, across a reload');
    await page.locator('#homeNew').click();await skipStory(page);await page.waitForSelector('#home',{state:'hidden'});await page.waitForTimeout(300);
    const after=await all(page);assert.equal(after[KEY+'-damaged'],NEWER,'kept aside first');assert.notEqual(after[KEY],NEWER);
    assert.deepEqual(errors,[]);await context.close();}
   // 2. A damaged save is said to be damaged, and kept the same way.
   {const {context,page,errors}=await open({[KEY]:'{"version":4,"board":"broken"'});
    assert.match(await page.locator('#homeNote').textContent(),/could not be read/);assert.equal(await page.locator('#homePlay').isVisible(),false);
    assert.equal((await all(page))[KEY],'{"version":4,"board":"broken"');assert.deepEqual(errors,[]);await context.close();}
   // 3. The round trip: an older build kept the pilot camp aside (-damaged) and started another one;
   //    back in this build, Kept camps restores it and keeps the other camp too.
   {const {context,page,errors}=await open({[KEY]:OTHER,[KEY+'-damaged']:PILOT});
    assert.equal(await page.locator('#homeKept').isVisible(),false,'a readable save: Continue, no restore offer on Home');
    await page.locator('#homeSettings').click();await page.waitForSelector('#menu[open]');
    assert.equal(await page.locator('#keptButton').textContent(),'Kept camps (1)');await page.locator('#keptButton').click();
    await page.waitForSelector('#kept[open]');assert.equal(await page.locator('#keptList li').count(),1);assert.match(await page.locator('#keptList li').textContent(),/Landing Beach · \d+ of \d+ stages built/);
    await Promise.all([page.waitForEvent('load'),page.locator('#keptList [data-restore]').click()]);await homeUsable(page);
    const after=await all(page);assert.ok(sameCamp(after[KEY],PILOT),'the pilot camp is back');assert.ok(sameCamp(after[KEY+'-kept'],OTHER),'the camp it replaced is kept');assert.equal(after[KEY+'-damaged'],PILOT,'kept copies stay');
    assert.equal(await page.locator('#homePlay span').textContent(),'Continue');
    await page.locator('#homePlay').click();await page.waitForSelector('#home',{state:'hidden'});
    assert.ok(await page.locator('#board .tile.item img[src*="mech-"]').count()+await page.locator('#board img[src*="mech-"]').count()>0,'its Bolts and Gears are on the board');
    assert.deepEqual(errors,[]);await context.close();}
   // 4. ?new=1 keeps the camp it replaces.
   {const {context,page,errors}=await open({[KEY]:PILOT},'play.html?new=1');
    await page.locator('#homePlay').click();await skipStory(page);await page.waitForSelector('#home',{state:'hidden'});await page.waitForTimeout(300);
    const after=await all(page);assert.equal(after[KEY+'-kept'],PILOT,'kept, exactly as stored, before the new camp was saved');assert.notEqual(after[KEY],PILOT);
    assert.deepEqual(errors,[]);await context.close();}
   // 5. The menu's "Start the Coast Camp again" keeps the camp it replaces (once, however often).
   {const {context,page,errors}=await open({[KEY]:PILOT});
    await page.locator('#homePlay').click();await page.waitForSelector('#home',{state:'hidden'});
    await page.locator('#menuButton').click();await page.locator('#newGame').click();await skipStory(page).catch(()=>{});await page.waitForTimeout(400);
    let after=await all(page);assert.ok(sameCamp(after[KEY+'-kept'],PILOT),'the camp is kept');assert.notEqual(after[KEY],PILOT);
    await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
    await page.locator('#menuButton').click();assert.equal(await page.locator('#keptButton').textContent(),'Kept camps (1)');
    assert.deepEqual(errors,[]);await context.close();}
   console.log(`${engine} Coast Camp saves: newer save said and kept, damaged kept, kept camp restored (round trip), ?new=1 and start-again keep the camp passed`);
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
