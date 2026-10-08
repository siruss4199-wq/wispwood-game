import {MAX_TIER} from './catalog.mjs';

export const RESIDENTS=[
 {name:'Mivra',role:'Canopy tender',face:'MV',purpose:'A sheltered place for the returning seedlings.'},
 {name:'Tovin',role:'Rootwright',face:'TV',purpose:'Repair the paths that connect our clearing.'},
 {name:'Sela',role:'Dew keeper',face:'SL',purpose:'Carry clean water and sound into the quiet grove.'},
 {name:'Nemm',role:'Memory keeper',face:'NM',purpose:'Keep a record of everything the forest remembers.'}
];
const titles=[['Seedling shelter','Canopy care','A place to grow'],['Trail repair kit','Rootwright supplies','Shelter fittings'],['Dusk collection','A visitor at dusk','Before the mist'],['Keeper commission','Restoration provisions','Archive commission']];
export function createRequest(s,slot,chains,now=Date.now()){
 const serial=s.nextOrderSerial++,stage=Math.floor(s.ordersCompleted/6);
 const tier=Math.min([2,4,5,8][slot],1+Math.floor(stage/2)+(slot>=2?1:0),MAX_TIER);
 const requirements=[];
 const add=(chain,tier,count=1)=>{
  const old=requirements.find(r=>r.chain===chain&&r.tier===tier);
  if(old)old.count+=count;else requirements.push({chain,tier,count});
 };
 const a=chains[(serial+slot)%chains.length],b=chains[(serial+slot+1)%chains.length];
 add(a,slot===1?Math.max(1,tier-1):tier,slot===1?2:1);
 if(slot>=2)add(b,Math.max(1,tier-1));
 if(slot===3)add(chains[(serial+slot+2)%chains.length],Math.max(1,tier-2));
 const timed=slot===2&&s.ordersCompleted>=6&&serial%3===0;
 const kind=timed?'timed':slot===3?'special':'normal';
 const power=requirements.reduce((n,r)=>n+r.count*2**r.tier,0),mult=[1,1.2,1.45,1.8][slot];
 return {id:'order-'+serial,slot,kind,npc:slot,title:titles[slot][serial%3],
  label:timed?'Dusk bonus':slot===3?'Commission':slot===1?'Supply':'Neighbour',
  narrative:RESIDENTS[slot].purpose,requirements,createdAt:now,
  bonusUntil:timed?now+15*60*1000:null,
  bonusCoins:timed?Math.round(power*3):0,
  rewardCoins:Math.round((14+power*7)*mult),rewardLight:Math.max(1,Math.round((2+power/2)*mult)),rewardEnergy:[4,6,8,12][slot]};
}
export const requestBonus=(order,now=Date.now())=>order.bonusUntil&&now<order.bonusUntil?order.bonusCoins:0;
