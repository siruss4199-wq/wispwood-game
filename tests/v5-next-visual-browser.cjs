// Coast Camp, Build 42 (approved visual direction): the three-hit ice states and break, the
// compact hint and board-full chip, order inspection and the single Deliver action, the folded
// shed, the Vault layer (sealed → surveyed → lit → mapped, from the save) and the one-time reveal
// when the cliff gate opens, at 360/390/430 and 907×510. Visual only: the rules are game.mjs's.
// Needs a server on :8080 (python3 -m http.server 8080). SHOTS=<dir> also saves screenshots.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8080/v5/play.html';
const KEY='vaultwake-v5-coast';
const read=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
const edit=(page,src)=>page.evaluate(([k,src])=>{const s=JSON.parse(localStorage.getItem(k));(new Function('s',src))(s);localStorage.setItem(k,JSON.stringify(s));},[KEY,src]);
async function closeBeats(page){for(let n=0;n<8&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(60);}}
async function reload(page){await page.reload();await page.waitForSelector('#board .tile');await closeBeats(page);}
async function drag(page,from,to){const a=await page.locator(`#board [data-index="${from}"]`).boundingBox(),b=await page.locator(`#board [data-index="${to}"]`).boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:6});await page.mouse.up();}
const noSideScroll=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
const shot=async(page,name)=>{if(process.env.SHOTS)await page.screenshot({path:`${process.env.SHOTS}/${name}.png`});};

(async()=>{
 const engines=process.env.ENGINES?process.env.ENGINES.split(','):['chromium','webkit'];
 for(const engine of engines){
  const browser=await {chromium,webkit}[engine].launch();
  try{for(const [width,height] of [[360,780],[390,844],[430,932],[907,510]]){
   for(const motion of ['reduce','no-preference']){
   const ctx=await browser.newContext({viewport:{width,height},isMobile:width<700&&engine==='chromium',hasTouch:width<700,reducedMotion:motion});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const at=`${engine} ${width}×${height} motion:${motion}`;
   await page.goto(URL+'?new=1');await page.waitForSelector('#board .tile');await closeBeats(page);
   await edit(page,'s.daily={day:9e6,count:1};s.moves=4;s.board[16].cracks=1;s.board[26].cracks=2;s.board[22]={type:"item",family:"rig",tier:1};s.board[27]={type:"item",family:"rig",tier:1};');
   await reload(page);

   // Three-hit ice: three looks from the save's cracks, the part still drawn inside each.
   for(const [i,k] of [[14,0],[16,1],[26,2]]){
    assert.equal(await page.locator(`#board [data-index="${i}"].glass.ice${k}`).count(),1,`${at}: ice state ${k}`);
    assert.equal(await page.locator(`#board [data-index="${i}"] .art.inGlass`).count(),1,`${at}: the part shows through ice ${k}`);
    assert.equal(await page.locator(`#board [data-index="${i}"] .glassShard.ice${k}`).count(),1);}
   assert.equal(await page.locator('#board .glassShard .crackLines').count(),0,`${at}: no wireframe crack overlay`);
   await page.locator('#board [data-index="26"]').click();
   assert.match(await page.locator('#selection').textContent(),/1 hit left/,`${at}: the selection says the hits left`);
   assert.equal(await page.locator('#selection .hits i.on').count(),1);
   await page.locator('#board [data-index="16"]').click();assert.match(await page.locator('#selection').textContent(),/2 hits left/);
   // The third hit breaks it: the part is freed (a rule of game.mjs); fragments fly only with motion.
   await drag(page,22,27);
   await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).board[26]?.type==='item',KEY,{timeout:4000});
   await page.waitForTimeout(60);
   assert.equal(await page.locator('#board [data-index="26"] .iceBurst').count(),motion==='reduce'?0:1,`${at}: ice fragments ${motion==='reduce'?'off':'on'}`);
   assert.equal(await page.locator('#board [data-index="26"].glassBreak').count(),1,`${at}: the break is marked`);

   // No energy badge on generators and no star on wanted parts; the board-full chip only when it matters.
   assert.equal(await page.locator('#board .energyCue:visible, #board .useBadge:visible').count(),0,`${at}: no badge on every cell`);
   assert.equal(await page.locator('#free').isHidden(),true,`${at}: no space count on a roomy board`);
   // The hint is a compact line, not a banner.
   {const h=await page.locator('#hint').boundingBox(),b=await page.locator('#board').boundingBox();assert.ok(h.height<=48,`${at}: hint ${h.height}px tall`);assert.ok(b.width>=Math.min(width-24,b.width),'board');}

   // Orders: a tapped order explains its chain; a ready one has one Deliver action.
   const st=await read(page),notReady=await page.locator('#requests .requestCard:not(.ready)').evaluateAll(l=>l.map(e=>e.dataset.order)),o=st.orders.find(o=>notReady.includes(o.id)&&!o.story)??st.orders.find(o=>notReady.includes(o.id));
   await page.locator(`[data-order="${o.id}"]`).click();
   assert.equal(await page.locator(`[data-order="${o.id}"][aria-pressed="true"].active`).count(),1,`${at}: the tapped order is emphasised`);
   assert.ok(await page.locator('#orderTools .route').count()>=1,`${at}: the order's chain is explained`);
   assert.match(await page.locator('#orderTools .route').first().textContent(),/Rivet Rover|Survey Kite|Rope Winch|Shell Trap|Lantern Kiln/);
   await edit(page,`s.board=s.board.map((x,i)=>[15,20].includes(i)?null:x);s.board[15]={type:"item",family:"${o.needs[0].family}",tier:${o.needs[0].tier}};`+(o.needs[1]?`s.board[20]={type:"item",family:"${o.needs[1].family}",tier:${o.needs[1].tier}};`:'')+(o.needs[1]?.count>1?`s.board[28]={type:"item",family:"${o.needs[1].family}",tier:${o.needs[1].tier}};`:''));
   await reload(page);
   const ready=page.locator(`[data-order="${o.id}"].ready`);
   if(await ready.count()){
    assert.equal(await ready.locator('strong').count(),1,`${at}: one Deliver button on the ready card`);assert.equal(await ready.locator('strong').textContent(),'Deliver');
    assert.equal(await page.locator('#hint').getAttribute('data-kind'),'deliver');assert.match(await page.locator('#hint').textContent(),/Order ready/);
    assert.equal(await page.locator('#requests .requestCard:not(.ready) strong').count(),0,`${at}: no action on unready cards`);
    await shot(page,`${engine}-${width}-${motion}-orders`);
    const coins=(await read(page)).coins;await ready.click();
    await page.waitForFunction(([k,c])=>JSON.parse(localStorage.getItem(k)).coins>c,[KEY,coins],{timeout:4000});}

   // Board full: the chip says so; the shed row stays folded.
   await edit(page,'let k=0;s.board=s.board.map(x=>x===null?{type:"item",family:["rig","chart"][k%2],tier:(k++%3)}:x);');
   await reload(page);
   assert.equal(await page.locator('#free').isVisible(),true,`${at}: board-full guidance when full`);assert.equal(await page.locator('#free').textContent(),'Board full');
   assert.equal(await page.locator('#shed.open').count(),0);
   assert.ok(await noSideScroll(page),`${at}: no sideways scroll on the board`);
   // Wide and short: the whole board is on screen beside the header, not under it.
   if(width>=700){const b=await page.locator('#board').boundingBox(),h=await page.locator('header').boundingBox();
    assert.ok(b.y+b.height<=height+1&&b.y>=-1,`${at}: the board fits the height (${Math.round(b.y)}…${Math.round(b.y+b.height)})`);
    assert.ok(b.x>=h.x+h.width-1,`${at}: the board stands beside the header`);
    for(const sel of ['#menuButton','#mapButton']){const r=await page.locator(sel).boundingBox();assert.ok(r.x+r.width<=b.x,`${at}: ${sel} is not under the board`);}}
   await shot(page,`${engine}-${width}-${motion}-board-full`);

   // The Vault on the beach: a sealed door layer, never "open" in this build.
   await edit(page,'s.board=s.board.map((x,i)=>x?.type==="item"&&i>20?null:x);s.coins=400;');
   await reload(page);
   await page.locator('#mapButton').click();await page.waitForTimeout(motion==='reduce'?100:1500);
   assert.equal(await page.locator('#coastMap .vaultLayer.sealed').count(),1,`${at}: the Vault is sealed on the beach`);
   assert.match(await page.locator('#coastMap .vaultLayer').getAttribute('aria-label'),/sealed/);
   assert.equal(await page.locator('#coastMap .vaultLayer.open').count(),0);
   assert.ok(await page.evaluate(()=>document.querySelector('#coastMap').scrollWidth<=innerWidth),`${at}: no sideways scroll on the beach`);
   await page.locator('#coastMap [data-back]').click();

   // The real unlock: the beach's last stage opens the cliff gate. The reveal plays once, says
   // the Vault is still sealed, names the next objective and is skipped with Esc or Continue.
   await edit(page,'s.built={"beach-path":3,"beach-tent":3,"beach-mast":3,"beach-workshop":3,"beach-pier":3,"beach-beacon":3,"beach-cliff":2};s.materials={"beach-cliff":3};s.coins=300;');
   await reload(page);
   await page.locator('#mapButton').click();await page.waitForTimeout(motion==='reduce'?50:1500);await page.locator('#coastMap [data-restore="beach-cliff"]').click();
   let seen=false;
   for(let n=0;n<10;n++){await page.waitForTimeout(motion==='reduce'?80:400);if(await page.locator('#beat .vaultReveal').count()){seen=true;break;}if(await page.locator('#beat[open]').count())await page.locator('#beatNext').click();}
   assert.ok(seen,`${at}: the reveal plays when the cliff gate opens`);
   const text=await page.locator('#beat .vaultReveal').textContent();
   assert.match(text,/still sealed/,`${at}: the reveal does not claim the Vault is open`);assert.doesNotMatch(text,/complete!|unlocked the Vault|Vault is open/i);
   assert.match(text,/Next/,`${at}: the reveal leads into the next objective`);
   await shot(page,`${engine}-${width}-${motion}-reveal`);
   if(motion==='reduce')await page.keyboard.press('Escape');else await page.locator('#beatNext').click();
   await page.waitForTimeout(150);
   assert.equal(await page.locator('#beat .vaultReveal').count(),0,`${at}: the reveal is skipped`);
   assert.equal(await page.locator('#beat[open]').count(),1,`${at}: the worksite intro follows`);
   await closeBeats(page);
   assert.equal((await read(page)).area,1);
   assert.equal(await page.locator('#coastMap .vaultLayer.reached').count(),1,`${at}: at the worksite the door waits, sealed`);
   await page.reload();await page.waitForSelector('#board .tile');await page.waitForTimeout(300);
   assert.equal(await page.locator('#beat .vaultReveal').count(),0,`${at}: no replay after reload`);
   // The door's look follows ws-door's real stages; it stays sealed.
   for(const [n,cls] of [[1,'surveyed'],[2,'lit'],[3,'mapped']]){
    await edit(page,`s.built["ws-door"]=${n};`);await reload(page);
    await page.locator('#mapButton').click();await page.waitForTimeout(200);
    assert.equal(await page.locator(`#coastMap .vaultLayer.${cls}`).count(),1,`${at}: ws-door ${n} → ${cls}`);
    assert.match(await page.locator('#coastMap .vaultPlate').textContent(),/Sealed/);
    await page.locator('#coastMap [data-back]').click();}
   assert.deepEqual(errors,[],`${at}: no page errors`);
   await ctx.close();
   console.log(`${at}: ice states and break → hint/free → order route and Deliver → shed → Vault sealed → reveal once → door stages passed`);
  }}}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
