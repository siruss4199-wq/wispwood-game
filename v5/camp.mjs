// Camp progress from real order rewards; no new currency or producer.
export const PIER_COST=12,PACK_COST=8;
export const PACKS={rig:'salvage',chart:'survey',flux:'relic'};
export function campState(s){
 const old=s.camp??{};
 s.camp={version:1,pier:old.pier===true,loft:old.pier===true&&old.loft===true,dives:Number.isSafeInteger(old.dives)&&old.dives>=0?old.dives:0,tideOrders:Number.isSafeInteger(old.tideOrders)&&old.tideOrders>=0?old.tideOrders:0,packs:Number.isSafeInteger(old.packs)&&old.packs>=0?old.packs:0};
 return s.camp;
}
export function buildPier(s,container){
 if(!s.workshop?.repaired)return {ok:false,message:'Restore the Workshop before building a supply pier.'};
 if(s.camp?.pier)return {ok:false,message:'Supply Pier already built.'};
 if(s.requests.supplies<PIER_COST)return {ok:false,message:`Supply Pier needs ${PIER_COST} supplies.`};
 if(s.board.filter(x=>x?.type==='crate').length>=3)return {ok:false,message:'Open a supply case before building the Pier.'};
 const i=s.board.indexOf(null);
 if(i<0)return {ok:false,message:'Merge two items to make room for the first supply case.'};
 s.requests.supplies-=PIER_COST;s.camp.pier=true;s.camp.packs=1;
 s.board[i]=container('salvage');
 return {ok:true,index:i,message:'Supply Pier built! First tool case delivered. Choose an order to restock useful materials.'};
}
export function packPier(s,family,container,sourceUnlocked){
 if(!s.camp?.pier)return {ok:false,message:'Build the Supply Pier first.'};
 if(!PACKS[family]||!sourceUnlocked(s,family))return {ok:false,message:'This producer is not unlocked yet.'};
 if(s.requests.supplies<PACK_COST)return {ok:false,message:`Need ${PACK_COST} camp supplies for a packed case.`};
 const i=s.board.indexOf(null);
 if(i<0)return {ok:false,message:'Merge or deliver an item to make space before buying a case.'};
 if(s.board.filter(x=>x?.type==='crate').length>=3)return {ok:false,message:'Open an existing supply case before ordering another.'};
 s.requests.supplies-=PACK_COST;s.camp.packs++;
 s.board[i]=container(PACKS[family]);
 return {ok:true,index:i,message:`New ${PACKS[family]} case delivered. Tap it on the board to reveal useful parts.`};
}
