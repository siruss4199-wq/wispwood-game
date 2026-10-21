// Repairs have immediate consequences. The lift connects to either receiver.
export const ANCHORS={
 winch:{name:'Stone lift',equipment:'rig',drive:'chart',effect:'Clear two stones · find survey gear',short:'Clear stones'},
 scope:{name:'Relic finder',equipment:'chart',drive:'flux',effect:'Uncover buried ground · find relic gear',short:'Find relics'},
 relay:{name:'Power bridge',equipment:'flux',drive:'rig',effect:'Refill sources · 3 rich pulls · field gear',short:'Power sources'}
};
export const ROUTES={
 ridge:{name:'Ridge crossing',family:'rig',start:24,benefit:'Working space + Grip tool',reward:'Room + tool',kept:'Keep your lens'},
 conduit:{name:'Relic conduit',family:'chart',start:27,benefit:'Pulse coil + Relic capsule · 3 rich pulls',reward:'Coil + capsule',kept:'Keep your spanner'}
};
export const equipment=kind=>({family:ANCHORS[kind].equipment,tier:3,count:1});
// The two existing stones conceal useful machinery, revealed by the crossing survey.
// Recover it as a movable object, or spend relic energy to restore its site directly.
export const FINDS={winch:{name:'Buried winch',family:'rig'},scope:{name:'Buried scope',family:'chart'}};
export function surveyFinds(s){
 const rocks=s.board.filter(x=>x?.type==='rock');
 for(const [n,x] of rocks.entries())if(!x.find)x.find=n%2?'scope':'winch';
}
export const findSite=(s,x)=>x?.type==='rock'&&FINDS[x.find]?s.board.find(v=>v?.type==='site'&&v.kind===x.find):null;
export const canRestore=(s,x)=>s.stage>=2&&s.stage<4&&findSite(s,x)?.phase==='idle';
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
