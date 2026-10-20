import {campGoal,recommendedOrder} from './camp-goals.mjs';
import {requestProgress} from './requests.mjs';

// A presentation of the existing journey, not another quest/save system.
// Ready expedition actions always win; optional orders never hide a breakthrough.
export function coastalObjective(s,expedition){
 if(s.stage===0&&s.landingStep===1){
  const ready=expedition.needs.every(r=>s.board.filter(x=>x?.type==='item'&&!x.line&&x.family===r.family&&x.tier===r.tier).length>=r.count);
  if(ready)return expedition;
  if(!s.discovered.includes('chart:tide:1')){
   const fragments=s.board.filter(x=>x?.line==='tide'&&x.tier===0).length;
   const order=recommendedOrder(s),collect=order&&requestProgress(s,order).ready;
   if(fragments>=2)return {kind:'camp',name:'Reassemble Neri’s compass',phase:'THE FIRST CLUE',scene:'A clue in the tide',needs:[{family:'chart',line:'tide',tier:0,count:2}],action:'treasure',verb:'Merge fragments',next:'Its needle points to the missing fleet’s coast.'};
   // Never imply another free fragment after both earned rewards were collected.
   if((s.camp.earlyFragments??0)<2)return {kind:'camp',name:'Find the missing compass pieces',phase:'HELP THE EXPEDITION',scene:'Neri searches the shore',needs:order?.needs??[],action:'orders',orderId:order?.id,ready:!!collect,verb:collect?'Deliver & discover':'Make this order',next:'Each of your first two deliveries earns a Tide Dial Fragment.'};
  }
  if(!s.workshop.repaired)return {...campGoal(s),phase:'MAKE A WORKING CAMP',next:'Ivo’s tool press makes repair parts. Restore it, then follow the compass across the coast.'};
 }
 if(s.stage===4&&s.camp.loft&&!s.camp.deepSurvey&&s.discovered.includes('chart:tide:2')&&!s.journey.engine)return expedition;
 return s.stage===4?campGoal(s):expedition;
}

export function orderPurpose(s){
 if((s.camp.earlyFragments??0)<2)return 'A delivery uncovers a compass piece';
 const next=campGoal(s);
 if(next.cost)return `${next.name} · ${Math.min(next.supplies,next.cost)}/${next.cost} ◆`;
 return 'Keep the expedition supplied';
}
