// Equipment is consumed on installation; cross-family merges operate the site.
// These are alternatives, not a sequence: any two working anchors open the vault.
export const ANCHORS={
 winch:{name:'Counterweight lift',equipment:'rig',drive:'chart',effect:'Lift saltstone · reclaim a spanner',short:'Make a Sight lens+'},
 scope:{name:'Echo triangulator',equipment:'chart',drive:'flux',effect:'Locate a coil, then a lens',short:'Make a Pulse coil+'},
 relay:{name:'Induction bridge',equipment:'flux',drive:'rig',effect:'Recharge Rover + Kite · 3 rich pulls',short:'Make a Split spanner+'}
};
export const ROUTES={
 ridge:{name:'Ridge breach',family:'rig',start:24,benefit:'More working space · field equipment'},
 conduit:{name:'Conduit breach',family:'chart',start:27,benefit:'Relic equipment · 3 rich pulls'}
};
export const equipment=kind=>({family:ANCHORS[kind].equipment,tier:3,count:1});
export const anchors=s=>s.board.filter(x=>x?.type==='site');
export const activeAnchors=s=>anchors(s).filter(x=>x.phase==='active');
export const completedAnchors=s=>anchors(s).filter(x=>x.phase==='done').length;
export function trace(s,type,detail={}){
 s.expedition.log.push({type,move:s.moves,...detail});
 s.expedition.log=s.expedition.log.slice(-200);
}
export function expeditionState(stage=0){return {version:1,route:stage>=2?'ridge':null,trades:0,log:[]};}
export function installSites(s){
 // Migration uses only old environmental cells; never displace kept inventory.
 for(const kind of Object.keys(ANCHORS)){
  if(anchors(s).some(x=>x.kind===kind))continue;
  let i=s.board.findIndex(x=>x&&['marker','lock','rock','sealed'].includes(x.type));
  if(i<0)i=s.board.indexOf(null);
  if(i>=0)s.board[i]={type:'site',kind,phase:s.stage>=3?'done':'idle',progress:s.stage>=3?2:0};
 }
}
