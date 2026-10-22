// Who asks for each crew order: orders read as people, not lanes.
// Rover parts → Ivo, Kite parts and tide treasures → Neri, Crucible parts → Tamsin,
// expedition kits → Bram. Display only; orders, rewards and saves are unchanged.
export const CREW={
 ivo:{name:'Ivo',role:'quartermaster'},
 neri:{name:'Neri',role:'navigator'},
 tamsin:{name:'Tamsin',role:'signal keeper'},
 bram:{name:'Bram',role:'expedition lead'}
};
export function crewFor(order){
 const first=order?.needs?.[0];
 if(first?.line==='tide')return 'neri';
 if(order?.lane==='long')return 'bram';
 return first?.family==='chart'?'neri':first?.family==='flux'?'tamsin':'ivo';
}
