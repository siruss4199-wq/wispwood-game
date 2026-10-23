// Coast Camp in a real browser at 360/390/430 px: the scripted player's choices are
// made through visible taps only, through two restorations; then reload, the map,
// the menu, and the Classic save left untouched.
// Rivet Rover's camp sits in the middle; sealed cargo and tideglass cover the rest, and crates
// touching open ground show the (well-merged) part that opens them.
const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8080/v5/play.html';
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')));
async function closeBeats(page){for(let n=0;n<6&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').tap();await page.waitForTimeout(80);}}
// Merging, opening cargo and moving are done by dragging only (build 24).
async function dragTo(page,from,to){const a=await page.locator(`#board [data-index="${from}"]`).boundingBox(),b=await page.locator(`#board [data-index="${to}"]`).boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:6});await page.mouse.up();}
async function perform(page,a){
 const s=await read(page),tile=i=>page.locator(`#board [data-index="${i}"]`),pressed=async i=>await tile(i).getAttribute('aria-pressed')==='true';
 if(a.type==='produce')await tile(s.board.findIndex(x=>x?.type==='source'&&x.id===a.id)).tap();
 else if(a.type==='merge')await dragTo(page,a.from,a.to);
 else if(a.type==='openKit'){if(!await pressed(a.index))await tile(a.index).tap();await page.locator('#selection [data-action="openKit"]').tap();}
 else if(a.type==='deliver')await page.locator(`[data-order="${a.id}"]`).tap();
 // Upgrades happen on the separate beach screen: go there, upgrade, watch the story, come back.
 else if(a.type==='restore'){await page.locator('#mapButton').tap();await page.locator(`#coastMap [data-restore="${a.id}"]`).tap();await closeBeats(page);await page.locator('#coastMap [data-back]').tap();}
 else if(a.type==='recycle'){if(!await pressed(a.index))await tile(a.index).tap();await page.locator('#selection [data-action="recycle"]').tap();}
 else if(a.type==='ration')await page.locator('#rationButton').tap();
 else if(a.type==='unseal')await dragTo(page,a.from,a.index);
 else throw Error('Unexpected action '+JSON.stringify(a));
 await page.waitForFunction(n=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).moves>n,s.moves,{timeout:4000});
}
(async()=>{
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  try{for(const width of [360,390,430]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(URL);
   // A Classic save in the same browser must never be touched.
   const classic=JSON.stringify({version:5,marker:'classic'});
   await page.evaluate(v=>{localStorage.clear();localStorage.setItem('vaultwake-v5',v);},classic);
   await page.reload();await page.waitForSelector('#board .tile');
   assert.equal(await page.locator('#beat[open]').count(),1,'the area intro plays on a new camp');await closeBeats(page);
   assert.equal(await page.locator('#board .tile').count(),49);
   assert.equal(await page.locator('#board .tile.cargo').count(),27,'sealed cargo covers most of the board');assert.equal(await page.locator('#board .tile.glass').count(),13,'half-buried parts ring the camp, more near each generator');assert.equal(await page.locator('#board .cargoKey').count(),6,'only the crates touching the camp show their keys');assert.equal(await page.locator('#board .tile.cargo.deep').count(),21,'the rest are buried deeper');assert.equal(await page.locator('#board .tile.source').count(),1,'one generator to start');assert.equal(await page.locator('#board [data-index="21"]').getAttribute('data-family'),'rig','Rivet Rover stands in the middle');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no sideways scroll');
   for(const t of await page.locator('#board .tile').all()){const b=await t.boundingBox();assert.ok(b.width>=44&&b.height>=44,'44px touch targets');}
   for(const sel of ['#energyPill','#coinPill','#levelPill','#mapButton','#menuButton']){const b=await page.locator(sel).boundingBox();assert.ok(b&&b.x>=0&&b.x+b.width<=width,sel+' fits the header');}
   // The daily gift is checked on its own below; here it is already open today so it never covers a tap.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.daily={day:9e6,count:1};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   let restores=0;
   // Play on until two places are restored and the Survey Kite has come out of its cargo.
   for(let n=0;n<400&&(restores<2||!(await read(page)).board.some(x=>x?.type==='source'&&x.id==='chart'));n++){
    const a=await page.evaluate(async()=>{const {nextAction}=await import('/tests/v5-next-policy.mjs');return nextAction(JSON.parse(localStorage.getItem('vaultwake-v5-coast')));});
    assert.ok(a,'the scripted player always has a move early on');
    await perform(page,a);if(a.type==='restore')restores++;
   }
   assert.ok(restores>=2,'places restored through the UI');
   const s=await read(page);assert.ok(s.built['beach-path']>=1,'the landing path came first');assert.equal(s.stars,undefined);assert.ok(Number.isInteger(s.coins));
   assert.equal(await page.locator('.world, #scene, #taskButton').count(),0,'the board screen has no beach picture or upgrade card');
   assert.ok(await page.locator('#board .tile.cargo').count()<27,'cargo was opened by laying parts on it');assert.equal(await page.locator('#board .tile.source[data-family="chart"]').count(),1,'Rivet Rover level 3 brought out the Survey Kite');
   await page.reload();await page.waitForSelector('#board .tile');
   assert.deepEqual((await read(page)).board,s.board,'reload keeps the board');assert.equal(await page.locator('#beat[open]').count(),0,'no intro on a running camp');
   await page.locator('#mapButton').tap();assert.equal(await page.locator('#coastMap .place').count(),7);
   assert.equal(await page.locator('#coastMap .place .pips i.on').count(),Object.values(s.built).reduce((a,b)=>a+b,0),'the beach screen shows every stage');
   assert.equal(await page.locator('#coastMap .beachScene .restoredIcon').count(),Object.keys(s.built).length,'upgraded places stand on the beach picture');
   {const b=await page.locator('#coastMap').boundingBox();assert.ok(b.width>=width-1,'the beach is a full screen of its own');}
   assert.equal(await page.evaluate(()=>document.querySelector('#coastMap').scrollWidth<=innerWidth),true,'no sideways scroll on the beach');
   await page.locator('#coastMap [data-back]').tap();assert.equal(await page.locator('#coastMap[open]').count(),0,'back to the board');
   await page.locator('#menuButton').tap();assert.equal(await page.locator('#classicLink').getAttribute('href'),'index.html');await page.locator('#menu .close').tap();
   assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5')),classic,'Classic save untouched');
   assert.match(await page.locator('#build').textContent(),/BUILD \d/,'the footer names the build');
   // The playtest page's "start from the beginning" link starts a new camp and cleans the address.
   await page.goto(URL+'?new=1');await page.waitForSelector('#board .tile');await closeBeats(page);
   assert.equal((await read(page)).moves,0);assert.equal(new globalThis.URL(page.url()).search,'');
   assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5')),classic,'Classic save still untouched');
   // Build 32: the daily gift opens by itself once the session is under way.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.moves=5;localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');
   await page.waitForSelector('#daily[open]',{timeout:4000});assert.equal(await page.locator('#daily .dailyDay').count(),7);assert.equal(await page.locator('#daily .dailyDay.today').count(),1);
   {const e=(await read(page)).energy;await page.locator('#daily [data-claim]').tap();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).daily.count===1,null,{timeout:4000});
    assert.equal((await read(page)).energy,e+10,'day 1: +10 energy');assert.equal(await page.locator('#daily[open]').count(),0);assert.equal(await page.locator('#dailyButton').isHidden(),true,'no gift button until tomorrow');}
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.daily={day:9e6,count:1};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   // Tideglass takes no part: a strong enough merge in the camp space beside it (14) cracks it.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.board[14]={type:'item',family:'rig',tier:1};s.board[16]={type:'item',family:'rig',tier:1};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   assert.equal(await page.locator('#board .tile.tide, #board .tideBadge').count(),0,'no tide cells');
   // A tap on a part, then on its twin, no longer merges: only a drag does.
   await page.locator('#board [data-index="16"]').tap();await page.locator('#board [data-index="14"]').tap();await page.waitForTimeout(150);
   assert.equal((await read(page)).board[16]?.tier,1,'tapping twins does not merge them');
   await dragTo(page,16,14);
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).board[8].cracks===1,null,{timeout:4000});
   assert.equal(await page.locator('#board [data-index="8"].glass.cracked').count(),1,'the glass beside the merge shows its crack');
   // Generators grow by merging: drag a second Rivet Rover onto the first.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.board[15]={type:'source',id:'rig'};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   {const a=await page.locator('#board [data-index="15"]').boundingBox(),b=await page.locator('#board [data-index="21"]').boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:6});await page.mouse.up();}
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).board[21].level===2,null,{timeout:4000});
   assert.equal((await read(page)).board[15],null);assert.match(await page.locator('#board [data-index="21"]').textContent(),/Lv2/);
   assert.equal(await page.locator('#board .source[data-family="chart"]').count(),0,'level 2 is not yet enough for the Survey Kite');
   // Touch drag (a finger, not a mouse), straight down: a generator copy onto the Rover. The page must not scroll it away.
   if(engine==='chromium'){
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.board[15]={type:'source',id:'rig',level:2};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
    await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
    const cdp=await context.newCDPSession(page),at=async i=>{const r=await page.locator(`#board [data-index="${i}"]`).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};},a=await at(15),z=await at(21);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y}]});
    for(let k=1;k<=10;k++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x,y:a.y+(z.y-a.y)*k/10}]});await page.waitForTimeout(16);if(k===8)assert.equal(await page.locator('.dragGhost').count(),1,'a copy follows the finger');}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).board[21].level===3,null,{timeout:4000});
    assert.equal(await page.locator('.dragGhost').count(),0,'the copy is gone after the drop');
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.board[21].level=2;s.board=s.board.map((x,i)=>x?.type==='source'&&x.id==='chart'?null:x);localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   }
   // A Brass cog: tap it, then the Rover, and the Rover goes up a level.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.board[15]={type:'cog'};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   assert.equal(await page.locator('#board [data-index="15"].cog').count(),1,'the cog stands on the board');
   await page.locator('#board [data-index="15"]').tap();assert.match(await page.locator('#selection').textContent(),/generator/);
   await dragTo(page,15,21);
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).board[21].level===3,null,{timeout:4000});
   assert.ok(!(await read(page)).board.some(x=>x?.type==='cog'),'the cog is used up');
   assert.equal(await page.locator('#board .source[data-family="chart"]').count(),1,'Rivet Rover level 3 brought out the Survey Kite');
   // Build 32: the shed. Drag a part from the board onto a shed space; tap the space to bring it back.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.board[14]={type:'item',family:'rig',tier:1};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   assert.equal(await page.locator('#shed .shedSlot').count(),4);
   {const a=await page.locator('#board [data-index="14"]').boundingBox(),b=await page.locator('#shed [data-slot="2"]').boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();}
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).shed[2]?.tier===1,null,{timeout:4000});
   assert.equal((await read(page)).board[14],null);assert.equal(await page.locator('#shed .shedSlot.full').count(),1);
   {const b=await page.locator('#shed [data-slot="2"]').boundingBox();assert.ok(b.width>=44&&b.height>=44,'44px shed spaces');}
   await page.locator('#shed [data-slot="2"]').tap();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).shed[2]===null,null,{timeout:4000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no sideways scroll with the shed');
   // Build 31: the beach's last stage opens the Survey Worksite, its intro and its screen.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.built={'beach-path':3,'beach-tent':3,'beach-mast':3,'beach-workshop':3,'beach-pier':3,'beach-beacon':3,'beach-cliff':2};s.coins=200;localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   assert.equal(await page.locator('#mapButton span').textContent(),'BEACH');
   await page.locator('#mapButton').tap();await page.locator('#coastMap [data-restore="beach-cliff"]').tap();await closeBeats(page);
   assert.equal((await read(page)).area,1,'the worksite is open');
   assert.equal(await page.locator('#coastMap #mapTitle').textContent(),'Survey Worksite');assert.equal(await page.locator('#coastMap .place').count(),7);
   assert.equal(await page.locator('#coastMap .mapArea.done').count(),1,'the finished beach stays listed');assert.equal(await page.locator('#coastMap [data-restore="ws-camp"]').count(),1);
   assert.equal(await page.evaluate(()=>document.querySelector('#coastMap').scrollWidth<=innerWidth),true,'no sideways scroll at the worksite');
   await page.locator('#coastMap [data-back]').tap();
   assert.equal(await page.locator('#mapButton span').textContent(),'SITE');assert.equal(await page.locator('#areaBrand').textContent(),'SURVEY WORKSITE');
   {const b=await page.locator('#mapButton').boundingBox();assert.ok(b.x+b.width<=width,'the SITE button fits the header');}
   assert.deepEqual(errors,[]);
   console.log(`${engine} ${width} Coast Camp: intro → orders → 2 restorations → reload → map → worksite → daily gift → shed passed`);
   await context.close();
  }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
