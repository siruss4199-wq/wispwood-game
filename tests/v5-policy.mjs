// Intent-based player styles. All actions use the public reducer / real UI.
import {KITS} from '../v5/journey.mjs';
import {masteryPending} from '../v5/mastery.mjs';
import {sameKind} from '../v5/treasures.mjs';
import {expeditionGoal as goal,ready,count,normalContract,SOURCES,sourceUnlocked} from '../v5/core.mjs';
import {ANCHORS,ROUTES,equipment,anchors} from '../v5/expedition.mjs';
import {circuit,linkPhase,optics} from '../v5/seals.mjs';
const req=(family,tier,count=1)=>({family,tier,count});
export function choose(s,{sideFirst=true,openCaches=false,clearSalvage=false,session=null,style='expedition',findStrategy=null,decode=true,route=null,mergeSight=false,receiver=null,vaultKit='field'}={}){
 if(!goal(s))return null;
 // Scripted policy must actually craft all three instruments. No milestone seeding.
 if(s.stage===3&&masteryPending(s).length){
  const family=masteryPending(s)[0],free=s.board.filter(x=>x===null).length;
  for(const tier of [3,2,1,0]){
   const pair=s.board.flatMap((x,i)=>x?.type==='item'&&!x.line&&x.family===family&&x.tier===tier?[i]:[]);
   if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};
  }
  if(!free){
   for(const f of ['rig','chart','flux'])for(let tier=0;tier<=5;tier++){
    const pair=s.board.flatMap((x,i)=>x?.type==='item'&&!x.line&&x.family===f&&x.tier===tier?[i]:[]);
    if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};
   }
   const index=s.board.findIndex(x=>x?.type==='item'&&!x.line&&x.family!==family&&x.tier<=1);
   if(index>=0)return {type:'recycle',index};
   throw Error('Full board, no legal moves during craft mastery');
  }
  if(s.energy<=3)return {type:'ration'};
  return {type:s.charges[family]?'produce':'service',id:family};
 }
 const spaces=s.board.filter(x=>x===null).length;
 // An impulsive merger compacts ALL families, even when a pair could be installed
 // or traded separately. Do not fake this style by targeting one extra story tier.
 if(style==='aggressive'&&s.stage>0&&s.stage<4&&!linkPhase(s)&&!(s.stage===3&&ready(s,goal(s).needs))){
  for(let tier=6;tier>=0;tier--)for(const family of Object.keys(SOURCES)){
   const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===family&&x.tier===tier?[i]:[]);
   for(let a=0;a<pair.length;a++)for(let b=a+1;b<pair.length;b++)if(sameKind(s.board[pair[a]],s.board[pair[b]]))return {type:'merge',from:pair[a],to:pair[b]};
  }
 }
 let needs,command;
 if(s.stage===4){needs=goal(s).needs;if(s.journey?.engine&&!s.journey.infusions)command={type:'infuse',id:'chart'};else command={type:goal(s).action??'goal'};}
 else if(sideFirst&&s.contracts===0&&(s.stage>0||s.landingStep>=1)){needs=normalContract(s).needs;command={type:'contract'};}
 else if(s.stage===0){needs=goal(s).needs;command={type:'goal'};}
 else if(s.stage===1){
  const id=route??(['contract','aggressive'].includes(style)?'conduit':'ridge');
  needs=[req(ROUTES[id].family,2)];command={type:'breach',index:s.board.findIndex(x=>x?.type==='route'&&x.id===id)};
 }else{
  const finds=s.board.flatMap((x,i)=>x?.type==='rock'&&x.find&&anchors(s).some(v=>v.kind===x.find&&v.phase==='idle')?[i]:[]);
  if(s.stage===2&&findStrategy&&finds.length){
   const prior=s.expedition.log.filter(x=>x.type==='find-choice').length;
   const restore=findStrategy==='restore'||findStrategy==='mixed'&&prior>0;
   needs=[req(restore?'flux':'rig',2)];command={type:restore?'restore':'clear',index:finds[0]};
  }
  // Decoding is an intent: obtain a lens, not just click if one happens to survive.
  const glyph=s.board.findIndex(x=>x?.type==='glyph');
  if(command){/* Resolve the selected excavation before switching intent. */}
  else if(decode&&glyph>=0&&!s.discoveryDone){
   needs=[req('chart',2)];command={type:'discovery'};
  }else if(style==='contract'&&s.expedition.trades<2&&!(s.expedition.trades===1&&!anchors(s).some(x=>x.kind==='scope'&&x.phase!=='idle'))){
   needs=normalContract(s).needs;command={type:'contract'};
  }else if(session&&!session.signal&&anchors(s).some(x=>x.phase==='done')){session.signal=true;return {type:'startOpportunity'};}
  else if(s.opportunity){needs=s.opportunity.needs;command={type:'opportunity'};}
  else if((clearSalvage||style==='exploration')&&!s.expedition.log.some(x=>x.type==='brace-clear')&&s.board.some(x=>x?.type==='rock')){
   needs=[req('rig',2)];command={type:'clear',index:s.board.findIndex(x=>x?.type==='rock')};
  }else if(s.stage===2&&style==='contract'&&normalContract(s).vaultTrade){needs=normalContract(s).needs;command={type:'contract'};}
  else if(s.stage===3){needs=s.journey?.kit?goal(s).needs:KITS[vaultKit].needs;command={type:'goal',...(s.journey?.kit?{}:{kit:vaultKit})};}
  else{
   const chosen=anchors(s).find(x=>x.kind===(receiver??(['expedition','contract'].includes(style)?'relay':'scope'))&&x.phase==='done');const connected=receiver&&!chosen?null:circuit(s,chosen?s.board.indexOf(chosen):undefined);
   if(connected&&spaces)return {type:'power',index:connected.at(-1)};
   if(linkPhase(s)&&anchors(s).some(x=>x.kind!=='winch'&&(!receiver||x.kind===receiver)&&x.phase==='done')){
    if(!optics(s).primed){needs=[req('flux',1)];command={type:'prime'};}
    else {const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.tier<7?[i]:[]);for(const i of pair)for(const j of pair)if(i<j&&sameKind(s.board[i],s.board[j]))return {type:'merge',from:i,to:j};return {type:'recycle',index:pair[0]};}
   }else{
   const order=['winch',receiver??(['expedition','contract'].includes(style)?'relay':'scope')];
   const site=order.map(kind=>anchors(s).find(x=>x.kind===kind)).find(x=>x.phase!=='done');
   const index=s.board.indexOf(site);
   needs=[equipment(site.kind)];command={type:'deploy',index};
   }
  }
 }
 if(command&&command.type!=='power'&&ready(s,needs))return command;
 if(openCaches&&spaces>8){const box=s.board.findIndex(x=>x?.type==='crate');if(box>=0)return {type:'crate',index:box};}
 const r=needs.find(r=>count(s,r)<r.count);
 if(!r)throw Error('Intent did not progress: '+JSON.stringify({style,needs,command}));
 for(let tier=r.tier-1;tier>=0;tier--){const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===r.family&&x.tier===tier&&(x.line??'')===(r.line??'')?[i]:[]);if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};}
 if(!spaces){
  for(const family of Object.keys(SOURCES))for(let tier=0;tier<3;tier++){const p=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===family&&x.tier===tier?[i]:[]);
  for(let a=0;a<p.length;a++)for(let b=a+1;b<p.length;b++)if(sameKind(s.board[p[a]],s.board[p[b]]))return {type:'merge',from:p[a],to:p[b]};}
  const i=s.board.findIndex(x=>x?.type==='item'&&x.tier<3&&x.family!==r.family);if(i>=0)return {type:'recycle',index:i};
 }
 if(s.energy<=3)return {type:'ration'};
 if(!sourceUnlocked(s,r.family))throw Error('Policy targets locked source');
 return s.charges[r.family]?{type:'produce',id:r.family}:{type:'service',id:r.family};
}
