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
// Build 45k pilot art: the art direction's optical targets for these three (longest visible side
// as a share of the cell), in place of their kind's range.
// Tool art integration: the two Rover tools at 78.5 % of the cell, the same for both (each is a
// diagonal tool of about the same mass), a clear step under the Rover's 84 %.
export const TARGET_OF={'cargo-bundle-pilot':.76,'grip-tool-pilot':.78,'gen-rig-pilot':.84,'grip-tool-v2':.785,'split-spanner-v2':.785};
// Interim colour tone for containers whose painted material breaks the board's palette (Build 45j,
// art direction: "containers: natural wood and canvas with small coloured accents"). The canvas
// bundle (sealed Survey Kite cargo, often a third of the board) is painted turquoise, the same blue
// as the sea, the ice and the map chain. No filter makes it natural canvas while keeping its rope
// and brass (a hue turn makes the straps violet), so until it is repainted the board draws it as a
// pale weathered canvas; its shape still tells it apart. The sea chest is rare and stays as painted.
// Items are never toned: their colours belong to the art.
const TONE={'cargo-bundle':'grayscale(.9) sepia(.6) saturate(.9) brightness(1.1)'};
const kindOf=f=>/^gen-/.test(f)?'generator':/^cargo-|^(driftwood-crate|sea-chest|captains-trunk)$/.test(f)?'container':'item';
export function artFit(file){
 const b=ART_BOUNDS[file];if(!b)return null;
 const [long,ratio,cx,cy]=b,[sq,thin]=TARGET[kindOf(file)];
 const target=TARGET_OF[file]??sq+(thin-sq)*Math.max(0,Math.min(1,(1-ratio)/.5));
 const fit=Math.min(1,target/long*(TUNE[file]??1));
 // the offset that centres the object, as a share of the sprite's own box (CSS translate %)
 return {fit:+fit.toFixed(3),dx:+(.5-cx).toFixed(3),dy:+(.5-cy).toFixed(3),target:+target.toFixed(3),kind:kindOf(file)};
}
// The style attribute the renderer puts on a sprite (empty for art with no measurements).
export const fitStyle=file=>{const f=artFit(file);return f?` style="--fit:${f.fit};--dx:${f.dx};--dy:${f.dy}${TONE[file]?`;--tone:${TONE[file]}`:''}"`:'';};
export const toneOf=file=>TONE[file]??null;
