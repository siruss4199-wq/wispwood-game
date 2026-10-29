// Coast Camp in a real browser at 360/390/430 px: the scripted player's choices are
// made through visible taps only, through two restorations; then reload, the map,
// the menu, and the Classic save left untouched.
// Rivet Rover's camp sits in the middle; sealed cargo and tideglass cover the rest, and crates
// touching open ground show the (well-merged) part that opens them.
const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');const {throughHome}=require('./v5-next-home-helper.cjs');
// Developer mode (?dev=1): these tests also check the playtest log, the Classic link and the ad
// stand-in, which players do not see (2026-10-26).
const URL='http://127.0.0.1:8080/v5/play.html?dev=1';
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
 else if(a.type==='restore'){await page.locator('#mapButton').tap();await page.locator(`#coastMap .place[data-place="${a.id}"] button`).tap();await page.locator(`#coastMap [data-restore="${a.id}"]`).tap();await closeBeats(page);await page.locator('#coastMap [data-back]').tap();}
 else if(a.type==='recycle'){if(!await pressed(a.index))await tile(a.index).tap();await page.locator('#selection [data-action="recycle"]').tap();}
 else if(a.type==='ration')await page.locator('#rationButton').tap();
 else if(a.type==='unseal')await dragTo(page,a.from,a.index);
 // The book (build 33): open it, tick the part off (or claim the page's cog), close it.
 else if(a.type==='book'||a.type==='bookPage'){await page.locator('#bookButton').tap();await page.locator(a.type==='book'?`#book [data-key="${a.key}"]`:`#book [data-page="${a.family}"]`).tap();await page.locator('#book .close').tap();}
 // The shed (the secondary-chain pilot's scripted player tidies a rare extra into it and back).
 else if(a.type==='store'){if(!await pressed(a.index))await tile(a.index).tap();await page.locator('#selection [data-action="store"]').tap();}
 else if(a.type==='unstore'){const slot=page.locator(`#shed [data-slot="${a.slot}"]`);if(!await slot.isVisible())await page.locator('#shed [data-shed-toggle]').tap();await slot.tap();}
 else throw Error('Unexpected action '+JSON.stringify(a));
 await page.waitForFunction(n=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).moves>n,s.moves,{timeout:4000});
}
(async()=>{
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  try{for(const width of [360,390,430]){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];throughHome(page);page.on('pageerror',e=>errors.push(e.message));
   await page.goto(URL);
   // A Classic save in the same browser must never be touched.
   const classic=JSON.stringify({version:5,marker:'classic'});
   await page.evaluate(v=>{localStorage.clear();localStorage.setItem('vaultwake-v5',v);},classic);
   await page.reload();await page.waitForSelector('#board .tile');
   assert.equal(await page.locator('#beat[open]').count(),1,'the area intro plays on a new camp');await closeBeats(page);
   assert.equal(await page.locator('#board .tile').count(),49);
   assert.equal(await page.locator('#board .tile.cargo').count(),27,'sealed cargo covers most of the board');assert.equal(await page.locator('#board .tile.glass').count(),17,'half-buried parts ring the camp and fill its corners, more near each generator');assert.equal(await page.locator('#board .cargoKey').count(),2,'only the crates touching open ground show their keys');assert.equal(await page.locator('#board .tile.cargo.deep').count(),25,'the rest are buried deeper');assert.equal(await page.locator('#board .tile.source').count(),1,'one generator to start');assert.equal(await page.locator('#board [data-index="21"]').getAttribute('data-family'),'rig','Rivet Rover stands in the middle');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no sideways scroll');
   for(const t of await page.locator('#board .tile').all()){const b=await t.boundingBox();assert.ok(b.width>=44&&b.height>=44,'44px touch targets');}
   for(const sel of ['#energyPill','#coinPill','#levelPill','#mapButton','#menuButton']){const b=await page.locator(sel).boundingBox();assert.ok(b&&b.x>=0&&b.x+b.width<=width,sel+' fits the header');}
   // The daily gift is checked on its own below; here it is already open today so it never covers a tap.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.daily={day:9e6,count:1};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   let restores=0,waits=0;
   // Play on until two places are restored, the Survey Kite has come out and a cargo is opened
   // (Build 46k: with less early energy the first cargo can come after the Kite).
   for(let n=0;n<600&&(restores<2||!(await read(page)).board.some(x=>x?.type==='source'&&x.id==='chart')||(await read(page)).board.filter(x=>x?.type==='cargo').length>=27);n++){
    const a=await page.evaluate(async()=>{const {nextAction}=await import('/tests/v5-next-policy.mjs');return nextAction(JSON.parse(localStorage.getItem('vaultwake-v5-coast')));});
    // Build 46k (a harder start): energy now runs out early, so with nothing to do the player waits:
    // the save's refill clock is moved back 20 minutes (+10 energy), as a real wait would give.
    if(!a){const e=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.energyAt-=20*60*1000;localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));return s.energy;});
     assert.ok(e<1,'the scripted player only runs out of moves when energy is out');waits++;assert.ok(waits<=20,'a few waits, not a stuck board');
     await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);continue;}
    await perform(page,a);if(a.type==='restore')restores++;
   }
   assert.ok(restores>=2,'places restored through the UI');
   const s=await read(page);assert.ok(s.built['beach-path']>=1,'the landing path came first');assert.equal(s.stars,undefined);assert.ok(Number.isInteger(s.coins));
   assert.equal(await page.locator('.world, #scene, #taskButton').count(),0,'the board screen has no beach picture or upgrade card');
   assert.ok(await page.locator('#board .tile.cargo').count()<27,'cargo was opened by laying parts on it');assert.equal(await page.locator('#board .tile.source[data-family="chart"]').count(),1,'Rivet Rover level 3 brought out the Survey Kite');
   await page.reload();await page.waitForSelector('#board .tile');
   assert.deepEqual((await read(page)).board,s.board,'reload keeps the board');assert.equal(await page.locator('#beat[open]').count(),0,'no intro on a running camp');
   await page.locator('#mapButton').tap();assert.equal(await page.locator('#coastMap .place').count(),7);
   // Build 41n: the beach's own painted map, places as layers on it, small markers with 44 px
   // targets, the places in one row and coming areas folded away.
   assert.match(await page.locator('#coastMap .beachScene.mapped .sceneBase').getAttribute('src'),/landing-map\.webp$/);
   for(const m of await page.locator('#coastMap .siteMarker').all()){const r=await m.boundingBox();assert.ok(r.width>=44&&r.height>=44,'marker touch target');}
   {const tops=new Set(await page.locator('#coastMap .places .place').evaluateAll(l=>l.map(e=>Math.round(e.getBoundingClientRect().top))));assert.equal(tops.size,1,'the places sit in one row');}
   // Build 47e: four after the beach (the worksite, the Vault Entrance, the Observatory, the Hidden Harbour)
   assert.equal(await page.locator('#coastMap details.mapFuture:not([open]) .mapArea.coming').count(),4,'coming areas are folded');
   assert.equal(await page.locator('#coastMap .place .pips i.on').count(),Object.values(s.built).reduce((a,b)=>a+b,0),'the beach screen shows every stage');
   assert.equal(await page.locator('#coastMap .beachScene .restoredIcon').count(),Object.keys(s.built).length,'upgraded places stand on the beach picture');
   {const b=await page.locator('#coastMap').boundingBox();assert.ok(b.width>=width-1,'the beach is a full screen of its own');}
   // Build 37: the picture starts storm-grey and each upgraded place brings back a patch of colour.
   {const built=Object.values(s.built).reduce((a,b)=>a+b,0),p=+(await page.locator('#coastMap .beachScene').getAttribute('style')).match(/--p:([\d.]+)/)[1];
    assert.ok(Math.abs(p-built/21)<.001,'the storm lifts with every stage');assert.equal(await page.locator('#coastMap .sceneBase').count(),1);
    const mask=await page.locator('#coastMap .sceneColor').evaluate(e=>getComputedStyle(e).webkitMaskImage||getComputedStyle(e).maskImage);assert.match(mask,/radial-gradient/,'colour comes back around each place');
    assert.equal(await page.locator('#coastMap .beachScene.complete').count(),0);}
   // Builds 38–39: every beach place is drawn as it stands at its stage.
   for(const [id,art] of [['beach-path','path'],['beach-tent','tent'],['beach-mast','mast'],['beach-workshop','workshop'],['beach-pier','pier'],['beach-beacon','beacon'],['beach-cliff','cliff']]){const n=s.built[id]??0;
    const src=await page.locator(`#coastMap [data-place="${id}"] .placeIcon img`).getAttribute('src');assert.equal(src,`assets/premium/coast/place-${art}-${Math.max(1,n)}.webp`);
    if(n)assert.equal(await page.locator(`#coastMap .restoredIcon.staged[data-task="${id}"] img`).getAttribute('src'),src);}
   assert.equal(await page.evaluate(()=>[...document.querySelectorAll('#coastMap img')].filter(i=>i.complete&&i.naturalWidth===0).length),0,'every picture loads');
   assert.equal(await page.evaluate(()=>document.querySelector('#coastMap').scrollWidth<=innerWidth),true,'no sideways scroll on the beach');
   await page.locator('#coastMap [data-back]').tap();assert.equal(await page.locator('#coastMap[open]').count(),0,'back to the board');
   await page.locator('#menuButton').tap();assert.equal(await page.locator('#classicLink').getAttribute('href'),'index.html');await page.locator('#menu .close').tap();
   assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-v5')),classic,'Classic save untouched');
   assert.match(await page.locator('#build').textContent(),/BUILD \d/,'the footer names the build');
   // The playtest page's "start from the beginning" link starts a new camp and cleans the address.
   await page.goto(URL+'&new=1');await page.waitForSelector('#board .tile');await closeBeats(page);
   assert.equal((await read(page)).moves,0);assert.equal(new globalThis.URL(page.url()).search,'?dev=1','new=1 is cleaned from the address, other parameters stay');
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
   // Build 32: the shed. Since Build 44 it is one folded row (how full it is) that opens on a tap,
   // a drag or a part's own Shed button. Then drag a part onto a shed space; tap the space to
   // bring it back.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.board[14]={type:'item',family:'rig',tier:1};s.board[16]={type:'item',family:'chart',tier:0};for(const i of [26,28])if(s.board[i]?.type==='glass')s.board[i]=null;localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   assert.equal(await page.locator('#shed .shedToggle').isVisible(),true,'the folded shed row is always there');
   assert.equal(await page.locator('#shed .shedSlots').isHidden(),true,'its spaces are folded away');
   await page.locator('#board [data-index="16"]').tap();await page.locator('#selection [data-action="store"]').tap();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).shed[0]?.family==='chart',null,{timeout:4000});
   assert.equal(await page.locator('#shed .shedSlots').isVisible(),true,'storing a part opens the shed');
   assert.equal(await page.locator('#shed .shedSlot').count(),4);
   {const a=await page.locator('#board [data-index="14"]').boundingBox(),b=await page.locator('#shed [data-slot="2"]').boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();}
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).shed[2]?.tier===1,null,{timeout:4000});
   assert.equal((await read(page)).board[14],null);assert.equal(await page.locator('#shed .shedSlot.full').count(),2);
   {const b=await page.locator('#shed [data-slot="2"]').boundingBox();assert.ok(b.width>=44&&b.height>=44,'44px shed spaces');}
   await page.locator('#shed [data-slot="2"]').tap();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).shed[2]===null,null,{timeout:4000});
   await page.locator('#shed [data-slot="0"]').tap();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).shed.every(x=>x===null),null,{timeout:4000});
   assert.equal(await page.locator('#shed .shedSlots').isHidden(),true,'an empty shed folds away again');
   assert.match(await page.locator('#shed .shedToggle').textContent(),/0\/4/,'and shows it is empty');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no sideways scroll with the shed');
   // Build 33: the collection book. Parts already found wait in it; ticking one off pays its coins.
   {const st=await read(page),c=st.coins,n=st.found.filter(k=>/^(rig|chart|rope|shell|lamp)\d$/.test(k)&&!st.book.claimed.includes(k)).length;
    assert.ok(n>=1,'something waits in the book');assert.equal(await page.locator('#bookCount').textContent(),String(n));
    await page.locator('#bookButton').tap();assert.equal(await page.locator('#book .bookPage').count(),5,'a page per generator chain');
    await page.locator('#book [data-key]').first().tap();
    await page.waitForFunction(c=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).coins>c,c,{timeout:4000});
    assert.equal((await read(page)).book.claimed.length,st.book.claimed.length+1);
    assert.equal(await page.evaluate(()=>document.querySelector('#book').scrollWidth<=document.querySelector('#book').clientWidth),true,'no sideways scroll in the book');
    await page.locator('#book .close').tap();}
   // Build 34: the shop sells for coins; an ad offer plays the stand-in here (no ad network) and pays only when it ends.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.coins=100;s.energy=10;localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   await page.locator('#shopButton').tap();assert.equal(await page.locator('#shop .shopItem').count(),6);
   await page.locator('#shop [data-buy="chest"]').tap();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).coins===60,null,{timeout:4000});
   await page.locator('#shop [data-ad="adEnergy"]').tap();await page.locator('#adStandIn [data-skip]').tap();await page.waitForTimeout(150);
   assert.equal((await read(page)).energy,10,'an ad closed early pays nothing');
   await page.locator('#shop [data-ad="adEnergy"]').tap();await page.waitForSelector('#adStandIn [data-collect]',{timeout:8000});await page.locator('#adStandIn [data-collect]').tap();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).energy===25,null,{timeout:4000});
   assert.equal(await page.evaluate(()=>document.querySelector('#shop').scrollWidth<=document.querySelector('#shop').clientWidth),true,'no sideways scroll in the shop');
   await page.locator('#shop .close').tap();
   for(const sel of ['#shopButton','#bookButton']){const b=await page.locator(sel).boundingBox();assert.ok(b.height>=40&&b.x+b.width<=width,sel+' fits');}
   // Build 36: a tapped order that is not ready can be changed; the gold one cannot.
   {const st=await read(page),o=st.orders.find(o=>!o.story&&!o.needs.every(r=>st.board.filter(x=>x?.type==='item'&&x.family===r.family&&x.tier===r.tier).length>=r.count));
    if(o){await page.locator(`[data-order="${o.id}"]`).tap();assert.equal(await page.locator('#orderTools [data-swap]').count(),1,'a free change is offered');
     await page.locator('#orderTools [data-swap]').tap();await page.waitForFunction(id=>!JSON.parse(localStorage.getItem('vaultwake-v5-coast')).orders.some(o=>o.id===id),o.id,{timeout:4000});
     assert.equal((await read(page)).swaps.n,1);assert.equal(await page.locator('#orderTools').isHidden(),true);}
    const g=(await read(page)).orders.find(o=>o.story);if(g){await page.locator(`[data-order="${g.id}"]`).tap();assert.equal(await page.locator('#orderTools button').count(),0,'the gold order stays');await page.locator(`[data-order="${g.id}"]`).tap();}}
   // Build 41 M3/M4: one primary action, the tapped order's generator, upgrade shortfalls, the
   // spend receipt, at most two attention marks, and clearing a part only when the board is full.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));const f=JSON.parse(JSON.stringify(s));
    f.board=f.board.map((x,i)=>[14,15,16,20,22,26,27,28].includes(i)?null:x);f.coins=10;f.built={};f.area=0;f.orders=[{id:'q1',who:'ivo',needs:[{family:'rig',tier:2,count:1}],coins:10},{id:'q2',who:'ivo',needs:[{family:'rig',tier:3,count:1}],coins:25},{id:'q3',who:'neri',needs:[{family:'rig',tier:1,count:2}],coins:15,story:'beach-path'}];f.slots=3;f.energy=30;f.materials={};
    localStorage.setItem('vaultwake-v5-coast',JSON.stringify(f));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   assert.equal(await page.locator('#hint').getAttribute('data-kind'),'tap');assert.match(await page.locator('#hint').textContent(),/Tap Rivet Rover/);
   {const before=(await read(page)).taps.rig;await page.locator('#hint').tap();await page.waitForFunction(n=>JSON.parse(localStorage.getItem('vaultwake-v5-coast')).taps.rig>n,before,{timeout:4000});}
   {const bb=await page.locator('#board').boundingBox(),vh=page.viewportSize().height;assert.ok(bb.y+bb.height<=vh,'the whole board is on screen');if(width===390)assert.ok(bb.height/vh>=.43,`the board is ${(100*bb.height/vh).toFixed(0)}% of the screen`);
    const primary=await page.locator('.primaryAction:visible, button.primary:visible').count();assert.equal(primary,1,'one primary action on the board screen');
    const marks=await page.evaluate(()=>['#mapReady','#adEnergyButton','#dailyButton','#bookCount'].filter(q=>{const e=document.querySelector(q);return e&&!e.hidden&&e.getClientRects().length;}).length);assert.ok(marks<=2,`${marks} attention marks`);}
   await page.locator('[data-order="q2"]').tap();assert.equal(await page.locator('#board [data-index="21"].orderSource').count(),1,'the tapped order lights its generator');await page.locator('[data-order="q2"]').tap();
   // Build 41: a stage needs its gold order's materials as well as coins.
   await page.locator('#mapButton').tap();assert.equal(await page.locator('#mapCard').getAttribute('data-card'),'beach-path');assert.equal(await page.locator('#coastMap [data-restore]').count(),0,'no Build button without materials');
   assert.match(await page.locator('#mapCard').textContent(),/Gold order/);
   // Build 41e: the card's button goes to the gold order on the board.
   {const id=(await read(page)).orders.find(o=>o.story)?.id;if(id){await page.locator('#mapCard [data-make]').tap();assert.equal(await page.locator('#coastMap[open]').count(),0);assert.equal(await page.locator(`[data-order="${id}"].active`).count(),1,'the gold order is marked');await page.locator(`[data-order="${id}"]`).tap();}
    else await page.locator('#coastMap [data-back]').tap();}
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.materials={'beach-path':1};localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   await page.locator('#mapButton').tap();assert.match(await page.locator('#mapCard [data-go]').textContent(),/Earn 30 more/);assert.match(await page.locator('#mapCard').textContent(),/Materials/);await page.locator('#coastMap [data-back]').tap();
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.coins=40;localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   await page.locator('#mapButton').tap();await page.locator('#coastMap [data-restore="beach-path"]').tap();
   assert.match(await page.locator('#beat .beatReceipt').textContent(),/−40 coins/);await closeBeats(page);await page.locator('#coastMap [data-back]').tap();
   // A full board with no twins and a full shed still has a way out.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));let k=0;const fam=['rig','chart','rope','shell','lamp'];
    s.board=s.board.map(x=>x===null?{type:'item',family:fam[k%5],tier:Math.floor(k++/5)}:x);s.shed=s.shed.map((_,i)=>({type:'item',family:'rig',tier:i+1}));localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   {const i=(await read(page)).board.findIndex(x=>x?.type==='item');await page.locator(`#board [data-index="${i}"]`).tap();assert.match(await page.locator('#selection [data-action="recycle"]').textContent(),/Clear space/);}
   // Build 41 M6: the playtest log is kept across reloads and exports as JSON (never sent).
   {const st=await read(page);assert.ok(await page.evaluate(()=>!!localStorage.getItem('vaultwake-v5-coast-playtest')),'the log is written');
    await page.locator('#menuButton').tap();await page.locator('#playlogButton').tap();
    const out=JSON.parse(await page.locator('#playlogText').inputValue());assert.ok(out.summary.sessions>=2,'sessions from earlier reloads are kept');assert.ok(out.milestones.firstMerge&&out.milestones.firstOrder&&out.milestones.firstStage);
    assert.ok(out.counts.order>=1&&out.counts.stage>=1);assert.equal((await read(page)).moves,st.moves,'opening the log changes nothing in the game');
    await page.locator('#playlog .close').tap();}
   // Build 31: the beach's last stage opens the Survey Worksite, its intro and its screen.
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5-coast'));s.built={'beach-path':3,'beach-tent':3,'beach-mast':3,'beach-workshop':3,'beach-pier':3,'beach-beacon':3,'beach-cliff':2};s.materials={'beach-cliff':3};s.coins=300;localStorage.setItem('vaultwake-v5-coast',JSON.stringify(s));});
   await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
   // Build 45: the restoration strip is the way to the coast; it names the area it opens.
   assert.match(await page.locator('#mapButton').getAttribute('aria-label'),/Landing Beach/);
   await page.locator('#mapButton').tap();await page.locator('#coastMap [data-restore="beach-cliff"]').tap();await closeBeats(page);
   assert.equal((await read(page)).area,1,'the worksite is open');
   assert.equal(await page.locator('#coastMap #mapTitle').textContent(),'Survey Worksite');assert.equal(await page.locator('#coastMap .place').count(),7);
   assert.equal(await page.locator('#coastMap .mapArea.done').count(),1,'the finished beach stays listed');
   assert.equal(await page.locator('#coastMap [data-place="ws-hoist"] .placeIcon img').getAttribute('src'),'assets/premium/coast/place-ws-hoist-1.webp','worksite places are drawn too (build 40)');assert.equal(await page.locator('#mapCard').getAttribute('data-card'),'ws-camp','the worksite card is its first place');
   assert.equal(await page.evaluate(()=>document.querySelector('#coastMap').scrollWidth<=innerWidth),true,'no sideways scroll at the worksite');
   await page.locator('#coastMap [data-back]').tap();
   assert.match(await page.locator('#mapButton').getAttribute('aria-label'),/Survey Worksite/);assert.equal(await page.locator('#areaBrand').textContent(),'SURVEY WORKSITE');
   {const b=await page.locator('#mapButton').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width,'the restoration strip fits the screen');}
   assert.deepEqual(errors,[]);
   console.log(`${engine} ${width} Coast Camp: intro → orders → 2 restorations → reload → map → worksite → daily gift → shed → book → shop → order change passed`);
   await context.close();
  }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
