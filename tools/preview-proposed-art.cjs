// Isolated preview of proposed board art (2026-10-29: the Rivet Rover secondary chain, not integrated).
// Opens the real Coast Camp page with a seeded test camp and, in the browser only, swaps the proposed
// icons into a few board cells with the board's own size fit (v5/next/art-fit.mjs, item targets), next
// to the existing Rover parts, the Brass cog and the Rover. Nothing in the game or its saves changes.
// Needs the repo served on :8080 (python3 -m http.server 8080). Writes PNGs to OUT (default: cwd).
//   node tools/preview-proposed-art.cjs [OUT] [WxH,...]
const {chromium}=require('playwright');const {throughHome}=require('../tests/v5-next-home-helper.cjs');
const URL='http://127.0.0.1:8080/v5/play.html',KEY='vaultwake-v5-coast';
const OUT=process.argv[2]??'.',SIZES=(process.argv[3]??'360x780,390x844,430x932,907x510').split(',').map(s=>s.split('x').map(Number));
// The proposed chain, in order, with its measured solid object (tools/prepare-icon.py) turned into the
// board fit the way art-fit.mjs does for items: target .72 (square) to .80 (thin) of the cell.
const NEW=[['rover-bolt',.917,.778,.500,.482],['rover-gear',.917,.926,.500,.487],['rover-gear-assembly',.885,.853,.495,.487],['rover-hand-crank',.911,.840,.503,.492]]
 .map(([f,long,ratio,cx,cy])=>{const target=.72+.08*Math.max(0,Math.min(1,(1-ratio)/.5));return {f,fit:+Math.min(1,target/long).toFixed(3),dx:+(.5-cx).toFixed(3),dy:+(.5-cy).toFixed(3)};});
(async()=>{
 const browser=await chromium.launch();
 for(const [W,H] of SIZES){
  const ctx=await browser.newContext({viewport:{width:W,height:H},isMobile:W<700,hasTouch:W<700,reducedMotion:'reduce'});const page=await ctx.newPage();
  throughHome(page);// through Home (and the first-play story) after every load, as the board tests do
  await page.goto(URL+'?new=1');await page.waitForSelector('#board .tile');
  for(let n=0;n<10&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(80);}
  const cols=await page.evaluate(()=>getComputedStyle(document.querySelector('#board')).gridTemplateColumns.split(' ').length);
  // seed: row 1 the Rover chain, row 2 the proposed chain (placeholders) with the Brass cog, the
  // Pocket winch and the Rover beside it, row 3 the proposed chain again for selection states
  await page.evaluate(([k,cols])=>{const s=JSON.parse(localStorage.getItem(k));
   for(let c=0;c<cols;c++)s.board[c]={type:'item',family:'rig',tier:Math.min(7,c)};
   const r2=[0,0,0,0,'cog',3,'gen'],r3=[0,0,0,0,1,2,3];
   for(let c=0;c<cols;c++){const v=r2[c]??0;s.board[cols+c]=v==='cog'?{type:'cog'}:v==='gen'?{type:'source',id:'rig'}:{type:'item',family:'rig',tier:v};s.board[2*cols+c]={type:'item',family:'rig',tier:r3[c]??0};}
   s.daily={day:9e6,count:1};localStorage.setItem(k,JSON.stringify(s));},[KEY,cols]);
  await page.reload();await page.waitForSelector('#board .tile');
  for(let n=0;n<10&&await page.locator('#beat[open]').count();n++){await page.locator('#beatNext').click();await page.waitForTimeout(80);}
  const cell=await page.evaluate(([cols,NEW])=>{
   const put=(i,p,cls)=>{const t=document.querySelector(`#board [data-index="${i}"]`),im=t.querySelector('img.art,svg.art,.art');
    const n=document.createElement('img');n.className='art';n.src=`assets/premium/coast/proposed/${p.f}.webp`;n.alt='';n.style.cssText=`--fit:${p.fit};--dx:${p.dx};--dy:${p.dy}`;
    im?im.replaceWith(n):t.append(n);if(cls)t.classList.add(cls);};
   NEW.forEach((p,k)=>{put(cols+k,p);put(2*cols+k,p,k===1?'selected':k===2?'match':null);});
   document.querySelector(`#board [data-index="${2*cols+5}"]`)?.classList.add('selected');
   return document.querySelector('#board .tile').getBoundingClientRect().width;},[cols,NEW]);
  await page.waitForTimeout(400);
  await page.locator('#board').screenshot({path:`${OUT}/board-${W}x${H}.png`});
  console.log(`${W}x${H}: ${cols} columns, cell ${cell.toFixed(1)} px`);
  await ctx.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
