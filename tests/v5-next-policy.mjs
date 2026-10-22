// A scripted player for the new loop: restore when affordable, deliver ready orders,
// open sealed cargo with spare parts (generator cargo first), grow crates, merge toward
// what orders and cargo need, otherwise tap the generator whose parts are wanted.
import {count,matches,orderItems,nextTask,sourceOpen,openFamilies,cargoKeys,generatorsMerge} from '../v5/next/game.mjs';
import {CHAINS,maxTier} from '../v5/next/chains.mjs';
import {kitsMerge,kitFull,MAX_KIT_SIZE} from '../v5/kits.mjs';

// How many of each part the live orders still want, plus the key of one cargo to
// work toward (a generator's cargo first, else the cheapest one we can make).
// The player works toward the glowing crates: a new kind of generator first, then a
// copy. The target is the openable crate on the shortest path of cargo to it.
const near=i=>{const r=i<36?Math.floor(i/6):i<43?i-36:6,c=i<36?i%6:i<43?6:i-43;return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([a,b])=>a>=0&&b>=0&&a<7&&b<7).map(([a,b])=>b===6?36+a:a===6?43+b:a*6+b);};
function target(s){
 const keys=cargoKeys(s).filter(k=>sourceOpen(s,CHAINS[k.family].gen)),open=new Map(keys.map(k=>[k.index,k]));
 const glowing=s.board.flatMap((x,i)=>x?.type==='cargo'&&x.find?.type==='source'?[[i,sourceOpen(s,x.find.id)?1:0]]:[]).sort((a,b)=>a[1]-b[1]);
 for(const [goal,known] of glowing.filter(([,k])=>!k)){
  const seen=new Set([goal]),queue=[goal];
  while(queue.length){const i=queue.shift();if(open.has(i))return {...open.get(i),newKind:!known};for(const j of near(i))if(!seen.has(j)&&s.board[j]?.type==='cargo'){seen.add(j);queue.push(j);}}
 }
 return keys.sort((a,b)=>a.tier-b.tier||a.index-b.index)[0]??null;
}
function wanted(s){
 const want=new Map();
 for(const o of s.orders)for(const r of o.needs){const k=r.family+r.tier;want.set(k,(want.get(k)??0)+r.count);}
 const t=target(s);if(t){const k=t.family+t.tier;want.set(k,(want.get(k)??0)+1);}
 return want;
}
// Two parts merge on whichever space has more tideglass beside it (merges there crack it).
const glassBeside=(b,i)=>near(i).filter(j=>b[j]?.type==='glass').length;
const pairMerge=(b,i,j)=>glassBeside(b,i)>glassBeside(b,j)?{type:'merge',from:j,to:i}:{type:'merge',from:i,to:j};
export function nextAction(s){
 const b=s.board,t=nextTask(s);
 if(t&&s.stars>=t.cost)return {type:'restore',id:t.id};
 // Curious: the crate on the way to a glowing one opens first, even before deliveries.
 {const g=target(s),have=g?b.findIndex(x=>matches(x,g)):-1;if(have>=0)return {type:'unseal',from:have,index:g.index};}
 // After two orders, the key on the way to a new kind of generator is made first.
 {const g=s.ordersDone>=2?target(s):null;if(g?.newKind)for(let tier=g.tier-1;tier>=0;tier--){const pair=b.flatMap((x,i)=>matches(x,{family:g.family,tier})?[i]:[]);if(pair.length>=2)return pairMerge(b,pair[0],pair[1]);}}
 for(const o of s.orders)if(orderItems(s,o))return {type:'deliver',id:o.id};
 // Open cargo with a part no order is waiting for (generator cargo first).
 const orderWant=new Map();for(const o of s.orders)for(const r of o.needs)orderWant.set(r.family+r.tier,(orderWant.get(r.family+r.tier)??0)+r.count);
 const keys=cargoKeys(s).sort((a,b)=>Number(b.index===target(s)?.index)-Number(a.index===target(s)?.index));
 // A generator's cargo, or the crate being worked toward, opens as soon as its key is in
 // hand; other cargo only with spare parts.
 for(const k of keys){const have=b.findIndex(x=>matches(x,k));const gen=b[k.index].find?.type==='source'||k.index===target(s)?.index;if(have>=0&&(gen||count(s,k)>(orderWant.get(k.family+k.tier)??0)))return {type:'unseal',from:have,index:k.index};}
 // Merge two identical generators into a stronger one.
 const gens=b.flatMap((x,i)=>x?.type==='source'?[i]:[]);
 for(const i of gens)for(const j of gens)if(i!==j&&generatorsMerge(b[i],b[j]))return {type:'merge',from:j>i?j:i,to:j>i?i:j};
 const kits=b.flatMap((x,i)=>x?.type==='kit'?[i]:[]);
 for(const i of kits)for(const j of kits)if(i!==j&&kitsMerge(b[i],b[j]))return {type:'merge',from:i,to:j};
 const want=wanted(s),free=b.filter(x=>x===null).length;
 // Merge toward a wanted part: the highest tier below a wanted one first.
 const needs=[...want.entries()].map(([k,n])=>({family:k.replace(/\d+$/,''),tier:+k.match(/\d+$/)[0],n})).filter(r=>count(s,r)<r.n).sort((x,y)=>y.tier-x.tier);
 const keep=(i)=>{const x=b[i];const n=want.get(x.family+x.tier)??0;return n>0&&count(s,x)<=n;};
 for(const r of needs)for(let tier=r.tier-1;tier>=0;tier--){
  const pair=b.flatMap((x,i)=>matches(x,{family:r.family,tier})&&!keep(i)?[i]:[]);
  if(pair.length>=2)return pairMerge(b,pair[0],pair[1]);
 }
 // Any spare pair (keeps the board from clogging and digs the sand).
 for(let i=0;i<b.length;i++){const x=b[i];if(x?.type!=='item'||keep(i))continue;const j=b.findIndex((y,j)=>j>i&&matches(y,x)&&!keep(j));if(j>=0&&x.tier<maxTier(x.family))return pairMerge(b,i,j);}
 // A started box, or one that cannot grow further, before paying energy.
 const open=kits.find(i=>!kitFull(b[i])||b[i].size===MAX_KIT_SIZE||free<=3||s.energy<4);
 if(open!==undefined&&free>0)return {type:'openKit',index:open};
 // Tap the generator that makes a wanted chain right now.
 const family=needs.map(r=>CHAINS[r.family].gen).find(g=>sourceOpen(s,g))??openFamilies(s)[0];
 if(free>0&&s.energy>0)return {type:'produce',id:family};
 if(free===0){const i=b.findIndex((x,i)=>x?.type==='item'&&!keep(i));if(i>=0)return {type:'recycle',index:i};}
 return null;// wait for energy
}
