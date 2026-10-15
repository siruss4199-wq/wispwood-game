// Surveying is a physical sightline, not another delivery. Prepared tools stay
// usable until the chosen breach; loose stock can always be moved back.
export const VIEWS={ridge:[6,12,18,24],conduit:[9,15,21,27]};
export function sight(s,id){
 const path=VIEWS[id]??[],lens=s.board[path[0]];
 const blocked=path.slice(1,-1).filter(i=>s.board[i]);
 return {path,blocked,ready:s.routePrepared===true&&lens?.type==='item'&&lens.family==='chart'&&lens.tier===2&&!blocked.length};
}
