// Coast Camp first-play story (Build 46q) in a real browser: the first new camp's Play shows the
// three scenes with the exact lines (Next → Next → Check supplies); Skip from every scene goes to
// the same board; the story gives nothing (the camp is exactly a new one); a reload mid-story
// writes no save and starts the story again from the top, with no second start of the game;
// Continue on a save, Home and back, and a new camp from the menu never show it; the board's
// taps and drags work afterwards; reduced motion and the keyboard.
const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');
const BASE='http://127.0.0.1:8080/v5/play.html',KEY='vaultwake-v5-coast',STORY='vaultwake-v5-coast-story';
const LINES=[[null,'An unsigned letter led you to this forgotten coast.','Next'],
 ['Bram','That seal… it’s on the Vault, too. Who sent you this?','Next'],
 ['Ivo','Answers can wait a moment. Let’s clear the landing and sort our supplies.','Check supplies']];
const COUNT=`window.__n={iv:0};{const si=window.setInterval;window.setInterval=function(...a){__n.iv++;return si.apply(this,a);};}`;
const get=(page,k)=>page.evaluate(k=>localStorage.getItem(k),k);
const usable=page=>page.waitForSelector('#homePlay:not([hidden])',{timeout:20000});
async function skipBeats(page){for(let n=0;n<10&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(60);}}
async function line(page){return page.evaluate(()=>[document.querySelector('#storyWho').hidden?null:document.querySelector('#storyWho').textContent,document.querySelector('#storyText').textContent,document.querySelector('#storyNext').textContent,document.querySelector('#story').dataset.scene]);}
// the camp right after the story is exactly a new camp: no coins, energy, parts or places from it
function isNew(s,tag){assert.equal(s.moves,0,tag);assert.equal(s.coins,0,tag);assert.equal(s.energy,30,tag);assert.deepEqual(s.built,{},tag);assert.equal(s.ordersDone,0,tag);}
async function drag(page,a,z){const A=await page.locator(`#board [data-index="${a}"]`).boundingBox(),Z=await page.locator(`#board [data-index="${z}"]`).boundingBox();
 await page.mouse.move(A.x+A.width/2,A.y+A.height/2);await page.mouse.down();await page.mouse.move(Z.x+Z.width/2,Z.y+Z.height/2,{steps:8});await page.mouse.up();await page.waitForTimeout(250);}

(async()=>{
 const engines=(process.env.ENGINES||'chromium,webkit').split(',').map(e=>[e,{chromium,webkit}[e]]);
 for(const [engine,type] of engines){
  let browser;try{browser=await type.launch();}catch(e){if(engine!=='chromium'&&/Executable doesn't exist/.test(e.message)){console.log(`${engine}: not installed here, skipped`);continue;}throw e;}
  const tag=s=>`${engine}: ${s}`;
  const open=async(opts={})=>{const context=await browser.newContext({viewport:{width:390,height:844},isMobile:engine==='chromium',hasTouch:true,...opts});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());await page.addInitScript(COUNT);return {context,page,errors};};
  try{
   // 1. Play → the three scenes with the exact lines → Check supplies → the board.
   {const {context,page,errors}=await open();
    await page.goto(BASE);await usable(page);await page.locator('#homePlay').click();await page.waitForSelector('#story:not([hidden])');
    for(const [k,[who,text,next]] of LINES.entries()){
     const [w,t,n,scene]=await line(page);assert.deepEqual([w,t,n],[who,text,next],tag(`scene ${k+1} lines`));
     assert.equal(scene,['arrival','letter','landing'][k]);assert.ok(await page.locator('#storySkip').isVisible(),tag(`Skip on scene ${k+1}`));
     assert.ok(await page.locator('.storyArt.on').getAttribute('alt'),tag('the picture is described'));
     if(who)assert.match(await page.locator('#storyFace').getAttribute('src'),new RegExp(`crew-${who.toLowerCase()}\\.webp$`),tag('existing portrait'));
     assert.equal(await get(page,KEY),null,tag('no save while the story is up'));
     await page.locator('#storyNext').click();}
    await page.waitForSelector('#home',{state:'hidden'});await page.waitForSelector('#story',{state:'hidden'});
    assert.equal(JSON.parse(await get(page,STORY)).intro,'done');isNew(JSON.parse(await get(page,KEY)),tag('the story gives nothing'));
    // the board's own first-play beat is still there (unchanged), then the board works
    assert.ok(await page.locator('#beat[open]').count(),tag('existing area intro still shown'));await skipBeats(page);
    assert.match(await page.textContent('#hint'),/Tap Rivet Rover/,tag('guidance for an available action'));
    const rover=await page.evaluate(()=>document.querySelector('#board .tile.source').dataset.index);
    await page.locator(`#board [data-index="${rover}"]`).click();await page.waitForTimeout(250);assert.equal(JSON.parse(await get(page,KEY)).energy,29,tag('generator tap'));
    await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.board[30]={type:'item',family:'rig',tier:0};s.board[31]={type:'item',family:'rig',tier:0};s.daily={day:9e6,count:1};localStorage.setItem(k,JSON.stringify(s));},KEY);
    await page.reload();await usable(page);assert.equal((await page.textContent('#homePlay')).trim(),'Continue');await page.locator('#homePlay').click();
    await page.waitForSelector('#home',{state:'hidden'});assert.equal(await page.locator('#story').isVisible(),false,tag('no story on Continue'));
    await skipBeats(page);await drag(page,30,31);assert.deepEqual(JSON.parse(await get(page,KEY)).board[31],{type:'item',family:'rig',tier:1},tag('drag merge after the story'));
    // Home and back: Continue, no story
    await page.locator('#menuButton').click();await page.locator('#homeButton').click();await page.waitForSelector('#home:not([hidden])');
    await page.locator('#homePlay').click();await page.waitForSelector('#home',{state:'hidden'});assert.equal(await page.locator('#story').isVisible(),false,tag('no story from Home'));
    // a new camp from the menu: no story again (already seen)
    await page.locator('#menuButton').click();await page.locator('#newGame').click();await page.waitForTimeout(400);
    assert.equal(await page.locator('#story').isVisible(),false,tag('no story on a later new camp'));
    assert.deepEqual(errors,[]);await context.close();}

   // 2. Skip from every scene: the same board, a new camp, the story marked as skipped.
   for(const k of [0,1,2]){const {context,page,errors}=await open();
    await page.goto(BASE);await usable(page);await page.locator('#homePlay').click();await page.waitForSelector('#story:not([hidden])');
    for(let i=0;i<k;i++)await page.locator('#storyNext').click();
    await page.locator('#storySkip').click();await page.waitForSelector('#home',{state:'hidden'});
    const st=JSON.parse(await get(page,STORY));assert.deepEqual([st.intro,st.scene],['skipped',k+1],tag(`skip from scene ${k+1}`));
    isNew(JSON.parse(await get(page,KEY)),tag(`skip from scene ${k+1} gives nothing`));
    await skipBeats(page);const rover=await page.evaluate(()=>document.querySelector('#board .tile.source').dataset.index);
    await page.locator(`#board [data-index="${rover}"]`).click();await page.waitForTimeout(250);assert.equal(JSON.parse(await get(page,KEY)).energy,29,tag('board plays after Skip'));
    assert.deepEqual(errors,[]);await context.close();}

   // 3. Reload mid-story: no save, no mark; Home offers Play again and the story starts from the
   //    top; the game is started once per page (same timers as without the story).
   {const {context,page,errors}=await open();
    await page.goto(BASE);await usable(page);const iv0=await page.evaluate(()=>__n.iv);
    await page.locator('#homePlay').click();await page.waitForSelector('#story:not([hidden])');await page.locator('#storyNext').click();
    assert.equal(await page.evaluate(()=>__n.iv),iv0,tag('the story starts no timers'));
    await page.reload();await usable(page);
    assert.deepEqual([await get(page,KEY),await get(page,STORY)],[null,null],tag('reload mid-story: nothing written'));
    assert.equal((await page.textContent('#homePlay')).trim(),'Play');await page.locator('#homePlay').click();await page.waitForSelector('#story:not([hidden])');
    assert.equal((await line(page))[3],'arrival',tag('starts again from the top'));
    await page.keyboard.press('Escape');await page.waitForSelector('#home',{state:'hidden'});
    assert.equal(JSON.parse(await get(page,STORY)).intro,'skipped',tag('Escape skips'));
    assert.deepEqual(errors,[]);await context.close();}

   // 4. An existing save from before the story: Continue goes straight to the board.
   {const {context,page}=await open();
    await page.goto(BASE);await usable(page);await page.locator('#storySkip').count();
    await page.locator('#homePlay').click();await page.locator('#storySkip').click();await page.waitForSelector('#home',{state:'hidden'});
    await page.evaluate(k=>localStorage.removeItem(k),STORY);await page.reload();await usable(page);
    assert.equal((await page.textContent('#homePlay')).trim(),'Continue');await page.locator('#homePlay').click();await page.waitForSelector('#home',{state:'hidden'});
    assert.equal(await page.locator('#story').isVisible(),false,tag('an older save is never sent through the story'));
    await context.close();}

   // 5. Reduced motion: no fades; the keyboard drives it (focus on Next, Enter).
   {const {context,page}=await open({reducedMotion:'reduce'});
    await page.goto(BASE);await usable(page);await page.locator('#homePlay').click();await page.waitForSelector('#story:not([hidden])');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.storyArt')).transitionDuration),'0s',tag('no cross-fade'));
    for(let i=0;i<3;i++){assert.equal(await page.evaluate(()=>document.activeElement?.id),'storyNext',tag('Next has focus'));await page.keyboard.press('Enter');}
    assert.equal(await page.locator('#story').isVisible(),false,tag('no fade out'));assert.equal(await page.locator('#home').isVisible(),false);
    await context.close();}

   console.log(`${engine} Coast Camp story: three scenes and exact lines, Check supplies, Skip from each scene, nothing given, reload mid-story, Continue/Home/new camp without it, board taps and drags after, reduced motion, keyboard passed`);
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
