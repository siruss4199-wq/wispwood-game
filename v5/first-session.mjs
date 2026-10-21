import {recommendedOrder} from './camp-goals.mjs';
// Present one honest, earned first-session direction without a second quest state.
export function firstSessionCue(s){
 if(s.stage>1)return null;
 if(s.stage===0&&!s.landingStep)return s.merges===0?
  {hint:'MERGE THE GLOWING COPPER PAIR',why:'Merge two Copper Offcuts to make the Grip Tool that clears the landing.',pairs:[]}:
  {hint:'LANDING READY · TAP CLEAR PATH ABOVE',why:'Use your Grip Tool to clear the landing and unlock Survey Kite.',pairs:[]};
 if(s.stage===0&&s.landingStep===1){
  const made=s.discovered?.includes('chart:tide:1');
  const fragments=s.board.flatMap((x,i)=>x?.type==='item'&&x.family==='chart'&&x.line==='tide'&&x.tier===0?[i]:[]);
  if(!made&&fragments.length>=2)return {hint:'MERGE THE TWO GLOWING TIDE FRAGMENTS',why:'Neri can trace the shoreline erased from every chart.',pairs:fragments.slice(0,2)};
  if(!made&&(s.camp?.earlyFragments??0)===1)return {hint:'ONE MORE ORDER EARNS A MATCHING FRAGMENT',why:'Earn a real matching Tide Dial Fragment from your next delivery.',pairs:[],requestId:recommendedOrder(s)?.id??null};
  if(!made&&(s.camp?.earlyFragments??0)===0)return {hint:'DELIVER THE HIGHLIGHTED ORDER FOR A TIDE FRAGMENT',why:'Earn restoration supplies and discover the first missing-coast clue.',pairs:[],requestId:recommendedOrder(s)?.id??null};
  if(made)return {hint:'MAKE A SIGHT LENS AND A SPLIT SPANNER',why:'Prepare both crossing routes and choose where to explore.',pairs:[]};
  return null;
 }
 if(s.stage===1)return {hint:'CHOOSE ONE CROSSING ABOVE',why:'Ridge opens space; Conduit brings relic supplies. You keep the other tool.',pairs:[]};
 return null;
}
