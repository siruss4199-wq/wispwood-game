// A short Wayfinding branch; ordinary navigation parts remain unchanged.
export const LOFT_COST=20;
export const TIDE_NAMES=['Tide dial fragment','Reef compass','Pearl astrolabe'];
export const isTide=x=>x?.line==='tide';
export const maxTier=x=>isTide(x)?2:7;
export const sameKind=(a,b)=>!!a&&!!b&&a.type==='item'&&b.type==='item'&&a.family===b.family&&a.tier===b.tier&&(a.line??'')===(b.line??'');
export const discoveryKey=x=>x.family+':'+(isTide(x)?'tide:':'')+x.tier;
export const tideItem=tier=>({type:'item',family:'chart',line:'tide',tier});
export const nextTide=s=>tideItem(((s.camp?.dives??0)+1)%4===0?1:0);
export function buildLoft(s){
 if(!s.camp?.pier)return {ok:false,message:'Build the Supply Pier first.'};
 if(s.camp.loft)return {ok:false,message:'Charting Loft already built.'};
 if(s.requests.supplies<LOFT_COST)return {ok:false,message:`Charting Loft needs ${LOFT_COST} camp supplies.`};
 s.requests.supplies-=LOFT_COST;s.camp.loft=true;
 return {ok:true,message:'Charting Loft built · Survey Kite can now recover tide treasures.'};
}
export function recoverTide(s){
 if(!s.camp?.loft)return {ok:false,message:'Build the Charting Loft on your Supply Pier first.'};
 if(s.energy<2||!s.charges.chart)return {ok:false,message:'Recovery needs 2 energy and 1 Survey Kite charge.'};
 const index=s.board.indexOf(null);if(index<0)return {ok:false,message:'Merge or deliver an item to make room for your find.'};
 s.board[index]=nextTide(s);s.camp.dives++;s.energy-=2;s.charges.chart--;
 return {ok:true,index,message:TIDE_NAMES[s.board[index].tier]+' recovered · merge twins or fulfill a tide order.'};
}
