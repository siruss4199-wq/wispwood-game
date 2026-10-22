// Discovery is the entitlement, not possession: delivering a Crown never erases it.
export const fleetEarned=s=>s.discovered?.includes('chart:tide:4')===true;
export const fleetPending=s=>fleetEarned(s)&&s.camp?.fleetViewed!==true;
export const FLEET_LINES=[
 {voice:'Neri',line:'These marks match the missing fleet’s charts. I thought they marked a wreck… but they are bearings home.'},
 {voice:'Ivo',line:'Then this was never a royal crown. It is a signal lens. They left us a way to call them back.'},
 {voice:'Neri',line:'Look—the light answers from beneath the horizon. If the fleet vanished, who is answering?'}
];
