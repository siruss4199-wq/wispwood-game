// Isolated preview of proposed board art (2026-10-29: the proposed secondary chains, not integrated).
// Opens the real Coast Camp page and, in the browser only, draws the proposed icons into the board's
// first three rows of cells: row 1 the existing chain (tiers 0-6), row 2 the proposed chain and the
// existing art it could be confused with, row 3 the proposed chain again as selected and as a merge
// target. Every sprite gets the board's own size fit (v5/next/art-fit.mjs: existing art from its
// measurements, proposed art from tools/prepare-icon.py's). No game state, rule or save is touched:
// the cells' contents are swapped on screen only. Needs the repo served on :8080. Writes PNGs to OUT.
//   node tools/preview-proposed-art.cjs rover|kite [OUT] [WxH,...]
const {chromium}=require('playwright');const {throughHome}=require('../tests/v5-next-home-helper.cjs');
const URL='http://127.0.0.1:8080/v5/play.html';
const SET=process.argv[2]??'rover',OUT=process.argv[3]??'.',SIZES=(process.argv[4]??'360x780,390x844,430x932,907x510').split(',').map(s=>s.split('x').map(Number));
// Proposed art: [file, solid longest side, short/long, centre x, centre y] as tools/prepare-icon.py printed.
const PROPOSED={
 rover:[['rover-bolt',.917,.778,.500,.482],['rover-gear',.917,.926,.500,.487],['rover-gear-assembly',.885,.853,.495,.487],['rover-hand-crank',.911,.840,.503,.492]],
 kite:[['kite-note-fragment',.917,.920,.500,.500],['kite-expedition-note',.917,.943,.500,.500],['kite-travel-notebook',.917,.812,.500,.497],['kite-captains-logbook',.917,.972,.497,.500]]};
// Existing art shown beside it: the chain's tiers 0-6 (row 1), then what each proposed set could be
// confused with (rows 2 and 3). Board file names as chains.mjs draws them (KEEP and PILOT files).
const KEEP={'rig-0':'copper-offcut','rig-1':'grip-tool-v2','rig-2':'split-spanner-v2','rig-3':'pocket-winch'};
const src=f=>/^(copper-offcut|pocket-winch)$/.test(f)?`assets/premium/${f}-vibrant.webp`:`assets/premium/coast/icons/${f}.webp`;
const EXISTING={
 rover:{row1:[0,1,2,3,4,5,6].map(t=>KEEP['rig-'+t]??'rig-'+t),row2:['brass-cog','pocket-winch','gen-rig-pilot'],row3:['gen-rope','rig-7','tide-token']},
 kite:{row1:[0,1,2,3,4,5,6].map(t=>'chart-'+t),row2:['chart-0','chart-7','gen-chart'],row3:['chart-1','tide-token','cargo-bundle-pilot']}};
(async()=>{
 const {artFit}=await import('../v5/next/art-fit.mjs');
 const fitOf=f=>{const a=artFit(f);return a?{fit:a.fit,dx:a.dx,dy:a.dy}:{fit:.8,dx:0,dy:0};};
 const proposed=PROPOSED[SET].map(([f,long,ratio,cx,cy])=>{const target=.72+.08*Math.max(0,Math.min(1,(1-ratio)/.5));return {src:`assets/premium/coast/proposed/${f}.webp`,fit:+Math.min(1,target/long).toFixed(3),dx:+(.5-cx).toFixed(3),dy:+(.5-cy).toFixed(3)};});
 const ex=f=>({src:src(f),...fitOf(f)}),E=EXISTING[SET];
 const rows=[E.row1.map(ex),[...proposed,...E.row2.map(ex)],[...proposed.map((p,k)=>({...p,cls:k===1?'selected':k===2?'match':null})),...E.row3.map(ex)]];
 const browser=await chromium.launch();
 for(const [W,H] of SIZES){
  const ctx=await browser.newContext({viewport:{width:W,height:H},isMobile:W<700,hasTouch:W<700,reducedMotion:'reduce'});const page=await ctx.newPage();
  throughHome(page);// through Home (and the first-play story), as the board tests do
  await page.goto(URL+'?new=1');await page.waitForSelector('#board .tile');
  for(let n=0;n<10&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(80);}
  await page.waitForTimeout(800);// the board settles its columns after load; cells are picked by where they stand
  const info=await page.evaluate(rows=>{
   const tiles=[...document.querySelectorAll('#board .tile')].map(t=>({t,r:t.getBoundingClientRect()})).sort((a,b)=>Math.round(a.r.top)-Math.round(b.r.top)||a.r.left-b.r.left);
   const tops=[...new Set(tiles.map(x=>Math.round(x.r.top)))],grid=tops.map(y=>tiles.filter(x=>Math.round(x.r.top)===y).map(x=>x.t)),cols=grid[0].length;
   rows.forEach((row,r)=>row.forEach((p,c)=>{const t=grid[r]?.[c];if(!t)return;
    t.className='tile item'+(p.cls?' '+p.cls:'');t.innerHTML='';const n=document.createElement('img');n.className='art';n.src=p.src;n.alt='';n.style.cssText=`--fit:${p.fit};--dx:${p.dx};--dy:${p.dy}`;t.append(n);}));
   return {cols,cell:tiles[0].r.width};},rows);
  await page.waitForTimeout(500);
  await page.locator('#board').screenshot({path:`${OUT}/${SET}-board-${W}x${H}.png`});
  console.log(`${SET} ${W}x${H}: ${info.cols} columns, cell ${info.cell.toFixed(1)} px`);
  await ctx.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
