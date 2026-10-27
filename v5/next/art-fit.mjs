// How big each board sprite is drawn (Build 45i, board art consistency pass). The painted icons
// fill about 91 % of their canvas on their longest side whatever the object is (the four first
// Rover parts 95 %), and the board used to size them by kind through scattered rules (materials
// 100 % of the cell, generators 88 %, cargo 84 %, crates scale .82, a selected part 107 %), so a
// copper offcut looked bigger than the excavator that makes it. Here every sprite gets one fit:
// the share of the cell its canvas takes so that its visible object (tools/measure-art-fit.py →
// art-bounds.mjs) reaches its kind's target, and a small offset that centres the object. The board
// CSS reads them (--fit, --dx, --dy); other screens keep their own sizes.
import {ART_BOUNDS} from './art-bounds.mjs';

// Longest visible side as a share of the cell, by kind: [square object, thin object]. A thin
// object (a lantern, a rope) gets a little more length so it does not look smaller than a bulky
// one (a barrel) of the same longest side.
const TARGET={item:[.72,.8],container:[.78,.84],generator:[.85,.88]};
// Optical tuning that measurement cannot see, by sprite (multiplies the fit). Keep it short.
const TUNE={};
const kindOf=f=>/^gen-/.test(f)?'generator':/^cargo-|^(driftwood-crate|sea-chest|captains-trunk)$/.test(f)?'container':'item';
export function artFit(file){
 const b=ART_BOUNDS[file];if(!b)return null;
 const [long,ratio,cx,cy]=b,[sq,thin]=TARGET[kindOf(file)];
 const target=sq+(thin-sq)*Math.max(0,Math.min(1,(1-ratio)/.5));
 const fit=Math.min(1,target/long*(TUNE[file]??1));
 // the offset that centres the object, as a share of the sprite's own box (CSS translate %)
 return {fit:+fit.toFixed(3),dx:+(.5-cx).toFixed(3),dy:+(.5-cy).toFixed(3),target:+target.toFixed(3),kind:kindOf(file)};
}
// The style attribute the renderer puts on a sprite (empty for art with no measurements).
export const fitStyle=file=>{const f=artFit(file);return f?` style="--fit:${f.fit};--dx:${f.dx};--dy:${f.dy}"`:'';};
