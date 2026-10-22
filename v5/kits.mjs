// Generator boxes (user, 2026-10-22: "generator boxes, generator merging").
// A box is a small generator: each tap drops one part of its family for free,
// and the box is gone once empty. Two unopened twins merge into a bigger box
// with more and better parts. A large unopened box fed to its own producer
// raises that producer's level, and higher levels lift its pulls a tier.
// Pure data and helpers; the reducer in core.mjs applies them.
export const KIT_FAMILIES=['rig','chart','flux'];
export const KIT_LOOK={rig:'salvage',chart:'survey',flux:'relic'};
export const KIT_NAMES={rig:'Rover toolbox',chart:'Kite map satchel',flux:'Crucible shard flask'};
export const KIT_SIZES=['Small','Medium','Large'];
// Tiers in drop order. A merged box holds a little more than its two halves
// (raw value 4 → 8 → 18) and in fewer, higher parts.
export const KIT_DROPS={1:[0,1,0],2:[1,0,1,1,0],3:[2,1,2,1,2,1]};
export const MAX_KIT_SIZE=3,MAX_PRODUCER_LEVEL=5;

export const kit=(family,size=1)=>({type:'kit',family,size,left:KIT_DROPS[size].length});
export const kitCapacity=x=>KIT_DROPS[x.size].length;
export const kitFull=x=>x?.type==='kit'&&x.left===kitCapacity(x);
export const kitName=x=>`${KIT_SIZES[x.size-1]} ${KIT_NAMES[x.family]}`;
export const kitDrop=x=>({type:'item',family:x.family,tier:KIT_DROPS[x.size][kitCapacity(x)-x.left]});
export const validKit=x=>KIT_FAMILIES.includes(x?.family)&&Number.isInteger(x.size)&&x.size>=1&&x.size<=MAX_KIT_SIZE&&Number.isInteger(x.left)&&x.left>=1&&x.left<=KIT_DROPS[x.size].length;
// Two unopened boxes of the same family and size merge into the next size.
export const kitsMerge=(x,y)=>kitFull(x)&&kitFull(y)&&x.family===y.family&&x.size===y.size&&x.size<MAX_KIT_SIZE;

export const producerLevel=x=>x?.level??1;
export const validProducerLevel=x=>x.level===undefined||Number.isInteger(x.level)&&x.level>=2&&x.level<=MAX_PRODUCER_LEVEL;
// A large unopened box of the producer's own family raises its level by one.
export const feeds=(x,y)=>kitFull(x)&&x.size===MAX_KIT_SIZE&&y?.type==='source'&&y.id===x.family&&producerLevel(y)<MAX_PRODUCER_LEVEL;
// Tiers a producer level adds to pull n (1-based): Lv2 every third pull, Lv3
// every second, Lv4 every pull, Lv5 every pull and every third by two.
export function levelLift(level,n){
 if(level>=5)return n%3===0?2:1;
 if(level===4)return 1;
 if(level===3)return n%2===0?1:0;
 if(level===2)return n%3===0?1:0;
 return 0;
}
// The free space nearest to a cell (grid distance), so drops land beside their box.
export function nearestFree(board,index,pos){
 const [r,c]=pos(index);let best=-1,d=Infinity;
 board.forEach((x,i)=>{if(x!==null)return;const [rr,cc]=pos(i),k=Math.abs(rr-r)+Math.abs(cc-c);if(k<d){d=k;best=i;}});
 return best;
}
