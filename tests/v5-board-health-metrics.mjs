// Scripted board-health observation along the visible objective (simulation, not human play):
// how often a legal merge exists, how full the board is, and what the player spends actions on.
import {pathToFileURL} from 'node:url';import path from 'node:path';
const root=path.resolve(process.argv[2]??'.');const imp=p=>import(pathToFileURL(path.join(root,p)));
const {fresh,act}=await imp('v5/core.mjs');const {coastalAction}=await imp('tests/v5-coastal-policy.mjs');const {sameKind,maxTier}=await imp('v5/treasures.mjs');
const pairs=s=>{let n=0;const xs=s.board.map((x,i)=>[x,i]).filter(([x])=>x?.type==='item');for(let a=0;a<xs.length;a++)for(let b=a+1;b<xs.length;b++)if(sameKind(xs[a][0],xs[b][0])&&xs[a][0].tier<maxTier(xs[a][0],s))n++;return n;};
for(const [specialty,route,receiver] of [['rig','ridge','scope'],['chart','ridge','relay'],['flux','conduit','scope']]){
 const s=fresh(1);const rows=[];const windows=[[1,60],[61,130]];
 for(let n=1;n<=130&&!s.discovered.includes('chart:tide:4');n++){const a=coastalAction(s,{specialty,route,receiver});act(s,a,n);
  const items=s.board.filter(x=>x?.type==='item').length,fixtures=s.board.filter(x=>x&&x.type!=='item'&&x.type!=='source').length;
  rows.push({n,type:a.type,pairs:pairs(s),items,fixtures,occ:s.board.filter(Boolean).length});}
 for(const [a,b] of windows){const w=rows.filter(r=>r.n>=a&&r.n<=b);if(!w.length)continue;const c=t=>w.filter(r=>r.type===t).length;
  console.log(`${specialty} actions ${a}-${b}: noPair ${(100*w.filter(r=>!r.pairs).length/w.length).toFixed(0)}% | avg items ${(w.reduce((t,r)=>t+r.items,0)/w.length).toFixed(1)} fixtures ${(w.reduce((t,r)=>t+r.fixtures,0)/w.length).toFixed(1)} | merge ${c('merge')} produce ${c('produce')} request ${c('request')} other ${w.length-c('merge')-c('produce')-c('request')}`);}
}
