// A short Wayfinding branch; ordinary navigation parts remain unchanged.
export const LOFT_COST=20,DEEP_SURVEY_COST=18;
export const TIDE_NAMES=['Tide dial fragment','Reef compass','Pearl astrolabe','Celestial sextant','Ocean crown'];
export const isTide=x=>x?.line==='tide';
export const maxTier=(x,s)=>isTide(x)?(s&&!s.camp?.deepSurvey?2:4):7;
export const sameKind=(a,b)=>!!a&&!!b&&a.type==='item'&&b.type==='item'&&a.family===b.family&&a.tier===b.tier&&(a.line??'')===(b.line??'');
export const discoveryKey=x=>x.family+':'+(isTide(x)?'tide:':'')+x.tier;
export const tideItem=tier=>({type:'item',family:'chart',line:'tide',tier});
export const nextTide=s=>tideItem(s.camp?.deepSurvey?1:((s.camp?.dives??0)+1)%4===0?1:0);
export const recoveryCost=s=>s.camp?.deepSurvey?3:2;
export const pearlDiscovered=s=>s.discovered.includes('chart:tide:2');
export function upgradeLoft(s){
 if(!s.camp?.loft)return {ok:false,message:'Build the Charting Loft first.'};
 if(s.camp.deepSurvey)return {ok:false,message:'Deep Survey is already installed.'};
 if(s.stage<4)return {ok:false,message:'The Pearl’s lost passage runs through the Tideglass Vault. Open the Vault before launching Deep Survey.'};
 if(!pearlDiscovered(s))return {ok:false,message:'Merge treasures into your first Pearl Astrolabe.'};
 if(s.requests.supplies<DEEP_SURVEY_COST)return {ok:false,message:`Deep Survey needs ${DEEP_SURVEY_COST} camp supplies.`};
 s.requests.supplies-=DEEP_SURVEY_COST;s.camp.deepSurvey=true;
 return {ok:true,message:'Deep Survey installed · guaranteed Reef Compass recovery · two new treasures await.'};
}
export function buildLoft(s){
 if(!s.camp?.pier)return {ok:false,message:'Build the Supply Pier first.'};
 if(s.camp.loft)return {ok:false,message:'Charting Loft already built.'};
 if(s.requests.supplies<LOFT_COST)return {ok:false,message:`Charting Loft needs ${LOFT_COST} camp supplies.`};
 s.requests.supplies-=LOFT_COST;s.camp.loft=true;
 return {ok:true,message:'Charting Loft built · Survey Kite can now recover tide treasures.'};
}
export function recoverTide(s){
 if(!s.camp?.loft)return {ok:false,message:'Build the Charting Loft on your Supply Pier first.'};
 if(s.stage===0&&!s.landingStep)return {ok:false,message:'Clear the landing to unlock Survey Kite.'};
 const cost=recoveryCost(s);if(s.energy<cost)return {ok:false,message:`Recovery needs ${cost} energy.`};
 const index=s.board.indexOf(null);if(index<0)return {ok:false,message:'Merge or deliver an item to make room for your find.'};
 s.board[index]=nextTide(s);s.camp.dives++;if(s.camp.deepSurvey)s.camp.deepDives++;s.energy-=cost;
 return {ok:true,index,message:TIDE_NAMES[s.board[index].tier]+' recovered · merge twins or fulfill a tide order.'};
}
