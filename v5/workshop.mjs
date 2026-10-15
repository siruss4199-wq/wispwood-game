export const WORKSHOP_COST=8;
export function workshopState(s){
 const old=s.workshop;
 s.workshop={version:1,repaired:old?.repaired===true,presses:Number.isSafeInteger(old?.presses)&&old.presses>=0?old.presses:0};
 return s.workshop;
}
export function restoreWorkshop(s){
 if(s.workshop?.repaired)return {ok:false,message:'The Coastal Workshop is already operational.'};
 if((s.requests?.supplies??0)<WORKSHOP_COST)return {ok:false,message:`Coastal Workshop · ${s.requests?.supplies??0}/${WORKSHOP_COST} supplies`};
 s.requests.supplies-=WORKSHOP_COST;
 s.workshop={version:1,repaired:true,presses:0};
 return {ok:true,message:'Coastal Workshop restored · Rivet Rover tool press unlocked'};
}
