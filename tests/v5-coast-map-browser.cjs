// Coast map in a real browser at 360/390/430px: open from the header and the
// scene, build the Workshop from the map, read its story beat, return to the map.
// Needs `python3 -m http.server 8080` at the repo root.
const assert=require('node:assert/strict'),fs=require('node:fs');
const pw=require('playwright');
const engine=pw[process.env.COASTAL_ENGINE||'chromium'];
(async()=>{
 fs.mkdirSync('test-artifacts/v5/coast-map',{recursive:true});
 const browser=await engine.launch();
 try{for(const width of [360,390,430]){
  const ctx=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8080/v5/');await page.waitForSelector('#board .tile');
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vaultwake-v5')));
  // Fresh coast: no restoration affordable, no ready dot.
  assert.equal(await page.locator('#mapReady').isVisible(),false);
  await page.locator('#mapButton').tap();
  assert.equal(await page.locator('#coastMap').evaluate(d=>d.open),true);
  assert.equal(await page.locator('.place[data-place="landing"]').getAttribute('data-status'),'next');
  assert.equal(await page.locator('.place[data-place="workshop"]').getAttribute('data-status'),'saving');
  await page.locator('#coastMap .close').tap();
  // Earned supplies (as from delivered orders): the map shows a ready restoration.
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('vaultwake-v5'));s.requests.supplies=9;s.landingStep=1;localStorage.setItem('vaultwake-v5',JSON.stringify(s));});
  await page.reload();await page.waitForSelector('#board .tile');
  assert.equal(await page.locator('#mapReady').isVisible(),true,'ready dot on the map button');
  {const box=await page.locator('#scene').boundingBox();await page.locator('#scene').tap({position:{x:box.width/2,y:box.height/2}});}
  assert.equal(await page.locator('#coastMap').evaluate(d=>d.open),true,'tapping the scene opens the map');
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,small:[...document.querySelectorAll('#coastMap button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&(r.width<44||r.height<44);}).length}));
  assert.equal(layout.overflow,0);assert.equal(layout.small,0,'map buttons are at least 44px');
  await page.screenshot({path:`test-artifacts/v5/coast-map/map-${width}.png`});
  await page.locator('[data-build="workshop"]').tap();
  await page.waitForSelector('[data-beat-next]');
  let s=await read();assert.equal(s.workshop.repaired,true);assert.equal(s.requests.supplies,1);
  const lines=[];
  for(let n=0;n<3;n++){lines.push(await page.locator('.beatLine p').innerText());const last=(await page.locator('[data-beat-next]').innerText())==='Back to the coast';await page.locator('[data-beat-next]').tap();if(last)break;}
  assert.equal(lines.length,3);assert.match(lines[0],/Bellows/);
  assert.equal(await page.locator('.place[data-place="workshop"]').getAttribute('data-status'),'done');
  await page.locator('[data-story="workshop"]').tap();assert.match(await page.locator('.beatLine p').innerText(),/Bellows/,'restored places replay their lines');
  await page.locator('#coastMap .close').tap();
  await page.reload();await page.waitForSelector('#board .tile');
  s=await read();assert.equal(s.workshop.repaired,true,'restoration survives reload');
  assert.deepEqual(errors,[]);
  await ctx.close();
  console.log('Coast map '+width+' passed');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
