// Intent-based player styles. All actions use the public reducer / real UI.
import {goal,ready,count,normalContract,SOURCES} from '../v5/core.mjs';
import {ANCHORS,ROUTES,equipment,anchors,activeAnchors} from '../v5/expedition.mjs';
const req=(family,tier,count=1)=>({family,tier,count});
export function choose(s,{sideFirst=true,openCaches=false,clearSalvage=false,session=null,style='expedition'}={}){
 if(!goal(s))return null;
 const spaces=s.board.filter(x=>x===null).length;
 let needs,command;
 if(s.stage===4){needs=goal(s).needs;command={type:'goal'};}
 else if(sideFirst&&s.contracts===0){needs=normalContract(s).needs;command={type:'contract'};}
 else if(s.stage===0){needs=goal(s).needs;command={type:'goal'};}
 else if(s.stage===1){
  const id=['contract','aggressive'].includes(style)?'conduit':'ridge';
  needs=[req(ROUTES[id].family,2)];command={type:'breach',index:s.board.findIndex(x=>x?.type==='route'&&x.id===id)};
 }else{
  // Decoding is an intent: obtain a lens, not just click if one happens to survive.
  // Exploration deliberately spends its first fragment operating equipment instead.
  const glyph=s.board.findIndex(x=>x?.type==='glyph');
  const spent=s.expedition.log.some(x=>x.type==='fragment-spent');
  if(glyph>=0&&!s.discoveryDone&&(style!=='exploration'||spent)){
   needs=[req('chart',2)];command={type:'discovery'};
  }else if(style==='contract'&&s.expedition.trades<2&&!(s.expedition.trades===1&&!anchors(s).some(x=>x.kind==='scope'&&x.phase!=='idle'))){
   needs=normalContract(s).needs;command={type:'contract'};
  }else if(session&&!session.signal&&activeAnchors(s).length){session.signal=true;return {type:'startOpportunity'};}
  else if(s.opportunity){needs=s.opportunity.needs;command={type:'opportunity'};}
  else if((clearSalvage||style==='exploration')&&!s.expedition.log.some(x=>x.type==='brace-clear')&&s.board.some(x=>x?.type==='rock')){
   const brace=s.board.findIndex(x=>x?.type==='brace');if(brace>=0)return {type:'clear',index:s.board.findIndex(x=>x?.type==='rock')};
   needs=[req('rig',2)];command={type:'branch',index:s.board.findIndex(x=>x?.type==='item'&&x.family==='rig'&&x.tier===2)};
  }else if(style==='aggressive'&&!s.discovered.includes('chart:4')){
   needs=[req('chart',4)];command=null;
  }else if(s.stage===3){needs=goal(s).needs;command={type:'goal'};}
  else{
   const order=style==='expedition'?['winch','relay']:style==='exploration'?['winch','scope']:['scope','relay'];
   const site=order.map(kind=>anchors(s).find(x=>x.kind===kind)).find(x=>x.phase!=='done');
   const index=s.board.indexOf(site);
   if(site.phase==='idle'){needs=[equipment(site.kind)];command={type:'deploy',index};}
   else if(style==='exploration'&&glyph>=0&&!spent)return {type:'feed',index,from:glyph};
   else{
    const family=ANCHORS[site.kind].drive;
    for(let tier=3;tier>=1;tier--){const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===family&&x.tier===tier?[i]:[]);if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};}
    needs=[req(family,2,count(s,req(family,2))+1)];command=null;
   }
  }
 }
 if(command&&ready(s,needs))return command;
 if(openCaches&&spaces>8){const box=s.board.findIndex(x=>x?.type==='crate');if(box>=0)return {type:'crate',index:box};}
 const r=needs.find(r=>count(s,r)<r.count);
 if(!r)throw Error('Intent did not progress: '+JSON.stringify({style,needs,command}));
 for(let tier=r.tier-1;tier>=0;tier--){const pair=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===r.family&&x.tier===tier?[i]:[]);if(pair.length>=2)return {type:'merge',from:pair[0],to:pair[1]};}
 if(!spaces){
  for(const family of Object.keys(SOURCES))for(let tier=0;tier<3;tier++){const p=s.board.flatMap((x,i)=>x?.type==='item'&&x.family===family&&x.tier===tier?[i]:[]);if(p.length>=2)return {type:'merge',from:p[0],to:p[1]};}
  const i=s.board.findIndex(x=>x?.type==='item'&&x.tier<3&&x.family!==r.family);if(i>=0)return {type:'recycle',index:i};
 }
 if(s.energy<=3)return {type:'ration'};
 if(s.stage<SOURCES[r.family].unlock)throw Error('Policy targets locked source');
 return s.charges[r.family]?{type:'produce',id:r.family}:{type:'service',id:r.family};
}
