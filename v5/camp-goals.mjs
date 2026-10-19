import {WORKSHOP_COST} from './workshop.mjs';
import {PIER_COST} from './camp.mjs';
import {LOFT_COST,DEEP_SURVEY_COST,TIDE_NAMES} from './treasures.mjs';
// One continuing goal, derived from existing save state. No additional progression flags.
export function campGoal(s){
 const supplies=s.requests?.supplies??0;
 const build=(name,cost,action,next,image)=>({kind:'camp',name,cost,supplies,needs:[],action:supplies>=cost?action:'orders',verb:supplies>=cost?'Build · '+cost+' ◆':'Earn supplies',ready:supplies>=cost,next,image,phase:'CAMP DEVELOPMENT',scene:'The expedition continues'});
 const discover=tier=>({kind:'camp',name:'Discover a '+TIDE_NAMES[tier],needs:[{family:'chart',line:'tide',tier,count:1}],action:'treasure',verb:'Find & merge',next:tier===2?'Pearl discovery unlocks Deep Survey':tier===3?'Merge two Sextants into an Ocean Crown':'A rare treasure for expedition orders',phase:'TIDE TREASURES',scene:'Treasures of the Saltglass Reach'});
 if(!s.workshop?.repaired)return {...build('Restore Coastal Workshop',WORKSHOP_COST,'restoreWorkshop','Unlock the Rover Tool Press','workshop-damaged'),verb:supplies>=WORKSHOP_COST?'Restore · 8 ◆':'Earn supplies'};
 if(!s.camp?.pier)return build('Build Supply Pier',PIER_COST,'buildPier','Open the way to the Charting Loft','charting-loft');
 if(!s.camp.loft)return build('Establish Charting Loft',LOFT_COST,'buildLoft','Survey Kite recovers mergeable treasures','charting-loft');
 if(!s.discovered.includes('chart:tide:2'))return discover(2);
 if(!s.camp.deepSurvey)return build('Upgrade Deep Survey',DEEP_SURVEY_COST,'upgradeLoft','Guaranteed compasses · two rare treasures','tide-3');
 if(!s.discovered.includes('chart:tide:3'))return discover(3);
 if(!s.discovered.includes('chart:tide:4'))return discover(4);
 return null;
}
