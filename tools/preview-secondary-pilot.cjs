// Secondary-chain pilot screenshots (2026-10-29, docs/V5_SECONDARY_PILOT_2026-10-29.md). Opens the real
// Coast Camp page and, through its own save, puts the Rover's and the Kite's secondary chains on the
// board beside their generators and primary parts, with a mixed order asking a Gear. Per size: the
// board, a Gear selected (where it comes from), the order tapped (its route), the book's extras page,
// and the first-drop moment (a real tap with the bad-luck limit one tap away). Needs the repo served
// on :8080. Writes PNGs to OUT.
//   node tools/preview-secondary-pilot.cjs [OUT] [WxH,...]
const {chromium}=require('playwright');const {throughHome}=require('../tests/v5-next-home-helper.cjs');
const URL='http://127.0.0.1:8080/v5/play.html',OUT=process.argv[2]??'.',SIZES=(process.argv[3]??'360x780,390x844,430x932,907x510').split(',').map(s=>s.split('x').map(Number));
const KEY='vaultwake-v5-coast';
(async()=>{
 const browser=await chromium.launch();
 for(const [W,H] of SIZES){
  const ctx=await browser.newContext({viewport:{width:W,height:H},isMobile:W<700,hasTouch:W<700,reducedMotion:'reduce'});const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));throughHome(page);
  await page.goto(URL+'?new=1');await page.waitForSelector('#board .tile');
  const settle=async()=>{for(let n=0;n<10&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(80);}await page.waitForTimeout(600);};
  await settle();
  // The board: both secondary chains in the camp, the Kite out, a mixed order wanting a Gear.
  await page.evaluate(async KEY=>{
   const g=await import('./next/game.mjs');const s=g.fresh(Date.now());
   s.ordersDone=6;s.daily={day:9e6,count:1};s.energy=30;s.seen={};
   s.board[9]=g.source('chart');s.board[8]=g.item('rig',1);s.board[10]=g.item('chart',1);
   [[14,'mech',0],[16,'mech',1],[26,'mech',2],[28,'mech',3],[15,'notes',0],[20,'notes',1],[22,'notes',2],[27,'notes',3]].forEach(([i,f,t])=>{s.board[i]=g.item(f,t);});
   const needs=[{family:'rig',tier:2,count:1},{family:'mech',tier:1,count:1}];
   s.orders[1]={id:'oPilot',who:'bram',needs,coins:g.orderPrice(s,needs,'pair'),role:'pair',born:0};
   for(const x of s.board)if(x?.type==='item'&&!s.found.includes(x.family+x.tier))s.found.push(x.family+x.tier);
   localStorage.setItem(KEY,JSON.stringify(s));
  },KEY);
  await page.reload();await page.waitForSelector('#board .tile');await settle();
  await page.screenshot({path:`${OUT}/pilot-board-${W}x${H}.png`});
  await page.locator('#board [data-index="16"]').click();await page.waitForTimeout(300);
  await page.screenshot({path:`${OUT}/pilot-gear-selected-${W}x${H}.png`});
  const sel=await page.locator('#selection').innerText();
  await page.locator('#board [data-index="16"]').click();
  await page.locator('[data-order="oPilot"]').click();await page.waitForTimeout(300);
  await page.screenshot({path:`${OUT}/pilot-order-route-${W}x${H}.png`});
  const msg=await page.locator('#message').innerText(),route=await page.locator('#orderTools').innerText().catch(()=>'');
  await page.locator('[data-order="oPilot"]').click();
  await page.locator('#bookButton').click();await page.waitForTimeout(300);
  const pg=page.locator('#book .bookPage',{hasText:'Rivet Rover extras'});await pg.scrollIntoViewIfNeeded();
  await page.screenshot({path:`${OUT}/pilot-book-${W}x${H}.png`});
  const book=await pg.innerText();await page.locator('#book .close').click();
  // The first drop: a new camp past its lessons, one tap from the bad-luck limit.
  await page.evaluate(async KEY=>{const g=await import('./next/game.mjs');const s=g.fresh(Date.now());s.ordersDone=4;s.daily={day:9e6,count:1};s.secSince.rig=g.SECONDARY_RULES.rig.first-1;localStorage.setItem(KEY,JSON.stringify(s));},KEY);
  await page.reload();await page.waitForSelector('#board .tile');await settle();
  await page.locator('#board .tile.source[data-family="rig"]').click();await page.waitForSelector('.moment',{timeout:4000});await page.waitForTimeout(250);
  await page.screenshot({path:`${OUT}/pilot-first-drop-${W}x${H}.png`});
  const moment=await page.locator('.moment').innerText();
  const save=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)),KEY);
  console.log(JSON.stringify({size:`${W}x${H}`,errors,selection:sel.replace(/\s+/g,' '),message:msg,route:route.replace(/\s+/g,' ').slice(0,220),book:book.replace(/\s+/g,' '),moment:moment.replace(/\s+/g,' '),bolts:save.board.filter(x=>x?.family==='mech').length,secSince:save.secSince,scrollX:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)}));
  await ctx.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
