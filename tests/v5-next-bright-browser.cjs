// Coast Camp, Build 44 (bright coast pass), in a real browser at 360×780, 390×844, 430×932 and
// 907×510, Chromium and WebKit (ENGINES=chromium to run one): the layout fits, order cards say
// who asks or what for with real counts and keep their places, tideglass shows its three hits,
// the folded shed takes a dragged part, a delivery counts its coins and only then says "Ready",
// the next-place chip opens the coast on that place, a build shows before → after and then the
// next objective, sound and vibration have their own settings, and reduced motion skips the
// flights without changing any result. Presentation only: the rules are checked by node tests.
const assert=require('node:assert/strict');const pw=require('playwright');
const URL='http://127.0.0.1:8080/v5/play.html';
const KEY='vaultwake-v5-coast';
const VIEWPORTS=[[360,780],[390,844],[430,932],[907,510]];
const ENGINES=(process.env.ENGINES??'chromium,webkit').split(',');
const read=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
async function closeBeats(page){for(let n=0;n<8&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click({force:true});await page.waitForTimeout(90);}}
async function setState(page,fn,arg){await page.evaluate(([k,src,arg])=>{const s=JSON.parse(localStorage.getItem(k));(new Function('s','arg',src))(s,arg);localStorage.setItem(k,JSON.stringify(s));},[KEY,`(${fn})(s,arg)`,arg]);
 await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);}
async function drag(page,from,toSel){const a=await page.locator(`#board [data-index="${from}"]`).boundingBox(),b=await page.locator(toSel).boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();}
// A camp one merge away from the beach's first stage: a gold order for the landing path that
// wants a Split spanner, two Grip tools to merge into one, tideglass beside them on its last hit.
function ready(s){s.daily={day:9e6,count:1};s.moves=5;s.merges=2;s.coins=15;
 s.orders[0]={id:'o90',who:'ivo',needs:[{family:'rig',tier:2,count:1}],coins:30,story:'beach-path'};
 s.board[15]={type:'item',family:'rig',tier:1};s.board[20]={type:'item',family:'rig',tier:1};s.board[16]={type:'glass',family:'rig',tier:1,cracks:2};}

async function run(engine,W,H,motion){
 const browser=await pw[engine].launch();
 try{
  const context=await browser.newContext({viewport:{width:W,height:H},isMobile:W<700&&engine==='chromium',hasTouch:W<700,reducedMotion:motion});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL+'?new=1');await page.waitForSelector('#board .tile');await closeBeats(page);
  await setState(page,s=>{s.daily={day:9e6,count:1};});
  const tag=`${engine} ${W}×${H} ${motion}`;

  // Layout: no sideways scroll, the whole board on screen, touch targets kept.
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${tag}: no sideways scroll`);
  {const b=await page.locator('#board').boundingBox();assert.ok(b.y>=0&&b.y+b.height<=H+1,`${tag}: the board fits on screen (${Math.round(b.y)}–${Math.round(b.y+b.height)} of ${H})`);
   const c=await page.locator('#board [data-index="0"]').boundingBox();assert.ok(c.width>=40,`${tag}: board cells ${c.width}px`);}
  for(const sel of ['#mapButton','#menuButton','#shed .shedToggle','#requests .requestCard'])assert.ok((await page.locator(sel).first().boundingBox()).height>=38,`${tag}: ${sel} keeps its size`);
  // No cell carries an order star or an energy tag any more; a level badge stays inside its cell.
  assert.equal(await page.locator('#board .useBadge, #board .energyCue').count(),0);

  // Order cards: who asks, real counts, progress, coins; Deliver only on a ready one.
  {const s=await read(page),cards=page.locator('#requests .requestCard');assert.equal(await cards.count(),s.orders.length);
   for(let k=0;k<s.orders.length;k++){const o=s.orders[k],card=cards.nth(k),text=await card.textContent();
    assert.equal(await card.getAttribute('data-order'),o.id,`${tag}: cards stay in their lanes`);
    assert.match(text,new RegExp(o.coins+'$|'+o.coins+'\\b'));for(const r of o.needs)assert.match(text,new RegExp(`\\d/${r.count}`));
    assert.match(text,/Ivo|Neri|Tamsin|Bram|Materials/);assert.equal(await card.locator('.reqDeliver').count(),0,'nothing is ready yet');}}
  // A tapped order explains its parts: generator first, then the chain up to the part.
  {const id=(await read(page)).orders[1].id;await page.locator(`[data-order="${id}"]`).click();
   assert.equal(await page.locator(`[data-order="${id}"].active`).count(),1);assert.ok(await page.locator('#orderTools .route .routeGen').count()>=1);
   assert.match(await page.locator('#orderTools').textContent(),/Tap Rivet Rover/);
   // and says what it is for (Build 44): the kind of job, the crew member's reason in quotes.
   assert.match(await page.locator('#orderTools .orderSay').textContent(),/(Quick|Two-crew|Big) job · (Ivo|Neri|Tamsin|Bram)“.+”/);
   await page.locator(`[data-order="${id}"]`).click();}
  // Build 45 (coastal board design): a sideways rail of painted cards (112 × 118 since 45c) in their
  // lanes; no progress bars or clipped subtitles; painted faces for Ivo and Bram; the HUD about
  // 52 px; the restoration strip 52–56 px, saying View until it is truly ready.
  {const card=await page.locator('#requests .requestCard').first().boundingBox();assert.ok(card.width>=104&&card.width<=120&&card.height>=110&&card.height<=124,`${tag}: card ${card.width}×${card.height}`);
   // one row that scrolls sideways when the cards do not all fit (three fit at 390 px since 45c)
   assert.ok(await page.locator('#requests .requestShelf').evaluate(e=>getComputedStyle(e).overflowX==='auto'&&new Set([...e.children].map(c=>Math.round(c.getBoundingClientRect().top))).size===1),`${tag}: the cards are one sideways rail`);
   assert.equal(await page.locator('#requests .reqBar:visible, #requests .reqName small:visible').count(),0,`${tag}: no progress bars or subtitles on cards`);
   const faces=await page.locator('#requests img.face').evaluateAll(f=>f.map(x=>x.getAttribute('src')));assert.ok(faces.length>0&&faces.every(f=>/crew-(ivo|bram|nara|sela)\.webp$/.test(f)),`${tag}: painted faces ${faces}`);
   assert.equal(await page.locator('#requests .reqFace:not(.place) svg').count(),0,`${tag}: every crew member has a painted face`);
   // Neri and Tamsin wear the supplied Nara and Sela portraits (user, 2026-10-26)
   {const before=await page.evaluate(k=>localStorage.getItem(k),KEY);
    await setState(page,s=>{const crew=s.orders.filter(o=>!o.story);crew[0].who='neri';crew[1].who='tamsin';});
    const src=await page.locator('#requests img.face').evaluateAll(f=>f.map(x=>x.getAttribute('src')).join(' '));assert.match(src,/crew-nara\.webp/);assert.match(src,/crew-sela\.webp/);
    await page.evaluate(([k,v])=>localStorage.setItem(k,v),[KEY,before]);await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);}
   const strip=await page.locator('#mapButton').boundingBox();assert.ok(strip.height>=52&&strip.height<=56&&strip.x>=0&&strip.x+strip.width<=W+1,`${tag}: strip ${strip.height}px`);
   assert.match(await page.locator('#mapButton .rsAction').textContent(),/^View$/);
   const hud=await page.locator('header').boundingBox();assert.ok(hud.height<=64,`${tag}: HUD ${hud.height}px`);
   // the supplied painted energy and coin pills; the pale slot fills towards the next +1
   const pills=await page.evaluate(()=>['#energyPill','#coinPill'].map(s=>getComputedStyle(document.querySelector(s),'::before').borderImageSource));
   assert.ok(/hud-energy\.webp/.test(pills[0])&&/hud-coins\.webp/.test(pills[1]),`${tag}: painted pills ${pills}`);
   const g=await page.evaluate(()=>+document.querySelector('#energyPill').style.getPropertyValue('--g'));assert.ok(g>=0&&g<=1,`${tag}: gauge ${g}`);
   const menu=await page.locator('#menuButton').boundingBox();assert.ok(menu.x+menu.width<=W-4,`${tag}: menu inside the header`);}

  // Tideglass: three looks for three hits, then the part is free.
  await setState(page,s=>{s.daily={day:9e6,count:1};s.board[15]={type:'glass',family:'rig',tier:0};s.board[16]={type:'glass',family:'rig',tier:0,cracks:1};s.board[20]={type:'glass',family:'rig',tier:0,cracks:2};});
  for(const [i,k] of [[15,0],[16,1],[20,2]]){assert.equal(await page.locator(`#board [data-index="${i}"].ice${k}`).count(),1,`${tag}: ice${k}`);
   assert.match(await page.locator(`#board [data-index="${i}"] img.iceArt`).getAttribute('src'),new RegExp(`ice-${k}\\.webp$`),`${tag}: painted ice ${k}`);
   assert.match(await page.locator(`#board [data-index="${i}"]`).getAttribute('aria-label'),new RegExp(`${3-k} hits? left`));}
  // one kind of ice: every ice cell (odd or even) is the same pale ice blue
  {const bg=await page.evaluate(()=>[...document.querySelectorAll('#board .tile')].map(t=>[t.classList.contains('glass'),getComputedStyle(t).backgroundImage+' '+getComputedStyle(t).backgroundColor]));
   const looks=new Set(bg.filter(([g])=>g).map(([,b])=>b));assert.equal(looks.size,1,`${tag}: ice cells look the same ${[...looks]}`);assert.equal([...looks][0],'none rgb(221, 242, 248)',`${tag}: ice cells pale ice blue`);}
  // The panel says how many hits are left; the cells carry no numbers.
  await page.locator('#board [data-index="20"]').click();assert.match(await page.locator('#selection').textContent(),/1 hit left/);await page.locator('#board [data-index="20"]').click();

  // The gold order's card says what it is for; merging next to the last-hit tideglass breaks it.
  await setState(page,ready);
  {const gold=page.locator('[data-order="o90"]');assert.match(await gold.textContent(),/Gold order\s*Stage 1/);assert.match(await gold.getAttribute('aria-label'),/Clear the landing path/);
   // 45e: the gold card keeps the painted frame, its place picture fits the face circle, and its
   // state ring follows the painted card (no rectangle)
   const g=await gold.evaluate(c=>{const f=c.querySelector('.reqFace').getBoundingClientRect(),i=c.querySelector('.reqFace img').getBoundingClientRect();return {frame:getComputedStyle(c,'::before').content!=='none'&&getComputedStyle(c,'::before').borderImageSource,after:getComputedStyle(c,'::after').content,fit:i.width<=f.width*1.2&&Math.abs(i.left-f.left)<=f.width*.15}});
   assert.ok(/order-card\.webp/.test(g.frame)&&g.after==='none'&&g.fit,`${tag}: gold card ${JSON.stringify(g)}`);
   const lanes=await page.locator('#requests .requestCard').evaluateAll(c=>c.map(x=>x.dataset.order));
   await drag(page,20,'#board [data-index="15"]');
   await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).board[16]?.type==='item',KEY,{timeout:4000});
   if(motion==='no-preference')assert.ok(await page.locator('#board [data-index="16"] .iceBurst').count()<=1);
   assert.deepEqual(await page.locator('#requests .requestCard').evaluateAll(c=>c.map(x=>x.dataset.order)),lanes,`${tag}: a card that becomes ready does not move`);
   assert.equal(await gold.locator('.reqDeliver').count(),1,'one Deliver on the ready card');
   assert.equal(await page.locator('#hint:visible').filter({hasText:/Deliver/}).count(),0,'no second deliver button');
   // Truthful: materials not in yet, so the chip is not "Ready".
   assert.equal(await page.locator('#mapButton.ready').count(),0);
   await gold.click();}
  if(motion==='no-preference')assert.ok(await page.locator('.coinFlight').count()>0,`${tag}: coins fly to the counter`);
  else{assert.equal(await page.locator('.coinFlight,.deliveryPart').count(),0,`${tag}: no flights with reduced motion`);assert.equal(await page.locator('#coins').textContent(),'45');}
  await page.waitForFunction(()=>document.querySelector('#coins').textContent==='45'&&document.querySelector('#mapButton.ready'),null,{timeout:4000});
  assert.match(await page.locator('#mapButton').textContent(),/Ready to build/);assert.equal(await page.locator('#mapButton .rsAction').textContent(),'Build');
  assert.equal((await read(page)).coins,45);
  // Reload keeps all of it.
  await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);
  assert.equal(await page.locator('#coins').textContent(),'45');assert.equal(await page.locator('#mapButton.ready').count(),1);

  // The chip opens the coast on that place; build; before → after; story; then the next objective.
  await page.locator('#mapButton').click();await page.waitForSelector('#coastMap[open]');
  assert.equal((await read(page)).coins,45,`${tag}: opening the coast spends nothing`);
  assert.equal(await page.locator('#mapCard').getAttribute('data-card'),'beach-path');
  assert.equal(await page.locator('#coastMap .journey li.vault').count(),1,'the Vault is on the way');
  if(motion==='no-preference')assert.equal(await page.locator('#coastMap .beachScene.focusIn').count(),1,`${tag}: the picture starts on the place`);
  else assert.equal(await page.locator('#coastMap .beachScene.focusIn').count(),0);
  await page.locator('#coastMap [data-restore="beach-path"]').click({force:true});
  if(motion==='no-preference')await page.waitForSelector('#coastMap .mapFx.stageOld',{state:'attached',timeout:2500});// the old stage fades out
  await page.waitForSelector('#beat[open]',{timeout:4000});await closeBeats(page);
  await page.waitForFunction(()=>document.querySelector('#mapCard h3')?.textContent==='Lay a boardwalk',null,{timeout:4000});
  assert.equal((await read(page)).built['beach-path'],1);assert.equal((await read(page)).coins,5);
  await page.locator('#coastMap [data-back]').click({force:true});

  // The folded shed: how full it is; a part dragged onto the row goes in; a tap opens it.
  await setState(page,s=>{s.daily={day:9e6,count:1};s.board[15]={type:'item',family:'rig',tier:0};});
  assert.match(await page.locator('#shed .shedToggle').textContent(),/0\/4/);assert.equal(await page.locator('#shed .shedSlots').isVisible(),false);
  await drag(page,15,'#shed .shedToggle');
  await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).shed[0]?.family==='rig',KEY,{timeout:4000});
  assert.match(await page.locator('#shed .shedToggle').textContent(),/1\/4/);
  await page.locator('#shed .shedToggle').click();assert.equal(await page.locator('#shed .shedSlots').isVisible(),true);
  await page.locator('#shed [data-slot="0"]').click();
  await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).shed.every(x=>!x),KEY,{timeout:4000});
  assert.equal(await page.locator('#shed .shedSlots').isVisible(),false,'an empty shed folds again');

  // A full board: the generator says so and nothing changes.
  await setState(page,s=>{s.daily={day:9e6,count:1};s.board=s.board.map(x=>x??{type:'item',family:'chart',tier:0});});
  {const before=(await read(page)).energy;await page.locator('#board .tile.source[data-family="rig"]').click();
   await page.waitForFunction(()=>/board is full/i.test(document.querySelector('#message').textContent),null,{timeout:3000});assert.equal((await read(page)).energy,before);}

  // Sound and vibration: separate settings; the vibration one only where the browser has it.
  {const vib=await page.evaluate(()=>typeof navigator.vibrate==='function');
   assert.equal(await page.locator('#hapticsButton').isVisible(),vib,`${tag}: vibration setting only where supported`);
   if(vib){await page.locator('#hapticsButton').click();assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-haptics')),'off');assert.match(await page.locator('#hapticsButton').textContent(),/off/);await page.locator('#hapticsButton').click();}
   const sound=await page.locator('#soundButton').textContent();await page.locator('#soundButton').click();
   assert.notEqual(await page.locator('#soundButton').textContent(),sound);assert.equal(await page.evaluate(()=>localStorage.getItem('vaultwake-sound')),sound==='Sound on'?'off':'on');
   if(sound==='Sound off')await page.locator('#soundButton').click();
   else await page.locator('#soundButton').click();
   // Rapid play: a second merge cue inside 45 ms is dropped, not stacked.
   const plays=await page.evaluate(async()=>{const {sfx}=await import('/v5/next/sfx.mjs');if(!sfx.enabled())sfx.toggle();return [sfx.play('merge',1),sfx.play('merge',1),sfx.play('produce'),sfx.play('nonsense')];});
   if(plays[0])assert.deepEqual(plays,[true,false,true,false],`${tag}: repeats are throttled`);}

  // Audit fixes (Build 46): a crew order taking long suggests a new one; its tapped panel is three
  // short lines (no "n/m" progress, no bonus sums); nothing is selected by a slide of the finger;
  // after the last stage the strip says the chapter is done and the coins carry over; on a short
  // phone screen (390 × 664) the board keeps the full width (2026-10-26: shrinking it read as small).
  await setState(page,s=>{s.moves=900;for(const o of s.orders)if(!o.story)o.born=0;});
  {const stuck=page.locator('#requests .requestCard.stuck');const n=await stuck.count();
   const notReady=await page.locator('#requests .requestCard:not(.ready):not(.storyOrder)').count();assert.equal(n,notReady,`${tag}: every crew order not ready is stuck`);
   if(n){assert.match(await stuck.first().locator('.reqStuck').textContent(),/New/);assert.match(await stuck.first().getAttribute('aria-label'),/new order/);
    await stuck.first().click();const tools=await page.locator('#orderTools').textContent();assert.doesNotMatch(tools,/\d+\/\d+|big job:|two crews:|also needs/,`${tag}: the order panel is short`);
    assert.ok(await page.locator('#orderTools [data-swap], #orderTools [data-swap-ad]').count()>=1,`${tag}: the panel offers a new order`);await stuck.first().click();}}
  assert.equal(await page.evaluate(()=>{const c=getComputedStyle(document.body);return c.userSelect||c.webkitUserSelect;}),'none',`${tag}: no text selection on the game`);
  await setState(page,s=>{s.area=1;s.built={'beach-path':3,'beach-tent':3,'beach-mast':3,'beach-workshop':3,'beach-pier':3,'beach-beacon':3,'beach-cliff':3,'ws-camp':3,'ws-scope':3,'ws-ropes':3,'ws-steps':3,'ws-pool':3,'ws-hoist':3,'ws-door':3};s.materials={...s.built};s.seenEnd=true;s.orders=s.orders.map(o=>{const x={...o};delete x.story;return x;});s.coins=123;});
  assert.match(await page.locator('#mapButton').textContent(),/Chapter complete.*Coins carry over to the Vault Entrance.*123/s,`${tag}: the chapter's end says where the coins go`);
  if(W===390&&motion==='no-preference'){await page.setViewportSize({width:390,height:664});await page.waitForTimeout(200);
   const b=await page.locator('#board').boundingBox();assert.ok(b.width>=390-24,`${tag}: at 390×664 the board is ${Math.round(b.width)} px wide`);
   const c=await page.locator('#board [data-index="0"]').boundingBox();assert.ok(c.width>=46,`board cells ${c.width}px at 390×664`);await page.setViewportSize({width:W,height:H});}

  assert.deepEqual(errors,[],`${tag}: no page errors`);
  console.log(`${tag}: layout, order cards, ice, delivery → ready → coast → build → next, shed, full board, settings passed`);
  await context.close();
 }finally{await browser.close();}
}
(async()=>{
 for(const engine of ENGINES)for(const [W,H] of VIEWPORTS)for(const motion of W===390?['no-preference','reduce']:['no-preference'])await run(engine,W,H,motion);
})().catch(e=>{console.error(e);process.exit(1);});
