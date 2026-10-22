import {ENGINE_NEEDS} from './journey.mjs';
// Repeatable optional orders. No timers, board rewards or random rolls.
const families=['rig','chart','flux'];
const matches=(x,r)=>x?.type==='item'&&x.family===r.family&&x.tier===r.tier&&(x.line??'')===(r.line??'');
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
 q.orders=q.orders.map((o,i)=>o&&o.id===`${i}:${q.sequences[i]}`&&Array.isArray(o.needs)&&o.needs.length>0&&o.needs.length<=2&&o.needs.every(r=>available.includes(r.family)&&Number.isInteger(r.tier)&&r.tier>=0&&r.tier<=(r.line==='tide'?(s.camp?.deepSurvey?4:2):3)&&(r.line===undefined||s.camp?.loft&&r.line==='tide'&&r.family==='chart'&&r.tier<=(s.camp?.deepSurvey?4:2))&&[1,2].includes(r.count))&&Number.isInteger(o.energy)&&o.energy>0&&o.energy<=24&&Number.isInteger(o.supplies)&&o.supplies>0&&o.supplies<=8?o:null);
 return q;
}
export function syncRequests(s){
 const q=requestState(s),fs=requestFamilies(s);
 const unlocked=s.stage>0||s.landingStep>=1||q.completed>=2?3:s.merges>0?2:1;
 for(let lane=0;lane<unlocked;lane++)if(!q.orders[lane]){
  const n=q.sequences[lane],preferred=fs[(n+lane)%fs.length];
  // Select a different achievable *item*, not the same tool in another quantity.
  // Keep existing orders untouched: a player's partially prepared request never changes.
  const live=q.orders.filter(Boolean);
  const occupied=new Set(live.flatMap(o=>o.needs.map(r=>r.family+':'+(r.line??'ordinary')+':'+r.tier)));
  const usedFamilies=new Set(live.flatMap(o=>o.needs.filter(r=>!r.line).map(r=>r.family)));
  const protectedIndices=reservedItems(s);
  const tierBase=lane===0?n%2:lane===1?1+n%2:2+(s.stage>=2?n%2:0);
  const maxTier=s.stage===0&&!s.landingStep?1:s.stage===0?2:3;
  const tiers=(lane===0?[tierBase,1-tierBase]:lane===1?[tierBase,3-tierBase,1,0]:[tierBase,2,3,1,0])
   .filter((t,i,a)=>t<=maxTier&&a.indexOf(t)===i);
  const familyOrder=[preferred,...fs.filter(f=>f!==preferred)];
  const choices=familyOrder.flatMap((family,fi)=>tiers.map((tier,ti)=>{
   const key=family+':ordinary:'+tier;
   const matchingSpare=s.board.filter((x,i)=>!protectedIndices.has(i)&&matches(x,req(family,tier))).length;
   const pairBelow=tier>0?s.board.filter((x,i)=>!protectedIndices.has(i)&&matches(x,req(family,tier-1))).length:0;
   const protectedOnly=!matchingSpare&&s.board.some((x,i)=>matches(x,req(family,tier))&&protectedIndices.has(i));
   // Fast orders favour a real spare or nearly finished pair; longer orders
   // distribute demand across producers. Never consume protected equipment.
   // This affects only newly generated orders, never an existing pending order.
   // A bought Precision Bench must have a useful destination, without
   // turning Standard into an endless spanner-only lane. Every second new
   // Standard offer favors its fitting output; intervening offers rotate.
   // The first relevant order comes promptly after purchase, before the first fitting.
   const bench=s.workshop?.precision&&lane===1&&family==='rig'&&tier===2&&((s.workshop.fittings??0)===0||n%2===0);
   const effortCredit=(matchingSpare?(lane===0?6:5):0)+(pairBelow>=2?3:0);
   return {family,tier,score:(occupied.has(key)?100:0)+(protectedOnly?30:0)+(usedFamilies.has(family)?8:0)+fi*15+ti*9-(bench?85:0)-effortCredit};
  }));
  // Before Survey Kite unlocks, early Quick orders can ask for more raw copper
  // instead of consuming the two Grip tools reserved for the landing.
  if(lane===0&&s.stage===0&&!s.landingStep)choices.splice(0,choices.length,{family:'rig',tier:0,score:0});
  choices.sort((a,b)=>a.score-b.score);
  const {family,tier}=choices[0];
  const count=lane===0&&s.stage===0&&!s.landingStep&&n%2?2:lane===1&&tier===1?2:1;
  const needs=[req(family,tier,count)];
  if(lane===2){
   // The small companion stays inexpensive and, when possible, differs
   // from the main goal and all other current requests.
   const secondary=[fs[(n+lane+1)%fs.length],...fs].filter((f,i,a)=>a.indexOf(f)===i);
   const options=secondary.flatMap((f,fi)=>[0,1].map((t,ti)=>({
    family:f,tier:t,score:(f===family&&t===tier?1000:0)+(occupied.has(f+':ordinary:'+t)?100:0)+(f===family?20:0)+fi*6+ti*8
   })));
   options.sort((a,b)=>a.score-b.score);
   needs.push(req(options[0].family,options[0].tier));
  }
  if(s.camp?.loft&&fs.includes('chart')&&lane>0&&(s.camp.tideOrders===0||n%2===0)){
   // Never demand a Sextant or Crown before its first actual discovery:
   // the player should enjoy the milestone before a repeat order asks for it.
   // High-tier repeat orders remain occasional after discovery.
   const seen=s.discovered??[];
   const tier=lane===1?(s.camp.deepSurvey&&n%4===0?2:1):
    !s.camp.deepSurvey||!seen.includes('chart:tide:3')?2:
    seen.includes('chart:tide:4')&&n%8===0?4:n%2===0?3:2;
   needs.splice(0,needs.length,{family:'chart',line:'tide',tier,count:1});
   if(lane===2&&tier===2)needs.push(req('rig',1));
   s.camp.tideOrders++;
  }
  q.orders[lane]={id:`${lane}:${n}`,lane:LANES[lane],needs,energy:needs[0].line==='tide'&&needs[0].tier===4?24:[5,10,18][lane],supplies:needs[0].line==='tide'&&needs[0].tier===4?8:[1,3,6][lane]};
 }
 return q.orders.filter(Boolean);
}
// Reserve exact copies, not the entire family. Extra copies remain deliverable.
export function reservedItems(s){
 const needs=[];
 if(s.stage===0&&!s.landingStep)needs.push(req('rig',1,2));
 if(s.stage<=1)needs.push(req('rig',2),req('chart',2));
 if(s.stage===2){
  if(!s.seals?.optics?.primed)needs.push(req('flux',1));
  for(const x of s.board)if(x?.type==='site'&&x.phase==='idle')needs.push(req({winch:'rig',scope:'chart',relay:'flux'}[x.kind],3));
  if(s.board.some(x=>x?.type==='rock'))needs.push(req('rig',2));
  if(s.board.some(x=>x?.type==='rock'&&x.find))needs.push(req('flux',2));
 }
 if(s.stage===3&&!s.journey?.kit)needs.push(req('rig',2),req('chart',1));
 if(s.stage===4&&!s.journey?.engine)needs.push(...ENGINE_NEEDS);
 const kept=new Set();
 // A manufactured spare (e.g. a fitted Split spanner) is made to be delivered,
 // never the one expedition copy being protected here; never reserve one.
 for(const r of needs)for(let n=[...kept].filter(i=>matches(s.board[i],r)).length;n<r.count;n++){
  const i=s.board.findIndex((x,i)=>!kept.has(i)&&matches(x,r)&&!x.spare);if(i>=0)kept.add(i);
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
