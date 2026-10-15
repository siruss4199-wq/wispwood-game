// Repeatable optional orders. No timers, board rewards or random rolls.
const families=['rig','chart','flux'];
const matches=(x,r)=>x?.type==='item'&&x.family===r.family&&x.tier===r.tier;
const req=(family,tier,count=1)=>({family,tier,count});
export const LANES=['quick','standard','long'];
export const requestFamilies=s=>families.slice(0,s.stage>=2?3:s.stage>0||s.landingStep>=1?2:1);
export function requestState(s){
 const old=s.requests;
 if(!old||old.version!==1)s.requests={version:1,sequences:[0,0,0],orders:[null,null,null],completed:0,supplies:0};
 const q=s.requests;
 for(const key of ['completed','supplies'])if(!Number.isSafeInteger(q[key])||q[key]<0)q[key]=0;
 if(!Array.isArray(q.sequences)||q.sequences.length!==3)q.sequences=[0,0,0];
 if(!Array.isArray(q.orders)||q.orders.length!==3)q.orders=[null,null,null];
 const available=requestFamilies(s);
 q.sequences=q.sequences.map(n=>Number.isSafeInteger(n)&&n>=0?n:0);
 q.orders=q.orders.map((o,i)=>o&&o.id===`${i}:${q.sequences[i]}`&&Array.isArray(o.needs)&&o.needs.length>0&&o.needs.length<=2&&o.needs.every(r=>available.includes(r.family)&&Number.isInteger(r.tier)&&r.tier>=0&&r.tier<=3&&[1,2].includes(r.count))&&Number.isInteger(o.energy)&&o.energy>0&&o.energy<=24&&Number.isInteger(o.supplies)&&o.supplies>0&&o.supplies<=8?o:null);
 return q;
}
export function syncRequests(s){
 const q=requestState(s),fs=requestFamilies(s);
 const unlocked=s.stage>0||s.landingStep>=1||q.completed>=2?3:s.merges>0?2:1;
 for(let lane=0;lane<unlocked;lane++)if(!q.orders[lane]){
  const n=q.sequences[lane],family=fs[(Math.floor(n/2)+lane)%fs.length];
  const tier=lane===0?n%2:lane===1?1+n%2:2+n%2;
  const needs=[req(family,tier)];
  if(lane===0&&q.orders.some(o=>o?.needs.length===1&&o.needs[0].family===family&&o.needs[0].tier===tier&&o.needs[0].count===1))needs[0].count=2;
  if(lane===2)needs.push(req(fs[(n+lane+1)%fs.length],fs.length===1?1:0));
  q.orders[lane]={id:`${lane}:${n}`,lane:LANES[lane],needs,energy:[5,10,18][lane],supplies:[1,3,6][lane]};
 }
 return q.orders.filter(Boolean);
}
// Reserve exact copies, not the entire family. Extra copies remain deliverable.
export function reservedItems(s){
 const needs=[];
 if(s.stage===0&&!s.landingStep)needs.push(req('rig',1,2));
 if(s.stage<=1)needs.push(req('rig',2),req('chart',2));
 if(s.stage===2){
  needs.push(req('chart',2));
  if(!s.seals?.optics?.primed)needs.push(req('flux',1));
  for(const x of s.board)if(x?.type==='site'&&x.phase==='idle')needs.push(req({winch:'rig',scope:'chart',relay:'flux'}[x.kind],3));
  if(s.board.some(x=>x?.type==='rock'))needs.push(req('rig',2));
  if(s.board.some(x=>x?.type==='rock'&&x.find))needs.push(req('flux',2));
 }
 const kept=new Set();
 for(const r of needs)for(let n=0;n<r.count;n++){
  const i=s.board.findIndex((x,i)=>!kept.has(i)&&matches(x,r));if(i>=0)kept.add(i);
 }
 return kept;
}
export function requestProgress(s,o){
 const kept=reservedItems(s),used=new Set(),indices=[];
 const progress=o.needs.map(r=>{
  const all=s.board.flatMap((x,i)=>matches(x,r)?[i]:[]);
  const usable=all.filter(i=>!kept.has(i)&&!used.has(i));
  const take=usable.slice(0,r.count);take.forEach(i=>{used.add(i);indices.push(i);});
  return {...r,current:take.length,protected:all.some(i=>kept.has(i))};
 });
 return {progress,indices,ready:progress.every(r=>r.current>=r.count)};
}
export function deliverRequest(s,id){
 const q=s.requests,lane=q?.orders.findIndex(o=>o?.id===id);
 if(lane===undefined||lane<0)return {ok:false,message:'That request has already changed.'};
 const o=q.orders[lane],p=requestProgress(s,o);
 if(!p.ready)return {ok:false,message:p.progress.some(r=>r.protected)?'Expedition equipment stays with you. Make a spare for this request.':'Make the highlighted request items.'};
 p.indices.forEach(i=>s.board[i]=null);
 q.supplies+=o.supplies;q.completed++;q.sequences[lane]++;q.orders[lane]=null;
 const energy=Math.min(o.energy,120-s.energy);s.energy+=energy;
 syncRequests(s);
 return {ok:true,reward:{...o,energy},indices:p.indices,message:`+${o.supplies} restoration supplies · +${energy} energy · new ${o.lane} request`};
}
