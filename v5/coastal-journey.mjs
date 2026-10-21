import {campGoal,recommendedOrder} from './camp-goals.mjs';
import {requestProgress} from './requests.mjs';
import {firstPier} from './first-pier.mjs';

// A presentation of the existing journey, not another quest/save system.
// Ready expedition actions always win; optional orders never hide a breakthrough.
export function coastalObjective(s,expedition){
 if(s.stage===0&&s.landingStep===1){
  const ready=expedition.needs.every(r=>s.board.filter(x=>x?.type==='item'&&!x.line&&x.family===r.family&&x.tier===r.tier).length>=r.count);
  if(ready)return expedition;
  if(!s.discovered.includes('chart:tide:1')){
   const fragments=s.board.filter(x=>x?.line==='tide'&&x.tier===0).length;
   const pier=firstPier(s),lane=pier?.level===0?0:pier?.level===1?1:null;
   const order=(lane===null?null:s.requests.orders[lane])??recommendedOrder(s),collect=order&&requestProgress(s,order).ready;
   if(fragments>=2)return {kind:'camp',name:'Reassemble Neri’s compass',phase:'THE FIRST CLUE',scene:'A clue in the tide',needs:[{family:'chart',line:'tide',tier:0,count:2}],action:'treasure',verb:'Merge fragments',next:'Its needle points to the missing fleet’s coast.'};
   // Never imply another free fragment after both earned rewards were collected.
   if((s.camp.earlyFragments??0)<2)return {kind:'camp',name:'Repair the storm-damaged pier',phase:'IVO · REPAIR '+(pier?.progress??'0/2'),scene:pier?.label??'Storm-damaged pier',needs:order?.needs??[],action:'orders',orderId:order?.id,ready:!!collect,verb:collect?'Deliver & repair':'Prepare Ivo’s delivery',next:(pier?.next??'Deliver crew supplies.')+' Neri recovers one Tide Dial Fragment per delivery.'};
  }
  if(!s.workshop.repaired)return {...campGoal(s),phase:'MAKE A WORKING CAMP',next:'Ivo’s tool press makes repair parts. Restore it, then follow the compass across the coast.'};
 }
 if(s.stage===4&&s.camp.loft&&!s.camp.deepSurvey&&s.discovered.includes('chart:tide:2')&&!s.journey.engine)return expedition;
 return s.stage===4?campGoal(s):expedition;
}

export function orderPurpose(s){
 if(s.stage<4&&s.camp.loft&&s.discovered.includes('chart:tide:2')&&!s.camp.deepSurvey)return 'Follow the Pearl’s route through the Vault';
 if(s.stage===0&&s.landingStep===1&&(s.camp.earlyFragments??0)<2)return 'Ivo’s pier repair · '+(s.camp.earlyFragments??0)+'/2 deliveries';
 if((s.camp.earlyFragments??0)<2)return 'A delivery uncovers a compass piece';
 const next=campGoal(s);
 if(next.cost)return `${next.name} · ${Math.min(next.supplies,next.cost)}/${next.cost} ◆`;
 return 'Keep the expedition supplied';
}
