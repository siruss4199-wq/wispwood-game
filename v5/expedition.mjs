// One item, one immediate consequence. Any two devices prepare the vault.
export const ANCHORS={
 winch:{name:'Stone lift',equipment:'rig',drive:'chart',effect:'Clear two stones · find survey gear',short:'Clear stones'},
 scope:{name:'Relic finder',equipment:'chart',drive:'flux',effect:'Uncover buried ground · find relic gear',short:'Find relics'},
 relay:{name:'Power bridge',equipment:'flux',drive:'rig',effect:'Refill sources · 3 rich pulls · field gear',short:'Power sources'}
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
export function expeditionState(stage=0){return {version:2,route:stage>=2?'ridge':null,trades:0,log:[]};}
export function installSites(s){
 // Migration uses only old environmental cells; never displace kept inventory.
 for(const kind of Object.keys(ANCHORS)){
  if(anchors(s).some(x=>x.kind===kind))continue;
  let i=s.board.findIndex(x=>x&&['marker','lock','rock','sealed'].includes(x.type));
  if(i<0)i=s.board.indexOf(null);
  if(i>=0)s.board[i]={type:'site',kind,phase:s.stage>=3?'done':'idle',progress:s.stage>=3?2:0};
 }
}
