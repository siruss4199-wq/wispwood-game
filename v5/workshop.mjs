import {reservedItems} from './requests.mjs';
export const WORKSHOP_COST=8, BENCH_COST=12;
export const BENCH_NEEDS=[{family:'rig',tier:1,count:1},{family:'chart',tier:0,count:1}];
export function benchInputs(s){
 const kept=reservedItems(s);
 return BENCH_NEEDS.map(r=>s.board.findIndex((x,i)=>x?.type==='item'&&!x.line&&x.family===r.family&&x.tier===r.tier&&!kept.has(i)));
}
export function workshopState(s){
 const old=s.workshop;
 s.workshop={version:1,repaired:old?.repaired===true,presses:Number.isSafeInteger(old?.presses)&&old.presses>=0?old.presses:0,precision:old?.repaired===true&&old?.precision===true,fittings:Number.isSafeInteger(old?.fittings)&&old.fittings>=0?old.fittings:0};
 return s.workshop;
}
export function restoreWorkshop(s){
 if(s.workshop?.repaired)return {ok:false,message:'The Coastal Workshop is already operational.'};
 if((s.requests?.supplies??0)<WORKSHOP_COST)return {ok:false,message:`Coastal Workshop · ${s.requests?.supplies??0}/${WORKSHOP_COST} supplies`};
 s.requests.supplies-=WORKSHOP_COST;
 s.workshop={version:1,repaired:true,presses:0,precision:false,fittings:0};
 return {ok:true,message:'Coastal Workshop restored · Rivet Rover tool press unlocked'};
}
export function upgradeWorkshop(s){
 if(!s.workshop?.repaired)return {ok:false,message:'Repair the Workshop first.'};
 if(s.workshop.precision)return {ok:false,message:'Precision Bench already installed.'};
 if(s.requests.supplies<BENCH_COST)return {ok:false,message:`Precision Bench · ${s.requests.supplies}/${BENCH_COST} supplies`};
 s.requests.supplies-=BENCH_COST;s.workshop.precision=true;s.workshop.fittings=0;
 return {ok:true,message:'Precision Bench ready · Grip tool + Ink scrap → Split spanner'};
}
export function fitSpanner(s){
 if(!s.workshop?.precision)return {ok:false,message:'Upgrade the Workshop to fit spanners.'};
 if(!s.board.some(x=>x?.type==='source'&&x.id==='rig')||!s.charges.rig)return {ok:false,message:'Service Rivet Rover first.'};
 if(s.energy<1)return {ok:false,message:'Fitting needs 1 energy.'};
 const indices=benchInputs(s);
 if(indices.some(i=>i<0))return {ok:false,message:'Keep expedition tools. Bring a spare Grip tool and Ink scrap.'};
 // Reuse the input space: the bench works even on a full board.
 s.board[indices[0]]={type:'item',family:'rig',tier:2};s.board[indices[1]]=null;
 s.energy--;s.charges.rig--;s.workshop.fittings=(s.workshop.fittings??0)+1;
 return {ok:true,index:indices[0],message:'Split spanner fitted · 1 energy · one Rover charge'};
}
