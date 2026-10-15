// Recorded real-input walkthroughs. No reducer calls or save injection in page.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch();const dir='test-artifacts/v5/resonance';fs.mkdirSync(dir,{recursive:true});
 try{for(const [route,receiver,lane]of [['conduit','scope','lower'],['ridge','relay','lower']]){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,recordVideo:{dir,size:{width:390,height:844}}});
  const page=await context.newPage(),video=page.video(),errors=[],steps=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
  try{
  await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');
  await page.evaluate(()=>{window.inputLog=[];for(const type of ['pointerdown','pointerup','pointercancel'])document.addEventListener(type,e=>{window.inputLog.push({type,x:e.clientX,y:e.clientY,button:e.button,target:e.target.closest('[data-index]')?.dataset.index,hit:document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]')?.dataset.index});window.inputLog=window.inputLog.slice(-12);},true);});
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
  const shot=async name=>{await page.locator('.moment').waitFor({state:'detached'});await page.evaluate(async()=>Promise.all([...document.images].map(x=>x.decode().catch(()=>{}))));await page.screenshot({path:`${dir}/${route}-${name}-390.png`,fullPage:true});};
  const drag=async(from,to)=>{
   const a=await page.locator(`#board [data-index="${from}"]`).boundingBox(),b=await page.locator(`#board [data-index="${to}"]`).boundingBox();
   const touch=await context.newCDPSession(page),start={x:a.x+a.width/2,y:a.y+a.height/2},end={x:b.x+b.width/2,y:b.y+b.height/2};
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
   for(let n=1;n<=9;n++){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*n/9,y:start.y+(end.y-start.y)*n/9}]});await page.waitForTimeout(24);}
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  };
  const perform=async a=>{
   const before=await read();assert.ok(a);
   if(a.type==='merge'||a.type==='move')await drag(a.from,a.to);
   else if(a.type==='goal')await page.locator('#goalButton').tap();
   else if(a.type==='power')await page.locator(`#board [data-index="${a.index}"]`).tap();
   else if(a.type==='produce'||a.type==='service'){
    const i=before.board.findIndex(x=>x?.type==='source'&&x.id===a.id);await page.locator(`#board [data-index="${i}"]`).tap();if(a.type==='service')await page.locator('[data-action="service"]').tap();
   }else if(a.type==='ration')await page.locator('#rationButton').tap();
   else if(a.type==='crate')await page.locator(`#board [data-index="${a.index}"]`).tap();
   else{
    const index=a.index??before.board.findIndex(x=>x?.type==='site'&&x.kind==='winch');
    if(await page.locator(`#board [data-index="${index}"]`).getAttribute('aria-pressed')!=='true')await page.locator(`#board [data-index="${index}"]`).tap();
    if((await read()).moves===before.moves)await page.locator(`[data-action="${a.type}"]`).tap();
   }
   try{await page.waitForFunction(n=>JSON.parse(localStorage.getItem('vaultwake-v5')).moves>n,before.moves,{timeout:1500});}
   catch(e){await page.screenshot({path:`${dir}/${route}-input-failure.png`,fullPage:true});const debug=await page.evaluate(()=>({input:window.inputLog,message:document.querySelector('#message').textContent,state:JSON.parse(localStorage.getItem('vaultwake-v5'))}));fs.writeFileSync(`${dir}/${route}-input-failure.json`,JSON.stringify({action:a,before,debug},null,2));throw e;}
   const after=await read();assert.equal(after.moves,before.moves+1,JSON.stringify(a));
   const ray=await page.evaluate(async()=>{const {beam}=await import('/v5/seals.mjs');return beam(JSON.parse(localStorage.getItem('vaultwake-v5')));});
   steps.push({action:a,moves:after.moves,occupied:after.board.filter(Boolean).length,energy:after.energy,ray});
   await page.waitForTimeout(430);
  };
  const options={route,style:'expedition',sideFirst:false,decode:false,findStrategy:receiver==='scope'?'mixed':null};
  while(!(await read()).seals.optics.primed&&steps.length<100){
   const a=await page.evaluate(async options=>{const {choose}=await import('/tests/v5-policy.mjs');return choose(JSON.parse(localStorage.getItem('vaultwake-v5')),options);},options);
   await perform(a);
  }
  assert.ok((await read()).seals.optics.primed);await shot('unsolved');const start=steps.length;
  // Deliberately try the tempting middle crossing. The beam hits a visible rib.
  for(const [id,to]of [[0,14],[1,17]]){const s=await read(),from=s.board.findIndex(x=>x?.type==='prism'&&x.id===id);if(from!==to)await perform({type:'move',from,to});if((await read()).board[to].turn!==0)await perform({type:'turn',index:to});}
  if((await read()).seals.optics.direction!==0)await perform({type:'turn',index:20});
  assert.equal(steps.at(-1).ray.stop,'stone');await shot('obstacle');
  const plan=await page.evaluate(async ({receiver,lane})=>{const {layouts}=await import('/tests/v5-optics-policy.mjs');return layouts(JSON.parse(localStorage.getItem('vaultwake-v5')),{receiver,lane})[0];},{receiver,lane});assert.ok(plan);
  let partial=false,management=false;
  for(let n=0;n<60;n++){
   const a=await page.evaluate(async plan=>{const {arrange}=await import('/tests/v5-optics-policy.mjs');return arrange(JSON.parse(localStorage.getItem('vaultwake-v5')),plan);},plan);if(!a)break;
   const before=await read();await perform(a);
   const ray=steps.at(-1).ray;
   if(!partial&&ray.prisms.length>0&&ray.receiver===null&&ray.stop!=='stone'){await shot('partial');partial=true;}
   if(!management&&a.type==='merge'&&(before.board[a.from]?.type!=='prism'||before.board[a.to])){await shot('workspace-decision');management=true;}
  }
  assert.equal(await page.locator('.litReflector').count(),2);assert.equal(await page.locator('.sealWire.live').count(),1);
  // A wrong setting is recoverable; exercise the visible TURN control twice.
  const pivot=plan.prisms[0].index;await perform({type:'turn',index:pivot});assert.equal(await page.locator('.sealWire.live').count(),0);await shot('wrong-turn');await perform({type:'turn',index:pivot});
  await shot('solved');const saved=await read();await page.reload();assert.deepEqual(await read(),saved);
  await perform({type:'power',index:plan.path.at(-1)});assert.equal((await read()).stage,3);await shot('powered-world');
  await perform({type:'goal'});await page.locator('#celebration').waitFor({state:'visible'});await page.locator('#celebration .continue').tap();await shot('vault-open');
  assert.equal((await read()).stage,4);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  fs.writeFileSync(`${dir}/${route}-walkthrough.json`,JSON.stringify({route,receiver,lane,puzzleActions:steps.length-start-1,plan,steps},null,2));
  }finally{await context.close();await video.saveAs(`${dir}/${route}-walkthrough.webm`);}
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
