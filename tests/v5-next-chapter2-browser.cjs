// Coast Camp Chapter 2 in the browser (docs/V5_CHAPTER2_SILENT_OBSERVATORY_2026-10-24.md): a camp
// that finished the worksite before Chapter 2 moves on to the Vault door; the door's three rings;
// the reveal (once, skippable); the Observatory with its journal and a finished area to look at
// again; the Lens Bench earned on a full board; a generator parked and brought back for an order;
// the signal and the harbour; the Chapter 2 end card. 360/390/430 and 907×510.
// Needs a server on :8080 (python3 -m http.server 8080). SHOTS=<dir> also saves screenshots.
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const URL='http://127.0.0.1:8080/v5/play.html';
const KEY='vaultwake-v5-coast';
const read=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
const edit=(page,src)=>page.evaluate(([k,src])=>{const s=JSON.parse(localStorage.getItem(k));(new Function('s',src))(s);localStorage.setItem(k,JSON.stringify(s));},[KEY,src]);
async function closeBeats(page){for(let n=0;n<10&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(80);}}
async function reload(page){await page.reload();await page.waitForSelector('#board .tile');await page.waitForTimeout(150);}
const shot=async(page,name)=>{if(process.env.SHOTS)await page.screenshot({path:`${process.env.SHOTS}/${name}.png`});};
const ALL_CH1={'beach-path':3,'beach-tent':3,'beach-mast':3,'beach-workshop':3,'beach-pier':3,'beach-beacon':3,'beach-cliff':3,'ws-camp':3,'ws-scope':3,'ws-ropes':3,'ws-steps':3,'ws-pool':3,'ws-hoist':3,'ws-door':3};
async function buy(page,id){await page.locator(`#coastMap .place[data-place="${id}"] button`).click();await page.locator(`#coastMap [data-restore="${id}"]`).click();}

(async()=>{
 const engines=process.env.ENGINES?process.env.ENGINES.split(','):['chromium','webkit'];
 for(const engine of engines){
  const browser=await {chromium,webkit}[engine].launch();
  try{for(const [width,height] of [[360,780],[390,844],[430,932],[907,510]]){
   const ctx=await browser.newContext({viewport:{width,height},isMobile:width<700&&engine==='chromium',hasTouch:width<700,reducedMotion:'reduce'});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const at=`${engine} ${width}×${height}`;
   await page.goto(URL+'?new=1');await page.waitForSelector('#board .tile');await closeBeats(page);
   // A camp that finished the worksite under Build 42: no seen, no pending, no Lens Bench taps; generators as at the end of Chapter 1.
   await edit(page,`s.daily={day:9e6,count:1};s.moves=900;s.coins=2400;s.area=1;s.built=${JSON.stringify(ALL_CH1)};s.materials={};s.seenEnd=true;delete s.seen;delete s.pending;delete s.taps.optic;
    s.board[21]={type:'source',id:'rig',level:4};s.board[15]={type:'source',id:'chart',level:3};s.board[20]={type:'source',id:'rope',level:3};s.board[22]={type:'source',id:'shell',level:3};s.board[27]={type:'source',id:'lamp',level:2};
    s.orders=s.orders.map(o=>{delete o.story;return o;});`);
   const before=(await read(page)).board;
   await reload(page);
   // It moves on to the Vault door and hears its intro once.
   assert.equal(await page.locator('#beat[open]').count(),1,`${at}: the Vault Entrance intro plays`);assert.match(await page.locator('#beat').textContent(),/Vault Entrance/);
   await closeBeats(page);
   let s=await read(page);assert.equal(s.area,2);assert.deepEqual(s.board,before,`${at}: the board is untouched`);assert.equal(s.seen.door,true);assert.equal(s.seen['cliff-gate'],true,'an old reveal is marked, not played');assert.equal(s.seenEnd,undefined);
   await reload(page);assert.equal(await page.locator('#beat[open]').count(),0,`${at}: no replay after reload`);
   assert.equal(await page.locator('#mapButton span').textContent(),'DOOR');
   // The door: three rings. Materials are given here (the gold orders are tested in node).
   await page.locator('#mapButton').click();await page.waitForTimeout(150);
   assert.equal(await page.locator('#coastMap #mapTitle').textContent(),'Vault Entrance');assert.equal(await page.locator('#coastMap .place').count(),1);
   {const m=await page.locator('#coastMap .siteMarker').boundingBox();assert.ok(m.width>=44&&m.height>=44,'marker touch target');}
   await shot(page,`${engine}-${width}-door-0`);
   await page.locator('#coastMap [data-back]').click();
   for(let n=1;n<=3;n++){
    await edit(page,`s.materials['vault-door']=${n};s.orders=s.orders.map(o=>{delete o.story;return o;});`);await reload(page);await closeBeats(page);
    await page.locator('#mapButton').click();await page.waitForTimeout(100);await buy(page,'vault-door');await page.waitForTimeout(150);
    if(n<3){assert.equal(await page.locator('#coastMap #bubble').count(),1,`${at}: ring ${n}'s line is a bubble, not a card`);assert.equal(await page.locator('#beat[open]').count(),0);
     await shot(page,`${engine}-${width}-door-${n}`);
     // The bubble does not stop the screen under it.
     await page.locator('#coastMap [data-back]').click();assert.equal(await page.locator('#coastMap[open]').count(),0);}
   }
   // Reveal A: the stage's line, then the card; Esc skips it; the Observatory intro follows.
   for(let n=0;n<6&&!(await page.locator('#beat .vaultReveal').count());n++){await page.locator('#beatNext').click();await page.waitForTimeout(80);}
   const reveal=await page.locator('#beat .vaultReveal').textContent();
   assert.match(reveal,/Chapter 1 complete/);assert.match(reveal,/The Vault is open/);assert.match(reveal,/Next/);assert.doesNotMatch(reveal,/game (is )?(complete|over)/i);
   await shot(page,`${engine}-${width}-reveal-vault`);
   await page.keyboard.press('Escape');await page.waitForTimeout(120);
   assert.equal(await page.locator('#beat .vaultReveal').count(),0,`${at}: Esc skips the reveal`);
   assert.equal(await page.locator('#beat[open]').count(),1,`${at}: the Observatory intro follows`);await closeBeats(page);
   s=await read(page);assert.equal(s.area,3);assert.equal(s.seen['vault-open'],true);assert.equal(s.orders.find(o=>o.story)?.story,'obs-hall','the next objective has its gold order');
   await reload(page);assert.equal(await page.locator('#beat[open]').count(),0,`${at}: the reveal does not replay`);
   // The Observatory: its map, five places, the journal, the beach to look at again.
   await page.locator('#mapButton').click();await page.waitForTimeout(150);
   assert.equal(await page.locator('#coastMap #mapTitle').textContent(),'The Silent Observatory');assert.equal(await page.locator('#coastMap .place').count(),5);
   assert.equal(await page.locator('#coastMap .beachScene.mapped[data-area="vault"]').count(),1);
   await page.locator('#coastMap .journal summary').click();assert.ok(await page.locator('#coastMap .journal [data-replay-reveal="vault-open"]').count()===1,'the reveal is in the journal');
   assert.ok(await page.locator('#coastMap .journal [data-replay-stage]').count()>=45,'every stage told so far');
   await shot(page,`${engine}-${width}-observatory-0`);
   await page.locator('#coastMap [data-view="0"]').click();await page.waitForTimeout(100);
   assert.equal(await page.locator('#coastMap #mapTitle').textContent(),'Landing Beach');assert.equal(await page.locator('#coastMap [data-restore]').count(),0,'looking changes nothing');
   assert.equal(await page.locator('#coastMap .vaultLayer.open').count(),1,`${at}: on the beach the Vault now shows open`);
   await page.locator('#coastMap [data-view="now"]').click();assert.equal(await page.locator('#coastMap #mapTitle').textContent(),'The Silent Observatory');
   assert.ok(await page.evaluate(()=>document.querySelector('#coastMap').scrollWidth<=innerWidth),`${at}: no sideways scroll on the Observatory`);
   await page.locator('#coastMap [data-back]').click();
   // The Lens Bench on a full board: it waits, says so, and lands after a merge.
   await edit(page,`s.built['obs-hall']=1;s.built['obs-desk']=1;s.materials={'obs-bench':1};s.coins=2000;s.orders=s.orders.map(o=>{delete o.story;return o;});let k=0;s.board=s.board.map(x=>x===null||x?.type==='cargo'?{type:'item',family:'rig',tier:k++%2}:x);`);
   await reload(page);await closeBeats(page);
   await page.locator('#mapButton').click();await page.waitForTimeout(100);await buy(page,'obs-bench');await page.waitForTimeout(150);await closeBeats(page);
   s=await read(page);assert.ok(s.pending.some(x=>x.type==='source'&&x.id==='optic'),'the Lens Bench waits for a space');
   await page.locator('#coastMap [data-back]').click();
   assert.match(await page.locator('#free').textContent(),/Lens Bench.*waiting/,`${at}: the waiting reward is named`);
   await shot(page,`${engine}-${width}-bench-waiting`);
   {s=await read(page);const pair=[];for(let i=0;i<s.board.length&&pair.length<2;i++)if(s.board[i]?.type==='item'&&s.board[i].family==='rig'&&s.board[i].tier===0)pair.push(i);
    const a=await page.locator(`#board [data-index="${pair[0]}"]`).boundingBox(),b=await page.locator(`#board [data-index="${pair[1]}"]`).boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:6});await page.mouse.up();}
   await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).board.some(x=>x?.type==='source'&&x.id==='optic'),KEY,{timeout:4000});
   await page.waitForTimeout(500);assert.match(await page.locator('.moment').last().textContent(),/Lens Bench/,`${at}: the new generator and its chain`);
   // Park the Lantern Kiln; an order for its parts shows where it is and brings it back.
   s=await read(page);const kiln=s.board.findIndex(x=>x?.type==='source'&&x.id==='lamp');
   await edit(page,`s.board=s.board.map((x,i)=>x?.type==='item'&&i!==${kiln}&&i>40?null:x);s.orders[0]={id:'o990',who:'tamsin',needs:[{family:'lamp',tier:2,count:1}],coins:10};`);await reload(page);await closeBeats(page);
   await page.locator(`#board [data-index="${kiln}"]`).click();await page.locator('#selection [data-action="store"]').click();
   await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).shed.some(x=>x?.type==='source'&&x.id==='lamp'),KEY,{timeout:4000});
   await page.locator('[data-order="o990"]').click();assert.match(await page.locator('#orderTools').textContent(),/parked in the shed/);
   await shot(page,`${engine}-${width}-parked`);
   await page.locator('#orderTools [data-unpark]').click();
   await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).board.some(x=>x?.type==='source'&&x.id==='lamp'&&x.level===2),KEY,{timeout:4000});
   // The array wakes: the signal reveal. Then the sea gate: the harbour and the Chapter 2 end card.
   await edit(page,`Object.assign(s.built,{'obs-hall':3,'obs-desk':3,'obs-bench':3,'obs-array':2,'obs-passage':2});s.materials={'obs-array':3};s.coins=2000;s.orders=s.orders.map(o=>{delete o.story;return o;});`);
   await reload(page);await closeBeats(page);
   await page.locator('#mapButton').click();await page.waitForTimeout(100);
   assert.match(await page.locator('#coastMap #mapCard').textContent(),/Wake the array|Opens once/);
   await page.locator('#coastMap .place[data-place="obs-passage"] button').click();assert.match(await page.locator('#coastMap #mapCard').textContent(),/Opens once Wake the array is done/,`${at}: the sea gate waits for the array`);
   await buy(page,'obs-array');
   for(let n=0;n<6&&!(await page.locator('#beat .vaultReveal').count());n++){await page.locator('#beatNext').click();await page.waitForTimeout(80);}
   {const t=await page.locator('#beat .vaultReveal').textContent();assert.match(t,/A signal on one bearing/);assert.match(t,/Not who sends it/);}
   await shot(page,`${engine}-${width}-reveal-signal`);
   await closeBeats(page);
   await edit(page,`s.materials['obs-passage']=3;s.orders=s.orders.map(o=>{delete o.story;return o;});`);await reload(page);await closeBeats(page);
   await page.locator('#mapButton').click();await page.waitForTimeout(100);await buy(page,'obs-passage');
   for(let n=0;n<6&&!(await page.locator('#beat .vaultReveal').count());n++){await page.locator('#beatNext').click();await page.waitForTimeout(80);}
   assert.match(await page.locator('#beat .vaultReveal').textContent(),/A hidden harbour/);
   await shot(page,`${engine}-${width}-reveal-harbour`);
   await closeBeats(page);await page.waitForSelector('#endDialog[open]',{timeout:4000});
   {const t=await page.locator('#endContent').textContent();assert.match(t,/CHAPTER 2 COMPLETE/);assert.match(t,/Chapter 3, The Hidden Harbour, is in development/);assert.equal(await page.locator('#endContent button').count(),2,'keep playing and feedback only: no fake Chapter 3 button');}
   await shot(page,`${engine}-${width}-end`);
   await page.locator('#endContent [data-keep]').click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${at}: no sideways scroll`);
   assert.deepEqual(errors,[],`${at}: no page errors`);
   await ctx.close();
   console.log(`${at}: old save → Vault door → reveal once → Observatory, journal, beach view → Lens Bench waits on a full board → park and bring back → signal → harbour → Chapter 2 end passed`);
  }}finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
