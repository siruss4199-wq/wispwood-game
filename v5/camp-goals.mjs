import {WORKSHOP_COST,BENCH_COST} from './workshop.mjs';
import {PIER_COST} from './camp.mjs';
import {LOFT_COST,DEEP_SURVEY_COST,TIDE_NAMES} from './treasures.mjs';
import {requestProgress} from './requests.mjs';

// Keep the primary goal derived from existing saves; no new progression flags.
// Recommend an attainable order already on the board instead of sending players
// to an unrelated task when a camp upgrade needs more supplies.
export function recommendedOrder(s){
 const orders=(s.requests?.orders??[]).filter(Boolean);
 const choices=orders.map(order=>{
  const progress=requestProgress(s,order);
  const effort=progress.progress.reduce((total,r)=>total+Math.max(0,r.count-r.current)*Math.pow(2,Math.min(r.tier,4)),0);
  // Delivery attention has a cost too. Prefer a useful restoration commission
  // over an endless stream of one-supply raw-part errands.
  return {order,ready:progress.ready,effort,workPerSupply:(effort+4)/order.supplies};
 });
 choices.sort((a,b)=>a.workPerSupply-b.workPerSupply||Number(b.ready)-Number(a.ready)||b.order.supplies-a.order.supplies);
 return choices[0]?.order??null;
}
const laneName=lane=>lane==='long'?'Expedition kit':lane==='standard'?'Standard':'Quick';

export function campGoal(s){
 const supplies=s.requests?.supplies??0;
 const order=recommendedOrder(s);
 const orderReady=order?requestProgress(s,order).ready:false;
 const orderVerb=orderReady?'Collect +'+order.supplies+' ◆':'View '+laneName(order?.lane)+' order';
 const build=(name,cost,action,unlock,image)=>{
  const affordable=supplies>=cost,missing=Math.max(0,cost-supplies);
  return {kind:'camp',name,cost,supplies,needs:[],action:affordable?action:'orders',
   orderId:affordable?null:order?.id??null,
   verb:affordable?'Build · '+cost+' ◆':orderVerb,ready:affordable,
   next:affordable?'Unlock: '+unlock:'Earn '+missing+' more ◆ from orders'+(order?' · '+laneName(order.lane)+' pays +'+order.supplies+' ◆':'')+'. Unlock: '+unlock,
   image,phase:'CAMP DEVELOPMENT',scene:'The expedition continues'};
 };
 const discover=tier=>({kind:'camp',name:'Discover a '+TIDE_NAMES[tier],
  needs:[{family:'chart',line:'tide',tier,count:1}],action:'treasure',verb:'Recover & merge',
  next:tier===2?'Use Survey Kite treasure recovery. A Pearl Astrolabe unlocks Deep Survey.':tier===3?'Recover and merge Pearl Astrolabes into a Sextant.': 'Merge two Celestial Sextants into an Ocean Crown.',
  phase:'TIDE TREASURES',scene:'Treasures of the Saltglass Reach'});
 if(!s.workshop?.repaired)return {...build('Restore Coastal Workshop',WORKSHOP_COST,'restoreWorkshop','Rivet Rover Tool Press','workshop-damaged'),verb:supplies>=WORKSHOP_COST?'Restore · 8 ◆':orderVerb};
 if(!s.camp?.pier)return build('Build Supply Pier',PIER_COST,'buildPier','targeted supply cases and Charting Loft','charting-loft');
 if(!s.camp.loft)return build('Establish Charting Loft',LOFT_COST,'buildLoft','Survey Kite treasure recovery','charting-loft');
 if(!s.discovered.includes('chart:tide:2'))return discover(2);
 if(!s.camp.deepSurvey)return build('Upgrade Deep Survey',DEEP_SURVEY_COST,'upgradeLoft','guaranteed Reef Compasses and rare treasures','tide-3');
 if(!s.discovered.includes('chart:tide:3'))return discover(3);
 if(!s.discovered.includes('chart:tide:4'))return discover(4);
 // Existing Precision Bench must not disappear behind optional high-tier
 // post-vault goals once the five treasures are discovered.
 if(!s.workshop.precision)return build('Install Precision Bench',BENCH_COST,'upgradeWorkshop','fit Split Spanners from spare Grip Tools and Ink Scraps','workshop-operational');
 // No invented endless buildings or fake unlocks: keep genuine, repeatable
 // requests and Pier support cases as the ongoing play loop.
 return {kind:'camp',name:order?'Deliver '+laneName(order.lane)+' order':'Continue camp orders',
  needs:order?.needs??[],action:'orders',orderId:order?.id??null,
  verb:orderVerb,ready:orderReady,phase:'CAMP ORDERS',scene:'The working coastal camp',
  next:'Complete orders for supplies; the Supply Pier converts supplies into useful cases. Optional vault discoveries remain available.'};
}
