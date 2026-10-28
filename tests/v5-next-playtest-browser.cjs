// Coast Camp Build 41 M5/M6 in a real browser: the prototype-complete screen (once, also for a
// save that finished before it existed) and the local playtest log (a 20-minute session exported
// as valid JSON, kept across reloads, never sent anywhere). Time is moved forward with a shifted
// Date.now so 20 minutes do not take 20 minutes.
const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');const {throughHome}=require('./v5-next-home-helper.cjs');
// Developer mode (?dev=1): these tests also check the playtest log, the Classic link and the ad
// stand-in, which players do not see (2026-10-26).
const URL='http://127.0.0.1:8080/v5/play.html?dev=1';
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')));
const write=(page,f)=>page.evaluate(f);
async function closeBeats(page){for(let n=0;n<8&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').tap();await page.waitForTimeout(60);}}
(async()=>{
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  try{for(const width of [360,390]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   await context.addInitScript(()=>{const real=Date.now;Date.now=()=>real()+(Number(sessionStorage.getItem('shift'))||0);});
   const page=await context.newPage(),errors=[],requests=[];throughHome(page);page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8080/'))requests.push(r.url());});
   await page.goto(URL+'&new=1');await page.waitForSelector('#board .tile');await closeBeats(page);
   // The daily gift is opened elsewhere; here it is already open today.
   await write(page,()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.daily={day:9e6,count:1};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   // A short session through the primary action: taps and a merge.
   for(let k=0;k<6;k++){await page.locator('#hint').tap();await page.waitForTimeout(80);if(await page.locator('#hint').getAttribute('data-kind')==='merge')break;}
   {const s=await read(page);const items=s.board.flatMap((x,i)=>x?.type==='item'&&x.tier===0?[i]:[]);
    const a=await page.locator(`#board [data-index="${items[0]}"]`).boundingBox(),b=await page.locator(`#board [data-index="${items[1]}"]`).boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:6});await page.mouse.up();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).merges>0,null,{timeout:4000});}
   // Twenty minutes later, another tap; then export.
   await page.evaluate(()=>sessionStorage.setItem('shift',String(20*60000)));
   await page.locator('#hint').tap();await page.waitForTimeout(100);
   await page.locator('#menuButton').tap();await page.locator('#playlogButton').tap();
   {const text=await page.locator('#playlogText').inputValue();assert.ok(text.length<=200000,'bounded');const out=JSON.parse(text);
    assert.ok(out.summary.totalMinutes>=20,`a ${out.summary.totalMinutes}-minute session`);assert.ok(out.milestones.firstMerge,'first merge recorded');
    assert.doesNotMatch(text,/Mozilla|AppleWebKit|userAgent/,'no browser identifiers');}
   await page.locator('#playlog .close').tap();
   await page.reload();await page.waitForSelector('#board .tile');
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast-playtest')).sessions.length>=2,null,{timeout:4000});
   // The end of the content (Build 47d: the Tide Archive's last stage, inside the open Vault): buy it,
   // then the end card.
   await write(page,()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));
    s.built={'beach-path':3,'beach-tent':3,'beach-mast':3,'beach-workshop':3,'beach-pier':3,'beach-beacon':3,'beach-cliff':3,'ws-camp':3,'ws-scope':3,'ws-ropes':3,'ws-steps':3,'ws-pool':3,'ws-hoist':3,'ws-door':3,'vault-door':3,'vault-archive':2};
    s.area=3;s.materials={'vault-archive':3};s.coins=500;s.moves=Math.max(s.moves,50);s.daily={day:9e6,count:1};s.seen={door:true,'vault-open':true,archive:true};delete s.seenEnd;localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   assert.equal(await page.locator('#endDialog[open]').count(),0,'not before the end');
   await page.locator('#mapButton').tap();await page.locator('#coastMap [data-restore="vault-archive"]').tap();await closeBeats(page);
   await page.waitForSelector('#endDialog[open]',{timeout:4000});
   {const t=await page.locator('#endContent').textContent();assert.match(t,/The archive is read/);assert.match(t,/48 stages/);assert.doesNotMatch(t,/20\d\d|January|February|March|April|May|June|July|August|September|October|November|December/,'no release date');}
   assert.equal(await page.locator('#endContent [data-keep]').count(),1);assert.equal(await page.locator('#endContent [data-feedback]').count(),1);
   await page.locator('#endContent [data-keep]').tap();assert.equal(await page.locator('#endDialog[open]').count(),0,'keep playing returns to the game');
   assert.equal((await read(page)).seenEnd,true);
   await page.reload();await page.waitForSelector('#board .tile');await page.waitForTimeout(900);
   assert.equal(await page.locator('#endDialog[open]').count(),0,'shown once');
   // A save that finished before Build 41 sees it on its next visit; feedback opens the log with questions.
   await write(page,()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));delete s.seenEnd;localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#endDialog[open]',{timeout:4000});
   await page.locator('#endContent [data-feedback]').tap();await page.waitForSelector('#playlog[open]');
   assert.match(await page.locator('#playlogText').inputValue(),/What was the most fun\?/);
   {const raw=await page.locator('#playlogText').inputValue();JSON.parse(raw.slice(raw.indexOf('{')));}
   assert.ok(JSON.parse(await page.evaluate(()=>localStorage.getItem('vaultwake-v5-coast-playtest'))).milestones.complete,'completion recorded');
   assert.deepEqual(requests,[],'nothing is sent off the page');
   assert.deepEqual(errors,[]);
   console.log(`${engine} ${width} Coast Camp: playtest log (20 min) → reload → end screen once → feedback passed`);
   await context.close();
  }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
