// Rewards on a full board in the real page (Build 47a): a stage bought on the coast screen with no
// free space says its reward waits; the board's space tab says how many wait; the next merge that
// frees a space lands it (once), and a reload in between keeps it waiting. No console errors.
const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');const {throughHome}=require('./v5-next-home-helper.cjs');
const URL='http://127.0.0.1:8080/v5/play.html',KEY='vaultwake-v5-coast';
(async()=>{
 const engines=(process.env.ENGINES||'chromium,webkit').split(',').map(e=>[e,{chromium,webkit}[e]]);
 for(const [engine,type] of engines){
  let browser;try{browser=await type.launch();}catch(e){if(engine!=='chromium'&&/Executable doesn't exist/.test(e.message)){console.log(`${engine}: not installed here, skipped`);continue;}throw e;}
  try{for(const [W,H] of [[390,844],[907,510]]){
   const context=await browser.newContext({viewport:{width:W,height:H},isMobile:W<700&&engine==='chromium',hasTouch:W<700,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];throughHome(page);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   const tag=s=>`${engine} ${W}×${H}: ${s}`;
   await page.goto(URL+'?new=1');await page.waitForSelector('#board .tile');
   // a full board with two twin offcuts, materials and coins for the boardwalk (its reward: a Rover copy)
   await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.coins=500;s.moves=20;s.daily={day:9e6,count:1};s.built={'beach-path':1};s.materials={'beach-path':2};
    for(let i=0;i<s.board.length;i++)if(s.board[i]===null)s.board[i]={type:'item',family:'rig',tier:0};localStorage.setItem(k,JSON.stringify(s));},KEY);
   await page.reload();await page.waitForSelector('#board .tile');
   for(let n=0;n<8&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(60);}
   const gens=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).board.filter(x=>x?.type==='source').length,KEY),g0=await gens();
   await page.locator('#mapButton').click();await page.waitForSelector('#coastMap[open]');
   await page.locator('[data-restore="beach-path"]').click();await page.waitForTimeout(500);
   let s=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
   assert.deepEqual(s.pending,[{type:'source',id:'rig'}],tag('the copy waits in the save'));assert.equal(s.built['beach-path'],2);
   // the stage's story card first, then its reward note says the copy waits
   for(let n=0;n<8&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(60);}
   await page.waitForFunction(()=>/waits for a free space/.test(document.body.textContent),null,{timeout:5000}).catch(()=>{});
   assert.match(await page.textContent('body'),/a Rivet Rover to merge \(waits for a free space\)/,tag('the reward says it waits'));
   if(await page.locator('#coastMap[open]').count())await page.locator('#coastMap .close').click();
   await page.waitForTimeout(300);
   assert.match(await page.textContent('#free'),/1 reward waiting · make a space/,tag('the space tab says so'));
   // reload: still waiting, once
   await page.reload();await page.waitForSelector('#board .tile');for(let n=0;n<8&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(60);}
   s=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);assert.equal(s.pending.length,1,tag('still waiting after reload'));
   // merge two offcuts: the copy lands
   const [a,b]=await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)),i=s.board.findIndex(x=>x?.type==='item'&&x.family==='rig'&&x.tier===0);return [i,s.board.findIndex((x,j)=>j!==i&&x?.type==='item'&&x.family==='rig'&&x.tier===0)];},KEY);
   const A=await page.locator(`#board [data-index="${a}"]`).boundingBox(),B=await page.locator(`#board [data-index="${b}"]`).boundingBox();
   await page.mouse.move(A.x+A.width/2,A.y+A.height/2);await page.mouse.down();await page.mouse.move(B.x+B.width/2,B.y+B.height/2,{steps:8});await page.mouse.up();await page.waitForTimeout(400);
   s=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
   assert.deepEqual(s.pending,[]);assert.equal(await gens(),g0+1,tag('the copy landed once'));
   assert.match(await page.textContent('#message'),/a waiting reward lands/,tag('the landing is said'));
   assert.deepEqual(errors,[],tag('no errors'));await context.close();}
   console.log(`${engine} Coast Camp full-board rewards: wait in the save, said on the coast and the board, kept across reload, land once on the next free space passed`);
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
