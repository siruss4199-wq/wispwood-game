// Intent-based player styles. All actions use the public reducer / real UI.
import {goal,ready,count,normalContract,SOURCES,sourceUnlocked} from '../v5/core.mjs';
import {ANCHORS,ROUTES,equipment,anchors} from '../v5/expedition.mjs';
import {circuit,linkPhase,loopCell} from '../v5/seals.mjs';
const req=(family,tier,count=1)=>({family,tier,count});
export function choose(s,{sideFirst=true,openCaches=false,clearSalvage=false,session=null,style='expedition',findStrategy=null}={}){
 if(!goal(s))return null;
 const spaces=s.board.filter(x=>x===null).length;
 // An impulsive merger compacts ALL families, even when a pair could be installed
 // or traded separately. Do not fake this style by targeting one extra story tier.
 if(style==='aggressive'&&s.stage>0&&s.stage<4&&!linkPhase(s)&&!(s.stage===3&&ready(s,goal(s).needs))){
  for(let tier=6;tier>=0;tier--)for(const family of Object.keys(SOURCES)){
   const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===family&&x.tier===tier?[i]:[]);
   if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};
  }
 }
 let needs,command;
 if(s.stage===4){needs=goal(s).needs;command={type:'goal'};}
 else if(sideFirst&&s.contracts===0&&(s.stage>0||s.landingStep>=1)){needs=normalContract(s).needs;command={type:'contract'};}
 else if(s.stage===0){needs=goal(s).needs;command={type:'goal'};}
 else if(s.stage===1){
  const id=['contract','aggressive'].includes(style)?'conduit':'ridge';
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
  else if(glyph>=0&&!s.discoveryDone){
   needs=[req('chart',2)];command={type:'discovery'};
  }else if(style==='contract'&&s.expedition.trades<2&&!(s.expedition.trades===1&&!anchors(s).some(x=>x.kind==='scope'&&x.phase!=='idle'))){
   needs=normalContract(s).needs;command={type:'contract'};
  }else if(session&&!session.signal&&anchors(s).some(x=>x.phase==='done')){session.signal=true;return {type:'startOpportunity'};}
  else if(s.opportunity){needs=s.opportunity.needs;command={type:'opportunity'};}
  else if((clearSalvage||style==='exploration')&&!s.expedition.log.some(x=>x.type==='brace-clear')&&s.board.some(x=>x?.type==='rock')){
   needs=[req('rig',2)];command={type:'clear',index:s.board.findIndex(x=>x?.type==='rock')};
  }else if(s.stage===2&&style==='contract'&&normalContract(s).vaultTrade){needs=normalContract(s).needs;command={type:'contract'};}
  else if(s.stage===3){needs=goal(s).needs;command={type:'goal'};}
  else{
   const path=circuit(s,true),connected=circuit(s);
   if(connected)return {type:'power'};
   if(path){
    const slots=path.slice(1,-1);
    for(const to of slots){
     if(loopCell(s.board[to]))continue;
     if(s.board[to]){
      const empty=s.board.findIndex((x,i)=>!x&&!slots.includes(i));
      if(empty>=0)return {type:'merge',from:to,to:empty};
      const recyclable=s.board.findIndex((x,i)=>x?.type==='item'&&!slots.includes(i)&&!loopCell(x));
      if(recyclable>=0)return {type:'recycle',index:recyclable};
     }
     const from=s.board.findIndex((x,i)=>loopCell(x)&&!slots.includes(i));
     if(from>=0)return {type:'merge',from,to};
    }
    needs=[req('flux',1,slots.length)];command={type:'power'};
   }else{
   const order=['expedition','contract'].includes(style)?['winch','relay']:style==='exploration'?['winch','scope']:['scope','winch'];
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
 for(let tier=r.tier-1;tier>=0;tier--){const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===r.family&&x.tier===tier?[i]:[]);if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};}
 if(!spaces){
  for(const family of Object.keys(SOURCES))for(let tier=0;tier<3;tier++){const p=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===family&&x.tier===tier?[i]:[]);if(p.length>=2)return {type:'merge',from:p[0],to:p[1]};}
  const i=s.board.findIndex(x=>x?.type==='item'&&x.tier<3&&x.family!==r.family);if(i>=0)return {type:'recycle',index:i};
 }
 if(s.energy<=3)return {type:'ration'};
 if(!sourceUnlocked(s,r.family))throw Error('Policy targets locked source');
 return s.charges[r.family]?{type:'produce',id:r.family}:{type:'service',id:r.family};
}
