// V5 browser smoke: 360/390/430px phones, tap and drag merges, delivery,
// reload persistence, a full chapter played through the UI by following the
// on-screen suggestion, replay slots, and a migrated version-5 save.
// Needs `python3 -m http.server 8080` at the repo root. V5_ENGINE=webkit for Safari's engine.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pw=require('playwright');
const engine=pw[process.env.V5_ENGINE||process.env.COASTAL_ENGINE||'chromium'];
const ROOT=process.env.V5_URL||'http://127.0.0.1:8080/v5/';
const OUT=path.join(__dirname,'..','test-artifacts','v5');
fs.mkdirSync(OUT,{recursive:true});

async function open(browser,width,height,seed=null){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:engine!==pw.firefox,hasTouch:true});
 if(seed)await ctx.addInitScript(raw=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('vaultwake-v5',raw);sessionStorage.setItem('seeded','1');}},seed);
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(ROOT);await page.waitForSelector('#board .cell');
 return {ctx,page,errors};
}
const save=page=>page.evaluate(()=>JSON.parse(localStorage.getItem(localStorage.getItem('vaultwake-v5-active-slot')==='replay'?'vaultwake-v5-replay':'vaultwake-v5')));
const cell=(page,i)=>page.locator(`#board [data-i="${i}"]`).tap();
async function layout(page){
 return page.evaluate(()=>({
  overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
  small:[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<44||r.height<44);}).map(b=>(b.className||b.id)+' '+Math.round(b.getBoundingClientRect().width)+'×'+Math.round(b.getBoundingClientRect().height)),
  boardBottom:document.querySelector('#board').getBoundingClientRect().bottom
 }));
}
async function drag(page,a,b){
 const ra=await page.locator(`#board [data-i="${a}"]`).boundingBox(),rb=await page.locator(`#board [data-i="${b}"]`).boundingBox();
 await page.mouse.move(ra.x+ra.width/2,ra.y+ra.height/2);await page.mouse.down();
 await page.mouse.move(ra.x+ra.width/2+12,ra.y+ra.height/2,{steps:3});
 await page.mouse.move(rb.x+rb.width/2,rb.y+rb.height/2,{steps:8});await page.mouse.up();
}

(async()=>{
 const {suggest}=await import('../v5/guide.mjs');
 const browser=await engine.launch();
 const name=process.env.V5_ENGINE||process.env.COASTAL_ENGINE||'chromium';
 for(const [width,height] of [[360,740],[390,844],[430,932]]){
  const {ctx,page,errors}=await open(browser,width,height);
  let l=await layout(page);
  assert.equal(l.overflow,0,width+': no horizontal scroll');
  assert.deepEqual(l.small,[],width+': touch targets at least 44px');
  assert.ok(l.boardBottom<=height+1,width+': the whole board fits on screen at start');
  await page.screenshot({path:path.join(OUT,`fresh-${name}-${width}.png`)});
  // Tap merge, deliver, drag merge, reload.
  await cell(page,14);await cell(page,15);
  let s=await save(page);assert.deepEqual(s.board[15],{type:'item',family:'rig',tier:1});
  await page.locator('#task [data-task]').tap();
  s=await save(page);assert.equal(s.task,1,'landing path delivered');
  assert.match(await page.locator('#task').innerText(),/LANDING PATH RESTORED/i);
  await page.locator('[data-continue]').tap();
  await drag(page,20,21);
  s=await save(page);assert.deepEqual(s.board[21],{type:'item',family:'rig',tier:1},'drag merge');
  await page.reload();await page.waitForSelector('#board .cell');
  s=await save(page);assert.equal(s.task,1);assert.equal(s.merges,2,'progress survives reload');
  assert.match(await page.locator('#task h2').innerText(),/Brace the storm pier/);
  l=await layout(page);assert.equal(l.overflow,0);assert.deepEqual(l.small,[]);
  assert.deepEqual(errors,[],width+': no page errors');
  await ctx.close();
 }

 // A whole chapter through the UI at 390px, following only the suggestion.
 {
  const {ctx,page,errors}=await open(browser,390,844);
  let steps=0;
  for(;steps<500;steps++){
   if(await page.locator('[data-continue]').count()){await page.locator('[data-continue]').tap();continue;}
   const s=await save(page),g=suggest(s);
   if(g.kind==='done')break;
   if(g.kind==='task')await page.locator(g.choice?`#task [data-choice="${g.choice}"]`:'#task [data-task]').tap();
   else if(g.kind==='merge'){await cell(page,g.cells[0]);await cell(page,g.cells[1]);}
   else if(g.kind==='order')await page.locator(`[data-order="${g.id}"]`).tap();
   else if(g.kind==='open'||g.kind==='produce')await cell(page,g.cells[0]);
   else if(g.kind==='meal')await page.locator('#mealButton').tap();
   else if(g.kind==='recycle'){await cell(page,s.board.findIndex(x=>x?.type==='item'&&x.tier===0));await page.locator('[data-recycle]').tap();}
   else throw new Error('No suggestion: '+g.text);
   if(steps===60)await page.screenshot({path:path.join(OUT,`midgame-${name}-390.png`)});
  }
  const s=await save(page);
  assert.equal(s.task,13,'chapter finished through the UI in '+steps+' steps');
  await page.screenshot({path:path.join(OUT,`complete-${name}-390.png`)});
  // Replay keeps the finished save.
  await page.locator('#task [data-replay]').tap();await page.locator('#replayBegin').tap();
  assert.equal((await save(page)).task,0);
  assert.equal(await page.locator('#replayNotice').isVisible(),true);
  await page.locator('#returnSave').tap();
  assert.equal((await save(page)).task,13,'original save restored');
  assert.deepEqual(errors,[]);
  await ctx.close();
 }

 // A version-5 save from the original V5 opens migrated, without board fixtures.
 {
  const raw=fs.readFileSync(path.join(__dirname,'fixtures','stage2','ridge-primed.json'),'utf8');
  const {ctx,page,errors}=await open(browser,390,844,raw);
  const s=await save(page);
  assert.equal(s.version,6);assert.ok(s.task>=7);assert.equal(s.choice,'ridge');
  assert.ok(s.board.every(x=>x===null||['item','source','crate'].includes(x.type)));
  assert.equal(await page.locator('#board .cell.source').count(),3);
  await page.screenshot({path:path.join(OUT,`migrated-${name}-390.png`)});
  assert.deepEqual(errors,[]);
  await ctx.close();
 }
 await browser.close();
 console.log('V5 mobile smoke passed ('+name+')');
})().catch(e=>{console.error(e);process.exit(1);});
